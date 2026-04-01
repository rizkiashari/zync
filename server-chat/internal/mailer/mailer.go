package mailer

import (
	"fmt"
	"net/smtp"
	"strings"
)

// Mailer sends transactional emails via SMTP.
type Mailer struct {
	host string
	port int
	user string
	pass string
	from string
}

// New creates a Mailer. Returns nil (no-op) if host is empty.
func New(host string, port int, user, pass, from string) *Mailer {
	if host == "" {
		return nil
	}
	return &Mailer{host: host, port: port, user: user, pass: pass, from: from}
}

// Send sends a plain-text+HTML email to a single recipient.
// Silently does nothing if the mailer is nil (SMTP not configured).
func (m *Mailer) Send(to, subject, textBody, htmlBody string) error {
	if m == nil {
		return nil
	}
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)
	boundary := "zync-boundary-001"
	msg := buildMIME(m.from, to, subject, textBody, htmlBody, boundary)
	addr := fmt.Sprintf("%s:%d", m.host, m.port)
	return smtp.SendMail(addr, auth, m.user, []string{to}, []byte(msg))
}

func buildMIME(from, to, subject, text, html, boundary string) string {
	var sb strings.Builder
	sb.WriteString("From: " + from + "\r\n")
	sb.WriteString("To: " + to + "\r\n")
	sb.WriteString("Subject: " + subject + "\r\n")
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString(`Content-Type: multipart/alternative; boundary="` + boundary + `"` + "\r\n\r\n")

	sb.WriteString("--" + boundary + "\r\n")
	sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	sb.WriteString(text + "\r\n\r\n")

	sb.WriteString("--" + boundary + "\r\n")
	sb.WriteString("Content-Type: text/html; charset=UTF-8\r\n\r\n")
	sb.WriteString(html + "\r\n\r\n")

	sb.WriteString("--" + boundary + "--\r\n")
	return sb.String()
}

// SendMention sends an @mention email notification.
func (m *Mailer) SendMention(toEmail, toName, fromName, roomName, msgBody string) error {
	subject := fmt.Sprintf("%s menyebut kamu di %s", fromName, roomName)
	text := fmt.Sprintf("Halo %s,\n\n%s menyebut kamu di ruangan %s:\n\n\"%s\"\n\nBuka Zync untuk membalas.", toName, fromName, roomName, msgBody)
	html := fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:auto;padding:24px">
<h2 style="color:#6366f1">Kamu disebut di Zync!</h2>
<p><strong>%s</strong> menyebut kamu di ruangan <strong>%s</strong>:</p>
<blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#475569">%s</blockquote>
<a href="#" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">Buka Zync</a>
</body></html>`, fromName, roomName, msgBody)
	return m.Send(toEmail, subject, text, html)
}

// SendTaskAssigned sends a task assignment email.
func (m *Mailer) SendTaskAssigned(toEmail, toName, taskTitle, roomName string) error {
	subject := fmt.Sprintf("Kamu ditugaskan: %s", taskTitle)
	text := fmt.Sprintf("Halo %s,\n\nKamu baru saja ditugaskan pada tugas \"%s\" di ruangan %s.\n\nBuka Zync untuk melihat detail tugas.", toName, taskTitle, roomName)
	html := fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:auto;padding:24px">
<h2 style="color:#6366f1">Tugas baru ditugaskan!</h2>
<p>Halo <strong>%s</strong>,</p>
<p>Kamu baru saja ditugaskan pada tugas:</p>
<div style="padding:12px 16px;background:#f1f5f9;border-radius:8px;font-weight:600">%s</div>
<p style="color:#64748b">Ruangan: %s</p>
<a href="#" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">Lihat Tugas</a>
</body></html>`, toName, taskTitle, roomName)
	return m.Send(toEmail, subject, text, html)
}
