const suits = [
  { symbol: '♠', color: 'black', key: 'S' },
  { symbol: '♥', color: 'red', key: 'H' },
  { symbol: '♦', color: 'red', key: 'D' },
  { symbol: '♣', color: 'black', key: 'C' },
];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const RANKING_LIMIT = 50;
const RANKING_TICKER_LIMIT = 5;
const PROMOTION_TIME_LIMIT_SECONDS = 10 * 60;
const PROMOTION_TIME_WARNING_SECONDS = 30;
const TIME_BONUS_TIERS = [
  { seconds: 3 * 60, bonus: 200 },
  { seconds: 4 * 60, bonus: 100 },
  { seconds: 5 * 60, bonus: 50 },
];

const DIFFICULTY_TIERS = [
  { code: 'e1', label: 'Run', displayName: 'Run', requiredClears: 0, multiplier: 1.00, totalMax: 6, minLow: 3, minMovable: 4 },
  { code: 'e2', label: 'Rank', displayName: 'Rank', requiredClears: 3, multiplier: 1.08, totalMax: 12, minLow: 2, minMovable: 3 },
  { code: 'n1', label: 'Duel', displayName: 'Duel', requiredClears: 6, multiplier: 1.20, totalMin: 6, totalMax: 18, minLow: 2, minMovable: 3 },
];
const RETIRED_DIFFICULTY_CODE_MAP = { n2: 'n1', n3: 'n1' };


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
  promotionExpired: false,
  moves: 0,
  elapsedSeconds: 0,
  timerStarted: false,
  timerId: null,
  scoreSaved: false,
  player: null,
  passwordVisible: false,
  isEditingPlayer: false,
  hintLeft: 5,
  hintAllowance: 5,
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
const passwordToggleBtn = $('passwordToggleBtn');
const signupSaveBtn = $('signupSaveBtn');
const playerRankEl = $('playerRank');
const playerTrophyEl = $('playerTrophy');
const playerDifficultyEl = $('playerDifficulty');
const promotionBtn = $('promotionBtn');
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
const resultPromotionText = $('resultPromotionText');
const resultRankText = $('resultRankText');
const resultCloseBtn = $('resultCloseBtn');
const promotionNotice = $('promotionNotice');
const promotionNoticeKicker = $('promotionNoticeKicker');
const promotionNoticeTitle = $('promotionNoticeTitle');
const promotionNoticeText = $('promotionNoticeText');
const promotionNoticeBtn = $('promotionNoticeBtn');
const promotionModal = $('promotionModal');
const promotionModalTitle = $('promotionModalTitle');
const promotionModalText = $('promotionModalText');
const promotionBenefitText = $('promotionBenefitText');
const promotionCautionText = $('promotionCautionText');
const promotionCancelBtn = $('promotionCancelBtn');
const promotionChallengeBtn = $('promotionChallengeBtn');
const promotionFailModal = $('promotionFailModal');
const promotionFailText = $('promotionFailText');
const promotionFailCloseBtn = $('promotionFailCloseBtn');
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
  state.promotionExpired = false;
  state.moves = 0;
  state.elapsedSeconds = 0;
  state.timerStarted = false;
  state.scoreSaved = false;
  stopTimer();
  state.gameMode = mode;
  state.difficultyCode = normalizeDifficultyCode(difficultyCode || getActiveDifficultyCode());
  state.hintAllowance = getHintAllowance(state.difficultyCode);
  state.hintLeft = state.hintAllowance;
  state.hintTarget = null;
  if (promotionFailModal) promotionFailModal.hidden = true;
  if (clearSaved) localStorage.removeItem(STORAGE_KEYS.game);

  const dealScore = dealGame(state.difficultyCode);
  const tier = getDifficultyTier(state.difficultyCode);
  const transition = mode === 'promotion' ? getPromotionTransitionByTargetCode(state.difficultyCode) : null;
  setStatus(mode === 'promotion'
    ? `승급전 시작! ${transition.label}에 도전합니다. 클리어하면 즉시 승급됩니다.`
    : `${tier.label} 단계입니다. 바로 Foundation에 보낼 수 있는 A 카드가 준비됐습니다.`);
  render();
}


