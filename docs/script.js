const suits = [
  { symbol: '♠', color: 'black', key: 'S' },
  { symbol: '♥', color: 'red', key: 'H' },
  { symbol: '♦', color: 'red', key: 'D' },
  { symbol: '♣', color: 'black', key: 'C' },
];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const STORAGE_KEYS = {
  player: 'freecell.player.v1',
  rankings: 'freecell.weeklyRankings.v1',
};

const state = {
  freecells: [null, null, null, null],
  foundations: { S: [], H: [], D: [], C: [] },
  tableau: Array.from({ length: 8 }, () => []),
  selected: null,
  dragging: null,
  soundEnabled: true,
  won: false,
  moves: 0,
  elapsedSeconds: 0,
  timerStarted: false,
  timerId: null,
  scoreSaved: false,
  player: null,
  undoStack: [],
  undoLeft: 5,
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const moveHud = $('moveHud');
const timerDisplay = $('timerDisplay');
const undoHud = $('undoHud');
const playerIdEl = $('playerId');
const playerRankEl = $('playerRank');
const rankingResetText = $('rankingResetText');
const rankingList = $('rankingList');
const soundBtn = $('soundBtn');
const undoBtn = $('undoBtn');
const tutorialBtn = $('tutorialBtn');
const tutorialCloseBtn = $('tutorialCloseBtn');
const tutorialPanel = $('tutorialPanel');
let audioContext = null;

function makeDeck() {
  return suits.flatMap(suit => ranks.map((rank, index) => ({
    id: `${rank}${suit.key}`,
    rank,
    value: index + 1,
    suit: suit.key,
    symbol: suit.symbol,
    color: suit.color,
  })));
}

function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newGame() {
  state.freecells = [null, null, null, null];
  state.foundations = { S: [], H: [], D: [], C: [] };
  state.tableau = Array.from({ length: 8 }, () => []);
  state.selected = null;
  state.dragging = null;
  state.won = false;
  state.moves = 0;
  state.elapsedSeconds = 0;
  state.timerStarted = false;
  state.scoreSaved = false;
  stopTimer();
  state.undoStack = [];
  state.undoLeft = 5;

  shuffle(makeDeck()).forEach((card, index) => {
    state.tableau[index % 8].push(card);
  });
  ensureOpeningFoundationMove();
  setStatus('바로 Foundation에 보낼 수 있는 A 카드가 준비됐습니다.');
  render();
}

function ensureOpeningFoundationMove() {
  const targetColumnIndex = Math.floor(Math.random() * state.tableau.length);
  const aceLocation = findFirstAceLocation();
  if (!aceLocation) return;

  const targetColumn = state.tableau[targetColumnIndex];
  const targetCardIndex = targetColumn.length - 1;
  const targetCard = targetColumn[targetCardIndex];

  state.tableau[targetColumnIndex][targetCardIndex] = state.tableau[aceLocation.columnIndex][aceLocation.cardIndex];
  state.tableau[aceLocation.columnIndex][aceLocation.cardIndex] = targetCard;
}

function findFirstAceLocation() {
  for (let columnIndex = 0; columnIndex < state.tableau.length; columnIndex += 1) {
    const cardIndex = state.tableau[columnIndex].findIndex(card => card.value === 1);
    if (cardIndex !== -1) return { columnIndex, cardIndex };
  }
  return null;
}

function render() {
  freecellsEl.innerHTML = '';
  foundationsEl.innerHTML = '';
  tableauEl.innerHTML = '';

  state.freecells.forEach((card, index) => {
    const target = { type: 'freecell', index };
    const slot = slotEl(`F${index + 1}`, () => handleTarget(target));
    wireDropTarget(slot, target);
    if (card) slot.appendChild(cardEl(card, { type: 'freecell', index }));
    freecellsEl.appendChild(slot);
  });

  suits.forEach(suit => {
    const target = { type: 'foundation', suit: suit.key };
    const slot = slotEl(suit.symbol, () => handleTarget(target));
    slot.classList.add('foundation-slot');
    wireDropTarget(slot, target);
    const pile = state.foundations[suit.key];
    if (pile.length) slot.appendChild(foundationPileEl(pile, suit.key));
    foundationsEl.appendChild(slot);
  });

  state.tableau.forEach((column, colIndex) => {
    const col = document.createElement('div');
    col.className = 'column';
    const columnTarget = { type: 'tableau', index: colIndex };
    col.addEventListener('click', (event) => {
      if (event.target === col) handleTarget(columnTarget);
    });
    wireDropTarget(col, columnTarget);
    column.forEach((card, cardIndex) => {
      col.appendChild(cardEl(card, { type: 'tableau', index: colIndex, cardIndex }));
    });
    tableauEl.appendChild(col);
  });

  moveHud.textContent = state.moves;
  undoHud.textContent = state.undoLeft;
  timerDisplay.textContent = formatTime(state.elapsedSeconds);
  undoBtn.textContent = `무르기 ${state.undoLeft}`;
  undoBtn.disabled = state.undoLeft <= 0 || state.undoStack.length === 0;
  checkWin();
}


function foundationPileEl(pile, suitKey) {
  const stack = document.createElement('div');
  stack.className = 'foundation-stack';
  const previewCount = Math.min(pile.length, 5);
  const start = pile.length - previewCount;
  pile.slice(start).forEach((card, offset) => {
    const layer = cardEl(card, { type: 'foundation', suit: suitKey });
    layer.classList.add('foundation-layer');
    layer.style.setProperty('--stack-offset', offset);
    layer.style.setProperty('--stack-size', previewCount);
    stack.appendChild(layer);
  });

  return stack;
}

function slotEl(label, onClick) {
  const el = document.createElement('div');
  el.className = 'slot';
  el.dataset.label = label;
  el.addEventListener('click', onClick);
  return el;
}

function cardEl(card, location) {
  const el = document.createElement('div');
  el.className = `card ${card.color === 'red' ? 'red' : ''}`;
  if (isInSelectedSequence(location)) el.classList.add('selected');
  if (isSameLocation(state.dragging, location)) el.classList.add('dragging');
  if (canSelect(location)) el.classList.add('movable');
  el.innerHTML = `<span class="corner"><span>${card.rank}</span><span>${card.symbol}</span></span><span class="center-suit">${card.symbol}</span>`;
  el.title = `${card.rank}${card.symbol}`;
  el.draggable = canSelect(location);
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    handleCardClick(location);
  });
  el.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleCardDoubleClick(location);
  });
  el.addEventListener('dragstart', (event) => {
    if (!canSelect(location)) {
      event.preventDefault();
      return;
    }
    state.selected = location;
    state.dragging = location;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(location));
    event.dataTransfer.setData('text/plain', JSON.stringify(location));
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => {
    state.dragging = null;
    render();
  });
  wireDropTarget(el, normalizeDropTarget(location));
  return el;
}

