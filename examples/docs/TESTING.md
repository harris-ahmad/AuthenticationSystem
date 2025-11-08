# Testing Guide

This guide covers testing the authentication system with MongoDB and WebAuthn.

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running locally
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod

   # Or run manually
   mongod --dbpath /path/to/data
   ```

2. **Environment Variables**: Create a `.env` file in the project root
   ```env
   SECRET_KEY=your-secret-key-here
   MONGODB_URI=mongodb://localhost:27017/simpleauth_test
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USER=your-mailtrap-user
   EMAIL_PASS=your-mailtrap-pass
   ```

3. **HTTPS for WebAuthn**: WebAuthn requires HTTPS in production, but works on localhost for testing

## Running the Test Server

```bash
cd examples
node test-server.js
```

The server will start on `http://localhost:3000`

## Testing Workflow

### 1. Test Database Connection

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-11-07T..."
}
```

### 2. Test User Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { ... }
}
```

### 3. Test Password Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!@#"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbG...",
  "refreshToken": "abc123...",
  "user": { ... }
}
```

### 4. Test WebAuthn Registration (Browser Required)

1. Open browser to `http://localhost:3000/test`
2. Fill in registration form (username, email, password)
3. Click "Register with Password"
4. After successful registration, click "Register Passkey"
5. Follow browser's biometric authentication prompts
6. Passkey should be registered successfully

### 5. Test WebAuthn Login (Browser Required)

1. On the test page, enter your username
2. Click "Login with Passkey"
3. Complete biometric authentication
4. You should be logged in with an access token

### 6. Test Risk Assessment

```bash
# Get risk history (requires authentication)
curl http://localhost:3000/risk/history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get trusted devices
curl http://localhost:3000/risk/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Test WebAuthn with Different Devices

To test device fingerprinting and risk assessment:

1. Register and add passkey on one browser (e.g., Chrome)
2. Try logging in from a different browser (e.g., Firefox)
3. Check risk assessment - should show "new device" risk factor
4. Add passkey on the new browser
5. Login again - risk score should decrease

### 8. Test Credential Management

```bash
# List all passkeys (requires authentication)
curl http://localhost:3000/auth/webauthn/credentials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Rename a passkey
curl -X PATCH http://localhost:3000/auth/webauthn/credentials/CREDENTIAL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My MacBook Pro"}'

# Delete a passkey
curl -X DELETE http://localhost:3000/auth/webauthn/credentials/CREDENTIAL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Verifying MongoDB Data

Connect to MongoDB to verify data is being stored correctly:

```bash
mongosh
use simpleauth_test
db.users.find().pretty()
db.webauthn_credentials.find().pretty()
db.loginhistories.find().pretty()
db.riskassessments.find().pretty()
```

## Testing Scenarios

### Scenario 1: First-time Passkey Registration
1. Register new user with password
2. Login with password
3. Register passkey
4. Verify credential is stored in database
5. Logout
6. Login with passkey
7. Verify login succeeds with reduced risk score

### Scenario 2: Multiple Passkeys
1. Register passkey on laptop (Chrome)
2. Register another passkey on laptop (Firefox)
3. Register passkey on phone (if accessible)
4. List all passkeys
5. Rename each passkey appropriately
6. Test login with each passkey
7. Delete one passkey
8. Verify deleted passkey no longer works

### Scenario 3: Risk-Based Authentication
1. Register user and passkey
2. Login normally (should have low risk)
3. Clear device fingerprints from database
4. Login again (should trigger higher risk due to new device)
5. Verify risk assessment shows appropriate factors

### Scenario 4: Fallback to Password
1. Register user and passkey
2. Delete all passkeys for user
3. Login with password
4. Verify standard password authentication still works

## Troubleshooting

### WebAuthn not working
- Ensure you're on localhost (or HTTPS)
- Check browser console for errors
- Verify browser supports WebAuthn (Chrome, Firefox, Safari, Edge)

### MongoDB connection fails
- Verify MongoDB is running: `mongosh`
- Check connection string in .env
- Ensure database user has correct permissions

### Risk assessment not working
- Check that geoip-lite database is initialized
- Verify IP address is being captured correctly
- Review risk assessment records in MongoDB

## Clean Up

To reset the test database between tests:

```bash
mongosh
use simpleauth_test
db.dropDatabase()
```
