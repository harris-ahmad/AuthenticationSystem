# WebAuthn / Passkeys

## Overview

WebAuthn (Web Authentication) enables passwordless authentication using biometrics (Face ID, Touch ID, Windows Hello) or hardware security keys (YubiKey). This is the most secure and user-friendly authentication method available.

## What are Passkeys?

Passkeys are a replacement for passwords. They use public-key cryptography and are:
- **Phishing-resistant**: Cryptographic keys are tied to specific domains
- **Easy to use**: Face ID, Touch ID, or PIN
- **Secure**: Private keys never leave the device
- **No passwords**: Nothing to remember or type

## Supported Devices

### Platform Authenticators
- **iOS 16+**: Face ID / Touch ID
- **macOS**: Touch ID
- **Android 9+**: Fingerprint / Face unlock
- **Windows 10+**: Windows Hello

### Cross-Platform Authenticators
- YubiKey
- Google Titan
- Other FIDO2 security keys

## How It Works

### Registration Flow
```
1. User logs in with password
2. User clicks "Add Passkey"
3. Server generates challenge
4. Device prompts for biometric
5. Device creates key pair
6. Public key sent to server
7. Server stores public key
```

### Authentication Flow
```
1. User enters username
2. Server generates challenge
3. Device prompts for biometric
4. Device signs challenge with private key
5. Server verifies signature
6. User logged in
```

## API Endpoints

### Register Passkey

**Step 1: Get Registration Options**
```http
POST /auth/webauthn/register/options
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "options": {
    "challenge": "...",
    "rp": {
      "name": "SimpleAuth",
      "id": "localhost"
    },
    "user": {
      "id": "user-uuid",
      "name": "johndoe",
      "displayName": "johndoe"
    },
    "pubKeyCredParams": [...],
    "authenticatorSelection": {...}
  }
}
```

**Step 2: Verify Registration**
```http
POST /auth/webauthn/register/verify
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "response": { /* credential response from browser */ },
  "credentialName": "My iPhone"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Passkey registered successfully",
  "credential": {
    "id": "cred-uuid",
    "name": "My iPhone",
    "createdAt": "2024-11-07T..."
  }
}
```

### Login with Passkey

**Step 1: Get Authentication Options**
```http
POST /auth/webauthn/login/options
Content-Type: application/json

{
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "options": {
    "challenge": "...",
    "rpId": "localhost",
    "allowCredentials": [
      {
        "id": "...",
        "type": "public-key",
        "transports": ["internal"]
      }
    ]
  }
}
```

**Step 2: Verify Authentication**
```http
POST /auth/webauthn/login/verify
Content-Type: application/json

{
  "response": { /* authentication response */ },
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "...",
  "user": {...},
  "riskScore": 0,
  "riskLevel": "low"
}
```

### List Passkeys
```http
GET /auth/webauthn/credentials
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "credentials": [
    {
      "id": "cred-uuid",
      "name": "My iPhone",
      "credentialDeviceType": "singleDevice",
      "credentialBackedUp": true,
      "lastUsedAt": "2024-11-07T...",
      "createdAt": "2024-11-01T..."
    }
  ]
}
```

### Delete Passkey
```http
DELETE /auth/webauthn/credentials/:id
Authorization: Bearer <access-token>
```

### Rename Passkey
```http
PATCH /auth/webauthn/credentials/:id
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Work MacBook"
}
```

## Frontend Integration

### HTML/JavaScript Example

```html
<script src="https://unpkg.com/@simplewebauthn/browser/dist/bundle/index.umd.min.js"></script>

<script>
const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

async function registerPasskey(accessToken) {
  const optionsRes = await fetch('/auth/webauthn/register/options', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const { options } = await optionsRes.json();

  const attResp = await startRegistration(options);

  const verifyRes = await fetch('/auth/webauthn/register/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      response: attResp,
      credentialName: 'My Device',
    }),
  });

  return await verifyRes.json();
}

async function loginWithPasskey(username) {
  const optionsRes = await fetch('/auth/webauthn/login/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const { options } = await optionsRes.json();

  const asseResp = await startAuthentication(options);

  const verifyRes = await fetch('/auth/webauthn/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response: asseResp,
      username,
    }),
  });

  return await verifyRes.json();
}
</script>
```

### React Example

```jsx
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

function PasskeyRegistration({ accessToken }) {
  const handleRegister = async () => {
    try {
      const optionsRes = await fetch('/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const { options } = await optionsRes.json();

      const attResp = await startRegistration(options);

      const verifyRes = await fetch('/auth/webauthn/register/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: attResp,
          credentialName: 'My Device',
        }),
      });

      const result = await verifyRes.json();
      alert(result.message);
    } catch (error) {
      console.error(error);
    }
  };

  return <button onClick={handleRegister}>Add Passkey</button>;
}

function PasskeyLogin() {
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    try {
      const optionsRes = await fetch('/auth/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const { options } = await optionsRes.json();

      const asseResp = await startAuthentication(options);

      const verifyRes = await fetch('/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: asseResp,
          username,
        }),
      });

      const result = await verifyRes.json();
      localStorage.setItem('token', result.accessToken);
      // Redirect to dashboard
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <button onClick={handleLogin}>Login with Passkey</button>
    </div>
  );
}
```

## Configuration

Add to your `.env`:

```env
WEBAUTHN_RP_NAME=MyApp
WEBAUTHN_RP_ID=myapp.com
WEBAUTHN_ORIGIN=https://myapp.com
```

For development:
```env
WEBAUTHN_RP_NAME=SimpleAuth Dev
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

## Security Benefits

### vs Passwords
- **No phishing**: Keys are domain-bound
- **No leaks**: Private keys never leave device
- **No reuse**: Each credential is unique
- **No brute force**: Cryptographic verification

### Integration with Risk Engine
WebAuthn logins receive a **-20 risk score bonus**:
- Normal login: Risk score 40
- WebAuthn login: Risk score 20 (or 0)

This means passkey users get lower friction authentication.

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 67+ | ✅ Full |
| Edge | 18+ | ✅ Full |
| Firefox | 60+ | ✅ Full |
| Safari | 13+ | ✅ Full |
| Safari iOS | 14+ | ✅ Full |

## Best Practices

1. **Fallback**: Always keep password login as fallback
2. **Multiple Passkeys**: Let users register multiple devices
3. **Naming**: Let users name their passkeys
4. **UI/UX**: Clear prompts and error messages
5. **Testing**: Test on multiple devices

## Troubleshooting

### "This feature is not available"
- WebAuthn requires HTTPS (or localhost)
- Check browser compatibility

### "Challenge expired"
- Challenges expire after 5 minutes
- Request new options

### "Authenticator not found"
- User's device doesn't support biometrics
- Offer alternative authentication

## Database Schema

### webauthn_credentials table
```sql
- id: UUID
- userId: UUID (foreign key)
- credentialID: TEXT (unique)
- credentialPublicKey: TEXT
- counter: BIGINT (replay protection)
- credentialDeviceType: STRING
- credentialBackedUp: BOOLEAN
- transports: STRING[]
- aaguid: STRING
- name: STRING
- lastUsedAt: TIMESTAMP
- createdAt: TIMESTAMP
```

## Future Enhancements

- Conditional UI (autofill passkeys)
- Discoverable credentials (username-less flow)
- Attestation verification
- Device trust scoring

## Resources

- [WebAuthn.io](https://webauthn.io/) - Test WebAuthn
- [W3C Spec](https://w3c.github.io/webauthn/)
- [FIDO Alliance](https://fidoalliance.org/)
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/)
