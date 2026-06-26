// Historia - Main entry point
(async function() {
  let token = null;
  let username = null;

  // Token persistence
  function saveToken(t) { localStorage.setItem('historia_token', t); }
  function clearToken() { localStorage.removeItem('historia_token'); }
  function loadToken() { return localStorage.getItem('historia_token'); }

  // Resolve identity via centralized Pamplemouche auth
  // (reads #token hash -> .pamplemouche.com cookie -> legacy localStorage)
  let pampUser = null;
  try { pampUser = await PampAuth.init(); } catch (e) {}
  if (pampUser) {
    token = PampAuth.getToken();
  } else {
    // Legacy fallback: URL hash then local storage
    const hash = window.location.hash;
    const hashMatch = hash.match(/token=([^&]+)/);
    if (hashMatch) {
      token = hashMatch[1];
      window.location.hash = '';
    } else {
      token = loadToken();
    }
  }
  if (token) saveToken(token);

  // Init modules
  ChatInfo.init();
  ChatDecision.init();

  // Validate token if we have one
  if (token) {
    await fetchMe(token);
  } else {
    showLoggedOut();
  }
  await initLobby();

  async function fetchMe(t) {
    try {
      const data = await HistoriaAPI.validateToken(t);
      if (data.ok) {
        token = t;
        username = data.username;
        HistoriaAPI.setToken(token);
        saveToken(token);
        updateAuthUI();
      } else {
        clearToken();
        token = null;
        showLoggedOut();
      }
    } catch (e) {
      clearToken();
      token = null;
      showLoggedOut();
    }
  }

  function updateAuthUI() {
    UI.$('headerUser').textContent = username;
    UI.$('headerUser').style.display = 'inline';
    UI.$('btnLogin').style.display = 'none';
    UI.$('btnLogout').style.display = 'inline';
  }

  function showLoggedOut() {
    UI.$('headerUser').style.display = 'none';
    UI.$('btnLogin').style.display = 'inline';
    UI.$('btnLogout').style.display = 'none';
    username = null;
  }

  async function initLobby() {
    await Scenarios.load();
    Scenarios.renderLobby();
    await loadSavedGames();
    UI.showScreen('screenLobby');
  }

  async function loadSavedGames() {
    if (!HistoriaAPI.getToken()) {
      UI.$('savedGamesList').innerHTML = '<p class="muted">Connectez-vous pour voir vos parties sauvegardees.</p>';
      return;
    }
    const data = await HistoriaAPI.getGames();
    const list = UI.$('savedGamesList');
    if (!data.ok || !data.games || data.games.length === 0) {
      list.innerHTML = '<p class="muted">Aucune partie sauvegardee.</p>';
      return;
    }
    list.innerHTML = '';
    for (const g of data.games) {
      const el = document.createElement('div');
      el.className = 'saved-game-card';
      el.innerHTML = `
        <div class="saved-game-info">
          <strong>${g.name}</strong>
          <span>${g.country} - ${UI.formatDate(g.current_date)}</span>
          <span class="muted">${new Date(g.updated_at).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="saved-game-actions">
          <button class="btn btn-primary btn-sm" data-load="${g.id}">Charger</button>
          <button class="btn btn-danger btn-sm" data-delete="${g.id}">Suppr</button>
        </div>
      `;
      el.querySelector('[data-load]').onclick = () => loadGame(g.id);
      el.querySelector('[data-delete]').onclick = () => {
        UI.confirm('Supprimer cette partie ?', async () => {
          await HistoriaAPI.deleteGame(g.id);
          UI.toast('Partie supprimee', 'success');
          loadSavedGames();
        });
      };
      list.appendChild(el);
    }
  }

  async function loadGame(id) {
    if (!HistoriaAPI.getToken()) return UI.toast('Connectez-vous d\'abord', 'error');
    const data = await HistoriaAPI.loadGame(id);
    if (data.ok) {
      Game.loadFromSave(data.game);
      Game.updateUI();
      UI.showScreen('screenGame');
    } else {
      UI.toast(data.error, 'error');
    }
  }

  // === AUTH MODAL ===
  UI.$('btnLogin').onclick = () => {
    // Centralized login owns sign-in / registration now
    PampAuth.redirectToLogin();
  };

  // Tab switching
  window.switchAuthTab = function(tab, btn) {
    UI.$('auth-login').style.display = tab === 'login' ? 'block' : 'none';
    UI.$('auth-register').style.display = tab === 'register' ? 'block' : 'none';
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    UI.$('login-msg').textContent = '';
    UI.$('reg-msg').textContent = '';
  };

  // Login
  UI.$('btnDoLogin').onclick = doLogin;
  UI.$('login-pass').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  UI.$('login-user').onkeydown = (e) => { if (e.key === 'Enter') UI.$('login-pass').focus(); };

  async function doLogin() {
    // Sign-in is handled by the centralized Pamplemouche login page
    PampAuth.redirectToLogin();
  }

  // Register
  UI.$('btnDoRegister').onclick = doRegister;
  UI.$('reg-pass').onkeydown = (e) => { if (e.key === 'Enter') doRegister(); };

  async function doRegister() {
    // Registration is handled by the centralized Pamplemouche login page
    PampAuth.redirectToLogin();
  }

  // Logout
  UI.$('btnLogout').onclick = () => {
    token = null;
    username = null;
    HistoriaAPI.setToken(null);
    clearToken();
    // Revoke the centralized session + clear legacy keys, then go to login
    PampAuth.logout();
  };

  // Close modal on background click
  UI.$('authModal').onclick = (e) => {
    if (e.target === UI.$('authModal')) UI.$('authModal').classList.remove('active');
  };

  // === GAME BUTTONS ===

  UI.$('btnLaunchGame').onclick = async () => {
    if (!HistoriaAPI.getToken()) return UI.toast('Connectez-vous d\'abord', 'error');
    const scenarioId = parseInt(UI.$('btnLaunchGame').dataset.scenarioId);
    const countryName = UI.$('btnLaunchGame').dataset.country;
    const scenario = Scenarios.getById(scenarioId);
    if (!scenario || !countryName) return;

    Game.initFromScenario(scenario, countryName);
    Game.updateUI();
    UI.showScreen('screenGame');
    await Game.save();
  };

  UI.$('btnBackLobby').onclick = () => {
    loadSavedGames();
    UI.showScreen('screenLobby');
  };

  UI.$('btnBackFromDetail').onclick = () => UI.showScreen('screenLobby');
  UI.$('btnCreateScenario').onclick = () => UI.showScreen('screenCustom');
  UI.$('btnBackFromCustom').onclick = () => UI.showScreen('screenLobby');
  UI.$('btnSubmitCustom').onclick = () => Scenarios.createCustom();

  // Time advance buttons
  document.querySelectorAll('.btn-advance').forEach(btn => {
    btn.onclick = () => {
      if (!HistoriaAPI.getToken()) return UI.toast('Non authentifie', 'error');
      Game.advance(btn.dataset.duration);
    };
  });

  UI.$('btnSave').onclick = () => {
    if (!HistoriaAPI.getToken()) return UI.toast('Non authentifie', 'error');
    Game.save();
  };

})();
