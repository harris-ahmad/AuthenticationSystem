const nodemailer = require("nodemailer");

let transporter = null;

const initializeTransporter = (config) => {
  if (!config) {
    console.warn("Email configuration not provided. Email functionality will be disabled.");
    return null;
  }

  const user = config.user || process.env.EMAIL_USER;
  const pass = config.pass || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("Email credentials not provided. Email functionality will be disabled.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host || process.env.EMAIL_HOST,
    port: config.port || process.env.EMAIL_PORT || 587,
    secure: config.secure || process.env.EMAIL_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.warn("Email transporter not initialized. Skipping email send.");
    return { success: false, message: "Email service not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@simpleauth.com",
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err.message };
  }
};

const sendVerificationEmail = async (to, username, token, baseUrl) => {
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Hi ${username},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px;">Verify Email</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `;

  return await sendEmail(to, "Verify your email address", html);
};

const sendPasswordResetEmail = async (to, username, token, baseUrl) => {
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hi ${username},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;

  return await sendEmail(to, "Password Reset Request", html);
};

const sendPasswordChangedEmail = async (to, username) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Changed</h2>
      <p>Hi ${username},</p>
      <p>Your password was successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    </div>
  `;

  return await sendEmail(to, "Password Changed", html);
};

const sendLoginNotification = async (to, username, ipAddress, device) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Login Detected</h2>
      <p>Hi ${username},</p>
      <p>A new login to your account was detected:</p>
      <ul>
        <li>IP Address: ${ipAddress}</li>
        <li>Device: ${device || "Unknown"}</li>
        <li>Time: ${new Date().toLocaleString()}</li>
      </ul>
      <p>If this wasn't you, please change your password immediately.</p>
    </div>
  `;

  return await sendEmail(to, "New Login Detected", html);
};

module.exports = {
  initializeTransporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendLoginNotification,
};
