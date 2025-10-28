import StoryIdb from './idb-helper';

async function reconstructFormData(bodyObj) {
  const formData = new FormData();
  for (const key of Object.keys(bodyObj)) {
    const val = bodyObj[key];
    if (val && typeof val === 'object' && (val instanceof Blob || typeof val.size === 'number')) {
      // val is a Blob/File
      const filename = val.name || key;
      formData.append(key, val, filename);
    } else {
      formData.append(key, val);
    }
  }
  return formData;
}

export async function flushQueueViaClient() {
  const queued = await StoryIdb.getAllQueue();
  if (!queued || queued.length === 0) return { flushed: 0 };

  let flushed = 0;
  for (const item of queued) {
    try {
      let body = item.body;
      let options = { method: item.method || 'POST', headers: item.headers || {} };

      if (body && typeof body === 'object') {
        try {
          body = await reconstructFormData(body);
          // remove content-type if present
          if (options.headers && options.headers['Content-Type']) delete options.headers['Content-Type'];
        } catch (err) {
          // fallback to JSON
          body = JSON.stringify(body);
          options.headers = Object.assign({}, options.headers, { 'Content-Type': 'application/json' });
        }
      }

      const res = await fetch(item.url, Object.assign(options, { body }));
      if (res && (res.status === 200 || res.status === 201)) {
        await StoryIdb.deleteQueueItem(item.id);
        flushed += 1;
      } else {
        console.warn('flushQueue: server rejected item', item, res && res.status);
      }
    } catch (err) {
      console.warn('flushQueue: failed to send queued item', err);
      // keep item for later
    }
  }

  return { flushed };
}

export function setupAutoFlush({ intervalMs = 30000 } = {}) {
  // Flush on online event and periodically when online
  window.addEventListener('online', async () => {
    console.log('Network online — attempting to flush queue');
    try {
      const res = await flushQueueViaClient();
      console.log('Auto flush result:', res);
    } catch (err) {
      console.error('Auto flush error:', err);
    }
  });

  // Periodic flush when online
  setInterval(async () => {
    if (navigator.onLine) {
      try {
        const res = await flushQueueViaClient();
        if (res.flushed && res.flushed > 0) console.log('Periodic flush sent', res.flushed, 'items');
      } catch (err) {
        console.error('Periodic flush error:', err);
      }
    }
  }, intervalMs);
}

export default { flushQueueViaClient, setupAutoFlush };
