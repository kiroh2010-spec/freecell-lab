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
const SPECIAL_SKILL_SCORE_PENALTY = 200;
const DEV_FORCE_SPECIAL_UNLOCK = false;
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
  level3SkillSeen: 'freecell.level3SkillSeen.v1',
};

const PATCH_NOTES = [
  {
    "version": "베타 v0.26",
    "date": "2026-07-24",
    "title": "서버 레벨 동기화 보정",
    "items": [
      "서버에 저장된 레벨이 더 높을 때 첫 화면 새 판이 낮은 레벨로 남는 문제 수정",
      "아직 시작하지 않은 판은 서버 레벨에 맞춰 자동으로 다시 준비"
    ]
  },
  {
    "version": "베타 v0.25",
    "date": "2026-07-24",
    "title": "카드 숫자·마크 확대",
    "items": [
      "카드 왼쪽 위 숫자/마크를 더 크게 표시",
      "중앙 문양도 키워서 모바일에서 더 잘 보이도록 조정"
    ]
  },
  {
    "version": "베타 v0.24",
    "date": "2026-07-23",
    "title": "결과 점수 표시 보정",
    "items": [
      "클리어 결과창 SCORE가 기존 점수로 보이던 문제 수정",
      "개편 랭킹에서는 기록 갱신 판정과 부족 점수도 개편 점수 기준으로 계산"
    ]
  },
  {
    "version": "베타 v0.23",
    "date": "2026-07-23",
    "title": "개편 랭킹 표시 보정",
    "items": [
      "개편 랭킹이 비어 있을 때 기존 기록을 개편 점수로 재계산해 표시",
      "기존 랭킹 점수는 계속 숨김",
      "앞으로 새 플레이는 개편 랭킹에 반영"
    ]
  },
  {
    "version": "베타 v0.22",
    "date": "2026-07-23",
    "title": "개편 랭킹 전환",
    "items": [
      "베타 랭킹을 개편 점수식 기준으로 전환",
      "기존 랭킹 점수는 화면에서 숨기고 내부 보존",
      "앞으로 베타 플레이 기록은 개편 랭킹에 반영",
      "게임 방법 설명, 랭킹 배지, 3LV 필살기, 셔플 연출 반영"
    ]
  },
  {
    "version": "베타 v0.12",
    "date": "2026-07-23",
    "title": "운영자 공지 업데이트",
    "items": [
      "패치 예정 사항에 밸런스 패치 안내 추가"
    ]
  },
  {
    "version": "베타 v0.11",
    "date": "2026-07-23",
    "title": "운영자 공지 추가",
    "items": [
      "스피커 옆 공지 버튼 추가",
      "운영자 감사 인사와 패치 예정 사항 안내 추가"
    ]
  },
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
const AVAILABLE_ALPHA_VERSION = '0.26';
const CLIENT_ALPHA_VERSION = '0.26'; // dev-only update-check test baseline; public builds inject their channel version.

const SUPABASE_CONFIG = {
  url: 'https://zhhvyvjbqdwurwlgseod.supabase.co',
  key: 'sb_publishable_JtPb39q98NCpE8fnKGnclg_E9PYFLjA',
};

const SERVER_RANKING_ENABLED = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.key);
const RANKING_SCORE_VERSION = 'reform';
const SHOW_LEGACY_SCORE_IN_REFORM = false;


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
  specialUsed: false,
  specialSelecting: false,
  specialAnimating: false,
  dealAnimating: false,
  level3SkillIntroPending: false,
  gameMode: 'normal',
  difficultyCode: 'e1',
  serverLeader: null,
  lastRankNoticeAt: 0,
  rankingTickerIndex: 0,
  lastResult: null,
  availablePatchNotes: null,
  scoreViewMode: 'reform',
};

