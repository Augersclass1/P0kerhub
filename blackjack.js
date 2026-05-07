const suits = ["♠", "♥", "♦", "♣"];

const values = [
  "A", "2", "3", "4", "5", "6",
  "7", "8", "9", "10", "J", "Q", "K"
];

let deck = [];

let player = {
  hand: [],
  money: 1000,
  bet: 0
};

let aiPlayers = [
  {
    name: "AI 1",
    hand: []
  },
  {
    name: "AI 2",
    hand: []
  }
];

let dealerHand = [];

let gameOver = true;


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

const felt =
  document.querySelector(".felt");


// ---------- AI AREA ----------

const aiContainer =
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

  btn.textContent =
    "$" + amount;

  btn.style.background =
    "#222";

  btn.style.color =
    "white";

  btn.addEventListener(
    "click",
    () => {

      if (!gameOver) return;

      if (player.money >= amount) {

        player.bet = amount;

        updateMoneyDisplay();

        messageEl.textContent =
          "Bet placed: $" + amount;

      }

    }
  );

  betControls.appendChild(btn);

});


// ---------- CREATE DECK ----------

function createDeck() {

  deck = [];

  // 6-deck casino shoe

  for (let d = 0; d < 6; d++) {

    for (let suit of suits) {

      for (let value of values) {

        deck.push({
          suit,
          value
        });

      }

    }

  }

}


// ---------- SHUFFLE ----------

function shuffleDeck() {

  for (
    let i = deck.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [deck[i], deck[j]] =
      [deck[j], deck[i]];

  }

}


// ---------- DRAW CARD ----------

function drawCard() {

  if (deck.length === 0) {

    createDeck();

    shuffleDeck();

  }

  return deck.pop();

}


// ---------- CARD VALUE ----------

function getCardValue(card) {

  if (card.value === "A") {
    return 11;
  }

  if (
    ["K", "Q", "J"]
      .includes(card.value)
  ) {

    return 10;

  }

  return parseInt(card.value);

}


// ---------- CALCULATE SCORE ----------

function calculateScore(hand) {

  let score = 0;

  let aces = 0;

  for (let card of hand) {

    score +=
      getCardValue(card);

    if (card.value === "A") {
      aces++;
    }

  }

  while (
    score > 21 &&
    aces > 0
  ) {

    score -= 10;

    aces--;

  }

  return score;

}


// ---------- CREATE CARD ----------

function createCardElement(
  card,
  hidden = false
) {

  const cardEl =
    document.createElement("div");

  if (hidden) {

    cardEl.className =
      "card back";

    return cardEl;

  }

  const isRed =
    card.suit === "♥" ||
    card.suit === "♦";

  cardEl.className =
    isRed
      ? "card red"
      : "card";

  cardEl.innerHTML = `
    <div class="corner top-left">
      ${card.value}<br>${card.suit}
    </div>

    <div class="center">
      ${card.suit}
    </div>

    <div class="corner bottom-right">
      ${card.value}<br>${card.suit}
    </div>
  `;

  return cardEl;

}


// ---------- RENDER ----------

function renderHands(
  showDealer = false
) {

  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  aiContainer.innerHTML = "";

  // Dealer cards

  dealerHand.forEach(
    (card, index) => {

      const hidden =
        index === 0 &&
        !showDealer &&
        !gameOver;

      dealerCardsEl.appendChild(
        createCardElement(
          card,
          hidden
        )
      );

    }
  );

  // Player cards

  player.hand.forEach(card => {

    playerCardsEl.appendChild(
      createCardElement(card)
    );

  });

  // AI players

  aiPlayers.forEach(ai => {

    const section =
      document.createElement("div");

    section.style.marginBottom =
      "30px";

    section.innerHTML = `
      <h2>${ai.name}</h2>

      <div style="
        display:flex;
        justify-content:center;
        gap:10px;
        flex-wrap:wrap;
      "></div>

      <p>
        Score:
        ${calculateScore(ai.hand)}
      </p>
    `;

    const cardsDiv =
      section.querySelector("div");

    ai.hand.forEach(card => {

      cardsDiv.appendChild(
        createCardElement(card)
      );

    });

    aiContainer.appendChild(
      section
    );

  });

  // Scores

  if (
    !showDealer &&
    !gameOver
  ) {

    dealerScoreEl.textContent =
      getCardValue(
        dealerHand[1]
      );

  }
  else {

    dealerScoreEl.textContent =
      calculateScore(
        dealerHand
      );

  }

  playerScoreEl.textContent =
    calculateScore(
      player.hand
    );

}