function handleCardDoubleClick(location) {
  const isBottomTableauCard = location.type === 'tableau' && location.cardIndex === state.tableau[location.index].length - 1;
  const isFreecellCard = location.type === 'freecell' && canSelect(location);
  if (!isBottomTableauCard && !isFreecellCard) {
    setStatus('Tableau 맨 아래 카드 또는 Free Cell 카드만 더블클릭으로 Foundation에 보낼 수 있어요.');
    playSound('invalid');
    return;
  }

  startTimer();
  const card = getCard(location);
  const target = { type: 'foundation', suit: card.suit };
  if (!canMoveTo(card, target)) {
    setStatus(`${card.rank}${card.symbol}는 아직 Foundation으로 이동할 수 없습니다.`);
    playSound('invalid');
    return;
  }

  saveUndoState();
  removeCard(location);
  addCard(target, card);
  state.selected = null;
  state.dragging = null;
  state.moves += 1;
  setStatus(`${card.rank}${card.symbol}를 Foundation으로 이동했습니다.`);
  playSound('foundation');
  render();
}

function handleCardClick(location) {
  if (state.selected && !isSameLocation(state.selected, location)) {
    const targetCard = getCard(location);
    if (targetCard && handleTarget(location)) return;
  }

  if (!canSelect(location)) {
    setStatus('색이 번갈아 내려가는 연속 묶음만 선택할 수 있어요.');
    playSound('invalid');
    return;
  }

  startTimer();
  state.selected = isSameLocation(state.selected, location) ? null : location;
  const cards = getMovingCards(location);
  const label = cards.length > 1 ? `${cards[0].rank}${cards[0].symbol}부터 ${cards.length}장` : `${cards[0].rank}${cards[0].symbol}`;
  setStatus(state.selected ? `${label} 선택됨. 이동할 위치를 누르세요.` : '선택을 해제했습니다.');
  render();
}

