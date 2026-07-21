const suits = [
  { symbol: '♠', color: 'black', key: 'S' },
  { symbol: '♥', color: 'red', key: 'H' },
  { symbol: '♦', color: 'red', key: 'D' },
  { symbol: '♣', color: 'black', key: 'C' },
];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const DIFFICULTY_TIERS = [
  { code: 'e1', label: 'Easy 1', requiredClears: 0, multiplier: 1.00, totalMax: 6, minLow: 3, minMovable: 4 },
  { code: 'e2', label: 'Easy 2', requiredClears: 3, multiplier: 1.05, totalMax: 12, minLow: 2, minMovable: 3 },
  { code: 'n1', label: 'Normal 1', requiredClears: 6, multiplier: 1.15, totalMin: 6, totalMax: 18, minLow: 2, minMovable: 3 },
  { code: 'n2', label: 'Normal 2', requiredClears: 10, multiplier: 1.25, totalMin: 10, totalMax: 24, minLow: 1, minMovable: 2 },
  { code: 'n3', label: 'Normal 3', requiredClears: 15, multiplier: 1.40, totalMin: 16, totalMax: 32, minLow: 1, minMovable: 2 },
];


const STORAGE_KEYS = {
  player: 'freecell.player.v1',
  rankings: 'freecell.weeklyRankings.v1',
  game: 'freecell.currentGame.v1',
  stats: 'freecell.stats.v1',
  profiles: 'freecell.profiles.v1',
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
  passwordVisible: false,
  isEditingPlayer: false,
  undoStack: [],
  undoLeft: 5,
  gameMode: 'normal',
  difficultyCode: 'e1',
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const moveHud = $('moveHud');
const timerDisplay = $('timerDisplay');
const undoHud = $('undoHud');
const versionLabel = $('versionLabel');
const playerIdEl = $('playerId');
const playerPasswordEl = $('playerPassword');
const passwordToggleBtn = $('passwordToggleBtn');
const playerRankEl = $('playerRank');
const rankingResetText = $('rankingResetText');
const rankingList = $('rankingList');
const soundBtn = $('soundBtn');
const undoBtn = $('undoBtn');
const tutorialBtn = $('tutorialBtn');
const tutorialCloseBtn = $('tutorialCloseBtn');
const tutorialPanel = $('tutorialPanel');
const signupPanel = $('signupPanel');
const signupForm = $('signupForm');
const signupIdInput = $('signupId');
const signupPasswordInput = $('signupPassword');
const signupCancelBtn = $('signupCancelBtn');
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

function newGame({ clearSaved = true, mode = 'normal', difficultyCode = null } = {}) {
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
  state.gameMode = mode;
  state.difficultyCode = difficultyCode || getActiveDifficultyCode();
  if (clearSaved) localStorage.removeItem(STORAGE_KEYS.game);

  const dealScore = dealGame(state.difficultyCode);
  const tier = getDifficultyTier(state.difficultyCode);
  setStatus(mode === 'promotion'
    ? `승급전 시작! ${tier.label} 난이도에 도전합니다. 클리어하면 승급하고 점수 배수가 올라갑니다.`
    : `${tier.label} 난이도입니다. 바로 Foundation에 보낼 수 있는 A 카드가 준비됐습니다.`);
  render();
}


function dealGame(difficultyCode = 'e1') {
  const tier = getDifficultyTier(difficultyCode);
  const isHarderTier = difficultyCode.startsWith('n');
  const maxAttempts = isHarderTier ? 180 : 120;
  let bestDeal = null;
  let bestScore = isHarderTier ? -Infinity : Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = Array.from({ length: 8 }, () => []);
    shuffle(makeDeck()).forEach((card, index) => {
      candidate[index % 8].push(card);
    });
    ensureOpeningFoundationMove(candidate);
    const score = evaluateDeal(candidate);

    if (isDealInDifficulty(score, tier)) {
      state.tableau = candidate;
      return score;
    }

    if (isHarderTier) {
      if (score.total > bestScore) {
        bestScore = score.total;
        bestDeal = candidate;
      }
    } else if (score.total < bestScore) {
      bestScore = score.total;
      bestDeal = candidate;
    }
  }

  state.tableau = bestDeal || state.tableau;
  ensureOpeningFoundationMove(state.tableau);
  return evaluateDeal(state.tableau);
}

