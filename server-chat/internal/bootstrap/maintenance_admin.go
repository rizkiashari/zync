package bootstrap

import (
	"log/slog"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"zync-server/internal/config"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

var nonAlpha = regexp.MustCompile(`[^a-z0-9]+`)

func toWorkspaceSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlpha.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 30 {
		s = s[:30]
	}
	if s == "" {
		s = "workspace"
	}
	return s
}

// EnsureMaintenanceAdmin creates or updates the maintenance system-admin user and ensures they have a workspace.
func EnsureMaintenanceAdmin(
	users *repository.UserRepository,
	wsRepo *repository.WorkspaceRepository,
	cfg *config.Config,
	log *slog.Logger,
) error {
	email := cfg.MaintenanceAdminEmail
	u, err := users.GetByEmail(email)
	if err != nil {
		return err
	}

	if u == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(cfg.MaintenanceAdminPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u = &models.User{
			Email:         email,
			PasswordHash:  string(hash),
			Username:      cfg.MaintenanceAdminUsername,
			IsSystemAdmin: true,
		}
		if err := users.Create(u); err != nil {
			return err
		}
		log.Info("maintenance admin user created", "email", email)
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
		log.Info("default workspace created for maintenance admin", "slug", slug)
	}

	return nil
}
