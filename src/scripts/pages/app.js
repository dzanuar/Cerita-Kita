import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import SessionStorage from '../utils/session-storage';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._updateLoginStatusUI(); // <-- Panggil fungsi baru
  }
  
  // ... (kode _setupDrawer tidak berubah)
  _setupDrawer() {
    this.#drawerButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }
  
  // --- FUNGSI BARU ---
  _updateLoginStatusUI() {
    const isLoggedIn = SessionStorage.getUserToken();
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');
    const mainNavLinks = document.querySelectorAll('.main-nav-link');

    if (isLoggedIn) {
      loginLink.style.display = 'none';
      logoutButton.style.display = 'inline-block';
      mainNavLinks.forEach(link => link.style.display = 'inline-block');
    } else {
      loginLink.style.display = 'inline-block';
      logoutButton.style.display = 'none';
      mainNavLinks.forEach(link => link.style.display = 'none');
    }

    logoutButton.addEventListener('click', (event) => {
      event.preventDefault();
      SessionStorage.removeUserToken();
      window.location.hash = '#/login';
      window.location.reload();
    });
  }

  async renderPage() {
    // --- LOGIKA PENJAGA GERBANG ---
    const url = getActiveRoute() || '/';
    const isLoggedIn = SessionStorage.getUserToken();
    const publicRoutes = ['/login', '/register'];
    
    if (!isLoggedIn && !publicRoutes.includes(url)) {
      window.location.hash = '#/login';
      return;
    }

    if (isLoggedIn && publicRoutes.includes(url)) {
      window.location.hash = '#/';
      return;
    }
    // --- AKHIR LOGIKA PENJAGA GERBANG ---

    try {
      const PageClass = routes[url];
      if (!PageClass) {
        this.#content.innerHTML = `<p>Page not found: ${url}</p>`;
        return;
      }

      const page = new PageClass();

      const hasViewTransition = typeof document.startViewTransition === 'function';
      if (!hasViewTransition) {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        return;
      }

      const transition = document.startViewTransition(async () => {
        this.#content.innerHTML = await page.render();
      });

      await transition.finished;
      await page.afterRender();

    } catch (err) {
      console.error('Unhandled error in App.renderPage:', err);
    } finally {
        this._updateLoginStatusUI(); // Perbarui UI setiap render
    }
  }
}

export default App;