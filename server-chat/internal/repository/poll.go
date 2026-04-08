package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

var ErrPollNotFound = errors.New("poll not found")
var ErrAlreadyVoted = errors.New("already voted on this poll")
var ErrPollExpired = errors.New("poll has expired")
var ErrInvalidOption = errors.New("invalid poll option")

type PollRepository struct {
	db *gorm.DB
}

func NewPollRepository(db *gorm.DB) *PollRepository {
	return &PollRepository{db: db}
}

// Create inserts a new poll with its options in a transaction.
func (r *PollRepository) Create(poll *models.Poll) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Options").Create(poll).Error; err != nil {
			return err
		}
		for i := range poll.Options {
			poll.Options[i].PollID = poll.ID
		}
		if len(poll.Options) > 0 {
			return tx.Create(&poll.Options).Error
		}
		return nil
	})
}

// GetByRoom returns all polls for a room, newest first, with options and vote counts.
func (r *PollRepository) GetByRoom(roomID uint) ([]models.Poll, error) {
	var polls []models.Poll
	err := r.db.
		Where("room_id = ?", roomID).
		Preload("Options").
		Order("created_at DESC").
		Find(&polls).Error
	if polls == nil {
		polls = []models.Poll{}
	}
	return polls, err
}

// GetByID returns a single poll with its options.
func (r *PollRepository) GetByID(pollID uint) (*models.Poll, error) {
	var poll models.Poll
	err := r.db.Preload("Options").First(&poll, pollID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrPollNotFound
	}
	return &poll, err
}

// Vote records a user's vote. For single-choice polls, one vote per user.
// For multiple-choice polls, one vote per option per user.
// Returns the updated option after voting.
func (r *PollRepository) Vote(pollID, optionID, userID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Fetch poll
		var poll models.Poll
		if err := tx.First(&poll, pollID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPollNotFound
			}
			return err
		}

		// Check expiry
		if poll.ExpiresAt != nil && !poll.ExpiresAt.IsZero() {
			if poll.ExpiresAt.Before(time.Now().UTC()) {
				return ErrPollExpired
			}
		}

		// Verify option belongs to poll
		var opt models.PollOption
		if err := tx.Where("id = ? AND poll_id = ?", optionID, pollID).First(&opt).Error; err != nil {
			return ErrInvalidOption
		}

		// For single-choice: check if user already voted on any option
		if !poll.IsMultiple {
			var existing int64
			tx.Model(&models.PollVote{}).
				Where("poll_id = ? AND user_id = ?", pollID, userID).
				Count(&existing)
			if existing > 0 {
				return ErrAlreadyVoted
			}
		}

		// For multi-choice: check if user already voted on THIS option
		if poll.IsMultiple {
			var existing int64
			tx.Model(&models.PollVote{}).
				Where("poll_id = ? AND user_id = ? AND option_id = ?", pollID, userID, optionID).
				Count(&existing)
			if existing > 0 {
				return ErrAlreadyVoted
			}
		}

		// Record vote
		vote := models.PollVote{PollID: pollID, UserID: userID, OptionID: optionID}
		if err := tx.Create(&vote).Error; err != nil {
			return err
		}

		// Increment option vote_count
		return tx.Model(&models.PollOption{}).
			Where("id = ?", optionID).
			UpdateColumn("vote_count", gorm.Expr("vote_count + 1")).Error
	})
}

// GetUserVotes returns the option IDs a user has voted for in a poll.
func (r *PollRepository) GetUserVotes(pollID, userID uint) ([]uint, error) {
	var votes []models.PollVote
	err := r.db.Where("poll_id = ? AND user_id = ?", pollID, userID).Find(&votes).Error
	if err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(votes))
	for _, v := range votes {
		ids = append(ids, v.OptionID)
	}
	return ids, nil
}

// Delete removes a poll (only by creator or room admin).
func (r *PollRepository) Delete(pollID, requestingUserID uint) error {
	var poll models.Poll
	if err := r.db.First(&poll, pollID).Error; err != nil {
		return ErrPollNotFound
	}
	if poll.CreatedByID != requestingUserID {
		return errors.New("forbidden")
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("poll_id = ?", pollID).Delete(&models.PollVote{})
		tx.Where("poll_id = ?", pollID).Delete(&models.PollOption{})
		return tx.Delete(&poll).Error
	})
}
