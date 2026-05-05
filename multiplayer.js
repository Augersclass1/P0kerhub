let pc;
let channel;

const isHost = window.location.pathname.includes("host");

// ----------------------
// GAME STATE
// ----------------------
let gameState = {
  players: [
    { id: 0, name: "Host", chips: 1000 },
    { id: 1, name: "Player 2", chips: 1000 }
  ],
  pot: 0,
  currentPlayer: 0,
  currentBet: 0,
  phase: "preflop"
};

const myId = isHost ? 0 : 1;

// ----------------------
// WEBRTC SETUP
// ----------------------
function createPeer() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = () => {
    setTimeout(updateBoxes, 300);
  };
}

// ----------------------
// HOST FLOW
// ----------------------
async function createOffer() {
  createPeer();

  channel = pc.createDataChannel("game");
  setupChannel();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  document.getElementById("offerBox").value =
    JSON.stringify(pc.localDescription);
}

async function acceptAnswer() {
  const answer = JSON.parse(
    document.getElementById("answerBox").value
  );

  await pc.setRemoteDescription(answer);
}

// ----------------------
// JOIN FLOW
// ----------------------
async function createAnswer() {
  createPeer();

  pc.ondatachannel = (event) => {
    channel = event.channel;
    setupChannel();
  };

  const offer = JSON.parse(
    document.getElementById("offerBox").value
  );

  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  document.getElementById("answerBox").value =
    JSON.stringify(pc.localDescription);
}

// ----------------------
// CHANNEL LOGIC
// ----------------------
function setupChannel() {
  channel.onopen = () => {
    console.log("Connected");
    sendState();
  };

  channel.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "action") {
      handleAction(msg.playerId, msg.action);
    }

    if (msg.type === "state") {
      gameState = msg.state;
      console.log("State update:", gameState);
    }
  };
}

// ----------------------
// CORE POKER ENGINE (YOU PLUG YOUR LOGIC HERE)
// ----------------------
function handleAction(playerId, action) {
  if (playerId !== gameState.currentPlayer) return;

  console.log("Action:", playerId, action);

  switch (action.type) {
    case "bet":
      if (action.amount < gameState.currentBet) return;

      gameState.currentBet = action.amount;
      gameState.pot += action.amount;
      break;

    case "call":
      gameState.pot += gameState.currentBet;
      break;

    case "fold":
      console.log(`Player ${playerId} folded`);
      break;
  }

  // NEXT TURN
  gameState.currentPlayer =
    (gameState.currentPlayer + 1) % gameState.players.length;

  sendState();
}

// ----------------------
// ACTION SYSTEM (HOST + CLIENT)
// ----------------------
function playerAction(action) {
  if (isHost) {
    handleAction(0, action); // host acts locally
  } else {
    channel.send(JSON.stringify({
      type: "action",
      playerId: myId,
      action
    }));
  }
}

// ----------------------
// STATE SYNC
// ----------------------
function sendState() {
  if (!channel || channel.readyState !== "open") return;

  channel.send(JSON.stringify({
    type: "state",
    state: gameState
  }));
}

// ----------------------
// TEST BUTTONS
// ----------------------
function testBet() {
  playerAction({ type: "bet", amount: 10 });
}

function updateBoxes() {
  // optional debug hook for ICE
}