function evaluateDeal(tableau) {
  const topCards = tableau.map(column => column[column.length - 1]).filter(Boolean);
  const topAces = topCards.filter(card => card.value === 1).length;
  const topLowCards = topCards.filter(card => card.value <= 3).length;
  const movableTopCards = topCards.reduce((count, card, index) => {
    return count + (tableau.some((column, targetIndex) => {
      if (targetIndex === index || !column.length) return false;
      const top = column[column.length - 1];
      return top.color !== card.color && top.value === card.value + 1;
    }) ? 1 : 0);
  }, 0);
  const lowCardDepth = tableau.reduce((sum, column) => {
    return sum + column.reduce((depthSum, card, index) => {
      return depthSum + (card.value <= 3 ? column.length - 1 - index : 0);
    }, 0);
  }, 0);
  const blockedAces = tableau.reduce((sum, column) => {
    const aceIndex = column.findIndex(card => card.value === 1);
    return sum + (aceIndex === -1 ? 0 : column.length - 1 - aceIndex);
  }, 0);
  const total = lowCardDepth + blockedAces * 2 - topAces * 6 - topLowCards * 2 - movableTopCards;
  return { total, topAces, topLowCards, movableTopCards, lowCardDepth, blockedAces };
}

function isDealInDifficulty(score, tier) {
  const totalMin = tier.totalMin ?? -Infinity;
  const totalMax = tier.totalMax ?? Infinity;
  return score.topAces >= 1 &&
    score.topLowCards >= tier.minLow &&
    score.movableTopCards >= tier.minMovable &&
    score.total >= totalMin &&
    score.total <= totalMax;
}

function getDifficultyTier(code) {
  return DIFFICULTY_TIERS.find(tier => tier.code === code) || DIFFICULTY_TIERS[0];
}

function getDifficultyTierIndex(code) {
  const index = DIFFICULTY_TIERS.findIndex(tier => tier.code === code);
  return index === -1 ? 0 : index;
}

function getActiveDifficultyCode() {
  const stats = loadStats();
  return DIFFICULTY_TIERS[stats.difficultyIndex]?.code || DIFFICULTY_TIERS[0].code;
}

function getPromotionTarget(stats = loadStats()) {
  const nextTier = DIFFICULTY_TIERS[stats.difficultyIndex + 1];
  if (!nextTier) return null;
  return stats.clears >= nextTier.requiredClears ? nextTier : null;
}

function getScoreMultiplier(code, mode = 'normal') {
  const tier = getDifficultyTier(code);
  return tier.multiplier + (mode === 'promotion' ? 0.10 : 0);
}

function renderVersionLabel() {
  if (!versionLabel) return;
  const prefix = state.gameMode === 'promotion' ? 'p' : '';
  versionLabel.textContent = `초안 v0.8${prefix}${state.difficultyCode}`;
}

function ensureOpeningFoundationMove(tableau = state.tableau) {
  const targetColumnIndex = Math.floor(Math.random() * tableau.length);
  const aceLocation = findFirstAceLocation(tableau);
  if (!aceLocation) return;

  const targetColumn = tableau[targetColumnIndex];
  const targetCardIndex = targetColumn.length - 1;
  const targetCard = targetColumn[targetCardIndex];

  tableau[targetColumnIndex][targetCardIndex] = tableau[aceLocation.columnIndex][aceLocation.cardIndex];
  tableau[aceLocation.columnIndex][aceLocation.cardIndex] = targetCard;
}

