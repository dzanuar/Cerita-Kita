const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const cors = require('cors');

const SUBS_FILE = path.resolve(__dirname, 'subscriptions.json');

function loadSubs() {
  try {
    const raw = fs.readFileSync(SUBS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// Simple configuration - in production you should store keys in env vars
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:example@yourdomain.org', VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('VAPID keys not configured. Generate keys and set VAPID_PUBLIC and VAPID_PRIVATE env vars.');
}

app.get('/', (req, res) => {
  res.json({ status: 'push-server running' });
});

// Save subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  const subs = loadSubs();
  const exists = subs.find((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    saveSubs(subs);
  }
  return res.json({ success: true });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  let subs = loadSubs();
  subs = subs.filter((s) => s.endpoint !== endpoint);
  saveSubs(subs);
  return res.json({ success: true });
});

// Send push to all subscribers with payload
app.post('/sendNotification', async (req, res) => {
  const { title, body, url, data } = req.body || {};
  const payload = JSON.stringify({ title, body, url, data });
  const subs = loadSubs();
  const results = [];

  // Ensure VAPID set
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured on server' });
  }

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, payload);
      results.push({ endpoint: sub.endpoint, status: 'sent' });
    } catch (err) {
      // If subscription is no longer valid, remove it
      console.warn('Failed to send to', sub.endpoint, err && err.body ? err.body : err);
      results.push({ endpoint: sub.endpoint, status: 'failed', error: err.message });
    }
  }));

  return res.json({ results });
});

app.get('/subscriptions', (req, res) => {
  const subs = loadSubs();
  res.json(subs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push server listening on port ${PORT}`);
});
