// Historia API module
const HistoriaAPI = (() => {
  const API = '/api/historia';
  let token = null;

  function setToken(t) { token = t; }
  function getToken() { return token; }

  function headers(json = true) {
    const h = { 'Authorization': 'Bearer ' + token };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function getScenarios() {
    const res = await fetch(API + '/scenarios');
    return res.json();
  }

  async function createScenario(data) {
    const res = await fetch(API + '/scenario', { method: 'POST', headers: headers(), body: JSON.stringify(data) });
    return res.json();
  }

  async function saveGame(data) {
    const res = await fetch(API + '/save', { method: 'POST', headers: headers(), body: JSON.stringify(data) });
    return res.json();
  }

  async function getGames() {
    const res = await fetch(API + '/games', { headers: headers(false) });
    return res.json();
  }

  async function loadGame(id) {
    const res = await fetch(API + '/load/' + id, { headers: headers(false) });
    return res.json();
  }

  async function deleteGame(gameId) {
    const res = await fetch(API + '/delete', { method: 'POST', headers: headers(), body: JSON.stringify({ gameId }) });
    return res.json();
  }

  async function getStats() {
    const res = await fetch(API + '/stats', { headers: headers(false) });
    return res.json();
  }

  async function chatInfo(gameId, message) {
    const res = await fetch(API + '/chat/info', { method: 'POST', headers: headers(), body: JSON.stringify({ gameId, message }) });
    return res.json();
  }

  async function chatDecision(gameId, message) {
    const res = await fetch(API + '/chat/decision', { method: 'POST', headers: headers(), body: JSON.stringify({ gameId, message }) });
    return res.json();
  }

  async function advance(gameId, duration, pendingActions) {
    const res = await fetch(API + '/advance', { method: 'POST', headers: headers(), body: JSON.stringify({ gameId, duration, pendingActions }) });
    return res.json();
  }

  async function validateToken(t) {
    const res = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + t } });
    return res.json();
  }

  return { setToken, getToken, getScenarios, createScenario, saveGame, getGames, loadGame, deleteGame, getStats, chatInfo, chatDecision, advance, validateToken };
})();