const $ = (id) => document.getElementById(id);
const freecellsEl = $('freecells');
const foundationsEl = $('foundations');
const tableauEl = $('tableau');
const statusEl = $('status');
const noticeFlowEl = $('noticeFlow');
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
const specialBtn = $('specialBtn');
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
const level3SkillModal = $('level3SkillModal');
const level3SkillCloseBtn = $('level3SkillCloseBtn');
const promotionFailModal = $('promotionFailModal');
const promotionFailText = $('promotionFailText');
const promotionFailCloseBtn = $('promotionFailCloseBtn');
const rankingModal = $('rankingModal');
const rankingDetailList = $('rankingDetailList');
const rankingDetailReset = $('rankingDetailReset');
const rankingCloseBtn = $('rankingCloseBtn');
const operatorNoticeBtn = $('operatorNoticeBtn');
const operatorNoticeModal = $('operatorNoticeModal');
const operatorNoticeBody = $('operatorNoticeBody');
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
  state.specialUsed = false;
  state.specialSelecting = false;
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

function getUndoAllowance() {
  return 5;
}

function getFreeUndoAllowance() {
  return 0;
}

function getChargedUndoUsed(undoLeft = state.undoLeft, code = state.difficultyCode) {
  const used = Math.max(0, getUndoAllowance(code) - undoLeft);
  return Math.max(0, used - getFreeUndoAllowance(code));
}

function isLevel3Unlocked(code = state.difficultyCode) {
  return DEV_FORCE_SPECIAL_UNLOCK || normalizeDifficultyCode(code) === 'n1';
}

function renderVersionLabel() {
  if (!versionLabel) return;
  versionLabel.textContent = '베타 v0.26';
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
    setStatus(`3LV 필살기 사용 가능 · 한 게임에 1번, 한 줄을 셔플할 수 있습니다. 사용 시 ${SPECIAL_SKILL_SCORE_PENALTY}점 감점.`);
  }
}