function handleTarget(target) {
  if (!state.selected) {
    setStatus('먼저 이동할 카드를 선택하세요.');
    playSound('invalid');
    return false;
  }
  if (isSameLocation(state.selected, target)) return false;

  const movingCards = getMovingCards(state.selected);
  if (!movingCards.length) return false;
  startTimer();

  if (!canMoveCardsTo(movingCards, target)) {
    const first = movingCards[0];
    const label = movingCards.length > 1 ? `${first.rank}${first.symbol}부터 ${movingCards.length}장` : `${first.rank}${first.symbol}`;
    setStatus(`${label}은 그 위치로 이동할 수 없습니다.`);
    playSound('invalid');
    return false;
  }

  saveUndoState();
  removeCards(state.selected, movingCards.length);
  addCards(target, movingCards);
  state.selected = null;
  state.dragging = null;
  state.moves += 1;
  const first = movingCards[0];
  const label = movingCards.length > 1 ? `${first.rank}${first.symbol}부터 ${movingCards.length}장` : `${first.rank}${first.symbol}`;
  setStatus(`${label} 이동 완료.`);
  playSound(target.type === 'foundation' ? 'foundation' : 'move');
  render();
  return true;
}

function canSelect(location) {
  if (!location) return false;
  if (location.type === 'foundation') return false;
  if (location.type === 'freecell') return Boolean(state.freecells[location.index]);
  if (location.type === 'tableau') return isValidTableauSequence(location);
  return false;
}

function isValidTableauSequence(location) {
  const column = state.tableau[location.index];
  if (!column || location.cardIndex < 0 || location.cardIndex >= column.length) return false;
  for (let index = location.cardIndex; index < column.length - 1; index += 1) {
    const upper = column[index];
    const lower = column[index + 1];
    if (upper.color === lower.color || upper.value !== lower.value + 1) return false;
  }
  return true;
}

function getMovingCards(location) {
  if (!location) return [];
  if (location.type === 'tableau') {
    return state.tableau[location.index].slice(location.cardIndex);
  }
  const card = getCard(location);
  return card ? [card] : [];
}

function isInSelectedSequence(location) {
  if (!state.selected || !location) return false;
  if (state.selected.type === 'tableau' && location.type === 'tableau') {
    return state.selected.index === location.index && location.cardIndex >= state.selected.cardIndex;
  }
  return isSameLocation(state.selected, location);
}

function normalizeDropTarget(location) {
  if (location.type === 'tableau') return { type: 'tableau', index: location.index };
  if (location.type === 'foundation') return { type: 'foundation', suit: location.suit };
  return location;
}

