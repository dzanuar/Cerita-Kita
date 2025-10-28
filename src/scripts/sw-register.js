const swRegister = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Browser tidak mendukung Service Worker');
    return;
  }

  try {
    // Registrasi harus menunjuk ke file service worker yang dihasilkan (sw.js)
    // Gunakan path dari root agar konsisten dengan publicPath webpack
    const swUrl = '/sw.js';
    const registration = await navigator.serviceWorker.register(swUrl);
    console.log('Service Worker berhasil terdaftar:', registration);

    // Proses update SW baru
    if (registration.waiting) {
      console.log('SW baru waiting');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

  // Tambahkan event listener untuk update
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('SW update ditemukan');

      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            console.log('Update SW tersedia — beri tahu pengguna atau reload.');
            // opsi: otomatis reload atau tampilkan notifikasi update
            window.location.reload();
          } else {
            console.log('Konten siap digunakan offline');
          }
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('SW gagal terdaftar:', error);
  }
};

export default swRegister;
