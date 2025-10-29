import { openDB } from 'idb';
// Pastikan path ke file config Anda benar
// Jika config.js ada di src/scripts/config.js, path ini sudah benar
import CONFIG from '../config'; 

const DB_NAME = `story-db-${CONFIG.VERSION || '1'}`;
const OBJECT_STORE_NAME = 'stories';
const QUEUE_STORE_NAME = 'sync-queue';
const FAVORITES_STORE = 'favorites';

// Bump DB version to add 'favorites' store
const dbPromise = openDB(DB_NAME, 3, {
  upgrade(database, oldVersion, newVersion, transaction) {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      // Buat object store dengan 'id' sebagai keyPath
      database.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
    }
    if (!database.objectStoreNames.contains(QUEUE_STORE_NAME)) {
      // Store untuk antrian sync ketika offline
      database.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
    if (!database.objectStoreNames.contains(FAVORITES_STORE)) {
      // Store untuk menyimpan cerita yang ditandai sebagai favorit
      database.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
    }
  },
});

const StoryIdb = {
  async getAllStories() {
    console.log('IDB: Getting all stories');
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },

  async getStory(id) {
    console.log(`IDB: Getting story with id ${id}`);
    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },

  async putStory(story) {
    if (!story || !story.id) {
      console.error('IDB: Story object must have an id');
      return;
    }
    console.log(`IDB: Putting story ${story.id}`);
    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },

  async putAllStories(stories) {
    if (!Array.isArray(stories)) {
      console.error('IDB: stories must be an array');
      return;
    }
    console.log('IDB: Putting all stories...');
    const tx = (await dbPromise).transaction(OBJECT_STORE_NAME, 'readwrite');
    await Promise.all(stories.map(story => tx.store.put(story)));
    await tx.done;
    console.log('IDB: All stories put successfully');
  },

  async deleteStory(id) {
    console.log(`IDB: Deleting story ${id}`);
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },

  async clearStories() {
    console.log('IDB: Clearing all stories');
    const tx = (await dbPromise).transaction(OBJECT_STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
  },

  // Ini untuk Kriteria 4 Skilled (interaktivitas)
  async searchStories(query) {
    console.log(`IDB: Searching stories with query "${query}"`);
    const stories = await this.getAllStories();
    const lowerCaseQuery = query.toLowerCase();
    return stories.filter(
      (story) => (story.name && story.name.toLowerCase().includes(lowerCaseQuery))
                 || (story.description && story.description.toLowerCase().includes(lowerCaseQuery))
    );
  }

  ,

  // Queue helpers untuk background sync
  async addToQueue(item) {
    console.log('IDB: Adding item to sync queue', item);
    return (await dbPromise).add(QUEUE_STORE_NAME, item);
  },

  async getAllQueue() {
    console.log('IDB: Getting all queued items');
    return (await dbPromise).getAll(QUEUE_STORE_NAME);
  },

  async deleteQueueItem(id) {
    console.log(`IDB: Deleting queued item ${id}`);
    return (await dbPromise).delete(QUEUE_STORE_NAME, id);
  },

  // Favorites CRUD
  async addFavorite(story) {
    if (!story || !story.id) {
      console.error('IDB: Favorite story must have an id');
      return;
    }
    console.log(`IDB: Adding favorite ${story.id}`);
    return (await dbPromise).put(FAVORITES_STORE, story);
  },

  async removeFavorite(id) {
    console.log(`IDB: Removing favorite ${id}`);
    return (await dbPromise).delete(FAVORITES_STORE, id);
  },

  async getAllFavorites() {
    console.log('IDB: Getting all favorites');
    return (await dbPromise).getAll(FAVORITES_STORE);
  },

  async isFavorite(id) {
    if (!id) return false;
    const item = await (await dbPromise).get(FAVORITES_STORE, id);
    return !!item;
  },

  async searchFavorites(query) {
    const favs = await this.getAllFavorites();
    const lowerCaseQuery = (query || '').toLowerCase();
    return favs.filter(
      (story) => (story.name && story.name.toLowerCase().includes(lowerCaseQuery))
                 || (story.description && story.description.toLowerCase().includes(lowerCaseQuery))
    );
  },
};

export default StoryIdb;

