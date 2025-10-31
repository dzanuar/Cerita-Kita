import StoryIdb from '../../utils/idb-helper';

class FavoritesPage {
  async render() {
    return `
      <div class="story-list-container">
        <h2>Favorit Saya</h2>
        <div class="search-container" role="search">

          <label for="fav-search-input" class="visually-hidden">Cari di antara favorit Anda</label>
          
          <input type="search" id="fav-search-input" placeholder="Cari favorit..">
        </div>
        <div id="favorites-list" class="story-list">
          </div>
      </div>
    `;
  }

  async afterRender() {
    this._renderFavoritesList();
    
    const searchInput = document.querySelector('#fav-search-input');
    searchInput.addEventListener('input', (event) => {
      const query = event.target.value;
      this._renderFavoritesList(query);
    });
  }

  async _renderFavoritesList(query = '') {
    let stories;
    if (query) {
      stories = await StoryIdb.searchFavorites(query);
    } else {
      stories = await StoryIdb.getAllFavorites();
    }
    
    const favoritesListElement = document.querySelector('#favorites-list');
    favoritesListElement.innerHTML = '';

    if (!stories || stories.length === 0) {
      favoritesListElement.innerHTML = `<p style="color: var(--text-secondary);">Anda belum memiliki cerita favorit.</p>`;
      return;
    }

    stories.forEach(story => {
      const storyItem = document.createElement('div');
      storyItem.classList.add('story-item');
      
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
        <button class="delete-favorite-button" data-story-id="${story.id}" aria-label="Hapus dari favorit">Hapus</button>
      `;
      favoritesListElement.appendChild(storyItem);
    });
    
    this._setupDeleteButtons();
  }
  
  _setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-favorite-button');
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const storyId = event.target.dataset.storyId;
        await StoryIdb.removeFavorite(storyId);
        
        // Render ulang daftar setelah menghapus
        const query = document.querySelector('#fav-search-input').value;
        this._renderFavoritesList(query);
      });
    });
  }
}

export default FavoritesPage;