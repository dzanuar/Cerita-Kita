import StoryIdb from '../../utils/idb-helper';

class FavoritesPage {
  async render() {
    return `
      <div class="content-container">
        <div class="story-list-container">
          <h2>Favorit Saya</h2>
          <div class="search-container" role="search">
            <input type="search" id="fav-search-input" placeholder="Cari favorit..." aria-label="Cari favorit">
          </div>
          <div id="favorites-list" class="story-list"></div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    this._loadFavorites();
    document.querySelector('#fav-search-input').addEventListener('input', async (ev) => {
      const q = ev.target.value;
      const results = await StoryIdb.searchFavorites(q);
      this._renderList(results);
    });
  }

  async _loadFavorites() {
    const favs = await StoryIdb.getAllFavorites();
    this._renderList(favs);
  }

  _renderList(favs) {
    const container = document.querySelector('#favorites-list');
    container.innerHTML = '';
    if (!favs || favs.length === 0) {
      container.innerHTML = `<p style="color: var(--text-secondary);">Belum ada favorit.</p>`;
      return;
    }

    favs.forEach((story) => {
      const item = document.createElement('div');
      item.classList.add('story-item');
      item.setAttribute('data-id', story.id);
      item.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}">
        <div class="story-item-content">
          <p class="story-date">${new Date(story.createdAt).toLocaleDateString('id-ID')}</p>
          <h3>${story.name}</h3>
          <p>${story.description ? story.description.substring(0, 120) : ''}...</p>
          <div style="margin-top:8px;">
            <button class="remove-fav" data-id="${story.id}">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(item);

      const btn = item.querySelector('.remove-fav');
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await StoryIdb.removeFavorite(story.id);
        item.remove();
      });
    });
  }
}

export default FavoritesPage;
