# Database Setup Guide

This guide covers setting up both MongoDB and PostgreSQL for the authentication system.

## Overview

The authentication system supports two database types:
- **MongoDB** - Document-based NoSQL database (Mongoose ORM)
- **PostgreSQL** - Relational SQL database (Sequelize ORM)

The system automatically detects which database to use based on your configuration and handles all schema creation and migrations.

## MongoDB Setup

### Installation

#### macOS
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB as a service
brew services start mongodb-community

# Or run manually
mongod --config /usr/local/etc/mongod.conf
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Windows
```powershell
# Download installer from https://www.mongodb.com/try/download/community
# Run the installer and follow the setup wizard
# MongoDB will be installed as a Windows service
```

### Verify Installation
```bash
# Check if MongoDB is running
mongosh

# You should see the MongoDB shell
# Type 'exit' to quit
```

### Configuration

Create a configuration file for MongoDB:

**simpleauth.config.js**
```javascript
require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SECRET_KEY,

  database: {
    type: 'mongodb',
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/simpleauth',
    autoSync: true,
  },

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },
};
```

**Environment Variables (.env)**
```env
SECRET_KEY=your-secret-key-here
MONGODB_URI=mongodb://localhost:27017/simpleauth
```

### MongoDB Schema Structure

The system automatically creates the following collections:

1. **users** - User accounts with authentication data
2. **refresh_tokens** - JWT refresh tokens
3. **audit_logs** - Security audit trail
4. **sessions** - Active user sessions
5. **device_fingerprints** - Trusted device tracking
6. **login_histories** - Login attempt records
7. **risk_assessments** - Risk analysis results
8. **webauthn_credentials** - Passkey/biometric credentials

Indexes are automatically created on critical fields for performance.

## PostgreSQL Setup

### Installation

#### macOS
```bash
# Install via Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb simpleauth
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb simpleauth
```

#### Windows
```powershell
# Download installer from https://www.postgresql.org/download/windows/
# Run the installer and follow the setup wizard
# Use pgAdmin or psql to create database
```

### Configuration

**simpleauth.config.js**
```javascript
require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SECRET_KEY,

  database: {
    type: 'postgres',
    autoSync: true,
    alterTables: false,
  },

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },
};
```

**Environment Variables (.env)**
```env
SECRET_KEY=your-secret-key-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simpleauth
DB_USER=postgres
DB_PASSWORD=your-password
```

**Sequelize Configuration (utils/sequelize.js)**

The system uses the existing Sequelize configuration from your `utils/sequelize.js` file.

### Running Migrations

```bash
# Install Sequelize CLI globally
npm install -g sequelize-cli

# Run migrations
npx sequelize-cli db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all
```

### PostgreSQL Tables

The migrations create the following tables:

1. **Users** - User accounts
2. **RefreshTokens** - JWT refresh tokens
3. **AuditLogs** - Security audit trail
4. **Sessions** - Active sessions
5. **DeviceFingerprints** - Trusted devices
6. **LoginHistories** - Login records
7. **RiskAssessments** - Risk analysis
8. **WebAuthnCredentials** - Passkeys

## Automatic Database Initialization

When you initialize the authentication system, it automatically:

1. Connects to the configured database
2. Creates all necessary schemas/tables
3. Sets up indexes for performance
4. Validates the connection

```javascript
const express = require('express');
const simpleAuth = require('simpleauth');

const app = express();

await simpleAuth(app, {
  sessionSecret: 'your-secret',
  database: {
    type: 'mongodb',
    uri: 'mongodb://localhost:27017/myapp',
    autoSync: true,
  },
});
```

### Configuration Options

- **type**: `'mongodb'` or `'postgres'`
- **uri**: Connection string (MongoDB only)
- **autoSync**: Automatically create schemas/tables (default: true)
- **alterTables**: Modify existing tables to match models (PostgreSQL only, default: false)
- **required**: Fail startup if database connection fails (default: true)

## Switching Between Databases

To switch between MongoDB and PostgreSQL:

1. Update the `database.type` in your config
2. Update environment variables for connection details
3. Restart your application
4. The system will automatically use the correct ORM and models

## Database Access in Your Code

Use the database utility to access models:

```javascript
const { getModels, getDatabaseType } = require('simpleauth/utils/database');

const models = getModels();

// Works with both MongoDB and PostgreSQL
const users = await models.User.find(); // MongoDB
const users = await models.User.findAll(); // PostgreSQL

// Check which database is being used
const dbType = getDatabaseType(); // 'mongodb' or 'postgres'
```

## Best Practices

### MongoDB
- Use indexes on frequently queried fields (automatically created)
- Enable replica sets for production
- Set up regular backups with `mongodump`
- Use connection pooling (handled automatically)

### PostgreSQL
- Run migrations in production, not autoSync
- Use connection pooling
- Set up regular backups with `pg_dump`
- Monitor query performance with EXPLAIN

### Security
- Use strong passwords for database users
- Restrict database access to localhost in development
- Use connection encryption (SSL/TLS) in production
- Never commit database credentials to version control
- Use environment variables for all sensitive config

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongod       # Linux

# Check logs
tail -f /usr/local/var/log/mongodb/mongo.log  # macOS
sudo tail -f /var/log/mongodb/mongod.log      # Linux

# Test connection
mongosh mongodb://localhost:27017
```

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Check logs
tail -f /usr/local/var/log/postgresql@15.log  # macOS
sudo tail -f /var/log/postgresql/postgresql-15-main.log  # Linux

# Test connection
psql -U postgres -d simpleauth
```

### Common Errors

**ECONNREFUSED**
- Database is not running
- Check connection string/environment variables
- Verify host and port

**Authentication Failed**
- Check username and password
- Verify database user permissions
- Reset database password if needed

**Database Does Not Exist**
- Create database manually
- MongoDB: automatically created on first connection
- PostgreSQL: use `createdb` command

## Performance Tuning

### MongoDB
```javascript
// Connection with performance options
database: {
  type: 'mongodb',
  uri: 'mongodb://localhost:27017/simpleauth?maxPoolSize=10&w=majority',
  autoSync: true,
}
```

### PostgreSQL
```javascript
// Sequelize connection pool
database: {
  type: 'postgres',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
}
```

## Monitoring

### MongoDB
```bash
# Show current operations
mongosh --eval "db.currentOp()"

# Database statistics
mongosh --eval "db.stats()"

# Collection statistics
mongosh --eval "db.users.stats()"
```

### PostgreSQL
```sql
-- Active connections
SELECT * FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('simpleauth'));

-- Table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';
```
