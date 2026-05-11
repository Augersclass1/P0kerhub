const suits = ["♠", "♥", "♦", "♣"];

const values = [
  "A", "2", "3", "4", "5", "6",
  "7", "8", "9", "10", "J", "Q", "K"
];

let deck = [];
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
let player = {
  hand: [],
  money: getChips(),
  bet: 0
};
player.money=getChips()
function resetChips() {
  player.money=1000
  localStorage.setItem(
    "chips",
    players.money
  );
}
let aiPlayers = [
  { name: "AI 1", hand: [] },
  { name: "AI 2", hand: [] }
];

let dealerHand = [];

let gameOver = true;

let aiVisible = true;

//title change

const originalTitle = document.title;

document.addEventListener("visibilitychange", () => {
  document.title = document.hidden
    ? "google"
    : originalTitle;
});


// ---------- ELEMENTS ----------

const dealerCardsEl =
  document.getElementById("dealerCards");

const playerCardsEl =
  document.getElementById("playerCards");

const dealerScoreEl =
  document.getElementById("dealerScore");

const playerScoreEl =
  document.getElementById("playerScore");

const messageEl =
  document.getElementById("message");

const hitBtn =
  document.getElementById("hitBtn");

const standBtn =
  document.getElementById("standBtn");

const dealBtn =
  document.getElementById("dealBtn");

const toggleAIBtn =
  document.getElementById("toggleAI");

const felt =
  document.querySelector(".felt");


// ---------- AI CONTAINER ----------

let aiContainer =
  document.createElement("div");

aiContainer.id = "aiContainer";

felt.insertBefore(
  aiContainer,
  document.querySelector(".controls")
);


// ---------- MONEY DISPLAY ----------

const moneyDisplay =
  document.createElement("div");

moneyDisplay.style.textAlign = "center";
moneyDisplay.style.fontSize = "24px";
moneyDisplay.style.marginBottom = "20px";
moneyDisplay.style.color = "gold";

felt.insertBefore(
  moneyDisplay,
  document.querySelector(".controls")
);


// ---------- BET CONTROLS ----------

const betControls =
  document.createElement("div");

betControls.style.display = "flex";
betControls.style.justifyContent = "center";
betControls.style.gap = "10px";
betControls.style.marginBottom = "20px";

felt.insertBefore(
  betControls,
  document.querySelector(".controls")
);


// ---------- BET BUTTONS ----------

[10, 25, 50, 100].forEach(amount => {

  const btn =
    document.createElement("button");

  btn.textContent = "$" + amount;

  btn.style.background = "#222";
  btn.style.color = "white";

  btn.addEventListener("click", () => {

    if (!gameOver) return;

    if (player.money >= amount) {

      player.bet = amount;

      updateMoneyDisplay();

      messageEl.textContent =
        "Bet placed: $" + amount;

    }

  });

  betControls.appendChild(btn);

});


// ---------- TOGGLE AI ----------

toggleAIBtn.addEventListener("click", () => {

  aiVisible = !aiVisible;

  toggleAIBtn.textContent =
    aiVisible ? "Hide AI" : "Show AI";

  if (!aiVisible) {

    aiContainer.remove();

  } else {

    aiContainer =
      document.createElement("div");

    aiContainer.id = "aiContainer";

    felt.insertBefore(
      aiContainer,
      document.querySelector(".controls")
    );

    renderHands(false);
  }

});


// ---------- DECK ----------

function createDeck() {

  deck = [];

  for (let d = 0; d < 6; d++) {

    for (let suit of suits) {

      for (let value of values) {

        deck.push({ suit, value });

      }

    }

  }

}

function shuffleDeck() {

  for (let i = deck.length - 1; i > 0; i--) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [deck[i], deck[j]] =
      [deck[j], deck[i]];

  }

}

function drawCard() {

  if (deck.length === 0) {

    createDeck();

    shuffleDeck();

  }

  return deck.pop();

}


// ---------- LOGIC ----------

function getCardValue(card) {

  if (card.value === "A") return 11;

  if (["K", "Q", "J"].includes(card.value))
    return 10;

  return parseInt(card.value);

}

function calculateScore(hand) {

  let score = 0;
  let aces = 0;

  for (let c of hand) {

    score += getCardValue(c);

    if (c.value === "A") aces++;

  }

  while (score > 21 && aces > 0) {

    score -= 10;
    aces--;

  }

  return score;

}


// ---------- CARD UI ----------

