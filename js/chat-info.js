// Chat Info - now integrated into country info panel (right side)
const ChatInfo = (() => {

  function init() {
    UI.$('btnSendInfo').onclick = send;
    UI.$('inputInfo').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  }

  function loadHistory(chatHistory) {
    const container = UI.$('chatInfoMessages');
    container.innerHTML = '';
    for (const msg of (chatHistory || [])) {
      appendMessage(msg.role, msg.content);
    }
    container.scrollTop = container.scrollHeight;
  }

  function appendMessage(role, content) {
    const container = UI.$('chatInfoMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-' + role;
    div.innerHTML = `<div class="chat-msg-label">${role === 'user' ? 'Vous' : 'Conseiller'}</div><div class="chat-msg-content">${formatContent(content)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  async function send() {
    const input = UI.$('inputInfo');
    const message = input.value.trim();
    if (!message || !Game.currentGameId()) return;

    input.value = '';
    appendMessage('user', message);
    UI.$('btnSendInfo').disabled = true;

    const data = await HistoriaAPI.chatInfo(Game.currentGameId(), message);
    UI.$('btnSendInfo').disabled = false;

    if (data.ok) {
      appendMessage('assistant', data.reply);
    } else {
      UI.toast(data.error, 'error');
    }
  }

  function formatContent(text) {
    const d = document.createElement('div');
    d.textContent = text;
    let s = d.innerHTML;
    return s.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  return { init, loadHistory, appendMessage };
})();
