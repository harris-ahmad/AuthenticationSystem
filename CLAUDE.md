# Authentication System Codebase Guide

## Overview

Enterprise-grade authentication system for Node.js/Express apps with dual-database support (MongoDB + PostgreSQL). Supports password, WebAuthn/Passkeys, OAuth (Google/GitHub), TOTP 2FA, and risk-based authentication.

## Commands

- **Run server**: `node index.js` (or with nodemon: `npx nodemon index.js`)
- **Run migrations** (PostgreSQL): `npm run migrate`
- **Undo migration**: `npm run migrate:undo`
- **Debug**: `python debug.py <command>`

## Project Structure

| Path | Purpose |
|---|---|
| `index.js` | Entry point — exports `simpleauth(app, options)` |
| `routes/` | Express route handlers (auth, oauth, webauthn, 2fa, profile, risk) |
| `middleware/` | Auth, CSRF, rate limiting, validation middleware |
| `utils/` | Core utilities (jwt, bcrypt, passport, email, audit, risk, geo, 2fa, webauthn) |
| `models/` | Sequelize models (PostgreSQL) |
| `schemas/` | Mongoose schemas (MongoDB) |
| `migrations/` | Sequelize SQL migrations |
| `common/db.js` | Unified database adapter (MongoDB + PostgreSQL abstraction) |
| `config/` | Sequelize config per environment |

## Auth Flow

1. **Register** → hash password with bcrypt (10 rounds) → create user → send verification email
2. **Login** → rate-limited (5/15min) → validate credentials → check lockout (5 fails = 15min lock) → if 2FA enabled, issue temp JWT → else issue access + refresh tokens
3. **2FA** → verify TOTP code with temp JWT → issue final tokens
4. **WebAuthn** → generate challenge with `@simplewebauthn/server` → verify signature → trust device → issue tokens
5. **OAuth** → redirect to Google/GitHub → callback creates/links user → issue tokens
6. **Token Refresh** → validate refresh token in DB → issue new access token

## Config

Loads from `DB_TYPE` env var (`mongodb` or `postgres`). Config file lookup: `simpleauth.config.{env}.js/json` → `simpleauth.config.js/json` → `config/simpleauth.*`.

Key env vars: `SECRET_KEY`, `JWT_SECRET`, `DB_TYPE`, `MONGODB_URI`, `BASE_URL`, `NODE_ENV`.

## Code Style

- CommonJS (`require`/`module.exports`)
- Async/await for async operations
- Named exports from utility modules
- JSDoc comments on exported functions
- Consistent error handling: return `{ success: false, message: ... }`
- 2-space indentation

## Testing

No test framework configured yet. Tests are stubbed in `package.json`.
