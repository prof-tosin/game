const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = ['♥', '♦'];

let deck = [];
let discard = [];
let playerHand = [];
let computerHand = [];
let currentSuit = null; // active suit when top card is an Ace (wild)
let pendingDraw = 0;    // stacked draw-2 penalty
let turn = 'player';    // 'player' | 'computer'
let locked = false;     // true while animating / resolving a turn

const el = {
  opponentHand: document.getElementById('opponentHand'),
  playerHand: document.getElementById('playerHand'),
  discardPile: document.getElementById('discardPile'),
  drawPile: document.getElementById('drawPile'),
  drawCount: document.getElementById('drawCount'),
  message: document.getElementById('message'),
  suitModal: document.getElementById('suitModal'),
  rulesModal: document.getElementById('rulesModal'),
  endModal: document.getElementById('endModal'),
  endMessage: document.getElementById('endMessage')
};

function freshDeck(){
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r });
  return d;
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCard(from){
  if (deck.length === 0) reshuffleDiscardIntoDeck();
  if (deck.length === 0) return null;
  const card = deck.pop();
  from.push(card);
  return card;
}

function reshuffleDiscardIntoDeck(){
  if (discard.length <= 1) return;
  const top = discard.pop();
  deck = shuffle(discard);
  discard = [top];
}

function topCard(){ return discard[discard.length - 1]; }

function isPlayable(card){
  if (card.rank === 'A') return true;
  const top = topCard();
  const activeSuit = currentSuit || top.suit;
  return card.suit === activeSuit || card.rank === top.rank;
}

function startGame(){
  deck = shuffle(freshDeck());
  discard = [];
  playerHand = [];
  computerHand = [];
  currentSuit = null;
  pendingDraw = 0;
  turn = 'player';
  locked = false;

  for (let i = 0; i < 7; i++){
    drawCard(playerHand);
    drawCard(computerHand);
  }
  // First discard can't be an Ace or a 2 (keeps the opening simple)
  let first;
  do { first = deck.pop(); } while (first.rank === 'A' || first.rank === '2');
  discard.push(first);

  render();
  setMessage('Your move.');
}

function setMessage(msg){ el.message.textContent = msg; }

function suitColor(suit){ return RED_SUITS.includes(suit) ? 'red' : ''; }

function renderCardEl(card, { faceUp = true, playable = false } = {}){
  const div = document.createElement('div');
  if (!faceUp){
    div.className = 'mini-card';
    return div;
  }
  div.className = 'card ' + suitColor(card.suit) + (playable ? ' playable' : ' disabled');
  div.innerHTML = `
    <span class="rank">${card.rank}${card.suit}</span>
    <span class="suit-icon">${card.suit}</span>
    <span class="rank bottom">${card.rank}${card.suit}</span>
  `;
  return div;
}

function render(){
  el.opponentHand.innerHTML = '';
  computerHand.forEach(() => el.opponentHand.appendChild(renderCardEl(null, { faceUp: false })));

  el.discardPile.innerHTML = '';
  if (discard.length){
    const top = renderCardEl(topCard());
    if (currentSuit) {
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:-10px;right:-10px;background:#e8a33d;color:#1b1e29;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;';
      badge.textContent = currentSuit;
      el.discardPile.style.position = 'relative';
      el.discardPile.appendChild(top);
      el.discardPile.appendChild(badge);
    } else {
      el.discardPile.appendChild(top);
    }
  }

  el.drawCount.textContent = deck.length + ' left';

  el.playerHand.innerHTML = '';
  playerHand.forEach((card, idx) => {
    const canPlay = turn === 'player' && !locked && isPlayable(card);
    const cardEl = renderCardEl(card, { playable: canPlay });
    if (canPlay){
      cardEl.addEventListener('click', () => playCard(idx));
    }
    el.playerHand.appendChild(cardEl);
  });
}

function playCard(idx){
  if (turn !== 'player' || locked) return;
  const card = playerHand[idx];
  if (!isPlayable(card)) return;

  playerHand.splice(idx, 1);
  discard.push(card);
  currentSuit = null;

  if (checkWin('player')) return;

  if (card.rank === 'A'){
    openSuitModal((chosenSuit) => {
      currentSuit = chosenSuit;
      afterPlayerAction(card);
    });
    return;
  }

  afterPlayerAction(card);
}

function afterPlayerAction(card){
  if (card.rank === '2'){
    pendingDraw += 2;
    setMessage('You played a 2 — opponent must draw ' + pendingDraw + ' (or answer with a 2).');
    endTurn('computer');
  } else if (card.rank === '8'){
    setMessage('You played an 8 — opponent is skipped. Your move again.');
    render();
    // player goes again
  } else {
    setMessage("Opponent's turn…");
    endTurn('computer');
  }
}

