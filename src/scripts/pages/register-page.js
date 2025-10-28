import { registerUser } from '../data/api'; // <-- PERBAIKAN DI SINI

class RegisterPage {
  async render() {
    return `
      <div class="auth-container">
        <h2>Register</h2>
        <form id="register-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="register-name">Nama</label>
            <input type="text" id="register-name" name="name" required>
          </div>
          <div class="form-group">
            <label for="register-email">Email</label>
            <input type="email" id="register-email" name="email" required>
          </div>
          <div class="form-group">
            <label for="register-password">Password</label>
            <input type="password" id="register-password" name="password" minlength="8" required>
          </div>
          <button type="submit" id="submit-button" class="submit-button">Register</button>
        </form>
        <div id="feedback-message"></div>
        <p class="auth-switch">Sudah punya akun? <a href="#/login">Login di sini</a></p>
      </div>
    `;
  }

  async afterRender() {
    // ... (sisa kode tidak berubah)
    const form = document.querySelector('#register-form');
    const feedbackElement = document.querySelector('#feedback-message');
    const submitButton = document.querySelector('#submit-button');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      if (!form.checkValidity()) {
        this._showFeedback('Semua kolom harus diisi dengan benar.', 'error', feedbackElement);
        return;
      }
      
      const name = form.elements.name.value;
      const email = form.elements.email.value;
      const password = form.elements.password.value;
      
      submitButton.disabled = true;
      submitButton.innerText = 'Mendaftar...';
      this._showFeedback('', '', feedbackElement);

      try {
        await registerUser({ name, email, password });
        this._showFeedback('Registrasi berhasil! Anda akan diarahkan ke halaman login.', 'success', feedbackElement);
        
        setTimeout(() => {
          window.location.hash = '#/login';
        }, 2000);

      } catch (error) {
        this._showFeedback(`Registrasi gagal: ${error.message}`, 'error', feedbackElement);
      } finally {
        submitButton.disabled = false;
        submitButton.innerText = 'Register';
      }
    });
  }

  _showFeedback(message, type, element) {
    element.innerHTML = message;
    element.className = `feedback-message ${type}`;
  }
}

export default RegisterPage;