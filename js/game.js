function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
// Game state management
const Game = (() => {
  let gameId = null;
  let gameName = '';
  let scenarioId = null;
  let scenario = null;
  let country = '';
  let epoch = '';
  let currentDate = '';
  let state = {};
  let eventLog = [];
  let isAdvancing = false;

  function currentGameId() { return gameId; }

  function initFromScenario(sc, chosenCountry) {
    const countryData = sc.countries.find(c => c.name === chosenCountry);
    if (!countryData) return;

    scenario = sc;
    scenarioId = sc.id;
    country = chosenCountry;
    epoch = sc.epoch;
    currentDate = sc.start_date;
    gameName = sc.name + ' - ' + chosenCountry;
    state = {
      economy: countryData.economy,
      military: countryData.military,
      population: countryData.population,
      diplomacy: countryData.diplomacy,
      modifiers: [],
      world: sc.initial_state || {},
      countryDescription: countryData.description
    };
    eventLog = [];
    gameId = null;

    // Init map with all countries from scenario
    GameMap.init(sc.countries, chosenCountry, sc.region);
  }

  function loadFromSave(game) {
    gameId = game.id;
    gameName = game.name;
    scenarioId = game.scenario_id;
    country = game.country;
    epoch = game.epoch;
    currentDate = game.current_date;
    state = typeof game.state === 'string' ? JSON.parse(game.state) : game.state;
    eventLog = typeof game.event_log === 'string' ? JSON.parse(game.event_log) : (game.event_log || []);
    ChatDecision.loadHistory(typeof game.chat_decision === 'string' ? JSON.parse(game.chat_decision) : (game.chat_decision || []));
    ChatInfo.loadHistory(typeof game.chat_info === 'string' ? JSON.parse(game.chat_info) : (game.chat_info || []));

    // Load scenario to get all countries for the map
    const sc = Scenarios.getById(scenarioId);
    if (sc) {
      scenario = sc;
      // Update player country stats in scenario data
      const countries = sc.countries.map(c => {
        if (c.name === country) {
          return { ...c, economy: state.economy, military: state.military, population: state.population, diplomacy: state.diplomacy };
        }
        return c;
      });
      GameMap.init(countries, country, sc.region);
    }
  }

  function updateUI() {
    UI.$('gameCountry').textContent = country;
    UI.$('gameDate').textContent = UI.formatDate(currentDate);
    UI.$('gameEpoch').textContent = epoch;

    // Player stats overlay
    UI.$('psCountryName').textContent = country;
    UI.$('statEconomy').querySelector('.stat-value').textContent = state.economy || 0;
    UI.$('statMilitary').querySelector('.stat-value').textContent = state.military || 0;
    UI.$('statPopulation').querySelector('.stat-value').textContent = state.population || 0;
    UI.$('statDiplomacy').querySelector('.stat-value').textContent = state.diplomacy || 0;

    // Update bars
    UI.$('statEconomy').querySelector('.stat-bar-fill').style.width = (state.economy || 0) + '%';
    UI.$('statMilitary').querySelector('.stat-bar-fill').style.width = (state.military || 0) + '%';
    UI.$('statPopulation').querySelector('.stat-bar-fill').style.width = (state.population || 0) + '%';
    UI.$('statDiplomacy').querySelector('.stat-bar-fill').style.width = (state.diplomacy || 0) + '%';

    // Modifiers
    const modEl = UI.$('gameModifiers');
    if (state.modifiers && state.modifiers.length > 0) {
      modEl.innerHTML = state.modifiers.map(m => `<span class="modifier-tag">${m}</span>`).join('');
    } else {
      modEl.innerHTML = '<span class="no-modifiers">Aucun modificateur</span>';
    }

    // Update map player country
    GameMap.updateCountry(country, { economy: state.economy, military: state.military, population: state.population, diplomacy: state.diplomacy });

    // Update event log overlay
    updateEventLog();
  }

  function updateEventLog() {
    const list = UI.$('eventLogList');
    const count = UI.$('eventLogCount');
    count.textContent = eventLog.length;
    if (eventLog.length === 0) {
      list.innerHTML = '<div class="muted" style="padding:8px;font-size:11px">Avancez le temps pour commencer.</div>';
      return;
    }
    // Show last 20 events, newest first
    const recent = eventLog.slice(-20).reverse();
    list.innerHTML = recent.map(e => `<div class="event-log-item"><div class="ev-date">${esc(UI.formatDate(e.date || ''))}</div><div class="ev-title">${esc(e.title || '')}</div></div>`).join('');
  }

  async function save() {
    const data = await HistoriaAPI.saveGame({
      name: gameName,
      scenarioId,
      country,
      epoch,
      currentDate,
      state,
      chatInfo: [],
      chatDecision: [],
      eventLog,
      status: 'active'
    });
    if (data.ok) {
      gameId = data.gameId;
      UI.toast('Partie sauvegardee', 'success');
    } else {
      UI.toast(data.error || 'Erreur de sauvegarde', 'error');
    }
    return data;
  }

  async function advance(duration) {
    if (isAdvancing) return;
    isAdvancing = true;

    if (!gameId) {
      const saveData = await save();
      if (!saveData.ok) { isAdvancing = false; return; }
    }

    UI.$('advanceSpinner').style.display = 'flex';
    document.querySelectorAll('.btn-advance').forEach(b => b.disabled = true);

    const pendingActions = ChatDecision.getPendingActions();
    const data = await HistoriaAPI.advance(gameId, duration, pendingActions);

    UI.$('advanceSpinner').style.display = 'none';
    document.querySelectorAll('.btn-advance').forEach(b => b.disabled = false);
    isAdvancing = false;

    if (data.ok) {
      const oldState = { ...state };

      state.economy = data.newState.economy;
      state.military = data.newState.military;
      state.population = data.newState.population;
      state.diplomacy = data.newState.diplomacy;
      state.modifiers = data.newState.modifiers || state.modifiers;
      currentDate = data.newDate;

      if (data.events) eventLog.push(...data.events);

      animateChanges(oldState, data.stateChanges);
      ChatDecision.showNarrative(data.narrative, data.events, data.stateChanges);
      ChatDecision.clearActions();
      updateUI();
      await save();
    } else {
      UI.toast(data.error, 'error');
    }
  }

  function animateChanges(oldState, changes) {
    if (!changes) return;
    const stats = ['economy', 'military', 'population', 'diplomacy'];
    const els = ['statEconomy', 'statMilitary', 'statPopulation', 'statDiplomacy'];
    for (let i = 0; i < stats.length; i++) {
      const delta = changes[stats[i]] || 0;
      if (delta !== 0) {
        UI.animateStat(UI.$(els[i]), oldState[stats[i]], state[stats[i]]);
      }
    }
  }

  return { currentGameId, initFromScenario, loadFromSave, updateUI, save, advance };
})();
