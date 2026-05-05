let pc;
let channel;

const isHost = window.location.pathname.includes("host");
const myId = isHost ? 0 : 1;

// ---------------- STATE ----------------
let gameState = {
  deck: [],
  players: [
    { id: 0, name: "Host", chips: 1000, hand: [], bet: 0, folded: false },
    { id: 1, name: "Player", chips: 1000, hand: [], bet: 0, folded: false }
  ],
  community: [],
  pot: 0,
  currentPlayer: 0,
  currentBet: 0,
  phase: "preflop",
  dealer: 0
};

// ---------------- DECK ----------------
function createDeck() {
  const s = ["♠","♥","♦","♣"];
  const r = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  let d = [];
  for (let suit of s) {
    for (let rank of r) {
      d.push({ suit, rank });
    }
  }
  return d.sort(() => Math.random() - 0.5);
}

// ---------------- GAME START ----------------
function startGame() {
  gameState.deck = createDeck();
  gameState.community = [];
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.phase = "preflop";

  for (let p of gameState.players) {
    p.hand = [gameState.deck.pop(), gameState.deck.pop()];
    p.bet = 0;
    p.folded = false;
  }

  gameState.currentPlayer = (gameState.dealer + 1) % 2;

  render();
  sendState();
}

// ---------------- ACTION HANDLER ----------------
function handleAction(playerId, action) {
  if (playerId !== gameState.currentPlayer) return;

  let p = gameState.players[playerId];

  switch (action.type) {
    case "bet":
      if (action.amount < gameState.currentBet) return;
      p.chips -= action.amount;
      p.bet += action.amount;
      gameState.pot += action.amount;
      gameState.currentBet = action.amount;
      break;

    case "call":
      let diff = gameState.currentBet - p.bet;
      p.chips -= diff;
      p.bet += diff;
      gameState.pot += diff;
      break;

    case "check":
      if (gameState.currentBet !== p.bet) return;
      break;

    case "fold":
      p.folded = true;
      break;
  }

  advanceTurn();
  checkRound();
  render();
  sendState();
}

// ---------------- TURN ----------------
function advanceTurn() {
  let i = gameState.currentPlayer;

  do {
    i = (i + 1) % 2;
  } while (gameState.players[i].folded);

  gameState.currentPlayer = i;
}

// ---------------- ROUND LOGIC ----------------
function checkRound() {
  let active = gameState.players.filter(p => !p.folded);

  if (active.length === 1) {
    active[0].chips += gameState.pot;
    startGame();
    return;
  }

  let allMatched = gameState.players.every(
    p => p.folded || p.bet === gameState.currentBet
  );

  if (allMatched) nextPhase();
}

function nextPhase() {
  gameState.currentBet = 0;

  if (gameState.phase === "preflop") {
    gameState.phase = "flop";
    gameState.community.push(
      gameState.deck.pop(),
      gameState.deck.pop(),
      gameState.deck.pop()
    );
  }
  else if (gameState.phase === "flop") {
    gameState.phase = "turn";
    gameState.community.push(gameState.deck.pop());
  }
  else if (gameState.phase === "turn") {
    gameState.phase = "river";
    gameState.community.push(gameState.deck.pop());
  }
  else {
    gameState.phase = "showdown";
    showdown();
  }
}

// ---------------- SHOWDOWN ----------------
function showdown() {
  let active = gameState.players.filter(p => !p.folded);

  let best = null;
  let winners = [];

  for (let p of active) {
    let score = evaluateHand(p.hand, gameState.community);

    if (!best || score.rank > best.rank || (score.rank === best.rank && score.value > best.value)) {
      best = score;
      winners = [p];
    } else if (score.rank === best.rank && score.value === best.value) {
      winners.push(p);
    }
  }

  let share = Math.floor(gameState.pot / winners.length);

  for (let w of winners) {
    w.chips += share;
  }

  console.log("Winner(s):", winners.map(w => w.name));

  setTimeout(startGame, 2000);
}

// ---------------- HAND EVALUATION ----------------
// Rank system:
// 0 high card
// 1 pair
// 2 two pair
// 3 three of a kind
// 4 straight
// 5 flush
// 6 full house
// 7 four of a kind
// 8 straight flush

function evaluateHand(hand, community) {
  let cards = [...hand, ...community];

  const values = "23456789TJQKA";
  const getVal = r => values.indexOf(r);

  let counts = {};
  let suits = {};

  for (let c of cards) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
    suits[c.suit] = (suits[c.suit] || 0) + 1;
  }

  let isFlush = Object.values(suits).some(v => v >= 5);

  let sorted = cards
    .map(c => getVal(c.rank))
    .sort((a,b) => b-a);

  let unique = [...new Set(sorted)];

  let straight = false;
  for (let i = 0; i < unique.length - 4; i++) {
    if (unique[i] - unique[i+4] === 4) {
      straight = true;
      break;
    }
  }

  let pairs = Object.values(counts).filter(v => v === 2).length;
  let trips = Object.values(counts).filter(v => v === 3).length;
  let quads = Object.values(counts).filter(v => v === 4).length;

  let rank = 0;

  if (straight && isFlush) rank = 8;
  else if (quads) rank = 7;
  else if (trips && pairs) rank = 6;
  else if (isFlush) rank = 5;
  else if (straight) rank = 4;
  else if (trips) rank = 3;
  else if (pairs >= 2) rank = 2;
  else if (pairs === 1) rank = 1;

  return {
    rank,
    value: sorted[0]
  };
}

// ---------------- ACTION WRAPPER ----------------
function playerAction(action) {
  if (isHost) {
    handleAction(0, action);
  } else {
    channel.send(JSON.stringify({
      type: "action",
      playerId: myId,
      action
    }));
  }
}

// ---------------- NETWORK ----------------
function createPeer() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
}

async function createOffer() {
  createPeer();
  channel = pc.createDataChannel("game");
  setup();

  let offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  document.getElementById("offerBox").value =
    JSON.stringify(pc.localDescription);
}

async function createAnswer() {
  createPeer();

  pc.ondatachannel = e => {
    channel = e.channel;
    setup();
  };

  let offer = JSON.parse(document.getElementById("offerBox").value);

  await pc.setRemoteDescription(offer);

  let answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  document.getElementById("answerBox").value =
    JSON.stringify(pc.localDescription);
}

async function acceptAnswer() {
  let answer = JSON.parse(document.getElementById("answerBox").value);
  await pc.setRemoteDescription(answer);
}

function setup() {
  channel.onmessage = e => {
    let msg = JSON.parse(e.data);

    if (msg.type === "action") {
      handleAction(msg.playerId, msg.action);
    }

    if (msg.type === "state") {
      gameState = msg.state;
      render();
    }
  };
}

function sendState() {
  if (!channel) return;
  channel.send(JSON.stringify({ type: "state", state: gameState }));
}

// ---------------- UI ----------------
function render() {
  document.getElementById("phase").textContent = gameState.phase;
  document.getElementById("pot").textContent = gameState.pot;
  document.getElementById("turn").textContent =
    gameState.players[gameState.currentPlayer].name;

  document.getElementById("community").innerHTML =
    gameState.community.map(c =>
      `<span class="card">${c.rank}${c.suit}</span>`
    ).join("");

  document.getElementById("players").innerHTML =
    gameState.players.map(p => `
      <div class="panel">
        <b>${p.name}</b><br>
        Chips: ${p.chips}<br>
        Bet: ${p.bet}<br>
        Folded: ${p.folded}<br>
        Hand: ${p.hand.map(c => c.rank + c.suit).join(" ")}
      </div>
    `).join("");
}

render();
