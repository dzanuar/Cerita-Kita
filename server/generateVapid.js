const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC:', keys.publicKey);
console.log('VAPID_PRIVATE:', keys.privateKey);

// Optionally write to .env file for convenience
const envPath = path.resolve(__dirname, '..', '.env');
let content = '';
if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8');
content += `\nVAPID_PUBLIC=${keys.publicKey}\nVAPID_PRIVATE=${keys.privateKey}\n`;
fs.writeFileSync(envPath, content);
console.log('Wrote keys to .env (project root). Set VAPID_PUBLIC and VAPID_PRIVATE env vars before running server.');