function dealGame(difficultyCode = 'e1') {
  difficultyCode = normalizeDifficultyCode(difficultyCode);
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

function normalizeDifficultyCode(code) {
  const normalized = RETIRED_DIFFICULTY_CODE_MAP[code] || code;
  return DIFFICULTY_TIERS.some(tier => tier.code === normalized) ? normalized : DIFFICULTY_TIERS[0].code;
}

function getDifficultyTier(code) {
  const normalized = normalizeDifficultyCode(code);
  return DIFFICULTY_TIERS.find(tier => tier.code === normalized) || DIFFICULTY_TIERS[0];
}

function getDifficultyTierIndex(code) {
  const normalized = normalizeDifficultyCode(code);
  const index = DIFFICULTY_TIERS.findIndex(tier => tier.code === normalized);
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

function getCurrentTier(stats = loadStats()) {
  return DIFFICULTY_TIERS[stats.difficultyIndex] || DIFFICULTY_TIERS[0];
}

function getPromotionTransition(targetTier, stats = loadStats()) {
  const fromTier = getCurrentTier(stats);
  return {
    fromTier,
    toTier: targetTier,
    label: `${fromTier.label} → ${targetTier.label}`,
  };
}

function getPromotionTransitionByTargetCode(targetCode) {
  const toIndex = getDifficultyTierIndex(targetCode);
  const fromTier = DIFFICULTY_TIERS[Math.max(0, toIndex - 1)] || DIFFICULTY_TIERS[0];
  const toTier = getDifficultyTier(targetCode);
  return {
    fromTier,
    toTier,
    label: `${fromTier.label} → ${toTier.label}`,
  };
}

function getScoreMultiplier(code, mode = 'normal') {
  const tier = getDifficultyTier(code);
  return tier.multiplier + (mode === 'promotion' ? 0.10 : 0);
}

function getHintAllowance(code = state.difficultyCode) {
  return normalizeDifficultyCode(code) === 'n1' ? 6 : 5;
}

function getFreeHintAllowance(code = state.difficultyCode) {
  return normalizeDifficultyCode(code) === 'n1' ? 1 : 0;
}

function getChargedHintUsed(hintLeft = state.hintLeft, code = state.difficultyCode) {
  const used = Math.max(0, getHintAllowance(code) - hintLeft);
  return Math.max(0, used - getFreeHintAllowance(code));
}

function renderVersionLabel() {
  if (!versionLabel) return;
  versionLabel.textContent = '알파 v0.3';
  renderPlayerDifficulty();
}

function formatDifficultyCode(code = state.difficultyCode, mode = state.gameMode) {
  const tier = getDifficultyTier(code);
  const name = tier.displayName || tier.label;
  if (mode === 'promotion') {
    return `${getPromotionTransitionByTargetCode(code).label} 승급전`;
  }
  return name;
}

function renderPlayerDifficulty() {
  if (!playerDifficultyEl) return;
  playerDifficultyEl.textContent = formatDifficultyCode();
  renderPromotionButton();
}

function renderPromotionButton() {
  if (!promotionBtn) return;
  const stats = loadStats();
  const nextTier = getPromotionTarget(stats);
  const transition = nextTier ? getPromotionTransition(nextTier, stats) : null;
  const isReady = Boolean(nextTier) && state.gameMode !== 'promotion';
  promotionBtn.disabled = !isReady;
  promotionBtn.classList.toggle('is-ready', isReady);
  promotionBtn.textContent = isReady ? `${transition.label} 승급` : '승급 준비';
  promotionBtn.title = isReady
    ? `${transition.label} 승급전에 도전할 수 있습니다.`
    : '조건을 채우면 승급전이 열립니다.';
}

function renderPromotionNotice() {
  if (promotionNotice) {
    promotionNotice.hidden = true;
    if (promotionNoticeBtn) promotionNoticeBtn.hidden = true;
  }

  if (state.gameMode === 'promotion') {
    const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
    if (state.won) {
      setStatus(`승급 성공: ${transition.label} 완료 · 다음 새 게임부터 적용됩니다.`);
    }
    return;
  }

  const stats = loadStats();
  const nextTier = getPromotionTarget(stats);
  if (nextTier) {
    const transition = getPromotionTransition(nextTier, stats);
    setStatus(`${transition.label} 승급 가능 · 집중할 수 있을 때 승급 버튼을 눌러 도전하세요.`);
    return;
  }

  if (normalizeDifficultyCode(state.difficultyCode) === 'n1') {
    setStatus('Duel 혜택 적용 중 · 첫 힌트 1회는 점수 차감이 없습니다.');
  }
}


function getRankTrophy(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (Number.isInteger(rank)) return '🏅';
  return '—';
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
    if (isSelectedFoundationTarget(target)) slot.classList.add('move-target');
    wireDropTarget(slot, target);
    const pile = state.foundations[suit.key];
    if (pile.length) slot.appendChild(foundationPileEl(pile, suit.key));
    foundationsEl.appendChild(slot);
  });

  state.tableau.forEach((column, colIndex) => {
    const col = document.createElement('div');
    col.className = `column ${column.length ? 'has-cards' : 'is-empty'}`;
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
  updateTimerDisplay();
  renderVersionLabel();
  renderPromotionNotice();
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
  if (state.promotionExpired) {
    setStatus('승급전 시간이 종료됐습니다. 다시 도전하려면 승급 버튼을 눌러주세요.');
    playSound('invalid');
    return;
  }
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
  if (state.promotionExpired) {
    setStatus('승급전 시간이 종료됐습니다. 다시 도전하려면 승급 버튼을 눌러주세요.');
    playSound('invalid');
    return false;
  }
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
  if (state.promotionExpired || !location) return false;
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

function isSelectedFoundationTarget(target) {
  if (!state.selected || !target || target.type !== 'foundation') return false;
  const movingCards = getMovingCards(state.selected);
  return movingCards.length === 1 && canMoveCardsTo(movingCards, target);
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
  if (state.promotionExpired) {
    setStatus('승급전 시간이 종료됐습니다. 다시 도전하려면 승급 버튼을 눌러주세요.');
    playSound('invalid');
    return;
  }
  if (state.hintLeft <= 0) {
    setStatus(`이번 게임의 힌트 ${state.hintAllowance}회를 모두 사용했습니다.`);
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
  const chargedHintUsed = getChargedHintUsed();
  const freeHintText = getFreeHintAllowance() && chargedHintUsed === 0 ? ' Duel 무료 힌트 적용 중.' : '';
  setStatus(`힌트: ${hint.cardLabel} → ${hint.targetLabel}. 직접 이동해보세요. 남은 힌트 ${state.hintLeft}회.${freeHintText}`);
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
    promotionExpired: state.promotionExpired,
    hintLeft: state.hintLeft,
    hintAllowance: state.hintAllowance,
    gameMode: state.gameMode,
    difficultyCode: state.difficultyCode,
    status: statusEl.textContent,
  };
  localStorage.setItem(STORAGE_KEYS.game, JSON.stringify(payload));
}

function restoreSavedGame() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.game));
  if (!isValidSavedGame(saved)) {
    localStorage.removeItem(STORAGE_KEYS.game);
    return false;
  }

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
  state.promotionExpired = Boolean(saved.promotionExpired);
  state.gameMode = saved.gameMode === 'promotion' ? 'promotion' : 'normal';
  state.difficultyCode = typeof saved.difficultyCode === 'string' ? normalizeDifficultyCode(saved.difficultyCode) : getActiveDifficultyCode();
  state.hintAllowance = Number.isInteger(saved.hintAllowance) ? saved.hintAllowance : getHintAllowance(state.difficultyCode);
  state.hintLeft = Number.isInteger(saved.hintLeft) ? Math.min(saved.hintLeft, state.hintAllowance) : state.hintAllowance;
  state.hintTarget = null;

  if (state.timerStarted && saved.savedAt) {
    const deltaSeconds = Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000));
    state.elapsedSeconds += deltaSeconds;
  }
  if (state.gameMode === 'promotion' && state.elapsedSeconds >= PROMOTION_TIME_LIMIT_SECONDS && !state.won) {
    state.promotionExpired = true;
    state.timerStarted = false;
  }

  setStatus(saved.status || '저장된 게임을 이어서 진행합니다.');
  if (state.promotionExpired) setStatus('승급전 실패 · 패널티는 없습니다. 준비되면 다시 도전하세요.');
  render();
  if (state.timerStarted) resumeTimer();
  return true;
}

