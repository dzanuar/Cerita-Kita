// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS (boleh batasi ke domain Vercel kamu) ---
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: ALLOW_ORIGIN }));
app.use(bodyParser.json());

// --- VAPID keys dari ENV ---
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || process.env.VAPID_PUBLIC;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Server ENV missing VAPID keys. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:admin@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// --- simpan subscription ke file sederhana ---
const DB_FILE = path.join(__dirname, 'subscriptions.json');

function readSubs() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
function writeSubs(list) {
  fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
}

app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'Push server running', vapidPublicKey: VAPID_PUBLIC_KEY.slice(0, 10) + '...' });
});

// subscribe: terima endpoint dari client
app.post('/subscribe', async (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ ok: false, message: 'Invalid subscription' });
    }
    const list = readSubs();
    const exists = list.find(s => s.endpoint === sub.endpoint);
    if (!exists) {
      list.push(sub);
      writeSubs(list);
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('subscribe error', e);
    res.status(500).json({ ok: false });
  }
});

// unsubscribe (opsional)
app.post('/unsubscribe', (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ ok: false });
    const list = readSubs().filter(s => s.endpoint !== sub.endpoint);
    writeSubs(list);
    res.json({ ok: true });
  } catch (e) {
    console.error('unsubscribe error', e);
    res.status(500).json({ ok: false });
  }
});

// kirim notifikasi ke semua subscriber
app.post('/sendNotification', async (req, res) => {
  const payload = req.body || {};
  const list = readSubs();

  const notif = {
    title: payload.title || 'Notifikasi Baru',
    body:  payload.body  || 'Ada data baru ditambahkan',
    icon:  payload.icon  || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    url:   payload.url   || '/#/'
  };

  const tasks = list.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, JSON.stringify(notif));
    } catch (err) {
      // hapus yang invalid (410/404)
      if (err.statusCode === 410 || err.statusCode === 404) {
        const remain = readSubs().filter(s => s.endpoint !== sub.endpoint);
        writeSubs(remain);
      } else {
        console.warn('sendNotification error:', err.statusCode);
      }
    }
  });

  await Promise.allSettled(tasks);
  res.json({ ok: true, sent: list.length });
});

app.listen(PORT, () => {
  console.log(`Push server listening on :${PORT}`);
});