function createCardElement(card, hidden = false) {

  const el =
    document.createElement("div");

  if (hidden) {

    el.className = "card back";

    return el;

  }

  const red =
    card.suit === "♥" ||
    card.suit === "♦";

  el.className =
    red ? "card red" : "card";

  el.innerHTML = `
    <div class="corner top-left">
      ${card.value}<br>${card.suit}
    </div>
    <div class="center">${card.suit}</div>
    <div class="corner bottom-right">
      ${card.value}<br>${card.suit}
    </div>
  `;

  return el;

}


// ---------- RENDER ----------

function renderHands(showDealer = false) {

  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";

  if (aiVisible) {
    aiContainer.innerHTML = "";
  }

  // Dealer

  dealerHand.forEach((card, i) => {

    const hidden =
      i === 0 &&
      !showDealer &&
      !gameOver;

    dealerCardsEl.appendChild(
      createCardElement(card, hidden)
    );

  });

  // Player

  player.hand.forEach(c => {

    playerCardsEl.appendChild(
      createCardElement(c)
    );

  });

  // AI

  if (aiVisible) {

    aiPlayers.forEach(ai => {

      const section =
        document.createElement("div");

      section.style.marginBottom =
        "25px";

      section.innerHTML = `
        <h2>${ai.name}</h2>

        <div style="
          display:flex;
          justify-content:center;
          gap:10px;
        "></div>

        <p>
          Score:
          ${calculateScore(ai.hand)}
        </p>
      `;

      const box =
        section.querySelector("div");

      ai.hand.forEach(c => {

        box.appendChild(
          createCardElement(c)
        );

      });

      aiContainer.appendChild(section);

    });

  }

  dealerScoreEl.textContent =
    gameOver
      ? calculateScore(dealerHand)
      : getCardValue(dealerHand[1]);

  playerScoreEl.textContent =
    calculateScore(player.hand);

}


// ---------- MONEY ----------

function updateMoneyDisplay() {
  localStorage.setItem(
    "chips",
    players.money
  );
  moneyDisplay.innerHTML = `
    Money: $${player.money}<br>
    Bet: $${player.bet}
  `;

}


// ---------- END GAME ----------

function endGame(text) {

  gameOver = true;

  hitBtn.disabled = true;
  standBtn.disabled = true;

  renderHands(true);

  const ps =
    calculateScore(player.hand);

  const ds =
    calculateScore(dealerHand);

  if (
    ps <= 21 &&
    (ds > 21 || ps > ds)
  ) {

    player.money += player.bet*2;

  } else if (
    ps > 21 || ds > ps
  ) {

    player.money -= player.bet;

  }
  localStorage.setItem(
    "chips",
    players.money
  );
  updateMoneyDisplay();

  messageEl.textContent = text;
  localStorage.setItem(
    "chips",
    players.money
  );
}


// ---------- START GAME ----------

function startGame() {

  if (gameOver === false) {

    messageEl.textContent =
      "Finish round first.";

    return;

  }

  if (player.bet <= 0) {

    messageEl.textContent =
      "Place a bet first.";

    return;

  }

  gameOver = false;

  hitBtn.disabled = false;
  standBtn.disabled = false;

  player.hand = [];
  dealerHand = [];

  aiPlayers.forEach(a => a.hand = []);

  createDeck();
  shuffleDeck();

  // Deal

  player.hand.push(drawCard());
  dealerHand.push(drawCard());

  player.hand.push(drawCard());
  dealerHand.push(drawCard());

  aiPlayers.forEach(a => {

    a.hand.push(drawCard());
    a.hand.push(drawCard());

  });

  aiPlayers.forEach(a => {

    while (
      calculateScore(a.hand) < 16
    ) {

      a.hand.push(drawCard());

    }

  });

  renderHands(false);

  updateMoneyDisplay();

  messageEl.textContent = "";

}


// ---------- PLAYER ACTIONS ----------

function playerHit() {

  if (gameOver) return;

  player.hand.push(drawCard());

  renderHands(false);

  if (
    calculateScore(player.hand) > 21
  ) {

    endGame("Player Bust!");

  }

}

function dealerTurn() {

  if (gameOver) return;

  while (
    calculateScore(dealerHand) < 17
  ) {

    dealerHand.push(drawCard());

  }

  renderHands(true);

  const ds =
    calculateScore(dealerHand);

  const ps =
    calculateScore(player.hand);

  if (ds > 21) endGame("Dealer Bust!");
  else if (ds > ps) endGame("Dealer Wins!");
  else if (ps > ds) endGame("Player Wins!");
  else endGame("Push!");

}


// ---------- EVENTS ----------

hitBtn.onclick = playerHit;
standBtn.onclick = dealerTurn;
dealBtn.onclick = startGame;


// ---------- INIT ----------

updateMoneyDisplay();

messageEl.textContent =
  "Place a bet to begin.";
player.money=getChips()
