# Backend Changes That Require Frontend Updates

> Generated after backend security and consistency fixes. **All changes below are BREAKING** unless noted.

---

## 1. Auth Response Format Changed (BREAKING)

All auth endpoints now wrap data inside `{ success, data }` instead of returning flat objects.

### POST `/api/auth/register`

**Before:**
```json
{ "id": "...", "email": "...", "role": "student", "name": "..." }
```

**After:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "...",
    "email": "...",
    "role": "student",
    "name": "..."
  }
}
```

**Frontend fix:** Access user data via `response.data.data` (if using axios) or `body.data`.

---

### POST `/api/auth/login`

**Before:**
```json
{ "_id": "...", "id": "...", "email": "...", "role": "...", "name": "...", "token": "...", "assignedCompetitionId": "..." }
```

**After:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "...",
    "id": "...",
    "email": "...",
    "role": "...",
    "name": "...",
    "token": "...",
    "assignedCompetitionId": "..."
  }
}
```

**Frontend fix:** Access user/token via `response.data.data` instead of `response.data`.

> **Note:** The `token` field is now **always** included in the response body (both mobile and web). Previously, mobile-only requests received the token in body while web also got it. Now both get it — the cookie is still set for web.

---

### GET `/api/auth/me`

**Before:**
```json
{ "_id": "...", "id": "...", "email": "...", "role": "...", "name": "...", "assignedCompetitionId": "..." }
```

**After:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "id": "...",
    "email": "...",
    "role": "...",
    "name": "...",
    "assignedCompetitionId": "..."
  }
}
```

**Frontend fix:** Access user data via `response.data.data`.

---

## 2. Logout Now Requires Authentication (BREAKING)

### POST `/api/auth/logout`

**Before:** No auth header/cookie required.  
**After:** Requires a valid JWT token (via cookie or `Authorization: Bearer <token>` header).

**Frontend fix:** Ensure the logout request includes the auth token. If the user's token is already expired or missing, handle the 401 gracefully (treat as already logged out).

---

## 3. Registration Role Restriction (BREAKING if using roles)

### POST `/api/auth/register`

**Before:** Allowed roles: `student`, `admin`, `judge`, `editor`, `organizer`, `superadmin`  
**After:** Only allows: `student` (default)

**Frontend fix:** Remove any role selection dropdown from the public registration form. Only `student` is allowed for self-registration. If you need to create admin/trainer accounts, use the reception or CLO management panels instead.

---

## 4. Contact Form Response Changed (BREAKING)

### POST `/api/contact`

**Before:**
```json
{
  "message": "Contact form submitted successfully",
  "contact": { "id": "...", "name": "...", "phone": "...", "subject": "...", "createdAt": "..." }
}
```

**After:**
```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": { "id": "...", "name": "...", "phone": "...", "subject": "...", "createdAt": "..." }
}
```

**Frontend fix:** Access contact data via `response.data.data` instead of `response.data.contact`.

---

### GET `/api/reception/contacts`

**Before:**
```json
{ "contacts": [...], "pagination": {...}, "stats": {...} }
```

**After:**
```json
{ "success": true, "data": [...], "pagination": {...}, "stats": {...} }
```

**Frontend fix:** Access contacts array via `response.data.data` instead of `response.data.contacts`.

---

### GET `/api/reception/contacts/:id`

**Before:** Returns the contact object directly.  
**After:**
```json
{ "success": true, "data": { ...contact } }
```

**Frontend fix:** Access contact via `response.data.data`.

---

### PUT `/api/reception/contacts/:id`

**Before:**
```json
{ "message": "Contact updated successfully", "contact": {...} }
```

**After:**
```json
{ "success": true, "message": "Contact updated successfully", "data": {...} }
```

**Frontend fix:** Access updated contact via `response.data.data` instead of `response.data.contact`.

---

## 5. Validation Errors Now Structured (NEW FORMAT)

Routes with Joi validation now return structured errors:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "errors": [
      { "field": "email", "message": "\"email\" must be a valid email" },
      { "field": "name", "message": "\"name\" length must be at least 2 characters long" }
    ]
  }
}
```

**Affected routes:**
- `POST /api/reception/users` — name, email, password, role required
- `PUT /api/reception/users/:id` — fields optional but validated if present
- `POST /api/contact` — name, phone, subject required
- `PUT /api/reception/contacts/:id` — status must be one of: new, read, replied, archived

**Frontend fix:** Check for `response.data.error.errors` array to display field-level validation messages.

---

## 6. Error Response Format Standardized (NON-BREAKING, but worth noting)

All error responses now follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

Previously some endpoints returned `{ "message": "..." }` or `{ "success": false, "message": "...", "error": "internal details" }`. Internal error details are no longer exposed.

---

## Quick Migration Checklist

| Area | What to change |
|------|---------------|
| Login handler | Read user from `res.data.data` instead of `res.data` |
| Register handler | Read user from `res.data.data` instead of `res.data` |
| Auth/me handler | Read user from `res.data.data` instead of `res.data` |
| Logout handler | Send auth token with request; handle 401 as "already logged out" |
| Registration form | Remove role picker (only "student" allowed) |
| Contact form | Read response from `.data` instead of `.contact` |
| Contacts list (reception) | Read array from `.data` instead of `.contacts` |
| Error handling | Use `res.data.error.message` and optionally `.error.errors[]` |