function isValidSavedGame(saved) {
  if (!saved || !Array.isArray(saved.freecells) || saved.freecells.length !== 4 || !saved.foundations || !Array.isArray(saved.tableau) || saved.tableau.length !== 8) {
    return false;
  }
  const foundationCards = Object.values(saved.foundations).reduce((sum, pile) => sum + (Array.isArray(pile) ? pile.length : 0), 0);
  const tableauCards = saved.tableau.reduce((sum, column) => sum + (Array.isArray(column) ? column.length : 0), 0);
  const freecellCards = saved.freecells.filter(Boolean).length;
  return foundationCards + tableauCards + freecellCards === 52;
}

function resumeTimer() {
  stopTimer();
  if (state.won || state.promotionExpired || !state.timerStarted) return;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    updateTimerDisplay();
    if (checkPromotionTimeLimit()) return;
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
      p_limit: RANKING_LIMIT,
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

  const hintUsed = getChargedHintUsed();
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
  saveStats(stats);
  newGame({ clearSaved: true, mode: 'normal', difficultyCode: DIFFICULTY_TIERS[stats.difficultyIndex].code });
  if (getPromotionTarget(stats)) {
    setStatus('승급전이 준비되어 있습니다. 집중할 수 있을 때 승급 버튼을 눌러 도전하세요.');
  }
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
  if (!passwordToggleBtn || !signupPasswordInput) return;
  signupPasswordInput.type = state.passwordVisible ? 'text' : 'password';
  passwordToggleBtn.textContent = state.passwordVisible ? '🙈' : '👁';
  passwordToggleBtn.setAttribute('aria-pressed', String(state.passwordVisible));
  passwordToggleBtn.setAttribute('aria-label', state.passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기');
}

function togglePasswordVisibility(event) {
  event?.stopPropagation();
  state.passwordVisible = !state.passwordVisible;
  renderPlayerPassword();
}


function renderSignupPanel() {
  signupPanel.hidden = !state.isEditingPlayer;
  if (!state.isEditingPlayer || !state.player) return;
  const readOnly = Boolean(state.player.editUsed);
  signupIdInput.value = state.player.id;
  signupPasswordInput.value = state.player.password;
  signupIdInput.readOnly = readOnly;
  signupPasswordInput.readOnly = readOnly;
  signupSaveBtn.disabled = readOnly;
  signupSaveBtn.textContent = readOnly ? '저장 완료' : '저장';
  renderPlayerPassword();
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
  state.isEditingPlayer = true;
  state.passwordVisible = false;
  renderSignupPanel();
  setStatus(state.player?.editUsed
    ? '플레이어 정보 보기입니다. ID/PW 변경은 이미 사용했습니다.'
    : 'ID/PW 변경은 최초 1회만 가능합니다. 신중하게 저장해주세요.');
}

function closePlayerEditor() {
  state.isEditingPlayer = false;
  state.passwordVisible = false;
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
  if (state.won || state.promotionExpired || state.timerStarted) return;
  state.timerStarted = true;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    updateTimerDisplay();
    if (checkPromotionTimeLimit()) return;
    persistGameState();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
}

function isPromotionTimedMode() {
  return state.gameMode === 'promotion' && !state.won && !state.promotionExpired;
}

function getPromotionTimeLeft() {
  return Math.max(0, PROMOTION_TIME_LIMIT_SECONDS - state.elapsedSeconds);
}

function updateTimerDisplay() {
  const timerHud = timerDisplay?.closest('.timer-hud');
  const isTimed = state.gameMode === 'promotion' && !state.won;
  const seconds = isTimed ? getPromotionTimeLeft() : state.elapsedSeconds;
  timerDisplay.textContent = formatTime(seconds);
  timerHud?.classList.toggle('is-danger', isTimed && seconds <= PROMOTION_TIME_WARNING_SECONDS);
  timerHud?.classList.toggle('is-expired', state.promotionExpired);
  if (isTimed) timerDisplay.title = '승급전 남은 시간';
  else timerDisplay.title = '경과 시간';
}

function checkPromotionTimeLimit() {
  if (state.gameMode !== 'promotion' || state.won || state.promotionExpired) return false;
  if (state.elapsedSeconds < PROMOTION_TIME_LIMIT_SECONDS) return false;
  expirePromotionChallenge();
  return true;
}

function expirePromotionChallenge() {
  state.promotionExpired = true;
  state.timerStarted = false;
  stopTimer();
  state.selected = null;
  state.dragging = null;
  state.hintTarget = null;
  updateTimerDisplay();
  setStatus('승급전 실패 · 패널티는 없습니다. 준비되면 다시 도전하세요.');
  persistGameState();
  render();
  showPromotionFailModal();
  playSound('invalid');
}

function showPromotionFailModal() {
  if (!promotionFailModal) return;
  const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
  if (promotionFailText) {
    promotionFailText.textContent = `${transition.label} 승급전 제한 시간 10분이 지났습니다. 패널티는 없으니, 다음 판에서 다시 도전해보세요.`;
  }
  promotionFailModal.hidden = false;
}

function closePromotionFailModal() {
  if (promotionFailModal) promotionFailModal.hidden = true;
  const activeCode = getActiveDifficultyCode();
  newGame({ clearSaved: true, mode: 'normal', difficultyCode: activeCode });
  renderPromotionButton();
  setStatus('괜찮습니다. 패널티는 없어요. 준비되면 승급 버튼으로 다시 도전하세요.');
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
  const hintUsed = getChargedHintUsed();
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
  const cutoffEntry = data.entries[RANKING_LIMIT - 1] || null;
  const topShortage = submitted && fullRankIndex >= RANKING_LIMIT && cutoffEntry
    ? Math.max(1, cutoffEntry.score - score + 1)
    : 0;
  data.entries = data.entries.slice(0, RANKING_LIMIT);
  const rankIndex = submitted
    ? data.entries.findIndex(item => item.completedAt === completedAt && item.id === entry.id)
    : -1;
  const result = {
    ...entry,
    rank: rankIndex === -1 ? null : rankIndex + 1,
    ranked: rankIndex !== -1,
    rankingLimit: RANKING_LIMIT,
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
  entry.difficultyCode = normalizeDifficultyCode(entry.difficultyCode || 'e1');
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
    const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
    setStatus(`승급 성공: ${transition.label} 완료 · 다음 새 게임부터 적용됩니다.`);
  }
  saveStats(stats);
  saveCurrentProfile();
}

function getTimeBonus(time) {
  const tier = TIME_BONUS_TIERS.find(item => time <= item.seconds);
  return tier?.bonus ?? 0;
}

function calculateScore(time, moves, multiplier = 1, hintUsed = 0) {
  const base = Math.max(100, 10000 - moves * 5 - hintUsed * 100 + getTimeBonus(time));
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
  const entries = getRankedEntries(RANKING_LIMIT);
  rankingResetText.textContent = getResetText();
  const myRankIndex = state.player ? entries.findIndex(entry => entry.id === state.player.id) : -1;
  const myRank = myRankIndex === -1 ? null : myRankIndex + 1;
  playerRankEl.textContent = myRank ? `내 랭크 ${myRank}위` : '내 랭크 -';
  if (playerTrophyEl) playerTrophyEl.textContent = getRankTrophy(myRank);
  renderPlayerDifficulty();

  if (!entries.length) {
    rankingList.innerHTML = '<li class="empty-rank">랭킹 없음</li>';
    return;
  }

  const leader = entries[0];
  const chasingEntries = entries.slice(1, RANKING_TICKER_LIMIT);
  if (state.rankingTickerIndex >= chasingEntries.length) state.rankingTickerIndex = 0;
  const chasing = chasingEntries[state.rankingTickerIndex] || null;
  const leaderMeta = `${formatDifficultyCode(leader.difficultyCode, leader.mode)}${leader.hintUsed ? ` · 💡${leader.hintUsed}` : ''}`;
  const chasingMeta = chasing
    ? `${formatDifficultyCode(chasing.difficultyCode, chasing.mode)}${chasing.hintUsed ? ` · 💡${chasing.hintUsed}` : ''}`
    : '';
  rankingList.innerHTML = `
    <li class="rank-line rank-leader">
      <strong>🏆 현재 1위</strong>
      <span class="rank-id">${leader.id}</span>
      <span class="rank-score">${leader.score}점</span>
      <span class="rank-meta">${leaderMeta}</span>
    </li>
    <li class="rank-line rank-chaser">
      <strong>${chasing ? `${chasing.rank}위` : '2위'}</strong>
      <span class="rank-id">${chasing ? chasing.id : '-'}</span>
      <span class="rank-score">${chasing ? `${chasing.score}점` : '도전자를 기다리는 중'}</span>
      <span class="rank-meta">${chasingMeta}</span>
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


function getPromotionResultMessage(result) {
  if (!result || result.mode !== 'promotion') return '';
  const transition = getPromotionTransitionByTargetCode(result.difficultyCode);
  const benefit = normalizeDifficultyCode(result.difficultyCode) === 'n1' ? ' · Duel 무료 힌트 1회' : '';
  return `승급 성공: ${transition.label} 완료${benefit}`;
}

function getResultRankMessage(result) {
  const hintText = result.hintUsed ? ` · 힌트 ${result.hintUsed}회` : '';
  const modeText = '';
  const leaderText = getLeaderText();
  if (result.notBest) {
    return `최고 점수까지 ${result.shortage}점 부족합니다. 이번 기록은 랭킹에 등록되지 않습니다. ${leaderText}. ${formatDifficultyCode(result.difficultyCode, result.mode)}${modeText}${hintText}`;
  }
  if (result.ranked) {
    return `주간 랭킹 ${result.rank}위에 반영됐습니다. ${leaderText}. ${formatDifficultyCode(result.difficultyCode, result.mode)}${modeText}${hintText}`;
  }
  return `랭킹 TOP ${result.rankingLimit}까지 ${result.shortage}점 부족합니다. ${leaderText}. ${formatDifficultyCode(result.difficultyCode, result.mode)}${modeText}${hintText}`;
}

function showResultModal(result) {
  if (!resultModal || !result) return;
  state.lastResult = result;
  const promotionMessage = getPromotionResultMessage(result);
  if (resultPromotionText) {
    resultPromotionText.hidden = !promotionMessage;
    resultPromotionText.textContent = promotionMessage;
  }
  resultTime.textContent = formatTime(result.time);
  resultMoves.textContent = `${result.moves}`;
  resultScore.textContent = `${result.score}점`;
  resultRankText.textContent = getResultRankMessage(result);
  resultModal.hidden = false;
}

function refreshOpenResultMessage() {
  if (!resultModal || resultModal.hidden || !state.lastResult) return;
  if (resultPromotionText) {
    const promotionMessage = getPromotionResultMessage(state.lastResult);
    resultPromotionText.hidden = !promotionMessage;
    resultPromotionText.textContent = promotionMessage;
  }
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
  const entries = getRankedEntries(RANKING_LIMIT);
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
        <div class="ranking-detail-meta">${formatTime(entry.time || 0)} · ${entry.moves || 0}수 · ${formatDifficultyCode(entry.difficultyCode, entry.mode)}${entry.hintUsed ? ` · 힌트 ${entry.hintUsed}` : ''}</div>
        <div class="ranking-detail-meta">등록: ${formatRankingDate(entry.completedAt)}</div>
      </div>
    </li>
  `).join('');
}

