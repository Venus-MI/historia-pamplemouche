// Chat Decision overlay (top-left - strategic advisor)
const ChatDecision = (() => {
  let isOpen = false;
  let pendingActions = [];
  let isNarrativeMode = false;

  function init() {
    UI.$('btnToggleDecision').onclick = toggle;
    UI.$('btnSendDecision').onclick = send;
    UI.$('inputDecision').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    UI.$('btnQueueAction').onclick = queueAction;
    UI.$('btnBackToChat').onclick = backToChat;
  }

  function toggle() {
    isOpen = !isOpen;
    UI.$('panelDecision').classList.toggle('open', isOpen);
    UI.$('btnToggleDecision').classList.toggle('active', isOpen);
  }

  function open() {
    isOpen = true;
    UI.$('panelDecision').classList.add('open');
    UI.$('btnToggleDecision').classList.add('active');
  }

  function close() {
    isOpen = false;
    UI.$('panelDecision').classList.remove('open');
    UI.$('btnToggleDecision').classList.remove('active');
  }

  function loadHistory(chatHistory) {
    const container = UI.$('chatDecisionMessages');
    container.innerHTML = '';
    for (const msg of (chatHistory || [])) {
      appendMessage(msg.role, msg.content);
    }
    container.scrollTop = container.scrollHeight;
    isNarrativeMode = false;
    showChatMode();
  }

  function appendMessage(role, content) {
    const container = UI.$('chatDecisionMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-' + role;
    div.innerHTML = `<div class="chat-msg-label">${role === 'user' ? 'Vous' : 'Stratege'}</div><div class="chat-msg-content">${formatContent(content)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  async function send() {
    const input = UI.$('inputDecision');
    const message = input.value.trim();
    if (!message || !Game.currentGameId()) return;

    input.value = '';
    appendMessage('user', message);
    UI.$('btnSendDecision').disabled = true;

    const data = await HistoriaAPI.chatDecision(Game.currentGameId(), message);
    UI.$('btnSendDecision').disabled = false;

    if (data.ok) {
      appendMessage('assistant', data.reply);
    } else {
      UI.toast(data.error, 'error');
    }
  }

  function queueAction() {
    const input = UI.$('inputDecision');
    const action = input.value.trim();
    if (!action) return;

    pendingActions.push(action);
    input.value = '';
    updateActionCount();
    UI.toast('Action ajoutee a la file', 'success');
  }

  function getPendingActions() { return [...pendingActions]; }
  function clearActions() { pendingActions = []; updateActionCount(); }

  function updateActionCount() {
    const badge = UI.$('actionCount');
    badge.textContent = pendingActions.length;
    badge.style.display = pendingActions.length > 0 ? 'inline-flex' : 'none';

    const list = UI.$('pendingActionsList');
    list.innerHTML = '';
    pendingActions.forEach((a, i) => {
      const li = document.createElement('div');
      li.className = 'pending-action';
      li.innerHTML = `<span>${a}</span><button class="btn-remove" onclick="ChatDecision.removeAction(${i})">x</button>`;
      list.appendChild(li);
    });
  }

  function removeAction(i) {
    pendingActions.splice(i, 1);
    updateActionCount();
  }

  // Switch to narrative mode after time advance
  function showNarrative(narrative, events, stateChanges) {
    isNarrativeMode = true;
    const container = UI.$('chatDecisionMessages');
    container.innerHTML = '';

    // Narrative
    const narDiv = document.createElement('div');
    narDiv.className = 'narrative-block';
    narDiv.innerHTML = `<h3>Recit</h3><div class="narrative-text">${formatContent(narrative)}</div>`;
    container.appendChild(narDiv);

    // Events
    if (events && events.length > 0) {
      const evDiv = document.createElement('div');
      evDiv.className = 'events-block';
      evDiv.innerHTML = `<h3>Evenements</h3>` + events.map(e =>
        `<div class="event-item"><div class="event-date">${UI.formatDate(e.date)}</div><div class="event-title">${e.title}</div><div class="event-desc">${e.description}</div></div>`
      ).join('');
      container.appendChild(evDiv);
    }

    // State changes
    if (stateChanges) {
      const chDiv = document.createElement('div');
      chDiv.className = 'changes-block';
      chDiv.innerHTML = `<h3>Changements</h3><div class="changes-grid">
        ${formatChange('Economie', stateChanges.economy)}
        ${formatChange('Militaire', stateChanges.military)}
        ${formatChange('Population', stateChanges.population)}
        ${formatChange('Diplomatie', stateChanges.diplomacy)}
      </div>`;
      container.appendChild(chDiv);
    }

    UI.$('decisionChatInput').style.display = 'none';
    UI.$('btnBackToChat').style.display = 'block';
    container.scrollTop = 0;
    open();
  }

  function backToChat() {
    isNarrativeMode = false;
    showChatMode();
    UI.$('chatDecisionMessages').innerHTML = '';
  }

  function showChatMode() {
    UI.$('decisionChatInput').style.display = 'flex';
    UI.$('btnBackToChat').style.display = 'none';
  }

  function formatChange(label, delta) {
    if (!delta || delta === 0) return `<div class="change-item">${label}: =</div>`;
    const cls = delta > 0 ? 'positive' : 'negative';
    return `<div class="change-item ${cls}">${label}: ${delta > 0 ? '+' : ''}${delta}</div>`;
  }

  function formatContent(text) {
    const d = document.createElement('div');
    d.textContent = text;
    let s = d.innerHTML;
    return s.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  return { init, toggle, open, close, loadHistory, appendMessage, send, queueAction, getPendingActions, clearActions, removeAction, showNarrative, backToChat, updateActionCount };
})();
