import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllStories } from '../../data/api'; 

// INI ADALAH PERBAIKANNYA:
// Path diubah dari '../utils/idb-helper' menjadi '../../utils/idb-helper'
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
    requestAnimationFrame(() => {
      this.#map = L.map('map').setView([-2.5489, 118.0149], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.#map);

      this._loadInitialData();
      this._setupEventListeners();
    });
  }

  async _loadInitialData() {
    try {
      let stories = await StoryIdb.getAllStories();

      if (!stories || stories.length === 0) {
        console.log('IDB is empty. Fetching from network...');
        stories = await getAllStories();
        await StoryIdb.putAllStories(stories);
      }
      
      this._renderStoryList(stories);

    } catch (error) {
      console.error('Gagal memuat cerita:', error);
      const storyListElement = document.querySelector('#story-list');
      storyListElement.innerHTML = `<p style="color: var(--text-secondary);">Gagal memuat cerita. Coba lagi nanti.</p>`;
    }
  }

  _renderStoryList(stories) {
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

    stories.forEach(story => {
      const storyItem = document.createElement('div');
      storyItem.classList.add('story-item');
      storyItem.setAttribute('data-id', story.id);
      
      const storyDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      storyItem.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}">
        <div class="story-item-content">
          <p class="story-date">${storyDate}</p>
          <h3>${story.name}</h3>
          <p>${story.description.substring(0, 100)}...</p>
        </div>
      `;
      
      storyListElement.appendChild(storyItem);

      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.#map) 
          .bindPopup(`<b>${story.name}</b>`);
        
        marker.on('click', () => {
          this._highlightStoryItem(story.id);
        });
        this.#markers[story.id] = marker;
      }
    });
  }

  _setupEventListeners() {
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