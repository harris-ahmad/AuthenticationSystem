# @harrisahmad/simpleauth

A simple and extensible authentication system using Passport.js for session-based authentication.

## Installation

You can install the package using npm:

```sh
npm install @harrisahmad/simpleauth
```

## Introduction

This package provides a simple and extensible authentication system using Passport.js. Passport.js is an authentication middleware for Node.js, which is designed to be simple, unobtrusive, and flexible. It supports a wide range of authentication strategies.

### What is Session-Based Authentication?

Session-based authentication is a method of maintaining user authentication state across multiple requests. It involves storing user authentication information in a session, typically managed by the server. This information is then used to identify the user in subsequent requests without requiring them to log in again.

## How It Works

This package uses Passport.js with the `passport-local` strategy for handling username and password-based authentication. It integrates seamlessly with Express applications, managing sessions with `express-session`.

### Passport.js Overview

Passport.js uses strategies to authenticate requests. Strategies can range from verifying username and password credentials, OAuth tokens, or other mechanisms. Passport provides a consistent interface for managing authentication regardless of the strategy used.

## Usage

Here is an example of how to use `simpleauth` in your Node.js application:

### 1. Setup

Create a `.env` file to store environment variables:

```plaintext
DB_HOST=your_host
DB_USER=your_user
DB_PASSWD=your_password
DB_NAME=your_database_name
DB_PORT=5432
DB_DIALECT=postgres
SECRET_KEY=your_secret_key
```

### 2. Configure Your Application

Create an `index.js` file and set up your Express application with the `simpleauth` package:

```js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session setup
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));

// Initialize simpleauth
simpleauth(app, {
  sessionSecret: process.env.SECRET_KEY,
  usernameField: 'username',
  passwordField: 'password'
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 3. Routes

#### Register User

Register a new user by sending a POST request to `/auth/register` with the user's credentials.

```sh
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpassword"}'
```

#### Login User

Authenticate a user by sending a POST request to `/auth/login` with the user's credentials.

```sh
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpassword"}'
```

#### Logout User

Log out a user by sending a GET request to `/auth/logout`.

```sh
curl -X GET http://localhost:3000/auth/logout
```

## API

### Initialization

The `simpleauth` function accepts an Express app instance and an options object to configure the authentication system.

#### Options

- `sessionSecret`: A secret key for session encryption.
- `usernameField` (default: 'username'): The field name for the username.
- `passwordField` (default: 'password'): The field name for the password.

### Routes

The package includes the following routes for authentication:

- **POST `/auth/register`**: Registers a new user.
- **POST `/auth/login`**: Logs in a user.
- **GET `/auth/logout`**: Logs out the user.

## Example

Here is a complete example of an Express application using the `simpleauth` package:

```js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session setup
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));

// Initialize simpleauth
simpleauth(app, {
  sessionSecret: process.env.SECRET_KEY,
  usernameField: 'username',
  passwordField: 'password'
});

// Define additional routes if needed
app.get('/', (req, res) => {
  res.send('Home Page');
});

app.get('/login', (req, res) => {
  res.send('Login Page');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [Passport.js](http://www.passportjs.org/): Authentication middleware for Node.js.
- [Express](https://expressjs.com/): Fast, unopinionated, minimalist web framework for Node.js.
