// Map rendering and country interaction
const GameMap = (() => {
  const COUNTRY_COLORS = ['#ffc832', '#ff6666', '#44cc44', '#6699ff', '#ff88ff', '#ff9944', '#44dddd', '#cc88ff'];
  let countries = [];
  let playerCountry = '';
  let selectedCountry = null;
  let positions = {};

  // Region-based layout templates (x, y in 0-1000, 0-600 space)
  const LAYOUTS = {
    'Europe': [
      { x: 420, y: 280 }, // center (France)
      { x: 620, y: 200 }, // east (Germany/Prussia)
      { x: 200, y: 350 }, // west (Spain/Portugal)
      { x: 340, y: 150 }, // north (Britain)
      { x: 700, y: 350 }, // southeast (Austria/Ottoman)
      { x: 800, y: 200 }, // far east (Russia)
    ],
    'Mediterranee': [
      { x: 350, y: 250 }, // west center (Rome)
      { x: 650, y: 400 }, // south (Carthage)
      { x: 700, y: 200 }, // east (Macedonia)
      { x: 800, y: 350 }, // far east (Egypt)
      { x: 900, y: 250 }, // far east (Seleucid)
    ],
    'Japon': [
      { x: 500, y: 250 }, // center (Oda)
      { x: 600, y: 150 }, // east (Takeda)
      { x: 500, y: 100 }, // north (Uesugi)
      { x: 300, y: 300 }, // west (Mori)
      { x: 300, y: 450 }, // south (Shimazu)
    ],
    'Monde': [
      { x: 200, y: 250 }, // Americas/West
      { x: 450, y: 200 }, // Europe center
      { x: 600, y: 350 }, // Middle East/Africa
      { x: 400, y: 150 }, // North Europe
      { x: 750, y: 250 }, // Asia
      { x: 550, y: 200 }, // East Europe
    ],
    'Ameriques': [
      { x: 400, y: 200 }, // North America
      { x: 700, y: 250 }, // Britain (across ocean)
      { x: 500, y: 400 }, // France
      { x: 600, y: 400 }, // Spain
    ],
    'Asie': [
      { x: 400, y: 200 }, // Central (Mongol)
      { x: 700, y: 300 }, // East (Jin)
      { x: 750, y: 400 }, // Southeast (Song)
      { x: 250, y: 350 }, // West (Khwarezmia)
      { x: 350, y: 450 }, // South (Delhi)
    ],
  };

  function init(scenarioCountries, playerName, region) {
    countries = scenarioCountries;
    playerCountry = playerName;
    selectedCountry = null;

    // Get positions from layout or generate default
    const layout = LAYOUTS[region] || generateDefaultLayout(countries.length);
    positions = {};
    countries.forEach((c, i) => {
      const pos = layout[i] || { x: 150 + (i % 4) * 220, y: 120 + Math.floor(i / 4) * 200 };
      positions[c.name] = { x: pos.x, y: pos.y };
    });

    render();
  }

  function generateDefaultLayout(count) {
    const positions = [];
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: 150 + col * (700 / Math.max(cols - 1, 1)),
        y: 150 + row * (350 / Math.max(Math.ceil(count / cols) - 1, 1))
      });
    }
    return positions;
  }

  function render() {
    const svg = document.getElementById('gameMap');
    svg.innerHTML = '';

    // Background grid
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a1a1a" stroke-width="0.5"/>
      </pattern>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    `;
    svg.appendChild(defs);

    // Grid background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '1000');
    bg.setAttribute('height', '600');
    bg.setAttribute('fill', 'url(#grid)');
    svg.appendChild(bg);

    // Draw connection lines between countries
    const countryNames = Object.keys(positions);
    for (let i = 0; i < countryNames.length; i++) {
      for (let j = i + 1; j < countryNames.length; j++) {
        const a = positions[countryNames[i]];
        const b = positions[countryNames[j]];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (dist < 400) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', a.x);
          line.setAttribute('y1', a.y);
          line.setAttribute('x2', b.x);
          line.setAttribute('y2', b.y);
          line.setAttribute('stroke', '#1a1a1a');
          line.setAttribute('stroke-width', '1');
          line.setAttribute('stroke-dasharray', '4,8');
          line.setAttribute('opacity', '0.5');
          svg.appendChild(line);
        }
      }
    }

    // Draw countries
    countries.forEach((c, i) => {
      const pos = positions[c.name];
      const isPlayer = c.name === playerCountry;
      const color = isPlayer ? '#ffc832' : COUNTRY_COLORS[i % COUNTRY_COLORS.length];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-country');
      g.setAttribute('data-country', c.name);
      g.style.cursor = 'pointer';

      // Territory shape (hexagon-ish blob)
      const size = 40 + (c.military || 50) * 0.3;
      const hex = makeHexPath(pos.x, pos.y, size);
      const territory = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      territory.setAttribute('d', hex);
      territory.setAttribute('fill', color);
      territory.setAttribute('fill-opacity', isPlayer ? '0.3' : '0.15');
      territory.setAttribute('stroke', color);
      territory.setAttribute('stroke-width', isPlayer ? '2.5' : '1.5');
      territory.setAttribute('filter', isPlayer ? 'url(#glow)' : '');
      g.appendChild(territory);

      // Country name
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y - 8);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', color);
      text.setAttribute('font-size', isPlayer ? '15' : '13');
      text.setAttribute('font-weight', isPlayer ? '700' : '500');
      text.setAttribute('font-family', 'Segoe UI, system-ui, sans-serif');
      text.textContent = c.name;
      g.appendChild(text);

      // Power indicator
      const power = Math.round(((c.economy || 50) + (c.military || 50) + (c.population || 50) + (c.diplomacy || 50)) / 4);
      const pwrText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      pwrText.setAttribute('x', pos.x);
      pwrText.setAttribute('y', pos.y + 12);
      pwrText.setAttribute('text-anchor', 'middle');
      pwrText.setAttribute('fill', '#888');
      pwrText.setAttribute('font-size', '11');
      pwrText.setAttribute('font-family', 'Segoe UI, system-ui, sans-serif');
      pwrText.textContent = '⬡ ' + power;
      g.appendChild(pwrText);

      // Player marker
      if (isPlayer) {
        const crown = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        crown.setAttribute('x', pos.x);
        crown.setAttribute('y', pos.y - 28);
        crown.setAttribute('text-anchor', 'middle');
        crown.setAttribute('font-size', '18');
        crown.textContent = '👑';
        g.appendChild(crown);
      }

      // Click handler
      g.addEventListener('click', () => selectCountry(c.name));

      // Hover
      g.addEventListener('mouseenter', (e) => showTooltip(e, c));
      g.addEventListener('mouseleave', hideTooltip);

      svg.appendChild(g);
    });
  }

  function makeHexPath(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      // Add slight randomness for organic look
      const jr = r + Math.sin(i * 2.3) * r * 0.15;
      pts.push([cx + jr * Math.cos(angle), cy + jr * Math.sin(angle)]);
    }
    return 'M' + pts.map(p => p.join(',')).join('L') + 'Z';
  }

  function showTooltip(e, country) {
    const tip = document.getElementById('countryTooltip');
    const power = Math.round(((country.economy || 50) + (country.military || 50) + (country.population || 50) + (country.diplomacy || 50)) / 4);
    tip.innerHTML = `<strong>${country.name}</strong><br>
      <span class="tip-desc">${country.description || ''}</span><br>
      💰 ${country.economy} &nbsp; ⚔️ ${country.military} &nbsp; 👥 ${country.population} &nbsp; 🤝 ${country.diplomacy}<br>
      <span class="tip-power">Puissance: ${power}/100</span>`;
    tip.style.display = 'block';

    // Position near mouse within map container
    const rect = document.querySelector('.map-container').getBoundingClientRect();
    const mx = e.clientX - rect.left + 15;
    const my = e.clientY - rect.top - 10;
    tip.style.left = Math.min(mx, rect.width - 260) + 'px';
    tip.style.top = Math.min(my, rect.height - 100) + 'px';
  }

  function hideTooltip() {
    document.getElementById('countryTooltip').style.display = 'none';
  }

  function selectCountry(name) {
    selectedCountry = name;
    const country = countries.find(c => c.name === name);
    if (!country) return;

    // Highlight selected on map
    document.querySelectorAll('.map-country').forEach(g => {
      g.classList.toggle('selected', g.dataset.country === name);
    });

    // Show country info panel
    const panel = document.getElementById('panelCountryInfo');
    const isPlayer = name === playerCountry;

    document.getElementById('countryInfoName').textContent = name + (isPlayer ? ' (vous)' : '');

    const content = document.getElementById('countryInfoContent');
    content.innerHTML = `
      <p class="ci-desc">${country.description || ''}</p>
      <div class="ci-stats">
        <div class="ci-stat"><span class="ci-label">💰 Economie</span><div class="ci-bar"><div class="ci-bar-fill eco" style="width:${country.economy}%"></div></div><span class="ci-val">${country.economy}</span></div>
        <div class="ci-stat"><span class="ci-label">⚔️ Militaire</span><div class="ci-bar"><div class="ci-bar-fill mil" style="width:${country.military}%"></div></div><span class="ci-val">${country.military}</span></div>
        <div class="ci-stat"><span class="ci-label">👥 Population</span><div class="ci-bar"><div class="ci-bar-fill pop" style="width:${country.population}%"></div></div><span class="ci-val">${country.population}</span></div>
        <div class="ci-stat"><span class="ci-label">🤝 Diplomatie</span><div class="ci-bar"><div class="ci-bar-fill dip" style="width:${country.diplomacy}%"></div></div><span class="ci-val">${country.diplomacy}</span></div>
      </div>
      ${isPlayer ? '<div class="ci-you">C\'est votre pays - utilisez le chat ci-dessous pour poser des questions.</div>' : '<div class="ci-other">Cliquez sur votre pays pour interagir via le chat.</div>'}
    `;

    panel.style.display = 'flex';
  }

  function closeCountryPanel() {
    document.getElementById('panelCountryInfo').style.display = 'none';
    selectedCountry = null;
    document.querySelectorAll('.map-country').forEach(g => g.classList.remove('selected'));
  }

  function updateCountry(name, stats) {
    const c = countries.find(c => c.name === name);
    if (!c) return;
    if (stats.economy !== undefined) c.economy = stats.economy;
    if (stats.military !== undefined) c.military = stats.military;
    if (stats.population !== undefined) c.population = stats.population;
    if (stats.diplomacy !== undefined) c.diplomacy = stats.diplomacy;
    render();
    // Re-select if was selected
    if (selectedCountry === name) selectCountry(name);
  }

  function getCountries() { return countries; }
  function getPlayerCountry() { return playerCountry; }

  return { init, render, selectCountry, closeCountryPanel, updateCountry, getCountries, getPlayerCountry };
})();
