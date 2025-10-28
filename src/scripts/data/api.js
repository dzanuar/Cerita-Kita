import CONFIG from '../config';
import SessionStorage from '../utils/session-storage';
import Spinner from '../utils/spinner-control';
import StoryIdb from '../utils/idb-helper'; // <-- Impor IdbHelper

const API_ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
};

// ... (Fungsi registerUser dan loginUser tetap sama) ...
export async function registerUser({ name, email, password }) {
  Spinner.show();
  try {
    const response = await fetch(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const responseJson = await response.json();
    if (responseJson.error) throw new Error(responseJson.message);
    return responseJson;
  } catch (error) {
    throw error;
  } finally {
    Spinner.hide();
  }
}

export async function loginUser({ email, password }) {
  Spinner.show();
  try {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const responseJson = await response.json();
    if (responseJson.error) throw new Error(responseJson.message);
    return responseJson.loginResult;
  } catch (error) {
    throw error;
  } finally {
    Spinner.hide();
  }
}
// --- Modifikasi getAllStories ---
export async function getAllStories() {
  Spinner.show();
  const token = SessionStorage.getUserToken();
  if (!token) {
    Spinner.hide();
    throw new Error('User not authenticated');
  }

  try {
    // 1. Coba fetch dari API
    const response = await fetch(API_ENDPOINTS.STORIES, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const responseJson = await response.json();
    if (responseJson.error) throw new Error(responseJson.message);

    // 2. Jika sukses, simpan ke IndexedDB (Kriteria 4 Basic)
    await StoryIdb.clearStories(); // Bersihkan data lama
    await StoryIdb.putAllStories(responseJson.listStory); // Simpan data baru

    return responseJson.listStory;
  } catch (error) {
    // 3. Jika API gagal (misal: offline), ambil dari IndexedDB
    console.warn('API fetch failed, falling back to IndexedDB:', error);
    const stories = await StoryIdb.getAllStories();
    if (stories && stories.length > 0) {
      console.log('Returning stories from IndexedDB');
      return stories;
    }
    // Jika di IndexedDB juga tidak ada, baru lempar error
    console.error('Error fetching stories from API and IDB is empty:', error);
    throw new Error('Failed to fetch stories and no offline data available.');
  } finally {
    Spinner.hide();
  }
}

// ... (Fungsi addNewStory tetap sama) ...
// CATATAN: Kriteria 4 Advanced (Sync) tidak kita kejar.
// Jadi, addNewStory biarkan gagal jika offline.
export async function addNewStory(formData) {
  Spinner.show();
  const token = SessionStorage.getUserToken();
  if (!token) {
    Spinner.hide();
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(API_ENDPOINTS.STORIES, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const responseJson = await response.json();
    if (responseJson.error) throw new Error(responseJson.message);
    return responseJson;
  } catch (error) {
    console.error('Error adding new story:', error);
    // Jika gagal karena offline atau network error, tambahkan ke queue dan register background sync
    try {
      // Convert FormData to a plain object but keep File/Blob instances as-is (idb supports Blobs)
      const bodyObj = {};
      for (const pair of formData.entries()) {
        const [key, value] = pair;
        // If value is File (from input[type=file]), keep the File/Blob object so IDB can store it
        bodyObj[key] = value;
      }

      const queuedItem = {
        url: API_ENDPOINTS.STORIES,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: bodyObj, // store as structured cloneable object with Blobs/Files
        createdAt: Date.now(),
      };

      // Simpan ke IndexedDB queue
      await StoryIdb.addToQueue(queuedItem);

      // Coba registrasi background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        try {
          await reg.sync.register('sync-new-stories');
        } catch (syncErr) {
          console.warn('Background sync registration failed:', syncErr);
        }
      }

      return { offline: true, message: 'Cerita disimpan sementara dan akan diunggah saat online.' };
    } catch (qErr) {
      console.error('Gagal menambahkan ke queue:', qErr);
      throw error; // lempar error asli
    }
  } finally {
    Spinner.hide();
  }
}
