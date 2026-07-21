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

const SUPABASE_CONFIG = {
  url: 'https://zhhvyvjbqdwurwlgseod.supabase.co',
  key: 'sb_publishable_JtPb39q98NCpE8fnKGnclg_E9PYFLjA',
};

const SERVER_RANKING_ENABLED = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.key);


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
  hintLeft: 5,
  hintTarget: null,
  gameMode: 'normal',
  difficultyCode: 'e1',
  serverLeader: null,
  lastRankNoticeAt: 0,
  rankingTickerIndex: 0,
  lastResult: null,
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const moveHud = $('moveHud');
const timerDisplay = $('timerDisplay');
const hintHud = $('hintHud');
const versionLabel = $('versionLabel');
const playerIdEl = $('playerId');
const playerPasswordEl = $('playerPassword');
const passwordToggleBtn = $('passwordToggleBtn');
const playerRankEl = $('playerRank');
const rankingPanel = $('rankingPanel');
const rankingResetText = $('rankingResetText');
const rankingList = $('rankingList');
const soundBtn = $('soundBtn');
const tutorialBtn = $('tutorialBtn');
const tutorialCloseBtn = $('tutorialCloseBtn');
const tutorialPanel = $('tutorialPanel');
const signupPanel = $('signupPanel');
const signupForm = $('signupForm');
const signupIdInput = $('signupId');
const signupPasswordInput = $('signupPassword');
const signupCancelBtn = $('signupCancelBtn');
const resultModal = $('resultModal');
const resultTime = $('resultTime');
const resultMoves = $('resultMoves');
const resultScore = $('resultScore');
const resultRankText = $('resultRankText');
const resultCloseBtn = $('resultCloseBtn');
const rankingModal = $('rankingModal');
const rankingDetailList = $('rankingDetailList');
const rankingDetailReset = $('rankingDetailReset');
const rankingCloseBtn = $('rankingCloseBtn');
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
  state.hintLeft = 5;
  state.hintTarget = null;
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
    if (isHintTarget(target)) slot.classList.add('hint-destination');
    wireDropTarget(slot, target);
    if (card) slot.appendChild(cardEl(card, { type: 'freecell', index }));
    freecellsEl.appendChild(slot);
  });

  suits.forEach(suit => {
    const target = { type: 'foundation', suit: suit.key };
    const slot = slotEl(suit.symbol, () => handleTarget(target));
    slot.classList.add('foundation-slot');
    if (isHintTarget(target)) slot.classList.add('hint-destination');
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
    if (isHintTarget(columnTarget)) col.classList.add('hint-destination');
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
  hintHud.textContent = state.hintLeft;
  timerDisplay.textContent = formatTime(state.elapsedSeconds);
  renderVersionLabel();
  $('autoBtn').textContent = `힌트 ${state.hintLeft}`;
  $('autoBtn').disabled = state.hintLeft <= 0;
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
  if (isInHintSource(location)) el.classList.add('hint-source');
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
  removeCard(from);
  addCard(to, card);
  state.selected = null;
  state.dragging = null;
  state.hintTarget = null;
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
  state.hintTarget = null;
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

  removeCards(state.selected, movingCards.length);
  addCards(target, movingCards);
  state.selected = null;
  state.dragging = null;
  state.hintTarget = null;
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

function showHint() {
  if (state.hintLeft <= 0) {
    setStatus('이번 게임의 힌트 5회를 모두 사용했습니다.');
    playSound('invalid');
    return;
  }

  startTimer();
  state.selected = null;
  state.hintTarget = null;
  const hint = findHintMove();
  if (!hint) {
    setStatus('지금 알려줄 수 있는 이동이 없습니다.');
    playSound('invalid');
    return;
  }

  state.hintLeft -= 1;
  state.selected = hint.from;
  state.hintTarget = hint.to;
  setStatus(`힌트: ${hint.cardLabel} → ${hint.targetLabel}. 직접 이동해보세요. 남은 힌트 ${state.hintLeft}회.`);
  playSound('move');
  render();
}

function findHintMove() {
  const sources = getHintSources();

  for (const source of sources) {
    const target = { type: 'foundation', suit: source.cards[0].suit };
    if (canMoveCardsTo(source.cards, target)) return buildHint(source, target);
  }

  for (const source of sources) {
    for (let index = 0; index < state.tableau.length; index += 1) {
      if (source.from.type === 'tableau' && source.from.index === index) continue;
      const target = { type: 'tableau', index };
      if (canMoveCardsTo(source.cards, target)) return buildHint(source, target);
    }
  }

  for (const source of sources) {
    const emptyIndex = state.freecells.findIndex(cell => cell === null);
    if (emptyIndex !== -1 && source.cards.length === 1) {
      const target = { type: 'freecell', index: emptyIndex };
      if (canMoveCardsTo(source.cards, target)) return buildHint(source, target);
    }
  }

  return null;
}

function getHintSources() {
  const sources = [];
  state.freecells.forEach((card, index) => {
    if (card) sources.push({ from: { type: 'freecell', index }, cards: [card] });
  });

  state.tableau.forEach((column, index) => {
    for (let cardIndex = 0; cardIndex < column.length; cardIndex += 1) {
      const location = { type: 'tableau', index, cardIndex };
      if (canSelect(location)) sources.push({ from: location, cards: getMovingCards(location) });
    }
  });

  return sources;
}

function buildHint(source, target) {
  const first = source.cards[0];
  const cardLabel = source.cards.length > 1 ? `${first.rank}${first.symbol}부터 ${source.cards.length}장` : `${first.rank}${first.symbol}`;
  return { from: source.from, to: target, cards: source.cards, cardLabel, targetLabel: getTargetLabel(target) };
}

function getTargetLabel(target) {
  if (target.type === 'foundation') {
    const suit = suits.find(item => item.key === target.suit);
    return `Foundation ${suit?.symbol || target.suit}`;
  }
  if (target.type === 'freecell') return `Free Cell ${target.index + 1}`;
  if (target.type === 'tableau') return `Tableau ${target.index + 1}`;
  return '이동 가능 위치';
}

function isHintTarget(target) {
  if (!state.hintTarget || !target) return false;
  const normalizedTarget = normalizeDropTarget(target);
  return isSameTarget(state.hintTarget, normalizedTarget);
}

function isSameTarget(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'freecell' || a.type === 'tableau') return a.index === b.index;
  if (a.type === 'foundation') return a.suit === b.suit;
  return false;
}

function isInHintSource(location) {
  if (!state.hintTarget || !state.selected || !location) return false;
  return isInSelectedSequence(location);
}






function persistGameState() {
  const hasTableauCards = state.tableau.some(column => column.length);
  const hasCompletedFoundations = Object.values(state.foundations).reduce((sum, pile) => sum + pile.length, 0) === 52;
  if (!hasTableauCards && !state.won && !hasCompletedFoundations) return;
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
    hintLeft: state.hintLeft,
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
  state.hintLeft = Number.isInteger(saved.hintLeft) ? saved.hintLeft : 5;
  state.hintTarget = null;
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



async function supabaseRpc(functionName, body) {
  if (!SERVER_RANKING_ENABLED) throw new Error('Supabase is not configured');
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.key,
      Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${functionName} failed: ${message}`);
  }
  return response.json();
}

function applyServerStats(profile) {
  if (!profile) return;
  const difficultyIndex = Number.isInteger(profile.difficulty_index)
    ? Math.min(Math.max(profile.difficulty_index, 0), DIFFICULTY_TIERS.length - 1)
    : 0;
  saveStats({
    ...loadStats(),
    clears: Number.isInteger(profile.clears) ? profile.clears : 0,
    difficultyIndex,
  });
  if (state.player) {
    state.player.editUsed = Boolean(profile.edit_used);
    localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));
  }
}

async function registerPlayerOnServer() {
  if (!state.player || !SERVER_RANKING_ENABLED) return;
  try {
    const [profile] = await supabaseRpc('freecell_register_player', {
      p_player_id: state.player.id,
      p_pin: state.player.password,
    });
    if (profile?.status === 'ok') {
      applyServerStats(profile);
      renderVersionLabel();
    }
  } catch (error) {
    console.warn('Player server sync failed', error);
  }
}

async function updatePlayerOnServer(previousId, previousPin, id, password) {
  if (!SERVER_RANKING_ENABLED || !previousId || !previousPin) return null;
  try {
    const [profile] = await supabaseRpc('freecell_update_player_once', {
      p_old_id: previousId,
      p_old_pin: previousPin,
      p_new_id: id,
      p_new_pin: password,
    });
    if (profile?.status === 'ok') return profile;
    setStatus(`서버 플레이어 변경 실패: ${profile?.status || 'unknown'}`);
    return profile || null;
  } catch (error) {
    console.warn('Player update server sync failed', error);
    setStatus('서버 플레이어 변경은 실패했지만 로컬 정보는 저장했습니다.');
    return null;
  }
}

async function submitScoreToServer(result) {
  if (!state.player || !SERVER_RANKING_ENABLED || !result) return;
  try {
    const [serverResult] = await supabaseRpc('freecell_submit_score', {
      p_player_id: state.player.id,
      p_pin: state.player.password,
      p_week_key: getWeekKey(),
      p_score: result.score,
      p_time: result.time,
      p_moves: result.moves,
      p_hint_used: result.hintUsed || 0,
      p_difficulty_code: result.difficultyCode,
      p_mode: result.mode,
    });
    if (serverResult?.status === 'ok' && Number.isInteger(serverResult.rank)) {
      result.rank = serverResult.rank;
      result.ranked = serverResult.rank <= result.rankingLimit;
    } else if (serverResult?.status === 'not_best') {
      result.submitted = false;
      result.notBest = true;
    }
    await refreshServerRankings();
  } catch (error) {
    console.warn('Score server sync failed', error);
  }
}

async function refreshServerRankings({ notify = false } = {}) {
  if (!SERVER_RANKING_ENABLED) return;
  try {
    const rows = await supabaseRpc('freecell_weekly_leaderboard', {
      p_week_key: getWeekKey(),
      p_limit: 20,
    });
    const data = {
      weekKey: getWeekKey(),
      entries: rows.map(row => ({
        id: row.player_id,
        score: row.score,
        time: row.elapsed_time ?? row.time,
        moves: row.moves,
        hintUsed: row.hint_used || 0,
        difficultyCode: row.difficulty_code || 'e1',
        mode: row.mode || 'normal',
        completedAt: row.created_at,
      })),
    };
    saveRankingData(data);
    maybeNotifyRankingChange(data.entries, notify);
    renderRankings();
    renderRankingDetail();
    refreshOpenResultMessage();
  } catch (error) {
    console.warn('Leaderboard refresh failed', error);
  }
}


function maybeNotifyRankingChange(entries, notify) {
  if (!notify || !entries.length || !state.timerStarted || state.won) return;
  const now = Date.now();
  if (now - state.lastRankNoticeAt < 120000) return;

  const leader = entries[0];
  const previousLeader = state.serverLeader;
  state.serverLeader = { id: leader.id, score: leader.score };

  if (previousLeader && (previousLeader.id !== leader.id || previousLeader.score !== leader.score)) {
    state.lastRankNoticeAt = now;
    setStatus(`1위 변경: ${leader.id} · ${leader.score}점`);
    return;
  }

  const hintUsed = Math.max(0, 5 - state.hintLeft);
  const projectedScore = calculateScore(
    state.elapsedSeconds,
    state.moves,
    getScoreMultiplier(state.difficultyCode, state.gameMode),
    hintUsed
  );
  const gap = leader.score - projectedScore;
  if (gap > 0 && gap <= 500) {
    state.lastRankNoticeAt = now;
    setStatus(`현재 페이스 기준 1위까지 ${gap}점 차이입니다.`);
  }
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
  registerPlayerOnServer();
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
    password: createPin(),
    createdAt: new Date().toISOString(),
    editUsed: false,
  };
}

function normalizePlayerId(value) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function createPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
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
    player: { ...state.player, editUsed: Boolean(state.player.editUsed) },
    stats: loadStats(),
    savedAt: new Date().toISOString(),
  };
  saveProfiles(profiles);
}

function openPlayerEditor() {
  if (state.player?.editUsed) {
    setStatus('ID/PW 변경은 최초 1회만 가능합니다. 이미 변경을 사용했습니다.');
    playSound('invalid');
    return;
  }
  state.isEditingPlayer = true;
  renderSignupPanel();
  setStatus('ID/PW 변경은 최초 1회만 가능합니다. 신중하게 저장해주세요.');
}

function closePlayerEditor() {
  state.isEditingPlayer = false;
  renderSignupPanel();
}

async function handleSignup(event) {
  event.preventDefault();
  const id = normalizePlayerId(signupIdInput.value);
  const password = signupPasswordInput.value.trim();
  if (id.length < 3) {
    setStatus('아이디는 3자 이상 입력해주세요.');
    playSound('invalid');
    return;
  }
  if (!/^\d{4}$/.test(password)) {
    setStatus('비밀번호는 숫자 4자리로 입력해주세요.');
    playSound('invalid');
    return;
  }

  if (state.player?.editUsed) {
    setStatus('ID/PW 변경은 최초 1회만 가능합니다. 이미 변경을 사용했습니다.');
    playSound('invalid');
    closePlayerEditor();
    return;
  }

  const previousId = state.player?.id;
  const previousPin = state.player?.password;
  saveCurrentProfile();
  const profiles = loadProfiles();
  const profile = profiles[getProfileKey(id, password)];
  state.player = profile?.player
    ? { ...profile.player, id, password, editUsed: true }
    : { id, password, createdAt: new Date().toISOString(), editUsed: true };
  localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));

  if (profile?.stats) saveStats(profile.stats);
  else saveCurrentProfile();
  const serverProfile = await updatePlayerOnServer(previousId, previousPin, id, password);
  if (serverProfile?.status === 'ok') applyServerStats(serverProfile);
  if (previousId && previousId !== id) updateRankingPlayerId(previousId, id);
  saveCurrentProfile();
  localStorage.removeItem(STORAGE_KEYS.game);

  state.passwordVisible = false;
  state.isEditingPlayer = false;
  playerIdEl.textContent = state.player.id;
  renderPlayerPassword();
  renderSignupPanel();
  renderVersionLabel();
  renderRankings();
  const tier = getDifficultyTier(getActiveDifficultyCode());
  setStatus(profile ? `${state.player.id} 정보 계승 완료. ID/PW 변경 1회를 사용했습니다. 현재 난이도 ${tier.label}.` : `${state.player.id} 저장 완료. ID/PW 변경 1회를 사용했습니다.`);
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

function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return formatLocalDateKey(d);
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


function updateRankingPlayerId(oldId, newId) {
  const data = loadRankingData();
  let changed = false;
  data.entries.forEach(entry => {
    if (entry.id === oldId) {
      entry.id = newId;
      changed = true;
    }
  });
  if (changed) saveRankingData(data);
}

function recordWeeklyScore() {
  if (state.scoreSaved || !state.player) return null;
  state.scoreSaved = true;
  const data = loadRankingData();
  const multiplier = getScoreMultiplier(state.difficultyCode, state.gameMode);
  const hintUsed = Math.max(0, 5 - state.hintLeft);
  const score = calculateScore(state.elapsedSeconds, state.moves, multiplier, hintUsed);
  const completedAt = new Date().toISOString();
  const entry = {
    id: state.player.id,
    time: state.elapsedSeconds,
    moves: state.moves,
    score,
    hintUsed,
    multiplier,
    difficultyCode: state.difficultyCode,
    mode: state.gameMode,
    completedAt,
  };

  data.entries.forEach(item => normalizeRankingEntry(item));
  const previousBest = data.entries
    .filter(item => item.id === state.player.id)
    .sort((a, b) => b.score - a.score || a.time - b.time || a.moves - b.moves)[0] || null;
  const personalBestShortage = previousBest && score <= previousBest.score
    ? previousBest.score - score + 1
    : 0;

  let submitted = false;
  if (!personalBestShortage) {
    data.entries = data.entries.filter(item => item.id !== state.player.id);
    data.entries.push(entry);
    submitted = true;
  }

  data.entries.sort(compareRankingEntries);
  const fullRankIndex = submitted
    ? data.entries.findIndex(item => item.completedAt === completedAt && item.id === entry.id)
    : -1;
  const cutoffEntry = data.entries[19] || null;
  const topShortage = submitted && fullRankIndex >= 20 && cutoffEntry
    ? Math.max(1, cutoffEntry.score - score + 1)
    : 0;
  data.entries = data.entries.slice(0, 20);
  const rankIndex = submitted
    ? data.entries.findIndex(item => item.completedAt === completedAt && item.id === entry.id)
    : -1;
  const result = {
    ...entry,
    rank: rankIndex === -1 ? null : rankIndex + 1,
    ranked: rankIndex !== -1,
    rankingLimit: 20,
    shortage: personalBestShortage || topShortage,
    submitted,
    notBest: Boolean(personalBestShortage),
    previousBestScore: previousBest?.score ?? null,
  };
  saveRankingData(data);
  updateClearProgress();
  persistGameState();
  if (submitted) submitScoreToServer(result);
  return result;
}

function normalizeRankingEntry(entry) {
  entry.difficultyCode = entry.difficultyCode || 'e1';
  entry.mode = entry.mode === 'promotion' ? 'promotion' : 'normal';
  entry.multiplier = Number.isFinite(entry.multiplier) ? entry.multiplier : getScoreMultiplier(entry.difficultyCode, entry.mode);
  entry.hintUsed = Number.isInteger(entry.hintUsed) ? entry.hintUsed : (Number.isInteger(entry.undoUsed) ? entry.undoUsed : 0);
  entry.score = Number.isFinite(entry.score) ? entry.score : calculateScore(entry.time || 0, entry.moves || 0, entry.multiplier, entry.hintUsed);
}

function compareRankingEntries(a, b) {
  return b.score - a.score || a.time - b.time || a.moves - b.moves;
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

function calculateScore(time, moves, multiplier = 1, hintUsed = 0) {
  const base = Math.max(100, 10000 - time * 10 - moves * 5 - hintUsed * 100);
  return Math.round(base * multiplier);
}

function getRankedEntries(limit = Infinity) {
  const data = loadRankingData();
  data.entries.forEach(entry => normalizeRankingEntry(entry));
  data.entries.sort(compareRankingEntries);
  return data.entries.slice(0, limit).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function getResetText() {
  const reset = getNextResetDate();
  return `초기화 예정: ${reset.getFullYear()}-${String(reset.getMonth() + 1).padStart(2, '0')}-${String(reset.getDate()).padStart(2, '0')} 00:00`;
}

function formatRankingDate(value) {
  if (!value) return '등록 시간 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '등록 시간 없음';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getLeaderText() {
  const [leader] = getRankedEntries(1);
  return leader ? `현재 1위: ${leader.id} · ${leader.score}점` : '현재 1위 없음';
}

function renderRankings() {
  const entries = getRankedEntries(20);
  rankingResetText.textContent = getResetText();
  const myRankIndex = state.player ? entries.findIndex(entry => entry.id === state.player.id) : -1;
  playerRankEl.textContent = myRankIndex === -1 ? 'MY -' : `MY ${myRankIndex + 1}위`;

  if (!entries.length) {
    rankingList.innerHTML = '<li class="empty-rank">랭킹 없음</li>';
    return;
  }

  const topEntries = entries.slice(0, 5);
  if (state.rankingTickerIndex >= topEntries.length) state.rankingTickerIndex = 0;
  const entry = topEntries[state.rankingTickerIndex] || topEntries[0];
  rankingList.innerHTML = `
    <li>
      <strong>${entry.rank}위 ${entry.id}</strong>
      <span>${entry.score}점 · ${entry.difficultyCode || 'e1'}${entry.mode === 'promotion' ? ' · 승급' : ''}${entry.hintUsed ? ` · 💡${entry.hintUsed}` : ''}</span>
    </li>
  `;
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


function getResultRankMessage(result) {
  const hintText = result.hintUsed ? ` · 힌트 ${result.hintUsed}회` : '';
  const modeText = result.mode === 'promotion' ? ' · 승급전' : '';
  const leaderText = getLeaderText();
  if (result.notBest) {
    return `최고 점수까지 ${result.shortage}점 부족합니다. 이번 기록은 랭킹에 등록되지 않습니다. ${leaderText}. ${result.difficultyCode}${modeText}${hintText}`;
  }
  if (result.ranked) {
    return `주간 랭킹 ${result.rank}위에 반영됐습니다. ${leaderText}. ${result.difficultyCode}${modeText}${hintText}`;
  }
  return `랭킹 TOP ${result.rankingLimit}까지 ${result.shortage}점 부족합니다. ${leaderText}. ${result.difficultyCode}${modeText}${hintText}`;
}

function showResultModal(result) {
  if (!resultModal || !result) return;
  state.lastResult = result;
  resultTime.textContent = formatTime(result.time);
  resultMoves.textContent = `${result.moves}`;
  resultScore.textContent = `${result.score}점`;
  resultRankText.textContent = getResultRankMessage(result);
  resultModal.hidden = false;
}

function refreshOpenResultMessage() {
  if (!resultModal || resultModal.hidden || !state.lastResult) return;
  resultRankText.textContent = getResultRankMessage(state.lastResult);
}

function confirmResultModal() {
  if (resultModal) resultModal.hidden = true;
  renderRankings();
  setStatus(`클리어 완료 상태를 유지합니다. ${getLeaderText()}.`);
}

function openRankingModal() {
  if (!rankingModal) return;
  renderRankingDetail();
  rankingModal.hidden = false;
}

function closeRankingModal() {
  if (rankingModal) rankingModal.hidden = true;
}

function renderRankingDetail() {
  const entries = getRankedEntries(10);
  rankingDetailReset.textContent = getResetText();
  if (!entries.length) {
    rankingDetailList.innerHTML = '<li><div class="ranking-detail-main">아직 등록된 주간 랭킹이 없습니다.</div></li>';
    return;
  }
  rankingDetailList.innerHTML = entries.map(entry => `
    <li>
      <div class="ranking-detail-rank">${entry.rank}위</div>
      <div class="ranking-detail-main">
        <div class="ranking-detail-player">
          <strong>${entry.id}</strong>
          <span class="ranking-detail-score">${entry.score}점</span>
        </div>
        <div class="ranking-detail-meta">${formatTime(entry.time || 0)} · ${entry.moves || 0}수 · ${entry.difficultyCode || 'e1'}${entry.mode === 'promotion' ? ' · 승급' : ''}${entry.hintUsed ? ` · 힌트 ${entry.hintUsed}` : ''}</div>
        <div class="ranking-detail-meta">등록: ${formatRankingDate(entry.completedAt)}</div>
      </div>
    </li>
  `).join('');
}

function checkWin() {
  const total = Object.values(state.foundations).reduce((sum, pile) => sum + pile.length, 0);
  if (total === 52) {
    statusEl.classList.add('win');
    statusEl.textContent = `승리! ${formatTime(state.elapsedSeconds)} · ${state.moves}수 만에 클리어했습니다.`;
    if (!state.won) {
      state.won = true;
      stopTimer();
      persistGameState();
      const result = recordWeeklyScore();
      showResultModal(result);
      playSound('win');
    }
  } else {
    statusEl.classList.remove('win');
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function handleBlankClick(event) {
  if (!state.selected && !state.hintTarget) return;
  if (event.target.closest('.card, .slot, .column, button, a, input, .player-card, .signup-panel, .tutorial, .result-card')) return;
  state.selected = null;
  state.hintTarget = null;
  setStatus('선택을 해제했습니다.');
  render();
}

initPlayer();
renderRankings();
refreshServerRankings();
window.setInterval(() => {
  const topCount = getRankedEntries(5).length;
  if (topCount > 1) {
    state.rankingTickerIndex = (state.rankingTickerIndex + 1) % topCount;
    renderRankings();
  }
}, 2000);
window.setInterval(() => {
  if (state.timerStarted && !state.won) refreshServerRankings({ notify: true });
}, 30000);
updateSoundButton();

$('newGameBtn').addEventListener('click', requestNewGame);
resultCloseBtn.addEventListener('click', confirmResultModal);
$('autoBtn').addEventListener('click', showHint);
soundBtn.addEventListener('click', toggleSound);
passwordToggleBtn.addEventListener('click', togglePasswordVisibility);
signupForm.addEventListener('submit', handleSignup);
signupCancelBtn.addEventListener('click', closePlayerEditor);
document.querySelector('.player-card').addEventListener('click', (event) => {
  if (event.target === passwordToggleBtn) return;
  openPlayerEditor();
});
document.addEventListener('click', handleBlankClick);
rankingPanel.addEventListener('click', openRankingModal);
rankingPanel.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openRankingModal();
  }
});
rankingCloseBtn.addEventListener('click', closeRankingModal);
rankingModal.addEventListener('click', (event) => {
  if (event.target === rankingModal) closeRankingModal();
});
tutorialBtn.addEventListener('click', () => toggleTutorial());
tutorialCloseBtn.addEventListener('click', () => toggleTutorial(false));
if (!restoreSavedGame()) newGame({ clearSaved: false, difficultyCode: getActiveDifficultyCode() });
