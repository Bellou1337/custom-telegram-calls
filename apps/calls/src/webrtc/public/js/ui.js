class UIManager {
  constructor() {
    this.statusEl = null;
    this.endCallBtn = null;
    this.muteBtn = null;
  }

  init() {
    this.statusEl = document.getElementById("status");
    this.endCallBtn = document.getElementById("end-call");
    this.muteBtn = document.getElementById("mute-btn");

    this.endCallBtn?.addEventListener("click", () => {
      window.webRTC.endCall();
    });

    this.muteBtn?.addEventListener("click", () => {
      window.webRTC.toggleMute();
    });

    this.showWaiting();
  }

  updateStatus(text, statusClass) {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.className = `status ${statusClass}`;
  }

  showWaiting() {
    this.updateStatus("Ожидание собеседника...", "waiting");
  }

  showInCall() {
    this.updateStatus("В звонке 🔊", "in-call");
  }

  showError(message) {
    this.showWaiting();
    const tg = window.Telegram?.WebApp;
    if (tg?.showAlert) {
      tg.showAlert(message);
    }
  }

  showEnded() {
    this.showWaiting();
    this.closeAppSoon();
  }

  updateMuteButton(isMuted) {
    if (!this.muteBtn) return;
    this.muteBtn.textContent = isMuted
      ? "🔊 Включить микрофон"
      : "🔇 Выключить микрофон";
  }

  closeAppSoon() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setTimeout(() => tg.close(), 2000);
    }
  }
}

window.UI = new UIManager();
