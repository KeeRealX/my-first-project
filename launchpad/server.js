// server.js — LaunchPad static file server
// Used when deploying to Railway, Render, or any Node host

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 LaunchPad running at http://localhost:${PORT}`);
});
