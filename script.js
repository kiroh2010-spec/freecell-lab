const suits = [
  { symbol: '♠', color: 'black', key: 'S' },
  { symbol: '♥', color: 'red', key: 'H' },
  { symbol: '♦', color: 'red', key: 'D' },
  { symbol: '♣', color: 'black', key: 'C' },
];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const RANKING_LIMIT = 50;
const RANKING_TICKER_LIMIT = 5;
const PROMOTION_TIME_LIMIT_SECONDS = 7 * 60;
const PROMOTION_TIME_WARNING_SECONDS = 30;
const TIME_BONUS_TIERS = [
  { seconds: 3 * 60, bonus: 200 },
  { seconds: 4 * 60, bonus: 100 },
  { seconds: 5 * 60, bonus: 50 },
];

const DIFFICULTY_TIERS = [
  { code: 'e1', label: '1LV', displayName: '1LV', requiredClears: 0, multiplier: 1.00, totalMax: 6, minLow: 3, minMovable: 4 },
  { code: 'e2', label: '2LV', displayName: '2LV', requiredClears: 3, multiplier: 1.08, totalMin: 3, totalMax: 5, minLow: 3, minMovable: 3 },
  { code: 'n1', label: '3LV', displayName: '3LV', requiredClears: 6, multiplier: 1.20, totalMin: 5, totalMax: 7, minLow: 3, minMovable: 3 },
];
const RETIRED_DIFFICULTY_CODE_MAP = { n2: 'n1', n3: 'n1' };


const STORAGE_KEYS = {
  player: 'freecell.player.v1',
  rankings: 'freecell.weeklyRankings.v1',
  game: 'freecell.currentGame.v1',
  stats: 'freecell.stats.v1',
  profiles: 'freecell.profiles.v1',
  patchNotesSeen: 'freecell.patchNotesSeen.v1',
  acceptedAlphaPatch: 'freecell.acceptedAlphaPatch.v1',
  pendingUpdatePatchNotes: 'freecell.pendingUpdatePatchNotes.v1',
};

const PATCH_NOTES = [
  {
    "version": "베타 v0.1",
    "date": "2026-07-23",
    "title": "베타 전환 · 랭킹·난이도·조작감 개선",
    "items": [
      "기존 알파 공간을 베타 v0.1로 전환",
      "새 알파 테스트 공간을 /alpha/ 링크로 분리",
      "랭킹 상세 목록이 길어져도 화면 안에서 스크롤되도록 수정",
      "랭킹에서 아이디 옆 LV를 표시하고 TIME/MOVE 형식으로 정리",
      "내 순위 행을 별도 테두리로 강조",
      "Tableau 선택 시 이동 가능한 컬럼 표시",
      "A 카드를 다른 숫자보다 더 잘 보이도록 강조",
      "LV1은 유지하고 LV2/LV3 난이도 기준을 더 부드럽게 조정",
      "레벨업 테스트는 현재 단계 난이도를 7분 안에 클리어하는 방식으로 변경",
      "최근 7일 플레이 로그 저장 기반 추가"
    ]
  }
];
const CURRENT_PATCH_NOTE_VERSION = PATCH_NOTES[0]?.version || '';
const AVAILABLE_ALPHA_VERSION = '0.7';
const CLIENT_ALPHA_VERSION = '0.5'; // dev-only update-check test baseline; public builds inject their channel version.

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
  undoLeft: 5,
  undoAllowance: 5,
  undoStack: [],
  gameMode: 'normal',
  difficultyCode: 'e1',
  serverLeader: null,
  lastRankNoticeAt: 0,
  rankingTickerIndex: 0,
  lastResult: null,
  devAutoPlayActive: false,
  devAutoPlayTimerId: null,
  devAutoPlayLastMoveKey: '',
  devAutoPlayRecentMoveKeys: [],
  devAutoPlayRecentLoopKeys: [],
  availablePatchNotes: null,
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const moveHud = $('moveHud');
const timerDisplay = $('timerDisplay');
const undoHud = $('hintHud');
const versionLabel = $('versionLabel');
const updateReloadBtn = $('updateReloadBtn');
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
const promotionTestBtn = $('promotionTestBtn');
const devAutoPlayBtn = $('devAutoPlayBtn');
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
const operatorNoticeBtn = $('operatorNoticeBtn');
const operatorNoticeModal = $('operatorNoticeModal');
const operatorNoticeCloseBtn = $('operatorNoticeCloseBtn');
const patchNotesBtn = $('patchNotesBtn');
const patchNotesModal = $('patchNotesModal');
const patchNotesList = $('patchNotesList');
const patchNotesCloseBtn = $('patchNotesCloseBtn');
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
  state.undoAllowance = getUndoAllowance(state.difficultyCode);
  state.undoLeft = state.undoAllowance;
  state.undoStack = [];
  if (promotionFailModal) promotionFailModal.hidden = true;
  if (clearSaved) localStorage.removeItem(STORAGE_KEYS.game);

  const dealDifficultyCode = getDealDifficultyCode(state.difficultyCode, mode);
  const dealTier = getDealTier(state.difficultyCode, mode);
  const dealScore = dealGame(dealDifficultyCode, dealTier);
  const tier = getDifficultyTier(state.difficultyCode);
  const transition = mode === 'promotion' ? getPromotionTransitionByTargetCode(state.difficultyCode) : null;
  const visibleDealTier = getDifficultyTier(dealDifficultyCode);
  const gentlerPromotionText = mode === 'promotion' && dealDifficultyCode !== state.difficultyCode
    ? ` 판은 ${visibleDealTier.label} 기준으로 준비했습니다.`
    : '';
  setStatus(mode === 'promotion'
    ? `레벨업 테스트 시작! ${transition.label}에 도전합니다.${gentlerPromotionText} 클리어하면 즉시 레벨업됩니다.`
    : `${tier.label} 단계입니다. 바로 Foundation에 보낼 수 있는 A 카드가 준비됐습니다.`);
  render();
}


