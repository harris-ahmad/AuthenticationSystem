# @harrisahmad/simpleauth

Enterprise-grade authentication system for Node.js with JWT, 2FA, OAuth, and comprehensive security features.

## Features

**Core Authentication**
- Session-based & JWT authentication
- Secure password hashing with bcrypt
- Account lockout after failed attempts
- Email verification & password reset

**Advanced Security**
- Two-Factor Authentication (TOTP)
- OAuth 2.0 (Google, GitHub)
- Rate limiting & brute force protection
- CSRF protection
- Security headers (helmet.js)
- Input validation & sanitization
- Audit logging

**User Management**
- Role-Based Access Control
- Permission system
- Session management
- API key authentication

## Installation

```bash
npm install @harrisahmad/simpleauth
```

## Quick Start

### 1. Setup Database

```bash
npx sequelize-cli db:migrate
```

### 2. Configuration

**Choose your preferred approach:**

#### Option A: Config File (Recommended)

Create `simpleauth.config.js` in your project root:

```javascript
require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SECRET_KEY,

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/oauth/google/callback',
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/oauth/github/callback',
    },
  },
};
```

Then in your app:

```javascript
const express = require('express');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();
simpleauth(app);

app.listen(3000);
```

#### Option B: Inline Configuration

```javascript
const express = require('express');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();

simpleauth(app, {
  sessionSecret: process.env.SECRET_KEY,
  enableHelmet: true,
  email: {
    host: process.env.EMAIL_HOST,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.listen(3000);
```

#### Option C: Hybrid (Override Config File)

```javascript
simpleauth(app, {
  enableCsrf: true
});
```

### 3. Environment Variables

Create `.env`:

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWD=yourpassword
DB_NAME=auth_db
DB_PORT=5432

JWT_SECRET=your-jwt-secret
SECRET_KEY=your-session-secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

NODE_ENV=development
```

## Configuration Options

### Config File Priority

The system looks for config files in this order:

1. `simpleauth.config.{env}.js` (e.g., `simpleauth.config.production.js`)
2. `simpleauth.config.{env}.json`
3. `simpleauth.config.js`
4. `simpleauth.config.json`
5. `config/simpleauth.js`
6. `config/simpleauth.json`

### Available Options

```javascript
{
  sessionSecret: string,
  usernameField: string,
  passwordField: string,

  security: {
    enableHelmet: boolean,
    enableCsrf: boolean,
    enableRateLimiting: boolean,
  },

  email: {
    host: string,
    port: number,
    secure: boolean,
    user: string,
    pass: string,
  },

  oauth: {
    google: {
      clientID: string,
      clientSecret: string,
      callbackURL: string,
    },
    github: {
      clientID: string,
      clientSecret: string,
      callbackURL: string,
    },
  },

  customMiddleware: Array,
}
```

## API Endpoints

### Authentication

**Register**
```http
POST /auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Login**
```http
POST /auth/login
{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

Returns:
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3...",
  "user": {...}
}
```

**Refresh Token**
```http
POST /auth/refresh
{
  "refreshToken": "a1b2c3..."
}
```

**Logout**
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Get Current User**
```http
GET /auth/me
Authorization: Bearer <token>
```

### Email Verification

**Verify Email**
```http
POST /auth/verify-email
{
  "token": "verification-token"
}
```

### Password Management

**Request Reset**
```http
POST /auth/request-password-reset
{
  "email": "john@example.com"
}
```

**Reset Password**
```http
POST /auth/reset-password
{
  "token": "reset-token",
  "password": "NewPass123!"
}
```

**Change Password**
```http
POST /auth/change-password
Authorization: Bearer <token>
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Two-Factor Authentication

**Setup 2FA**
```http
POST /auth/2fa/setup
Authorization: Bearer <token>
```

Returns QR code and backup codes.

**Verify Setup**
```http
POST /auth/2fa/verify-setup
Authorization: Bearer <token>
{
  "token": "123456"
}
```

**Verify 2FA Login**
```http
POST /auth/2fa/verify
{
  "token": "123456",
  "tempToken": "temp-token-from-login"
}
```

**Disable 2FA**
```http
POST /auth/2fa/disable
Authorization: Bearer <token>
```

### OAuth

**Google OAuth**
```http
GET /auth/oauth/google
```

**GitHub OAuth**
```http
GET /auth/oauth/github
```

## Middleware

### Authentication

```javascript
const { isAuthenticated } = require('@harrisahmad/simpleauth/middleware/auth');

app.get('/protected', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

### Role-Based Access

```javascript
const { requireRole } = require('@harrisahmad/simpleauth/middleware/auth');

app.get('/admin', requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

### Permission-Based Access

```javascript
const { requirePermission } = require('@harrisahmad/simpleauth/middleware/auth');

app.delete('/users/:id', requirePermission(['delete:users']), (req, res) => {
  res.json({ message: 'Deleted' });
});
```

### Email Verification Required

```javascript
const { requireVerifiedEmail } = require('@harrisahmad/simpleauth/middleware/auth');

app.post('/post', requireVerifiedEmail, (req, res) => {
  res.json({ message: 'Posted' });
});
```

### 2FA Required

```javascript
const { require2FA } = require('@harrisahmad/simpleauth/middleware/auth');

app.get('/sensitive', require2FA, (req, res) => {
  res.json({ data: 'sensitive' });
});
```

## Security Features

### Rate Limiting
- **Login**: 5 attempts / 15 min
- **Registration**: 3 attempts / hour
- **Password Reset**: 3 attempts / hour
- **2FA**: 5 attempts / 15 min
- **API**: 100 requests / 15 min

### Account Lockout
Accounts lock for 15 minutes after 5 failed login attempts.

### Password Requirements
- Minimum 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character (@$!%*?&)

### Session Security
- HTTP-only cookies
- Secure cookies in production
- 24-hour expiration
- Regeneration on login

### JWT Security
- Access tokens: 15 min (default)
- Refresh tokens: 7 days (default)
- Token rotation
- Database-backed revocation

## Audit Logging

All auth events are logged automatically:
- Login attempts
- Registration
- Password changes/resets
- 2FA events
- OAuth logins

Query logs:
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('./utils/sequelize');
const AuditLog = require('@harrisahmad/simpleauth/models/auditLog')(sequelize, DataTypes);

const logs = await AuditLog.findAll({
  where: { userId: 'user-id' },
  order: [['createdAt', 'DESC']],
});
```

## Examples

See `/examples` directory for:
- `simpleauth.config.example.js` - Config file example
- `simpleauth.config.production.example.js` - Production config
- `app.example.js` - Basic setup
- `app-with-inline-config.example.js` - Inline config
- `app-with-middleware.example.js` - Middleware usage

## Database Models

### User
Authentication, 2FA, OAuth, roles, permissions

### RefreshToken
JWT refresh tokens with device tracking

### AuditLog
Security event logging

### Session
Active session management

## Error Handling

Consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {"field": "password", "message": "Too weak"}
  ]
}
```

## TypeScript

TypeScript definitions coming soon.

## Contributing

Pull requests welcome. Open issues for bugs or features.

## License

ISC

## Author

Harris Ahmad

## Support

[GitHub Issues](https://github.com/harrisahmad/simpleauth/issues)
