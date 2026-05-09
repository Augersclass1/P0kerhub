let players = [];
let deck = [];
let community = [];

let pot = 0;
let currentBet = 0;

let turnIndex = 0;
let handActive = false;
let stage = 0;

/* ---------------- UTIL ---------------- */
const originalTitle = document.title;
const originalTitle = document.title;

document.addEventListener("visibilitychange", () => {
  document.title = document.hidden
    ? "google"
    : "poker-4.5";
});

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

  else if (action === "call" || action === "check") {
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

    // everyone else must act again
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

    p.money -= diff;
    p.bet += diff;
    pot += diff;

    p.acted = true;

    if (diff > 0) {
      log(p.name + " calls.");
    } else {
      log(p.name + " checks.");
    }

    return;
  }

  /* ---------- RAISE ---------- */

  let raiseSize =
    Math.floor(Math.random() * 81) + 20;

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

  // everyone else must act again
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

  // reset round
  for (let p of players) {
    p.bet = 0;
    p.acted = false;
  }

  currentBet = 0;

  stage++;

  // IMPORTANT
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

function getCombinations(arr, k) {
  let result = [];

  function helper(start, combo) {
    if (combo.length === k) {
      result.push(combo);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      helper(i + 1, combo.concat([arr[i]]));
    }
  }

  helper(0, []);

  return result;
}

/* ---------- EVALUATE 5 CARDS ---------- */

function evaluate5(cards) {
  let vals =
    cards
      .map(c => value(c.value))
      .sort((a, b) => b - a);

  let suits = cards.map(c => c.suit);

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

  let isFlush =
    suits.every(s => s === suits[0]);

  /* ---------- STRAIGHT ---------- */

  let unique =
    [...new Set(vals)].sort((a, b) => a - b);

  let isStraight = false;
  let straightHigh = 0;

  // normal straight
  for (let i = 0; i <= unique.length - 5; i++) {
    let seq = unique.slice(i, i + 5);

    if (seq[4] - seq[0] === 4) {
      isStraight = true;
      straightHigh = seq[4];
    }
  }

  // wheel straight A2345
  if (
    unique.includes(14) &&
    unique.includes(2) &&
    unique.includes(3) &&
    unique.includes(4) &&
    unique.includes(5)
  ) {
    isStraight = true;
    straightHigh = 5;
  }

  /* ---------- STRAIGHT FLUSH ---------- */

  if (isStraight && isFlush) {
    return {
      rank: 8,
      kick: [straightHigh]
    };
  }

  /* ---------- FOUR KIND ---------- */

  if (groups[0].c === 4) {
    return {
      rank: 7,
      kick: [groups[0].v]
    };
  }

  /* ---------- FULL HOUSE ---------- */

  if (groups[0].c === 3 && groups[1]?.c === 2) {
    return {
      rank: 6,
      kick: [groups[0].v, groups[1].v]
    };
  }

  /* ---------- FLUSH ---------- */

  if (isFlush) {
    return {
      rank: 5,
      kick: vals
    };
  }

  /* ---------- STRAIGHT ---------- */

  if (isStraight) {
    return {
      rank: 4,
      kick: [straightHigh]
    };
  }

  /* ---------- THREE KIND ---------- */

  if (groups[0].c === 3) {
    return {
      rank: 3,
      kick: [
        groups[0].v,
        ...vals.filter(v => v !== groups[0].v)
      ]
    };
  }

  /* ---------- TWO PAIR ---------- */

  if (groups[0].c === 2 && groups[1]?.c === 2) {
    let kicker =
      vals.find(
        v =>
          v !== groups[0].v &&
          v !== groups[1].v
      );

    return {
      rank: 2,
      kick: [
        groups[0].v,
        groups[1].v,
        kicker
      ]
    };
  }

  /* ---------- ONE PAIR ---------- */

  if (groups[0].c === 2) {
    return {
      rank: 1,
      kick: [
        groups[0].v,
        ...vals.filter(v => v !== groups[0].v)
      ]
    };
  }

  /* ---------- HIGH CARD ---------- */

  return {
    rank: 0,
    kick: vals
  };
}

/* ---------- COMPARE ---------- */

function compareHands(a, b) {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }

  for (
    let i = 0;
    i < Math.max(a.kick.length, b.kick.length);
    i++
  ) {
    let av = a.kick[i] || 0;
    let bv = b.kick[i] || 0;

    if (av !== bv) {
      return av - bv;
    }
  }

  return 0;
}

/* ---------- BEST OF 7 ---------- */

function evaluateBest(cards) {
  let combos = getCombinations(cards, 5);

  let best = null;

  for (let combo of combos) {
    let score = evaluate5(combo);

    if (
      best === null ||
      compareHands(score, best) > 0
    ) {
      best = score;
    }
  }

  return best;
}

/* ---------------- SHOWDOWN ---------------- */

function showdown() {
  log("Showdown!");

  let bestScore = null;
  let winners = [];

  for (let p of players) {
    if (p.folded) continue;

    let result =
      evaluateBest([...p.hand, ...community]);

    log(
      p.name +
      " -> Rank " +
      result.rank +
      " (" +
      result.kick.join(",") +
      ")"
    );

    if (
      bestScore === null ||
      compareHands(result, bestScore) > 0
    ) {
      bestScore = result;
      winners = [p];
    }

    else if (
      compareHands(result, bestScore) === 0
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

  /* ---------- PLAYER ---------- */

  document.getElementById("playerCards").innerHTML =
    players[0].hand.map(renderCard).join("");

  /* ---------- COMMUNITY ---------- */

  document.getElementById("communityCards").innerHTML =
    community.map(renderCard).join("");

  /* ---------- AI ---------- */

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
