let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;

let turnIndex = 0;
let handActive = false;
let stage = 0;

/* ---------------- UTIL ---------------- */

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

/* ---------------- CARD RENDER ---------------- */

function renderCard(c) {
  const red = ["♥", "♦"];
  return `
    <div class="card ${red.includes(c.suit) ? "red" : "black"}">
      ${c.value}${c.suit}
    </div>
  `;
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

/* ---------------- START ---------------- */

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

/* ---------------- TURN SYSTEM (FIXED) ---------------- */

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

  // ADVANCE TURN SAFELY (NO RECURSION)
  do {
    turnIndex = (turnIndex + 1) % players.length;
  } while (players[turnIndex].folded);

  // PLAYER TURN
  if (turnIndex === 0) {
    log("Your turn.");
    updateUI();
    return;
  }

  // AI TURN
  setTimeout(() => {
    aiTurn(players[turnIndex]);

    updateUI();
    checkRoundEnd();

    if (handActive) nextTurn();
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

  // ONLY advance turn here (safe now)
  nextTurn();
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

  turnIndex = -1;

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
  else {
    showdown();
    handActive = false;
  }

  updateUI();
}

/* ---------------- SHOWDOWN ---------------- */

function showdown() {
  log("Showdown!");

  let best = null;
  let winners = [];

  for (let p of players) {
    if (p.folded) continue;

    let score = evaluateBest([...p.hand, ...community]);

    if (!best || compare(score, best) > 0) {
      best = score;
      winners = [p];
    }
    else if (compare(score, best) === 0) {
      winners.push(p);
    }
  }

  let split = pot / winners.length;

  winners.forEach(w => w.money += split);

  localStorage.setItem("chips", players[0].money);

  log("Winner(s): " + winners.map(w => w.name).join(", "));

  pot = 0;
  updateUI();
}

/* ---------------- UI ---------------- */

function updateUI() {
  document.getElementById("pot").textContent = pot;
  document.getElementById("currentBet").textContent = currentBet;
  document.getElementById("money").textContent = players[0]?.money || 0;

  document.getElementById("playerCards").innerHTML =
    players[0].hand.map(renderCard).join("");

  document.getElementById("communityCards").innerHTML =
    community.map(renderCard).join("");

  for (let i = 1; i <= 3; i++) {
    document.getElementById("p" + i).innerHTML =
      `<b>${players[i].name}</b><br>
       <div class="card-back"></div>
       <div class="card-back"></div><br>
       Money: $${players[i].money}<br>
       Bet: $${players[i].bet}`;
  }
}

/* ---------------- INIT ---------------- */

createPlayers();
updateUI();
