let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;

let turnIndex = 0;
let handActive = false;
let stage = 0;

/* ---------------- UTIL ---------------- */

document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "google" : "poker";
});

function panicmode() {
  window.location.href = "https://google.com";
}

function getChips() {
  let chips = localStorage.getItem("chips");
  if (chips === null) return 1000;
  return Number(chips);
}

/* ---------------- LOG ---------------- */

function log(msg) {
  let el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

/* ---------------- PLAYERS ---------------- */

function createPlayers() {
  players = [];

  players.push({
    name: "You",
    money: getChips(),
    hand: [],
    bet: 0,
    folded: false
  });

  for (let i = 1; i <= 3; i++) {
    players.push({
      name: "AI " + i,
      money: 1000,
      hand: [],
      bet: 0,
      folded: false
    });
  }
}

/* ---------------- DECK ---------------- */

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];

  deck = [];

  for (let s of suits) {
    for (let v of values) {
      deck.push({ value: v, suit: s });
    }
  }

  deck.sort(() => Math.random() - 0.5);
}

function draw() {
  return deck.pop();
}

/* ---------------- START HAND ---------------- */

function startHand() {
  if (players.length === 0) createPlayers();

  createDeck();

  community = [];
  pot = 0;
  currentBet = 0;
  stage = 0;
  handActive = true;

  for (let p of players) {
    p.hand = [draw(), draw()];
    p.bet = 0;
    p.folded = false;
  }

  turnIndex = 0;

  log("New hand started.");
  updateUI();
}

/* ---------------- TURN SYSTEM (FIXED CORE) ---------------- */

function nextTurn() {
  if (!handActive) return;

  let active = players.filter(p => !p.folded);

  if (active.length === 1) {
    active[0].money += pot;
    log(active[0].name + " wins (everyone folded).");

    pot = 0;
    handActive = false;
    updateUI();
    return;
  }

  /* ALWAYS ADVANCE FIRST (CRITICAL FIX) */
  do {
    turnIndex = (turnIndex + 1) % players.length;
  } while (players[turnIndex].folded);

  updateUI();

  /* PLAYER TURN */
  if (turnIndex === 0) {
    log("Your turn.");
    return;
  }

  /* AI TURN */
  setTimeout(() => {
    aiTurn(players[turnIndex]);

    updateUI();
    checkRoundEnd();

    if (handActive) {
      nextTurn();
    }
  }, 400);
}

/* ---------------- PLAYER ACTIONS ---------------- */

function playerAction(action) {
  if (!handActive || turnIndex !== 0) return;

  let p = players[0];

  if (action === "fold") {
    p.folded = true;
    log("You fold.");
  }

  else if (action === "call") {
    let diff = Math.min(currentBet - p.bet, p.money);
    p.money -= diff;
    p.bet += diff;
    pot += diff;

    log(diff ? "You call." : "You check.");
  }

  else if (action === "raise") {
    let amount = parseInt(document.getElementById("raiseAmount").value) || 0;

    let newBet = currentBet + amount;
    let diff = newBet - p.bet;

    if (diff > p.money) return log("Not enough money.");

    p.money -= diff;
    p.bet = newBet;
    currentBet = newBet;
    pot += diff;

    log("You raise to " + newBet);
  }

  updateUI();
  checkRoundEnd();

  /* CRITICAL FIX: always advance turn AFTER action */
  setTimeout(() => {
    nextTurn();
  }, 0);
}

/* ---------------- AI ---------------- */

function aiTurn(p) {
  if (p.folded) return;

  let r = Math.random();

  if (r < 0.2) {
    p.folded = true;
    log(p.name + " folds.");
    return;
  }

  if (r < 0.7) {
    let diff = Math.min(currentBet - p.bet, p.money);
    p.money -= diff;
    p.bet += diff;
    pot += diff;

    log(diff ? p.name + " calls." : p.name + " checks.");
    return;
  }

  let raise = 20 + Math.floor(Math.random() * 80);
  let newBet = currentBet + raise;
  let diff = newBet - p.bet;

  if (diff > p.money) return;

  p.money -= diff;
  p.bet = newBet;
  currentBet = newBet;
  pot += diff;

  log(p.name + " raises to " + currentBet);
}

/* ---------------- ROUND LOGIC ---------------- */

function checkRoundEnd() {
  let active = players.filter(p => !p.folded);
  if (active.length <= 1) return;

  let done = active.every(p => p.bet === currentBet);
  if (!done) return;

  for (let p of players) {
    p.bet = 0;
  }

  currentBet = 0;
  stage++;

  /* SAFE RESET (NOT -1) */
  turnIndex = 0;

  if (stage === 1) {
    community.push(draw(), draw(), draw());
    log("Flop.");
  }

  else if (stage === 2) {
    community.push(draw());
    log("Turn.");
  }

  else if (stage === 3) {
    community.push(draw());
    log("River.");
  }

  updateUI();
}
