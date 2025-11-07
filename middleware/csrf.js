const { doubleCsrf } = require("csrf-csrf");

const doubleCsrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || "default-csrf-secret-change-in-production",
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.headers["x-csrf-token"],
};

const { generateToken, doubleCsrfProtection } = doubleCsrf(doubleCsrfOptions);

const csrfProtection = doubleCsrfProtection;

const csrfTokenGenerator = (req, res, next) => {
  const token = generateToken(req, res);
  res.locals.csrfToken = token;
  next();
};

module.exports = {
  csrfProtection,
  csrfTokenGenerator,
  generateToken,
};