function findFirstAceLocation(tableau = state.tableau) {
  for (let columnIndex = 0; columnIndex < tableau.length; columnIndex += 1) {
    const cardIndex = tableau[columnIndex].findIndex(card => card.value === 1);
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
    if (isTableauHintTarget(columnTarget)) col.classList.add('tableau-hint-target');
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
  renderVersionLabel();
  undoBtn.textContent = `무르기 ${state.undoLeft}`;
  undoBtn.disabled = state.undoLeft <= 0 || state.undoStack.length === 0;
  checkWin();
  persistGameState();
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
  const isFace = ['J', 'Q', 'K'].includes(card.rank);
  el.className = `card ${card.color === 'red' ? 'red' : ''} ${isFace ? 'face-card' : ''}`;
  if (isInSelectedSequence(location)) el.classList.add('selected');
  if (isSameLocation(state.dragging, location)) el.classList.add('dragging');
  if (canSelect(location)) el.classList.add('movable');
  el.innerHTML = isFace
    ? `<span class="corner"><span>${card.rank}</span><span>${card.symbol}</span></span><span class="face-mark">${faceIcon(card.rank)}</span><span class="center-suit">${card.symbol}</span>`
    : `<span class="corner"><span>${card.rank}</span><span>${card.symbol}</span></span><span class="center-suit">${card.symbol}</span>`;
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

function faceIcon(rank) {
  return { J: '♟', Q: '♛', K: '♚' }[rank] || '◆';
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
  const foundationTarget = { type: 'foundation', suit: card.suit };
  if (canMoveTo(card, foundationTarget)) {
    moveSingleCard(location, foundationTarget, `${card.rank}${card.symbol}를 Foundation으로 이동했습니다.`, 'foundation');
    return;
  }

  if (isBottomTableauCard) {
    const freecellIndex = state.freecells.findIndex(cell => cell === null);
    if (freecellIndex !== -1) {
      const freecellTarget = { type: 'freecell', index: freecellIndex };
      moveSingleCard(location, freecellTarget, `${card.rank}${card.symbol}를 Free Cell로 이동했습니다.`, 'move');
      return;
    }
  }

  setStatus(`${card.rank}${card.symbol}는 Foundation으로 갈 수 없고, 빈 Free Cell도 없습니다.`);
  playSound('invalid');
}

function moveSingleCard(from, to, message, soundKind = 'move') {
  const card = getCard(from);
  if (!card || !canMoveTo(card, to)) return false;
  saveUndoState();
  removeCard(from);
  addCard(to, card);
  state.selected = null;
  state.dragging = null;
  state.moves += 1;
  setStatus(message);
  playSound(soundKind);
  render();
  return true;
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


function isTableauHintTarget(target) {
  if (!state.selected || target.type !== 'tableau') return false;
  if (state.selected.type === 'tableau' && state.selected.index === target.index) return false;
  const movingCards = getMovingCards(state.selected);
  return movingCards.length > 0 && canMoveCardsTo(movingCards, target);
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






function persistGameState() {
  if (!state.tableau.some(column => column.length)) return;
  const payload = {
    savedAt: Date.now(),
    freecells: state.freecells,
    foundations: state.foundations,
    tableau: state.tableau,
    selected: state.selected,
    moves: state.moves,
    elapsedSeconds: state.elapsedSeconds,
    timerStarted: state.timerStarted,
    won: state.won,
    scoreSaved: state.scoreSaved,
    undoStack: state.undoStack,
    undoLeft: state.undoLeft,
    gameMode: state.gameMode,
    difficultyCode: state.difficultyCode,
    status: statusEl.textContent,
  };
  localStorage.setItem(STORAGE_KEYS.game, JSON.stringify(payload));
}

function restoreSavedGame() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.game));
  if (!isValidSavedGame(saved)) return false;

  state.freecells = saved.freecells;
  state.foundations = saved.foundations;
  state.tableau = saved.tableau;
  state.selected = saved.selected ?? null;
  state.dragging = null;
  state.moves = saved.moves ?? 0;
  state.elapsedSeconds = saved.elapsedSeconds ?? 0;
  state.timerStarted = Boolean(saved.timerStarted && !saved.won);
  state.won = Boolean(saved.won);
  state.scoreSaved = Boolean(saved.scoreSaved);
  state.undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
  state.undoLeft = Number.isInteger(saved.undoLeft) ? saved.undoLeft : 5;
  state.gameMode = saved.gameMode === 'promotion' ? 'promotion' : 'normal';
  state.difficultyCode = typeof saved.difficultyCode === 'string' ? saved.difficultyCode : getActiveDifficultyCode();

  if (state.timerStarted && saved.savedAt) {
    const deltaSeconds = Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000));
    state.elapsedSeconds += deltaSeconds;
  }

  setStatus(saved.status || '저장된 게임을 이어서 진행합니다.');
  render();
  if (state.timerStarted) resumeTimer();
  return true;
}

function isValidSavedGame(saved) {
  return Boolean(
    saved &&
    Array.isArray(saved.freecells) &&
    saved.freecells.length === 4 &&
    saved.foundations &&
    Array.isArray(saved.tableau) &&
    saved.tableau.length === 8
  );
}

function resumeTimer() {
  stopTimer();
  if (state.won || !state.timerStarted) return;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    timerDisplay.textContent = formatTime(state.elapsedSeconds);
    persistGameState();
  }, 1000);
}


