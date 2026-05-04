let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;
let currentPlayer = 0;

function log(msg) {
  let el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

/* ---------------- CARD RENDERING ---------------- */

function renderCard(c) {
  const red = ["♥", "♦"];
  return `<div class="card ${red.includes(c.suit) ? "red" : "black"}">
            ${c.value}${c.suit}
          </div>`;
}

/* ---------------- GAME SETUP ---------------- */
function runAITurns() {
  for (let i = 1; i < players.length; i++) {
    aiTurn(players[i]);
    updateUI();
  }
}
function createPlayers() {
  players = [];

  players.push({
    name: "You",
    money: 1000,
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

  pot = 0;
  currentBet = 0;
  community = [];

  for (let p of players) {
    p.hand = [draw(), draw()];
    p.bet = 0;
    p.folded = false;
  }

  log("New hand started.");
  updateUI();
}

/* ---------------- ACTIONS ---------------- */

function playerAction(action) {
  let p = players[0];

  if (action === "fold") {
    p.folded = true;
    log("You fold.");
  }

  if (action === "call") {
    let diff = currentBet - p.bet;
    p.money -= diff;
    p.bet += diff;
    pot += diff;
    log("You call.");
  }

  if (action === "raise") {
    let amount = parseInt(document.getElementById("raiseAmount").value) || 0;

    if (amount <= 0) return;

    let newBet = currentBet + amount;
    let diff = newBet - p.bet;

    p.money -= diff;
    p.bet = newBet;
    currentBet = newBet;
    pot += diff;

    log("You raise to " + newBet);
  }
  updateUI();
  runAITurns();
  updateUI();
}

/* ---------------- AI (simple but functional) ---------------- */

function aiTurn(p) {
  if (p.folded) return;

  let r = Math.random();

  if (r < 0.25) {
    p.folded = true;
    log(p.name + " folds.");
  } else if (r < 0.75) {
    let diff = currentBet - p.bet;
    p.money -= diff;
    p.bet += diff;
    pot += diff;
    log(p.name + " calls.");
  } else {
    let raise = currentBet + 20;
    let diff = raise - p.bet;
    p.money -= diff;
    p.bet = raise;
    currentBet = raise;
    pot += diff;
    log(p.name + " raises.");
  }
}

/* ---------------- UI ---------------- */

function updateUI() {
  document.getElementById("pot").textContent = pot;
  document.getElementById("currentBet").textContent = currentBet;
  document.getElementById("money").textContent = players[0]?.money || 0;

  // player cards
  document.getElementById("playerCards").innerHTML =
    players[0].hand.map(renderCard).join("");

  // community cards
  document.getElementById("communityCards").innerHTML =
    community.map(renderCard).join("");

  // AI display (card backs)
  for (let i = 1; i <= 3; i++) {
    let el = document.getElementById("p" + i);
    el.innerHTML =
      `<b>${players[i].name}</b><br>` +
      `<div class="card-back"></div><div class="card-back"></div><br>` +
      `Money: $${players[i].money}`;
  }
}

createPlayers();
updateUI();
