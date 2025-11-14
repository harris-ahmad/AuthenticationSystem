# Quick Start Guide

Get the authentication system up and running in 5 minutes.

## What's Been Completed

The authentication system now includes:

- **Multi-database support**: MongoDB and PostgreSQL with automatic schema creation
- **WebAuthn/Passkeys**: Passwordless biometric authentication
- **Risk-based authentication**: Device fingerprinting, geolocation, velocity checking
- **Complete security**: Rate limiting, CSRF, helmet, input validation
- **JWT authentication**: With refresh token rotation
- **2FA/TOTP**: Time-based one-time passwords
- **OAuth**: Google and GitHub integration
- **Audit logging**: Complete security event tracking
- **Email service**: Verification, password reset, notifications

## Installation

```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify MongoDB is running
mongosh
# Type 'exit' to quit

# Install project dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
SECRET_KEY=your-super-secret-key-change-this
MONGODB_URI=mongodb://localhost:27017/simpleauth_test
NODE_ENV=development

# Email (optional - use Mailtrap for testing)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASS=your-mailtrap-password
```

## Run the Test Server

```bash
cd examples
node test-server.js
```

You should see:
```
Test server running on http://localhost:3000
WebAuthn test page: http://localhost:3000/test
Health check: http://localhost:3000/health
```

## Test WebAuthn (The Fun Part!)

### Option 1: Web Interface (Easiest)

1. Open browser to `http://localhost:3000/test`
2. Register a new user with password
3. Click "Register Passkey" button
4. Follow your browser's biometric authentication prompt (Touch ID, Face ID, Windows Hello, etc.)
5. Your passkey is now registered
6. Logout and login again using just your passkey - no password needed!

### Option 2: API Testing

```bash
# 1. Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# 2. Login to get access token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!@#"
  }'
# Copy the accessToken from response

# 3. Get WebAuthn registration options
curl -X POST http://localhost:3000/auth/webauthn/register/options \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Note: Complete registration requires browser for biometric authentication
# Use the web interface at http://localhost:3000/test
```

## Verify Database

Check that data is being stored correctly:

```bash
mongosh
use simpleauth_test

# View registered users
db.users.find().pretty()

# View WebAuthn credentials
db.webauthn_credentials.find().pretty()

# View login history
db.loginhistories.find().pretty()

# View risk assessments
db.riskassessments.find().pretty()
```

## Testing Risk-Based Authentication

The system automatically assesses risk on every login. Try these scenarios:

### Low Risk Login
- Use the same device and browser you registered with
- Login from your usual location
- Risk score: 0-30 (automatic approval)

### Medium Risk Login
- Clear cookies and browser data (simulates new device)
- Login again
- Risk score: 31-60 (may require email verification)

### High Risk Login
- Use a VPN to change your location significantly
- Use a different browser
- Login within minutes of last login from different location
- Risk score: 61-80 (requires 2FA if enabled)

### WebAuthn Bonus
- Login with passkey instead of password
- Risk score is reduced by 20 points!

## Project Structure

```
AuthenticationSystem/
├── index.js                    # Main entry point
├── utils/
│   ├── database.js            # Database abstraction layer
│   ├── webauthn.js            # WebAuthn implementation
│   ├── riskEngine.js          # Risk assessment engine
│   ├── deviceFingerprinting.js
│   ├── geolocation.js
│   └── ...
├── schemas/                   # MongoDB schemas
│   ├── User.js
│   ├── WebAuthnCredential.js
│   └── ...
├── models/                    # PostgreSQL models
├── routes/
│   ├── auth.js
│   ├── webauthn.js
│   ├── risk.js
│   └── ...
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   ├── rateLimiter.js
│   └── csrf.js
└── examples/
    ├── test-server.js         # Test server
    ├── webauthn-client.example.html
    ├── TESTING.md
    └── ...
```

## Using in Your Own Project

```javascript
const express = require('express');
const simpleAuth = require('./index');

const app = express();

await simpleAuth(app, {
  sessionSecret: process.env.SECRET_KEY,

  database: {
    type: 'mongodb',
    uri: process.env.MONGODB_URI,
    autoSync: true,
  },

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },
});

// Your routes here
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

## Next Steps

After testing WebAuthn:

1. **Explore risk assessment endpoints**: `/risk/history`, `/risk/devices`
2. **Test 2FA/TOTP**: Setup and verify time-based codes
3. **Test OAuth**: Configure Google/GitHub OAuth
4. **Try PostgreSQL**: Switch database type in config
5. **Production deployment**: Review security settings

## Documentation

- `DATABASE_SETUP.md` - Complete database installation and configuration
- `WEBAUTHN.md` - WebAuthn implementation details and API reference
- `RISK_ENGINE.md` - Risk-based authentication documentation
- `examples/TESTING.md` - Comprehensive testing scenarios
- `README.md` - Full project documentation

## Troubleshooting

**MongoDB not connecting**
```bash
brew services list | grep mongodb
brew services restart mongodb-community
```

**WebAuthn not working**
- Ensure you're on localhost or HTTPS
- Check browser supports WebAuthn (Chrome, Firefox, Safari, Edge)
- Look for errors in browser console

**Port 3000 already in use**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

## Support

For issues or questions:
- Check the documentation files
- Review the example code in `examples/`
- Test with the provided test server
