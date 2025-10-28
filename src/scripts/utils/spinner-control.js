const Spinner = {
  show() {
    const spinnerElement = document.querySelector('#loading-spinner');
    if (spinnerElement) {
      spinnerElement.style.display = 'flex';
    }
  },

  hide() {
    const spinnerElement = document.querySelector('#loading-spinner');
    if (spinnerElement) {
      spinnerElement.style.display = 'none';
    }
  },
};

export default Spinner;