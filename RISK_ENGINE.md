# Risk-Based Authentication Engine

## Overview

The Risk-Based Authentication Engine dynamically assesses login risk and adjusts security requirements in real-time based on behavioral patterns, device trust, location, and velocity checks.

## How It Works

### Risk Factors Analyzed

1. **Device Fingerprinting**
   - Browser type, version
   - Operating system
   - Device type (mobile/desktop)
   - Generates unique fingerprint per device
   - Tracks trusted devices

2. **Geolocation Analysis**
   - IP-based location lookup
   - New location detection
   - High-risk country flagging
   - Impossible travel detection (speed > 1000 km/h)

3. **Velocity Checking**
   - Login attempts in last 5 minutes
   - Login attempts in last hour
   - Failed attempts tracking
   - Multiple IPs from same user
   - Multiple users from same IP

4. **Temporal Patterns**
   - Unusual login times (2am-6am)
   - Time-of-day analysis

5. **Historical Behavior**
   - Device trust history
   - Location patterns
   - Previous risk scores

### Risk Scoring

Each factor has a configurable weight:

```javascript
weights: {
  newDevice: 25,
  newLocation: 20,
  impossibleTravel: 40,
  highRiskCountry: 15,
  suspiciousVelocity: 30,
  unusualTime: 10,
}
```

**Total Score**: 0-100 (capped at 100)

### Risk Levels & Actions

| Risk Score | Level | Action |
|------------|-------|--------|
| 0-30 | Low | Allow login normally |
| 31-60 | Medium | Require email verification |
| 61-80 | High | Require 2FA |
| 81-100 | Critical | Block login + notify user |

## API Endpoints

### Get Risk History
```http
GET /risk/history?limit=10
Authorization: Bearer <token>
```

Returns recent risk assessments for the user.

### Get Trusted Devices
```http
GET /risk/devices
Authorization: Bearer <token>
```

Returns all devices associated with the user.

### Trust Current Device
```http
POST /risk/devices/trust
Authorization: Bearer <token>
```

Marks the current device as trusted (reduces future risk scores).

### Remove Device
```http
DELETE /risk/devices/:id
Authorization: Bearer <token>
```

Removes a device from trusted list.

### Get Current Risk Assessment
```http
GET /risk/current
Authorization: Bearer <token>
```

Assesses risk for current request in real-time.

## Login Flow with Risk Assessment

```
1. User submits credentials
2. ↓ Validate username & password
3. ↓ Generate device fingerprint
4. ↓ Get IP geolocation
5. ↓ Check login velocity
6. ↓ Calculate risk score
7. ↓ Determine action based on score
8. ↓
   ├─ Score 0-30: Allow login
   ├─ Score 31-60: Send verification email
   ├─ Score 61-80: Require 2FA
   └─ Score 81-100: Block + notify
```

## Example Response (Medium Risk)

```json
{
  "success": false,
  "message": "Additional verification required. Check your email to continue.",
  "requiresEmailVerification": true,
  "riskScore": 45,
  "riskLevel": "medium"
}
```

## Example Response (High Risk)

```json
{
  "success": true,
  "message": "2FA verification required",
  "requiresTwoFactor": true,
  "tempToken": "eyJhbGc...",
  "riskScore": 70,
  "riskLevel": "high"
}
```

## Example Response (Blocked)

```json
{
  "success": false,
  "message": "Login blocked due to suspicious activity. Please contact support.",
  "riskScore": 95
}
```

## Database Schema

### device_fingerprints
Stores trusted devices per user.

### login_history
Complete log of all login attempts with location, device, and risk data.

### risk_assessments
Detailed risk analysis for every authentication attempt.

## Configuration

Configure risk thresholds and weights:

```javascript
simpleauth(app, {
  riskEngine: {
    enabled: true,
    weights: {
      newDevice: 25,
      newLocation: 20,
      impossibleTravel: 40,
      highRiskCountry: 15,
      suspiciousVelocity: 30,
      unusualTime: 10,
    },
    thresholds: {
      low: 30,
      medium: 60,
      high: 80,
    },
  },
});
```

## Real-World Scenarios

### Scenario 1: Normal Login
- Known device: ✅
- Same city as last login: ✅
- Normal time of day: ✅
- **Risk Score**: 0
- **Action**: Allow

### Scenario 2: New Device
- New device: ❌ (+25 points)
- Same location: ✅
- **Risk Score**: 25
- **Action**: Allow

### Scenario 3: Travel
- Known device: ✅
- Login from different country: ❌ (+20 points)
- 2 hours since last login (impossible travel): ❌ (+40 points)
- **Risk Score**: 60
- **Action**: Require email verification

### Scenario 4: Suspicious Activity
- New device: ❌ (+25 points)
- New country: ❌ (+20 points)
- 5 login attempts in 5 minutes: ❌ (+30 points)
- 3am login time: ❌ (+10 points)
- **Risk Score**: 85
- **Action**: Block + notify user

## Benefits

1. **Adaptive Security**: Adjusts protection based on context
2. **Better UX**: Low-friction for normal users
3. **Fraud Prevention**: Catches suspicious patterns
4. **Compliance**: Audit trail for regulatory requirements
5. **Visibility**: Real-time insights into authentication patterns

## Future Enhancements

- Machine learning risk scoring
- User behavior analytics
- Browser fingerprinting (canvas, WebGL)
- Network analysis (Tor detection)
- Credential stuffing detection
- Account takeover prevention
