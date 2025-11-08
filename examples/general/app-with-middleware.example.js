require('dotenv').config();
const express = require('express');
const simpleauth = require('@harrisahmad/simpleauth');
const { isAuthenticated, requireRole, requirePermission } = require('@harrisahmad/simpleauth/middleware/auth');

const app = express();

simpleauth(app);

app.get('/', (req, res) => {
  res.json({ message: 'Public route' });
});

app.get('/protected', isAuthenticated, (req, res) => {
  res.json({ message: 'Protected route', user: req.user });
});

app.get('/admin', requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin only', user: req.user });
});

app.delete('/users/:id', requirePermission(['delete:users']), (req, res) => {
  res.json({ message: `User ${req.params.id} deleted` });
});

app.get('/moderator', requireRole(['admin', 'moderator']), (req, res) => {
  res.json({ message: 'Admin or Moderator area', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
