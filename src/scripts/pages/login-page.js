import { loginUser } from '../data/api'; // <-- PERBAIKAN DI SINI
import SessionStorage from '../utils/session-storage';

class LoginPage {
  async render() {
    return `
      <div class="auth-container">
        <h2>Login</h2>
        <form id="login-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" name="email" required>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" name="password" required>
          </div>
          <button type="submit" id="submit-button" class="submit-button">Login</button>
        </form>
        <div id="feedback-message"></div>
        <p class="auth-switch">Belum punya akun? <a href="#/register">Daftar di sini</a></p>
      </div>
    `;
  }

  async afterRender() {
    // ... (sisa kode tidak berubah)
    const form = document.querySelector('#login-form');
    const feedbackElement = document.querySelector('#feedback-message');
    const submitButton = document.querySelector('#submit-button');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      if (!form.checkValidity()) {
        this._showFeedback('Email dan password harus diisi.', 'error', feedbackElement);
        return;
      }

      const email = form.elements.email.value;
      const password = form.elements.password.value;
      
      submitButton.disabled = true;
      submitButton.innerText = 'Masuk...';
      this._showFeedback('', '', feedbackElement);

      try {
        const loginResult = await loginUser({ email, password });
        SessionStorage.saveUserToken(loginResult.token);
        this._showFeedback('Login berhasil! Anda akan diarahkan ke halaman utama.', 'success', feedbackElement);
        
        setTimeout(() => {
          window.location.hash = '#/';
          window.location.reload();
        }, 1500);

      } catch (error) {
        this._showFeedback(`Login gagal: ${error.message}`, 'error', feedbackElement);
      } finally {
        submitButton.disabled = false;
        submitButton.innerText = 'Login';
      }
    });
  }

  _showFeedback(message, type, element) {
    element.innerHTML = message;
    element.className = `feedback-message ${type}`;
  }
}

export default LoginPage;