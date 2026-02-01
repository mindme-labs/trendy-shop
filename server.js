const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.redirect('/feed');
});

app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feed.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start server (only if not in test mode)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TrendHunter server running on http://localhost:${PORT}`);
  });
}

// Export for testing
module.exports = app;
