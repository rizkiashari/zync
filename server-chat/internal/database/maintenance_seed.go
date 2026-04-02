package database

import (
	"log/slog"
	"regexp"
	"strings"

	"gorm.io/gorm"

	"zync-server/internal/models"
	"zync-server/internal/repository"
)

  const (
	maintenanceEmail        = "maintenance@zync.local"
	maintenanceUsername     = "MaintenanceAdmin"
	maintenancePasswordHash = "$2a$10$XQSFVlJns7.7Ci6LjVmA8.MhSnwBN5qlH1X16PnePab7davyrxrc6"
)

var nonAlphaSlug = regexp.MustCompile(`[^a-z0-9]+`)

func toWorkspaceSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlphaSlug.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 30 {
		s = s[:30]
	}
	if s == "" {
		s = "workspace"
	}
	return s
}

// SeedMaintenanceAdmin ensures the maintenance system-admin row (and a workspace) exist in the DB only.
func SeedMaintenanceAdmin(db *gorm.DB, log *slog.Logger) error {
	users := repository.NewUserRepository(db)
	wsRepo := repository.NewWorkspaceRepository(db)

	u, err := users.GetByEmail(maintenanceEmail)
	if err != nil {
		return err
	}

	if u == nil {
		u = &models.User{
			Email:         maintenanceEmail,
			PasswordHash:  maintenancePasswordHash,
			Username:      maintenanceUsername,
			IsSystemAdmin: true,
		}
		if err := users.Create(u); err != nil {
			return err
		}
		log.Info("maintenance admin inserted in database", "email", maintenanceEmail)
	} else {
		updates := map[string]any{}
		if !u.IsSystemAdmin {
			updates["is_system_admin"] = true
		}
		if len(updates) > 0 {
			if err := users.UpdateProfileFields(u.ID, updates); err != nil {
				return err
			}
		}
		u, err = users.GetByID(u.ID)
		if err != nil || u == nil {
			return err
		}
	}

	list, err := wsRepo.ListForUser(u.ID)
	if err != nil {
		return err
	}
	if len(list) == 0 {
		base := toWorkspaceSlug(u.Username + "-maintenance")
		slug, err := wsRepo.UniqueSlug(base)
		if err != nil {
			return err
		}
		if _, err := wsRepo.Create(slug, u.Username+"'s Workspace", u.ID); err != nil {
			return err
		}
		log.Info("maintenance admin workspace created in database", "slug", slug)
	}

	return nil
}