function wireDropTarget(el, target) {
  el.addEventListener('dragover', (event) => {
    if (!state.dragging) return;
    const cards = getMovingCards(state.dragging);
    if (cards.length && canMoveCardsTo(cards, target)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      el.classList.add('drop-ok');
    }
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-ok'));
  el.addEventListener('drop', (event) => {
    if (!state.dragging) return;
    event.preventDefault();
    el.classList.remove('drop-ok');
    handleTarget(target);
  });
}

function canMoveTo(card, target) {
  return canMoveCardsTo([card], target);
}

function canMoveCardsTo(cards, target) {
  if (!cards.length) return false;
  const first = cards[0];
  const normalizedTarget = normalizeDropTarget(target);

  if (normalizedTarget.type === 'freecell') {
    return cards.length === 1 && state.freecells[normalizedTarget.index] === null;
  }

  if (normalizedTarget.type === 'foundation') {
    if (cards.length !== 1) return false;
    if (normalizedTarget.suit !== first.suit) return false;
    const pile = state.foundations[normalizedTarget.suit];
    return pile.length === 0 ? first.value === 1 : first.value === pile[pile.length - 1].value + 1;
  }

  if (normalizedTarget.type === 'tableau') {
    const column = state.tableau[normalizedTarget.index];
    if (state.selected?.type === 'tableau' && state.selected.index === normalizedTarget.index) return false;
    if (column.length === 0) return true;
    const top = column[column.length - 1];
    return top.color !== first.color && top.value === first.value + 1;
  }

  return false;
}

function getCard(location) {
  if (!location) return null;
  if (location.type === 'freecell') return state.freecells[location.index];
  if (location.type === 'foundation') {
    const pile = state.foundations[location.suit];
    return pile[pile.length - 1] ?? null;
  }
  if (location.type === 'tableau') return state.tableau[location.index][location.cardIndex];
  return null;
}

function removeCard(location) {
  removeCards(location, 1);
}

function removeCards(location, count) {
  if (location.type === 'freecell') state.freecells[location.index] = null;
  if (location.type === 'tableau') state.tableau[location.index].splice(location.cardIndex, count);
}

function addCard(location, card) {
  addCards(location, [card]);
}

function addCards(location, cards) {
  const normalizedLocation = normalizeDropTarget(location);
  if (normalizedLocation.type === 'freecell') state.freecells[normalizedLocation.index] = cards[0];
  if (normalizedLocation.type === 'foundation') state.foundations[normalizedLocation.suit].push(cards[0]);
  if (normalizedLocation.type === 'tableau') state.tableau[normalizedLocation.index].push(...cards);
}

function isSameLocation(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'freecell') return a.index === b.index;
  if (a.type === 'foundation') return a.suit === b.suit;
  if (a.type === 'tableau') return a.index === b.index && a.cardIndex === b.cardIndex;
  return false;
}

function autoMoveAces() {
  startTimer();
  const beforeAuto = snapshotState();
  let moved = 0;
  let didMove = true;
  while (didMove) {
    didMove = false;
    const sources = [];
    state.freecells.forEach((card, index) => card && sources.push({ card, loc: { type: 'freecell', index } }));
    state.tableau.forEach((column, index) => {
      const card = column[column.length - 1];
      if (card) sources.push({ card, loc: { type: 'tableau', index, cardIndex: column.length - 1 } });
    });

    for (const { card, loc } of sources) {
      const target = { type: 'foundation', suit: card.suit };
      if (canMoveTo(card, target)) {
        removeCard(loc);
        addCard(target, card);
        moved += 1;
        didMove = true;
        break;
      }
    }
  }
  if (moved) {
    saveUndoSnapshot(beforeAuto);
    state.moves += moved;
    state.selected = null;
    state.dragging = null;
    setStatus(`Foundation으로 ${moved}장 자동 이동했습니다.`);
    playSound('foundation');
  } else {
    setStatus('지금 자동 이동 가능한 카드가 없습니다.');
    playSound('invalid');
  }
  render();
}





function initPlayer() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.player));
  if (saved?.id && saved?.password) {
    state.player = saved;
  } else {
    state.player = {
      id: `FC-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
      password: Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));
  }
  playerIdEl.textContent = state.player.id;
}

function startTimer() {
  if (state.won || state.timerStarted) return;
  state.timerStarted = true;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    timerDisplay.textContent = formatTime(state.elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

function getNextResetDate(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday + 7);
  return d;
}

function loadRankingData() {
  const weekKey = getWeekKey();
  const data = safeJsonParse(localStorage.getItem(STORAGE_KEYS.rankings)) || {};
  if (data.weekKey !== weekKey) {
    return { weekKey, entries: [] };
  }
  return { weekKey, entries: Array.isArray(data.entries) ? data.entries : [] };
}

function saveRankingData(data) {
  localStorage.setItem(STORAGE_KEYS.rankings, JSON.stringify(data));
}

function recordWeeklyScore() {
  if (state.scoreSaved || !state.player) return;
  state.scoreSaved = true;
  const data = loadRankingData();
  data.entries.push({
    id: state.player.id,
    time: state.elapsedSeconds,
    moves: state.moves,
    completedAt: new Date().toISOString(),
  });
  data.entries.sort((a, b) => a.time - b.time || a.moves - b.moves);
  data.entries = data.entries.slice(0, 20);
  saveRankingData(data);
  renderRankings();
}

function renderRankings() {
  const data = loadRankingData();
  const reset = getNextResetDate();
  rankingResetText.textContent = `초기화 예정: ${reset.getFullYear()}-${String(reset.getMonth() + 1).padStart(2, '0')}-${String(reset.getDate()).padStart(2, '0')} 00:00`;
  const myRankIndex = state.player ? data.entries.findIndex(entry => entry.id === state.player.id) : -1;
  playerRankEl.textContent = myRankIndex === -1 ? 'MY -' : `MY ${myRankIndex + 1}위`;

  if (!data.entries.length) {
    rankingList.innerHTML = '';
    return;
  }

  rankingList.innerHTML = data.entries.slice(0, 5).map((entry, index) => `
    <li>
      <strong>${index + 1}. ${entry.id}</strong>
      <span>${formatTime(entry.time)} · ${entry.moves}수</span>
    </li>
  `).join('');
}

function safeJsonParse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function snapshotState() {
  return JSON.parse(JSON.stringify({
    freecells: state.freecells,
    foundations: state.foundations,
    tableau: state.tableau,
    moves: state.moves,
    elapsedSeconds: state.elapsedSeconds,
    timerStarted: state.timerStarted,
    won: state.won,
  }));
}

function saveUndoState() {
  saveUndoSnapshot(snapshotState());
}

function saveUndoSnapshot(snapshot) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 20) state.undoStack.shift();
}

function undoMove() {
  if (state.undoLeft <= 0) {
    setStatus('이번 게임의 무르기 5회를 모두 사용했습니다.');
    playSound('invalid');
    return;
  }
  const previous = state.undoStack.pop();
  if (!previous) {
    setStatus('되돌릴 이동이 없습니다.');
    playSound('invalid');
    return;
  }
  state.freecells = previous.freecells;
  state.foundations = previous.foundations;
  state.tableau = previous.tableau;
  state.moves = previous.moves;
  state.elapsedSeconds = previous.elapsedSeconds;
  state.timerStarted = previous.timerStarted;
  state.won = previous.won;
  if (!state.timerStarted) stopTimer();
  if (state.timerStarted && !state.timerId) {
    state.timerId = window.setInterval(() => {
      state.elapsedSeconds += 1;
      timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }, 1000);
  }
  state.selected = null;
  state.dragging = null;
  state.undoLeft -= 1;
  setStatus(`무르기 완료. 남은 무르기 ${state.undoLeft}회.`);
  playSound('move');
  render();
}

function toggleTutorial(forceOpen = null) {
  const shouldOpen = forceOpen ?? tutorialPanel.hidden;
  tutorialPanel.hidden = !shouldOpen;
  tutorialBtn.setAttribute('aria-expanded', String(shouldOpen));
  tutorialBtn.textContent = shouldOpen ? '게임 방법 닫기' : '게임 방법';
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundBtn.textContent = state.soundEnabled ? '소리 켜짐' : '소리 꺼짐';
  soundBtn.setAttribute('aria-pressed', String(state.soundEnabled));
  setStatus(state.soundEnabled ? '이동 사운드를 켰습니다.' : '이동 사운드를 껐습니다.');
  if (state.soundEnabled) playSound('move');
}

function playSound(kind) {
  if (!state.soundEnabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    audioContext = audioContext || new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const osc = audioContext.createOscillator();
    const settings = {
      move: { type: 'triangle', start: 520, end: 720, volume: 0.045, length: 0.07 },
      foundation: { type: 'sine', start: 660, end: 990, volume: 0.055, length: 0.11 },
      invalid: { type: 'sawtooth', start: 180, end: 120, volume: 0.035, length: 0.08 },
      win: { type: 'sine', start: 660, end: 1320, volume: 0.06, length: 0.22 },
    }[kind] || { type: 'triangle', start: 520, end: 720, volume: 0.04, length: 0.07 };

    osc.type = settings.type;
    osc.frequency.setValueAtTime(settings.start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, settings.end), now + settings.length);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.length);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + settings.length + 0.02);
  } catch (error) {
    state.soundEnabled = false;
    soundBtn.textContent = '소리 꺼짐';
    soundBtn.setAttribute('aria-pressed', 'false');
  }
}

function checkWin() {
  const total = Object.values(state.foundations).reduce((sum, pile) => sum + pile.length, 0);
  if (total === 52) {
    statusEl.classList.add('win');
    statusEl.textContent = `승리! ${formatTime(state.elapsedSeconds)} · ${state.moves}수 만에 클리어했습니다.`;
    if (!state.won) {
      state.won = true;
      stopTimer();
      recordWeeklyScore();
      playSound('win');
    }
  } else {
    statusEl.classList.remove('win');
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

initPlayer();
renderRankings();

$('newGameBtn').addEventListener('click', newGame);
$('autoBtn').addEventListener('click', autoMoveAces);
undoBtn.addEventListener('click', undoMove);
soundBtn.addEventListener('click', toggleSound);
tutorialBtn.addEventListener('click', () => toggleTutorial());
tutorialCloseBtn.addEventListener('click', () => toggleTutorial(false));
newGame();
