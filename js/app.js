// ---- Game registry: add new games here, nothing else needs to change ----
const GAMES = [
  {
    id: 'karachi',
    name: 'Karachi',
    blurb: 'Classic card shedding game',
    suit: '♥',
    suitClass: 'red',
    corner: 'K',
    url: 'games/karachi/index.html'
  },
  {
    id: 'bible-trivia',
    name: 'Bible Trivia',
    blurb: 'Test your scripture knowledge',
    suit: '✦',
    suitClass: 'gold',
    corner: 'B',
    url: 'games/bible-trivia/index.html'
  }
];

const hand = document.getElementById('hand');

function renderHand(){
  const n = GAMES.length;
  const spread = Math.min(14, 34 - n * 4); // degrees between cards
  const mid = (n - 1) / 2;

  GAMES.forEach((game, i) => {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.url;
    const rot = (i - mid) * spread;
    const shift = (i - mid) * 46;
    card.style.setProperty('--rot', rot + 'deg');
    card.style.setProperty('--shift', shift + 'px');
    card.style.zIndex = i;

    card.innerHTML = `
      <span class="corner">${game.corner}</span>
      <span class="suit ${game.suitClass}">${game.suit}</span>
      <div>
        <div class="name">${game.name}</div>
        <div class="blurb">${game.blurb}</div>
      </div>
    `;
    hand.appendChild(card);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => hand.classList.add('dealt'));
  });
}

renderHand();

// ---- Online/offline status ----
const statusEl = document.getElementById('netStatus');
function updateStatus(){
  if (navigator.onLine){
    statusEl.textContent = 'Online';
    statusEl.className = 'status online';
  } else {
    statusEl.textContent = 'Offline — everything still works';
    statusEl.className = 'status offline';
  }
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// ---- Install prompt ----
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// ---- Service worker registration ----
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  });
}
