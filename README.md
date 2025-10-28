# App Starter Project with Webpack

Proyek ini adalah setup dasar untuk aplikasi web yang menggunakan webpack untuk proses bundling, Babel untuk transpile JavaScript, serta mendukung proses build dan serving aplikasi.

## Table of Contents

- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (disarankan versi 12 atau lebih tinggi)
- [npm](https://www.npmjs.com/) (Node package manager)

### Installation

1. Download starter project [di sini](https://raw.githubusercontent.com/dicodingacademy/a219-web-intermediate-labs/099-shared-files/starter-project-with-webpack.zip).
2. Lakukan unzip file.
3. Pasang seluruh dependencies dengan perintah berikut.
   ```shell
   npm install
   ```

### Optional: Run local Push Server (for testing Push notifications)

This project includes a small Express push server at `server/index.js` that uses `web-push` to send notifications.

1. Generate VAPID keys (run once):

  ```powershell
  node server/generateVapid.js
  ```

  The script prints VAPID_PUBLIC and VAPID_PRIVATE and writes them to a `.env` file in the project root.

2. Export the VAPID keys into your environment (Windows PowerShell example):

  ```powershell
  $env:VAPID_PUBLIC = "<paste public key here>"
  $env:VAPID_PRIVATE = "<paste private key here>"
  npm run start:server
  ```

  Or run in development with auto-reload:
  ```powershell
  npm run dev:server
  ```

3. The server listens on port 3000 by default. It exposes these endpoints:
  - `POST /subscribe` — accepts a push subscription from the client and stores it.
  - `POST /unsubscribe` — remove subscription (supply `{ endpoint }`).
  - `POST /sendNotification` — send a JSON payload to all stored subscriptions. Body example:
    ```json
    { "title": "Hello", "body": "Test push", "url": "/", "data": {}} 
    ```
  - `GET /subscriptions` — list saved subscriptions.

Note: For production you should deploy this server to a secure hosting (Render, Railway, Heroku, etc.) and set `PUSH_SERVER_URL` in `src/scripts/config.js` to point to the hosted server.
## Deployment (Netlify + Render)

This project supports deploying the frontend to Netlify and the push backend to Render. The frontend build will have environment variables injected at build time using Webpack's DefinePlugin. Follow these steps:

1. Generate VAPID keys locally (or generate on server):

  ```powershell
  node server/generateVapid.js
  # copy the printed VAPID_PUBLIC and VAPID_PRIVATE
  ```

2. Deploy backend to Render (or any Node host):
  - Create a new Web Service on Render and connect your repository.
  - Set environment variables on Render: `VAPID_PUBLIC` and `VAPID_PRIVATE` with the keys from step 1.
  - Set the start command to `npm run start:server`.
  - Deploy. After deploy, note the service URL (e.g. https://pwa-push-server.onrender.com).

3. Configure Netlify for frontend:
  - In Netlify site settings, set Environment Variables for the build:
    - `VAPID_PUBLIC_KEY` = your public VAPID key
    - `PUSH_SERVER_URL` = https://your-push-server.onrender.com
  - Add `netlify.toml` (already included) and connect your repository to Netlify.
  - Netlify will run `npm run build` and publish `dist`.

4. After deploy finishes:
  - Open your Netlify site (HTTPS). Visit the site and click the push toggle.
  - The client will subscribe and POST subscription to the Render push server `/subscribe` endpoint.
  - Use the Render server `/sendNotification` endpoint (or UI) to send a test push.

Notes:
 - For local testing, you can set environment variables in PowerShell before building:
  ```powershell
  $env:VAPID_PUBLIC_KEY = '<paste public key>'
  $env:PUSH_SERVER_URL = 'http://localhost:3000'
  npm run build
  npx serve dist --listen 5000
  ```
 - The `webpack.common.js` uses DefinePlugin to replace `process.env.PUSH_SERVER_URL` and `process.env.VAPID_PUBLIC_KEY` at build-time.

## Scripts

- Build for Production:
  ```shell
  npm run build
  ```
  Script ini menjalankan webpack dalam mode production menggunakan konfigurasi `webpack.prod.js` dan menghasilkan sejumlah file build ke direktori `dist`.

- Start Development Server:
  ```shell
  npm run start-dev
  ```
  Script ini menjalankan server pengembangan webpack dengan fitur live reload dan mode development sesuai konfigurasi di`webpack.dev.js`.

- Serve:
  ```shell
  npm run serve
  ```
  Script ini menggunakan [`http-server`](https://www.npmjs.com/package/http-server) untuk menyajikan konten dari direktori `dist`.

## Project Structure

Proyek starter ini dirancang agar kode tetap modular dan terorganisir.

```text
starter-project/
├── dist/                   # Compiled files for production
├── src/                    # Source project files
│   ├── public/             # Public files
│   ├── scripts/            # Source JavaScript files
│   │   └── index.js        # Main JavaScript entry file
│   ├── styles/             # Source CSS files
│   │   └── styles.css      # Main CSS file
│   └── index.html/         # Main HTML file
├── package.json            # Project metadata and dependencies
├── package-lock.json       # Project metadata and dependencies
├── README.md               # Project documentation
├── STUDENT.txt             # Student information
├── webpack.common.js       # Webpack common configuration
├── webpack.dev.js          # Webpack development configuration
└── webpack.prod.js         # Webpack production configuration
```
