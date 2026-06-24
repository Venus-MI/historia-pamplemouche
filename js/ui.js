// UI Helpers
const UI = (() => {
  function $(id) { return document.getElementById(id); }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id);
    if (el) el.classList.add('active');
  }

  function toast(msg, type = 'info') {
    const container = $('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function confirm(msg, onYes) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `<div class="modal"><p>${msg}</p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn btn-secondary" id="confirmNo">Annuler</button><button class="btn btn-primary" id="confirmYes">Confirmer</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmNo').onclick = () => overlay.remove();
    overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); onYes(); };
  }

  function formatDate(d) {
    if (!d) return '?';
    if (d.startsWith('-')) return d.replace('-', '') + ' av. J.-C.';
    return d;
  }

  function animateStat(el, oldVal, newVal) {
    const delta = newVal - oldVal;
    if (delta === 0) return;
    const deltaEl = document.createElement('span');
    deltaEl.className = 'stat-delta ' + (delta > 0 ? 'positive' : 'negative');
    deltaEl.textContent = (delta > 0 ? '+' : '') + delta;
    el.appendChild(deltaEl);
    setTimeout(() => deltaEl.remove(), 2000);

    let current = oldVal;
    const step = delta > 0 ? 1 : -1;
    const interval = setInterval(() => {
      current += step;
      el.querySelector('.stat-value').textContent = current;
      if (current === newVal) clearInterval(interval);
    }, 30);
  }

  return { $, showScreen, toast, confirm, formatDate, animateStat };
})();
