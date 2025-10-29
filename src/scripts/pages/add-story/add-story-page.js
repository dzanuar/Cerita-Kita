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
    // ... (Fungsi render() Anda tidak berubah, sudah benar) ...
    return `
      <div class="add-story-container">
        <h2>Tambah Cerita Baru</h2>
        <form id="add-story-form" class="add-story-form" novalidate>
          <div class="form-group">
            <label for="story-image">Gambar Cerita</label>
            <input type="file" id="story-image" name="photo" accept="image/*" required>
          </div>
          <div class="form-group">
            <label for="story-description">Deskripsi</label>
            <textarea id="story-description" name="description" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label>Lokasi (klik di peta)</label>
            <div id="map-add" class="map-add"></div>
            <input type="hidden" id="latitude" name="lat" required>
            <input type="hidden" id="longitude" name="lon" required>
          </div>
          <button type="submit" id="submit-button" class="submit-button">Unggah Cerita</button>
        </form>
        <div id="feedback-message"></div>
      </div>
    `;
  }

  async afterRender() {
    // ... (Fungsi afterRender() Anda tidak berubah, sudah benar) ...
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
      if (marker) {
        map.removeLayer(marker);
      }
      marker = L.marker([lat, lng]).addTo(map);
    });

    this._setupFormSubmit();
  }

  _setupFormSubmit() {
    const form = document.querySelector('#add-story-form');
    const feedbackElement = document.querySelector('#feedback-message');
    const submitButton = document.querySelector('#submit-button');
    
    // Ambil input untuk validasi manual
    const imageInput = document.querySelector('#story-image');
    const latInput = document.querySelector('#latitude');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      this._showFeedback('', '', feedbackElement); // Hapus pesan lama

      // --- TAMBAHAN VALIDASI MANUAL ---
      
      // 1. Validasi checkValidity() bawaan
      if (!form.checkValidity()) {
        this._showFeedback('Semua kolom harus diisi, termasuk gambar dan deskripsi.', 'error', feedbackElement);
        return;
      }

      // 2. Validasi Ukuran File (Pencegahan Error 413)
      const MAX_FILE_SIZE = 1000000; // 1 MB
      if (imageInput.files[0] && imageInput.files[0].size > MAX_FILE_SIZE) {
        this._showFeedback('Ukuran gambar tidak boleh lebih dari 1 MB.', 'error', feedbackElement);
        return;
      }

      // 3. Validasi Lokasi (Perbaikan Error 400)
      if (!latInput.value) {
        this._showFeedback('Silakan pilih lokasi di peta terlebih dahulu.', 'error', feedbackElement);
        return;
      }
      
      // --- AKHIR VALIDASI TAMBAHAN ---

      const formData = new FormData(form);
      
      // Tampilkan loading
      submitButton.disabled = true;
      submitButton.innerText = 'Mengunggah...';

      try {
        const response = await addNewStory(formData);
        
        // Periksa apakah ini respons offline dari api.js
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