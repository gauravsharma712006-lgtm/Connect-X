console.log("✅ Script loaded");

// CRITICAL FIX: Connect to current page origin (works with ngrok)
const socket = io({
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true
});

const myVideo = document.getElementById("myVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusDiv = document.getElementById("status");
const nextBtn = document.getElementById("nextBtn");

let peer = null;
let stream = null;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function updateStatus(msg) {
  statusDiv.textContent = msg;
  console.log(msg);
}

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
  updateStatus("Connected to server");
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket error:", error);
  updateStatus("Connection failed! Check server.");
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
  updateStatus("Disconnected from server");
});

async function startCamera() {
  try {
    console.log("📷 Starting camera...");
    updateStatus("Requesting camera access...");
    
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    myVideo.srcObject = stream;
    console.log("✅ Camera started");
    updateStatus("Camera ready");
  } catch (error) {
    console.error("❌ Camera error:", error);
    updateStatus("❌ Camera access denied!");
    alert("Please allow camera and microphone access!");
  }
}

function closePeer() {
  if (peer) {
    peer.close();
    peer = null;
  }
  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(t => t.stop());
    remoteVideo.srcObject = null;
  }
}

socket.on("waiting", () => {
  updateStatus("⏳ Waiting for partner...");
  nextBtn.disabled = true;
});

socket.on("matched", async (data) => {
  console.log("🔗 Matched! isCaller:", data.isCaller);
  updateStatus("Partner found! Connecting...");
  
  closePeer();
  peer = new RTCPeerConnection(config);

  if (stream) {
    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
      console.log("Added track:", track.kind);
    });
  }

  peer.ontrack = (e) => {
    console.log("📹 Remote track received:", e.track.kind);
    if (e.streams && e.streams[0]) {
      remoteVideo.srcObject = e.streams[0];
      updateStatus("✅ Connected!");
      nextBtn.disabled = false;
    }
  };

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("🧊 Sending ICE");
      socket.emit("ice", e.candidate);
    }
  };

  peer.onconnectionstatechange = () => {
    console.log("Connection state:", peer.connectionState);
    if (peer.connectionState === "connected") {
      updateStatus("✅ Video call active!");
    }
  };

  if (data.isCaller) {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log("📤 Sending offer");
      socket.emit("offer", offer);
    } catch (err) {
      console.error("Offer error:", err);
    }
  }
});

socket.on("offer", async (offer) => {
  console.log("📥 Received offer");
  try {
    if (!peer) {
      console.error("Peer not initialized!");
      return;
    }
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log("📤 Sending answer");
    socket.emit("answer", answer);
  } catch (err) {
    console.error("Offer handling error:", err);
  }
});

socket.on("answer", async (answer) => {
  console.log("📥 Received answer");
  try {
    if (peer && peer.signalingState !== "stable") {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✅ Answer set");
    }
  } catch (err) {
    console.error("Answer error:", err);
  }
});

socket.on("ice", async (candidate) => {
  console.log("📥 Received ICE");
  try {
    if (peer && candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (err) {
    console.error("ICE error:", err);
  }
});

socket.on("partner-left", () => {
  console.log("👋 Partner left");
  updateStatus("Partner disconnected. Click Next.");
  closePeer();
  nextBtn.disabled = false;
});

nextBtn.addEventListener("click", () => {
  closePeer();
  socket.disconnect();
  socket.connect();
  updateStatus("Finding new partner...");
  nextBtn.disabled = true;
});

// Start
startCamera();
