const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',
  USER_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXJaYTEzYUstdlhpcmZWUkIiLCJpYXQiOjE3NjA5ODc4MTh9.qil3JLdTUZU7KTlR4I0o69v-6NrDNkF1OxneFXUvewE',
  // Push server endpoints (adjust when deploying)
  // For local testing run the server at http://localhost:3000
  PUSH_SERVER_URL: process.env.PUSH_SERVER_URL || 'http://localhost:3000',
  PUSH_SUBSCRIBE_ENDPOINT: (process.env.PUSH_SERVER_URL || 'http://localhost:3000') + '/subscribe',
  PUSH_UNSUBSCRIBE_ENDPOINT: (process.env.PUSH_SERVER_URL || 'http://localhost:3000') + '/unsubscribe',
  PUSH_SEND_ENDPOINT: (process.env.PUSH_SERVER_URL || 'http://localhost:3000') + '/sendNotification',

  // VAPID public key (base64 url-safe). Generate via web-push generateVAPIDKeys()
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
};

export default CONFIG;
