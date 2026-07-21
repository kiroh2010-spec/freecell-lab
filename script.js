const suits = [
  { symbol: '♠', color: 'black', key: 'S' },
  { symbol: '♥', color: 'red', key: 'H' },
  { symbol: '♦', color: 'red', key: 'D' },
  { symbol: '♣', color: 'black', key: 'C' },
];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const state = {
  freecells: [null, null, null, null],
  foundations: { S: [], H: [], D: [], C: [] },
  tableau: Array.from({ length: 8 }, () => []),
  selected: null,
  dragging: null,
  soundEnabled: true,
  won: false,
  moves: 0,
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const moveCountEl = $('moveCount');
const soundBtn = $('soundBtn');
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

  shuffle(makeDeck()).forEach((card, index) => {
    state.tableau[index % 8].push(card);
  });
  setStatus('카드를 선택한 뒤 이동할 칸을 누르세요. 빈 칸에는 어떤 카드든 이동할 수 있습니다.');
  render();
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

  moveCountEl.textContent = `Moves: ${state.moves}`;
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
  if (isSameLocation(state.selected, location)) el.classList.add('selected');
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
  if (!['tableau', 'freecell'].includes(location.type) || !canSelect(location)) {
    setStatus('Tableau 또는 Free Cell의 이동 가능한 카드를 더블클릭하면 Foundation으로 보낼 수 있어요.');
    playSound('invalid');
    return;
  }

  const card = getCard(location);
  const target = { type: 'foundation', suit: card.suit };
  if (!canMoveTo(card, target)) {
    setStatus(`${card.rank}${card.symbol}는 아직 Foundation으로 이동할 수 없습니다.`);
    playSound('invalid');
    return;
  }

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
    setStatus('지금 초안에서는 각 줄의 맨 아래 카드만 움직일 수 있어요.');
    playSound('invalid');
    return;
  }

  state.selected = isSameLocation(state.selected, location) ? null : location;
  const card = getCard(location);
  setStatus(state.selected ? `${card.rank}${card.symbol} 선택됨. 이동할 위치를 누르세요.` : '선택을 해제했습니다.');
  render();
}

function handleTarget(target) {
  if (!state.selected) {
    setStatus('먼저 이동할 카드를 선택하세요.');
    playSound('invalid');
    return false;
  }
  if (isSameLocation(state.selected, target)) return false;

  const moving = getCard(state.selected);
  if (!moving) return false;

  if (!canMoveTo(moving, target)) {
    setStatus(`${moving.rank}${moving.symbol}는 그 위치로 이동할 수 없습니다.`);
    playSound('invalid');
    return false;
  }

  removeCard(state.selected);
  addCard(target, moving);
  state.selected = null;
  state.dragging = null;
  state.moves += 1;
  setStatus(`${moving.rank}${moving.symbol} 이동 완료.`);
  playSound(target.type === 'foundation' ? 'foundation' : 'move');
  render();
  return true;
}

function canSelect(location) {
  if (!location) return false;
  if (location.type === 'foundation') return false;
  if (location.type === 'freecell') return Boolean(state.freecells[location.index]);
  if (location.type === 'tableau') return location.cardIndex === state.tableau[location.index].length - 1;
  return false;
}

function normalizeDropTarget(location) {
  if (location.type === 'tableau') return { type: 'tableau', index: location.index };
  if (location.type === 'foundation') return { type: 'foundation', suit: location.suit };
  return location;
}

function wireDropTarget(el, target) {
  el.addEventListener('dragover', (event) => {
    if (!state.dragging) return;
    const card = getCard(state.dragging);
    if (card && canMoveTo(card, target)) {
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
  if (target.type === 'freecell') return state.freecells[target.index] === null;

  if (target.type === 'foundation') {
    if (target.suit !== card.suit) return false;
    const pile = state.foundations[target.suit];
    return pile.length === 0 ? card.value === 1 : card.value === pile[pile.length - 1].value + 1;
  }

  if (target.type === 'tableau') {
    const column = state.tableau[target.index];
    if (column.length === 0) return true;
    const top = column[column.length - 1];
    return top.color !== card.color && top.value === card.value + 1;
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
  if (location.type === 'freecell') state.freecells[location.index] = null;
  if (location.type === 'tableau') state.tableau[location.index].pop();
}

function addCard(location, card) {
  if (location.type === 'freecell') state.freecells[location.index] = card;
  if (location.type === 'foundation') state.foundations[location.suit].push(card);
  if (location.type === 'tableau') state.tableau[location.index].push(card);
}

function isSameLocation(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'freecell') return a.index === b.index;
  if (a.type === 'foundation') return a.suit === b.suit;
  if (a.type === 'tableau') return a.index === b.index && a.cardIndex === b.cardIndex;
  return false;
}

function autoMoveAces() {
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
    statusEl.textContent = `승리! ${state.moves}수 만에 클리어했습니다.`;
    if (!state.won) {
      state.won = true;
      playSound('win');
    }
  } else {
    statusEl.classList.remove('win');
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

$('newGameBtn').addEventListener('click', newGame);
$('autoBtn').addEventListener('click', autoMoveAces);
soundBtn.addEventListener('click', toggleSound);
tutorialBtn.addEventListener('click', () => toggleTutorial());
tutorialCloseBtn.addEventListener('click', () => toggleTutorial(false));
newGame();
