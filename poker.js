let players = [];
let deck = [];
let community = [];

let dealer = 0;
let currentPlayer = 0;
let pot = 0;
let currentBet = 0;
let stage = 0;

const SMALL_BLIND = 10;
const BIG_BLIND = 20;

function log(msg) {
  const el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

function updateUI() {
  document.getElementById("money").textContent = players[0]?.money || 0;
  document.getElementById("pot").textContent = pot;
  document.getElementById("currentBet").textContent = currentBet;

  if (players[0]) {
    document.getElementById("playerCards").textContent =
      players[0].hand.map(c => c.value + c.suit).join(" ");
  }

  document.getElementById("communityCards").textContent =
    community.map(c => c.value + c.suit).join(" ");
}

function createPlayers() {
  players = [];

  players.push({name:"You", money:1000, hand:[], bet:0, folded:false});

  for (let i = 1; i <= 3; i++) {
    players.push({name:"AI "+i, money:1000, hand:[], bet:0, folded:false});
  }
}

function createDeck() {
  const suits = ["♠","♥","♦","♣"];
  const values = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];

  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({value:v, suit:s});
    }
  }
  deck.sort(()=>Math.random()-0.5);
}

function draw() {
  return deck.pop();
}

function startHand() {
  if (players.length === 0) createPlayers();

  createDeck();

  community = [];
  pot = 0;
  currentBet = 0;
  stage = 0;

  for (let p of players) {
    p.hand = [draw(), draw()];
    p.bet = 0;
    p.folded = false;
  }

  dealer = (dealer + 1) % players.length;

  postBlinds();

  currentPlayer = (dealer + 3) % players.length;

  log("New hand started.");
  updateUI();

  nextTurn();
}

function postBlinds() {
  let sb = (dealer + 1) % players.length;
  let bb = (dealer + 2) % players.length;

  players[sb].money -= SMALL_BLIND;
  players[sb].bet = SMALL_BLIND;

  players[bb].money -= BIG_BLIND;
  players[bb].bet = BIG_BLIND;

  pot += SMALL_BLIND + BIG_BLIND;
  currentBet = BIG_BLIND;

  log(players[sb].name + " posts small blind.");
  log(players[bb].name + " posts big blind.");
}

function playerAction(action) {
  let p = players[0];

  if (p.folded) return;

  if (action === "fold") {
    p.folded = true;
    log("You fold.");
    nextTurn();
    return;
  }

  if (action === "call") {
    let diff = currentBet - p.bet;
    p.money -= diff;
    p.bet += diff;
    pot += diff;
    log("You call.");
  }

  if (action === "raise") {
  let amount = parseInt(document.getElementById("raiseAmount").value);

  // basic validation
  if (isNaN(amount) || amount <= 0) {
    log("Invalid raise amount.");
    return;
  }

  // poker rule: raise must exceed current bet
  let minRaiseTo = currentBet + amount;

  let diff = minRaiseTo - p.bet;

  // check if player can afford it
  if (diff > p.money) {
    log("Not enough money to raise that much.");
    return;
  }

  // apply raise
  p.money -= diff;
  p.bet = minRaiseTo;
  currentBet = minRaiseTo;
  pot += diff;

  log("You raise to $" + minRaiseTo);
}

  if (action === "check") {
    log("You check.");
  }

  nextTurn();
}

function aiTurn(p) {
  if (p.folded) return;

  let r = Math.random();

  if (r < 0.2) {
    p.folded = true;
    log(p.name + " folds.");
  } else if (r < 0.7) {
    let diff = currentBet - p.bet;
    p.money -= diff;
    p.bet += diff;
    pot += diff;
    log(p.name + " calls.");
  } else {
    let raise = currentBet + 50;
    let diff = raise - p.bet;
    p.money -= diff;
    p.bet = raise;
    currentBet = raise;
    pot += diff;
    log(p.name + " raises.");
  }
}

function nextTurn() {
  if (checkImmediateWin()) return;

  do {
    currentPlayer = (currentPlayer + 1) % players.length;
  } while (players[currentPlayer].folded);

  if (currentPlayer === 0) {
    updateUI();
    return;
  }

  setTimeout(() => {
    aiTurn(players[currentPlayer]);
    checkRoundEnd();
    updateUI();
    nextTurn();
  }, 400);
}

function checkImmediateWin() {
  let active = players.filter(p => !p.folded);

  if (active.length === 1) {
    active[0].money += pot;
    log(active[0].name + " wins (everyone folded).");
    pot = 0;
    return true;
  }
  return false;
}

function checkRoundEnd() {
  let active = players.filter(p => !p.folded);

  let allMatched = active.every(p => p.bet === currentBet);

  if (allMatched) {
    advanceStage();
  }
}

function advanceStage() {
  for (let p of players) p.bet = 0;
  currentBet = 0;
  stage++;

  if (stage === 1) {
    community.push(draw(), draw(), draw());
    log("Flop dealt.");
  } else if (stage === 2) {
    community.push(draw());
    log("Turn dealt.");
  } else if (stage === 3) {
    community.push(draw());
    log("River dealt.");
  } else {
    showdown();
  }
}

function value(v) {
  if (v==="J") return 11;
  if (v==="Q") return 12;
  if (v==="K") return 13;
  if (v==="A") return 14;
  return v;
}

/* ---------- PRO HAND EVALUATION ---------- */

function evaluateHand(cards) {
  let combos = getCombinations(cards, 5);
  let best = null;

  for (let combo of combos) {
    let score = score5(combo);
    if (!best || compareScores(score, best) > 0) {
      best = score;
    }
  }
  return best;
}

function score5(cards) {
  let vals = cards.map(c => value(c.value)).sort((a,b)=>b-a);
  let suits = cards.map(c => c.suit);

  let counts = {};
  vals.forEach(v => counts[v] = (counts[v]||0)+1);

  let groups = Object.entries(counts)
    .map(([v,c]) => ({v:parseInt(v), c}))
    .sort((a,b)=> b.c - a.c || b.v - a.v);

  let isFlush = suits.every(s => s === suits[0]);

  let unique = [...new Set(vals)];
  let isStraight = false;

  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i+4] === 4) {
      isStraight = true;
      break;
    }
  }

  if (!isStraight && unique.includes(14)) {
    let wheel = [5,4,3,2,14];
    if (wheel.every(v => unique.includes(v))) {
      isStraight = true;
      vals = [5,4,3,2,1];
    }
  }

  if (isStraight && isFlush) return [8, ...vals];
  if (groups[0].c === 4) return [7, groups[0].v, groups[1].v];
  if (groups[0].c === 3 && groups[1].c === 2) return [6, groups[0].v, groups[1].v];
  if (isFlush) return [5, ...vals];
  if (isStraight) return [4, ...vals];
  if (groups[0].c === 3) return [3, groups[0].v, ...vals];
  if (groups[0].c === 2 && groups[1].c === 2)
    return [2, groups[0].v, groups[1].v, groups[2].v];
  if (groups[0].c === 2) return [1, groups[0].v, ...vals];

  return [0, ...vals];
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getCombinations(arr, k) {
  let results = [];

  function helper(start, combo) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }

  helper(0, []);
  return results;
}

/* ---------- SHOWDOWN ---------- */

function showdown() {
  log("Showdown!");

  let best = null;
  let winners = [];

  for (let p of players) {
    if (p.folded) continue;

    let score = evaluateHand([...p.hand, ...community]);

    log(p.name + " → " + score.join(","));

    if (!best || compareScores(score, best) > 0) {
      best = score;
      winners = [p];
    } else if (compareScores(score, best) === 0) {
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

updateUI();
