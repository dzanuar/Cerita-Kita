import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register';



// DEBUG 1: Pastikan impor ini terbaca
console.log('DEBUG: index.js file loaded'); 
import swRegister from './utils/sw-register';

document.addEventListener('DOMContentLoaded', async () => {
  // DEBUG 2: Pastikan DOMContentLoaded berjalan
  console.log('DEBUG: DOMContentLoaded event FIRED');

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  window.addEventListener('load', () => {
    // DEBUG 3: Pastikan window.load berjalan
    console.log('DEBUG: window.load event FIRED');
    swRegister(); 
  });
  document.addEventListener('DOMContentLoaded', () => {
  swRegister();
});

});