// ---------- UPDATE MONEY ----------

function updateMoneyDisplay() {

  moneyDisplay.innerHTML = `
    Money: $${player.money}
    <br>
    Current Bet: $${player.bet}
  `;

}


// ---------- END GAME ----------

function endGame(text) {

  gameOver = true;

  hitBtn.disabled = true;
  standBtn.disabled = true;

  renderHands(true);

  const playerScore =
    calculateScore(
      player.hand
    );

  const dealerScore =
    calculateScore(
      dealerHand
    );

  // Player win

  if (
    playerScore <= 21 &&
    (
      dealerScore > 21 ||
      playerScore > dealerScore
    )
  ) {

    player.money +=
      player.bet;

  }

  // Player lose

  else if (
    playerScore > 21 ||
    dealerScore > playerScore
  ) {

    player.money -=
      player.bet;

  }

  updateMoneyDisplay();

  messageEl.textContent =
    text;

}


// ---------- START GAME ----------

function startGame() {

  // Prevent restart mid-round

  if (!gameOver) {

    messageEl.textContent =
      "Finish the current round first.";

    return;

  }

  // Require bet

  if (player.bet <= 0) {

    messageEl.textContent =
      "Place a bet first.";

    return;

  }

  // Reset state

  gameOver = false;

  hitBtn.disabled = false;
  standBtn.disabled = false;

  messageEl.textContent = "";

  // Reset hands

  player.hand = [];

  dealerHand = [];

  aiPlayers.forEach(ai => {

    ai.hand = [];

  });

  // New shuffled shoe

  createDeck();

  shuffleDeck();

  // Initial cards

  player.hand.push(
    drawCard()
  );

  dealerHand.push(
    drawCard()
  );

  player.hand.push(
    drawCard()
  );

  dealerHand.push(
    drawCard()
  );

  // AI cards

  aiPlayers.forEach(ai => {

    ai.hand.push(
      drawCard()
    );

    ai.hand.push(
      drawCard()
    );

  });

  // AI turns

  aiPlayers.forEach(ai => {

    while (
      calculateScore(ai.hand) < 16
    ) {

      ai.hand.push(
        drawCard()
      );

    }

  });

  renderHands(false);

  updateMoneyDisplay();

}


// ---------- PLAYER HIT ----------

function playerHit() {

  if (gameOver) return;

  player.hand.push(
    drawCard()
  );

  renderHands(false);

  const score =
    calculateScore(
      player.hand
    );

  if (score > 21) {

    endGame(
      "Player Busts! Dealer Wins!"
    );

  }

}


// ---------- DEALER TURN ----------

function dealerTurn() {

  if (gameOver) return;

  while (
    calculateScore(
      dealerHand
    ) < 17
  ) {

    dealerHand.push(
      drawCard()
    );

  }

  renderHands(true);

  const dealerScore =
    calculateScore(
      dealerHand
    );

  const playerScore =
    calculateScore(
      player.hand
    );

  if (dealerScore > 21) {

    endGame(
      "Dealer Busts! Player Wins!"
    );

  }

  else if (
    dealerScore > playerScore
  ) {

    endGame(
      "Dealer Wins!"
    );

  }

  else if (
    playerScore > dealerScore
  ) {

    endGame(
      "Player Wins!"
    );

  }

  else {

    endGame(
      "Push!"
    );

  }

}


// ---------- BUTTONS ----------

hitBtn.addEventListener(
  "click",
  playerHit
);

standBtn.addEventListener(
  "click",
  dealerTurn
);

dealBtn.addEventListener(
  "click",
  () => {

    if (gameOver) {

      startGame();

    }

  }
);


// ---------- INITIAL ----------

updateMoneyDisplay();

messageEl.textContent =
  "Place a bet to begin.";