function requestNewGame() {
  const stats = loadStats();
  stats.gamesStarted += 1;
  const promotionTarget = getPromotionTarget(stats);
  saveStats(stats);

  if (promotionTarget) {
    newGame({ clearSaved: true, mode: 'promotion', difficultyCode: promotionTarget.code });
    return;
  }

  newGame({ clearSaved: true, mode: 'normal', difficultyCode: DIFFICULTY_TIERS[stats.difficultyIndex].code });
}

function loadStats() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.stats));
  const difficultyIndex = Number.isInteger(saved?.difficultyIndex)
    ? Math.min(Math.max(saved.difficultyIndex, 0), DIFFICULTY_TIERS.length - 1)
    : 0;
  return {
    gamesStarted: Number.isInteger(saved?.gamesStarted) ? saved.gamesStarted : 0,
    clears: Number.isInteger(saved?.clears) ? saved.clears : 0,
    difficultyIndex,
  };
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

function initPlayer() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.player));
  if (saved?.id && saved?.password) {
    state.player = saved;
  } else {
    state.player = createAutoPlayer();
    localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));
    saveCurrentProfile();
  }
  playerIdEl.textContent = state.player.id;
  renderPlayerPassword();
  renderSignupPanel();
}

function renderPlayerPassword() {
  if (!playerPasswordEl) return;
  if (!state.player) return;
  passwordToggleBtn.disabled = false;
  playerPasswordEl.textContent = state.passwordVisible ? state.player.password : '••••••';
  passwordToggleBtn.textContent = state.passwordVisible ? '숨김' : '보기';
  passwordToggleBtn.setAttribute('aria-pressed', String(state.passwordVisible));
}

function togglePasswordVisibility() {
  state.passwordVisible = !state.passwordVisible;
  renderPlayerPassword();
}


function renderSignupPanel() {
  signupPanel.hidden = !state.isEditingPlayer;
  if (state.isEditingPlayer && state.player) {
    signupIdInput.value = state.player.id;
    signupPasswordInput.value = state.player.password;
  }
}

