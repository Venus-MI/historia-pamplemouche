// Scenarios module
const Scenarios = (() => {
  let allScenarios = [];

  async function load() {
    const data = await HistoriaAPI.getScenarios();
    if (data.ok) allScenarios = data.scenarios;
    return allScenarios;
  }

  function getAll() { return allScenarios; }
  function getById(id) { return allScenarios.find(s => s.id === id); }

  function renderLobby() {
    const grid = UI.$('scenarioGrid');
    grid.innerHTML = '';
    for (const s of allScenarios) {
      const card = document.createElement('div');
      card.className = 'scenario-card';
      card.innerHTML = `
        <div class="scenario-epoch">${s.epoch || 'Epoque'}</div>
        <h3>${s.name}</h3>
        <div class="scenario-region">${s.region || 'Monde'}</div>
        <div class="scenario-date">${UI.formatDate(s.start_date)}</div>
        <div class="scenario-countries">${(s.countries || []).length} pays</div>
      `;
      card.onclick = () => showDetail(s);
      grid.appendChild(card);
    }
  }

  function showDetail(scenario) {
    UI.$('detailName').textContent = scenario.name;
    UI.$('detailEpoch').textContent = scenario.epoch + ' - ' + UI.formatDate(scenario.start_date);
    UI.$('detailRegion').textContent = scenario.region;
    UI.$('detailDescription').textContent = scenario.description || 'Pas de description.';

    const countriesEl = UI.$('detailCountries');
    countriesEl.innerHTML = '';
    const countries = scenario.countries || [];
    for (const c of countries) {
      const card = document.createElement('div');
      card.className = 'country-card';
      card.innerHTML = `
        <h4>${c.name}</h4>
        <p class="country-desc">${c.description || ''}</p>
        <div class="country-stats">
          <span title="Economie">💰 ${c.economy}</span>
          <span title="Militaire">⚔️ ${c.military}</span>
          <span title="Population">👥 ${c.population}</span>
          <span title="Diplomatie">🤝 ${c.diplomacy}</span>
        </div>
      `;
      card.onclick = () => {
        countriesEl.querySelectorAll('.country-card').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
        UI.$('btnLaunchGame').disabled = false;
        UI.$('btnLaunchGame').dataset.country = c.name;
      };
      countriesEl.appendChild(card);
    }

    UI.$('btnLaunchGame').disabled = true;
    UI.$('btnLaunchGame').dataset.scenarioId = scenario.id;
    UI.showScreen('screenScenarioDetail');
  }

  async function createCustom() {
    const name = UI.$('customName').value.trim();
    const description = UI.$('customDescription').value.trim();
    const epoch = UI.$('customEpoch').value.trim();
    const startDate = UI.$('customStartDate').value.trim();
    const region = UI.$('customRegion').value.trim();
    const countriesText = UI.$('customCountries').value.trim();

    if (!name) return UI.toast('Nom requis', 'error');
    if (!countriesText) return UI.toast('Au moins un pays requis', 'error');

    let countries;
    try {
      countries = JSON.parse(countriesText);
      if (!Array.isArray(countries)) throw new Error();
    } catch {
      // Try parsing as simple format: name,eco,mil,pop,diplo per line
      countries = countriesText.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          name: parts[0],
          economy: parseInt(parts[1]) || 50,
          military: parseInt(parts[2]) || 50,
          population: parseInt(parts[3]) || 50,
          diplomacy: parseInt(parts[4]) || 50,
          description: parts[5] || ''
        };
      });
    }

    const data = await HistoriaAPI.createScenario({ name, description, epoch, start_date: startDate, region, countries, initial_state: {} });
    if (data.ok) {
      UI.toast('Scenario cree !', 'success');
      await load();
      renderLobby();
      UI.showScreen('screenLobby');
    } else {
      UI.toast(data.error, 'error');
    }
  }

  return { load, getAll, getById, renderLobby, showDetail, createCustom };
})();