function checkWin() {
  const total = Object.values(state.foundations).reduce((sum, pile) => sum + pile.length, 0);
  if (state.promotionExpired) return;
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

function getPromotionModalTexts(tier, stats = loadStats()) {
  const transition = getPromotionTransition(tier, stats);
  const nextIndex = getDifficultyTierIndex(tier.code) + 1;
  const nextTier = DIFFICULTY_TIERS[nextIndex] || null;
  const benefits = [`${transition.label} 해금`, `점수 배수 ${tier.multiplier.toFixed(2)}x`, '승급전 보너스 +0.10x'];
  if (normalizeDifficultyCode(tier.code) === 'n1') benefits.push('Duel 무료 힌트 1회');
  if (nextTier) benefits.push(`다음 목표: ${nextTier.label}`);
  return {
    title: `${transition.label} 승급전`,
    text: `지금 도전하면 클리어 시 ${transition.fromTier.label}에서 ${transition.toTier.label}로 승급합니다. 집중할 수 있을 때 시작하세요.`,
    benefit: benefits.join(' · '),
    caution: '일반 판보다 어려울 수 있습니다. 취소해도 승급 자격은 유지됩니다.',
  };
}

function openPromotionModal() {
  const target = getPromotionTarget(loadStats());
  if (!target) {
    setStatus('아직 승급 조건을 채우는 중입니다. 클리어를 쌓으면 승급전이 열립니다.');
    renderPromotionButton();
    return;
  }
  const texts = getPromotionModalTexts(target, loadStats());
  promotionModalTitle.textContent = texts.title;
  promotionModalText.textContent = texts.text;
  promotionBenefitText.textContent = texts.benefit;
  promotionCautionText.textContent = `${texts.caution} · 제한 시간 10분`;
  promotionModal.hidden = false;
}

function closePromotionModal() {
  if (!promotionModal) return;
  promotionModal.hidden = true;
  setStatus('승급전은 준비되어 있습니다. 집중할 수 있을 때 도전하세요.');
  renderPromotionNotice();
  renderPromotionButton();
}

function challengePromotion() {
  const target = getPromotionTarget(loadStats());
  if (!target) {
    closePromotionModal();
    return;
  }
  promotionModal.hidden = true;
  newGame({ clearSaved: true, mode: 'promotion', difficultyCode: target.code });
  const transition = getPromotionTransition(target, loadStats());
  setStatus(`승급전 시작: ${transition.label}에 도전합니다. 클리어하면 승급됩니다.`);
}

function updateNoticeTicker() {
  const bar = statusEl?.closest('.statusbar');
  if (!bar || !statusEl) return;
  bar.classList.remove('is-ticker');
  statusEl.style.removeProperty('--notice-duration');
  window.requestAnimationFrame(() => {
    const viewport = statusEl.parentElement;
    if (!viewport) return;
    const overflow = statusEl.scrollWidth > viewport.clientWidth + 4;
    bar.classList.toggle('is-ticker', overflow);
    if (overflow) {
      const duration = Math.min(22, Math.max(9, Math.round(statusEl.scrollWidth / 28)));
      statusEl.style.setProperty('--notice-duration', `${duration}s`);
    }
  });
}

function setStatus(message) {
  statusEl.textContent = message;
  updateNoticeTicker();
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
  const chasingCount = Math.max(0, getRankedEntries(RANKING_TICKER_LIMIT).length - 1);
  if (chasingCount > 1) {
    state.rankingTickerIndex = (state.rankingTickerIndex + 1) % chasingCount;
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
if (promotionBtn) promotionBtn.addEventListener('click', (event) => { event.stopPropagation(); openPromotionModal(); });
if (promotionNoticeBtn) promotionNoticeBtn.addEventListener('click', (event) => { event.stopPropagation(); openPromotionModal(); });
if (promotionCancelBtn) promotionCancelBtn.addEventListener('click', closePromotionModal);
if (promotionChallengeBtn) promotionChallengeBtn.addEventListener('click', challengePromotion);
if (promotionModal) promotionModal.addEventListener('click', (event) => {
  if (event.target === promotionModal) closePromotionModal();
});
if (promotionFailCloseBtn) promotionFailCloseBtn.addEventListener('click', closePromotionFailModal);
if (promotionFailModal) promotionFailModal.addEventListener('click', (event) => {
  if (event.target === promotionFailModal) closePromotionFailModal();
});
soundBtn.addEventListener('click', toggleSound);
passwordToggleBtn.addEventListener('click', togglePasswordVisibility);
signupForm.addEventListener('submit', handleSignup);
signupCancelBtn.addEventListener('click', (event) => { event.stopPropagation(); closePlayerEditor(); });
document.querySelector('.player-card').addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
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
