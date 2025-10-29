import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Impor ini adalah "Network First" (dari api.js)
import { getAllStories } from '../../data/api'; 
// Impor ini adalah "Cache Only" (untuk pencarian)
import StoryIdb from '../../utils/idb-helper'; 

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

class HomePage {
  #map = null;
  #markers = {};

  async render() {
    // ... (Fungsi render() Anda tidak berubah) ...
    return `
      <div class="content-container">
        <div class="story-list-container">
          <h2>Daftar Cerita</h2>
          
          <div class="search-container" role="search">
            <input 
              type="search" 
              id="search-input" 
              placeholder="Cari cerita berdasarkan nama atau deskripsi..." 
              aria-label="Cari cerita"
            >
          </div>

          <div id="story-list" class="story-list"></div>
        </div>
        <div class="map-container">
          <div id="map"></div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    // ... (Fungsi afterRender() Anda tidak berubah) ...
    requestAnimationFrame(() => {
      this.#map = L.map('map').setView([-2.5489, 118.0149], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.#map);

      this._loadInitialData();
      this._setupEventListeners();
    });
  }

  // --- INI ADALAH PERBAIKAN UTAMANYA ---
  async _loadInitialData() {
    try {
      // SELALU panggil getAllStories() dari api.js
      // File ini sudah punya logika: Network first, fallback to cache (IDB)
      // dan otomatis menyimpan ke IDB jika sukses.
      console.log('Fetching stories (Network first)...');
      const stories = await getAllStories(); // <-- Ini dari api.js
      
  // Render data (baik data baru dari API, atau data lama dari IDB jika offline)
  await this._renderStoryList(stories);
    
    } catch (error) {
      // Error ini hanya akan muncul jika network GAGAL dan IDB juga KOSONG
      console.error('Gagal memuat cerita (network and cache failed):', error);
      const storyListElement = document.querySelector('#story-list');
      storyListElement.innerHTML = `<p style="color: var(--text-secondary);">Gagal memuat cerita. Coba lagi nanti.</p>`;
    }
  }
  // --- AKHIR PERBAIKAN ---

  async _renderStoryList(stories) {
    // ... (Fungsi _renderStoryList() Anda tidak berubah) ...
    const storyListElement = document.querySelector('#story-list');
    storyListElement.innerHTML = '';

    if (this.#markers) {
      Object.values(this.#markers).forEach(marker => marker.remove());
    }
    this.#markers = {}; 

    if (!stories || stories.length === 0) {
      storyListElement.innerHTML = `<p style="color: var(--text-secondary);">Tidak ada cerita ditemukan.</p>`;
      return;
    }

    for (const story of stories) {
      const storyItem = document.createElement('div');
      storyItem.classList.add('story-item');
      storyItem.setAttribute('data-id', story.id);
      
      const storyDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      storyItem.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}">
        <button class="favorite-btn" data-id="${story.id}" aria-label="Tambahkan ke favorit">☆</button>
        <div class="story-item-content">
          <p class="story-date">${storyDate}</p>
          <h3>${story.name}</h3>
          <p>${story.description.substring(0, 100)}...</p>
        </div>
      `;
      
      storyListElement.appendChild(storyItem);

      // Favorite button wiring
      try {
        const favBtn = storyItem.querySelector('.favorite-btn');
        const isFav = await StoryIdb.isFavorite(story.id);
        favBtn.textContent = isFav ? '♥' : '☆';
        favBtn.title = isFav ? 'Hapus dari favorit' : 'Tambahkan ke favorit';
        favBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation(); // Jangan trigger klik kartu
          try {
            const currentlyFav = await StoryIdb.isFavorite(story.id);
            if (currentlyFav) {
              await StoryIdb.removeFavorite(story.id);
              favBtn.textContent = '☆';
              favBtn.title = 'Tambahkan ke favorit';
            } else {
              // Store minimal story snapshot
              await StoryIdb.addFavorite({ id: story.id, name: story.name, description: story.description, photoUrl: story.photoUrl, createdAt: story.createdAt });
              favBtn.textContent = '♥';
              favBtn.title = 'Hapus dari favorit';
            }
          } catch (err) {
            console.error('Favorite toggle failed', err);
            alert('Gagal mengubah favorit: ' + err.message);
          }
        });
      } catch (err) {
        console.warn('Favorite button wiring failed', err);
      }

      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.#map) 
          .bindPopup(`<b>${story.name}</b>`);
        
        marker.on('click', () => {
          this._highlightStoryItem(story.id);
        });
        this.#markers[story.id] = marker;
        }
      }
  }

  _setupEventListeners() {
    // ... (Fungsi _setupEventListeners() Anda tidak berubah) ...
    // Catatan: Fungsi pencarian Anda masih mencari dari IDB,
    // yang datanya sudah diperbarui oleh _loadInitialData. Ini sudah benar.
    const storyListElement = document.querySelector('#story-list');
    
    storyListElement.addEventListener('click', (event) => {
      const storyItem = event.target.closest('.story-item');
      if (storyItem) {
        const storyId = storyItem.getAttribute('data-id');
        const marker = this.#markers[storyId];
        
        if (marker) {
          this.#map.flyTo(marker.getLatLng(), 13);
          marker.openPopup();
          this._highlightStoryItem(storyId);
        }
      }
    });

    const searchInput = document.querySelector('#search-input');
    searchInput.addEventListener('input', async (event) => {
      const query = event.target.value;
      const stories = await StoryIdb.searchStories(query);
      this._renderStoryList(stories);
    });
  }

  _highlightStoryItem(storyId) {
    // ... (Fungsi _highlightStoryItem() Anda tidak berubah) ...
    document.querySelectorAll('.story-item').forEach(item => {
      item.classList.remove('story-item--active');
    });

    const storyItem = document.querySelector(`.story-item[data-id="${storyId}"]`);
    if (storyItem) {
      storyItem.classList.add('story-item--active');
      storyItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

export default HomePage;