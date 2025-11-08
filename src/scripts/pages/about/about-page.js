// src/scripts/pages/about/about-page.js
export default class AboutPage {
  async render() {
    return `
      <section class="container" aria-labelledby="about-title">
        <h2 id="about-title">About Page</h2>
        <p>Aplikasi Cerita Kita adalah PWA dengan dukungan offline, push notification, dan IndexedDB.</p>
      </section>
    `;
  }

  async afterRender() {
    // Do your job here
  }
}