function endTurn(nextTurn){
  turn = nextTurn;
  render();
  if (nextTurn === 'computer'){
    locked = true;
    setTimeout(computerTurn, 700);
  }
}

function computerTurn(){
  // Resolve a pending draw-2 penalty first
  if (pendingDraw > 0){
    const twoIdx = computerHand.findIndex(c => c.rank === '2');
    if (twoIdx !== -1){
      const card = computerHand.splice(twoIdx, 1)[0];
      discard.push(card);
      currentSuit = null;
      pendingDraw += 2;
      setMessage('Opponent stacks another 2! You must draw ' + pendingDraw + '.');
      locked = false;
      turn = 'player';
      render();
      return;
    }
    for (let i = 0; i < pendingDraw; i++) drawCard(computerHand);
    setMessage('Opponent drew ' + pendingDraw + ' cards.');
    pendingDraw = 0;
  }

  const playIdx = computerHand.findIndex(isPlayable);

  if (playIdx === -1){
    const drawn = drawCard(computerHand);
    if (drawn && isPlayable(drawn) && Math.random() > 0.3){
      resolveComputerPlay(computerHand.indexOf(drawn));
      return;
    }
    setMessage('Opponent drew a card. Your move.');
    locked = false;
    turn = 'player';
    render();
    return;
  }

  resolveComputerPlay(playIdx);
}

function resolveComputerPlay(idx){
  const card = computerHand.splice(idx, 1)[0];
  discard.push(card);
  currentSuit = null;

  if (checkWin('computer')) return;

  if (card.rank === 'A'){
    currentSuit = chooseBestSuitFor(computerHand);
  }

  if (card.rank === '2'){
    pendingDraw += 2;
    setMessage('Opponent played a 2 — you must draw ' + pendingDraw + ' (or answer with a 2).');
    locked = false;
    turn = 'player';
    render();
    return;
  }

  if (card.rank === '8'){
    setMessage('Opponent played an 8 — you are skipped.');
    setTimeout(computerTurn, 700);
    render();
    return;
  }

  setMessage('Opponent played ' + card.rank + card.suit + '. Your move.');
  locked = false;
  turn = 'player';
  render();
}

function chooseBestSuitFor(hand){
  const counts = {};
  SUITS.forEach(s => counts[s] = 0);
  hand.forEach(c => { if (c.rank !== 'A') counts[c.suit]++; });
  return Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
}

function checkWin(who){
  if (who === 'player' && playerHand.length === 0){
    endGame('You win! 🎉');
    return true;
  }
  if (who === 'computer' && computerHand.length === 0){
    endGame('Opponent wins. Try again?');
    return true;
  }
  return false;
}

function endGame(msg){
  render();
  el.endMessage.textContent = msg;
  el.endModal.hidden = false;
}

function openSuitModal(callback){
  el.suitModal.hidden = false;
  const handler = (e) => {
    const btn = e.target.closest('button[data-suit]');
    if (!btn) return;
    el.suitModal.hidden = true;
    el.suitModal.removeEventListener('click', handler);
    callback(btn.dataset.suit);
  };
  el.suitModal.addEventListener('click', handler);
}

// ---- Player draw pile interaction ----
function playerDraw(){
  if (turn !== 'player' || locked) return;

  if (pendingDraw > 0){
    const twoIdx = playerHand.findIndex(c => c.rank === '2');
    if (twoIdx !== -1){
      setMessage('You have a 2 — you may stack it instead of drawing.');
      return;
    }
    for (let i = 0; i < pendingDraw; i++) drawCard(playerHand);
    setMessage('You drew ' + pendingDraw + ' cards.');
    pendingDraw = 0;
    render();
    endTurn('computer');
    return;
  }

  const drawn = drawCard(playerHand);
  render();
  if (drawn && isPlayable(drawn)){
    setMessage('You drew ' + drawn.rank + drawn.suit + ' — you may play it now.');
  } else {
    setMessage('No playable card — drew and passed.');
    endTurn('computer');
  }
}

el.drawPile.addEventListener('click', playerDraw);
el.drawPile.addEventListener('keypress', (e) => { if (e.key === 'Enter') playerDraw(); });

document.getElementById('rulesBtn').addEventListener('click', () => { el.rulesModal.hidden = false; });
document.getElementById('closeRules').addEventListener('click', () => { el.rulesModal.hidden = true; });
document.getElementById('playAgain').addEventListener('click', () => { el.endModal.hidden = true; startGame(); });

startGame();
