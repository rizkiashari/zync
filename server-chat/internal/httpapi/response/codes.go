package response

// Machine-readable error codes (stable for clients).
const (
	CodeInvalidBody            = "INVALID_BODY"
	CodeUnauthorized           = "UNAUTHORIZED"
	CodeInvalidToken           = "INVALID_TOKEN"
	CodeMissingAuthorization   = "MISSING_AUTHORIZATION"
	CodeInvalidCredentials     = "INVALID_CREDENTIALS"
	CodeEmailAlreadyRegistered = "EMAIL_ALREADY_REGISTERED"
	CodeInternal               = "INTERNAL_ERROR"
	CodeInvalidQuery           = "INVALID_QUERY"
	CodeInvalidBeforeID        = "INVALID_BEFORE_ID"
	CodeForbidden              = "FORBIDDEN"
	CodeNotFound               = "NOT_FOUND"
	CodeInvalidRoom            = "INVALID_ROOM"
	CodeUsernameTaken          = "USERNAME_TAKEN"
	CodeAlreadyMember          = "ALREADY_MEMBER"
	CodeNotMember              = "NOT_MEMBER"
)
