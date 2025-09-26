class SocketManager {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.userId = null;
  }

  init(roomId, userId) {
    this.roomId = roomId;
    this.userId = userId;
    this.socket = io();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on("connect", () => {
      this.socket.emit("set-user-id", this.userId);
      this.socket.emit("join-room", {
        userId: this.userId,
        roomId: this.roomId,
      });
      this.socket.emit("user-opened-app", {
        userId: this.userId,
        roomId: this.roomId,
      });
    });

    this.socket.on("disconnect", () => {
      UI.showError("Соединение потеряно");
      window.webRTC.cleanup();
      UI.closeAppSoon();
    });

    this.socket.on("room-state", ({ participants }) => {
      if (participants === 1) {
        window.webRTC.setInitiator(true);
        UI.showWaiting();
      } else if (participants === 2) {
        window.webRTC.setInitiator(false);
      }
    });

    this.socket.on("user-joined", ({ participants }) => {
      window.webRTC.setInitiator(true);
      if (participants === 2) {
        window.webRTC.initiateConnection();
      }
    });

    this.socket.on("room-full", () => {
      UI.showError("Комната занята");
      window.webRTC.cleanup();
      UI.closeAppSoon();
    });

    this.socket.on("offer", (data) => {
      window.webRTC.handleOffer(data.offer);
    });

    this.socket.on("answer", (data) => {
      window.webRTC.handleAnswer(data.answer);
    });

    this.socket.on("ice-candidate", (data) => {
      window.webRTC.handleIceCandidate(data.candidate);
    });

    this.socket.on("call-ended", () => {
      UI.showError("Собеседник завершил звонок");
      window.webRTC.cleanup();
      UI.closeAppSoon();
    });

    this.socket.on("user-disconnected", () => {
      UI.showError("Собеседник отключился");
      window.webRTC.cleanup();
      UI.closeAppSoon();
    });
  }

  sendOffer(offer) {
    this.socket.emit("offer", { offer });
  }

  sendAnswer(answer) {
    this.socket.emit("answer", { answer });
  }

  sendIceCandidate(candidate) {
    this.socket.emit("ice-candidate", { candidate });
  }

  sendEndCall() {
    this.socket.emit("end-call");
  }
}

window.SocketHandler = new SocketManager();