function dealGame(difficultyCode = 'e1', tierOverride = null) {
  difficultyCode = normalizeDifficultyCode(difficultyCode);
  const tier = tierOverride || getDifficultyTier(difficultyCode);
  const isHarderTier = difficultyCode.startsWith('n');
  const maxAttempts = tier.promotionFriendly ? 800 : (isHarderTier ? 180 : 300);
  let bestDeal = null;
  let bestFit = -Infinity;

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

    const fit = getDealFitScore(score, tier, isHarderTier);
    if (fit > bestFit) {
      bestFit = fit;
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
  const minAces = tier.minAces ?? 1;
  return score.topAces >= minAces &&
    score.topLowCards >= tier.minLow &&
    score.movableTopCards >= tier.minMovable &&
    score.total >= totalMin &&
    score.total <= totalMax;
}

function getDealFitScore(score, tier, preferHarder = false) {
  const totalMin = tier.totalMin ?? -Infinity;
  const totalMax = tier.totalMax ?? Infinity;
  const minAces = tier.minAces ?? 1;
  const aceFit = Math.min(score.topAces, minAces) * 30;
  const lowFit = Math.min(score.topLowCards, tier.minLow) * 12;
  const movableFit = Math.min(score.movableTopCards, tier.minMovable) * 16;
  const totalPenalty = score.total < totalMin ? totalMin - score.total : Math.max(0, score.total - totalMax);
  const difficultyBias = preferHarder ? score.total : -Math.max(0, score.total);
  return aceFit + lowFit + movableFit + difficultyBias - totalPenalty * 3;
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

function getDealDifficultyCode(code = state.difficultyCode, mode = state.gameMode) {
  const normalized = normalizeDifficultyCode(code);
  if (mode !== 'promotion') return normalized;
  const targetIndex = getDifficultyTierIndex(normalized);
  const fromTier = DIFFICULTY_TIERS[Math.max(0, targetIndex - 1)] || DIFFICULTY_TIERS[0];
  return fromTier.code;
}

function getDealTier(code = state.difficultyCode, mode = state.gameMode) {
  const dealCode = getDealDifficultyCode(code, mode);
  return getDifficultyTier(dealCode);
}

function getUndoAllowance(code = state.difficultyCode) {
  return normalizeDifficultyCode(code) === 'n1' ? 6 : 5;
}

function getFreeUndoAllowance(code = state.difficultyCode) {
  return normalizeDifficultyCode(code) === 'n1' ? 1 : 0;
}

function getChargedUndoUsed(undoLeft = state.undoLeft, code = state.difficultyCode) {
  const used = Math.max(0, getUndoAllowance(code) - undoLeft);
  return Math.max(0, used - getFreeUndoAllowance(code));
}

function renderVersionLabel() {
  if (!versionLabel) return;
  versionLabel.textContent = 'DEV v0.9';
  renderPlayerDifficulty();
}

function parseVersionNumber(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function showUpdateReloadButton(version) {
  if (!updateReloadBtn) return;
  const wasHidden = updateReloadBtn.hidden;
  updateReloadBtn.dataset.version = version;
  updateReloadBtn.hidden = false;
  updateReloadBtn.textContent = `업데이트 v${version} 버전`;
  updateReloadBtn.title = `새 v${version} 업데이트를 받으려면 새로고침하세요.`;
  if (wasHidden) setStatus(`새 업데이트 v${version} 버전이 있습니다. 제목 옆 업데이트 버튼을 누르면 적용됩니다.`);
}

function hideUpdateReloadButton() {
  if (!updateReloadBtn) return;
  updateReloadBtn.hidden = true;
  updateReloadBtn.removeAttribute('data-version');
}

function applyAvailableAlphaPatchState(remoteAlpha, patchNotes = null) {
  state.availablePatchNotes = Array.isArray(patchNotes) && patchNotes.length ? patchNotes : null;
  const acceptedAlpha = sessionStorage.getItem(STORAGE_KEYS.acceptedAlphaPatch) || '';
  if (parseVersionNumber(remoteAlpha) > parseVersionNumber(CLIENT_ALPHA_VERSION) && acceptedAlpha !== remoteAlpha) {
    showUpdateReloadButton(remoteAlpha);
  } else {
    hideUpdateReloadButton();
  }
}

async function checkAvailableAlphaPatch() {
  if (!updateReloadBtn) return;
  try {
    const response = await fetch(`./VERSION.json?check=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`VERSION.json ${response.status}`);
    const version = await response.json();
    applyAvailableAlphaPatchState(version.betaVersion || version.alphaVersion || AVAILABLE_ALPHA_VERSION, version.patchNotes);
  } catch (error) {
    console.warn('패치 확인 실패, 내장 버전으로 확인합니다.', error);
    applyAvailableAlphaPatchState(AVAILABLE_ALPHA_VERSION);
  }
}

function reloadForAlphaPatch() {
  const acceptedVersion = updateReloadBtn?.dataset.version;
  if (acceptedVersion) {
    sessionStorage.setItem(STORAGE_KEYS.acceptedAlphaPatch, acceptedVersion);
    sessionStorage.setItem(STORAGE_KEYS.pendingUpdatePatchNotes, acceptedVersion);
  }
  hideUpdateReloadButton();
  const url = new URL(window.location.href);
  url.searchParams.set('v', `alpha-${Date.now()}`);
  window.location.replace(url.toString());
}

function formatDifficultyCode(code = state.difficultyCode, mode = state.gameMode) {
  const tier = getDifficultyTier(code);
  const name = tier.displayName || tier.label;
  if (mode === 'promotion') {
    return `${getPromotionTransitionByTargetCode(code).label} 레벨업 테스트`;
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
  promotionBtn.textContent = isReady ? `${transition.label} 레벨업` : '레벨업 준비';
  promotionBtn.title = isReady
    ? `${transition.label} 레벨업 테스트에 도전할 수 있습니다.`
    : '조건을 채우면 레벨업 테스트가 열립니다.';
}

function renderPromotionNotice() {
  if (promotionNotice) {
    promotionNotice.hidden = true;
    if (promotionNoticeBtn) promotionNoticeBtn.hidden = true;
  }

  if (state.gameMode === 'promotion') {
    const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
    if (state.won) {
      setStatus(`레벨업 성공: ${transition.label} 완료 · 다음 새 게임부터 적용됩니다.`);
    }
    return;
  }

  const stats = loadStats();
  const nextTier = getPromotionTarget(stats);
  if (nextTier) {
    const transition = getPromotionTransition(nextTier, stats);
    setStatus(`${transition.label} 레벨업 가능 · 집중할 수 있을 때 레벨업 버튼을 눌러 도전하세요.`);
    return;
  }

  if (normalizeDifficultyCode(state.difficultyCode) === 'n1') {
    setStatus('3LV 혜택 적용 중 · 첫 되돌리기 1회는 점수 차감이 없습니다.');
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
    wireDropTarget(slot, target);
    if (card) slot.appendChild(cardEl(card, { type: 'freecell', index }));
    freecellsEl.appendChild(slot);
  });

  suits.forEach(suit => {
    const target = { type: 'foundation', suit: suit.key };
    const slot = slotEl(suit.symbol, () => handleTarget(target));
    slot.classList.add('foundation-slot');
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
    if (isSelectedTableauTarget(columnTarget)) col.classList.add('move-target');
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
  updateTimerDisplay();
  renderVersionLabel();
  renderPromotionNotice();
  $('autoBtn').textContent = `되돌리기 ${state.undoLeft}`;
  $('autoBtn').disabled = state.undoLeft <= 0 || !state.undoStack.length;
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
  const isAce = card.value === 1;
  el.className = `card ${card.color === 'red' ? 'red' : ''} ${isFace ? 'face-card' : ''} ${isAce ? 'ace-card' : ''}`;
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
  pushUndoSnapshot();
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
  if (state.promotionExpired) {
    setStatus('레벨업 테스트 시간이 종료됐습니다. 다시 도전하려면 레벨업 버튼을 눌러주세요.');
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

  state.selected = isSameLocation(state.selected, location) ? null : location;
  const cards = getMovingCards(location);
  const label = cards.length > 1 ? `${cards[0].rank}${cards[0].symbol}부터 ${cards.length}장` : `${cards[0].rank}${cards[0].symbol}`;
  setStatus(state.selected ? `${label} 선택됨. 이동할 위치를 누르세요.` : '선택을 해제했습니다.');
  render();
}

function handleTarget(target) {
  if (state.promotionExpired) {
    setStatus('레벨업 테스트 시간이 종료됐습니다. 다시 도전하려면 레벨업 버튼을 눌러주세요.');
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

  pushUndoSnapshot();
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


function isSelectedFoundationTarget(target) {
  if (!state.selected || !target || target.type !== 'foundation') return false;
  const movingCards = getMovingCards(state.selected);
  return movingCards.length === 1 && canMoveCardsTo(movingCards, target);
}

function isSelectedTableauTarget(target) {
  if (!state.selected || !target || target.type !== 'tableau') return false;
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

function cloneGameSnapshot() {
  return {
    freecells: structuredClone(state.freecells),
    foundations: structuredClone(state.foundations),
    tableau: structuredClone(state.tableau),
    moves: state.moves,
    elapsedSeconds: state.elapsedSeconds,
    timerStarted: state.timerStarted,
    gameMode: state.gameMode,
    difficultyCode: state.difficultyCode,
    undoLeft: state.undoLeft,
    undoAllowance: state.undoAllowance,
    promotionExpired: state.promotionExpired,
  };
}

function pushUndoSnapshot() {
  state.undoStack.push(cloneGameSnapshot());
  if (state.undoStack.length > state.undoAllowance) state.undoStack.shift();
}

function restoreGameSnapshot(snapshot) {
  state.freecells = structuredClone(snapshot.freecells);
  state.foundations = structuredClone(snapshot.foundations);
  state.tableau = structuredClone(snapshot.tableau);
  state.moves = snapshot.moves;
  state.elapsedSeconds = snapshot.elapsedSeconds;
  state.timerStarted = Boolean(snapshot.timerStarted);
  state.gameMode = snapshot.gameMode === 'promotion' ? 'promotion' : 'normal';
  state.difficultyCode = normalizeDifficultyCode(snapshot.difficultyCode || state.difficultyCode);
  state.promotionExpired = Boolean(snapshot.promotionExpired);
  state.selected = null;
  state.dragging = null;
}

function undoMove() {
  if (state.promotionExpired) {
    setStatus('레벨업 테스트 시간이 종료됐습니다. 다시 도전하려면 레벨업 버튼을 눌러주세요.');
    playSound('invalid');
    return;
  }
  if (state.undoLeft <= 0) {
    setStatus(`이번 게임의 되돌리기 ${state.undoAllowance}회를 모두 사용했습니다.`);
    playSound('invalid');
    return;
  }
  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    setStatus('되돌릴 이동이 없습니다.');
    playSound('invalid');
    render();
    return;
  }
  state.undoLeft -= 1;
  restoreGameSnapshot(snapshot);
  stopTimer();
  if (state.timerStarted) resumeTimer();
  const chargedUndoUsed = getChargedUndoUsed();
  const freeUndoText = getFreeUndoAllowance() && chargedUndoUsed === 0 ? ' 3LV 무료 되돌리기 적용 중.' : '';
  setStatus(`직전 이동을 되돌렸습니다. 남은 되돌리기 ${state.undoLeft}회.${freeUndoText}`);
  playSound('move');
  render();
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
    undoLeft: state.undoLeft,
    undoAllowance: state.undoAllowance,
    undoStack: state.undoStack,
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
  state.undoAllowance = Number.isInteger(saved.undoAllowance) ? saved.undoAllowance : (Number.isInteger(saved.hintAllowance) ? saved.hintAllowance : getUndoAllowance(state.difficultyCode));
  state.undoLeft = Number.isInteger(saved.undoLeft) ? Math.min(saved.undoLeft, state.undoAllowance) : (Number.isInteger(saved.hintLeft) ? Math.min(saved.hintLeft, state.undoAllowance) : state.undoAllowance);
  state.undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];


  if (state.timerStarted && saved.savedAt) {
    const deltaSeconds = Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000));
    state.elapsedSeconds += deltaSeconds;
  }
  if (state.gameMode === 'promotion' && state.elapsedSeconds >= PROMOTION_TIME_LIMIT_SECONDS && !state.won) {
    state.promotionExpired = true;
    state.timerStarted = false;
  }

  setStatus(saved.status || '저장된 게임을 이어서 진행합니다.');
  if (state.promotionExpired) setStatus('레벨업 테스트 실패 · 패널티는 없습니다. 준비되면 다시 도전하세요.');
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

  const undoUsed = getChargedUndoUsed();
  const projectedScore = calculateScore(
    state.elapsedSeconds,
    state.moves,
    getScoreMultiplier(state.difficultyCode, state.gameMode),
    undoUsed
  );
  const gap = leader.score - projectedScore;
  if (gap > 0 && gap <= 500) {
    state.lastRankNoticeAt = now;
    setStatus(`현재 페이스 기준 1위까지 ${gap}점 차이입니다.`);
  }
}

function requestNewGame() {
  if (state.devAutoPlayActive) stopDevAutoPlay('자동 플레이를 중지하고 새 게임을 시작합니다.');
  const stats = loadStats();
  stats.gamesStarted += 1;
  saveStats(stats);
  newGame({ clearSaved: true, mode: 'normal', difficultyCode: DIFFICULTY_TIERS[stats.difficultyIndex].code });
  if (getPromotionTarget(stats)) {
    setStatus('레벨업 테스트가 준비되어 있습니다. 집중할 수 있을 때 레벨업 버튼을 눌러 도전하세요.');
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
  if (isTimed) timerDisplay.title = '레벨업 테스트 남은 시간';
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

  updateTimerDisplay();
  setStatus('레벨업 테스트 실패 · 패널티는 없습니다. 준비되면 다시 도전하세요.');
  persistGameState();
  render();
  showPromotionFailModal();
  playSound('invalid');
}

function showPromotionFailModal() {
  if (!promotionFailModal) return;
  const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
  if (promotionFailText) {
    promotionFailText.textContent = `${transition.label} 레벨업 테스트 제한 시간 7분이 지났습니다. 패널티는 없으니, 다음 판에서 다시 도전해보세요.`;
  }
  promotionFailModal.hidden = false;
}

function closePromotionFailModal() {
  if (promotionFailModal) promotionFailModal.hidden = true;
  const activeCode = getActiveDifficultyCode();
  newGame({ clearSaved: true, mode: 'normal', difficultyCode: activeCode });
  renderPromotionButton();
  setStatus('괜찮습니다. 패널티는 없어요. 준비되면 레벨업 버튼으로 다시 도전하세요.');
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
  const undoUsed = getChargedUndoUsed();
  const score = calculateScore(state.elapsedSeconds, state.moves, multiplier, undoUsed);
  const completedAt = new Date().toISOString();
  const entry = {
    id: state.player.id,
    time: state.elapsedSeconds,
    moves: state.moves,
    score,
    hintUsed: undoUsed,
    undoUsed,
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
    setStatus(`레벨업 성공: ${transition.label} 완료 · 다음 새 게임부터 적용됩니다.`);
  }
  saveStats(stats);
  saveCurrentProfile();
}

function getTimeBonus(time) {
  const tier = TIME_BONUS_TIERS.find(item => time <= item.seconds);
  return tier?.bonus ?? 0;
}

function calculateScore(time, moves, multiplier = 1, undoUsed = 0) {
  const base = Math.max(100, 10000 - moves * 5 - undoUsed * 100 + getTimeBonus(time));
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

function getRankingDifficultyLabel(entry) {
  return getDifficultyTier(entry?.difficultyCode).displayName || formatDifficultyCode(entry?.difficultyCode, entry?.mode);
}

function getRankingPlayerLabel(entry) {
  if (!entry) return '-';
  return `${entry.id} ${getRankingDifficultyLabel(entry)}`;
}

function getRankingMetricLabel(entry) {
  if (!entry) return '';
  return `TIME ${formatTime(entry.time || 0)} · MOVE ${entry.moves || 0}회${entry.hintUsed ? ` · 되돌리기 ${entry.hintUsed}` : ''}`;
}

function getLeaderText() {
  const [leader] = getRankedEntries(1);
  return leader ? `현재 1위: ${getRankingPlayerLabel(leader)} · ${leader.score}점` : '현재 1위 없음';
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
  const leaderMeta = getRankingMetricLabel(leader);
  const chasingMeta = chasing ? getRankingMetricLabel(chasing) : '';
  rankingList.innerHTML = `
    <li class="rank-line rank-leader">
      <strong>🏆 현재 1위</strong>
      <span class="rank-id">${getRankingPlayerLabel(leader)}</span>
      <span class="rank-score">${leader.score}점</span>
      <span class="rank-meta">${leaderMeta}</span>
    </li>
    <li class="rank-line rank-chaser">
      <strong>${chasing ? `${chasing.rank}위` : '2위'}</strong>
      <span class="rank-id">${chasing ? getRankingPlayerLabel(chasing) : '-'}</span>
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
  const benefit = normalizeDifficultyCode(result.difficultyCode) === 'n1' ? ' · 3LV 무료 되돌리기 1회' : '';
  return `레벨업 성공: ${transition.label} 완료${benefit}`;
}

function getResultRankMessage(result) {
  const hintText = result.hintUsed ? ` · 되돌리기 ${result.hintUsed}회` : '';
  const modeText = '';
  const leaderText = getLeaderText();
  if (result.testPromotion) {
    return `레벨업 테스트 완료입니다. 실제 랭킹에는 등록되지 않습니다. ${formatDifficultyCode(result.difficultyCode, result.mode)}`;
  }
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

function openOperatorNotice() {
  if (operatorNoticeModal) operatorNoticeModal.hidden = false;
}

function closeOperatorNotice() {
  if (operatorNoticeModal) operatorNoticeModal.hidden = true;
}

function hasSeenCurrentPatchNotes() {
  return localStorage.getItem(STORAGE_KEYS.patchNotesSeen) === CURRENT_PATCH_NOTE_VERSION;
}

function updatePatchNotesButton() {
  if (!patchNotesBtn) return;
  const unseen = !hasSeenCurrentPatchNotes();
  const versionText = CURRENT_PATCH_NOTE_VERSION.match(/v[0-9]+(?:\.[0-9]+)?/i)?.[0] || '';
  patchNotesBtn.textContent = versionText ? `패치 ${versionText}` : '패치노트';
  patchNotesBtn.classList.toggle('has-unseen-patch', unseen);
  patchNotesBtn.setAttribute('aria-pressed', String(unseen));
  patchNotesBtn.title = unseen ? '새 패치노트가 있습니다' : '패치노트 보기';
}

function getPatchNoteVersionNumber(note) {
  const match = String(note.version || '').match(/v([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
}

function renderPatchNotes(notesSource = null) {
  if (!patchNotesList) return;
  const source = Array.isArray(notesSource) && notesSource.length ? notesSource : PATCH_NOTES;
  const notes = [...source].sort((a, b) => getPatchNoteVersionNumber(b) - getPatchNoteVersionNumber(a));
  patchNotesList.innerHTML = notes.map(note => `
    <article class="patch-note-entry">
      <div class="patch-note-version">${note.version}</div>
      <h3>${note.title}</h3>
      <p>${note.date}</p>
      <ul>
        ${note.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </article>
  `).join('');
}

function openPatchNotes({ markSeen = true, notes = null } = {}) {
  if (!patchNotesModal) return;
  renderPatchNotes(notes);
  patchNotesModal.hidden = false;
  if (markSeen && CURRENT_PATCH_NOTE_VERSION) {
    localStorage.setItem(STORAGE_KEYS.patchNotesSeen, CURRENT_PATCH_NOTE_VERSION);
    updatePatchNotesButton();
  }
}

function closePatchNotes() {
  if (patchNotesModal) patchNotesModal.hidden = true;
}

function maybeOpenPatchNotesOnFirstVisit() {
  updatePatchNotesButton();
  const pendingUpdateVersion = sessionStorage.getItem(STORAGE_KEYS.pendingUpdatePatchNotes) || '';
  const currentPatchVersion = CURRENT_PATCH_NOTE_VERSION.replace('알파 v', '');
  if (pendingUpdateVersion && pendingUpdateVersion === currentPatchVersion) {
    sessionStorage.removeItem(STORAGE_KEYS.pendingUpdatePatchNotes);
    window.setTimeout(() => openPatchNotes(), 250);
    return;
  }
  if (CURRENT_PATCH_NOTE_VERSION && !hasSeenCurrentPatchNotes()) {
    window.setTimeout(() => openPatchNotes(), 250);
  }
}

function renderRankingDetail() {
  const entries = getRankedEntries(RANKING_LIMIT);
  rankingDetailReset.textContent = getResetText();
  if (!entries.length) {
    rankingDetailList.innerHTML = '<li><div class="ranking-detail-main">아직 등록된 주간 랭킹이 없습니다.</div></li>';
    return;
  }
  rankingDetailList.innerHTML = entries.map(entry => `
    <li class="${state.player?.id === entry.id ? 'current-player-rank' : ''}">
      <div class="ranking-detail-rank">${entry.rank}위</div>
      <div class="ranking-detail-main">
        <div class="ranking-detail-player">
          <strong>${getRankingPlayerLabel(entry)}</strong>
          <span class="ranking-detail-score">${entry.score}점</span>
        </div>
        <div class="ranking-detail-meta">${getRankingMetricLabel(entry)}</div>
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
  const benefits = [`${transition.label} 해금`, `점수 배수 ${tier.multiplier.toFixed(2)}x`, '레벨업 테스트 보너스 +0.10x'];
  if (normalizeDifficultyCode(tier.code) === 'n1') benefits.push('3LV 무료 되돌리기 1회');
  if (nextTier) benefits.push(`다음 목표: ${nextTier.label}`);
  return {
    title: `${transition.label} 레벨업 테스트`,
    text: `지금 도전하면 클리어 시 ${transition.fromTier.label}에서 ${transition.toTier.label}로 레벨업합니다. 집중할 수 있을 때 시작하세요.`,
    benefit: benefits.join(' · '),
    caution: '현재 단계 난이도를 7분 안에 클리어하면 레벨업합니다. 취소해도 레벨업 자격은 유지됩니다.',
  };
}

function openPromotionModal() {
  const target = getPromotionTarget(loadStats());
  if (!target) {
    setStatus('아직 레벨업 조건을 채우는 중입니다. 클리어를 쌓으면 레벨업 테스트가 열립니다.');
    renderPromotionButton();
    return;
  }
  const texts = getPromotionModalTexts(target, loadStats());
  promotionModalTitle.textContent = texts.title;
  promotionModalText.textContent = texts.text;
  promotionBenefitText.textContent = texts.benefit;
  promotionCautionText.textContent = `${texts.caution} · 제한 시간 7분`;
  promotionModal.hidden = false;
}

function closePromotionModal() {
  if (!promotionModal) return;
  promotionModal.hidden = true;
  setStatus('레벨업 테스트는 준비되어 있습니다. 집중할 수 있을 때 도전하세요.');
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
  setStatus(`레벨업 테스트 시작: ${transition.label}에 도전합니다. 클리어하면 레벨업됩니다.`);
}

function runPromotionTest() {
  if (!promotionTestBtn) return;
  const stats = loadStats();
  const currentIndex = Math.min(stats.difficultyIndex, DIFFICULTY_TIERS.length - 2);
  const target = DIFFICULTY_TIERS[currentIndex + 1] || DIFFICULTY_TIERS[1];
  stats.difficultyIndex = currentIndex;
  stats.clears = Math.max(stats.clears, target.requiredClears);
  saveStats(stats);
  if (state.gameMode === 'promotion') {
    newGame({ clearSaved: true, mode: 'normal', difficultyCode: DIFFICULTY_TIERS[currentIndex].code });
  }
  renderPromotionNotice();
  renderPromotionButton();
  const transition = getPromotionTransition(target, stats);
  setStatus(`테스트: ${transition.label} 레벨업 가능 상태로 강제했습니다. 레벨업 버튼/배너를 확인하세요.`);
}

function getDevAutoPlayLocations() {
  const locations = [];
  state.freecells.forEach((card, index) => {
    if (card) locations.push({ type: 'freecell', index });
  });
  state.tableau.forEach((column, index) => {
    for (let cardIndex = 0; cardIndex < column.length; cardIndex += 1) {
      const location = { type: 'tableau', index, cardIndex };
      if (canSelect(location)) locations.push(location);
    }
  });
  return locations;
}

function getDevAutoPlayTargets(from) {
  const cards = getMovingCards(from);
  if (!cards.length) return [];
  const targets = [];
  if (cards.length === 1) {
    targets.push({ type: 'foundation', suit: cards[0].suit });
  }
  state.tableau.forEach((_, index) => targets.push({ type: 'tableau', index }));
  if (cards.length === 1) {
    state.freecells.forEach((card, index) => {
      if (!card) targets.push({ type: 'freecell', index });
    });
  }
  return targets.filter(target => !isSameLocation(from, target) && canMoveCardsTo(cards, target));
}

function getDevAutoPlayLocationKey(location) {
  return `${location.type}:${location.index ?? location.suit}`;
}

function getDevAutoPlayMoveKey(from, to) {
  const cards = getMovingCards(from);
  const cardId = cards.map(card => card.id).join(',');
  return `${getDevAutoPlayLocationKey(from)}:${from.cardIndex ?? ''}->${getDevAutoPlayLocationKey(to)}:${cardId}`;
}

function getDevAutoPlayLoopKey(from, to) {
  const cards = getMovingCards(from);
  const cardId = cards.map(card => card.id).join(',');
  const endpoints = [getDevAutoPlayLocationKey(from), getDevAutoPlayLocationKey(to)].sort().join('<>');
  return `${cardId}:${endpoints}`;
}

function countRecentDevAutoPlayKey(list, key) {
  return list.filter(item => item === key).length;
}

function rememberDevAutoPlayMove(move) {
  state.devAutoPlayRecentMoveKeys.push(move.key);
  state.devAutoPlayRecentLoopKeys.push(move.loopKey);
  state.devAutoPlayRecentMoveKeys = state.devAutoPlayRecentMoveKeys.slice(-8);
  state.devAutoPlayRecentLoopKeys = state.devAutoPlayRecentLoopKeys.slice(-8);
}

function pickDevAutoPlayMove() {
  const candidates = [];
  getDevAutoPlayLocations().forEach(from => {
    getDevAutoPlayTargets(from).forEach(to => {
      const cards = getMovingCards(from);
      const kindPriority = to.type === 'foundation' ? 3 : (to.type === 'tableau' ? 2 : 1);
      let priority = 0;
      if (to.type === 'foundation') priority += 1000;
      if (to.type === 'tableau') priority += 500;
      if (to.type === 'freecell') priority += 100;
      if (from.type === 'freecell' && to.type === 'tableau') priority += 70;
      if (to.type === 'tableau' && cards.length > 1) priority += 35 + cards.length;
      if (to.type === 'tableau' && state.tableau[to.index]?.length === 0) priority += 12;
      const key = getDevAutoPlayMoveKey(from, to);
      const loopKey = getDevAutoPlayLoopKey(from, to);
      const repeatCount = countRecentDevAutoPlayKey(state.devAutoPlayRecentMoveKeys, key);
      const loopCount = countRecentDevAutoPlayKey(state.devAutoPlayRecentLoopKeys, loopKey);
      candidates.push({ from, to, priority, key, loopKey, kindPriority, repeatCount, loopCount });
    });
  });
  const freshCandidates = candidates.filter(candidate => candidate.repeatCount < 2 && candidate.loopCount < 2);
  const pool = freshCandidates.length ? freshCandidates : candidates;
  pool.sort((a, b) =>
    b.kindPriority - a.kindPriority ||
    a.repeatCount - b.repeatCount ||
    a.loopCount - b.loopCount ||
    b.priority - a.priority ||
    Math.random() - 0.5
  );
  const move = pool[0] || null;
  if (move && !freshCandidates.length && candidates.length) move.loopWarning = true;
  return move;
}

function updateDevAutoPlayButton() {
  if (!devAutoPlayBtn) return;
  devAutoPlayBtn.textContent = state.devAutoPlayActive ? '자동 중지' : '자동 플레이';
  devAutoPlayBtn.classList.toggle('is-active', state.devAutoPlayActive);
}

function stopDevAutoPlay(message = '') {
  state.devAutoPlayActive = false;
  if (state.devAutoPlayTimerId) window.clearTimeout(state.devAutoPlayTimerId);
  state.devAutoPlayTimerId = null;
  updateDevAutoPlayButton();
  if (message) setStatus(message);
}

function scheduleDevAutoPlayStep() {
  if (!state.devAutoPlayActive) return;
  const delay = 700 + Math.floor(Math.random() * 650);
  state.devAutoPlayTimerId = window.setTimeout(runDevAutoPlayStep, delay);
}

function runDevAutoPlayStep() {
  if (!state.devAutoPlayActive) return;
  if (state.won || state.promotionExpired) {
    stopDevAutoPlay('자동 플레이를 종료했습니다.');
    return;
  }
  const move = pickDevAutoPlayMove();
  if (!move) {
    stopDevAutoPlay('자동 플레이가 더 이동할 곳을 찾지 못해 멈췄습니다.');
    return;
  }
  if (move.loopWarning) {
    stopDevAutoPlay('자동 플레이가 같은 이동을 반복하려 해 멈췄습니다. 다른 방법을 직접 선택해주세요.');
    return;
  }
  state.selected = move.from;
  const moved = handleTarget(move.to);
  if (moved) {
    state.devAutoPlayLastMoveKey = move.key;
    rememberDevAutoPlayMove(move);
  } else {
    state.devAutoPlayLastMoveKey = '';
  }
  scheduleDevAutoPlayStep();
}

function toggleDevAutoPlay() {
  if (state.devAutoPlayActive) {
    stopDevAutoPlay('자동 플레이를 중지했습니다.');
    return;
  }
  state.devAutoPlayActive = true;
  state.devAutoPlayLastMoveKey = '';
  state.devAutoPlayRecentMoveKeys = [];
  state.devAutoPlayRecentLoopKeys = [];
  updateDevAutoPlayButton();
  setStatus('개발용 자동 플레이를 시작합니다. 사람이 플레이하듯 천천히 이동합니다.');
  scheduleDevAutoPlayStep();
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
  if (!state.selected) return;
  if (event.target.closest('.card, .slot, .column, button, a, input, .player-card, .signup-panel, .tutorial, .result-card')) return;
  state.selected = null;

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
checkAvailableAlphaPatch();
window.setInterval(checkAvailableAlphaPatch, 30 * 1000);
updateSoundButton();

$('newGameBtn').addEventListener('click', requestNewGame);
resultCloseBtn.addEventListener('click', confirmResultModal);
$('autoBtn').addEventListener('click', undoMove);
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
if (promotionTestBtn) promotionTestBtn.addEventListener('click', runPromotionTest);
if (devAutoPlayBtn) devAutoPlayBtn.addEventListener('click', toggleDevAutoPlay);
updateDevAutoPlayButton();
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
if (updateReloadBtn) updateReloadBtn.addEventListener('click', reloadForAlphaPatch);
if (operatorNoticeBtn) operatorNoticeBtn.addEventListener('click', openOperatorNotice);
if (operatorNoticeCloseBtn) operatorNoticeCloseBtn.addEventListener('click', closeOperatorNotice);
if (operatorNoticeModal) operatorNoticeModal.addEventListener('click', (event) => {
  if (event.target === operatorNoticeModal) closeOperatorNotice();
});
if (patchNotesBtn) patchNotesBtn.addEventListener('click', () => openPatchNotes());
if (patchNotesCloseBtn) patchNotesCloseBtn.addEventListener('click', closePatchNotes);
if (patchNotesModal) patchNotesModal.addEventListener('click', (event) => {
  if (event.target === patchNotesModal) closePatchNotes();
});
tutorialBtn.addEventListener('click', () => toggleTutorial());
tutorialCloseBtn.addEventListener('click', () => toggleTutorial(false));
maybeOpenPatchNotesOnFirstVisit();
if (!restoreSavedGame()) newGame({ clearSaved: false, difficultyCode: getActiveDifficultyCode() });