function getRankTrophy(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
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
    if (state.specialSelecting) col.classList.add('special-target');
    col.addEventListener('click', (event) => {
      if (state.specialSelecting) {
        useSpecialSkillOnColumn(colIndex);
        return;
      }
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
  updateSpecialButton();
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
  if (state.specialAnimating || state.dealAnimating) return;
  if (state.specialSelecting && location.type === 'tableau') {
    useSpecialSkillOnColumn(location.index);
    return;
  }
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
  if (state.specialAnimating || state.dealAnimating) return false;
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
    specialUsed: state.specialUsed,
    specialSelecting: state.specialSelecting,
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
  state.specialSelecting = false;
  state.selected = null;
  state.dragging = null;
}

function updateSpecialButton() {
  if (!specialBtn) return;
  const unlocked = isLevel3Unlocked();
  specialBtn.innerHTML = state.specialUsed
    ? '<span>필살기</span><small>사용 완료</small>'
    : (unlocked
      ? '<span>필살기</span><small>한 게임 1회</small>'
      : '<span>필살기</span><small>(3LV 사용가능)</small>');
  const unavailable = !unlocked || state.specialUsed || state.specialAnimating || state.won || state.promotionExpired;
  specialBtn.disabled = false;
  specialBtn.classList.toggle('is-active', state.specialSelecting);
  specialBtn.classList.toggle('is-locked', unavailable);
  specialBtn.setAttribute('aria-disabled', String(unavailable));
  specialBtn.title = unlocked
    ? `한 게임에 1번 Tableau 한 줄을 섞습니다. 사용 시 ${SPECIAL_SKILL_SCORE_PENALTY}점 감점.`
    : '3LV부터 사용할 수 있습니다.';
}

function toggleSpecialSkill() {
  if (state.specialAnimating || state.dealAnimating) return;
  if (state.won) {
    setStatus('클리어된 게임에서는 셔플을 사용할 수 없습니다. 새 게임에서 사용해보세요.');
    playSound('invalid');
    return;
  }
  if (state.promotionExpired) {
    setStatus('레벨업 테스트 시간이 종료됐습니다. 다시 도전하려면 레벨업 버튼을 눌러주세요.');
    playSound('invalid');
    return;
  }
  if (!isLevel3Unlocked()) {
    setStatus('필살기는 3LV부터 활성화됩니다. 레벨업 테스트를 통과해 3LV가 되면 사용할 수 있어요.');
    playSound('invalid');
    return;
  }
  if (state.specialUsed) {
    setStatus('이번 게임에서는 이미 필살기를 사용했습니다.');
    playSound('invalid');
    return;
  }
  state.specialSelecting = !state.specialSelecting;
  state.selected = null;
  setStatus(state.specialSelecting
    ? `셔플하고 싶은 Tableau 한 줄을 선택하세요. 사용 시 ${SPECIAL_SKILL_SCORE_PENALTY}점이 감점됩니다.`
    : '필살기 선택을 취소했습니다.');
  updateSpecialButton();
  render();
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function getColumnCardElements(columnIndex) {
  const columnEl = tableauEl?.children?.[columnIndex];
  return columnEl ? [...columnEl.querySelectorAll('.card')] : [];
}

async function animateSpecialGather(columnIndex) {
  const cards = getColumnCardElements(columnIndex);
  if (!cards.length || prefersReducedMotion()) return;
  const columnRect = tableauEl.children[columnIndex].getBoundingClientRect();
  const centerY = columnRect.top + Math.min(140, Math.max(70, columnRect.height * 0.28));
  const animations = cards.map((card, index) => {
    const rect = card.getBoundingClientRect();
    const dy = centerY - (rect.top + rect.height / 2);
    const rotate = (index % 2 === 0 ? -1 : 1) * Math.min(7, 2 + index * 0.7);
    return card.animate([
      { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translateY(${dy}px) scale(.86) rotate(${rotate}deg)`, opacity: .9 },
    ], {
      duration: 260,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    }).finished.catch(() => null);
  });
  await Promise.all(animations);
}

async function animateSpecialSpread(columnIndex) {
  const cards = getColumnCardElements(columnIndex);
  if (!cards.length || prefersReducedMotion()) return;
  const columnRect = tableauEl.children[columnIndex].getBoundingClientRect();
  const centerY = columnRect.top + Math.min(140, Math.max(70, columnRect.height * 0.28));
  const animations = cards.map((card, index) => {
    const rect = card.getBoundingClientRect();
    const dy = centerY - (rect.top + rect.height / 2);
    const rotate = (index % 2 === 0 ? 1 : -1) * Math.min(7, 2 + index * 0.7);
    return card.animate([
      { transform: `translateY(${dy}px) scale(.86) rotate(${rotate}deg)`, opacity: .9 },
      { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
    ], {
      duration: 340,
      delay: Math.min(index * 16, 120),
      easing: 'cubic-bezier(.16,1,.3,1)',
    }).finished.catch(() => null);
  });
  await Promise.all(animations);
}

async function useSpecialSkillOnColumn(columnIndex) {
  if (state.specialAnimating) return false;
  if (!state.specialSelecting || state.specialUsed) return false;
  const column = state.tableau[columnIndex];
  if (!Array.isArray(column) || column.length < 2) {
    setStatus('카드가 2장 이상 있는 줄만 셔플할 수 있습니다.');
    playSound('invalid');
    return false;
  }
  startTimer();
  state.specialAnimating = true;
  state.selected = null;
  state.dragging = null;
  setStatus(`${columnIndex + 1}번 줄을 모아서 셔플합니다...`);
  try {
    await animateSpecialGather(columnIndex);
    let shuffled = shuffle(column);
    for (let attempt = 0; attempt < 6 && shuffled.every((card, index) => card.id === column[index]?.id); attempt += 1) {
      shuffled = shuffle(column);
    }
    state.tableau[columnIndex] = shuffled;
    state.specialUsed = true;
    state.specialSelecting = false;
    setStatus(`셔플 완료! ${columnIndex + 1}번 줄을 갱신했습니다. 점수에서 ${SPECIAL_SKILL_SCORE_PENALTY}점이 감점됩니다.`);
    playSound('move');
    render();
    await animateSpecialSpread(columnIndex);
  } finally {
    state.specialAnimating = false;
    updateSpecialButton();
  }
  return true;
}

function undoMove() {
  if (state.specialAnimating || state.dealAnimating) return;
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
  setStatus(`직전 이동을 되돌렸습니다. 남은 되돌리기 ${state.undoLeft}회.`);
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
    specialUsed: state.specialUsed,
    specialSelecting: state.specialSelecting,
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
  state.undoAllowance = getUndoAllowance(state.difficultyCode);
  state.undoLeft = Number.isInteger(saved.undoLeft) ? Math.min(saved.undoLeft, state.undoAllowance) : (Number.isInteger(saved.hintLeft) ? Math.min(saved.hintLeft, state.undoAllowance) : state.undoAllowance);
  state.undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
  state.specialUsed = Boolean(saved.specialUsed);
  state.specialSelecting = Boolean(saved.specialSelecting) && isLevel3Unlocked(state.difficultyCode) && !state.specialUsed;


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

function isCurrentGameSafeToSyncDifficulty() {
  const foundationsEmpty = Object.values(state.foundations).every(pile => Array.isArray(pile) && pile.length === 0);
  const freecellsEmpty = state.freecells.every(card => !card);
  return state.gameMode === 'normal'
    && !state.timerStarted
    && !state.won
    && state.moves === 0
    && state.elapsedSeconds === 0
    && foundationsEmpty
    && freecellsEmpty;
}

function syncCurrentGameDifficultyWithStats() {
  const activeCode = getActiveDifficultyCode();
  if (state.difficultyCode === activeCode) return false;
  if (!isCurrentGameSafeToSyncDifficulty()) return false;
  const tier = getDifficultyTier(activeCode);
  newGame({ clearSaved: true, mode: 'normal', difficultyCode: activeCode });
  setStatus(`서버 레벨 동기화 완료: ${tier.label} 새 판으로 준비했습니다.`);
  return true;
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
      if (!syncCurrentGameDifficultyWithStats()) renderVersionLabel();
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
      p_week_key: getRankingWeekKey(),
      p_score: getServerSubmitScore(result),
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

function mapServerRankingRow(row, { legacyScore = false } = {}) {
  const time = row.elapsed_time ?? row.time;
  const moves = row.moves;
  const hintUsed = row.hint_used || 0;
  const difficultyCode = row.difficulty_code || 'e1';
  const mode = row.mode || 'normal';
  const multiplier = getScoreMultiplier(difficultyCode, mode);
  const scoreV2 = calculateReformScore(time || 0, moves || 0, multiplier, hintUsed, 0);
  return {
    id: row.player_id,
    score: row.score,
    scoreV2: legacyScore ? scoreV2 : (Number.isFinite(row.score) ? row.score : scoreV2),
    time,
    moves,
    hintUsed,
    difficultyCode,
    mode,
    completedAt: row.created_at,
    legacyScore,
  };
}

function mergeReformRankingRows(reformRows, legacyRows) {
  const byPlayer = new Map();
  legacyRows.map(row => mapServerRankingRow(row, { legacyScore: true })).forEach(entry => {
    byPlayer.set(entry.id, entry);
  });
  reformRows.map(row => mapServerRankingRow(row)).forEach(entry => {
    const previous = byPlayer.get(entry.id);
    if (!previous || entry.scoreV2 > previous.scoreV2 || (entry.scoreV2 === previous.scoreV2 && entry.time < previous.time)) {
      byPlayer.set(entry.id, entry);
    }
  });
  return [...byPlayer.values()].sort(compareRankingEntries).slice(0, RANKING_LIMIT);
}

async function refreshServerRankings({ notify = false } = {}) {
  if (!SERVER_RANKING_ENABLED) return;
  try {
    const rows = await supabaseRpc('freecell_weekly_leaderboard', {
      p_week_key: getRankingWeekKey(),
      p_limit: RANKING_LIMIT,
    });
    let entries = rows.map(row => mapServerRankingRow(row));
    if (RANKING_SCORE_VERSION === 'reform') {
      const legacyRows = await supabaseRpc('freecell_weekly_leaderboard', {
        p_week_key: getWeekKey(),
        p_limit: RANKING_LIMIT,
      });
      entries = mergeReformRankingRows(rows, legacyRows);
    }
    const data = {
      weekKey: getRankingWeekKey(),
      entries,
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
  const leaderScore = getRankingScore(leader);
  const previousLeader = state.serverLeader;
  state.serverLeader = { id: leader.id, score: leaderScore };

  if (previousLeader && (previousLeader.id !== leader.id || previousLeader.score !== leaderScore)) {
    state.lastRankNoticeAt = now;
    setStatus(`1위 변경: ${leader.id} · ${leaderScore}점`);
    return;
  }

  const undoUsed = getChargedUndoUsed();
  const multiplier = getScoreMultiplier(state.difficultyCode, state.gameMode);
  const projectedScore = RANKING_SCORE_VERSION === 'reform'
    ? calculateReformScore(state.elapsedSeconds, state.moves, multiplier, undoUsed, state.specialUsed ? 1 : 0)
    : calculateScore(state.elapsedSeconds, state.moves, multiplier, undoUsed, state.specialUsed ? 1 : 0);
  const gap = leaderScore - projectedScore;
  if (gap > 0 && gap <= 500) {
    state.lastRankNoticeAt = now;
    setStatus(`현재 페이스 기준 1위까지 ${gap}점 차이입니다.`);
  }
}

function getBoardCardElements() {
  return [...document.querySelectorAll('.board .card')];
}

async function animateNewGameGather() {
  const cards = getBoardCardElements();
  if (!cards.length || prefersReducedMotion()) return;
  const boardRect = document.querySelector('.board')?.getBoundingClientRect();
  if (!boardRect) return;
  const centerX = boardRect.left + boardRect.width / 2;
  const centerY = boardRect.top + Math.min(boardRect.height * 0.35, 240);
  const animations = cards.map((card, index) => {
    const rect = card.getBoundingClientRect();
    const dx = centerX - (rect.left + rect.width / 2);
    const dy = centerY - (rect.top + rect.height / 2);
    const rotate = (index % 2 === 0 ? -1 : 1) * Math.min(10, 2 + (index % 8));
    return card.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(.72) rotate(${rotate}deg)`, opacity: .92 },
    ], {
      duration: 280,
      delay: Math.min(index * 3, 90),
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    }).finished.catch(() => null);
  });
  await Promise.all(animations);
}

async function animateNewGameSpread() {
  const cards = getBoardCardElements();
  if (!cards.length || prefersReducedMotion()) return;
  const boardRect = document.querySelector('.board')?.getBoundingClientRect();
  if (!boardRect) return;
  const centerX = boardRect.left + boardRect.width / 2;
  const centerY = boardRect.top + Math.min(boardRect.height * 0.35, 240);
  const animations = cards.map((card, index) => {
    const rect = card.getBoundingClientRect();
    const dx = centerX - (rect.left + rect.width / 2);
    const dy = centerY - (rect.top + rect.height / 2);
    const rotate = (index % 2 === 0 ? 1 : -1) * Math.min(9, 2 + (index % 7));
    return card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(.72) rotate(${rotate}deg)`, opacity: .88 },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    ], {
      duration: 360,
      delay: Math.min(index * 5, 140),
      easing: 'cubic-bezier(.16,1,.3,1)',
    }).finished.catch(() => null);
  });
  await Promise.all(animations);
}

async function requestNewGame() {
  if (state.dealAnimating) return;
  const stats = loadStats();
  stats.gamesStarted += 1;
  saveStats(stats);
  state.dealAnimating = true;
  state.selected = null;
  state.specialSelecting = false;
  setStatus('카드를 모아서 새 판을 섞는 중입니다...');
  try {
    await animateNewGameGather();
    newGame({ clearSaved: true, mode: 'normal', difficultyCode: DIFFICULTY_TIERS[stats.difficultyIndex].code });
    await animateNewGameSpread();
    if (getPromotionTarget(stats)) {
      setStatus('레벨업 테스트가 준비되어 있습니다. 집중할 수 있을 때 레벨업 버튼을 눌러 도전하세요.');
    }
  } finally {
    state.dealAnimating = false;
    updateSpecialButton();
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

function getRankingWeekKey(date = new Date()) {
  const weekKey = getWeekKey(date);
  return RANKING_SCORE_VERSION === 'reform' ? `${weekKey}-v2` : weekKey;
}

function getActiveRankingScore(entry) {
  return RANKING_SCORE_VERSION === 'reform' ? entry.scoreV2 : entry.score;
}

function getServerSubmitScore(result) {
  return getActiveRankingScore(result);
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
  const weekKey = getRankingWeekKey();
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
  const specialUsed = state.specialUsed ? 1 : 0;
  const score = calculateScore(state.elapsedSeconds, state.moves, multiplier, undoUsed, specialUsed);
  const scoreV2 = calculateReformScore(state.elapsedSeconds, state.moves, multiplier, undoUsed, specialUsed);
  const completedAt = new Date().toISOString();
  const entry = {
    id: state.player.id,
    time: state.elapsedSeconds,
    moves: state.moves,
    score,
    scoreV2,
    hintUsed: undoUsed,
    undoUsed,
    specialUsed,
    multiplier,
    difficultyCode: state.difficultyCode,
    mode: state.gameMode,
    completedAt,
  };

  data.entries.forEach(item => normalizeRankingEntry(item));
  const entryScore = getActiveRankingScore(entry);
  const previousBest = data.entries
    .filter(item => item.id === state.player.id)
    .sort(compareActiveRankingEntries)[0] || null;
  const previousBestScore = previousBest ? getActiveRankingScore(previousBest) : null;
  const personalBestShortage = previousBestScore !== null && entryScore <= previousBestScore
    ? previousBestScore - entryScore + 1
    : 0;

  let submitted = false;
  if (!personalBestShortage) {
    data.entries = data.entries.filter(item => item.id !== state.player.id);
    data.entries.push(entry);
    submitted = true;
  }

  data.entries.sort(compareActiveRankingEntries);
  const fullRankIndex = submitted
    ? data.entries.findIndex(item => item.completedAt === completedAt && item.id === entry.id)
    : -1;
  const cutoffEntry = data.entries[RANKING_LIMIT - 1] || null;
  const topShortage = submitted && fullRankIndex >= RANKING_LIMIT && cutoffEntry
    ? Math.max(1, getActiveRankingScore(cutoffEntry) - entryScore + 1)
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
    previousBestScore,
    serverSkipped: Boolean(specialUsed),
  };
  saveRankingData(data);
  updateClearProgress();
  persistGameState();
  if (!specialUsed) submitScoreToServer(result);
  return result;
}

function normalizeRankingEntry(entry) {
  entry.difficultyCode = normalizeDifficultyCode(entry.difficultyCode || 'e1');
  entry.mode = entry.mode === 'promotion' ? 'promotion' : 'normal';
  entry.multiplier = Number.isFinite(entry.multiplier) ? entry.multiplier : getScoreMultiplier(entry.difficultyCode, entry.mode);
  entry.hintUsed = Number.isInteger(entry.hintUsed) ? entry.hintUsed : (Number.isInteger(entry.undoUsed) ? entry.undoUsed : 0);
  entry.specialUsed = Number.isInteger(entry.specialUsed) ? entry.specialUsed : 0;
  entry.score = Number.isFinite(entry.score) ? entry.score : calculateScore(entry.time || 0, entry.moves || 0, entry.multiplier, entry.hintUsed, entry.specialUsed);
  entry.scoreV2 = Number.isFinite(entry.scoreV2) ? entry.scoreV2 : calculateReformScore(entry.time || 0, entry.moves || 0, entry.multiplier, entry.hintUsed, entry.specialUsed);
}

function getRankingScore(entry) {
  return state.scoreViewMode === 'reform' ? entry.scoreV2 : entry.score;
}

function compareCurrentRankingEntries(a, b) {
  return b.score - a.score || a.time - b.time || a.moves - b.moves;
}

function compareActiveRankingEntries(a, b) {
  return getActiveRankingScore(b) - getActiveRankingScore(a) || a.time - b.time || a.moves - b.moves;
}

function compareRankingEntries(a, b) {
  return getRankingScore(b) - getRankingScore(a) || a.time - b.time || a.moves - b.moves;
}


function updateClearProgress() {
  const stats = loadStats();
  stats.clears += 1;
  if (state.gameMode === 'promotion') {
    const promotedIndex = getDifficultyTierIndex(state.difficultyCode);
    stats.difficultyIndex = Math.max(stats.difficultyIndex, promotedIndex);
    const transition = getPromotionTransitionByTargetCode(state.difficultyCode);
    if (normalizeDifficultyCode(state.difficultyCode) === 'n1') {
      state.level3SkillIntroPending = true;
      localStorage.removeItem(STORAGE_KEYS.level3SkillSeen);
    }
    setStatus(`레벨업 성공: ${transition.label} 완료 · 다음 새 게임부터 적용됩니다.`);
  }
  saveStats(stats);
  saveCurrentProfile();
}

function getTimeBonus(time) {
  const tier = TIME_BONUS_TIERS.find(item => time <= item.seconds);
  return tier?.bonus ?? 0;
}

function calculateScore(time, moves, multiplier = 1, undoUsed = 0, specialUsed = 0) {
  const specialPenalty = specialUsed ? SPECIAL_SKILL_SCORE_PENALTY : 0;
  const base = Math.max(100, 10000 - moves * 5 - undoUsed * 100 - specialPenalty + getTimeBonus(time));
  return Math.round(base * multiplier);
}

function getReformTimeBonus(time) {
  const rawBonus = time <= 300
    ? Math.max(0, 1000 - time * 3)
    : Math.max(0, 100 - (time - 300) / 3);
  return rawBonus * 1.5;
}

function getReformMoveBonus(moves) {
  const rawBonus = moves <= 120
    ? Math.max(0, 900 - moves * 7)
    : Math.max(0, 60 - (moves - 120) * 0.75);
  return rawBonus * 1.5;
}

function calculateReformScore(time, moves, multiplier = 1, undoUsed = 0, specialUsed = 0) {
  const clearScore = 2000;
  const timeBonus = getReformTimeBonus(time);
  const moveBonus = getReformMoveBonus(moves);
  const undoPenalty = undoUsed * 40;
  const specialPenalty = specialUsed ? SPECIAL_SKILL_SCORE_PENALTY : 0;
  const base = Math.max(100, clearScore + timeBonus + moveBonus - undoPenalty - specialPenalty);
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[char]));
}

function getRankingPlayerLabel(entry) {
  if (!entry) return '-';
  return `${entry.id} ${getRankingDifficultyLabel(entry)}`;
}

function getRankingPlayerLabelHtml(entry) {
  if (!entry) return '-';
  return `<span class="ranking-player-name">${escapeHtml(entry.id)}</span><span class="ranking-level-badge">${escapeHtml(getRankingDifficultyLabel(entry))}</span>`;
}

function getRankingMetricLabel(entry) {
  if (!entry) return '';
  return `TIME ${formatTime(entry.time || 0)} · MOVE ${entry.moves || 0}회${entry.hintUsed ? ` · 되돌리기 ${entry.hintUsed}` : ''}${entry.specialUsed ? ' · 필살기 1회' : ''}`;
}

function getLeaderText() {
  const [leader] = getRankedEntries(1);
  return leader ? `현재 1위: ${getRankingPlayerLabel(leader)} · ${getRankingScore(leader)}점` : '현재 1위 없음';
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
      <span class="rank-id">${getRankingPlayerLabelHtml(leader)}</span>
      <span class="rank-score">${getRankingScore(leader)}점</span>
      <span class="rank-meta">${leaderMeta}</span>
    </li>
    <li class="rank-line rank-chaser">
      <strong>${chasing ? `${chasing.rank}위` : '2위'}</strong>
      <span class="rank-id">${chasing ? getRankingPlayerLabelHtml(chasing) : '-'}</span>
      <span class="rank-score">${chasing ? `${getRankingScore(chasing)}점` : '도전자를 기다리는 중'}</span>
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
  const benefit = normalizeDifficultyCode(result.difficultyCode) === 'n1' ? ' · 필살기 해금' : '';
  return `레벨업 성공: ${transition.label} 완료${benefit}`;
}

function getResultRankMessage(result) {
  const hintText = `${result.hintUsed ? ` · 되돌리기 ${result.hintUsed}회` : ''}${result.specialUsed ? ' · 필살기 1회' : ''}`;
  const modeText = '';
  const leaderText = getLeaderText();
  if (result.serverSkipped) {
    return `필살기를 사용한 dev 테스트 기록입니다. 로컬 랭킹에는 반영됐고, 서버 랭킹에는 아직 등록하지 않습니다. ${leaderText}. ${formatDifficultyCode(result.difficultyCode, result.mode)}${modeText}${hintText}`;
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
  resultScore.textContent = `${getRankingScore(result)}점`;
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

function openLevel3SkillIntro({ force = false } = {}) {
  if (!level3SkillModal) return;
  if (!force && localStorage.getItem(STORAGE_KEYS.level3SkillSeen)) return;
  level3SkillModal.hidden = false;
  localStorage.setItem(STORAGE_KEYS.level3SkillSeen, '1');
}

function closeLevel3SkillIntro() {
  if (level3SkillModal) level3SkillModal.hidden = true;
  setStatus(`3LV 필살기 사용 가능 · 필살기 버튼을 누른 뒤 셔플할 줄을 선택하세요. 사용 시 ${SPECIAL_SKILL_SCORE_PENALTY}점 감점.`);
}

function confirmResultModal() {
  if (resultModal) resultModal.hidden = true;
  renderRankings();
  setStatus(`클리어 완료 상태를 유지합니다. ${getLeaderText()}.`);
  if (state.level3SkillIntroPending) {
    state.level3SkillIntroPending = false;
    openLevel3SkillIntro({ force: true });
  }
}

function openRankingModal() {
  if (!rankingModal) return;
  renderRankingDetail();
  rankingModal.hidden = false;
}

function closeRankingModal() {
  if (rankingModal) rankingModal.hidden = true;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderOperatorNotice(notice) {
  if (!operatorNoticeBody || !notice) return;
  const operator = escapeHtml(notice.operator || '운영자');
  const message = escapeHtml(notice.message || '성원 감사합니다.');
  const sections = Array.isArray(notice.sections) ? notice.sections : [];
  operatorNoticeBody.innerHTML = `
    <p><strong>${operator} :</strong> ${message}</p>
    ${sections.map(section => `
      <h3>${escapeHtml(section.title || '')}</h3>
      <ol>
        ${(Array.isArray(section.items) ? section.items : []).map(item => `
          <li>${escapeHtml(item.text || '')}${item.note ? ` <span>${escapeHtml(item.note)}</span>` : ''}</li>
        `).join('')}
      </ol>
    `).join('')}
  `;
}

async function loadOperatorNotice() {
  try {
    const response = await fetch(`./NOTICE.json?notice=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`NOTICE.json ${response.status}`);
    renderOperatorNotice(await response.json());
  } catch (error) {
    console.warn('공지 로드 실패, 내장 공지를 표시합니다.', error);
  }
}

async function openOperatorNotice() {
  await loadOperatorNotice();
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
          <strong>${getRankingPlayerLabelHtml(entry)}</strong>
          <span class="ranking-detail-score">${getRankingScore(entry)}점${state.scoreViewMode === 'reform' && SHOW_LEGACY_SCORE_IN_REFORM ? ` <small>기존 ${entry.score}점</small>` : ''}</span>
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
  if (normalizeDifficultyCode(tier.code) === 'n1') benefits.push('필살기 해금');
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

function updateNoticeTicker() {
  const bar = statusEl?.closest('.statusbar');
  if (!bar || !statusEl) return;
  bar.classList.remove('is-ticker');
  noticeFlowEl?.style.removeProperty('--notice-duration');
  window.requestAnimationFrame(() => {
    const viewport = statusEl.parentElement;
    if (!viewport) return;
    const flow = noticeFlowEl || statusEl;
    const overflow = flow.scrollWidth > viewport.clientWidth + 4;
    bar.classList.toggle('is-ticker', overflow);
    if (overflow) {
      const duration = Math.min(22, Math.max(9, Math.round(flow.scrollWidth / 28)));
      flow.style.setProperty('--notice-duration', `${duration}s`);
    }
  });
}

function setStatus(message) {
  statusEl.textContent = message;
  updateNoticeTicker();
}

function handleBlankClick(event) {
  if (!state.selected && !state.specialSelecting) return;
  if (event.target.closest('.card, .slot, .column, button, a, input, .player-card, .signup-panel, .tutorial, .result-card')) return;
  state.selected = null;
  state.specialSelecting = false;

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
if (specialBtn) specialBtn.addEventListener('click', toggleSpecialSkill);
if (promotionBtn) promotionBtn.addEventListener('click', (event) => { event.stopPropagation(); openPromotionModal(); });
if (promotionNoticeBtn) promotionNoticeBtn.addEventListener('click', (event) => { event.stopPropagation(); openPromotionModal(); });
if (promotionCancelBtn) promotionCancelBtn.addEventListener('click', closePromotionModal);
if (promotionChallengeBtn) promotionChallengeBtn.addEventListener('click', challengePromotion);
if (promotionModal) promotionModal.addEventListener('click', (event) => {
  if (event.target === promotionModal) closePromotionModal();
});
if (level3SkillCloseBtn) level3SkillCloseBtn.addEventListener('click', closeLevel3SkillIntro);
if (level3SkillModal) level3SkillModal.addEventListener('click', (event) => {
  if (event.target === level3SkillModal) closeLevel3SkillIntro();
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
