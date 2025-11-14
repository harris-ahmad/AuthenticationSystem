const { body, validationResult } = require("express-validator");

// Validation rules for registration
const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username can only contain letters, numbers, underscores, and hyphens")
    .escape(),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    ),
];

// Validation rules for login
const loginValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .escape(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Validation rules for password reset request
const passwordResetRequestValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// Validation rules for password reset
const passwordResetValidation = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

// Validation rules for email verification
const emailVerificationValidation = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Verification token is required"),
];

// Validation rules for 2FA setup
const twoFactorSetupValidation = [
  body("token")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Token must be 6 digits")
    .isNumeric()
    .withMessage("Token must contain only numbers"),
];

// Validation rules for 2FA verification
const twoFactorVerifyValidation = [
  body("token")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Token must be 6 digits")
    .isNumeric()
    .withMessage("Token must contain only numbers"),
];

// Validation rules for password change
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage("New password must be different from current password"),
];

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  emailVerificationValidation,
  twoFactorSetupValidation,
  twoFactorVerifyValidation,
  changePasswordValidation,
  handleValidationErrors,
};
