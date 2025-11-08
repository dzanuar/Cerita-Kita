// src/scripts/pages/add-story/add-story-page.js
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addNewStory } from '../../data/api';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

class AddStoryPage {
  async render() {
    return `
      <div class="add-story-container">
        <h2 id="add-story-title">Tambah Cerita Baru</h2>

        <form id="add-story-form" class="add-story-form" novalidate aria-labelledby="add-story-title">
          <div class="form-group">
            <label for="story-image">Gambar Cerita</label>
            <input type="file" id="story-image" name="photo" accept="image/*" required aria-describedby="image-help">
            <small id="image-help" class="help-text">Pilih gambar pendukung cerita (maks 1 MB).</small>
          </div>

          <div class="form-group">
            <label for="story-description">Deskripsi</label>
            <textarea id="story-description" name="description" rows="4" required aria-describedby="desc-help"></textarea>
            <small id="desc-help" class="help-text">Ceritakan pengalaman Anda secara singkat.</small>
          </div>

          <!-- Kelompok lokasi menggunakan fieldset/legend agar lebih aksesibel -->
          <fieldset class="form-group" aria-describedby="map-help">
            <legend>Lokasi (klik di peta)</legend>

            <!-- map container: beri role dan label -->
            <div
              id="map-add"
              class="map-add"
              role="application"
              aria-label="Peta untuk memilih lokasi cerita"
              tabindex="0"
            ></div>
            <small id="map-help" class="help-text">Klik pada peta untuk memilih lokasi. Koordinat akan terisi otomatis.</small>

            <!-- Input koordinat tetap required, dibuat readonly dan disembunyikan secara visual
                 supaya punya pasangan label–input yang valid untuk aksesibilitas -->
            <div class="visually-hidden">
              <label for="latitude">Latitude</label>
              <input type="text" id="latitude" name="lat" required readonly>

              <label for="longitude">Longitude</label>
              <input type="text" id="longitude" name="lon" required readonly>
            </div>
          </fieldset>

          <button type="submit" id="submit-button" class="submit-button">Unggah Cerita</button>
        </form>

        <div id="feedback-message" role="status" aria-live="polite"></div>
      </div>
    `;
  }

  async afterRender() {
    const map = L.map('map-add').setView([-2.5489, 118.0149], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker;
    const latInput = document.querySelector('#latitude');
    const lonInput = document.querySelector('#longitude');

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      latInput.value = lat;
      lonInput.value = lng;

      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
    });

    this._setupFormSubmit();
  }

  _setupFormSubmit() {
    const form = document.querySelector('#add-story-form');
    const feedbackElement = document.querySelector('#feedback-message');
    const submitButton = document.querySelector('#submit-button');

    const imageInput = document.querySelector('#story-image');
    const latInput = document.querySelector('#latitude');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      this._showFeedback('', '', feedbackElement);

      // 1) Validasi bawaan
      if (!form.checkValidity()) {
        this._showFeedback('Semua kolom harus diisi, termasuk gambar dan deskripsi.', 'error', feedbackElement);
        return;
      }

      // 2) Batas ukuran file
      const MAX_FILE_SIZE = 1000000; // 1 MB
      if (imageInput.files[0] && imageInput.files[0].size > MAX_FILE_SIZE) {
        this._showFeedback('Ukuran gambar tidak boleh lebih dari 1 MB.', 'error', feedbackElement);
        return;
      }

      // 3) Pastikan lokasi sudah dipilih
      if (!latInput.value) {
        this._showFeedback('Silakan pilih lokasi di peta terlebih dahulu.', 'error', feedbackElement);
        return;
      }

      const formData = new FormData(form);

      submitButton.disabled = true;
      submitButton.innerText = 'Mengunggah...';

      try {
        const response = await addNewStory(formData);

        if (response.offline) {
          this._showFeedback(response.message, 'success', feedbackElement);
        } else {
          this._showFeedback('Cerita berhasil ditambahkan!', 'success', feedbackElement);
        }

        form.reset();

        setTimeout(() => {
          window.location.hash = '#/';
        }, 2000);
      } catch (error) {
        this._showFeedback(`Gagal menambahkan cerita: ${error.message}`, 'error', feedbackElement);
      } finally {
        submitButton.disabled = false;
        submitButton.innerText = 'Unggah Cerita';
      }
    });
  }

  _showFeedback(message, type, element) {
    element.innerHTML = message;
    element.className = `feedback-message ${type}`;
  }
}

export default AddStoryPage;