function createAutoPlayer() {
  return {
    id: `FC-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
    password: Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
}

function normalizePlayerId(value) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function getProfileKey(id, password) {
  return `${id}::${password}`;
}

function loadProfiles() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.profiles));
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

function saveCurrentProfile() {
  if (!state.player) return;
  const profiles = loadProfiles();
  profiles[getProfileKey(state.player.id, state.player.password)] = {
    player: state.player,
    stats: loadStats(),
    savedAt: new Date().toISOString(),
  };
  saveProfiles(profiles);
}

function openPlayerEditor() {
  state.isEditingPlayer = true;
  renderSignupPanel();
  setStatus('아이디와 비밀번호를 수정하거나 기존 정보를 불러올 수 있습니다.');
}

function closePlayerEditor() {
  state.isEditingPlayer = false;
  renderSignupPanel();
}

function handleSignup(event) {
  event.preventDefault();
  const id = normalizePlayerId(signupIdInput.value);
  const password = signupPasswordInput.value.trim();
  if (id.length < 3) {
    setStatus('아이디는 3자 이상 입력해주세요.');
    playSound('invalid');
    return;
  }
  if (password.length < 4) {
    setStatus('비밀번호는 4자 이상 입력해주세요.');
    playSound('invalid');
    return;
  }

  saveCurrentProfile();
  const profiles = loadProfiles();
  const profile = profiles[getProfileKey(id, password)];
  state.player = profile?.player || { id, password, createdAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));

  if (profile?.stats) saveStats(profile.stats);
  else saveCurrentProfile();
  localStorage.removeItem(STORAGE_KEYS.game);

  state.passwordVisible = false;
  state.isEditingPlayer = false;
  playerIdEl.textContent = state.player.id;
  renderPlayerPassword();
  renderSignupPanel();
  renderVersionLabel();
  renderRankings();
  const tier = getDifficultyTier(getActiveDifficultyCode());
  setStatus(profile ? `${state.player.id} 정보 계승 완료. 현재 난이도 ${tier.label}.` : `${state.player.id} 새 정보 저장 완료. Easy 1부터 시작합니다.`);
}

function startTimer() {
  if (state.won || state.timerStarted) return;
  state.timerStarted = true;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    timerDisplay.textContent = formatTime(state.elapsedSeconds);
    persistGameState();
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
  const multiplier = getScoreMultiplier(state.difficultyCode, state.gameMode);
  const undoUsed = Math.max(0, 5 - state.undoLeft);
  const score = calculateScore(state.elapsedSeconds, state.moves, multiplier, undoUsed);
  data.entries.push({
    id: state.player.id,
    time: state.elapsedSeconds,
    moves: state.moves,
    score,
    undoUsed,
    multiplier,
    difficultyCode: state.difficultyCode,
    mode: state.gameMode,
    completedAt: new Date().toISOString(),
  });
  data.entries.forEach(entry => {
    if (!Number.isFinite(entry.score)) {
      entry.multiplier = Number.isFinite(entry.multiplier) ? entry.multiplier : getScoreMultiplier(entry.difficultyCode || 'e1', entry.mode);
      entry.undoUsed = Number.isInteger(entry.undoUsed) ? entry.undoUsed : 0;
      entry.score = calculateScore(entry.time || 0, entry.moves || 0, entry.multiplier, entry.undoUsed);
    }
  });
  data.entries.sort((a, b) => b.score - a.score || a.time - b.time || a.moves - b.moves);
  data.entries = data.entries.slice(0, 20);
  saveRankingData(data);
  updateClearProgress();
  renderRankings();
}


function updateClearProgress() {
  const stats = loadStats();
  stats.clears += 1;
  if (state.gameMode === 'promotion') {
    const promotedIndex = getDifficultyTierIndex(state.difficultyCode);
    stats.difficultyIndex = Math.max(stats.difficultyIndex, promotedIndex);
    const tier = getDifficultyTier(state.difficultyCode);
    setStatus(`승급 성공! 이제 ${tier.label} 난이도로 진행합니다.`);
  }
  saveStats(stats);
  saveCurrentProfile();
}

function calculateScore(time, moves, multiplier = 1, undoUsed = 0) {
  const base = Math.max(100, 10000 - time * 10 - moves * 5 - undoUsed * 100);
  return Math.round(base * multiplier);
}

function renderRankings() {
  const data = loadRankingData();
  data.entries.forEach(entry => {
    entry.difficultyCode = entry.difficultyCode || 'e1';
    entry.mode = entry.mode === 'promotion' ? 'promotion' : 'normal';
    entry.multiplier = Number.isFinite(entry.multiplier) ? entry.multiplier : getScoreMultiplier(entry.difficultyCode, entry.mode);
    entry.undoUsed = Number.isInteger(entry.undoUsed) ? entry.undoUsed : 0;
    entry.score = Number.isFinite(entry.score) ? entry.score : calculateScore(entry.time || 0, entry.moves || 0, entry.multiplier, entry.undoUsed);
  });
  data.entries.sort((a, b) => b.score - a.score || a.time - b.time || a.moves - b.moves);
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
      <span>${entry.score ?? calculateScore(entry.time || 0, entry.moves || 0, entry.multiplier || 1, entry.undoUsed || 0)}점 · ${entry.difficultyCode || 'e1'}${entry.mode === 'promotion' ? ' · 승급' : ''}${entry.undoUsed ? ` · ↶${entry.undoUsed}` : ''}</span>
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
      persistGameState();
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
  updateSoundButton();
  setStatus(state.soundEnabled ? '이동 사운드를 켰습니다.' : '이동 사운드를 껐습니다.');
  if (state.soundEnabled) playSound('move');
}

function updateSoundButton() {
  const label = state.soundEnabled ? '소리 켜짐' : '소리 꺼짐';
  soundBtn.setAttribute('aria-label', label);
  soundBtn.setAttribute('title', label);
  soundBtn.setAttribute('aria-pressed', String(state.soundEnabled));
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
    updateSoundButton();
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
updateSoundButton();

$('newGameBtn').addEventListener('click', requestNewGame);
$('autoBtn').addEventListener('click', autoMoveAces);
undoBtn.addEventListener('click', undoMove);
soundBtn.addEventListener('click', toggleSound);
passwordToggleBtn.addEventListener('click', togglePasswordVisibility);
signupForm.addEventListener('submit', handleSignup);
signupCancelBtn.addEventListener('click', closePlayerEditor);
document.querySelector('.player-card').addEventListener('click', (event) => {
  if (event.target === passwordToggleBtn) return;
  openPlayerEditor();
});
tutorialBtn.addEventListener('click', () => toggleTutorial());
tutorialCloseBtn.addEventListener('click', () => toggleTutorial(false));
if (!restoreSavedGame()) newGame({ clearSaved: false, difficultyCode: getActiveDifficultyCode() });
