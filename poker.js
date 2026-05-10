let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;

let turnIndex = 0;
let handActive = false;
let stage = 0; // 0 preflop, 1 flop, 2 turn, 3 river
function resetchips() {
    players[0].money = 1000;
}
function panicmode() {
    window.location.href = "https://google.com";
}
function getChips() {
    let chips = localStorage.getItem("chips");

    if (chips === null) {
        alert("no chips found")
        return 1000;
    } else {
        alert("loaded chips");
        return Number(chips);
    }
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

/* ---------------- SETUP ---------------- */

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

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];

  deck = [];

  for (let s of suits) {
    for (let v of values) {
      deck.push({
        value: v,
        suit: s
      });
    }
  }

  deck.sort(() => Math.random() - 0.5);
}

function draw() {
  return deck.pop();
}

/* ---------------- START HAND ---------------- */

function startHand() {
  if (players.length === 0) {
    createPlayers();
  }

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
  log("Your turn.");

  updateUI();
}

/* ---------------- TURN SYSTEM ---------------- */

function nextTurn() {
  if (!handActive) return;

  let active = players.filter(p => !p.folded);

  // only one player left
  if (active.length === 1) {
    active[0].money += pot;

    log(active[0].name + " wins (everyone folded).");

    pot = 0;
    handActive = false;

    updateUI();
    return;
  }

  turnIndex = (turnIndex + 1) % players.length;

  // skip folded players
  if (players[turnIndex].folded) {
    nextTurn();
    return;
  }

  // player turn
  if (turnIndex === 0) {
    log("Your turn.");
    updateUI();
    return;
  }

  // AI turn
  setTimeout(() => {
    aiTurn(players[turnIndex]);

    updateUI();

    checkRoundEnd();

    if (handActive) {
      nextTurn();
    }
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

  /* ---------- FOLD ---------- */

  if (action === "fold") {
    p.folded = true;
    p.acted = true;

    log("You fold.");
  }

  /* ---------- CALL ---------- */

  else if (action === "call") {
    let diff = currentBet - p.bet;

    if (diff < 0) diff = 0;
    if (diff > p.money) diff = p.money;

    p.money -= diff;
    p.bet += diff;
    pot += diff;

    p.acted = true;

    if (diff === 0) {
      log("You check.");
    } else {
      log("You call.");
    }
  }

  /* ---------- RAISE ---------- */

  else if (action === "raise") {
    let amount =
      parseInt(document.getElementById("raiseAmount").value) || 0;

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

    p.acted = true;

    // everyone else must respond again
    for (let other of players) {
      if (other !== p && !other.folded) {
        other.acted = false;
      }
    }

    log("You raise to " + newBet);
  }

  updateUI();

  checkRoundEnd();

  if (handActive) {
    nextTurn();
  }
}

/* ---------------- AI ---------------- */

function aiTurn(p) {
  if (p.folded) return;

  let r = Math.random();

  /* ---------- FOLD ---------- */

  if (r < 0.2) {
    p.folded = true;
    p.acted = true;

    log(p.name + " folds.");
    return;
  }

  /* ---------- CALL / CHECK ---------- */

  if (r < 0.7) {
    let diff = currentBet - p.bet;

    if (diff > p.money) {
      diff = p.money;
    }

    if (diff > 0) {
      p.money -= diff;
      p.bet += diff;
      pot += diff;

      log(p.name + " calls.");
    } else {
      log(p.name + " checks.");
    }

    p.acted = true;

    return;
  }

  /* ---------- RAISE ---------- */

  let minRaise = 20;
  let maxRaise = 100;

  let raiseSize =
    Math.floor(Math.random() * (maxRaise - minRaise)) + minRaise;

  let targetBet = currentBet + raiseSize;

  let diff = targetBet - p.bet;

  // can't afford raise
  if (diff > p.money) {
    diff = p.money;
    targetBet = p.bet + diff;

    // becomes call
    if (targetBet <= currentBet) {
      let callDiff = currentBet - p.bet;

      if (callDiff > p.money) {
        callDiff = p.money;
      }

      p.money -= callDiff;
      p.bet += callDiff;
      pot += callDiff;

      p.acted = true;

      log(p.name + " calls (low money).");
      return;
    }
  }

  p.money -= diff;
  p.bet += diff;

  currentBet = p.bet;

  pot += diff;

  p.acted = true;

  // everyone else must respond again
  for (let other of players) {
    if (other !== p && !other.folded) {
      other.acted = false;
    }
  }

  log(p.name + " raises to " + currentBet);
}

/* ---------------- ROUND SYSTEM ---------------- */
function checkRoundEnd() {
  let active = players.filter(p => !p.folded);

  if (active.length <= 1) {
    return;
  }

  let allEqual =
    active.every(p => p.bet === currentBet);

  let allActed =
    active.every(p => p.acted);

  if (!allEqual || !allActed) {
    return;
  }

  // reset bets + acted
  for (let p of players) {
    p.bet = 0;
    p.acted = false;
  }

  currentBet = 0;

  stage++;

  /* ---------- NEXT ROUND STARTS ---------- */

  // IMPORTANT FIX:
  // make nextTurn() begin correctly
  turnIndex = -1;

  /* ---------- FLOP ---------- */

  if (stage === 1) {
    community.push(draw(), draw(), draw());
    log("Flop dealt.");
  }

  /* ---------- TURN ---------- */

  else if (stage === 2) {
    community.push(draw());
    log("Turn dealt.");
  }

  /* ---------- RIVER ---------- */

  else if (stage === 3) {
    community.push(draw());
    log("River dealt.");
  }

  /* ---------- SHOWDOWN ---------- */

  else {
    showdown();
    handActive = false;
  }

  updateUI();
}

/* ---------------- HAND EVALUATION ---------------- */

function value(v) {
  if (v === "J") return 11;
  if (v === "Q") return 12;
  if (v === "K") return 13;
  if (v === "A") return 14;

  return v;
}

function evaluate(cards) {
  let vals =
    cards.map(c => value(c.value));

  let sortedDesc =
    [...vals].sort((a, b) => b - a);

  let counts = {};

  vals.forEach(v => {
    counts[v] = (counts[v] || 0) + 1;
  });

  let groups =
    Object.entries(counts)
      .map(([v, c]) => ({
        v: parseInt(v),
        c
      }))
      .sort((a, b) => b.c - a.c || b.v - a.v);

  /* ---------- FLUSH ---------- */

  let suitGroups = {};

  for (let c of cards) {
    if (!suitGroups[c.suit]) {
      suitGroups[c.suit] = [];
    }

    suitGroups[c.suit].push(value(c.value));
  }

  let flushSuit = null;

  for (let s in suitGroups) {
    if (suitGroups[s].length >= 5) {
      flushSuit = s;
      break;
    }
  }

  let flushCards = [];

  if (flushSuit) {
    flushCards =
      suitGroups[flushSuit]
        .sort((a, b) => b - a);
  }

  /* ---------- STRAIGHT ---------- */

  function findStraight(arr) {
    let unique =
      [...new Set(arr)]
        .sort((a, b) => a - b);

    if (unique.includes(14)) {
      unique.unshift(1);
    }

    let streak = 1;
    let high = 0;

    for (let i = 1; i < unique.length; i++) {
      if (unique[i] === unique[i - 1] + 1) {
        streak++;

        if (streak >= 5) {
          high = unique[i];
        }
      } else {
        streak = 1;
      }
    }

    return high;
  }

  let straightHigh =
    findStraight(vals);

  /* ---------- STRAIGHT FLUSH ---------- */

  let straightFlushHigh = 0;

  if (flushCards.length >= 5) {
    straightFlushHigh =
      findStraight(flushCards);
  }

  /* ---------- ROYAL FLUSH ---------- */

  if (straightFlushHigh === 14) {
    return {
      rank: 10,
      tiebreak: [14],
      name: "Royal Flush"
    };
  }

  /* ---------- STRAIGHT FLUSH ---------- */

  if (straightFlushHigh > 0) {
    return {
      rank: 9,
      tiebreak: [straightFlushHigh],
      name: "Straight Flush"
    };
  }

  /* ---------- FOUR KIND ---------- */

  if (groups[0].c === 4) {
    let kicker =
      groups.find(g => g.c === 1).v;

    return {
      rank: 8,
      tiebreak: [groups[0].v, kicker],
      name: "Four of a Kind"
    };
  }

  /* ---------- FULL HOUSE ---------- */

  if (
    groups[0].c === 3 &&
    (groups[1]?.c === 2 ||
     groups[1]?.c === 3)
  ) {
    return {
      rank: 7,
      tiebreak: [
        groups[0].v,
        groups[1].v
      ],
      name: "Full House"
    };
  }

  /* ---------- FLUSH ---------- */

  if (flushCards.length >= 5) {
    return {
      rank: 6,
      tiebreak: flushCards.slice(0, 5),
      name: "Flush"
    };
  }

  /* ---------- STRAIGHT ---------- */

  if (straightHigh > 0) {
    return {
      rank: 5,
      tiebreak: [straightHigh],
      name: "Straight"
    };
  }

  /* ---------- THREE KIND ---------- */

  if (groups[0].c === 3) {
    let kickers =
      groups
        .filter(g => g.c === 1)
        .map(g => g.v)
        .sort((a, b) => b - a)
        .slice(0, 2);

    return {
      rank: 4,
      tiebreak: [
        groups[0].v,
        ...kickers
      ],
      name: "Three of a Kind"
    };
  }

  /* ---------- TWO PAIR ---------- */

  if (
    groups[0].c === 2 &&
    groups[1]?.c === 2
  ) {
    let kicker =
      groups
        .filter(g => g.c === 1)
        .map(g => g.v)
        .sort((a, b) => b - a)[0];

    return {
      rank: 3,
      tiebreak: [
        groups[0].v,
        groups[1].v,
        kicker
      ],
      name: "Two Pair"
    };
  }

  /* ---------- PAIR ---------- */

  if (groups[0].c === 2) {
    let kickers =
      groups
        .filter(g => g.c === 1)
        .map(g => g.v)
        .sort((a, b) => b - a)
        .slice(0, 3);

    return {
      rank: 2,
      tiebreak: [
        groups[0].v,
        ...kickers
      ],
      name: "Pair"
    };
  }

  /* ---------- HIGH CARD ---------- */

  return {
    rank: 1,
    tiebreak: sortedDesc.slice(0, 5),
    name: "High Card"
  };
}
/* ---------------- SHOWDOWN ---------------- */

function showdown() {
  log("Showdown!");

  let bestHand = null;
  let winners = [];

  function compareHands(a, b) {
    // compare rank first
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }

    // compare tiebreakers
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      let av = a.tiebreak[i] || 0;
      let bv = b.tiebreak[i] || 0;

      if (av !== bv) {
        return av - bv;
      }
    }

    return 0;
  }

  for (let p of players) {
    if (p.folded) continue;

    let hand =
      evaluate([...p.hand, ...community]);

    log(
      p.name +
      ": " +
      hand.name
    );

    if (
      bestHand === null ||
      compareHands(hand, bestHand) > 0
    ) {
      bestHand = hand;
      winners = [p];
    }

    else if (
      compareHands(hand, bestHand) === 0
    ) {
      winners.push(p);
    }
  }

  let split = pot / winners.length;

  for (let w of winners) {
    w.money += split;
  }

  localStorage.setItem(
    "chips",
    players[0].money
  );

  log(
    "Winner(s): " +
    winners.map(w => w.name).join(", ")
  );

  pot = 0;

  updateUI();
}
/* ---------------- UI ---------------- */

function updateUI() {
  document.getElementById("pot").textContent =
    pot;

  document.getElementById("currentBet").textContent =
    currentBet;

  document.getElementById("money").textContent =
    players[0]?.money || 0;

  /* ---------- PLAYER CARDS ---------- */

  document.getElementById("playerCards").innerHTML =
    players[0].hand.map(renderCard).join("");

  /* ---------- COMMUNITY ---------- */

  document.getElementById("communityCards").innerHTML =
    community.map(renderCard).join("");

  /* ---------- AI PLAYERS ---------- */

  for (let i = 1; i <= 3; i++) {
    let el = document.getElementById("p" + i);

    el.innerHTML =
      `<b>${players[i].name}</b><br>` +
      `<div class="card-back"></div>` +
      `<div class="card-back"></div><br>` +
      `Money: $${players[i].money}<br>` +
      `Bet: $${players[i].bet}`;
  }
}

/* ---------------- INIT ---------------- */

createPlayers();
updateUI();
