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

  if (chips === null) {
    return 1000;
  }
  return Number(chips);
}

/* ---------------- LOG ---------------- */

function log(msg) {
  let el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

function setValue(val) {
  document.getElementById("raiseAmount").value = val;
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
    folded: false,
    acted: false
  });

  for (let i = 1; i <= 3; i++) {
    players.push({
      name: "AI " + i,
      money: 1000,
      hand: [],
      bet: 0,
      folded: false,
      acted: false
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
    p.acted = false;
  }

  turnIndex = 0;

  log("New hand started.");
  updateUI();
}

/* ---------------- TURN SYSTEM ---------------- */

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

  turnIndex = (turnIndex + 1) % players.length;

  if (players[turnIndex].folded) return nextTurn();

  if (turnIndex === 0) {
    log("Your turn.");
    updateUI();
    return;
  }

  setTimeout(() => {
    aiTurn(players[turnIndex]);
    updateUI();
    checkRoundEnd();
    if (handActive) nextTurn();
  }, 400);
}

/* ---------------- ACTIONS ---------------- */

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

    for (let o of players) if (o !== p) o.acted = false;

    log("You raise to " + newBet);
  }

  updateUI();
  checkRoundEnd();
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

  for (let o of players) if (o !== p) o.acted = false;

  log(p.name + " raises to " + currentBet);
}

/* ---------------- ROUND ---------------- */

function checkRoundEnd() {
  let active = players.filter(p => !p.folded);
  if (active.length <= 1) return;

  let done = active.every(p => p.bet === currentBet);

  if (!done) return;

  for (let p of players) {
    p.bet = 0;
    p.acted = false;
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

/* ---------------- HAND EVALUATION (FIXED) ---------------- */

function value(v) {
  if (v === "J") return 11;
  if (v === "Q") return 12;
  if (v === "K") return 13;
  if (v === "A") return 14;
  return v;
}

function getCombinations(arr, k) {
  let res = [];

  function backtrack(start, combo) {
    if (combo.length === k) {
      res.push(combo);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      backtrack(i + 1, combo.concat([arr[i]]));
    }
  }

  backtrack(0, []);
  return res;
}

/* ---- evaluate 5-card hand ---- */

function evaluate5(hand) {
  let vals = hand.map(c => value(c.value)).sort((a,b)=>b-a);
  let suits = hand.map(c => c.suit);

  let counts = {};
  vals.forEach(v => counts[v] = (counts[v] || 0) + 1);

  let groups = Object.entries(counts)
    .map(([v,c]) => ({v:+v,c}))
    .sort((a,b)=>b.c - a.c || b.v - a.v);

  let isFlush = suits.every(s => s === suits[0]);

  let unique = [...new Set(vals)].sort((a,b)=>a-b);
  let isStraight = false;

  for (let i=0;i<=unique.length-5;i++) {
    let seq = unique.slice(i,i+5);
    if (seq[4]-seq[0] === 4) isStraight = true;
  }

  // wheel straight
  if ([14,5,4,3,2].every(v => vals.includes(v))) {
    isStraight = true;
    vals = [5];
  }

  // straight flush
  if (isFlush && isStraight) return {rank:8, kick:vals};

  // quads
  if (groups[0].c === 4) return {rank:7, kick:[groups[0].v]};

  // full house
  if (groups[0].c === 3 && groups[1]?.c === 2)
    return {rank:6, kick:[groups[0].v,groups[1].v]};

  // flush
  if (isFlush) return {rank:5, kick:vals};

  // straight
  if (isStraight) return {rank:4, kick:vals};

  // trips
  if (groups[0].c === 3)
    return {rank:3, kick:[groups[0].v,...vals.filter(v=>v!==groups[0].v)]};

  // two pair
  if (groups[0].c === 2 && groups[1]?.c === 2)
    return {rank:2, kick:[groups[0].v,groups[1].v]};

  // pair
  if (groups[0].c === 2)
    return {rank:1, kick:[groups[0].v,...vals.filter(v=>v!==groups[0].v)]};

  return {rank:0, kick:vals};
}

function compare(a,b){
  if (a.rank !== b.rank) return a.rank - b.rank;

  for (let i=0;i<Math.max(a.kick.length,b.kick.length);i++){
    if ((a.kick[i]||0) !== (b.kick[i]||0))
      return (a.kick[i]||0) - (b.kick[i]||0);
  }
  return 0;
}

function evaluateBest(cards){
  let combos = getCombinations(cards,5);
  let best = null;

  for (let c of combos){
    let val = evaluate5(c);
    if (!best || compare(val,best)>0) best = val;
  }

  return best;
}

/* ---------------- SHOWDOWN FIXED ---------------- */

function showdown() {
  log("Showdown!");

  let best = null;
  let winners = [];

  for (let p of players) {
    if (p.folded) continue;

    let score = evaluateBest([...p.hand, ...community]);

    log(p.name + " rank " + score.rank);

    if (!best || compare(score,best) > 0) {
      best = score;
      winners = [p];
    }
    else if (compare(score,best) === 0) {
      winners.push(p);
    }
  }

  let split = pot / winners.length;

  winners.forEach(w => w.money += split);

  localStorage.setItem("chips", players[0].money);

  log("Winner(s): " + winners.map(w=>w.name).join(", "));

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

  for (let i=1;i<=3;i++){
    document.getElementById("p"+i).innerHTML =
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
