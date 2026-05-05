let pc;
let channel;

const isHost = window.location.pathname.includes("host");
const myId = isHost ? 0 : 1;

// ---------------- STATE ----------------
let gameState = {
  deck: [],
  players: [
    { id:0, name:"Host", chips:1000, hand:[], bet:0, folded:false },
    { id:1, name:"Player", chips:1000, hand:[], bet:0, folded:false }
  ],
  community: [],
  pot: 0,
  currentPlayer: 0,
  currentBet: 0,
  phase: "preflop",
  dealer: 0
};

// ---------------- DECK ----------------
function deck() {
  const s=["♠","♥","♦","♣"];
  const r=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  let d=[];
  for(let x of s) for(let y of r) d.push({suit:x, rank:y});
  return d.sort(()=>Math.random()-0.5);
}

// ---------------- START ----------------
function startGame(){
  gameState.deck = deck();
  gameState.community = [];
  gameState.pot = 0;
  gameState.phase = "preflop";
  gameState.currentBet = 0;

  for(let p of gameState.players){
    p.hand=[gameState.deck.pop(),gameState.deck.pop()];
    p.bet=0;
    p.folded=false;
  }

  gameState.currentPlayer = 1;

  render();
  sendPrivateHands();
  sendState();
}

// ---------------- ACTIONS ----------------
function handleAction(id, action){
  if(id !== gameState.currentPlayer) return;

  let p = gameState.players[id];

  switch(action.type){

    case "bet":
      if(action.amount < gameState.currentBet) return;
      p.chips -= action.amount;
      p.bet += action.amount;
      gameState.pot += action.amount;
      gameState.currentBet = action.amount;
      break;

    case "call":
      let diff = gameState.currentBet - p.bet;
      p.chips -= diff;
      p.bet += diff;
      gameState.pot += diff;
      break;

    case "fold":
      p.folded = true;
      break;
  }

  nextTurn();
  checkRound();
  render();
  sendState();
  sendPrivateHands();
}

// ---------------- TURN ----------------
function nextTurn(){
  let i = gameState.currentPlayer;
  do{
    i=(i+1)%2;
  }while(gameState.players[i].folded);

  gameState.currentPlayer=i;
}

// ---------------- ROUND ----------------
function checkRound(){
  let alive=gameState.players.filter(p=>!p.folded);

  if(alive.length===1){
    alive[0].chips+=gameState.pot;
    startGame();
    return;
  }

  let done = gameState.players.every(p=>
    p.folded || p.bet===gameState.currentBet
  );

  if(done) nextPhase();
}

function nextPhase(){
  gameState.currentBet=0;

  if(gameState.phase==="preflop"){
    gameState.phase="flop";
    gameState.community.push(gameState.deck.pop(),gameState.deck.pop(),gameState.deck.pop());
  }
  else if(gameState.phase==="flop"){
    gameState.phase="turn";
    gameState.community.push(gameState.deck.pop());
  }
  else if(gameState.phase==="turn"){
    gameState.phase="river";
    gameState.community.push(gameState.deck.pop());
  }
  else{
    showdown();
  }
}

// ---------------- SHOWDOWN ----------------
function showdown(){
  let best=null;
  let winners=[];

  for(let p of gameState.players){
    if(p.folded) continue;

    let score = scoreHand(p.hand, gameState.community);

    if(!best || score>best){
      best=score;
      winners=[p];
    }
    else if(score===best){
      winners.push(p);
    }
  }

  let share=Math.floor(gameState.pot/winners.length);

  winners.forEach(w=>w.chips+=share);

  setTimeout(startGame,2000);
}

// simple scoring (fast poker evaluator)
function scoreHand(hand, community){
  const all=[...hand,...community];
  const values="23456789TJQKA";

  let counts={};

  for(let c of all){
    counts[c.rank]=(counts[c.rank]||0)+1;
  }

  let max=0;
  for(let k in counts){
    max=Math.max(max,counts[k]);
  }

  return max; // simple ranking (pair/trips/etc)
}

// ---------------- PLAYER ACTION ----------------
function playerAction(a){
  if(isHost){
    handleAction(0,a);
  }else{
    channel.send(JSON.stringify({
      type:"action",
      playerId:myId,
      action:a
    }));
  }
}

// ---------------- WEBSYNC ----------------
function sendState(){
  if(!channel) return;
  channel.send(JSON.stringify({type:"state",state:gameState}));
}

function sendPrivateHands(){
  if(!channel) return;

  channel.send(JSON.stringify({
    type:"private",
    hand: gameState.players[1].hand
  }));
}

// ---------------- UI ----------------
function render(){
  document.getElementById("phase").textContent=gameState.phase;
  document.getElementById("pot").textContent=gameState.pot;
  document.getElementById("turn").textContent=
    gameState.players[gameState.currentPlayer].name;

  document.getElementById("community").innerHTML=
    gameState.community.map(c=>`<span class="card">${c.rank}${c.suit}</span>`).join("");

  document.getElementById("players").innerHTML=
    gameState.players.map(p=>`
      <div class="panel">
        <b>${p.name}</b><br>
        chips:${p.chips}<br>
        bet:${p.bet}<br>
        ${p.folded?"FOLDED":""}
      </div>
    `).join("");
}

// ---------------- WEBRTC ----------------
function peer(){
  pc=new RTCPeerConnection({
    iceServers:[{urls:"stun:stun.l.google.com:19302"}]
  });
}

async function createOffer(){
  peer();
  channel=pc.createDataChannel("game");
  setup();

  let offer=await pc.createOffer();
  await pc.setLocalDescription(offer);

  document.getElementById("offerBox").value=
    JSON.stringify(pc.localDescription);
}

async function createAnswer(){
  peer();

  pc.ondatachannel=e=>{
    channel=e.channel;
    setup();
  };

  let offer=JSON.parse(document.getElementById("offerBox").value);
  await pc.setRemoteDescription(offer);

  let ans=await pc.createAnswer();
  await pc.setLocalDescription(ans);

  document.getElementById("answerBox").value=
    JSON.stringify(pc.localDescription);
}

async function acceptAnswer(){
  let ans=JSON.parse(document.getElementById("answerBox").value);
  await pc.setRemoteDescription(ans);
}

function setup(){
  channel.onmessage=e=>{
    let m=JSON.parse(e.data);

    if(m.type==="action") handleAction(m.playerId,m.action);

    if(m.type==="state"){
      gameState=m.state;
      render();
    }

    if(m.type==="private"){
      console.log("Your hand:",m.hand);
    }
  };
}

render();
