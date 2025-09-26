class WebRTCManager {
  constructor() {
    this.localStream = null;
    this.peerConnection = null;
    this.isMuted = false;
    this.shouldInitiate = false;

    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
  }

  async autoStartCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
        track.contentHint = "speech";
        track
          .applyConstraints({
            noiseSuppression: true,
            echoCancellation: true,
            channelCount: 1,
          })
          .catch(() => {});
      });

      document.getElementById("local-audio").srcObject = this.localStream;
      UI.showWaiting();
    } catch (error) {
      UI.showError("Разрешите доступ к микрофону и попробуйте снова");
    }
  }

  setInitiator(value) {
    this.shouldInitiate = value;
  }

  async initiateConnection() {
    if (!this.shouldInitiate) return;
    if (this.peerConnection) return;
    if (!this.localStream) return;

    try {
      await this.initializePeerConnection();

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      SocketHandler.sendOffer(offer);
    } catch (error) {
      UI.showError("Не удалось начать соединение");
    }
  }

  async initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      if (!event.streams[0]) return;

      const remoteAudio = document.getElementById("remote-audio");
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.muted = false;
      remoteAudio.volume = 1;

      const play = () => remoteAudio.play().catch(() => {});
      play();
      setTimeout(play, 200);

      UI.showInCall();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        SocketHandler.sendIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === "failed") {
        UI.showError("Соединение не удалось");
        this.cleanup();
      }
    };
  }

  async handleOffer(offer) {
    if (!this.localStream) return;

    if (!this.peerConnection) {
      await this.initializePeerConnection();
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    SocketHandler.sendAnswer(answer);
  }

  async handleAnswer(answer) {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  async handleIceCandidate(candidate) {
    if (!this.peerConnection) return;

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  toggleMute() {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    this.isMuted = !this.isMuted;
    UI.updateMuteButton(this.isMuted);
  }

  endCall() {
    SocketHandler.sendEndCall();
    this.cleanup();
    UI.showEnded();
  }

  cleanup() {
    this.shouldInitiate = false;

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.isMuted = false;
  }
}

window.webRTC = new WebRTCManager();
