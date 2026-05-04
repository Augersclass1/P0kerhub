let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;

let turnIndex = 0;
let handActive = false;
let stage = 0; // 0 preflop, 1 flop, 2 turn, 3 river

/* ---------------- LOG ---------------- */

function log(msg) {
  let el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

/* ---------------- CARD RENDER ---------------- */

function renderCard(c) {
  const red = ["♥", "♦"];
  return `<div class="card ${red.includes(c.suit) ? "red" : "black"}">
            ${c.value}${c.suit}
          </div>`;
}

/* ---------------- SETUP ---------------- */

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
  const suits = ["♠","♥","♦","♣"];
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
  log("Your turn.");
  updateUI();
}

/* ---------------- TURN SYSTEM ---------------- */

function nextTurn() {
  if (!handActive) return;

  let active = players.filter(p => !p.folded);

  if (active.length === 1) {
    active[0].money += pot;
    log(active[0].name + " wins (everyone folded).");
    handActive = false;
    return;
  }

  turnIndex = (turnIndex + 1) % players.length;

  if (players[turnIndex].folded) {
    nextTurn();
    return;
  }

  if (turnIndex === 0) {
    log("Your turn.");
    updateUI();
    return;
  }

  setTimeout(() => {
    aiTurn(players[turnIndex]);
    updateUI();
    checkRoundEnd();   // IMPORTANT
    nextTurn();
  }, 500);
}

/* ---------------- PLAYER ACTIONS ---------------- */

function playerAction(action) {
  if (!handActive) return;
  if (turnIndex !== 0) {
    log("Not your turn.");
    return;
  }

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

    if (amount <= 0) {
      log("Invalid raise.");
      return;
    }

    let newBet = currentBet + amount;
    let diff = newBet - p.bet;

    if (diff > p.money) {
      log("Not enough money.");
      return;
    }

    p.money -= diff;
    p.bet = newBet;
    currentBet = newBet;
    pot += diff;

    log("You raise to " + newBet);
  }

  updateUI();
  checkRoundEnd(); // IMPORTANT
  nextTurn();
}

/* ---------------- AI ---------------- */

function aiTurn(p) {
  if (p.folded) return;

  let r = Math.random();

  if (r < 0.25) {
    p.folded = true;
    log(p.name + " folds.");
  }

  else if (r < 0.75) {
    let diff = currentBet - p.bet;
    if (diff > p.money) diff = p.money;

    p.money -= diff;
    p.bet += diff;
    pot += diff;

    log(p.name + " calls.");
  }

  else {
    let raise = currentBet + 20;
    let diff = raise - p.bet;

    if (diff > p.money) diff = p.money;

    p.money -= diff;
    p.bet = raise;
    currentBet = raise;
    pot += diff;

    log(p.name + " raises.");
  }
}

/* ---------------- ROUND SYSTEM (FIX) ---------------- */

function checkRoundEnd() {
  let active = players.filter(p => !p.folded);

  if (active.length <= 1) return;

  let allEqual = active.every(p => p.bet === currentBet);

  if (!allEqual) return;

  // reset bets
  for (let p of players) {
    p.bet = 0;
  }

  currentBet = 0;
  stage++;

  if (stage === 1) {
    community.push(draw(), draw(), draw());
    log("Flop dealt.");
  }

  else if (stage === 2) {
    community.push(draw());
    log("Turn dealt.");
  }

  else if (stage === 3) {
    community.push(draw());
    log("River dealt.");
  }

  else {
    showdown();
    handActive = false;
  }
}

/* ---------------- SHOWDOWN ---------------- */

function value(v) {
  if (v==="J") return 11;
  if (v==="Q") return 12;
  if (v==="K") return 13;
  if (v==="A") return 14;
  return v;
}

function evaluate(cards) {
  let vals = cards.map(c=>value(c.value)).sort((a,b)=>b-a);
  let counts = {};

  vals.forEach(v => counts[v] = (counts[v]||0)+1);

  let groups = Object.entries(counts)
    .map(([v,c]) => ({v:parseInt(v), c}))
    .sort((a,b)=>b.c - a.c || b.v - a.v);

  if (groups[0].c === 4) return 7;
  if (groups[0].c === 3 && groups[1]?.c === 2) return 6;
  if (groups[0].c === 3) return 3;
  if (groups[0].c === 2 && groups[1]?.c === 2) return 2;
  if (groups[0].c === 2) return 1;

  return 0;
}

function showdown() {
  log("Showdown!");

  let best = -1;
  let winners = [];

  for (let p of players) {
    if (p.folded) continue;

    let score = evaluate([...p.hand, ...community]);

    log(p.name + " score: " + score);

    if (score > best) {
      best = score;
      winners = [p];
    } else if (score === best) {
      winners.push(p);
    }
  }

  let split = pot / winners.length;

  for (let w of winners) {
    w.money += split;
  }

  log("Winner(s): " + winners.map(w=>w.name).join(", "));
  pot = 0;
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
    let el = document.getElementById("p" + i);

    el.innerHTML =
      `<b>${players[i].name}</b><br>` +
      `<div class="card-back"></div><div class="card-back"></div><br>` +
      `Money: $${players[i].money}`;
  }
}

/* ---------------- INIT ---------------- */

createPlayers();
updateUI();
