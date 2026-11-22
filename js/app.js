/* ============================================================
   AURELIS MARKETS — application
   State, routing, live quotes, trading, gamification and views.
   ============================================================ */
(function () {
  'use strict';

  const D = window.AURELIS_DATA;
  const API = window.AURELIS_API;
  const CH = window.AURELIS_CHART;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const STORAGE_KEY = 'aurelis.state.v1';
  const byId = Object.create(null);
  D.ASSETS.forEach(a => { byId[a.id] = a; });

  /* ------------------------------ HELPERS ------------------------------ */
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const dateKey = ts => {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const nf = (v, dec) => {
    if (v == null || !isFinite(v)) return '—';
    return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 2 : dec });
  };
  const signed = (v, dec) => (v > 0 ? '+' : '') + nf(v, dec == null ? 2 : dec);
  const money = v => {
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return nf(v / 1e12, 2) + ' nghìn tỷ';
    if (a >= 1e9) return nf(v / 1e9, 2) + ' tỷ';
    if (a >= 1e6) return nf(v / 1e6, 1) + ' tr';
    if (a >= 1e3) return nf(v / 1e3, 0) + 'K';
    return nf(v, 0);
  };
  const fmtVND = v => money(v) + ' ₫';
  const fmtPct = v => (v > 0 ? '+' : '') + nf(v, 2) + '%';
  const changeCls = v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  const icon = (name, cls) => '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const uid = p => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const timeAgo = iso => {
    const t = typeof iso === 'number' ? iso : Date.parse(iso || '');
    if (!isFinite(t)) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    return Math.floor(s / 86400) + ' ngày trước';
  };
  const dateLabel = ts => {
    const d = new Date(ts);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  const priceUnit = a => a.currency === 'VND' ? '₫' : a.currency === 'PTS' ? 'điểm' : a.currency === 'FX' ? '' : '$';
  const fmtPrice = (a, v) => nf(v == null ? a.price : v, a.decimals == null ? 2 : a.decimals);
  const qtyDecimals = a => {
    const lot = a.lot || 1;
    if (lot >= 1) return 0;
    if (lot >= 0.01) return 2;
    if (lot >= 0.001) return 3;
    if (lot >= 0.0001) return 4;
    return 6;
  };
  const fmtQty = (a, q) => nf(q, qtyDecimals(a));
  const fxRate = () => API.fx || state.fx || 25594;
  const valueFactor = a => {
    const base = a.currency === 'VND' ? (a.group === 'forex' ? 1000 : 1) :
      a.currency === 'PTS' ? 1 : a.currency === 'FX' ? 100000 * fxRate() : fxRate();
    return base * (a.contractSize || 1);
  };
  const notionalVND = (a, price, qty) => price * qty * valueFactor(a);
  const stepFor = a => {
    if (['hose', 'hnx', 'upcom'].includes(a.group)) return 100;
    if (a.group === 'derivatives') return a.lot >= 1 ? 1 : a.lot;
    return a.lot || 1;
  };
  const roundQty = (a, qty) => {
    const step = stepFor(a);
    const dec = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
    const rounded = Math.floor((qty + 1e-9) / step) * step;
    return Number(rounded.toFixed(Math.max(dec, 6)));
  };
  const logoCandidates = a => {
    if (!a) return [];
    if (a.group === 'us' || a.group === 'etf') {
      return [
        'https://financialmodelingprep.com/image-stock/' + encodeURIComponent(a.symbol) + '.png',
        'https://companiesmarketcap.com/img/company-logos/64/' + encodeURIComponent(a.symbol) + '.png'
      ];
    }
    if (a.group === 'hose') {
      return [
        'https://financialmodelingprep.com/image-stock/' + encodeURIComponent(a.symbol) + '.png',
        'https://companiesmarketcap.com/img/company-logos/64/' + encodeURIComponent(a.symbol) + '.png'
      ];
    }
    return [];
  };
  const assetLogo = (a, cls) => {
    const candidates = logoCandidates(a);
    const img = candidates.length
      ? '<img src="' + candidates[0] + '" alt="" loading="lazy" decoding="async" data-logo-fallbacks="' + esc(candidates.slice(1).join('|')) + '">'
      : '';
    return '<span class="asset-logo ' + (cls || '') + (candidates.length ? ' has-logo' : '') + '" style="--asset-color:' + a.color + '">' +
      '<span class="asset-logo-mono">' + esc(a.icon) + '</span>' + img + '</span>';
  };
  const flashPrice = (el, price) => {
    if (!el || !Number.isFinite(price)) return;
    const prev = Number(el.getAttribute('data-last-price'));
    if (Number.isFinite(prev) && prev !== price) {
      el.classList.remove('flash-up', 'flash-down');
      void el.offsetWidth;
      el.classList.add(price > prev ? 'flash-up' : 'flash-down');
      clearTimeout(el._flashTimer);
      el._flashTimer = setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 760);
    }
    el.setAttribute('data-last-price', String(price));
  };
  function bindLogoFallbacks() {
    document.addEventListener('error', ev => {
      const img = ev.target;
      if (!img || img.tagName !== 'IMG' || !img.closest('.asset-logo')) return;
      const list = String(img.getAttribute('data-logo-fallbacks') || '').split('|').filter(Boolean);
      if (list.length) {
        img.setAttribute('data-logo-fallbacks', list.slice(1).join('|'));
        img.src = list[0];
      } else {
        const tile = img.closest('.asset-logo');
        img.remove();
        if (tile) tile.classList.remove('has-logo');
      }
    }, true);
  }
  const assetCell = (a, opts) => {
    opts = opts || {};
    const liveTag = a.demoOnly ? '<span class="sim-tag">SIM</span>' : (a.live ? '<span class="sim-tag" style="color:var(--up);border-color:rgba(46,230,166,.3)">LIVE</span>' : '');
    return '<div class="asset-cell">' + assetLogo(a) +
      '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + liveTag + '</div>' +
      '<div class="asset-name">' + esc(opts.name === false ? '' : a.name) + '</div></div></div>';
  };
  const sparkFor = a => {
    if (a.spark && a.spark.length > 2) return a.spark;
    return D.generateSpark(a, 28);
  };
  const groupOf = a => D.GROUPS[a.group] || { name: a.exchange, color: a.color };
  const badge = (text, cls) => '<span class="badge ' + (cls || '') + '">' + text + '</span>';
  const changeBadge = v => '<span class="badge ' + (v > 0 ? 'badge-up' : v < 0 ? 'badge-down' : '') + '">' + fmtPct(v) + '</span>';
  const sourceMode = () => API.mode;

  /* ------------------------------ STATE ------------------------------ */
  function savingsDefault() {
    return { contracts: [], history: [], deposits: 0, deposited: 0, goldBought: 0, lastProcess: 0 };
  }

  function jobsDefault() {
    return {
      energy: 6, energyAt: Date.now(), xp: 0, upgrades: [], cooldowns: {},
      shifts: 0, perfect: 0, earned: 0, streak: 0, lastShiftDay: '', history: [],
      fields: {}
    };
  }

  function auctionsDefault() {
    return { lots: [], history: [], escrow: 0, wins: 0, saved: 0, spent: 0, lastRefresh: 0 };
  }

  function companyDefault() {
    return {
      symbol: 'vnm',
      period: 'annual',
      statement: 'income',
      auto: true,
      dcf: { growth: 8, discount: 12, terminal: 3, years: 5 }
    };
  }

  function wealthDefault() {
    return {
      risk: null,
      quiz: { score: 0, answers: {}, at: 0 },
      target: null,
      dca: [],
      goals: [],
      rebalances: 0,
      lastRebalance: 0,
      lastDcaCheck: 0,
      autoDca: true,
      history: []
    };
  }

  function creditDefault() {
    return {
      loans: [], history: [], borrowed: 0, repaid: 0,
      onTimeRepaid: 0, lateRepaid: 0, defaults: 0, lastProcess: 0
    };
  }

  function libraryDefault() {
    return { read: [], saved: [], lastOpen: null };
  }

  /* v1.12 — tài khoản PRIME đầu tư thực mô phỏng (tách khỏi ví giao dịch nhanh). */
  function primeDefault() {
    return {
      active: false, profile: null, createdAt: 0, navStart: 0,
      cash: 0, reserved: 0, holdings: {}, orders: [], fills: [], settlements: [], history: [],
      deposited: 0, withdrawn: 0, realized: 0, fees: 0, tax: 0,
      tradeCount: 0, settlementCount: 0, turnover: 0, turnoverDay: '',
      benchBase: null, benchValue: 100, lastProcess: 0, lastSnapshot: 0
    };
  }

  /* v1.12 — trạng thái AURELIS Arcade. */
  function arcadeDefault() {
    return {
      played: 0, profit: 0, cooldowns: {}, history: [],
      dealWins: 0, fundRuns: 0, startupExits: 0, duelWins: 0,
      best: { deal: null, fund: null, startup: null, duel: null },
      bestDealProfit: 0, bestFundReturn: 0, bestStartupMultiple: 0,
      duelStreak: 0, duelBestStreak: 0
    };
  }

  /* v1.14 — quỹ mở mô phỏng, cổ tức và sự kiện thị trường trực tiếp. */
  function fundsDefault() {
    return {
      positions: {}, history: {}, navBase: {},
      flows: [], realized: 0, fees: 0, buys: 0, sells: 0, lastHistoryAt: 0
    };
  }
  function dividendsDefault() {
    return {
      nextAt: Date.now() + 7 * 60000, total: 0, count: 0, cycles: 0,
      history: [], drip: false, reinvested: 0, dripCycles: 0
    };
  }
  function eventsDefault() {
    return {
      active: null, nextAt: Date.now() + 45000, history: [], seen: 0, trades: 0
    };
  }

  function freshState() {
    const now = Date.now();
    const capital = 1000000000;
    const history = [];
    for (let i = 9; i >= 0; i--) history.push({ t: now - i * 86400000, v: capital });
    return {
      v: 1, onboarded: false, username: 'Nhà giao dịch', avatar: '🦊',
      capital, initialCapital: capital, cash: capital, fx: 25594,
      holdings: {}, positions: [], orders: [], alerts: [], trades: [],
      realized: 0, wins: 0, sells: 0, feesPaid: 0,
      aura: 1200, xp: 0,
      stats: { trades: 0, crypto_trades: 0, futures_trades: 0, drawings: 0, alerts: 0, backtests: 0, lessons: [] },
      achievements: {},
      quests: { date: todayKey(), progress: { trade: 0, watch: 0, chart: 0, portfolio: 0, lesson: 0, detective: 0, savings: 0, work: 0, auction: 0 }, claimed: [] },
      shop: ['title_rookie', 'frame_none', 'theme_midnight'],
      equipped: { title: 'title_rookie', frame: 'frame_none', theme: 'theme_midnight', pet: null, effects: [] },
      profile: { bio: '', motto: '', banner: 'aurora', accent: 'gold', showcase: [] },
      watchlist: ['vcb', 'fpt', 'hpg', 'btc', 'xauusd'],
      settings: { confetti: true, privacy: false, notifyPrice: true },
      notifications: [], journal: [],
      equityHistory: history, lastVisit: null, streak: 1, lastChest: null,
      boosts: { xp2Until: 0, coffeeUntil: 0 },
      lastAsset: 'vcb', lastRoute: 'dashboard',
      chartPrefs: { tf: '1D', type: 'candles', ma: true, ema: true, boll: false, vol: true, osc: 'rsi' },
      analysisTool: 'technical',
      playstyle: null,
      weekly: { key: weekKey(), baselines: {}, claimed: [], bonusClaimed: false },
      survival: { completed: {}, attempts: 0 },
      detective: { day: '', rounds: {}, draftClues: {}, solved: 0, attempts: 0, streak: 0, bestStreak: 0, bonusClaimed: false, lastBonus: 0, practiceWins: 0, practiceAura: 0, practiceDay: '', practiceStreak: 0, practiceBest: 0, lastPlayed: '' },
      savings: savingsDefault(),
      jobs: jobsDefault(),
      auctions: auctionsDefault(),
      company: companyDefault(),
      wealth: wealthDefault(),
      credit: creditDefault(),
      library: libraryDefault(),
      prime: primeDefault(),
      arcade: arcadeDefault(),
      coin: coinDefault(),
      funds: fundsDefault(),
      dividends: dividendsDefault(),
      events: eventsDefault(),
      notifReadAt: 0, createdAt: now
    };
  }

  function mergeState(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    Object.keys(patch).forEach(key => {
      const pv = patch[key], bv = base[key];
      if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
        mergeState(bv, pv);
      } else if (pv !== undefined) {
        base[key] = pv;
      }
    });
    return base;
  }

  function loadState() {
    const base = freshState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) mergeState(base, JSON.parse(raw));
    } catch (e) { /* bộ nhớ bị chặn */ }
    return base;
  }

  let state = loadState();
  let saveTimer = null;
  let currentRoute = 'dashboard';
  let mainChart = null;
  let chartReaderTab = 'structure';
  let chartReaderOpen = true;
  let cryptoPoll = null;
  let tickTimer = null;
  let clockTimer = null;
  let chartLiveTimer = null;
  let lastQuoteAt = 0;
  let currentMoversTab = 'gain';
  let terminalTab = 'positions';
  let wealthTimer = null;
  let companyAutoTimer = null;
  let companyAutoBusy = false;
  let companyAutoLastFund = 0;
  let primeTimer = null;
  let arcadeTimer = null;
  let arcadeRun = null;
  const PRIME_SETTLE_MS = 2 * 60000;
  const PRIME_PROFILE_BY_ID = Object.create(null);
  D.PRIME_PROFILES.forEach(p => { PRIME_PROFILE_BY_ID[p.id] = p; });
  const primeUi = { assetId: null, side: 'buy', type: 'market', profile: 'balanced', deposit: 0, qty: 0, price: 0 };
  const jobFilter = { field: 'all', task: 'all', level: 'all', q: '' };
  const FUND_BY_ID = Object.create(null);
  D.FUND_CATALOG.forEach(f => { FUND_BY_ID[f.id] = f; });
  const EVENT_BY_ID = Object.create(null);
  D.MARKET_EVENTS.forEach(ev => { EVENT_BY_ID[ev.id] = ev; });
  const DIVIDEND_CYCLE_MS = 7 * 60000;
  let fundModalId = null;
  let liveWidgetTimer = null;

  function saveNow() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* bỏ qua */ }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function ensureDaily() {
    const today = todayKey();
    if (!state.quests || state.quests.date !== today) {
      state.quests = { date: today, progress: { trade: 0, watch: 0, chart: 0, portfolio: 0, lesson: 0, detective: 0, savings: 0, work: 0, auction: 0 }, claimed: [] };
    }
    if (state.lastVisit !== today) {
      const yesterday = dateKey(Date.now() - 86400000);
      if (state.lastVisit === yesterday) state.streak = (state.streak || 1) + 1;
      else state.streak = 1;
      state.lastVisit = today;
    }
    ensureWeekly();
    ensureDetective();
  }

  function ensureCompany() {
    if (!state.company || typeof state.company !== 'object') state.company = companyDefault();
    const c = state.company;
    if (!byId[c.symbol]) c.symbol = 'vnm';
    if (c.period !== 'annual' && c.period !== 'quarterly') c.period = 'annual';
    if (!['income', 'balance', 'cash'].includes(c.statement)) c.statement = 'income';
    if (typeof c.auto !== 'boolean') c.auto = true;
    if (!c.dcf || typeof c.dcf !== 'object') c.dcf = companyDefault().dcf;
    const defaults = companyDefault().dcf;
    ['growth', 'discount', 'terminal', 'years'].forEach(k => {
      const v = Number(c.dcf[k]);
      c.dcf[k] = isFinite(v) ? v : defaults[k];
    });
    return c;
  }

  function ensureWealth() {
    if (!state.wealth || typeof state.wealth !== 'object') state.wealth = wealthDefault();
    const w = state.wealth;
    if (!w.quiz || typeof w.quiz !== 'object') w.quiz = { score: 0, answers: {}, at: 0 };
    if (!w.quiz.answers || typeof w.quiz.answers !== 'object') w.quiz.answers = {};
    if (!w.target || typeof w.target !== 'object') w.target = null;
    if (!Array.isArray(w.dca)) w.dca = [];
    if (!Array.isArray(w.goals)) w.goals = [];
    if (!Array.isArray(w.history)) w.history = [];
    ['rebalances', 'lastRebalance', 'lastDcaCheck'].forEach(k => { if (!Number.isFinite(w[k])) w[k] = 0; });
    if (typeof w.autoDca !== 'boolean') w.autoDca = true;
    w.dca = w.dca.filter(p => p && typeof p === 'object');
    w.dca.forEach(p => {
      if (!p.id) p.id = uid('dca');
      if (!byId[p.assetId] && !['gold_acc', 'vnd_flex'].includes(p.assetId)) p.active = false;
      if (!['weekly', 'monthly'].includes(p.freq)) p.freq = 'monthly';
      p.amount = Math.max(100000, Number(p.amount) || 1000000);
      ['nextAt', 'executions', 'invested', 'qty', 'lastRun', 'createdAt'].forEach(k => {
        if (!Number.isFinite(p[k])) p[k] = (k === 'createdAt' || k === 'nextAt') ? Date.now() : 0;
      });
      if (typeof p.active !== 'boolean') p.active = true;
    });
    w.goals = w.goals.filter(g => g && typeof g === 'object');
    w.goals.forEach(g => {
      if (!g.id) g.id = uid('goal');
      if (!g.name) g.name = 'Mục tiêu tài chính';
      g.target = Math.max(1000000, Number(g.target) || 100000000);
      g.months = clamp(Math.round(Number(g.months) || 12), 1, 120);
      g.saved = Math.max(0, Number(g.saved) || 0);
      g.monthly = Math.max(0, Number(g.monthly) || Math.round(g.target / g.months));
      if (!Number.isFinite(g.createdAt)) g.createdAt = Date.now();
      if (!Number.isFinite(g.lastContribution)) g.lastContribution = 0;
      if (typeof g.icon !== 'string') g.icon = '🎯';
    });
    return w;
  }

  function detectiveDefault() {
    return { day: '', rounds: {}, draftClues: {}, solved: 0, attempts: 0, streak: 0, bestStreak: 0, bonusClaimed: false, lastBonus: 0, practiceWins: 0, practiceAura: 0, practiceDay: '', practiceStreak: 0, practiceBest: 0, lastPlayed: '' };
  }

  function ensureDetective() {
    if (!state.detective || typeof state.detective !== 'object') state.detective = detectiveDefault();
    const d = state.detective;
    const today = todayKey();
    if (!d.rounds || typeof d.rounds !== 'object') d.rounds = {};
    if (!d.draftClues || typeof d.draftClues !== 'object') d.draftClues = {};
    if (d.day !== today) {
      const yesterday = dateKey(Date.now() - 86400000);
      if (d.lastPlayed && d.lastPlayed !== today && d.lastPlayed !== yesterday) d.streak = 0;
      d.day = today;
      d.rounds = {};
      d.draftClues = {};
      d.bonusClaimed = false;
      d.lastBonus = 0;
    }
    if (d.practiceDay !== today) {
      d.practiceDay = today;
      d.practiceWins = 0;
      d.practiceAura = 0;
    }
    ['solved', 'attempts', 'streak', 'bestStreak', 'practiceStreak', 'practiceBest', 'practiceWins', 'practiceAura', 'lastBonus'].forEach(k => {
      if (!Number.isFinite(d[k])) d[k] = 0;
    });
    return d;
  }

  /* ------------------------------ SAVINGS ENGINE ------------------------------ */
  const SAVINGS_BY_ID = Object.create(null);
  D.SAVINGS_PRODUCTS.forEach(p => { SAVINGS_BY_ID[p.id] = p; });
  let savingsRates = Object.assign({}, D.SAVINGS_BENCH, { live: false, symbols: {} });
  let savingsRatesAt = 0;
  let savingsFilter = 'all';
  let savingsAnalysisTab = 'growth';

  function savingsProduct(id) { return SAVINGS_BY_ID[id] || null; }
  function syncSavingsMarket() {
    const gold = byId['xauusd'];
    if (gold && gold.price > 0) savingsRates.goldUsd = gold.price;
    ['eurusd', 'gbpusd', 'audusd'].forEach(id => {
      const a = byId[id];
      if (a && a.price > 0) savingsRates[id] = a.price;
    });
    const jpy = byId['usdjpy'];
    if (jpy && jpy.price > 0) savingsRates.jpy = jpy.price;
    if (API.fx && API.fx > 1000) savingsRates.usdvnd = API.fx;
  }
  function savingsRate(product) {
    if (!product) return 0;
    try {
      const v = product.rate(savingsRates);
      return isFinite(v) ? Math.max(0, v) : 0;
    } catch (e) { return 0; }
  }
  function savingsFx(currency) {
    if (currency === 'VND') return 1;
    if (currency === 'USD') return savingsRates.usdvnd || 25594;
    if (currency === 'EUR') return (savingsRates.usdvnd || 25594) * (savingsRates.eurusd || 1.1);
    if (currency === 'JPY') return (savingsRates.usdvnd || 25594) / (savingsRates.jpy || 155);
    return 1;
  }
  function goldSpotVND() {
    return (savingsRates.goldUsd || 3900) * (savingsRates.usdvnd || 25594) / 31.1034768;
  }
  function goldBuyVND() { return goldSpotVND() * 1.008; }
  function goldSellVND() { return goldSpotVND() * 0.992; }

  function ensureSavings() {
    if (!state.savings || typeof state.savings !== 'object') state.savings = savingsDefault();
    const s = state.savings;
    if (!Array.isArray(s.contracts)) s.contracts = [];
    if (!Array.isArray(s.history)) s.history = [];
    ['deposits', 'deposited', 'goldBought', 'lastProcess'].forEach(k => { if (!Number.isFinite(s[k])) s[k] = 0; });
    s.contracts.forEach(c => {
      if (!c.id) c.id = uid('sav');
      if (!Number.isFinite(c.principalVND)) c.principalVND = 0;
      if (!Number.isFinite(c.principal)) c.principal = c.principalVND || 0;
      if (!Number.isFinite(c.rate)) c.rate = 0;
      if (!c.status) c.status = 'active';
      if (!Number.isFinite(c.termDays)) c.termDays = 0;
      if (!Number.isFinite(c.openedAt)) c.openedAt = Date.now();
      if (!Number.isFinite(c.maturityAt)) c.maturityAt = c.termDays ? c.openedAt + c.termDays * 86400000 : 0;
    });
    return s;
  }

  function savingsTermDays(c) {
    const raw = Math.max(0, (Date.now() - c.openedAt) / 86400000);
    return c.termDays > 0 ? Math.min(raw, c.termDays) : raw;
  }
  function contractInterest(c) {
    if (!c || c.kind === 'gold') return 0;
    return (Number(c.principal) || 0) * (Number(c.rate) || 0) / 100 * savingsTermDays(c) / 365;
  }
  function contractValue(c) {
    if (!c) return 0;
    if (c.kind === 'gold') return (Number(c.grams) || 0) * goldSellVND();
    return ((Number(c.principal) || 0) + contractInterest(c)) * savingsFx(c.currency);
  }
  function contractCost(c) { return Number(c && c.principalVND) || 0; }
  function contractPnl(c) { return contractValue(c) - contractCost(c); }
  function contractProgress(c) {
    if (!c || !c.termDays || !c.maturityAt) return 0;
    return clamp((Date.now() - c.openedAt) / Math.max(1, c.maturityAt - c.openedAt) * 100, 0, 100);
  }
  function contractStateLabel(c) {
    if (c.status === 'matured') return 'ĐÁO HẠN';
    if (!c.termDays) return c.kind === 'gold' ? 'THEO GIÁ' : 'LINH HOẠT';
    return 'ĐANG TÍCH LŨY';
  }
  function savingsCashValue() {
    return ensureSavings().contracts.filter(c => c.kind !== 'gold').reduce((s, c) => s + contractValue(c), 0);
  }
  function savingsGoldValue() {
    return ensureSavings().contracts.filter(c => c.kind === 'gold').reduce((s, c) => s + contractValue(c), 0);
  }
  function savingsValue() { return ensureSavings().contracts.reduce((s, c) => s + contractValue(c), 0); }
  function savingsInterestVND() {
    return ensureSavings().contracts.reduce((s, c) => s + (c.kind === 'gold' ? 0 : contractInterest(c) * savingsFx(c.currency)), 0);
  }
  function savingsAccrued() {
    return ensureSavings().contracts.reduce((s, c) => s + contractPnl(c), 0);
  }
  function savingsWeightedRate() {
    let principal = 0, weighted = 0;
    ensureSavings().contracts.forEach(c => {
      if (c.kind === 'gold' || !c.termDays && !c.rate) return;
      const v = (Number(c.principal) || 0) * savingsFx(c.currency);
      if (v > 0) { principal += v; weighted += v * (Number(c.rate) || 0); }
    });
    return principal ? weighted / principal : 0;
  }
  function savingsCurrencies() {
    return new Set(ensureSavings().contracts.filter(c => c.status !== 'closed' && c.currency !== 'GOLD').map(c => c.currency)).size;
  }
  function nextMaturity() {
    return ensureSavings().contracts.filter(c => c.status === 'active' && c.maturityAt > Date.now()).sort((a, b) => a.maturityAt - b.maturityAt)[0] || null;
  }
  function savingsProductValue(p, amountVND) {
    if (!p) return 0;
    const fx = p.kind === 'gold' ? 1 : savingsFx(p.currency);
    const principal = p.kind === 'gold' ? amountVND / goldBuyVND() : amountVND / fx;
    if (p.kind === 'gold') return principal * goldSellVND();
    const interest = principal * savingsRate(p) / 100 * (p.termDays / 365);
    return (principal + interest) * fx;
  }
  function pushSavingsHistory(type, contract, amountVND, note) {
    const s = ensureSavings();
    const p = savingsProduct(contract.productId);
    s.history.unshift({
      id: uid('sh'), type, productId: contract.productId,
      name: p ? p.name : contract.productId,
      amountVND: Math.round(amountVND || 0), note: note || '', at: Date.now()
    });
    s.history = s.history.slice(0, 40);
  }

  function processSavings() {
    const s = ensureSavings();
    const now = Date.now();
    let changed = false;
    s.contracts.forEach(c => {
      if (c.status !== 'active' || !c.termDays || !c.maturityAt) return;
      const p = savingsProduct(c.productId);
      let guard = 0;
      while (now >= c.maturityAt && guard < 240) {
        const interest = (Number(c.principal) || 0) * (Number(c.rate) || 0) / 100 * (c.termDays / 365);
        if (c.autoRoll && p) {
          const oldMaturity = c.maturityAt;
          c.principal = (Number(c.principal) || 0) + interest;
          c.openedAt = oldMaturity;
          c.maturityAt = oldMaturity + c.termDays * 86400000;
          c.rate = savingsRate(p);
          c.rolls = (Number(c.rolls) || 0) + 1;
          pushSavingsHistory('roll', c, interest * savingsFx(c.currency), 'Tự động tái tục');
          changed = true;
        } else {
          c.status = 'matured';
          c.maturedAt = c.maturityAt;
          c.lockedInterest = interest;
          pushSavingsHistory('mature', c, (Number(c.principal) + interest) * savingsFx(c.currency), 'Đáo hạn');
          pushNotif('🏦', 'Tiết kiệm đáo hạn', (p ? p.name : 'Khoản tích lũy') + ' · ' + fmtVND((Number(c.principal) + interest) * savingsFx(c.currency)) + ' đã sẵn sàng tất toán.');
          changed = true;
          break;
        }
        guard++;
      }
    });
    s.lastProcess = now;
    if (changed) { saveNow(); updateShell(); }
  }

  async function refreshSavingsRates(force) {
    try {
      savingsRates = await API.rates(force);
      savingsRatesAt = Date.now();
      if (currentRoute === 'savings') refreshSavingsPanels();
    } catch (e) {
      savingsRates = Object.assign({}, D.SAVINGS_BENCH, { live: false, symbols: {} });
      savingsRatesAt = Date.now();
      if (currentRoute === 'savings') refreshSavingsPanels();
    }
  }

  /* ------------------------------ CREDIT / LOANS ENGINE ------------------------------ */
  const LOANS_BY_ID = Object.create(null);
  D.LOAN_PRODUCTS.forEach(p => { LOANS_BY_ID[p.id] = p; });
  const CREDIT_MAX_ACTIVE = 6;
  let loansTimer = null;
  let creditTimer = null;

  function ensureCredit() {
    if (!state.credit || typeof state.credit !== 'object') state.credit = creditDefault();
    const c = state.credit;
    if (!Array.isArray(c.loans)) c.loans = [];
    if (!Array.isArray(c.history)) c.history = [];
    ['borrowed', 'repaid', 'onTimeRepaid', 'lateRepaid', 'defaults', 'lastProcess'].forEach(k => {
      if (!Number.isFinite(c[k])) c[k] = 0;
    });
    c.loans.forEach(l => {
      if (!l.id) l.id = uid('loan');
      if (!LOANS_BY_ID[l.productId]) l.productId = D.LOAN_PRODUCTS[0].id;
      ['principal', 'accrued', 'penalty', 'ratePerHour', 'penaltyPerHour', 'termHours', 'openedAt', 'dueAt', 'lastAccrual'].forEach(k => {
        if (!Number.isFinite(l[k])) l[k] = 0;
      });
      if (!l.openedAt) l.openedAt = Date.now();
      if (!l.termHours) l.termHours = 24;
      if (!l.dueAt) l.dueAt = l.openedAt + l.termHours * 3600000;
      if (!l.lastAccrual) l.lastAccrual = l.openedAt;
      if (!l.status) l.status = 'active';
    });
    return c;
  }

  function loanProduct(id) { return LOANS_BY_ID[id] || null; }
  function creditActiveLoans() {
    return ensureCredit().loans.filter(l => l.status === 'active' || l.status === 'overdue');
  }
  function loanIsOverdue(l, now) {
    return !!l && (l.status === 'overdue' || (l.status !== 'repaid' && (now || Date.now()) > (Number(l.dueAt) || 0)));
  }
  function loanLiveInterest(l, now) {
    now = now || Date.now();
    let interest = Number(l.accrued) || 0;
    let penalty = Number(l.penalty) || 0;
    const last = Number(l.lastAccrual) || Number(l.openedAt) || now;
    if (now <= last) return { interest, penalty };
    const due = Number(l.dueAt) || now;
    const preStart = Math.min(last, due);
    const preEnd = Math.min(now, due);
    if (preEnd > preStart) {
      interest += (Number(l.principal) || 0) * (Number(l.ratePerHour) || 0) * (preEnd - preStart) / 3600000;
    }
    const postStart = Math.max(last, due);
    if (now > postStart) {
      penalty += (Number(l.principal) || 0) * (Number(l.penaltyPerHour) || 0) * (now - postStart) / 3600000;
    }
    return { interest, penalty };
  }
  function loanOutstanding(l, now) {
    if (!l || l.status === 'repaid') return 0;
    const live = loanLiveInterest(l, now);
    return Math.max(0, (Number(l.principal) || 0) + live.interest + live.penalty);
  }
  function loanDebtTotal(now) {
    return creditActiveLoans().reduce((s, l) => s + loanOutstanding(l, now), 0);
  }
  function loanPrincipalTotal() {
    return creditActiveLoans().reduce((s, l) => s + (Number(l.principal) || 0), 0);
  }
  function creditScore() {
    const c = ensureCredit();
    const now = Date.now();
    const active = creditActiveLoans();
    const overdue = active.filter(l => loanIsOverdue(l, now)).length;
    const debt = loanDebtTotal(now);
    const assets = Math.max(1, netWorth() + debt);
    const pressure = clamp(debt / assets, 0, 1);
    let score = 650;
    score += Math.min(90, (c.onTimeRepaid || 0) * 6);
    score += Math.min(40, (c.repaid || 0) / 50000000 * 8);
    score -= (c.defaults || 0) * 55;
    score -= (c.lateRepaid || 0) * 12;
    score -= overdue * 35;
    score -= pressure * 90;
    return Math.round(clamp(score, 300, 850));
  }
  function creditGrade(score) {
    const s = score == null ? creditScore() : score;
    if (s >= 780) return { label: 'Xuất sắc', cls: 'excellent', color: '#2ee6a6', note: 'Hồ sơ rất tốt, hạn mức cao và ít rủi ro.' };
    if (s >= 720) return { label: 'Tốt', cls: 'good', color: '#5ac8fa', note: 'Lịch sử trả nợ ổn định, hạn mức khá.' };
    if (s >= 660) return { label: 'Khá', cls: 'fair', color: '#f3c56b', note: 'Có thể vay, nhưng nên giữ dư nợ thấp.' };
    if (s >= 600) return { label: 'Trung bình', cls: 'watch', color: '#ff9f43', note: 'Hạn mức bị siết; ưu tiên trả đúng hạn.' };
    if (s >= 540) return { label: 'Yếu', cls: 'weak', color: '#ff5d73', note: 'Rủi ro cao, lãi phạt và hạn mức xấu.' };
    return { label: 'Rất yếu', cls: 'poor', color: '#ff5d73', note: 'Cần tất toán nợ xấu trước khi vay tiếp.' };
  }
  function creditLimit() {
    const assets = Math.max(0, netWorth());
    const factor = 0.10 + clamp((creditScore() - 300) / 550, 0, 1) * 0.25;
    return Math.round(clamp(assets * factor, 0, 1000000000) / 100000) * 100000;
  }
  function creditAvailable() {
    return Math.max(0, creditLimit() - loanPrincipalTotal());
  }
  function creditUtilization() {
    const limit = creditLimit();
    return limit > 0 ? clamp(loanPrincipalTotal() / limit * 100, 0, 999) : 0;
  }

  function processLoans() {
    const c = ensureCredit();
    const now = Date.now();
    let changed = false;
    c.loans.forEach(l => {
      if (l.status !== 'active' && l.status !== 'overdue') return;
      const live = loanLiveInterest(l, now);
      if (Math.abs(live.interest - (Number(l.accrued) || 0)) > 0.0001 ||
          Math.abs(live.penalty - (Number(l.penalty) || 0)) > 0.0001) {
        l.accrued = live.interest;
        l.penalty = live.penalty;
        changed = true;
      }
      if (now > (Number(l.dueAt) || 0) && l.status !== 'overdue') {
        l.status = 'overdue';
        changed = true;
        pushNotif('⚠️', 'Khoản vay quá hạn', (loanProduct(l.productId) || {}).name + ' · lãi phạt bắt đầu cộng theo giờ. Tất toán sớm để tránh điểm tín dụng xấu đi.');
      }
      l.lastAccrual = now;
    });
    c.lastProcess = now;
    if (changed) save();
    return changed;
  }

  function pushCreditHistory(type, loan, amount, note) {
    const c = ensureCredit();
    const p = loanProduct(loan.productId);
    c.history.unshift({
      id: uid('ch'), type, productId: loan.productId,
      name: p ? p.name : loan.productId, amount: Math.round(amount || 0),
      note: note || '', at: Date.now()
    });
    c.history = c.history.slice(0, 60);
  }

  function borrowLoan(productId, amountVND) {
    processLoans();
    const p = loanProduct(productId);
    if (!p) return { ok: false, error: 'Sản phẩm vay không tồn tại.' };
    const c = ensureCredit();
    if (creditActiveLoans().length >= CREDIT_MAX_ACTIVE) {
      return { ok: false, error: 'Bạn đang có ' + CREDIT_MAX_ACTIVE + ' khoản vay. Tất toán bớt trước khi vay thêm.' };
    }
    const amount = Math.round(Number(amountVND) || 0);
    if (!isFinite(amount) || amount <= 0) return { ok: false, error: 'Số tiền vay không hợp lệ.' };
    if (amount < p.minAmount) return { ok: false, error: 'Khoản vay tối thiểu là ' + fmtVND(p.minAmount) + '.' };
    if (amount > p.maxAmount) return { ok: false, error: 'Sản phẩm này cho vay tối đa ' + fmtVND(p.maxAmount) + '.' };
    const available = creditAvailable();
    if (amount > available) return { ok: false, error: 'Hạn mức khả dụng chỉ còn ' + fmtVND(available) + '.' };
    const now = Date.now();
    const loan = {
      id: uid('loan'), productId: p.id, principal: amount, original: amount,
      accrued: 0, penalty: 0, ratePerHour: p.ratePerHour, penaltyPerHour: p.penaltyPerHour,
      termHours: p.termHours, openedAt: now, dueAt: now + p.termHours * 3600000,
      lastAccrual: now, status: 'active', totalPaid: 0
    };
    c.loans.unshift(loan);
    c.borrowed += amount;
    state.cash += amount;
    pushCreditHistory('borrow', loan, amount, p.termLabel + ' · ' + p.rateLabel);
    saveNow();
    updateShell();
    pushNotif('💳', 'Giải ngân thành công', p.name + ' · ' + fmtVND(amount) + ' đã vào tiền mặt. Đáo hạn ' + dateLabel(loan.dueAt) + '.');
    toast('Đã giải ngân ' + fmtVND(amount), p.name + ' · đáo hạn ' + dateLabel(loan.dueAt) + ' · ' + p.rateLabel, 'success', '💳');
    return { ok: true, loan };
  }

  function repayLoan(loanId, amountVND, opts) {
    opts = opts || {};
    processLoans();
    const c = ensureCredit();
    const l = c.loans.find(x => x.id === loanId);
    if (!l || l.status === 'repaid') return { ok: false, error: 'Khoản vay đã được tất toán.' };
    const now = Date.now();
    const live = loanLiveInterest(l, now);
    const total = Math.max(0, (Number(l.principal) || 0) + live.interest + live.penalty);
    let amount = Number(amountVND);
    if (!isFinite(amount) || amount <= 0) amount = total;
    amount = Math.min(amount, total);
    if (amount > state.cash) {
      return { ok: false, error: 'Tiền mặt không đủ. Bạn cần ' + fmtVND(amount) + ', hiện có ' + fmtVND(state.cash) + '.' };
    }
    let left = amount;
    const penaltyPaid = Math.min(live.penalty, left); left -= penaltyPaid;
    const interestPaid = Math.min(live.interest, left); left -= interestPaid;
    const principalPaid = Math.min(l.principal, left); left -= principalPaid;
    l.penalty = Math.max(0, live.penalty - penaltyPaid);
    l.accrued = Math.max(0, live.interest - interestPaid);
    l.principal = Math.max(0, (Number(l.principal) || 0) - principalPaid);
    l.lastAccrual = now;
    state.cash -= amount;
    c.repaid += amount;
    l.totalPaid = (Number(l.totalPaid) || 0) + amount;
    const closed = l.principal <= 1;
    if (closed) {
      l.principal = 0;
      l.status = 'repaid';
      l.repaidAt = now;
      if (now <= (Number(l.dueAt) || 0)) c.onTimeRepaid += 1;
      else c.lateRepaid += 1;
      pushCreditHistory('settle', l, amount, now <= l.dueAt ? 'Tất toán đúng hạn' : 'Tất toán quá hạn');
      pushNotif('✅', 'Đã tất toán khoản vay', (loanProduct(l.productId) || {}).name + ' · tổng trả ' + fmtVND(l.totalPaid) + '. Điểm tín dụng được cập nhật.');
      if (!opts.silent) {
        toast('Đã tất toán khoản vay', 'Tổng thanh toán ' + fmtVND(l.totalPaid) + ' · điểm tín dụng ' + creditScore() + '.', 'success', '✅');
        confetti(18);
      }
      addXP(12, 'Tất toán khoản vay');
      addAura(8);
    } else {
      pushCreditHistory('repay', l, amount, 'Thanh toán một phần');
      if (!opts.silent) toast('Đã thanh toán một phần', 'Còn lại ' + fmtVND(l.principal + l.accrued + l.penalty) + ' · gốc ' + fmtVND(l.principal) + '.', 'info', '💳');
    }
    saveNow();
    updateShell();
    return { ok: true, closed, paid: amount, remaining: l.principal + l.accrued + l.penalty };
  }

  function settleAllLoans() {
    processLoans();
    const active = creditActiveLoans();
    if (!active.length) return { ok: false, error: 'Bạn không có khoản vay nào cần tất toán.' };
    const total = active.reduce((s, l) => s + loanOutstanding(l), 0);
    if (total > state.cash) return { ok: false, error: 'Cần ' + fmtVND(total) + ' để tất toán tất cả, bạn có ' + fmtVND(state.cash) + '.' };
    let paid = 0;
    active.slice().forEach(l => {
      const res = repayLoan(l.id, loanOutstanding(l), { silent: true });
      if (res.ok) paid += res.paid;
    });
    saveNow();
    updateShell();
    toast('Đã tất toán toàn bộ', 'Tổng thanh toán ' + fmtVND(paid) + ' · điểm tín dụng ' + creditScore() + '.', 'success', '✅');
    confetti(26);
    return { ok: true, paid };
  }

  /* ------------------------------ FINANCE LIBRARY ------------------------------ */
  const LIBRARY_BY_ID = Object.create(null);
  D.LIBRARY.forEach(entry => { LIBRARY_BY_ID[entry.id] = entry; });
  const LIBRARY_CAT_BY_ID = Object.create(null);
  D.LIBRARY_CATEGORIES.forEach(cat => { LIBRARY_CAT_BY_ID[cat.id] = cat; });
  const LIBRARY_LEVELS = ['Cơ bản', 'Trung bình', 'Nâng cao'];
  let libraryCategory = 'all';
  let libraryLevel = 'all';
  let libraryQuery = '';

  function ensureLibrary() {
    if (!state.library || typeof state.library !== 'object') state.library = libraryDefault();
    const lib = state.library;
    if (!Array.isArray(lib.read)) lib.read = [];
    if (!Array.isArray(lib.saved)) lib.saved = [];
    if (!lib.lastOpen) lib.lastOpen = null;
    return lib;
  }
  function libraryEntry(id) { return LIBRARY_BY_ID[id] || null; }
  function libraryCategoryDef(id) { return LIBRARY_CAT_BY_ID[id] || D.LIBRARY_CATEGORIES[0]; }
  function normSearch(value) {
    return String(value == null ? '' : value).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }
  function libraryFiltered() {
    const q = normSearch(libraryQuery).trim();
    return D.LIBRARY.filter(entry => {
      if (libraryCategory !== 'all' && entry.category !== libraryCategory) return false;
      if (libraryLevel !== 'all' && entry.level !== libraryLevel) return false;
      if (!q) return true;
      const dataText = (entry.metrics || []).map(m => m.label + ' ' + m.value + ' ' + (m.hint || '')).join(' ');
      const visual = entry.visual ? [entry.visual.title, entry.visual.note, entry.visual.unit, (entry.visual.labels || []).join(' ')].join(' ') : '';
      const hay = normSearch([entry.title, entry.subtitle, entry.summary, entry.formula, entry.detail, dataText, visual, (entry.tags || []).join(' ')].join(' '));
      return hay.includes(q);
    });
  }
  function libraryStats() {
    const lib = ensureLibrary();
    return {
      total: D.LIBRARY.length,
      read: lib.read.filter(id => LIBRARY_BY_ID[id]).length,
      saved: lib.saved.filter(id => LIBRARY_BY_ID[id]).length,
      categories: D.LIBRARY_CATEGORIES.length,
      withData: D.LIBRARY.filter(entry => (entry.metrics && entry.metrics.length) || entry.visual).length
    };
  }
  function markLibraryRead(id) {
    const lib = ensureLibrary();
    lib.lastOpen = id;
    if (!lib.read.includes(id)) {
      lib.read.unshift(id);
      lib.read = lib.read.slice(0, 200);
      save();
      return true;
    }
    save();
    return false;
  }
  function toggleLibrarySaved(id) {
    const lib = ensureLibrary();
    const idx = lib.saved.indexOf(id);
    if (idx >= 0) lib.saved.splice(idx, 1);
    else lib.saved.unshift(id);
    save();
    return idx < 0;
  }

  function weekKey() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return 'w' + dateKey(d.getTime());
  }

  function weeklyMetricSnapshot() {
    const out = {};
    WEEKLY_CHALLENGES.forEach(def => { out[def.metric] = achievementMetric(def.metric); });
    return out;
  }

  function ensureWeekly() {
    const key = weekKey();
    if (!state.weekly || state.weekly.key !== key || !state.weekly.baselines || !Object.keys(state.weekly.baselines).length) {
      state.weekly = { key, baselines: weeklyMetricSnapshot(), claimed: [], bonusClaimed: false };
    }
    if (!Array.isArray(state.weekly.claimed)) state.weekly.claimed = [];
  }

  /* ------------------------------ JOBS ENGINE ------------------------------ */
  const JOBS_BY_ID = Object.create(null);
  D.JOBS.forEach(job => { JOBS_BY_ID[job.id] = job; });
  const JOB_LEVEL_XP = [0, 0, 120, 340, 760, 1400];
  const JOB_FIELD_BY_ID = Object.create(null);
  D.JOB_FIELDS.forEach(field => { JOB_FIELD_BY_ID[field.id] = field; });
  const FIELD_LEVEL_XP = [0, 0, 80, 200, 380, 620, 940, 1360, 1900, 2560, 3360];
  const FIELD_MAX_LEVEL = FIELD_LEVEL_XP.length - 1;
  const FIELD_BONUS_PER_LEVEL = 0.03;
  const JOB_ENERGY_MAX = 6;
  const JOB_ENERGY_MS = 8 * 60000;
  let jobShift = null;
  let jobsTimer = null;
  let lastJobEnergy = null;

  function shuffleList(list) {
    const out = (list || []).slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* v1.13 — mỗi ca trộn câu riêng của nghề với câu theo lĩnh vực và câu chung.
     Nhờ vậy 61 nghề không còn lặp lại mãi vài câu cũ. */
  const JOB_QUESTION_BANK = D.JOB_QUESTION_BANK || { general: [] };
  const jobPoolCache = Object.create(null);

  function jobQuestionPool(job) {
    if (!job) return [];
    if (job._v13Pool) return job._v13Pool;
    const base = Array.isArray(job.questions) ? job.questions : [];
    const fieldQs = (JOB_QUESTION_BANK[job.field] || []);
    const generalQs = JOB_QUESTION_BANK.general || [];
    const pool = base.slice();
    const seen = new Set(pool.map(q => q.q));
    fieldQs.forEach(q => { if (!seen.has(q.q)) { seen.add(q.q); pool.push(q); } });
    // Câu chung chỉ lấy một phần để ca làm vẫn đậm chất nghề.
    const generalLimit = Math.max(6, Math.min(18, generalQs.length));
    const generalPick = jobPoolCache[job.field] || shuffleList(generalQs).slice(0, generalLimit);
    jobPoolCache[job.field] = generalPick;
    generalPick.forEach(q => { if (!seen.has(q.q)) { seen.add(q.q); pool.push(q); } });
    job._v13Pool = pool;
    return pool;
  }

  function jobQuestionCount(job) {
    return job && job.task === 'choice' ? jobQuestionPool(job).length : 0;
  }

  function ensureJobs() {
    if (!state.jobs || typeof state.jobs !== 'object') state.jobs = jobsDefault();
    const j = state.jobs;
    if (!Array.isArray(j.upgrades)) j.upgrades = [];
    if (!Array.isArray(j.history)) j.history = [];
    if (!j.cooldowns || typeof j.cooldowns !== 'object') j.cooldowns = {};
    if (!j.fields || typeof j.fields !== 'object') j.fields = {};
    D.JOBS.forEach(job => {
      if (!job.field) return;
      const f = j.fields[job.field];
      if (!f || typeof f !== 'object') {
        j.fields[job.field] = { xp: 0, shifts: 0 };
      } else {
        if (!Number.isFinite(f.xp)) f.xp = 0;
        if (!Number.isFinite(f.shifts)) f.shifts = 0;
      }
    });
    ['energy', 'energyAt', 'xp', 'shifts', 'perfect', 'earned', 'streak'].forEach(k => {
      if (!Number.isFinite(j[k])) j[k] = k === 'energyAt' ? Date.now() : 0;
    });
    if (!j.lastShiftDay) j.lastShiftDay = '';
    j.energy = clamp(j.energy, 0, JOB_ENERGY_MAX);
    const now = Date.now();
    if (!j.energyAt || j.energyAt > now) j.energyAt = now;
    if (j.energy < JOB_ENERGY_MAX) {
      const gained = Math.floor((now - j.energyAt) / JOB_ENERGY_MS);
      if (gained > 0) {
        j.energy = Math.min(JOB_ENERGY_MAX, j.energy + gained);
        j.energyAt = j.energy >= JOB_ENERGY_MAX ? now : j.energyAt + gained * JOB_ENERGY_MS;
      }
    } else {
      j.energyAt = now;
    }
    return j;
  }

  function jobCareerLevel(xp) {
    let level = 1;
    for (let i = 2; i < JOB_LEVEL_XP.length; i++) if (xp >= JOB_LEVEL_XP[i]) level = i;
    return level;
  }

  function jobCareerInfo() {
    const j = ensureJobs();
    const level = jobCareerLevel(j.xp);
    const baseXp = JOB_LEVEL_XP[level] || 0;
    const nextXp = level < 5 ? JOB_LEVEL_XP[level + 1] : null;
    const progress = nextXp ? clamp((j.xp - baseXp) / (nextXp - baseXp) * 100, 0, 100) : 100;
    return { level, xp: j.xp, baseXp, nextXp, progress, max: 5 };
  }

  function jobFieldDef(jobOrId) {
    const id = typeof jobOrId === 'string' ? jobOrId : (jobOrId && jobOrId.field);
    return JOB_FIELD_BY_ID[id] || D.JOB_FIELDS[0];
  }

  function jobFieldInfo(jobOrId) {
    const id = typeof jobOrId === 'string' ? jobOrId : (jobOrId && jobOrId.field);
    const j = ensureJobs();
    const f = j.fields[id] || { xp: 0, shifts: 0 };
    let level = 1;
    for (let i = 2; i <= FIELD_MAX_LEVEL; i++) if (f.xp >= FIELD_LEVEL_XP[i]) level = i;
    const baseXp = FIELD_LEVEL_XP[level] || 0;
    const nextXp = level < FIELD_MAX_LEVEL ? FIELD_LEVEL_XP[level + 1] : null;
    const progress = nextXp ? clamp((f.xp - baseXp) / (nextXp - baseXp) * 100, 0, 100) : 100;
    return {
      id, def: jobFieldDef(id), xp: f.xp, shifts: f.shifts, level,
      baseXp, nextXp, progress, max: FIELD_MAX_LEVEL,
      bonusPct: (level - 1) * FIELD_BONUS_PER_LEVEL * 100
    };
  }

  function jobFieldBonusPct(job) { return jobFieldInfo(job).bonusPct; }

  function jobFieldSummary() {
    const j = ensureJobs();
    return D.JOB_FIELDS.map(def => {
      const info = jobFieldInfo(def.id);
      const jobs = D.JOBS.filter(job => job.field === def.id);
      return Object.assign({}, info, { jobs, xp: j.fields[def.id] ? j.fields[def.id].xp : 0 });
    }).sort((a, b) => b.level - a.level || b.xp - a.xp);
  }

  function jobCooldownLeft(job) {
    const until = ensureJobs().cooldowns[job.id] || 0;
    return Math.max(0, until - Date.now());
  }
  function jobUpgraded(job) { return ensureJobs().upgrades.includes(job.id); }
  function jobPayEstimate(job) {
    const career = jobCareerInfo();
    const field = jobFieldInfo(job);
    const levelMult = 1 + (career.level - 1) * 0.12;
    const fieldMult = 1 + field.bonusPct / 100;
    const upgradeMult = jobUpgraded(job) ? 1 + job.upgrade.bonus : 1;
    return Math.round(job.pay * levelMult * fieldMult * upgradeMult);
  }
  function jobEnergyRefillLeft() {
    const j = ensureJobs();
    if (j.energy >= JOB_ENERGY_MAX) return 0;
    return Math.max(0, j.energyAt + JOB_ENERGY_MS - Date.now());
  }
  function jobCanWork(job) {
    const j = ensureJobs();
    const career = jobCareerInfo();
    if (career.level < job.level) return { ok: false, error: 'Cần cấp nghề ' + job.level + '. Bạn đang ở cấp ' + career.level + '.' };
    if (j.energy < job.energy) return { ok: false, error: 'Không đủ năng lượng. Cần ' + job.energy + ' điểm, bạn có ' + j.energy + '.' };
    const cd = jobCooldownLeft(job);
    if (cd > 0) return { ok: false, error: 'Ca này đang hồi. Còn ' + Math.ceil(cd / 1000) + ' giây.' };
    return { ok: true };
  }

  function jobEnergyPipsHTML() {
    const j = ensureJobs();
    let out = '';
    for (let i = 0; i < JOB_ENERGY_MAX; i++) out += '<span class="job-energy-pip ' + (i < j.energy ? 'on' : '') + '"></span>';
    return out;
  }

  function jobHistoryHTML() {
    const list = ensureJobs().history || [];
    if (!list.length) return '<div class="empty-state"><div class="empty-icon">💼</div><strong>Chưa có ca làm nào</strong><p>Nhận ca đầu tiên để bắt đầu xây thu nhập ngoài và cấp nghề.</p></div>';
    return '<div class="job-history">' + list.map(h => {
      const job = JOBS_BY_ID[h.jobId];
      if (!job) return '';
      return '<div class="job-history-row"><span class="job-history-icon">' + job.icon + '</span>' +
        '<div class="job-history-main"><b>' + esc(job.title) + '</b><span>' + timeAgo(h.t) + ' · hiệu suất ' + nf(h.performance * 100, 0) + '%</span></div>' +
        '<div class="job-history-pay"><b>+' + fmtVND(h.pay) + '</b><span>+' + nf(h.xp, 0) + ' XP nghề' + (h.fieldXp ? ' · +' + nf(h.fieldXp, 0) + ' XP ' + esc(jobFieldDef(job).short) : '') + '</span></div></div>';
    }).join('') + '</div>';
  }

  function jobCardHTML(job) {
    const j = ensureJobs();
    const career = jobCareerInfo();
    const field = jobFieldInfo(job);
    const fieldDef = field.def;
    const locked = career.level < job.level;
    const cd = jobCooldownLeft(job);
    const upgraded = jobUpgraded(job);
    const pay = jobPayEstimate(job);
    const lowEnergy = j.energy < job.energy;
    let action = '';
    if (locked) action = '<button class="btn btn-sm" disabled>' + icon('lock') + ' Cần cấp ' + job.level + '</button>';
    else if (cd > 0) action = '<button class="btn btn-sm" disabled data-job-cooldown="' + job.id + '">Hồi ca · ' + Math.ceil(cd / 1000) + 's</button>';
    else if (lowEnergy) action = '<button class="btn btn-sm" disabled>Thiếu năng lượng</button>';
    else action = '<button class="btn btn-gold btn-sm" data-action="job-start" data-id="' + job.id + '">' + icon('play') + ' Nhận ca</button>';
    return '<article class="job-card ' + (locked ? 'locked' : '') + '" style="--jc:' + job.color + '">' +
      '<div class="job-card-top"><span class="job-icon">' + job.icon + '</span><div class="job-title-wrap"><b>' + esc(job.title) + '</b><span>' + esc(job.company) + ' · ' + esc(job.tag) + '</span></div>' +
      '<span class="job-level">Lv.' + job.level + '</span></div>' +
      '<p class="job-desc">' + esc(job.desc) + '</p>' +
      (job.topic ? '<div class="job-topic">' + icon('academy') + ' <span>' + esc(job.topic) + (job.task === 'choice' ? ' · ' + jobQuestionCount(job) + ' câu hỏi' : '') + '</span></div>' : '') +
      '<div class="job-field" style="--jf:' + fieldDef.color + '"><div class="job-field-top"><span>' + fieldDef.icon + ' ' + esc(fieldDef.short) + ' · Lv.' + field.level + '</span><em>+' + nf(field.bonusPct, 1) + '% lương</em></div>' +
      '<div class="job-field-bar"><span style="width:' + field.progress + '%"></span></div></div>' +
      '<div class="job-meta"><span>' + icon('bolt') + ' ' + job.energy + ' năng lượng</span><span>' + icon('clock') + ' ' + job.cooldown + 's hồi</span><span>' + icon('money') + ' ~' + money(pay) + ' ₫</span></div>' +
      '<div class="job-upgrade ' + (upgraded ? 'owned' : '') + '"><span>' + (upgraded ? '✅' : '🔧') + '</span><div><b>' + esc(job.upgrade.name) + '</b><span>' + esc(job.upgrade.desc) + '</span></div>' +
      (upgraded ? '<em>Đã nâng cấp</em>' : '<button class="btn btn-xs btn-ghost" data-action="job-upgrade" data-id="' + job.id + '" ' + (locked || state.cash < job.upgrade.cost ? 'disabled' : '') + '>' + money(job.upgrade.cost) + ' ₫</button>') + '</div>' +
      '<div class="job-card-foot"><span class="job-xp">+' + job.xp + ' XP nghề · +' + job.aura + ' Aura</span>' + action + '</div></article>';
  }

  function jobFieldMasteryHTML() {
    const fields = jobFieldSummary();
    const trained = fields.filter(f => f.xp > 0).length;
    const best = fields[0];
    return '<section class="card job-field-card"><div class="card-head"><div><div class="card-title">' + icon('academy') + ' Bậc thạo nghề theo lĩnh vực</div>' +
      '<div class="card-sub">Làm lặp lại một lĩnh vực để tăng XP. Mỗi bậc cộng <b>+3% lương</b> cho mọi nghề cùng lĩnh vực, tối đa +27%.</div></div>' +
      '<span class="badge badge-gold">' + trained + '/' + fields.length + ' lĩnh vực đã luyện</span></div>' +
      (best && best.xp > 0 ? '<div class="job-field-best">' + icon('sparkles') + ' Mạnh nhất: <b>' + best.def.icon + ' ' + esc(best.def.name) + '</b> · Lv.' + best.level + ' · +' + nf(best.bonusPct, 1) + '% lương</div>' : '') +
      '<div class="job-field-grid">' + fields.map(f => {
        const jobNames = f.jobs.map(job => job.title).join(' · ');
        return '<div class="job-field-item" style="--jf:' + f.def.color + '">' +
          '<div class="job-field-item-top"><span class="job-field-icon">' + f.def.icon + '</span><div><b>' + esc(f.def.name) + '</b><span>' + esc(jobNames) + '</span></div><em>Lv.' + f.level + '</em></div>' +
          '<div class="job-field-bar"><span style="width:' + f.progress + '%"></span></div>' +
          '<div class="job-field-item-foot"><span>' + (f.nextXp ? nf(f.xp, 0) + ' / ' + nf(f.nextXp, 0) + ' XP' : 'Tối đa · ' + nf(f.xp, 0) + ' XP') + '</span><b>+' + nf(f.bonusPct, 1) + '% lương</b></div></div>';
      }).join('') + '</div></section>';
  }

  function jobTaskLabel(task) {
    return task === 'timing' ? 'Canh nhịp' : task === 'math' ? 'Tính toán' : task === 'sequence' ? 'Quy trình' : 'Tình huống';
  }

  function jobsFiltered() {
    const q = (jobFilter.q || '').trim().toLowerCase();
    return D.JOBS.filter(job => {
      if (jobFilter.field !== 'all' && job.field !== jobFilter.field) return false;
      if (jobFilter.task !== 'all' && job.task !== jobFilter.task) return false;
      if (jobFilter.level !== 'all' && String(job.level) !== String(jobFilter.level)) return false;
      if (q) {
        const field = JOB_FIELD_BY_ID[job.field] || {};
        const hay = (job.title + ' ' + job.company + ' ' + job.tag + ' ' + (field.name || '') + ' ' + (job.topic || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function jobsFilterBarHTML() {
    const tasks = [['all', 'Tất cả'], ['choice', 'Tình huống'], ['timing', 'Canh nhịp'], ['math', 'Tính toán'], ['sequence', 'Quy trình']];
    return '<div class="job-filterbar">' +
      '<div class="job-search">' + icon('search') + '<input type="search" id="jobSearch" placeholder="Tìm nghề, công ty, lĩnh vực…" value="' + esc(jobFilter.q) + '"></div>' +
      '<div class="job-task-chips">' + tasks.map(t => '<button class="job-chip ' + (jobFilter.task === t[0] ? 'on' : '') + '" data-job-task="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<div class="job-filter-selects"><label>Lĩnh vực<select id="jobFieldSelect"><option value="all">Tất cả lĩnh vực</option>' +
      D.JOB_FIELDS.map(f => '<option value="' + f.id + '"' + (jobFilter.field === f.id ? ' selected' : '') + '>' + f.icon + ' ' + esc(f.name) + '</option>').join('') + '</select></label>' +
      '<label>Cấp<select id="jobLevelSelect"><option value="all">Mọi cấp</option>' +
      [1, 2, 3, 4, 5].map(l => '<option value="' + l + '"' + (String(jobFilter.level) === String(l) ? ' selected' : '') + '>Cấp ' + l + '</option>').join('') + '</select></label>' +
      '<button class="btn btn-ghost btn-sm" data-action="job-filter-reset">' + icon('refresh') + ' Đặt lại</button></div>' +
      '<div class="job-filter-count" id="jobsCount"></div></div>';
  }

  function jobsHTML() {
    const j = ensureJobs();
    const career = jobCareerInfo();
    const refill = jobEnergyRefillLeft();
    const activeJobs = D.JOBS.filter(job => job.level <= career.level).length;
    const quickJob = D.JOBS.filter(job => jobCanWork(job).ok)
      .sort((a, b) => jobPayEstimate(b) - jobPayEstimate(a))[0] ||
      D.JOBS.find(job => job.level <= career.level) || D.JOBS[0];
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('money') + ' Việc làm · Thu nhập ngoài</div><h1>Việc làm & Thu nhập</h1>' +
      '<p class="sub">Nhận ca, chơi mini-game và nhận lương bằng tiền ảo để bơm thêm vốn đầu tư. Năng lượng hồi theo thời gian — làm đều sẽ lên cấp nghề, tăng XP lĩnh vực và cộng thêm % lương.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/auctions">' + icon('gavel') + ' Đấu giá</button>' +
      '<button class="btn btn-gold btn-sm" data-action="job-start" data-id="' + quickJob.id + '">' + icon('play') + ' Làm ca nhanh</button></div></div>' +
      '<div class="job-stats">' +
      '<div class="job-stat-card" id="jobEnergyPanel"><div class="job-stat-top"><span>Năng lượng</span><b data-job-energy>' + j.energy + '/' + JOB_ENERGY_MAX + '</b></div><div class="job-energy-pips" id="jobEnergyPips">' + jobEnergyPipsHTML() + '</div><div class="job-stat-note">' + (refill ? 'Hồi thêm 1 điểm sau ' + Math.ceil(refill / 1000) + 's' : 'Đã đầy năng lượng') + '</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Cấp nghề</span><b>' + career.level + '/5</b></div><div class="job-career-bar"><span style="width:' + career.progress + '%"></span></div><div class="job-stat-note">' + (career.nextXp ? nf(career.xp, 0) + ' / ' + nf(career.nextXp, 0) + ' XP nghề' : 'Cấp nghề tối đa') + '</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Tổng thu nhập</span><b>' + fmtVND(j.earned) + '</b></div><div class="job-stat-note">' + j.shifts + ' ca · ' + (j.perfect || 0) + ' ca hoàn hảo</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Chuỗi làm việc</span><b>🔥 ' + (j.streak || 0) + ' ngày</b></div><div class="job-stat-note">' + activeJobs + '/' + D.JOBS.length + ' công việc đã mở khoá</div></div></div>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('grid') + ' Bảng việc làm</div><div class="card-sub">Chọn ca phù hợp với năng lượng và cấp nghề của bạn</div></div><span class="badge badge-gold">' + D.JOBS.length + ' nghề</span></div>' +
      jobsFilterBarHTML() +
      '<div class="job-grid" id="jobsGrid">' + jobsFiltered().map(jobCardHTML).join('') + '</div></section>' +
      jobFieldMasteryHTML() +
      '<div class="two-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('crown') + ' Lộ trình nghề nghiệp</div><div class="card-sub">Càng nhiều XP nghề, càng nhiều việc lương cao</div></div></div>' +
      '<div class="job-ladder">' + [1, 2, 3, 4, 5].map(lvl => {
        const unlocked = career.level >= lvl;
        const jobsAt = D.JOBS.filter(job => job.level === lvl).map(job => job.title);
        return '<div class="job-ladder-row ' + (unlocked ? 'on' : '') + '"><span class="job-ladder-level">' + lvl + '</span><div><b>Cấp ' + lvl + '</b><span>' + (jobsAt.length ? jobsAt.join(' · ') : 'Cấp cao nhất') + '</span></div><em>' + (unlocked ? 'Đã mở' : nf(JOB_LEVEL_XP[lvl], 0) + ' XP') + '</em></div>';
      }).join('') + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Lịch sử ca làm</div><div class="card-sub">' + ensureJobs().history.length + ' ca gần nhất</div></div></div>' + jobHistoryHTML() + '</section></div>';
  }

  function refreshJobsGrid() {
    const grid = $('#jobsGrid');
    if (!grid) return;
    const list = jobsFiltered();
    grid.innerHTML = list.length ? list.map(jobCardHTML).join('') :
      '<div class="job-empty">' + icon('search') + '<b>Không tìm thấy nghề phù hợp</b><span>Thử xoá bộ lọc hoặc tìm từ khoá khác.</span><button class="btn btn-ghost btn-sm" data-action="job-filter-reset">Đặt lại bộ lọc</button></div>';
    const count = $('#jobsCount');
    if (count) count.innerHTML = '<b>' + list.length + '</b> / ' + D.JOBS.length + ' nghề';
  }

  function updateJobTimers() {
    if (document.hidden || currentRoute !== 'jobs') return;
    const j = ensureJobs();
    const energyChanged = lastJobEnergy !== null && lastJobEnergy !== j.energy;
    lastJobEnergy = j.energy;
    const energy = $('[data-job-energy]');
    if (energy) energy.textContent = j.energy + '/' + JOB_ENERGY_MAX;
    const pips = $('#jobEnergyPips');
    if (pips) pips.innerHTML = jobEnergyPipsHTML();
    const note = $('#jobEnergyPanel .job-stat-note');
    const refill = jobEnergyRefillLeft();
    if (note) note.textContent = refill ? 'Hồi thêm 1 điểm sau ' + Math.ceil(refill / 1000) + 's' : 'Đã đầy năng lượng';
    let expired = false;
    $$('[data-job-cooldown]').forEach(el => {
      const job = JOBS_BY_ID[el.getAttribute('data-job-cooldown')];
      if (!job) return;
      const left = jobCooldownLeft(job);
      if (left <= 0) expired = true;
      else el.textContent = 'Hồi ca · ' + Math.ceil(left / 1000) + 's';
    });
    if (expired || energyChanged) refreshJobsGrid();
  }

  function mountJobs() {
    const j = ensureJobs();
    lastJobEnergy = j.energy;
    if (jobsTimer) clearInterval(jobsTimer);
    jobsTimer = setInterval(updateJobTimers, 1000);
    const search = $('#jobSearch');
    if (search) search.addEventListener('input', () => { jobFilter.q = search.value; refreshJobsGrid(); });
    const fieldSel = $('#jobFieldSelect');
    if (fieldSel) fieldSel.addEventListener('change', () => { jobFilter.field = fieldSel.value; refreshJobsGrid(); });
    const levelSel = $('#jobLevelSelect');
    if (levelSel) levelSel.addEventListener('change', () => { jobFilter.level = levelSel.value; refreshJobsGrid(); });
    $$('[data-job-task]').forEach(btn => btn.addEventListener('click', () => {
      jobFilter.task = btn.getAttribute('data-job-task');
      $$('[data-job-task]').forEach(b => b.classList.toggle('on', b === btn));
      refreshJobsGrid();
    }));
    refreshJobsGrid();
    updateJobTimers();
  }

  function buyJobUpgrade(jobId) {
    const job = JOBS_BY_ID[jobId];
    if (!job) return;
    const j = ensureJobs();
    if (j.upgrades.includes(job.id)) return toast('Đã nâng cấp', 'Bạn đã sở hữu ' + job.upgrade.name + '.', 'info', '🔧');
    if (jobCareerInfo().level < job.level) return toast('Chưa mở khoá', 'Cần cấp nghề ' + job.level + ' để nâng cấp công việc này.', 'error', '🔒');
    if (state.cash < job.upgrade.cost) return toast('Không đủ tiền mặt', 'Cần ' + fmtVND(job.upgrade.cost) + ' để mua ' + job.upgrade.name + '.', 'error', '⚠️');
    state.cash -= job.upgrade.cost;
    j.upgrades.push(job.id);
    addXP(25);
    saveNow();
    updateShell();
    toast('Nâng cấp thành công', job.upgrade.name + ' · ' + job.upgrade.desc, 'gold', '🔧');
    refreshCurrentRoute();
  }

  function jobMathRound(job) {
    const type = job.mathType || 'interest';
    const rndInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    let q = '', answer = 0, unit = '₫', hint = '', moneyAnswer = true;
    if (type === 'discount') {
      const price = rndInt(4, 36) * 5000000;
      const disc = rndInt(1, 8) * 5;
      answer = Math.round(price * (1 - disc / 100));
      q = 'Một lô hàng nhập giá ' + fmtVND(price) + ' được chiết khấu ' + disc + '%. Giá sau chiết khấu là bao nhiêu?';
      hint = 'Giá sau chiết khấu = giá gốc × (1 − ' + disc + '%).';
    } else if (type === 'tax') {
      const revenue = rndInt(4, 18) * 50000000;
      const rate = [10, 15, 20][rndInt(0, 2)];
      answer = Math.round(revenue * rate / 100);
      q = 'Doanh thu chịu thuế là ' + fmtVND(revenue) + '. Thuế suất ' + rate + '%. Số thuế phải nộp là bao nhiêu?';
      hint = 'Thuế = doanh thu × thuế suất.';
    } else if (type === 'interest') {
      const principal = rndInt(1, 10) * 50000000;
      const rate = rndInt(5, 12);
      const years = rndInt(2, 5);
      answer = Math.round(principal * rate * years / 100);
      q = 'Gửi ' + fmtVND(principal) + ' với lãi đơn ' + rate + '%/năm trong ' + years + ' năm. Tổng tiền lãi là bao nhiêu?';
      hint = 'Lãi đơn = vốn × lãi suất × số năm.';
    } else if (type === 'cagr') {
      const start = 100;
      const end = rndInt(6, 16) * 25;
      const years = rndInt(3, 6);
      answer = Math.round((Math.pow(end / start, 1 / years) - 1) * 10000) / 100;
      unit = '%';
      moneyAnswer = false;
      q = 'Doanh thu tăng từ 100 tỷ lên ' + end + ' tỷ trong ' + years + ' năm. CAGR là bao nhiêu %/năm? (làm tròn 2 chữ số)';
      hint = 'CAGR = (giá trị cuối / giá trị đầu)^(1/số năm) − 1.';
    } else if (type === 'markup') {
      const cost = rndInt(4, 18) * 5000000;
      const markup = rndInt(2, 8) * 5;
      answer = Math.round(cost * (1 + markup / 100));
      q = 'Giá thu mua là ' + fmtVND(cost) + '. Bạn muốn markup ' + markup + '%. Giá bán là bao nhiêu?';
      hint = 'Giá bán = giá vốn × (1 + markup).';
    } else if (type === 'ratio') {
      const a = rndInt(2, 5);
      let b = rndInt(3, 8);
      if (b === a) b++;
      const total = rndInt(6, 18) * 50000000;
      answer = Math.round(total * Math.max(a, b) / (a + b));
      q = 'Chia ' + fmtVND(total) + ' theo tỷ lệ ' + a + ':' + b + '. Phần lớn hơn nhận bao nhiêu?';
      hint = 'Phần cần tính = tổng × tử số / (tổng hai phần tỷ lệ).';
    } else if (type === 'breakeven') {
      const fixed = rndInt(4, 16) * 50000000;
      const price = rndInt(5, 15) * 20000;
      const varPct = rndInt(8, 12) * 5;
      const contribution = price * (1 - varPct / 100);
      answer = Math.ceil(fixed / contribution);
      unit = 'sản phẩm';
      moneyAnswer = false;
      q = 'Chi phí cố định ' + fmtVND(fixed) + ', giá bán ' + fmtVND(price) + '/sản phẩm, biến phí bằng ' + varPct + '% giá bán. Sản lượng hoà vốn là bao nhiêu?';
      hint = 'Sản lượng hoà vốn = chi phí cố định / (giá bán − biến phí đơn vị), làm tròn lên.';
    } else if (type === 'roi') {
      const cost = rndInt(2, 10) * 50000000;
      const gain = rndInt(2, 15) * 10000000;
      answer = Math.round(gain / cost * 10000) / 100;
      unit = '%';
      moneyAnswer = false;
      q = 'Đầu tư ' + fmtVND(cost) + ' và thu về lợi nhuận ' + fmtVND(gain) + '. ROI là bao nhiêu %? (làm tròn 2 chữ số)';
      hint = 'ROI = lợi nhuận / chi phí đầu tư × 100.';
    } else if (type === 'margin') {
      const revenue = rndInt(6, 18) * 50000000;
      const profit = rndInt(1, Math.max(2, Math.floor(revenue / 10000000))) * 10000000;
      answer = Math.round(profit / revenue * 10000) / 100;
      unit = '%';
      moneyAnswer = false;
      q = 'Doanh thu ' + fmtVND(revenue) + ', lợi nhuận gộp ' + fmtVND(profit) + '. Biên lợi nhuận gộp là bao nhiêu %? (làm tròn 2 chữ số)';
      hint = 'Biên lợi nhuận = lợi nhuận / doanh thu × 100.';
    } else {
      const principal = rndInt(1, 10) * 50000000;
      const rate = rndInt(5, 12);
      answer = Math.round(principal * rate / 100);
      q = 'Vốn ' + fmtVND(principal) + ' sinh lãi ' + rate + '%/năm. Tiền lãi một năm là bao nhiêu?';
      hint = 'Lãi = vốn × lãi suất.';
    }
    return { q, answer, unit, hint, moneyAnswer };
  }

  function jobSequenceRound(job) {
    const base = (job.signals && job.signals.length >= 3) ? job.signals.slice() : ['🩺', '💊', '💉', '📋'];
    const order = shuffleList(base).slice(0, Math.min(4, base.length));
    return { order, palette: shuffleList(order) };
  }

  function startJobShift(jobId) {
    const job = JOBS_BY_ID[jobId];
    if (!job) return;
    const check = jobCanWork(job);
    if (!check.ok) return toast('Chưa thể nhận ca', check.error, 'error', '⚡');
    const questions = job.task === 'choice' ? shuffleList(jobQuestionPool(job)).slice(0, job.rounds) : [];
    const roundsData = job.task === 'math' ? Array.from({ length: job.rounds }, () => jobMathRound(job)) :
      job.task === 'sequence' ? Array.from({ length: job.rounds }, () => jobSequenceRound(job)) : [];
    jobShift = { job, round: 0, scores: [], correct: 0, answered: false, questions, roundsData, startedAt: Date.now(), done: false, frame: 0, seqTimer: null };
    openModal({
      title: job.icon + ' ' + esc(job.title),
      sub: esc(job.company) + ' · ' + esc(job.tag) + ' · ' + job.rounds + ' vòng',
      size: 'modal-md',
      body: '<div class="job-shift" id="jobShiftBody"></div>',
      onOpen: modal => renderJobShiftRound(modal)
    });
  }

  function renderJobShiftRound(modal) {
    if (!jobShift || jobShift.done) return;
    const body = modal.querySelector('#jobShiftBody');
    if (!body) return;
    const job = jobShift.job;
    if (jobShift.round >= job.rounds) return finishJobShift(modal);
    const taskTag = job.task === 'timing' ? 'CANH NHỊP' : job.task === 'math' ? 'TÍNH TOÁN NHANH' : job.task === 'sequence' ? 'GHI NHỚ QUY TRÌNH' : 'XỬ LÝ TÌNH HUỐNG';
    const head = '<div class="job-shift-head"><span>Vòng ' + (jobShift.round + 1) + ' / ' + job.rounds + '</span><span class="badge badge-gold">' + taskTag + '</span></div>';
    if (job.task === 'timing') {
      const center = 22 + Math.random() * 56;
      body.innerHTML = head +
        '<div class="job-timing-track"><span class="job-timing-zone" style="left:' + (center - 8) + '%;width:16%"></span><span class="job-timing-needle" id="jobNeedle"></span></div>' +
        '<div class="job-shift-hint">Dừng kim trong vùng sáng để đạt hiệu suất cao. Vùng càng giữa càng nhiều tiền.</div>' +
        '<button class="btn btn-gold btn-block" id="jobStop">' + icon('target') + ' DỪNG KIM</button>' +
        '<div class="job-shift-feedback" id="jobFeedback"></div>';
      const needle = body.querySelector('#jobNeedle');
      const stop = body.querySelector('#jobStop');
      const feedback = body.querySelector('#jobFeedback');
      let pos = 0, dir = 1, last = performance.now();
      const speed = 30 + job.speed * 26;
      const step = now => {
        if (!jobShift || jobShift.done || !needle.isConnected) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        pos += dir * speed * dt;
        if (pos >= 100) { pos = 100; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        needle.style.left = pos + '%';
        jobShift.frame = requestAnimationFrame(step);
      };
      jobShift.frame = requestAnimationFrame(step);
      stop.addEventListener('click', () => {
        if (!jobShift || jobShift.done) return;
        cancelAnimationFrame(jobShift.frame);
        const dist = Math.abs(pos - center);
        const score = dist <= 4 ? 1.5 : dist <= 9 ? 1.25 : dist <= 16 ? 0.95 : 0.6;
        jobShift.scores.push(score);
        jobShift.round++;
        stop.disabled = true;
        const label = score >= 1.45 ? 'HOÀN HẢO!' : score >= 1.2 ? 'Rất tốt!' : score >= 0.9 ? 'Ổn định' : 'Lệch nhịp';
        feedback.innerHTML = '<div class="job-feedback-line ' + (score >= 0.9 ? 'up' : 'down') + '">' + label + ' · hiệu suất ' + nf(score * 100, 0) + '%</div>' +
          '<button class="btn btn-ghost btn-sm" id="jobNext">' + (jobShift.round >= job.rounds ? 'Xem kết quả' : 'Vòng tiếp theo') + ' ' + icon('arrow-right') + '</button>';
        feedback.querySelector('#jobNext').addEventListener('click', () => renderJobShiftRound(modal));
      });
      return;
    }
    if (job.task === 'math') {
      const data = jobShift.roundsData[jobShift.round];
      if (!data) return finishJobShift(modal);
      body.innerHTML = head + '<div class="job-question">' + esc(data.q) + '</div>' +
        '<div class="job-math-input"><input type="number" step="any" inputmode="decimal" id="jobMathInput" placeholder="Nhập đáp án"><span>' + esc(data.unit) + '</span></div>' +
        '<div class="job-shift-hint">' + esc(data.hint) + '</div>' +
        '<button class="btn btn-gold btn-block" id="jobMathSubmit">' + icon('calculator') + ' XÁC NHẬN ĐÁP ÁN</button>' +
        '<div class="job-shift-feedback" id="jobFeedback"></div>';
      const input = body.querySelector('#jobMathInput');
      const submit = body.querySelector('#jobMathSubmit');
      const feedback = body.querySelector('#jobFeedback');
      input.focus();
      const grade = () => {
        if (!jobShift || jobShift.done || jobShift.answered) return;
        const val = Number(input.value);
        if (!input.value.trim() || !Number.isFinite(val)) { input.classList.add('wrong'); input.focus(); return; }
        jobShift.answered = true;
        input.disabled = true; submit.disabled = true;
        const target = data.answer;
        const rel = Math.abs(val - target) / Math.max(1, Math.abs(target));
        const score = rel <= 0.005 ? 1.5 : rel <= 0.05 ? 1.2 : rel <= 0.15 ? 0.9 : 0.55;
        if (rel <= 0.05) jobShift.correct++;
        jobShift.scores.push(score);
        jobShift.round++;
        const shown = data.moneyAnswer ? fmtVND(target) : nf(target, 2) + ' ' + data.unit;
        const label = score >= 1.45 ? 'Chính xác tuyệt đối!' : score >= 1.15 ? 'Đúng trong dung sai' : score >= 0.85 ? 'Gần đúng' : 'Sai lệch lớn';
        feedback.innerHTML = '<div class="job-feedback-line ' + (score >= 1.15 ? 'up' : 'down') + '">' + label + ' · hiệu suất ' + nf(score * 100, 0) + '%</div>' +
          '<div class="job-feedback-note">Đáp án đúng: <b>' + shown + '</b></div>' +
          '<button class="btn btn-ghost btn-sm" id="jobNext">' + (jobShift.round >= job.rounds ? 'Xem kết quả' : 'Câu tiếp theo') + ' ' + icon('arrow-right') + '</button>';
        feedback.querySelector('#jobNext').addEventListener('click', () => { jobShift.answered = false; renderJobShiftRound(modal); });
      };
      submit.addEventListener('click', grade);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); grade(); } });
      return;
    }
    if (job.task === 'sequence') {
      const data = jobShift.roundsData[jobShift.round];
      if (!data) return finishJobShift(modal);
      body.innerHTML = head + '<div class="job-seq-stage" id="jobSeqStage"><div class="job-seq-show" id="jobSeqShow"></div></div>' +
        '<div class="job-shift-hint" id="jobSeqHint">Ghi nhớ thứ tự các biểu tượng xuất hiện.</div>' +
        '<div class="job-shift-feedback" id="jobFeedback"></div>';
      const stage = body.querySelector('#jobSeqStage');
      const show = body.querySelector('#jobSeqShow');
      const hint = body.querySelector('#jobSeqHint');
      const feedback = body.querySelector('#jobFeedback');
      let step = 0;
      const startInput = () => {
        if (!jobShift || jobShift.done || !stage.isConnected) return;
        hint.textContent = 'Bấm các biểu tượng theo đúng thứ tự vừa thấy.';
        stage.innerHTML = '<div class="job-seq-picked" id="jobSeqPicked"></div><div class="job-seq-palette">' +
          data.palette.map((sym, idx) => '<button class="job-seq-token" data-seq-token="' + idx + '">' + sym + '</button>').join('') + '</div>';
        const picked = [];
        const pickedHost = stage.querySelector('#jobSeqPicked');
        const buttons = Array.from(stage.querySelectorAll('[data-seq-token]'));
        const update = () => { pickedHost.innerHTML = picked.map(s => '<span>' + s + '</span>').join('') || '<em>Chưa chọn</em>'; };
        update();
        buttons.forEach(btn => btn.addEventListener('click', () => {
          if (!jobShift || jobShift.done || jobShift.answered || btn.disabled) return;
          btn.disabled = true;
          picked.push(data.palette[Number(btn.getAttribute('data-seq-token'))]);
          update();
          if (picked.length < data.order.length) return;
          jobShift.answered = true;
          const hits = picked.reduce((s, v, idx) => s + (v === data.order[idx] ? 1 : 0), 0);
          const ratio = hits / data.order.length;
          const score = hits === data.order.length ? 1.5 : ratio >= 0.66 ? 1.2 : ratio >= 0.33 ? 0.9 : 0.55;
          if (hits === data.order.length) jobShift.correct++;
          jobShift.scores.push(score);
          jobShift.round++;
          hint.textContent = 'Thứ tự đúng: ' + data.order.join(' ');
          feedback.innerHTML = '<div class="job-feedback-line ' + (score >= 1.2 ? 'up' : 'down') + '">' + (hits === data.order.length ? 'Chuẩn quy trình!' : 'Đúng ' + hits + '/' + data.order.length + ' bước') + ' · hiệu suất ' + nf(score * 100, 0) + '%</div>' +
            '<button class="btn btn-ghost btn-sm" id="jobNext">' + (jobShift.round >= job.rounds ? 'Xem kết quả' : 'Vòng tiếp theo') + ' ' + icon('arrow-right') + '</button>';
          feedback.querySelector('#jobNext').addEventListener('click', () => { jobShift.answered = false; renderJobShiftRound(modal); });
        }));
      };
      const flash = () => {
        if (!jobShift || jobShift.done || !show.isConnected) return;
        if (step < data.order.length) {
          show.innerHTML = '<span class="job-seq-big">' + data.order[step] + '</span><span class="job-seq-step">' + (step + 1) + ' / ' + data.order.length + '</span>';
          step++;
          const pace = Number.isFinite(Number(job.speed)) ? Number(job.speed) : 0.35;
          jobShift.seqTimer = setTimeout(flash, Math.max(560, 1150 - pace * 520));
        } else {
          show.innerHTML = '<span class="job-seq-big">✅</span><span class="job-seq-step">Nhập lại thứ tự</span>';
          startInput();
        }
      };
      jobShift.seqTimer = setTimeout(flash, 450);
      return;
    }
    const q = jobShift.questions[jobShift.round];
    if (!q) return finishJobShift(modal);
    body.innerHTML = head + '<div class="job-question">' + esc(q.q) + '</div>' +
      '<div class="job-options">' + q.options.map((opt, i) => '<button class="job-option" data-job-option="' + i + '"><span>' + String.fromCharCode(65 + i) + '</span>' + esc(opt) + '</button>').join('') + '</div>' +
      '<div class="job-shift-feedback" id="jobFeedback"></div>';
    const feedback = body.querySelector('#jobFeedback');
    body.querySelectorAll('[data-job-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!jobShift || jobShift.done || jobShift.answered) return;
        jobShift.answered = true;
        const idx = Number(btn.getAttribute('data-job-option'));
        const correct = idx === q.answer;
        const score = correct ? 1.3 : 0.55;
        if (correct) jobShift.correct++;
        jobShift.scores.push(score);
        jobShift.round++;
        body.querySelectorAll('[data-job-option]').forEach((b, i) => {
          b.disabled = true;
          if (i === q.answer) b.classList.add('correct');
          else if (i === idx) b.classList.add('wrong');
        });
        feedback.innerHTML = '<div class="job-feedback-line ' + (correct ? 'up' : 'down') + '">' + (correct ? 'Chính xác!' : 'Chưa đúng') + '</div>' +
          '<div class="job-feedback-note">' + esc(q.explain || '') + '</div>' +
          '<button class="btn btn-ghost btn-sm" id="jobNext">' + (jobShift.round >= job.rounds ? 'Xem kết quả' : 'Câu tiếp theo') + ' ' + icon('arrow-right') + '</button>';
        feedback.querySelector('#jobNext').addEventListener('click', () => {
          jobShift.answered = false;
          renderJobShiftRound(modal);
        });
      });
    });
  }

  function finishJobShift(modal) {
    if (!jobShift || jobShift.done) return;
    const job = jobShift.job;
    const j = ensureJobs();
    const avg = jobShift.scores.length ? jobShift.scores.reduce((s, v) => s + v, 0) / jobShift.scores.length : 1;
    const performance = clamp(avg, 0.5, 1.5);
    const today = todayKey();
    let nextStreak = j.streak || 1;
    if (j.lastShiftDay !== today) {
      nextStreak = j.lastShiftDay === dateKey(Date.now() - 86400000) ? (j.streak || 0) + 1 : 1;
    }
    const streakBonus = 1 + Math.min(0.2, Math.max(0, nextStreak - 1) * 0.03);
    const perfect = jobShift.scores.length >= job.rounds && jobShift.scores.every(s => s >= 1.2);
    const perfectBonus = perfect ? 0.25 : 0;
    const pay = Math.round(jobPayEstimate(job) * performance * streakBonus * (1 + perfectBonus) / 1000) * 1000;
    const careerXp = Math.round(job.xp * (0.7 + performance * 0.4) * (perfect ? 1.15 : 1));
    const fieldBefore = jobFieldInfo(job);
    const fieldXp = Math.max(1, Math.round(job.xp * 0.5 * (0.8 + performance * 0.2) * (perfect ? 1.15 : 1)));
    const fieldState = j.fields[job.field] || (j.fields[job.field] = { xp: 0, shifts: 0 });
    fieldState.xp += fieldXp;
    fieldState.shifts = (fieldState.shifts || 0) + 1;
    const fieldAfter = jobFieldInfo(job);
    const fieldLevelUp = fieldAfter.level > fieldBefore.level;
    if (j.energy >= JOB_ENERGY_MAX) j.energyAt = Date.now();
    j.energy = Math.max(0, j.energy - job.energy);
    j.cooldowns[job.id] = Date.now() + job.cooldown * 1000;
    j.shifts++;
    if (perfect) j.perfect = (j.perfect || 0) + 1;
    j.earned += pay;
    j.xp += careerXp;
    j.streak = nextStreak;
    j.lastShiftDay = today;
    j.history.unshift({ t: Date.now(), jobId: job.id, pay, performance, xp: careerXp, perfect, fieldId: job.field, fieldXp, fieldLevel: fieldAfter.level });
    j.history = j.history.slice(0, 24);
    state.cash += pay;
    jobShift.done = true;
    addXP(careerXp);
    addAura(job.aura);
    progressQuest('work', 1);
    snapshotEquity(true);
    pushNotif('💼', 'Hoàn thành ca làm', job.title + ' · +' + fmtVND(pay) + ' · +' + careerXp + ' XP nghề · +' + fieldXp + ' XP ' + fieldAfter.def.short);
    updateShell();
    saveNow();
    if (performance >= 1.2 || perfect) confetti(perfect ? 55 : 35);
    const body = modal.querySelector('#jobShiftBody');
    if (!body) return;
    body.innerHTML = '<div class="job-result ' + (perfect ? 'job-result-perfect' : '') + '">' +
      '<div class="job-result-icon">' + job.icon + '</div>' +
      '<div class="job-result-eyebrow">' + (perfect ? '★ CA LÀM HOÀN HẢO ★' : 'CA LÀM HOÀN TẤT') + '</div>' +
      '<h3>' + esc(job.title) + '</h3>' +
      '<div class="job-result-pay">+' + fmtVND(pay) + '</div>' +
      (perfect ? '<div class="job-perfect-badge">Thưởng hoàn hảo +25% · +15% XP</div>' : '') +
      '<div class="job-result-grid"><div><span>Hiệu suất</span><b class="' + (performance >= 1 ? 'up' : '') + '">' + nf(performance * 100, 0) + '%</b></div>' +
      '<div><span>XP nghề</span><b>+' + nf(careerXp, 0) + '</b></div>' +
      '<div><span>XP ' + esc(fieldAfter.def.short) + '</span><b class="up">+' + nf(fieldXp, 0) + '</b></div>' +
      '<div><span>Aura</span><b>+' + job.aura + '</b></div>' +
      '<div><span>Chuỗi ngày</span><b>🔥 ' + nextStreak + '</b></div>' +
      (job.task === 'choice' ? '<div><span>Trả lời đúng</span><b>' + jobShift.correct + '/' + job.rounds + '</b></div>' : job.task === 'math' || job.task === 'sequence' ? '<div><span>Vòng đạt</span><b>' + jobShift.correct + '/' + job.rounds + '</b></div>' : '') +
      '<div><span>Tổng ca</span><b>' + j.shifts + '</b></div></div>' +
      '<div class="job-field-result"><span class="job-field-result-icon">' + fieldAfter.def.icon + '</span><div><b>' + esc(fieldAfter.def.name) + ' · Lv.' + fieldAfter.level + '</b><span>Thưởng lĩnh vực hiện tại: +' + nf(fieldAfter.bonusPct, 1) + '% lương</span></div></div>' +
      (fieldLevelUp ? '<div class="job-field-levelup">' + icon('sparkles') + ' Lĩnh vực lên cấp! ' + esc(fieldAfter.def.short) + ' Lv.' + fieldAfter.level + ' · +' + nf(fieldAfter.bonusPct, 1) + '% lương cho mọi nghề cùng lĩnh vực.</div>' : '') +
      '<div class="job-result-note">' + (perfect ? 'Toàn bộ câu hỏi đều chính xác. Bạn vừa nhận thưởng hoàn hảo và thêm XP nghề — một ca làm đáng giá.' : performance >= 1.2 ? 'Ca làm xuất sắc! Bạn vừa kiếm thêm vốn đầu tư.' : 'Mỗi ca đều cộng XP nghề và XP lĩnh vực. Làm đều tay để tăng % lương và mở khoá việc tốt hơn.') + '</div>' +
      '<div class="job-result-actions"><button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button><button class="btn btn-gold btn-sm" data-nav="#/jobs">Xem việc làm</button></div></div>';
    toast(perfect ? 'Ca làm hoàn hảo!' : 'Nhận lương ca làm', '+' + fmtVND(pay) + ' · +' + careerXp + ' XP nghề · +' + fieldXp + ' XP ' + fieldAfter.def.short, 'success', perfect ? '🌟' : '💼');
    refreshCurrentRoute();
  }

  /* ============================================================
     v1.12 · PRIME — ĐẦU TƯ THỰC MÔ PHỎNG
     Tài khoản riêng, lệnh LO/MP/STOP, phí & thuế, biên giá,
     hạn mức mandate và quyết toán T+2 nén còn 2 phút.
     ============================================================ */
  function primeProfile() {
    return PRIME_PROFILE_BY_ID[(state.prime && state.prime.profile)] || D.PRIME_PROFILES[1];
  }

  function ensurePrime() {
    if (!state.prime || typeof state.prime !== 'object') state.prime = primeDefault();
    const p = state.prime;
    ['active'].forEach(k => { if (typeof p[k] !== 'boolean') p[k] = false; });
    if (!p.holdings || typeof p.holdings !== 'object' || Array.isArray(p.holdings)) p.holdings = {};
    ['orders', 'fills', 'settlements', 'history'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
    ['createdAt', 'navStart', 'cash', 'reserved', 'deposited', 'withdrawn', 'realized', 'fees', 'tax',
      'tradeCount', 'settlementCount', 'turnover', 'benchValue', 'lastProcess', 'lastSnapshot'].forEach(k => {
      if (!Number.isFinite(p[k])) p[k] = 0;
    });
    if (typeof p.turnoverDay !== 'string') p.turnoverDay = '';
    if (!p.benchValue) p.benchValue = 100;
    Object.keys(p.holdings).forEach(id => {
      const h = p.holdings[id];
      if (!h || !(Number(h.qty) > 0)) { delete p.holdings[id]; return; }
      h.qty = Number(h.qty);
      if (!Number.isFinite(h.avgCost)) h.avgCost = 0;
      if (!Array.isArray(h.pending)) h.pending = [];
      h.pending = h.pending.filter(x => x && Number(x.qty) > 0 && Number(x.readyAt) > 0);
    });
    if (p.active && (!p.benchBase || typeof p.benchBase !== 'object')) {
      const base = {};
      D.VN30_IDS.forEach(id => {
        const a = byId[id];
        if (a && a.price > 0) base[id] = a.price;
      });
      p.benchBase = base;
      p.benchValue = 100;
    }
    const today = todayKey();
    if (p.turnoverDay !== today) { p.turnover = 0; p.turnoverDay = today; }
    return p;
  }

  function primeInitBenchmark() {
    const p = ensurePrime();
    const base = {};
    D.VN30_IDS.forEach(id => {
      const a = byId[id];
      if (a && a.price > 0) base[id] = a.price;
    });
    p.benchBase = base;
    p.benchValue = 100;
  }

  function primeNavValue() {
    const p = state.prime;
    if (!p || !p.active) return 0;
    let v = (Number(p.cash) || 0) + (Number(p.reserved) || 0);
    Object.keys(p.holdings || {}).forEach(id => {
      const a = byId[id], h = p.holdings[id];
      if (a && h && h.qty > 0) v += notionalVND(a, a.price, h.qty);
    });
    (p.settlements || []).forEach(s => { v += Number(s.amount) || 0; });
    return v;
  }

  function primeSettlingValue() {
    const p = ensurePrime();
    return p.settlements.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  }

  function primePnlValue() {
    const p = ensurePrime();
    if (!p.active) return 0;
    return primeNavValue() - (p.deposited - p.withdrawn);
  }

  function primeReturnPct() {
    const p = ensurePrime();
    const net = p.deposited - p.withdrawn;
    if (!net) return 0;
    return (primeNavValue() - net) / net * 100;
  }

  function primeBenchmark() {
    const p = ensurePrime();
    if (!p.benchBase) { primeInitBenchmark(); return 100; }
    let sum = 0, count = 0;
    Object.keys(p.benchBase).forEach(id => {
      const a = byId[id], base = p.benchBase[id];
      if (!a || !(base > 0) || !(a.price > 0)) return;
      sum += a.price / base;
      count++;
    });
    p.benchValue = count ? sum / count * 100 : 100;
    return p.benchValue;
  }

  function primeEligible(asset) {
    if (!asset || !asset.tradable || !(asset.price > 0)) return false;
    const profile = primeProfile();
    return profile.groups.includes(asset.group);
  }

  function primeEligibleAssets() {
    return D.ASSETS.filter(primeEligible).sort((a, b) => {
      const ga = D.GROUPS[a.group] ? D.GROUPS[a.group].name : a.group;
      const gb = D.GROUPS[b.group] ? D.GROUPS[b.group].name : b.group;
      return ga.localeCompare(gb) || a.symbol.localeCompare(b.symbol);
    });
  }

  function primeBandPct(asset) { return D.PRIME_BANDS[asset.group] || 0.10; }
  function primeBandInfo(asset) {
    const ref = Number(asset.prev) > 0 ? asset.prev : asset.price;
    const band = primeBandPct(asset);
    return { ref, pct: band, min: ref * (1 - band), max: ref * (1 + band) };
  }
  function primeBrokerRate(asset) {
    if (asset.group === 'us') return 0.0012;
    if (asset.group === 'etf') return 0.0010;
    return 0.0015;
  }
  function primeTaxRate(asset) {
    if (['hose', 'hnx', 'upcom'].includes(asset.group)) return 0.001;
    return 0.0001;
  }
  function primeFee(asset, side, notional) {
    const fee = Math.max(15000, notional * primeBrokerRate(asset));
    const tax = side === 'sell' ? notional * primeTaxRate(asset) : 0;
    return { fee, tax, total: fee + tax };
  }
  function primeSlip(asset) {
    return asset.group === 'us' ? 0.0004 : asset.group === 'etf' ? 0.0005 : asset.group === 'upcom' ? 0.0012 : asset.group === 'hnx' ? 0.0009 : 0.0006;
  }

  function primePendingQty(h) {
    const now = Date.now();
    return (h && Array.isArray(h.pending) ? h.pending : []).reduce((s, x) => s + (x.readyAt > now ? Number(x.qty) || 0 : 0), 0);
  }

  function primeReservedSellQty(assetId, excludeOrderId) {
    const p = ensurePrime();
    return p.orders.filter(o => o.status === 'open' && o.side === 'sell' && o.assetId === assetId && o.id !== excludeOrderId)
      .reduce((s, o) => s + (Number(o.qty) || 0), 0);
  }

  function primeAvailableQty(asset, excludeOrderId) {
    const p = ensurePrime();
    const h = p.holdings[asset.id];
    if (!h || !(h.qty > 0)) return 0;
    return Math.max(0, h.qty - primePendingQty(h) - primeReservedSellQty(asset.id, excludeOrderId));
  }

  function primePushHistory(force) {
    const p = ensurePrime();
    if (!p.active) return;
    const now = Date.now();
    if (!force && now - (p.lastSnapshot || 0) < 45000) return;
    p.lastSnapshot = now;
    const net = p.deposited - p.withdrawn;
    p.history.push({
      t: now,
      nav: Math.round(primeNavValue()),
      ret: net > 0 ? Math.round((primeNavValue() / net) * 10000) / 100 : 100,
      bench: Math.round(primeBenchmark() * 100) / 100
    });
    p.history = p.history.slice(-240);
  }

  function primeReleaseReserve(p, o) {
    if (!o || o.side !== 'buy' || !(o.reserved > 0)) return;
    p.reserved = Math.max(0, p.reserved - o.reserved);
    p.cash += o.reserved;
    o.reserved = 0;
  }

  function primeFillOrder(p, o, asset, now) {
    const side = o.side;
    const isBuy = side === 'buy';
    let px = asset.price;
    if (o.type === 'limit') {
      px = isBuy ? Math.min(o.limit, asset.price) : Math.max(o.limit, asset.price);
    } else {
      px = asset.price * (isBuy ? 1 + primeSlip(asset) : 1 - primeSlip(asset));
    }
    const band = primeBandInfo(asset);
    px = clamp(px, band.min, band.max);
    if (!(px > 0)) return false;
    o.fillPrice = px;
    const notional = notionalVND(asset, px, o.qty);
    const { fee, tax } = primeFee(asset, side, notional);

    if (isBuy) {
      const cost = notional + fee;
      const reserved = Number(o.reserved) || 0;
      if (cost > reserved + p.cash + 1) {
        primeReleaseReserve(p, o);
        p.fills.unshift({
          id: uid('pf'), orderId: o.id, t: now, assetId: asset.id, side, qty: o.qty,
          price: px, notional, fee: 0, tax: 0, pnl: 0, kind: 'từ chối', note: 'Không đủ tiền khi khớp'
        });
        return 'rejected';
      }
      p.reserved = Math.max(0, p.reserved - reserved);
      p.cash += reserved - cost;
      o.reserved = 0;
      const h = p.holdings[asset.id] || (p.holdings[asset.id] = { qty: 0, avgCost: 0, pending: [] });
      const prevCost = h.avgCost * h.qty;
      h.qty += o.qty;
      h.avgCost = (prevCost + notional + fee) / h.qty;
      h.pending.push({ qty: o.qty, readyAt: now + PRIME_SETTLE_MS });
      p.fees += fee;
      p.tradeCount++;
      p.fills.unshift({
        id: uid('pf'), orderId: o.id, t: now, assetId: asset.id, side, qty: o.qty,
        price: px, notional, fee, tax: 0, pnl: 0, kind: o.type === 'stop' ? 'stop' : o.type === 'limit' ? 'LO' : 'MP',
        settleAt: now + PRIME_SETTLE_MS
      });
      return 'filled';
    }

    // Bán: kiểm tra cổ phiếu khả dụng, tiền bán vào hàng chờ T+2.
    const available = primeAvailableQty(asset, o.id);
    if (o.qty > available + 1e-9) {
      p.fills.unshift({
        id: uid('pf'), orderId: o.id, t: now, assetId: asset.id, side, qty: o.qty,
        price: px, notional, fee: 0, tax: 0, pnl: 0, kind: 'từ chối', note: 'Cổ phiếu chưa về tài khoản'
      });
      return 'rejected';
    }
    const h = p.holdings[asset.id];
    if (!h || h.qty < o.qty - 1e-9) return 'rejected';
    const proceeds = notional - fee - tax;
    const pnl = proceeds - h.avgCost * o.qty;
    h.qty -= o.qty;
    if (h.qty <= 1e-9) delete p.holdings[asset.id];
    p.realized += pnl;
    p.fees += fee;
    p.tax += tax;
    p.tradeCount++;
    p.settlements.push({
      id: uid('ps'), assetId: asset.id, qty: o.qty, price: px,
      amount: proceeds, t: now, dueAt: now + PRIME_SETTLE_MS
    });
    p.fills.unshift({
      id: uid('pf'), orderId: o.id, t: now, assetId: asset.id, side, qty: o.qty,
      price: px, notional, fee, tax, pnl, kind: o.type === 'stop' ? 'stop' : o.type === 'limit' ? 'LO' : 'MP',
      settleAt: now + PRIME_SETTLE_MS
    });
    return 'filled';
  }

  function primeProcess() {
    const p = ensurePrime();
    if (!p.active) return false;
    const now = Date.now();
    let changed = false;
    let filled = 0;

    // Quyết toán tiền bán sau T+2 nén.
    p.settlements = p.settlements.filter(s => {
      if (s.dueAt <= now) {
        p.cash += Number(s.amount) || 0;
        p.settlementCount++;
        changed = true;
        return false;
      }
      return true;
    });

    // Dọn lô cổ phiếu đã đủ thời gian về tài khoản.
    Object.keys(p.holdings).forEach(id => {
      const h = p.holdings[id];
      if (!h) return;
      const before = h.pending.length;
      h.pending = h.pending.filter(x => x.readyAt > now);
      if (h.pending.length !== before) changed = true;
      if (!(h.qty > 0)) { delete p.holdings[id]; changed = true; }
    });

    const remaining = [];
    p.orders.forEach(o => {
      if (!o || o.status !== 'open') return;
      const a = byId[o.assetId];
      if (!a) { primeReleaseReserve(p, o); changed = true; return; }
      if (o.expiresAt && now > o.expiresAt) {
        primeReleaseReserve(p, o);
        o.status = 'expired';
        changed = true;
        return;
      }
      if (o.type === 'stop' && !o.triggered) {
        const trigger = o.side === 'buy' ? a.price >= o.stop : a.price <= o.stop;
        if (!trigger) { remaining.push(o); return; }
        o.triggered = true;
        o.executeAt = now + 1200 + Math.random() * 1800;
        changed = true;
        remaining.push(o);
        return;
      }
      if (o.type === 'limit' && !o.executeAt) {
        const crosses = o.side === 'buy' ? a.price <= o.limit : a.price >= o.limit;
        if (!crosses) { remaining.push(o); return; }
        o.executeAt = now + 900 + Math.random() * 1700;
        changed = true;
        remaining.push(o);
        return;
      }
      if (o.type === 'limit' && o.executeAt) {
        const stillCrosses = o.side === 'buy' ? a.price <= o.limit : a.price >= o.limit;
        if (!stillCrosses) { o.executeAt = 0; remaining.push(o); return; }
      }
      if (o.executeAt && now >= o.executeAt) {
        const result = primeFillOrder(p, o, a, now);
        changed = true;
        if (result === 'filled') {
          filled++;
          if (currentRoute === 'prime') {
            toast('PRIME khớp lệnh', (o.side === 'buy' ? 'Mua ' : 'Bán ') + fmtQty(a, o.qty) + ' ' + a.symbol + ' @ ' + fmtPrice(a, o.fillPrice), 'success', '💎');
          }
          pushNotif('💎', 'PRIME khớp lệnh', (o.side === 'buy' ? 'Mua ' : 'Bán ') + fmtQty(a, o.qty) + ' ' + a.symbol + ' · ' + fmtVND(o.qty * o.fillPrice * valueFactor(a)) + '.');
        }
        if (o.side === 'buy' && o.reserved) primeReleaseReserve(p, o);
        o.status = result === 'filled' ? 'filled' : result === 'rejected' ? 'rejected' : 'open';
        if (o.status === 'open') remaining.push(o);
        return;
      }
      remaining.push(o);
    });
    p.orders = remaining.filter(o => o.status === 'open');
    if (p.orders.length !== remaining.length) changed = true;

    if (filled) {
      addXP(filled * 8);
      addAura(filled * 2);
      progressQuest('trade', filled);
      snapshotEquity(true);
    }
    primeBenchmark();
    primePushHistory(false);
    p.lastProcess = now;
    if (changed) save();
    return changed;
  }

  function primeOrderEstimate(asset, side, type, qty, price) {
    const q = Number(qty) || 0;
    const px = Number(price) || asset.price;
    const notional = notionalVND(asset, px, q);
    const fees = primeFee(asset, side, notional);
    const slip = type === 'market' ? primeSlip(asset) : 0;
    const fill = side === 'buy' ? px * (1 + slip) : px * (1 - slip);
    const fillNotional = notionalVND(asset, fill, q);
    const fillFees = primeFee(asset, side, fillNotional);
    return { notional, fee: fees.fee, tax: fees.tax, fill, fillNotional, fillFee: fillFees.fee, fillTax: fillFees.tax };
  }

  function primePlaceOrder(input) {
    const p = ensurePrime();
    if (!p.active) return { ok: false, error: 'Hãy mở tài khoản PRIME trước.' };
    const a = byId[input.assetId];
    if (!primeEligible(a)) return { ok: false, error: 'Mã này không thuộc danh mục PRIME của hồ sơ hiện tại.' };
    const side = input.side === 'sell' ? 'sell' : 'buy';
    const type = ['limit', 'stop', 'market'].includes(input.type) ? input.type : 'market';
    let qty = Number(input.qty);
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Khối lượng phải lớn hơn 0.' };
    const step = stepFor(a);
    if (Math.abs(qty / step - Math.round(qty / step)) > 1e-9) return { ok: false, error: 'Khối lượng phải là bội số của ' + fmtQty(a, step) + '.' };
    if (type !== 'market') {
      const px = Number(input.price);
      if (!Number.isFinite(px) || px <= 0) return { ok: false, error: 'Giá lệnh không hợp lệ.' };
      const band = primeBandInfo(a);
      if (px < band.min - 1e-9 || px > band.max + 1e-9) {
        return { ok: false, error: 'Giá vượt biên ' + nf(band.pct * 100, 0) + '% (±' + fmtPrice(a, band.max - band.ref) + '). Hợp lệ: ' + fmtPrice(a, band.min) + ' – ' + fmtPrice(a, band.max) + '.' };
      }
    }
    if (p.orders.length >= 20) return { ok: false, error: 'Tối đa 20 lệnh mở cùng lúc.' };

    const profile = primeProfile();
    const nav = Math.max(1, primeNavValue());
    const est = primeOrderEstimate(a, side, type, qty, input.price);
    if (est.fillNotional > nav * profile.maxOrderPct / 100) {
      return { ok: false, error: 'Giá trị lệnh vượt hạn mức ' + profile.maxOrderPct + '% NAV (' + fmtVND(nav * profile.maxOrderPct / 100) + ').' };
    }
    if (side === 'buy') {
      const h = p.holdings[a.id];
      const current = h ? notionalVND(a, a.price, h.qty) : 0;
      if (current + est.fillNotional > nav * profile.maxPositionPct / 100) {
        return { ok: false, error: 'Tỷ trọng ' + a.symbol + ' sẽ vượt hạn mức ' + profile.maxPositionPct + '% NAV của hồ sơ ' + profile.name + '.' };
      }
    }
    const today = todayKey();
    if (p.turnoverDay !== today) { p.turnover = 0; p.turnoverDay = today; }
    if (p.turnover + est.fillNotional > nav * profile.maxTurnoverX) {
      return { ok: false, error: 'Đã chạm hạn mức luân chuyển ' + nf(profile.maxTurnoverX, 1) + '× NAV trong ngày. Hãy chờ sang ngày mới.' };
    }

    let reserved = 0;
    if (side === 'buy') {
      reserved = Math.ceil((est.fillNotional + est.fillFee) * 1.01);
      if (reserved > p.cash + 1) return { ok: false, error: 'Không đủ tiền khả dụng. Cần ' + fmtVND(reserved) + ', hiện có ' + fmtVND(p.cash) + '.' };
    } else {
      const available = primeAvailableQty(a);
      if (qty > available + 1e-9) {
        return { ok: false, error: 'Chỉ có ' + fmtQty(a, available) + ' ' + a.symbol + ' khả dụng (đã trừ cổ phiếu chờ về và lệnh bán đang mở).' };
      }
    }

    const now = Date.now();
    const order = {
      id: uid('po'), assetId: a.id, side, type, qty,
      limit: type === 'limit' ? Number(input.price) : 0,
      stop: type === 'stop' ? Number(input.price) : 0,
      reserved, createdAt: now, executeAt: 0, triggered: type !== 'stop',
      status: 'open', expiresAt: now + 24 * 3600000,
      note: type === 'limit' ? 'LO · chờ giá chạm' : type === 'stop' ? 'STOP · chờ kích hoạt' : 'MP · khớp theo giá thị trường'
    };
    if (type === 'market') order.executeAt = now + 2200 + Math.random() * 2600;
    if (type === 'limit') {
      const marketable = side === 'buy' ? a.price <= order.limit : a.price >= order.limit;
      if (marketable) order.executeAt = now + 1400 + Math.random() * 2200;
    }
    if (side === 'buy') {
      p.cash -= reserved;
      p.reserved += reserved;
    }
    p.turnover += est.fillNotional;
    p.orders.unshift(order);
    saveNow();
    updateShell();
    return { ok: true, order };
  }

  function primeCancelOrder(id) {
    const p = ensurePrime();
    const o = p.orders.find(x => x.id === id);
    if (!o) return { ok: false, error: 'Không tìm thấy lệnh.' };
    primeReleaseReserve(p, o);
    p.orders = p.orders.filter(x => x.id !== id);
    saveNow();
    updateShell();
    return { ok: true };
  }

  function primeDeposit(amount) {
    const p = ensurePrime();
    if (!p.active) return { ok: false, error: 'Tài khoản PRIME chưa mở.' };
    amount = Math.round(Number(amount) || 0);
    const profile = primeProfile();
    if (amount < 5000000) return { ok: false, error: 'Nạp tối thiểu 5.000.000 ₫ mỗi lần.' };
    if (amount > state.cash + 1) return { ok: false, error: 'Không đủ tiền mặt. Hiện có ' + fmtVND(state.cash) + '.' };
    state.cash -= amount;
    p.cash += amount;
    p.deposited += amount;
    primePushHistory(true);
    saveNow();
    updateShell();
    addXP(12);
    pushNotif('💎', 'Nạp tiền PRIME', '+' + fmtVND(amount) + ' vào tài khoản đầu tư thực mô phỏng.');
    return { ok: true, amount };
  }

  function primeWithdraw(amount) {
    const p = ensurePrime();
    if (!p.active) return { ok: false, error: 'Tài khoản PRIME chưa mở.' };
    amount = Math.round(Number(amount) || 0);
    if (amount < 1000000) return { ok: false, error: 'Rút tối thiểu 1.000.000 ₫.' };
    if (amount > p.cash + 1) return { ok: false, error: 'Tiền khả dụng chỉ còn ' + fmtVND(p.cash) + '. Tiền bán chờ T+2 chưa rút được.' };
    p.cash -= amount;
    p.withdrawn += amount;
    state.cash += amount;
    primePushHistory(true);
    saveNow();
    updateShell();
    pushNotif('💎', 'Rút tiền PRIME', '−' + fmtVND(amount) + ' về ví chính.');
    return { ok: true, amount };
  }

  function primeActivate(profileId, amount) {
    const profile = PRIME_PROFILE_BY_ID[profileId] || D.PRIME_PROFILES[1];
    amount = Math.round(Number(amount) || 0);
    if (state.prime && state.prime.active) return { ok: false, error: 'Tài khoản PRIME đã mở.' };
    if (amount < profile.minDeposit) return { ok: false, error: 'Hồ sơ ' + profile.name + ' cần nạp tối thiểu ' + fmtVND(profile.minDeposit) + '.' };
    if (amount > state.cash + 1) return { ok: false, error: 'Không đủ tiền mặt. Hiện có ' + fmtVND(state.cash) + '.' };
    state.prime = primeDefault();
    const p = state.prime;
    p.active = true;
    p.profile = profile.id;
    p.createdAt = Date.now();
    p.navStart = amount;
    p.cash = amount;
    p.deposited = amount;
    p.turnoverDay = todayKey();
    state.cash -= amount;
    primeInitBenchmark();
    primePushHistory(true);
    saveNow();
    addXP(45);
    addAura(60);
    updateShell();
    confetti(50);
    pushNotif('💎', 'Tài khoản PRIME đã mở', 'Hồ sơ ' + profile.name + ' · nạp ' + fmtVND(amount) + ' · ' + D.PRIME_SETTLE_LABEL + '.');
    return { ok: true };
  }

  function primeDeactivate() {
    const p = ensurePrime();
    if (!p.active) return { ok: false, error: 'Tài khoản PRIME chưa mở.' };
    if (p.orders.length) return { ok: false, error: 'Còn ' + p.orders.length + ' lệnh mở. Hãy huỷ trước khi đóng tài khoản.' };
    if (Object.keys(p.holdings).length) return { ok: false, error: 'Còn cổ phiếu trong tài khoản. Hãy bán hết trước khi đóng.' };
    if (p.settlements.length) return { ok: false, error: 'Còn khoản tiền chờ quyết toán T+2.' };
    const cash = p.cash;
    state.cash += cash;
    state.prime = primeDefault();
    saveNow();
    updateShell();
    toast('Đã đóng tài khoản PRIME', 'Đã chuyển ' + fmtVND(cash) + ' về ví chính. Bạn có thể mở lại bất cứ lúc nào.', 'info', '💎');
    return { ok: true };
  }

  /* ------------------------------ PRIME UI ------------------------------ */
  let primeChartSeries = null;
  let primeChartDraw = null;

  function primeTimeLabel(ts) {
    const d = new Date(ts || Date.now());
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function primeCountdown(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function primeEmpty(text) {
    return '<div class="prime-empty">' + icon('info') + '<span>' + esc(text) + '</span></div>';
  }

  function primeSetupHTML() {
    if (!PRIME_PROFILE_BY_ID[primeUi.profile]) primeUi.profile = 'balanced';
    const profile = PRIME_PROFILE_BY_ID[primeUi.profile];
    if (!(primeUi.deposit > 0)) primeUi.deposit = Math.min(state.cash, profile.minDeposit);
    const amount = Number(primeUi.deposit) || 0;
    const enough = amount >= profile.minDeposit && amount <= state.cash;
    const profiles = D.PRIME_PROFILES.map(pr => {
      const on = primeUi.profile === pr.id;
      const afford = state.cash >= pr.minDeposit;
      return '<button class="prime-profile' + (on ? ' on' : '') + '" data-action="prime-pick-profile" data-id="' + pr.id + '" style="--pc:' + pr.color + '">' +
        '<div class="prime-profile-head"><span class="prime-profile-icon">' + pr.icon + '</span>' + (on ? '<span class="prime-profile-pick">' + icon('check') + '</span>' : '') + '</div>' +
        '<h3>' + esc(pr.name) + '</h3><p>' + esc(pr.desc) + '</p>' +
        '<div class="prime-profile-limits"><span>Lệnh <b>' + pr.maxOrderPct + '%</b> NAV</span><span>Mã <b>' + pr.maxPositionPct + '%</b> NAV</span><span>Luân chuyển <b>' + nf(pr.maxTurnoverX, 1) + '×</b></span></div>' +
        '<div class="prime-profile-foot"><span>Tối thiểu <b>' + fmtVND(pr.minDeposit) + '</b></span><em class="' + (afford ? 'up' : 'down') + '">' + (afford ? 'Đủ điều kiện' : 'Thiếu vốn') + '</em></div></button>';
    }).join('');
    const presets = [50000000, 100000000, 200000000, 500000000];
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('sparkles') + ' PRIME · Tài khoản đầu tư mô phỏng</div><h1>Tài khoản đầu tư thực</h1>' +
      '<p class="sub">Một tài khoản riêng với cơ chế của thị trường thật: lệnh MP/LO/STOP, biên giá, lô chẵn, phí môi giới, thuế bán và quyết toán T+2 nén còn 2 phút. Toàn bộ vẫn là vốn ảo — nhưng kỷ luật và phản xạ là thật.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/portfolio">' + icon('wallet') + ' Danh mục</button><button class="btn btn-ghost btn-sm" data-nav="#/library">' + icon('book') + ' Ôn tập</button></div></div>' +
      '<div class="prime-hero"><div class="prime-hero-mark">💎</div><div class="prime-hero-copy"><div class="page-eyebrow">Đặt lệnh có lý do</div><h2>Không mua theo cảm xúc. Mỗi lệnh đều có lý do.</h2><p>PRIME yêu cầu bạn chọn hồ sơ rủi ro, nạp vốn riêng và chấp nhận hạn mức. Mọi lệnh đều đi qua kiểm tra biên giá, sức mua, tỷ trọng và luân chuyển — giống một tài khoản đầu tư thực sự.</p></div>' +
      '<div class="prime-hero-facts"><div><span>Quyết toán</span><b>' + D.PRIME_SETTLE_LABEL + '</b></div><div><span>Lệnh hỗ trợ</span><b>MP · LO · STOP</b></div><div><span>Sàn</span><b>HOSE · HNX · UPCoM · US · ETF</b></div></div></div>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Chọn hồ sơ mandate</div><div class="card-sub">Hồ sơ quyết định danh mục được phép và hạn mức rủi ro</div></div><span class="badge badge-gold">3 hồ sơ</span></div>' +
      '<div class="prime-profiles">' + profiles + '</div></section>' +
      '<div class="two-col prime-open-grid"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Nạp vốn ban đầu</div><div class="card-sub">Tiền được chuyển từ ví chính sang tài khoản PRIME</div></div></div>' +
      '<label class="prime-field"><span>Số tiền nạp</span><input id="primeDepositInput" type="number" min="0" step="100000" value="' + amount + '"></label>' +
      '<div class="prime-cash-presets">' + presets.map(v => '<button data-action="prime-deposit-preset" data-id="' + v + '">' + money(v) + '</button>').join('') +
      '<button data-action="prime-deposit-preset" data-id="max">Tối đa</button></div>' +
      '<div class="prime-open-summary"><div><span>Hồ sơ đã chọn</span><b>' + profile.icon + ' ' + esc(profile.name) + '</b></div><div><span>Nạp tối thiểu</span><b>' + fmtVND(profile.minDeposit) + '</b></div><div><span>Ví chính hiện có</span><b>' + fmtVND(state.cash) + '</b></div></div>' +
      '<button class="btn btn-gold btn-block"' + (enough ? '' : ' disabled') + ' data-action="prime-activate">' + icon('sparkles') + ' MỞ TÀI KHOẢN PRIME</button>' +
      '<div class="prime-open-note">' + (amount < profile.minDeposit ? 'Cần nạp thêm ' + fmtVND(profile.minDeposit - amount) + ' để mở hồ sơ này.' : amount > state.cash ? 'Ví chính không đủ tiền mặt.' : 'Bạn có thể nạp thêm hoặc rút bất cứ lúc nào khi tài khoản đang mở.') + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('scale') + ' Luật chơi PRIME</div><div class="card-sub">Mô phỏng sát cơ chế thị trường, không phải tiền thật</div></div></div>' +
      '<ul class="prime-rules"><li><b>Biên giá:</b> ±7% HOSE · ±10% HNX/ETF · ±15% UPCoM · ±25% US so với giá tham chiếu.</li><li><b>Lô:</b> cổ phiếu Việt Nam giao dịch theo lô 100; US/ETF theo lô của từng mã.</li><li><b>Phí:</b> môi giới 0,15% (VN), 0,12% (US), 0,10% (ETF); thuế bán 0,10% (VN) và 0,01% (US).</li><li><b>Trượt giá:</b> lệnh MP khớp quanh giá thị trường, có trượt giá theo thanh khoản.</li><li><b>T+2 nén:</b> cổ phiếu mua và tiền bán đều chờ 2 phút mới khả dụng. Đây là mô phỏng, không phải quy định thật.</li><li><b>Mandate:</b> chặn lệnh vượt hạn mức mỗi lệnh, tỷ trọng mã và luân chuyển ngày.</li></ul></section></div>';
  }

  function primeKpisHTML() {
    const p = ensurePrime();
    const nav = primeNavValue(), pnl = primePnlValue(), ret = primeReturnPct(), bench = primeBenchmark();
    const net = p.deposited - p.withdrawn;
    const alpha = ret - (bench - 100);
    return '<div class="prime-kpi"><span>NAV</span><b>' + fmtVND(nav) + '</b><em>Vốn ròng ' + fmtVND(net) + '</em></div>' +
      '<div class="prime-kpi"><span>Lãi / lỗ</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + '</b><em class="' + changeCls(ret) + '">' + (ret >= 0 ? '+' : '') + nf(ret, 2) + '%</em></div>' +
      '<div class="prime-kpi"><span>Tiền mặt khả dụng</span><b>' + fmtVND(p.cash) + '</b><em>Tạm giữ ' + fmtVND(p.reserved) + '</em></div>' +
      '<div class="prime-kpi"><span>Chờ quyết toán</span><b>' + fmtVND(primeSettlingValue()) + '</b><em>' + p.settlements.length + ' khoản T+2</em></div>' +
      '<div class="prime-kpi"><span>Alpha vs VN30</span><b class="' + changeCls(alpha) + '">' + (alpha >= 0 ? '+' : '') + nf(alpha, 2) + '%</b><em>VN30 ' + nf(bench - 100, 2) + '%</em></div>' +
      '<div class="prime-kpi"><span>Phí & thuế</span><b>' + fmtVND(p.fees + p.tax) + '</b><em>' + p.tradeCount + ' lần khớp</em></div>';
  }

  function primeHoldingsHTML() {
    const p = ensurePrime();
    const rows = Object.keys(p.holdings).map(id => {
      const a = byId[id], h = p.holdings[id];
      if (!a || !h || h.qty <= 0) return '';
      const value = notionalVND(a, a.price, h.qty);
      const cost = h.avgCost * h.qty;
      const pnl = value - cost;
      const pendingQty = (h.pending || []).filter(x => x.readyAt > Date.now()).reduce((s, x) => s + x.qty, 0);
      return '<tr><td><div class="prime-sym"><b>' + a.symbol + '</b><span>' + esc(a.name) + '</span></div></td>' +
        '<td class="num">' + fmtQty(a, h.qty) + (pendingQty > 0 ? '<span class="prime-pending">' + fmtQty(a, pendingQty) + ' chờ về</span>' : '') + '</td>' +
        '<td class="num">' + fmtPrice(a, h.avgCost) + '</td><td class="num">' + fmtPrice(a) + '</td>' +
        '<td class="num">' + fmtVND(value) + '</td>' +
        '<td class="num ' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + '<span>' + nf(cost ? pnl / cost * 100 : 0, 2) + '%</span></td>' +
        '<td class="num"><button class="btn btn-ghost btn-xs" data-action="prime-ticket-sell" data-id="' + id + '">Bán</button></td></tr>';
    }).filter(Boolean).join('');
    if (!rows) return primeEmpty('Chưa có cổ phiếu nào. Chọn một mã và đặt lệnh mua đầu tiên.');
    return '<div class="prime-table-wrap"><table class="prime-table"><thead><tr><th>Mã</th><th class="num">Khối lượng</th><th class="num">Giá vốn</th><th class="num">Giá hiện tại</th><th class="num">Giá trị</th><th class="num">Lãi / lỗ</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function primeOrdersHTML() {
    const p = ensurePrime();
    if (!p.orders.length) return primeEmpty('Không có lệnh mở. Lệnh MP khớp sau vài giây, LO/STOP chờ điều kiện.');
    return '<div class="prime-order-list">' + p.orders.map(o => {
      const a = byId[o.assetId];
      if (!a) return '';
      const status = o.type === 'market' ? 'Đang khớp MP' : o.type === 'limit' ? (o.executeAt ? 'Đang khớp LO' : 'Chờ giá chạm ' + fmtPrice(a, o.limit)) : (o.triggered ? 'Đã kích hoạt · đang khớp' : 'Chờ ' + (o.side === 'buy' ? 'tăng' : 'giảm') + ' tới ' + fmtPrice(a, o.stop));
      return '<div class="prime-order"><div class="prime-order-main"><span class="prime-side-badge ' + o.side + '">' + (o.side === 'buy' ? 'MUA' : 'BÁN') + '</span><b>' + a.symbol + '</b><span>' + fmtQty(a, o.qty) + ' @ ' + (o.type === 'market' ? 'MP' : fmtPrice(a, o.type === 'limit' ? o.limit : o.stop)) + '</span></div>' +
        '<div class="prime-order-meta"><span>' + esc(o.note) + '</span><em>' + status + '</em>' + (o.reserved ? '<span>Tạm giữ ' + fmtVND(o.reserved) + '</span>' : '') + '</div>' +
        '<button class="btn btn-ghost btn-xs" data-action="prime-cancel-order" data-id="' + o.id + '">Huỷ</button></div>';
    }).join('') + '</div>';
  }

  function primeSettlementsHTML() {
    const p = ensurePrime();
    if (!p.settlements.length) return primeEmpty('Không có khoản nào chờ quyết toán.');
    return '<div class="prime-settle-list">' + p.settlements.map(s => {
      const a = byId[s.assetId];
      return '<div class="prime-settle"><div><b>' + (a ? a.symbol : s.assetId) + '</b><span>Bán ' + (a ? fmtQty(a, s.qty) : s.qty) + ' · ' + fmtVND(s.amount) + '</span></div><em data-settle-at="' + s.dueAt + '">' + primeCountdown(s.dueAt - Date.now()) + '</em></div>';
    }).join('') + '</div>';
  }

  function primeFillsHTML() {
    const p = ensurePrime();
    if (!p.fills.length) return primeEmpty('Chưa có lần khớp lệnh nào.');
    return '<div class="prime-fill-list">' + p.fills.slice(0, 14).map(f => {
      const a = byId[f.assetId];
      const rejected = f.kind === 'từ chối';
      return '<div class="prime-fill' + (rejected ? ' rejected' : '') + '"><div><span class="prime-side-badge ' + f.side + '">' + (f.side === 'buy' ? 'M' : 'B') + '</span><b>' + (a ? a.symbol : f.assetId) + '</b><span>' + (a ? fmtQty(a, f.qty) : f.qty) + ' @ ' + fmtPrice(a || { decimals: 2 }, f.price) + '</span></div>' +
        '<div class="prime-fill-meta"><span>' + primeTimeLabel(f.t) + ' · ' + esc(f.kind) + '</span>' + (rejected ? '<em class="down">' + esc(f.note || 'Bị từ chối') + '</em>' : '<span>Phí ' + fmtVND(f.fee) + (f.tax ? ' · Thuế ' + fmtVND(f.tax) : '') + '</span>') + '</div>' +
        (!rejected && f.side === 'sell' ? '<em class="' + changeCls(f.pnl) + '">' + (f.pnl >= 0 ? '+' : '') + fmtVND(f.pnl) + '</em>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function primeMandateHTML() {
    const p = ensurePrime(), profile = primeProfile();
    const nav = Math.max(1, primeNavValue());
    const turnoverLimit = nav * profile.maxTurnoverX;
    const turnoverPct = clamp(p.turnover / Math.max(1, turnoverLimit) * 100, 0, 100);
    const realizedPct = p.deposited ? p.realized / p.deposited * 100 : 0;
    return '<div class="prime-mandate-profile" style="--pc:' + profile.color + '"><span>' + profile.icon + '</span><div><b>' + esc(profile.name) + '</b><em>' + esc(profile.universe) + '</em></div></div>' +
      '<div class="prime-mandate-rows"><div><span>Lệnh tối đa</span><b>' + profile.maxOrderPct + '% NAV</b></div><div><span>Tỷ trọng mã tối đa</span><b>' + profile.maxPositionPct + '% NAV</b></div><div><span>Luân chuyển hôm nay</span><b>' + fmtVND(p.turnover) + ' / ' + fmtVND(turnoverLimit) + '</b></div></div>' +
      '<div class="prime-meter"><span style="width:' + turnoverPct + '%"></span></div>' +
      '<div class="prime-mandate-rows"><div><span>Lãi thực hiện</span><b class="' + changeCls(p.realized) + '">' + (p.realized >= 0 ? '+' : '') + fmtVND(p.realized) + '</b></div><div><span>Tỷ suất thực hiện</span><b class="' + changeCls(realizedPct) + '">' + nf(realizedPct, 2) + '%</b></div><div><span>Đã nạp / đã rút</span><b>' + fmtVND(p.deposited) + ' / ' + fmtVND(p.withdrawn) + '</b></div><div><span>Phí / thuế</span><b>' + fmtVND(p.fees) + ' / ' + fmtVND(p.tax) + '</b></div></div>' +
      '<div class="prime-mandate-note">' + icon('info') + ' Đóng tài khoản chỉ khi không còn lệnh mở, cổ phiếu và khoản chờ T+2.</div>';
  }

  function primeEstimateHTML() {
    const a = byId[primeUi.assetId];
    if (!a) return '<div class="prime-estimate-note">Chọn mã để xem chi phí dự kiến.</div>';
    const qty = Number(primeUi.qty) || 0;
    if (!(qty > 0)) return '<div class="prime-estimate-note">Nhập khối lượng để xem giá trị, phí và thuế dự kiến.</div>';
    const px = primeUi.type === 'market' ? a.price : (Number(primeUi.price) || a.price);
    const est = primeOrderEstimate(a, primeUi.side, primeUi.type, qty, px);
    const isBuy = primeUi.side === 'buy';
    return '<div class="prime-estimate-grid"><div><span>Giá trị dự kiến</span><b>' + fmtVND(est.fillNotional) + '</b></div>' +
      '<div><span>Phí môi giới</span><b>' + fmtVND(est.fillFee) + '</b></div>' +
      '<div><span>Thuế bán</span><b>' + fmtVND(est.fillTax) + '</b></div>' +
      '<div><span>' + (isBuy ? 'Tổng cần trả' : 'Thực nhận') + '</span><b class="' + (isBuy ? 'down' : 'up') + '">' + fmtVND(isBuy ? est.fillNotional + est.fillFee : est.fillNotional - est.fillFee - est.fillTax) + '</b></div></div>';
  }

  function primeTicketInnerHTML() {
    const p = ensurePrime();
    const assets = primeEligibleAssets();
    if (!assets.length) return '<div class="card-head"><div class="card-title">Vé lệnh PRIME</div></div>' + primeEmpty('Hồ sơ hiện tại không có mã nào khả dụng.');
    if (!primeUi.assetId || !assets.some(a => a.id === primeUi.assetId)) primeUi.assetId = assets[0].id;
    const a = byId[primeUi.assetId];
    const side = primeUi.side, type = primeUi.type;
    const band = primeBandInfo(a);
    const avail = primeAvailableQty(a);
    return '<div class="card-head"><div><div class="card-title">' + icon('target') + ' Vé lệnh PRIME</div><div class="card-sub">MP khớp thị trường · LO chờ giá · STOP kích hoạt</div></div><span class="badge">' + esc(primeProfile().name) + '</span></div>' +
      '<div class="prime-side-toggle"><button class="buy' + (side === 'buy' ? ' on' : '') + '" data-action="prime-ticket-side" data-id="buy">MUA</button><button class="sell' + (side === 'sell' ? ' on' : '') + '" data-action="prime-ticket-side" data-id="sell">BÁN</button></div>' +
      '<label class="prime-field"><span>Mã giao dịch</span><select id="primeAsset">' + assets.map(x => '<option value="' + x.id + '"' + (x.id === primeUi.assetId ? ' selected' : '') + '>' + x.symbol + ' · ' + esc(x.name) + '</option>').join('') + '</select></label>' +
      '<div class="prime-quote"><div><b>' + a.symbol + '</b><span>' + esc(a.name) + '</span></div><div><b data-prime-price>' + fmtPrice(a) + ' ' + priceUnit(a) + '</b><em class="' + changeCls(a.changePct) + '">' + fmtPct(a.changePct) + '</em></div></div>' +
      '<div class="prime-band"><span>Biên giá tham chiếu</span><b>' + fmtPrice(a, band.min) + ' – ' + fmtPrice(a, band.max) + '</b></div>' +
      '<div class="prime-ticket-row"><label class="prime-field"><span>Loại lệnh</span><select id="primeType"><option value="market"' + (type === 'market' ? ' selected' : '') + '>MP · Thị trường</option><option value="limit"' + (type === 'limit' ? ' selected' : '') + '>LO · Giới hạn</option><option value="stop"' + (type === 'stop' ? ' selected' : '') + '>STOP · Kích hoạt</option></select></label>' +
      '<label class="prime-field"><span>Khối lượng</span><input id="primeQty" type="number" min="0" step="any" value="' + (primeUi.qty || '') + '" placeholder="0"></label></div>' +
      (type !== 'market' ? '<label class="prime-field"><span>' + (type === 'limit' ? 'Giá giới hạn' : 'Giá kích hoạt') + '</span><input id="primePrice" type="number" min="0" step="any" value="' + (primeUi.price || a.price) + '"></label>' : '') +
      '<div class="prime-quick-qty"><span>' + (side === 'buy' ? 'Hạn mức/lệnh: <b>' + fmtVND(primeBuyBudget()) + '</b> · tiền mặt <b>' + fmtVND(p.cash) + '</b>' : 'Khả dụng: <b>' + fmtQty(a, avail) + ' ' + a.symbol + '</b>') + '</span>' +
      [10, 25, 50, 100].map(pct => '<button data-action="prime-qty" data-id="' + pct + '">' + pct + '%</button>').join('') + '</div>' +
      '<div class="prime-estimate" id="primeEstimate">' + primeEstimateHTML() + '</div>' +
      '<button class="btn btn-gold btn-block" data-action="prime-submit">' + icon('play') + ' ĐẶT LỆNH ' + (side === 'buy' ? 'MUA' : 'BÁN') + '</button>' +
      '<div class="prime-ticket-note">' + (side === 'buy' ? 'Tiền được tạm giữ khi đặt lệnh. Lệnh MP thường khớp sau vài giây.' : 'Cổ phiếu mua chờ T+2 nén 2 phút mới bán được. Tiền bán cũng chờ 2 phút.') + '</div>';
  }

  function primeHistorySeries() {
    const p = ensurePrime();
    const hist = (p.history || []).slice(-120);
    let nav = hist.map(h => h.ret);
    let bench = hist.map(h => h.bench);
    const net = p.deposited - p.withdrawn;
    if (!nav.length) { nav = [100]; bench = [100]; }
    nav.push(net > 0 ? primeNavValue() / net * 100 : 100);
    bench.push(primeBenchmark());
    return { nav, bench };
  }

  function primeActiveHTML() {
    const p = ensurePrime();
    const profile = primeProfile();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('sparkles') + ' PRIME · Hồ sơ ' + esc(profile.name) + '</div><h1>Tài khoản đầu tư thực</h1>' +
      '<p class="sub">' + esc(profile.universe) + ' · ' + D.PRIME_SETTLE_LABEL + ' · Mở ' + primeTimeLabel(p.createdAt) + '. Mọi con số đều là mô phỏng, nhưng quy trình lệnh và hạn mức thì thật.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-action="prime-open-deposit">' + icon('plus') + ' Nạp</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="prime-open-withdraw">' + icon('minus') + ' Rút</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="prime-close">' + icon('close') + ' Đóng tài khoản</button></div></div>' +
      '<div class="prime-kpis" id="primeKpis">' + primeKpisHTML() + '</div>' +
      '<div class="prime-layout"><div class="prime-main">' +
      '<section class="card prime-chart-card"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Hiệu suất PRIME vs VN30</div><div class="card-sub">Chỉ số 100 tại thời điểm mở tài khoản · cập nhật theo giá thị trường</div></div><span class="prime-live-dot">LIVE</span></div>' +
      '<canvas id="primeChart" class="prime-chart" height="220"></canvas><div class="prime-chart-legend"><span><i style="background:#f3c56b"></i>PRIME</span><span><i style="background:#5ac8fa"></i>VN30</span></div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Danh mục PRIME</div><div class="card-sub">Giá vốn đã gồm phí mua · giá trị theo giá thị trường hiện tại</div></div><span class="badge" id="primeHoldingsCount">' + Object.keys(p.holdings).length + ' mã</span></div><div id="primeHoldings">' + primeHoldingsHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Lệnh đang mở</div><div class="card-sub">Huỷ lệnh sẽ hoàn tiền tạm giữ ngay lập tức</div></div><span class="badge" id="primeOrdersCount">' + p.orders.length + ' lệnh</span></div><div id="primeOrders">' + primeOrdersHTML() + '</div></section>' +
      '<div class="two-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Chờ quyết toán T+2</div><div class="card-sub">Tiền bán về sau 2 phút</div></div></div><div id="primeSettlements">' + primeSettlementsHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('file') + ' Lịch sử khớp lệnh</div><div class="card-sub">Bao gồm cả lệnh bị từ chối</div></div></div><div id="primeFills">' + primeFillsHTML() + '</div></section></div>' +
      '</div><aside class="prime-side"><section class="card prime-ticket-card"><div id="primeTicket">' + primeTicketInnerHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Mandate & rủi ro</div><div class="card-sub">Hạn mức được kiểm tra trước mỗi lệnh</div></div></div><div id="primeMandate">' + primeMandateHTML() + '</div></section></aside></div>';
  }

  function primeHTML() {
    return ensurePrime().active ? primeActiveHTML() : primeSetupHTML();
  }

  function primeRenderTicket() {
    const box = $('#primeTicket');
    if (!box) return;
    box.innerHTML = primeTicketInnerHTML();
    primeUpdateEstimate();
  }

  function primeUpdateEstimate() {
    const el = $('#primeEstimate');
    if (!el) return;
    el.innerHTML = primeEstimateHTML();
  }

  function primeUpdateChart() {
    if (!primeChartSeries) return;
    const hist = primeHistorySeries();
    primeChartSeries[0].values.splice(0, primeChartSeries[0].values.length, ...hist.nav);
    primeChartSeries[1].values.splice(0, primeChartSeries[1].values.length, ...hist.bench);
    if (primeChartDraw) primeChartDraw();
  }

  function primeDrawChart() {
    const canvas = $('#primeChart');
    if (!canvas) return;
    const hist = primeHistorySeries();
    primeChartSeries = [
      { values: hist.nav.slice(), color: '#f3c56b', label: 'PRIME', fill: true },
      { values: hist.bench.slice(), color: '#5ac8fa', label: 'VN30', dash: [3, 3] }
    ];
    primeChartDraw = CH.MiniChart.multiLine(canvas, primeChartSeries, {});
  }

  function primeRefreshPanels() {
    if (currentRoute !== 'prime') return;
    const p = ensurePrime();
    if (!p.active) return;
    const kpis = $('#primeKpis'); if (kpis) kpis.innerHTML = primeKpisHTML();
    const holdings = $('#primeHoldings'); if (holdings) holdings.innerHTML = primeHoldingsHTML();
    const orders = $('#primeOrders'); if (orders) orders.innerHTML = primeOrdersHTML();
    const settles = $('#primeSettlements'); if (settles) settles.innerHTML = primeSettlementsHTML();
    const fills = $('#primeFills'); if (fills) fills.innerHTML = primeFillsHTML();
    const mandate = $('#primeMandate'); if (mandate) mandate.innerHTML = primeMandateHTML();
    const holdCount = $('#primeHoldingsCount'); if (holdCount) holdCount.textContent = Object.keys(p.holdings).length + ' mã';
    const orderCount = $('#primeOrdersCount'); if (orderCount) orderCount.textContent = p.orders.length + ' lệnh';
    $$('[data-settle-at]').forEach(el => { el.textContent = primeCountdown(Number(el.getAttribute('data-settle-at')) - Date.now()); });
    primeUpdateChart();
    primeUpdateEstimate();
  }

  function primeBuyBudget() {
    const p = ensurePrime();
    const cap = primeNavValue() * primeProfile().maxOrderPct / 100;
    return Math.max(0, Math.min(p.cash, cap));
  }

  function primeQtyByPct(pct) {
    const p = ensurePrime();
    const a = byId[primeUi.assetId];
    if (!a) return 0;
    if (primeUi.side === 'buy') {
      const px = primeUi.type === 'market' ? a.price : (Number(primeUi.price) || a.price);
      const unit = notionalVND(a, px * (1 + primeSlip(a)), 1) * (1 + primeBrokerRate(a) * 1.02);
      return roundQty(a, primeBuyBudget() * pct / 100 / Math.max(1e-9, unit));
    }
    return roundQty(a, primeAvailableQty(a) * pct / 100);
  }

  function primeSubmitOrder() {
    const a = byId[primeUi.assetId];
    if (!a) return toast('Chưa chọn mã', 'Hãy chọn một mã trong danh mục PRIME.', 'error', '⚠️');
    const qtyEl = $('#primeQty');
    const priceEl = $('#primePrice');
    const qty = qtyEl ? Number(qtyEl.value) : Number(primeUi.qty);
    const price = priceEl ? Number(priceEl.value) : (Number(primeUi.price) || a.price);
    primeUi.qty = Number.isFinite(qty) ? qty : 0;
    const res = primePlaceOrder({ assetId: a.id, side: primeUi.side, type: primeUi.type, qty, price });
    if (!res.ok) return toast('Không thể đặt lệnh', res.error, 'error', '⚠️');
    toast('Đã gửi lệnh PRIME', (res.order.side === 'buy' ? 'Mua ' : 'Bán ') + fmtQty(a, qty) + ' ' + a.symbol + ' · ' + res.order.note, 'success', '💎');
    primeUi.qty = 0;
    primeRenderTicket();
    primeRefreshPanels();
  }

  function openPrimeCashModal(mode) {
    const p = ensurePrime();
    if (!p.active) return;
    const isDep = mode === 'deposit';
    const max = Math.max(0, isDep ? state.cash : p.cash);
    const seed = Math.min(max, isDep ? 100000000 : 50000000);
    const presets = [10000000, 50000000, 100000000, 200000000];
    openModal({
      title: isDep ? '💎 Nạp tiền vào PRIME' : '💎 Rút tiền từ PRIME',
      sub: isDep ? 'Chuyển từ ví chính sang tài khoản đầu tư thực mô phỏng' : 'Chuyển tiền mặt khả dụng về ví chính',
      size: 'modal-sm',
      body: '<div class="prime-cash"><label class="prime-field"><span>Số tiền</span><input id="primeCashInput" type="number" min="0" step="100000" value="' + seed + '"></label>' +
        '<div class="prime-cash-presets">' + presets.map(v => '<button data-prime-cash="' + v + '">' + money(v) + '</button>').join('') + '<button data-prime-cash="max">Tối đa</button></div>' +
        '<div class="prime-cash-note">' + (isDep ? 'Tiền nạp trở thành NAV. Phí giao dịch và thuế được trừ trong tài khoản PRIME.' : 'Chỉ rút được tiền mặt khả dụng. Tiền bán đang chờ T+2 chưa rút được.') + ' Tối đa: <b>' + fmtVND(max) + '</b>.</div>' +
        '<button class="btn btn-gold btn-block" data-action="prime-cash-submit" data-mode="' + mode + '">' + (isDep ? 'XÁC NHẬN NẠP' : 'XÁC NHẬN RÚT') + '</button></div>',
      onOpen: modal => {
        modal.querySelectorAll('[data-prime-cash]').forEach(btn => btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-prime-cash');
          const input = modal.querySelector('#primeCashInput');
          if (input) input.value = v === 'max' ? max : Math.min(max, Number(v));
        }));
      }
    });
  }

  function openPrimeCloseModal() {
    openModal({
      title: 'Đóng tài khoản PRIME',
      sub: 'Chỉ thực hiện được khi tài khoản đã sạch vị thế',
      size: 'modal-sm',
      body: '<div class="prime-cash"><div class="prime-cash-note">Bạn cần huỷ toàn bộ lệnh mở, bán hết cổ phiếu và chờ các khoản T+2 về trước khi đóng. Tiền mặt còn lại sẽ được chuyển về ví chính.</div>' +
        '<button class="btn btn-gold btn-block" data-action="prime-deactivate-confirm">XÁC NHẬN ĐÓNG TÀI KHOẢN</button>' +
        '<button class="btn btn-ghost btn-block" data-close-modal>Giữ tài khoản</button></div>'
    });
  }

  function mountPrime() {
    const p = ensurePrime();
    if (!p.active) {
      const input = $('#primeDepositInput');
      if (input) input.addEventListener('input', () => { primeUi.deposit = Number(input.value) || 0; });
      return;
    }
    primeDrawChart();
    primeRefreshPanels();
    const ticket = $('#primeTicket');
    if (ticket) {
      ticket.addEventListener('input', e => {
        if (e.target.id === 'primeQty') { primeUi.qty = Number(e.target.value) || 0; primeUpdateEstimate(); }
        if (e.target.id === 'primePrice') { primeUi.price = Number(e.target.value) || 0; primeUpdateEstimate(); }
      });
      ticket.addEventListener('change', e => {
        if (e.target.id === 'primeAsset') {
          primeUi.assetId = e.target.value;
          const a = byId[primeUi.assetId];
          primeUi.price = a ? a.price : 0;
          primeUi.qty = 0;
          primeRenderTicket();
        }
        if (e.target.id === 'primeType') {
          primeUi.type = ['limit', 'stop', 'market'].includes(e.target.value) ? e.target.value : 'market';
          const a = byId[primeUi.assetId];
          primeUi.price = a ? a.price : 0;
          primeRenderTicket();
        }
      });
    }
    if (primeTimer) clearInterval(primeTimer);
    primeTimer = setInterval(() => {
      if (document.hidden) return;
      primeProcess();
      primeRefreshPanels();
    }, 2000);
  }

  /* ------------------------------ AUCTIONS ENGINE ------------------------------ */
  const AUCTION_BY_ID = Object.create(null);
  D.AUCTION_TYPES.forEach(t => { AUCTION_BY_ID[t.id] = t; });
  const AUCTION_ACTIVE_TARGET = 6;
  const AUCTION_BOT_NAMES = ['Quỹ Bình Minh', 'Cá Mập 47', 'Alpha Capital', 'Tay To Ẩn Danh', 'Sói Già', 'ETF Robot', 'Nhà Đầu Tư 88', 'Quỹ Nến Xanh'];
  let auctionFilter = 'all';
  let auctionsTimer = null;

  function auctionsShape() {
    if (!state.auctions || typeof state.auctions !== 'object') state.auctions = auctionsDefault();
    const a = state.auctions;
    if (!Array.isArray(a.lots)) a.lots = [];
    if (!Array.isArray(a.history)) a.history = [];
    ['escrow', 'wins', 'saved', 'spent', 'lastRefresh'].forEach(k => { if (!Number.isFinite(a[k])) a[k] = 0; });
    return a;
  }

  function auctionTypeOf(lot) { return AUCTION_BY_ID[lot.type] || D.AUCTION_TYPES[0]; }
  function auctionMarketValue(lot) {
    const asset = byId[lot.assetId];
    return asset ? notionalVND(asset, asset.price, lot.qty) : lot.marketValueVND;
  }
  function auctionLotPrice(lot) {
    if (lot.type === 'dutch') {
      const total = Math.max(1, lot.endsAt - lot.createdAt);
      const progress = clamp((Date.now() - lot.createdAt) / total, 0, 1);
      return Math.max(lot.floorPrice, Math.round((lot.floorPrice + (lot.startPrice - lot.floorPrice) * (1 - progress)) / 1000) * 1000);
    }
    if (lot.type === 'sealed') return lot.reserve;
    return lot.currentBid;
  }
  function auctionTimeLabel(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function auctionDiscount(lot) {
    const mv = auctionMarketValue(lot);
    if (!mv) return 0;
    return (mv - auctionLotPrice(lot)) / mv * 100;
  }

  function generateAuctions(count) {
    const a = auctionsShape();
    const used = new Set(a.lots.map(l => l.assetId));
    const types = ['english', 'dutch', 'sealed', 'flash'];
    for (let i = 0; i < count; i++) {
      const activeTypes = new Set(a.lots.map(l => l.type));
      let typeId = types.find(t => !activeTypes.has(t));
      if (!typeId) typeId = types[Math.floor(Math.random() * types.length)];
      const pool = D.ASSETS.filter(x => x.tradable && x.group !== 'derivatives' && x.group !== 'index' && x.price > 0 && !used.has(x.id));
      if (!pool.length) break;
      const asset = pool[Math.floor(Math.random() * pool.length)];
      const perUnit = notionalVND(asset, asset.price, 1);
      const target = 22000000 + Math.random() * 68000000;
      let qty = roundQty(asset, target / perUnit);
      if (!(qty > 0)) qty = stepFor(asset);
      const mv = notionalVND(asset, asset.price, qty);
      if (!(mv > 0)) continue;
      const now = Date.now();
      const type = AUCTION_BY_ID[typeId];
      const lot = {
        id: uid('lot'), type: typeId, assetId: asset.id, qty, createdAt: now,
        marketValueVND: mv, status: 'live', currentBid: 0, bidder: 'Giá khởi điểm',
        bids: 0, myBid: 0, nextBotAt: 0, extended: false, winner: null, finalPriceVND: 0
      };
      if (typeId === 'english') {
        lot.startPrice = Math.round(mv * (0.48 + Math.random() * 0.1) / 10000) * 10000;
        lot.currentBid = lot.startPrice;
        lot.minIncrement = Math.max(100000, Math.round(mv * 0.008 / 100000) * 100000);
        lot.botMax = mv * (0.72 + Math.random() * 0.24);
        lot.endsAt = now + 130000 + Math.random() * 130000;
        lot.nextBotAt = now + 2500 + Math.random() * 4500;
      } else if (typeId === 'dutch') {
        lot.startPrice = Math.round(mv * (1.12 + Math.random() * 0.08) / 10000) * 10000;
        lot.floorPrice = Math.round(mv * (0.56 + Math.random() * 0.06) / 10000) * 10000;
        lot.minIncrement = Math.max(100000, Math.round(mv * 0.01 / 100000) * 100000);
        lot.botMax = mv * (0.68 + Math.random() * 0.2);
        lot.endsAt = now + 75000 + Math.random() * 60000;
        lot.botBuyAt = now + (lot.endsAt - now) * (0.32 + Math.random() * 0.42);
        lot.currentBid = lot.startPrice;
      } else if (typeId === 'sealed') {
        lot.reserve = Math.round(mv * (0.58 + Math.random() * 0.05) / 10000) * 10000;
        lot.minIncrement = 0;
        lot.botSealedBid = mv * (0.62 + Math.random() * 0.3);
        lot.endsAt = now + 110000 + Math.random() * 80000;
      } else {
        lot.startPrice = Math.round(mv * (0.5 + Math.random() * 0.08) / 10000) * 10000;
        lot.currentBid = lot.startPrice;
        lot.minIncrement = Math.max(100000, Math.round(mv * 0.01 / 100000) * 100000);
        lot.botMax = mv * (0.78 + Math.random() * 0.2);
        lot.endsAt = now + 55000 + Math.random() * 30000;
        lot.nextBotAt = now + 1400 + Math.random() * 2200;
      }
      a.lots.push(lot);
      used.add(asset.id);
    }
  }

  function ensureAuctions() {
    const a = auctionsShape();
    settleDueAuctions();
    if (a.lots.length < AUCTION_ACTIVE_TARGET) generateAuctions(AUCTION_ACTIVE_TARGET - a.lots.length);
    return a;
  }

  function settleDueAuctions() {
    const a = auctionsShape();
    const now = Date.now();
    a.lots.slice().forEach(lot => {
      if (now >= lot.endsAt) settleAuction(lot);
    });
  }

  function refundMyBid(lot) {
    const a = auctionsShape();
    if (!lot.myBid) return;
    state.cash += lot.myBid;
    a.escrow = Math.max(0, a.escrow - lot.myBid);
    lot.myBid = 0;
  }

  function addAuctionShares(asset, qty, totalPaid) {
    const h = state.holdings[asset.id];
    const prevQty = h ? h.qty : 0;
    const prevCost = h ? h.avgVND * h.qty : 0;
    state.holdings[asset.id] = { qty: prevQty + qty, avgVND: (prevCost + totalPaid) / (prevQty + qty) };
  }

  function settleAuction(lot, forcedWinner, forcedPrice, opts) {
    opts = opts || {};
    const a = auctionsShape();
    const idx = a.lots.indexOf(lot);
    if (idx >= 0) a.lots.splice(idx, 1);
    const asset = byId[lot.assetId];
    const mv = asset ? notionalVND(asset, asset.price, lot.qty) : lot.marketValueVND;
    let winner = forcedWinner || null;
    let price = forcedPrice != null ? forcedPrice : auctionLotPrice(lot);
    if (!winner) {
      if (lot.type === 'sealed') {
        if (lot.myBid > 0 && lot.myBid >= lot.reserve && lot.myBid >= lot.botSealedBid) { winner = 'you'; price = lot.myBid; }
        else if (lot.botSealedBid >= lot.reserve) { winner = 'bot'; price = lot.botSealedBid; }
      } else if (lot.bidder === 'you') {
        winner = 'you'; price = lot.currentBid;
      } else if (lot.bidder && lot.bidder !== 'Giá khởi điểm') {
        winner = 'bot'; price = lot.currentBid;
      }
    }
    if (winner === 'you' && asset) {
      if (!opts.paid && lot.myBid > 0) a.escrow = Math.max(0, a.escrow - lot.myBid);
      addAuctionShares(asset, lot.qty, price);
      a.wins++;
      a.spent += price;
      const saved = Math.max(0, mv - price);
      a.saved += saved;
      recordTrade({ id: uid('t'), t: Date.now(), assetId: asset.id, side: 'buy', qty: lot.qty, price: price / (lot.qty * valueFactor(asset)), valueVND: price, fee: 0, pnl: 0, mode: 'spot', kind: 'auction' });
      addXP(30);
      addAura(18);
      progressQuest('auction', 1);
      snapshotEquity(true);
      pushNotif('🔨', 'Thắng đấu giá', asset.symbol + ' · ' + fmtQty(asset, lot.qty) + ' · ' + fmtVND(price));
      toast('Thắng đấu giá!', asset.symbol + ' · ' + fmtQty(asset, lot.qty) + ' cổ phần · ' + fmtVND(price), 'gold', '🔨');
      confetti(45);
      updateShell();
    } else if (lot.myBid > 0) {
      refundMyBid(lot);
    }
    lot.status = 'ended';
    lot.winner = winner;
    lot.finalPriceVND = price;
    a.history.unshift({
      id: lot.id, type: lot.type, assetId: lot.assetId, qty: lot.qty, price,
      marketValue: mv, winner: winner || 'none', saved: winner === 'you' ? Math.max(0, mv - price) : 0, at: Date.now()
    });
    a.history = a.history.slice(0, 30);
    saveNow();
  }

  function tickAuctions() {
    const a = auctionsShape();
    const now = Date.now();
    let changed = false;
    a.lots.slice().forEach(lot => {
      if (now >= lot.endsAt) { settleAuction(lot); changed = true; return; }
      if (lot.type === 'dutch') {
        if (now >= lot.botBuyAt && auctionLotPrice(lot) <= lot.botMax) {
          settleAuction(lot, 'bot', auctionLotPrice(lot));
          changed = true;
        }
        return;
      }
      if (lot.type === 'sealed') return;
      if (now >= lot.nextBotAt) {
        const next = lot.currentBid + lot.minIncrement;
        if (next <= lot.botMax) {
          if (lot.myBid > 0 && lot.bidder === 'you') refundMyBid(lot);
          lot.currentBid = next;
          lot.bidder = AUCTION_BOT_NAMES[Math.floor(Math.random() * AUCTION_BOT_NAMES.length)];
          lot.bids++;
          lot.nextBotAt = now + (lot.type === 'flash' ? 1400 + Math.random() * 2600 : 3200 + Math.random() * 5200);
          if (lot.type === 'flash' && lot.endsAt - now < 9000 && !lot.extended) {
            lot.endsAt = now + 12000;
            lot.extended = true;
          }
          changed = true;
        } else {
          lot.nextBotAt = now + 6000 + Math.random() * 7000;
        }
      }
    });
    if (changed) {
      if (a.lots.length < AUCTION_ACTIVE_TARGET) generateAuctions(AUCTION_ACTIVE_TARGET - a.lots.length);
      saveNow();
    }
    return changed;
  }

  function placeAuctionBid(lotId, amount) {
    const a = auctionsShape();
    const lot = a.lots.find(l => l.id === lotId);
    if (!lot) return { ok: false, error: 'Lot đấu giá đã kết thúc.' };
    if (Date.now() >= lot.endsAt) return { ok: false, error: 'Phiên đấu giá đã hết thời gian.' };
    amount = Math.round(Number(amount) || 0);
    if (!isFinite(amount) || amount <= 0) return { ok: false, error: 'Mức giá không hợp lệ.' };
    if (lot.type === 'sealed') {
      if (lot.myBid > 0) return { ok: false, error: 'Bạn đã gửi giá kín cho lot này. Mỗi lot chỉ được gửi một lần.' };
      if (amount < lot.reserve) return { ok: false, error: 'Giá kín tối thiểu là ' + fmtVND(lot.reserve) + '.' };
      if (amount > state.cash) return { ok: false, error: 'Tiền mặt không đủ. Bạn có ' + fmtVND(state.cash) + '.' };
      state.cash -= amount;
      a.escrow += amount;
      lot.myBid = amount;
      lot.bidder = 'you';
      lot.bids++;
    } else {
      const minBid = lot.currentBid + lot.minIncrement;
      if (amount < minBid) return { ok: false, error: 'Giá tối thiểu là ' + fmtVND(minBid) + '.' };
      if (amount > state.cash + (lot.myBid || 0)) return { ok: false, error: 'Tiền mặt không đủ. Bạn có ' + fmtVND(state.cash + (lot.myBid || 0)) + '.' };
      if (lot.myBid > 0) {
        state.cash += lot.myBid;
        a.escrow = Math.max(0, a.escrow - lot.myBid);
        lot.myBid = 0;
      }
      state.cash -= amount;
      a.escrow += amount;
      lot.myBid = amount;
      lot.currentBid = amount;
      lot.bidder = 'you';
      lot.bids++;
      lot.nextBotAt = Date.now() + 1200 + Math.random() * 1800;
      if (lot.type === 'flash' && lot.endsAt - Date.now() < 9000 && !lot.extended) {
        lot.endsAt = Date.now() + 12000;
        lot.extended = true;
      }
    }
    progressQuest('auction', 1);
    addXP(8);
    updateShell();
    saveNow();
    return { ok: true, amount };
  }

  function buyDutchLot(lotId) {
    const a = auctionsShape();
    const lot = a.lots.find(l => l.id === lotId);
    if (!lot || lot.type !== 'dutch') return { ok: false, error: 'Lot không hợp lệ.' };
    if (Date.now() >= lot.endsAt) return { ok: false, error: 'Phiên đấu giá đã kết thúc.' };
    const price = auctionLotPrice(lot);
    if (price > state.cash) return { ok: false, error: 'Tiền mặt không đủ. Cần ' + fmtVND(price) + '.' };
    state.cash -= price;
    settleAuction(lot, 'you', price, { paid: true });
    return { ok: true, price };
  }

  function auctionCardHTML(lot) {
    const asset = byId[lot.assetId];
    if (!asset) return '';
    const type = auctionTypeOf(lot);
    const price = auctionLotPrice(lot);
    const mv = auctionMarketValue(lot);
    const disc = auctionDiscount(lot);
    const mine = lot.bidder === 'you';
    const label = lot.type === 'dutch' ? 'Mua ngay' : lot.type === 'sealed' ? (lot.myBid ? 'Xem lot' : 'Gửi giá') : 'Đặt giá';
    return '<article class="auction-card" style="--ac:' + type.color + '">' +
      '<div class="auction-card-top"><span class="auction-type">' + type.icon + ' ' + esc(type.name) + '</span><span class="auction-time" data-auction-countdown="' + lot.id + '">' + auctionTimeLabel(lot.endsAt - Date.now()) + '</span></div>' +
      '<div class="auction-asset">' + assetCell(asset) + '</div>' +
      '<div class="auction-lot-meta"><span>' + fmtQty(asset, lot.qty) + ' ' + esc(asset.symbol) + '</span><span>Thị giá ' + fmtVND(mv) + '</span></div>' +
      '<div class="auction-price-row"><div><span>' + (lot.type === 'dutch' ? 'Giá đang giảm' : lot.type === 'sealed' ? 'Giá sàn kín' : 'Giá hiện tại') + '</span><b data-auction-price="' + lot.id + '">' + fmtVND(price) + '</b></div>' +
      '<div class="auction-discount ' + (disc > 0 ? 'up' : 'down') + '" data-auction-discount="' + lot.id + '">' + (disc > 0 ? '-' : '+') + nf(Math.abs(disc), 1) + '%</div></div>' +
      '<div class="auction-card-foot"><span class="auction-bids">' + (lot.type === 'sealed' ? (lot.myBid ? 'Đã gửi giá kín' : 'Giá kín một lần') : lot.bids + ' lượt đặt' + (mine ? ' · bạn đang dẫn' : '')) + '</span>' +
      '<button class="btn btn-sm ' + (mine ? 'btn-up' : 'btn-gold') + '" data-action="auction-open" data-id="' + lot.id + '">' + label + '</button></div></article>';
  }

  function auctionStatsHTML() {
    const a = ensureAuctions();
    return '<div class="job-stats auction-stats">' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Lot đang mở</span><b>' + a.lots.length + '</b></div><div class="job-stat-note">4 kiểu đấu giá luân phiên</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Escrow đang giữ</span><b>' + fmtVND(a.escrow) + '</b></div><div class="job-stat-note">Hoàn lại nếu bị vượt giá</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Lot đã thắng</span><b>' + a.wins + '</b></div><div class="job-stat-note">Cổ phần vào thẳng danh mục</div></div>' +
      '<div class="job-stat-card"><div class="job-stat-top"><span>Tiết kiệm so với thị giá</span><b class="up">+' + fmtVND(a.saved) + '</b></div><div class="job-stat-note">Chênh lệch giá thắng vs thị giá hiện tại</div></div></div>';
  }

  function auctionHistoryHTML() {
    const a = ensureAuctions();
    if (!a.history.length) return '<div class="empty-state"><div class="empty-icon">🔨</div><strong>Chưa có phiên nào kết thúc</strong><p>Đặt giá hoặc mua ngay một lot để bắt đầu săn cổ phần dưới giá thị trường.</p></div>';
    return '<div class="auction-history">' + a.history.map(h => {
      const asset = byId[h.assetId];
      const type = AUCTION_BY_ID[h.type] || D.AUCTION_TYPES[0];
      if (!asset) return '';
      const win = h.winner === 'you';
      return '<div class="auction-history-row"><span class="auction-history-icon" style="--ac:' + type.color + '">' + type.icon + '</span>' +
        '<div class="auction-history-main"><b>' + esc(asset.symbol) + ' · ' + fmtQty(asset, h.qty) + '</b><span>' + esc(type.short) + ' · ' + timeAgo(h.at) + '</span></div>' +
        '<div class="auction-history-price"><b>' + fmtVND(h.price) + '</b><span class="' + (win ? 'up' : 'dim') + '">' + (win ? 'Bạn thắng · tiết kiệm ' + fmtVND(h.saved) : h.winner === 'bot' ? 'Đối thủ thắng' : 'Không ai mua') + '</span></div></div>';
    }).join('') + '</div>';
  }

  function auctionsHTML() {
    const a = ensureAuctions();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('gavel') + ' Đấu giá cổ phần · Phiên đang mở</div><h1>Đấu giá cổ phần</h1>' +
      '<p class="sub">Tranh lot cổ phiếu, crypto và hàng hóa với giá khởi điểm thấp hơn thị giá. Thắng đấu giá là cổ phần được cộng thẳng vào danh mục — kèm escrow minh bạch và đối thủ AI.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/jobs">' + icon('money') + ' Việc làm</button>' +
      '<button class="btn btn-gold btn-sm" data-action="auction-open" data-id="' + (a.lots[0] ? a.lots[0].id : '') + '" ' + (a.lots.length ? '' : 'disabled') + '>' + icon('gavel') + ' Vào lot đầu tiên</button></div></div>' +
      '<div id="auctionStatsWrap">' + auctionStatsHTML() + '</div>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Lot đang mở</div><div class="card-sub">Đồng hồ chạy thật · bot AI đặt giá theo nhịp · kết thúc tự động</div></div>' +
      '<div class="auction-filters">' + [['all', 'Tất cả']].concat(D.AUCTION_TYPES.map(t => [t.id, t.short])).map(f => '<button class="chip ' + (auctionFilter === f[0] ? 'active' : '') + '" data-auction-filter="' + f[0] + '">' + f[1] + '</button>').join('') + '</div></div>' +
      '<div class="auction-grid" id="auctionGrid">' + (filteredAuctionLots().length ? filteredAuctionLots().map(auctionCardHTML).join('') : '<div class="empty-state auction-empty"><div class="empty-icon">⏳</div><strong>Đang tạo lot mới</strong><p>Quay lại sau vài giây để xem các phiên đấu giá tiếp theo.</p></div>') + '</div></section>' +
      '<div class="two-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Lịch sử đấu giá</div><div class="card-sub">' + a.history.length + ' phiên gần nhất</div></div></div><div id="auctionHistoryBox">' + auctionHistoryHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Cách chơi 4 kiểu</div><div class="card-sub">Mỗi kiểu có lợi thế và rủi ro riêng</div></div></div>' +
      '<div class="auction-guide">' + D.AUCTION_TYPES.map(t => '<div class="auction-guide-row" style="--ac:' + t.color + '"><span>' + t.icon + '</span><div><b>' + esc(t.name) + '</b><p>' + esc(t.desc) + '</p></div></div>').join('') + '</div></section></div>';
  }

  function filteredAuctionLots() {
    const a = ensureAuctions();
    return auctionFilter === 'all' ? a.lots : a.lots.filter(l => l.type === auctionFilter);
  }

  function refreshAuctionPanels() {
    if (currentRoute !== 'auctions') return;
    const grid = $('#auctionGrid');
    if (grid) {
      const lots = filteredAuctionLots();
      grid.innerHTML = lots.length ? lots.map(auctionCardHTML).join('') : '<div class="empty-state auction-empty"><div class="empty-icon">⏳</div><strong>Đang tạo lot mới</strong><p>Quay lại sau vài giây để xem các phiên đấu giá tiếp theo.</p></div>';
    }
    const stats = $('#auctionStatsWrap');
    if (stats) stats.outerHTML = '<div id="auctionStatsWrap">' + auctionStatsHTML() + '</div>';
    const history = $('#auctionHistoryBox');
    if (history) history.innerHTML = auctionHistoryHTML();
  }

  function updateAuctionTimers() {
    if (currentRoute !== 'auctions') return;
    const a = auctionsShape();
    a.lots.forEach(lot => {
      const cd = document.querySelector('[data-auction-countdown="' + lot.id + '"]');
      if (cd) cd.textContent = auctionTimeLabel(lot.endsAt - Date.now());
      const price = document.querySelector('[data-auction-price="' + lot.id + '"]');
      if (price) price.textContent = fmtVND(auctionLotPrice(lot));
      const disc = document.querySelector('[data-auction-discount="' + lot.id + '"]');
      if (disc) {
        const d = auctionDiscount(lot);
        disc.className = 'auction-discount ' + (d > 0 ? 'up' : 'down');
        disc.textContent = (d > 0 ? '-' : '+') + nf(Math.abs(d), 1) + '%';
      }
    });
  }

  function mountAuctions() {
    ensureAuctions();
    $$('[data-auction-filter]').forEach(el => el.addEventListener('click', () => {
      auctionFilter = el.getAttribute('data-auction-filter');
      $$('[data-auction-filter]').forEach(x => x.classList.toggle('active', x === el));
      refreshAuctionPanels();
    }));
    if (auctionsTimer) clearInterval(auctionsTimer);
    auctionsTimer = setInterval(() => {
      if (document.hidden || currentRoute !== 'auctions') return;
      const changed = tickAuctions();
      updateAuctionTimers();
      if (changed) refreshAuctionPanels();
    }, 1000);
  }

  function openAuctionModal(lotId) {
    const lot = auctionsShape().lots.find(l => l.id === lotId);
    if (!lot) return toast('Lot đã kết thúc', 'Lot này vừa được chốt. Hãy chọn lot khác trong danh sách.', 'info', '🔨');
    const asset = byId[lot.assetId];
    if (!asset) return;
    const type = auctionTypeOf(lot);
    const price = auctionLotPrice(lot);
    const mv = auctionMarketValue(lot);
    const disc = auctionDiscount(lot);
    const mine = lot.bidder === 'you';
    const isDutch = lot.type === 'dutch';
    const isSealed = lot.type === 'sealed';
    const alreadySealed = isSealed && lot.myBid > 0;
    let controls = '';
    if (isDutch) {
      controls = '<div class="auction-modal-live"><span>Giá mua ngay</span><b data-auction-modal-price>' + fmtVND(price) + '</b><span data-auction-modal-time>' + auctionTimeLabel(lot.endsAt - Date.now()) + '</span></div>' +
        '<button class="btn btn-gold btn-block" id="auctionBuyBtn" ' + (price > state.cash ? 'disabled' : '') + '>' + icon('gavel') + ' Mua ngay · <span data-auction-buy-price>' + fmtVND(price) + '</span></button>' +
        '<div class="calc-note">Giá giảm dần theo thời gian. Bot có thể mua trước bạn nếu giá chạm ngưỡng của nó.</div>';
    } else if (isSealed) {
      controls = '<div class="auction-modal-live"><span>Giá sàn kín</span><b data-auction-modal-price>' + fmtVND(lot.reserve) + '</b><span data-auction-modal-time>' + auctionTimeLabel(lot.endsAt - Date.now()) + '</span></div>' +
        (alreadySealed
          ? '<div class="auction-sealed-note">Bạn đã gửi giá kín <b>' + fmtVND(lot.myBid) + '</b>. Kết quả sẽ được công bố khi phiên kết thúc.</div>'
          : '<div class="field"><label class="field-label" for="auctionBidInput">Giá kín của bạn <span class="hint">Tối thiểu ' + fmtVND(lot.reserve) + '</span></label><input class="input mono" id="auctionBidInput" type="number" step="100000" value="' + Math.round(lot.reserve / 100000) * 100000 + '"></div>' +
            '<button class="btn btn-gold btn-block" id="auctionBidBtn">' + icon('gavel') + ' Gửi giá kín</button>' +
            '<div class="calc-note">Bạn chỉ được gửi một mức giá. Ai cao nhất thắng và trả đúng giá mình gửi. Escrow được giữ đến khi chốt.</div>');
    } else {
      const minBid = lot.currentBid + lot.minIncrement;
      controls = '<div class="auction-modal-live"><span>Giá hiện tại</span><b data-auction-modal-price>' + fmtVND(lot.currentBid) + '</b><span data-auction-modal-time>' + auctionTimeLabel(lot.endsAt - Date.now()) + '</span></div>' +
        (mine ? '<div class="auction-leading">' + icon('check') + ' Bạn đang dẫn đầu với ' + fmtVND(lot.myBid) + '</div>' : '') +
        '<div class="field"><label class="field-label" for="auctionBidInput">Giá đặt của bạn <span class="hint" id="auctionMinHint">Tối thiểu ' + fmtVND(minBid) + '</span></label><input class="input mono" id="auctionBidInput" type="number" step="100000" value="' + minBid + '"></div>' +
        '<div class="auction-quick">' + [1, 2, 4].map(k => '<button class="chip" data-auction-quick="' + (lot.currentBid + lot.minIncrement * k) + '" data-auction-step="' + k + '">+' + nf(k, 0) + ' bước</button>').join('') + '<button class="chip" data-auction-quick="' + (Math.round(mv / 100000) * 100000) + '" data-auction-market="1">Thị giá</button></div>' +
        '<button class="btn btn-gold btn-block" id="auctionBidBtn">' + icon('gavel') + ' Đặt giá</button>' +
        '<div class="calc-note">Bot sẽ phản hồi nếu còn dư địa. Nếu bị vượt giá, tiền escrow được hoàn ngay vào tiền mặt.</div>';
    }
    openModal({
      title: type.icon + ' ' + esc(type.name) + ' · ' + esc(asset.symbol),
      sub: fmtQty(asset, lot.qty) + ' ' + esc(asset.name) + ' · thị giá ' + fmtVND(mv) + ' · chênh lệch ' + (disc > 0 ? '-' : '+') + nf(Math.abs(disc), 1) + '%',
      size: 'modal-md',
      body: '<div class="auction-modal-hero" style="--ac:' + type.color + '">' + assetLogo(asset) + '<div><b>' + esc(asset.name) + '</b><span>' + esc(type.desc) + '</span></div></div>' + controls,
      onOpen: modal => {
        let bidTouched = false;
        const timer = setInterval(() => {
          if (!modal.isConnected) { clearInterval(timer); return; }
          const liveLot = auctionsShape().lots.find(l => l.id === lot.id);
          if (!liveLot) { clearInterval(timer); closeModal(); refreshCurrentRoute(); return; }
          const p = modal.querySelector('[data-auction-modal-price]');
          if (p) p.textContent = fmtVND(auctionLotPrice(liveLot));
          const t = modal.querySelector('[data-auction-modal-time]');
          if (t) t.textContent = auctionTimeLabel(liveLot.endsAt - Date.now());
          if (liveLot.type === 'dutch') {
            const buy = modal.querySelector('#auctionBuyBtn');
            if (buy) {
              const livePrice = auctionLotPrice(liveLot);
              const label = buy.querySelector('[data-auction-buy-price]');
              if (label) label.textContent = fmtVND(livePrice);
              buy.disabled = livePrice > state.cash;
            }
          }
          if (liveLot.type === 'english' || liveLot.type === 'flash') {
            const liveMin = liveLot.currentBid + liveLot.minIncrement;
            const hint = modal.querySelector('#auctionMinHint');
            if (hint) hint.textContent = 'Tối thiểu ' + fmtVND(liveMin);
            const inp = modal.querySelector('#auctionBidInput');
            if (inp && !bidTouched && Number(inp.value) < liveMin) inp.value = String(liveMin);
            modal.querySelectorAll('[data-auction-step]').forEach(b => {
              const k = Number(b.getAttribute('data-auction-step')) || 1;
              b.setAttribute('data-auction-quick', String(liveLot.currentBid + liveLot.minIncrement * k));
            });
            const liveMv = auctionMarketValue(liveLot);
            modal.querySelectorAll('[data-auction-market]').forEach(b => {
              b.setAttribute('data-auction-quick', String(Math.round(liveMv / 100000) * 100000));
            });
          }
        }, 1000);
        const input = modal.querySelector('#auctionBidInput');
        if (input) {
          input.addEventListener('input', () => { bidTouched = true; });
          modal.querySelectorAll('[data-auction-quick]').forEach(b => b.addEventListener('click', () => {
            input.value = b.getAttribute('data-auction-quick');
            bidTouched = true;
          }));
        }
        const bidBtn = modal.querySelector('#auctionBidBtn');
        if (bidBtn) bidBtn.addEventListener('click', () => {
          const result = placeAuctionBid(lot.id, input ? input.value : 0);
          if (!result.ok) return toast('Không thể đặt giá', result.error, 'error', '⚠️');
          closeModal();
          refreshCurrentRoute();
          toast('Đã đặt giá', asset.symbol + ' · escrow ' + fmtVND(result.amount), 'success', '🔨');
        });
        const buyBtn = modal.querySelector('#auctionBuyBtn');
        if (buyBtn) buyBtn.addEventListener('click', () => {
          const result = buyDutchLot(lot.id);
          if (!result.ok) return toast('Không thể mua', result.error, 'error', '⚠️');
          closeModal();
          refreshCurrentRoute();
        });
      }
    });
  }

  /* ============================================================
     v1.12 · AURELIS ARCADE
     Bốn lối chơi chiến lược: Deal Room, Hedge Fund Tycoon,
     Startup Studio và Candle Duel. Có phí vào cửa, hồi lượt,
     lịch sử, kỷ lục và phần thưởng bằng tiền ảo.
     ============================================================ */
  const ARCADE_COOLDOWN_MS = { deal: 30000, fund: 20000, startup: 45000, duel: 15000 };
  const ARCADE_BY_ID = Object.create(null);
  D.ARCADE_MODES.forEach(m => { ARCADE_BY_ID[m.id] = m; });

  function ensureArcade() {
    if (!state.arcade || typeof state.arcade !== 'object') state.arcade = arcadeDefault();
    const a = state.arcade;
    ['played', 'profit', 'dealWins', 'fundRuns', 'startupExits', 'duelWins', 'duelStreak', 'duelBestStreak',
      'bestDealProfit', 'bestFundReturn', 'bestStartupMultiple'].forEach(k => {
      if (!Number.isFinite(a[k])) a[k] = 0;
    });
    if (!a.best || typeof a.best !== 'object') a.best = arcadeDefault().best;
    if (!Array.isArray(a.history)) a.history = [];
    if (!a.cooldowns || typeof a.cooldowns !== 'object') a.cooldowns = {};
    return a;
  }

  function arcadeMode(id) { return ARCADE_BY_ID[id] || D.ARCADE_MODES[0]; }

  function arcadeCooldownLeft(id) {
    const a = ensureArcade();
    return Math.max(0, (Number(a.cooldowns[id]) || 0) - Date.now());
  }

  function arcadeBestLabel(id) {
    const a = ensureArcade();
    if (id === 'deal') return a.bestDealProfit ? '+' + nf(a.bestDealProfit, 1) + ' tỷ' : '—';
    if (id === 'fund') return a.bestFundReturn ? '+' + nf(a.bestFundReturn, 1) + '%' : '—';
    if (id === 'startup') return a.bestStartupMultiple ? nf(a.bestStartupMultiple, 2) + '×' : '—';
    if (id === 'duel') return a.duelBestStreak ? '🔥 ' + a.duelBestStreak : '—';
    return '—';
  }

  function arcadeStart(id) {
    const mode = arcadeMode(id);
    const a = ensureArcade();
    if (arcadeRun) return toast('Đang có lượt chơi', 'Hoàn tất lượt hiện tại trước khi bắt đầu lượt mới.', 'info', '🕹️');
    if (!arcadeRun && !D.ARCADE_MODES.some(m => m.id === id)) return;
    const cd = arcadeCooldownLeft(id);
    if (cd > 0) return toast('Chưa hồi lượt', mode.name + ' còn ' + Math.ceil(cd / 1000) + 's hồi.', 'info', '⏳');
    if (state.cash < mode.entry) return toast('Không đủ tiền vào cửa', 'Cần ' + fmtVND(mode.entry) + ', hiện có ' + fmtVND(state.cash) + '.', 'error', '⚠️');
    closeModal();
    state.cash -= mode.entry;
    a.cooldowns[id] = Date.now() + (ARCADE_COOLDOWN_MS[id] || 20000);
    a.played++;
    saveNow();
    updateShell();
    arcadeRun = { modeId: id, entry: mode.entry, startedAt: Date.now(), finished: false };
    if (id === 'deal') openDealRoom();
    else if (id === 'fund') openFundGame();
    else if (id === 'startup') openStartupStudio();
    else openDuelGame();
  }

  function arcadeFinish(result) {
    if (!arcadeRun || arcadeRun.finished) return null;
    const run = arcadeRun;
    run.finished = true;
    const a = ensureArcade();
    const mode = arcadeMode(run.modeId);
    const reward = Math.max(0, Math.round(result.reward || 0));
    const net = reward - run.entry;
    a.profit += net;
    state.cash += reward;
    if (result.won) {
      if (run.modeId === 'deal') {
        a.dealWins++;
        a.bestDealProfit = Math.max(a.bestDealProfit, Number(result.score) || 0);
      } else if (run.modeId === 'startup') {
        a.startupExits++;
        a.bestStartupMultiple = Math.max(a.bestStartupMultiple, Number(result.score) || 0);
      } else if (run.modeId === 'duel') {
        a.duelWins++;
        a.duelStreak++;
        a.duelBestStreak = Math.max(a.duelBestStreak, a.duelStreak);
      }
    }
    if (run.modeId === 'fund') {
      a.fundRuns++;
      a.bestFundReturn = Math.max(a.bestFundReturn, Number(result.score) || 0);
    }
    if (run.modeId === 'duel' && !result.won) a.duelStreak = 0;
    a.history.unshift({ t: Date.now(), modeId: run.modeId, entry: run.entry, reward, net, score: Number(result.score) || 0, label: result.label || '' });
    a.history = a.history.slice(0, 30);
    if (result.won) { addAura(Math.round(result.aura || 12)); addXP(Math.round(result.xp || 22)); }
    else addXP(8);
    snapshotEquity(true);
    updateShell();
    saveNow();
    if (result.won) confetti(55);
    toast(result.won ? 'Thắng · ' + mode.name : net > 0 ? 'Hoàn tất · ' + mode.name : 'Kết thúc · ' + mode.name,
      (net >= 0 ? '+' : '') + fmtVND(net) + ' ₫ · thưởng ' + fmtVND(reward), result.won ? 'success' : net > 0 ? 'gold' : 'info', mode.icon);
    pushNotif(mode.icon, 'AURELIS Arcade · ' + mode.name, (result.label || 'Hoàn tất lượt chơi') + ' · ' + (net >= 0 ? '+' : '') + fmtVND(net) + ' ₫.');
    arcadeRun = null;
    refreshCurrentRoute();
    return net;
  }

  function arcadeResultActionsHTML(modeId) {
    return '<div class="job-result-actions"><button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button>' +
      '<button class="btn btn-ghost btn-sm" data-nav="#/arcade">Về Arcade</button>' +
      '<button class="btn btn-gold btn-sm" data-action="arcade-play" data-id="' + modeId + '">Lượt mới</button></div>';
  }

  function arcadeCardHTML(mode) {
    const cd = arcadeCooldownLeft(mode.id);
    const afford = state.cash >= mode.entry;
    return '<article class="arcade-card" style="--ac:' + mode.color + '">' +
      '<div class="arcade-card-top"><span class="arcade-icon">' + mode.icon + '</span><span class="badge">' + esc(mode.tag) + '</span></div>' +
      '<h3>' + esc(mode.name) + '</h3><p class="arcade-tagline">' + esc(mode.tagline) + '</p>' +
      '<p class="arcade-desc">' + esc(mode.desc) + '</p>' +
      '<div class="arcade-meta"><div><span>Vào cửa</span><b>' + fmtVND(mode.entry) + '</b></div><div><span>Kỷ lục</span><b>' + arcadeBestLabel(mode.id) + '</b></div></div>' +
      '<div class="arcade-reward">' + icon('gift') + ' ' + esc(mode.reward) + '</div>' +
      '<button class="btn btn-gold btn-sm btn-block" data-arcade-btn="' + mode.id + '"' + (cd > 0 || !afford ? ' disabled' : '') + ' data-action="arcade-play" data-id="' + mode.id + '">' +
      (cd > 0 ? 'Hồi lượt · ' + Math.ceil(cd / 1000) + 's' : !afford ? 'Thiếu ' + fmtVND(mode.entry - state.cash) : icon('play') + ' Chơi ngay') + '</button></article>';
  }

  function arcadeHistoryHTML() {
    const a = ensureArcade();
    if (!a.history.length) return primeEmpty('Chưa có lượt chơi nào. Chọn một lối chơi để bắt đầu.');
    return '<div class="arcade-history">' + a.history.map(h => {
      const mode = arcadeMode(h.modeId);
      return '<div class="arcade-history-row"><span>' + mode.icon + '</span><div><b>' + esc(mode.name) + '</b><span>' + esc(h.label || 'Hoàn tất') + ' · ' + timeAgo(h.t) + '</span></div><em class="' + changeCls(h.net) + '">' + (h.net >= 0 ? '+' : '') + fmtVND(h.net) + '</em></div>';
    }).join('') + '</div>';
  }

  function arcadeHTML() {
    const a = ensureArcade();
    const bestNet = a.history.reduce((s, h) => Math.max(s, h.net), 0);
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('play') + ' Arcade · Chơi để hiểu rủi ro</div><h1>Sân chơi của nhà đầu tư</h1>' +
      '<p class="sub">Bốn lối chơi chiến lược: định giá M&A, phân bổ quỹ theo chế độ kinh tế, dẫn dắt startup và đọc nến. Mỗi lượt có phí vào cửa, thời gian hồi và phần thưởng bằng tiền ảo. Không có tiền thật nào tham gia.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/library">' + icon('book') + ' Ôn lý thuyết</button><button class="btn btn-gold btn-sm" data-nav="#/jobs">' + icon('briefcase') + ' Kiếm thêm vốn</button></div></div>' +
      '<div class="arcade-kpis"><div class="arcade-kpi"><span>Lượt đã chơi</span><b>' + a.played + '</b><em>Tổng lợi nhuận ' + (a.profit >= 0 ? '+' : '') + fmtVND(a.profit) + '</em></div>' +
      '<div class="arcade-kpi"><span>M&A thắng</span><b>' + a.dealWins + '</b><em>Kỷ lục ' + (a.bestDealProfit ? '+' + nf(a.bestDealProfit, 1) + ' tỷ EV' : 'chưa có') + '</em></div>' +
      '<div class="arcade-kpi"><span>Quỹ tốt nhất</span><b class="up">' + (a.bestFundReturn ? '+' + nf(a.bestFundReturn, 1) + '%' : '—') + '</b><em>' + a.fundRuns + ' lượt quỹ</em></div>' +
      '<div class="arcade-kpi"><span>Startup exit</span><b>' + a.startupExits + '</b><em>Bội số tốt nhất ' + (a.bestStartupMultiple ? nf(a.bestStartupMultiple, 2) + '×' : '—') + '</em></div>' +
      '<div class="arcade-kpi"><span>Chuỗi Candle Duel</span><b>🔥 ' + a.duelStreak + '</b><em>Kỷ lục ' + a.duelBestStreak + ' trận</em></div>' +
      '<div class="arcade-kpi"><span>Lượt lãi nhất</span><b class="up">' + fmtVND(bestNet) + '</b><em>Từ lịch sử Arcade</em></div></div>' +
      '<div class="arcade-grid">' + D.ARCADE_MODES.map(arcadeCardHTML).join('') + '</div>' +
      '<div class="two-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Lịch sử lượt chơi</div><div class="card-sub">' + a.history.length + ' lượt gần nhất · lợi nhuận ròng đã trừ phí vào cửa</div></div></div>' + arcadeHistoryHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Cách Arcade vận hành</div><div class="card-sub">Giải trí có mục đích học tập</div></div></div>' +
      '<ul class="prime-rules"><li><b>Phí vào cửa</b> được trừ ngay khi bắt đầu. Đóng giữa chừng đồng nghĩa mất phí.</li><li><b>Hồi lượt</b> giúp bạn không chơi theo cảm xúc và giữ nhịp học.</li><li><b>Kỷ lục</b> lưu điểm tốt nhất của từng lối chơi, không reset khi thua.</li><li><b>Phần thưởng</b> cộng vào ví chính và tính vào tổng tài sản, XP, Aura và thành tựu.</li><li><b>Mô phỏng:</b> mọi thương vụ, quỹ, startup và nến đều là dữ liệu giả lập hoặc dữ liệu thị trường thật dùng cho mục đích học tập.</li></ul></section></div>';
  }

  function mountArcade() {
    if (arcadeTimer) clearInterval(arcadeTimer);
    arcadeTimer = setInterval(() => {
      if (document.hidden || currentRoute !== 'arcade') return;
      let rerender = false;
      D.ARCADE_MODES.forEach(mode => {
        const btn = $('[data-arcade-btn="' + mode.id + '"]');
        if (!btn) return;
        const cd = arcadeCooldownLeft(mode.id);
        if (cd > 0) {
          btn.textContent = 'Hồi lượt · ' + Math.ceil(cd / 1000) + 's';
          btn.disabled = true;
          btn.setAttribute('data-cd-left', '1');
        } else if (btn.getAttribute('data-cd-left') === '1') {
          rerender = true;
        }
      });
      if (rerender) renderRoute();
    }, 1000);
  }

  /* ------------------------------ ARCADE · DEAL ROOM ------------------------------ */
  function dealBook(t) {
    const ebitda = t.revenue * t.margin / 100;
    return { ebitda, fair: ebitda * t.fairMultiple };
  }

  function openDealRoom() {
    openModal({
      title: '🤝 Deal Room · M&A',
      sub: 'Chọn mục tiêu, thẩm định và đưa ra giá mua',
      size: 'modal-lg',
      body: '<div id="dealRoomBody">' + dealTargetsHTML() + '</div>',
      onOpen: modal => bindDealTargets(modal)
    });
  }

  function dealTargetsHTML() {
    return '<div class="deal-intro"><p>Bạn là MD của một quỹ M&A. Hãy chọn một mục tiêu, đọc kỹ số liệu và trả giá hợp lý. Giá quá thấp sẽ bị từ chối; giá quá cao sẽ phá huỷ giá trị.</p></div>' +
      '<div class="deal-grid">' + D.DEAL_TARGETS.map(t => {
        const book = dealBook(t);
        return '<button class="deal-target" data-deal-target="' + t.id + '" style="--dc:' + t.color + '">' +
          '<div class="deal-target-top"><span class="deal-icon">' + t.icon + '</span><span class="badge">Rủi ro ' + esc(t.risk) + '</span></div>' +
          '<h4>' + esc(t.name) + '</h4><span class="deal-sector">' + esc(t.sector) + '</span>' +
          '<div class="deal-metrics"><div><span>Doanh thu</span><b>' + nf(t.revenue, 0) + ' tỷ</b></div><div><span>Biên EBITDA</span><b>' + t.margin + '%</b></div><div><span>Tăng trưởng</span><b>' + t.growth + '%</b></div><div><span>EV/EBITDA ngành</span><b>' + t.fairMultiple + '×</b></div></div>' +
          '<div class="deal-ask"><span>Giá chào</span><b>' + nf(t.askEV, 0) + ' tỷ</b></div></button>';
      }).join('') + '</div>';
  }

  function bindDealTargets(modal) {
    const body = modal.querySelector('#dealRoomBody');
    body.querySelectorAll('[data-deal-target]').forEach(btn => btn.addEventListener('click', () => {
      const t = D.DEAL_TARGETS.find(x => x.id === btn.getAttribute('data-deal-target'));
      if (t) openDealStep2(modal, t);
    }));
  }

  function openDealStep2(modal, t) {
    const body = modal.querySelector('#dealRoomBody');
    const book = dealBook(t);
    body.innerHTML = '<button class="btn btn-ghost btn-sm" id="dealBack">' + icon('arrow-left') + ' Chọn mục tiêu khác</button>' +
      '<div class="deal-detail"><div class="deal-detail-head"><span class="deal-icon big">' + t.icon + '</span><div><h3>' + esc(t.name) + '</h3><span>' + esc(t.sector) + ' · ' + esc(t.story) + '</span></div></div>' +
      '<div class="deal-metrics wide"><div><span>Doanh thu</span><b>' + nf(t.revenue, 0) + ' tỷ</b></div><div><span>EBITDA</span><b>' + nf(book.ebitda, 1) + ' tỷ</b></div><div><span>EV/EBITDA ngành</span><b>' + t.fairMultiple + '×</b></div><div><span>EV hợp lý</span><b>' + nf(book.fair, 0) + ' tỷ</b></div><div><span>Giá chào</span><b>' + nf(t.askEV, 0) + ' tỷ</b></div><div><span>Nợ ròng</span><b>' + nf(t.debt, 0) + ' tỷ</b></div><div><span>Synergy tiềm năng</span><b class="up">+' + nf(t.synergy, 0) + ' tỷ</b></div><div><span>Độ khó tích hợp</span><b>' + nf(t.integration, 0) + '/100</b></div></div></div>' +
      '<div class="deal-diligence"><h4>Chọn một gói thẩm định</h4><div class="deal-diligence-grid">' +
      [['finance', '💰 Tài chính', 'Kiểm tra chất lượng lợi nhuận, nợ và dòng tiền.'],
       ['legal', '⚖️ Pháp lý', 'Rà soát hợp đồng, kiện tụng và nghĩa vụ ẩn.'],
       ['ops', '⚙️ Vận hành', 'Đánh giá khả năng cắt chi phí và khai thác cộng hưởng.']].map(d =>
        '<button class="deal-diligence-option" data-diligence="' + d[0] + '"><b>' + d[1] + '</b><span>' + d[2] + '</span></button>').join('') +
      '</div></div>' +
      '<div class="deal-offer"><h4>Đưa ra giá mua doanh nghiệp (EV, tỷ ₫)</h4>' +
      '<div class="deal-offer-row"><input id="dealOffer" type="number" min="0" step="5" value="' + Math.round(book.fair * 0.92) + '"><span>tỷ ₫</span></div>' +
      '<div class="deal-offer-hints"><button data-deal-offer="ask">Giá chào ' + nf(t.askEV, 0) + '</button><button data-deal-offer="fair">EV hợp lý ' + nf(book.fair, 0) + '</button><button data-deal-offer="low">Đề nghị −10%</button></div>' +
      '<button class="btn btn-gold btn-block" id="dealSubmit">GỬI ĐỀ NGHỊ & KẾT THÚC THƯƠNG VỤ</button></div>';
    let diligence = null;
    body.querySelector('#dealBack').addEventListener('click', () => { body.innerHTML = dealTargetsHTML(); bindDealTargets(modal); });
    body.querySelectorAll('[data-diligence]').forEach(btn => btn.addEventListener('click', () => {
      diligence = btn.getAttribute('data-diligence');
      body.querySelectorAll('[data-diligence]').forEach(b => b.classList.toggle('on', b === btn));
    }));
    body.querySelectorAll('[data-deal-offer]').forEach(btn => btn.addEventListener('click', () => {
      const input = body.querySelector('#dealOffer');
      const kind = btn.getAttribute('data-deal-offer');
      input.value = kind === 'ask' ? Math.round(t.askEV) : kind === 'fair' ? Math.round(book.fair) : Math.round(book.fair * 0.9);
    }));
    body.querySelector('#dealSubmit').addEventListener('click', () => {
      if (!diligence) return toast('Chưa thẩm định', 'Hãy chọn một gói thẩm định trước khi trả giá.', 'error', '🔎');
      const offer = Number(body.querySelector('#dealOffer').value);
      if (!(offer > 0)) return toast('Giá không hợp lệ', 'Nhập giá mua dương, đơn vị tỷ ₫.', 'error', '⚠️');
      resolveDeal(modal, t, book, diligence, offer);
    });
  }

  function resolveDeal(modal, t, book, diligence, offer) {
    let fair = book.fair;
    let capture = 0.78;
    let riskCost = t.debt * 0.32;
    let note = '';
    if (diligence === 'finance') {
      fair *= 0.94 + Math.random() * 0.1;
      capture = 0.82;
      note = 'Thẩm định tài chính cho thấy chất lượng lợi nhuận ' + (fair >= book.fair ? 'tốt hơn kỳ vọng' : 'kém hơn kỳ vọng') + '.';
    } else if (diligence === 'legal') {
      riskCost *= 0.55;
      capture = 0.86;
      note = 'Thẩm định pháp lý phát hiện ít nghĩa vụ ẩn hơn dự kiến, giảm chi phí rủi ro.';
    } else {
      fair *= 0.97;
      capture = 1.02 + Math.random() * 0.1;
      note = 'Thẩm định vận hành cho thấy đội ngũ có thể khai thác cộng hưởng tốt hơn mô hình chuẩn.';
    }
    const maxValue = fair + t.synergy * capture - riskCost;
    const sellerFloor = Math.min(t.askEV * 0.9, fair * 0.98);
    const accepted = offer >= sellerFloor;
    const profit = accepted ? maxValue - offer : 0;
    const won = accepted && profit > 0;
    const reward = won ? clamp(Math.round(profit * 50000), 250000, 20000000) : 0;
    const body = modal.querySelector('#dealRoomBody');
    body.innerHTML = '<div class="arcade-result ' + (won ? 'win' : 'lose') + '">' +
      '<div class="arcade-result-icon">' + (won ? '🤝' : accepted ? '💸' : '🚫') + '</div>' +
      '<div class="arcade-result-eyebrow">THƯƠNG VỤ ' + (won ? 'THÀNH CÔNG' : accepted ? 'ĐẮT ĐỎ' : 'BỊ TỪ CHỐI') + '</div>' +
      '<h3>' + esc(t.name) + '</h3>' +
      '<div class="arcade-result-score ' + (profit >= 0 ? 'up' : 'down') + '">' + (accepted ? (profit >= 0 ? '+' : '') + nf(profit, 1) + ' tỷ giá trị' : 'Không chốt được thương vụ') + '</div>' +
      '<div class="arcade-result-grid"><div><span>Giá bạn trả</span><b>' + nf(offer, 1) + ' tỷ</b></div><div><span>EV hợp lý sau thẩm định</span><b>' + nf(fair, 1) + ' tỷ</b></div><div><span>Giá trị tối đa</span><b>' + nf(maxValue, 1) + ' tỷ</b></div><div><span>Ngưỡng người bán</span><b>' + nf(sellerFloor, 1) + ' tỷ</b></div><div><span>Synergy khai thác</span><b>+' + nf(t.synergy * capture, 1) + ' tỷ</b></div><div><span>Chi phí rủi ro</span><b class="down">−' + nf(riskCost, 1) + ' tỷ</b></div></div>' +
      '<p class="arcade-result-note">' + esc(note) + ' ' + (accepted ? (profit > 0 ? 'Bạn mua dưới giá trị nội tại và giữ được biên an toàn.' : 'Bạn đã trả cao hơn giá trị tạo ra. Trong M&A, overpaying là cách nhanh nhất để phá huỷ giá trị cổ đông.') : 'Người bán từ chối vì giá thấp hơn ngưỡng. Một đề nghị thấp chỉ tốt khi vẫn có khả năng được chấp nhận.') + '</p>' +
      '<div class="arcade-reward-line">Thù lao tư vấn: <b>+' + fmtVND(reward) + '</b> · phí vào cửa ' + fmtVND(arcadeRun.entry) + '</div>' +
      arcadeResultActionsHTML('deal') + '</div>';
    arcadeFinish({ won, reward, score: profit, label: won ? 'Chốt ' + t.name + ' · +' + nf(profit, 1) + ' tỷ EV' : accepted ? 'Mua đắt ' + t.name : 'Bị từ chối · ' + t.name, aura: 18, xp: 34 });
  }

  /* ------------------------------ ARCADE · HEDGE FUND ------------------------------ */
  function openFundGame() {
    const regimes = shuffleList(D.FUND_REGIMES).slice(0, 5);
    arcadeRun.fund = { round: 0, regimes, portfolio: 100, hist: [], alloc: { stocks: 40, bonds: 30, gold: 15, cash: 15 } };
    openModal({
      title: '📊 Hedge Fund Tycoon',
      sub: '5 vòng · mỗi vòng là một chế độ kinh tế · phân bổ 100% vốn',
      size: 'modal-lg',
      body: '<div id="fundBody"></div>',
      onOpen: modal => renderFundRound(modal)
    });
  }

  function fundAllocTotal(alloc) {
    return D.FUND_CLASSES.reduce((s, c) => s + (Number(alloc[c.id]) || 0), 0);
  }

  function renderFundRound(modal) {
    const run = arcadeRun && arcadeRun.fund;
    const body = modal.querySelector('#fundBody');
    if (!run || !body) return;
    if (run.round >= run.regimes.length) return finishFundGame(modal);
    const regime = run.regimes[run.round];
    body.innerHTML = '<div class="arcade-progress"><span>Vòng ' + (run.round + 1) + ' / ' + run.regimes.length + '</span><b>Danh mục: ' + nf(run.portfolio, 1) + ' tỷ ₫</b></div>' +
      '<div class="fund-regime"><span class="fund-regime-icon">' + regime.icon + '</span><div><h4>' + esc(regime.name) + '</h4><p>' + esc(regime.hint) + '</p></div></div>' +
      '<div class="fund-alloc">' + D.FUND_CLASSES.map(c =>
        '<div class="fund-row"><span>' + c.icon + ' ' + esc(c.name) + '</span><input type="range" min="0" max="100" step="5" data-fund-class="' + c.id + '" value="' + run.alloc[c.id] + '"><b data-fund-val="' + c.id + '">' + run.alloc[c.id] + '%</b></div>').join('') + '</div>' +
      '<div class="fund-total" id="fundTotal">Tổng phân bổ: <b>' + fundAllocTotal(run.alloc) + '%</b></div>' +
      '<div class="fund-preview" id="fundPreview"></div>' +
      '<button class="btn btn-gold btn-block" id="fundSubmit">' + icon('chart') + ' ĐẦU TƯ VÒNG NÀY</button>';
    const inputs = Array.from(body.querySelectorAll('[data-fund-class]'));
    const totalEl = body.querySelector('#fundTotal');
    const preview = body.querySelector('#fundPreview');
    const update = () => {
      inputs.forEach(inp => {
        const id = inp.getAttribute('data-fund-class');
        run.alloc[id] = Number(inp.value);
        const label = body.querySelector('[data-fund-val="' + id + '"]');
        if (label) label.textContent = inp.value + '%';
      });
      const total = fundAllocTotal(run.alloc);
      totalEl.innerHTML = 'Tổng phân bổ: <b class="' + (total === 100 ? 'up' : 'down') + '">' + total + '%</b>';
      preview.innerHTML = '<span>Kịch bản nếu chế độ này lặp lại:</span><b class="' + changeCls(estimateFundReturn(run.alloc, regime)) + '">' + (estimateFundReturn(run.alloc, regime) >= 0 ? '+' : '') + nf(estimateFundReturn(run.alloc, regime), 2) + '%</b>';
    };
    inputs.forEach(inp => inp.addEventListener('input', update));
    update();
    body.querySelector('#fundSubmit').addEventListener('click', () => {
      const total = fundAllocTotal(run.alloc);
      if (total !== 100) return toast('Phân bổ chưa đủ 100%', 'Tổng hiện tại là ' + total + '%. Hãy điều chỉnh để đúng 100%.', 'error', '⚖️');
      const ret = estimateFundReturn(run.alloc, regime);
      run.portfolio *= 1 + ret / 100;
      run.hist.push({ regime: regime.name, ret });
      run.round++;
      body.innerHTML = '<div class="arcade-progress"><span>Vòng ' + run.round + ' / ' + run.regimes.length + '</span><b>Danh mục: ' + nf(run.portfolio, 1) + ' tỷ ₫</b></div>' +
        '<div class="fund-result"><div class="fund-result-head"><span>' + regime.icon + '</span><div><h4>' + esc(regime.name) + '</h4><span>Lợi nhuận vòng này</span></div><b class="' + changeCls(ret) + '">' + (ret >= 0 ? '+' : '') + nf(ret, 2) + '%</b></div>' +
        '<div class="fund-breakdown">' + D.FUND_CLASSES.map(c => '<div><span>' + c.icon + ' ' + esc(c.name) + ' · ' + run.alloc[c.id] + '%</span><b class="' + changeCls(regime.returns[c.id]) + '">' + (regime.returns[c.id] >= 0 ? '+' : '') + nf(regime.returns[c.id], 1) + '%</b></div>').join('') + '</div>' +
        '<div class="fund-total">Danh mục mới: <b>' + nf(run.portfolio, 1) + ' tỷ ₫</b> · tổng ' + (run.portfolio >= 100 ? '+' : '') + nf(run.portfolio - 100, 1) + '%</div>' +
        '<button class="btn btn-gold btn-block" id="fundNext">' + (run.round >= run.regimes.length ? 'XEM KẾT QUẢ' : 'VÒNG TIẾP THEO') + '</button></div>';
      body.querySelector('#fundNext').addEventListener('click', () => renderFundRound(modal));
    });
  }

  function estimateFundReturn(alloc, regime) {
    return D.FUND_CLASSES.reduce((s, c) => s + (Number(alloc[c.id]) || 0) / 100 * regime.returns[c.id], 0);
  }

  function finishFundGame(modal) {
    const run = arcadeRun && arcadeRun.fund;
    const body = modal.querySelector('#fundBody');
    if (!run || !body) return;
    const totalReturn = (run.portfolio - 100);
    const won = totalReturn > 0;
    const reward = won ? clamp(Math.round(arcadeRun.entry * Math.min(5, 1 + totalReturn / 100 * 6)), arcadeRun.entry, arcadeRun.entry * 5) : 0;
    body.innerHTML = '<div class="arcade-result ' + (won ? 'win' : 'lose') + '">' +
      '<div class="arcade-result-icon">' + (won ? '📈' : '📉') + '</div>' +
      '<div class="arcade-result-eyebrow">KẾT THÚC 5 VÒNG</div>' +
      '<h3>Hedge Fund Tycoon</h3>' +
      '<div class="arcade-result-score ' + changeCls(totalReturn) + '">' + (totalReturn >= 0 ? '+' : '') + nf(totalReturn, 1) + '% NAV</div>' +
      '<div class="arcade-result-grid"><div><span>Danh mục cuối</span><b>' + nf(run.portfolio, 1) + ' tỷ</b></div><div><span>Vòng tốt nhất</span><b class="up">' + (run.hist.length ? '+' + nf(Math.max(...run.hist.map(h => h.ret)), 2) + '%' : '—') + '</b></div><div><span>Vòng tệ nhất</span><b class="down">' + (run.hist.length ? nf(Math.min(...run.hist.map(h => h.ret)), 2) + '%' : '—') + '</b></div><div><span>Thưởng quỹ</span><b>+' + fmtVND(reward) + '</b></div></div>' +
      '<div class="fund-breakdown">' + run.hist.map(h => '<div><span>' + esc(h.regime) + '</span><b class="' + changeCls(h.ret) + '">' + (h.ret >= 0 ? '+' : '') + nf(h.ret, 2) + '%</b></div>').join('') + '</div>' +
      '<p class="arcade-result-note">' + (won ? 'Bạn đọc đúng chế độ kinh tế và phân bổ vốn theo đó. Lợi nhuận có điều chỉnh rủi ro quan trọng hơn một vòng may mắn.' : 'Bạn phân bổ lệch chế độ. Hãy đọc tín hiệu lạm phát, lãi suất và tăng trưởng trước khi chia vốn.') + '</p>' +
      arcadeResultActionsHTML('fund') + '</div>';
    arcadeFinish({ won, reward, score: totalReturn, label: 'Lợi nhuận ' + (totalReturn >= 0 ? '+' : '') + nf(totalReturn, 1) + '%', aura: 16, xp: 30 });
  }

  /* ------------------------------ ARCADE · STARTUP STUDIO ------------------------------ */
  function openStartupStudio() {
    openModal({
      title: '🚀 Startup Studio',
      sub: 'Chọn startup, đi qua 6 biến cố và tìm đường exit',
      size: 'modal-lg',
      body: '<div id="startupBody">' + startupPickHTML() + '</div>',
      onOpen: modal => bindStartupPick(modal)
    });
  }

  function startupPickHTML() {
    return '<div class="deal-intro"><p>Bạn là GP của một quỹ venture. Mỗi startup có mô hình, tốc độ đốt tiền và rủi ro khác nhau. Bạn sẽ đưa ra 6 quyết định; mục tiêu là tạo exit có lãi mà không bị pha loãng quá nhiều.</p></div>' +
      '<div class="startup-grid">' + D.STARTUP_IDEAS.map(s =>
        '<button class="startup-card" data-startup="' + s.id + '" style="--sc:' + s.color + '"><div class="startup-card-top"><span class="startup-icon">' + s.icon + '</span><span class="badge">' + esc(s.sector) + '</span></div>' +
        '<h4>' + esc(s.name) + '</h4><p>' + esc(s.story) + '</p>' +
        '<div class="deal-metrics"><div><span>ARR</span><b>' + nf(s.arr, 1) + ' tỷ</b></div><div><span>Tăng trưởng</span><b>' + nf(s.growth * 100, 0) + '%</b></div><div><span>Đốt tiền/năm</span><b>' + nf(s.burn, 1) + ' tỷ</b></div><div><span>Cash</span><b>' + nf(s.cash, 1) + ' tỷ</b></div><div><span>Định giá</span><b>' + nf(s.valuation, 0) + ' tỷ</b></div></div></button>').join('') + '</div>';
  }

  function bindStartupPick(modal) {
    const body = modal.querySelector('#startupBody');
    body.querySelectorAll('[data-startup]').forEach(btn => btn.addEventListener('click', () => {
      const idea = D.STARTUP_IDEAS.find(x => x.id === btn.getAttribute('data-startup'));
      if (idea) startStartupRun(modal, idea);
    }));
  }

  function startStartupRun(modal, idea) {
    arcadeRun.startup = {
      idea, round: 0, equity: 1, initial: idea.valuation,
      cash: idea.cash, arr: idea.arr, growth: idea.growth, burn: idea.burn, valuation: idea.valuation,
      events: shuffleList(D.STARTUP_EVENTS).slice(0, 6), log: []
    };
    renderStartupRound(modal);
  }

  function startupMetricsHTML(st) {
    const runway = st.burn > 0 ? st.cash / st.burn : 99;
    return '<div class="startup-metrics"><div><span>Cash</span><b class="' + (st.cash < 0 ? 'down' : '') + '">' + nf(st.cash, 1) + ' tỷ</b></div><div><span>Runway</span><b>' + nf(Math.max(0, runway), 1) + ' năm</b></div><div><span>ARR</span><b>' + nf(st.arr, 1) + ' tỷ</b></div><div><span>Tăng trưởng</span><b>' + nf(st.growth * 100, 0) + '%</b></div><div><span>Định giá</span><b>' + nf(st.valuation, 0) + ' tỷ</b></div><div><span>Sở hữu</span><b>' + nf(st.equity * 100, 1) + '%</b></div></div>';
  }

  function renderStartupRound(modal) {
    const st = arcadeRun && arcadeRun.startup;
    const body = modal.querySelector('#startupBody');
    if (!st || !body) return;
    if (st.round >= st.events.length) return finishStartupRun(modal, null);
    const ev = st.events[st.round];
    body.innerHTML = '<div class="arcade-progress"><span>Biến cố ' + (st.round + 1) + ' / ' + st.events.length + '</span><b>' + st.idea.icon + ' ' + esc(st.idea.name) + '</b></div>' + startupMetricsHTML(st) +
      '<div class="startup-event"><div class="startup-event-head"><span>' + ev.icon + '</span><div><h4>' + esc(ev.title) + '</h4><p>' + esc(ev.text) + '</p></div></div>' +
      '<div class="startup-options">' + ev.options.map((opt, i) =>
        '<button class="startup-option" data-startup-option="' + i + '"><b>' + esc(opt.label) + '</b><span>' + startupEffectHint(opt.effects) + '</span></button>').join('') + '</div></div>';
    body.querySelectorAll('[data-startup-option]').forEach(btn => btn.addEventListener('click', () => {
      const opt = ev.options[Number(btn.getAttribute('data-startup-option'))];
      const earlyExit = !!(opt.effects && opt.effects.earlyExit);
      applyStartupEffects(st, opt.effects || {});
      st.cash -= st.burn;
      st.valuation *= 1 + Math.max(-0.2, st.growth) * 0.22;
      st.log.push({ title: ev.title, choice: opt.label, outcome: opt.outcome, t: Date.now() });
      st.round++;
      body.innerHTML = '<div class="arcade-progress"><span>Biến cố ' + st.round + ' / ' + st.events.length + '</span><b>' + st.idea.icon + ' ' + esc(st.idea.name) + '</b></div>' + startupMetricsHTML(st) +
        '<div class="startup-outcome"><div class="startup-outcome-icon">' + ev.icon + '</div><h4>' + esc(opt.label) + '</h4><p>' + esc(opt.outcome) + '</p>' +
        '<div class="startup-outcome-metrics"><div><span>Cash sau biến cố</span><b class="' + (st.cash < 0 ? 'down' : '') + '">' + nf(st.cash, 1) + ' tỷ</b></div><div><span>Định giá</span><b>' + nf(st.valuation, 0) + ' tỷ</b></div><div><span>Sở hữu</span><b>' + nf(st.equity * 100, 1) + '%</b></div></div>' +
        '<button class="btn btn-gold btn-block" id="startupNext">' + (earlyExit ? 'CHỐT EXIT NGAY' : st.round >= st.events.length ? 'TÍNH EXIT' : 'BIẾN CỐ TIẾP THEO') + '</button></div>';
      body.querySelector('#startupNext').addEventListener('click', () => {
        if (earlyExit) return finishStartupRun(modal, 'early');
        if (st.cash < 0) return finishStartupRun(modal, 'bankrupt');
        if (st.round >= st.events.length) return finishStartupRun(modal, null);
        renderStartupRound(modal);
      });
    }));
  }

  function startupEffectHint(effects) {
    const bits = [];
    if (effects.cash) bits.push((effects.cash > 0 ? '+' : '') + nf(effects.cash, 1) + ' tỷ cash');
    if (effects.equity) bits.push((effects.equity > 0 ? '+' : '') + nf(effects.equity * 100, 0) + 'pp sở hữu');
    if (effects.valuationPct) bits.push((effects.valuationPct > 0 ? '+' : '') + nf(effects.valuationPct * 100, 0) + '% định giá');
    if (effects.arrPct) bits.push((effects.arrPct > 0 ? '+' : '') + nf(effects.arrPct * 100, 0) + '% ARR');
    if (effects.growth) bits.push((effects.growth > 0 ? '+' : '') + nf(effects.growth * 100, 0) + 'pp tăng trưởng');
    if (effects.burnPct) bits.push((effects.burnPct > 0 ? '+' : '') + nf(effects.burnPct * 100, 0) + '% đốt tiền');
    if (effects.earlyExit) bits.push('exit sớm ' + nf(effects.earlyExit, 0) + ' tỷ');
    return bits.length ? bits.join(' · ') : 'Không thay đổi trực tiếp';
  }

  function applyStartupEffects(st, effects) {
    if (effects.cash) st.cash += effects.cash;
    if (effects.equity) st.equity = Math.max(0.04, Math.min(1, st.equity + effects.equity));
    if (effects.valuationPct) st.valuation *= 1 + effects.valuationPct;
    if (effects.arrPct) st.arr *= 1 + effects.arrPct;
    if (effects.growth) st.growth += effects.growth;
    if (effects.burnPct) st.burn *= 1 + effects.burnPct;
  }

  function finishStartupRun(modal, reason) {
    const st = arcadeRun && arcadeRun.startup;
    const body = modal.querySelector('#startupBody');
    if (!st || !body) return;
    const early = reason === 'early' && st.log.length ? st.log[st.log.length - 1] : null;
    let exitValue = st.valuation;
    if (reason === 'bankrupt') exitValue = 0;
    else if (early) {
      const ev = st.events[st.round - 1];
      const chosen = ev && ev.options.find(o => o.label === early.choice);
      if (chosen && chosen.effects && chosen.effects.earlyExit) exitValue = chosen.effects.earlyExit;
    }
    const multiple = exitValue > 0 ? Math.max(0, exitValue * st.equity / st.initial) : 0;
    const won = multiple > 1;
    const reward = won ? clamp(Math.round(arcadeRun.entry * Math.min(8, multiple)), 0, arcadeRun.entry * 8) : 0;
    body.innerHTML = '<div class="arcade-result ' + (won ? 'win' : 'lose') + '">' +
      '<div class="arcade-result-icon">' + (reason === 'bankrupt' ? '💀' : won ? '🦄' : '🚪') + '</div>' +
      '<div class="arcade-result-eyebrow">' + (reason === 'bankrupt' ? 'HẾT TIỀN · BANKRUPT' : 'EXIT ' + (won ? 'CÓ LÃI' : 'DƯỚI VỐN')) + '</div>' +
      '<h3>' + esc(st.idea.name) + '</h3>' +
      '<div class="arcade-result-score ' + changeCls(multiple - 1) + '">' + nf(multiple, 2) + '× vốn định giá ban đầu</div>' +
      '<div class="arcade-result-grid"><div><span>Giá trị exit</span><b>' + nf(exitValue, 0) + ' tỷ</b></div><div><span>Sở hữu cuối</span><b>' + nf(st.equity * 100, 1) + '%</b></div><div><span>Định giá ban đầu</span><b>' + nf(st.initial, 0) + ' tỷ</b></div><div><span>Cash cuối</span><b class="' + (st.cash < 0 ? 'down' : '') + '">' + nf(st.cash, 1) + ' tỷ</b></div><div><span>Thưởng carry</span><b>+' + fmtVND(reward) + '</b></div></div>' +
      '<p class="arcade-result-note">' + (reason === 'bankrupt' ? 'Startup hết tiền trước khi tới exit. Trong venture, runway là thứ sống còn: hãy cắt đốt tiền hoặc gọi vốn trước khi quá muộn.' : won ? 'Bạn đưa công ty tới exit có lãi. Bội số cuối cùng phản ánh cả tăng trưởng, pha loãng và kỷ luật vốn.' : 'Exit dưới vốn. Không phải startup nào cũng nên tiếp tục đốt tiền — đôi khi bán sớm là quyết định đúng.') + '</p>' +
      '<div class="startup-log">' + st.log.map((l, i) => '<div><span>' + (i + 1) + '</span><div><b>' + esc(l.title) + '</b><em>' + esc(l.choice) + '</em></div></div>').join('') + '</div>' +
      arcadeResultActionsHTML('startup') + '</div>';
    arcadeFinish({ won, reward, score: multiple, label: (reason === 'bankrupt' ? 'Bankrupt · ' : 'Exit ') + nf(multiple, 2) + '×', aura: won ? 26 : 8, xp: won ? 46 : 14 });
  }

  /* ------------------------------ ARCADE · CANDLE DUEL ------------------------------ */
  function openDuelGame() {
    openModal({
      title: '🕯️ Candle Duel',
      sub: 'Chọn đối thủ · 5 vòng đọc nến thật',
      size: 'modal-lg',
      body: '<div id="duelBody">' + duelBotsHTML() + '</div>',
      onOpen: modal => {
        const body = modal.querySelector('#duelBody');
        body.querySelectorAll('[data-duel-bot]').forEach(btn => btn.addEventListener('click', () => {
          const bot = D.DUEL_BOTS.find(x => x.id === btn.getAttribute('data-duel-bot'));
          if (bot) startDuel(modal, bot);
        }));
      }
    });
  }

  function duelBotsHTML() {
    return '<div class="deal-intro"><p>Mỗi vòng hiển thị 20 nến thật. Bạn và bot cùng dự đoán nến kế tiếp tăng hay giảm. Ai đúng nhiều hơn sau 5 vòng sẽ thắng. Bot càng khó, thưởng càng cao.</p></div>' +
      '<div class="duel-bots">' + D.DUEL_BOTS.map(bot =>
        '<button class="duel-bot" data-duel-bot="' + bot.id + '" style="--bc:' + bot.color + '"><span class="duel-bot-icon">' + bot.icon + '</span><b>' + esc(bot.name) + '</b><span class="badge">' + esc(bot.difficulty) + '</span><em>Độ chính xác ' + nf(bot.accuracy * 100, 0) + '%</em><p>' + esc(bot.taunt) + '</p><div class="duel-bot-reward">Thưởng thắng <b>' + fmtVND(bot.reward) + '</b></div></button>').join('') + '</div>';
  }

  async function startDuel(modal, bot) {
    const body = modal.querySelector('#duelBody');
    body.innerHTML = '<div class="arcade-loading">' + icon('candles') + '<b>Đang tải nến thị trường…</b><span>Chuẩn bị bàn đấu với ' + esc(bot.name) + '</span></div>';
    const pool = D.ASSETS.filter(a => ['crypto', 'us', 'hose', 'etf'].includes(a.group) && a.price > 0);
    const asset = pool[Math.floor(Math.random() * pool.length)] || D.ASSETS[0];
    let candles = null;
    try { candles = await API.chart(asset, '1D'); } catch (e) { candles = null; }
    if (!arcadeRun) return;
    if (!candles || candles.length < 30) candles = D.generateCandles(asset, '1D', 80, asset.price, Date.now());
    arcadeRun.duel = { bot, asset, candles: candles.slice(-70), round: 0, player: 0, botScore: 0, log: [] };
    renderDuelRound(modal);
  }

  function duelCandlesSVG(candles, revealIdx) {
    if (!candles || !candles.length) return '';
    const w = 580, h = 200, pad = 8;
    const min = Math.min(...candles.map(c => c.l));
    const max = Math.max(...candles.map(c => c.h));
    const range = max - min || 1;
    const slot = (w - pad * 2) / candles.length;
    const bodyW = Math.max(3, slot * 0.56);
    const y = v => pad + (max - v) / range * (h - pad * 2);
    return '<svg class="duel-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      candles.map((c, i) => {
        const up = c.c >= c.o;
        const color = up ? '#2ee6a6' : '#ff6b81';
        const x = pad + slot * i + slot / 2;
        const top = y(Math.max(c.o, c.c));
        const height = Math.max(1.4, y(Math.min(c.o, c.c)) - top);
        return '<line x1="' + x.toFixed(2) + '" x2="' + x.toFixed(2) + '" y1="' + y(c.h).toFixed(2) + '" y2="' + y(c.l).toFixed(2) + '" stroke="' + color + '" stroke-width="1" opacity="' + (i === revealIdx ? 1 : 0.8) + '"/>' +
          '<rect x="' + (x - bodyW / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + bodyW.toFixed(2) + '" height="' + height.toFixed(2) + '" rx="0.5" fill="' + color + '" opacity="' + (i === revealIdx ? 1 : 0.85) + '"/>';
      }).join('') + '</svg>';
  }

  function duelBotChoice(bot, windowCandles) {
    const last = windowCandles[windowCandles.length - 1];
    const prev = windowCandles[windowCandles.length - 2] || last;
    let dir;
    if (bot.style === 'momentum') dir = last.c >= prev.c ? 'up' : 'down';
    else if (bot.style === 'contrarian') dir = last.c >= prev.c ? 'down' : 'up';
    else if (bot.style === 'quant') {
      const avg = windowCandles.slice(-5).reduce((s, c) => s + c.c, 0) / Math.min(5, windowCandles.length);
      dir = last.c >= avg ? 'up' : 'down';
    } else if (bot.style === 'pattern') {
      const last3 = windowCandles.slice(-3);
      dir = last3[last3.length - 1].c >= last3[0].c ? 'up' : 'down';
    } else dir = Math.random() > 0.5 ? 'up' : 'down';
    if (Math.random() > bot.accuracy) dir = dir === 'up' ? 'down' : 'up';
    return dir;
  }

  function renderDuelRound(modal) {
    const run = arcadeRun && arcadeRun.duel;
    const body = modal.querySelector('#duelBody');
    if (!run || !body) return;
    if (run.round >= 5) return finishDuel(modal);
    const windowCandles = run.candles.slice(run.round, run.round + 20);
    const next = run.candles[run.round + 20];
    if (!next) return finishDuel(modal);
    body.innerHTML = '<div class="duel-head"><div class="duel-score"><span>BẠN</span><b>' + run.player + '</b><em>vs</em><span>' + esc(run.bot.name) + '</span><b>' + run.botScore + '</b></div><div class="arcade-progress"><span>Vòng ' + (run.round + 1) + ' / 5</span><b>' + esc(run.asset.symbol) + ' · 1D</b></div></div>' +
      '<div class="duel-chart-wrap" id="duelChartWrap">' + duelCandlesSVG(windowCandles) + '</div>' +
      '<div class="duel-prompt"><span class="duel-bot-taunt">' + run.bot.icon + ' “' + esc(run.bot.taunt) + '”</span><h4>Nến kế tiếp sẽ tăng hay giảm?</h4><div class="duel-actions"><button class="btn btn-gold" data-duel-pick="up">' + icon('arrow-up-right') + ' TĂNG</button><button class="btn btn-ghost" data-duel-pick="down">' + icon('arrow-down-right') + ' GIẢM</button></div></div>';
    body.querySelectorAll('[data-duel-pick]').forEach(btn => btn.addEventListener('click', () => {
      if (!arcadeRun || arcadeRun.finished) return;
      const playerPick = btn.getAttribute('data-duel-pick');
      const botPick = duelBotChoice(run.bot, windowCandles);
      const actual = next.c >= next.o ? 'up' : 'down';
      const playerWin = playerPick === actual;
      const botWin = botPick === actual;
      if (playerWin) run.player++;
      if (botWin) run.botScore++;
      run.log.push({ playerPick, botPick, actual, playerWin, botWin });
      run.round++;
      body.innerHTML = '<div class="duel-head"><div class="duel-score"><span>BẠN</span><b class="' + (playerWin ? 'up' : '') + '">' + run.player + '</b><em>vs</em><span>' + esc(run.bot.name) + '</span><b class="' + (botWin ? 'up' : '') + '">' + run.botScore + '</b></div><div class="arcade-progress"><span>Vòng ' + run.round + ' / 5</span><b>' + esc(run.asset.symbol) + ' · 1D</b></div></div>' +
        '<div class="duel-chart-wrap">' + duelCandlesSVG(windowCandles.concat([next]), windowCandles.length) + '</div>' +
        '<div class="duel-reveal"><div class="duel-reveal-line"><span>Bạn chọn</span><b class="' + (playerWin ? 'up' : 'down') + '">' + (playerPick === 'up' ? 'TĂNG' : 'GIẢM') + ' · ' + (playerWin ? 'đúng' : 'sai') + '</b></div>' +
        '<div class="duel-reveal-line"><span>' + esc(run.bot.name) + ' chọn</span><b class="' + (botWin ? 'up' : 'down') + '">' + (botPick === 'up' ? 'TĂNG' : 'GIẢM') + ' · ' + (botWin ? 'đúng' : 'sai') + '</b></div>' +
        '<div class="duel-reveal-line"><span>Nến thực tế</span><b class="' + (actual === 'up' ? 'up' : 'down') + '">' + (actual === 'up' ? 'TĂNG' : 'GIẢM') + ' (' + nf((next.c / next.o - 1) * 100, 2) + '%)</b></div>' +
        '<button class="btn btn-gold btn-block" id="duelNext">' + (run.round >= 5 ? 'XEM KẾT QUẢ' : 'VÒNG TIẾP') + '</button></div>';
      body.querySelector('#duelNext').addEventListener('click', () => renderDuelRound(modal));
    }));
  }

  function finishDuel(modal) {
    const run = arcadeRun && arcadeRun.duel;
    const body = modal.querySelector('#duelBody');
    if (!run || !body) return;
    const won = run.player > run.botScore;
    const draw = run.player === run.botScore;
    const reward = won ? run.bot.reward : draw ? Math.round(arcadeRun.entry * 0.5) : 0;
    body.innerHTML = '<div class="arcade-result ' + (won ? 'win' : 'lose') + '">' +
      '<div class="arcade-result-icon">' + (won ? '🕯️' : draw ? '🤝' : '💥') + '</div>' +
      '<div class="arcade-result-eyebrow">' + (won ? 'BẠN THẮNG' : draw ? 'HOÀ' : 'BOT THẮNG') + '</div>' +
      '<h3>' + esc(run.bot.name) + ' · ' + esc(run.asset.symbol) + '</h3>' +
      '<div class="arcade-result-score ' + (won ? 'up' : '') + '">' + run.player + ' – ' + run.botScore + '</div>' +
      '<div class="arcade-result-grid"><div><span>Độ chính xác của bạn</span><b>' + nf(run.player / 5 * 100, 0) + '%</b></div><div><span>Độ chính xác của bot</span><b>' + nf(run.botScore / 5 * 100, 0) + '%</b></div><div><span>Thưởng</span><b>+' + fmtVND(reward) + '</b></div><div><span>Chuỗi thắng</span><b>🔥 ' + (won ? ensureArcade().duelStreak + 1 : 0) + '</b></div></div>' +
      '<div class="duel-log">' + run.log.map((l, i) => '<span class="' + (l.playerWin ? 'up' : 'down') + '">' + (i + 1) + '</span>').join('') + '</div>' +
      '<p class="arcade-result-note">' + (won ? 'Bạn đọc nến tốt hơn bot trong 5 vòng. Nhưng nhớ: một chuỗi thắng ngắn không chứng minh bạn có lợi thế dài hạn.' : draw ? 'Hai bên hoà. Bạn được hoàn một nửa phí vào cửa.' : 'Bot thắng lần này. Hãy xem lại các vòng sai và nhận diện loại nến bạn đọc kém nhất.') + '</p>' +
      arcadeResultActionsHTML('duel') + '</div>';
    arcadeFinish({ won, reward, score: run.player, label: run.player + '–' + run.botScore + ' vs ' + run.bot.name, aura: won ? 22 : 6, xp: won ? 40 : 10 });
  }

  /* ------------------------------ DERIVED ------------------------------ */
  function holdingList() {
    return Object.keys(state.holdings).map(id => {
      const a = byId[id];
      const h = state.holdings[id];
      if (!a || !h || h.qty <= 0) return null;
      const value = notionalVND(a, a.price, h.qty);
      const cost = h.avgVND * h.qty;
      return { asset: a, qty: h.qty, avgVND: h.avgVND, value, cost, pnl: value - cost, pnlPct: cost ? (value - cost) / cost * 100 : 0 };
    }).filter(Boolean);
  }

  function positionList() {
    return state.positions.map(p => {
      const a = byId[p.assetId];
      if (!a) return null;
      const sign = p.side === 'long' ? 1 : -1;
      const pnl = (a.price - p.entry) * p.qty * valueFactor(a) * sign;
      const notionalNow = notionalVND(a, a.price, p.qty);
      return { ...p, asset: a, pnl, roi: p.margin ? pnl / p.margin * 100 : 0, notionalNow };
    }).filter(Boolean);
  }

  function netWorth() {
    let v = state.cash;
    holdingList().forEach(h => { v += h.value; });
    positionList().forEach(p => { v += p.margin + p.pnl; });
    v += savingsValue();
    v += primeNavValue();
    v += coinPortfolioValue();
    v += fundPortfolioValue();
    v -= loanDebtTotal();
    return v;
  }
  function investedValue() {
    let v = fundPortfolioValue();
    holdingList().forEach(h => { v += h.value; });
    const p = state.prime;
    if (p && p.active) {
      Object.keys(p.holdings || {}).forEach(id => {
        const a = byId[id], h = p.holdings[id];
        if (a && h && h.qty > 0) v += notionalVND(a, a.price, h.qty);
      });
      v += primeSettlingValue();
    }
    return v;
  }
  function investedCost() {
    let v = fundPortfolioCost();
    holdingList().forEach(h => { v += h.cost; });
    state.positions.forEach(p => { v += p.margin; });
    return v;
  }
  function unrealizedPnl() {
    let v = fundPortfolioPnl();
    holdingList().forEach(h => { v += h.pnl; });
    positionList().forEach(p => { v += p.pnl; });
    const p = state.prime;
    if (p && p.active) {
      Object.keys(p.holdings || {}).forEach(id => {
        const a = byId[id], h = p.holdings[id];
        if (a && h && h.qty > 0) v += notionalVND(a, a.price, h.qty) - h.avgCost * h.qty;
      });
    }
    return v;
  }
  function pnlSinceStart() { return netWorth() - state.capital; }
  function xpInfo() {
    let xp = Math.max(0, state.xp || 0), level = 1, need = 100;
    while (xp >= need && level < 99) { xp -= need; level++; need = Math.round(need * 1.25); }
    return { level, current: xp, need, total: state.xp || 0 };
  }
  function currentRank() {
    const lvl = xpInfo().level;
    let r = D.RANKS[0];
    D.RANKS.forEach(item => { if (lvl >= item.level) r = item; });
    return r;
  }
  function nextRank() {
    const lvl = xpInfo().level;
    return D.RANKS.find(r => r.level > lvl) || null;
  }
  function itemDef(id) { return D.SHOP.find(i => i.id === id) || null; }
  function hasItem(id) { return state.shop.includes(id); }
  function themeValue() { const it = itemDef(state.equipped.theme); return it ? it.value : 'midnight'; }
  function frameValue() { const it = itemDef(state.equipped.frame); return it ? it.value : 'none'; }
  function titleValue() { const it = itemDef(state.equipped.title); return it ? it.value : 'Tân Binh'; }
  function petValue() { const it = state.equipped.pet ? itemDef(state.equipped.pet) : null; return it ? it.value : ''; }
  function xpMultiplier() {
    const now = Date.now();
    if (state.boosts.xp2Until > now) return 2;
    if (state.boosts.coffeeUntil > now) return 1.5;
    return 1;
  }
  function alertLimit() { return hasItem('perk_alerts') ? 8 : 3; }
  function watchLimit() { return hasItem('perk_watchlist') ? 25 : 10; }
  function questProgress(id) { return (state.quests.progress && state.quests.progress[id]) || 0; }
  function questClaimed(id) { return (state.quests.claimed || []).includes(id); }
  function achievementMetric(metric) {
    switch (metric) {
      case 'trades': return state.stats.trades || 0;
      case 'realized': return Math.max(0, state.realized || 0);
      case 'crypto_trades': return state.stats.crypto_trades || 0;
      case 'futures_trades': return state.stats.futures_trades || 0;
      case 'holdings_count': return holdingList().length;
      case 'drawings': return state.stats.drawings || 0;
      case 'lessons': return (state.stats.lessons || []).length;
      case 'streak': return state.streak || 1;
      case 'level': return xpInfo().level;
      case 'items': return state.shop.filter(id => { const it = itemDef(id); return it && it.price > 0; }).length;
      case 'alerts': return state.stats.alerts || 0;
      case 'backtests': return state.stats.backtests || 0;
      case 'groups_held': return new Set(holdingList().map(h => h.asset.group)).size;
      case 'detective_solved': return (state.detective && state.detective.solved) || 0;
      case 'detective_streak': return (state.detective && state.detective.bestStreak) || 0;
      case 'savings_deposits': return (state.savings && state.savings.deposits) || 0;
      case 'savings_deposited': return (state.savings && state.savings.deposited) || 0;
      case 'savings_gold': return (state.savings && state.savings.goldBought) || 0;
      case 'savings_currencies': return savingsCurrencies();
      case 'job_shifts': return (state.jobs && state.jobs.shifts) || 0;
      case 'job_earned': return (state.jobs && state.jobs.earned) || 0;
      case 'auction_wins': return (state.auctions && state.auctions.wins) || 0;
      case 'auction_saved': return (state.auctions && state.auctions.saved) || 0;
      case 'prime_active': return (state.prime && state.prime.active) ? 1 : 0;
      case 'prime_fills': return ((state.prime && state.prime.fills) || []).filter(f => f.kind !== 'từ chối').length;
      case 'prime_realized': return Math.max(0, (state.prime && state.prime.realized) || 0);
      case 'prime_holdings': return Object.keys((state.prime && state.prime.holdings) || {}).length;
      case 'prime_settlements': return (state.prime && state.prime.settlementCount) || 0;
      case 'arcade_plays': return (state.arcade && state.arcade.played) || 0;
      case 'arcade_deal_wins': return (state.arcade && state.arcade.dealWins) || 0;
      case 'arcade_fund_best': return (state.arcade && state.arcade.bestFundReturn) || 0;
      case 'arcade_startup_exits': return (state.arcade && state.arcade.startupExits) || 0;
      case 'arcade_startup_best': return (state.arcade && state.arcade.bestStartupMultiple) || 0;
      case 'arcade_duel_wins': return (state.arcade && state.arcade.duelWins) || 0;
      case 'arcade_duel_streak_best': return (state.arcade && state.arcade.duelBestStreak) || 0;
      case 'arcade_profit': return (state.arcade && state.arcade.profit) || 0;
      case 'coin_trades': return (state.coin && state.coin.trades) || 0;
      case 'coins_created': return ((state.coin && state.coin.created) || []).length;
      case 'coin_realized': return Math.max(0, (state.coin && state.coin.realized) || 0);
      case 'coin_value': return coinPortfolioValue();
      case 'coin_hype_best': return Math.max(0, (state.coin && state.coin.hypeBest) || 0);
      case 'coin_best_sell': return Math.max(0, (state.coin && state.coin.bestSell) || 0);
      case 'coin_burned': return Math.max(0, (state.coin && state.coin.burned) || 0);
      case 'coin_buybacks': return Math.max(0, (state.coin && state.coin.buybacks) || 0);
      case 'coin_airdrops': return Math.max(0, (state.coin && state.coin.airdrops) || 0);
      case 'coin_locks': return Math.max(0, (state.coin && state.coin.locks) || 0);
      case 'coin_creator_earned': return Math.max(0, (state.coin && state.coin.creatorEarned) || 0);
      case 'coin_holdings': return Object.keys((state.coin && state.coin.holdings) || {}).filter(id => { const h = state.coin.holdings[id]; return h && h.qty > 0; }).length;
      case 'fund_buys': return (state.funds && state.funds.buys) || 0;
      case 'fund_holdings': return Object.keys((state.funds && state.funds.positions) || {}).filter(id => { const p = state.funds.positions[id]; return p && p.units > 0; }).length;
      case 'fund_value': return fundPortfolioValue();
      case 'fund_realized': return Math.max(0, (state.funds && state.funds.realized) || 0);
      case 'dividend_count': return (state.dividends && state.dividends.count) || 0;
      case 'dividend_total': return Math.max(0, (state.dividends && state.dividends.total) || 0);
      case 'dividend_reinvested': return Math.max(0, (state.dividends && state.dividends.reinvested) || 0);
      case 'events_seen': return (state.events && state.events.seen) || 0;
      case 'event_trades': return (state.events && state.events.trades) || 0;
      default: return 0;
    }
  }
  function achievementState(def) {
    const value = achievementMetric(def.metric);
    const achieved = value >= def.goal;
    const claimed = !!state.achievements[def.id];
    return { value, achieved, claimed, progress: clamp(value / def.goal * 100, 0, 100), claimable: achieved && !claimed };
  }

  /* ------------------------------ UI PRIMITIVES ------------------------------ */
  function toast(title, message, kind, emoji) {
    const root = $('#toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    el.innerHTML = '<div class="toast-icon">' + esc(emoji || (kind === 'success' ? '✓' : kind === 'error' ? '!' : kind === 'gold' ? '✦' : 'i')) + '</div>' +
      '<div class="toast-body"><div class="toast-title">' + esc(title) + '</div>' +
      (message ? '<div class="toast-msg">' + esc(message) + '</div>' : '') + '</div>' +
      '<button class="toast-close" aria-label="Đóng">' + icon('close') + '</button>';
    root.appendChild(el);
    const remove = () => {
      if (!el.isConnected) return;
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, kind === 'error' ? 6200 : 4600);
  }

  function confetti(count) {
    if (!state.settings.confetti) return;
    const root = $('#confettiRoot');
    if (!root) return;
    const colors = ['#f3c56b', '#2ee6a6', '#5ac8fa', '#b59cff', '#ff5d73', '#ff9f43', '#ffffff'];
    const n = count || 60;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.setProperty('--drift', (Math.random() * 180 - 90).toFixed(0) + 'px');
      p.style.setProperty('--rot', (Math.random() * 1080 + 360).toFixed(0) + 'deg');
      p.style.animationDuration = (Math.random() * 1.8 + 2.1).toFixed(2) + 's';
      p.style.animationDelay = (Math.random() * 0.35).toFixed(2) + 's';
      p.style.opacity = (Math.random() * 0.35 + 0.65).toFixed(2);
      root.appendChild(p);
      setTimeout(() => p.remove(), 4400);
    }
  }

  function openModal(opts) {
    const root = $('#modalRoot');
    if (!root) return null;
    const head = opts.title ? '<div class="modal-head"><div><h2>' + opts.title + '</h2>' +
      (opts.sub ? '<div class="sub">' + opts.sub + '</div>' : '') + '</div>' +
      '<button class="modal-close" data-close-modal aria-label="Đóng">' + icon('close') + '</button></div>' : '';
    root.innerHTML = '<div class="modal-scrim" data-modal-scrim>' +
      '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
      head + '<div class="modal-body">' + opts.body + '</div>' +
      (opts.foot ? '<div class="modal-foot ' + (opts.footClass || '') + '">' + opts.foot + '</div>' : '') +
      '</div></div>';
    const scrim = root.querySelector('[data-modal-scrim]');
    scrim.addEventListener('click', e => {
      if (e.target === scrim || e.target.closest('[data-close-modal]')) closeModal();
    });
    if (opts.onOpen) setTimeout(() => { try { opts.onOpen(root.querySelector('.modal')); } catch (e) { console.error(e); } }, 30);
    const first = root.querySelector('input:not([type=hidden]), select, textarea, button.btn-gold');
    if (first && opts.focus !== false) setTimeout(() => first.focus(), 80);
    return root.querySelector('.modal');
  }
  function closeModal() {
    if (arcadeRun && !arcadeRun.finished) arcadeRun = null;
    const root = $('#modalRoot'); if (root) root.innerHTML = '';
  }

  /* ------------------------------ CHART ZOOM OVERLAY ------------------------------ */
  function openChartZoom(opts) {
    if (!opts) return;
    let root = $('#chartZoomRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'chartZoomRoot';
      document.body.appendChild(root);
    }
    const title = opts.title || 'Biểu đồ';
    const legend = opts.legend || '';
    const note = opts.note || '';
    root.innerHTML = '<div class="chart-zoom-scrim" data-chart-zoom-scrim>' +
      '<div class="chart-zoom-panel" role="dialog" aria-modal="true" aria-label="' + esc(title + ' phóng to') + '">' +
      '<div class="chart-zoom-head"><div class="chart-zoom-copy"><span>' + icon('chart') + ' XEM BIỂU ĐỒ LỚN</span><h3>' + esc(title) + '</h3>' +
      (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>' +
      '<button class="chart-zoom-close" data-chart-zoom-close aria-label="Đóng">' + icon('close') + '</button></div>' +
      '<div class="chart-zoom-body">' +
      (opts.svg ? '<div class="chart-zoom-svg">' + opts.svg + '</div>' : '<canvas id="chartZoomCanvas" class="chart-zoom-chart"></canvas>') +
      (legend ? '<div class="chart-zoom-legend">' + legend + '</div>' : '') +
      (note ? '<div class="chart-zoom-note">' + icon('info') + ' <span>' + esc(note) + '</span></div>' : '') +
      '</div></div></div>';
    document.body.classList.add('chart-zoom-open');
    const scrim = root.querySelector('[data-chart-zoom-scrim]');
    if (scrim) scrim.addEventListener('click', e => {
      if (e.target === scrim || e.target.closest('[data-chart-zoom-close]')) closeChartZoom();
    });
    if (opts.canvas) {
      const cv = $('#chartZoomCanvas');
      const src = opts.canvas;
      if (cv && src && src.width) {
        cv.width = src.width;
        cv.height = src.height;
        const ctx = cv.getContext('2d');
        if (ctx) ctx.drawImage(src, 0, 0);
      }
    }
    const closeBtn = root.querySelector('.chart-zoom-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 40);
  }

  function closeChartZoom() {
    const root = $('#chartZoomRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('chart-zoom-open');
  }

  function pushNotif(emoji, title, text) {
    state.notifications.unshift({ id: uid('n'), icon: emoji || '🔔', title, text, t: Date.now(), unread: true });
    state.notifications = state.notifications.slice(0, 40);
    updateNotifDot();
    save();
  }
  function unreadNotifs() { return state.notifications.filter(n => n.unread).length; }
  function updateNotifDot() {
    const dot = $('#notifDot');
    if (!dot) return;
    dot.classList.toggle('show', unreadNotifs() > 0);
  }
  function notificationsModal() {
    const items = state.notifications.length ? state.notifications.map(n =>
      '<div class="notif-item"><div class="notif-icon">' + esc(n.icon) + '</div><div class="notif-body">' +
      '<div class="notif-title">' + esc(n.title) + '</div><div class="notif-text">' + esc(n.text || '') + '</div>' +
      '<div class="notif-time">' + timeAgo(n.t) + '</div></div>' + (n.unread ? '<span class="notif-unread"></span>' : '') + '</div>').join('') :
      '<div class="empty-state"><div class="empty-icon">🔕</div><strong>Chưa có thông báo</strong><p>Các sự kiện giao dịch, cảnh báo giá và phần thưởng sẽ xuất hiện ở đây.</p></div>';
    openModal({
      title: 'Thông báo', sub: 'Cập nhật hoạt động tài khoản và tín hiệu thị trường của bạn.',
      size: 'modal-lg', body: '<div class="notif-list">' + items + '</div>',
      foot: '<button class="btn btn-ghost btn-sm" data-action="clear-notifs">Xoá tất cả</button><button class="btn btn-gold btn-sm" data-close-modal>Đã đọc</button>',
      onOpen: () => {
        state.notifications.forEach(n => { n.unread = false; });
        state.notifReadAt = Date.now();
        updateNotifDot(); save();
      }
    });
  }

  /* ------------------------------ AMBIENT / SHELL ------------------------------ */
  function effectsOn(id) { return state.equipped.effects && state.equipped.effects.includes(id); }
  function buildAmbient() {
    const old = document.getElementById('ambientLayer');
    if (old) old.remove();
    let layer = null;
    const ensure = () => {
      if (!layer) {
        layer = document.createElement('div');
        layer.id = 'ambientLayer';
        layer.className = 'ambient-layer';
        document.body.appendChild(layer);
      }
      return layer;
    };
    if (effectsOn('fx_rain')) {
      const box = ensure();
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('span');
        p.className = 'aura-particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 9 + 9).toFixed(1) + 's';
        p.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
        box.appendChild(p);
      }
    }
    if (effectsOn('fx_particles')) {
      const box = ensure();
      for (let i = 0; i < 14; i++) {
        const p = document.createElement('span');
        p.className = 'candle-particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 10 + 10).toFixed(1) + 's';
        p.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
        p.style.opacity = (Math.random() * 0.12 + 0.07).toFixed(2);
        box.appendChild(p);
      }
    }
    if (effectsOn('fx_petals')) {
      const box = ensure();
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('span');
        p.className = 'petal-particle';
        p.textContent = i % 3 === 0 ? '🌸' : '❀';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 8 + 12).toFixed(1) + 's';
        p.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
        p.style.fontSize = (Math.random() * 9 + 9).toFixed(0) + 'px';
        box.appendChild(p);
      }
    }
    if (effectsOn('fx_coins')) {
      const box = ensure();
      for (let i = 0; i < 9; i++) {
        const p = document.createElement('span');
        p.className = 'coin-particle';
        p.textContent = '🪙';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 7 + 11).toFixed(1) + 's';
        p.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
        p.style.fontSize = (Math.random() * 8 + 10).toFixed(0) + 'px';
        box.appendChild(p);
      }
    }
  }

  function updateSourceUI() {
    const mode = API.mode;
    const status = $('#marketStatus');
    const dot = $('#sidebarStatusDot');
    const label = $('#sidebarStatus');
    const footer = $('#dataSourceFooter');
    const navDot = $('#navLiveDot');
    if (status) {
      status.classList.remove('live', 'demo', 'off');
      status.classList.add(mode === 'live' ? 'live' : mode === 'binance' ? 'live' : 'demo');
      const text = status.querySelector('.ms-text');
      if (text) text.textContent = mode === 'live' ? 'DỮ LIỆU THẬT' : mode === 'binance' ? 'CRYPTO LIVE' : 'MÔ PHỎNG';
    }
    if (dot) dot.className = 'status-dot ' + (mode === 'demo' ? 'demo' : 'live');
    if (label) label.textContent = mode === 'live' ? 'Trực tiếp · Yahoo + Binance' : mode === 'binance' ? 'Binance trực tiếp · crypto' : 'Ngoại tuyến · mô phỏng';
    if (footer) footer.textContent = mode === 'live' ? 'Nguồn dữ liệu: Yahoo Finance · Binance · RSS' : mode === 'binance' ? 'Nguồn: Binance trực tiếp · thị trường khác mô phỏng' : 'Nguồn: dữ liệu mô phỏng cục bộ';
    if (navDot) navDot.style.display = mode === 'demo' ? 'none' : '';
    document.querySelectorAll('[data-source-label]').forEach(el => {
      el.textContent = mode === 'live' ? 'Dữ liệu thật' : mode === 'binance' ? 'Binance live' : 'Mô phỏng';
      el.classList.toggle('live', mode !== 'demo');
    });
  }

  function updateShell() {
    document.body.dataset.theme = themeValue();
    document.body.dataset.frame = frameValue();
    document.body.dataset.privacy = state.settings.privacy ? 'on' : 'off';
    document.body.dataset.fx = effectsOn('fx_glow') ? 'glow' : '';
    document.body.dataset.lens = hasItem('perk_lens') ? 'on' : 'off';
    document.querySelectorAll('[data-username]').forEach(el => { el.textContent = state.username; });
    document.querySelectorAll('[data-avatar]').forEach(el => { el.textContent = state.avatar; });
    const auraEls = document.querySelectorAll('[data-aura]');
    auraEls.forEach(el => { el.textContent = nf(state.aura, 0); });
    document.querySelectorAll('[data-aura-bar]').forEach(el => { el.style.width = clamp(state.aura / 40, 6, 100) + '%'; });
    const nw = netWorth();
    document.querySelectorAll('[data-networth]').forEach(el => { el.textContent = money(nw) + ' ₫'; });
    document.querySelectorAll('[data-networth-hero]').forEach(el => { el.textContent = money(nw); });
    document.querySelectorAll('[data-networth-plain]').forEach(el => { el.textContent = money(nw); });
    const lvl = xpInfo();
    document.querySelectorAll('[data-level]').forEach(el => { el.textContent = 'Lv.' + lvl.level; });
    document.querySelectorAll('[data-rank]').forEach(el => { el.textContent = currentRank().name; });
    document.querySelectorAll('[data-title]').forEach(el => { el.textContent = titleValue(); });
    const bal = $('#balancePill');
    if (bal) bal.title = 'Tổng tài sản: ' + fmtVND(nw);
    updateClock();
  }

  function updateClock() {
    const t = new Date();
    const el = $('#msTime');
    if (el) el.textContent = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  }

  function updateTicker() {
    const ids = ['vnindex', 'vcb', 'fpt', 'hpg', 'ssi', 'btc', 'eth', 'sol', 'aapl', 'nvda', 'eurusd', 'xauusd', 'usoil', 'spx', 'btcperp', 'doge'];
    $$('[data-tick-sym]').forEach(el => { el.textContent = '—'; });
    void ids;
    document.querySelectorAll('[data-tick-id]').forEach(el => {
      const a = byId[el.getAttribute('data-tick-id')];
      if (!a) return;
      const price = el.querySelector('[data-tick-price]');
      const chg = el.querySelector('[data-tick-chg]');
      if (price) price.textContent = fmtPrice(a);
      if (chg) { chg.textContent = fmtPct(a.changePct); chg.className = 't-chg ' + changeCls(a.changePct); }
    });
  }
  function buildTicker() {
    const track = $('#tickerTrack');
    if (!track) return;
    const ids = ['vnindex', 'vcb', 'fpt', 'hpg', 'ssi', 'btc', 'eth', 'sol', 'aapl', 'nvda', 'eurusd', 'xauusd', 'usoil', 'spx', 'btcperp', 'doge'];
    const one = ids.map(id => {
      const a = byId[id];
      if (!a) return '';
      return '<a class="ticker-item" href="#/terminal" data-tick-id="' + id + '"><span class="t-sym">' + esc(a.symbol) + '</span>' +
        '<span class="t-price" data-tick-price>—</span><span class="t-chg" data-tick-chg>—</span></a>';
    }).join('');
    track.innerHTML = one + one;
    updateTicker();
  }

  function updateGlobalQuotes() {
    lastQuoteAt = Date.now();
    $$('[data-q-price]').forEach(el => {
      const a = byId[el.getAttribute('data-q-price')];
      if (a) { el.textContent = fmtPrice(a); flashPrice(el, a.price); }
    });
    $$('[data-q-chg]').forEach(el => {
      const a = byId[el.getAttribute('data-q-chg')];
      if (!a) return;
      el.textContent = fmtPct(a.changePct);
      el.classList.remove('up', 'down', 'flat');
      el.classList.add(changeCls(a.changePct));
    });
    $$('[data-q-chg-badge]').forEach(el => {
      const a = byId[el.getAttribute('data-q-chg-badge')];
      if (!a) return;
      el.textContent = fmtPct(a.changePct);
      el.classList.remove('badge-up', 'badge-down');
      if (a.changePct > 0) el.classList.add('badge-up');
      if (a.changePct < 0) el.classList.add('badge-down');
    });
    $$('[data-q-vol]').forEach(el => {
      const a = byId[el.getAttribute('data-q-vol')];
      if (a) el.textContent = money(a.volume || 0);
    });
    const termPrice = $('#terminalLivePrice');
    const termChg = $('#terminalLiveChg');
    if (termPrice && byId[state.lastAsset]) {
      const a = byId[state.lastAsset];
      termPrice.textContent = fmtPrice(a);
      flashPrice(termPrice, a.price);
      if (termChg) {
        termChg.textContent = (a.changePct > 0 ? '+' : '') + nf(a.price - a.prev, a.decimals) + '  ·  ' + fmtPct(a.changePct);
        termChg.className = 'terminal-change ' + changeCls(a.changePct);
      }
      const orderPrice = $('#orderLastPrice');
      if (orderPrice) orderPrice.textContent = fmtPrice(a) + ' ' + priceUnit(a);
      if (mainChart) mainChart.updatePrice(a.price, { append: true });
    }
    updateTicker();
    updateShell();
    updatePortfolioLive();
    refreshFundsLive();
    checkLiveTriggers();
    if (state.prime && state.prime.active) {
      primeProcess();
      if (currentRoute === 'prime') primeRefreshPanels();
    }
  }

  function updateChartLiveStamp() {
    const label = $('#chartUpdated');
    if (!label) return;
    if (!lastQuoteAt) { label.textContent = 'Đang kết nối…'; return; }
    const sec = Math.max(0, Math.round((Date.now() - lastQuoteAt) / 1000));
    label.textContent = sec < 3 ? 'Vừa cập nhật' : 'Cập nhật ' + sec + 's trước';
    const dot = $('#chartLiveDot');
    if (dot) dot.classList.toggle('stale', sec > 30);
  }

  function updatePortfolioLive() {
    const pv = $('[data-portfolio-value]');
    if (pv) pv.textContent = money(netWorth());
    const up = $('[data-unrealized]');
    if (up) {
      const v = unrealizedPnl();
      up.textContent = (v >= 0 ? '+' : '') + fmtVND(v);
      up.className = 'val ' + changeCls(v);
    }
    const nr = $('[data-live-networth]');
    if (nr) nr.textContent = fmtVND(netWorth());
  }

  /* ------------------------------ DATA SYNC ------------------------------ */
  function seedSparks() {
    D.ASSETS.forEach(a => {
      if (!a.spark) a.spark = D.generateSpark(a, 28);
      if (!a.changePct && a.prev) a.changePct = (a.price - a.prev) / a.prev * 100;
    });
  }

  function applyQuote(asset, q) {
    if (!asset || !q || !Number.isFinite(q.price) || q.price <= 0) return false;
    asset.price = q.price;
    if (Number.isFinite(q.prevClose) && q.prevClose > 0) asset.prev = q.prevClose;
    asset.changePct = Number.isFinite(q.changePct) ? q.changePct : (asset.prev ? (q.price - asset.prev) / asset.prev * 100 : 0);
    if (Number.isFinite(q.open) && q.open > 0) asset.open = q.open;
    if (Number.isFinite(q.high) && q.high > 0) asset.high = q.high;
    if (Number.isFinite(q.low) && q.low > 0) asset.low = q.low;
    if (Number.isFinite(q.volume) && q.volume >= 0) asset.volume = q.volume;
    if (Array.isArray(q.spark) && q.spark.length > 2) asset.spark = q.spark;
    asset.live = true;
    asset.updatedAt = Date.now();
    return true;
  }

  function syncDerivatives() {
    D.ASSETS.filter(a => a.group === 'derivatives' && a.underlying).forEach(a => {
      const u = byId[a.underlying];
      if (!u) return;
      if (!a._basis) a._basis = a.price / u.price;
      a.price = u.price * a._basis;
      a.changePct = u.changePct || 0;
      a.prev = a.price / (1 + (u.changePct || 0) / 100);
      a.live = u.live;
    });
  }

  async function refreshQuotes(initial) {
    if (document.hidden && !initial) return;
    try {
      const map = await API.quotes(!!initial);
      if (map && map.size) {
        map.forEach((q, id) => { if (byId[id]) applyQuote(byId[id], q); });
        if (API.fx && API.fx > 1000) state.fx = API.fx;
        syncSavingsMarket();
        syncDerivatives();
        processSavings();
        processLoans();
        updateGlobalQuotes();
        updateSourceUI();
        save();
      } else if (initial && API.mode === 'demo') {
        updateGlobalQuotes();
      }
    } catch (e) {
      API.lastError = e.message || String(e);
    }
  }

  function simulateTicks() {
    if (document.hidden) return;
    let changed = false;
    D.ASSETS.forEach(a => {
      if (a.live && !a.demoOnly && a.group !== 'derivatives') return;
      if (a.group === 'derivatives') return;
      const ev = state.events && state.events.active;
      const evBias = ev && Array.isArray(ev.ids) && ev.ids.includes(a.id) ? (ev.kind === 'up' ? 0.00055 : -0.00055) : 0;
      const drift = (Math.random() - 0.495) * 0.0022 + evBias;
      const next = Math.max(a.price * (1 + drift), 0.00000001);
      a.price = Number(next.toFixed(a.decimals > 4 ? 8 : a.decimals));
      a.high = Math.max(a.high || next, next);
      a.low = Math.min(a.low || next, next);
      if (a.prev) a.changePct = (a.price - a.prev) / a.prev * 100;
      if (a.spark && a.spark.length) a.spark[a.spark.length - 1] = a.price;
      changed = true;
    });
    if (changed) {
      syncDerivatives();
      updateGlobalQuotes();
    }
  }

  function startData() {
    seedSparks();
    buildTicker();
    refreshQuotes(true);
    refreshSavingsRates();
    setInterval(() => refreshQuotes(false), 15000);
    setInterval(() => { if (!document.hidden) refreshSavingsRates(false); }, 300000);
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(simulateTicks, 6500);
    if (coinTimer) clearInterval(coinTimer);
    coinTimer = setInterval(coinTick, 7000);
    if (loansTimer) clearInterval(loansTimer);
    loansTimer = setInterval(() => { if (!document.hidden) processLoans(); }, 15000);
    loadNewsItems();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(updateClock, 30000);
    startLiveWidgets();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshQuotes(true);
        processLoans();
        processMarketEvents();
        processDividends();
        refreshEventUI();
      }
    });
  }

  /* ------------------------------ MARKET NEWS ------------------------------ */
  let newsItems = null;
  async function loadNewsItems() {
    try {
      const items = await API.news();
      if (items && items.length) newsItems = items;
    } catch (e) { /* dùng fallback */ }
    if (!newsItems) newsItems = D.FALLBACK_NEWS;
    document.querySelectorAll('[data-news-slot]').forEach(el => {
      const limit = Number(el.getAttribute('data-news-slot')) || 5;
      el.innerHTML = newsListHTML(newsItems.slice(0, limit));
    });
  }
  function newsListHTML(items) {
    return items.map((n, i) =>
      '<div class="news-item" data-news-link="' + esc(n.link || '') + '" data-news-index="' + i + '">' +
      '<div class="news-thumb">' + (n.image ? '<img src="' + esc(n.image) + '" alt="" loading="lazy">' : '📰') + '</div>' +
      '<div class="news-body"><div class="news-title">' + esc(n.title) + '</div>' +
      '<div class="news-meta"><span class="news-source">' + esc(n.source || 'AURELIS') + '</span><span class="dot-sep">·</span><span>' + timeAgo(n.time) + '</span></div></div></div>'
    ).join('');
  }

  /* ------------------------------ GAMIFICATION ------------------------------ */
  function addAura(n) {
    state.aura = Math.max(0, (state.aura || 0) + Math.round(n));
    updateShell();
    save();
  }
  function addXP(n, reason) {
    if (!n) return;
    const before = xpInfo().level;
    state.xp = Math.max(0, (state.xp || 0) + Math.round(n * xpMultiplier()));
    const after = xpInfo();
    if (after.level > before) {
      const gained = (after.level - before) * 50;
      state.aura += gained;
      pushNotif('🏅', 'Lên cấp ' + after.level, 'Bạn nhận ' + gained + ' Aura thưởng cấp độ. Danh hiệu mới đang chờ!');
      toast('Lên cấp ' + after.level + '!', 'Nhận ' + gained + ' Aura thưởng.', 'gold', '🏅');
      confetti(45);
    }
    updateShell();
    save();
  }
  function progressQuest(key, amount) {
    ensureDaily();
    if (!state.quests.progress) state.quests.progress = {};
    const def = D.QUESTS.find(q => q.metric === key);
    if (!def || questClaimed(def.id)) return;
    state.quests.progress[key] = Math.min(def.goal, (state.quests.progress[key] || 0) + (amount || 1));
    save();
  }
  function claimQuest(id) {
    const def = D.QUESTS.find(q => q.id === id);
    if (!def || questClaimed(id) || questProgress(def.metric) < def.goal) return;
    state.quests.claimed.push(id);
    addAura(def.aura);
    addXP(def.xp);
    pushNotif(def.icon, 'Nhiệm vụ hoàn thành', def.title + ' · +' + def.aura + ' Aura, +' + def.xp + ' XP');
    toast('Nhận thưởng nhiệm vụ', def.title + ' · +' + def.aura + ' Aura', 'success', '🎁');
    confetti(25);
    saveNow();
    refreshCurrentRoute();
  }
  function claimAchievement(id) {
    const def = D.ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    const st = achievementState(def);
    if (!st.claimable) return;
    state.achievements[id] = { at: Date.now() };
    addAura(def.aura);
    addXP(def.xp);
    pushNotif(def.icon, 'Thành tựu mở khoá', def.name + ' · +' + def.aura + ' Aura');
    toast('Thành tựu: ' + def.name, '+' + def.aura + ' Aura' + (def.xp ? ' · +' + def.xp + ' XP' : ''), 'success', def.icon);
    confetti(35);
    saveNow();
    refreshCurrentRoute();
  }
  function claimChest() {
    ensureDaily();
    const today = todayKey();
    if (state.lastChest === today) {
      toast('Rương hôm nay đã mở', 'Quay lại vào ngày mai để nhận thêm Aura.', 'info', '🧰');
      return;
    }
    const base = 120 + Math.floor(Math.random() * 220);
    const streakBonus = Math.min(200, (state.streak || 1) * 20);
    const total = base + streakBonus;
    state.lastChest = today;
    addAura(total);
    addXP(70 + Math.min(80, (state.streak || 1) * 10));
    let freeItem = null;
    if (Math.random() < 0.08) {
      const candidates = D.SHOP.filter(i => !hasItem(i.id) && i.price > 0 && i.price <= 1200 && i.type !== 'consumable');
      if (candidates.length) {
        freeItem = candidates[Math.floor(Math.random() * candidates.length)];
        grantItem(freeItem.id);
      }
    }
    pushNotif('🎁', 'Rương ngày ' + state.streak, '+' + total + ' Aura' + (freeItem ? ' và ' + freeItem.name : ''));
    toast('Mở rương thành công!', '+' + total + ' Aura' + (freeItem ? ' · Nhận ' + freeItem.name : ''), 'gold', '🎁');
    confetti(55);
    saveNow();
    refreshCurrentRoute();
  }
  function grantItem(id) {
    if (!hasItem(id)) state.shop.push(id);
    save();
  }
  function applyBoost(kind) {
    const now = Date.now();
    if (kind === 'xp2') state.boosts.xp2Until = Math.max(now, state.boosts.xp2Until || 0) + 24 * 3600000;
    if (kind === 'coffee') state.boosts.coffeeUntil = Math.max(now, state.boosts.coffeeUntil || 0) + 6 * 3600000;
  }
  function purchaseItem(id) {
    const it = itemDef(id);
    if (!it) return { ok: false, error: 'Vật phẩm không tồn tại.' };
    if (hasItem(id)) return { ok: false, error: 'Bạn đã sở hữu vật phẩm này.' };
    if (state.aura < it.price) return { ok: false, error: 'Không đủ Aura. Hãy giao dịch hoặc hoàn thành nhiệm vụ.' };
    state.aura -= it.price;
    if (it.type === 'consumable') {
      applyBoost(it.value);
      toast('Đã kích hoạt ' + it.name, 'Ưu đãi XP đã được cộng vào tài khoản.', 'success', it.icon);
    } else {
      state.shop.push(id);
      if (['title', 'frame', 'theme'].includes(it.type)) equipItem(id, true);
      toast('Đã mua ' + it.name, 'Vật phẩm đã được thêm vào bộ sưu tập.', 'success', it.icon);
    }
    pushNotif(it.icon, 'Mua vật phẩm', it.name + ' · −' + it.price + ' Aura');
    confetti(28);
    saveNow();
    updateShell();
    return { ok: true };
  }
  function equipItem(id, silent) {
    const it = itemDef(id);
    if (!it || !hasItem(id)) return;
    if (['title', 'frame', 'theme'].includes(it.type)) {
      state.equipped[it.type] = id;
      if (it.type === 'theme') { updateShell(); }
    } else if (it.type === 'pet') {
      state.equipped.pet = state.equipped.pet === id ? null : id;
    } else if (it.type === 'effect') {
      const list = state.equipped.effects || [];
      if (list.includes(id)) state.equipped.effects = list.filter(x => x !== id);
      else state.equipped.effects = list.concat(id);
    } else if (it.type === 'perk') {
      if (!silent) toast(it.name, 'Nâng cấp này đã được kích hoạt tự động.', 'info', it.icon);
      return;
    }
    state.settings.confetti = state.settings.confetti;
    buildAmbient();
    updateShell();
    saveNow();
    if (!silent) {
      const active = it.type === 'pet' ? petValue() === it.value : it.type === 'effect' ? effectsOn(id) : state.equipped[it.type] === id;
      toast((active ? 'Đã trang bị ' : 'Đã gỡ ') + it.name, active ? 'Hiển thị trên hồ sơ của bạn.' : 'Đã trở về trạng thái mặc định.', 'info', it.icon);
    }
    refreshCurrentRoute();
  }
  function sellItem(id) {
    const it = itemDef(id);
    if (!it || !hasItem(id)) return { ok: false, error: 'Bạn không sở hữu vật phẩm này.' };
    if (it.defaultValue || it.price <= 0) return { ok: false, error: 'Vật phẩm mặc định không thể bán.' };
    const refund = Math.floor(it.price * 0.6);
    state.aura += refund;
    state.shop = state.shop.filter(x => x !== id);
    if (state.equipped.title === id) state.equipped.title = 'title_rookie';
    if (state.equipped.frame === id) state.equipped.frame = 'frame_none';
    if (state.equipped.theme === id) state.equipped.theme = 'theme_midnight';
    if (state.equipped.pet === id) state.equipped.pet = null;
    if (state.equipped.effects) state.equipped.effects = state.equipped.effects.filter(x => x !== id);
    buildAmbient();
    updateShell();
    saveNow();
    toast('Đã bán ' + it.name, '+' + refund + ' Aura. Vật phẩm rời khỏi bộ sưu tập.', 'success', '✦');
    return { ok: true, refund };
  }

  /* ------------------------------ TRADING ENGINE ------------------------------ */
  function feeRate(a, mode, side) {
    if (mode === 'futures') return 0.0004;
    if (['hose', 'hnx', 'upcom'].includes(a.group)) return 0.0015;
    if (a.group === 'forex') return 0.0002;
    if (a.group === 'crypto') return 0.001;
    return 0.001;
  }
  function recordTrade(trade) {
    state.trades.unshift(trade);
    state.trades = state.trades.slice(0, 250);
  }
  function snapshotEquity(force) {
    const now = Date.now();
    const hist = state.equityHistory || [];
    const last = hist[hist.length - 1];
    if (force || !last || now - last.t > 30 * 60000) {
      hist.push({ t: now, v: Math.round(netWorth()) });
      state.equityHistory = hist.slice(-500);
      save();
    }
  }

  function executeSpot(asset, side, qty, price, opts) {
    opts = opts || {};
    if (!asset) return { ok: false, error: 'Tài sản không hợp lệ.' };
    if (!asset.tradable) return { ok: false, error: 'Tài sản này chỉ dùng để tham chiếu, không giao dịch được.' };
    qty = Number(qty);
    price = Number(price || asset.price);
    if (!isFinite(qty) || qty <= 0) return { ok: false, error: 'Khối lượng không hợp lệ.' };
    if (!isFinite(price) || price <= 0) return { ok: false, error: 'Giá không hợp lệ.' };
    const step = stepFor(asset);
    if (['hose', 'hnx', 'upcom'].includes(asset.group)) {
      if (Math.abs(qty % step) > 1e-9 && Math.abs(qty - (state.holdings[asset.id] || {}).qty) > 1e-9) {
        return { ok: false, error: 'Khối lượng phải là bội số của ' + step + ' cho sàn Việt Nam.' };
      }
    }
    const notional = notionalVND(asset, price, qty);
    const fee = notional * feeRate(asset, 'spot', side);
    const tax = side === 'sell' && ['hose', 'hnx', 'upcom'].includes(asset.group) ? notional * 0.001 : 0;
    const h = state.holdings[asset.id];

    if (side === 'buy') {
      const total = notional + fee;
      if (total > state.cash + 1) return { ok: false, error: 'Không đủ tiền mặt. Cần ' + fmtVND(total) + '.' };
      state.cash -= total;
      const prevQty = h ? h.qty : 0;
      const prevCost = h ? h.avgVND * h.qty : 0;
      state.holdings[asset.id] = { qty: prevQty + qty, avgVND: (prevCost + notional + fee) / (prevQty + qty) };
      state.feesPaid += fee;
      recordTrade({ id: uid('t'), t: Date.now(), assetId: asset.id, side, qty, price, valueVND: notional, fee, pnl: 0, mode: 'spot', kind: opts.kind || 'market' });
      state.stats.trades++;
      if (asset.group === 'crypto') state.stats.crypto_trades++;
      addXP(asset.group === 'crypto' ? 16 : 12);
      addAura(3);
      progressQuest('trade', 1);
      noteEventTrade(asset.id);
      snapshotEquity(true);
      saveNow();
      return { ok: true, fee, notional };
    }

    if (!h || h.qty < qty - 1e-9) return { ok: false, error: 'Bạn không đủ ' + asset.symbol + ' để bán.' };
    const proceeds = notional - fee - tax;
    const costSold = h.avgVND * qty;
    const pnl = proceeds - costSold;
    state.cash += proceeds;
    state.realized += pnl;
    state.sells++;
    if (pnl > 0) state.wins++;
    state.feesPaid += fee + tax;
    h.qty -= qty;
    if (h.qty <= 1e-9) delete state.holdings[asset.id];
    recordTrade({ id: uid('t'), t: Date.now(), assetId: asset.id, side, qty, price, valueVND: notional, fee: fee + tax, pnl, mode: 'spot', kind: opts.kind || 'market' });
    state.stats.trades++;
    if (asset.group === 'crypto') state.stats.crypto_trades++;
    addXP(14);
    addAura(3);
    progressQuest('trade', 1);
    noteEventTrade(asset.id);
    snapshotEquity(true);
    saveNow();
    if (pnl > 0 && state.settings.confetti) confetti(32);
    return { ok: true, fee: fee + tax, notional, pnl };
  }

  function openPosition(asset, side, qty, leverage, price, opts) {
    opts = opts || {};
    if (!asset || !asset.tradable) return { ok: false, error: 'Tài sản này không thể mở vị thế.' };
    qty = Number(qty); price = Number(price || asset.price); leverage = clamp(Number(leverage) || 1, 1, asset.maxLeverage || 10);
    if (!isFinite(qty) || qty <= 0) return { ok: false, error: 'Khối lượng không hợp lệ.' };
    if (asset.group === 'derivatives' && qty % (stepFor(asset)) > 1e-9) return { ok: false, error: 'Khối lượng hợp đồng không hợp lệ.' };
    const notional = notionalVND(asset, price, qty);
    const margin = notional / leverage;
    const fee = notional * feeRate(asset, 'futures', side);
    if (margin + fee > state.cash + 1) return { ok: false, error: 'Không đủ ký quỹ. Cần ' + fmtVND(margin + fee) + '.' };
    const liqMove = 0.9 / leverage;
    const liq = side === 'long' ? price * (1 - liqMove) : price * (1 + liqMove);
    const pos = {
      id: uid('p'), assetId: asset.id, side, qty, entry: price, leverage,
      margin, notional, fee, liq, openedAt: Date.now()
    };
    state.cash -= margin + fee;
    state.positions.push(pos);
    state.feesPaid += fee;
    state.stats.trades++;
    state.stats.futures_trades++;
    recordTrade({ id: uid('t'), t: Date.now(), assetId: asset.id, side: side === 'long' ? 'buy' : 'sell', qty, price, valueVND: notional, fee, pnl: 0, mode: 'futures', kind: opts.kind || 'market' });
    addXP(18); addAura(4);
    progressQuest('trade', 1);
    noteEventTrade(asset.id);
    snapshotEquity(true);
    saveNow();
    return { ok: true, margin, fee, pos };
  }

  function closePosition(id, price, force) {
    const idx = state.positions.findIndex(p => p.id === id);
    if (idx < 0) return { ok: false, error: 'Không tìm thấy vị thế.' };
    const p = state.positions[idx];
    const a = byId[p.assetId];
    if (!a) return { ok: false, error: 'Tài sản không tồn tại.' };
    const mark = Number(price || a.price);
    const sign = p.side === 'long' ? 1 : -1;
    let pnl = (mark - p.entry) * p.qty * valueFactor(a) * sign;
    const closeFee = force ? 0 : notionalVND(a, mark, p.qty) * 0.0004;
    if (force) pnl = -p.margin;
    const payout = force ? 0 : Math.max(0, p.margin + pnl - closeFee);
    state.cash += payout;
    state.realized += pnl - (force ? 0 : p.fee + closeFee);
    state.positions.splice(idx, 1);
    recordTrade({
      id: uid('t'), t: Date.now(), assetId: a.id, side: p.side === 'long' ? 'sell' : 'buy',
      qty: p.qty, price: mark, valueVND: notionalVND(a, mark, p.qty), fee: closeFee,
      pnl, mode: 'futures', kind: force ? 'thanh lý' : 'đóng vị thế'
    });
    state.stats.trades++;
    if (!force) { addXP(12); addAura(2); }
    snapshotEquity(true);
    saveNow();
    return { ok: true, pnl: pnl - p.fee - closeFee, force, asset: a, position: p };
  }

  function placeOrder(order) {
    if (!order || !byId[order.assetId]) return { ok: false, error: 'Lệnh không hợp lệ.' };
    if (state.orders.length >= 30) return { ok: false, error: 'Tối đa 30 lệnh chờ cùng lúc.' };
    const o = Object.assign({ id: uid('o'), createdAt: Date.now(), status: 'open' }, order);
    state.orders.push(o);
    saveNow();
    return { ok: true, order: o };
  }
  function alertCount(assetId) {
    return state.alerts.filter(a => a.active !== false && (!assetId || a.assetId === assetId)).length;
  }
  function createAlert(assetId, dir, price) {
    const a = byId[assetId];
    if (!a) return { ok: false, error: 'Tài sản không hợp lệ.' };
    if (alertCount() >= alertLimit()) return { ok: false, error: 'Bạn đã đạt giới hạn ' + alertLimit() + ' cảnh báo. Mua Chuông Báo Giá Pro để nâng lên 8.' };
    if (!isFinite(price) || price <= 0) return { ok: false, error: 'Mức giá không hợp lệ.' };
    state.alerts.unshift({ id: uid('a'), assetId, dir, price, createdAt: Date.now(), active: true, triggered: false });
    state.stats.alerts++;
    addXP(8);
    saveNow();
    return { ok: true };
  }

  function checkLiveTriggers() {
    let changed = false;
    // Thanh lý vị thế
    state.positions.slice().forEach(p => {
      const a = byId[p.assetId];
      if (!a) return;
      const hit = p.side === 'long' ? a.price <= p.liq : a.price >= p.liq;
      if (hit) {
        closePosition(p.id, p.liq, true);
        pushNotif('⚠️', 'Vị thế bị thanh lý', a.symbol + ' ' + (p.side === 'long' ? 'LONG' : 'SHORT') + ' ' + p.leverage + 'x đã bị đóng tại ' + fmtPrice(a, p.liq) + '.');
        toast('Thanh lý ' + a.symbol, 'Vị thế ' + p.leverage + 'x đã bị đóng. Hãy giảm đòn bẩy ở lần sau.', 'error', '⚠️');
        changed = true;
      }
    });
    // Cảnh báo giá
    state.alerts.forEach(al => {
      if (!al.active || al.triggered) return;
      const a = byId[al.assetId];
      if (!a) return;
      const hit = al.dir === 'above' ? a.price >= al.price : a.price <= al.price;
      if (hit) {
        al.triggered = true; al.active = false; al.triggeredAt = Date.now();
        pushNotif('🔔', 'Cảnh báo giá ' + a.symbol, 'Giá đã ' + (al.dir === 'above' ? 'vượt lên trên ' : 'giảm xuống dưới ') + fmtPrice(a, al.price) + '. Hiện tại: ' + fmtPrice(a) + '.');
        toast('Cảnh báo ' + a.symbol, 'Đã chạm mức ' + fmtPrice(a, al.price) + '.', 'info', '🔔');
        changed = true;
      }
    });
    // Lệnh chờ
    state.orders.slice().forEach(o => {
      const a = byId[o.assetId];
      if (!a) return;
      const hit = o.side === 'buy' ? a.price <= o.price : a.price >= o.price;
      if (!hit) return;
      let res;
      if (o.mode === 'futures') res = openPosition(a, o.side, o.qty, o.leverage, o.price, { kind: 'limit' });
      else res = executeSpot(a, o.side, o.qty, o.price, { kind: 'limit' });
      state.orders = state.orders.filter(x => x.id !== o.id);
      if (res.ok) {
        pushNotif('✅', 'Lệnh chờ khớp', (o.side === 'buy' ? 'Mua ' : 'Bán ') + fmtQty(a, o.qty) + ' ' + a.symbol + ' tại ' + fmtPrice(a, o.price) + '.');
        toast('Lệnh chờ đã khớp', a.symbol + ' · ' + fmtQty(a, o.qty) + ' @ ' + fmtPrice(a, o.price), 'success', '✅');
      } else {
        pushNotif('⚠️', 'Lệnh chờ bị huỷ', a.symbol + ': ' + res.error);
      }
      changed = true;
    });
    if (changed) { saveNow(); updateShell(); refreshTerminalPanels(); }
  }

  /* ------------------------------ SHARED BLOCKS ------------------------------ */
  function questListHTML() {
    return '<div class="quest-list">' + D.QUESTS.map(def => {
      const prog = questProgress(def.metric);
      const done = prog >= def.goal;
      const claimed = questClaimed(def.id);
      const btn = claimed ? badge('Đã nhận', 'badge-up') :
        done ? '<button class="btn btn-xs btn-gold quest-claim" data-action="claim-quest" data-id="' + def.id + '">Nhận</button>' :
          '<span class="quest-reward">+' + def.aura + ' ✦</span>';
      return '<div class="quest-item"><div class="quest-icon">' + def.icon + '</div><div class="quest-body">' +
        '<div class="quest-title">' + esc(def.title) + '</div><div class="quest-desc">' + esc(def.desc) + '</div>' +
        '<div class="quest-progress"><span style="width:' + clamp(prog / def.goal * 100, 0, 100) + '%"></span></div></div>' +
        '<div class="quest-claim">' + btn + '</div></div>';
    }).join('') + '</div>';
  }

  function achievementGridHTML() {
    return '<div class="achievement-grid">' + D.ACHIEVEMENTS.map(def => {
      const st = achievementState(def);
      return '<div class="ach-card ' + (st.claimed ? '' : st.achieved ? 'claimable' : 'locked') + '">' +
        '<div class="ach-icon">' + def.icon + '</div><div class="ach-body">' +
        '<div class="ach-name">' + esc(def.name) + (st.claimed ? badge('Đã nhận', 'badge-up') : '') + '</div>' +
        '<div class="ach-desc">' + esc(def.desc) + '</div>' +
        '<div class="ach-progress"><span style="width:' + st.progress + '%"></span></div>' +
        (st.claimable ? '<button class="btn btn-xs btn-gold ach-claim" data-action="claim-ach" data-id="' + def.id + '">Nhận +' + def.aura + ' ✦</button>' : '') +
        '</div><span class="ach-reward">' + nf(Math.min(st.value, def.goal), 0) + '/' + nf(def.goal, 0) + '</span></div>';
    }).join('') + '</div>';
  }

  function leaderboardHTML() {
    const me = {
      name: state.username, avatar: state.avatar, title: titleValue(), level: xpInfo().level,
      netWorth: netWorth(), change: state.capital ? (netWorth() - state.capital) / state.capital * 100 : 0, me: true
    };
    const rows = D.BOTS.map(b => ({ ...b })).concat([me]).sort((a, b) => b.netWorth - a.netWorth);
    return '<div class="table-wrap"><table class="leaderboard"><thead><tr><th>#</th><th>Nhà giao dịch</th><th class="text-right">Tài sản</th><th class="text-right">Hiệu suất</th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr class="' + (r.me ? 'me' : '') + '"><td class="lb-rank ' + (i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '') + '">' + (i + 1) + '</td>' +
        '<td><div class="lb-user"><span class="avatar">' + r.avatar + '</span><div><div class="lb-name">' + esc(r.name) + (r.me ? ' (bạn)' : '') + '</div><div class="lb-title">Lv.' + r.level + ' · ' + esc(r.title || '') + '</div></div></div></td>' +
        '<td class="lb-net">' + money(r.netWorth) + ' ₫</td><td class="lb-chg ' + changeCls(r.change) + '">' + fmtPct(r.change) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function allocationData() {
    const totals = {};
    holdingList().forEach(h => {
      const key = h.asset.group;
      totals[key] = (totals[key] || 0) + h.value;
    });
    const cold = Object.values(totals).reduce((a, b) => a + b, 0);
    const cash = state.cash;
    const savings = savingsCashValue();
    const gold = savingsGoldValue();
    const total = cold + cash + savings + gold || 1;
    const colors = { cash: 'rgba(255,255,255,.22)', savings: '#f3c56b', gold: '#c89cff', hose: '#2ee6a6', us: '#6cb8ff', etf: '#ffd166', crypto: '#f7a94b', forex: '#7ce7ff', commodity: '#e9b96e', hnx: '#f2c45e', upcom: '#c89cff', derivatives: '#ff9b8a', index: '#a5b4fc' };
    const parts = [{ label: 'Tiền mặt', value: cash, color: colors.cash }];
    if (savings > 0) parts.push({ label: 'Tiết kiệm', value: savings, color: colors.savings });
    if (gold > 0) parts.push({ label: 'Vàng tích lũy', value: gold, color: colors.gold });
    Object.keys(totals).forEach(g => parts.push({ label: (D.GROUPS[g] || {}).name || g, value: totals[g], color: colors[g] || '#8fa2aa' }));
    let start = 0;
    const segs = parts.map(p => {
      const end = start + p.value / total * 100;
      const s = p.color + ' ' + start.toFixed(2) + '% ' + end.toFixed(2) + '%';
      start = end;
      return s;
    }).join(', ');
    return { parts, total, segs };
  }

  function allocationHTML() {
    const { parts, total, segs } = allocationData();
    return '<div class="allocation-body"><div class="donut" style="--segments:conic-gradient(' + segs + ')">' +
      '<div class="donut-center"><strong>' + parts.filter(p => p.value > 0).length + '</strong><span>nhóm tài sản</span></div></div>' +
      '<div class="alloc-legend">' + parts.filter(p => p.value > 0).map(p =>
        '<div class="alloc-item"><span class="dot" style="background:' + p.color + '"></span>' + esc(p.label) +
        '<b>' + nf(p.value / total * 100, 1) + '%</b></div>').join('') + '</div></div>';
  }

  /* ------------------------------ ROUTER ------------------------------ */
  let marketFilter = 'all';
  let marketSearch = '';
  let marketSort = 'chg-desc';
  let marketStarOnly = false;
  const views = {};

  function parseRoute() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const name = raw.split('?')[0].split('/')[0] || 'dashboard';
    return views[name] ? name : 'dashboard';
  }

  function renderRoute() {
    const route = parseRoute();
    const changed = route !== currentRoute;
    currentRoute = route;
    state.lastRoute = route;
    if (changed) {
      if (mainChart) { mainChart.destroy(); mainChart = null; }
      if (chartLiveTimer) { clearInterval(chartLiveTimer); chartLiveTimer = null; }
      if (cryptoPoll) { clearInterval(cryptoPoll); cryptoPoll = null; }
      if (jobsTimer) { clearInterval(jobsTimer); jobsTimer = null; }
      if (auctionsTimer) { clearInterval(auctionsTimer); auctionsTimer = null; }
      if (wealthTimer) { clearInterval(wealthTimer); wealthTimer = null; }
      if (companyAutoTimer) { clearInterval(companyAutoTimer); companyAutoTimer = null; }
      if (creditTimer) { clearInterval(creditTimer); creditTimer = null; }
      if (primeTimer) { clearInterval(primeTimer); primeTimer = null; }
      if (arcadeTimer) { clearInterval(arcadeTimer); arcadeTimer = null; }
      window.scrollTo(0, 0);
    }
    const page = $('#page');
    if (!page || !views[route]) return;
    page.style.animation = 'none';
    void page.offsetWidth;
    page.style.animation = '';
    page.innerHTML = views[route].html();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.getAttribute('data-route') === route));
    document.querySelectorAll('.mobile-nav a').forEach(el => el.classList.toggle('active', el.getAttribute('data-route') === route));
    document.body.classList.remove('drawer-open');
    state.lastRoute = route;
    ensureDaily();
    updateShell();
    if (views[route].mount) {
      try { views[route].mount(); } catch (e) { console.error('Mount error:', e); }
    }
    loadNewsItems();
    save();
  }

  function refreshCurrentRoute() {
    if (!['dashboard', 'markets', 'portfolio', 'ranks', 'shop', 'derivatives', 'crypto', 'academy', 'detective', 'savings', 'credit', 'library', 'jobs', 'auctions', 'company', 'wealth', 'prime', 'arcade', 'coin', 'funds'].includes(currentRoute)) return;
    renderRoute();
  }

  function go(route) {
    if (location.hash === '#/' + route) renderRoute();
    else location.hash = '#/' + route;
  }

  function switchTerminalAsset(id) {
    if (!byId[id]) return;
    state.lastAsset = id;
    save();
    if (currentRoute === 'terminal') {
      renderRoute();
    } else {
      go('terminal');
    }
  }

  function openTradeFor(assetId, side, mode) {
    const a = byId[assetId];
    if (!a) return;
    state.lastAsset = assetId;
    save();
    if (a.group === 'derivatives' || side === 'long' || side === 'short') {
      go('terminal');
      return;
    }
    openTradeModal(a, side === 'sell' ? 'sell' : 'buy', mode || 'spot');
  }

  /* ------------------------------ DASHBOARD ------------------------------ */
  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return 'Chào buổi sáng';
    if (h < 14) return 'Chào buổi trưa';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  function statCard(iconName, cls, label, value, delta) {
    return '<div class="stat-card"><div class="stat-icon ' + (cls || '') + '">' + icon(iconName) + '</div>' +
      '<div class="stat-main"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div>' +
      (delta ? '<div class="stat-delta ' + changeCls(delta.v) + '">' + delta.text + '</div>' : '') + '</div></div>';
  }

  function watchlistMiniHTML() {
    const ids = state.watchlist.filter(id => byId[id]);
    if (!ids.length) return '<div class="empty-state"><div class="empty-icon">⭐</div><strong>Watchlist trống</strong><p>Nhấn ngôi sao ở bảng thị trường để theo dõi mã yêu thích.</p><button class="btn btn-sm btn-outline-gold" data-nav="#/markets">Khám phá thị trường</button></div>';
    return '<div class="watchlist-mini">' + ids.slice(0, 6).map(id => {
      const a = byId[id];
      return '<div class="watchlist-row"><div class="asset-cell">' + assetLogo(a) +
        '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + '</div><div class="asset-name">' + esc(a.name) + '</div></div></div>' +
        '<span class="mini-spark">' + CH.MiniChart.sparkSVG(sparkFor(a)) + '</span>' +
        '<div><div class="wl-price" data-q-price="' + id + '">' + fmtPrice(a) + '</div><div class="wl-chg ' + changeCls(a.changePct) + '" data-q-chg="' + id + '">' + fmtPct(a.changePct) + '</div></div></div>';
    }).join('') + '</div>';
  }

  function moverRowHTML(a, i) {
    return '<div class="mover-row" data-asset="' + a.id + '"><span class="mover-rank">' + (i + 1) + '</span>' +
      '<div class="asset-cell">' + assetLogo(a) + '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + '</div><div class="asset-name">' + esc(a.name) + '</div></div></div>' +
      '<div><div class="mover-price" data-q-price="' + a.id + '">' + fmtPrice(a) + '</div><div class="mover-chg ' + changeCls(a.changePct) + '" data-q-chg="' + a.id + '">' + fmtPct(a.changePct) + '</div></div></div>';
  }

  function moversHTML(mode) {
    const list = D.ASSETS.filter(a => a.tradable && isFinite(a.changePct) && Math.abs(a.changePct) >= 0)
      .sort((a, b) => mode === 'gain' ? b.changePct - a.changePct : a.changePct - b.changePct).slice(0, 5);
    return list.length ? list.map(moverRowHTML).join('') : '<div class="empty-state"><strong>Chưa có dữ liệu</strong><p>Đang chờ báo giá thị trường.</p></div>';
  }

  function breadthHTML() {
    const hose = D.ASSETS.filter(a => a.group === 'hose');
    let adv = 0, dec = 0, flat = 0;
    hose.forEach(a => { if (a.changePct > 0.05) adv++; else if (a.changePct < -0.05) dec++; else flat++; });
    const total = hose.length || 1;
    return '<div class="breadth"><div class="breadth-bar"><span class="adv" style="width:' + adv / total * 100 + '%"></span><span class="unch" style="width:' + flat / total * 100 + '%"></span><span class="dec" style="width:' + dec / total * 100 + '%"></span></div>' +
      '<div class="breadth-labels"><span>Tăng <b class="up">' + adv + '</b></span><span>Đứng <b class="flat">' + flat + '</b></span><span>Giảm <b class="down">' + dec + '</b></span></div></div>';
  }

  function coachHTML() {
    const holdings = holdingList().length;
    const groups = new Set(holdingList().map(h => h.asset.group)).size;
    const futures = state.positions.length;
    const activity = Math.min(30, (state.stats.trades || 0) * 2);
    const diversity = Math.min(40, groups * 11 + Math.min(holdings, 5) * 2);
    const risk = futures ? Math.max(8, 26 - futures * 3) : 28;
    const score = Math.round(clamp(diversity + activity + risk, 5, 98));
    const label = score >= 70 ? 'Kỷ luật tốt' : score >= 45 ? 'Đang hình thành' : 'Cần thêm dữ liệu';
    const tip = groups < 3 ? 'Danh mục đang tập trung vào ít nhóm. Thử phân bổ thêm một nhóm tài sản có tương quan thấp.' :
      futures ? 'Bạn đang dùng đòn bẩy. Hãy giữ ký quỹ dưới 20% tổng tài sản để tránh thanh lý dây chuyền.' :
        'Hãy đặt cảnh báo giá thay vì theo dõi bảng điện cả ngày — kỷ luật tốt bắt đầu từ việc rời màn hình.';
    return '<div class="coach-body"><div class="coach-ring" style="--score:' + score + '"><div class="coach-score"><strong>' + score + '</strong><span>' + label + '</span></div></div>' +
      '<div class="coach-copy"><strong>Coach AURA</strong> đã đọc danh mục của bạn. Bạn đang nắm ' + holdings + ' tài sản thuộc ' + groups + ' nhóm thị trường.' +
      '<div class="coach-tip"><b>Gợi ý:</b> ' + esc(tip) + '</div></div></div>';
  }

  function savingsDashHTML() {
    const s = ensureSavings();
    const active = s.contracts.filter(c => c.status === 'active').length;
    const matured = s.contracts.filter(c => c.status === 'matured').length;
    const next = nextMaturity();
    const best = D.SAVINGS_PRODUCTS.filter(p => p.kind === 'cash').sort((a, b) => savingsRate(b) - savingsRate(a))[0];
    if (!s.contracts.length) {
      return '<div class="savings-dash-empty"><div class="sde-icon">🏦</div><div><b>Chưa có khoản tích lũy</b><span>Gửi tiết kiệm hoặc mua vàng theo giá thị trường. Lãi suất tốt nhất hiện tại: <strong>' + nf(savingsRate(best), 2) + '%/năm</strong>.</span></div></div>' +
        '<button class="btn btn-xs btn-outline-gold btn-block" data-nav="#/savings">Mở ngân hàng AURELIS</button>';
    }
    return '<div class="savings-dash-stats">' +
      '<div><span>Đang tích lũy</span><b>' + fmtVND(savingsValue()) + '</b></div>' +
      '<div><span>Lãi tạm tính</span><b class="' + changeCls(savingsAccrued()) + '">' + (savingsAccrued() >= 0 ? '+' : '') + fmtVND(savingsAccrued()) + '</b></div>' +
      '<div><span>Lãi suất bình quân</span><b>' + nf(savingsWeightedRate(), 2) + '%/năm</b></div>' +
      '<div><span>Khoản đang chạy</span><b>' + active + (matured ? ' · ' + matured + ' đáo hạn' : '') + '</b></div>' +
      '<div><span>Kỳ hạn gần nhất</span><b>' + (next ? dateLabel(next.maturityAt) : 'Linh hoạt') + '</b></div>' +
      (savingsGoldValue() > 0 ? '<div><span>Vàng tích lũy</span><b style="color:var(--gold)">' + fmtVND(savingsGoldValue()) + '</b></div>' : '') +
      '</div><div class="savings-dash-actions"><button class="btn btn-xs btn-gold" data-action="savings-deposit" data-id="vnd_6m">Gửi tiết kiệm</button><button class="btn btn-xs btn-ghost" data-nav="#/savings">Quản lý</button></div>';
  }

  function dashCareerHTML() {
    const j = ensureJobs();
    const career = jobCareerInfo();
    const a = auctionsShape();
    const next = a.lots.slice().sort((x, y) => x.endsAt - y.endsAt)[0];
    const best = D.JOBS.filter(job => job.level <= career.level).sort((x, y) => jobPayEstimate(y) - jobPayEstimate(x))[0];
    return '<div class="dash-career-stats">' +
      '<div><span>Năng lượng</span><b>' + j.energy + '/' + JOB_ENERGY_MAX + '</b></div>' +
      '<div><span>Cấp nghề</span><b>' + career.level + '/5</b></div>' +
      '<div><span>Thu nhập từ việc làm</span><b class="up">+' + fmtVND(j.earned) + '</b></div>' +
      '<div><span>Lot đang mở</span><b>' + a.lots.length + '</b></div></div>' +
      '<div class="dash-career-next"><span>💼</span><div><b>' + (best ? esc(best.title) : 'Mở khoá việc đầu tiên') + '</b><span>' + (best ? '~' + fmtVND(jobPayEstimate(best)) + '/ca · ' + best.energy + ' năng lượng' : 'Hoàn thành ca để lên cấp nghề') + '</span></div></div>' +
      '<div class="dash-career-next"><span>🔨</span><div><b>' + (next ? esc((byId[next.assetId] || {}).symbol || 'Lot mới') + ' · ' + auctionTypeOf(next).name : 'Đang tạo lot mới') + '</b><span>' + (next ? 'Kết thúc sau ' + auctionTimeLabel(next.endsAt - Date.now()) : 'Quay lại sau vài giây') + '</span></div></div>' +
      '<div class="savings-dash-actions"><button class="btn btn-xs btn-gold" data-nav="#/jobs">Làm việc</button><button class="btn btn-xs btn-ghost" data-nav="#/auctions">Đấu giá</button></div>';
  }

  function dashModesHTML() {
    const p = ensurePrime();
    const arc = ensureArcade();
    const lab = ensureCoinLab();
    const ret = primeReturnPct();
    const alpha = ret - (primeBenchmark() - 100);
    const primeBlock = p.active
      ? '<div><span>PRIME NAV</span><b>' + fmtVND(primeNavValue()) + '</b></div>' +
        '<div><span>Hiệu suất PRIME</span><b class="' + changeCls(ret) + '">' + (ret >= 0 ? '+' : '') + nf(ret, 2) + '%</b></div>' +
        '<div><span>Alpha vs VN30</span><b class="' + changeCls(alpha) + '">' + (alpha >= 0 ? '+' : '') + nf(alpha, 2) + '%</b></div>'
      : '<div><span>PRIME</span><b>Chưa mở tài khoản</b></div>' +
        '<div><span>Vốn tối thiểu</span><b>' + fmtVND(D.PRIME_PROFILES[0].minDeposit) + '</b></div>' +
        '<div><span>Loại lệnh</span><b>MP · LO · STOP</b></div>';
    return '<div class="dash-modes-stats">' + primeBlock +
      '<div><span>Arcade đã chơi</span><b>' + arc.played + ' lượt</b></div>' +
      '<div><span>Lợi nhuận Arcade</span><b class="' + changeCls(arc.profit) + '">' + (arc.profit >= 0 ? '+' : '') + fmtVND(arc.profit) + '</b></div>' +
      '<div><span>Coin đang giữ</span><b>' + fmtVND(coinPortfolioValue()) + '</b></div>' +
      '<div><span>Coin đã tạo</span><b>' + lab.created.length + '</b></div></div>' +
      '<div class="savings-dash-actions"><button class="btn btn-xs ' + (p.active ? 'btn-ghost' : 'btn-gold') + '" data-nav="#/prime">' + (p.active ? 'Mở PRIME' : 'Mở tài khoản PRIME') + '</button>' +
      '<button class="btn btn-xs btn-ghost" data-nav="#/arcade">Vào Arcade</button>' +
      '<button class="btn btn-xs btn-ghost" data-nav="#/coin">Xưởng Coin</button></div>';
  }

  function dashboardHTML() {
    const nw = netWorth();
    const pnl = pnlSinceStart();
    const pnlPct = state.capital ? pnl / state.capital * 100 : 0;
    const holdings = holdingList();
    const rank = currentRank();
    const lvl = xpInfo();
    const chestReady = state.lastChest !== todayKey();
    const pet = petValue();
    const equity = state.equityHistory || [];
    const dayBase = equity.length > 1 ? equity[equity.length - 2].v : state.capital;
    const dayDelta = nw - dayBase;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('sparkles') + ' Bàn giao dịch · ' + esc(rank.name) + '</div>' +
      '<h1>' + greeting() + ', ' + esc(state.username) + '</h1><p class="sub">Đây là bàn giao dịch của bạn. Giá thị trường cập nhật liên tục, vốn là ảo — còn kỷ luật bạn xây hôm nay là thật.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-action="chest">' + icon('gift') + ' Rương ngày</button>' +
      '<button class="btn btn-gold btn-sm" data-nav="#/terminal">' + icon('chart') + ' Mở terminal</button></div></div>' +
      '<div class="dash-top"><section class="hero-card">' +
      (pet ? '<div class="hero-pet">' + pet + '</div>' : '') +
      '<div class="hero-top"><div><div class="hero-greet"><span class="dot up"></span>' + esc(titleValue()) + '</div>' +
      '<div class="hero-name">' + esc(rank.name) + ' · Cấp ' + lvl.level + '</div></div>' +
      '<div class="hero-side"><div class="hero-rank">' + badge('LIVE MARKET', 'badge-live') + '<span class="hero-badge">' + icon('shield') + ' Vốn ảo được bảo vệ</span></div>' +
      '<canvas class="hero-spark" id="heroSpark" aria-label="Đường cong tài sản"></canvas></div></div>' +
      '<div class="hero-balance-label">Tổng tài sản ước tính</div>' +
      '<div class="hero-balance"><span data-networth-hero>' + money(nw) + '</span><span class="cur">₫</span></div>' +
      '<div class="hero-delta"><span class="badge ' + (pnl >= 0 ? 'badge-up' : 'badge-down') + '">' + (pnl >= 0 ? '▲' : '▼') + ' ' + fmtPct(pnlPct) + '</span>' +
      '<span class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + ' so với vốn ban đầu</span>' +
      '<span class="dim tiny">Hôm nay ' + (dayDelta >= 0 ? '+' : '') + money(dayDelta) + ' ₫</span></div>' +
      '<div class="hero-mini-stats"><div class="hero-mini">Tiền mặt<b>' + money(state.cash) + ' ₫</b></div>' +
      '<div class="hero-mini">Tích lũy<b>' + money(savingsValue()) + ' ₫</b></div>' +
      '<div class="hero-mini">Đầu tư<b>' + money(investedValue()) + ' ₫</b></div>' +
      '<div class="hero-mini">Lãi thực hiện<b class="' + changeCls(state.realized) + '">' + (state.realized >= 0 ? '+' : '') + money(state.realized) + ' ₫</b></div>' +
      '<div class="hero-mini">Chuỗi ngày<b>🔥 ' + state.streak + '</b></div></div>' +
      '<div class="hero-actions"><button class="btn btn-gold" data-nav="#/terminal">' + icon('bolt') + ' Giao dịch ngay</button>' +
      '<button class="btn btn-ghost" data-nav="#/savings">' + icon('bank') + ' Ngân hàng</button>' +
      '<button class="btn btn-ghost" data-nav="#/portfolio">' + icon('wallet') + ' Danh mục</button>' +
      '<button class="btn btn-ghost" data-nav="#/analysis">' + icon('flask') + ' Phân tích</button></div></section>' +
      '<aside class="streak-card"><div class="streak-top"><div><div class="streak-title">Rương may mắn</div><div class="streak-sub">Điểm danh ngày ' + state.streak + ' · 7 ngày liên tiếp</div></div>' + badge(chestReady ? 'SẴN SÀNG' : 'ĐÃ MỞ', chestReady ? 'badge-gold' : '') + '</div>' +
      '<div class="chest-visual"><div class="chest-glow"></div><div class="chest-emoji">' + (chestReady ? '🎁' : '🧰') + '</div></div>' +
      '<div class="streak-days">' + Array.from({ length: 7 }, (_, i) => '<span class="streak-day ' + (i < Math.min(7, state.streak) ? 'on' : '') + '"></span>').join('') + '</div>' +
      '<div class="streak-foot"><div class="streak-note">' + (chestReady ? 'Mở rương để nhận Aura và XP. Có cơ hội nhận vật phẩm miễn phí.' : 'Hẹn gặp lại vào ngày mai để mở rương tiếp theo.') + '</div>' +
      '<button class="btn btn-sm ' + (chestReady ? 'btn-gold' : 'btn-ghost') + '" data-action="chest" ' + (chestReady ? '' : 'disabled') + '>' + (chestReady ? 'Mở rương' : 'Đã mở') + '</button></div></aside></div>' +
      '<div class="stat-grid">' +
      statCard('money', 'up', 'Tiền mặt khả dụng', fmtVND(state.cash), { v: dayDelta, text: 'biến động hôm nay' }) +
      statCard('bank', '', 'Tiết kiệm & vàng', fmtVND(savingsValue()), { v: savingsAccrued(), text: (savingsAccrued() >= 0 ? '+' : '') + money(savingsAccrued()) + ' ₫ lãi & chênh lệch' }) +
      statCard('pie', 'cyan', 'Giá trị đầu tư', fmtVND(investedValue()), { v: unrealizedPnl(), text: (unrealizedPnl() >= 0 ? '+' : '') + money(unrealizedPnl()) + ' ₫ chưa thực hiện' }) +
      statCard('trophy', 'purple', 'Lãi/lỗ thực hiện', (state.realized >= 0 ? '+' : '') + fmtVND(state.realized), { v: state.realized, text: state.sells ? Math.round(state.wins / state.sells * 100) + '% lệnh bán có lãi' : 'chưa có lệnh bán' }) + '</div>' +
      '<div class="dash-grid"><div class="dash-col">' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Đường cong tài sản</div><div class="card-sub">Từ khi bạn tham gia · ' + equity.length + ' điểm dữ liệu</div></div><div class="equity-period"><span class="badge badge-gold">TẤT CẢ</span></div></div>' +
      '<div class="equity-headline"><span class="big" data-networth-plain>' + money(nw) + '</span><span class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtPct(pnlPct) + '</span></div>' +
      '<canvas id="equityCanvas" class="equity-canvas" aria-label="Đường cong tài sản"></canvas></div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><div><div class="card-title">' + icon('pie') + ' Phân bổ</div><div class="card-sub">Theo giá trị thị trường</div></div></div>' + allocationHTML() + '</div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('candles') + ' Độ rộng HOSE</div><div class="card-sub">Sắc xanh đang chiếm bao nhiêu?</div></div></div>' + breadthHTML() +
      '<div class="kv-row"><span class="k">Mã tăng mạnh nhất</span><span class="v up">' + esc(D.ASSETS.filter(a => a.group === 'hose').sort((a, b) => b.changePct - a.changePct)[0].symbol) + '</span></div>' +
      '<div class="kv-row"><span class="k">Mã giảm mạnh nhất</span><span class="v down">' + esc(D.ASSETS.filter(a => a.group === 'hose').sort((a, b) => a.changePct - b.changePct)[0].symbol) + '</span></div>' +
      '<button class="btn btn-xs btn-ghost btn-block" data-nav="#/markets">Xem toàn bộ thị trường</button></div></div></div>' +
      '<div class="dash-col">' +
      '<div class="card savings-dash-card"><div class="card-head"><div><div class="card-title">' + icon('bank') + ' Ngân hàng & tích lũy</div><div class="card-sub">Tiền mặt, tiết kiệm, ngoại tệ và vàng</div></div><button class="link-more" data-nav="#/savings">Mở ' + icon('chevron-right') + '</button></div>' + savingsDashHTML() + '</div>' +
      '<div class="card dash-career-card"><div class="card-head"><div><div class="card-title">' + icon('money') + ' Việc làm & Đấu giá</div><div class="card-sub">Kiếm thêm vốn, săn cổ phần dưới giá</div></div><button class="link-more" data-nav="#/jobs">Mở ' + icon('chevron-right') + '</button></div>' + dashCareerHTML() + '</div>' +
      '<div class="card dash-modes-card"><div class="card-head"><div><div class="card-title">' + icon('sparkles') + ' PRIME & Arcade</div><div class="card-sub">Đầu tư thực mô phỏng · 4 lối chơi chiến lược</div></div><button class="link-more" data-nav="#/prime">Mở ' + icon('chevron-right') + '</button></div>' + dashModesHTML() + '</div>' +
      '<div data-event-slot="full">' + marketEventCardHTML(false) + '</div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('star') + ' Watchlist</div><div class="card-sub">Tối đa ' + watchLimit() + ' mã</div></div><button class="link-more" data-nav="#/markets">Thêm ' + icon('chevron-right') + '</button></div>' + watchlistMiniHTML() + '</div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Biến động</div><div class="card-sub">Dòng tiền nổi bật 24h</div></div></div>' +
      '<div class="movers-tabs"><button class="chip ' + (currentMoversTab === 'gain' ? 'active' : '') + '" data-mover="gain">Tăng mạnh</button><button class="chip ' + (currentMoversTab === 'loss' ? 'active' : '') + '" data-mover="loss">Giảm mạnh</button></div>' +
      '<div id="moversBox">' + moversHTML(currentMoversTab) + '</div></div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('message') + ' Tin thị trường</div><div class="card-sub">CafeF · VnExpress · AURELIS</div></div><button class="link-more" data-action="refresh-news">' + icon('refresh') + '</button></div>' +
      '<div class="news-list" data-news-slot="5"></div></div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('target') + ' Nhiệm vụ hôm nay</div><div class="card-sub">Làm mỗi ngày để nhận Aura</div></div><span class="badge badge-gold">' + D.QUESTS.filter(q => questClaimed(q.id)).length + '/' + D.QUESTS.length + '</span></div>' + questListHTML() + '</div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Coach AURA</div><div class="card-sub">Đọc vị danh mục của bạn</div></div><span class="badge">AI nội bộ</span></div>' + coachHTML() + '</div>' +
      '<div class="card"><div class="card-head"><div><div class="card-title">' + icon('grid') + ' Lối tắt</div></div></div><div class="dash-quick">' +
      '<button class="quick-tile quick-wealth" data-nav="#/wealth">' + icon('pie') + '<b>Quản lý tài sản</b><span>Hồ sơ rủi ro, DCA, mục tiêu</span></button>' +
      '<button class="quick-tile quick-funds" data-nav="#/funds">' + icon('layers') + '<b>Quỹ mở</b><span>6 quỹ · NAV trực tiếp</span></button>' +
      '<button class="quick-tile quick-prime" data-nav="#/prime">' + icon('sparkles') + '<b>PRIME</b><span>Đầu tư thực mô phỏng</span></button>' +
      '<button class="quick-tile" data-nav="#/arcade">' + icon('play') + '<b>Arcade</b><span>4 game chiến lược</span></button>' +
      '<button class="quick-tile" data-nav="#/coin">' + icon('coin') + '<b>Xưởng Coin</b><span>Tạo coin, thử lòng tham</span></button>' +
      '<button class="quick-tile" data-nav="#/savings">' + icon('bank') + '<b>Ngân hàng</b><span>Tiết kiệm, ngoại tệ, vàng</span></button>' +
      '<button class="quick-tile" data-nav="#/jobs">' + icon('money') + '<b>Việc làm</b><span>Ca làm & thu nhập ngoài</span></button>' +
      '<button class="quick-tile" data-nav="#/credit">' + icon('scale') + '<b>Tín dụng</b><span>Vay nhanh, lãi theo giờ</span></button>' +
      '<button class="quick-tile" data-nav="#/library">' + icon('book') + '<b>Thư viện</b><span>Định lý, công thức, khái niệm</span></button>' +
      '<button class="quick-tile" data-nav="#/auctions">' + icon('gavel') + '<b>Đấu giá</b><span>Săn cổ phần dưới giá</span></button>' +
      '<button class="quick-tile" data-nav="#/terminal">' + icon('chart') + '<b>Terminal</b><span>Nến, chỉ báo, vẽ</span></button>' +
      '<button class="quick-tile" data-nav="#/analysis">' + icon('flask') + '<b>Phân tích</b><span>14 công cụ chuyên sâu</span></button>' +
      '<button class="quick-tile" data-nav="#/company">' + icon('building') + '<b>Doanh nghiệp</b><span>Báo cáo & định giá</span></button>' +
      '<button class="quick-tile" data-nav="#/academy">' + icon('academy') + '<b>Học viện</b><span>Bài học & quiz</span></button>' +
      '<button class="quick-tile" data-nav="#/detective">' + icon('search') + '<b>Thám tử AURA</b><span>Đoán hướng nến thật</span></button>' +
      '<button class="quick-tile" data-nav="#/shop">' + icon('bag') + '<b>Cửa hàng</b><span>Danh hiệu & theme</span></button></div></div>' +
      '</div></div>';
  }

  function mountDashboard() {
    const eq = state.equityHistory || [];
    const canvas = $('#equityCanvas');
    if (canvas) CH.MiniChart.line(canvas, eq.map(p => p.v), { baseline: state.capital, formatAxis: v => money(v), xLabels: eq.map(p => dateKey(p.t).slice(0, 5)) });
    const hero = $('#heroSpark');
    if (hero) CH.MiniChart.line(hero, eq.map(p => p.v), { baseline: state.capital, axis: false, labels: false, padRight: 4, width: 2 });
    $$('[data-mover]').forEach(el => el.addEventListener('click', () => {
      currentMoversTab = el.getAttribute('data-mover');
      $$('[data-mover]').forEach(x => x.classList.toggle('active', x === el));
      $('#moversBox').innerHTML = moversHTML(currentMoversTab);
    }));
    loadNewsItems();
  }

  /* ------------------------------ MARKETS ------------------------------ */
  function marketSummaryHTML() {
    const hose = D.ASSETS.filter(a => a.group === 'hose');
    let adv = 0, dec = 0;
    hose.forEach(a => { if (a.changePct > 0.05) adv++; else if (a.changePct < -0.05) dec++; });
    const sentiment = hose.length ? Math.round(adv / (adv + dec || 1) * 100) : 50;
    const liq = hose.reduce((s, a) => s + (a.price || 0) * (a.volume || 0), 0);
    const top = D.ASSETS.filter(a => a.tradable).sort((a, b) => b.changePct - a.changePct)[0];
    const mode = sourceMode();
    return '<div class="market-summary">' +
      '<div class="summary-card"><div class="summary-label">' + icon('candles') + ' Độ rộng HOSE</div><div class="summary-value"><span class="up">' + adv + '</span><span class="dim"> / </span><span class="down">' + dec + '</span></div><div class="summary-desc">' + adv + ' mã tăng · ' + dec + ' mã giảm trên ' + hose.length + ' mã</div></div>' +
      '<div class="summary-card"><div class="summary-label">' + icon('money') + ' Thanh khoản HOSE</div><div class="summary-value">' + money(liq) + ' ₫</div><div class="summary-desc">Tổng giá trị giao dịch ước tính theo KL</div></div>' +
      '<div class="summary-card"><div class="sentiment-gauge"><div class="sentiment-ring" style="--val:' + sentiment + '"><b>' + sentiment + '</b></div><div><div class="summary-label">Tâm lý</div><div class="summary-value" style="font-size:12px">' + (sentiment >= 65 ? 'Hưng phấn' : sentiment >= 45 ? 'Trung tính' : 'Thận trọng') + '</div></div></div><div class="summary-desc">Tỷ lệ mã tăng / (tăng + giảm)</div></div>' +
      '<div class="summary-card"><div class="summary-label">' + icon('sparkles') + ' Dẫn dắt 24h</div><div class="summary-value" style="font-size:14px">' + esc(top ? top.symbol : '—') + ' <span class="' + changeCls(top ? top.changePct : 0) + '" style="font-size:10px">' + fmtPct(top ? top.changePct : 0) + '</span></div><div class="summary-desc">Nguồn: ' + (mode === 'live' ? 'Yahoo Finance · Binance live' : mode === 'binance' ? 'Binance live · phần còn lại mô phỏng' : 'Mô phỏng cục bộ') + '</div></div></div>';
  }

  function sortedMarketAssets() {
    let list = D.ASSETS.filter(a => marketFilter === 'all' ? true : a.group === marketFilter);
    if (marketStarOnly) list = list.filter(a => state.watchlist.includes(a.id));
    if (marketSearch) {
      const q = marketSearch.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.exchange.toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => {
      if (marketSort === 'chg-desc') return b.changePct - a.changePct;
      if (marketSort === 'chg-asc') return a.changePct - b.changePct;
      if (marketSort === 'price') return b.price - a.price;
      if (marketSort === 'volume') return (b.volume || 0) - (a.volume || 0);
      return a.symbol.localeCompare(b.symbol);
    });
  }

  function marketRowsHTML() {
    const list = sortedMarketAssets();
    if (!list.length) return '<tr><td colspan="9"><div class="table-empty">Không tìm thấy tài sản phù hợp. Thử xoá bộ lọc.</div></td></tr>';
    return list.map(a => {
      const starred = state.watchlist.includes(a.id);
      const live = a.live || a.demoOnly;
      return '<tr data-row-asset="' + a.id + '"><td><button class="star-btn ' + (starred ? 'active' : '') + '" data-action="star" data-id="' + a.id + '" aria-label="Yêu thích">' + icon('star') + '</button></td>' +
        '<td>' + assetCell(a) + '</td>' +
        '<td class="price-cell" data-q-price="' + a.id + '">' + fmtPrice(a) + '</td>' +
        '<td class="chg-cell ' + changeCls(a.changePct) + '" data-q-chg="' + a.id + '">' + fmtPct(a.changePct) + '</td>' +
        '<td class="vol-cell hide-sm" data-q-vol="' + a.id + '">' + money(a.volume || 0) + '</td>' +
        '<td class="hide-md"><span class="mini-spark" style="display:inline-block;width:86px;height:26px">' + CH.MiniChart.sparkSVG(sparkFor(a)) + '</span></td>' +
        '<td class="lens-only text-right"><span class="vol-cell">' + fmtPrice(a, a.open) + '</span></td>' +
        '<td class="lens-only text-right"><span class="vol-cell">' + fmtPrice(a, a.high) + ' / ' + fmtPrice(a, a.low) + '</span></td>' +
        '<td class="text-right"><div class="row-actions"><button class="btn btn-xs btn-ghost" data-action="trade" data-id="' + a.id + '">Mua</button>' +
        '<button class="chip" data-action="terminal" data-id="' + a.id + '">Chart</button>' +
        (a.yahoo && (D.COMPANY_GROUPS || []).includes(a.group) ? '<button class="chip chip-company" data-action="company" data-id="' + a.id + '" title="Báo cáo doanh nghiệp">DN</button>' : '') +
        '</div></td></tr>';
    }).join('');
  }

  function marketsHTML() {
    const groups = [['all', 'Tất cả'], ['hose', 'HOSE'], ['hnx', 'HNX'], ['upcom', 'UPCoM'], ['us', 'US'], ['etf', 'ETF'], ['crypto', 'Crypto'], ['forex', 'Forex'], ['commodity', 'Hàng hoá'], ['index', 'Chỉ số'], ['derivatives', 'Phái sinh']];
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('candles') + ' Bảng giá · Toàn cảnh thị trường</div><h1>Toàn cảnh thị trường</h1>' +
      '<p class="sub">Một bảng điện cho Việt Nam, Mỹ, crypto, ngoại hối, hàng hoá và phái sinh. Dữ liệu thật khi có kết nối — phần mô phỏng luôn được dán nhãn rõ ràng.</p></div>' +
      '<div class="head-actions"><span class="status-pill ' + (sourceMode() === 'demo' ? 'demo' : 'live') + '"><span class="dot"></span><span data-source-label>' + (sourceMode() === 'live' ? 'Dữ liệu thật' : sourceMode() === 'binance' ? 'Binance live' : 'Mô phỏng') + '</span></span>' +
      '<button class="btn btn-ghost btn-sm" data-action="refresh-quotes">' + icon('refresh') + ' Làm mới</button>' +
      '<button class="btn btn-gold btn-sm" data-nav="#/terminal">' + icon('chart') + ' Biểu đồ</button></div></div>' +
      '<div class="markets-event-slot" data-event-slot="compact">' + marketEventCardHTML(true) + '</div>' +
      marketSummaryHTML() +
      '<div class="card market-table-card"><div class="market-toolbar"><div class="market-filters">' +
      groups.map(g => '<button class="chip ' + (marketFilter === g[0] ? 'active' : '') + '" data-filter="' + g[0] + '">' + g[1] + '</button>').join('') +
      '</div><div class="market-actions"><div class="market-search">' + icon('search') + '<input class="input" id="marketSearch" placeholder="Tìm mã, tên, sàn…" value="' + esc(marketSearch) + '"></div>' +
      '<select class="select" id="marketSort" style="height:34px;width:auto;font-size:10px"><option value="chg-desc"' + (marketSort === 'chg-desc' ? ' selected' : '') + '>Tăng mạnh</option><option value="chg-asc"' + (marketSort === 'chg-asc' ? ' selected' : '') + '>Giảm mạnh</option><option value="volume"' + (marketSort === 'volume' ? ' selected' : '') + '>Thanh khoản</option><option value="price"' + (marketSort === 'price' ? ' selected' : '') + '>Giá</option><option value="symbol"' + (marketSort === 'symbol' ? ' selected' : '') + '>Tên A-Z</option></select>' +
      '<label class="check"><input type="checkbox" id="marketStarOnly"' + (marketStarOnly ? ' checked' : '') + '>Watchlist</label></div></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Mã</th><th>Giá</th><th>Thay đổi</th><th class="hide-sm">Khối lượng</th><th class="hide-md">Spark</th><th class="lens-only text-right">Mở</th><th class="lens-only text-right">Cao / Thấp</th><th class="text-right">Hành động</th></tr></thead>' +
      '<tbody id="marketRows">' + marketRowsHTML() + '</tbody></table></div>' +
      '<div class="market-note">' + icon('info') + ' HOSE/US/forex/hàng hoá/chỉ số dùng Yahoo Finance · crypto dùng Binance. HNX & UPCoM mô phỏng; chỉ số VN và VN30F tổng hợp nội bộ.' +
      (hasItem('perk_lens') ? ' <span class="badge badge-gold">KÍNH LÚP AURA ĐANG BẬT</span>' : ' <button class="mini-link" data-action="open-shop-perk">Mở khoá cột OHLC bằng Kính Lúp AURA →</button>') + '</div>' +
      '<div class="table-foot"><span id="marketCount">' + sortedMarketAssets().length + ' tài sản</span><span class="dim">Giá có thể chậm 15 phút · không phải lời khuyên đầu tư</span></div></div>';
  }

  function mountMarkets() {
    $$('[data-filter]').forEach(el => el.addEventListener('click', () => {
      marketFilter = el.getAttribute('data-filter');
      $$('[data-filter]').forEach(x => x.classList.toggle('active', x === el));
      refreshMarketTable();
    }));
    const search = $('#marketSearch');
    if (search) search.addEventListener('input', () => { marketSearch = search.value; refreshMarketTable(); });
    const sort = $('#marketSort');
    if (sort) sort.addEventListener('change', () => { marketSort = sort.value; refreshMarketTable(); });
    const star = $('#marketStarOnly');
    if (star) star.addEventListener('change', () => { marketStarOnly = star.checked; refreshMarketTable(); });
    const rows = $('#marketRows');
    if (rows) rows.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const tr = e.target.closest('[data-row-asset]');
      if (tr) switchTerminalAsset(tr.getAttribute('data-row-asset'));
    });
  }

  function refreshMarketTable() {
    const el = $('#marketRows');
    if (el) el.innerHTML = marketRowsHTML();
    const count = $('#marketCount');
    if (count) count.textContent = sortedMarketAssets().length + ' tài sản';
  }

  /* ------------------------------ TERMINAL ------------------------------ */
  let terminalOrder = { mode: 'spot', side: 'buy', type: 'market', qty: '', price: '', leverage: 5 };
  let chartLoadToken = 0;

  function assetSelectOptions(selected) {
    let html = '';
    Object.keys(D.GROUPS).forEach(groupId => {
      const group = D.GROUPS[groupId];
      const items = D.ASSETS.filter(a => a.group === groupId);
      if (!items.length) return;
      html += '<optgroup label="' + esc(group.long || group.name) + '">' +
        items.map(a => '<option value="' + a.id + '"' + (a.id === selected ? ' selected' : '') + '>' + esc(a.symbol) + ' · ' + esc(a.name) + '</option>').join('') +
        '</optgroup>';
    });
    return html;
  }

  function chartPrefs() {
    if (!state.chartPrefs) state.chartPrefs = { tf: '1D', type: 'candles', ma: true, ema: true, boll: false, vol: true, osc: 'rsi' };
    return state.chartPrefs;
  }

  function terminalAsset() {
    return byId[state.lastAsset] || D.ASSETS.find(a => a.tradable) || D.ASSETS[0];
  }

  function orderModeFor(asset) {
    return asset.group === 'derivatives' ? 'futures' : terminalOrder.mode;
  }

  function terminalPanelCounts() {
    return {
      positions: state.positions.length,
      orders: state.orders.length,
      alerts: state.alerts.filter(a => a.active !== false).length,
      history: state.trades.length
    };
  }

  function terminalPositionsHTML() {
    if (!state.positions.length) {
      return '<div class="empty-state"><div class="empty-icon">⚡</div><strong>Chưa có vị thế phái sinh</strong><p>Mở vị thế Long hoặc Short ở bảng đặt lệnh để bắt đầu. Đòn bẩy khuếch đại cả lợi nhuận lẫn rủi ro.</p></div>';
    }
    return '<div class="table-wrap"><table class="data-table pos-table"><thead><tr><th>Tài sản</th><th>Hướng</th><th>KL</th><th>Giá vào</th><th>Mark</th><th>Đòn bẩy</th><th>Ký quỹ</th><th>PnL</th><th>ROI</th><th>Thanh lý</th><th></th></tr></thead><tbody>' +
      positionList().map(p => '<tr><td>' + assetCell(p.asset, { name: false }) + '</td>' +
        '<td><span class="pos-side ' + p.side + '">' + (p.side === 'long' ? 'LONG' : 'SHORT') + '</span></td>' +
        '<td class="vol-cell">' + fmtQty(p.asset, p.qty) + '</td>' +
        '<td class="price-cell">' + fmtPrice(p.asset, p.entry) + '</td>' +
        '<td class="price-cell">' + fmtPrice(p.asset) + '</td>' +
        '<td class="vol-cell">' + p.leverage + 'x</td>' +
        '<td class="vol-cell">' + money(p.margin) + ' ₫</td>' +
        '<td class="' + changeCls(p.pnl) + ' price-cell">' + (p.pnl >= 0 ? '+' : '') + money(p.pnl) + ' ₫</td>' +
        '<td class="' + changeCls(p.roi) + ' vol-cell">' + fmtPct(p.roi) + '</td>' +
        '<td class="vol-cell down">' + fmtPrice(p.asset, p.liq) + '</td>' +
        '<td class="text-right"><div class="pos-actions"><button class="btn btn-xs btn-ghost" data-action="close-pos" data-id="' + p.id + '">Đóng</button></div></td></tr>').join('') +
      '</tbody></table></div>';
  }

  function terminalOrdersHTML() {
    if (!state.orders.length) {
      return '<div class="empty-state"><div class="empty-icon">📋</div><strong>Không có lệnh chờ</strong><p>Đặt lệnh giới hạn để chờ giá tốt hơn. Hệ thống sẽ tự khớp khi thị trường chạm mức bạn chọn.</p></div>';
    }
    return state.orders.map(o => {
      const a = byId[o.assetId];
      if (!a) return '';
      return '<div class="order-row">' + assetLogo(a) +
        '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + ' <span class="badge ' + (o.side === 'buy' || o.side === 'long' ? 'badge-up' : 'badge-down') + '">' + (o.side === 'long' ? 'LONG' : o.side === 'short' ? 'SHORT' : o.side === 'buy' ? 'MUA' : 'BÁN') + '</span></div>' +
        '<div class="asset-name">' + esc(o.mode === 'futures' ? 'Phái sinh · ' + o.leverage + 'x' : 'Spot') + ' · ' + timeAgo(o.createdAt) + '</div></div>' +
        '<div class="order-numbers">' + fmtQty(a, o.qty) + ' @ ' + fmtPrice(a, o.price) + '<br><span class="dim">' + money(notionalVND(a, o.price, o.qty)) + ' ₫</span></div>' +
        '<button class="btn btn-xs btn-ghost" data-action="cancel-order" data-id="' + o.id + '">Huỷ</button></div>';
    }).join('');
  }

  function terminalAlertsHTML() {
    const a = terminalAsset();
    const rows = state.alerts.length ? state.alerts.map(al => {
      const asset = byId[al.assetId];
      if (!asset) return '';
      return '<div class="alert-row ' + (al.triggered ? 'triggered' : '') + '">' + assetLogo(asset) +
        '<div class="alert-info"><div class="alert-title">' + esc(asset.symbol) + ' ' + (al.dir === 'above' ? 'vượt trên' : 'giảm dưới') + ' ' + fmtPrice(asset, al.price) + '</div>' +
        '<div class="alert-sub">' + (al.triggered ? 'Đã kích hoạt · ' + timeAgo(al.triggeredAt) : 'Đang theo dõi · tạo ' + timeAgo(al.createdAt)) + '</div></div>' +
        '<button class="btn btn-xs btn-ghost" data-action="delete-alert" data-id="' + al.id + '">' + (al.triggered ? 'Xoá' : 'Huỷ') + '</button></div>';
    }).join('') : '<div class="empty-state"><div class="empty-icon">🔔</div><strong>Chưa có cảnh báo</strong><p>Tạo cảnh báo để không bỏ lỡ mức giá quan trọng. Bạn có thể dùng tối đa ' + alertLimit() + ' cảnh báo.</p></div>';
    return '<form class="alert-form" id="alertForm"><select class="select" id="alertDir"><option value="above">Giá vượt trên</option><option value="below">Giá giảm dưới</option></select>' +
      '<input class="input mono" id="alertPrice" type="number" step="' + (a.decimals > 4 ? '0.00000001' : '0.01') + '" value="' + a.price + '" placeholder="Mức giá">' +
      '<button class="btn btn-sm btn-outline-gold" type="submit">Tạo cảnh báo</button></form>' +
      '<div class="alert-hint dim tiny">Cảnh báo sẽ được kiểm tra mỗi khi báo giá cập nhật · ' + alertCount() + '/' + alertLimit() + ' đang hoạt động</div>' + rows;
  }

  function terminalHistoryHTML() {
    if (!state.trades.length) {
      return '<div class="empty-state"><div class="empty-icon">🧾</div><strong>Chưa có giao dịch</strong><p>Lịch sử mua bán, đóng vị thế và lệnh chờ khớp sẽ được ghi lại tại đây.</p></div>';
    }
    return state.trades.slice(0, 30).map(t => {
      const a = byId[t.assetId];
      if (!a) return '';
      const isBuy = t.side === 'buy' || t.side === 'long';
      return '<div class="history-row"><span class="history-side ' + (isBuy ? 'buy' : 'sell') + '">' + (t.side === 'long' ? 'LONG' : t.side === 'short' ? 'SHORT' : isBuy ? 'MUA' : 'BÁN') + '</span>' +
        '<div class="history-main"><b>' + esc(a.symbol) + '</b><span>' + dateLabel(t.t) + ' · ' + (t.mode === 'futures' ? 'Phái sinh' : 'Spot') + ' · ' + (t.kind || 'khớp lệnh') + '</span></div>' +
        '<div class="history-num">' + fmtQty(a, t.qty) + ' @ ' + fmtPrice(a, t.price) + '<br><span class="' + changeCls(t.pnl || 0) + '">' + (t.pnl ? (t.pnl >= 0 ? '+' : '') + money(t.pnl) + ' ₫' : money(t.valueVND) + ' ₫') + '</span></div></div>';
    }).join('');
  }

  function terminalPanelsHTML() {
    if (terminalTab === 'orders') return terminalOrdersHTML();
    if (terminalTab === 'alerts') return terminalAlertsHTML();
    if (terminalTab === 'history') return terminalHistoryHTML();
    return terminalPositionsHTML();
  }

  function terminalTabsHTML() {
    const c = terminalPanelCounts();
    const tabs = [['positions', 'Vị thế', c.positions], ['orders', 'Lệnh chờ', c.orders], ['alerts', 'Cảnh báo', c.alerts], ['history', 'Lịch sử', c.history]];
    return tabs.map(t => '<button class="tab-btn ' + (terminalTab === t[0] ? 'active' : '') + '" data-terminal-tab="' + t[0] + '">' + t[1] + (t[2] ? '<span class="count">' + t[2] + '</span>' : '') + '</button>').join('');
  }

  /* ------------------------------ CHART READER ------------------------------ */
  let readerState = { analysis: null, asset: null };

  function chartAnalyze(candles) {
    const clean = (candles || []).filter(c => c && isFinite(c.o) && isFinite(c.h) && isFinite(c.l) && isFinite(c.c));
    if (clean.length < 24) return null;
    const data = clean.slice(-180);
    const n = data.length;
    const lastFinite = (arr, fb) => {
      for (let i = arr.length - 1; i >= 0; i--) if (isFinite(arr[i])) return arr[i];
      return fb;
    };
    const mean = arr => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    const closes = data.map(c => c.c);
    const price = closes[n - 1];
    const ma20 = mean(closes.slice(-20));
    const ma50 = n >= 50 ? mean(closes.slice(-50)) : ma20;
    const ema21 = lastFinite(CH.indicators.ema(closes, 21), price);
    const rsi = lastFinite(CH.indicators.rsi(closes, 14), 50);
    const macdObj = CH.indicators.macd(closes);
    const macdHist = lastFinite(macdObj.hist, 0);
    const atr = Math.max(price * 0.0005, lastFinite(CH.indicators.atr(data, 14), price * 0.02));
    const adx = lastFinite(CH.indicators.adx(data, 14), 0);
    const boll = CH.indicators.bollinger(closes, 20, 2);
    const bollUpper = lastFinite(boll.upper, price);
    const bollLower = lastFinite(boll.lower, price);
    const bollWidth = bollLower > 0 ? (bollUpper - bollLower) / bollLower * 100 : 0;
    const roc10 = n > 10 ? (price / closes[n - 11] - 1) * 100 : 0;

    // Swing pivots: fractal 7 nến để lọc nhiễu.
    const pivotHighs = [];
    const pivotLows = [];
    for (let i = 3; i < n - 3; i++) {
      let isHigh = true, isLow = true;
      for (let j = i - 3; j <= i + 3; j++) {
        if (j === i) continue;
        if (data[j].h >= data[i].h) isHigh = false;
        if (data[j].l <= data[i].l) isLow = false;
      }
      if (isHigh) pivotHighs.push({ i, p: data[i].h });
      if (isLow) pivotLows.push({ i, p: data[i].l });
    }
    const clusterLevels = (items) => {
      const groups = [];
      items.forEach(item => {
        const g = groups.find(x => Math.abs(x.price - item.p) / Math.max(1e-9, item.p) < 0.006);
        if (!g) groups.push({ price: item.p, touches: 1, last: item.i });
        else { g.price = (g.price * g.touches + item.p) / (g.touches + 1); g.touches++; g.last = Math.max(g.last, item.i); }
      });
      return groups;
    };
    const highGroups = clusterLevels(pivotHighs.slice(-14));
    const lowGroups = clusterLevels(pivotLows.slice(-14));
    const resistances = highGroups.filter(g => g.price > price * 1.001).sort((a, b) => a.price - b.price).slice(0, 3);
    const supports = lowGroups.filter(g => g.price < price * 0.999).sort((a, b) => b.price - a.price).slice(0, 3);
    const recentHigh = Math.max.apply(null, data.slice(-60).map(c => c.h));
    const recentLow = Math.min.apply(null, data.slice(-60).map(c => c.l));
    if (!resistances.length) resistances.push({ price: recentHigh, touches: 1, last: n - 1 });
    if (!supports.length) supports.push({ price: recentLow, touches: 1, last: n - 1 });

    // Cấu trúc đỉnh/đáy: so sánh hai đỉnh và hai đáy gần nhất.
    const hs = pivotHighs.slice(-3);
    const ls = pivotLows.slice(-3);
    const hh = hs.length >= 2 && hs[hs.length - 1].p > hs[hs.length - 2].p;
    const hl = ls.length >= 2 && ls[ls.length - 1].p > ls[ls.length - 2].p;
    const lh = hs.length >= 2 && hs[hs.length - 1].p < hs[hs.length - 2].p;
    const ll = ls.length >= 2 && ls[ls.length - 1].p < ls[ls.length - 2].p;
    let structureDir = 'range';
    if (hh && hl) structureDir = 'up';
    else if (lh && ll) structureDir = 'down';
    const structureLabel = structureDir === 'up' ? 'Tăng (HH/HL)' : structureDir === 'down' ? 'Giảm (LH/LL)' : 'Đi ngang';
    const structureNote = structureDir === 'up' ? 'Đỉnh và đáy sau cao hơn đỉnh và đáy trước' :
      structureDir === 'down' ? 'Đỉnh và đáy sau thấp hơn đỉnh và đáy trước' : 'Đỉnh/đáy chưa theo một hướng rõ ràng';

    // Hồi quy 60 nến: độ dốc theo %/nến và R².
    const regN = Math.min(60, n);
    const regSeries = closes.slice(-regN);
    const reg = CH.indicators.linearRegression(regSeries);
    const regMean = mean(regSeries);
    let ssTot = 0, ssRes = 0;
    regSeries.forEach((v, i) => {
      const fit = reg.intercept + reg.slope * i;
      ssTot += Math.pow(v - regMean, 2);
      ssRes += Math.pow(v - fit, 2);
    });
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    const slopePct = price > 0 ? reg.slope / price * 100 : 0;

    // Volume profile 24 bin trên 120 nến, chia volume theo biên độ từng nến.
    const vpData = data.slice(-120);
    const vpLow = Math.min.apply(null, vpData.map(c => c.l));
    const vpHigh = Math.max.apply(null, vpData.map(c => c.h));
    const binCount = 24;
    const binStep = (vpHigh - vpLow) / binCount || 1;
    const profile = new Array(binCount).fill(0);
    vpData.forEach(c => {
      const b1 = clamp(Math.floor((c.l - vpLow) / binStep), 0, binCount - 1);
      const b2 = clamp(Math.floor((c.h - vpLow) / binStep), 0, binCount - 1);
      const share = (c.v || 0) / Math.max(1, b2 - b1 + 1);
      for (let b = b1; b <= b2; b++) profile[b] += share;
    });
    const smoothProfile = profile.map((v, i) => (profile[i - 1] || 0) * 0.25 + v * 0.5 + (profile[i + 1] || 0) * 0.25);
    const profileTotal = smoothProfile.reduce((s, v) => s + v, 0) || 1;
    let pocIdx = 0;
    smoothProfile.forEach((v, i) => { if (v > smoothProfile[pocIdx]) pocIdx = i; });
    let vaLow = pocIdx, vaHigh = pocIdx, vaAcc = smoothProfile[pocIdx];
    while (vaAcc < profileTotal * 0.7 && (vaLow > 0 || vaHigh < binCount - 1)) {
      const below = vaLow > 0 ? smoothProfile[vaLow - 1] : -1;
      const above = vaHigh < binCount - 1 ? smoothProfile[vaHigh + 1] : -1;
      if (above >= below) { vaHigh++; vaAcc += Math.max(0, above); }
      else { vaLow--; vaAcc += Math.max(0, below); }
    }
    const poc = vpLow + (pocIdx + 0.5) * binStep;
    const vah = vpLow + (vaHigh + 1) * binStep;
    const val = vpLow + vaLow * binStep;
    const inValueArea = price >= val && price <= vah;

    // Thống kê nến 20 phiên gần nhất.
    const statSet = data.slice(-20);
    let bull = 0, bear = 0, doji = 0, bodySum = 0, rangeSum = 0, upVol = 0, downVol = 0;
    statSet.forEach(c => {
      const body = Math.abs(c.c - c.o);
      const range = Math.max(1e-9, c.h - c.l);
      if (body <= range * 0.1) doji++;
      else if (c.c >= c.o) bull++;
      else bear++;
      bodySum += body / price * 100;
      rangeSum += range / price * 100;
      if (c.c >= c.o) upVol += c.v || 0; else downVol += c.v || 0;
    });
    let streak = 0;
    for (let i = n - 1; i >= 0; i--) {
      const dir = data[i].c >= data[i].o ? 1 : -1;
      if (streak === 0) streak = dir;
      else if ((streak > 0 && dir > 0) || (streak < 0 && dir < 0)) streak += dir > 0 ? 1 : -1;
      else break;
    }
    const volAvg20 = mean(statSet.map(c => c.v || 0)) || 1;
    const volRatio = (data[n - 1].v || 0) / volAvg20;

    // Mẫu nến trên 3 nến cuối.
    const c1 = data[n - 3], c2 = data[n - 2], c3 = data[n - 1];
    const body3 = Math.abs(c3.c - c3.o);
    const range3 = Math.max(1e-9, c3.h - c3.l);
    const upperWick = c3.h - Math.max(c3.o, c3.c);
    const lowerWick = Math.min(c3.o, c3.c) - c3.l;
    const patterns = [];
    const addPattern = (name, bias, note) => patterns.push({ name, bias, note });
    if (c3.c > c3.o && c2.c < c2.o && c3.c >= c2.o && c3.o <= c2.c && body3 > Math.abs(c2.c - c2.o) * 0.8) {
      addPattern('Nhấn chìm tăng', 'up', 'Nến tăng bao trùm toàn bộ thân nến giảm trước đó.');
    }
    if (c3.c < c3.o && c2.c > c2.o && c3.c <= c2.o && c3.o >= c2.c && body3 > Math.abs(c2.c - c2.o) * 0.8) {
      addPattern('Nhấn chìm giảm', 'down', 'Nến giảm bao trùm toàn bộ thân nến tăng trước đó.');
    }
    if (lowerWick > body3 * 2 && upperWick < body3 && body3 / range3 < 0.4) {
      addPattern('Râu dưới dài', 'up', 'Lực bán bị hấp thụ ở vùng giá thấp, nhưng cần xác nhận thêm.');
    }
    if (upperWick > body3 * 2 && lowerWick < body3 && body3 / range3 < 0.4) {
      addPattern('Râu trên dài', 'down', 'Lực mua bị chặn ở vùng giá cao, dễ có nhịp điều chỉnh.');
    }
    if (body3 / range3 <= 0.1) addPattern('Doji', 'flat', 'Mở và đóng gần như bằng nhau — thị trường lưỡng lự.');
    if (c1.c > c1.o && c2.c > c2.o && c3.c > c3.o && c2.c > c1.c && c3.c > c2.c) {
      addPattern('Ba nến tăng', 'up', 'Ba nến tăng liên tiếp với đỉnh sau cao hơn đỉnh trước.');
    }
    if (c1.c < c1.o && c2.c < c2.o && c3.c < c3.o && c2.c < c1.c && c3.c < c2.c) {
      addPattern('Ba nến giảm', 'down', 'Ba nến giảm liên tiếp với đáy sau thấp hơn đáy trước.');
    }
    if (c3.h <= c2.h && c3.l >= c2.l) addPattern('Inside bar', 'flat', 'Nến sau nằm gọn trong nến trước — biến động đang nén.');
    const priorHigh20 = Math.max.apply(null, data.slice(-21, -1).map(c => c.h));
    const priorLow20 = Math.min.apply(null, data.slice(-21, -1).map(c => c.l));
    if (c3.c > priorHigh20) addPattern('Phá đỉnh 20 nến', 'up', 'Giá đóng cửa trên vùng cao nhất 20 nến gần nhất.');
    if (c3.c < priorLow20) addPattern('Thủng đáy 20 nến', 'down', 'Giá đóng cửa dưới vùng thấp nhất 20 nến gần nhất.');
    if (volRatio >= 1.8) addPattern('Volume đột biến', c3.c >= c3.o ? 'up' : 'down', 'Khối lượng gấp ' + nf(volRatio, 1) + ' lần trung bình 20 nến.');
    const shownPatterns = patterns.slice(0, 4);

    // Kế hoạch giao dịch tham khảo: stop theo ATR và hỗ trợ gần nhất.
    const support = supports[0] ? supports[0].price : recentLow;
    const resistance = resistances[0] ? resistances[0].price : price + atr * 2;
    let stop = Math.min(price - atr * 1.2, support - atr * 0.35);
    stop = Math.max(stop, price - atr * 2.6);
    if (!(stop < price * 0.999)) stop = price - atr * 1.5;
    const unitRisk = Math.max(price - stop, price * 0.002);
    const target1 = resistance > price * 1.004 ? resistance : price + unitRisk * 2;
    const target2 = price + unitRisk * 3;
    const rr = unitRisk > 0 ? (target1 - price) / unitRisk : 0;
    const riskBudget = Math.max(0, state.cash * 0.01);
    let qty = unitRisk > 0 ? riskBudget / unitRisk : 0;
    let positionValue = qty * price;
    if (positionValue > state.cash * 0.25) { positionValue = state.cash * 0.25; qty = positionValue / price; }
    const positionPct = state.cash > 0 ? positionValue / state.cash * 100 : 0;

    // Điểm đọc tổng hợp, chỉ mang tính tham khảo.
    let score = 50;
    if (price > ma20) score += 8; else score -= 8;
    if (ma20 > ma50) score += 7; else score -= 7;
    if (macdHist > 0) score += 6; else score -= 6;
    if (rsi >= 50 && rsi <= 70) score += 5;
    else if (rsi > 75) score -= 7;
    else if (rsi < 30) score += 3;
    else if (rsi < 50) score -= 3;
    if (structureDir === 'up') score += 10;
    else if (structureDir === 'down') score -= 10;
    if (adx >= 25) score += slopePct > 0 ? 6 : -6;
    if (volRatio >= 1.3) score += c3.c >= c3.o ? 4 : -4;
    shownPatterns.forEach(p => { if (p.bias === 'up') score += 2; else if (p.bias === 'down') score -= 2; });
    score = Math.round(clamp(score, 0, 100));
    const verdict = score >= 68 ? 'Nghiêng mua' : score >= 45 ? 'Trung tính' : 'Nghiêng bán';
    const trendDir = slopePct > 0.04 && r2 > 0.25 ? 'up' : slopePct < -0.04 && r2 > 0.25 ? 'down' : 'range';
    const trendLabel = trendDir === 'up' ? 'Tăng' : trendDir === 'down' ? 'Giảm' : 'Đi ngang';
    const momentumLabel = rsi > 70 ? 'Quá mua' : rsi < 30 ? 'Quá bán' : macdHist > 0 ? 'Tích cực' : 'Yếu';
    const atrPct = price > 0 ? atr / price * 100 : 0;
    const volLabel = atrPct < 1.2 ? 'Thấp' : atrPct < 2.6 ? 'Vừa' : 'Cao';

    return {
      n, price, ma20, ma50, ema21, rsi, macdHist, atr, atrPct, adx, roc10,
      bollUpper, bollLower, bollWidth, slopePct, r2, trendDir, trendLabel,
      structureDir, structureLabel, structureNote, momentumLabel, volLabel,
      supports, resistances, support, resistance, recentHigh, recentLow,
      poc, vah, val, inValueArea, profile: smoothProfile, profileLow: vpLow, profileStep: binStep, pocIdx,
      bull, bear, doji, streak, avgBodyPct: bodySum / statSet.length, avgRangePct: rangeSum / statSet.length,
      volRatio, upVol, downVol, patterns: shownPatterns,
      stop, target1, target2, unitRisk, rr, riskBudget, qty, positionValue, positionPct,
      score, verdict, candleCount: clean.length
    };
  }

  function readerTabsHTML() {
    const tabs = [['structure', 'Cấu trúc'], ['volume', 'Vùng giá'], ['candles', 'Mẫu nến'], ['plan', 'Kế hoạch']];
    return '<div class="reader-tabs">' + tabs.map(t => '<button type="button" class="reader-tab ' + (chartReaderTab === t[0] ? 'active' : '') + '" data-reader-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  }

  function chartReaderBodyHTML(r, asset) {
    const scoreCls = r.score >= 60 ? 'up' : r.score < 45 ? 'down' : '';
    const levelRow = (label, item, kind, idx) => {
      const dist = (item.price / r.price - 1) * 100;
      return '<div class="reader-level ' + kind + '"><span class="reader-level-tag">' + label + (idx + 1) + '</span><b>' + fmtPrice(asset, item.price) + '</b><span>' + (dist >= 0 ? '+' : '') + nf(dist, 1) + '% · ' + item.touches + ' lần chạm</span></div>';
    };
    const levelBlock = r.resistances.map((x, i) => levelRow('R', x, 'res', i)).join('') +
      r.supports.map((x, i) => levelRow('S', x, 'sup', i)).join('');
    let body = '';
    if (chartReaderTab === 'volume') {
      const rows = [];
      const step = 2;
      for (let i = r.profile.length - step; i >= 0; i -= step) {
        const v = (r.profile[i] + (r.profile[i + 1] || 0)) / 2;
        const w = Math.max(1, v / Math.max.apply(null, r.profile) * 100);
        const isPoc = r.pocIdx >= i && r.pocIdx <= i + step - 1;
        rows.push('<div class="reader-vp-row ' + (isPoc ? 'poc' : '') + '"><span>' + nf(r.profileLow + (i + 1) * r.profileStep, 0) + '</span><div><i style="width:' + nf(w, 1) + '%"></i></div></div>');
      }
      body = '<div class="reader-vp-head"><div><span>POC</span><b>' + fmtPrice(asset, r.poc) + '</b><em>Giá có volume lớn nhất</em></div><div><span>VAH</span><b>' + fmtPrice(asset, r.vah) + '</b><em>Biên vùng giá trị</em></div><div><span>VAL</span><b>' + fmtPrice(asset, r.val) + '</b><em>Đáy vùng giá trị</em></div><div><span>Vị trí giá</span><b class="' + (r.inValueArea ? '' : 'up') + '">' + (r.inValueArea ? 'Trong vùng' : r.price > r.vah ? 'Trên vùng' : 'Dưới vùng') + '</b><em>So với value area</em></div></div>' +
        '<div class="reader-vp">' + rows.join('') + '</div>' +
        '<div class="reader-vp-note"><b>Đọc thế nào:</b> POC là vùng nhiều người đã giao dịch nhất, thường đóng vai trò nam châm giá. Giá bật khỏi VAH/VAL cho thấy vùng giá trị đang được tôn trọng; giá thoát ra ngoài kèm volume lớn cho thấy dòng tiền đang chuyển sang vùng mới.</div>' +
        '<div class="reader-side-stats"><div><span>Volume tăng</span><b class="up">' + fmtVND(r.upVol) + '</b></div><div><span>Volume giảm</span><b class="down">' + fmtVND(r.downVol) + '</b></div><div><span>Tỷ lệ mua/bán</span><b>' + nf(r.upVol / Math.max(1, r.downVol), 2) + 'x</b></div></div>';
    } else if (chartReaderTab === 'candles') {
      const stat = (label, value, note) => '<div class="reader-stat"><span>' + label + '</span><b>' + value + '</b><em>' + note + '</em></div>';
      const patternHTML = r.patterns.length
        ? r.patterns.map(p => '<div class="reader-pattern ' + p.bias + '"><b>' + esc(p.name) + '</b><span>' + esc(p.note) + '</span></div>').join('')
        : '<div class="reader-pattern flat"><b>Không có mẫu rõ</b><span>Ba nến gần nhất chưa tạo mẫu đáng chú ý.</span></div>';
      const lastRows = ((readerState.candles || (mainChart && mainChart.data) || [])).slice(-5).map(c => {
        const chg = c.o ? (c.c / c.o - 1) * 100 : 0;
        return '<tr><td>' + timeAgo(c.t * 1000) + '</td><td>' + fmtPrice(asset, c.o) + '</td><td>' + fmtPrice(asset, c.h) + '</td><td>' + fmtPrice(asset, c.l) + '</td><td class="' + changeCls(chg) + '">' + fmtPrice(asset, c.c) + '</td><td>' + money(c.v || 0) + '</td></tr>';
      }).join('');
      body = '<div class="reader-stat-grid">' +
        stat('Nến tăng', r.bull + '/20', 'Trong 20 nến gần nhất') +
        stat('Nến giảm', r.bear + '/20', 'Trong 20 nến gần nhất') +
        stat('Doji', r.doji + '/20', 'Thân nến rất nhỏ') +
        stat('Chuỗi hiện tại', (r.streak > 0 ? '+' : '') + r.streak, r.streak > 0 ? 'Nến tăng liên tiếp' : 'Nến giảm liên tiếp') +
        stat('Thân trung bình', nf(r.avgBodyPct, 2) + '%', 'So với giá') +
        stat('Volume / TB20', nf(r.volRatio, 2) + 'x', r.volRatio > 1.5 ? 'Đột biến' : 'Bình thường') +
        '</div>' +
        '<div class="reader-pattern-list">' + patternHTML + '</div>' +
        (lastRows ? '<div class="table-wrap reader-candle-table"><table class="data-table"><thead><tr><th>Thời gian</th><th>Mở</th><th>Cao</th><th>Thấp</th><th>Đóng</th><th>KL</th></tr></thead><tbody>' + lastRows + '</tbody></table></div>' : '');
    } else if (chartReaderTab === 'plan') {
      const check = (ok, text) => '<div class="reader-check ' + (ok ? 'on' : '') + '"><span>' + (ok ? '✓' : '·') + '</span>' + text + '</div>';
      body = '<div class="reader-plan-grid">' +
        '<div><span>Giá hiện tại</span><b>' + fmtPrice(asset, r.price) + '</b><em>Điểm tham chiếu</em></div>' +
        '<div><span>Stop tham khảo</span><b class="down">' + fmtPrice(asset, r.stop) + '</b><em>−' + nf((1 - r.stop / r.price) * 100, 1) + '%</em></div>' +
        '<div><span>Mục tiêu 1</span><b class="up">' + fmtPrice(asset, r.target1) + '</b><em>+ ' + nf((r.target1 / r.price - 1) * 100, 1) + '%</em></div>' +
        '<div><span>Mục tiêu 2</span><b class="up">' + fmtPrice(asset, r.target2) + '</b><em>+ ' + nf((r.target2 / r.price - 1) * 100, 1) + '%</em></div>' +
        '</div>' +
        '<div class="reader-rr"><div><span>Tỷ lệ lãi/rủi</span><b>' + nf(r.rr, 2) + ' : 1</b></div><div><span>Rủi ro mỗi đơn vị</span><b>' + fmtPrice(asset, r.unitRisk) + '</b></div><div><span>KL gợi ý (rủi ro 1%)</span><b>' + nf(r.qty, r.qty >= 100 ? 0 : 4) + '</b></div><div><span>Giá trị vị thế</span><b>' + fmtVND(r.positionValue) + ' (' + nf(r.positionPct, 1) + '% tiền mặt)</b></div></div>' +
        '<div class="reader-checklist"><b>Xác nhận trước khi vào lệnh</b>' +
        check(r.price > r.ma20, 'Giá trên MA20') +
        check(r.ma20 > r.ma50, 'MA20 trên MA50') +
        check(r.macdHist > 0, 'MACD histogram dương') +
        check(r.structureDir === 'up', 'Cấu trúc đỉnh/đáy tăng') +
        check(r.volRatio > 1.1, 'Volume xác nhận') +
        '</div>' +
        '<div class="reader-plan-note">Kế hoạch này chỉ là bài tập tính toán, không phải lời khuyên. Stop đặt theo ATR và hỗ trợ gần nhất; nếu giá chạm stop, chấp nhận mất số tiền đã định trước thay vì gồng lỗ.</div>';
    } else {
      const levelRows = levelBlock || '<div class="reader-level"><span class="reader-level-tag">—</span><b>Chưa đủ dữ liệu</b><span>Thử đổi khung thời gian</span></div>';
      body = '<div class="reader-structure-top"><div class="reader-structure-score ' + scoreCls + '"><span>Cấu trúc</span><b>' + r.structureLabel + '</b><em>' + r.structureNote + '</em></div>' +
        '<div class="reader-kv-grid"><div><span>Độ dốc 60 nến</span><b class="' + changeCls(r.slopePct) + '">' + (r.slopePct >= 0 ? '+' : '') + nf(r.slopePct, 3) + '%/nến</b></div><div><span>Độ tin cậy R²</span><b>' + nf(r.r2 * 100, 0) + '%</b></div><div><span>ADX 14</span><b>' + nf(r.adx, 1) + '</b><em>' + (r.adx >= 25 ? 'Xu hướng mạnh' : 'Xu hướng yếu') + '</em></div><div><span>MA20 / MA50</span><b>' + fmtPrice(asset, r.ma20) + ' / ' + fmtPrice(asset, r.ma50) + '</b></div><div><span>EMA21</span><b>' + fmtPrice(asset, r.ema21) + '</b></div><div><span>ROC 10 nến</span><b class="' + changeCls(r.roc10) + '">' + fmtPct(r.roc10) + '</b></div></div></div>' +
        '<div class="reader-levels"><div class="reader-levels-col"><div class="reader-levels-title down">Kháng cự</div>' + r.resistances.map((x, i) => levelRow('R', x, 'res', i)).join('') + '</div><div class="reader-levels-col"><div class="reader-levels-title up">Hỗ trợ</div>' + r.supports.map((x, i) => levelRow('S', x, 'sup', i)).join('') + '</div></div>' +
        '<div class="reader-note">Khoảng cách tới hỗ trợ/kháng cự được tính từ giá hiện tại. Vùng có nhiều lần chạm thường đáng chú ý hơn, nhưng không có mức giá nào là bất khả xâm phạm.</div>';
    }
    return body;
  }

  function chartReaderSummaryHTML(r, asset) {
    const scoreCls = r.score >= 60 ? 'up' : r.score < 45 ? 'down' : '';
    return '<div class="reader-summary">' +
      '<div class="reader-score ' + scoreCls + '"><span>Điểm đọc</span><b>' + r.score + '<em>/100</em></b><strong>' + r.verdict + '</strong></div>' +
      '<div class="reader-mini"><span>Xu hướng</span><b class="' + (r.trendDir === 'up' ? 'up' : r.trendDir === 'down' ? 'down' : '') + '">' + r.trendLabel + '</b><em>ADX ' + nf(r.adx, 0) + '</em></div>' +
      '<div class="reader-mini"><span>Cấu trúc</span><b>' + (r.structureDir === 'up' ? 'HH/HL' : r.structureDir === 'down' ? 'LH/LL' : 'Đi ngang') + '</b><em>' + r.structureNote + '</em></div>' +
      '<div class="reader-mini"><span>RSI 14</span><b>' + nf(r.rsi, 1) + '</b><em>' + r.momentumLabel + '</em></div>' +
      '<div class="reader-mini"><span>ATR 14</span><b>' + nf(r.atrPct, 1) + '%</b><em>Biến động ' + r.volLabel.toLowerCase() + '</em></div>' +
      '<div class="reader-mini"><span>POC</span><b>' + fmtPrice(asset, r.poc) + '</b><em>' + (r.inValueArea ? 'Trong value area' : 'Ngoài value area') + '</em></div>' +
      '</div>';
  }

  function chartReaderReportHTML(r, asset) {
    return chartReaderSummaryHTML(r, asset) + readerTabsHTML() + '<div class="reader-body" id="chartReaderBody">' + chartReaderBodyHTML(r, asset) + '</div>';
  }

  function chartReaderInnerHTML() {
    const candles = (mainChart && mainChart.data) ? mainChart.data : [];
    const r = chartAnalyze(candles);
    const asset = terminalAsset();
    readerState = { analysis: r, asset, candles };
    if (!r) return '<div class="reader-loading">Đang chờ đủ nến để đọc cấu trúc, vùng giá và mẫu nến…</div>';
    return chartReaderReportHTML(r, asset) + '<div class="reader-source">' + r.candleCount + ' nến · ' + chartPrefs().tf + ' · phân tích trên dữ liệu đang hiển thị</div>';
  }

  function bindReaderTabs(root, onSwitch) {
    if (!root) return;
    root.querySelectorAll('[data-reader-tab]').forEach(btn => btn.addEventListener('click', () => {
      chartReaderTab = btn.getAttribute('data-reader-tab') || 'structure';
      root.querySelectorAll('[data-reader-tab]').forEach(x => x.classList.toggle('active', x === btn));
      if (onSwitch) return onSwitch();
      const body = root.querySelector('.reader-body') || $('#chartReaderBody');
      if (body && readerState.analysis) body.innerHTML = chartReaderBodyHTML(readerState.analysis, readerState.asset);
    }));
  }

  function refreshChartReader() {
    const inner = $('#chartReaderInner');
    if (!inner) return;
    inner.innerHTML = chartReaderInnerHTML();
    bindReaderTabs(inner);
  }

  function terminalHTML() {
    const a = terminalAsset();
    const prefs = chartPrefs();
    const mode = orderModeFor(a);
    const holdings = state.holdings[a.id];
    const holdQty = holdings ? holdings.qty : 0;
    const drawTools = [
      ['cursor', 'cursor', 'Chọn / kéo'], ['trend', 'trendline', 'Trendline'], ['ray', 'ray', 'Tia'], ['hline', 'horizontal', 'Đường ngang'],
      ['rect', 'square', 'Vùng giá'], ['fib', 'fib', 'Fibonacci'], ['brush', 'brush', 'Vẽ tay'], ['text', 'type', 'Chú thích'],
      ['measure', 'ruler', 'Đo lường'], ['eraser', 'eraser', 'Xoá nét']
    ];
    return '<div class="terminal-head"><div class="terminal-asset">' + assetLogo(a, 'lg') +
      '<div><div class="terminal-symbol-row"><span class="terminal-symbol">' + esc(a.symbol) + '</span>' +
      '<span class="exchange-tag">' + esc(a.exchange) + '</span>' +
      (a.demoOnly ? '<span class="sim-tag">MÔ PHỎNG</span>' : a.live ? '<span class="badge badge-live">LIVE</span>' : '<span class="sim-tag">DEMO</span>') + '</div>' +
      '<div class="terminal-name">' + esc(a.name) + ' · ' + esc(a.sector || groupOf(a).name) + '</div>' +
      '<div class="terminal-meta-row"><span class="terminal-meta">Mở<b>' + fmtPrice(a, a.open) + '</b></span><span class="terminal-meta">Cao<b class="up">' + fmtPrice(a, a.high) + '</b></span><span class="terminal-meta">Thấp<b class="down">' + fmtPrice(a, a.low) + '</b></span><span class="terminal-meta">KL<b>' + money(a.volume || 0) + '</b></span><span class="terminal-meta">Tỷ giá USD<b>' + nf(fxRate(), 0) + ' ₫</b></span></div></div></div>' +
      '<div class="terminal-price-block"><div class="terminal-price" id="terminalLivePrice">' + fmtPrice(a) + '</div>' +
      '<div class="terminal-change ' + changeCls(a.changePct) + '" id="terminalLiveChg">' + (a.changePct > 0 ? '+' : '') + nf(a.price - a.prev, a.decimals) + '  ·  ' + fmtPct(a.changePct) + '</div>' +
      '<div class="head-actions" style="margin-top:8px;justify-content:flex-end"><select class="select" id="terminalAssetSelect" style="height:32px;width:190px;font-size:10px">' + assetSelectOptions(a.id) + '</select>' +
      (a.yahoo && (D.COMPANY_GROUPS || []).includes(a.group) ? '<button class="btn btn-xs btn-outline-gold" data-action="company" data-id="' + a.id + '">' + icon('building') + ' Báo cáo DN</button>' : '') +
      '<button class="btn btn-xs btn-ghost" data-action="open-settings">' + icon('settings-sliders') + ' Cài đặt</button></div></div></div>' +
      '<div class="terminal-event-slot" data-event-slot="compact">' + marketEventCardHTML(true) + '</div>' +
      '<div class="terminal-grid"><div class="terminal-main"><section class="card chart-card">' +
      '<div class="chart-head"><div class="chart-head-left"><div class="chart-title">' + icon('chart') + ' <span class="exchange-tag">' + esc(a.exchange) + '</span> ' + esc(a.symbol) + '</div>' +
      '<div class="segmented"><button class="seg ' + (prefs.type !== 'line' ? 'active' : '') + '" data-chart-type="candles">Nến</button><button class="seg ' + (prefs.type === 'line' ? 'active' : '') + '" data-chart-type="line">Đường</button></div></div>' +
      '<div class="chart-head-right"><div class="chart-live-meta" title="Đồng hồ cập nhật giá realtime"><span class="chart-live-dot" id="chartLiveDot"></span><span id="chartUpdated">Đang kết nối…</span></div><div class="tf-group">' + ['1m', '5m', '15m', '1H', '4H', '1D', '1W'].map(tf => '<button class="tf-btn ' + (prefs.tf === tf ? 'active' : '') + '" data-tf="' + tf + '">' + tf + '</button>').join('') + '</div></div></div>' +
      '<div class="chart-toolbar"><div class="draw-tools">' + drawTools.map(t => '<button class="draw-tool" data-draw="' + t[0] + '" title="' + t[2] + '" aria-label="' + t[2] + '">' + icon(t[1]) + '</button>').join('') + '</div>' +
      '<div class="color-dots">' + ['#f3c56b', '#2ee6a6', '#5ac8fa', '#ff5d73', '#b59cff'].map((c, i) => '<button class="color-dot ' + (i === 0 ? 'active' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="Màu vẽ"></button>').join('') + '</div>' +
      '<div class="draw-sep"></div><div class="indicator-toggles"><button class="ind-btn ' + (prefs.ma ? 'active' : '') + '" data-ind="ma">MA</button><button class="ind-btn ' + (prefs.ema ? 'active' : '') + '" data-ind="ema">EMA</button><button class="ind-btn ' + (prefs.boll ? 'active' : '') + '" data-ind="boll">BB</button><button class="ind-btn ' + (prefs.vol ? 'active' : '') + '" data-ind="vol">VOL</button>' +
      '<select class="select" id="chartOsc" style="height:24px;width:82px;font-size:8px;padding:0 20px 0 7px;background-position:right 6px center"><option value="rsi"' + (prefs.osc === 'rsi' ? ' selected' : '') + '>RSI</option><option value="macd"' + (prefs.osc === 'macd' ? ' selected' : '') + '>MACD</option><option value="stoch"' + (prefs.osc === 'stoch' ? ' selected' : '') + '>Stoch</option><option value="none"' + (prefs.osc === 'none' ? ' selected' : '') + '>Ẩn OSC</option></select></div>' +
      '<div class="draw-sep"></div><button class="draw-tool" id="chartMagnet" title="Bám vào nến">' + icon('magnet') + '</button><button class="draw-tool" id="chartVision" title="AURA Vision — tự tìm hỗ trợ/kháng cự">' + icon('wand') + '</button>' +
      '<button class="draw-tool" id="chartUndo" title="Hoàn tác">' + icon('undo') + '</button><button class="draw-tool" id="chartClear" title="Xoá tất cả nét vẽ">' + icon('trash') + '</button></div>' +
      '<div class="chart-canvas-wrap" id="chartWrap"><canvas id="mainChart"></canvas><div class="chart-loading" id="chartLoading"><span class="spinner"></span><span>Đang tải nến thật…</span></div></div>' +
      '<div class="chart-foot"><div class="legend"><span class="legend-item"><span class="legend-line" style="background:var(--gold)"></span>MA20</span><span class="legend-item"><span class="legend-line" style="background:var(--cyan)"></span>EMA21</span><span class="legend-item"><span class="legend-line" style="background:var(--purple)"></span>BB20</span>' +
      '<span class="legend-item"><span class="dot up"></span>Tăng</span><span class="legend-item"><span class="dot down"></span>Giảm</span></div>' +
      '<div class="chart-hover-info" id="chartHover"><span>Dùng con lăn để zoom · kéo nền để di chuyển</span></div>' +
      '<div class="chart-source"><span class="dot ' + (API.hasLive(a) ? 'up' : '') + '"></span><span id="chartSourceLabel">' + (API.hasLive(a) ? 'Nến thật' : 'Nến mô phỏng') + '</span></div></div>' +
      '<div class="chart-reader' + (chartReaderOpen ? '' : ' closed') + '" id="chartReader"><div class="reader-head"><div><b>' + icon('eye') + ' Đọc biểu đồ</b><span>Cấu trúc, vùng giá, mẫu nến và kế hoạch tính sẵn từ dữ liệu đang hiển thị</span></div><button type="button" class="reader-toggle" id="chartReaderToggle">' + (chartReaderOpen ? 'Thu gọn' : 'Mở') + '</button></div><div id="chartReaderInner">' + chartReaderInnerHTML() + '</div></div></section>' +
      '<section class="card chart-tabs"><div class="tab-row">' + terminalTabsHTML() + '</div><div class="tab-panel" id="terminalPanels">' + terminalPanelsHTML() + '</div></section></div>' +
      '<aside class="order-panel card"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Đặt lệnh</div><div class="card-sub">' + (mode === 'futures' ? 'Phái sinh · ký quỹ cách ly' : 'Spot · thanh toán ngay') + '</div></div><span class="badge ' + (mode === 'futures' ? 'badge-gold' : 'badge-cyan') + '">' + (mode === 'futures' ? 'FUTURES' : 'SPOT') + '</span></div>' +
      '<div class="order-asset-line">' + assetLogo(a) + '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + '</div><div class="asset-name">' + esc(a.name) + '</div></div><span class="price" id="orderLastPrice">' + fmtPrice(a) + ' ' + priceUnit(a) + '</span></div>' +
      (a.group === 'derivatives' ? '' : '<div class="spot-futures"><div class="segmented block"><button class="seg ' + (mode === 'spot' ? 'active gold' : '') + '" data-order-mode="spot">Spot</button><button class="seg ' + (mode === 'futures' ? 'active gold' : '') + '" data-order-mode="futures">Phái sinh</button></div></div>') +
      '<div class="order-side-tabs"><button class="order-side buy ' + (terminalOrder.side === 'buy' || terminalOrder.side === 'long' ? 'active' : '') + '" data-order-side="' + (mode === 'futures' ? 'long' : 'buy') + '">' + (mode === 'futures' ? 'Long' : 'Mua') + '</button>' +
      '<button class="order-side sell ' + (terminalOrder.side === 'sell' || terminalOrder.side === 'short' ? 'active' : '') + '" data-order-side="' + (mode === 'futures' ? 'short' : 'sell') + '">' + (mode === 'futures' ? 'Short' : 'Bán') + '</button></div>' +
      '<div class="form-row" style="grid-template-columns:1fr 1fr;gap:7px"><div class="field"><label class="field-label" for="orderType">Loại lệnh</label><select class="select" id="orderType"><option value="market"' + (terminalOrder.type === 'market' ? ' selected' : '') + '>Thị trường</option><option value="limit"' + (terminalOrder.type === 'limit' ? ' selected' : '') + '>Giới hạn</option></select></div>' +
      '<div class="field"><label class="field-label" for="orderPrice">Giá <span class="hint">' + priceUnit(a) + '</span></label><input class="input mono" id="orderPrice" type="number" step="' + (a.decimals > 4 ? '0.00000001' : '0.01') + '" value="' + (terminalOrder.price || a.price) + '"' + (terminalOrder.type === 'market' ? ' disabled' : '') + '></div></div>' +
      '<div class="field" style="margin-top:8px"><label class="field-label" for="orderQty">Khối lượng <span class="hint">' + esc(a.unit || 'đơn vị') + '</span></label><input class="input mono" id="orderQty" type="number" step="' + (stepFor(a) < 1 ? stepFor(a) : 1) + '" placeholder="' + (roundQty(a, 1) || '1') + '" value="' + esc(terminalOrder.qty) + '"></div>' +
      '<div class="quick-amounts">' + [25, 50, 75, 100].map(p => '<button type="button" data-order-pct="' + p + '">' + p + '%</button>').join('') + '</div>' +
      '<div class="order-meta"><span>Sức mua <b id="orderAvail">' + money(state.cash) + ' ₫</b></span><span id="orderHoldQty">' + (holdQty ? 'Đang giữ ' + fmtQty(a, holdQty) : 'Chưa nắm giữ') + '</span></div>' +
      '<div class="leverage-wrap" id="orderLeverageBox" style="display:' + (mode === 'futures' ? 'block' : 'none') + '"><div class="leverage-head"><span>Đòn bẩy</span><b id="orderLevLabel">' + (terminalOrder.leverage || 5) + 'x</b></div>' +
      '<input class="range" id="orderLeverage" type="range" min="1" max="' + (a.maxLeverage || 10) + '" step="1" value="' + clamp(terminalOrder.leverage || 5, 1, a.maxLeverage || 10) + '"><div class="leverage-marks"><span>1x</span><span>' + Math.round((a.maxLeverage || 10) / 2) + 'x</span><span>' + (a.maxLeverage || 10) + 'x</span></div></div>' +
      '<div class="order-summary" id="orderSummary"></div>' +
      '<button class="btn btn-gold btn-block order-submit" id="orderSubmit">' + (mode === 'futures' ? 'Mở vị thế Long' : 'Mua ' + esc(a.symbol)) + '</button>' +
      '<div class="order-hint">' + (mode === 'futures' ? 'Ký quỹ cách ly · thanh lý tự động khi giá chạm mức đã tính.' : 'Lệnh spot dùng tiền mặt khả dụng · phí và thuế hiển thị trước khi xác nhận.') + '</div></aside></div>';
  }

  function orderSummaryHTML() {
    const a = terminalAsset();
    const mode = orderModeFor(a);
    const qty = Number(terminalOrder.qty) || 0;
    const price = Number(terminalOrder.type === 'limit' ? terminalOrder.price : a.price) || a.price;
    const notional = notionalVND(a, price, qty);
    const fee = notional * feeRate(a, mode === 'futures' ? 'futures' : 'spot', terminalOrder.side);
    const lev = mode === 'futures' ? clamp(Number(terminalOrder.leverage) || 5, 1, a.maxLeverage || 10) : 1;
    const margin = mode === 'futures' ? notional / lev : notional;
    const isBuy = terminalOrder.side === 'buy' || terminalOrder.side === 'long';
    const tax = !isBuy && mode === 'spot' && ['hose', 'hnx', 'upcom'].includes(a.group) ? notional * 0.001 : 0;
    const total = isBuy ? margin + fee : Math.max(0, margin - fee - tax);
    return '<div class="kv-row"><span class="k">Giá trị ' + (mode === 'futures' ? 'hợp đồng' : 'lệnh') + '</span><span class="v">' + money(notional) + ' ₫</span></div>' +
      '<div class="kv-row"><span class="k">Phí giao dịch</span><span class="v">' + money(fee) + ' ₫</span></div>' +
      (mode === 'futures' ? '<div class="kv-row"><span class="k">Ký quỹ (' + lev + 'x)</span><span class="v">' + money(margin) + ' ₫</span></div><div class="kv-row"><span class="k">Giá thanh lý dự kiến</span><span class="v down">' + fmtPrice(a, isBuy ? price * (1 - 0.9 / lev) : price * (1 + 0.9 / lev)) + '</span></div>' : '') +
      (tax ? '<div class="kv-row"><span class="k">Thuế bán</span><span class="v">' + money(tax) + ' ₫</span></div>' : '') +
      '<div class="kv-row total"><span class="k">' + (isBuy ? 'Tổng thanh toán' : 'Thực nhận dự kiến') + '</span><span class="v">' + money(total) + ' ₫</span></div>';
  }

  function refreshOrderPanel() {
    const a = terminalAsset();
    const mode = orderModeFor(a);
    const side = mode === 'futures' ? (terminalOrder.side === 'short' ? 'short' : 'long') : (terminalOrder.side === 'sell' ? 'sell' : 'buy');
    terminalOrder.side = side;
    const summary = $('#orderSummary');
    if (summary) summary.innerHTML = orderSummaryHTML();
    const submit = $('#orderSubmit');
    if (submit) {
      submit.textContent = (mode === 'futures' ? 'Mở vị thế ' + (side === 'long' ? 'Long' : 'Short') : side === 'buy' ? 'Mua ' + a.symbol : 'Bán ' + a.symbol);
      submit.classList.toggle('btn-gold', side === 'buy' || side === 'long');
      submit.classList.toggle('btn-down', side === 'sell' || side === 'short');
    }
    const avail = $('#orderAvail');
    if (avail) avail.textContent = money(state.cash) + ' ₫';
    const levLabel = $('#orderLevLabel');
    if (levLabel) levLabel.textContent = clamp(Number(terminalOrder.leverage) || 5, 1, a.maxLeverage || 10) + 'x';
    const sideBtns = $$('[data-order-side]');
    sideBtns.forEach(b => {
      const s = b.getAttribute('data-order-side');
      b.classList.toggle('active', s === side);
    });
  }

  function quickOrderQty(pct) {
    const a = terminalAsset();
    const mode = orderModeFor(a);
    const price = Number(terminalOrder.type === 'limit' ? terminalOrder.price : a.price) || a.price;
    if (mode === 'spot' && terminalOrder.side === 'sell') {
      const h = state.holdings[a.id];
      return h ? roundQty(a, h.qty * pct / 100) : 0;
    }
    const lev = mode === 'futures' ? clamp(Number(terminalOrder.leverage) || 5, 1, a.maxLeverage || 10) : 1;
    const budget = state.cash * 0.98 * lev;
    const raw = budget / (price * valueFactor(a));
    return roundQty(a, raw * pct / 100);
  }

  async function loadTerminalChart(force) {
    const a = terminalAsset();
    const prefs = chartPrefs();
    const token = ++chartLoadToken;
    if (!mainChart) return;
    const loading = $('#chartLoading');
    if (API.hasLive(a) && loading) loading.classList.add('show');
    let candles = null;
    try { candles = await API.chart(a, prefs.tf, force); } catch (e) { API.lastError = e.message; }
    if (token !== chartLoadToken || !mainChart) return;
    if (candles && candles.length > 5) {
      mainChart.setData(candles, a, prefs.tf, a.id + '|' + prefs.tf);
      const label = $('#chartSourceLabel');
      if (label) label.textContent = 'Nến thật · ' + prefs.tf;
    } else {
      mainChart.setData(D.generateCandles(a, prefs.tf, 320, a.price), a, prefs.tf, a.id + '|' + prefs.tf);
      const label = $('#chartSourceLabel');
      if (label) label.textContent = 'Nến mô phỏng · ' + prefs.tf;
    }
    // Đồng bộ giá live ngay sau khi nạp nến để reload không bị “đứng hình”.
    if (API.hasLive(a) && Number.isFinite(a.price)) mainChart.applyLive(a.price);
    if (loading) loading.classList.remove('show');
    refreshChartReader();
  }

  function mountTerminal() {
    const a = terminalAsset();
    const prefs = chartPrefs();
    if (a.group === 'derivatives') terminalOrder.mode = 'futures';
    const canvas = $('#mainChart');
    if (!canvas) return;
    const demo = D.generateCandles(a, prefs.tf, 320, a.price);
    mainChart = new CH.Chart(canvas, {
      config: { ma: prefs.ma, ema: prefs.ema, boll: prefs.boll, volume: prefs.vol, osc: prefs.osc, type: prefs.type },
      formatPrice: v => fmtPrice(a, v),
      onHover: info => {
        const el = $('#chartHover');
        if (!el) return;
        if (!info) { el.innerHTML = '<span>Dùng con lăn để zoom · kéo nền để di chuyển</span>'; return; }
        const c = info.candle || {};
        el.innerHTML = '<span>O <b>' + fmtPrice(a, c.o) + '</b></span><span>H <b>' + fmtPrice(a, c.h) + '</b></span><span>L <b>' + fmtPrice(a, c.l) + '</b></span><span>C <b class="' + changeCls((c.c || 0) - (c.o || 0)) + '">' + fmtPrice(a, c.c) + '</b></span><span>V <b>' + money(c.v || 0) + '</b></span>';
      },
      onDrawingAdded: (item, count) => {
        state.stats.drawings = (state.stats.drawings || 0) + 1;
        progressQuest('chart', 1);
        addXP(10);
        addAura(2);
        save();
        const el = $('#chartHover');
        if (el) el.innerHTML = '<span>Đã thêm nét vẽ · tổng ' + count + ' nét trên ' + esc(a.symbol) + ' ' + prefs.tf + '</span>';
        refreshTerminalPanels();
      },
      onDrawingChange: count => {
        const el = $('#chartHover');
        if (el) el.innerHTML = '<span>' + count + ' nét vẽ trên biểu đồ</span>';
      }
    });
    mainChart.setData(demo, a, prefs.tf, a.id + '|' + prefs.tf);
    refreshChartReader();
    loadTerminalChart(true);
    if (chartLiveTimer) clearInterval(chartLiveTimer);
    updateChartLiveStamp();
    chartLiveTimer = setInterval(() => {
      if (currentRoute !== 'terminal' || document.hidden) return;
      updateChartLiveStamp();
    }, 1000);
    const readerToggle = $('#chartReaderToggle');
    if (readerToggle) readerToggle.addEventListener('click', () => {
      chartReaderOpen = !chartReaderOpen;
      const box = $('#chartReader');
      if (box) box.classList.toggle('closed', !chartReaderOpen);
      readerToggle.textContent = chartReaderOpen ? 'Thu gọn' : 'Mở';
      if (chartReaderOpen) refreshChartReader();
    });
    const select = $('#terminalAssetSelect');
    if (select) select.addEventListener('change', () => {
      state.lastAsset = select.value;
      terminalOrder.qty = '';
      terminalOrder.price = '';
      save();
      renderRoute();
    });
    $$('[data-tf]').forEach(btn => btn.addEventListener('click', () => {
      prefs.tf = btn.getAttribute('data-tf');
      save();
      $$('[data-tf]').forEach(x => x.classList.toggle('active', x === btn));
      loadTerminalChart(true);
    }));
    $$('[data-chart-type]').forEach(btn => btn.addEventListener('click', () => {
      prefs.type = btn.getAttribute('data-chart-type');
      $$('[data-chart-type]').forEach(x => x.classList.toggle('active', x === btn));
      if (mainChart) mainChart.setConfig({ type: prefs.type });
      save();
    }));
    $$('[data-draw]').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-draw]').forEach(x => x.classList.toggle('active', x === btn));
      if (mainChart) mainChart.setTool(btn.getAttribute('data-draw'));
    }));
    $$('[data-color]').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-color]').forEach(x => x.classList.toggle('active', x === btn));
      if (mainChart) mainChart.setColor(btn.getAttribute('data-color'));
    }));
    $$('[data-ind]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-ind');
      if (key === 'vol') {
        prefs.vol = !prefs.vol;
        btn.classList.toggle('active', prefs.vol);
        if (mainChart) mainChart.setConfig({ volume: prefs.vol });
      } else {
        prefs[key] = !prefs[key];
        btn.classList.toggle('active', prefs[key]);
        if (mainChart) mainChart.setConfig({ [key]: prefs[key] });
      }
      save();
    }));
    const osc = $('#chartOsc');
    if (osc) osc.addEventListener('change', () => { prefs.osc = osc.value; if (mainChart) mainChart.setConfig({ osc: prefs.osc }); save(); });
    const magnet = $('#chartMagnet');
    if (magnet) magnet.addEventListener('click', () => {
      magnet.classList.toggle('active');
      if (mainChart) mainChart.setMagnet(magnet.classList.contains('active'));
    });
    const vision = $('#chartVision');
    if (vision) vision.addEventListener('click', () => {
      vision.classList.toggle('active');
      if (mainChart) mainChart.setVision(vision.classList.contains('active'));
      toast('AURA Vision', vision.classList.contains('active') ? 'Đã bật tự động tìm hỗ trợ, kháng cự và kênh hồi quy.' : 'Đã tắt lớp phân tích tự động.', 'info', '🪄');
    });
    const undo = $('#chartUndo');
    if (undo) undo.addEventListener('click', () => { if (mainChart && !mainChart.undo()) toast('Không có nét vẽ', 'Hãy vẽ một công cụ trước khi hoàn tác.', 'info', '↩️'); });
    const clear = $('#chartClear');
    if (clear) clear.addEventListener('click', () => {
      if (!mainChart || !mainChart.countDrawings()) return toast('Biểu đồ đã sạch', 'Không có nét vẽ nào để xoá.', 'info', '🧹');
      mainChart.clearDrawings();
      toast('Đã xoá nét vẽ', 'Các công cụ trên ' + a.symbol + ' ' + prefs.tf + ' đã được dọn sạch.', 'info', '🧹');
    });
    bindTerminalTabButtons();
    mountTerminalPanels();
    $$('[data-order-mode]').forEach(btn => btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-order-mode');
      if (next === terminalOrder.mode) return;
      terminalOrder.mode = next;
      terminalOrder.side = next === 'futures' ? 'long' : 'buy';
      $('#orderLeverageBox').style.display = next === 'futures' ? 'block' : 'none';
      $$('[data-order-mode]').forEach(x => x.classList.toggle('active', x === btn));
      $$('[data-order-mode]').forEach(x => x.classList.toggle('gold', x === btn));
      $$('[data-order-side]').forEach((x, i) => {
        x.setAttribute('data-order-side', next === 'futures' ? (i === 0 ? 'long' : 'short') : (i === 0 ? 'buy' : 'sell'));
        x.textContent = next === 'futures' ? (i === 0 ? 'Long' : 'Short') : (i === 0 ? 'Mua' : 'Bán');
      });
      refreshOrderPanel();
    }));
    $$('[data-order-side]').forEach(btn => btn.addEventListener('click', () => {
      terminalOrder.side = btn.getAttribute('data-order-side');
      refreshOrderPanel();
    }));
    const typeSel = $('#orderType');
    if (typeSel) typeSel.addEventListener('change', () => {
      terminalOrder.type = typeSel.value;
      const price = $('#orderPrice');
      if (price) {
        price.disabled = terminalOrder.type === 'market';
        if (terminalOrder.type === 'limit' && !Number(price.value)) price.value = a.price;
      }
      refreshOrderPanel();
    });
    const priceInput = $('#orderPrice');
    if (priceInput) priceInput.addEventListener('input', () => { terminalOrder.price = priceInput.value; refreshOrderPanel(); });
    const qtyInput = $('#orderQty');
    if (qtyInput) qtyInput.addEventListener('input', () => { terminalOrder.qty = qtyInput.value; refreshOrderPanel(); });
    $$('[data-order-pct]').forEach(btn => btn.addEventListener('click', () => {
      const qty = quickOrderQty(Number(btn.getAttribute('data-order-pct')) || 25);
      terminalOrder.qty = qty > 0 ? String(qty) : '';
      if (qtyInput) qtyInput.value = terminalOrder.qty;
      refreshOrderPanel();
    }));
    const levRange = $('#orderLeverage');
    if (levRange) levRange.addEventListener('input', () => { terminalOrder.leverage = Number(levRange.value); refreshOrderPanel(); });
    const submit = $('#orderSubmit');
    if (submit) submit.addEventListener('click', submitTerminalOrder);
    refreshOrderPanel();
  }

  function mountTerminalPanels() {
    const form = $('#alertForm');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const dir = $('#alertDir').value;
      const price = Number($('#alertPrice').value);
      const res = createAlert(state.lastAsset, dir, price);
      if (!res.ok) toast('Không tạo được cảnh báo', res.error, 'error', '⚠️');
      else {
        toast('Đã tạo cảnh báo', terminalAsset().symbol + ' · ' + (dir === 'above' ? 'vượt trên ' : 'giảm dưới ') + fmtPrice(terminalAsset(), price), 'success', '🔔');
        refreshTerminalPanels();
        updateGlobalQuotes();
      }
    });
  }

  function bindTerminalTabButtons() {
    $$('[data-terminal-tab]').forEach(btn => btn.addEventListener('click', () => {
      terminalTab = btn.getAttribute('data-terminal-tab');
      const panel = $('#terminalPanels');
      if (panel) panel.innerHTML = terminalPanelsHTML();
      $$('[data-terminal-tab]').forEach(x => x.classList.toggle('active', x === btn));
      mountTerminalPanels();
    }));
  }

  function refreshTerminalPanels() {
    if (currentRoute !== 'terminal') return;
    const el = $('#terminalPanels');
    if (el) { el.innerHTML = terminalPanelsHTML(); mountTerminalPanels(); }
    const tabs = $('.chart-tabs .tab-row');
    if (tabs) { tabs.innerHTML = terminalTabsHTML(); bindTerminalTabButtons(); }
  }

  function submitTerminalOrder() {
    const a = terminalAsset();
    const mode = orderModeFor(a);
    const qty = Number(terminalOrder.qty);
    const isLimit = terminalOrder.type === 'limit';
    const price = isLimit ? Number(terminalOrder.price) : a.price;
    if (!isFinite(qty) || qty <= 0) return toast('Thiếu khối lượng', 'Nhập khối lượng ' + a.symbol + ' bạn muốn giao dịch.', 'error', '⚠️');
    if (isLimit && (!isFinite(price) || price <= 0)) return toast('Giá giới hạn không hợp lệ', 'Nhập mức giá bạn muốn chờ khớp.', 'error', '⚠️');
    if (isLimit) {
      const res = placeOrder({ assetId: a.id, side: mode === 'futures' ? (terminalOrder.side === 'short' ? 'short' : 'long') : (terminalOrder.side === 'sell' ? 'sell' : 'buy'), qty, price, leverage: clamp(Number(terminalOrder.leverage) || 5, 1, a.maxLeverage || 10), mode });
      if (!res.ok) return toast('Không đặt được lệnh', res.error, 'error', '⚠️');
      toast('Đã đặt lệnh chờ', (terminalOrder.side === 'sell' || terminalOrder.side === 'short' ? 'Bán ' : 'Mua ') + fmtQty(a, qty) + ' ' + a.symbol + ' @ ' + fmtPrice(a, price), 'success', '📋');
      terminalOrder.qty = '';
      const q = $('#orderQty'); if (q) q.value = '';
      refreshTerminalPanels(); refreshOrderPanel(); saveNow();
      return;
    }
    let res;
    if (mode === 'futures') res = openPosition(a, terminalOrder.side === 'short' ? 'short' : 'long', qty, terminalOrder.leverage, a.price);
    else res = executeSpot(a, terminalOrder.side === 'sell' ? 'sell' : 'buy', qty, a.price);
    if (!res.ok) return toast('Không thể đặt lệnh', res.error, 'error', '⚠️');
    toast(mode === 'futures' ? 'Đã mở vị thế' : 'Đã khớp lệnh', (mode === 'futures' ? (terminalOrder.side === 'short' ? 'SHORT ' : 'LONG ') : (terminalOrder.side === 'sell' ? 'Bán ' : 'Mua ')) + fmtQty(a, qty) + ' ' + a.symbol + ' @ ' + fmtPrice(a, a.price), 'success', mode === 'futures' ? '⚡' : '✅');
    pushNotif(mode === 'futures' ? '⚡' : '✅', mode === 'futures' ? 'Mở vị thế ' + a.symbol : 'Khớp lệnh ' + a.symbol, fmtQty(a, qty) + ' @ ' + fmtPrice(a, a.price));
    terminalOrder.qty = '';
    const q = $('#orderQty'); if (q) q.value = '';
    refreshTerminalPanels(); refreshOrderPanel(); updateShell();
    confetti(18);
  }

  /* ------------------------------ PORTFOLIO ------------------------------ */
  function holdingsRowsHTML() {
    const list = holdingList().sort((a, b) => b.value - a.value);
    if (!list.length) return '<div class="empty-state"><div class="empty-icon">💼</div><strong>Danh mục đang trống</strong><p>Mua cổ phiếu, crypto hoặc hàng hoá đầu tiên. Mỗi lệnh nhỏ đều là một bài học thật.</p><button class="btn btn-sm btn-outline-gold" data-nav="#/terminal">Mở terminal</button></div>';
    const total = investedValue() || 1;
    return '<div class="table-wrap"><table class="data-table holdings-table"><thead><tr><th>Tài sản</th><th class="text-right">KL</th><th class="text-right">Giá vốn</th><th class="text-right">Giá</th><th class="text-right">Giá trị</th><th class="text-right">PnL</th><th class="text-right">Tỷ trọng</th><th></th></tr></thead><tbody>' +
      list.map(h => '<tr><td>' + assetCell(h.asset) + '</td>' +
        '<td class="text-right vol-cell">' + fmtQty(h.asset, h.qty) + '</td>' +
        '<td class="text-right vol-cell">' + fmtPrice(h.asset, h.avgVND / valueFactor(h.asset)) + '</td>' +
        '<td class="text-right price-cell" data-q-price="' + h.asset.id + '">' + fmtPrice(h.asset) + '</td>' +
        '<td class="text-right price-cell">' + money(h.value) + ' ₫</td>' +
        '<td class="text-right"><div class="holding-pnl ' + changeCls(h.pnl) + '">' + (h.pnl >= 0 ? '+' : '') + money(h.pnl) + ' ₫</div><div class="vol-cell ' + changeCls(h.pnlPct) + '">' + fmtPct(h.pnlPct) + '</div></td>' +
        '<td class="text-right vol-cell">' + nf(h.value / total * 100, 1) + '%</td>' +
        '<td><div class="holding-actions"><button class="btn btn-xs btn-ghost" data-action="trade" data-id="' + h.asset.id + '" data-side="buy">Mua</button><button class="btn btn-xs btn-ghost" data-action="trade" data-id="' + h.asset.id + '" data-side="sell">Bán</button></div></td></tr>').join('') +
      '</tbody></table></div>';
  }

  function portfolioPositionsHTML() {
    if (!state.positions.length) return '<div class="empty-state"><div class="empty-icon">⚡</div><strong>Không có vị thế mở</strong><p>Vị thế phái sinh và đòn bẩy sẽ xuất hiện ở đây khi bạn mở lệnh.</p><button class="btn btn-sm btn-ghost" data-nav="#/derivatives">Khám phá phái sinh</button></div>';
    return '<div class="table-wrap"><table class="data-table pos-table"><thead><tr><th>Tài sản</th><th>Hướng</th><th class="text-right">KL</th><th class="text-right">Vào</th><th class="text-right">Mark</th><th class="text-right">PnL</th><th class="text-right">ROI</th><th></th></tr></thead><tbody>' +
      positionList().map(p => '<tr><td>' + assetCell(p.asset, { name: false }) + '</td><td><span class="pos-side ' + p.side + '">' + (p.side === 'long' ? 'LONG' : 'SHORT') + '</span></td>' +
        '<td class="text-right vol-cell">' + fmtQty(p.asset, p.qty) + '</td><td class="text-right vol-cell">' + fmtPrice(p.asset, p.entry) + '</td><td class="text-right price-cell" data-q-price="' + p.asset.id + '">' + fmtPrice(p.asset) + '</td>' +
        '<td class="text-right ' + changeCls(p.pnl) + ' price-cell">' + (p.pnl >= 0 ? '+' : '') + money(p.pnl) + ' ₫</td><td class="text-right vol-cell ' + changeCls(p.roi) + '">' + fmtPct(p.roi) + '</td>' +
        '<td class="text-right"><button class="btn btn-xs btn-ghost" data-action="close-pos" data-id="' + p.id + '">Đóng</button></td></tr>').join('') +
      '</tbody></table></div>';
  }

  function portfolioHistoryHTML() {
    if (!state.trades.length) return '<div class="empty-state"><div class="empty-icon">🧾</div><strong>Chưa có giao dịch</strong><p>Lịch sử giao dịch sẽ được ghi lại tự động để bạn nhìn lại quyết định của mình.</p></div>';
    return state.trades.slice(0, 12).map(t => {
      const a = byId[t.assetId];
      if (!a) return '';
      const isBuy = t.side === 'buy' || t.side === 'long';
      return '<div class="trade-history-row"><span class="history-side ' + (isBuy ? 'buy' : 'sell') + '">' + (isBuy ? 'MUA' : 'BÁN') + '</span>' +
        '<div class="th-main"><b>' + esc(a.symbol) + '</b><span>' + fmtQty(a, t.qty) + ' @ ' + fmtPrice(a, t.price) + '</span><div class="th-date">' + dateLabel(t.t) + ' · ' + (t.mode === 'futures' ? 'Phái sinh' : 'Spot') + '</div></div>' +
        '<div class="th-val">' + money(t.valueVND) + ' ₫</div><div class="th-pnl ' + changeCls(t.pnl || 0) + '">' + (t.pnl ? (t.pnl >= 0 ? '+' : '') + money(t.pnl) + ' ₫' : '—') + '</div></div>';
    }).join('');
  }

  function portfolioHealthHTML() {
    const nw = netWorth() || 1;
    const margin = state.positions.reduce((s, p) => s + p.margin, 0);
    const exposure = positionList().reduce((s, p) => s + p.notionalNow, 0);
    const top = holdingList().sort((a, b) => b.value - a.value)[0];
    const concentration = top ? top.value / (investedValue() || 1) * 100 : 0;
    const marginPct = margin / nw * 100;
    const exposurePct = exposure / nw * 100;
    const cashPct = state.cash / nw * 100;
    const savingsPct = savingsValue() / nw * 100;
    const bufferPct = cashPct + savingsPct;
    return '<div class="risk-meter"><div class="risk-meter-head"><span>Ký quỹ đang dùng</span><b class="' + (marginPct > 25 ? 'down' : 'up') + '">' + nf(marginPct, 1) + '%</b></div><div class="risk-meter-bar"><span style="width:' + clamp(marginPct, 2, 100) + '%"></span></div></div>' +
      '<div class="risk-meter"><div class="risk-meter-head"><span>Tổng đòn bẩy / tài sản</span><b>' + nf(exposurePct, 1) + '%</b></div><div class="risk-meter-bar"><span style="width:' + clamp(exposurePct, 2, 100) + '%"></span></div></div>' +
      '<div class="risk-meter"><div class="risk-meter-head"><span>Tỷ trọng tiền mặt</span><b class="up">' + nf(cashPct, 1) + '%</b></div><div class="risk-meter-bar"><span style="width:' + clamp(cashPct, 2, 100) + '%"></span></div></div>' +
      '<div class="risk-meter"><div class="risk-meter-head"><span>Tiền mặt + tích lũy</span><b class="up">' + nf(bufferPct, 1) + '%</b></div><div class="risk-meter-bar"><span style="width:' + clamp(bufferPct, 2, 100) + '%"></span></div></div>' +
      '<div class="kv-row"><span class="k">Tập trung lớn nhất</span><span class="v">' + (top ? esc(top.asset.symbol) + ' · ' + nf(concentration, 1) + '%' : '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Vị thế mở</span><span class="v">' + state.positions.length + '</span></div>' +
      '<div class="kv-row"><span class="k">Khoản tích lũy</span><span class="v">' + ensureSavings().contracts.length + ' · ' + nf(savingsPct, 1) + '% tài sản</span></div>' +
      '<div class="calc-note">' + (marginPct > 30 ? 'Ký quỹ đang cao. Hãy giảm đòn bẩy hoặc nạp thêm tiền mặt trước khi mở lệnh mới.' : bufferPct < 15 ? 'Đệm tiền mặt mỏng. Cân nhắc giữ thêm quỹ dự phòng trong tích lũy linh hoạt để tránh bán tài sản khi gấp.' : 'Cơ cấu hiện tại nằm trong vùng an toàn. Tiếp tục giữ kỷ luật và đặt cắt lỗ trước khi vào lệnh.') + '</div>';
  }

  function portfolioSavingsHTML() {
    const list = ensureSavings().contracts.slice().sort((a, b) => contractValue(b) - contractValue(a));
    if (!list.length) return '<div class="empty-state"><div class="empty-icon">🏦</div><strong>Chưa có khoản tích lũy</strong><p>Giữ tiền trong tài khoản không sinh lãi. Mở một khoản tiết kiệm linh hoạt hoặc mua vàng theo giá thế giới.</p><button class="btn btn-sm btn-outline-gold" data-nav="#/savings">Mở ngân hàng</button></div>';
    return '<div class="portfolio-savings-list">' + list.slice(0, 4).map(c => {
      const p = savingsProduct(c.productId);
      const cur = c.kind === 'gold' ? nf(c.grams, 3) + ' gam' : (c.currency === 'VND' ? fmtVND(c.principal) : nf(c.principal, 2) + ' ' + c.currency);
      return '<div class="portfolio-savings-row"><span class="psr-icon" style="--pc:' + (p ? p.color : '#f3c56b') + '">' + (p ? p.icon : '🏦') + '</span>' +
        '<div class="psr-body"><b>' + esc(p ? p.name : 'Tích lũy') + '</b><span>' + cur + ' · ' + (c.status === 'matured' ? 'đáo hạn' : c.termDays ? c.termDays + ' ngày' : 'linh hoạt') + '</span></div>' +
        '<div class="psr-val"><b>' + fmtVND(contractValue(c)) + '</b><span class="' + changeCls(contractPnl(c)) + '">' + (contractPnl(c) >= 0 ? '+' : '') + fmtVND(contractPnl(c)) + '</span></div></div>';
    }).join('') + '</div>' + (list.length > 4 ? '<button class="btn btn-xs btn-ghost btn-block" data-nav="#/savings">Xem tất cả ' + list.length + ' khoản</button>' : '');
  }

  function portfolioHTML() {
    const nw = netWorth();
    const pnl = pnlSinceStart();
    const pnlPct = state.capital ? pnl / state.capital * 100 : 0;
    const winRate = state.sells ? state.wins / state.sells * 100 : 0;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('wallet') + ' Danh mục · Tài sản ròng</div><h1>Danh mục của bạn</h1><p class="sub">Mọi tài sản, dòng tiền và rủi ro trong một nơi. Giá cập nhật liên tục, quyết định là của bạn.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/wealth">' + icon('pie') + ' Quản lý tài sản</button><button class="btn btn-ghost btn-sm" data-action="export-csv">' + icon('download') + ' Xuất CSV</button><button class="btn btn-gold btn-sm" data-nav="#/terminal">' + icon('bolt') + ' Giao dịch</button></div></div>' +
      '<section class="portfolio-hero"><div class="portfolio-hero-left"><div class="page-eyebrow">TỔNG TÀI SẢN RÒNG</div><div class="portfolio-value" data-networth-hero data-portfolio-value>' + money(nw) + ' ₫</div>' +
      '<div class="portfolio-sub"><span class="badge ' + (pnl >= 0 ? 'badge-up' : 'badge-down') + '">' + (pnl >= 0 ? '▲' : '▼') + ' ' + fmtPct(pnlPct) + '</span><span class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + ' so với vốn ban đầu</span></div>' +
      '<div class="portfolio-hero-stats"><div><div class="lbl">Tiền mặt</div><div class="val">' + money(state.cash) + ' ₫</div></div><div><div class="lbl">Tích lũy & vàng</div><div class="val" style="color:var(--gold)">' + money(savingsValue()) + ' ₫</div></div><div><div class="lbl">Đã đầu tư</div><div class="val">' + money(investedValue()) + ' ₫</div></div><div><div class="lbl">Lãi thực hiện</div><div class="val ' + changeCls(state.realized) + '">' + (state.realized >= 0 ? '+' : '') + money(state.realized) + ' ₫</div></div></div></div>' +
      '<div class="portfolio-hero-right"><div class="hero-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-privacy">' + icon('eye') + ' Ẩn số dư</button><button class="btn btn-ghost btn-sm" data-action="open-settings">' + icon('settings-sliders') + ' Cài đặt</button></div>' +
      '<div class="pill">' + icon('shield') + ' Tỷ lệ thắng ' + nf(winRate, 1) + '%</div><div class="tiny dim">' + state.sells + ' lệnh bán · ' + state.trades.length + ' giao dịch</div></div></section>' +
      '<div class="portfolio-grid"><div class="dash-col">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('pie') + ' Tài sản đang nắm giữ</div><div class="card-sub">' + holdingList().length + ' khoản đầu tư · giá trực tiếp</div></div><button class="link-more" data-nav="#/markets">Khám phá thị trường ' + icon('chevron-right') + '</button></div>' + holdingsRowsHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Quỹ mở AURELIS</div><div class="card-sub">' + Object.keys(ensureFunds().positions).length + ' quỹ · NAV cập nhật trực tiếp</div></div><button class="link-more" data-nav="#/funds">Quản lý ' + icon('chevron-right') + '</button></div>' + portfolioFundsHTML() + '</section>' +
      '<div data-div-slot="portfolio">' + dividendCardHTML() + '</div>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bank') + ' Tiết kiệm & tích lũy</div><div class="card-sub">' + ensureSavings().contracts.length + ' khoản · lãi suất theo thị trường</div></div><button class="link-more" data-nav="#/savings">Quản lý ' + icon('chevron-right') + '</button></div>' + portfolioSavingsHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('leverage') + ' Vị thế phái sinh</div><div class="card-sub">Long / Short · ký quỹ cách ly</div></div><button class="link-more" data-nav="#/derivatives">Quản lý ' + icon('chevron-right') + '</button></div>' + portfolioPositionsHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Giao dịch gần đây</div><div class="card-sub">30 lệnh mới nhất được ghi lại</div></div><span class="badge">' + state.trades.length + ' lệnh</span></div>' + portfolioHistoryHTML() + '</section>' +
      '</div><aside class="dash-col">' +
      '<section class="card allocation-card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Phân bổ tài sản</div><div class="card-sub">Theo giá trị thị trường</div></div></div>' + allocationHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('candles') + ' Đường cong vốn</div><div class="card-sub">' + (state.equityHistory || []).length + ' điểm dữ liệu</div></div></div><canvas id="portfolioEquity" class="equity-canvas" style="height:168px"></canvas></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Sức khoẻ danh mục</div><div class="card-sub">Cảnh báo rủi ro theo thời gian thực</div></div></div>' + portfolioHealthHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Hiệu suất</div><div class="card-sub">Thống kê từ khi tham gia</div></div></div><div class="performance-stats">' +
      '<div class="perf-stat"><div class="lbl">Lãi chưa thực hiện</div><div class="val ' + changeCls(unrealizedPnl()) + '">' + (unrealizedPnl() >= 0 ? '+' : '') + money(unrealizedPnl()) + ' ₫</div></div>' +
      '<div class="perf-stat"><div class="lbl">Phí đã trả</div><div class="val">' + money(state.feesPaid) + ' ₫</div></div>' +
      '<div class="perf-stat"><div class="lbl">Lệnh thắng</div><div class="val up">' + state.wins + '</div></div>' +
      '<div class="perf-stat"><div class="lbl">Lệnh bán</div><div class="val">' + state.sells + '</div></div>' +
      '<div class="perf-stat"><div class="lbl">Nhóm tài sản</div><div class="val">' + new Set(holdingList().map(h => h.asset.group)).size + '</div></div>' +
      '<div class="perf-stat"><div class="lbl">Tích lũy & vàng</div><div class="val" style="color:var(--gold)">' + money(savingsValue()) + ' ₫</div></div>' +
      '<div class="perf-stat"><div class="lbl">Aura</div><div class="val" style="color:var(--gold)">' + nf(state.aura, 0) + ' ✦</div></div></div></section>' +
      '<section class="card card-gold"><div class="card-head"><div><div class="card-title">' + icon('message') + ' Gợi ý từ Coach AURA</div></div></div>' + coachHTML() + '</section>' +
      '</aside></div>';
  }

  function mountPortfolio() {
    progressQuest('portfolio', 1);
    const canvas = $('#portfolioEquity');
    const eq = state.equityHistory || [];
    if (canvas) CH.MiniChart.line(canvas, eq.map(p => p.v), { baseline: state.capital, formatAxis: v => money(v), xLabels: eq.map(p => dateKey(p.t).slice(0, 5)) });
  }

  function exportPortfolioCSV() {
    const rows = [['Loại', 'Mã', 'Tên', 'Khối lượng', 'Giá vốn/Entry', 'Giá hiện tại', 'Giá trị VND', 'PnL VND']];
    holdingList().forEach(h => rows.push(['Holding', h.asset.symbol, h.asset.name, h.qty, (h.avgVND / valueFactor(h.asset)).toFixed(4), h.asset.price, Math.round(h.value), Math.round(h.pnl)]));
    positionList().forEach(p => rows.push(['Position', p.asset.symbol, p.asset.name, p.qty, p.entry, p.asset.price, Math.round(p.notionalNow), Math.round(p.pnl)]));
    ensureSavings().contracts.forEach(c => {
      const p = savingsProduct(c.productId);
      rows.push(['Savings', p ? p.name : c.productId, c.kind === 'gold' ? nf(c.grams, 4) + ' gam' : c.currency, c.principal, nf(c.rate, 3) + '%', c.status, Math.round(contractValue(c)), Math.round(contractPnl(c))]);
    });
    state.trades.slice(0, 100).forEach(t => { const a = byId[t.assetId]; if (a) rows.push(['Trade', a.symbol, a.name, t.qty, t.price, '', Math.round(t.valueVND || 0), Math.round(t.pnl || 0)]); });
    const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'aurelis-portfolio-' + todayKey() + '.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
    toast('Đã xuất CSV', 'Danh mục và lịch sử giao dịch đã được tải xuống.', 'success', '📥');
  }

  /* ------------------------------ WEALTH MANAGEMENT ------------------------------ */
  const WEALTH_PROFILES = {
    conservative: {
      id: 'conservative', name: 'Thận trọng', icon: '🛡️', color: '#5ac8fa',
      desc: 'Ưu tiên bảo toàn vốn, thu nhập ổn định và thanh khoản cao. Phù hợp mục tiêu ngắn hạn hoặc người mới bắt đầu.',
      target: { cash: 20, bond: 45, stock: 15, fund: 12, gold: 6, crypto: 0, other: 2 }
    },
    balanced: {
      id: 'balanced', name: 'Cân bằng', icon: '⚖️', color: '#f3c56b',
      desc: 'Kết hợp tăng trưởng và phòng thủ. Đây là hồ sơ mặc định phù hợp với phần lớn nhà đầu tư cá nhân.',
      target: { cash: 12, bond: 30, stock: 30, fund: 16, gold: 7, crypto: 3, other: 2 }
    },
    growth: {
      id: 'growth', name: 'Tăng trưởng', icon: '🚀', color: '#2ee6a6',
      desc: 'Chấp nhận biến động để hướng tới tăng trưởng dài hạn. Tỷ trọng cổ phiếu và quỹ chỉ số chiếm ưu thế.',
      target: { cash: 8, bond: 15, stock: 42, fund: 20, gold: 7, crypto: 6, other: 2 }
    },
    aggressive: {
      id: 'aggressive', name: 'Tấn công', icon: '🔥', color: '#ff9f43',
      desc: 'Tối đa hoá tăng trưởng, chấp nhận drawdown lớn. Chỉ phù hợp khi có kỳ hạn dài và quỹ dự phòng vững.',
      target: { cash: 4, bond: 6, stock: 48, fund: 20, gold: 6, crypto: 14, other: 2 }
    }
  };

  const WEALTH_CLASS_LIST = [
    { id: 'cash', name: 'Tiền mặt', icon: 'money', color: '#8fa2aa', desc: 'Dự phòng & cơ hội' },
    { id: 'bond', name: 'Tiết kiệm / trái phiếu', icon: 'bank', color: '#f3c56b', desc: 'Thu nhập cố định' },
    { id: 'stock', name: 'Cổ phiếu', icon: 'candles', color: '#2ee6a6', desc: 'Tăng trưởng dài hạn' },
    { id: 'fund', name: 'ETF & quỹ', icon: 'layers', color: '#6cb8ff', desc: 'Đa dạng hoá chi phí thấp' },
    { id: 'gold', name: 'Vàng', icon: 'star', color: '#c89cff', desc: 'Phòng hộ lạm phát' },
    { id: 'crypto', name: 'Crypto', icon: 'coin', color: '#f7a94b', desc: 'Rủi ro cao, kỳ hạn dài' },
    { id: 'other', name: 'Khác', icon: 'grid', color: '#ff9b8a', desc: 'Forex, hàng hoá, phái sinh' }
  ];

  const WEALTH_QUIZ = [
    {
      q: 'Mục tiêu đầu tư chính của bạn là gì?',
      options: ['Bảo toàn vốn là trên hết', 'Thu nhập ổn định đều đặn', 'Tăng trưởng dài hạn', 'Tối đa hoá lợi nhuận, chấp nhận rủi ro cao']
    },
    {
      q: 'Nếu danh mục giảm 20% trong một tháng, bạn sẽ:',
      options: ['Bán hết để tránh lỗ thêm', 'Giảm tỷ trọng rủi ro', 'Giữ nguyên và chờ phục hồi', 'Mua thêm vì giá đang hấp dẫn']
    },
    {
      q: 'Kỳ hạn đầu tư phù hợp nhất với bạn?',
      options: ['Dưới 1 năm', '1 – 3 năm', '3 – 7 năm', 'Trên 7 năm']
    },
    {
      q: 'Mức lỗ tối đa bạn chấp nhận trong một năm?',
      options: ['Gần như không chấp nhận lỗ', 'Dưới 5%', '5% – 15%', 'Trên 15%']
    },
    {
      q: 'Kinh nghiệm đầu tư của bạn?',
      options: ['Mới bắt đầu, chưa giao dịch', 'Đã giao dịch vài tháng', 'Đã trải qua ít nhất một chu kỳ thị trường', 'Chuyên nghiệp / giao dịch thường xuyên']
    },
    {
      q: 'Nếu có 100 triệu nhàn rỗi, bạn ưu tiên:',
      options: ['Gửi tiết kiệm an toàn', 'Trái phiếu hoặc quỹ cân bằng', 'Cổ phiếu / ETF chỉ số', 'Crypto hoặc sản phẩm đòn bẩy']
    }
  ];

  const WEALTH_DCA_MS = { weekly: 7 * 86400000, monthly: 30 * 86400000 };
  const WEALTH_DCA_MAX = 8;
  const WEALTH_SAVINGS_ASSETS = {
    gold_acc: { id: 'gold_acc', productId: 'gold_acc', symbol: 'GOLD', name: 'Tích lũy vàng', group: 'savings', currency: 'VND', decimals: 0, icon: '🪙', color: '#f3c56b', vehicle: 'gold' },
    vnd_flex: { id: 'vnd_flex', productId: 'vnd_flex', symbol: 'VND', name: 'Tích lũy linh hoạt', group: 'savings', currency: 'VND', decimals: 0, icon: '💧', color: '#2ee6a6', vehicle: 'cash' }
  };

  function wealthAssetClass(asset) {
    if (!asset) return 'other';
    if (asset.group === 'etf' || asset.group === 'index') return 'fund';
    if (asset.group === 'crypto') return 'crypto';
    if (asset.id === 'xauusd' || asset.group === 'gold') return 'gold';
    if (['hose', 'hnx', 'upcom', 'us'].includes(asset.group)) return 'stock';
    return 'other';
  }

  function wealthProfile() {
    const w = ensureWealth();
    return WEALTH_PROFILES[w.risk] || null;
  }

  function wealthQuizScore() {
    const w = ensureWealth();
    const answers = w.quiz.answers || {};
    return WEALTH_QUIZ.reduce((sum, _, i) => sum + (Number.isFinite(Number(answers[i])) ? clamp(Number(answers[i]), 0, 3) : 0), 0);
  }

  function wealthProfileForScore(score) {
    if (score >= 15) return WEALTH_PROFILES.aggressive;
    if (score >= 10) return WEALTH_PROFILES.growth;
    if (score >= 5) return WEALTH_PROFILES.balanced;
    return WEALTH_PROFILES.conservative;
  }

  function wealthTarget() {
    const w = ensureWealth();
    let source = w.target && typeof w.target === 'object' ? w.target : (wealthProfile() || WEALTH_PROFILES.balanced).target;
    const out = {};
    let sum = 0;
    WEALTH_CLASS_LIST.forEach(c => {
      out[c.id] = Math.max(0, Number(source[c.id]) || 0);
      sum += out[c.id];
    });
    if (sum <= 0) return { ...WEALTH_PROFILES.balanced.target };
    if (Math.abs(sum - 100) > 0.5) {
      WEALTH_CLASS_LIST.forEach(c => { out[c.id] = out[c.id] / sum * 100; });
    }
    return out;
  }

  function wealthTargetIsCustom() {
    const w = ensureWealth();
    const profile = wealthProfile();
    if (!w.target || !profile) return false;
    return WEALTH_CLASS_LIST.some(c => Math.abs((Number(w.target[c.id]) || 0) - (profile.target[c.id] || 0)) > 0.5);
  }

  function wealthCurrent() {
    const out = { cash: state.cash, bond: savingsCashValue(), stock: 0, fund: 0, gold: savingsGoldValue(), crypto: 0, other: 0 };
    holdingList().forEach(h => {
      const cls = wealthAssetClass(h.asset);
      out[cls] = (out[cls] || 0) + h.value;
    });
    positionList().forEach(p => { out.other += p.margin + p.pnl; });
    return out;
  }

  function wealthAllocationRows() {
    const cur = wealthCurrent();
    const total = Math.max(1, netWorth());
    const target = wealthTarget();
    return WEALTH_CLASS_LIST.map(c => {
      const value = cur[c.id] || 0;
      const pct = value / total * 100;
      const targetPct = Number(target[c.id]) || 0;
      return {
        ...c, value, pct, targetPct, drift: pct - targetPct,
        delta: (targetPct - pct) / 100 * total
      };
    });
  }

  function wealthLiquidValue() { return state.cash + savingsCashValue(); }

  function wealthMonthlyNeed() {
    return Math.max(5000000, netWorth() * 0.015);
  }

  function wealthScore() {
    const total = Math.max(1, netWorth());
    const cur = wealthCurrent();
    const rows = wealthAllocationRows();
    const liquidMonths = wealthLiquidValue() / wealthMonthlyNeed();
    const emergencyScore = clamp(liquidMonths / 6, 0, 1) * 25;

    const diversified = ['bond', 'stock', 'fund', 'gold', 'crypto'].filter(id => (cur[id] || 0) / total >= 0.03).length;
    const diversifyScore = clamp(diversified / 5, 0, 1) * 15;

    const holdings = holdingList();
    const largest = holdings.length ? Math.max(...holdings.map(h => h.value)) / total * 100 : 0;
    const concentrationScore = 20 - clamp((largest - 15) / 35, 0, 1) * 20;

    const avgDrift = rows.reduce((s, r) => s + Math.abs(r.drift), 0) / rows.length;
    const alignmentScore = clamp(1 - avgDrift / 10, 0, 1) * 20;

    const savingsRatio = savingsValue() / total;
    const savingsScore = clamp(savingsRatio / 0.20, 0, 1) * 10;

    const margin = positionList().reduce((s, p) => s + p.margin, 0);
    const leverageRatio = margin / total;
    const leverageScore = clamp(1 - leverageRatio / 0.25, 0, 1) * 10;

    const score = Math.round(emergencyScore + diversifyScore + concentrationScore + alignmentScore + savingsScore + leverageScore);
    const grade = score >= 85 ? 'Xuất sắc' : score >= 70 ? 'Tốt' : score >= 55 ? 'Khá' : score >= 40 ? 'Cần cải thiện' : 'Rủi ro cao';
    return {
      score: clamp(score, 0, 100), grade, liquidMonths, largest, avgDrift, diversified,
      parts: [
        { label: 'Quỹ khẩn cấp', value: nf(liquidMonths, 1) + ' tháng', score: emergencyScore, max: 25, note: 'Tiền mặt + tích lũy linh hoạt so với chi tiêu ước tính' },
        { label: 'Đa dạng hoá', value: diversified + '/5 nhóm', score: diversifyScore, max: 15, note: 'Số nhóm tài sản chiếm trên 3% danh mục' },
        { label: 'Tập trung', value: nf(largest, 1) + '%', score: concentrationScore, max: 20, note: 'Tỷ trọng tài sản lớn nhất trong danh mục' },
        { label: 'Lệch mục tiêu', value: nf(avgDrift, 1) + ' pp', score: alignmentScore, max: 20, note: 'Mức lệch trung bình so với phân bổ mục tiêu' },
        { label: 'Tỷ lệ tích lũy', value: nf(savingsRatio * 100, 1) + '%', score: savingsScore, max: 10, note: 'Giá trị tiết kiệm & vàng trên tổng tài sản' },
        { label: 'Đòn bẩy', value: nf(leverageRatio * 100, 1) + '%', score: leverageScore, max: 10, note: 'Ký quỹ phái sinh trên tổng tài sản' }
      ]
    };
  }

  function wealthPassiveIncome() {
    let dividend = 0;
    const rows = [];
    holdingList().forEach(h => {
      const yieldPct = Number(D.DIVIDEND_YIELD[h.asset.id]) || 0;
      if (yieldPct <= 0) return;
      const income = h.value * yieldPct / 100;
      dividend += income;
      rows.push({ asset: h.asset, value: h.value, yieldPct, income });
    });
    const savings = ensureSavings().contracts.reduce((sum, c) => {
      if (c.kind === 'gold') return sum;
      return sum + (Number(c.principal) || 0) * (Number(c.rate) || 0) / 100 * savingsFx(c.currency);
    }, 0);
    const total = dividend + savings;
    const nw = Math.max(1, netWorth());
    return {
      dividend, savings, total, monthly: total / 12,
      yieldPct: total / nw * 100,
      coverage: total / 12 / wealthMonthlyNeed() * 100,
      rows: rows.sort((a, b) => b.income - a.income).slice(0, 5)
    };
  }

  function wealthTipList(scoreData) {
    const tips = [];
    if (scoreData.liquidMonths < 3) tips.push({ icon: '🛡️', title: 'Xây quỹ khẩn cấp trước', text: 'Bạn đang có khoảng ' + nf(scoreData.liquidMonths, 1) + ' tháng chi tiêu trong tiền mặt và tích lũy. Mục tiêu hợp lý là 3–6 tháng.' });
    if (scoreData.largest > 30) tips.push({ icon: '🎯', title: 'Giảm rủi ro tập trung', text: 'Một tài sản chiếm ' + nf(scoreData.largest, 1) + '% danh mục. Hãy cân nhắc chốt một phần hoặc bổ sung quỹ chỉ số để phân tán.' });
    if (scoreData.avgDrift > 8) tips.push({ icon: '⚖️', title: 'Tái cân bằng danh mục', text: 'Độ lệch trung bình đang là ' + nf(scoreData.avgDrift, 1) + ' điểm phần trăm. Tái cân bằng giúp đưa rủi ro về đúng hồ sơ đã chọn.' });
    const w = ensureWealth();
    if (!w.dca.some(p => p.active)) tips.push({ icon: '📆', title: 'Bắt đầu DCA', text: 'Một kế hoạch mua đều mỗi tháng giúp giảm áp lực chọn thời điểm và xây kỷ luật đầu tư.' });
    if (!w.goals.length) tips.push({ icon: '🏁', title: 'Gắn mục tiêu với con số', text: 'Hãy tạo ít nhất một mục tiêu tài chính để biết mỗi tháng cần góp bao nhiêu và theo dõi tiến độ.' });
    if (!tips.length) tips.push({ icon: '✅', title: 'Duy trì kỷ luật', text: 'Danh mục đang cân đối tốt. Tiếp tục theo dõi drift, đóng góp định kỳ và tránh thay đổi chiến lược vì tin tức ngắn hạn.' });
    return tips.slice(0, 3);
  }

  function wealthHistoryPush(type, title, text, amount) {
    const w = ensureWealth();
    w.history.unshift({ id: uid('wh'), t: Date.now(), type: type || 'note', title, text, amount: Number(amount) || 0 });
    w.history = w.history.slice(0, 80);
  }

  function wealthDcaAsset(id) {
    return WEALTH_SAVINGS_ASSETS[id] || byId[id] || null;
  }

  function wealthDcaUniverse() {
    const list = D.ASSETS.filter(a => a.tradable && ['hose', 'hnx', 'upcom', 'us', 'etf', 'crypto'].includes(a.group));
    return list.concat([WEALTH_SAVINGS_ASSETS.gold_acc, WEALTH_SAVINGS_ASSETS.vnd_flex]);
  }

  function wealthDcaUnitVND(asset) {
    if (!asset) return 0;
    if (asset.id === 'gold_acc') return goldBuyVND();
    if (asset.id === 'vnd_flex') return 1;
    return asset.price * valueFactor(asset);
  }

  function wealthDcaPriceLabel(asset) {
    if (!asset) return '—';
    if (asset.id === 'gold_acc') return fmtVND(goldBuyVND()) + '/gam';
    if (asset.id === 'vnd_flex') return '1 ₫ = 1 ₫';
    return fmtPrice(asset) + ' ' + priceUnit(asset);
  }

  function wealthDcaNextLabel(ts) {
    if (!ts) return '—';
    const diff = Number(ts) - Date.now();
    if (diff <= 0) return 'Đến hạn';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff % 86400000 / 3600000);
    const m = Math.max(1, Math.floor(diff % 3600000 / 60000));
    if (d > 0) return d + ' ngày ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + ' phút';
  }

  function wealthDcaFrequency(plan) {
    return plan.freq === 'weekly' ? 'tuần' : 'tháng';
  }

  function wealthDcaMinNote(asset) {
    if (!asset) return '';
    if (asset.id === 'gold_acc') return 'Tối thiểu 200.000 ₫ mỗi kỳ.';
    if (asset.id === 'vnd_flex') return 'Tối thiểu 100.000 ₫ mỗi kỳ.';
    if (['hose', 'hnx', 'upcom'].includes(asset.group)) return 'Lô tối thiểu 100 cổ phần — cần ít nhất ' + fmtVND(asset.price * 100) + ' mỗi kỳ.';
    return 'Mua theo đơn vị nhỏ nhất: ' + fmtQty(asset, stepFor(asset)) + ' ' + esc(asset.unit || 'đơn vị') + '.';
  }

  function wealthDcaOptions(selected) {
    const groups = [
      ['hose', 'Việt Nam · HOSE'],
      ['hnx', 'Việt Nam · HNX'],
      ['upcom', 'Việt Nam · UPCoM'],
      ['us', 'Hoa Kỳ · Cổ phiếu'],
      ['etf', 'ETF & quỹ chỉ số'],
      ['crypto', 'Crypto'],
      ['savings', 'Tích lũy & vàng']
    ];
    let html = '';
    groups.forEach(([g, label]) => {
      const items = g === 'savings'
        ? [WEALTH_SAVINGS_ASSETS.vnd_flex, WEALTH_SAVINGS_ASSETS.gold_acc]
        : D.ASSETS.filter(a => a.tradable && a.group === g);
      if (!items.length) return;
      html += '<optgroup label="' + label + '">' + items.map(a =>
        '<option value="' + a.id + '"' + (a.id === selected ? ' selected' : '') + '>' + esc(a.symbol) + ' · ' + esc(a.name) + '</option>').join('') + '</optgroup>';
    });
    return html;
  }

  function wealthHeroHTML() {
    const nw = netWorth();
    const score = wealthScore();
    const passive = wealthPassiveIncome();
    const profile = wealthProfile();
    const w = ensureWealth();
    const activeDca = w.dca.filter(p => p.active).length;
    const pnl = nw - state.capital;
    const pnlPct = state.capital ? pnl / state.capital * 100 : 0;
    return '<section class="wealth-hero" id="wealthHero"><div class="wealth-hero-main"><div class="page-eyebrow">TỔNG TÀI SẢN RÒNG</div>' +
      '<div class="wealth-hero-value">' + money(nw) + ' ₫</div>' +
      '<div class="wealth-hero-sub"><span class="badge ' + (pnl >= 0 ? 'badge-up' : 'badge-down') + '">' + (pnl >= 0 ? '▲' : '▼') + ' ' + fmtPct(pnlPct) + '</span>' +
      '<span class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + ' so với vốn ban đầu</span>' +
      (profile ? '<span class="wealth-profile-pill" style="--pc:' + profile.color + '">' + profile.icon + ' ' + esc(profile.name) + '</span>' : '<span class="wealth-profile-pill muted">Chưa xác định hồ sơ</span>') + '</div>' +
      '<div class="wealth-hero-stats">' +
      '<div><span>Tiền mặt</span><b>' + money(state.cash) + ' ₫</b></div>' +
      '<div><span>Tích lũy & vàng</span><b style="color:var(--gold)">' + money(savingsValue()) + ' ₫</b></div>' +
      '<div><span>Thu nhập thụ động / năm</span><b class="up">' + money(passive.total) + ' ₫</b></div>' +
      '<div><span>Kế hoạch DCA</span><b>' + activeDca + ' đang chạy</b></div></div></div>' +
      '<div class="wealth-score-ring" style="--score:' + score.score + '"><div class="wealth-score-inner"><b>' + score.score + '</b><span>/100</span><em>' + esc(score.grade) + '</em></div></div>' +
      '<div class="wealth-hero-side"><div class="wealth-side-row"><span>Quỹ khẩn cấp</span><b>' + nf(score.liquidMonths, 1) + ' tháng</b></div>' +
      '<div class="wealth-side-row"><span>Độ lệch mục tiêu</span><b>' + nf(score.avgDrift, 1) + ' pp</b></div>' +
      '<div class="wealth-side-row"><span>Tài sản lớn nhất</span><b>' + nf(score.largest, 1) + '%</b></div>' +
      '<div class="wealth-side-row"><span>Đòn bẩy / tài sản</span><b>' + nf(positionList().reduce((s, p) => s + p.margin, 0) / Math.max(1, nw) * 100, 1) + '%</b></div>' +
      '<div class="wealth-hero-actions"><button class="btn btn-gold btn-sm" data-action="wealth-rebalance">' + icon('scale') + ' Tái cân bằng</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="wealth-target-edit">' + icon('pie') + ' Mục tiêu</button></div></div></section>';
  }

  function wealthQuizHTML() {
    const w = ensureWealth();
    const done = !!(w.risk && w.quiz.at);
    const score = wealthQuizScore();
    const profile = wealthProfile() || wealthProfileForScore(score);
    if (done) {
      return '<section class="card wealth-quiz-card" id="wealthQuiz"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Hồ sơ rủi ro</div><div class="card-sub">Bài kiểm tra 6 câu · cập nhật ' + timeAgo(w.quiz.at) + '</div></div><span class="badge badge-gold">' + score + '/18</span></div>' +
        '<div class="wealth-profile-result" style="--pc:' + profile.color + '"><span class="wealth-profile-icon">' + profile.icon + '</span><div><b>' + esc(profile.name) + '</b><span>' + esc(profile.desc) + '</span></div></div>' +
        '<div class="wealth-profile-target">' + WEALTH_CLASS_LIST.filter(c => profile.target[c.id] > 0).map(c =>
          '<div><span class="dot" style="background:' + c.color + '"></span><span>' + esc(c.name) + '</span><b>' + nf(profile.target[c.id], 0) + '%</b></div>').join('') + '</div>' +
        (wealthTargetIsCustom() ? '<div class="wealth-custom-note">' + icon('settings-sliders') + ' Bạn đang dùng mục tiêu phân bổ tuỳ chỉnh.</div>' : '') +
        '<div class="wealth-quiz-actions"><button class="btn btn-xs btn-ghost" data-action="wealth-quiz-retake">Làm lại bài kiểm tra</button><button class="btn btn-xs btn-ghost" data-action="wealth-target-edit">Chỉnh mục tiêu</button></div></section>';
    }
    return '<section class="card wealth-quiz-card" id="wealthQuiz"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Hồ sơ rủi ro của bạn</div><div class="card-sub">6 câu hỏi ngắn để xác định phân bổ phù hợp</div></div><span class="badge">2 phút</span></div>' +
      '<div class="wealth-quiz-intro">Không có một danh mục tốt cho tất cả. Hồ sơ rủi ro giúp bạn chọn tỷ trọng tài sản, mức drawdown chấp nhận và kỷ luật tái cân bằng.</div>' +
      '<div class="wealth-quiz-list">' + WEALTH_QUIZ.map((q, qi) =>
        '<div class="wealth-quiz-q" data-wealth-q="' + qi + '"><b>' + (qi + 1) + '. ' + esc(q.q) + '</b><div class="wealth-quiz-opts">' +
        q.options.map((opt, oi) => '<label class="wealth-quiz-opt"><input type="radio" name="wq' + qi + '" value="' + oi + '"><span>' + esc(opt) + '</span></label>').join('') + '</div></div>').join('') + '</div>' +
      '<button class="btn btn-gold btn-block" data-action="wealth-quiz-submit">' + icon('target') + ' Xem hồ sơ rủi ro</button>' +
      '<div class="wealth-quiz-note">Kết quả chỉ là hướng dẫn trong game, không phải khuyến nghị đầu tư cá nhân.</div></section>';
  }

  function wealthAllocationHTML() {
    const rows = wealthAllocationRows();
    const total = Math.max(1, netWorth());
    const segs = rows.filter(r => r.pct > 0.05).map(r => '<span style="width:' + r.pct.toFixed(2) + '%;background:' + r.color + '"></span>').join('');
    return '<section class="card" id="wealthAllocation"><div class="card-head"><div><div class="card-title">' + icon('pie') + ' Phân bổ hiện tại & mục tiêu</div><div class="card-sub">' + fmtVND(total) + ' · ' + rows.filter(r => r.value > 0).length + ' nhóm tài sản đang nắm giữ</div></div><div class="card-toolbar"><button class="btn btn-xs btn-ghost" data-action="wealth-target-edit">' + icon('settings-sliders') + ' Sửa mục tiêu</button></div></div>' +
      '<div class="wealth-alloc-bar">' + segs + '</div>' +
      '<div class="wealth-alloc-list">' + rows.map(r => {
        const driftCls = Math.abs(r.drift) > 8 ? 'warn' : Math.abs(r.drift) > 3 ? 'soft' : 'ok';
        const deltaText = Math.abs(r.delta) < 100000 ? 'Cân bằng' : (r.delta > 0 ? 'Cần thêm ' + money(r.delta) + ' ₫' : 'Cần giảm ' + money(-r.delta) + ' ₫');
        return '<div class="wealth-alloc-row"><div class="wealth-alloc-label"><span class="wealth-alloc-dot" style="background:' + r.color + '"></span><div><b>' + esc(r.name) + '</b><span>' + esc(r.desc) + '</span></div></div>' +
          '<div class="wealth-alloc-track"><span class="wealth-alloc-fill" style="width:' + clamp(r.pct, 0, 100).toFixed(2) + '%;background:' + r.color + '"></span><span class="wealth-alloc-target" style="left:' + clamp(r.targetPct, 0, 100).toFixed(2) + '%" title="Mục tiêu ' + nf(r.targetPct, 1) + '%"></span></div>' +
          '<div class="wealth-alloc-nums"><b>' + nf(r.pct, 1) + '%</b><span>mục tiêu ' + nf(r.targetPct, 1) + '%</span><em class="wealth-drift ' + driftCls + '">' + signed(r.drift, 1) + ' pp</em></div>' +
          '<div class="wealth-alloc-delta ' + (r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : '') + '">' + deltaText + '</div></div>';
      }).join('') + '</div>' +
      '<div class="wealth-alloc-legend"><span>' + icon('info') + ' Thanh sáng là tỷ trọng hiện tại, vạch dọc là mục tiêu. Drift càng lớn càng nên tái cân bằng.</span></div></section>';
  }

  function wealthDcaHTML() {
    const w = ensureWealth();
    const plans = w.dca;
    const first = plans.length ? plans[0].assetId : 'voo';
    return '<section class="card" id="wealthDca"><div class="card-head"><div><div class="card-title">' + icon('calendar') + ' DCA — Mua đều định kỳ</div><div class="card-sub">Tự động mua theo tuần hoặc tháng · ' + plans.filter(p => p.active).length + ' kế hoạch đang chạy</div></div><span class="badge ' + (w.autoDca ? 'badge-live' : '') + '">' + (w.autoDca ? 'TỰ ĐỘNG' : 'TẠM DỪNG') + '</span></div>' +
      '<div class="wealth-dca-form"><div class="field"><label class="field-label" for="wealthDcaAsset">Tài sản</label><select class="select" id="wealthDcaAsset">' + wealthDcaOptions(first) + '</select></div>' +
      '<div class="field"><label class="field-label" for="wealthDcaAmount">Số tiền mỗi kỳ <span class="hint">VND</span></label><input class="input mono" id="wealthDcaAmount" type="number" min="100000" step="100000" value="5000000"></div>' +
      '<div class="field"><label class="field-label" for="wealthDcaFreq">Tần suất</label><select class="select" id="wealthDcaFreq"><option value="monthly">Hàng tháng</option><option value="weekly">Hàng tuần</option></select></div>' +
      '<button class="btn btn-gold btn-sm" data-action="wealth-dca-add">' + icon('play') + ' Tạo kế hoạch</button></div>' +
      '<div class="wealth-dca-hint" id="wealthDcaHint">' + wealthDcaMinNote(wealthDcaAsset(first)) + '</div>' +
      (plans.length ? '<div class="wealth-dca-list">' + plans.map(plan => {
        const asset = wealthDcaAsset(plan.assetId);
        if (!asset) return '';
        const isSavings = !!asset.vehicle;
        const qtyText = isSavings
          ? (asset.vehicle === 'gold' ? nf(plan.qty, 4) + ' gam' : fmtVND(plan.qty))
          : fmtQty(asset, plan.qty) + ' ' + esc(asset.unit || asset.symbol);
        return '<div class="wealth-dca-row ' + (plan.active ? '' : 'paused') + '"><span class="wealth-dca-icon" style="--pc:' + (asset.color || 'var(--gold)') + '">' + (isSavings ? asset.icon : esc(asset.symbol.slice(0, 3))) + '</span>' +
          '<div class="wealth-dca-main"><b>' + esc(asset.symbol) + ' · ' + esc(asset.name) + '</b><span>' + fmtVND(plan.amount) + ' / ' + wealthDcaFrequency(plan) + ' · kỳ tới <em data-dca-next="' + plan.id + '">' + wealthDcaNextLabel(plan.nextAt) + '</em></span></div>' +
          '<div class="wealth-dca-stats"><b>' + plan.executions + ' kỳ</b><span>' + fmtVND(plan.invested) + '</span><span>' + qtyText + '</span></div>' +
          '<div class="wealth-dca-actions"><button class="btn btn-xs btn-ghost" data-action="wealth-dca-run" data-id="' + plan.id + '">Chạy ngay</button>' +
          '<button class="btn btn-xs btn-ghost" data-action="wealth-dca-toggle" data-id="' + plan.id + '">' + (plan.active ? 'Tạm dừng' : 'Tiếp tục') + '</button>' +
          '<button class="btn btn-xs btn-ghost danger" data-action="wealth-dca-delete" data-id="' + plan.id + '">Xoá</button></div></div>';
      }).join('') + '</div>' : '<div class="empty-state wealth-dca-empty"><div class="empty-icon">📆</div><strong>Chưa có kế hoạch DCA</strong><p>Mua đều mỗi tháng giúp giảm áp lực chọn thời điểm và xây dựng kỷ luật đầu tư dài hạn.</p></div>') +
      '<div class="wealth-dca-foot"><label class="check"><input type="checkbox" id="wealthAutoDca"' + (w.autoDca ? ' checked' : '') + '> Tự động chạy khi đến hạn</label><span>' + icon('info') + ' Các kỳ bị lỡ sẽ được xử lý tối đa 3 lần khi mở lại ứng dụng.</span></div></section>';
  }

  function wealthGoalsHTML() {
    const w = ensureWealth();
    const goals = w.goals;
    return '<section class="card" id="wealthGoals"><div class="card-head"><div><div class="card-title">' + icon('target') + ' Mục tiêu tài chính</div><div class="card-sub">' + goals.length + ' mục tiêu · theo dõi tiến độ và số tiền cần góp mỗi tháng</div></div><button class="btn btn-xs btn-gold" data-action="wealth-goal-open">' + icon('plus') + ' Thêm mục tiêu</button></div>' +
      (goals.length ? '<div class="wealth-goal-grid">' + goals.map(g => {
        const pct = clamp(g.saved / g.target * 100, 0, 100);
        const left = Math.max(0, g.target - g.saved);
        const monthsLeft = g.monthly > 0 ? Math.ceil(left / g.monthly) : null;
        const done = g.saved >= g.target;
        return '<article class="wealth-goal ' + (done ? 'done' : '') + '"><div class="wealth-goal-head"><span class="wealth-goal-icon">' + esc(g.icon || '🎯') + '</span><div><b>' + esc(g.name) + '</b><span>' + (done ? 'Đã hoàn thành' : 'Kế hoạch ' + g.months + ' tháng') + '</span></div><em>' + nf(pct, 0) + '%</em></div>' +
          '<div class="wealth-goal-bar"><span style="width:' + pct.toFixed(1) + '%"></span></div>' +
          '<div class="wealth-goal-nums"><div><span>Đã tích lũy</span><b>' + fmtVND(g.saved) + '</b></div><div><span>Mục tiêu</span><b>' + fmtVND(g.target) + '</b></div></div>' +
          '<div class="wealth-goal-meta"><span>' + icon('calendar') + ' ' + (done ? 'Hoàn thành' : monthsLeft != null ? '~' + monthsLeft + ' tháng nữa' : 'Chưa có kế hoạch góp') + '</span><span>' + icon('money') + ' ' + fmtVND(g.monthly) + '/tháng</span></div>' +
          '<div class="wealth-goal-actions"><button class="btn btn-xs btn-gold" data-action="wealth-goal-contribute-open" data-id="' + g.id + '">Góp thêm</button><button class="btn btn-xs btn-ghost danger" data-action="wealth-goal-delete" data-id="' + g.id + '">Xoá</button></div></article>';
      }).join('') + '</div>' : '<div class="empty-state"><div class="empty-icon">🏁</div><strong>Chưa có mục tiêu nào</strong><p>Một mục tiêu cụ thể giúp bạn biết cần góp bao nhiêu mỗi tháng và tránh rút vốn đầu tư quá sớm.</p><button class="btn btn-sm btn-outline-gold" data-action="wealth-goal-open">Tạo mục tiêu đầu tiên</button></div>') + '</section>';
  }

  function wealthRebalanceHTML() {
    const plan = wealthRebalancePlan();
    return '<section class="card" id="wealthRebalance"><div class="card-head"><div><div class="card-title">' + icon('scale') + ' Tái cân bằng danh mục</div><div class="card-sub">Thu hẹp khoảng cách giữa tỷ trọng hiện tại và mục tiêu</div></div><span class="badge ' + (plan.rows.length ? 'badge-gold' : 'badge-up') + '">' + (plan.rows.length ? plan.rows.length + ' lệnh đề xuất' : 'ĐANG CÂN BẰNG') + '</span></div>' +
      (plan.rows.length ? '<div class="wealth-rebalance-summary"><div><span>Tổng tài sản</span><b>' + fmtVND(plan.total) + '</b></div><div><span>Tiền mặt sau tái cân bằng</span><b>' + fmtVND(plan.cashAfter) + '</b></div><div><span>Mục tiêu tiền mặt</span><b>' + fmtVND(plan.cashFloor) + '</b></div></div>' +
        '<div class="wealth-rebalance-list">' + plan.rows.map(row => '<div class="wealth-rebalance-row ' + row.kind + '"><span class="wealth-rebalance-tag">' + (row.kind === 'sell' ? 'BÁN' : row.kind === 'buy' ? 'MUA' : 'NẠP') + '</span>' +
          '<div class="wealth-rebalance-main"><b>' + esc(row.title) + '</b><span>' + esc(row.detail) + '</span></div><div class="wealth-rebalance-amount">' + fmtVND(row.amount) + '</div></div>').join('') + '</div>' +
        '<div class="wealth-rebalance-actions"><button class="btn btn-gold btn-sm" data-action="wealth-rebalance">' + icon('scale') + ' Thực hiện tái cân bằng</button><button class="btn btn-ghost btn-sm" data-action="wealth-rebalance-refresh">' + icon('refresh') + ' Tính lại</button></div>' +
        '<div class="wealth-rebalance-note">' + icon('info') + ' Lệnh được khớp theo giá hiện tại, đã tính phí và thuế bán. Phần chênh lệch còn lại có thể do lô tối thiểu hoặc tài sản không giao dịch được.</div>'
        : '<div class="empty-state"><div class="empty-icon">⚖️</div><strong>Danh mục đang gần mục tiêu</strong><p>Không có lệnh nào cần thực hiện. Tiếp tục theo dõi drift và tái cân bằng khi lệch trên 5–10 điểm phần trăm.</p><button class="btn btn-sm btn-ghost" data-action="wealth-rebalance-refresh">Tính lại</button></div>') + '</section>';
  }

  function wealthHealthHTML() {
    const score = wealthScore();
    return '<section class="card" id="wealthHealth"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Sức khoẻ tài chính</div><div class="card-sub">6 chỉ số · điểm càng cao càng vững</div></div><span class="badge ' + (score.score >= 70 ? 'badge-up' : score.score >= 50 ? 'badge-gold' : 'badge-down') + '">' + score.score + '/100</span></div>' +
      '<div class="wealth-health-grade"><b>' + esc(score.grade) + '</b><span>' + (score.score >= 70 ? 'Nền tảng tốt, tiếp tục duy trì kỷ luật.' : 'Có vài điểm cần cải thiện trước khi tăng rủi ro.') + '</span></div>' +
      '<div class="wealth-health-list">' + score.parts.map(p => '<div class="wealth-health-row"><div class="wealth-health-head"><span>' + esc(p.label) + '</span><b>' + esc(p.value) + '</b></div><div class="wealth-health-bar"><span style="width:' + (p.score / p.max * 100).toFixed(1) + '%"></span></div><div class="wealth-health-note">' + esc(p.note) + '</div></div>').join('') + '</div></section>';
  }

  function wealthPassiveHTML() {
    const passive = wealthPassiveIncome();
    return '<section class="card" id="wealthPassive"><div class="card-head"><div><div class="card-title">' + icon('money') + ' Thu nhập thụ động</div><div class="card-sub">Cổ tức ước tính + lãi tiết kiệm · không phải cam kết thực tế</div></div><span class="badge badge-gold">' + nf(passive.yieldPct, 2) + '%/năm</span></div>' +
      '<div class="wealth-passive-main"><div><span>Mỗi năm</span><b>' + fmtVND(passive.total) + '</b></div><div><span>Mỗi tháng</span><b>' + fmtVND(passive.monthly) + '</b></div></div>' +
      '<div class="wealth-passive-grid"><div><span>Cổ tức cổ phiếu / ETF</span><b>' + fmtVND(passive.dividend) + '</b></div><div><span>Lãi tiết kiệm</span><b>' + fmtVND(passive.savings) + '</b></div>' +
      '<div><span>Trang trải chi tiêu</span><b>' + nf(passive.coverage, 1) + '%</b></div><div><span>Yield trên tài sản</span><b>' + nf(passive.yieldPct, 2) + '%</b></div></div>' +
      (passive.rows.length ? '<div class="wealth-passive-list">' + passive.rows.map(r => '<div class="wealth-passive-row"><span class="wealth-passive-sym">' + esc(r.asset.symbol) + '</span><div><b>' + esc(r.asset.name) + '</b><span>' + nf(r.yieldPct, 2) + '% cổ tức ước tính</span></div><em>+' + money(r.income) + ' ₫/năm</em></div>').join('') + '</div>' : '<div class="wealth-passive-empty">Thêm cổ phiếu trả cổ tức hoặc tiết kiệm có lãi để bắt đầu tạo dòng tiền thụ động.</div>') +
      '<div class="wealth-passive-note">' + icon('info') + ' Tỷ suất cổ tức là giả định mô phỏng theo từng mã, không phản ánh cổ tức thực tế sắp chi trả.</div></section>';
  }

  function wealthTipsHTML() {
    const score = wealthScore();
    const tips = wealthTipList(score);
    return '<section class="card card-gold" id="wealthTips"><div class="card-head"><div><div class="card-title">' + icon('message') + ' Coach AURA · Quản lý tài sản</div><div class="card-sub">Gợi ý dựa trên danh mục hiện tại</div></div></div><div class="wealth-tip-list">' +
      tips.map(t => '<div class="wealth-tip"><span>' + t.icon + '</span><div><b>' + esc(t.title) + '</b><p>' + esc(t.text) + '</p></div></div>').join('') + '</div></section>';
  }

  function wealthHistoryHTML() {
    const w = ensureWealth();
    const icons = { dca: '📆', 'dca-pause': '⏸️', rebalance: '⚖️', goal: '🏁', quiz: '🛡️', target: '🎯', note: '✦' };
    return '<section class="card" id="wealthHistory"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Nhật ký quản lý tài sản</div><div class="card-sub">' + w.history.length + ' hoạt động gần nhất</div></div></div>' +
      (w.history.length ? '<div class="wealth-history-list">' + w.history.slice(0, 8).map(h => '<div class="wealth-history-row"><span class="wealth-history-icon">' + (icons[h.type] || '✦') + '</span><div><b>' + esc(h.title) + '</b><span>' + esc(h.text) + '</span></div><em>' + timeAgo(h.t) + '</em></div>').join('') + '</div>' : '<div class="empty-state"><div class="empty-icon">🧭</div><strong>Chưa có hoạt động</strong><p>Bài kiểm tra rủi ro, DCA, mục tiêu và tái cân bằng sẽ được ghi lại tại đây.</p></div>') + '</section>';
  }

  function wealthHTML() {
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('pie') + ' Quản lý tài sản · Kế hoạch dài hạn</div><h1>Quản lý tài sản cá nhân</h1>' +
      '<p class="sub">Xác định hồ sơ rủi ro, phân bổ mục tiêu, mua đều định kỳ, theo dõi mục tiêu và tái cân bằng danh mục. Tất cả trên vốn ảo, với dữ liệu thị trường thật khi có thể.</p></div>' +
      '<div class="head-actions"><span class="status-pill ' + (sourceMode() === 'live' ? 'live' : 'demo') + '"><span class="dot"></span>' + (sourceMode() === 'live' ? 'Dữ liệu trực tiếp' : 'Mô phỏng') + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="wealth-target-edit">' + icon('target') + ' Mục tiêu phân bổ</button>' +
      '<button class="btn btn-gold btn-sm" data-action="wealth-rebalance">' + icon('scale') + ' Tái cân bằng</button></div></div>' +
      wealthHeroHTML() +
      '<div class="wealth-grid"><div class="wealth-col">' + wealthAllocationHTML() + wealthDcaHTML() + wealthGoalsHTML() + wealthRebalanceHTML() + '</div>' +
      '<aside class="wealth-col">' + wealthQuizHTML() + wealthHealthHTML() + wealthPassiveHTML() + wealthTipsHTML() + wealthHistoryHTML() + '</aside></div>';
  }

  function wealthRebalanceAsset(cls) {
    if (cls === 'stock') return byId.vcb || D.ASSETS.find(a => a.tradable && a.group === 'hose') || null;
    if (cls === 'fund') return byId.voo || D.ASSETS.find(a => a.tradable && a.group === 'etf') || null;
    if (cls === 'crypto') return byId.btc || D.ASSETS.find(a => a.tradable && a.group === 'crypto') || null;
    const existing = holdingList().filter(h => wealthAssetClass(h.asset) === cls).sort((a, b) => b.value - a.value)[0];
    return existing ? existing.asset : null;
  }

  function wealthClassLabel(cls) {
    const info = WEALTH_CLASS_LIST.find(c => c.id === cls);
    return info ? info.name : cls;
  }

  function wealthRebalancePlan() {
    const total = Math.max(0, netWorth());
    const cur = wealthCurrent();
    const target = wealthTarget();
    const desired = {};
    WEALTH_CLASS_LIST.forEach(c => { desired[c.id] = total * (target[c.id] || 0) / 100; });
    const plan = { total, cashAfter: state.cash, cashFloor: desired.cash, rows: [], sells: [], buys: [], savings: [] };

    ['stock', 'fund', 'crypto', 'gold'].forEach(cls => {
      let excess = (cur[cls] || 0) - desired[cls];
      if (excess <= Math.max(100000, total * 0.002)) return;
      const holdings = holdingList().filter(h => wealthAssetClass(h.asset) === cls).sort((a, b) => b.value - a.value);
      holdings.forEach(h => {
        if (excess <= 0) return;
        const unit = h.asset.price * valueFactor(h.asset);
        if (!(unit > 0)) return;
        let qty = roundQty(h.asset, Math.min(h.qty, excess / unit));
        if (qty <= 0) {
          if (h.qty <= stepFor(h.asset) && excess >= h.value) qty = h.qty;
          else return;
        }
        const notional = notionalVND(h.asset, h.asset.price, qty);
        const fee = notional * feeRate(h.asset, 'spot', 'sell');
        const tax = ['hose', 'hnx', 'upcom'].includes(h.asset.group) ? notional * 0.001 : 0;
        const proceeds = notional - fee - tax;
        plan.sells.push({ asset: h.asset, qty, notional, proceeds, cls });
        plan.rows.push({ kind: 'sell', title: 'Bán ' + h.asset.symbol, detail: fmtQty(h.asset, qty) + ' ' + (h.asset.unit || 'đơn vị') + ' · ' + wealthClassLabel(cls), amount: notional });
        plan.cashAfter += proceeds;
        excess -= notional;
      });
    });

    let available = Math.max(0, plan.cashAfter - plan.cashFloor);
    const bondNeed = Math.max(0, desired.bond - (cur.bond || 0));
    if (bondNeed > 0 && available >= 100000) {
      const amount = Math.floor(Math.min(bondNeed, available) / 100000) * 100000;
      if (amount >= 100000) {
        plan.savings.push({ productId: 'vnd_flex', amount, cls: 'bond' });
        plan.rows.push({ kind: 'deposit', title: 'Nạp tích lũy linh hoạt', detail: 'Tăng tỷ trọng tiết kiệm / trái phiếu', amount });
        available -= amount;
        plan.cashAfter -= amount;
      }
    }

    const goldNeed = Math.max(0, desired.gold - (cur.gold || 0));
    if (goldNeed > 0 && available >= 200000) {
      const amount = Math.floor(Math.min(goldNeed, available) / 100000) * 100000;
      if (amount >= 200000) {
        plan.savings.push({ productId: 'gold_acc', amount, cls: 'gold' });
        plan.rows.push({ kind: 'deposit', title: 'Mua vàng tích lũy', detail: 'Tăng tỷ trọng vàng phòng hộ', amount });
        available -= amount;
        plan.cashAfter -= amount;
      }
    }

    const deficits = ['stock', 'fund', 'crypto']
      .map(cls => ({ cls, need: Math.max(0, desired[cls] - (cur[cls] || 0)) }))
      .filter(d => d.need > 0);
    const totalNeed = deficits.reduce((s, d) => s + d.need, 0);
    if (available > 100000 && totalNeed > 0) {
      const budget = available;
      deficits.forEach(d => {
        const asset = wealthRebalanceAsset(d.cls);
        if (!asset || !asset.tradable) return;
        const amount = Math.min(d.need, budget * d.need / totalNeed);
        const unit = asset.price * valueFactor(asset);
        if (!(unit > 0)) return;
        const qty = roundQty(asset, amount / unit);
        if (!(qty > 0)) return;
        const notional = notionalVND(asset, asset.price, qty);
        const cost = notional * (1 + feeRate(asset, 'spot', 'buy'));
        if (cost > plan.cashAfter) return;
        plan.buys.push({ asset, qty, notional, cls: d.cls });
        plan.rows.push({ kind: 'buy', title: 'Mua ' + asset.symbol, detail: fmtQty(asset, qty) + ' ' + (asset.unit || 'đơn vị') + ' · ' + wealthClassLabel(d.cls), amount: notional });
        plan.cashAfter -= cost;
      });
    }
    return plan;
  }

  function executeWealthRebalance() {
    const plan = wealthRebalancePlan();
    if (!plan.rows.length) return toast('Danh mục đang cân bằng', 'Không có lệnh nào cần thực hiện theo mục tiêu hiện tại.', 'info', '⚖️');
    const failures = [];
    plan.sells.forEach(x => {
      const res = executeSpot(x.asset, 'sell', x.qty, x.asset.price, { kind: 'rebalance' });
      if (!res.ok) failures.push(x.asset.symbol + ': ' + res.error);
    });
    plan.savings.forEach(x => {
      const res = depositSavings(x.productId, x.amount, false, { silent: true, note: 'Tái cân bằng danh mục' });
      if (!res.ok) failures.push(wealthClassLabel(x.cls) + ': ' + res.error);
    });
    plan.buys.forEach(x => {
      const res = executeSpot(x.asset, 'buy', x.qty, x.asset.price, { kind: 'rebalance' });
      if (!res.ok) failures.push(x.asset.symbol + ': ' + res.error);
    });
    const w = ensureWealth();
    w.rebalances = (w.rebalances || 0) + 1;
    w.lastRebalance = Date.now();
    const okCount = plan.rows.length - failures.length;
    wealthHistoryPush('rebalance', 'Tái cân bằng danh mục', okCount + '/' + plan.rows.length + ' lệnh thành công', 0);
    saveNow();
    updateShell();
    renderRoute();
    if (okCount > 0) {
      toast('Đã tái cân bằng', okCount + ' lệnh được khớp theo mục tiêu ' + (wealthProfile() ? wealthProfile().name : 'phân bổ'), 'success', '⚖️');
      confetti(30);
    }
    if (failures.length) toast('Một số lệnh chưa khớp', failures.slice(0, 3).join(' · '), 'error', '⚠️');
  }

  function runWealthDcaPlan(plan, manual) {
    const asset = wealthDcaAsset(plan.assetId);
    if (!asset) return { ok: false, error: 'Tài sản không còn khả dụng.' };
    if (!(plan.amount > 0)) return { ok: false, error: 'Số tiền DCA không hợp lệ.' };
    if (plan.amount > state.cash) return { ok: false, error: 'Không đủ tiền mặt cho kỳ DCA ' + fmtVND(plan.amount) + '.' };
    let qty = 0;
    if (asset.vehicle) {
      const res = depositSavings(asset.productId, plan.amount, false, { silent: true, note: 'DCA định kỳ' });
      if (!res.ok) return res;
      qty = asset.vehicle === 'gold' ? (res.contract.grams || 0) : (res.contract.principal || 0);
    } else {
      const unit = asset.price * valueFactor(asset);
      qty = roundQty(asset, plan.amount / unit);
      if (!(qty > 0)) return { ok: false, error: 'Số tiền chưa đủ một đơn vị ' + asset.symbol + '.' };
      const res = executeSpot(asset, 'buy', qty, asset.price, { kind: 'dca' });
      if (!res.ok) return res;
    }
    const interval = WEALTH_DCA_MS[plan.freq] || WEALTH_DCA_MS.monthly;
    plan.executions = (plan.executions || 0) + 1;
    plan.invested = (plan.invested || 0) + plan.amount;
    plan.qty = (plan.qty || 0) + qty;
    plan.lastRun = Date.now();
    plan.nextAt = manual ? Date.now() + interval : (Number(plan.nextAt) || Date.now()) + interval;
    wealthHistoryPush('dca', 'DCA · ' + asset.symbol, fmtVND(plan.amount) + ' · ' + (manual ? 'chạy tay' : 'định kỳ'), -plan.amount);
    return { ok: true, qty, asset };
  }

  function processWealthDca(force) {
    const w = ensureWealth();
    if (!w.autoDca && !force) return 0;
    let ran = 0;
    w.dca.forEach(plan => {
      if (!plan.active) return;
      if (!force && plan.nextAt > Date.now()) return;
      let guard = 0;
      while (plan.active && (force || plan.nextAt <= Date.now()) && guard < 3) {
        const res = runWealthDcaPlan(plan, false);
        if (!res.ok) {
          plan.active = false;
          pushNotif('⏸️', 'Tạm dừng DCA', (wealthDcaAsset(plan.assetId) ? wealthDcaAsset(plan.assetId).symbol : 'Kế hoạch') + ' · ' + res.error);
          wealthHistoryPush('dca-pause', 'Tạm dừng DCA', res.error, 0);
          break;
        }
        ran++;
        guard++;
        if (force) break;
      }
      if (plan.active && plan.nextAt <= Date.now()) plan.nextAt = Date.now() + (WEALTH_DCA_MS[plan.freq] || WEALTH_DCA_MS.monthly);
    });
    if (ran) {
      saveNow();
      updateShell();
      if (currentRoute === 'wealth') renderRoute();
    }
    return ran;
  }

  function updateWealthDcaTimers() {
    const w = ensureWealth();
    $$('[data-dca-next]').forEach(el => {
      const plan = w.dca.find(p => p.id === el.getAttribute('data-dca-next'));
      if (plan) el.textContent = wealthDcaNextLabel(plan.nextAt);
    });
  }

  function updateWealthDcaHint() {
    const select = $('#wealthDcaAsset');
    const hint = $('#wealthDcaHint');
    if (!select || !hint) return;
    const asset = wealthDcaAsset(select.value);
    hint.innerHTML = wealthDcaMinNote(asset);
  }

  function mountWealth() {
    ensureWealth();
    processWealthDca();
    if (wealthTimer) clearInterval(wealthTimer);
    wealthTimer = setInterval(() => {
      if (currentRoute !== 'wealth' || document.hidden) return;
      updateWealthDcaTimers();
      processWealthDca();
    }, 30000);
    const select = $('#wealthDcaAsset');
    if (select) select.addEventListener('change', updateWealthDcaHint);
    const auto = $('#wealthAutoDca');
    if (auto) auto.addEventListener('change', () => {
      const w = ensureWealth();
      w.autoDca = auto.checked;
      saveNow();
      toast(auto.checked ? 'Đã bật DCA tự động' : 'Đã tạm dừng DCA tự động', auto.checked ? 'Các kế hoạch sẽ chạy khi đến hạn.' : 'Kế hoạch vẫn được giữ, bạn có thể chạy tay.', 'info', '📆');
      renderRoute();
    });
    updateWealthDcaTimers();
  }

  function wealthTargetInputsHTML(target) {
    return '<div class="wealth-target-grid">' + WEALTH_CLASS_LIST.map(c =>
      '<div class="field"><label class="field-label" for="wealthTarget_' + c.id + '">' + esc(c.name) + ' <span class="hint">%</span></label>' +
      '<input class="input mono" id="wealthTarget_' + c.id + '" type="number" min="0" max="100" step="0.5" data-wealth-target="' + c.id + '" value="' + (Math.round((target[c.id] || 0) * 10) / 10) + '"></div>').join('') + '</div>';
  }

  function openWealthTargetModal() {
    const target = wealthTarget();
    const body = '<div class="wealth-target-profiles">' + Object.values(WEALTH_PROFILES).map(p =>
      '<button class="chip" data-wealth-profile="' + p.id + '">' + p.icon + ' ' + esc(p.name) + '</button>').join('') + '</div>' +
      '<div class="wealth-target-note">Chọn nhanh một hồ sơ hoặc tự nhập tỷ trọng. Hệ thống sẽ chuẩn hoá tổng về 100%.</div>' +
      wealthTargetInputsHTML(target) +
      '<div class="wealth-target-sum" id="wealthTargetSum"></div>' +
      '<div class="calc-note">Mục tiêu phân bổ là kim chỉ nam cho tái cân bằng và đánh giá sức khoẻ danh mục, không phải cam kết lợi nhuận.</div>';
    openModal({
      title: 'Mục tiêu phân bổ tài sản', sub: 'Điều chỉnh tỷ trọng mong muốn cho từng nhóm tài sản.', size: 'modal-lg', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" data-action="wealth-target-save">' + icon('check') + ' Lưu mục tiêu</button>',
      onOpen: modal => {
        if (!modal) return;
        const inputs = Array.from(modal.querySelectorAll('[data-wealth-target]'));
        const sumEl = modal.querySelector('#wealthTargetSum');
        const paint = () => {
          const sum = inputs.reduce((s, el) => s + Math.max(0, Number(el.value) || 0), 0);
          if (sumEl) {
            sumEl.className = 'wealth-target-sum ' + (Math.abs(sum - 100) < 0.6 ? 'ok' : 'warn');
            sumEl.innerHTML = 'Tổng hiện tại: <b>' + nf(sum, 1) + '%</b>' + (Math.abs(sum - 100) < 0.6 ? ' · hợp lệ' : ' · sẽ được chuẩn hoá về 100%');
          }
        };
        inputs.forEach(el => el.addEventListener('input', paint));
        modal.querySelectorAll('[data-wealth-profile]').forEach(btn => btn.addEventListener('click', () => {
          const p = WEALTH_PROFILES[btn.getAttribute('data-wealth-profile')];
          if (!p) return;
          inputs.forEach(el => { el.value = p.target[el.getAttribute('data-wealth-target')] || 0; });
          modal.querySelectorAll('[data-wealth-profile]').forEach(x => x.classList.toggle('active', x === btn));
          paint();
        }));
        paint();
      }
    });
  }

  function saveWealthTarget() {
    const inputs = $$('[data-wealth-target]');
    if (!inputs.length) return;
    const vals = {};
    let sum = 0;
    inputs.forEach(el => {
      const key = el.getAttribute('data-wealth-target');
      const v = Math.max(0, Number(el.value) || 0);
      vals[key] = v;
      sum += v;
    });
    if (sum <= 0) return toast('Mục tiêu không hợp lệ', 'Tổng tỷ trọng phải lớn hơn 0%.', 'error', '⚠️');
    WEALTH_CLASS_LIST.forEach(c => { vals[c.id] = vals[c.id] / sum * 100; });
    const w = ensureWealth();
    w.target = vals;
    if (!w.risk) w.risk = 'balanced';
    wealthHistoryPush('target', 'Cập nhật mục tiêu phân bổ', WEALTH_CLASS_LIST.map(c => c.id + ' ' + nf(vals[c.id], 0) + '%').join(' · '), 0);
    saveNow();
    closeModal();
    renderRoute();
    toast('Đã lưu mục tiêu phân bổ', 'Tỷ trọng đã được chuẩn hoá về 100%. Tái cân bằng để thu hẹp khoảng cách.', 'success', '🎯');
  }

  function openWealthGoalModal() {
    const body = '<div class="field"><label class="field-label" for="wealthGoalName">Tên mục tiêu</label><input class="input" id="wealthGoalName" maxlength="48" placeholder="Ví dụ: Quỹ mua nhà, Du lịch Nhật Bản…"></div>' +
      '<div class="form-row"><div class="field"><label class="field-label" for="wealthGoalTarget">Số tiền mục tiêu <span class="hint">VND</span></label><input class="input mono" id="wealthGoalTarget" type="number" min="1000000" step="1000000" value="200000000"></div>' +
      '<div class="field"><label class="field-label" for="wealthGoalMonths">Thời gian <span class="hint">tháng</span></label><input class="input mono" id="wealthGoalMonths" type="number" min="1" max="120" step="1" value="24"></div></div>' +
      '<div class="wealth-quick-chips">' + [50000000, 100000000, 200000000, 500000000, 1000000000].map(v => '<button class="chip" data-goal-target="' + v + '">' + money(v) + ' ₫</button>').join('') + '</div>' +
      '<div class="wealth-goal-preview" id="wealthGoalPreview"></div>' +
      '<div class="calc-note">Số tiền góp mỗi tháng được tính tự động từ mục tiêu và thời gian. Bạn có thể góp thêm bất kỳ lúc nào bằng tiền mặt.</div>';
    openModal({
      title: 'Tạo mục tiêu tài chính', sub: 'Gắn con số cụ thể với kế hoạch tích lũy của bạn.', size: 'modal-md', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" data-action="wealth-goal-create">' + icon('target') + ' Tạo mục tiêu</button>',
      onOpen: modal => {
        if (!modal) return;
        const name = modal.querySelector('#wealthGoalName');
        const target = modal.querySelector('#wealthGoalTarget');
        const months = modal.querySelector('#wealthGoalMonths');
        const preview = modal.querySelector('#wealthGoalPreview');
        const paint = () => {
          const t = Math.max(0, Number(target.value) || 0);
          const m = clamp(Math.round(Number(months.value) || 1), 1, 120);
          const monthly = t / m;
          preview.innerHTML = '<div><span>Góp mỗi tháng</span><b>' + fmtVND(monthly) + '</b></div><div><span>Thời gian</span><b>' + m + ' tháng</b></div><div><span>Tổng tiền mặt cần</span><b>' + fmtVND(t) + '</b></div>';
        };
        target.addEventListener('input', paint);
        months.addEventListener('input', paint);
        modal.querySelectorAll('[data-goal-target]').forEach(btn => btn.addEventListener('click', () => {
          target.value = btn.getAttribute('data-goal-target');
          paint();
        }));
        if (name) setTimeout(() => name.focus(), 40);
        paint();
      }
    });
  }

  function createWealthGoal() {
    const nameEl = $('#wealthGoalName');
    const targetEl = $('#wealthGoalTarget');
    const monthsEl = $('#wealthGoalMonths');
    if (!nameEl || !targetEl || !monthsEl) return;
    const name = String(nameEl.value || '').trim();
    const target = Math.max(1000000, Math.round(Number(targetEl.value) || 0));
    const months = clamp(Math.round(Number(monthsEl.value) || 1), 1, 120);
    if (!name) return toast('Thiếu tên mục tiêu', 'Hãy đặt tên ngắn gọn để dễ theo dõi.', 'error', '🏁');
    const w = ensureWealth();
    if (w.goals.length >= 8) return toast('Đã đủ mục tiêu', 'Bạn có thể xoá bớt mục tiêu cũ trước khi thêm mới.', 'error', '🏁');
    const goal = { id: uid('goal'), name: name.slice(0, 48), icon: '🎯', target, months, saved: 0, monthly: Math.round(target / months), createdAt: Date.now(), lastContribution: 0 };
    w.goals.unshift(goal);
    wealthHistoryPush('goal', 'Tạo mục tiêu · ' + goal.name, fmtVND(target) + ' trong ' + months + ' tháng', 0);
    saveNow();
    closeModal();
    renderRoute();
    toast('Đã tạo mục tiêu', goal.name + ' · cần góp ' + fmtVND(goal.monthly) + '/tháng.', 'success', '🏁');
  }

  function openWealthGoalContribute(id) {
    const w = ensureWealth();
    const goal = w.goals.find(g => g.id === id);
    if (!goal) return;
    const left = Math.max(0, goal.target - goal.saved);
    const body = '<div class="wealth-contribute-head"><span>🎯</span><div><b>' + esc(goal.name) + '</b><span>Còn thiếu ' + fmtVND(left) + ' · tiền mặt ' + fmtVND(state.cash) + '</span></div></div>' +
      '<div class="field"><label class="field-label" for="wealthGoalAmount">Số tiền góp thêm <span class="hint">VND</span></label><input class="input mono" id="wealthGoalAmount" type="number" min="100000" step="100000" value="' + Math.min(Math.max(100000, left), Math.max(100000, Math.floor(state.cash * 0.2 / 100000) * 100000)) + '"></div>' +
      '<div class="wealth-quick-chips">' + [1000000, 5000000, 10000000, 20000000].map(v => '<button class="chip" data-goal-amount="' + v + '">' + money(v) + ' ₫</button>').join('') +
      '<button class="chip" data-goal-amount="all">Tối đa</button></div>' +
      '<div class="calc-note">Tiền góp được chuyển từ tiền mặt khả dụng. Mục tiêu không tự động đầu tư — bạn quyết định kênh phù hợp.</div>';
    openModal({
      title: 'Góp vào mục tiêu', sub: 'Ghi nhận khoản tiết kiệm cho mục tiêu này.', size: 'modal-md', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" data-action="wealth-goal-contribute" data-id="' + goal.id + '">' + icon('plus') + ' Góp tiền</button>',
      onOpen: modal => {
        if (!modal) return;
        const input = modal.querySelector('#wealthGoalAmount');
        modal.querySelectorAll('[data-goal-amount]').forEach(btn => btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-goal-amount');
          input.value = v === 'all' ? Math.floor(state.cash / 100000) * 100000 : v;
        }));
        if (input) setTimeout(() => input.focus(), 40);
      }
    });
  }

  function contributeWealthGoal(id) {
    const w = ensureWealth();
    const goal = w.goals.find(g => g.id === id);
    if (!goal) return;
    const input = $('#wealthGoalAmount');
    const amount = Math.round(Number(input ? input.value : 0) || 0);
    if (!(amount > 0)) return toast('Số tiền không hợp lệ', 'Nhập số tiền lớn hơn 0.', 'error', '⚠️');
    if (amount > state.cash) return toast('Không đủ tiền mặt', 'Bạn có ' + fmtVND(state.cash) + ' khả dụng.', 'error', '⚠️');
    state.cash -= amount;
    goal.saved += amount;
    goal.lastContribution = Date.now();
    if (!(goal.monthly > 0)) goal.monthly = Math.round(goal.target / Math.max(1, goal.months));
    wealthHistoryPush('goal', 'Góp mục tiêu · ' + goal.name, fmtVND(amount), -amount);
    saveNow();
    closeModal();
    updateShell();
    renderRoute();
    toast('Đã góp vào mục tiêu', '+' + fmtVND(amount) + ' · ' + goal.name, 'success', '🏁');
    if (goal.saved >= goal.target) {
      confetti(45);
      pushNotif('🏁', 'Hoàn thành mục tiêu', goal.name + ' đã đạt ' + fmtVND(goal.target) + '.');
    }
  }

  function submitWealthQuiz() {
    const answers = {};
    for (let i = 0; i < WEALTH_QUIZ.length; i++) {
      const checked = document.querySelector('input[name="wq' + i + '"]:checked');
      if (!checked) return toast('Còn câu chưa trả lời', 'Hãy trả lời đủ ' + WEALTH_QUIZ.length + ' câu để xác định hồ sơ rủi ro.', 'error', '🛡️');
      answers[i] = clamp(Number(checked.value) || 0, 0, 3);
    }
    const score = Object.keys(answers).reduce((s, k) => s + answers[k], 0);
    const profile = wealthProfileForScore(score);
    const w = ensureWealth();
    w.quiz = { score, answers, at: Date.now() };
    w.risk = profile.id;
    w.target = { ...profile.target };
    wealthHistoryPush('quiz', 'Hồ sơ rủi ro · ' + profile.name, score + '/18 điểm', 0);
    saveNow();
    renderRoute();
    toast('Hồ sơ của bạn: ' + profile.name, 'Đã thiết lập phân bổ mục tiêu ' + profile.icon + ' · ' + score + '/18 điểm.', 'gold', profile.icon);
    confetti(32);
  }

  function addWealthDca() {
    const assetEl = $('#wealthDcaAsset');
    const amountEl = $('#wealthDcaAmount');
    const freqEl = $('#wealthDcaFreq');
    if (!assetEl || !amountEl || !freqEl) return;
    const asset = wealthDcaAsset(assetEl.value);
    if (!asset) return toast('Tài sản không hợp lệ', 'Chọn một tài sản trong danh sách.', 'error', '⚠️');
    const amount = Math.max(100000, Math.round((Number(amountEl.value) || 0) / 100000) * 100000);
    const freq = freqEl.value === 'weekly' ? 'weekly' : 'monthly';
    const w = ensureWealth();
    if (w.dca.length >= WEALTH_DCA_MAX) return toast('Đã đủ kế hoạch DCA', 'Tối đa ' + WEALTH_DCA_MAX + ' kế hoạch. Xoá bớt để tạo mới.', 'error', '📆');
    if (asset.id === 'gold_acc' && amount < 200000) return toast('Số tiền quá nhỏ', 'Tích lũy vàng cần tối thiểu 200.000 ₫ mỗi kỳ.', 'error', '⚠️');
    if (asset.id === 'vnd_flex' && amount < 100000) return toast('Số tiền quá nhỏ', 'Tích lũy linh hoạt cần tối thiểu 100.000 ₫ mỗi kỳ.', 'error', '⚠️');
    if (!asset.vehicle) {
      const qty = roundQty(asset, amount / (asset.price * valueFactor(asset)));
      if (!(qty > 0)) return toast('Số tiền chưa đủ một đơn vị', wealthDcaMinNote(asset), 'error', '⚠️');
    }
    const interval = WEALTH_DCA_MS[freq];
    const plan = {
      id: uid('dca'), assetId: asset.id, amount, freq, nextAt: Date.now() + interval,
      executions: 0, invested: 0, qty: 0, lastRun: 0, active: true, createdAt: Date.now()
    };
    w.dca.unshift(plan);
    wealthHistoryPush('dca', 'Tạo kế hoạch DCA · ' + asset.symbol, fmtVND(amount) + ' / ' + wealthDcaFrequency(plan), 0);
    saveNow();
    renderRoute();
    toast('Đã tạo kế hoạch DCA', asset.symbol + ' · ' + fmtVND(amount) + ' mỗi ' + wealthDcaFrequency(plan) + '.', 'success', '📆');
  }

  function toggleWealthDca(id) {
    const w = ensureWealth();
    const plan = w.dca.find(p => p.id === id);
    if (!plan) return;
    plan.active = !plan.active;
    if (plan.active && (!plan.nextAt || plan.nextAt < Date.now())) plan.nextAt = Date.now() + (WEALTH_DCA_MS[plan.freq] || WEALTH_DCA_MS.monthly);
    saveNow();
    renderRoute();
    toast(plan.active ? 'Đã tiếp tục DCA' : 'Đã tạm dừng DCA', (wealthDcaAsset(plan.assetId) ? wealthDcaAsset(plan.assetId).symbol : 'Kế hoạch') + ' · ' + fmtVND(plan.amount) + ' / ' + wealthDcaFrequency(plan), 'info', plan.active ? '▶️' : '⏸️');
  }

  function runWealthDcaNow(id) {
    const w = ensureWealth();
    const plan = w.dca.find(p => p.id === id);
    if (!plan) return;
    const res = runWealthDcaPlan(plan, true);
    if (!res.ok) return toast('Không thể chạy DCA', res.error, 'error', '⚠️');
    saveNow();
    updateShell();
    renderRoute();
    toast('Đã mua theo kế hoạch DCA', res.asset.symbol + ' · ' + fmtVND(plan.amount), 'success', '📆');
  }

  function deleteWealthDca(id) {
    const w = ensureWealth();
    const plan = w.dca.find(p => p.id === id);
    if (!plan) return;
    w.dca = w.dca.filter(p => p.id !== id);
    wealthHistoryPush('note', 'Xoá kế hoạch DCA', (wealthDcaAsset(plan.assetId) ? wealthDcaAsset(plan.assetId).symbol : '') + ' · ' + fmtVND(plan.amount), 0);
    saveNow();
    renderRoute();
    toast('Đã xoá kế hoạch DCA', 'Các khoản đã mua vẫn nằm trong danh mục của bạn.', 'info', '🗑️');
  }

  function deleteWealthGoal(id) {
    const w = ensureWealth();
    const goal = w.goals.find(g => g.id === id);
    if (!goal) return;
    confirmAction({
      title: 'Xoá mục tiêu "' + esc(goal.name) + '"?', sub: 'Tiền đã góp vẫn nằm trong danh mục, chỉ mục tiêu bị xoá.', danger: true, confirm: 'Xoá mục tiêu',
      body: 'Mục tiêu <b>' + esc(goal.name) + '</b> đã tích lũy <b>' + fmtVND(goal.saved) + '</b>. Hành động này không hoàn tác được.',
      onConfirm: () => {
        w.goals = w.goals.filter(g => g.id !== id);
        saveNow();
        renderRoute();
        toast('Đã xoá mục tiêu', goal.name, 'info', '🗑️');
      }
    });
  }

  /* ------------------------------ SAVINGS / BANKING ------------------------------ */
  function savingsSourceText() {
    return savingsRates.live ? 'Yahoo Finance · trực tiếp' : 'Mô phỏng tham chiếu';
  }
  function savingsRateRange() {
    const cash = D.SAVINGS_PRODUCTS.filter(p => p.kind === 'cash');
    const rates = cash.map(p => savingsRate(p));
    return { min: Math.min.apply(null, rates), max: Math.max.apply(null, rates) };
  }
  function savingsSnapshotCardsHTML() {
    const nw = netWorth();
    const cash = state.cash;
    const savings = savingsValue();
    const accrued = savingsAccrued();
    const interest = savingsInterestVND();
    const matured = ensureSavings().contracts.filter(c => c.status === 'matured').length;
    const usd = savingsRates.usdvnd || 25594;
    const eur = usd * (savingsRates.eurusd || 1.1);
    const jpy = usd / (savingsRates.jpy || 155);
    const goldGrams = nw / (goldSpotVND() || 1);
    return '<div id="savingsSnapshotWrap"><div class="savings-snapshot-grid" id="savingsSnapshot">' +
      '<div class="savings-snap-card snap-net"><div class="ssc-label">' + icon('wallet') + ' Tổng tài sản ròng</div><div class="ssc-value">' + fmtVND(nw) + '</div><div class="ssc-note">' + badge(savingsRates.live ? 'DỮ LIỆU THẬT' : 'MÔ PHỎNG', savingsRates.live ? 'badge-live' : '') + '<span>Vốn ảo · cập nhật theo thị trường</span></div></div>' +
      '<div class="savings-snap-card snap-cash"><div class="ssc-label">' + icon('money') + ' Tiền mặt khả dụng</div><div class="ssc-value">' + fmtVND(cash) + '</div><div class="ssc-note"><span>' + nf(nw ? cash / nw * 100 : 0, 1) + '% tổng tài sản</span></div></div>' +
      '<div class="savings-snap-card snap-save"><div class="ssc-label">' + icon('bank') + ' Đang tích lũy</div><div class="ssc-value">' + fmtVND(savings) + '</div><div class="ssc-note"><span>' + nf(savingsWeightedRate(), 2) + '%/năm bình quân</span>' + (matured ? badge(matured + ' ĐÁO HẠN', 'badge-gold') : '') + '</div></div>' +
      '<div class="savings-snap-card snap-interest"><div class="ssc-label">' + icon('sparkles') + ' Lãi tạm tính</div><div class="ssc-value ' + changeCls(accrued) + '">' + (accrued >= 0 ? '+' : '') + fmtVND(accrued) + '</div><div class="ssc-note"><span>Tiền lãi: +' + fmtVND(interest) + ' · chênh lệch vàng/FX đã gồm</span></div></div>' +
      '</div>' +
      '<div class="savings-equivalents"><span class="se-label">Quy đổi tài sản</span>' +
      '<span>≈ <b>' + nf(nw / usd, 0) + '</b> USD</span><span>≈ <b>' + nf(nw / eur, 0) + '</b> EUR</span><span>≈ <b>' + nf(nw / jpy, 0) + '</b> JPY</span>' +
      '<span>≈ <b>' + nf(goldGrams, 1) + '</b> gam vàng</span><span class="se-rate">1 USD = ' + nf(usd, 0) + ' ₫ · 1 gam vàng = ' + fmtVND(goldSpotVND()) + '</span></div></div>';
  }

  function savingsRateTileHTML(symbol, label, value, suffix, sub) {
    const item = (savingsRates.symbols || {})[symbol];
    const chg = item ? item.changePct : 0;
    return '<div class="rate-tile" data-rate-symbol="' + symbol + '"><div class="rate-tile-top"><span>' + esc(symbol) + '</span><b class="' + changeCls(chg) + '">' + (chg > 0 ? '+' : '') + nf(chg, 2) + '%</b></div>' +
      '<div class="rate-tile-value">' + value + '<small>' + suffix + '</small></div><div class="rate-tile-label">' + esc(label) + '</div><div class="rate-tile-sub">' + sub + '</div></div>';
  }
  function savingsRateBoardHTML() {
    const r = savingsRates;
    const curve = r.tnx - r.irx;
    return '<div id="savingsRateBoard"><div class="savings-rate-board">' +
      savingsRateTileHTML('^IRX', 'TPCP Mỹ 13 tuần', nf(r.irx, 3), '%', 'Neo lãi suất ngắn hạn') +
      savingsRateTileHTML('^TNX', 'TPCP Mỹ 10 năm', nf(r.tnx, 3), '%', 'Kỳ vọng lãi suất dài hạn') +
      savingsRateTileHTML('^FVX', 'TPCP Mỹ 5 năm', nf(r.fvx, 3), '%', 'Điểm giữa đường cong') +
      savingsRateTileHTML('^VIX', 'Chỉ số sợ hãi', nf(r.vix, 2), '', 'Biến động kỳ vọng 30 ngày') +
      savingsRateTileHTML('GC=F', 'Vàng thế giới', nf(r.goldUsd, 0), '$/oz', 'Quy đổi ' + fmtVND(goldSpotVND()) + '/gam') +
      savingsRateTileHTML('USDVND=X', 'USD / VND', nf(r.usdvnd, 0), '₫', 'Tỷ giá quy đổi chính') +
      savingsRateTileHTML('EURUSD=X', 'EUR / USD', nf(r.eurusd, 4), '', '1 EUR = ' + nf(r.eurusd * r.usdvnd, 0) + ' ₫') +
      '<div class="rate-tile rate-curve"><div class="rate-tile-top"><span>Độ dốc 10Y − 3M</span><b class="' + changeCls(curve) + '">' + (curve >= 0 ? '+' : '') + nf(curve * 100, 0) + ' bps</b></div>' +
      '<div class="rate-tile-value">' + nf(curve, 2) + '<small>%</small></div><div class="rate-tile-label">' + (curve > 0.5 ? 'Đường cong dốc lên' : curve > 0 ? 'Đường cong thoải' : 'Đường cong đảo ngược') + '</div><div class="rate-tile-sub">' + (curve > 0 ? 'Kỳ hạn dài đang trả cao hơn' : 'Thị trường lo ngại tăng trưởng') + '</div></div>' +
      '</div><div class="savings-rate-foot"><span>' + icon('info') + ' Nguồn: ' + savingsSourceText() + ' · cập nhật ' + (savingsRatesAt ? timeAgo(savingsRatesAt) : 'vừa xong') + '</span><span>Lãi suất sản phẩm = benchmark + chênh lệch mô phỏng</span></div></div>';
  }

  function savingsFilteredProducts() {
    if (savingsFilter === 'vnd') return D.SAVINGS_PRODUCTS.filter(p => p.currency === 'VND');
    if (savingsFilter === 'fx') return D.SAVINGS_PRODUCTS.filter(p => ['USD', 'EUR', 'JPY'].includes(p.currency));
    if (savingsFilter === 'gold') return D.SAVINGS_PRODUCTS.filter(p => p.kind === 'gold');
    return D.SAVINGS_PRODUCTS;
  }

  function savingsProductCardHTML(p) {
    const rate = savingsRate(p);
    const gold = p.kind === 'gold';
    const minVND = p.currency === 'VND' || gold ? p.min : p.min * savingsFx(p.currency);
    const projection = savingsProductValue(p, 100000000);
    const gain = Math.max(0, projection - 100000000);
    return '<div class="savings-product" style="--pcolor:' + p.color + '">' +
      '<div class="sp-top"><span class="sp-icon">' + p.icon + '</span><div class="sp-name-block"><div class="sp-name">' + esc(p.name) + '</div><div class="sp-term">' + esc(p.termLabel) + ' · ' + esc(p.currency === 'GOLD' ? 'Vàng' : p.currency) + '</div></div><span class="badge sp-tag">' + esc(p.tag) + '</span></div>' +
      '<div class="sp-rate" data-product-rate="' + p.id + '"><b>' + (gold ? nf(goldBuyVND(), 0) : nf(rate, 2)) + '</b><span>' + (gold ? '₫/gam' : '%/năm') + '</span></div>' +
      '<div class="sp-bench">' + icon('sparkles') + ' ' + esc(p.benchmark) + '</div>' +
      '<div class="sp-meta"><span><i>Kỳ hạn</i><b>' + esc(p.termLabel) + '</b></span><span><i>Tối thiểu</i><b>' + (p.currency === 'VND' || gold ? fmtVND(minVND) : nf(p.min, 0) + ' ' + p.currency) + '</b></span></div>' +
      '<div class="sp-projection"><span>' + (gold ? 'Giá mua hiện tại' : 'Lãi dự kiến / 100 tr') + '</span><b>' + (gold ? fmtVND(goldBuyVND()) : '+' + fmtVND(gain)) + '</b></div>' +
      '<button class="btn btn-sm btn-outline-gold btn-block sp-open" data-action="savings-deposit" data-id="' + p.id + '">' + (gold ? 'Mua vàng' : 'Gửi ngay') + ' ' + icon('arrow-right') + '</button>' +
      '<div class="sp-risk">' + icon('shield') + ' ' + esc(p.risk) + ' · ' + esc(p.liquidity) + '</div></div>';
  }

  function savingsProductsHTML() {
    return '<div class="savings-product-grid" id="savingsProducts">' + savingsFilteredProducts().map(savingsProductCardHTML).join('') + '</div>';
  }

  function savingsContractsHTML() {
    const list = ensureSavings().contracts.slice().sort((a, b) => {
      if (a.status !== b.status) return a.status === 'matured' ? -1 : 1;
      return contractValue(b) - contractValue(a);
    });
    if (!list.length) return '<div class="empty-state"><div class="empty-icon">🏦</div><strong>Chưa có khoản tích lũy</strong><p>Chọn một sản phẩm bên trên để bắt đầu. Tiền mặt nhàn rỗi sẽ không tự sinh lãi.</p><button class="btn btn-sm btn-outline-gold" data-action="savings-deposit" data-id="vnd_flex">Gửi linh hoạt</button></div>';
    return '<div class="savings-contracts" id="savingsContracts">' + list.map(c => {
      const p = savingsProduct(c.productId);
      const gold = c.kind === 'gold';
      const matured = c.status === 'matured';
      const cur = gold ? nf(c.grams, 3) + ' gam' : (c.currency === 'VND' ? fmtVND(c.principal) : nf(c.principal, 2) + ' ' + c.currency);
      const rate = gold ? 'Theo giá vàng' : nf(c.rate, 2) + '%/năm';
      const next = c.maturityAt && c.status === 'active' ? dateLabel(c.maturityAt) : matured ? 'Đã đáo hạn' : 'Không kỳ hạn';
      const pnl = contractPnl(c);
      return '<div class="savings-contract ' + (matured ? 'is-matured' : '') + '" style="--pcolor:' + (p ? p.color : '#f3c56b') + '">' +
        '<div class="sc-head"><span class="sc-icon">' + (p ? p.icon : '🏦') + '</span><div class="sc-title"><b>' + esc(p ? p.name : 'Tích lũy') + '</b><span>' + cur + ' · mở ' + dateLabel(c.openedAt) + '</span></div><span class="badge ' + (matured ? 'badge-gold' : 'badge-up') + '">' + contractStateLabel(c) + '</span></div>' +
        '<div class="sc-stats"><div><span>Giá trị hiện tại</span><b data-contract-value>' + fmtVND(contractValue(c)) + '</b></div><div><span>Lãi suất</span><b>' + rate + '</b></div><div><span>Lãi / chênh lệch</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + '</b></div><div><span>' + (matured ? 'Trạng thái' : 'Đáo hạn') + '</span><b>' + next + '</b></div></div>' +
        (c.termDays ? '<div class="sc-progress"><span style="width:' + contractProgress(c) + '%"></span></div><div class="sc-progress-note"><span>' + nf(contractProgress(c), 0) + '% kỳ hạn</span><span>' + (c.autoRoll ? 'Tự động tái tục' : 'Tất toán khi đáo hạn') + '</span></div>' : '') +
        '<div class="sc-actions"><button class="btn btn-xs ' + (matured ? 'btn-gold' : 'btn-ghost') + '" data-action="savings-withdraw" data-id="' + c.id + '">' + (matured ? 'Tất toán ngay' : 'Rút tiền') + '</button>' +
        (c.termDays && c.status === 'active' ? '<button class="btn btn-xs btn-ghost" data-action="savings-roll" data-id="' + c.id + '">' + icon('refresh') + ' ' + (c.autoRoll ? 'Tắt tái tục' : 'Bật tái tục') + '</button>' : '') +
        '<span class="sc-note">' + esc(p ? p.earlyNote : '') + '</span></div></div>';
    }).join('') + '</div>';
  }

  function savingsHistoryHTML() {
    const s = ensureSavings();
    if (!s.history.length) return '<div class="savings-history-empty">Chưa có giao dịch tích lũy. Lịch sử gửi, tất toán và tái tục sẽ xuất hiện ở đây.</div>';
    return '<div class="savings-history">' + s.history.slice(0, 10).map(h => {
      const icons = { deposit: '↘', withdraw: '↗', mature: '✓', roll: '↻' };
      return '<div class="savings-history-row"><span class="shr-icon ' + h.type + '">' + (icons[h.type] || '•') + '</span><div><b>' + esc(h.name) + '</b><span>' + (h.type === 'deposit' ? 'Gửi tiền' : h.type === 'withdraw' ? 'Tất toán' : h.type === 'mature' ? 'Đáo hạn' : 'Tái tục') + (h.note ? ' · ' + esc(h.note) : '') + '</span></div><div class="shr-val"><b>' + fmtVND(h.amountVND) + '</b><span>' + timeAgo(h.at) + '</span></div></div>';
    }).join('') + '</div>';
  }

  function savingsCompositionHTML() {
    const cash = state.cash;
    const save = savingsCashValue();
    const gold = savingsGoldValue();
    const securities = investedValue() + positionList().reduce((s, p) => s + p.margin + p.pnl, 0);
    const total = cash + save + gold + securities || 1;
    const parts = [
      { label: 'Tiền mặt', value: cash, color: 'rgba(255,255,255,.24)' },
      { label: 'Tiết kiệm', value: save, color: '#f3c56b' },
      { label: 'Vàng', value: gold, color: '#c89cff' },
      { label: 'Chứng khoán & phái sinh', value: securities, color: '#2ee6a6' }
    ].filter(p => p.value > 0);
    let start = 0;
    const segs = parts.map(p => {
      const end = start + p.value / total * 100;
      const seg = p.color + ' ' + start.toFixed(2) + '% ' + end.toFixed(2) + '%';
      start = end;
      return seg;
    }).join(', ');
    return '<div class="savings-composition" id="savingsComposition"><div class="savings-donut" style="--segments:conic-gradient(' + segs + ')"><div><b>' + nf(save / total * 100, 0) + '%</b><span>tích lũy</span></div></div>' +
      '<div class="savings-comp-legend">' + parts.map(p => '<div><span class="dot" style="background:' + p.color + '"></span>' + esc(p.label) + '<b>' + nf(p.value / total * 100, 1) + '%</b></div>').join('') + '</div></div>' +
      '<div class="savings-comp-note">' + icon('shield') + ' Quỹ dự phòng (tiền mặt + tích lũy) đang chiếm <b>' + nf((cash + save) / total * 100, 1) + '%</b> tổng tài sản.</div>';
  }

  function savingsLadderHTML() {
    const buckets = [{ label: '≤ 30 ngày', max: 30, value: 0 }, { label: '31–90 ngày', max: 90, value: 0 }, { label: '91–365 ngày', max: 365, value: 0 }, { label: '> 1 năm', max: Infinity, value: 0 }];
    ensureSavings().contracts.forEach(c => {
      if (c.status !== 'active' || !c.maturityAt) return;
      const days = Math.max(0, (c.maturityAt - Date.now()) / 86400000);
      const b = buckets.find(x => days <= x.max) || buckets[buckets.length - 1];
      b.value += contractValue(c);
    });
    const max = Math.max.apply(null, buckets.map(b => b.value).concat([1]));
    return '<div class="savings-ladder" id="savingsLadder">' + buckets.map(b => '<div class="ladder-row"><div class="ladder-head"><span>' + b.label + '</span><b>' + fmtVND(b.value) + '</b></div><div class="ladder-bar"><span style="width:' + (b.value ? clamp(b.value / max * 100, 4, 100) : 0) + '%"></span></div></div>').join('') +
      '<div class="calc-note">Tập trung quá nhiều vào một kỳ hạn có thể khiến bạn phải rút trước hạn. Rải kỳ hạn giúp giữ thanh khoản.</div></div>';
  }

  function savingsConverterHTML() {
    const options = [['vnd', 'VND · Việt Nam đồng'], ['usd', 'USD · Đô la Mỹ'], ['eur', 'EUR · Euro'], ['jpy', 'JPY · Yên Nhật'], ['gold', 'XAU · Vàng (gam)']];
    return '<div class="savings-converter"><div class="converter-row"><input class="input mono" id="savAmount" type="number" value="100000000" min="0" step="any"><select class="select" id="savFrom">' + options.map(o => '<option value="' + o[0] + '"' + (o[0] === 'vnd' ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="savings-conv-eq" id="savResult">—</div>' +
      '<div class="converter-row"><div class="savings-conv-label">Quy đổi sang</div><select class="select" id="savTo">' + options.map(o => '<option value="' + o[0] + '"' + (o[0] === 'usd' ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="calc-note" id="savRate">—</div></div>';
  }

  function savingsSidebarHTML() {
    return '<aside class="savings-side">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('pie') + ' Cơ cấu thanh khoản</div><div class="card-sub">Tiền của bạn đang nằm ở đâu</div></div></div>' + savingsCompositionHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Thang kỳ hạn</div><div class="card-sub">Giá trị đáo hạn theo thời gian</div></div></div>' + savingsLadderHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('calculator') + ' Quy đổi tiền tệ</div><div class="card-sub">Tỷ giá và giá vàng trực tiếp</div></div></div>' + savingsConverterHTML() + '</section>' +
      '<div class="risk-warning-inline">' + icon('alert') + ' Đây là ngân hàng mô phỏng trong môi trường vốn ảo. Lãi suất và tỷ giá được neo theo dữ liệu thị trường thật nhưng không phải sản phẩm huy động của bất kỳ ngân hàng nào.</div>' +
      '</aside>';
  }

  function savingsAnalysisBodyHTML() {
    if (savingsAnalysisTab === 'goal') {
      return '<div class="savings-calc-grid"><div class="savings-calc-form">' +
        '<div class="field"><label class="field-label" for="goalTarget">Mục tiêu cần đạt <span class="hint">VND</span></label><input class="input mono" id="goalTarget" type="number" value="2000000000" min="0" step="1000000"></div>' +
        '<div class="field"><label class="field-label" for="goalYears">Thời gian <span class="hint">năm</span></label><input class="input mono" id="goalYears" type="number" value="5" min="1" max="40" step="1"></div>' +
        '<div class="field"><label class="field-label" for="goalRate">Lãi suất kỳ vọng <span class="hint">%/năm</span></label><input class="input mono" id="goalRate" type="number" value="' + Math.max(3.5, savingsRateRange().max).toFixed(1) + '" min="0" max="30" step="0.1"></div>' +
        '<div class="field"><label class="field-label" for="goalInitial">Vốn hiện có <span class="hint">VND</span></label><input class="input mono" id="goalInitial" type="number" value="' + Math.round(savingsValue() + state.cash) + '" min="0" step="1000000"></div></div>' +
        '<div class="savings-calc-result" id="goalResult"></div></div>';
    }
    if (savingsAnalysisTab === 'compare') {
      const cashProducts = D.SAVINGS_PRODUCTS.slice().sort((a, b) => savingsRate(b) - savingsRate(a));
      const best = savingsRate(cashProducts[0]);
      return '<div class="savings-compare-wrap"><table class="data-table savings-compare"><thead><tr><th>Sản phẩm</th><th>Loại</th><th class="text-right">Lãi suất</th><th class="text-right">Kỳ hạn</th><th class="text-right">Tối thiểu</th><th class="text-right">100 tr sau kỳ hạn</th><th>Thanh khoản</th></tr></thead><tbody>' +
        cashProducts.map(p => {
          const rate = savingsRate(p);
          const isGold = p.kind === 'gold';
          const future = isGold ? 100000000 : savingsProductValue(p, 100000000);
          return '<tr class="' + (rate === best && !isGold ? 'best-row' : '') + '"><td><div class="compare-name"><span style="color:' + p.color + '">' + p.icon + '</span><b>' + esc(p.name) + '</b></div></td><td>' + (p.currency === 'GOLD' ? 'Vàng' : p.currency) + '</td><td class="text-right mono ' + (rate === best && !isGold ? 'up' : '') + '">' + (isGold ? 'Theo giá' : nf(rate, 2) + '%') + '</td><td class="text-right">' + esc(p.termLabel) + '</td><td class="text-right">' + (p.currency === 'VND' || isGold ? fmtVND(p.min) : nf(p.min, 0) + ' ' + p.currency) + '</td><td class="text-right mono">' + (isGold ? '—' : fmtVND(future)) + '</td><td><span class="badge">' + esc(p.liquidity) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="calc-note">Bảng so sánh dùng lãi suất hiện tại và giả định tỷ giá không đổi. Sản phẩm ngoại tệ còn chịu rủi ro tỷ giá; vàng không có lãi suất và chịu biến động giá.</div>';
    }
    return '<div class="savings-calc-grid"><div class="savings-calc-form">' +
      '<div class="field"><label class="field-label" for="growthInitial">Vốn ban đầu <span class="hint">VND</span></label><input class="input mono" id="growthInitial" type="number" value="100000000" min="0" step="1000000"></div>' +
      '<div class="field"><label class="field-label" for="growthMonthly">Gửi thêm mỗi tháng <span class="hint">VND</span></label><input class="input mono" id="growthMonthly" type="number" value="5000000" min="0" step="500000"></div>' +
      '<div class="form-row"><div class="field"><label class="field-label" for="growthYears">Số năm</label><input class="input mono" id="growthYears" type="number" value="5" min="1" max="40" step="1"></div>' +
      '<div class="field"><label class="field-label" for="growthRate">Lãi suất <span class="hint">%/năm</span></label><input class="input mono" id="growthRate" type="number" value="' + Math.max(3.5, savingsRateRange().max).toFixed(1) + '" min="0" max="30" step="0.1"></div></div>' +
      '<div class="field"><label class="field-label" for="growthInfl">Lạm phát giả định <span class="hint">%/năm</span></label><input class="input mono" id="growthInfl" type="number" value="3.5" min="0" max="30" step="0.1"></div></div>' +
      '<div class="savings-calc-result" id="growthResult"></div></div><canvas id="savingsGrowthCanvas" class="savings-growth-canvas" aria-label="Dự phóng tăng trưởng tích lũy"></canvas>';
  }

  function savingsAnalysisHTML() {
    const tabs = [['growth', 'Tăng trưởng lãi kép'], ['goal', 'Lập kế hoạch mục tiêu'], ['compare', 'So sánh sản phẩm']];
    return '<section class="card savings-analysis"><div class="card-head"><div><div class="card-title">' + icon('flask') + ' Phân tích tích lũy</div><div class="card-sub">Mô phỏng lãi kép, mục tiêu và so sánh sản phẩm trước khi gửi</div></div><span class="badge badge-gold">CÔNG CỤ PHÂN TÍCH</span></div>' +
      '<div class="savings-tabs">' + tabs.map(t => '<button class="chip ' + (savingsAnalysisTab === t[0] ? 'active' : '') + '" data-savings-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<div id="savingsAnalysisBody">' + savingsAnalysisBodyHTML() + '</div></section>';
  }

  function savingsHTML() {
    const range = savingsRateRange();
    const active = ensureSavings().contracts.filter(c => c.status === 'active').length;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('bank') + ' Ngân hàng · Mô phỏng</div><h1>Ngân hàng & Tích lũy</h1>' +
      '<p class="sub">Gửi tiết kiệm VND, ngoại tệ và vàng với lãi suất neo theo tín hiệu thị trường thật. Mọi sản phẩm đều là mô phỏng trong vốn ảo — minh bạch nguồn và cách tính.</p></div>' +
      '<div class="head-actions"><span class="status-pill ' + (savingsRates.live ? 'live' : 'demo') + '" id="savingsLiveLabel"><span class="dot"></span>' + savingsSourceText() + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="savings-refresh">' + icon('refresh') + ' Làm mới lãi suất</button>' +
      '<button class="btn btn-gold btn-sm" data-action="savings-deposit" data-id="vnd_6m">' + icon('bank') + ' Gửi tiết kiệm</button></div></div>' +
      savingsSnapshotCardsHTML() +
      '<section class="card savings-rates-card"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Bảng lãi suất & tỷ giá thị trường</div><div class="card-sub">TPCP Mỹ, vàng, USD/VND và EUR/USD · ' + active + ' khoản đang tích lũy</div></div><span class="badge ' + (savingsRates.live ? 'badge-live' : '') + '" id="savingsLiveBadge">' + (savingsRates.live ? 'LIVE' : 'FALLBACK') + '</span></div>' + savingsRateBoardHTML() + '</section>' +
      '<div class="savings-main"><div class="savings-main-col">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('grid') + ' Sản phẩm tích lũy</div><div class="card-sub" id="savingsRateRange">Lãi suất hiện tại: ' + nf(range.min, 2) + '% – ' + nf(range.max, 2) + '%/năm · cập nhật theo benchmark</div></div><div class="savings-filters">' +
      [['all', 'Tất cả'], ['vnd', 'VND'], ['fx', 'Ngoại tệ'], ['gold', 'Vàng']].map(f => '<button class="chip ' + (savingsFilter === f[0] ? 'active' : '') + '" data-savings-filter="' + f[0] + '">' + f[1] + '</button>').join('') + '</div></div>' + savingsProductsHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Khoản tích lũy của bạn</div><div class="card-sub">' + ensureSavings().contracts.length + ' khoản · giá trị quy đổi theo tỷ giá hiện tại</div></div><span class="badge badge-gold" id="savingsTotalBadge">' + fmtVND(savingsValue()) + '</span></div><div id="savingsContractsBox">' + savingsContractsHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Lịch sử tích lũy</div><div class="card-sub">Gửi, đáo hạn, tái tục và tất toán gần đây</div></div></div>' + savingsHistoryHTML() + '</section>' +
      '</div>' + savingsSidebarHTML() + '</div>' +
      savingsAnalysisHTML();
  }

  function updateSavingsConverter() {
    const amountEl = $('#savAmount');
    const fromEl = $('#savFrom');
    const toEl = $('#savTo');
    if (!amountEl || !fromEl || !toEl) return;
    const toVND = { vnd: 1, usd: savingsRates.usdvnd, eur: savingsRates.usdvnd * savingsRates.eurusd, jpy: savingsRates.usdvnd / savingsRates.jpy, gold: goldSpotVND() };
    const amount = Number(amountEl.value) || 0;
    const from = fromEl.value, to = toEl.value;
    const result = amount * (toVND[from] || 0) / (toVND[to] || 1);
    const out = $('#savResult');
    if (out) out.textContent = (to === 'vnd' ? nf(result, 0) + ' ₫' : to === 'gold' ? nf(result, 4) + ' gam' : nf(result, 2) + ' ' + to.toUpperCase());
    const rate = $('#savRate');
    if (rate) rate.textContent = '1 ' + from.toUpperCase() + ' = ' + (to === 'vnd' ? nf((toVND[from] || 0) / (toVND[to] || 1), 0) + ' ₫' : nf((toVND[from] || 0) / (toVND[to] || 1), 4) + ' ' + to.toUpperCase()) + ' · tỷ giá ' + (savingsRates.live ? 'trực tiếp' : 'mô phỏng');
  }

  function updateSavingsGrowth() {
    const initEl = $('#growthInitial'), monthlyEl = $('#growthMonthly'), yearsEl = $('#growthYears'), rateEl = $('#growthRate'), inflEl = $('#growthInfl');
    if (!initEl || !monthlyEl || !yearsEl || !rateEl || !inflEl) return;
    const initial = Math.max(0, Number(initEl.value) || 0);
    const monthly = Math.max(0, Number(monthlyEl.value) || 0);
    const years = clamp(Math.round(Number(yearsEl.value) || 1), 1, 40);
    const rate = clamp(Number(rateEl.value) || 0, 0, 30);
    const infl = clamp(Number(inflEl.value) || 0, 0, 30);
    const monthlyRate = rate / 100 / 12;
    let balance = initial;
    const points = [initial];
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) balance = balance * (1 + monthlyRate) + monthly;
      points.push(balance);
    }
    const contributed = initial + monthly * 12 * years;
    const interest = balance - contributed;
    const real = balance / Math.pow(1 + infl / 100, years);
    const out = $('#growthResult');
    if (out) out.innerHTML = '<div class="scr-label">Giá trị tương lai sau ' + years + ' năm</div><div class="scr-big">' + fmtVND(balance) + '</div><div class="scr-grid">' +
      '<div><span>Vốn đã góp</span><b>' + fmtVND(contributed) + '</b></div><div><span>Lãi kép</span><b class="up">+' + fmtVND(interest) + '</b></div>' +
      '<div><span>Giá trị thực sau lạm phát</span><b>' + fmtVND(real) + '</b></div><div><span>Tỷ lệ lãi / vốn</span><b>' + nf(contributed ? interest / contributed * 100 : 0, 1) + '%</b></div></div>' +
      '<div class="calc-note">Giả định lãi suất không đổi và lãi được nhập gốc hàng tháng. Thực tế lãi suất thay đổi theo thị trường.</div>';
    const canvas = $('#savingsGrowthCanvas');
    if (canvas) CH.MiniChart.line(canvas, points, { baseline: initial, formatAxis: v => money(v), xLabels: points.map((_, i) => 'N' + i) });
  }

  function updateSavingsGoal() {
    const targetEl = $('#goalTarget'), yearsEl = $('#goalYears'), rateEl = $('#goalRate'), initEl = $('#goalInitial');
    if (!targetEl || !yearsEl || !rateEl || !initEl) return;
    const target = Math.max(0, Number(targetEl.value) || 0);
    const years = clamp(Math.round(Number(yearsEl.value) || 1), 1, 40);
    const rate = clamp(Number(rateEl.value) || 0, 0, 30);
    const initial = Math.max(0, Number(initEl.value) || 0);
    const months = years * 12;
    const mr = rate / 100 / 12;
    const growth = Math.pow(1 + mr, months);
    const needed = target <= initial ? 0 : mr > 0 ? (target - initial * growth) * mr / (growth - 1) : (target - initial) / months;
    const contributed = initial + needed * months;
    const interest = target - contributed;
    const current = savingsValue() + state.cash;
    const out = $('#goalResult');
    if (out) out.innerHTML = '<div class="scr-label">Cần gửi mỗi tháng</div><div class="scr-big">' + fmtVND(Math.max(0, needed)) + '</div><div class="scr-grid">' +
      '<div><span>Mục tiêu</span><b>' + fmtVND(target) + '</b></div><div><span>Tổng vốn góp</span><b>' + fmtVND(contributed) + '</b></div>' +
      '<div><span>Lãi tạo ra</span><b class="up">+' + fmtVND(Math.max(0, interest)) + '</b></div><div><span>Hiện có / mục tiêu</span><b>' + nf(target ? clamp(current / target * 100, 0, 100) : 100, 1) + '%</b></div></div>' +
      '<div class="goal-progress"><span style="width:' + clamp(target ? current / target * 100 : 100, 0, 100) + '%"></span></div>' +
      '<div class="calc-note">' + (current >= target ? 'Bạn đã đủ vốn cho mục tiêu này theo giá trị hiện tại.' : 'Còn thiếu ' + fmtVND(target - current) + '. Tăng lãi suất hoặc kéo dài thời gian sẽ giảm số tiền phải gửi mỗi tháng.') + '</div>';
  }

  function refreshSavingsPanels() {
    if (currentRoute !== 'savings') return;
    if ($('#modalRoot .modal')) return;
    const snap = $('#savingsSnapshotWrap');
    if (snap) snap.outerHTML = savingsSnapshotCardsHTML();
    const board = $('#savingsRateBoard');
    if (board) board.outerHTML = savingsRateBoardHTML();
    const products = $('#savingsProducts');
    if (products) products.innerHTML = savingsFilteredProducts().map(savingsProductCardHTML).join('');
    const contracts = $('#savingsContractsBox');
    if (contracts) contracts.innerHTML = savingsContractsHTML();
    const comp = $('#savingsComposition');
    if (comp) comp.outerHTML = savingsCompositionHTML();
    const ladder = $('#savingsLadder');
    if (ladder) ladder.outerHTML = savingsLadderHTML();
    const live = $('#savingsLiveLabel');
    if (live) {
      live.className = 'status-pill ' + (savingsRates.live ? 'live' : 'demo');
      live.innerHTML = '<span class="dot"></span>' + savingsSourceText();
    }
    const liveBadge = $('#savingsLiveBadge');
    if (liveBadge) {
      liveBadge.className = 'badge ' + (savingsRates.live ? 'badge-live' : '');
      liveBadge.textContent = savingsRates.live ? 'LIVE' : 'FALLBACK';
    }
    const rangeEl = $('#savingsRateRange');
    if (rangeEl) {
      const range = savingsRateRange();
      rangeEl.textContent = 'Lãi suất hiện tại: ' + nf(range.min, 2) + '% – ' + nf(range.max, 2) + '%/năm · cập nhật theo benchmark';
    }
    const totalBadge = $('#savingsTotalBadge');
    if (totalBadge) totalBadge.textContent = fmtVND(savingsValue());
    updateSavingsConverter();
  }

  function mountSavings() {
    ensureSavings();
    processSavings();
    refreshSavingsRates();
    $$('[data-savings-filter]').forEach(el => el.addEventListener('click', () => {
      savingsFilter = el.getAttribute('data-savings-filter');
      $$('[data-savings-filter]').forEach(x => x.classList.toggle('active', x === el));
      const grid = $('#savingsProducts');
      if (grid) grid.innerHTML = savingsFilteredProducts().map(savingsProductCardHTML).join('');
    }));
    const analysisBody = $('#savingsAnalysisBody');
    if (analysisBody) {
      analysisBody.addEventListener('input', () => {
        if (savingsAnalysisTab === 'growth') updateSavingsGrowth();
        else if (savingsAnalysisTab === 'goal') updateSavingsGoal();
      });
    }
    $$('[data-savings-tab]').forEach(el => el.addEventListener('click', () => {
      savingsAnalysisTab = el.getAttribute('data-savings-tab');
      $$('[data-savings-tab]').forEach(x => x.classList.toggle('active', x === el));
      const body = $('#savingsAnalysisBody');
      if (body) {
        body.innerHTML = savingsAnalysisBodyHTML();
        if (savingsAnalysisTab === 'growth') updateSavingsGrowth();
        else if (savingsAnalysisTab === 'goal') updateSavingsGoal();
      }
    }));
    const amount = $('#savAmount');
    const from = $('#savFrom');
    const to = $('#savTo');
    if (amount) amount.addEventListener('input', updateSavingsConverter);
    if (from) from.addEventListener('change', updateSavingsConverter);
    if (to) to.addEventListener('change', updateSavingsConverter);
    updateSavingsConverter();
    if (savingsAnalysisTab === 'growth') updateSavingsGrowth();
    else if (savingsAnalysisTab === 'goal') updateSavingsGoal();
  }

  function openSavingsDeposit(productId) {
    const p = savingsProduct(productId);
    if (!p) return;
    const minVND = p.currency === 'VND' || p.kind === 'gold' ? p.min : p.min * savingsFx(p.currency);
    const gold = p.kind === 'gold';
    const rate = savingsRate(p);
    let autoRoll = p.termDays > 0;
    const body = '<div class="savings-modal-hero" style="--pc:' + p.color + '"><span class="smh-icon">' + p.icon + '</span><div class="smh-main"><b>' + esc(p.name) + '</b><span>' + esc(p.termLabel) + ' · ' + esc(p.benchmark) + '</span></div><div class="smh-rate"><b>' + (gold ? nf(goldBuyVND(), 0) : nf(rate, 2)) + '</b><span>' + (gold ? '₫/gam' : '%/năm') + '</span></div></div>' +
      '<div class="field"><label class="field-label" for="savingsAmount">Số tiền gửi <span class="hint">Tối thiểu ' + (p.currency === 'VND' || gold ? fmtVND(minVND) : nf(p.min, 0) + ' ' + p.currency) + '</span></label><input class="input mono" id="savingsAmount" type="number" min="0" step="100000" value="' + Math.min(100000000, Math.max(minVND, Math.floor(state.cash * 0.2 / 100000) * 100000)) + '"></div>' +
      '<div class="savings-quick">' + [10000000, 50000000, 100000000, 250000000].map(v => '<button class="chip" data-savings-quick="' + v + '">' + money(v) + ' ₫</button>').join('') + '<button class="chip" data-savings-quick="all">Tối đa</button></div>' +
      (p.termDays ? '<label class="check savings-check"><input type="checkbox" id="savingsAutoRoll"' + (autoRoll ? ' checked' : '') + '> Tự động tái tục khi đáo hạn (lãi nhập gốc)</label>' : '') +
      '<div class="savings-preview" id="savingsPreview"></div>' +
      '<div class="calc-note">' + (gold ? 'Giá mua đã gồm chênh lệch 0,8%. Giá trị hiện tại dùng giá bán để thận trọng. Vàng không có lãi suất.' : 'Lãi suất được khoá tại thời điểm gửi. Sản phẩm ngoại tệ còn biến động theo tỷ giá.') + '</div>';
    openModal({
      title: 'Gửi ' + p.name, sub: 'Ngân hàng AURELIS · mô phỏng, không phải sản phẩm huy động thật.', size: 'modal-md', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="savingsConfirm">' + (gold ? 'Mua vàng' : 'Xác nhận gửi') + '</button>',
      onOpen: modal => {
        const input = modal.querySelector('#savingsAmount');
        const preview = modal.querySelector('#savingsPreview');
        const roll = modal.querySelector('#savingsAutoRoll');
        const paint = () => {
          const amount = Math.max(0, Number(input.value) || 0);
          const fx = p.kind === 'gold' ? 1 : savingsFx(p.currency);
          const principal = gold ? amount / goldBuyVND() : amount / fx;
          const interest = gold ? 0 : principal * rate / 100 * p.termDays / 365;
          preview.innerHTML = '<div class="savings-preview-main"><span>' + (gold ? 'Số gam nhận được' : 'Giá trị dự kiến khi đáo hạn') + '</span><b>' + (gold ? nf(principal, 4) + ' gam' : fmtVND((principal + interest) * fx)) + '</b></div>' +
            '<div class="savings-preview-grid"><div><span>' + (gold ? 'Giá mua' : 'Tiền gốc') + '</span><b>' + (gold ? fmtVND(goldBuyVND()) + '/gam' : fmtVND(amount)) + '</b></div>' +
            '<div><span>' + (gold ? 'Giá bán hiện tại' : 'Lãi dự kiến') + '</span><b>' + (gold ? fmtVND(goldSellVND()) + '/gam' : '+' + fmtVND(interest * fx)) + '</b></div>' +
            '<div><span>' + (gold ? 'Chênh lệch mua/bán' : p.currency === 'VND' ? 'Lãi suất' : 'Quy đổi ngoại tệ') + '</span><b>' + (gold ? nf((goldBuyVND() - goldSellVND()) / goldBuyVND() * 100, 2) + '%' : p.currency === 'VND' ? nf(rate, 2) + '%/năm' : nf(principal, 2) + ' ' + p.currency) + '</b></div></div>';
        };
        input.addEventListener('input', paint);
        modal.querySelectorAll('[data-savings-quick]').forEach(b => b.addEventListener('click', () => {
          const v = b.getAttribute('data-savings-quick');
          input.value = v === 'all' ? Math.floor(state.cash / 100000) * 100000 : v;
          paint();
        }));
        if (roll) roll.addEventListener('change', () => { autoRoll = roll.checked; });
        const confirm = modal.querySelector('#savingsConfirm');
        confirm.addEventListener('click', () => {
          const amount = Math.max(0, Math.round(Number(input.value) || 0));
          const result = depositSavings(p.id, amount, autoRoll);
          if (!result.ok) toast('Không thể gửi', result.error, 'error', '⚠️');
        });
        paint();
      }
    });
  }

  function depositSavings(productId, amountVND, autoRoll, opts) {
    opts = opts || {};
    const p = savingsProduct(productId);
    if (!p) return { ok: false, error: 'Sản phẩm không tồn tại.' };
    const amount = Math.round(Number(amountVND) || 0);
    const minVND = p.currency === 'VND' || p.kind === 'gold' ? p.min : p.min * savingsFx(p.currency);
    if (!isFinite(amount) || amount <= 0) return { ok: false, error: 'Số tiền không hợp lệ.' };
    if (amount < minVND) return { ok: false, error: 'Số tiền tối thiểu là ' + fmtVND(minVND) + '.' };
    if (amount > state.cash) return { ok: false, error: 'Tiền mặt khả dụng không đủ. Bạn có ' + fmtVND(state.cash) + '.' };
    const now = Date.now();
    const gold = p.kind === 'gold';
    const c = {
      id: uid('sav'), productId: p.id, name: p.name, currency: p.currency, kind: p.kind,
      termDays: p.termDays, openedAt: now, maturityAt: p.termDays ? now + p.termDays * 86400000 : 0,
      principalVND: amount, principal: gold ? amount / goldBuyVND() : amount / savingsFx(p.currency),
      rate: gold ? 0 : savingsRate(p), autoRoll: !!autoRoll && p.termDays > 0, status: 'active', rolls: 0
    };
    if (gold) c.grams = c.principal;
    state.cash -= amount;
    const s = ensureSavings();
    s.contracts.push(c);
    s.deposits += 1;
    s.deposited += amount;
    if (gold) s.goldBought += 1;
    pushSavingsHistory('deposit', c, amount, opts.note || (gold ? 'Mua vàng' : 'Gửi mới'));
    progressQuest('savings', 1);
    snapshotEquity(true);
    saveNow();
    updateShell();
    if (!opts.silent) {
      closeModal();
      if (currentRoute === 'savings') renderRoute(); else refreshCurrentRoute();
      toast(gold ? 'Đã mua vàng tích lũy' : 'Gửi tiết kiệm thành công', (gold ? nf(c.grams, 4) + ' gam · ' : '') + fmtVND(amount) + ' · ' + (gold ? 'giá ' + fmtVND(goldBuyVND()) + '/gam' : nf(c.rate, 2) + '%/năm'), 'success', gold ? '🪙' : '🏦');
      confetti(18);
    }
    return { ok: true, contract: c };
  }

  function openSavingsWithdraw(id) {
    const c = ensureSavings().contracts.find(x => x.id === id);
    if (!c) return;
    const p = savingsProduct(c.productId);
    const gold = c.kind === 'gold';
    const early = !gold && c.status === 'active' && c.termDays > 0 && Date.now() < c.maturityAt;
    const fullInterest = contractInterest(c);
    let payableInterest = fullInterest;
    if (early) payableInterest = (Number(c.principal) || 0) * 0.5 / 100 * savingsTermDays(c) / 365;
    if (c.status === 'matured' && Number.isFinite(c.lockedInterest)) payableInterest = c.lockedInterest;
    const fx = gold ? 1 : savingsFx(c.currency);
    const proceeds = gold ? c.grams * goldSellVND() : (c.principal + payableInterest) * fx;
    const penalty = gold ? 0 : (fullInterest - payableInterest) * fx;
    const pnl = proceeds - contractCost(c);
    const body = '<div class="savings-withdraw-box"><div class="swb-head">' + (p ? p.icon : '🏦') + '<div><b>' + esc(p ? p.name : 'Tích lũy') + '</b><span>' + (gold ? nf(c.grams, 4) + ' gam' : (c.currency === 'VND' ? fmtVND(c.principal) : nf(c.principal, 2) + ' ' + c.currency)) + '</span></div><span class="badge ' + (early ? 'badge-down' : 'badge-up') + '">' + (early ? 'RÚT TRƯỚC HẠN' : c.status === 'matured' ? 'ĐÁO HẠN' : 'TẤT TOÁN') + '</span></div>' +
      '<div class="swb-rows"><div><span>Tiền gốc quy đổi</span><b>' + fmtVND(contractCost(c)) + '</b></div><div><span>Lãi được hưởng</span><b class="up">+' + fmtVND(payableInterest * fx) + '</b></div>' +
      (early && penalty >= 1000 ? '<div><span>Lãi bị mất do rút sớm</span><b class="down">−' + fmtVND(penalty) + '</b></div>' : '') +
      '<div class="swb-total"><span>Thực nhận vào tiền mặt</span><b>' + fmtVND(proceeds) + '</b></div><div><span>Lãi / chênh lệch so với gốc</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + '</b></div></div>' +
      '<div class="calc-note">' + (gold ? 'Vàng được bán theo giá bán mô phỏng, đã trừ chênh lệch 0,8%.' : early ? 'Rút trước hạn: lãi tính theo lãi không kỳ hạn 0,5%/năm cho số ngày thực gửi.' : 'Tiền sẽ quay về tiền mặt khả dụng ngay lập tức.') + '</div></div>';
    openModal({
      title: 'Tất toán khoản tích lũy', sub: 'Kiểm tra kỹ trước khi xác nhận.', size: 'modal-md', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Giữ lại</button><button class="btn ' + (early ? 'btn-down' : 'btn-gold') + ' btn-sm" id="savingsWithdrawConfirm">' + (early ? 'Rút trước hạn' : 'Tất toán') + '</button>',
      onOpen: modal => {
        modal.querySelector('#savingsWithdrawConfirm').addEventListener('click', () => {
          withdrawSavings(c.id, proceeds, payableInterest, early, gold);
        });
      }
    });
  }

  function withdrawSavings(id, proceeds, payableInterest, early, gold) {
    const s = ensureSavings();
    const c = s.contracts.find(x => x.id === id);
    if (!c) return;
    s.contracts = s.contracts.filter(x => x.id !== id);
    state.cash += Math.round(proceeds);
    pushSavingsHistory('withdraw', c, proceeds, early ? 'Rút trước hạn' : 'Tất toán');
    snapshotEquity(true);
    saveNow();
    closeModal();
    updateShell();
    if (currentRoute === 'savings') renderRoute(); else refreshCurrentRoute();
    toast('Đã tất toán', fmtVND(proceeds) + ' đã quay về tiền mặt.' + (early ? ' Lãi suất không kỳ hạn được áp dụng.' : ''), early ? 'info' : 'success', gold ? '🪙' : '🏦');
  }

  function toggleSavingsRoll(id) {
    const c = ensureSavings().contracts.find(x => x.id === id);
    if (!c || !c.termDays || c.status !== 'active') return;
    c.autoRoll = !c.autoRoll;
    saveNow();
    toast(c.autoRoll ? 'Đã bật tự động tái tục' : 'Đã tắt tự động tái tục', c.autoRoll ? 'Khi đáo hạn, lãi sẽ nhập gốc và tiếp tục kỳ hạn mới.' : 'Khi đáo hạn, khoản tiền sẽ chờ bạn tất toán.', 'info', '🔄');
    renderRoute();
  }

  /* ------------------------------ CREDIT VIEW ------------------------------ */
  function creditSnapshot() {
    const now = Date.now();
    const score = creditScore();
    const grade = creditGrade(score);
    const limit = creditLimit();
    const principal = loanPrincipalTotal();
    const debt = loanDebtTotal(now);
    const available = Math.max(0, limit - principal);
    const util = limit > 0 ? clamp(principal / limit * 100, 0, 100) : 0;
    const c = ensureCredit();
    return { now, score, grade, limit, principal, debt, available, util, c };
  }

  function loanDurationLabel(ms) {
    ms = Math.max(0, ms);
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return Math.max(1, totalMinutes) + ' phút';
    const hours = Math.floor(totalMinutes / 60);
    if (hours < 24) {
      const mins = totalMinutes % 60;
      return hours + ' giờ' + (mins ? ' ' + mins + ' phút' : '');
    }
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return days + ' ngày' + (rem ? ' ' + rem + ' giờ' : '');
  }
  function loanTimeLabel(l, now) {
    if (!l) return '';
    if (l.status === 'repaid') return 'Đã tất toán';
    const left = (Number(l.dueAt) || 0) - (now || Date.now());
    if (left <= 0) return 'Quá hạn ' + loanDurationLabel(-left);
    return 'Còn ' + loanDurationLabel(left);
  }
  function loanStatusBadge(l, now) {
    if (l.status === 'repaid') return '<em class="credit-loan-status done">ĐÃ TẤT TOÁN</em>';
    if (loanIsOverdue(l, now)) return '<em class="credit-loan-status overdue">QUÁ HẠN</em>';
    return '<em class="credit-loan-status active">ĐANG VAY</em>';
  }

  function creditHeroHTML() {
    const s = creditSnapshot();
    return '<section class="credit-hero">' +
      '<div class="credit-hero-main">' +
      '<div class="credit-score-ring" data-credit-ring style="--pct:' + nf(s.score / 850 * 100, 0) + ';--sc:' + s.grade.color + '">' +
      '<div class="credit-score-inner"><span>ĐIỂM TÍN DỤNG</span><b data-credit-score>' + s.score + '</b><em data-credit-grade style="color:' + s.grade.color + '">' + esc(s.grade.label) + '</em></div></div>' +
      '<div class="credit-hero-copy"><div class="credit-hero-eyebrow">AURELIS CREDIT · HỒ SƠ TÍN DỤNG</div>' +
      '<h2>Vay nhanh, trả đúng hạn,<br>mở rộng hạn mức theo thời gian.</h2>' +
      '<p>Lãi tính đơn theo giờ trên dư nợ gốc. Sản phẩm 6 giờ và 24 giờ phù hợp nhu cầu thanh khoản; gói 7 ngày và 30 ngày có lãi suất theo ngày thấp hơn. Quá hạn chuyển sang lãi phạt và điểm tín dụng giảm.</p>' +
      '<div class="credit-hero-actions"><button class="btn btn-gold btn-sm" data-action="credit-borrow" data-id="fast_6h">' + icon('bolt') + ' Vay nhanh</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="credit-score-info">' + icon('info') + ' Cách tính điểm</button></div></div></div>' +
      '<div class="credit-hero-side">' +
      '<div class="credit-stat"><span>Hạn mức tín dụng</span><b data-credit-limit>' + fmtVND(s.limit) + '</b><small>Dựa trên tài sản ròng & điểm tín dụng</small></div>' +
      '<div class="credit-stat"><span>Dư nợ hiện tại</span><b data-credit-debt class="' + (s.debt > 0 ? 'down' : '') + '">' + fmtVND(s.debt) + '</b><small>Gốc + lãi + lãi phạt</small></div>' +
      '<div class="credit-stat"><span>Hạn mức khả dụng</span><b data-credit-available class="up">' + fmtVND(s.available) + '</b><small>Có thể giải ngân ngay</small></div>' +
      '<div class="credit-util"><div><span>Tỷ lệ sử dụng</span><b data-credit-util>' + nf(s.util, 1) + '%</b></div><div class="credit-util-bar"><span data-credit-util-bar style="width:' + s.util + '%"></span></div><small>Nên giữ dưới 50% để điểm tín dụng ổn định</small></div>' +
      '</div></section>';
  }

  function creditProductCardHTML(p) {
    const available = Math.min(p.maxAmount, creditAvailable());
    const blocked = available < p.minAmount;
    const full = creditActiveLoans().length >= CREDIT_MAX_ACTIVE;
    return '<article class="credit-product" style="--pc:' + p.color + '">' +
      '<div class="credit-product-head"><span class="credit-product-icon">' + p.icon + '</span><div><b>' + esc(p.name) + '</b><span>' + esc(p.tag) + '</span></div><em>' + esc(p.rateLabel) + '</em></div>' +
      '<p class="credit-product-desc">' + esc(p.desc) + '</p>' +
      '<div class="credit-product-metrics"><div><span>Hạn mức tối đa</span><b>' + fmtVND(p.maxAmount) + '</b></div><div><span>Kỳ hạn</span><b>' + esc(p.termLabel) + '</b></div></div>' +
      '<div class="credit-product-avail">Khả dụng cho gói này: <b data-credit-product-available="' + p.id + '">' + fmtVND(available) + '</b></div>' +
      '<div class="credit-product-note">' + esc(p.note) + '</div>' +
      '<button class="btn btn-sm ' + (blocked || full ? 'btn-ghost' : 'btn-gold') + ' btn-block" data-action="credit-borrow" data-id="' + p.id + '" data-credit-product-btn="' + p.id + '" ' + (blocked || full ? 'disabled' : '') + '>' + (full ? 'Đã đạt giới hạn khoản vay' : blocked ? 'Chưa đủ hạn mức' : 'Vay ' + esc(p.short)) + '</button>' +
      '</article>';
  }

  function creditLoanRowHTML(l) {
    const p = loanProduct(l.productId);
    const now = Date.now();
    const live = loanLiveInterest(l, now);
    const total = (Number(l.principal) || 0) + live.interest + live.penalty;
    const overdue = loanIsOverdue(l, now);
    const elapsed = clamp((now - l.openedAt) / Math.max(1, l.dueAt - l.openedAt) * 100, 0, 100);
    return '<article class="credit-loan ' + (overdue ? 'overdue' : '') + '" data-loan-row="' + l.id + '">' +
      '<div class="credit-loan-head"><span class="credit-loan-icon" style="--pc:' + (p ? p.color : 'var(--gold)') + '">' + (p ? p.icon : '💳') + '</span>' +
      '<div><b>' + esc(p ? p.name : 'Khoản vay') + '</b><span>Giải ngân ' + dateLabel(l.openedAt) + ' · Đáo hạn ' + dateLabel(l.dueAt) + '</span></div>' +
      '<em class="credit-loan-status ' + (overdue ? 'overdue' : 'active') + '" data-loan-status>' + (overdue ? 'QUÁ HẠN' : 'ĐANG VAY') + '</em></div>' +
      '<div class="credit-loan-money">' +
      '<div><span>Gốc còn lại</span><b data-loan-principal>' + fmtVND(l.principal) + '</b></div>' +
      '<div><span>Lãi tích lũy</span><b data-loan-interest class="gold">' + fmtVND(live.interest) + '</b></div>' +
      '<div><span>Lãi phạt</span><b data-loan-penalty class="' + (live.penalty > 0 ? 'down' : '') + '">' + fmtVND(live.penalty) + '</b></div>' +
      '<div><span>Tổng phải trả</span><b data-loan-total>' + fmtVND(total) + '</b></div></div>' +
      '<div class="credit-loan-bar"><span data-loan-progress style="width:' + elapsed + '%"></span></div>' +
      '<div class="credit-loan-foot"><span class="credit-loan-time ' + (overdue ? 'down' : '') + '" data-loan-time>' + loanTimeLabel(l, now) + '</span>' +
      '<div class="credit-loan-actions"><button class="btn btn-xs btn-ghost" data-action="credit-repay" data-id="' + l.id + '">Trả một phần</button>' +
      '<button class="btn btn-xs btn-gold" data-action="credit-repay" data-id="' + l.id + '" data-full="1">Tất toán</button></div></div></article>';
  }

  function creditLoansHTML() {
    const active = creditActiveLoans();
    if (!active.length) {
      return '<div class="empty-state"><div class="empty-icon">💳</div><strong>Chưa có khoản vay nào</strong><p>Chọn một gói bên trên để giải ngân. Hãy tính toán thời điểm trả để tránh lãi phạt quá hạn.</p><button class="btn btn-sm btn-outline-gold" data-action="credit-borrow" data-id="fast_24h">Xem gói vay</button></div>';
    }
    return '<div class="credit-loans">' + active.map(creditLoanRowHTML).join('') + '</div>' +
      '<div class="credit-loans-foot"><span>' + active.length + '/' + CREDIT_MAX_ACTIVE + ' khoản đang mở</span><button class="btn btn-xs btn-ghost" data-action="credit-repay-all">' + icon('check') + ' Tất toán tất cả</button></div>';
  }

  function creditHistoryHTML() {
    const c = ensureCredit();
    if (!c.history.length) {
      return '<div class="empty-state"><div class="empty-icon">🧾</div><strong>Chưa có lịch sử tín dụng</strong><p>Mỗi lần giải ngân và thanh toán sẽ được ghi lại tại đây.</p></div>';
    }
    return '<div class="credit-history">' + c.history.slice(0, 14).map(h => {
      const p = loanProduct(h.productId);
      const isBorrow = h.type === 'borrow';
      const isSettle = h.type === 'settle';
      return '<div class="credit-history-row"><span class="credit-history-icon ' + (isBorrow ? 'borrow' : isSettle ? 'settle' : 'repay') + '">' + (isBorrow ? '💳' : isSettle ? '✅' : '💵') + '</span>' +
        '<div><b>' + esc(h.name || (p ? p.name : 'Khoản vay')) + '</b><span>' + timeAgo(h.at) + ' · ' + esc(h.note || (isBorrow ? 'Giải ngân' : 'Thanh toán')) + '</span></div>' +
        '<em class="' + (isBorrow ? 'gold' : 'up') + '">' + (isBorrow ? '+' : '-') + fmtVND(h.amount) + '</em></div>';
    }).join('') + '</div>';
  }

  function creditHTML() {
    const s = creditSnapshot();
    const active = creditActiveLoans();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('scale') + ' Tín dụng · Mô phỏng</div><h1>Tín dụng & Vay vốn</h1>' +
      '<p class="sub">Vay nhanh theo giờ hoặc theo ngày, trả trước hạn để giảm lãi. Điểm tín dụng 300–850 quyết định hạn mức; quá hạn chịu lãi phạt và làm xấu hồ sơ. Toàn bộ là mô phỏng trong vốn ảo.</p></div>' +
      '<div class="head-actions"><span class="badge ' + (s.score >= 660 ? 'badge-up' : 'badge-gold') + '">Điểm ' + s.score + ' · ' + esc(s.grade.label) + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="credit-repay-all" ' + (active.length ? '' : 'disabled') + '>' + icon('check') + ' Tất toán tất cả</button>' +
      '<button class="btn btn-gold btn-sm" data-action="credit-borrow" data-id="fast_6h">' + icon('bolt') + ' Vay nhanh</button></div></div>' +
      creditHeroHTML() +
      '<section class="card credit-products-card"><div class="card-head"><div><div class="card-title">' + icon('money') + ' Sản phẩm vay</div><div class="card-sub">Lãi đơn theo giờ trên dư nợ gốc · chọn kỳ hạn phù hợp với dòng tiền</div></div><span class="badge badge-gold">' + D.LOAN_PRODUCTS.length + ' gói</span></div>' +
      '<div class="credit-products">' + D.LOAN_PRODUCTS.map(creditProductCardHTML).join('') + '</div></section>' +
      '<div class="two-col credit-cols"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('clock') + ' Khoản vay đang mở</div><div class="card-sub">' + (active.length ? active.length + ' khoản · cập nhật lãi theo thời gian thực' : 'Chưa có dư nợ') + '</div></div>' + (active.length ? '<span class="badge badge-down">' + fmtVND(s.debt) + '</span>' : '') + '</div>' + creditLoansHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('file') + ' Lịch sử tín dụng</div><div class="card-sub">Giải ngân, thanh toán và tất toán gần nhất</div></div><span class="badge">' + ensureCredit().history.length + '</span></div>' + creditHistoryHTML() + '</section></div>' +
      '<section class="card credit-guide"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Cách tính lãi & điểm tín dụng</div><div class="card-sub">Minh bạch công thức để bạn chủ động trả nợ</div></div><span class="badge badge-gold">LÃI ĐƠN</span></div>' +
      '<div class="credit-guide-grid"><div class="credit-formula"><span>Lãi trong hạn</span><code>Lãi = Gốc × lãi suất/giờ × số giờ</code><small>Ví dụ: vay 50 triệu, 0,10%/giờ, sau 6 giờ lãi = 50.000.000 × 0,001 × 6 = 300.000 ₫.</small></div>' +
      '<div class="credit-formula penalty"><span>Lãi quá hạn</span><code>Phạt = Gốc × lãi phạt/giờ × số giờ quá hạn</code><small>Quá hạn chuyển toàn bộ thời gian vượt hạn sang mức phạt cao hơn và điểm tín dụng giảm.</small></div>' +
      '<div class="credit-formula score"><span>Điểm tín dụng</span><code>300 → 850</code><small>Tăng khi trả đúng hạn; giảm khi quá hạn, nợ xấu hoặc dùng quá nhiều hạn mức. Hạn mức = tài sản ròng × hệ số theo điểm.</small></div></div>' +
      '<div class="calc-note">AURELIS Credit là sản phẩm mô phỏng phục vụ học tập. Không có hợp đồng tín dụng thật, không có nghĩa vụ trả nợ ngoài đời và không phải lời khuyên vay vốn.</div></section>';
  }

  function updateCreditLive() {
    if (document.hidden || currentRoute !== 'credit') return;
    const s = creditSnapshot();
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText('[data-credit-score]', String(s.score));
    const gradeEl = $('[data-credit-grade]');
    if (gradeEl) { gradeEl.textContent = s.grade.label; gradeEl.style.color = s.grade.color; }
    const ring = $('[data-credit-ring]');
    if (ring) { ring.style.setProperty('--pct', nf(s.score / 850 * 100, 0)); ring.style.setProperty('--sc', s.grade.color); }
    setText('[data-credit-limit]', fmtVND(s.limit));
    const debtEl = $('[data-credit-debt]');
    if (debtEl) { debtEl.textContent = fmtVND(s.debt); debtEl.classList.toggle('down', s.debt > 0); }
    setText('[data-credit-available]', fmtVND(s.available));
    setText('[data-credit-util]', nf(s.util, 1) + '%');
    const utilBar = $('[data-credit-util-bar]');
    if (utilBar) utilBar.style.width = s.util + '%';
    $$('[data-credit-product-available]').forEach(el => {
      const p = loanProduct(el.getAttribute('data-credit-product-available'));
      if (p) el.textContent = fmtVND(Math.min(p.maxAmount, s.available));
    });
    $$('[data-loan-row]').forEach(row => {
      const l = ensureCredit().loans.find(x => x.id === row.getAttribute('data-loan-row'));
      if (!l) return;
      const live = loanLiveInterest(l, s.now);
      const total = (Number(l.principal) || 0) + live.interest + live.penalty;
      const overdue = loanIsOverdue(l, s.now);
      const principalEl = row.querySelector('[data-loan-principal]');
      const interestEl = row.querySelector('[data-loan-interest]');
      const penaltyEl = row.querySelector('[data-loan-penalty]');
      const totalEl = row.querySelector('[data-loan-total]');
      const timeEl = row.querySelector('[data-loan-time]');
      const statusEl = row.querySelector('[data-loan-status]');
      const progressEl = row.querySelector('[data-loan-progress]');
      if (principalEl) principalEl.textContent = fmtVND(l.principal);
      if (interestEl) interestEl.textContent = fmtVND(live.interest);
      if (penaltyEl) { penaltyEl.textContent = fmtVND(live.penalty); penaltyEl.classList.toggle('down', live.penalty > 0); }
      if (totalEl) totalEl.textContent = fmtVND(total);
      if (timeEl) { timeEl.textContent = loanTimeLabel(l, s.now); timeEl.classList.toggle('down', overdue); }
      if (statusEl) { statusEl.textContent = overdue ? 'QUÁ HẠN' : 'ĐANG VAY'; statusEl.className = 'credit-loan-status ' + (overdue ? 'overdue' : 'active'); }
      if (progressEl) progressEl.style.width = clamp((s.now - l.openedAt) / Math.max(1, l.dueAt - l.openedAt) * 100, 0, 100) + '%';
      row.classList.toggle('overdue', overdue);
    });
  }

  function mountCredit() {
    ensureCredit();
    processLoans();
    if (creditTimer) clearInterval(creditTimer);
    creditTimer = setInterval(updateCreditLive, 1000);
    updateCreditLive();
  }

  function openBorrowModal(productId) {
    const p = loanProduct(productId);
    if (!p) return;
    processLoans();
    const available = Math.min(p.maxAmount, creditAvailable());
    if (available < p.minAmount) {
      return toast('Chưa đủ hạn mức', 'Hạn mức khả dụng hiện tại là ' + fmtVND(Math.max(0, creditAvailable())) + '. Trả bớt nợ hoặc tăng tài sản ròng để mở hạn mức.', 'error', '💳');
    }
    const suggested = Math.min(available, Math.max(p.minAmount, Math.round(available * 0.5 / 1000000) * 1000000));
    const chips = [p.minAmount, 10000000, 25000000, 50000000, Math.round(available / 1000000) * 1000000]
      .filter((v, i, arr) => v >= p.minAmount && v <= available && arr.indexOf(v) === i);
    const body = '<div class="credit-modal-hero" style="--pc:' + p.color + '"><span class="credit-modal-icon">' + p.icon + '</span><div><b>' + esc(p.name) + '</b><span>' + esc(p.termLabel) + ' · ' + esc(p.rateLabel) + ' · tối đa ' + fmtVND(p.maxAmount) + '</span></div><em>' + esc(p.risk) + '</em></div>' +
      '<div class="field"><label class="field-label" for="creditAmount">Số tiền muốn vay <span class="hint">Khả dụng ' + fmtVND(available) + '</span></label><input class="input mono" id="creditAmount" type="number" min="' + p.minAmount + '" max="' + available + '" step="100000" value="' + suggested + '"></div>' +
      '<div class="credit-quick">' + chips.map(v => '<button class="chip" data-credit-quick="' + v + '">' + money(v) + ' ₫</button>').join('') + '<button class="chip" data-credit-quick="' + Math.floor(available / 100000) * 100000 + '">Tối đa</button></div>' +
      '<div class="credit-preview" id="creditPreview"></div>' +
      '<div class="calc-note">Lãi tính đơn trên dư nợ gốc theo giờ. Bạn có thể trả một phần hoặc tất toán trước hạn bất kỳ lúc nào; lãi chỉ tính đến thời điểm trả. ' + esc(p.note) + '</div>';
    openModal({
      title: p.icon + ' Vay ' + p.name,
      sub: 'AURELIS Credit · giải ngân vào tiền mặt · mô phỏng trong vốn ảo',
      size: 'modal-md',
      body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="creditConfirm">' + icon('bolt') + ' Giải ngân</button>',
      onOpen: modal => {
        const input = modal.querySelector('#creditAmount');
        const preview = modal.querySelector('#creditPreview');
        const confirm = modal.querySelector('#creditConfirm');
        const paint = () => {
          const amount = Math.max(0, Math.round(Number(input.value) || 0));
          const interest = amount * p.ratePerHour * p.termHours;
          const total = amount + interest;
          const dailyRate = p.ratePerHour * 24 * 100;
          const valid = amount >= p.minAmount && amount <= available;
          preview.innerHTML = '<div class="credit-preview-main"><span>Tổng phải trả nếu đúng hạn</span><b>' + fmtVND(total) + '</b></div>' +
            '<div class="credit-preview-grid"><div><span>Tiền gốc</span><b>' + fmtVND(amount) + '</b></div>' +
            '<div><span>Lãi dự kiến</span><b class="gold">+' + fmtVND(interest) + '</b></div>' +
            '<div><span>Lãi suất/ngày</span><b>' + nf(dailyRate, 3) + '%</b></div>' +
            '<div><span>Đáo hạn</span><b>' + dateLabel(Date.now() + p.termHours * 3600000) + '</b></div></div>' +
            '<div class="credit-preview-warn ' + (valid ? 'ok' : 'bad') + '">' + (valid ? 'Trong hạn mức · có thể giải ngân' : amount < p.minAmount ? 'Tối thiểu ' + fmtVND(p.minAmount) : 'Vượt hạn mức khả dụng ' + fmtVND(available)) + '</div>';
          if (confirm) confirm.disabled = !valid;
        };
        input.addEventListener('input', paint);
        modal.querySelectorAll('[data-credit-quick]').forEach(b => b.addEventListener('click', () => {
          input.value = b.getAttribute('data-credit-quick');
          paint();
        }));
        confirm.addEventListener('click', () => {
          const amount = Math.round(Number(input.value) || 0);
          const res = borrowLoan(p.id, amount);
          if (!res.ok) return toast('Không thể giải ngân', res.error, 'error', '⚠️');
          closeModal();
          if (currentRoute === 'credit') renderRoute(); else refreshCurrentRoute();
        });
        paint();
      }
    });
  }

  function openRepayModal(loanId, full) {
    processLoans();
    const l = ensureCredit().loans.find(x => x.id === loanId);
    if (!l || l.status === 'repaid') return toast('Khoản vay đã tất toán', 'Không còn dư nợ cho khoản vay này.', 'info', '✅');
    const p = loanProduct(l.productId);
    const now = Date.now();
    const live = loanLiveInterest(l, now);
    const total = Math.max(0, (Number(l.principal) || 0) + live.interest + live.penalty);
    const maxPay = Math.min(total, state.cash);
    const suggested = full ? maxPay : Math.min(total, Math.max(0, Math.round(maxPay * 0.5 / 100000) * 100000));
    const body = '<div class="credit-modal-hero" style="--pc:' + (p ? p.color : 'var(--gold)') + '"><span class="credit-modal-icon">' + (p ? p.icon : '💳') + '</span><div><b>' + esc(p ? p.name : 'Khoản vay') + '</b><span>' + loanTimeLabel(l, now) + ' · đáo hạn ' + dateLabel(l.dueAt) + '</span></div><em class="' + (loanIsOverdue(l, now) ? 'down' : '') + '">' + (loanIsOverdue(l, now) ? 'QUÁ HẠN' : 'TRONG HẠN') + '</em></div>' +
      '<div class="credit-repay-summary"><div><span>Gốc còn lại</span><b>' + fmtVND(l.principal) + '</b></div><div><span>Lãi tích lũy</span><b class="gold">' + fmtVND(live.interest) + '</b></div><div><span>Lãi phạt</span><b class="' + (live.penalty > 0 ? 'down' : '') + '">' + fmtVND(live.penalty) + '</b></div><div class="total"><span>Tổng phải trả</span><b>' + fmtVND(total) + '</b></div></div>' +
      '<div class="field"><label class="field-label" for="creditRepayAmount">Số tiền thanh toán <span class="hint">Tiền mặt ' + fmtVND(state.cash) + '</span></label><input class="input mono" id="creditRepayAmount" type="number" min="0" max="' + maxPay + '" step="100000" value="' + suggested + '"></div>' +
      '<div class="credit-quick">' + [25, 50, 75, 100].map(pct => '<button class="chip" data-credit-repay-pct="' + pct + '">' + pct + '% tổng nợ</button>').join('') + '<button class="chip" data-credit-repay-pct="cash">Tối đa tiền mặt</button></div>' +
      '<div class="credit-preview" id="creditRepayPreview"></div>' +
      '<div class="calc-note">Thanh toán được phân bổ theo thứ tự: lãi phạt → lãi trong hạn → gốc. Trả trước hạn chỉ chịu lãi đến thời điểm thanh toán, không có phí phạt trả trước.</div>';
    openModal({
      title: '💳 Trả nợ khoản vay',
      sub: 'AURELIS Credit · thanh toán một phần hoặc tất toán',
      size: 'modal-md',
      body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="creditRepayConfirm">Xác nhận thanh toán</button>',
      onOpen: modal => {
        const input = modal.querySelector('#creditRepayAmount');
        const preview = modal.querySelector('#creditRepayPreview');
        const confirm = modal.querySelector('#creditRepayConfirm');
        const paint = () => {
          const amount = clamp(Number(input.value) || 0, 0, maxPay);
          const remaining = Math.max(0, total - amount);
          const closes = remaining <= 1;
          preview.innerHTML = '<div class="credit-preview-main"><span>' + (closes ? 'Sau thanh toán: tất toán khoản vay' : 'Còn lại sau thanh toán') + '</span><b>' + fmtVND(remaining) + '</b></div>' +
            '<div class="credit-preview-grid"><div><span>Thanh toán</span><b>' + fmtVND(amount) + '</b></div><div><span>Tiền mặt còn lại</span><b>' + fmtVND(Math.max(0, state.cash - amount)) + '</b></div><div><span>Trạng thái</span><b class="' + (closes ? 'up' : 'gold') + '">' + (closes ? 'Tất toán' : 'Trả một phần') + '</b></div><div><span>Điểm tín dụng dự kiến</span><b>' + (closes ? creditScore() + 6 : creditScore()) + '</b></div></div>' +
            '<div class="credit-preview-warn ' + (amount > 0 && amount <= state.cash ? 'ok' : 'bad') + '">' + (amount <= 0 ? 'Nhập số tiền thanh toán' : amount > state.cash ? 'Tiền mặt không đủ' : closes ? 'Khoản vay sẽ được đóng và ghi nhận đúng hạn' : 'Khoản vay tiếp tục tích lũy lãi trên gốc còn lại') + '</div>';
          if (confirm) confirm.disabled = amount <= 0 || amount > state.cash;
        };
        input.addEventListener('input', paint);
        modal.querySelectorAll('[data-credit-repay-pct]').forEach(b => b.addEventListener('click', () => {
          const v = b.getAttribute('data-credit-repay-pct');
          input.value = v === 'cash' ? Math.floor(maxPay / 100000) * 100000 : Math.floor(total * Number(v) / 100 / 100000) * 100000;
          paint();
        }));
        confirm.addEventListener('click', () => {
          const amount = clamp(Number(input.value) || 0, 0, maxPay);
          const res = repayLoan(l.id, amount);
          if (!res.ok) return toast('Không thể thanh toán', res.error, 'error', '⚠️');
          closeModal();
          if (currentRoute === 'credit') renderRoute(); else refreshCurrentRoute();
        });
        paint();
      }
    });
  }

  function creditScoreInfoModal() {
    const s = creditSnapshot();
    openModal({
      title: '📊 Cách tính điểm tín dụng',
      sub: 'AURELIS Credit · thang điểm 300–850',
      size: 'modal-md',
      body: '<div class="credit-score-modal"><div class="credit-score-modal-top"><div class="credit-score-ring small" style="--pct:' + nf(s.score / 850 * 100, 0) + ';--sc:' + s.grade.color + '"><div class="credit-score-inner"><span>HIỆN TẠI</span><b>' + s.score + '</b><em style="color:' + s.grade.color + '">' + esc(s.grade.label) + '</em></div></div><div><b>' + esc(s.grade.label) + '</b><p>' + esc(s.grade.note) + '</p><span class="badge badge-gold">Hạn mức ' + fmtVND(s.limit) + '</span></div></div>' +
        '<div class="credit-score-factor"><span>Nền tảng</span><b>650 điểm</b><small>Mọi hồ sơ mới bắt đầu ở mức trung bình.</small></div>' +
        '<div class="credit-score-factor up"><span>Trả đúng hạn</span><b>+6 điểm / lần</b><small>Tối đa +90 điểm từ lịch sử trả đúng hạn.</small></div>' +
        '<div class="credit-score-factor up"><span>Tổng giá trị đã trả</span><b>+8 điểm / 50 triệu</b><small>Tối đa +40 điểm, khuyến khích dòng tiền đều.</small></div>' +
        '<div class="credit-score-factor down"><span>Quá hạn</span><b>-35 điểm / khoản</b><small>Lãi phạt tăng và hạn mức bị siết cho đến khi tất toán.</small></div>' +
        '<div class="credit-score-factor down"><span>Nợ xấu / trả muộn</span><b>-55 / -12 điểm</b><small>Hồ sơ yếu cần thời gian và các khoản trả đúng hạn để phục hồi.</small></div>' +
        '<div class="credit-score-factor down"><span>Tỷ lệ sử dụng hạn mức</span><b>tối đa -90 điểm</b><small>Dư nợ càng cao so với tài sản ròng, điểm càng giảm.</small></div>' +
        '<div class="calc-note">Điểm được tính lại theo thời gian thực từ dữ liệu trong trình duyệt. Đây là cơ chế trò chơi, không phải điểm tín dụng thật.</div></div>',
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button><button class="btn btn-gold btn-sm" data-action="credit-borrow" data-id="fast_24h">Vay thử</button>'
    });
  }

  /* ------------------------------ LIBRARY VIEW ------------------------------ */
  function libraryCountText() {
    const list = libraryFiltered();
    const stats = libraryStats();
    if (!libraryQuery && libraryCategory === 'all' && libraryLevel === 'all') {
      return stats.total + ' mục · ' + stats.withData + ' mục có số liệu & biểu đồ · đã đọc ' + stats.read + ' · đã lưu ' + stats.saved;
    }
    return list.length + ' kết quả · đã đọc ' + stats.read + '/' + stats.total;
  }

  function libraryAxisNum(value) {
    const abs = Math.abs(value);
    if (abs >= 1000000) return nf(value / 1000000, 1) + 'M';
    if (abs >= 1000) return nf(value / 1000, 1) + 'k';
    if (abs >= 100) return nf(value, 0);
    if (abs >= 10) return nf(value, 1);
    return nf(value, 2);
  }

  function libraryChartSVG(visual) {
    const labels = visual.labels || [];
    const series = (visual.series || []).filter(s => Array.isArray(s.values) && s.values.length);
    if (!labels.length || !series.length) return '';
    const kind = visual.kind || 'line';
    const W = 560, H = 214, pad = { l: 46, r: 16, t: 16, b: 34 };
    const all = [];
    series.forEach(s => s.values.forEach(v => { if (Number.isFinite(v)) all.push(v); }));
    if (!all.length) return '';
    let min = Math.min.apply(null, all);
    let max = Math.max.apply(null, all);
    if (kind === 'bar') { min = Math.min(0, min); max = Math.max(0, max); }
    if (max === min) { max += 1; min -= 1; }
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const x = i => pad.l + (labels.length > 1 ? i / (labels.length - 1) * plotW : plotW / 2);
    const y = v => pad.t + (max - v) / (max - min) * plotH;
    const zero = y(clamp(0, min, max));
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const val = min + (max - min) * i / 4;
      const gy = y(val);
      grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + gy.toFixed(1) + '" class="lib-grid"/>' +
        '<text x="' + (pad.l - 7) + '" y="' + (gy + 3).toFixed(1) + '" class="lib-axis-label" text-anchor="end">' + esc(libraryAxisNum(val)) + '</text>';
    }
    const showEvery = labels.length > 9 ? Math.ceil(labels.length / 8) : 1;
    const xLabels = labels.map((label, i) => {
      if (i % showEvery !== 0 && i !== labels.length - 1) return '';
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 12) + '" class="lib-axis-label" text-anchor="middle">' + esc(label) + '</text>';
    }).join('');
    let marks = '';
    if (kind === 'bar') {
      const groupW = plotW / labels.length;
      const barW = Math.max(2, groupW * 0.68 / series.length);
      series.forEach((s, si) => {
        s.values.forEach((v, i) => {
          if (!Number.isFinite(v)) return;
          const cx = pad.l + groupW * i + groupW / 2;
          const bx = cx - (barW * series.length) / 2 + si * barW;
          const top = y(Math.max(v, 0));
          const bottom = y(Math.min(v, 0));
          marks += '<rect x="' + bx.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, bottom - top).toFixed(1) + '" rx="2" fill="' + (s.color || '#f3c56b') + '" opacity=".88"><title>' + esc(s.name + ': ' + v) + '</title></rect>';
        });
      });
    } else {
      if (min < 0 && max > 0) marks += '<line x1="' + pad.l + '" y1="' + zero.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + zero.toFixed(1) + '" class="lib-zero"/>';
      series.forEach(s => {
        const pts = [];
        s.values.forEach((v, i) => { if (Number.isFinite(v)) pts.push({ x: x(i), y: y(v), v, i }); });
        if (!pts.length) return;
        if (pts.length > 1) {
          const poly = pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
          if (s.fill) {
            marks += '<polygon points="' + pts[0].x.toFixed(1) + ',' + zero.toFixed(1) + ' ' + poly + ' ' + pts[pts.length - 1].x.toFixed(1) + ',' + zero.toFixed(1) + '" fill="' + (s.color || '#f3c56b') + '" opacity=".09"/>';
          }
          marks += '<polyline points="' + poly + '" fill="none" stroke="' + (s.color || '#f3c56b') + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
        }
        pts.forEach(p => {
          marks += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="' + (s.color || '#f3c56b') + '" stroke="#0b131a" stroke-width="1"><title>' + esc(s.name + ' · ' + labels[p.i] + ': ' + p.v) + '</title></circle>';
        });
      });
    }
    return '<svg class="library-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(visual.title || 'Biểu đồ dữ liệu') + '">' +
      grid + xLabels + marks + '</svg>';
  }

  function libraryMiniChartSVG(entry) {
    const visual = entry.visual;
    if (!visual || !Array.isArray(visual.series) || !visual.series.length) return '';
    const values = (visual.series[0].values || []).filter(Number.isFinite);
    if (values.length < 2) return '';
    const W = 150, H = 38, pad = 3;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = max - min || 1;
    const x = i => pad + i / (values.length - 1) * (W - pad * 2);
    const y = v => H - pad - (v - min) / span * (H - pad * 2);
    const color = visual.series[0].color || '#f3c56b';
    if (visual.kind === 'bar') {
      const bw = (W - pad * 2) / values.length * 0.62;
      return '<svg class="library-mini-chart" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        values.map((v, i) => {
          const top = Math.min(y(v), y(0));
          const bottom = Math.max(y(v), y(0));
          return '<rect x="' + (pad + i / values.length * (W - pad * 2) + 1).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, bottom - top).toFixed(1) + '" rx="1" fill="' + color + '" opacity=".75"/>';
        }).join('') + '</svg>';
    }
    const pts = values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    return '<svg class="library-mini-chart" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<polygon points="' + pad + ',' + (H - pad) + ' ' + pts + ' ' + (W - pad) + ',' + (H - pad) + '" fill="' + color + '" opacity=".10"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }

  function libraryVisualHTML(entry) {
    const visual = entry.visual;
    const metrics = entry.metrics || [];
    if (!visual && !metrics.length) return '';
    const legend = visual && visual.series && visual.series.length > 1
      ? '<div class="library-chart-legend">' + visual.series.map(s => '<span><i style="background:' + (s.color || '#f3c56b') + '"></i>' + esc(s.name) + '</span>').join('') + '</div>'
      : '';
    const zoomBtn = visual
      ? '<button class="library-chart-zoom" data-action="library-chart-zoom" data-id="' + entry.id + '" aria-label="Phóng to biểu đồ" title="Phóng to biểu đồ">' + icon('external') + ' Phóng to</button>'
      : '';
    return '<div class="library-visual">' +
      '<div class="library-visual-head"><span>' + icon('chart') + ' DỮ LIỆU & HÌNH ẢNH</span><b>' + esc((visual && visual.title) || 'Số liệu minh hoạ') + '</b>' +
      '<div class="library-visual-tools">' + (visual && visual.unit ? '<em>' + esc(visual.unit) + '</em>' : '') + zoomBtn + '</div></div>' +
      (metrics.length ? '<div class="library-metrics-grid">' + metrics.map(m => '<div class="library-metric"><span>' + esc(m.label) + '</span><b>' + esc(m.value) + '</b>' + (m.hint ? '<small>' + esc(m.hint) + '</small>' : '') + '</div>').join('') + '</div>' : '') +
      (visual ? '<div class="library-chart-wrap">' + libraryChartSVG(visual) + '</div>' + legend + (visual.note ? '<div class="library-chart-note">' + icon('info') + ' ' + esc(visual.note) + '</div>' : '') : '') +
      '</div>';
  }

  function libraryCardHTML(entry) {
    const cat = libraryCategoryDef(entry.category);
    const lib = ensureLibrary();
    const read = lib.read.includes(entry.id);
    const saved = lib.saved.includes(entry.id);
    return '<article class="library-card ' + (read ? 'is-read' : '') + '" style="--lc:' + cat.color + '" data-action="library-open" data-id="' + entry.id + '">' +
      '<div class="library-card-top"><span class="library-cat" style="--lc:' + cat.color + '">' + cat.icon + ' ' + esc(cat.short) + '</span><span class="library-level">' + esc(entry.level) + '</span></div>' +
      '<h3>' + esc(entry.title) + '</h3><p>' + esc(entry.subtitle) + '</p>' +
      '<div class="library-card-formula">' + esc(entry.formula) + '</div>' +
      (entry.visual ? '<div class="library-card-spark">' + libraryMiniChartSVG(entry) + '<button class="library-card-zoom" data-action="library-chart-zoom" data-id="' + entry.id + '" aria-label="Phóng to biểu đồ" title="Phóng to biểu đồ">' + icon('external') + '</button></div>' : '') +
      (entry.metrics && entry.metrics.length ? '<div class="library-card-metrics">' + entry.metrics.slice(0, 2).map(m => '<span><em>' + esc(m.label) + '</em><b>' + esc(m.value) + '</b></span>').join('') + (entry.visual ? '<span class="library-card-data-flag">' + icon('chart') + ' số liệu</span>' : '') + '</div>' : '') +
      '<div class="library-card-tags">' + (entry.tags || []).slice(0, 3).map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' +
      '<div class="library-card-foot"><span class="library-read-state">' + (read ? '✓ Đã đọc' : 'Chưa đọc') + '</span>' +
      '<button class="library-save ' + (saved ? 'active' : '') + '" data-action="library-save" data-id="' + entry.id + '" aria-label="Lưu mục này" aria-pressed="' + (saved ? 'true' : 'false') + '">' + icon('star') + '</button></div></article>';
  }

  function libraryGridHTML() {
    const list = libraryFiltered();
    if (!list.length) {
      return '<div class="empty-state"><div class="empty-icon">🔎</div><strong>Không tìm thấy mục phù hợp</strong><p>Thử từ khoá khác hoặc bỏ bộ lọc danh mục / cấp độ.</p><button class="btn btn-sm btn-outline-gold" data-action="library-reset">Xoá bộ lọc</button></div>';
    }
    return list.map(libraryCardHTML).join('');
  }

  function refreshLibraryGrid() {
    const grid = $('#libraryGrid');
    if (grid) grid.innerHTML = libraryGridHTML();
    const count = $('#libraryCount');
    if (count) count.textContent = libraryCountText();
  }

  function libraryHTML() {
    const stats = libraryStats();
    const cats = D.LIBRARY_CATEGORIES;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('book') + ' Thư viện · Kiến thức tài chính</div><h1>Thư viện tài chính</h1>' +
      '<p class="sub">Định lý, công thức doanh nghiệp, phương pháp phân tích và khái niệm cốt lõi — viết ngắn, có ví dụ và liên kết với công việc, tín dụng và danh mục của bạn.</p></div>' +
      '<div class="head-actions"><span class="badge badge-gold">' + stats.total + ' mục</span><button class="btn btn-ghost btn-sm" data-action="library-random">' + icon('sparkles') + ' Đọc ngẫu nhiên</button><button class="btn btn-gold btn-sm" data-nav="#/credit">' + icon('scale') + ' Tín dụng & vay</button></div></div>' +
      '<section class="library-hero"><div class="library-hero-copy"><div class="library-hero-eyebrow">TỪ BÁO CÁO TÀI CHÍNH ĐẾN QUYẾT ĐỊNH</div><h2>Đọc doanh nghiệp bằng số liệu, không bằng cảm giác.</h2><p>57 mục gồm định lý, công thức và khái niệm. 20 công thức doanh nghiệp mới đi thẳng vào báo cáo tài chính: ROIC, dòng tiền, đòn bẩy, định giá, chất lượng lợi nhuận và rủi ro kiệt quệ.</p>' +
      '<div class="library-hero-actions"><button class="btn btn-gold btn-sm" data-action="library-random">' + icon('book') + ' Mở một mục ngẫu nhiên</button><button class="btn btn-ghost btn-sm" data-nav="#/jobs">' + icon('briefcase') + ' Việc làm cần kiến thức</button></div></div>' +
      '<div class="library-hero-stats"><div><b>' + stats.total + '</b><span>mục kiến thức</span></div><div><b>' + stats.withData + '</b><span>mục có số liệu</span></div><div><b>' + stats.categories + '</b><span>nhóm chủ đề</span></div><div><b>' + stats.read + '</b><span>mục đã đọc</span></div><div><b>' + stats.saved + '</b><span>mục đã lưu</span></div></div></section>' +
      '<section class="card library-browser"><div class="library-toolbar"><div class="library-search">' + icon('search') + '<input id="librarySearch" type="search" placeholder="Tìm định lý, công thức, khái niệm…" value="' + esc(libraryQuery) + '" autocomplete="off"></div>' +
      '<div class="library-filter-row"><span class="library-filter-label">Nhóm</span><button class="chip ' + (libraryCategory === 'all' ? 'active' : '') + '" data-library-cat="all">Tất cả</button>' +
      cats.map(c => '<button class="chip ' + (libraryCategory === c.id ? 'active' : '') + '" data-library-cat="' + c.id + '">' + c.icon + ' ' + esc(c.short) + '</button>').join('') + '</div>' +
      '<div class="library-filter-row"><span class="library-filter-label">Cấp độ</span><button class="chip ' + (libraryLevel === 'all' ? 'active' : '') + '" data-library-level="all">Mọi cấp</button>' +
      LIBRARY_LEVELS.map(l => '<button class="chip ' + (libraryLevel === l ? 'active' : '') + '" data-library-level="' + l + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="library-count" id="libraryCount">' + libraryCountText() + '</div>' +
      '<div class="library-grid" id="libraryGrid">' + libraryGridHTML() + '</div></section>';
  }

  function mountLibrary() {
    ensureLibrary();
    const search = $('#librarySearch');
    if (search) {
      search.addEventListener('input', () => {
        libraryQuery = search.value;
        refreshLibraryGrid();
      });
    }
    $$('[data-library-cat]').forEach(el => el.addEventListener('click', () => {
      libraryCategory = el.getAttribute('data-library-cat');
      $$('[data-library-cat]').forEach(x => x.classList.toggle('active', x === el));
      refreshLibraryGrid();
    }));
    $$('[data-library-level]').forEach(el => el.addEventListener('click', () => {
      libraryLevel = el.getAttribute('data-library-level');
      $$('[data-library-level]').forEach(x => x.classList.toggle('active', x === el));
      refreshLibraryGrid();
    }));
  }

  function openLibraryEntry(id) {
    const entry = libraryEntry(id);
    if (!entry) return;
    const isNew = markLibraryRead(id);
    const cat = libraryCategoryDef(entry.category);
    const lib = ensureLibrary();
    const saved = lib.saved.includes(id);
    const related = (entry.related || []).map(rel => {
      const e = libraryEntry(rel);
      if (e) return '<button class="chip library-related-chip" data-action="library-open" data-id="' + e.id + '">' + esc(e.title) + '</button>';
      const job = JOBS_BY_ID[rel];
      if (job) return '<button class="chip" data-nav="#/jobs">' + job.icon + ' ' + esc(job.title) + '</button>';
      return '';
    }).filter(Boolean).join('');
    openModal({
      title: cat.icon + ' ' + esc(entry.title),
      sub: esc(cat.name) + ' · ' + esc(entry.level) + ' · ' + esc(entry.subtitle),
      size: 'modal-lg modal-library',
      body: '<div class="library-detail"><div class="library-detail-formula"><span>CÔNG THỨC / MÔ HÌNH</span><code>' + esc(entry.formula) + '</code></div>' +
        libraryVisualHTML(entry) +
        '<div class="library-detail-block"><h4>Tóm tắt</h4><p>' + esc(entry.summary) + '</p></div>' +
        '<div class="library-detail-block"><h4>Giải thích</h4><p>' + esc(entry.detail) + '</p></div>' +
        '<div class="library-detail-example"><span>VÍ DỤ</span><p>' + esc(entry.example) + '</p></div>' +
        '<div class="library-detail-tags">' + (entry.tags || []).map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' +
        (related ? '<div class="library-related"><span>Liên quan</span><div>' + related + '</div></div>' : '') +
        '</div>',
      foot: '<button class="btn btn-ghost btn-sm ' + (saved ? 'btn-outline-gold' : '') + '" id="librarySaveBtn" data-action="library-save" data-id="' + entry.id + '">' + icon('star') + ' ' + (saved ? 'Đã lưu' : 'Lưu mục') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="library-random">' + icon('sparkles') + ' Mục khác</button>' +
        '<button class="btn btn-gold btn-sm" data-close-modal>Đóng</button>',
      onOpen: () => { if (isNew) refreshLibraryGrid(); }
    });
  }

  function openRandomLibraryEntry() {
    const pool = libraryFiltered().length ? libraryFiltered() : D.LIBRARY;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) openLibraryEntry(pick.id);
  }

  /* ------------------------------ CRYPTO ------------------------------ */
  let cryptoDepthData = null;
  let derivsCache = [];

  function cryptoFearIndex() {
    const coins = D.ASSETS.filter(a => a.group === 'crypto');
    const avg = coins.reduce((s, a) => s + (a.changePct || 0), 0) / (coins.length || 1);
    const score = Math.round(clamp(50 + avg * 7, 4, 96));
    const label = score >= 75 ? 'Tham lam cực độ' : score >= 55 ? 'Tham lam' : score >= 45 ? 'Trung tính' : score >= 25 ? 'Sợ hãi' : 'Sợ hãi cực độ';
    const color = score >= 55 ? 'var(--up)' : score >= 45 ? 'var(--gold)' : 'var(--down)';
    return { score, label, color, avg };
  }

  function cryptoVolume() {
    return D.ASSETS.filter(a => a.group === 'crypto').reduce((s, a) => s + (a.price || 0) * (a.volume || 0), 0);
  }

  function heatColor(pct) {
    const a = clamp(Math.abs(pct) / 8, 0.08, 0.65);
    return pct >= 0 ? 'rgba(46,230,166,' + a.toFixed(2) + ')' : 'rgba(255,93,115,' + a.toFixed(2) + ')';
  }

  function cryptoHeatmapHTML() {
    const coins = D.ASSETS.filter(a => a.group === 'crypto');
    return '<div class="heatmap-wrap">' + coins.map(a =>
      '<div class="heat-tile ' + (a.id === 'btc' ? 'big' : a.id === 'eth' ? 'wide' : '') + '" data-crypto-id="' + a.id + '" style="background:' + heatColor(a.changePct) + '"><span class="heat-sym">' + esc(a.symbol) + '</span><span class="heat-chg">' + fmtPct(a.changePct) + '</span></div>').join('') + '</div>';
  }

  function cryptoCardsHTML() {
    return D.ASSETS.filter(a => a.group === 'crypto').map(a =>
      '<div class="coin-card" data-crypto-id="' + a.id + '"><div class="coin-top">' + assetLogo(a) +
      '<div><div class="coin-sym">' + esc(a.symbol) + '</div><div class="coin-name">' + esc(a.name) + '</div></div>' +
      '<button class="star-btn ' + (state.watchlist.includes(a.id) ? 'active' : '') + '" data-action="star" data-id="' + a.id + '" aria-label="Yêu thích">' + icon('star') + '</button></div>' +
      '<div class="coin-price" data-q-price="' + a.id + '">' + fmtPrice(a) + '</div>' +
      '<div class="coin-chg ' + changeCls(a.changePct) + '" data-q-chg="' + a.id + '">' + fmtPct(a.changePct) + '</div>' +
      '<div class="coin-chart">' + CH.MiniChart.sparkSVG(sparkFor(a)) + '</div>' +
      '<div class="coin-bottom"><span class="coin-vol">KL ' + money(a.volume || 0) + '</span><div class="coin-actions"><button class="btn btn-xs btn-ghost" data-action="trade" data-id="' + a.id + '">Mua</button><button class="chip" data-action="terminal" data-id="' + a.id + '">Chart</button></div></div></div>').join('');
  }

  function orderbookHTML(depth) {
    if (!depth || !depth.bids || !depth.asks) {
      return '<div class="table-empty">Đang tải sổ lệnh…</div>';
    }
    const asks = depth.asks.slice(0, 7).slice().reverse();
    const bids = depth.bids.slice(0, 7);
    const max = Math.max.apply(null, asks.concat(bids).map(r => r.qty).filter(isFinite).concat([1]));
    const row = (r, side) => '<div class="ob-row ' + side + '"><span class="ob-bar" style="width:' + clamp(r.qty / max * 100, 4, 100) + '%"></span><span class="ob-price">' + nf(r.price, r.price > 1000 ? 1 : 3) + '</span><span class="ob-qty">' + nf(r.qty, 4) + '</span></div>';
    return '<div class="orderbook"><div class="ob-head"><span>Giá (USD)</span><span>KL</span></div>' +
      asks.map(r => row(r, 'ask')).join('') + '<div class="ob-mid">' + nf((asks[asks.length - 1].price + bids[0].price) / 2, 2) + ' <span>USD</span></div>' +
      bids.map(r => row(r, 'bid')).join('') + '</div>';
  }

  async function refreshCryptoDepth() {
    const sel = $('#cryptoDepthSelect');
    const symbol = sel ? sel.value : 'BTCUSDT';
    const box = $('#cryptoOrderbook');
    if (box && !cryptoDepthData) box.innerHTML = '<div class="table-empty">Đang tải sổ lệnh…</div>';
    const depth = await API.depth(symbol);
    if (depth) cryptoDepthData = depth;
    else {
      const asset = D.ASSETS.find(a => a.binance === symbol) || byId.btc;
      const spread = asset.price * 0.0002;
      const bids = [], asks = [];
      for (let i = 0; i < 8; i++) {
        bids.push({ price: asset.price - spread * (i + 1), qty: asset.price > 10000 ? Math.random() * 2 + 0.1 : Math.random() * 500 + 10 });
        asks.push({ price: asset.price + spread * (i + 1), qty: asset.price > 10000 ? Math.random() * 2 + 0.1 : Math.random() * 500 + 10 });
      }
      cryptoDepthData = { ok: true, bids, asks };
    }
    const target = $('#cryptoOrderbook');
    if (target) target.innerHTML = orderbookHTML(cryptoDepthData);
  }

  function converterRate(id) {
    if (id === 'vnd') return 1;
    if (id === 'usd' || id === 'usdt') return fxRate();
    const a = byId[id];
    if (!a) return 0;
    return notionalVND(a, a.price, 1);
  }

  function updateCryptoConverter() {
    const from = $('#convFrom');
    const to = $('#convTo');
    const amount = $('#convAmount');
    if (!from || !to || !amount) return;
    const val = Number(amount.value || 0);
    const rFrom = converterRate(from.value);
    const rTo = converterRate(to.value);
    const result = rTo ? val * rFrom / rTo : 0;
    const out = $('#convResult');
    if (out) out.textContent = nf(result, to.value === 'vnd' ? 0 : to.value === 'usd' || to.value === 'usdt' ? 2 : 6) + ' ' + to.value.toUpperCase();
    const rate = $('#convRate');
    if (rate) rate.textContent = '1 ' + from.value.toUpperCase() + ' = ' + nf(rFrom / (rTo || 1), to.value === 'vnd' ? 0 : 2) + ' ' + to.value.toUpperCase();
  }

  function converterOptions(selected) {
    const opts = [['btc', 'BTC · Bitcoin'], ['eth', 'ETH · Ethereum'], ['sol', 'SOL · Solana'], ['bnb', 'BNB'], ['xrp', 'XRP'], ['doge', 'DOGE'], ['usdt', 'USDT · Tether'], ['usd', 'USD · Đô la Mỹ'], ['vnd', 'VND · Việt Nam đồng']];
    return opts.map(o => '<option value="' + o[0] + '"' + (selected === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');
  }

  function fundingItemHTML(asset, idx) {
    const apiMap = { btcperp: 'BTCUSDT', ethperp: 'ETHUSDT' };
    const item = derivsCache.find(x => x.symbol === apiMap[asset.id]);
    const funding = item && isFinite(item.funding) ? item.funding : (Math.sin(Date.now() / 43200000 + idx) * 0.00022);
    const longPct = item && isFinite(item.longAccount) ? item.longAccount * 100 : clamp(48 + asset.changePct * 4, 30, 70);
    const shortPct = 100 - longPct;
    return '<div class="funding-item"><div class="funding-head">' + assetLogo(asset) + '<b>' + esc(asset.symbol) + '</b><span class="funding-value ' + changeCls(funding) + '">' + (funding * 100).toFixed(4) + '%</span></div>' +
      '<div class="funding-bar"><span class="long" style="width:' + longPct + '%"></span><span class="short" style="width:' + shortPct + '%"></span></div>' +
      '<div class="funding-meta"><span>Long ' + nf(longPct, 1) + '%</span><span>Short ' + nf(shortPct, 1) + '%</span><span>8 giờ</span></div></div>';
  }

  function fundingListHTML(limit) {
    const assets = D.ASSETS.filter(a => a.group === 'derivatives').slice(0, limit || 6);
    return assets.map(fundingItemHTML).join('');
  }

  function cryptoHTML() {
    const fear = cryptoFearIndex();
    const coins = D.ASSETS.filter(a => a.group === 'crypto');
    const top = coins.slice().sort((a, b) => b.changePct - a.changePct)[0];
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('coin') + ' Crypto · Giao dịch 24/7</div><h1>Thị trường crypto</h1><p class="sub">Bitcoin, Ethereum và altcoin với giá Binance trực tiếp khi có kết nối. Sổ lệnh, funding và bộ chuyển đổi tài sản trong cùng một màn hình.</p></div>' +
      '<div class="head-actions"><span class="status-pill ' + (sourceMode() === 'demo' ? 'demo' : 'live') + '"><span class="dot"></span><span data-source-label>' + (sourceMode() === 'demo' ? 'Mô phỏng' : 'Binance live') + '</span></span><button class="btn btn-gold btn-sm" data-nav="#/terminal">' + icon('chart') + ' Mở terminal</button></div></div>' +
      '<div class="crypto-banner">' +
      '<div class="summary-card"><div class="summary-label">' + icon('coin') + ' Vốn hoá ước tính 24h</div><div class="summary-value">' + money(cryptoVolume()) + ' $</div><div class="summary-desc">' + coins.length + ' tài sản · thanh khoản Binance</div></div>' +
      '<div class="summary-card fear-card"><div class="fear-ring" style="--val:' + fear.score + ';--fc:' + fear.color + '"><b>' + fear.score + '</b></div><div><div class="summary-label">Fear & Greed</div><div class="summary-value" style="font-size:12px">' + fear.label + '</div></div></div>' +
      '<div class="summary-card"><div class="summary-label">' + icon('bolt') + ' Dẫn dắt 24h</div><div class="summary-value" style="font-size:14px">' + esc(top ? top.symbol : '—') + ' <span class="' + changeCls(top ? top.changePct : 0) + '" style="font-size:10px">' + fmtPct(top ? top.changePct : 0) + '</span></div><div class="summary-desc">' + esc(top ? top.name : '') + '</div></div>' +
      '<div class="summary-card"><div class="summary-label">' + icon('clock') + ' Phiên giao dịch</div><div class="summary-value" style="font-size:16px">24 / 7</div><div class="summary-desc">Không nghỉ · không đóng cửa</div></div></div>' +
      '<div class="crypto-layout"><div class="dash-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('grid') + ' Bảng giá coin</div><div class="card-sub">Nhấn vào coin để mở terminal</div></div><span class="badge badge-cyan">BINANCE</span></div><div class="crypto-grid" id="cryptoGrid">' + cryptoCardsHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Bản đồ nhiệt 24h</div><div class="card-sub">Màu càng đậm, biến động càng mạnh</div></div><span class="badge">' + coins.length + ' coin</span></div><div id="cryptoHeatmap">' + cryptoHeatmapHTML() + '</div></section></div>' +
      '<aside class="crypto-side">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Sổ lệnh</div><div class="card-sub">Độ sâu thị trường trực tiếp</div></div><select class="select" id="cryptoDepthSelect" style="width:100px;height:27px;font-size:8px"><option value="BTCUSDT">BTC</option><option value="ETHUSDT">ETH</option><option value="SOLUSDT">SOL</option><option value="BNBUSDT">BNB</option></select></div><div id="cryptoOrderbook">' + orderbookHTML(cryptoDepthData) + '</div><div class="calc-note">Sổ lệnh Binance · cập nhật mỗi 12 giây</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('calculator') + ' Chuyển đổi</div><div class="card-sub">Quy đổi theo tỷ giá thời gian thực</div></div></div><div class="converter-box">' +
      '<div class="converter-row"><input class="input mono" id="convAmount" type="number" value="1" min="0" step="any"><select class="select" id="convFrom">' + converterOptions('btc') + '</select></div>' +
      '<div class="converter-eq" id="convResult">—</div>' +
      '<div class="converter-row"><input class="input" value="Quy đổi sang" disabled style="opacity:.6"><select class="select" id="convTo">' + converterOptions('usd') + '</select></div>' +
      '<div class="calc-note" id="convRate">—</div></div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('flame') + ' Funding & Long/Short</div><div class="card-sub">Tâm lý thị trường phái sinh</div></div></div><div id="cryptoFunding">' + fundingListHTML(4) + '</div><button class="btn btn-xs btn-ghost btn-block" data-nav="#/derivatives" style="margin-top:9px">Xem toàn bộ phái sinh</button></section>' +
      '<div class="risk-warning-inline">' + icon('alert') + ' Crypto biến động mạnh và giao dịch 24/7. Không có phiên nghỉ nghĩa là rủi ro qua đêm luôn tồn tại. Chỉ dùng vốn ảo để luyện tập.</div></aside></div>';
  }

  async function mountCrypto() {
    const grid = $('#cryptoGrid');
    if (grid) grid.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      const card = e.target.closest('[data-crypto-id]');
      if (card) switchTerminalAsset(card.getAttribute('data-crypto-id'));
    });
    const heat = $('#cryptoHeatmap');
    if (heat) heat.addEventListener('click', e => {
      const tile = e.target.closest('[data-crypto-id]');
      if (tile) switchTerminalAsset(tile.getAttribute('data-crypto-id'));
    });
    const sel = $('#cryptoDepthSelect');
    if (sel) sel.addEventListener('change', () => { cryptoDepthData = null; refreshCryptoDepth(); });
    ['convAmount', 'convFrom', 'convTo'].forEach(id => {
      const el = $('#' + id);
      if (el) el.addEventListener('input', updateCryptoConverter);
      if (el) el.addEventListener('change', updateCryptoConverter);
    });
    updateCryptoConverter();
    refreshCryptoDepth();
    if (cryptoPoll) clearInterval(cryptoPoll);
    cryptoPoll = setInterval(() => { if (currentRoute === 'crypto') refreshCryptoDepth(); }, 12000);
    try {
      derivsCache = await API.derivatives();
    } catch (e) { derivsCache = []; }
    const fund = $('#cryptoFunding');
    if (fund && currentRoute === 'crypto') fund.innerHTML = fundingListHTML(4);
  }

  /* ------------------------------ DERIVATIVES ------------------------------ */
  let derivCalc = { assetId: 'btcperp', side: 'long', leverage: 10, qty: 0.01 };

  function derivStatsHTML() {
    const positions = positionList();
    const margin = positions.reduce((s, p) => s + p.margin, 0);
    const exposure = positions.reduce((s, p) => s + p.notionalNow, 0);
    const pnl = positions.reduce((s, p) => s + p.pnl, 0);
    const buffer = netWorth() ? margin / netWorth() * 100 : 0;
    return '<div class="deriv-stats"><div class="deriv-stat"><div class="lbl">Vị thế mở</div><div class="val">' + positions.length + '</div></div>' +
      '<div class="deriv-stat"><div class="lbl">Ký quỹ</div><div class="val">' + money(margin) + ' ₫</div></div>' +
      '<div class="deriv-stat"><div class="lbl">PnL chưa thực hiện</div><div class="val ' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫</div></div>' +
      '<div class="deriv-stat"><div class="lbl">Tỷ lệ ký quỹ</div><div class="val ' + (buffer > 30 ? 'down' : 'up') + '">' + nf(buffer, 1) + '%</div></div></div>' +
      '<div class="risk-meter"><div class="risk-meter-head"><span>Sức chịu đựng ký quỹ</span><span>Dư nợ hiện tại ' + money(exposure) + ' ₫</span></div><div class="risk-meter-bar"><span style="width:' + clamp(buffer, 2, 100) + '%"></span></div></div>';
  }

  function contractCardsHTML() {
    return '<div class="contract-grid">' + D.ASSETS.filter(a => a.group === 'derivatives').map(a => {
      const f = fundingItemHTML(a, 0);
      void f;
      return '<div class="contract-card"><div class="contract-head">' + assetLogo(a) + '<div><div class="contract-sym">' + esc(a.symbol) + '</div><div class="contract-sub">' + esc(a.name) + '</div></div><span class="contract-lev">' + a.maxLeverage + 'x</span></div>' +
        '<div class="contract-price" data-q-price="' + a.id + '">' + fmtPrice(a) + '</div><div class="contract-change ' + changeCls(a.changePct) + '" data-q-chg="' + a.id + '">' + fmtPct(a.changePct) + '</div>' +
        '<div class="contract-meta"><span>Ký quỹ tối thiểu<br><b>' + money(notionalVND(a, a.price, stepFor(a)) / a.maxLeverage) + ' ₫</b></span><span style="text-align:right">Bước giá<br><b>' + fmtQty(a, stepFor(a)) + ' ' + esc(a.unit) + '</b></span></div>' +
        '<div class="contract-actions"><button class="btn btn-sm btn-up" data-action="deriv-trade" data-id="' + a.id + '" data-side="long">Long</button><button class="btn btn-sm btn-down" data-action="deriv-trade" data-id="' + a.id + '" data-side="short">Short</button></div></div>';
    }).join('') + '</div>';
  }

  function derivPositionsTableHTML() {
    if (!state.positions.length) return '<div class="empty-state"><div class="empty-icon">📉</div><strong>Chưa có vị thế</strong><p>Chọn một hợp đồng phía trên, sau đó mở Long hoặc Short. Hãy bắt đầu với đòn bẩy thấp.</p></div>';
    return '<div class="table-wrap"><table class="data-table pos-table"><thead><tr><th>Hợp đồng</th><th>Hướng</th><th class="text-right">KL</th><th class="text-right">Entry</th><th class="text-right">Mark</th><th class="text-right">Đòn bẩy</th><th class="text-right">Ký quỹ</th><th class="text-right">PnL</th><th class="text-right">Thanh lý</th><th></th></tr></thead><tbody>' +
      positionList().map(p => '<tr><td>' + assetCell(p.asset, { name: false }) + '</td><td><span class="pos-side ' + p.side + '">' + p.side.toUpperCase() + '</span></td>' +
        '<td class="text-right vol-cell">' + fmtQty(p.asset, p.qty) + '</td><td class="text-right vol-cell">' + fmtPrice(p.asset, p.entry) + '</td><td class="text-right price-cell" data-q-price="' + p.asset.id + '">' + fmtPrice(p.asset) + '</td>' +
        '<td class="text-right vol-cell">' + p.leverage + 'x</td><td class="text-right vol-cell">' + money(p.margin) + ' ₫</td><td class="text-right ' + changeCls(p.pnl) + ' price-cell">' + (p.pnl >= 0 ? '+' : '') + money(p.pnl) + ' ₫</td>' +
        '<td class="text-right down vol-cell">' + fmtPrice(p.asset, p.liq) + '</td><td class="text-right"><button class="btn btn-xs btn-ghost" data-action="close-pos" data-id="' + p.id + '">Đóng</button></td></tr>').join('') +
      '</tbody></table></div>';
  }

  function derivCalcHTML() {
    const a = byId[derivCalc.assetId] || D.ASSETS.find(x => x.id === 'btcperp');
    const lev = clamp(Number(derivCalc.leverage) || 10, 1, a.maxLeverage || 10);
    const qty = Number(derivCalc.qty) || 0;
    derivCalc.qty = qty;
    const price = a.price;
    const notional = notionalVND(a, price, qty);
    const margin = notional / lev;
    const fee = notional * 0.0004;
    const liq = derivCalc.side === 'long' ? price * (1 - 0.9 / lev) : price * (1 + 0.9 / lev);
    return '<div class="margin-calc"><div class="form-stack"><div class="field"><label class="field-label" for="calcAsset">Hợp đồng</label><select class="select" id="calcAsset">' + D.ASSETS.filter(x => x.group === 'derivatives').map(x => '<option value="' + x.id + '"' + (x.id === a.id ? ' selected' : '') + '>' + esc(x.symbol) + ' · ' + x.maxLeverage + 'x</option>').join('') + '</select></div>' +
      '<div class="form-row"><div class="field"><label class="field-label">Hướng</label><div class="segmented block"><button class="seg ' + (derivCalc.side === 'long' ? 'active up' : '') + '" data-calc-side="long">Long</button><button class="seg ' + (derivCalc.side === 'short' ? 'active down' : '') + '" data-calc-side="short">Short</button></div></div>' +
      '<div class="field"><label class="field-label" for="calcQty">Khối lượng</label><input class="input mono" id="calcQty" type="number" step="' + (stepFor(a) < 1 ? stepFor(a) : 1) + '" value="' + qty + '"></div></div>' +
      '<div class="field"><label class="field-label">Đòn bẩy <span class="hint" id="calcLevLabel">' + lev + 'x</span></label><input class="range" id="calcLev" type="range" min="1" max="' + (a.maxLeverage || 10) + '" value="' + lev + '"><div class="leverage-marks"><span>1x</span><span>' + Math.round((a.maxLeverage || 10) / 2) + 'x</span><span>' + (a.maxLeverage || 10) + 'x</span></div></div></div>' +
      '<div class="order-summary"><div class="kv-row"><span class="k">Giá trị hợp đồng</span><span class="v">' + money(notional) + ' ₫</span></div><div class="kv-row"><span class="k">Ký quỹ cần</span><span class="v">' + money(margin) + ' ₫</span></div><div class="kv-row"><span class="k">Phí mở lệnh</span><span class="v">' + money(fee) + ' ₫</span></div><div class="kv-row"><span class="k">Thanh lý dự kiến</span><span class="v down">' + fmtPrice(a, liq) + '</span></div><div class="kv-row total"><span class="k">Vốn cần thiết</span><span class="v">' + money(margin + fee) + ' ₫</span></div></div>' +
      '<button class="btn btn-block btn-gold" data-nav="#/terminal" data-action="deriv-goto" data-id="' + a.id + '" data-side="' + derivCalc.side + '">Mở vị thế trên terminal</button>' +
      '<div class="calc-note">Công cụ chỉ mang tính ước tính. Giá thanh lý thực tế phụ thuộc phí funding và biến động thị trường.</div></div>';
  }

  function derivFundingTableHTML() {
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Hợp đồng</th><th class="text-right">Funding</th><th class="text-right">Long</th><th class="text-right">Short</th><th class="text-right">Mark</th></tr></thead><tbody>' +
      D.ASSETS.filter(a => a.group === 'derivatives').map((a, i) => {
        const item = derivsCache.find(x => x.symbol === ({ btcperp: 'BTCUSDT', ethperp: 'ETHUSDT' })[a.id]);
        const funding = item && isFinite(item.funding) ? item.funding : Math.sin(Date.now() / 43200000 + i) * 0.00022;
        const longPct = item && isFinite(item.longAccount) ? item.longAccount * 100 : 50;
        return '<tr><td>' + assetCell(a, { name: false }) + '</td><td class="text-right ' + changeCls(funding) + ' vol-cell">' + (funding * 100).toFixed(4) + '%</td><td class="text-right vol-cell up">' + nf(longPct, 1) + '%</td><td class="text-right vol-cell down">' + nf(100 - longPct, 1) + '%</td><td class="text-right price-cell">' + fmtPrice(a) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function derivativesHTML() {
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('leverage') + ' Phái sinh · Đòn bẩy</div><h1>Phái sinh & đòn bẩy</h1><p class="sub">Long, Short và quản trị ký quỹ. VN30F, BTC/ETH perpetual, vàng và chỉ số Mỹ — tất cả trong một phòng thí nghiệm rủi ro.</p></div>' +
      '<div class="head-actions"><span class="badge badge-gold">' + icon('shield') + ' KÝ QUỸ CÁCH LY</span><button class="btn btn-gold btn-sm" data-action="deriv-trade" data-id="btcperp" data-side="long">' + icon('bolt') + ' Mở Long BTC</button></div></div>' +
      '<div class="deriv-warning">' + icon('alert') + '<div><b>Đòn bẩy không miễn phí.</b> Vị thế có thể bị thanh lý trước khi bạn kịp phản ứng. Hãy giữ ký quỹ dưới 20% tổng tài sản và luôn biết giá thanh lý của mình. Đây là môi trường mô phỏng, không phải lời khuyên đầu tư.</div></div>' +
      contractCardsHTML() +
      '<div class="deriv-layout"><div class="dash-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Bảng điều khiển rủi ro</div><div class="card-sub">Tổng hợp vị thế đang mở</div></div><span class="badge ' + (state.positions.length ? 'badge-gold' : '') + '">' + state.positions.length + ' vị thế</span></div>' + derivStatsHTML() + derivPositionsTableHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('flame') + ' Funding & tâm lý</div><div class="card-sub">Dữ liệu Binance Futures · cập nhật khi kết nối</div></div><span class="badge badge-cyan">FUNDING 8H</span></div>' + derivFundingTableHTML() + '<div class="calc-note">Funding dương: long trả short. Funding âm: short trả long. Tỷ lệ Long/Short phản ánh vị thế tài khoản toàn cầu.</div></section></div>' +
      '<aside class="dash-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('calculator') + ' Máy tính ký quỹ</div><div class="card-sub">Ước tính trước khi vào lệnh</div></div></div><div id="derivCalcBox">' + derivCalcHTML() + '</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Quy tắc sinh tồn</div></div></div><div class="kv-row"><span class="k">Rủi ro tối đa / lệnh</span><span class="v up">1 – 2% vốn</span></div><div class="kv-row"><span class="k">Ký quỹ tối đa</span><span class="v">20% tổng tài sản</span></div><div class="kv-row"><span class="k">Đòn bẩy khuyến nghị</span><span class="v">3 – 5x</span></div><div class="kv-row"><span class="k">Cắt lỗ</span><span class="v">Trước khi vào lệnh</span></div><div class="risk-warning-inline" style="margin-top:10px">' + icon('info') + ' Vị thế bị thanh lý khi giá chạm mức liq. Hệ thống sẽ tự đóng và ghi nhận khoản lỗ bằng toàn bộ ký quỹ.</div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('book') + ' Học nhanh</div></div></div><div class="coach-copy">Đòn bẩy 10x không có nghĩa là lợi nhuận 10x. Nó có nghĩa là biến động 10% đủ để xoá toàn bộ ký quỹ. Hãy dùng <b>Risk Calculator</b> trong Phòng phân tích để tính khối lượng theo rủi ro.</div><button class="btn btn-xs btn-outline-gold btn-block" data-nav="#/analysis" style="margin-top:9px">Mở Risk Calculator</button></section></aside></div>';
  }

  function mountDerivatives() {
    const box = $('#derivCalcBox');
    if (box) {
      box.addEventListener('click', e => {
        const side = e.target.closest('[data-calc-side]');
        if (side) {
          derivCalc.side = side.getAttribute('data-calc-side');
          box.innerHTML = derivCalcHTML();
        }
      });
      box.addEventListener('change', e => {
        if (e.target.id === 'calcAsset') { derivCalc.assetId = e.target.value; derivCalc.qty = stepFor(byId[derivCalc.assetId]); box.innerHTML = derivCalcHTML(); }
        if (e.target.id === 'calcQty') { derivCalc.qty = Number(e.target.value); const out = box.querySelector('.order-summary'); if (out) { const temp = document.createElement('div'); temp.innerHTML = derivCalcHTML(); out.innerHTML = temp.querySelector('.order-summary').innerHTML; } }
      });
      box.addEventListener('input', e => {
        if (e.target.id === 'calcLev') {
          derivCalc.leverage = Number(e.target.value);
          const label = $('#calcLevLabel'); if (label) label.textContent = derivCalc.leverage + 'x';
          const temp = document.createElement('div'); temp.innerHTML = derivCalcHTML();
          const out = box.querySelector('.order-summary'); if (out) out.innerHTML = temp.querySelector('.order-summary').innerHTML;
          const btn = box.querySelector('[data-action="deriv-goto"]');
          if (btn) btn.setAttribute('data-side', derivCalc.side);
        }
        if (e.target.id === 'calcQty') {
          derivCalc.qty = Number(e.target.value);
          const temp = document.createElement('div'); temp.innerHTML = derivCalcHTML();
          const out = box.querySelector('.order-summary'); if (out) out.innerHTML = temp.querySelector('.order-summary').innerHTML;
        }
      });
      box.addEventListener('click', e => {
        const go = e.target.closest('[data-action="deriv-goto"]');
        if (go) {
          terminalOrder.mode = 'futures';
          terminalOrder.side = go.getAttribute('data-side') === 'short' ? 'short' : 'long';
        }
      });
    }
    API.derivatives().then(items => {
      derivsCache = items && items.length ? items : [];
      if (currentRoute === 'derivatives') {
        const card = $('.deriv-layout .card .table-wrap');
        const section = card ? card.closest('.card') : null;
        if (section) {
          const body = section.querySelector('.table-wrap');
          if (body) body.outerHTML = derivFundingTableHTML();
        }
      }
    }).catch(() => {});
  }

  /* ------------------------------ ANALYSIS LAB ------------------------------ */
  let analysisAssetId = 'vcb';
  let screenerState = { group: 'all', sort: 'score', search: '' };
  let techToken = 0;
  let readerToken = 0;

  function analysisTools() {
    return [
      ['technical', 'chart', 'Technical', 'Tín hiệu đa chỉ báo'],
      ['reader', 'eye', 'Đọc biểu đồ', 'Cấu trúc, vùng giá, mẫu nến'],
      ['calc', 'calculator', 'Máy tính', 'Vị thế, Kelly, CAGR'],
      ['backtest', 'flask', 'Backtest', 'Kiểm chứng chiến lược'],
      ['screener', 'filter', 'Screener', 'Lọc cơ hội toàn thị trường'],
      ['correlation', 'layers', 'Tương quan', 'Ma trận 6 tài sản'],
      ['fibonacci', 'ruler', 'Fibonacci', 'Vùng hồi & mở rộng'],
      ['risk', 'shield', 'Risk Calculator', 'Tính vị thế theo rủi ro'],
      ['goal', 'target', 'Mục tiêu', 'Lập kế hoạch tài sản'],
      ['seasonality', 'calendar', 'Seasonality', 'Mùa vụ theo tháng'],
      ['volatility', 'fire', 'Volatility', 'Biến động & dải giá'],
      ['montecarlo', 'wand', 'Monte Carlo', 'Mô phỏng 400 kịch bản'],
      ['pivot', 'horizontal', 'Pivot Points', 'Hỗ trợ & kháng cự'],
      ['journal', 'book', 'Nhật ký', 'Ghi lại cảm xúc lệnh']
    ];
  }

  function calendarHTML() {
    return '<div class="calendar-list">' + D.CALENDAR.map(item => {
      const d = new Date();
      d.setDate(d.getDate() + item.offset);
      const day = String(d.getDate()).padStart(2, '0');
      const month = 'TH' + (d.getMonth() + 1);
      return '<div class="calendar-item"><div class="calendar-date"><b>' + day + '</b><span>' + month + '</span></div>' +
        '<div class="calendar-body"><div class="calendar-title">' + esc(item.title) + '</div><div class="calendar-meta"><span><span class="importance ' + item.importance + '"></span> ' + esc(item.region) + '</span><span>·</span><span>' + item.time + '</span><span>·</span><span>' + (item.offset === 0 ? 'Hôm nay' : 'sau ' + item.offset + ' ngày') + '</span></div></div></div>';
    }).join('') + '</div>';
  }

  function analysisSideHTML() {
    return '<aside class="analysis-side"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('calendar') + ' Lịch kinh tế</div><div class="card-sub">Sự kiện đáng chú ý</div></div></div>' + calendarHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('book') + ' Từ điển nhanh</div><div class="card-sub">Thuật ngữ cần biết</div></div><button class="link-more" data-nav="#/academy">Học viện ' + icon('chevron-right') + '</button></div><div class="glossary-grid">' + D.GLOSSARY.slice(0, 8).map(g => '<div class="glossary-item"><div class="glossary-term">' + esc(g.term) + '</div><div class="glossary-text">' + esc(g.text) + '</div></div>').join('') + '</div></section>' +
      '<section class="card card-gold"><div class="card-head"><div><div class="card-title">' + icon('sparkles') + ' AURA Checklist</div><div class="card-sub">Trước khi bấm mua</div></div></div><div class="kv-row"><span class="k">Đã xác định điểm cắt lỗ?</span><span class="v up">Bắt buộc</span></div><div class="kv-row"><span class="k">Rủi ro dưới 2%?</span><span class="v">Kiểm tra</span></div><div class="kv-row"><span class="k">Có lý do vào lệnh?</span><span class="v">Viết ra</span></div><div class="kv-row"><span class="k">Đã xem tin sự kiện?</span><span class="v">Lịch bên trên</span></div><button class="btn btn-xs btn-outline-gold btn-block" data-nav="#/academy" style="margin-top:8px">Rèn kỷ luật cùng AURELIS</button></section></aside>';
  }

  function analysisHTML() {
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('flask') + ' Phòng phân tích</div><h1>Phòng phân tích</h1><p class="sub">Tín hiệu kỹ thuật, đọc biểu đồ, máy tính vị thế, backtest, screener, tương quan, Fibonacci, quản trị rủi ro và nhật ký — không cần rời terminal.</p></div>' +
      '<div class="head-actions"><span class="badge badge-gold">' + icon('sparkles') + ' ' + analysisTools().length + ' CÔNG CỤ</span><button class="btn btn-ghost btn-sm" data-nav="#/academy">' + icon('book') + ' Học lý thuyết</button></div></div>' +
      '<div class="tool-grid">' + analysisTools().map(t => '<button class="tool-card ' + (state.analysisTool === t[0] ? 'active' : '') + '" data-tool="' + t[0] + '"><span class="tool-icon">' + icon(t[1]) + '</span><b>' + t[2] + '</b><span>' + t[3] + '</span></button>').join('') + '</div>' +
      '<div class="analysis-layout"><div class="analysis-main"><section class="card" id="analysisMain"></section></div>' + analysisSideHTML() + '</div>';
  }

  function mountAnalysis() {
    renderAnalysisTool();
    $$('[data-tool]').forEach(btn => btn.addEventListener('click', () => {
      state.analysisTool = btn.getAttribute('data-tool');
      save();
      $$('[data-tool]').forEach(x => x.classList.toggle('active', x === btn));
      renderAnalysisTool();
    }));
  }

  function renderAnalysisTool() {
    const box = $('#analysisMain');
    if (!box) return;
    const tool = state.analysisTool || 'technical';
    if (tool === 'technical') { box.innerHTML = technicalHTML(); mountTechnical(); }
    else if (tool === 'reader') { box.innerHTML = readerToolHTML(); mountReaderTool(); }
    else if (tool === 'calc') { box.innerHTML = calcToolHTML(); mountCalcTool(); }
    else if (tool === 'backtest') { box.innerHTML = backtestHTML(); mountBacktest(); }
    else if (tool === 'screener') { box.innerHTML = screenerHTML(); mountScreener(); }
    else if (tool === 'correlation') { box.innerHTML = correlationHTML(); mountCorrelation(); }
    else if (tool === 'fibonacci') { box.innerHTML = fibonacciHTML(); mountFibonacci(); }
    else if (tool === 'risk') { box.innerHTML = riskHTML(); mountRisk(); }
    else if (tool === 'goal') { box.innerHTML = goalHTML(); mountGoal(); }
    else if (tool === 'seasonality') { box.innerHTML = seasonalityHTML(); mountSeasonality(); }
    else if (tool === 'volatility') { box.innerHTML = volatilityHTML(); mountVolatility(); }
    else if (tool === 'montecarlo') { box.innerHTML = montecarloHTML(); mountMontecarlo(); }
    else if (tool === 'pivot') { box.innerHTML = pivotHTML(); mountPivot(); }
    else { box.innerHTML = journalHTML(); mountJournal(); }
  }

  /* ---------- Technical ---------- */
  const TECH_ASSET_OPTIONS = ['vcb', 'fpt', 'hpg', 'ssi', 'btc', 'eth', 'sol', 'xauusd', 'eurusd', 'spx'];

  function techAssetSelect(selected) {
    return '<select class="select" id="techAsset" style="width:auto;height:34px;font-size:10px">' + TECH_ASSET_OPTIONS.map(id => {
      const a = byId[id];
      return '<option value="' + id + '"' + (selected === id ? ' selected' : '') + '>' + esc(a.symbol) + ' · ' + esc(a.name) + '</option>';
    }).join('') + '</select>';
  }

  function technicalHTML() {
    return '<div class="tool-head"><div><h2>' + icon('chart') + ' Technical Signal</h2><p>Chấm điểm tín hiệu từ RSI, MACD, đường trung bình, Bollinger, Stochastic và ADX. Tín hiệu chỉ mang tính tham khảo, không phải lời khuyên.</p></div><div class="analysis-controls" style="margin:0">' + techAssetSelect(analysisAssetId) + '<button class="btn btn-sm btn-gold" data-action="terminal" data-id="' + analysisAssetId + '">' + icon('chart') + ' Mở chart</button></div></div><div id="techBody"><div class="skeleton" style="height:250px;border-radius:12px"></div></div>';
  }

  function techIndicatorRows(rows) {
    return rows.map(r => '<tr><td class="indicator-name">' + r.name + '</td><td class="vol-cell">' + r.value + '</td><td><span class="signal-badge ' + r.signal + '">' + (r.signal === 'buy' ? 'MUA' : r.signal === 'sell' ? 'BÁN' : 'TRUNG TÍNH') + '</span></td><td class="vol-cell">' + r.note + '</td></tr>').join('');
  }

  function technicalResultHTML(asset, candles) {
    const closes = candles.map(c => c.c);
    const last = closes[closes.length - 1];
    const rsiArr = CH.indicators.rsi(closes, 14);
    const rsiV = rsiArr[rsiArr.length - 1];
    const ma20 = CH.indicators.sma(closes, 20); const ma50 = CH.indicators.sma(closes, 50);
    const ema21 = CH.indicators.ema(closes, 21);
    const macdObj = CH.indicators.macd(closes);
    const hist = macdObj.hist;
    const boll = CH.indicators.bollinger(closes, 20, 2);
    const stoch = CH.indicators.stochastic(candles, 14, 3);
    const adx = CH.indicators.adx(candles, 14);
    const rows = [];
    const add = (name, value, signal, note) => rows.push({ name, value, signal, note });
    const rsiSignal = rsiV < 30 ? 'buy' : rsiV > 70 ? 'sell' : 'neutral';
    add('RSI (14)', nf(rsiV, 1), rsiSignal, rsiV < 30 ? 'Quá bán' : rsiV > 70 ? 'Quá mua' : 'Vùng trung tính');
    const sma20v = ma20[ma20.length - 1], sma50v = ma50[ma50.length - 1];
    add('SMA 20', fmtPrice(asset, sma20v), last > sma20v ? 'buy' : 'sell', last > sma20v ? 'Giá trên MA20' : 'Giá dưới MA20');
    add('SMA 50', fmtPrice(asset, sma50v), last > sma50v ? 'buy' : 'sell', sma20v > sma50v ? 'MA20 cắt lên MA50' : 'MA20 dưới MA50');
    const emaV = ema21[ema21.length - 1];
    add('EMA 21', fmtPrice(asset, emaV), last > emaV ? 'buy' : 'sell', last > emaV ? 'Động lượng ngắn hạn tích cực' : 'Động lượng yếu');
    const histV = hist[hist.length - 1];
    add('MACD Histogram', nf(histV, 2), histV > 0 ? 'buy' : 'sell', histV > 0 ? 'Phe mua kiểm soát' : 'Phe bán kiểm soát');
    const upper = boll.upper[boll.upper.length - 1], lower = boll.lower[boll.lower.length - 1];
    add('Bollinger %B', nf((last - lower) / (upper - lower) * 100, 0) + '%', last < lower ? 'buy' : last > upper ? 'sell' : 'neutral', last < lower ? 'Dưới dải dưới' : last > upper ? 'Trên dải trên' : 'Trong dải');
    const kV = stoch.k[stoch.k.length - 1];
    add('Stochastic %K', nf(kV, 1), kV < 20 ? 'buy' : kV > 80 ? 'sell' : 'neutral', kV < 20 ? 'Quá bán' : kV > 80 ? 'Quá mua' : 'Bình thường');
    const adxV = adx[adx.length - 1];
    add('ADX (14)', nf(adxV, 1), adxV > 25 ? 'neutral' : 'neutral', adxV > 25 ? 'Xu hướng mạnh' : 'Xu hướng yếu');
    const buys = rows.filter(r => r.signal === 'buy').length, sells = rows.filter(r => r.signal === 'sell').length, neutrals = rows.length - buys - sells;
    const score = Math.round(50 + (buys - sells) / (rows.length || 1) * 50);
    const label = score >= 65 ? 'NGHIÊNG MUA' : score >= 45 ? 'TRUNG TÍNH' : 'NGHIÊNG BÁN';
    const buyPct = buys / rows.length * 100, neutralPct = neutrals / rows.length * 100;
    const gauge = 'conic-gradient(from 220deg, var(--down) 0 ' + nf(sells / rows.length * 100, 1) + '%, rgba(255,255,255,.1) ' + nf(sells / rows.length * 100, 1) + '% ' + nf(sells / rows.length * 100 + neutralPct, 1) + '%, var(--up) ' + nf(sells / rows.length * 100 + neutralPct, 1) + '% 100%)';
    return '<div class="signal-overview"><div class="signal-gauge" style="background:' + gauge + '"><div class="signal-gauge-inner"><b>' + label + '</b><span>Điểm tín hiệu ' + score + '/100</span><span class="' + changeCls(score - 50) + '">' + score + '</span></div></div>' +
      '<div class="signal-counts"><div class="signal-count-row"><span>Tín hiệu mua</span><div class="bar"><span class="up" style="width:' + buyPct + '%;background:var(--up)"></span></div><b>' + buys + '</b></div>' +
      '<div class="signal-count-row"><span>Trung tính</span><div class="bar"><span style="width:' + neutralPct + '%;background:var(--gold)"></span></div><b>' + neutrals + '</b></div>' +
      '<div class="signal-count-row"><span>Tín hiệu bán</span><div class="bar"><span style="width:' + (sells / rows.length * 100) + '%;background:var(--down)"></span></div><b>' + sells + '</b></div>' +
      '<div class="kv-row" style="margin-top:4px;padding:2px 0"><span class="k">Giá hiện tại</span><span class="v">' + fmtPrice(asset) + ' ' + priceUnit(asset) + '</span></div>' +
      '<div class="calc-note">Dựa trên ' + candles.length + ' nến ' + chartPrefs().tf + ' · cập nhật khi tải lại trang</div></div></div>' +
      '<div class="table-wrap"><table class="data-table indicator-table"><thead><tr><th>Chỉ báo</th><th>Giá trị</th><th>Tín hiệu</th><th>Diễn giải</th></tr></thead><tbody>' + techIndicatorRows(rows) + '</tbody></table></div>' +
      '<div class="divider"></div><div class="coach-body"><div class="coach-copy"><strong>Đọc tín hiệu:</strong> ' + (score >= 65 ? 'Đa số chỉ báo đang ủng hộ phe mua. Tuy nhiên đừng mua đuổi — hãy chờ một nhịp điều chỉnh về vùng hỗ trợ và đặt cắt lỗ rõ ràng.' : score >= 45 ? 'Các chỉ báo đang mâu thuẫn. Đây thường là giai đoạn tích luỹ; ưu tiên đứng ngoài và chờ tín hiệu rõ hơn.' : 'Phe bán đang chiếm ưu thế. Nếu đang giữ hàng, kiểm tra lại điểm cắt lỗ; nếu đứng ngoài, đừng bắt đáy chỉ vì giá đã giảm.') + '</div></div>';
  }

  async function mountTechnical() {
    const select = $('#techAsset');
    if (select) select.addEventListener('change', () => { analysisAssetId = select.value; renderAnalysisTool(); });
    const body = $('#techBody');
    const asset = byId[analysisAssetId] || byId.vcb;
    const token = ++techToken;
    let candles = D.generateCandles(asset, '1D', 240, asset.price);
    if (API.hasLive(asset)) {
      try {
        const real = await API.chart(asset, '1D');
        if (token !== techToken) return;
        if (real && real.length > 30) candles = real;
      } catch (e) { /* dùng nến mô phỏng */ }
    }
    if (body && token === techToken && currentRoute === 'analysis' && state.analysisTool === 'technical') body.innerHTML = technicalResultHTML(asset, candles);
  }

  /* ---------- Chart Reader ---------- */
  function readerToolHTML() {
    return '<div class="tool-head"><div><h2>' + icon('eye') + ' Đọc biểu đồ</h2><p>Không chỉ nhìn nến: công cụ tách cấu trúc đỉnh/đáy, vùng giá trị theo volume, thống kê nến, mẫu nến và kế hoạch stop/target. Tất cả chỉ để luyện đọc, không phải lời khuyên đầu tư.</p></div><div class="analysis-controls" style="margin:0">' + techAssetSelect(analysisAssetId) + '<button class="btn btn-sm btn-gold" data-action="terminal" data-id="' + analysisAssetId + '">' + icon('chart') + ' Mở chart</button></div></div>' +
      '<div id="readerToolBody"><div class="skeleton" style="height:280px;border-radius:12px"></div></div>' +
      '<div class="calc-note" style="margin-top:10px">Phân tích dùng nến 1D và dữ liệu đang có. Các mức hỗ trợ/kháng cự được gom từ đỉnh/đáy fractal, không phải đường kẻ cố định.</div>';
  }

  async function mountReaderTool() {
    const select = $('#techAsset');
    if (select) select.addEventListener('change', () => { analysisAssetId = select.value; renderAnalysisTool(); });
    const body = $('#readerToolBody');
    const asset = byId[analysisAssetId] || byId.vcb;
    const token = ++readerToken;
    let candles = D.generateCandles(asset, '1D', 320, asset.price);
    if (API.hasLive(asset)) {
      try {
        const real = await API.chart(asset, '1D');
        if (token !== readerToken) return;
        if (real && real.length > 30) candles = real;
      } catch (e) { /* dùng nến mô phỏng */ }
    }
    if (!body || token !== readerToken || currentRoute !== 'analysis' || state.analysisTool !== 'reader') return;
    const r = chartAnalyze(candles);
    if (!r) {
      body.innerHTML = '<div class="empty-state"><div class="empty-icon">📉</div><strong>Chưa đủ dữ liệu nến</strong><p>Thử tài sản khác hoặc mở lại sau.</p></div>';
      return;
    }
    readerState = { analysis: r, asset, candles };
    body.innerHTML = chartReaderReportHTML(r, asset) + '<div class="reader-source">' + r.candleCount + ' nến · 1D · ' + esc(asset.symbol) + '</div>';
    bindReaderTabs(body, () => {
      const inner = body.querySelector('.reader-body');
      if (inner) inner.innerHTML = chartReaderBodyHTML(r, asset);
    });
  }

  /* ---------- Máy tính giao dịch ---------- */
  function calcFieldHTML(label, id, value, suffix, step) {
    return '<label class="calc-field"><span>' + label + '</span><span class="calc-field-box"><input id="' + id + '" type="number" inputmode="decimal" step="' + (step || 'any') + '" value="' + value + '"><em>' + suffix + '</em></span></label>';
  }

  function calcCardHTML(emoji, title, sub, fields, resultId) {
    return '<section class="calc-card"><div class="calc-card-head"><span class="calc-card-emoji">' + emoji + '</span><div><b>' + title + '</b><small>' + sub + '</small></div></div>' +
      '<div class="calc-fields">' + fields + '</div><div class="calc-result" id="' + resultId + '"></div></section>';
  }

  function calcToolHTML() {
    const acc = Math.max(1000000, Math.round(netWorth()));
    const position = calcCardHTML('🎯', 'Tính vị thế theo rủi ro', 'Bao nhiêu tiền để chỉ mất đúng phần trăm đã định', 
      calcFieldHTML('Tài khoản', 'cqAccount', acc, '₫', '1000') +
      calcFieldHTML('Rủi ro mỗi lệnh', 'cqRiskPct', 1, '%', '0.1') +
      calcFieldHTML('Giá vào', 'cqEntry', 100000, '₫', '100') +
      calcFieldHTML('Giá cắt lỗ', 'cqStop', 95000, '₫', '100'),
      'cqPositionResult');
    const expectancy = calcCardHTML('📊', 'Kỳ vọng mỗi lệnh', 'Hệ thống có thực sự có lợi thế hay không', 
      calcFieldHTML('Tỷ lệ thắng', 'cqWinRate', 45, '%', '1') +
      calcFieldHTML('Lãi trung bình', 'cqAvgWin', 2, 'R', '0.1') +
      calcFieldHTML('Lỗ trung bình', 'cqAvgLoss', 1, 'R', '0.1'),
      'cqExpectancyResult');
    const kelly = calcCardHTML('🎲', 'Kelly Criterion', 'Tỷ lệ vốn tối ưu theo xác suất và payoff', 
      calcFieldHTML('Tỷ lệ thắng', 'cqKellyWin', 55, '%', '1') +
      calcFieldHTML('Payoff (lãi/lỗ)', 'cqKellyPayoff', 1.6, 'lần', '0.1'),
      'cqKellyResult');
    const drawdown = calcCardHTML('🕳️', 'Hồi vốn sau drawdown', 'Mất bao nhiêu thì cần lãi bao nhiêu để về bờ', 
      calcFieldHTML('Mức drawdown', 'cqDrawdown', 30, '%', '1'),
      'cqDrawdownResult');
    const cagr = calcCardHTML('📈', 'CAGR & tổng lợi nhuận', 'Tốc độ tăng trưởng kép mỗi năm', 
      calcFieldHTML('Vốn ban đầu', 'cqCagrStart', 100000000, '₫', '1000000') +
      calcFieldHTML('Giá trị cuối', 'cqCagrEnd', 250000000, '₫', '1000000') +
      calcFieldHTML('Số năm', 'cqCagrYears', 5, 'năm', '0.5'),
      'cqCagrResult');
    const compound = calcCardHTML('🌱', 'Lãi kép & góp đều', 'Mỗi tháng thêm một khoản, sau nhiều năm được bao nhiêu', 
      calcFieldHTML('Vốn ban đầu', 'cqCompStart', 100000000, '₫', '1000000') +
      calcFieldHTML('Góp mỗi tháng', 'cqCompMonthly', 5000000, '₫', '500000') +
      calcFieldHTML('Lợi nhuận/năm', 'cqCompRate', 12, '%', '0.5') +
      calcFieldHTML('Số năm', 'cqCompYears', 10, 'năm', '1'),
      'cqCompResult');
    return '<div class="tool-head"><div><h2>' + icon('calculator') + ' Máy tính giao dịch</h2><p>Sáu phép tính nhỏ nhưng dùng hằng ngày: chia vị thế theo rủi ro, kiểm tra kỳ vọng, Kelly, mức cần để hồi vốn, CAGR và lãi kép. Kết quả là con số tham khảo, không phải cam kết lợi nhuận.</p></div></div>' +
      '<div class="calc-grid">' + position + expectancy + kelly + drawdown + cagr + compound + '</div>' +
      '<div class="calc-note">Mọi phép tính dùng số bạn nhập, không lấy dữ liệu thị trường. Công thức Kelly khá nhạy với sai số ước lượng — ngoài đời người ta thường chỉ dùng một nửa Kelly hoặc ít hơn.</div>';
  }

  function cqValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = Number(String(el.value).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  function calcResultHTML(rows, note) {
    return '<div class="calc-result-grid">' + rows.map(r => '<div><span>' + r[0] + '</span><b' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + r[1] + '</b></div>').join('') + '</div>' + (note ? '<p class="calc-result-note">' + note + '</p>' : '');
  }

  function calcRefresh() {
    const posBox = document.getElementById('cqPositionResult');
    if (posBox) {
      const acc = cqValue('cqAccount');
      const riskPct = cqValue('cqRiskPct');
      const entry = cqValue('cqEntry');
      const stop = cqValue('cqStop');
      const riskAmount = acc * riskPct / 100;
      const perUnit = entry - stop;
      if (!(acc > 0) || !(riskPct > 0) || !(entry > 0) || !(perUnit > 0)) {
        posBox.innerHTML = '<p class="calc-result-note warn">Kiểm tra lại: tài khoản và giá vào phải lớn hơn 0, giá cắt lỗ phải thấp hơn giá vào.</p>';
      } else {
        const units = riskAmount / perUnit;
        const value = units * entry;
        const weight = value / acc * 100;
        const targets = [1, 2, 3].map(r => entry + perUnit * r);
        posBox.innerHTML = calcResultHTML([
          ['Số tiền chấp nhận mất', fmtVND(riskAmount)],
          ['Khối lượng', nf(units, units < 10 ? 2 : 0) + ' đơn vị'],
          ['Giá trị vị thế', fmtVND(value)],
          ['Tỷ trọng tài khoản', nf(weight, 1) + '%', weight > 100 ? 'down' : ''],
          ['Target 1R / 2R / 3R', targets.map(t => fmtVND(t)).join(' · ')]
        ], weight > 100 ? 'Vị thế vượt 100% tài khoản. Muốn giữ đúng rủi ro, bạn cần giảm khối lượng hoặc nới stop.' : 'Nếu stop bị chạm, bạn mất đúng ' + fmtVND(riskAmount) + ' — phần còn lại của tài khoản vẫn nguyên.');
      }
    }
    const expBox = document.getElementById('cqExpectancyResult');
    if (expBox) {
      const winPct = cqValue('cqWinRate');
      const avgWin = cqValue('cqAvgWin');
      const avgLoss = cqValue('cqAvgLoss');
      if (winPct < 0 || winPct > 100 || avgWin <= 0 || avgLoss <= 0) {
        expBox.innerHTML = '<p class="calc-result-note warn">Tỷ lệ thắng từ 0–100%, lãi và lỗ trung bình phải lớn hơn 0.</p>';
      } else {
        const p = winPct / 100;
        const exp = p * avgWin - (1 - p) * avgLoss;
        const be = avgLoss / (avgWin + avgLoss) * 100;
        const pf = (1 - p) > 0 ? (p * avgWin) / ((1 - p) * avgLoss) : Infinity;
        expBox.innerHTML = calcResultHTML([
          ['Kỳ vọng mỗi lệnh', (exp >= 0 ? '+' : '') + nf(exp, 2) + 'R', exp >= 0 ? 'up' : 'down'],
          ['Tỷ lệ thắng hoà vốn', nf(be, 1) + '%'],
          ['Profit factor', Number.isFinite(pf) ? nf(pf, 2) : '∞', pf >= 1 ? 'up' : 'down'],
          ['Đánh giá', exp > 0 ? 'Có lợi thế' : exp < 0 ? 'Đang lỗ về kỳ vọng' : 'Hoà vốn', exp > 0 ? 'up' : exp < 0 ? 'down' : '']
        ], exp > 0 ? 'Với ' + nf(winPct, 0) + '% thắng, bạn chỉ cần thắng trên ' + nf(be, 1) + '% là đã có lãi về mặt kỳ vọng.' : 'Nếu kỳ vọng âm, tăng tỷ lệ thắng hoặc tăng lãi trung bình — đừng chỉ tăng khối lượng.');
      }
    }
    const kellyBox = document.getElementById('cqKellyResult');
    if (kellyBox) {
      const winPct = cqValue('cqKellyWin');
      const payoff = cqValue('cqKellyPayoff');
      if (winPct < 0 || winPct > 100 || payoff <= 0) {
        kellyBox.innerHTML = '<p class="calc-result-note warn">Tỷ lệ thắng từ 0–100% và payoff phải lớn hơn 0.</p>';
      } else {
        const p = winPct / 100;
        const edge = p * payoff - (1 - p);
        const k = (payoff * p - (1 - p)) / payoff;
        const half = k / 2;
        kellyBox.innerHTML = calcResultHTML([
          ['Kelly đầy đủ', k > 0 ? nf(k * 100, 1) + '% vốn' : 'Không nên vào', k > 0 ? '' : 'down'],
          ['Nửa Kelly', k > 0 ? nf(half * 100, 1) + '% vốn' : '0%', ''],
          ['Edge mỗi 1R', (edge >= 0 ? '+' : '') + nf(edge, 2) + 'R', edge >= 0 ? 'up' : 'down'],
          ['Rủi ro gợi ý', k > 0 ? nf(Math.min(half * 100, 5), 1) + '% mỗi lệnh' : 'Bỏ qua lệnh này']
        ], k > 0 ? 'Kelly đầy đủ thường quá mạnh với người mới. Nửa Kelly hoặc thấp hơn giúp chịu được sai số ước lượng.' : 'Với xác suất và payoff này, kỳ vọng âm. Tốt nhất là không vào lệnh.');
      }
    }
    const ddBox = document.getElementById('cqDrawdownResult');
    if (ddBox) {
      const dd = cqValue('cqDrawdown');
      if (dd <= 0 || dd >= 100) {
        ddBox.innerHTML = '<p class="calc-result-note warn">Drawdown phải lớn hơn 0% và nhỏ hơn 100%.</p>';
      } else {
        const need = dd / (100 - dd) * 100;
        ddBox.innerHTML = calcResultHTML([
          ['Đã giảm', nf(dd, 1) + '%', 'down'],
          ['Cần tăng để hoà vốn', '+' + nf(need, 1) + '%', 'up'],
          ['Tài khoản 100 triệu còn', fmtVND(100000000 * (1 - dd / 100))],
          ['Muốn về lại 100 triệu', 'Cần lãi ' + fmtVND(100000000 * (1 - dd / 100) * (need / 100))]
        ], 'Mất ' + nf(dd, 1) + '% cần lãi ' + nf(need, 1) + '% mới hoà vốn — đây là lý do phải cắt lỗ sớm.');
      }
    }
    const cagrBox = document.getElementById('cqCagrResult');
    if (cagrBox) {
      const start = cqValue('cqCagrStart');
      const end = cqValue('cqCagrEnd');
      const years = cqValue('cqCagrYears');
      if (start <= 0 || end < 0 || years <= 0) {
        cagrBox.innerHTML = '<p class="calc-result-note warn">Vốn ban đầu và số năm phải lớn hơn 0; giá trị cuối không được âm.</p>';
      } else {
        const multiple = end / start;
        const total = (multiple - 1) * 100;
        const cagr = Math.pow(multiple, 1 / years) - 1;
        cagrBox.innerHTML = calcResultHTML([
          ['Tổng lợi nhuận', (total >= 0 ? '+' : '') + nf(total, 1) + '%', total >= 0 ? 'up' : 'down'],
          ['CAGR mỗi năm', (cagr >= 0 ? '+' : '') + nf(cagr * 100, 2) + '%', cagr >= 0 ? 'up' : 'down'],
          ['Hệ số nhân', nf(multiple, 2) + 'x'],
          ['Thời gian', nf(years, 1) + ' năm']
        ], 'CAGR làm phẳng các năm tốt/xấu thành một tốc độ trung bình. Nó không nói gì về mức biến động trên đường đi.');
      }
    }
    const compBox = document.getElementById('cqCompResult');
    if (compBox) {
      const start = cqValue('cqCompStart');
      const monthly = cqValue('cqCompMonthly');
      const rate = cqValue('cqCompRate');
      const years = cqValue('cqCompYears');
      if (start < 0 || monthly < 0 || rate <= -100 || years <= 0) {
        compBox.innerHTML = '<p class="calc-result-note warn">Vốn và khoản góp không được âm; lợi nhuận phải lớn hơn -100% và số năm lớn hơn 0.</p>';
      } else {
        const months = Math.max(1, Math.round(years * 12));
        const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
        const growthFactor = Math.pow(1 + r, months);
        const fv = start * growthFactor + (Math.abs(r) < 1e-9 ? monthly * months : monthly * (growthFactor - 1) / r);
        const contributed = start + monthly * months;
        const gain = fv - contributed;
        compBox.innerHTML = calcResultHTML([
          ['Giá trị tương lai', fmtVND(fv), gain >= 0 ? 'up' : 'down'],
          ['Tổng đã bỏ vào', fmtVND(contributed)],
          ['Phần lãi kép', fmtVND(gain), gain >= 0 ? 'up' : 'down'],
          ['Tỷ lệ lãi trên vốn góp', contributed > 0 ? nf(gain / contributed * 100, 1) + '%' : '0%']
        ], 'Giả định lợi nhuận đều mỗi tháng và không rút tiền. Thực tế thị trường không tuyến tính như vậy.');
      }
    }
  }

  function mountCalcTool() {
    const root = document.querySelector('.calc-grid');
    if (!root) return;
    root.addEventListener('input', calcRefresh);
    calcRefresh();
  }

  /* ---------- Backtest ---------- */
  function backtestHTML() {
    return '<div class="tool-head"><div><h2>' + icon('flask') + ' Strategy Backtest</h2><p>Chạy chiến lược trên dữ liệu nến lịch sử và xem drawdown, tỷ lệ thắng, lợi nhuận so với mua & giữ. Kết quả mô phỏng, không tính trượt giá.</p></div></div>' +
      '<div class="analysis-controls"><div class="field"><label class="field-label" for="btAsset">Tài sản</label><select class="select" id="btAsset">' + TECH_ASSET_OPTIONS.map(id => { const a = byId[id]; return '<option value="' + id + '"' + (analysisAssetId === id ? ' selected' : '') + '>' + esc(a.symbol) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="field-label" for="btStrategy">Chiến lược</label><select class="select" id="btStrategy"><option value="ma">MA Cross 10/30</option><option value="rsi">RSI Reversal</option><option value="breakout">Breakout 20</option><option value="macd">MACD Trend</option></select></div>' +
      '<button class="btn btn-gold btn-sm" id="btRun">' + icon('play') + ' Chạy backtest</button></div><div id="btResult"><div class="skeleton" style="height:220px;border-radius:12px"></div></div>';
  }

  function runBacktest(asset, strategy, record) {
    const candles = D.generateCandles(asset, '1D', 260, asset.price);
    const closes = candles.map(c => c.c);
    const smaF = CH.indicators.sma(closes, 10), smaS = CH.indicators.sma(closes, 30), rsi = CH.indicators.rsi(closes, 14), macd = CH.indicators.macd(closes);
    const fee = 0.0015;
    let cash = 1, units = 0, entry = 0, peak = 1, maxDD = 0;
    const equity = [], trades = [];
    const start = 30;
    for (let i = start; i < candles.length; i++) {
      const price = closes[i];
      let signal = 0;
      if (strategy === 'ma') {
        if (smaF[i] > smaS[i] && smaF[i - 1] <= smaS[i - 1]) signal = 1;
        if (smaF[i] < smaS[i] && smaF[i - 1] >= smaS[i - 1]) signal = -1;
      } else if (strategy === 'rsi') {
        if (rsi[i] > 30 && rsi[i - 1] <= 30) signal = 1;
        if (rsi[i] > 68) signal = -1;
      } else if (strategy === 'breakout') {
        let hi = -Infinity, lo = Infinity;
        for (let j = i - 20; j < i; j++) { hi = Math.max(hi, candles[j].h); lo = Math.min(lo, candles[j].l); }
        if (price > hi) signal = 1;
        if (price < lo) signal = -1;
      } else {
        if (macd.hist[i] > 0 && macd.hist[i - 1] <= 0) signal = 1;
        if (macd.hist[i] < 0 && macd.hist[i - 1] >= 0) signal = -1;
      }
      if (signal > 0 && units === 0) { units = cash / price * (1 - fee); cash = 0; entry = price; }
      else if (signal < 0 && units > 0) {
        const exit = price;
        cash = units * exit * (1 - fee);
        const ret = (exit / entry - 1) * 100;
        trades.push({ t: candles[i].t, side: 'sell', price: exit, ret });
        units = 0;
      }
      const eq = cash + units * price;
      equity.push({ t: candles[i].t, v: eq });
      peak = Math.max(peak, eq);
      maxDD = Math.max(maxDD, (peak - eq) / peak * 100);
    }
    if (units > 0) {
      const exit = closes[closes.length - 1];
      cash = units * exit * (1 - fee);
      trades.push({ t: candles[candles.length - 1].t, side: 'sell', price: exit, ret: (exit / entry - 1) * 100 });
      equity[equity.length - 1].v = cash;
      units = 0;
    }
    const final = equity.length ? equity[equity.length - 1].v : 1;
    const totalRet = (final - 1) * 100;
    const buyhold = (closes[closes.length - 1] / closes[start] - 1) * 100;
    const wins = trades.filter(t => t.ret > 0).length;
    const result = { final, totalRet, buyhold, maxDD, trades, equity, winRate: trades.length ? wins / trades.length * 100 : 0 };
    if (record) {
      state.stats.backtests = (state.stats.backtests || 0) + 1;
      addXP(18);
      addAura(4);
      pushNotif('🧪', 'Backtest hoàn tất', asset.symbol + ' · ' + analysisTools()[1][2] + ' · ' + fmtPct(totalRet));
      save();
    }
    return result;
  }

  function backtestResultHTML(asset, result) {
    const finalVND = 100000000 * result.final;
    return '<div class="analysis-stat-grid"><div class="analysis-stat"><div class="lbl">Lợi nhuận chiến lược</div><div class="val ' + changeCls(result.totalRet) + '">' + fmtPct(result.totalRet) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Mua & giữ</div><div class="val ' + changeCls(result.buyhold) + '">' + fmtPct(result.buyhold) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Drawdown tối đa</div><div class="val down">-' + nf(result.maxDD, 1) + '%</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Tỷ lệ thắng</div><div class="val">' + nf(result.winRate, 1) + '%</div></div></div>' +
      '<div class="kv-row"><span class="k">Vốn giả định</span><span class="v">100.000.000 ₫</span></div><div class="kv-row"><span class="k">Giá trị cuối kỳ</span><span class="v ' + changeCls(result.final - 1) + '">' + money(finalVND) + ' ₫</span></div>' +
      '<div class="kv-row"><span class="k">Số vòng lệnh</span><span class="v">' + result.trades.length + ' lệnh bán</span></div>' +
      '<div class="backtest-chart"><canvas id="btChart" class="equity-canvas" style="height:200px"></canvas></div>' +
      '<div class="backtest-trades">' + (result.trades.length ? result.trades.slice(-6).reverse().map(t => '<div class="backtest-trade"><span class="bt-side sell">BÁN</span><span class="bt-date">' + dateLabel(t.t * 1000) + '</span><span class="bt-price">' + fmtPrice(asset, t.price) + '</span><span class="' + changeCls(t.ret) + '">' + fmtPct(t.ret) + '</span></div>').join('') : '<div class="calc-note">Chiến lược chưa tạo ra vòng lệnh nào trong giai đoạn này. Thử đổi chiến lược hoặc tài sản.</div>') + '</div>' +
      '<div class="calc-note">Mô phỏng all-in mỗi vòng, phí 0,15%/lần, không tính thuế và trượt giá. Kết quả quá khứ không đảm bảo tương lai.</div>';
  }

  function mountBacktest() {
    const assetSel = $('#btAsset');
    const stratSel = $('#btStrategy');
    const run = $('#btRun');
    const doRun = (record) => {
      const asset = byId[assetSel.value] || byId.vcb;
      const strategy = stratSel.value;
      const result = runBacktest(asset, strategy, record);
      const box = $('#btResult');
      if (box) box.innerHTML = backtestResultHTML(asset, result);
      const canvas = $('#btChart');
      if (canvas) CH.MiniChart.line(canvas, result.equity.map(x => x.v * 100000000), { baseline: 100000000, formatAxis: v => money(v), xLabels: result.equity.map(x => dateKey(x.t * 1000).slice(0, 5)) });
      if (record) toast('Backtest hoàn tất', asset.symbol + ' · ' + fmtPct(result.totalRet) + ' · drawdown ' + nf(result.maxDD, 1) + '%', 'success', '🧪');
      save();
    };
    if (run) run.addEventListener('click', () => doRun(true));
    doRun(false);
  }

  /* ---------- Screener ---------- */
  function screenerHTML() {
    return '<div class="tool-head"><div><h2>' + icon('filter') + ' Market Screener</h2><p>Lọc tài sản theo nhóm, sức mạnh giá và thanh khoản. Điểm AURA kết hợp biến động 24h với động lượng sparkline.</p></div><span class="badge badge-cyan">REAL-TIME SCORE</span></div>' +
      '<div class="screener-filters"><input class="input" id="screenSearch" placeholder="Tìm mã…" value="' + esc(screenerState.search) + '"><select class="select" id="screenGroup"><option value="all">Tất cả nhóm</option>' + Object.keys(D.GROUPS).map(g => '<option value="' + g + '"' + (screenerState.group === g ? ' selected' : '') + '>' + D.GROUPS[g].name + '</option>').join('') + '</select>' +
      '<select class="select" id="screenSort"><option value="score"' + (screenerState.sort === 'score' ? ' selected' : '') + '>Điểm AURA</option><option value="chg"' + (screenerState.sort === 'chg' ? ' selected' : '') + '>Biến động</option><option value="volume"' + (screenerState.sort === 'volume' ? ' selected' : '') + '>Thanh khoản</option></select>' +
      '<span class="badge badge-gold">' + icon('sparkles') + ' AURA SCORE</span></div><div id="screenBody"></div>';
  }

  function screenRowsHTML() {
    let list = D.ASSETS.filter(a => a.tradable);
    if (screenerState.group !== 'all') list = list.filter(a => a.group === screenerState.group);
    if (screenerState.search) {
      const q = screenerState.search.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    const scored = list.map(a => {
      const spark = sparkFor(a);
      const momentum = spark.length > 2 ? (spark[spark.length - 1] / spark[0] - 1) * 100 : 0;
      const liquidity = Math.log10((a.volume || 0) + 10) * 2;
      const score = clamp(50 + (a.changePct || 0) * 3 + momentum * 1.5 + liquidity, 1, 100);
      return { a, score, momentum };
    });
    scored.sort((x, y) => screenerState.sort === 'chg' ? y.a.changePct - x.a.changePct : screenerState.sort === 'volume' ? (y.a.volume || 0) - (x.a.volume || 0) : y.score - x.score);
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Tài sản</th><th>Nhóm</th><th class="text-right">Giá</th><th class="text-right">24h</th><th class="text-right">Momentum</th><th>AURA Score</th><th></th></tr></thead><tbody>' +
      scored.slice(0, 28).map((s, i) => '<tr><td class="vol-cell">' + (i + 1) + '</td><td>' + assetCell(s.a) + '</td><td><span class="badge" style="color:' + s.a.color + ';border-color:' + s.a.color + '44">' + esc(groupOf(s.a).name) + '</span></td>' +
        '<td class="text-right price-cell" data-q-price="' + s.a.id + '">' + fmtPrice(s.a) + '</td><td class="text-right vol-cell ' + changeCls(s.a.changePct) + '">' + fmtPct(s.a.changePct) + '</td><td class="text-right vol-cell ' + changeCls(s.momentum) + '">' + fmtPct(s.momentum) + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:6px"><div class="quest-progress" style="flex:1;margin:0"><span style="width:' + s.score + '%"></span></div><b class="vol-cell">' + nf(s.score, 0) + '</b></div></td>' +
        '<td class="text-right"><button class="btn btn-xs btn-ghost" data-action="terminal" data-id="' + s.a.id + '">Chart</button></td></tr>').join('') + '</tbody></table></div><div class="calc-note">Điểm AURA chỉ là công cụ khám phá, không phải khuyến nghị mua bán. Dữ liệu mô phỏng được tính từ sparkline nội bộ.</div>';
  }

  function mountScreener() {
    const paint = () => { const body = $('#screenBody'); if (body) body.innerHTML = screenRowsHTML(); };
    paint();
    const search = $('#screenSearch');
    if (search) search.addEventListener('input', () => { screenerState.search = search.value; paint(); });
    const group = $('#screenGroup');
    if (group) group.addEventListener('change', () => { screenerState.group = group.value; paint(); });
    const sort = $('#screenSort');
    if (sort) sort.addEventListener('change', () => { screenerState.sort = sort.value; paint(); });
  }

  /* ---------- Correlation ---------- */
  const CORR_IDS = ['vcb', 'fpt', 'hpg', 'btc', 'eth', 'xauusd'];

  function corrSeries(asset) {
    const spark = sparkFor(asset).filter(isFinite);
    const out = [];
    for (let i = 1; i < spark.length; i++) out.push(spark[i] / spark[i - 1] - 1);
    return out;
  }
  function correlationValue(a, b) {
    const x = corrSeries(a), y = corrSeries(b);
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0;
  }

  function correlationHTML() {
    return '<div class="tool-head"><div><h2>' + icon('layers') + ' Correlation Matrix</h2><p>Tương quan lợi nhuận giữa các nhóm tài sản. Hệ số gần +1 nghĩa là di chuyển cùng chiều; gần −1 là ngược chiều. Đa dạng hoá thực sự cần tương quan thấp.</p></div></div>' +
      '<div class="matrix-wrap"><table class="corr-matrix"><thead><tr><th></th>' + CORR_IDS.map(id => '<th>' + esc(byId[id].symbol) + '</th>').join('') + '</tr></thead><tbody>' +
      CORR_IDS.map(idA => '<tr><th class="row-head">' + esc(byId[idA].symbol) + '</th>' + CORR_IDS.map(idB => {
        const val = idA === idB ? 1 : correlationValue(byId[idA], byId[idB]);
        const alpha = Math.abs(val) * 0.55 + 0.06;
        const bg = val >= 0 ? 'rgba(46,230,166,' + alpha.toFixed(2) + ')' : 'rgba(255,93,115,' + alpha.toFixed(2) + ')';
        return '<td style="background:' + bg + '">' + val.toFixed(2) + '</td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="corr-legend"><span>Ngược chiều</span><span class="corr-scale"></span><span>Cùng chiều</span></div>' +
      '<div class="divider"></div><div class="coach-body"><div class="coach-copy"><strong>Đọc ma trận:</strong> ' + (Math.abs(correlationValue(byId.btc, byId.eth)) > 0.7 ? 'BTC và ETH đang tương quan rất cao — nắm cả hai không giúp giảm rủi ro nhiều. Hãy thêm vàng hoặc tiền mặt vào danh mục.' : 'Các cặp tài sản đang có mức tương quan vừa phải. Hãy kiểm tra lại định kỳ vì tương quan thay đổi theo chế độ thị trường.') + '</div></div>';
  }

  function mountCorrelation() { /* ma trận tĩnh theo sparkline hiện tại */ }

  /* ---------- Fibonacci ---------- */
  function fibonacciHTML() {
    const a = byId[analysisAssetId] || byId.vcb;
    return '<div class="tool-head"><div><h2>' + icon('ruler') + ' Fibonacci Studio</h2><p>Chọn đỉnh và đáy của một sóng, hệ thống tính các mức hồi 23,6% – 78,6% và vùng mở rộng 127,2% / 161,8%. Dùng để tìm điểm vào lệnh có xác suất cao hơn.</p></div></div>' +
      '<div class="analysis-controls"><div class="field"><label class="field-label" for="fibAsset">Tài sản</label><select class="select" id="fibAsset">' + TECH_ASSET_OPTIONS.map(id => { const x = byId[id]; return '<option value="' + id + '"' + (a.id === id ? ' selected' : '') + '>' + esc(x.symbol) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="field-label" for="fibHigh">Đỉnh sóng</label><input class="input mono" id="fibHigh" type="number" step="any" value="' + a.high + '"></div>' +
      '<div class="field"><label class="field-label" for="fibLow">Đáy sóng</label><input class="input mono" id="fibLow" type="number" step="any" value="' + a.low + '"></div>' +
      '<button class="btn btn-gold btn-sm" id="fibCompute">' + icon('calculator') + ' Tính mức giá</button></div><div id="fibResult"></div>';
  }

  function drawFibLevels(a, high, low) {
    const levels = [
      ['0,0%', 0, 'Đỉnh sóng'], ['23,6%', 0.236, 'Hồi nhẹ'], ['38,2%', 0.382, 'Vùng cân bằng'], ['50,0%', 0.5, 'Vùng quyết định'],
      ['61,8%', 0.618, 'Golden ratio'], ['78,6%', 0.786, 'Hồi sâu'], ['100%', 1, 'Đáy sóng']
    ];
    const extensions = [['127,2%', 1.272], ['161,8%', 1.618], ['200%', 2]];
    return '<div class="analysis-stat-grid"><div class="analysis-stat"><div class="lbl">Biên độ sóng</div><div class="val">' + fmtPrice(a, high - low) + '</div></div><div class="analysis-stat"><div class="lbl">Giá hiện tại</div><div class="val">' + fmtPrice(a) + '</div></div><div class="analysis-stat"><div class="lbl">Vị trí trong sóng</div><div class="val ' + (a.price > (high + low) / 2 ? 'up' : 'down') + '">' + nf(clamp((a.price - low) / (high - low || 1) * 100, 0, 100), 0) + '%</div></div><div class="analysis-stat"><div class="lbl">Xu hướng mặc định</div><div class="val">Tăng</div></div></div>' +
      '<div class="table-wrap"><table class="data-table fib-table"><thead><tr><th>Mức</th><th>Tỷ lệ</th><th class="text-right">Giá hồi</th><th class="text-right">Cách giá</th><th>Vai trò</th></tr></thead><tbody>' +
      levels.map(l => {
        const price = high - (high - low) * l[1];
        const dist = (price / a.price - 1) * 100;
        return '<tr><td class="fib-type">' + l[0] + '</td><td class="vol-cell">' + l[1] + '</td><td class="text-right price-cell">' + fmtPrice(a, price) + '</td><td class="text-right vol-cell ' + changeCls(dist) + '">' + fmtPct(dist) + '</td><td class="vol-cell">' + l[2] + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="divider"></div><div class="table-wrap"><table class="data-table fib-table"><thead><tr><th>Mở rộng</th><th class="text-right">Giá mục tiêu</th><th class="text-right">Cách giá</th></tr></thead><tbody>' +
      extensions.map(l => {
        const price = low + (high - low) * l[1];
        const dist = (price / a.price - 1) * 100;
        return '<tr><td class="fib-type">' + l[0] + '</td><td class="text-right price-cell up">' + fmtPrice(a, price) + '</td><td class="text-right vol-cell up">' + fmtPct(dist) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function mountFibonacci() {
    const paint = () => {
      const a = byId[$('#fibAsset').value] || byId.vcb;
      let high = Number($('#fibHigh').value), low = Number($('#fibLow').value);
      if (!isFinite(high) || !isFinite(low) || high <= low) {
        $('#fibResult').innerHTML = '<div class="analysis-stat" style="color:var(--down)">Đỉnh phải lớn hơn đáy. Kiểm tra lại hai mức giá.</div>';
        return;
      }
      $('#fibResult').innerHTML = drawFibLevels(a, high, low);
    };
    const asset = $('#fibAsset');
    if (asset) asset.addEventListener('change', () => {
      const a = byId[asset.value];
      $('#fibHigh').value = a.high;
      $('#fibLow').value = a.low;
      paint();
    });
    const btn = $('#fibCompute');
    if (btn) btn.addEventListener('click', paint);
    paint();
  }

  /* ---------- Risk calculator ---------- */
  function riskHTML() {
    const a = byId[analysisAssetId] || byId.vcb;
    return '<div class="tool-head"><div><h2>' + icon('shield') + ' Position Risk Calculator</h2><p>Quy tắc sống còn: rủi ro mỗi lệnh không quá 1–2% vốn. Công cụ này tính khối lượng tối đa dựa trên điểm cắt lỗ của bạn.</p></div></div>' +
      '<div class="analysis-controls"><div class="field"><label class="field-label" for="riskAsset">Tài sản</label><select class="select" id="riskAsset">' + TECH_ASSET_OPTIONS.map(id => { const x = byId[id]; return '<option value="' + id + '"' + (a.id === id ? ' selected' : '') + '>' + esc(x.symbol) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="field-label">Hướng</label><select class="select" id="riskSide"><option value="long">Long / Mua</option><option value="short">Short / Bán khống</option></select></div>' +
      '<div class="field"><label class="field-label" for="riskCapital">Vốn (₫)</label><input class="input mono" id="riskCapital" type="number" value="' + Math.round(netWorth()) + '"></div>' +
      '<div class="field" style="max-width:100px"><label class="field-label" for="riskPct">Rủi ro %</label><input class="input mono" id="riskPct" type="number" value="1" step="0.1" max="20"></div></div>' +
      '<div class="form-row" style="margin-bottom:12px"><div class="field"><label class="field-label" for="riskEntry">Giá vào</label><input class="input mono" id="riskEntry" type="number" step="any" value="' + a.price + '"></div><div class="field"><label class="field-label" for="riskStop">Cắt lỗ</label><input class="input mono" id="riskStop" type="number" step="any" value="' + (a.price * 0.95).toFixed(a.decimals || 2) + '"></div><div class="field"><label class="field-label" for="riskTarget">Mục tiêu</label><input class="input mono" id="riskTarget" type="number" step="any" value="' + (a.price * 1.1).toFixed(a.decimals || 2) + '"></div></div>' +
      '<div id="riskResult"></div><div class="calc-note">Khối lượng được làm tròn theo lô giao dịch. Với forex, giá trị mỗi pip phụ thuộc hợp đồng 100.000 đơn vị; máy tính đã quy đổi sang VND.</div>';
  }

  function riskResultHTML() {
    const a = byId[$('#riskAsset').value] || byId.vcb;
    const side = $('#riskSide').value;
    const capital = Number($('#riskCapital').value) || 0;
    const riskPct = clamp(Number($('#riskPct').value) || 0, 0.1, 20);
    const entry = Number($('#riskEntry').value) || a.price;
    const stop = Number($('#riskStop').value) || 0;
    const target = Number($('#riskTarget').value) || 0;
    const riskPerUnit = Math.abs(entry - stop) * valueFactor(a);
    if (riskPerUnit <= 0) return '<div class="analysis-stat" style="color:var(--down)">Giá vào và cắt lỗ phải khác nhau.</div>';
    if (side === 'long' && stop >= entry) return '<div class="analysis-stat" style="color:var(--down)">Long cần cắt lỗ thấp hơn giá vào.</div>';
    if (side === 'short' && stop <= entry) return '<div class="analysis-stat" style="color:var(--down)">Short cần cắt lỗ cao hơn giá vào.</div>';
    const riskAmount = capital * riskPct / 100;
    const rawQty = riskAmount / riskPerUnit;
    const qty = Math.max(0, roundQty(a, rawQty));
    const notional = notionalVND(a, entry, qty);
    const positionPct = capital ? notional / capital * 100 : 0;
    const rr = Math.abs(target - entry) / Math.abs(entry - stop);
    const profit = qty * Math.abs(target - entry) * valueFactor(a);
    const riskVND = qty * riskPerUnit;
    return '<div class="analysis-stat-grid"><div class="analysis-stat"><div class="lbl">Khối lượng tối đa</div><div class="val">' + fmtQty(a, qty) + ' ' + esc(a.unit || 'đơn vị') + '</div></div><div class="analysis-stat"><div class="lbl">Rủi ro tối đa</div><div class="val down">' + money(riskVND) + ' ₫</div></div><div class="analysis-stat"><div class="lbl">Giá trị vị thế</div><div class="val">' + money(notional) + ' ₫</div></div><div class="analysis-stat"><div class="lbl">Tỷ lệ R:R</div><div class="val ' + (rr >= 2 ? 'up' : rr >= 1 ? '' : 'down') + '">1 : ' + nf(rr, 2) + '</div></div></div>' +
      '<div class="kv-row"><span class="k">Vốn rủi ro cho phép</span><span class="v">' + money(capital * riskPct / 100) + ' ₫ (' + nf(riskPct, 1) + '%)</span></div><div class="kv-row"><span class="k">Tỷ trọng vị thế / vốn</span><span class="v ' + (positionPct > 100 ? 'down' : '') + '">' + nf(positionPct, 1) + '%</span></div>' +
      '<div class="kv-row"><span class="k">Lợi nhuận tiềm năng</span><span class="v up">+' + money(profit) + ' ₫</span></div><div class="kv-row"><span class="k">Số lần sai liên tiếp có thể chịu</span><span class="v">' + Math.floor(100 / riskPct) + ' lần</span></div>' +
      '<div class="risk-warning-inline">' + icon('info') + ' Nếu khối lượng yêu cầu cần đòn bẩy, hãy kiểm tra lại. Vị thế lý tưởng là vị thế bạn ngủ ngon được kể cả khi giá đi ngược 10%.' + (qty === 0 ? ' Với vốn và điểm cắt lỗ hiện tại, khối lượng làm tròn về 0 — hãy tăng vốn hoặc nới điểm cắt lỗ hợp lý.' : '') + '</div>';
  }

  function mountRisk() {
    const paint = () => { const box = $('#riskResult'); if (box) box.innerHTML = riskResultHTML(); };
    const asset = $('#riskAsset');
    if (asset) asset.addEventListener('change', () => {
      const a = byId[asset.value];
      $('#riskEntry').value = a.price;
      $('#riskStop').value = (a.price * 0.95).toFixed(a.decimals || 2);
      $('#riskTarget').value = (a.price * 1.1).toFixed(a.decimals || 2);
      paint();
    });
    ['riskCapital', 'riskPct', 'riskEntry', 'riskStop', 'riskTarget', 'riskSide'].forEach(id => {
      const el = $('#' + id);
      if (el) el.addEventListener('input', paint);
      if (el) el.addEventListener('change', paint);
    });
    paint();
  }

  /* ---------- Goal planner ---------- */
  function goalHTML() {
    return '<div class="tool-head"><div><h2>' + icon('target') + ' Wealth Goal Planner</h2><p>Lập kế hoạch tài sản dài hạn: nhập vốn hiện tại, góp thêm mỗi tháng và lợi nhuận kỳ vọng. Hãy nhớ lợi nhuận kỳ vọng chỉ là giả định.</p></div></div>' +
      '<div class="analysis-controls"><div class="field"><label class="field-label" for="goalInitial">Vốn ban đầu</label><input class="input mono" id="goalInitial" type="number" value="' + Math.round(netWorth()) + '"></div><div class="field"><label class="field-label" for="goalMonthly">Góp mỗi tháng</label><input class="input mono" id="goalMonthly" type="number" value="10000000"></div><div class="field" style="max-width:110px"><label class="field-label" for="goalRate">Lợi nhuận/năm (%)</label><input class="input mono" id="goalRate" type="number" value="12" step="0.5"></div><div class="field" style="max-width:90px"><label class="field-label" for="goalYears">Số năm</label><input class="input mono" id="goalYears" type="number" value="5" min="1" max="40"></div></div>' +
      '<div class="goal-result"><span class="big" id="goalFuture">—</span><span>giá trị tương lai</span></div><div class="goal-chart"><canvas id="goalChart" class="equity-canvas" style="height:150px"></canvas></div><div id="goalBreakdown"></div><div class="calc-note">Công thức: lãi kép theo tháng + góp đều. Không tính lạm phát, thuế và phí giao dịch.</div>';
  }

  function goalValues() {
    const initial = Number($('#goalInitial').value) || 0;
    const monthly = Number($('#goalMonthly').value) || 0;
    const annual = Number($('#goalRate').value) || 0;
    const years = clamp(Number($('#goalYears').value) || 1, 1, 40);
    const r = annual / 100 / 12;
    const n = Math.round(years * 12);
    const series = [];
    let v = initial;
    for (let i = 0; i <= n; i++) {
      if (i > 0) v = v * (1 + r) + monthly;
      series.push(v);
    }
    const future = series[series.length - 1];
    const contributed = initial + monthly * n;
    return { initial, monthly, annual, years, n, series, future, contributed, growth: future - contributed };
  }

  function paintGoal() {
    const g = goalValues();
    const futureEl = $('#goalFuture');
    if (futureEl) futureEl.textContent = money(g.future) + ' ₫';
    const box = $('#goalBreakdown');
    if (box) box.innerHTML = '<div class="kv-row"><span class="k">Tổng vốn đã góp</span><span class="v">' + money(g.contributed) + ' ₫</span></div><div class="kv-row"><span class="k">Lãi kép tạo ra</span><span class="v up">+' + money(g.growth) + ' ₫</span></div><div class="kv-row"><span class="k">Số tháng</span><span class="v">' + g.n + ' tháng</span></div><div class="kv-row"><span class="k">Tỷ lệ lãi / vốn góp</span><span class="v">' + nf(g.contributed ? g.growth / g.contributed * 100 : 0, 1) + '%</span></div>';
    const canvas = $('#goalChart');
    if (canvas) CH.MiniChart.line(canvas, g.series, { baseline: g.initial, formatAxis: v => money(v), labels: false });
  }

  function mountGoal() {
    ['goalInitial', 'goalMonthly', 'goalRate', 'goalYears'].forEach(id => {
      const el = $('#' + id);
      if (el) el.addEventListener('input', paintGoal);
    });
    paintGoal();
  }

  /* ---------- Journal ---------- */
  function journalHTML() {
    return '<div class="tool-head"><div><h2>' + icon('book') + ' Trading Journal</h2><p>Viết lý do vào lệnh, cảm xúc và bài học. Nhìn lại nhật ký là cách nhanh nhất để ngừng lặp lại sai lầm.</p></div><span class="badge">' + (state.journal || []).length + ' bài ghi</span></div>' +
      '<form class="journal-form" id="journalForm"><div class="form-row" style="margin-bottom:8px"><div class="field"><label class="field-label" for="journalMood">Tâm trạng</label><select class="select" id="journalMood"><option value="Kỷ luật">🧘 Kỷ luật</option><option value="FOMO">😰 FOMO</option><option value="Tự tin">💪 Tự tin</option><option value="Do dự">🤔 Do dự</option><option value="Hối tiếc">😞 Hối tiếc</option></select></div><div class="field"><label class="field-label" for="journalAsset">Tài sản liên quan</label><select class="select" id="journalAsset"><option value="">— Không chọn —</option>' + TECH_ASSET_OPTIONS.map(id => '<option value="' + id + '">' + esc(byId[id].symbol) + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label class="field-label" for="journalText">Ghi chú <span class="hint">Lý do vào lệnh, điểm cắt lỗ, cảm xúc…</span></label><textarea class="textarea" id="journalText" placeholder="Ví dụ: Mua FPT vì giá vượt vùng tích luỹ 20 phiên với khối lượng tăng. Cắt lỗ dưới MA20. Rủi ro 1% tài khoản."></textarea></div>' +
      '<div class="head-actions" style="justify-content:flex-end;margin-top:9px"><button class="btn btn-gold btn-sm" type="submit">' + icon('pencil') + ' Lưu nhật ký</button></div></form><div class="divider"></div><div id="journalList"></div>';
  }

  function journalListHTML() {
    const items = state.journal || [];
    if (!items.length) return '<div class="empty-state"><div class="empty-icon">📓</div><strong>Nhật ký còn trống</strong><p>Một dòng mỗi ngày cũng đủ để bạn nhìn thấy mình tiến bộ như thế nào.</p></div>';
    return items.map(j => {
      const a = j.assetId ? byId[j.assetId] : null;
      return '<div class="journal-entry"><div class="journal-entry-head">' + (a ? '<span class="asset-logo sm" style="--asset-color:' + a.color + '">' + esc(a.icon) + '</span>' : '<span>📝</span>') + '<b>' + (a ? esc(a.symbol) : 'Ghi chú') + '</b><span class="badge">' + esc(j.mood || 'Kỷ luật') + '</span><time>' + timeAgo(j.t) + '</time><button class="btn btn-xs btn-ghost" data-action="delete-journal" data-id="' + j.id + '">Xoá</button></div><p>' + esc(j.text) + '</p></div>';
    }).join('');
  }

  function mountJournal() {
    const list = $('#journalList');
    if (list) list.innerHTML = journalListHTML();
    const form = $('#journalForm');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const text = $('#journalText').value.trim();
      if (!text) return toast('Chưa có nội dung', 'Hãy viết vài dòng về lệnh hoặc cảm xúc của bạn.', 'error', '📓');
      if (!state.journal) state.journal = [];
      state.journal.unshift({ id: uid('j'), t: Date.now(), mood: $('#journalMood').value, assetId: $('#journalAsset').value || null, text });
      state.journal = state.journal.slice(0, 100);
      addXP(6); addAura(2); saveNow();
      toast('Đã lưu nhật ký', 'Một dòng ghi lại hôm nay là một bước tiến ngày mai.', 'success', '📓');
      renderAnalysisTool();
    });
  }

  /* ---------- Shared analysis helpers ---------- */
  function analysisAssetSelect(id) {
    const ids = D.ASSETS.filter(a => a.tradable && a.group !== 'derivatives').map(a => a.id);
    return '<select class="select" id="' + id + '" style="width:auto;height:34px;font-size:10px">' +
      ids.map(aid => {
        const a = byId[aid];
        return '<option value="' + aid + '"' + (analysisAssetId === aid ? ' selected' : '') + '>' + esc(a.symbol) + ' · ' + esc(a.name) + '</option>';
      }).join('') + '</select>';
  }
  function bindAnalysisAsset(id, repaint) {
    const el = $('#' + id);
    if (el) el.addEventListener('change', () => { analysisAssetId = el.value; repaint(); });
  }
  function dailyReturns(asset, count) {
    const candles = D.generateCandles(asset, '1D', count || 420, asset.price);
    const closes = candles.map(c => c.c);
    const rets = [];
    for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
    return { candles, closes, rets };
  }
  function stdev(arr) {
    if (!arr || arr.length < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (arr.length - 1);
    return Math.sqrt(Math.max(0, variance));
  }

  /* ---------- Seasonality ---------- */
  const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  function seasonalityData(asset) {
    const candles = D.generateCandles(asset, '1D', 1500, asset.price);
    const buckets = {};
    candles.forEach(c => {
      const d = new Date(c.t * 1000);
      const key = d.getFullYear() + '-' + d.getMonth();
      if (!buckets[key]) buckets[key] = { month: d.getMonth(), open: c.o, close: c.c };
      buckets[key].close = c.c;
    });
    const byMonth = Array.from({ length: 12 }, () => []);
    Object.keys(buckets).forEach(k => {
      const b = buckets[k];
      byMonth[b.month].push((b.close / b.open - 1) * 100);
    });
    return byMonth.map((arr, month) => {
      const avg = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      return {
        month, avg, n: arr.length,
        win: arr.length ? arr.filter(v => v > 0).length / arr.length * 100 : 0,
        best: arr.length ? Math.max(...arr) : 0,
        worst: arr.length ? Math.min(...arr) : 0
      };
    });
  }

  function seasonalityHTML() {
    return '<div class="tool-head"><div><h2>' + icon('calendar') + ' Seasonality Map</h2><p>Xem tháng nào thường mạnh, tháng nào thường yếu. Mùa vụ chỉ là xác suất lịch sử — không phải lời hứa cho tương lai.</p></div><div class="analysis-controls" style="margin:0">' + analysisAssetSelect('seasonAsset') + '</div></div>' +
      '<div id="seasonBody"><div class="skeleton" style="height:280px;border-radius:12px"></div></div>';
  }

  function paintSeasonality() {
    const box = $('#seasonBody');
    if (!box) return;
    const a = byId[$('#seasonAsset').value] || byId.vcb;
    const rows = seasonalityData(a);
    const maxAbs = Math.max(0.5, ...rows.map(r => Math.abs(r.avg)));
    const current = new Date().getMonth();
    const best = rows.reduce((m, r) => r.avg > m.avg ? r : m, rows[0]);
    const worst = rows.reduce((m, r) => r.avg < m.avg ? r : m, rows[0]);
    const positives = rows.filter(r => r.avg > 0).length;
    const cur = rows[current];
    const chart = '<div class="season-chart">' + rows.map(r => {
      const h = Math.max(2, Math.abs(r.avg) / maxAbs * 48);
      const style = r.avg >= 0 ? 'bottom:50%;height:' + nf(h, 1) + '%' : 'top:50%;height:' + nf(h, 1) + '%';
      return '<div class="season-col' + (r.month === current ? ' current' : '') + '">' +
        '<div class="season-bar-track"><span class="season-bar ' + (r.avg >= 0 ? 'up' : 'down') + '" style="' + style + '"></span></div>' +
        '<b class="' + changeCls(r.avg) + '">' + nf(r.avg, 1) + '%</b><span class="season-month">' + MONTH_LABELS[r.month] + '</span></div>';
    }).join('') + '</div>';
    box.innerHTML = '<div class="analysis-stat-grid">' +
      '<div class="analysis-stat"><div class="lbl">Tháng mạnh nhất</div><div class="val up">' + MONTH_LABELS[best.month] + ' · ' + fmtPct(best.avg) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Tháng yếu nhất</div><div class="val down">' + MONTH_LABELS[worst.month] + ' · ' + fmtPct(worst.avg) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Số tháng tăng trung bình</div><div class="val">' + positives + '/12</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Tháng hiện tại · ' + MONTH_LABELS[current] + '</div><div class="val ' + changeCls(cur.avg) + '">' + fmtPct(cur.avg) + ' · thắng ' + nf(cur.win, 0) + '%</div></div></div>' +
      chart +
      '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Tháng</th><th class="text-right">Lợi nhuận TB</th><th class="text-right">Tỷ lệ thắng</th><th class="text-right">Số mẫu</th><th class="text-right">Tốt nhất</th><th class="text-right">Xấu nhất</th></tr></thead><tbody>' +
      rows.map(r => '<tr' + (r.month === current ? ' class="row-current"' : '') + '><td class="fib-type">' + MONTH_LABELS[r.month] + (r.month === current ? ' · hiện tại' : '') + '</td><td class="text-right price-cell ' + changeCls(r.avg) + '">' + fmtPct(r.avg) + '</td><td class="text-right vol-cell">' + nf(r.win, 0) + '%</td><td class="text-right vol-cell">' + r.n + '</td><td class="text-right vol-cell up">' + fmtPct(r.best) + '</td><td class="text-right vol-cell down">' + fmtPct(r.worst) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="calc-note">Mô phỏng ' + a.symbol + ' trên 1.500 phiên (khoảng 6 năm). Tháng hiện tại được tô sáng. Chỉ dùng để tham khảo cấu trúc mùa vụ, không phải tín hiệu mua bán.</div>';
  }

  function mountSeasonality() {
    bindAnalysisAsset('seasonAsset', paintSeasonality);
    paintSeasonality();
  }

  /* ---------- Volatility ---------- */
  function volatilityData(asset) {
    const { candles, closes, rets } = dailyReturns(asset, 420);
    const ann = n => rets.length >= 3 ? stdev(rets.slice(-n)) * Math.sqrt(252) * 100 : 0;
    let peak = 0, maxDD = 0;
    closes.slice(-252).forEach(c => {
      peak = Math.max(peak, c);
      if (peak) maxDD = Math.min(maxDD, c / peak - 1);
    });
    const sorted = rets.slice().sort((x, y) => x - y);
    const var95 = sorted.length ? Math.max(0, -sorted[Math.floor(sorted.length * 0.05)] * 100) : 0;
    const ranges = candles.slice(-30).map(c => (c.h - c.l) / c.c * 100);
    const avgRange = ranges.length ? ranges.reduce((s, v) => s + v, 0) / ranges.length : 0;
    return { vol30: ann(30), vol90: ann(90), vol252: ann(252), dailyVol: stdev(rets.slice(-90)), maxDD: maxDD * 100, var95, avgRange, ann };
  }

  function volLabel(v) {
    return v < 15 ? 'Thấp' : v < 30 ? 'Trung bình' : v < 60 ? 'Cao' : 'Rất cao';
  }

  function volatilityHTML() {
    return '<div class="tool-head"><div><h2>' + icon('fire') + ' Volatility Radar</h2><p>Đo biến động thực tế từ chuỗi nến, quy đổi theo năm và dựng dải giá kỳ vọng 30 ngày. Biến động càng cao, vị thế càng cần nhỏ.</p></div><div class="analysis-controls" style="margin:0">' + analysisAssetSelect('volAsset') + '</div></div>' +
      '<div id="volBody"><div class="skeleton" style="height:280px;border-radius:12px"></div></div>';
  }

  function paintVolatility() {
    const box = $('#volBody');
    if (!box) return;
    const a = byId[$('#volAsset').value] || byId.vcb;
    const v = volatilityData(a);
    const sigma = Math.max(0.0005, v.dailyVol || 0.01);
    const days = 30;
    const low = [], mid = [], high = [], xLabels = [];
    for (let i = 0; i <= days; i++) {
      const factor = 1.28 * sigma * Math.sqrt(i);
      low.push(a.price * Math.exp(-factor));
      mid.push(a.price);
      high.push(a.price * Math.exp(factor));
      xLabels.push(i === 0 ? 'Hôm nay' : i === days ? '+' + days + ' ngày' : '');
    }
    const windows = [10, 20, 50, 100, 252].filter(n => n <= 420);
    box.innerHTML = '<div class="analysis-stat-grid">' +
      '<div class="analysis-stat"><div class="lbl">Biến động 30 ngày / năm</div><div class="val">' + nf(v.vol30, 1) + '% · ' + volLabel(v.vol30) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Biến động 90 ngày / năm</div><div class="val">' + nf(v.vol90, 1) + '% · ' + volLabel(v.vol90) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Drawdown tối đa 1 năm</div><div class="val down">' + nf(v.maxDD, 1) + '%</div></div>' +
      '<div class="analysis-stat"><div class="lbl">VaR 95% · 1 ngày</div><div class="val down">-' + nf(v.var95, 2) + '%</div></div></div>' +
      '<div class="band-chart"><canvas id="volBands" class="equity-canvas" style="height:200px"></canvas></div>' +
      '<div class="kv-row"><span class="k">Biên độ trung bình 30 phiên</span><span class="v">' + nf(v.avgRange, 2) + '% / phiên</span></div>' +
      '<div class="kv-row"><span class="k">Cú giật 1σ dự kiến mỗi ngày</span><span class="v">±' + nf(sigma * 100, 2) + '%</span></div>' +
      '<div class="kv-row"><span class="k">Dải 80% sau 30 ngày</span><span class="v">' + fmtPrice(a, low[days]) + ' — ' + fmtPrice(a, high[days]) + '</span></div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Khung đo</th><th class="text-right">Biến động / năm</th><th>Mức</th><th class="text-right">Độ lệch chuẩn ngày</th></tr></thead><tbody>' +
      windows.map(n => {
        const val = v.ann(n);
        return '<tr><td class="fib-type">' + n + ' phiên</td><td class="text-right price-cell">' + nf(val, 2) + '%</td><td><span class="signal-badge ' + (val > 45 ? 'sell' : val > 25 ? 'neutral' : 'buy') + '">' + volLabel(val) + '</span></td><td class="text-right vol-cell">' + nf(val / Math.sqrt(252), 2) + '%</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="calc-note">Biến động = độ lệch chuẩn log-return × √252. Dải giá giả định phân phối chuẩn, độ tin cậy 80% và không có drift. Thực tế có đuôi béo — đừng xem dải là giới hạn tuyệt đối.</div>';
    const canvas = $('#volBands');
    if (canvas) CH.MiniChart.bands(canvas, { low, mid, high }, { formatAxis: val => fmtPrice(a, val), xLabels, color: a.changePct >= 0 ? undefined : '#ff5d73' });
  }

  function mountVolatility() {
    bindAnalysisAsset('volAsset', paintVolatility);
    paintVolatility();
  }

  /* ---------- Monte Carlo ---------- */
  function montecarloData(asset, horizon) {
    const { rets } = dailyReturns(asset, 320);
    const sigma = Math.max(0.0015, stdev(rets.slice(-120)));
    const seed = D.hash32(asset.id + '|mc|' + horizon + '|' + new Date().toISOString().slice(0, 10));
    const rand = D.mulberry32(seed);
    const norm = () => {
      const u = Math.max(1e-9, rand());
      const v2 = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2);
    };
    const sims = 400;
    const paths = [];
    for (let s = 0; s < sims; s++) {
      let p = asset.price;
      const path = [p];
      for (let d = 0; d < horizon; d++) {
        p *= Math.exp(-0.5 * sigma * sigma + sigma * norm());
        path.push(p);
      }
      paths.push(path);
    }
    const q = (arr, pct) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor((arr.length - 1) * pct)))];
    const low = [], p25 = [], mid = [], p75 = [], high = [];
    for (let d = 0; d <= horizon; d++) {
      const vals = paths.map(path => path[d]).sort((x, y) => x - y);
      low.push(q(vals, 0.05));
      p25.push(q(vals, 0.25));
      mid.push(q(vals, 0.5));
      p75.push(q(vals, 0.75));
      high.push(q(vals, 0.95));
    }
    const finals = paths.map(path => path[horizon]);
    const prob = finals.filter(v => v > asset.price).length / sims * 100;
    return { sigma, low, p25, mid, p75, high, finals, prob, horizon, sims };
  }

  function montecarloHTML() {
    return '<div class="tool-head"><div><h2>' + icon('wand') + ' Monte Carlo Lab</h2><p>Chạy 400 kịch bản giá bằng mô phỏng ngẫu nhiên từ biến động lịch sử. Kết quả là phân phối xác suất, không phải dự báo chắc chắn.</p></div><div class="analysis-controls" style="margin:0">' + analysisAssetSelect('mcAsset') +
      '<select class="select" id="mcHorizon" style="width:auto;height:34px;font-size:10px"><option value="30">30 ngày</option><option value="60">60 ngày</option><option value="90">90 ngày</option></select></div></div>' +
      '<div id="mcBody"><div class="skeleton" style="height:280px;border-radius:12px"></div></div>';
  }

  function paintMontecarlo() {
    const box = $('#mcBody');
    if (!box) return;
    const a = byId[$('#mcAsset').value] || byId.vcb;
    const horizon = clamp(Number($('#mcHorizon').value) || 30, 10, 120);
    const m = montecarloData(a, horizon);
    const target = m.mid[horizon];
    const ret = (target / a.price - 1) * 100;
    const xLabels = [];
    for (let i = 0; i <= horizon; i++) xLabels.push(i === 0 ? 'Hôm nay' : i === horizon ? '+' + horizon + ' ngày' : '');
    box.innerHTML = '<div class="analysis-stat-grid">' +
      '<div class="analysis-stat"><div class="lbl">Trung vị sau ' + horizon + ' ngày</div><div class="val">' + fmtPrice(a, target) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Xác suất có lãi</div><div class="val ' + (m.prob >= 50 ? 'up' : 'down') + '">' + nf(m.prob, 0) + '%</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Kịch bản xấu P5</div><div class="val down">' + fmtPrice(a, m.low[horizon]) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Kịch bản tốt P95</div><div class="val up">' + fmtPrice(a, m.high[horizon]) + '</div></div></div>' +
      '<div class="band-chart"><canvas id="mcBands" class="equity-canvas" style="height:210px"></canvas></div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Phân vị</th><th class="text-right">Giá sau ' + horizon + ' ngày</th><th class="text-right">Thay đổi</th><th>Diễn giải</th></tr></thead><tbody>' +
      [['P5', m.low[horizon], 'Bi kịch · 5% kịch bản xấu hơn'], ['P25', m.p25[horizon], 'Thận trọng · 25% kịch bản xấu hơn'], ['P50', m.mid[horizon], 'Trung vị · nửa kịch bản trên, nửa dưới'], ['P75', m.p75[horizon], 'Tích cực · 25% kịch bản tốt hơn'], ['P95', m.high[horizon], 'Lạc quan · 5% kịch bản tốt hơn']].map(row => {
        const dist = (row[1] / a.price - 1) * 100;
        return '<tr><td class="fib-type">' + row[0] + '</td><td class="text-right price-cell">' + fmtPrice(a, row[1]) + '</td><td class="text-right vol-cell ' + changeCls(dist) + '">' + fmtPct(dist) + '</td><td class="vol-cell">' + row[2] + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="calc-note">' + m.sims + ' đường giá · biến động ngày ' + nf(m.sigma * 100, 2) + '% · drift = 0 · seed cố định theo ngày. Kết quả thay đổi khi bạn đổi tài sản hoặc khung thời gian, và không bao gồm phí, thuế hay tin tức bất ngờ.</div>';
    const canvas = $('#mcBands');
    if (canvas) CH.MiniChart.bands(canvas, { low: m.low, mid: m.mid, high: m.high }, { formatAxis: val => fmtPrice(a, val), xLabels, color: ret >= 0 ? undefined : '#ff5d73' });
  }

  function mountMontecarlo() {
    bindAnalysisAsset('mcAsset', paintMontecarlo);
    const h = $('#mcHorizon');
    if (h) h.addEventListener('change', paintMontecarlo);
    paintMontecarlo();
  }

  /* ---------- Pivot points ---------- */
  function pivotData(asset, method) {
    const { candles } = dailyReturns(asset, 40);
    const prev = candles[candles.length - 2] || candles[candles.length - 1];
    const H = prev.h, L = prev.l, C = prev.c;
    const range = Math.max(H - L, Math.abs(C) * 0.0001);
    const pp = (H + L + C) / 3;
    let levels;
    if (method === 'fib') {
      levels = [
        ['R3', pp + range], ['R2', pp + range * 0.618], ['R1', pp + range * 0.382],
        ['PP', pp],
        ['S1', pp - range * 0.382], ['S2', pp - range * 0.618], ['S3', pp - range]
      ];
    } else if (method === 'cam') {
      levels = [
        ['R4', C + range * 1.1 / 2], ['R3', C + range * 1.1 / 4], ['R2', C + range * 1.1 / 6], ['R1', C + range * 1.1 / 12],
        ['PP', pp],
        ['S1', C - range * 1.1 / 12], ['S2', C - range * 1.1 / 6], ['S3', C - range * 1.1 / 4], ['S4', C - range * 1.1 / 2]
      ];
    } else {
      levels = [
        ['R3', H + 2 * (pp - L)], ['R2', pp + range], ['R1', 2 * pp - L],
        ['PP', pp],
        ['S1', 2 * pp - H], ['S2', pp - range], ['S3', L - 2 * (H - pp)]
      ];
    }
    return {
      prev, pp, H, L, C, price: asset.price,
      levels: levels.map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value)
    };
  }

  function pivotHTML() {
    return '<div class="tool-head"><div><h2>' + icon('horizontal') + ' Pivot Points</h2><p>Xác định vùng hỗ trợ và kháng cự tiềm năng từ biên độ phiên trước. Pivot là vùng tham chiếu, không phải lá chắn tuyệt đối.</p></div><div class="analysis-controls" style="margin:0">' + analysisAssetSelect('pivotAsset') +
      '<select class="select" id="pivotMethod" style="width:auto;height:34px;font-size:10px"><option value="classic">Classic</option><option value="fib">Fibonacci</option><option value="cam">Camarilla</option></select></div></div>' +
      '<div id="pivotBody"><div class="skeleton" style="height:280px;border-radius:12px"></div></div>';
  }

  function paintPivot() {
    const box = $('#pivotBody');
    if (!box) return;
    const a = byId[$('#pivotAsset').value] || byId.vcb;
    const method = $('#pivotMethod').value;
    const p = pivotData(a, method);
    const resistance = p.levels.filter(l => l.value > a.price).sort((x, y) => x.value - y.value)[0];
    const support = p.levels.filter(l => l.value < a.price).sort((x, y) => y.value - x.value)[0];
    const maxDist = Math.max(...p.levels.map(l => Math.abs(l.value - a.price) / (a.price || 1)), 0.001);
    const rows = p.levels.concat([{ name: 'GIÁ', value: a.price, current: true }]).sort((x, y) => y.value - x.value);
    box.innerHTML = '<div class="analysis-stat-grid">' +
      '<div class="analysis-stat"><div class="lbl">Pivot Point (PP)</div><div class="val gold">' + fmtPrice(a, p.pp) + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Kháng cự gần nhất</div><div class="val down">' + (resistance ? resistance.name + ' · ' + fmtPrice(a, resistance.value) : '—') + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Hỗ trợ gần nhất</div><div class="val up">' + (support ? support.name + ' · ' + fmtPrice(a, support.value) : '—') + '</div></div>' +
      '<div class="analysis-stat"><div class="lbl">Biên độ phiên trước</div><div class="val">' + fmtPrice(a, p.H - p.L) + '</div></div></div>' +
      '<div class="pivot-ladder">' + rows.map(row => {
        const dist = (row.value / a.price - 1) * 100;
        const w = Math.max(4, Math.abs(row.value - a.price) / (a.price || 1) / maxDist * 100);
        const side = row.current ? 'current' : row.value > a.price ? 'resistance' : 'support';
        return '<div class="pivot-row ' + side + '"><span class="pivot-name">' + row.name + '</span><div class="pivot-track"><span style="width:' + nf(w, 1) + '%"></span></div><span class="pivot-price">' + fmtPrice(a, row.value) + '</span><span class="pivot-dist ' + changeCls(dist) + '">' + (row.current ? 'hiện tại' : fmtPct(dist)) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Mức</th><th class="text-right">Giá</th><th class="text-right">Cách giá</th><th>Vai trò</th></tr></thead><tbody>' +
      p.levels.map(l => {
        const dist = (l.value / a.price - 1) * 100;
        return '<tr><td class="fib-type">' + l.name + '</td><td class="text-right price-cell">' + fmtPrice(a, l.value) + '</td><td class="text-right vol-cell ' + changeCls(dist) + '">' + fmtPct(dist) + '</td><td class="vol-cell">' + (l.value > a.price ? 'Kháng cự' : l.value < a.price ? 'Hỗ trợ' : 'Điểm cân bằng') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="calc-note">Phiên tham chiếu: H ' + fmtPrice(a, p.H) + ' · L ' + fmtPrice(a, p.L) + ' · C ' + fmtPrice(a, p.C) + '. Phương pháp ' + (method === 'fib' ? 'Fibonacci' : method === 'cam' ? 'Camarilla' : 'Classic') + '. Khi giá phá vùng, pivot cũ có thể đổi vai trò — hãy chờ xác nhận bằng khối lượng.</div>';
  }

  function mountPivot() {
    bindAnalysisAsset('pivotAsset', paintPivot);
    const m = $('#pivotMethod');
    if (m) m.addEventListener('change', paintPivot);
    paintPivot();
  }

  /* ============================================================
     WEEKLY CHALLENGES · SEASON · AURA SURVIVAL
     ============================================================ */
  const WEEKLY_CHALLENGES = [
    { id: 'wk_trades', title: 'Nhịp đập thị trường', desc: 'Thực hiện 5 lệnh giao dịch trong tuần.', icon: '⚡', metric: 'trades', goal: 5, aura: 260, xp: 120 },
    { id: 'wk_chart', title: 'Hoạ sĩ nến', desc: 'Vẽ 4 công cụ phân tích lên biểu đồ.', icon: '📐', metric: 'drawings', goal: 4, aura: 220, xp: 100 },
    { id: 'wk_learn', title: 'Một bài mỗi tuần', desc: 'Hoàn thành 1 bài học trong Học viện.', icon: '🎓', metric: 'lessons', goal: 1, aura: 240, xp: 110 },
    { id: 'wk_crypto', title: 'Sóng crypto', desc: 'Thực hiện 2 lệnh crypto.', icon: '🌊', metric: 'crypto_trades', goal: 2, aura: 280, xp: 130 },
    { id: 'wk_detective', title: 'Thám tử tuần', desc: 'Giải đúng 3 vụ án AURA Detective.', icon: '🕵️', metric: 'detective_solved', goal: 3, aura: 300, xp: 140 }
  ];

  function weeklyProgress(def) {
    ensureWeekly();
    const base = Number((state.weekly.baselines || {})[def.metric] || 0);
    return Math.max(0, achievementMetric(def.metric) - base);
  }
  function weeklyClaimed(id) { ensureWeekly(); return (state.weekly.claimed || []).includes(id); }
  function weeklyClaimCount() { ensureWeekly(); return (state.weekly.claimed || []).length; }
  function weeklyBonusReady() { return weeklyClaimCount() >= 3 && !state.weekly.bonusClaimed; }

  function claimWeekly(id) {
    ensureWeekly();
    const def = WEEKLY_CHALLENGES.find(c => c.id === id);
    if (!def || weeklyClaimed(id) || weeklyProgress(def) < def.goal) return;
    state.weekly.claimed.push(id);
    addAura(def.aura);
    addXP(def.xp);
    pushNotif(def.icon, 'Thử thách tuần hoàn thành', def.title + ' · +' + def.aura + ' Aura, +' + def.xp + ' XP');
    toast('Nhận thưởng tuần', def.title + ' · +' + def.aura + ' Aura', 'success', def.icon);
    confetti(30);
    saveNow();
    refreshCurrentRoute();
  }

  function claimWeeklyBonus() {
    ensureWeekly();
    if (!weeklyBonusReady()) return;
    state.weekly.bonusClaimed = true;
    addAura(800);
    addXP(240);
    let drop = null;
    if (Math.random() < 0.4) {
      const pool = D.SHOP.filter(i => !hasItem(i.id) && i.price > 0 && i.price <= 900 && i.type !== 'consumable');
      if (pool.length) {
        drop = pool[Math.floor(Math.random() * pool.length)];
        grantItem(drop.id);
      }
    }
    pushNotif('🏆', 'Hoàn thành tuần xuất sắc', '+800 Aura, +240 XP' + (drop ? ' · Nhận ' + drop.name : ''));
    toast('Phần thưởng tuần!', '+800 Aura, +240 XP' + (drop ? ' và ' + drop.name : ''), 'gold', '🏆');
    confetti(80);
    saveNow();
    refreshCurrentRoute();
  }

  function weeklyListHTML() {
    ensureWeekly();
    return '<div class="weekly-list">' + WEEKLY_CHALLENGES.map(def => {
      const prog = weeklyProgress(def);
      const done = prog >= def.goal;
      const claimed = weeklyClaimed(def.id);
      const btn = claimed ? badge('Đã nhận', 'badge-up') :
        done ? '<button class="btn btn-xs btn-gold" data-action="claim-weekly" data-id="' + def.id + '">Nhận</button>' :
          '<span class="quest-reward">+' + def.aura + ' ✦</span>';
      return '<div class="weekly-item"><div class="weekly-icon">' + def.icon + '</div>' +
        '<div class="weekly-body"><div class="weekly-title">' + esc(def.title) + '</div>' +
        '<div class="weekly-desc">' + esc(def.desc) + '</div>' +
        '<div class="quest-progress"><span style="width:' + clamp(prog / def.goal * 100, 0, 100) + '%"></span></div>' +
        '<div class="weekly-meta"><span>' + Math.min(prog, def.goal) + '/' + def.goal + '</span><span>+' + def.aura + ' ✦ · +' + def.xp + ' XP</span></div></div>' +
        '<div class="weekly-claim">' + btn + '</div></div>';
    }).join('') + '</div>' +
      '<div class="weekly-bonus ' + (weeklyBonusReady() ? 'ready' : '') + '"><div class="wb-icon">🎁</div><div class="wb-copy"><b>Bộ sưu tập tuần · 3 thử thách</b><span>Nhận 800 Aura, 240 XP và cơ hội rơi vật phẩm.</span></div>' +
      (state.weekly.bonusClaimed ? badge('Đã nhận', 'badge-up') : weeklyBonusReady() ? '<button class="btn btn-xs btn-gold" data-action="claim-weekly-bonus">Nhận</button>' : '<span class="badge">' + weeklyClaimCount() + '/3</span>') + '</div>';
  }

  function seasonInfo() {
    const dayIdx = (new Date().getDay() + 6) % 7;
    const daysLeft = 7 - dayIdx;
    const rows = D.BOTS.map(b => ({ ...b })).concat([{ name: state.username, avatar: state.avatar, title: titleValue(), level: xpInfo().level, netWorth: netWorth(), me: true }]).sort((a, b) => b.netWorth - a.netWorth);
    const pos = rows.findIndex(r => r.me) + 1;
    const top = rows[0];
    const gap = top ? Math.max(0, top.netWorth - netWorth()) : 0;
    return { dayIdx, daysLeft, pos, rows, top, gap };
  }

  function ranksHTML() {
    ensureWeekly();
    const rank = currentRank();
    const nxt = nextRank();
    const lvl = xpInfo();
    const season = seasonInfo();
    const pct = lvl.need ? clamp(lvl.current / lvl.need * 100, 0, 100) : 100;
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const netPct = state.capital ? (netWorth() - state.capital) / state.capital * 100 : 0;
    const prof = ensureProfile();
    const pb = profileBannerDef();
    const pa = profileAccentDef();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('trophy') + ' DANH HIỆU & XẾP HẠNG</div><h1>Hành trình của bạn</h1>' +
      '<p class="sub">Mỗi lệnh là một bài học, mỗi nhiệm vụ là một bước tiến. Danh hiệu mở khoá theo cấp độ, Aura dùng để mua phong cách — còn kỷ luật là thứ không ai mua hộ bạn.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-action="open-settings">' + icon('settings-sliders') + ' Hồ sơ</button><button class="btn btn-gold btn-sm" data-nav="#/shop">' + icon('bag') + ' Cửa hàng Aura</button></div></div>' +
      '<div class="ranks-hero"><section class="rank-main-card has-cover" style="--pa:' + pa.color + '"><div class="rank-cover" style="background:' + pb.css + '"></div><div class="rank-profile">' +
      '<span class="avatar avatar-xl" data-avatar>' + esc(state.avatar) + '</span>' +
      '<div class="rank-info"><div class="rank-name-row"><span class="rank-name">' + esc(state.username) + '</span>' +
      '<span class="rank-title-chip">' + icon('sparkles') + ' ' + esc(titleValue()) + '</span>' + (petValue() ? '<span class="profile-pet" title="Thú cưng đang theo">' + petValue() + '</span>' : '') + '</div>' +
      '<div class="rank-level">' + rank.icon + ' ' + esc(rank.name) + ' · Cấp ' + lvl.level + ' · ' + nf(netWorth(), 0) + ' ₫ tài sản</div>' +
      (prof.bio ? '<p class="rank-bio">' + esc(prof.bio) + '</p>' : '') +
      (prof.motto ? '<div class="rank-motto">“' + esc(prof.motto) + '”</div>' : '') +
      (prof.showcase.length ? '<div class="profile-showcase rank-showcase">' + profileShowcaseHTML() + '</div>' : '') +
      '<div class="rank-xp-bar"><span style="width:' + pct + '%"></span></div><div class="rank-xp-label"><span>' + nf(lvl.current, 0) + ' / ' + nf(lvl.need, 0) + ' XP</span><span>' + (nxt ? 'Còn ' + nf(Math.max(0, lvl.need - lvl.current), 0) + ' XP đến ' + nxt.name : 'Cấp tối đa') + '</span></div></div>' +
      '<div style="margin-left:auto;text-align:right"><div class="rank-level">Hiệu suất từ đầu</div><div style="font-family:var(--font-mono);font-size:20px;font-weight:700" class="' + changeCls(netPct) + '">' + fmtPct(netPct) + '</div><div style="font-size:8px;color:var(--dim);margin-top:3px">Vốn ban đầu ' + money(state.capital) + ' ₫</div></div></div>' +
      '<div class="rank-stats"><div class="rank-stat"><div class="lbl">Cấp độ</div><div class="val">' + lvl.level + '</div></div><div class="rank-stat"><div class="lbl">Tổng lệnh</div><div class="val">' + state.stats.trades + '</div></div><div class="rank-stat"><div class="lbl">Chuỗi ngày</div><div class="val">' + (state.streak || 1) + ' 🔥</div></div><div class="rank-stat"><div class="lbl">Aura</div><div class="val" style="color:var(--gold)">' + nf(state.aura, 0) + ' ✦</div></div><div class="rank-stat"><div class="lbl">Thành tựu</div><div class="val">' + D.ACHIEVEMENTS.filter(a => state.achievements[a.id]).length + '/' + D.ACHIEVEMENTS.length + '</div></div></div></section>' +
      '<aside class="season-card"><div class="season-icon">🌅</div><div class="season-title">Mùa 01 · Vươn tầm</div><div class="season-sub">Còn <b>' + season.daysLeft + ' ngày</b> để bứt phá. Top 3 nhận khung mùa giải và Aura thưởng.</div>' +
      '<div class="season-days">' + days.map((d, i) => '<div class="season-day ' + (i < season.dayIdx ? 'past' : '') + ' ' + (i === season.dayIdx ? 'today' : '') + '"><b>' + (i === season.dayIdx ? '•' : days.length - i) + '</b><span>' + d + '</span></div>').join('') + '</div>' +
      '<div class="kv-row"><span class="k">Hạng hiện tại</span><span class="v gold">#' + season.pos + ' / ' + season.rows.length + '</span></div>' +
      '<div class="kv-row"><span class="k">Dẫn đầu</span><span class="v">' + esc(season.top ? season.top.name : '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Cách top 1</span><span class="v">' + (season.gap ? money(season.gap) + ' ₫' : 'Bạn đang dẫn đầu') + '</span></div>' +
      '<button class="btn btn-xs btn-outline-gold btn-block" data-action="open-profile" style="margin-top:9px">' + icon('pencil') + ' Chỉnh hồ sơ</button></aside></div>' +
      '<div class="rank-ladder">' + D.RANKS.map(r => '<div class="rank-step ' + (r.level === rank.level ? 'current' : lvl.level < r.level ? 'locked' : '') + '" style="--rank-color:' + r.color + '"><div class="rank-step-icon">' + r.icon + '</div><div class="rank-step-name">' + esc(r.name) + '</div><div class="rank-step-lvl">Cấp ' + r.level + (lvl.level >= r.level ? ' · Đã mở' : '') + '</div><div class="rank-step-desc">' + esc(r.desc) + '</div></div>').join('') + '</div>' +
      '<div class="rank-two-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('trophy') + ' Thành tựu</div><div class="card-sub">' + D.ACHIEVEMENTS.filter(a => state.achievements[a.id]).length + ' / ' + D.ACHIEVEMENTS.length + ' đã mở khoá · nhận thưởng bằng nút Nhận</div></div><span class="badge badge-gold">' + D.ACHIEVEMENTS.filter(a => achievementState(a).claimable).length + ' chờ nhận</span></div>' + achievementGridHTML() + '</section>' +
      '<div class="dash-col"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('target') + ' Thử thách tuần</div><div class="card-sub">Reset thứ Hai · 4 thử thách</div></div><span class="badge badge-gold">' + weeklyClaimCount() + '/4</span></div>' + weeklyListHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Nhiệm vụ hôm nay</div><div class="card-sub">Mỗi ngày một chút tiến bộ</div></div><span class="badge">' + D.QUESTS.filter(q => questClaimed(q.id)).length + '/' + D.QUESTS.length + '</span></div>' + questListHTML() + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('users') + ' Bảng xếp hạng mùa</div><div class="card-sub">So tài cùng 8 bot huyền thoại</div></div><span class="badge">LIVE</span></div>' + leaderboardHTML() + '</section></div></div>';
  }

  /* ------------------------------ AURA SURVIVAL ------------------------------ */
  const SURVIVAL_SCENARIOS = [
    {
      id: 'fomo', title: 'Cú pump 40%', icon: '🚀', level: 'Tâm lý', minutes: 3, tag: 'FOMO',
      desc: 'Một token lạ tăng 40% trong 2 giờ. Mọi hội nhóm đều gọi tên nó. Bạn làm gì?',
      questions: [
        { q: 'Token XYZ vừa tăng 40% trong 2 giờ, volume gấp 9 lần bình thường. Bạn đang có 30% tiền mặt.', options: [
          { label: 'All-in 10x ngay lập tức', risk: 3, feedback: 'Bạn mua bằng cảm xúc ở vùng giá đã tăng nóng. Thanh lý chỉ cách một cú rung lắc.' },
          { label: 'Mua 10% vốn, spot, có stop-loss', risk: 1, feedback: 'Bạn tham gia với quy mô nhỏ và có điểm thoát. Đây là cách chơi có kế hoạch.' },
          { label: 'Đứng ngoài, ghi lại kế hoạch quan sát', risk: 0, feedback: 'Bỏ lỡ cơ hội không phải là thua lỗ. Bạn giữ được tiền và sự tỉnh táo.' }
        ] },
        { q: 'XYZ bất ngờ giảm 12% trong 15 phút. Nhóm chat đang hoảng loạn.', options: [
          { label: 'Bình quân giá xuống bằng toàn bộ tiền còn lại', risk: 3, feedback: 'Bình quân giá xuống khi chưa có tín hiệu hồi phục là cách nhanh nhất để cháy tài khoản.' },
          { label: 'Tôn trọng stop-loss đã đặt', risk: 0, feedback: 'Cắt lỗ theo kế hoạch là chiến thắng của kỷ luật, không phải thất bại.' },
          { label: 'Chờ xác nhận vùng hỗ trợ rồi mới hành động', risk: 1, feedback: 'Chờ dữ liệu thay vì phản ứng với cảm xúc — tốt hơn, nhưng cần đặt giới hạn thời gian.' }
        ] },
        { q: 'XYZ hồi 25% và quay lại đỉnh cũ. Bạn làm gì?', options: [
          { label: 'Dùng đòn bẩy cao để gỡ lại', risk: 3, feedback: 'Gỡ gạc bằng đòn bẩy là cái bẫy tâm lý kinh điển. Một lệnh sai có thể xoá sạch nhiều lệnh đúng.' },
          { label: 'Chốt một phần nếu đang có vị thế', risk: 0, feedback: 'Chốt lời từng phần giúp bạn giữ lợi nhuận và giảm áp lực tâm lý.' },
          { label: 'Giữ nguyên kế hoạch, dời stop-lên hoà vốn', risk: 1, feedback: 'Quản trị vị thế chủ động. Chỉ cần không để lòng tham thay đổi kế hoạch.' }
        ] }
      ],
      endings: [
        { max: 2, icon: '🛡️', title: 'Người giữ được tiền', text: 'Bạn không để cú pump đánh cắp sự tỉnh táo. Thị trường sẽ còn vô số cơ hội — nhưng chỉ người còn vốn mới tham gia được.' },
        { max: 5, icon: '⚖️', title: 'Nhà giao dịch có kế hoạch', text: 'Bạn có lúc bị cuốn theo đám đông, nhưng vẫn quay về với nguyên tắc. Hãy viết rõ điểm vào, điểm sai và quy mô trước mỗi lệnh.' },
        { max: 9, icon: '🔥', title: 'Degen chính hiệu', text: 'Bạn chơi bằng adrenaline nhiều hơn bằng dữ liệu. Hãy thử lại và chọn phương án ít rủi ro hơn — cảm giác hồi hộp không trả hoá đơn.' }
      ],
      reward: { aura: 260, xp: 120 }
    },
    {
      id: 'winter', title: 'Mùa đông crypto', icon: '❄️', level: 'Quản trị', minutes: 4, tag: 'DCA',
      desc: 'BTC giảm 25% trong một tuần. Danh mục crypto của bạn đang đỏ rực. Bạn giữ được bình tĩnh?',
      questions: [
        { q: 'Danh mục crypto giảm 18%. Tin xấu xuất hiện khắp nơi. Phản ứng đầu tiên của bạn?', options: [
          { label: 'Bán sạch để tránh đau hơn', risk: 2, feedback: 'Bán trong hoảng loạn thường khoá lỗ ở vùng tệ nhất. Cảm xúc không phải tín hiệu thị trường.' },
          { label: 'DCA 10% vốn theo kế hoạch, chia làm 3 lần', risk: 1, feedback: 'DCA có kỷ luật giúp giảm phụ thuộc vào việc đoán đáy, nhưng vẫn cần giới hạn tổng tỷ trọng.' },
          { label: 'Giữ nguyên, kiểm tra lại luận điểm đầu tư', risk: 0, feedback: 'Bạn tách cảm xúc khỏi quyết định và xem xét dữ liệu. Đây là phản ứng của nhà đầu tư trưởng thành.' }
        ] },
        { q: 'Một sàn lớn bị đồn mất thanh khoản. Bạn đang giữ tài sản trên đó.', options: [
          { label: 'Bỏ qua vì tin đồn thường sai', risk: 3, feedback: 'Rủi ro đối tác là rủi ro thật. Không kiểm tra và phân tán tài sản là đánh cược vào may mắn.' },
          { label: 'Rút một phần sang ví tự quản và sàn khác', risk: 0, feedback: 'Phân tán rủi ro đối tác là việc nên làm trước khi có tin xấu, không phải sau.' },
          { label: 'Theo dõi thêm 24 giờ rồi quyết định', risk: 1, feedback: 'Theo dõi có thời hạn hợp lý, nhưng nhớ rằng rút tiền có thể bị chặn nếu sàn thực sự gặp vấn đề.' }
        ] },
        { q: 'Sau cú hồi 8%, nhiều người nói “đáy đã qua”. Bạn làm gì?', options: [
          { label: 'Mở long 20x để đón sóng', risk: 3, feedback: 'Một cú hồi trong xu hướng giảm không xác nhận đáy. Đòn bẩy biến phỏng đoán thành rủi ro cháy tài khoản.' },
          { label: 'Tái cân bằng danh mục, giữ tỷ trọng an toàn', risk: 0, feedback: 'Bạn quản trị tỷ trọng thay vì dự đoán. Đây là cách sống sót qua mùa đông.' },
          { label: 'Mua thêm một ít, đặt cảnh báo các mốc quan trọng', risk: 1, feedback: 'Mua nhỏ và có cảnh báo là phương án cân bằng, miễn là bạn không vượt quá giới hạn rủi ro.' }
        ] }
      ],
      endings: [
        { max: 2, icon: '🧊', title: 'Nhà đầu tư mùa đông', text: 'Bạn hiểu rằng sống sót quan trọng hơn thắng nhanh. Danh mục của bạn không bị buộc phải bán ở đáy, và bạn còn tiền để hành động khi cơ hội thật đến.' },
        { max: 5, icon: '🌤️', title: 'Người đi qua bão', text: 'Bạn giữ được phần lớn vốn nhưng vẫn còn vài quyết định dựa trên cảm xúc. Lần tới, hãy viết sẵn kịch bản cho các mức giảm trước khi thị trường mở cửa.' },
        { max: 9, icon: '🌪️', title: 'Bị cuốn theo cơn bão', text: 'Bạn phản ứng với tin tức thay vì kế hoạch. Hãy thử lại với một nguyên tắc duy nhất: không bao giờ để một tài sản vượt quá 20% danh mục.' }
      ],
      reward: { aura: 280, xp: 130 }
    },
    {
      id: 'margin', title: 'Margin call lúc 3 giờ sáng', icon: '⚡', level: 'Phái sinh', minutes: 4, tag: 'Đòn bẩy',
      desc: 'Vị thế long 10x đang lỗ 8%. Một cây nến xấu có thể xoá sạch ký quỹ của bạn.',
      questions: [
        { q: 'Vị thế long 10x lỗ 8% (tương đương 80% ký quỹ). Bạn làm gì?', options: [
          { label: 'Nạp thêm ký quỹ để gồng', risk: 3, feedback: 'Gồng lỗ bằng tiền mới là cách biến một lệnh sai thành một khoản lỗ lớn hơn. Thị trường không biết bạn cần gì.' },
          { label: 'Cắt một nửa vị thế để giảm rủi ro', risk: 0, feedback: 'Giảm quy mô khi sai là quyết định khó nhưng đúng. Bạn giữ được quyền tham gia cho lần sau.' },
          { label: 'Đóng toàn bộ và ghi lại bài học', risk: 0, feedback: 'Chấp nhận lỗ nhỏ để bảo vệ vốn là kỹ năng cốt lõi của trader phái sinh.' }
        ] },
        { q: 'Biến động tăng vọt, funding đảo chiều. Bạn có thêm một lệnh thắng nhỏ.', options: [
          { label: 'Tăng đòn bẩy cho lệnh tiếp theo', risk: 3, feedback: 'Thắng nhỏ không phải bằng chứng rằng bạn nên tăng rủi ro. Đây là thiên kiến tự tin thái quá.' },
          { label: 'Giữ đòn bẩy thấp, đặt stop trước khi vào lệnh', risk: 0, feedback: 'Bạn tách từng lệnh khỏi cảm xúc chiến thắng. Kỷ luật tạo ra lợi nhuận bền vững.' },
          { label: 'Không đặt stop vì “sẽ tự canh”', risk: 3, feedback: 'Canh lệnh bằng mắt qua đêm là cách phổ biến nhất để mất ký quỹ. Hãy để lệnh tự bảo vệ mình.' }
        ] },
        { q: 'Giá hồi và vị thế còn lại gần hoà vốn. Bạn quyết định thế nào?', options: [
          { label: 'Chốt toàn bộ, nghỉ một ngày', risk: 0, feedback: 'Biết dừng sau một trận khó là kỹ năng. Bạn bảo toàn vốn và giữ đầu óc tỉnh táo.' },
          { label: 'Dời stop lên hoà vốn và theo dõi', risk: 1, feedback: 'Cách này hợp lý nếu bạn chấp nhận bị quét hoà vốn. Đừng dời stop xuống khi giá đi ngược.' },
          { label: 'Tăng vị thế vì “chắc chắn sẽ hồi”', risk: 3, feedback: 'Không có gì chắc chắn trên thị trường. Thêm vị thế khi chưa có lợi thế rõ ràng chỉ làm tăng rủi ro.' }
        ] }
      ],
      endings: [
        { max: 2, icon: '🏰', title: 'Pháo đài ký quỹ', text: 'Bạn đặt kỷ luật lên trước cái tôi. Vị thế có thể thua, nhưng tài khoản của bạn vẫn còn nguyên khả năng chiến đấu.' },
        { max: 5, icon: '🧭', title: 'Trader đang trưởng thành', text: 'Bạn có bản năng bảo vệ vốn, nhưng đôi lúc vẫn để cảm xúc lái tay. Hãy tính mức thanh lý và số tiền rủi ro trước mỗi lần bấm nút.' },
        { max: 9, icon: '💥', title: 'Xém chút nữa là cháy', text: 'Bạn đã chơi với lửa và rất may mắn. Đòn bẩy không phải là tốc độ làm giàu — đó là tốc độ thua. Hãy thử lại ở mức 3–5x.' }
      ],
      reward: { aura: 300, xp: 140 }
    }
  ];

  function survivalDone(id) { return !!(state.survival && state.survival.completed && state.survival.completed[id]); }

  function survivalCardsHTML() {
    return '<div class="survival-grid">' + SURVIVAL_SCENARIOS.map(sc => {
      const done = survivalDone(sc.id);
      const record = state.survival && state.survival.completed ? state.survival.completed[sc.id] : null;
      return '<article class="survival-card ' + (done ? 'done' : '') + '"><div class="survival-art"><span>' + sc.icon + '</span><em>' + esc(sc.tag) + '</em></div>' +
        '<div class="survival-body"><div class="survival-meta"><span class="badge">' + esc(sc.level) + '</span><span>' + sc.minutes + ' phút</span>' + (done ? '<span class="survival-done">' + icon('check') + ' Đã chơi</span>' : '') + '</div>' +
        '<div class="survival-title">' + esc(sc.title) + '</div><div class="survival-desc">' + esc(sc.desc) + '</div>' +
        '<div class="survival-foot"><span>' + (record ? 'Kỷ luật tốt nhất · ' + (9 - record.best) + '/9' : '3 tình huống · 3 lựa chọn') + '</span><button class="btn btn-xs btn-outline-gold" data-action="open-survival" data-id="' + sc.id + '">' + (done ? 'Chơi lại' : 'Bắt đầu') + '</button></div></div></article>';
    }).join('') + '</div>';
  }

  function openSurvival(id) {
    const sc = SURVIVAL_SCENARIOS.find(s => s.id === id);
    if (!sc) return;
    const session = { sc, qi: 0, score: 0, picks: [], revealed: false, selected: null, finished: false, earned: null };
    openModal({
      title: 'AURA Survival · ' + sc.title,
      sub: 'Mỗi lựa chọn đều có giá. Không có nút hoàn tác — giống thị trường thật.',
      size: 'modal-lg',
      body: '<div id="survivalStage"></div>',
      onOpen: () => paintSurvival(session)
    });
  }

  function paintSurvival(session) {
    const stage = $('#survivalStage');
    if (!stage) return;
    const sc = session.sc;
    if (session.finished) {
      const ending = sc.endings.find(e => session.score <= e.max) || sc.endings[sc.endings.length - 1];
      const discipline = 9 - session.score;
      stage.innerHTML = '<div class="survival-end"><div class="survival-end-icon">' + ending.icon + '</div>' +
        '<div class="survival-end-eyebrow">KẾT THÚC · ' + esc(sc.title).toUpperCase() + '</div>' +
        '<h2>' + esc(ending.title) + '</h2><p>' + esc(ending.text) + '</p>' +
        '<div class="survival-score"><div><b>' + discipline + '</b><span>điểm kỷ luật / 9</span></div><div><b>' + session.score + '</b><span>điểm rủi ro / 9</span></div></div>' +
        (session.earned ? '<div class="survival-reward">' + icon('gift') + ' <b>+' + session.earned.aura + ' Aura</b><span>+' + session.earned.xp + ' XP</span></div>' : '<div class="survival-replay-note">Bạn đã chơi kịch bản này trước đó. Lần này chỉ ghi nhận kỷ lục, không cộng thêm thưởng.</div>') +
        '<div class="modal-foot" style="border:0;padding:14px 0 0;justify-content:flex-end"><button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button><button class="btn btn-gold btn-sm" data-action="open-survival" data-id="' + sc.id + '">Chơi lại</button></div></div>';
      return;
    }
    const q = sc.questions[session.qi];
    const dots = sc.questions.map((_, i) => '<span class="' + (i < session.qi ? 'done' : i === session.qi ? 'active' : '') + '"></span>').join('');
    stage.innerHTML = '<div class="survival-progress"><div class="survival-dots">' + dots + '</div><span>Tình huống ' + (session.qi + 1) + ' / ' + sc.questions.length + '</span></div>' +
      '<div class="survival-q">' + esc(q.q) + '</div>' +
      '<div class="survival-options">' + q.options.map((opt, i) => {
        const show = session.revealed;
        const cls = show ? (session.selected === i ? 'selected' : 'dim') : '';
        const riskLabel = opt.risk === 0 ? 'An toàn' : opt.risk === 1 ? 'Có kiểm soát' : 'Rủi ro cao';
        return '<button class="survival-option ' + cls + '" data-survival-opt="' + i + '"' + (show ? ' disabled' : '') + '><span class="so-risk risk-' + opt.risk + '">' + riskLabel + '</span><span class="so-label">' + esc(opt.label) + '</span>' + (show ? '<span class="so-mark">' + (session.selected === i ? icon('check') : '') + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      (session.revealed ? '<div class="survival-feedback">' + icon('info') + '<span>' + esc(q.options[session.selected].feedback) + '</span></div><div class="survival-next"><button class="btn btn-gold btn-sm" data-survival-next>' + (session.qi === sc.questions.length - 1 ? 'Xem kết quả' : 'Tình huống tiếp theo') + ' ' + icon('arrow-right') + '</button></div>' : '') +
      '<div class="survival-hint">Chọn phương án bạn thực sự sẽ làm — không phải phương án nghe có vẻ đúng nhất.</div>';
    stage.querySelectorAll('[data-survival-opt]').forEach(btn => btn.addEventListener('click', () => {
      if (session.revealed) return;
      const i = Number(btn.getAttribute('data-survival-opt'));
      session.selected = i;
      session.score += q.options[i].risk;
      session.picks.push(i);
      session.revealed = true;
      paintSurvival(session);
    }));
    const next = stage.querySelector('[data-survival-next]');
    if (next) next.addEventListener('click', () => {
      if (session.qi < sc.questions.length - 1) {
        session.qi++;
        session.revealed = false;
        session.selected = null;
        paintSurvival(session);
      } else {
        finishSurvival(session);
      }
    });
  }

  function finishSurvival(session) {
    if (session.finished) return;
    const sc = session.sc;
    const prev = state.survival && state.survival.completed ? state.survival.completed[sc.id] : null;
    const first = !prev;
    session.finished = true;
    state.survival.attempts = (state.survival.attempts || 0) + 1;
    const discipline = 9 - session.score;
    if (!state.survival.completed) state.survival.completed = {};
    state.survival.completed[sc.id] = { best: Math.min(prev ? prev.best : 9, session.score), at: Date.now(), runs: (prev ? prev.runs : 0) + 1 };
    if (first) {
      const bonus = discipline >= 7 ? 120 : 0;
      const aura = sc.reward.aura + bonus;
      const xp = sc.reward.xp;
      addAura(aura);
      addXP(xp);
      state.survival.bestAura = ((state.survival.bestAura || 0) + aura);
      session.earned = { aura, xp };
      pushNotif('🧠', 'AURA Survival hoàn thành', sc.title + ' · ' + discipline + '/9 kỷ luật · +' + aura + ' Aura');
      toast('Sinh tồn thành công!', sc.title + ' · +' + aura + ' Aura, +' + xp + ' XP', 'gold', '🧠');
      confetti(45);
    }
    addXP(10);
    saveNow();
    paintSurvival(session);
  }

  function academyHTML() {
    const completed = (state.stats.lessons || []).length;
    const pct = D.LESSONS.length ? completed / D.LESSONS.length * 100 : 0;
    const survDone = SURVIVAL_SCENARIOS.filter(s => survivalDone(s.id)).length;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('academy') + ' HỌC VIỆN AURELIS</div><h1>Hiểu trước khi giao dịch</h1>' +
      '<p class="sub">Bài học ngắn, quiz thực tế và đấu trường tình huống. Không có lý thuyết suông — mọi thứ đều quay về một câu hỏi: bạn có giữ được vốn khi mọi thứ đi sai không?</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/analysis">' + icon('flask') + ' Phòng phân tích</button><button class="btn btn-gold btn-sm" data-nav="#/terminal">' + icon('chart') + ' Luyện chart</button></div></div>' +
      '<section class="academy-hero"><div><div class="badge badge-gold">LỘ TRÌNH CỐT LÕI · ' + D.LESSONS.length + ' BÀI</div><h2 style="margin-top:8px">Từ nến đầu tiên đến quản trị danh mục</h2>' +
      '<p>Hoàn thành bài học để nhận Aura, XP và mở khoá Thành tựu “Người Ham Học”. Làm quiz cho đúng để ghi nhận hoàn thành — học để hiểu, không phải để bấm qua.</p></div>' +
      '<div class="academy-progress"><div class="lbl"><span>Tiến độ học viện</span><b>' + completed + '/' + D.LESSONS.length + '</b></div><div class="bar"><span style="width:' + pct + '%"></span></div><div class="lbl"><span>' + (pct >= 100 ? 'Đã hoàn thành toàn bộ' : 'Còn ' + (D.LESSONS.length - completed) + ' bài') + '</span><span>AURA Academy</span></div></div></section>' +
      '<div class="lesson-grid">' + D.LESSONS.map(l => {
        const done = (state.stats.lessons || []).includes(l.id);
        return '<article class="lesson-card ' + (done ? 'done' : '') + '" data-action="open-lesson" data-id="' + l.id + '" tabindex="0" role="button"><div class="lesson-icon" style="--lesson-color:' + l.color + '">' + l.icon + '</div>' +
          '<div class="lesson-level"><span class="badge">' + esc(l.level) + '</span><span class="badge">' + l.minutes + ' phút</span>' + (done ? '<span class="lesson-done">' + icon('check') + ' Đã học</span>' : '') + '</div>' +
          '<div class="lesson-title">' + esc(l.title) + '</div><div class="lesson-summary">' + esc(l.summary) + '</div>' +
          '<div class="lesson-foot"><span>' + (done ? 'Hoàn thành · +80 Aura' : 'Bài học & quiz') + '</span><button class="btn btn-xs btn-outline-gold" data-action="open-lesson" data-id="' + l.id + '">' + (done ? 'Xem lại' : 'Học ngay') + '</button></div></article>';
      }).join('') + '</div>' +
      '<div class="section-head" style="margin-top:24px"><div><div class="page-eyebrow">' + icon('bolt') + ' Đấu trường tình huống</div><h2 style="font-size:18px;margin-top:4px">AURA Survival</h2><p class="sub" style="font-size:10px;color:var(--muted);margin-top:5px">Ba câu chuyện, ba quyết định mỗi câu. Không có giá đúng — chỉ có hậu quả. Hoàn thành lần đầu để nhận Aura và XP.</p></div><span class="badge badge-gold">' + survDone + '/' + SURVIVAL_SCENARIOS.length + ' đã chơi</span></div>' +
      survivalCardsHTML() +
      '<div class="two-col" style="margin-top:16px"><section class="card"><div class="card-head"><div><div class="card-title">' + icon('book') + ' Từ điển AURELIS</div><div class="card-sub">Thuật ngữ bạn sẽ gặp trên chart</div></div><span class="badge">' + D.GLOSSARY.length + ' từ</span></div><div class="glossary-grid">' + D.GLOSSARY.map(g => '<div class="glossary-item"><div class="glossary-term">' + esc(g.term) + '</div><div class="glossary-text">' + esc(g.text) + '</div></div>').join('') + '</div></section>' +
      '<section class="card certificate-card"><div class="card-head"><div><div class="card-title">' + icon('shield') + ' Chứng chỉ nhà đầu tư tỉnh thức</div><div class="card-sub">Không phải bằng cấp — là dấu mốc bạn tự xây</div></div></div>' +
      '<div class="certificate-seal ' + (pct >= 100 ? 'earned' : '') + '"><span>✦</span></div><h3 style="font-size:16px;margin-top:8px">' + (pct >= 100 ? 'Bạn đã hoàn thành lộ trình' : 'Còn ' + (D.LESSONS.length - completed) + ' bài học nữa') + '</h3>' +
      '<p class="modal-note" style="margin-top:6px">Hoàn thành đủ ' + D.LESSONS.length + ' bài và 3 chứng chỉ AURA Survival để nhận danh hiệu tinh thần “Nhà đầu tư tỉnh thức”. Hãy dùng kiến thức này để bảo vệ vốn trước khi tìm lợi nhuận.</p>' +
      '<div class="kv-row"><span class="k">Bài học</span><span class="v">' + completed + '/' + D.LESSONS.length + '</span></div><div class="kv-row"><span class="k">AURA Survival</span><span class="v">' + survDone + '/' + SURVIVAL_SCENARIOS.length + '</span></div><div class="kv-row"><span class="k">Aura đã nhận từ học viện</span><span class="v gold">+' + ((state.stats.lessons || []).length * 80 + Object.keys(state.survival.completed || {}).length * 260) + ' ✦</span></div>' +
      '<button class="btn btn-sm btn-outline-gold btn-block" data-nav="#/analysis" style="margin-top:10px">Đi thực hành trong Phòng phân tích</button></section></div>';
  }

  /* ============================================================
     AURA DETECTIVE · DAILY MYSTERY CHART
     ============================================================ */
  const DETECTIVE_POOL = ['vcb', 'fpt', 'hpg', 'vic', 'mwg', 'ssi', 'vnm', 'aapl', 'msft', 'nvda', 'amzn', 'meta', 'btc', 'eth', 'sol', 'bnb', 'xauusd', 'eurusd'];
  const DETECTIVE_CASE_COUNT = 3;
  const DETECTIVE_VISIBLE = 58;
  const DETECTIVE_REWARD = 150;
  const DETECTIVE_CLUE_COST = 35;
  const DETECTIVE_PRACTICE_CAP = 5;
  const DETECTIVE_PRACTICE_REWARD = 12;

  let detectiveDaily = null;
  let detectiveDailyPromise = null;
  let detectiveMode = 'daily';
  let detectiveCaseIndex = 0;
  let detectivePracticeCase = null;
  let detectiveResizeTimer = null;

  function detectiveHash(text) {
    let h = 2166136261;
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function detectiveRng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }

  function detectiveAverage(list) {
    return list.length ? list.reduce((sum, v) => sum + v, 0) / list.length : 0;
  }

  function detectiveSyntheticCandles(seed, count) {
    const rng = detectiveRng(seed);
    let price = 120 + rng() * 180;
    let drift = (rng() - 0.5) * 0.0025;
    const out = [];
    for (let i = 0; i < count; i++) {
      if (i > 0 && i % 32 === 0) drift = (rng() - 0.5) * 0.006;
      const vol = 0.006 + rng() * 0.015;
      const shock = (rng() + rng() + rng() - 1.5) * vol;
      const open = price;
      price = Math.max(3, price * (1 + drift + shock));
      const close = price;
      const high = Math.max(open, close) * (1 + rng() * vol * 0.8);
      const low = Math.min(open, close) * (1 - rng() * vol * 0.8);
      out.push({ t: i, o: open, h: high, l: low, c: close, v: 500 + rng() * 9500 });
    }
    return out;
  }

  function detectiveSpecsForToday() {
    const day = todayKey();
    const rng = detectiveRng(detectiveHash('AURELIS-DETECTIVE|' + day));
    const pool = DETECTIVE_POOL.slice();
    const picked = [];
    while (picked.length < DETECTIVE_CASE_COUNT && pool.length) {
      picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return picked.map((assetId, i) => ({
      assetId,
      caseNo: i,
      span: 12 + Math.floor(rng() * 7),
      cutFromEnd: 18 + Math.floor(rng() * 110),
      seed: detectiveHash(day + '|' + assetId + '|' + i)
    }));
  }

  function detectiveFinalizeCase(cs, candles, cut, span) {
    const start = Math.max(0, cut - DETECTIVE_VISIBLE);
    cs.visible = candles.slice(start, cut);
    cs.future = candles.slice(cut, cut + span);
    if (cs.visible.length < 40 || cs.future.length < 5) return false;
    const closes = cs.visible.map(c => c.c);
    cs.ma20 = detectiveAverage(closes.slice(-20));
    cs.mom10 = closes.length > 11 ? (closes[closes.length - 1] / closes[closes.length - 11] - 1) * 100 : 0;
    const returns = [];
    for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    const mean = detectiveAverage(returns);
    cs.volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / Math.max(1, returns.length)) * 100;
    cs.greenLast10 = cs.visible.slice(-10).filter(c => c.c >= c.o).length;
    cs.lastClose = closes[closes.length - 1];
    cs.finalClose = cs.future[cs.future.length - 1].c;
    cs.movePct = cs.lastClose ? (cs.finalClose - cs.lastClose) / cs.lastClose * 100 : 0;
    cs.direction = cs.movePct >= 0 ? 'up' : 'down';
    cs.answered = false;
    cs.clues = [];
    return true;
  }

  function loadDetectiveDaily() {
    const day = todayKey();
    if (detectiveDaily && detectiveDaily.day === day && !detectiveDaily.loading) return Promise.resolve(detectiveDaily);
    if (detectiveDailyPromise && detectiveDaily && detectiveDaily.day === day) return detectiveDailyPromise;
    const specs = detectiveSpecsForToday();
    const entry = { day, loading: true, cases: specs.map(s => Object.assign({ loading: true }, s)) };
    detectiveDaily = entry;
    detectiveDailyPromise = Promise.all(entry.cases.map(async cs => {
      const asset = byId[cs.assetId] || null;
      cs.asset = asset;
      let candles = null;
      try {
        if (asset && API.hasLive(asset)) candles = await API.chart(asset, '1D');
      } catch (e) { /* hồ sơ sẽ dùng mô phỏng */ }
      let synthetic = false;
      if (!Array.isArray(candles) || candles.length < 190) {
        candles = detectiveSyntheticCandles(cs.seed, 300);
        synthetic = true;
      }
      const maxFromEnd = Math.max(30, candles.length - 140);
      const cutFromEnd = Math.min(cs.cutFromEnd, maxFromEnd);
      const cut = candles.length - cutFromEnd - cs.span;
      if (!detectiveFinalizeCase(cs, candles, cut, cs.span)) {
        const fallback = detectiveSyntheticCandles(cs.seed + 7, 300);
        detectiveFinalizeCase(cs, fallback, fallback.length - 70 - cs.span, cs.span);
        synthetic = true;
      }
      cs.synthetic = synthetic;
      cs.loading = false;
      return cs;
    })).then(() => {
      entry.loading = false;
      entry.loadedAt = Date.now();
      detectiveDailyPromise = null;
      return entry;
    }).catch(() => {
      entry.loading = false;
      detectiveDailyPromise = null;
      return entry;
    });
    return detectiveDailyPromise;
  }

  function detectiveEnsureLoaded() {
    const day = todayKey();
    if (detectiveDaily && detectiveDaily.day === day) return;
    loadDetectiveDaily().then(() => {
      if (currentRoute === 'detective') renderRoute();
    });
  }

  function detectiveRankInfo(solved) {
    const ranks = [
      { min: 0, name: 'Tập sự hồ sơ', icon: '🔎' },
      { min: 3, name: 'Thám tử tập sự', icon: '🕵️' },
      { min: 8, name: 'Thám tử biểu đồ', icon: '🧭' },
      { min: 15, name: 'Chuyên gia đọc nến', icon: '📈' },
      { min: 30, name: 'Huyền thoại AURA', icon: '🏆' }
    ];
    let current = ranks[0], next = null;
    ranks.forEach((r, i) => {
      if (solved >= r.min) { current = r; next = ranks[i + 1] || null; }
    });
    const pct = next ? Math.min(100, Math.max(0, (solved - current.min) / (next.min - current.min) * 100)) : 100;
    return { current, next, pct };
  }

  function detectiveCurrentCase() {
    if (!detectiveDaily || !detectiveDaily.cases) return null;
    return detectiveDaily.cases[detectiveCaseIndex] || detectiveDaily.cases[0] || null;
  }

  function detectiveCluesFor(index) {
    const round = state.detective.rounds[index];
    if (round && Array.isArray(round.clues)) return round.clues;
    return (state.detective.draftClues && state.detective.draftClues[index]) || [];
  }

  function detectiveUseClue(n) {
    if (detectiveMode === 'practice') {
      if (!detectivePracticeCase || detectivePracticeCase.answered) return;
      if (!detectivePracticeCase.clues.includes(n)) detectivePracticeCase.clues.push(n);
    } else {
      if (state.detective.rounds[detectiveCaseIndex]) return;
      const d = ensureDetective();
      const list = (d.draftClues[detectiveCaseIndex] || []).slice();
      if (!list.includes(n)) list.push(n);
      d.draftClues[detectiveCaseIndex] = list;
      saveNow();
    }
    paintDetectiveStage();
  }

  function detectiveTrendClue(cs) {
    if (!cs) return '';
    return (cs.lastClose >= cs.ma20 ? 'Giá giữ trên MA20' : 'Giá nằm dưới MA20') +
      ' · 10 phiên gần nhất ' + fmtPct(cs.mom10) + ' · biến động ' + nf(cs.volatility, 1) + '%/phiên.';
  }

  function detectiveAnswer(side) {
    ensureDetective();
    if (detectiveMode === 'practice') return detectivePracticeAnswer(side);
    const cs = detectiveCurrentCase();
    if (!cs || cs.loading || state.detective.rounds[detectiveCaseIndex]) return;
    const d = state.detective;
    const clues = detectiveCluesFor(detectiveCaseIndex).slice();
    const correct = cs.direction === side;
    const round = { guess: side, correct, clues, at: Date.now(), movePct: cs.movePct, assetId: cs.assetId };
    state.detective.rounds[detectiveCaseIndex] = round;
    if (d.draftClues) delete d.draftClues[detectiveCaseIndex];
    d.attempts++;
    d.lastPlayed = todayKey();
    if (correct) {
      d.solved++;
      d.streak = (d.streak || 0) + 1;
      d.bestStreak = Math.max(d.bestStreak || 0, d.streak);
      const aura = Math.max(40, DETECTIVE_REWARD - clues.length * DETECTIVE_CLUE_COST + Math.min(100, (d.streak - 1) * 20));
      const xp = 55 + Math.min(45, d.streak * 5);
      round.aura = aura;
      round.xp = xp;
      addAura(aura);
      addXP(xp);
      progressQuest('detective', 1);
      toast('Chính xác!', 'Giá đã ' + (cs.direction === 'up' ? 'tăng ' : 'giảm ') + nf(Math.abs(cs.movePct), 2) + '% · +' + aura + ' Aura, +' + xp + ' XP', 'success', '🕵️');
      confetti(32);
    } else {
      d.streak = 0;
      round.xp = 25;
      addXP(25);
      toast('Chưa đúng', 'Giá đã ' + (cs.direction === 'up' ? 'tăng ' : 'giảm ') + nf(Math.abs(cs.movePct), 2) + '%. Học phí +25 XP — đọc lại cấu trúc và thử vụ tiếp theo.', 'info', '🔍');
    }
    const answeredCount = Object.keys(d.rounds).length;
    if (answeredCount >= DETECTIVE_CASE_COUNT && !d.bonusClaimed) {
      d.bonusClaimed = true;
      const correctCount = Object.values(d.rounds).filter(r => r.correct).length;
      const bonus = 120 + correctCount * 90 + (correctCount === DETECTIVE_CASE_COUNT ? 150 : 0);
      d.lastBonus = bonus;
      addAura(bonus);
      addXP(90 + correctCount * 20);
      round.bonus = bonus;
      pushNotif('🗂️', 'Hồ sơ AURA Detective hoàn thành', correctCount + '/3 vụ án chính xác · +' + bonus + ' Aura thưởng hồ sơ');
      toast('Hồ sơ hôm nay đã khép lại!', correctCount + '/3 chính xác · +' + bonus + ' Aura thưởng', 'gold', '🗂️');
      confetti(70);
    }
    saveNow();
    updateShell();
    paintDetectiveStage();
    paintDetectiveSide();
  }

  function detectiveStartPractice() {
    ensureDetective();
    detectiveMode = 'practice';
    const seed = detectiveHash('practice|' + Date.now() + '|' + Math.random());
    const rng = detectiveRng(seed);
    const candles = detectiveSyntheticCandles(seed, 300);
    const span = 12 + Math.floor(rng() * 7);
    const cut = 140 + Math.floor(rng() * Math.max(20, candles.length - 140 - span - 45));
    const cs = { asset: null, synthetic: true, seed, span };
    detectiveFinalizeCase(cs, candles, cut, span);
    cs.synthetic = true;
    detectivePracticeCase = cs;
    paintDetectiveStage();
    paintDetectiveSide();
  }

  function detectivePracticeAnswer(side) {
    ensureDetective();
    const cs = detectivePracticeCase;
    if (!cs || cs.answered) return;
    const d = state.detective;
    cs.answered = true;
    cs.guess = side;
    cs.correct = cs.direction === side;
    d.practiceAttempts = (d.practiceAttempts || 0) + 1;
    let reward = 0;
    if (cs.correct) {
      d.practiceStreak = (d.practiceStreak || 0) + 1;
      d.practiceBest = Math.max(d.practiceBest || 0, d.practiceStreak);
      if (d.practiceWins < DETECTIVE_PRACTICE_CAP) {
        d.practiceWins++;
        d.practiceAura = (d.practiceAura || 0) + DETECTIVE_PRACTICE_REWARD;
        reward = DETECTIVE_PRACTICE_REWARD;
        addAura(reward);
      }
      addXP(15);
      toast('Đúng hướng!', 'Chuỗi luyện tập ' + d.practiceStreak + (reward ? ' · +' + reward + ' Aura' : ' · đã hết thưởng Aura hôm nay'), 'success', '🎯');
    } else {
      d.practiceStreak = 0;
      addXP(8);
      toast('Sai hướng', 'Giá đã ' + (cs.direction === 'up' ? 'tăng ' : 'giảm ') + nf(Math.abs(cs.movePct), 2) + '%. Thử một biểu đồ khác.', 'info', '🧩');
    }
    saveNow();
    updateShell();
    paintDetectiveStage();
    paintDetectiveSide();
  }

  function detectiveNextCase() {
    if (detectiveMode === 'practice') { detectiveStartPractice(); return; }
    ensureDetective();
    const next = [0, 1, 2].find(i => !state.detective.rounds[i]);
    if (next != null) {
      detectiveCaseIndex = next;
      paintDetectiveStage();
    } else {
      detectiveStartPractice();
    }
  }

  function detectiveExitPractice() {
    detectiveMode = 'daily';
    detectiveCaseIndex = Math.max(0, Math.min(DETECTIVE_CASE_COUNT - 1, detectiveCaseIndex));
    detectiveEnsureLoaded();
    paintDetectiveStage();
    paintDetectiveSide();
  }

  function detectiveStatsHTML() {
    const d = ensureDetective();
    const answered = Object.keys(d.rounds || {}).length;
    const accuracy = d.attempts ? Math.round(d.solved / d.attempts * 100) : 0;
    return '<div class="detective-stat"><span>Chuỗi đúng</span><b class="gold">' + d.streak + '</b><small>kỷ lục ' + d.bestStreak + '</small></div>' +
      '<div class="detective-stat"><span>Hôm nay</span><b>' + answered + '/3</b><small>' + (d.bonusClaimed ? 'hồ sơ đã khép' : 'vụ án đang mở') + '</small></div>' +
      '<div class="detective-stat"><span>Đã giải</span><b>' + d.solved + '</b><small>' + d.attempts + ' phán đoán</small></div>' +
      '<div class="detective-stat"><span>Chính xác</span><b>' + accuracy + '%</b><small>tổng thể</small></div>';
  }

  function detectiveSideHTML() {
    const d = ensureDetective();
    const rank = detectiveRankInfo(d.solved);
    return '<section class="card detective-profile"><div class="card-head"><div><div class="card-title">' + icon('search') + ' Hồ sơ thám tử</div><div class="card-sub">Cấp bậc theo số vụ án đã giải</div></div><span class="badge badge-gold">' + d.solved + ' vụ</span></div>' +
      '<div class="detective-rank"><span class="detective-rank-icon">' + rank.current.icon + '</span><div class="detective-rank-body"><small>CẤP THÁM TỬ</small><b>' + rank.current.name + '</b><span>' + (rank.next ? 'Còn ' + (rank.next.min - d.solved) + ' vụ để lên ' + rank.next.name : 'Cấp cao nhất — huyền thoại hồ sơ') + '</span></div></div>' +
      '<div class="bar detective-rank-bar"><span style="width:' + rank.pct + '%"></span></div>' +
      '<div class="detective-profile-stats"><div><b>' + d.bestStreak + '</b><span>chuỗi tốt nhất</span></div><div><b>' + d.attempts + '</b><span>phán đoán</span></div><div><b>' + (d.attempts ? Math.round(d.solved / d.attempts * 100) : 0) + '%</b><span>chính xác</span></div></div></section>' +
      '<section class="card detective-rules"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Luật thưởng</div><div class="card-sub">Manh mối đổi lấy phần thưởng</div></div></div>' +
      '<div class="detective-rule"><span>Vụ án chính xác</span><b class="gold">+150 Aura</b></div>' +
      '<div class="detective-rule"><span>Mỗi manh mối</span><b class="down">−35 Aura</b></div>' +
      '<div class="detective-rule"><span>Chuỗi đúng</span><b class="gold">+20 / nhịp · tối đa +100</b></div>' +
      '<div class="detective-rule"><span>Hoàn thành 3/3</span><b class="gold">+120 → +540 Aura</b></div>' +
      '<div class="detective-rule"><span>Luyện tập đúng</span><b>+12 Aura · 5 vụ/ngày</b></div></section>' +
      '<section class="card detective-practice-card"><div class="detective-practice-head"><span>🎯</span><div><b>Phòng luyện tập</b><span>Biểu đồ mô phỏng, không giới hạn</span></div></div>' +
      '<div class="detective-practice-stats"><div><b>' + d.practiceBest + '</b><span>chuỗi tốt nhất</span></div><div><b>' + d.practiceWins + '/' + DETECTIVE_PRACTICE_CAP + '</b><span>thưởng hôm nay</span></div></div>' +
      '<button class="btn btn-sm btn-outline-gold btn-block" data-action="detective-practice">' + icon('bolt') + ' Vào luyện tập</button></section>';
  }

  function detectiveCaseTabsHTML() {
    return '<div class="detective-case-tabs">' + [0, 1, 2].map(i => {
      const round = state.detective.rounds[i];
      const cls = round ? (round.correct ? 'solved' : 'missed') : 'open';
      return '<button class="detective-case-tab ' + cls + (i === detectiveCaseIndex ? ' active' : '') + '" data-detective-case="' + i + '"><span>0' + (i + 1) + '</span><b>' + (round ? (round.correct ? 'Đúng' : 'Sai') : 'Mở') + '</b></button>';
    }).join('') + '</div>';
  }

  function detectiveCompleteHTML() {
    const d = ensureDetective();
    const answered = Object.keys(d.rounds).length;
    if (answered < DETECTIVE_CASE_COUNT) return '';
    const correct = Object.values(d.rounds).filter(r => r.correct).length;
    return '<div class="detective-complete"><span class="detective-complete-icon">🗂️</span><div><b>Hồ sơ hôm nay đã khép lại · ' + correct + '/3 chính xác</b><small>Thưởng hồ sơ +' + (d.lastBonus || 0) + ' Aura · 3 vụ án mới sẽ mở vào ngày mai</small></div><button class="btn btn-xs btn-outline-gold" data-action="detective-practice">Luyện thêm</button></div>';
  }

  function detectiveClueHTML(cs, used, n, practice) {
    const active = used.includes(n);
    let title, text;
    if (practice) {
      title = n === 1 ? 'Manh mối 01 · Cấu trúc' : 'Manh mối 02 · Động lượng';
      text = n === 1
        ? cs.greenLast10 + '/10 nến gần nhất là nến tăng · biên độ ' + nf(cs.volatility, 1) + '%/phiên.'
        : detectiveTrendClue(cs);
    } else if (n === 1) {
      const g = cs.asset ? groupOf(cs.asset) : null;
      title = 'Manh mối 01 · Bối cảnh';
      text = g ? g.flag + ' ' + g.long + ' · ' + cs.asset.exchange : 'Nhóm tài sản đang được ẩn.';
    } else {
      title = 'Manh mối 02 · Động lượng';
      text = detectiveTrendClue(cs);
    }
    return '<button class="detective-clue ' + (active ? 'used' : '') + '" data-detective-clue="' + n + '"' + (active ? ' aria-pressed="true"' : '') + '>' + icon(active ? 'eye' : 'eye-off') +
      '<div><b>' + esc(title) + '</b><span>' + (active ? esc(text) : 'Mở manh mối' + (practice ? ' miễn phí' : ' · −35 Aura thưởng')) + '</span></div></button>';
  }

  function detectiveExplain(cs, correct) {
    const trend = cs.lastClose >= cs.ma20 ? 'Giá đóng cửa trên MA20' : 'Giá đóng cửa dưới MA20';
    const result = 'Sau điểm chốt, giá ' + (cs.movePct >= 0 ? 'tăng ' : 'giảm ') + nf(Math.abs(cs.movePct), 2) + '% trong ' + cs.future.length + ' phiên.';
    const lesson = correct
      ? 'Bạn đã đọc đúng cấu trúc và để xác suất nghiêng về phía mình. Hãy lặp lại quy trình, đừng chỉ nhớ kết quả.'
      : 'Một phán đoán sai không phá hủy tài khoản nếu vị thế đủ nhỏ. Đây là lý do nên luyện bằng vốn ảo trước.';
    return trend + ', động lượng 10 phiên ' + fmtPct(cs.mom10) + ', biến động ' + nf(cs.volatility, 1) + '%/phiên. ' + result + ' ' + lesson;
  }

  function detectiveResultHTML(cs, round) {
    const picked = round.guess === 'up' ? 'TĂNG' : 'GIẢM';
    const actual = cs.direction === 'up' ? 'TĂNG' : 'GIẢM';
    const outcome = actual + ' ' + (cs.movePct >= 0 ? '+' : '') + nf(cs.movePct, 2) + '%';
    const asset = cs.asset;
    const clues = Array.isArray(round.clues) ? round.clues : [];
    const xp = Number.isFinite(round.xp) ? round.xp : 0;
    return '<div class="detective-result ' + (round.correct ? 'correct' : 'wrong') + '">' +
      '<div class="detective-result-icon">' + (round.correct ? icon('check') : icon('close')) + '</div>' +
      '<div class="detective-result-body"><b>' + (round.correct ? 'Chính xác — bạn đã đọc đúng hướng.' : 'Chưa đúng — thị trường chọn hướng khác.') + '</b>' +
      '<span>Thực tế: ' + outcome + ' · Bạn chọn ' + picked + '.</span>' +
      '<div class="detective-reward-chips">' + (round.aura ? '<span class="detective-chip gold">+' + round.aura + ' Aura</span><span class="detective-chip">+' + xp + ' XP</span>' : '<span class="detective-chip">+' + xp + ' XP học phí</span>') + '<span class="detective-chip">' + (clues.length ? clues.length + ' manh mối' : 'Không manh mối') + '</span></div></div></div>' +
      (asset ? '<div class="detective-identity">' + assetLogo(asset, 'lg') + '<div><b>' + esc(asset.symbol) + '</b><span>' + esc(asset.name) + ' · ' + esc(asset.exchange) + '</span></div><span class="badge ' + (cs.synthetic ? '' : 'badge-up') + '">' + detectiveSourceShort(cs) + '</span></div>' : '') +
      '<div class="detective-explain">' + icon('info') + '<p>' + esc(detectiveExplain(cs, round.correct)) + '</p></div>';
  }

  function detectivePracticeStageHTML() {
    const cs = detectivePracticeCase;
    if (!cs) {
      return '<div class="detective-loading"><span class="spinner"></span><b>Đang tạo biểu đồ luyện tập…</b><span>Mô phỏng cục bộ · không cần kết nối</span></div>';
    }
    const answered = !!cs.answered;
    const clues = cs.clues || [];
    return '<div class="detective-stage-head"><div><div class="detective-kicker">' + icon('bolt') + ' PHÒNG LUYỆN TẬP · KHÔNG GIỚI HẠN</div><h2>Biểu đồ mô phỏng</h2><div class="detective-tags"><span class="badge">MÔ PHỎNG</span><span class="badge">' + cs.visible.length + ' phiên đã biết</span><span class="badge">' + cs.future.length + ' phiên ẩn</span></div></div>' +
      '<button class="btn btn-xs btn-ghost" data-action="detective-daily">' + icon('close') + ' Thoát</button></div>' +
      '<div class="detective-chart-shell ' + (answered ? 'revealed' : '') + '"><div class="detective-chart-top"><span class="detective-chart-case">PRACTICE</span><span class="detective-chart-source">MÔ PHỎNG · 1D</span></div><canvas id="detectiveChart" role="img" aria-label="Biểu đồ nến mô phỏng với phần tương lai bị che"></canvas><div class="detective-chart-bottom"><span>' + cs.visible.length + ' phiên đã biết</span><span>' + (answered ? 'Đã mở ' + cs.future.length + ' phiên' : cs.future.length + ' phiên bị che') + '</span></div></div>' +
      (answered
        ? '<div class="detective-result ' + (cs.correct ? 'correct' : 'wrong') + '"><div class="detective-result-icon">' + (cs.correct ? icon('check') : icon('close')) + '</div><div class="detective-result-body"><b>' + (cs.correct ? 'Đúng hướng!' : 'Sai hướng — nhưng đã có thêm một mẫu hình trong đầu.') + '</b><span>Giá ' + (cs.direction === 'up' ? 'tăng ' : 'giảm ') + nf(Math.abs(cs.movePct), 2) + '% · Bạn chọn ' + (cs.guess === 'up' ? 'TĂNG' : 'GIẢM') + '.</span><div class="detective-reward-chips"><span class="detective-chip gold">Chuỗi luyện tập ' + state.detective.practiceStreak + '</span><span class="detective-chip">' + state.detective.practiceWins + '/5 thưởng hôm nay</span></div></div></div>' +
          '<div class="detective-explain">' + icon('info') + '<p>' + esc(detectiveExplain(cs, cs.correct)) + '</p></div>' +
          '<div class="detective-result-actions"><button class="btn btn-gold btn-sm" data-detective-next>' + icon('bolt') + ' Vụ án khác</button><button class="btn btn-ghost btn-sm" data-action="detective-daily">Về hồ sơ hôm nay</button></div>'
        : '<div class="detective-question"><span class="detective-q-icon">?</span><div><h3>' + cs.future.length + ' phiên tiếp theo, giá sẽ…</h3><p>Chọn hướng trước khi mở phần nến bị che. Đây là biểu đồ mô phỏng để luyện phản xạ.</p></div></div>' +
          '<div class="detective-choice-row"><button class="detective-choice up" data-detective-pick="up"><span class="detective-choice-arrow">↗</span><div><b>TĂNG</b><span>Giá đóng cửa cao hơn điểm chốt</span></div></button><button class="detective-choice down" data-detective-pick="down"><span class="detective-choice-arrow">↘</span><div><b>GIẢM</b><span>Giá đóng cửa thấp hơn điểm chốt</span></div></button></div>' +
          '<div class="detective-clues">' + detectiveClueHTML(cs, clues, 1, true) + detectiveClueHTML(cs, clues, 2, true) + '</div>') +
      '<div class="detective-stage-note">' + icon('shield') + ' Biểu đồ luyện tập được tạo cục bộ, không phải dữ liệu thị trường thật.</div>';
  }

  function detectiveSourceLabel(cs) {
    if (!cs) return 'MÔ PHỎNG';
    if (cs.synthetic) return 'MÔ PHỎNG';
    return cs.asset && cs.asset.binance ? 'NẾN THẬT · BINANCE' : 'NẾN THẬT · YAHOO';
  }

  function detectiveSourceShort(cs) {
    if (!cs || cs.synthetic) return 'Mô phỏng';
    return cs.asset && cs.asset.binance ? 'Nến thật · Binance' : 'Nến thật · Yahoo';
  }

  function detectiveStageHTML() {
    if (!detectiveDaily || detectiveDaily.loading) {
      return '<div class="detective-loading"><span class="spinner"></span><b>Đang dựng hồ sơ biểu đồ…</b><span>Yahoo Finance · Binance · nến 1 ngày</span><button class="btn btn-xs btn-ghost" data-detective-reload>Thử lại</button></div>';
    }
    const cs = detectiveCurrentCase();
    if (!cs || cs.loading) {
      return '<div class="detective-loading"><span class="spinner"></span><b>Đang mở hồ sơ…</b><span>Dữ liệu nến đang được chuẩn bị</span></div>';
    }
    const round = state.detective.rounds[detectiveCaseIndex];
    const answered = !!round;
    const clues = answered ? round.clues : detectiveCluesFor(detectiveCaseIndex);
    const source = detectiveSourceLabel(cs);
    const title = answered && cs.asset ? esc(cs.asset.symbol) + ' · ' + esc(cs.asset.name) : 'Bí ẩn ' + cs.future.length + ' phiên';
    const tags = '<div class="detective-tags"><span class="badge ' + (cs.synthetic ? '' : 'badge-up') + '">' + source + '</span><span class="badge">' + cs.visible.length + ' phiên đã biết</span><span class="badge">' + cs.future.length + ' phiên ẩn</span>' + (answered && cs.asset ? '<span class="badge badge-gold">' + esc(groupOf(cs.asset).name) + '</span>' : '') + '</div>';
    return detectiveCompleteHTML() +
      '<div class="detective-stage-head"><div><div class="detective-kicker">' + icon('search') + ' HỒ SƠ 0' + (detectiveCaseIndex + 1) + ' / 03 · ' + (answered ? 'ĐÃ MỞ' : 'ĐANG ĐIỀU TRA') + '</div><h2>' + title + '</h2>' + tags + '</div>' + detectiveCaseTabsHTML() + '</div>' +
      '<div class="detective-chart-shell ' + (answered ? 'revealed' : '') + '"><div class="detective-chart-top"><span class="detective-chart-case">CASE 0' + (detectiveCaseIndex + 1) + '</span><span class="detective-chart-source">' + source + ' · KHUNG 1D</span></div><canvas id="detectiveChart" role="img" aria-label="Biểu đồ nến với phần tương lai bị che"></canvas><div class="detective-chart-bottom"><span>' + cs.visible.length + ' phiên đã biết</span><span>' + (answered ? 'Đã mở ' + cs.future.length + ' phiên' : cs.future.length + ' phiên bị che') + '</span></div></div>' +
      (answered
        ? detectiveResultHTML(cs, round) + '<div class="detective-result-actions"><button class="btn btn-gold btn-sm" data-detective-next>' + (Object.keys(state.detective.rounds).length >= DETECTIVE_CASE_COUNT ? icon('bolt') + ' Luyện tập vụ khác' : 'Vụ án tiếp theo ' + icon('arrow-right')) + '</button></div>'
        : '<div class="detective-question"><span class="detective-q-icon">?</span><div><h3>' + cs.future.length + ' phiên tiếp theo, giá sẽ…</h3><p>Đọc cấu trúc, động lượng và bối cảnh. Bạn có thể mở tối đa hai manh mối — nhưng phần thưởng sẽ giảm.</p></div></div>' +
          '<div class="detective-choice-row"><button class="detective-choice up" data-detective-pick="up"><span class="detective-choice-arrow">↗</span><div><b>TĂNG</b><span>Giá đóng cửa cao hơn điểm chốt</span></div></button><button class="detective-choice down" data-detective-pick="down"><span class="detective-choice-arrow">↘</span><div><b>GIẢM</b><span>Giá đóng cửa thấp hơn điểm chốt</span></div></button></div>' +
          '<div class="detective-clues">' + detectiveClueHTML(cs, clues, 1, false) + detectiveClueHTML(cs, clues, 2, false) + '</div>') +
      '<div class="detective-stage-note">' + icon('shield') + ' ' + (cs.synthetic ? 'Hồ sơ này dùng biểu đồ mô phỏng vì chưa lấy được nến thật.' : (answered ? 'Nến thật từ ' + esc(cs.asset ? cs.asset.exchange : 'thị trường') + ' · chỉ dùng để luyện tập, không phải khuyến nghị đầu tư.' : 'Hồ sơ dùng lịch sử nến thật · thông tin tài sản được giữ kín cho đến khi bạn phán đoán.')) + '</div>';
  }

  function detectivePageHTML() {
    ensureDetective();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('search') + ' Câu đố biểu đồ mỗi ngày</div><h1>Đọc chart như một thám tử</h1>' +
      '<p class="sub">Mỗi ngày ba vụ án biểu đồ. Nhìn phần nến đã biết, phán đoán hướng đi của những phiên bị che, rồi để thị trường trả lời. Manh mối giúp bạn chắc hơn — nhưng cũng làm phần thưởng nhỏ đi.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-action="detective-practice">' + icon('bolt') + ' Luyện tập</button><button class="btn btn-gold btn-sm" data-nav="#/academy">' + icon('academy') + ' Học cách đọc nến</button></div></div>' +
      '<section class="detective-banner"><div class="detective-banner-main"><span class="detective-file-icon">🗂️</span><div><div class="detective-kicker">' + icon('search') + ' HỒ SƠ MỞ · ' + dateLabel(Date.now()) + '</div><h2>Ba vụ án mỗi ngày. Không có đáp án nào được cho không.</h2><p>Khi có kết nối, hệ thống lấy lịch sử nến thật, che đi phần tương lai và giao lại cho bạn. Chuỗi đúng càng dài, Aura càng cao; sai cũng có XP học phí.</p></div></div><div class="detective-stats" id="detectiveStats">' + detectiveStatsHTML() + '</div></section>' +
      '<div class="detective-layout"><section class="card detective-stage-card"><div id="detectiveStage">' + detectiveStageHTML() + '</div></section><aside class="detective-aside" id="detectiveSide">' + detectiveSideHTML() + '</aside></div>' +
      '<section class="card detective-howto"><div class="card-head"><div><div class="card-title">' + icon('target') + ' Quy trình 3 bước</div><div class="card-sub">Không đoán mò — đọc bằng quy trình</div></div><span class="badge">AURA Method</span></div><div class="detective-steps">' +
      '<div class="detective-step"><b>01</b><div><strong>Xác định cấu trúc</strong><span>Giá đang trên hay dưới MA20? Đỉnh/đáy gần nhất đang cao lên hay thấp đi?</span></div></div>' +
      '<div class="detective-step"><b>02</b><div><strong>Đo động lượng</strong><span>10 phiên gần nhất tăng hay giảm? Nến thân dài hay rút chân? Biến động có đang co lại?</span></div></div>' +
      '<div class="detective-step"><b>03</b><div><strong>Chọn và ghi lại</strong><span>Đưa ra phán đoán trước khi mở nến. Sai ở đây chỉ mất học phí, không mất vốn thật.</span></div></div></div></section>';
  }

  function detectiveRoundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function detectiveDrawChart() {
    const canvas = $('#detectiveChart');
    if (!canvas) return;
    ensureDetective();
    const cs = detectiveMode === 'practice' ? detectivePracticeCase : detectiveCurrentCase();
    if (!cs || cs.loading || !cs.visible || !cs.visible.length) return;
    const answered = detectiveMode === 'practice' ? !!cs.answered : !!state.detective.rounds[detectiveCaseIndex];
    const shell = canvas.parentElement;
    const width = Math.max(280, shell.clientWidth);
    const height = Math.max(210, shell.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.body);
    const up = (css.getPropertyValue('--up') || '#2ee6a6').trim();
    const down = (css.getPropertyValue('--down') || '#ff5d73').trim();
    const gold = (css.getPropertyValue('--gold') || '#f3c56b').trim();
    const padL = 16, padR = 16, padT = 26, padB = 22;
    const all = cs.visible.concat(cs.future);
    let hi = -Infinity, lo = Infinity;
    all.forEach(c => { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); });
    if (!Number.isFinite(hi) || !Number.isFinite(lo) || hi === lo) { hi = lo + 1; }
    const pad = (hi - lo) * 0.09;
    hi += pad; lo -= pad;
    const slots = cs.visible.length + cs.future.length + 3;
    const slot = (width - padL - padR) / slots;
    const xFor = i => padL + (i + 0.5) * slot;
    const yFor = v => padT + (hi - v) / (hi - lo) * (height - padT - padB);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, 'rgba(14,26,34,.35)');
    bg.addColorStop(1, 'rgba(4,9,13,.55)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = padT + (height - padT - padB) * i / 5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(width - padR, y); ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padL + (width - padL - padR) * i / 6;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, height - padB); ctx.stroke();
    }
    const cutoffX = xFor(cs.visible.length - 1) + slot / 2;
    if (!answered) {
      ctx.fillStyle = 'rgba(243,197,107,.035)';
      ctx.fillRect(cutoffX, padT, width - padR - cutoffX, height - padT - padB);
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(243,197,107,.42)';
      ctx.beginPath(); ctx.moveTo(cutoffX, padT); ctx.lineTo(cutoffX, height - padB); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(243,197,107,.09)';
      ctx.font = '800 70px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cutoffX + (width - padR - cutoffX) / 2, height / 2 + 5);
      ctx.fillStyle = 'rgba(243,197,107,.55)';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText('TƯƠNG LAI', cutoffX + (width - padR - cutoffX) / 2, padT + 12);
    } else {
      ctx.fillStyle = 'rgba(243,197,107,.022)';
      ctx.fillRect(cutoffX, padT, width - padR - cutoffX, height - padT - padB);
    }
    const paintCandle = (c, i) => {
      const color = c.c >= c.o ? up : down;
      const x = xFor(i);
      const bw = Math.max(2, Math.min(9, slot * 0.62));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yFor(c.h));
      ctx.lineTo(x, yFor(c.l));
      ctx.stroke();
      const top = yFor(Math.max(c.o, c.c));
      const bottom = yFor(Math.min(c.o, c.c));
      ctx.fillStyle = color;
      ctx.fillRect(x - bw / 2, top, bw, Math.max(1.2, bottom - top));
    };
    cs.visible.forEach((c, i) => paintCandle(c, i));
    if (answered) cs.future.forEach((c, j) => paintCandle(c, cs.visible.length + j));
    const lastY = yFor(cs.lastClose);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(243,197,107,.5)';
    ctx.beginPath(); ctx.moveTo(padL, lastY); ctx.lineTo(width - padR, lastY); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(243,197,107,.72)';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ĐIỂM CHỐT', padL + 2, lastY - 3);
    if (answered) {
      const x0 = xFor(cs.visible.length - 1);
      const x1 = xFor(cs.visible.length + cs.future.length - 1);
      const y0 = yFor(cs.lastClose);
      const y1 = yFor(cs.finalClose);
      const color = cs.direction === 'up' ? up : down;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .22;
      ctx.beginPath(); ctx.arc(x1, y1, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const label = (cs.movePct >= 0 ? '+' : '') + nf(cs.movePct, 2) + '%';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      const tw = ctx.measureText(label).width + 12;
      const lx = Math.min(width - padR - tw, Math.max(padL, x1 - tw / 2));
      const ly = Math.max(padT + 2, Math.min(height - padB - 20, y1 - 24));
      ctx.fillStyle = 'rgba(6,12,16,.9)';
      detectiveRoundRect(ctx, lx, ly, tw, 17, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.globalAlpha = .5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + tw / 2, ly + 9);
    }
  }

  function paintDetectiveStage() {
    const stage = $('#detectiveStage');
    if (!stage) return;
    ensureDetective();
    if (detectiveMode === 'practice') {
      stage.innerHTML = detectivePracticeStageHTML();
    } else {
      detectiveEnsureLoaded();
      stage.innerHTML = detectiveStageHTML();
    }
    const stageEl = $('#detectiveStage');
    if (stageEl) {
      stageEl.querySelectorAll('[data-detective-case]').forEach(btn => btn.addEventListener('click', () => {
        detectiveMode = 'daily';
        detectiveCaseIndex = Number(btn.getAttribute('data-detective-case'));
        paintDetectiveStage();
      }));
      stageEl.querySelectorAll('[data-detective-pick]').forEach(btn => btn.addEventListener('click', () => detectiveAnswer(btn.getAttribute('data-detective-pick'))));
      stageEl.querySelectorAll('[data-detective-clue]').forEach(btn => btn.addEventListener('click', () => detectiveUseClue(Number(btn.getAttribute('data-detective-clue')))));
      const next = stageEl.querySelector('[data-detective-next]');
      if (next) next.addEventListener('click', detectiveNextCase);
      const reload = stageEl.querySelector('[data-detective-reload]');
      if (reload) reload.addEventListener('click', () => {
        detectiveDaily = null;
        detectiveDailyPromise = null;
        detectiveEnsureLoaded();
        paintDetectiveStage();
      });
    }
    detectiveDrawChart();
    requestAnimationFrame(detectiveDrawChart);
  }

  function paintDetectiveSide() {
    const side = $('#detectiveSide');
    if (side) side.innerHTML = detectiveSideHTML();
    const stats = $('#detectiveStats');
    if (stats) stats.innerHTML = detectiveStatsHTML();
  }

  function mountDetective() {
    ensureDetective();
    detectiveEnsureLoaded();
    paintDetectiveStage();
  }

  /* ============================================================
     SHOP · COLLECTION · STYLE
     ============================================================ */
  let shopFilter = 'all';
  let shopRarity = 'all';
  let shopOwnedOnly = false;
  let shopSort = 'featured';

  const RARITY_LABEL = { common: 'Phổ thông', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại', mythic: 'Thần thoại' };
  const RARITY_ORDER = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

  function itemIsEquipped(it) {
    if (!it) return false;
    if (it.type === 'title' || it.type === 'frame' || it.type === 'theme') return state.equipped[it.type] === it.id;
    if (it.type === 'pet') return state.equipped.pet === it.id;
    if (it.type === 'effect') return effectsOn(it.id);
    if (it.type === 'perk') return hasItem(it.id);
    return false;
  }

  function shopCategories() {
    const seen = [];
    D.SHOP.forEach(it => { if (!seen.includes(it.category)) seen.push(it.category); });
    return seen;
  }

  function shopItemsFiltered() {
    let list = D.SHOP.slice();
    if (shopFilter !== 'all') list = list.filter(it => it.category === shopFilter);
    if (shopRarity !== 'all') list = list.filter(it => it.rarity === shopRarity);
    if (shopOwnedOnly) list = list.filter(it => hasItem(it.id));
    if (shopSort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (shopSort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (shopSort === 'rarity') list.sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));
    return list;
  }

  function itemActionHTML(it) {
    const owned = hasItem(it.id);
    if (owned && it.type === 'perk') return '<span class="badge badge-up">Đang bật</span>';
    if (owned && ['title', 'frame', 'theme', 'pet', 'effect'].includes(it.type)) {
      const eq = itemIsEquipped(it);
      return '<button class="btn btn-xs ' + (eq ? 'btn-gold' : 'btn-outline-gold') + '" data-action="equip-item" data-id="' + it.id + '">' + (eq ? 'Đang dùng' : 'Sử dụng') + '</button>';
    }
    if (!owned) return '<button class="btn btn-xs btn-gold" data-action="open-item" data-id="' + it.id + '">' + (it.price > 0 ? 'Mua' : 'Nhận') + '</button>';
    return '';
  }

  function shopCardHTML(it) {
    const owned = hasItem(it.id);
    const eq = owned && itemIsEquipped(it);
    const canBuy = !owned || it.type === 'consumable';
    return '<article class="shop-card rarity-' + it.rarity + (owned ? ' owned' : '') + (eq ? ' equipped' : '') + '">' +
      '<div class="shop-art"><span class="shop-rarity">' + (RARITY_LABEL[it.rarity] || it.rarity) + '</span>' +
      (owned && it.type !== 'consumable' ? '<span class="shop-owned-badge">' + (eq ? 'ĐANG DÙNG' : 'SỞ HỮU') + '</span>' : '') +
      '<span class="shop-emoji">' + it.icon + '</span></div>' +
      '<div class="shop-body"><div class="shop-type">' + esc(it.category) + '</div><div class="shop-name">' + esc(it.name) + '</div>' +
      '<div class="shop-desc">' + esc(it.desc) + '</div><div class="shop-foot">' +
      (it.price > 0 ? '<span class="shop-price">✦ ' + nf(it.price, 0) + '</span>' : '<span class="shop-price free">' + (owned ? 'Mặc định' : 'Miễn phí') + '</span>') +
      '<span class="shop-buy">' + (canBuy ? '<button class="btn btn-xs ' + (owned ? 'btn-ghost' : 'btn-gold') + '" data-action="open-item" data-id="' + it.id + '">' + (owned ? 'Mua thêm' : 'Mua') + '</button>' : itemActionHTML(it)) + '</span></div></div></article>';
  }

  function inventoryHTML() {
    const owned = D.SHOP.filter(it => hasItem(it.id) && it.type !== 'consumable');
    if (!owned.length) return '<div class="empty-state"><div class="empty-icon">🧰</div><strong>Bộ sưu tập đang trống</strong><p>Mua danh hiệu, khung avatar hoặc theme đầu tiên để bắt đầu xây phong cách của bạn.</p></div>';
    return '<div class="inventory-grid">' + owned.map(it => {
      const eq = itemIsEquipped(it);
      const sellable = !it.defaultValue && it.price > 0;
      return '<div class="inv-item"><span class="inv-icon">' + it.icon + '</span><div class="inv-body"><div class="inv-name">' + esc(it.name) + '</div><div class="inv-type">' + (eq ? 'Đang dùng' : esc(it.category)) + '</div></div>' +
        '<div class="inv-actions">' + (['title', 'frame', 'theme', 'pet', 'effect'].includes(it.type) ? '<button class="btn btn-xs btn-ghost" data-action="equip-item" data-id="' + it.id + '">' + (eq ? 'Bỏ' : 'Dùng') + '</button>' : '') +
        (sellable ? '<button class="btn btn-xs btn-ghost" data-action="sell-item" data-id="' + it.id + '">Bán +' + Math.floor(it.price * 0.6) + '</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function shopHTML() {
    const ownedCount = D.SHOP.filter(it => hasItem(it.id) && it.price > 0).length;
    const buyableCount = D.SHOP.filter(it => it.price > 0).length;
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('bag') + ' CỬA HÀNG AURA</div><h1>Phong cách của nhà giao dịch</h1>' +
      '<p class="sub">Aura kiếm từ giao dịch, nhiệm vụ và thành tựu. Mua danh hiệu, khung, giao diện, hiệu ứng — hoặc bán lại vật phẩm đã sở hữu để đổi hướng phong cách. Vật phẩm mặc định không thể bán.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-action="chest">' + icon('gift') + ' Rương ngày</button><button class="btn btn-gold btn-sm" data-nav="#/ranks">' + icon('trophy') + ' Thành tựu</button></div></div>' +
      '<section class="shop-banner"><div class="shop-banner-left"><h2>Bộ sưu tập Aura</h2><p>Bạn đã sở hữu <b>' + ownedCount + '</b> / ' + buyableCount + ' vật phẩm có thể mua. Mỗi vật phẩm đều có thể dùng ngay, và hầu hết có thể bán lại với 60% giá gốc.</p>' +
      '<div class="shop-filter-row"><span class="badge badge-gold">' + Math.round(ownedCount / (buyableCount || 1) * 100) + '% bộ sưu tập</span><span class="badge">Aura nhận từ nhiệm vụ</span></div></div>' +
      '<div class="aura-balance-big"><span class="aura-glyph">✦</span><div><b data-aura>' + nf(state.aura, 0) + '</b><span>AURA KHẢ DỤNG</span></div></div></section>' +
      '<div class="shop-toolbar"><div class="shop-cats">' + ['all'].concat(shopCategories()).map(cat => '<button class="chip ' + (shopFilter === cat ? 'active' : '') + '" data-shop-cat="' + esc(cat) + '">' + (cat === 'all' ? 'Tất cả' : esc(cat)) + '</button>').join('') + '</div>' +
      '<div class="head-actions"><label class="check"><input type="checkbox" id="shopOwnedOnly"' + (shopOwnedOnly ? ' checked' : '') + '>Chỉ sở hữu</label><select class="select" id="shopSort" style="height:29px;width:auto;font-size:9px"><option value="featured"' + (shopSort === 'featured' ? ' selected' : '') + '>Nổi bật</option><option value="price-asc"' + (shopSort === 'price-asc' ? ' selected' : '') + '>Giá thấp</option><option value="price-desc"' + (shopSort === 'price-desc' ? ' selected' : '') + '>Giá cao</option><option value="rarity"' + (shopSort === 'rarity' ? ' selected' : '') + '>Độ hiếm</option></select></div></div>' +
      '<div class="shop-filter-row rarity-filter">' + ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'].map(r => '<button class="chip ' + (shopRarity === r ? 'active' : '') + '" data-shop-rarity="' + r + '">' + (r === 'all' ? 'Mọi độ hiếm' : RARITY_LABEL[r]) + '</button>').join('') + '</div>' +
      '<div class="shop-grid" id="shopGrid">' + shopItemsFiltered().map(shopCardHTML).join('') + '</div>' +
      '<div class="table-foot"><span id="shopCount">' + shopItemsFiltered().length + ' vật phẩm</span><span class="dim">Bán lại nhận 60% giá gốc · Aura không quy đổi được sang tiền thật</span></div>' +
      '<section class="inventory-section card"><div class="card-head"><div><div class="card-title">' + icon('layers') + ' Bộ sưu tập của bạn</div><div class="card-sub">Trang bị, gỡ hoặc bán vật phẩm đã sở hữu</div></div><span class="badge">' + ownedCount + ' vật phẩm</span></div>' + inventoryHTML() + '</section>';
  }

  function refreshShopGrid() {
    const grid = $('#shopGrid');
    if (grid) grid.innerHTML = shopItemsFiltered().map(shopCardHTML).join('');
    const count = $('#shopCount');
    if (count) count.textContent = shopItemsFiltered().length + ' vật phẩm';
    $$('[data-shop-cat]').forEach(el => el.classList.toggle('active', el.getAttribute('data-shop-cat') === shopFilter));
    $$('[data-shop-rarity]').forEach(el => el.classList.toggle('active', el.getAttribute('data-shop-rarity') === shopRarity));
  }

  function mountShop() {
    $$('[data-shop-cat]').forEach(el => el.addEventListener('click', () => { shopFilter = el.getAttribute('data-shop-cat'); refreshShopGrid(); }));
    $$('[data-shop-rarity]').forEach(el => el.addEventListener('click', () => { shopRarity = el.getAttribute('data-shop-rarity'); refreshShopGrid(); }));
    const owned = $('#shopOwnedOnly');
    if (owned) owned.addEventListener('change', () => { shopOwnedOnly = owned.checked; refreshShopGrid(); });
    const sort = $('#shopSort');
    if (sort) sort.addEventListener('change', () => { shopSort = sort.value; refreshShopGrid(); });
  }

  function openItemModal(id) {
    const it = itemDef(id);
    if (!it) return;
    const owned = hasItem(it.id);
    const eq = owned && itemIsEquipped(it);
    const canBuy = !owned || it.type === 'consumable';
    const body = '<div class="purchase-preview rarity-' + it.rarity + '"><div class="purchase-icon">' + it.icon + '</div>' +
      '<div class="purchase-info"><h3>' + esc(it.name) + '</h3><div style="font-size:8px;color:var(--dim);margin-top:3px">' + esc(it.category) + ' · ' + (RARITY_LABEL[it.rarity] || it.rarity) + '</div><p>' + esc(it.desc) + '</p></div></div>' +
      '<div class="kv-row" style="margin-top:14px"><span class="k">Giá</span><span class="v gold">' + (it.price > 0 ? '✦ ' + nf(it.price, 0) + ' Aura' : 'Miễn phí') + '</span></div>' +
      '<div class="kv-row"><span class="k">Aura hiện có</span><span class="v">✦ ' + nf(state.aura, 0) + '</span></div>' +
      '<div class="kv-row"><span class="k">Trạng thái</span><span class="v ' + (eq ? 'up' : '') + '">' + (eq ? 'Đang trang bị' : owned ? 'Đã sở hữu' : 'Chưa sở hữu') + '</span></div>' +
      (it.type === 'perk' ? '<div class="risk-warning-inline">' + icon('info') + ' Nâng cấp được kích hoạt tự động sau khi mua, áp dụng ngay cho tài khoản.</div>' : '') +
      (it.type === 'consumable' ? '<div class="risk-warning-inline">' + icon('clock') + ' Vật phẩm tiêu hao: có thể mua nhiều lần, thời gian ưu đãi sẽ cộng dồn.</div>' : '') +
      '<div class="trade-error" id="itemError"></div>';
    const foot = '<button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button>' +
      (owned && it.type !== 'consumable' && it.price > 0 ? '<button class="btn btn-ghost btn-sm" data-action="sell-item" data-id="' + it.id + '">Bán +' + Math.floor(it.price * 0.6) + ' ✦</button>' : '') +
      (owned && ['title', 'frame', 'theme', 'pet', 'effect'].includes(it.type) ? '<button class="btn btn-ghost btn-sm" data-action="equip-item" data-id="' + it.id + '">' + (eq ? 'Đang dùng' : 'Sử dụng') + '</button>' : '') +
      (canBuy ? '<button class="btn btn-gold btn-sm" id="itemBuyBtn">' + (it.price > 0 ? 'Mua · ✦ ' + nf(it.price, 0) : 'Nhận miễn phí') + '</button>' : '');
    openModal({
      title: it.icon + ' ' + esc(it.name), sub: 'Vật phẩm ' + esc(it.category.toLowerCase()), size: 'modal-sm', body, foot,
      onOpen: modal => {
        const buy = modal.querySelector('#itemBuyBtn');
        if (buy) buy.addEventListener('click', () => {
          const res = purchaseItem(it.id);
          if (!res.ok) {
            const err = modal.querySelector('#itemError');
            if (err) { err.textContent = res.error; err.classList.add('show'); }
            toast('Không thể mua', res.error, 'error', '⚠️');
            return;
          }
          closeModal();
          if (currentRoute === 'shop') renderRoute(); else updateShell();
        });
      }
    });
  }

  /* ============================================================
     LESSON MODAL
     ============================================================ */
  function lessonBlocksHTML(lesson) {
    return lesson.blocks.map(b => {
      if (b.type === 'h') return '<h3>' + esc(b.text) + '</h3>';
      if (b.type === 'list') return '<ul>' + b.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      return '<p>' + esc(b.text) + '</p>';
    }).join('');
  }

  function openLesson(id) {
    const lesson = D.LESSONS.find(l => l.id === id);
    if (!lesson) return;
    const already = (state.stats.lessons || []).includes(id);
    const body = '<div class="lesson-content">' + lessonBlocksHTML(lesson) + '</div>' +
      '<div class="quiz-box" id="lessonQuiz"><div class="quiz-q">' + icon('target') + ' ' + esc(lesson.quiz.question) + '</div>' +
      lesson.quiz.options.map((opt, i) => '<div class="quiz-option" data-quiz-opt="' + i + '"><span class="quiz-letter">' + String.fromCharCode(65 + i) + '</span><span>' + esc(opt) + '</span></div>').join('') +
      '<div class="quiz-explain" id="quizExplain">' + esc(lesson.quiz.explain) + '</div>' +
      '<div class="head-actions" style="justify-content:flex-end;margin-top:10px">' +
      (already ? '<span class="badge badge-up">' + icon('check') + ' Đã hoàn thành</span>' : '<button class="btn btn-sm btn-gold" id="quizCheck">Kiểm tra đáp án</button>') + '</div></div>' +
      '<div class="lesson-foot" style="margin-top:12px"><span>' + esc(lesson.level) + ' · ' + lesson.minutes + ' phút</span><span style="margin-left:auto">' + (already ? 'Bài học đã được ghi nhận' : 'Phần thưởng: +80 Aura · +60 XP') + '</span></div>';
    openModal({
      title: lesson.icon + ' ' + esc(lesson.title), sub: 'Học viện AURELIS · ' + esc(lesson.summary), size: 'modal-lg', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Đóng</button>' + (already ? '<button class="btn btn-gold btn-sm" data-nav="#/academy">Về học viện</button>' : ''),
      onOpen: modal => {
        let choice = null;
        const opts = Array.from(modal.querySelectorAll('[data-quiz-opt]'));
        opts.forEach((el, i) => el.addEventListener('click', () => {
          if (el.classList.contains('correct') || el.classList.contains('wrong') || already) return;
          choice = i;
          opts.forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
        }));
        if (already) {
          opts.forEach((el, i) => el.classList.add(i === lesson.quiz.answer ? 'correct' : ''));
          const explain = modal.querySelector('#quizExplain');
          if (explain) explain.classList.add('show');
        }
        const check = modal.querySelector('#quizCheck');
        if (check) check.addEventListener('click', () => {
          if (choice == null) return toast('Chưa chọn đáp án', 'Hãy chọn một phương án trước khi kiểm tra.', 'info', '🎓');
          if (choice !== lesson.quiz.answer) {
            opts[choice].classList.remove('selected');
            opts[choice].classList.add('wrong');
            const explain = modal.querySelector('#quizExplain');
            if (explain) explain.classList.add('show');
            toast('Chưa đúng', 'Đọc lại phần giải thích và thử chọn lại. Không sao — sai ở đây miễn phí.', 'error', '📚');
            setTimeout(() => { opts[choice].classList.remove('wrong'); }, 1600);
            return;
          }
          opts.forEach((el, i) => { el.classList.remove('selected'); if (i === lesson.quiz.answer) el.classList.add('correct'); });
          const explain = modal.querySelector('#quizExplain');
          if (explain) explain.classList.add('show');
          if (!already) completeLesson(lesson);
          check.disabled = true;
          check.textContent = 'Đã hoàn thành';
        });
      }
    });
  }

  function completeLesson(lesson) {
    if (!state.stats.lessons) state.stats.lessons = [];
    if (state.stats.lessons.includes(lesson.id)) return;
    state.stats.lessons.push(lesson.id);
    addAura(80);
    addXP(60);
    progressQuest('lesson', 1);
    pushNotif('🎓', 'Hoàn thành bài học', lesson.title + ' · +80 Aura, +60 XP');
    toast('Hoàn thành bài học!', lesson.title + ' · +80 Aura', 'success', lesson.icon);
    confetti(25);
    saveNow();
    if (currentRoute === 'academy') renderRoute();
  }

  /* ============================================================
     TRADE MODAL · SETTINGS · PROFILE
     ============================================================ */
  function openTradeModal(asset, side, mode) {
    if (!asset) return;
    const a = asset;
    const draft = {
      mode: a.group === 'derivatives' ? 'futures' : (mode === 'futures' ? 'futures' : 'spot'),
      side: a.group === 'derivatives' ? (side === 'short' ? 'short' : 'long') : (side === 'sell' ? 'sell' : 'buy'),
      type: 'market', qty: '', price: a.price, leverage: clamp(5, 1, a.maxLeverage || 10)
    };
    const letsFutures = a.group !== 'index' && a.tradable;
    function summary() {
      const qty = Number(draft.qty) || 0;
      const price = draft.type === 'limit' ? Number(draft.price) || a.price : a.price;
      const notional = notionalVND(a, price, qty);
      const futures = draft.mode === 'futures';
      const lev = futures ? clamp(Number(draft.leverage) || 5, 1, a.maxLeverage || 10) : 1;
      const fee = notional * feeRate(a, futures ? 'futures' : 'spot', draft.side);
      const tax = !futures && draft.side === 'sell' && ['hose', 'hnx', 'upcom'].includes(a.group) ? notional * 0.001 : 0;
      const margin = futures ? notional / lev : notional;
      const total = draft.side === 'buy' || draft.side === 'long' ? margin + fee : Math.max(0, margin - fee - tax);
      return { qty, price, notional, fee, tax, margin, lev, total, futures };
    }
    function paintSummary() {
      const s = summary();
      const box = $('#tmSummary');
      if (!box) return;
      box.innerHTML = '<div class="kv-row"><span class="k">Giá trị ' + (s.futures ? 'hợp đồng' : 'lệnh') + '</span><span class="v">' + money(s.notional) + ' ₫</span></div>' +
        '<div class="kv-row"><span class="k">Phí giao dịch</span><span class="v">' + money(s.fee) + ' ₫</span></div>' +
        (s.futures ? '<div class="kv-row"><span class="k">Ký quỹ (' + s.lev + 'x)</span><span class="v">' + money(s.margin) + ' ₫</span></div><div class="kv-row"><span class="k">Thanh lý dự kiến</span><span class="v down">' + fmtPrice(a, draft.side === 'long' ? s.price * (1 - 0.9 / s.lev) : s.price * (1 + 0.9 / s.lev)) + '</span></div>' : '') +
        (s.tax ? '<div class="kv-row"><span class="k">Thuế bán</span><span class="v">' + money(s.tax) + ' ₫</span></div>' : '') +
        '<div class="kv-row total"><span class="k">' + (draft.side === 'buy' || draft.side === 'long' ? 'Tổng thanh toán' : 'Thực nhận dự kiến') + '</span><span class="v">' + money(s.total) + ' ₫</span></div>';
      const btn = $('#tmSubmit');
      if (btn) {
        btn.textContent = draft.side === 'buy' || draft.side === 'long' ? (s.futures ? 'Mở Long ' + a.symbol : 'Mua ' + a.symbol) : (s.futures ? 'Mở Short ' + a.symbol : 'Bán ' + a.symbol);
        btn.classList.toggle('btn-gold', draft.side === 'buy' || draft.side === 'long');
        btn.classList.toggle('btn-down', draft.side === 'sell' || draft.side === 'short');
      }
      const levEl = $('#tmLevLabel');
      if (levEl) levEl.textContent = s.lev + 'x';
      const avail = $('#tmAvail');
      if (avail) avail.textContent = money(state.cash) + ' ₫';
      const hold = $('#tmHold');
      if (hold) {
        const h = state.holdings[a.id];
        hold.textContent = h && h.qty > 0 ? 'Đang giữ ' + fmtQty(a, h.qty) : 'Chưa nắm giữ';
      }
    }
    function quickQty(pct) {
      const s = summary();
      if (!s.futures && draft.side === 'sell') {
        const h = state.holdings[a.id];
        return h ? roundQty(a, h.qty * pct / 100) : 0;
      }
      const budget = state.cash * 0.98 * (s.futures ? s.lev : 1);
      return roundQty(a, budget / (s.price * valueFactor(a)) * pct / 100);
    }
    function syncModeUI() {
      const futures = draft.mode === 'futures';
      const sideWrap = $('#tmSides');
      if (sideWrap) sideWrap.innerHTML = '<button class="order-side buy ' + (draft.side === 'buy' || draft.side === 'long' ? 'active' : '') + '" data-tm-side="' + (futures ? 'long' : 'buy') + '">' + (futures ? 'Long' : 'Mua') + '</button><button class="order-side sell ' + (draft.side === 'sell' || draft.side === 'short' ? 'active' : '') + '" data-tm-side="' + (futures ? 'short' : 'sell') + '">' + (futures ? 'Short' : 'Bán') + '</button>';
      const levBox = $('#tmLevBox');
      if (levBox) levBox.style.display = futures ? 'block' : 'none';
      $$('[data-tm-mode]').forEach(el => { el.classList.toggle('active', el.getAttribute('data-tm-mode') === draft.mode); el.classList.toggle('gold', el.getAttribute('data-tm-mode') === draft.mode); });
      const price = $('#tmPrice');
      if (price) { price.disabled = draft.type === 'market'; price.value = draft.type === 'limit' ? draft.price : a.price; }
      $$('[data-tm-side]').forEach(el => el.addEventListener('click', () => {
        draft.side = el.getAttribute('data-tm-side');
        syncModeUI(); paintSummary();
      }));
      paintSummary();
    }
    const body = '<div class="trade-asset-preview">' + assetLogo(a, 'lg') + '<div class="asset-name-block"><div class="asset-symbol">' + esc(a.symbol) + ' <span class="exchange-tag">' + esc(a.exchange) + '</span></div><div class="asset-name">' + esc(a.name) + '</div></div>' +
      '<div><div class="tap-price" data-q-price="' + a.id + '">' + fmtPrice(a) + ' ' + priceUnit(a) + '</div><div class="tap-chg ' + changeCls(a.changePct) + '" data-q-chg="' + a.id + '">' + fmtPct(a.changePct) + '</div></div></div>' +
      (a.group === 'derivatives' ? '<div class="risk-warning-inline" style="margin-bottom:10px">' + icon('shield') + ' Hợp đồng phái sinh dùng ký quỹ cách ly. Giá chạm mức thanh lý sẽ tự động đóng vị thế.</div>' : '<div class="spot-futures"><div class="segmented block"><button class="seg ' + (draft.mode === 'spot' ? 'active gold' : '') + '" data-tm-mode="spot">Spot</button><button class="seg ' + (draft.mode === 'futures' ? 'active gold' : '') + '" data-tm-mode="futures">Phái sinh</button></div></div>') +
      '<div class="order-side-tabs" id="tmSides"></div>' +
      '<div class="form-row" style="grid-template-columns:1fr 1fr;gap:7px"><div class="field"><label class="field-label" for="tmType">Loại lệnh</label><select class="select" id="tmType"><option value="market">Thị trường</option><option value="limit">Giới hạn</option></select></div>' +
      '<div class="field"><label class="field-label" for="tmPrice">Giá <span class="hint">' + priceUnit(a) + '</span></label><input class="input mono" id="tmPrice" type="number" step="' + (a.decimals > 4 ? '0.00000001' : '0.01') + '" value="' + a.price + '"></div></div>' +
      '<div class="field" style="margin-top:8px"><label class="field-label" for="tmQty">Khối lượng <span class="hint">' + esc(a.unit || 'đơn vị') + '</span></label><input class="input mono" id="tmQty" type="number" min="0" step="' + (stepFor(a) < 1 ? stepFor(a) : 1) + '" placeholder="Nhập khối lượng"></div>' +
      '<div class="quick-amounts">' + [25, 50, 75, 100].map(p => '<button type="button" data-tm-pct="' + p + '">' + p + '%</button>').join('') + '</div>' +
      '<div class="order-meta"><span>Sức mua <b id="tmAvail">' + money(state.cash) + ' ₫</b></span><span id="tmHold"></span></div>' +
      '<div class="leverage-wrap" id="tmLevBox"><div class="leverage-head"><span>Đòn bẩy</span><b id="tmLevLabel">' + draft.leverage + 'x</b></div><input class="range" id="tmLev" type="range" min="1" max="' + (a.maxLeverage || 10) + '" step="1" value="' + draft.leverage + '"><div class="leverage-marks"><span>1x</span><span>' + Math.round((a.maxLeverage || 10) / 2) + 'x</span><span>' + (a.maxLeverage || 10) + 'x</span></div></div>' +
      '<div class="order-summary" id="tmSummary"></div><div class="trade-error" id="tmError"></div>' +
      '<button class="btn btn-gold btn-block order-submit" id="tmSubmit"></button>' +
      '<div class="order-hint">Spot dùng tiền mặt · phái sinh dùng ký quỹ · lệnh giới hạn chờ khớp tự động.</div>';
    openModal({
      title: 'Giao dịch ' + esc(a.symbol), sub: esc(a.name) + ' · ' + esc(a.exchange), body,
      onOpen: modal => {
        syncModeUI();
        $$('[data-tm-mode]').forEach(el => el.addEventListener('click', () => {
          const next = el.getAttribute('data-tm-mode');
          if (next === draft.mode) return;
          draft.mode = next;
          draft.side = next === 'futures' ? 'long' : 'buy';
          syncModeUI();
        }));
        const type = modal.querySelector('#tmType');
        const price = modal.querySelector('#tmPrice');
        const qty = modal.querySelector('#tmQty');
        const lev = modal.querySelector('#tmLev');
        if (type) type.addEventListener('change', () => { draft.type = type.value; draft.price = Number(price.value) || a.price; price.disabled = draft.type === 'market'; paintSummary(); });
        if (price) price.addEventListener('input', () => { draft.price = price.value; paintSummary(); });
        if (qty) qty.addEventListener('input', () => { draft.qty = qty.value; paintSummary(); });
        if (lev) lev.addEventListener('input', () => { draft.leverage = Number(lev.value); paintSummary(); });
        $$('[data-tm-pct]').forEach(b => b.addEventListener('click', () => {
          const v = quickQty(Number(b.getAttribute('data-tm-pct')));
          draft.qty = v; if (qty) qty.value = v;
          paintSummary();
        }));
        const err = modal.querySelector('#tmError');
        modal.querySelector('#tmSubmit').addEventListener('click', () => {
          const q = Number(draft.qty);
          if (!isFinite(q) || q <= 0) {
            if (err) { err.textContent = 'Nhập khối lượng lớn hơn 0 để tiếp tục.'; err.classList.add('show'); }
            return;
          }
          if (draft.type === 'limit' && (!isFinite(Number(draft.price)) || Number(draft.price) <= 0)) {
            if (err) { err.textContent = 'Giá giới hạn không hợp lệ.'; err.classList.add('show'); }
            return;
          }
          if (draft.type === 'limit') {
            const res = placeOrder({ assetId: a.id, side: draft.side, qty: q, price: Number(draft.price), leverage: draft.leverage, mode: draft.mode });
            if (!res.ok) { if (err) { err.textContent = res.error; err.classList.add('show'); } return; }
            toast('Đã đặt lệnh chờ', (draft.side === 'sell' || draft.side === 'short' ? 'Bán ' : 'Mua ') + fmtQty(a, q) + ' ' + a.symbol + ' @ ' + fmtPrice(a, draft.price), 'success', '📋');
            closeModal();
            if (currentRoute === 'terminal') refreshTerminalPanels(); else refreshCurrentRoute();
            return;
          }
          let res;
          if (draft.mode === 'futures') res = openPosition(a, draft.side === 'short' ? 'short' : 'long', q, draft.leverage, a.price);
          else res = executeSpot(a, draft.side === 'sell' ? 'sell' : 'buy', q, a.price);
          if (!res.ok) { if (err) { err.textContent = res.error; err.classList.add('show'); } return; }
          toast(draft.mode === 'futures' ? 'Đã mở vị thế' : 'Đã khớp lệnh', (draft.mode === 'futures' ? (draft.side === 'short' ? 'SHORT ' : 'LONG ') : (draft.side === 'sell' ? 'Bán ' : 'Mua ')) + fmtQty(a, q) + ' ' + a.symbol + ' @ ' + fmtPrice(a), 'success', draft.mode === 'futures' ? '⚡' : '✅');
          pushNotif(draft.mode === 'futures' ? '⚡' : '✅', draft.mode === 'futures' ? 'Mở vị thế ' + a.symbol : 'Khớp lệnh ' + a.symbol, fmtQty(a, q) + ' @ ' + fmtPrice(a));
          closeModal();
          updateShell();
          if (currentRoute === 'terminal') refreshTerminalPanels(); else refreshCurrentRoute();
        });
      }
    });
  }

  const PROFILE_BANNERS = [
    { id: 'aurora', name: 'Cực quang', css: 'linear-gradient(120deg, #12313a 0%, #1f4c5c 36%, #4a3a67 70%, #7a4a63 100%)' },
    { id: 'ember', name: 'Than hồng', css: 'linear-gradient(120deg, #2b1510 0%, #6b2c1f 45%, #b85c2e 78%, #f3c56b 100%)' },
    { id: 'ocean', name: 'Đại dương', css: 'linear-gradient(120deg, #071b2b 0%, #0f3a56 45%, #176b86 78%, #58d6c7 100%)' },
    { id: 'sakura', name: 'Anh đào', css: 'linear-gradient(120deg, #2a1724 0%, #63304e 45%, #b8577d 78%, #ffc2d4 100%)' },
    { id: 'mono', name: 'Đá núi lửa', css: 'linear-gradient(120deg, #0b0f12 0%, #20282e 45%, #3b4750 78%, #84929c 100%)' },
    { id: 'gold', name: 'Hoàng kim', css: 'linear-gradient(120deg, #221a0b 0%, #5e4517 45%, #a9812c 78%, #f3c56b 100%)' }
  ];
  const PROFILE_ACCENTS = [
    { id: 'gold', name: 'Vàng', color: '#f3c56b' },
    { id: 'mint', name: 'Bạc hà', color: '#2ee6a6' },
    { id: 'sky', name: 'Xanh trời', color: '#5ac8fa' },
    { id: 'rose', name: 'Hồng', color: '#ff8fb1' },
    { id: 'violet', name: 'Tím', color: '#b59cff' }
  ];

  function ensureProfile() {
    if (!state.profile || typeof state.profile !== 'object') {
      state.profile = { bio: '', motto: '', banner: 'aurora', accent: 'gold', showcase: [] };
    }
    const p = state.profile;
    if (typeof p.bio !== 'string') p.bio = '';
    if (typeof p.motto !== 'string') p.motto = '';
    if (!PROFILE_BANNERS.some(b => b.id === p.banner)) p.banner = 'aurora';
    if (!PROFILE_ACCENTS.some(a => a.id === p.accent)) p.accent = 'gold';
    if (!Array.isArray(p.showcase)) p.showcase = [];
    p.bio = p.bio.slice(0, 90);
    p.motto = p.motto.slice(0, 46);
    p.showcase = p.showcase.filter(id => state.achievements && state.achievements[id]).slice(0, 3);
    return p;
  }

  function profileBannerDef() {
    const p = ensureProfile();
    return PROFILE_BANNERS.find(b => b.id === p.banner) || PROFILE_BANNERS[0];
  }

  function profileAccentDef() {
    const p = ensureProfile();
    return PROFILE_ACCENTS.find(a => a.id === p.accent) || PROFILE_ACCENTS[0];
  }

  function profileShowcaseHTML() {
    const p = ensureProfile();
    const items = p.showcase.map(id => D.ACHIEVEMENTS.find(a => a.id === id)).filter(a => a && state.achievements[a.id]);
    if (!items.length) return '<span class="profile-showcase-empty">Chưa ghim thành tựu nào</span>';
    return items.map(a => '<span class="profile-showcase-chip" title="' + esc(a.desc) + '">' + a.icon + ' ' + esc(a.name) + '</span>').join('');
  }

  function profileCardHTML() {
    const p = ensureProfile();
    const banner = profileBannerDef();
    const accent = profileAccentDef();
    const lvl = xpInfo();
    const rank = currentRank();
    const achCount = D.ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    const bio = p.bio || 'Chưa viết gì. Một hồ sơ trống cũng là một phong cách.';
    return '<div class="profile-preview" style="--pa:' + accent.color + '">' +
      '<div class="profile-cover" style="background:' + banner.css + '"><span class="profile-cover-tag">' + esc(banner.name) + '</span></div>' +
      '<div class="profile-preview-main"><span class="avatar avatar-xl profile-avatar">' + esc(state.avatar) + '</span>' +
      '<div class="profile-preview-info"><div class="profile-preview-name">' + esc(state.username) + ' <span class="rank-title-chip">' + icon('sparkles') + ' ' + esc(titleValue()) + '</span>' + (petValue() ? '<span class="profile-pet" title="Thú cưng đang theo">' + petValue() + '</span>' : '') + '</div>' +
      '<div class="profile-preview-rank">' + rank.icon + ' ' + esc(rank.name) + ' · Cấp ' + lvl.level + ' · ' + nf(lvl.current, 0) + '/' + nf(lvl.need, 0) + ' XP</div>' +
      '<p class="profile-bio">' + esc(bio) + '</p>' +
      (p.motto ? '<div class="profile-motto">“' + esc(p.motto) + '”</div>' : '') +
      '<div class="profile-showcase">' + profileShowcaseHTML() + '</div></div></div>' +
      '<div class="profile-preview-stats"><div><span>Tài sản</span><b>' + fmtVND(netWorth()) + '</b></div><div><span>Aura</span><b>' + nf(state.aura, 0) + ' ✦</b></div><div><span>Thành tựu</span><b>' + achCount + '/' + D.ACHIEVEMENTS.length + '</b></div></div></div>';
  }

  function settingsModal(tab) {
    const ownedThemes = D.SHOP.filter(it => it.type === 'theme' && hasItem(it.id));
    let activeTab = tab || 'profile';
    const body = '<div class="modal-tabs"><button class="modal-tab ' + (activeTab === 'profile' ? 'active' : '') + '" data-settings-tab="profile">Hồ sơ</button><button class="modal-tab ' + (activeTab === 'display' ? 'active' : '') + '" data-settings-tab="display">Hiển thị</button><button class="modal-tab ' + (activeTab === 'data' ? 'active' : '') + '" data-settings-tab="data">Dữ liệu</button><button class="modal-tab ' + (activeTab === 'about' ? 'active' : '') + '" data-settings-tab="about">Giới thiệu</button></div>' +
      '<div id="settingsBody"></div>';
    openModal({
      title: 'Cài đặt AURELIS', sub: 'Cá nhân hoá trải nghiệm và quản lý dữ liệu cục bộ.', size: 'modal-lg', body,
      onOpen: modal => {
        function paintSettings() {
          const box = modal.querySelector('#settingsBody');
          if (!box) return;
          if (activeTab === 'profile' || activeTab === '__profile') {
            const prof = ensureProfile();
            const claimedAchs = D.ACHIEVEMENTS.filter(a => state.achievements[a.id]);
            box.innerHTML = profileCardHTML() +
              '<div class="profile-edit-grid">' +
              '<label class="field"><span class="field-label">Giới thiệu ngắn</span><input class="input" id="setBio" maxlength="90" value="' + esc(prof.bio) + '" placeholder="Ví dụ: kiên nhẫn, thích cổ phiếu ngân hàng và không mua đuổi."></label>' +
              '<label class="field"><span class="field-label">Khẩu hiệu</span><input class="input" id="setMotto" maxlength="46" value="' + esc(prof.motto) + '" placeholder="Một câu bạn muốn tự nhắc mình."></label>' +
              '</div>' +
              '<div class="settings-block"><div class="settings-label">Ảnh bìa hồ sơ</div><div class="settings-desc">Chọn tông nền cho thẻ hồ sơ trên trang xếp hạng và trong cửa sổ này.</div><div class="profile-swatches">' + PROFILE_BANNERS.map(b => '<button type="button" class="profile-swatch ' + (prof.banner === b.id ? 'active' : '') + '" data-banner-pick="' + b.id + '"><span style="background:' + b.css + '"></span>' + esc(b.name) + '</button>').join('') + '</div></div>' +
              '<div class="settings-block"><div class="settings-label">Màu nhấn</div><div class="settings-desc">Màu viền avatar, đường kẻ và nhãn thành tựu trên hồ sơ.</div><div class="profile-swatches accent">' + PROFILE_ACCENTS.map(a => '<button type="button" class="profile-swatch ' + (prof.accent === a.id ? 'active' : '') + '" data-accent-pick="' + a.id + '"><span class="profile-accent-dot" style="background:' + a.color + '"></span>' + esc(a.name) + '</button>').join('') + '</div></div>' +
              '<div class="settings-block"><div class="settings-label">Thành tựu ghim</div><div class="settings-desc">Chọn tối đa 3 thành tựu đã mở để khoe trên hồ sơ.</div><div class="showcase-picker">' + (claimedAchs.length ? claimedAchs.map(a => '<button type="button" class="showcase-pick ' + (prof.showcase.includes(a.id) ? 'active' : '') + '" data-showcase-pick="' + a.id + '">' + a.icon + ' ' + esc(a.name) + '</button>').join('') : '<span class="dim">Chưa mở thành tựu nào. Cứ giao dịch và làm nhiệm vụ trước đã.</span>') + '</div></div>' +
              '<div class="settings-row"><div><div class="settings-label">Tên hiển thị</div><div class="settings-desc">Tên xuất hiện trên bảng xếp hạng và hồ sơ.</div></div><input class="input" id="setName" style="max-width:200px" value="' + esc(state.username) + '" maxlength="28"></div>' +
              '<div class="settings-row" style="align-items:flex-start"><div><div class="settings-label">Avatar</div><div class="settings-desc">Chọn biểu tượng đại diện của bạn.</div></div><div class="avatar-picker">' + D.AVATARS.map(av => '<button class="avatar-pick ' + (state.avatar === av ? 'active' : '') + '" data-avatar-pick="' + av + '">' + av + '</button>').join('') + '</div></div>' +
              '<div class="settings-row"><div><div class="settings-label">Phong cách</div><div class="settings-desc">' + (state.playstyle === 'trader' ? 'Trader linh hoạt · ưu tiên nhịp thị trường.' : state.playstyle === 'analyst' ? 'Nhà phân tích · ưu tiên dữ liệu và kỷ luật.' : 'Nhà đầu tư bền vững · ưu tiên danh mục dài hạn.') + '</div></div><button class="btn btn-xs btn-ghost" data-action="replay-onboarding">Đổi phong cách</button></div>' +
              '<div class="settings-row"><div><div class="settings-label">Danh hiệu đang dùng</div><div class="settings-desc">Mua thêm trong Cửa hàng Aura.</div></div><span class="rank-title-chip">✦ ' + esc(titleValue()) + '</span></div>' +
              '<div class="settings-row"><div><div class="settings-label">Chế độ riêng tư</div><div class="settings-desc">Làm mờ số dư tài sản trên thanh trên và các thẻ tổng quan.</div></div><button class="switch ' + (state.settings.privacy ? 'on' : '') + '" data-toggle-setting="privacy" aria-label="Riêng tư"></button></div>' +
              '<div class="settings-row"><div><div class="settings-label">Hiệu ứng confetti</div><div class="settings-desc">Bắn giấy màu khi chốt lời, nhận thưởng hoặc lên cấp.</div></div><button class="switch ' + (state.settings.confetti ? 'on' : '') + '" data-toggle-setting="confetti" aria-label="Confetti"></button></div>' +
              '<div class="settings-row"><div><div class="settings-label">Thông báo giá</div><div class="settings-desc">Hiện thông báo khi cảnh báo giá được kích hoạt.</div></div><button class="switch ' + (state.settings.notifyPrice ? 'on' : '') + '" data-toggle-setting="notifyPrice" aria-label="Thông báo giá"></button></div>';
            const name = box.querySelector('#setName');
            if (name) name.addEventListener('change', () => { if (name.value.trim()) { state.username = name.value.trim().slice(0, 28); saveNow(); updateShell(); paintSettings(); } });
            const bio = box.querySelector('#setBio');
            if (bio) bio.addEventListener('change', () => { state.profile.bio = bio.value.trim().slice(0, 90); saveNow(); paintSettings(); refreshCurrentRoute(); });
            const motto = box.querySelector('#setMotto');
            if (motto) motto.addEventListener('change', () => { state.profile.motto = motto.value.trim().slice(0, 46); saveNow(); paintSettings(); refreshCurrentRoute(); });
            box.querySelectorAll('[data-banner-pick]').forEach(b => b.addEventListener('click', () => { state.profile.banner = b.getAttribute('data-banner-pick'); saveNow(); paintSettings(); refreshCurrentRoute(); }));
            box.querySelectorAll('[data-accent-pick]').forEach(b => b.addEventListener('click', () => { state.profile.accent = b.getAttribute('data-accent-pick'); saveNow(); paintSettings(); refreshCurrentRoute(); }));
            box.querySelectorAll('[data-showcase-pick]').forEach(b => b.addEventListener('click', () => {
              const id = b.getAttribute('data-showcase-pick');
              const list = state.profile.showcase;
              if (list.includes(id)) state.profile.showcase = list.filter(x => x !== id);
              else if (list.length >= 3) return toast('Đã ghim đủ 3 thành tựu', 'Bỏ ghim một thành tựu trước khi chọn cái khác.', 'info', '📌');
              else state.profile.showcase = list.concat(id);
              saveNow();
              paintSettings();
            }));
            box.querySelectorAll('[data-avatar-pick]').forEach(b => b.addEventListener('click', () => { state.avatar = b.getAttribute('data-avatar-pick'); save(); updateShell(); paintSettings(); }));
            box.querySelectorAll('[data-toggle-setting]').forEach(b => b.addEventListener('click', () => { const key = b.getAttribute('data-toggle-setting'); state.settings[key] = !state.settings[key]; b.classList.toggle('on', state.settings[key]); updateShell(); save(); }));
          } else if (activeTab === 'display') {
            box.innerHTML = '<div class="settings-row"><div><div class="settings-label">Giao diện</div><div class="settings-desc">Chỉ hiển thị các theme bạn đã sở hữu. Mua thêm trong Cửa hàng Aura.</div></div></div>' +
              '<div class="theme-grid">' + ownedThemes.map(it => '<button class="theme-choice rarity-' + it.rarity + ' ' + (state.equipped.theme === it.id ? 'active' : '') + '" data-theme-pick="' + it.id + '"><span>' + it.icon + '</span><b>' + esc(it.name) + '</b><small>' + esc(it.desc) + '</small></button>').join('') + '</div>' +
              '<div class="settings-row"><div><div class="settings-label">Khung avatar</div><div class="settings-desc">Mở khoá bằng vật phẩm trong shop.</div></div><span class="badge">' + esc((itemDef(state.equipped.frame) || {}).name || 'Tối Giản') + '</span></div>' +
              '<div class="settings-row"><div><div class="settings-label">Hiệu ứng đang bật</div><div class="settings-desc">Có thể bật/tắt trong bộ sưu tập.</div></div><span class="badge">' + ((state.equipped.effects || []).length) + ' hiệu ứng</span></div>';
            box.querySelectorAll('[data-theme-pick]').forEach(b => b.addEventListener('click', () => { equipItem(b.getAttribute('data-theme-pick'), true); paintSettings(); }));
          } else if (activeTab === 'data') {
            box.innerHTML = '<div class="settings-row"><div><div class="settings-label">Nguồn dữ liệu</div><div class="settings-desc">' + (sourceMode() === 'live' ? 'Yahoo Finance + Binance + RSS, cập nhật mỗi 20 giây.' : sourceMode() === 'binance' ? 'Binance trực tiếp cho crypto; các thị trường khác đang mô phỏng.' : 'Chế độ mô phỏng cục bộ. Chạy server để có dữ liệu thật.') + '</div></div><span class="status-pill ' + (sourceMode() === 'demo' ? 'demo' : 'live') + '"><span class="dot"></span>' + (sourceMode() === 'live' ? 'LIVE' : sourceMode() === 'binance' ? 'BINANCE' : 'DEMO') + '</span></div>' +
              '<div class="settings-row"><div><div class="settings-label">Lưu trữ cục bộ</div><div class="settings-desc">Tài khoản, giao dịch, vật phẩm và nhật ký nằm trong trình duyệt này. Xuất bản sao lưu định kỳ.</div></div><button class="btn btn-xs btn-ghost" data-action="export-json">' + icon('download') + ' Xuất</button></div>' +
              '<div class="settings-row"><div><div class="settings-label">Xuất danh mục CSV</div><div class="settings-desc">Tải danh sách tài sản đang nắm giữ và giá vốn.</div></div><button class="btn btn-xs btn-ghost" data-action="export-csv">' + icon('download') + ' CSV</button></div>' +
              '<div class="settings-row"><div><div class="settings-label">Đặt lại tài khoản</div><div class="settings-desc">Xoá toàn bộ dữ liệu ảo và bắt đầu lại từ 1 tỷ ₫. Không thể hoàn tác.</div></div><button class="btn btn-xs btn-down" data-action="reset-account">Đặt lại</button></div>' +
              '<div class="risk-warning-inline">' + icon('info') + ' Đây là môi trường giao dịch ảo. Không có tiền thật, không kết nối tài khoản môi giới thật, không phải lời khuyên đầu tư.</div>';
          } else {
            box.innerHTML = '<div class="about-hero"><div class="brand-mark" style="width:52px;height:52px"><svg viewBox="0 0 64 64"><path d="M32 7 54 47l-9 10-13-8-13 8-9-10z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 42h24M32 24v30" stroke="currentColor" stroke-width="3"/></svg></div><div><h3>AURELIS MARKETS</h3><p>Vốn ảo · Kỹ năng thật · Không phải lời khuyên đầu tư.</p></div></div>' +
              '<p class="modal-note">AURELIS là phòng tập đầu tư: giá thị trường thật khi có kết nối, vốn hoàn toàn ảo. Bạn có thể thử HOSE, HNX, UPCoM, cổ phiếu Mỹ, crypto, forex, hàng hoá và phái sinh mà không mất tiền thật.</p>' +
              '<div class="kv-row"><span class="k">Phiên bản</span><span class="v">1.0 · AURA Season 01</span></div><div class="kv-row"><span class="k">Dữ liệu</span><span class="v">Yahoo Finance · Binance · CafeF · VnExpress · Vietstock</span></div><div class="kv-row"><span class="k">Lưu trữ</span><span class="v">localStorage trên thiết bị</span></div>' +
              '<div class="risk-warning-inline">' + icon('alert') + ' Giá có thể chậm 15 phút. HNX/UPCoM và một số chỉ số VN được mô phỏng có dán nhãn. Không dùng để đặt lệnh bằng tiền thật.</div>';
          }
        }
        modal.querySelectorAll('[data-settings-tab]').forEach(b => b.addEventListener('click', () => {
          modal.querySelectorAll('[data-settings-tab]').forEach(x => x.classList.toggle('active', x === b));
          activeTab = b.getAttribute('data-settings-tab');
          paintSettings();
        }));
        paintSettings();
      }
    });
  }

  function openProfile() { settingsModal('profile'); }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aurelis-backup-' + todayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Đã xuất bản sao lưu', 'Tệp JSON chứa toàn bộ trạng thái ảo của bạn.', 'success', '⬇️');
  }

  function confirmAction(opts) {
    openModal({
      title: opts.title || 'Xác nhận', sub: opts.sub || '', size: 'modal-sm',
      body: '<div class="modal-note">' + (opts.body || '') + '</div>',
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn ' + (opts.danger ? 'btn-down' : 'btn-gold') + ' btn-sm" id="confirmYes">' + (opts.confirm || 'Xác nhận') + '</button>',
      onOpen: modal => {
        const yes = modal.querySelector('#confirmYes');
        if (yes) yes.addEventListener('click', () => { closeModal(); if (opts.onConfirm) opts.onConfirm(); });
      }
    });
  }

  /* ============================================================
     ONBOARDING · STYLE · COMMAND PALETTE · BOOT
     ============================================================ */
  const PLAYSTYLES = [
    { id: 'investor', icon: '🏛️', title: 'Nhà đầu tư bền vững', desc: 'Danh mục đa nhóm, nắm giữ dài hạn, ưu tiên quản trị rủi ro và phân bổ.', bonus: 'Nhận khung avatar Lục Bảo' },
    { id: 'trader', icon: '⚡', title: 'Trader linh hoạt', desc: 'Nhịp giao dịch ngắn, tận dụng biến động, kỷ luật stop-loss và quản trị vị thế.', bonus: 'Nhận gói XP ×2 · 24 giờ' },
    { id: 'analyst', icon: '🔬', title: 'Nhà phân tích', desc: 'Đọc dữ liệu, thử chiến lược, vẽ chart và tìm lợi thế từ thông tin.', bonus: 'Mở khoá Kính Lúp AURA' }
  ];

  function playstyleDef() { return PLAYSTYLES.find(p => p.id === state.playstyle) || PLAYSTYLES[0]; }

  function showWelcome() {
    const root = $('#modalRoot');
    if (!root) return;
    let step = 1;
    let name = state.username || 'Nhà giao dịch';
    let avatar = state.avatar || D.AVATARS[0];
    let capital = state.capital || 1000000000;
    let style = state.playstyle || 'investor';
    const left = '<div class="welcome-left"><div class="welcome-brand"><span class="brand-mark"><svg viewBox="0 0 64 64"><path d="M32 7 54 47l-9 10-13-8-13 8-9-10z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M20 42h24M32 24v30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span><div><b>AURELIS</b><small>MARKETS</small></div></div>' +
      '<div class="welcome-copy"><div class="eyebrow">PHÒNG TẬP ĐẦU TƯ CỦA BẠN</div><h1>Học cách<br><em>không thua</em><br>trước khi thắng.</h1>' +
      '<p>Giá thị trường thật, vốn hoàn toàn ảo. Thử HOSE, cổ phiếu Mỹ, crypto, forex, hàng hoá và phái sinh — rồi xây dựng kỷ luật bằng chính những quyết định của mình.</p>' +
      '<div class="welcome-features"><div class="welcome-feature"><span class="wf-icon">📡</span><div><b>Dữ liệu thật</b><span>Yahoo Finance & Binance, cập nhật liên tục.</span></div></div>' +
      '<div class="welcome-feature"><span class="wf-icon">⚡</span><div><b>Vốn ảo 1 tỷ ₫</b><span>Thử chiến lược, đo lường cảm xúc.</span></div></div>' +
      '<div class="welcome-feature"><span class="wf-icon">✦</span><div><b>Aura & danh hiệu</b><span>Thành tựu mở khoá phong cách riêng.</span></div></div>' +
      '<div class="welcome-feature"><span class="wf-icon">🛡️</span><div><b>Kỷ luật là trên hết</b><span>Không lời khuyên đầu tư. Không tiền thật.</span></div></div></div></div>' +
      '<div class="welcome-art"><svg viewBox="0 0 430 110" preserveAspectRatio="none"><defs><linearGradient id="welcomeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f3c56b" stop-opacity=".28"/><stop offset="1" stop-color="#f3c56b" stop-opacity="0"/></linearGradient></defs><path d="M0 84 C24 80 28 66 48 70 S76 52 98 58 126 32 150 40 176 62 200 48 226 24 252 30 282 44 306 32 334 14 360 20 400 9 430 6 L430 110 0 110Z" fill="url(#welcomeFill)"/><path d="M0 84 C24 80 28 66 48 70 S76 52 98 58 126 32 150 40 176 62 200 48 226 24 252 30 282 44 306 32 334 14 360 20 400 9 430 6" fill="none" stroke="#f3c56b" stroke-width="1.4" opacity=".8"/><circle cx="360" cy="20" r="3.5" fill="#f3c56b"/><circle cx="360" cy="20" r="7" fill="none" stroke="#f3c56b" opacity=".3"/></svg></div>' +
      '<div class="welcome-foot">AURELIS MARKETS · Vốn ảo, kỹ năng thật. Không phải lời khuyên đầu tư.</div></div>';
    function paint() {
      const panel = root.querySelector('#welcomePanel');
      if (!panel) return;
      if (step === 1) {
        panel.innerHTML = '<div class="step-label">BƯỚC 1 / 2 · HỒ SƠ</div><h2>Chào mừng đến AURELIS</h2><div class="sub">Đặt tên cho nhà giao dịch bên trong bạn và chọn số vốn khởi đầu.</div>' +
          '<div class="welcome-form"><div class="field"><label class="field-label" for="welcomeName">Tên hiển thị</label><input class="input" id="welcomeName" maxlength="28" value="' + esc(name) + '" placeholder="Nhà giao dịch"></div>' +
          '<div class="field"><label class="field-label">Avatar</label><div class="avatar-picker">' + D.AVATARS.map(av => '<button class="avatar-pick ' + (av === avatar ? 'active' : '') + '" data-welcome-avatar="' + av + '">' + av + '</button>').join('') + '</div></div>' +
          '<div class="field"><label class="field-label">Vốn khởi đầu</label><div class="capital-options">' + D.CAPITAL_PRESETS.map(c => '<button class="capital-option ' + (c.value === capital ? 'active' : '') + '" data-welcome-capital="' + c.value + '"><b>' + c.label + '</b><span>' + c.note + '</span></button>').join('') + '</div></div>' +
          '<div class="welcome-terms">Vốn ảo dùng để luyện tập. Không có tiền thật được nạp vào AURELIS.</div>' +
          '<button class="btn btn-gold btn-block welcome-start" id="welcomeNext">Tiếp tục · Chọn phong cách ' + icon('arrow-right') + '</button></div>';
        const input = panel.querySelector('#welcomeName');
        if (input) input.addEventListener('input', () => { name = input.value; });
        panel.querySelectorAll('[data-welcome-avatar]').forEach(b => b.addEventListener('click', () => { avatar = b.getAttribute('data-welcome-avatar'); panel.querySelectorAll('[data-welcome-avatar]').forEach(x => x.classList.toggle('active', x === b)); }));
        panel.querySelectorAll('[data-welcome-capital]').forEach(b => b.addEventListener('click', () => { capital = Number(b.getAttribute('data-welcome-capital')); panel.querySelectorAll('[data-welcome-capital]').forEach(x => x.classList.toggle('active', x === b)); }));
        panel.querySelector('#welcomeNext').addEventListener('click', () => {
          if (!name.trim()) name = 'Nhà giao dịch';
          step = 2; paint();
        });
      } else {
        panel.innerHTML = '<button class="welcome-back" id="welcomeBack">' + icon('arrow-left') + ' Quay lại</button><div class="step-label">BƯỚC 2 / 2 · PHONG CÁCH</div><h2>Bạn muốn chơi theo cách nào?</h2><div class="sub">Bạn có thể đổi phong cách bất cứ lúc nào trong phần Hồ sơ. Món quà khởi đầu chỉ nhận một lần.</div>' +
          '<div class="welcome-form"><div class="style-options">' + PLAYSTYLES.map(p => '<button class="style-option ' + (style === p.id ? 'active' : '') + '" data-welcome-style="' + p.id + '"><span class="style-icon">' + p.icon + '</span><div><b>' + p.title + '</b><span>' + p.desc + '</span><em>' + p.bonus + '</em></div><i>' + icon('check') + '</i></button>').join('') + '</div>' +
          '<div class="welcome-summary"><span>' + esc(avatar) + '</span><div><b>' + esc(name) + '</b><small>' + money(capital) + ' ₫ · ' + (PLAYSTYLES.find(p => p.id === style) || PLAYSTYLES[0]).title + '</small></div><span class="badge badge-gold">+500 Aura chào mừng</span></div>' +
          '<button class="btn btn-gold btn-block welcome-start" id="welcomeStart">Bắt đầu hành trình ' + icon('arrow-right') + '</button>' +
          '<div class="welcome-terms">Bằng việc bắt đầu, bạn hiểu đây là môi trường ảo phục vụ học tập, không phải lời khuyên đầu tư.</div></div>';
        panel.querySelectorAll('[data-welcome-style]').forEach(b => b.addEventListener('click', () => {
          style = b.getAttribute('data-welcome-style');
          panel.querySelectorAll('[data-welcome-style]').forEach(x => x.classList.toggle('active', x === b));
          const small = panel.querySelector('.welcome-summary small');
          if (small) small.innerHTML = money(capital) + ' ₫ · ' + (PLAYSTYLES.find(p => p.id === style) || PLAYSTYLES[0]).title;
        }));
        panel.querySelector('#welcomeBack').addEventListener('click', () => { step = 1; paint(); });
        panel.querySelector('#welcomeStart').addEventListener('click', () => completeOnboarding(name, avatar, capital, style));
      }
    }
    root.innerHTML = '<div class="welcome" id="welcomeOverlay">' + left + '<div class="welcome-right"><div class="welcome-panel" id="welcomePanel"></div></div></div>';
    paint();
  }

  function completeOnboarding(name, avatar, capital, style) {
    state.username = String(name || 'Nhà giao dịch').trim().slice(0, 28) || 'Nhà giao dịch';
    state.avatar = avatar;
    state.playstyle = style;
    state.onboarded = true;
    if (Number(capital) !== state.capital && (state.stats.trades || 0) === 0 && !Object.keys(state.holdings || {}).length && !(state.positions || []).length) {
      state.capital = Number(capital);
      state.initialCapital = Number(capital);
      state.cash = Number(capital);
      state.equityHistory = Array.from({ length: 10 }, (_, i) => ({ t: Date.now() - (9 - i) * 86400000, v: Number(capital) }));
    }
    state.aura += 500;
    if (style === 'investor') { grantItem('frame_emerald'); equipItem('frame_emerald', true); }
    if (style === 'trader') applyBoost('xp2');
    if (style === 'analyst') grantItem('perk_lens');
    pushNotif('🌅', 'Chào mừng đến AURELIS', 'Tài khoản ' + money(state.capital) + ' ₫ đã sẵn sàng. +500 Aura chào mừng!');
    toast('Chào mừng, ' + state.username + '!', 'Tài khoản ảo ' + money(state.capital) + ' ₫ đã sẵn sàng. Hãy bắt đầu bằng một lệnh nhỏ.', 'gold', '🌅');
    confetti(70);
    closeModal();
    saveNow();
    updateShell();
    renderRoute();
  }

  function openStylePicker() {
    let chosen = state.playstyle || 'investor';
    const body = '<div class="sub" style="font-size:10px;color:var(--dim);line-height:1.6;margin-bottom:12px">Phong cách chỉ thay đổi cách AURELIS gợi ý trải nghiệm — mọi thị trường và công cụ vẫn mở với bạn. Quà khởi đầu không được trao lại.</div>' +
      '<div class="style-options">' + PLAYSTYLES.map(p => '<button class="style-option ' + (chosen === p.id ? 'active' : '') + '" data-style-pick="' + p.id + '"><span class="style-icon">' + p.icon + '</span><div><b>' + p.title + '</b><span>' + p.desc + '</span></div><i>' + icon('check') + '</i></button>').join('') + '</div>';
    openModal({
      title: 'Phong cách giao dịch', sub: 'Chọn cách bạn muốn trải nghiệm AURELIS.', size: 'modal-lg', body,
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="styleSave">Lưu phong cách</button>',
      onOpen: modal => {
        modal.querySelectorAll('[data-style-pick]').forEach(b => b.addEventListener('click', () => {
          chosen = b.getAttribute('data-style-pick');
          modal.querySelectorAll('[data-style-pick]').forEach(x => x.classList.toggle('active', x === b));
        }));
        modal.querySelector('#styleSave').addEventListener('click', () => {
          state.playstyle = chosen;
          saveNow();
          closeModal();
          toast('Đã đổi phong cách', PLAYSTYLES.find(p => p.id === chosen).title, 'success', '✦');
          if (currentRoute === 'ranks') renderRoute();
        });
      }
    });
  }

  /* ------------------------------ COMPANY INTELLIGENCE ------------------------------ */
  let companyLoadToken = 0;

  function companyUniverse() {
    const groups = D.COMPANY_GROUPS || ['hose', 'us', 'etf'];
    return D.ASSETS.filter(a => a.yahoo && groups.includes(a.group));
  }

  function companyAsset() {
    ensureCompany();
    return byId[state.company.symbol] || companyUniverse()[0] || byId.vnm || D.ASSETS[0];
  }

  function companyPeerAssets(asset) {
    if (!asset) return [];
    const universe = companyUniverse().filter(a => a.id !== asset.id && a.yahoo);
    const overrides = (D.COMPANY_PEER_OVERRIDES && D.COMPANY_PEER_OVERRIDES[asset.yahoo]) || [];
    let list = overrides.map(sym => universe.find(a => a.yahoo === sym)).filter(Boolean);
    if (list.length < 2 && asset.group !== 'etf') {
      const sameSector = universe.filter(a => a.group === asset.group && a.sector && a.sector === asset.sector);
      if (sameSector.length >= 2) list = sameSector;
    }
    if (list.length < 2) {
      const sameGroup = universe.filter(a => a.group === asset.group);
      if (sameGroup.length >= 2) list = sameGroup.sort((a, b) => (b.cap || 0) - (a.cap || 0));
    }
    if (list.length < 2 && ['hose', 'hnx', 'upcom'].includes(asset.group)) {
      const vn = universe.filter(a => ['hose', 'hnx', 'upcom'].includes(a.group) && a.sector === asset.sector);
      if (vn.length >= 2) list = vn;
    }
    const seen = new Set();
    return list.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    }).slice(0, D.COMPANY_PEER_LIMIT || 5);
  }

  function companyPeerSymbols(asset) {
    return companyPeerAssets(asset).map(a => a.yahoo).filter(Boolean);
  }

  function companyAssetByYahoo(symbol) {
    return D.ASSETS.find(a => a.yahoo === symbol) || null;
  }

  function companySectorLabel(value) {
    if (!value) return 'Chưa phân loại';
    return (D.COMPANY_SECTOR_LABELS && D.COMPANY_SECTOR_LABELS[value]) || value;
  }

  function companyQuoteTypeLabel(type) {
    const map = {
      EQUITY: 'Cổ phiếu', ETF: 'ETF / Quỹ chỉ số', MUTUALFUND: 'Quỹ đầu tư',
      CRYPTOCURRENCY: 'Crypto', CURRENCY: 'Ngoại hối', FUTURE: 'Hợp đồng tương lai',
      INDEX: 'Chỉ số', COMMODITY: 'Hàng hoá'
    };
    return map[type] || type || 'Tài sản';
  }

  function companyCurrency(asset, data) {
    return (data && (data.currency || (data.summary && data.summary.currency))) || (asset && asset.currency) || 'USD';
  }

  function companyMoney(v, currency) {
    if (v == null || !isFinite(v)) return '—';
    if (currency === 'VND') return money(v) + ' ₫';
    const a = Math.abs(v);
    let s;
    if (a >= 1e12) s = nf(v / 1e12, 2) + 'T';
    else if (a >= 1e9) s = nf(v / 1e9, 2) + 'B';
    else if (a >= 1e6) s = nf(v / 1e6, 2) + 'M';
    else if (a >= 1e3) s = nf(v / 1e3, 1) + 'K';
    else s = nf(v, 2);
    return (currency === 'USD' ? '$' : currency + ' ') + s;
  }

  function companyCompact(v) {
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return nf(v / 1e12, 1) + 'T';
    if (a >= 1e9) return nf(v / 1e9, 1) + 'B';
    if (a >= 1e6) return nf(v / 1e6, 1) + 'M';
    if (a >= 1e3) return nf(v / 1e3, 0) + 'K';
    return nf(v, a < 10 ? 1 : 0);
  }

  function companyPrice(v, currency, dec) {
    if (v == null || !isFinite(v)) return '—';
    if (currency === 'VND') return nf(v, 0) + ' ₫';
    return (currency === 'USD' ? '$' : currency + ' ') + nf(v, dec == null ? 2 : dec);
  }

  function companyPct(v, dec) {
    if (v == null || !isFinite(v)) return '—';
    return nf(v * 100, dec == null ? 1 : dec) + '%';
  }

  function companyPctNum(v, dec) {
    if (v == null || !isFinite(v)) return '—';
    return nf(v, dec == null ? 1 : dec) + '%';
  }

  function companyRatio(v, dec) {
    if (v == null || !isFinite(v)) return '—';
    return nf(v, dec == null ? 2 : dec);
  }

  function companyMedian(values) {
    const list = (values || []).filter(v => isFinite(v)).sort((a, b) => a - b);
    if (!list.length) return null;
    const mid = Math.floor(list.length / 2);
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
  }

  function companyDateShort(value) {
    if (value == null || value === '') return '—';
    const s = String(value);
    if (/^Q\d\/\d{4}$/.test(s)) return s;
    if (/^\d{4}$/.test(s)) return s;
    return s.slice(0, 10);
  }

  function companyOptions(selected) {
    const universe = companyUniverse();
    const groups = [
      ['hose', 'Việt Nam · HOSE'],
      ['upcom', 'Việt Nam · UPCoM'],
      ['us', 'Hoa Kỳ · US'],
      ['etf', 'ETF & quỹ chỉ số']
    ];
    let html = '';
    if (selected && !universe.some(a => a.id === selected.id)) {
      html += '<optgroup label="Phân tích thị trường"><option value="' + selected.id + '" selected>' +
        esc(selected.symbol) + ' · ' + esc(selected.name) + '</option></optgroup>';
    }
    groups.forEach(g => {
      const list = universe.filter(a => a.group === g[0]).sort((a, b) => a.symbol.localeCompare(b.symbol));
      if (!list.length) return;
      html += '<optgroup label="' + g[1] + '">' + list.map(a =>
        '<option value="' + a.id + '"' + (selected && a.id === selected.id ? ' selected' : '') + '>' +
        esc(a.symbol) + ' · ' + esc(a.name) + '</option>').join('') + '</optgroup>';
    });
    return html;
  }

  /* ------------------------------ COMPANY NEWS ------------------------------ */
  let companyNewsToken = 0;
  let companyNewsBusy = false;
  let companyNewsLastAt = 0;
  let companyNewsState = { symbol: '', items: [], at: 0, mode: 'idle', source: '', fallback: '', error: '' };

  function companyNewsFallbackItems(asset) {
    const now = Date.now();
    const chg = asset.changePct || 0;
    const dir = chg > 0 ? 'tăng' : chg < 0 ? 'giảm' : 'đi ngang';
    const sector = companySectorLabel(asset.sector || '');
    const price = companyPrice(asset.price, asset.currency);
    return [
      {
        title: asset.symbol + ' cập nhật: giá ' + price + ', ' + dir + ' ' + nf(Math.abs(chg), 2) + '% phiên gần nhất',
        source: 'AURELIS Desk', time: new Date(now - 6 * 60000).toISOString(),
        desc: 'Cập nhật nhanh diễn biến giá và thanh khoản của ' + asset.name + '. Mở terminal để xem nến, chỉ báo và đặt lệnh mô phỏng.',
        link: '#/terminal', simulated: true, related: true
      },
      {
        title: (sector ? sector + ': ' : '') + 'dòng tiền và định giá của ' + asset.symbol + ' qua báo cáo tài chính',
        source: 'AURELIS Research', time: new Date(now - 41 * 60000).toISOString(),
        desc: 'Đọc doanh thu, biên lợi nhuận, dòng tiền tự do và so sánh cùng ngành để hiểu vì sao thị trường định giá ' + asset.symbol + ' ở mức hiện tại.',
        link: '#/company', simulated: true, related: true
      },
      {
        title: 'Danh mục tin cần theo dõi cho ' + asset.name + ' trong tuần',
        source: 'AURELIS Calendar', time: new Date(now - 2.2 * 3600000).toISOString(),
        desc: 'Lịch công bố kết quả kinh doanh, đại hội cổ đông và các mốc vĩ mô có thể ảnh hưởng tới ' + asset.symbol + '.',
        link: '#/wealth', simulated: true, related: true
      },
      {
        title: 'Quản trị rủi ro khi nắm giữ ' + asset.symbol + ': vị thế, cắt lỗ và thanh khoản',
        source: 'Học viện AURELIS', time: new Date(now - 5 * 3600000).toISOString(),
        desc: 'Khung kiểm tra nhanh trước khi tăng tỷ trọng: quy mô vị thế so với danh mục, mức lỗ chấp nhận và khả năng thoát hàng.',
        link: '#/library', simulated: true, related: true
      }
    ];
  }

  function companyNewsCardHTML(item) {
    const source = item.source || 'AURELIS';
    const tag = item.simulated
      ? '<span class="company-news-tag sim">MÔ PHỎNG</span>'
      : '<span class="company-news-tag live">LIÊN QUAN</span>';
    const desc = String(item.desc || '').trim();
    const rawHref = String(item.link || '').trim();
    const href = /^(?:#\/|\/(?!\/)|https?:\/\/)/i.test(rawHref) ? rawHref : '#/company';
    const external = /^https?:\/\//i.test(href);
    return '<a class="company-news-card" href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
      '<div class="company-news-top"><span class="company-news-source"><i></i>' + esc(source) + '</span><span class="company-news-time">' + timeAgo(item.time) + '</span></div>' +
      '<h3>' + esc(item.title) + '</h3>' +
      (desc.length > 18 ? '<p>' + esc(desc.slice(0, 180)) + (desc.length > 180 ? '…' : '') + '</p>' : '<p class="company-news-muted">Bấm để đọc bài gốc từ ' + esc(source) + '.</p>') +
      '<div class="company-news-foot">' + tag + '<span class="company-news-read">Đọc bài ' + icon('arrow-right') + '</span></div></a>';
  }

  function companyNewsSkeletonHTML() {
    return '<div class="company-news-grid">' + [1, 2, 3, 4].map(() =>
      '<div class="company-news-card is-skeleton"><div class="skeleton" style="height:10px;width:32%;margin-bottom:12px"></div>' +
      '<div class="skeleton" style="height:15px;width:92%;margin-bottom:8px"></div><div class="skeleton" style="height:15px;width:68%;margin-bottom:14px"></div>' +
      '<div class="skeleton" style="height:9px;width:100%;margin-bottom:6px"></div><div class="skeleton" style="height:9px;width:80%"></div></div>'
    ).join('') + '</div>';
  }

  function companyNewsStatusText() {
    const st = companyNewsState;
    if (!st.at) return 'Đang tải tin liên quan…';
    const at = new Date(st.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (st.mode === 'live') {
      return (st.source === 'google-news' ? 'Nguồn Google News' : 'Nguồn CafeF/VnExpress · đã lọc theo doanh nghiệp') + ' · cập nhật ' + at;
    }
    if (st.mode === 'sim') {
      return 'Chưa kết nối được nguồn tin · nội dung mô phỏng · ' + at;
    }
    return 'Cập nhật ' + at;
  }

  function renderCompanyNews() {
    const body = $('#companyNewsBody');
    const stamp = $('#companyNewsStamp');
    if (!body) return;
    const asset = companyAsset();
    const st = companyNewsState;
    if (stamp) stamp.textContent = companyNewsStatusText();
    if (st.symbol !== asset.symbol || (st.mode === 'loading' && !st.items.length)) {
      body.innerHTML = companyNewsSkeletonHTML();
      return;
    }
    const badge = st.mode === 'live'
      ? st.source === 'google-news'
        ? '<span class="badge badge-live">GOOGLE NEWS</span>'
        : '<span class="badge badge-gold">BÁO TÀI CHÍNH</span>'
      : st.mode === 'sim'
        ? '<span class="badge badge-down">MÔ PHỎNG</span>'
        : '<span class="badge">ĐANG TẢI</span>';
    const note = st.mode === 'live'
      ? st.source === 'google-news'
        ? 'Tin được tổng hợp tự động từ Google News theo tên và mã doanh nghiệp, làm mới mỗi 60 giây khi bật chế độ Tự động. Chỉ hiển thị bài liên quan tới doanh nghiệp. Bài viết thuộc bản quyền nguồn.'
        : 'Google News chưa trả về đủ bài cho mã này; hệ thống dùng feed CafeF/VnExpress và chỉ giữ bài khớp tên/mã doanh nghiệp. Bài viết thuộc bản quyền nguồn.'
      : 'Chưa lấy được bài viết thật cho mã này. Các tiêu đề bên dưới do AURELIS mô phỏng riêng cho ' + esc(asset.symbol) + ' để minh hoạ cách đọc tin — không phải bài báo thật.';
    body.innerHTML = '<div class="company-news-grid">' + st.items.map(companyNewsCardHTML).join('') + '</div>' +
      '<div class="company-news-note">' + icon('info') + ' <span>' + note + '</span>' + badge + '</div>';
  }

  async function refreshCompanyNews(force) {
    if (currentRoute !== 'company') return;
    if (companyNewsBusy) return;
    const asset = companyAsset();
    const token = ++companyNewsToken;
    companyNewsBusy = true;
    if (companyNewsState.symbol !== asset.symbol || !companyNewsState.items.length) {
      companyNewsState = { symbol: asset.symbol, items: [], at: 0, mode: 'loading', source: '', fallback: '', error: '' };
      renderCompanyNews();
    } else {
      const body = $('#companyNewsBody');
      if (body) body.classList.add('is-refreshing');
    }
    let data = null;
    try { data = await API.companyNews(asset, force); } catch (e) { data = null; }
    if (token !== companyNewsToken || currentRoute !== 'company') { companyNewsBusy = false; return; }
    companyNewsBusy = false;
    companyNewsLastAt = Date.now();
    const body = $('#companyNewsBody');
    if (body) body.classList.remove('is-refreshing');
    if (data && data.ok && Array.isArray(data.items) && data.items.length) {
      const relevant = data.items.filter(it => it && it.related !== false);
      if (relevant.length) {
        companyNewsState = {
          symbol: asset.symbol, items: relevant, at: data.at || Date.now(), mode: 'live',
          source: data.source || 'google-news', fallback: data.fallback || '', error: ''
        };
      } else {
        companyNewsState = {
          symbol: asset.symbol, items: companyNewsFallbackItems(asset), at: Date.now(), mode: 'sim',
          source: 'AURELIS', fallback: '', error: (data && data.error) || API.lastError || ''
        };
      }
    } else {
      companyNewsState = {
        symbol: asset.symbol, items: companyNewsFallbackItems(asset), at: Date.now(), mode: 'sim',
        source: 'AURELIS', fallback: '', error: (data && data.error) || API.lastError || ''
      };
    }
    renderCompanyNews();
  }

  function companyNewsSectionHTML(asset) {
    return '<section class="company-section company-news-section" id="companyNews"><div class="company-section-head"><div><div class="page-eyebrow">' + icon('message') + ' Tin liên quan</div>' +
      '<h2>Tin tức quanh ' + esc(asset.symbol) + '</h2><p>Bài viết mới nhất nhắc trực tiếp tới ' + esc(asset.name) + ' — không trộn tin toàn cảnh thị trường. Tự động làm mới mỗi 60 giây khi bật chế độ Tự động.</p></div>' +
      '<div class="company-news-head-actions"><span class="company-news-stamp" id="companyNewsStamp">Đang tải tin liên quan…</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="company-news-refresh">' + icon('refresh') + ' Làm mới tin</button></div></div>' +
      '<div id="companyNewsBody">' + companyNewsSkeletonHTML() + '</div></section>';
  }

  function companyHTML() {
    const asset = companyAsset();
    const universe = companyUniverse();
    return '<div class="page-head company-page-head"><div><div class="page-eyebrow">' + icon('building') + ' Báo cáo · Định giá · Đồng thuận</div><h1>Phân tích doanh nghiệp</h1>' +
      '<p class="sub">Báo cáo tài chính, định giá, đồng thuận chuyên gia, so sánh cùng ngành và nhiều biểu đồ phân tích trong cùng một màn hình. Dữ liệu Yahoo Finance, phần mô phỏng luôn được dán nhãn.</p></div>' +
      '<div class="head-actions company-head-actions"><div class="company-picker"><span class="company-picker-label">Mã đang phân tích</span>' +
      '<select id="companySelect" class="select company-select" aria-label="Chọn doanh nghiệp">' + companyOptions(asset) + '</select></div>' +
      '<button class="btn btn-ghost btn-sm company-auto-toggle' + (ensureCompany().auto ? ' on' : '') + '" data-action="company-auto" title="Tự động cập nhật giá mỗi 30 giây, tin tức mỗi 60 giây và báo cáo mỗi 5 phút">' + icon('refresh') + ' Tự động ' + (ensureCompany().auto ? 'BẬT' : 'TẮT') + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-action="company-refresh">' + icon('refresh') + ' Làm mới</button>' +
      '<button class="btn btn-gold btn-sm" data-action="trade" data-id="' + asset.id + '">' + icon('bolt') + ' Giao dịch</button></div></div>' +
      '<div class="company-section-nav">' +
      '<span class="company-universe-count">' + icon('layers') + ' ' + universe.length + ' doanh nghiệp & quỹ có dữ liệu</span>' +
      [['companyCharts', 'Biểu đồ'], ['companyFinancials', 'Tài chính'], ['companyValuation', 'Định giá'], ['companyConsensus', 'Đồng thuận'], ['companyPeers', 'So sánh'], ['companyProfile', 'Hồ sơ'], ['companyNews', 'Tin tức']].map(x =>
        '<button class="company-anchor" data-company-anchor="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div id="companyRoot">' + companySkeletonHTML(asset) + '</div>' +
      companyNewsSectionHTML(asset);
  }

  function companySkeletonHTML(asset) {
    return '<section class="company-hero company-hero-skeleton"><div class="company-hero-main"><div class="skeleton" style="width:64px;height:64px;border-radius:16px"></div>' +
      '<div style="flex:1"><div class="skeleton" style="height:18px;width:220px;margin-bottom:10px"></div><div class="skeleton" style="height:12px;width:320px;margin-bottom:8px"></div><div class="skeleton" style="height:10px;width:260px"></div></div></div>' +
      '<div style="width:210px"><div class="skeleton" style="height:30px;width:150px;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:100px"></div></div></section>' +
      '<div class="company-kpis">' + [1, 2, 3, 4, 5, 6, 7, 8].map(() => '<div class="company-kpi"><div class="skeleton" style="height:9px;width:70%;margin-bottom:10px"></div><div class="skeleton" style="height:18px;width:55%"></div></div>').join('') + '</div>' +
      '<div class="company-chart-grid">' + [1, 2, 3, 4, 5, 6].map(() => '<div class="company-chart-card"><div class="skeleton" style="height:12px;width:40%;margin-bottom:12px"></div><div class="skeleton" style="height:170px;border-radius:12px"></div></div>').join('') + '</div>' +
      '<div class="company-loading-note">' + icon('clock') + ' Đang tải báo cáo tài chính, đồng thuận và so sánh cùng ngành cho <b>' + esc(asset.symbol) + '</b>…</div>';
  }

  function mountCompany() {
    ensureCompany();
    const select = $('#companySelect');
    if (select) select.addEventListener('change', () => {
      state.company.symbol = select.value;
      save();
      renderRoute();
    });
    $$('[data-company-anchor]').forEach(btn => btn.addEventListener('click', () => {
      const target = document.getElementById(btn.getAttribute('data-company-anchor'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    loadCompanyData(false);
    refreshCompanyNews(false);
    startCompanyAuto();
  }

  function companyAutoTickPrice() {
    if (currentRoute !== 'company' || document.hidden) return;
    const asset = companyAsset();
    const root = $('#companyRoot');
    if (!asset || !root) return;
    const priceEl = root.querySelector('[data-company-price]');
    if (priceEl) {
      priceEl.textContent = companyPrice(asset.price, priceEl.getAttribute('data-company-currency') || asset.currency);
      flashPrice(priceEl, asset.price);
    }
    const changeEl = root.querySelector('[data-company-change]');
    if (changeEl) {
      const chg = asset.changePct || 0;
      changeEl.className = 'company-change ' + changeCls(chg);
      changeEl.textContent = (chg > 0 ? '▲ ' : chg < 0 ? '▼ ' : '') + fmtPct(chg);
    }
    const volEl = root.querySelector('[data-company-volume]');
    if (volEl) volEl.textContent = companyCompact(asset.volume);
    const stamp = root.querySelector('[data-company-updated]');
    if (stamp) stamp.textContent = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function softRefreshCompany() {
    if (currentRoute !== 'company' || companyAutoBusy) return;
    const y = window.scrollY;
    companyAutoBusy = true;
    loadCompanyData(false).finally(() => {
      companyAutoBusy = false;
      if (currentRoute === 'company') window.scrollTo(0, y);
    });
  }

  function startCompanyAuto() {
    if (companyAutoTimer) { clearInterval(companyAutoTimer); companyAutoTimer = null; }
    const c = ensureCompany();
    if (!c.auto || currentRoute !== 'company') return;
    companyAutoLastFund = Date.now();
    companyAutoTimer = setInterval(() => {
      if (currentRoute !== 'company' || document.hidden) return;
      companyAutoTickPrice();
      if (Date.now() - companyNewsLastAt >= 60 * 1000) {
        companyNewsLastAt = Date.now();
        refreshCompanyNews(false);
      }
      if (Date.now() - companyAutoLastFund >= 5 * 60 * 1000) {
        companyAutoLastFund = Date.now();
        softRefreshCompany();
      }
    }, 30000);
  }

  async function loadCompanyData(force) {
    ensureCompany();
    const asset = companyAsset();
    const token = ++companyLoadToken;
    const root = $('#companyRoot');
    if (!root) return;
    if (force) root.innerHTML = companySkeletonHTML(asset);
    if (API.ready) {
      try { await API.ready; } catch (e) { /* dùng fallback */ }
      if (token !== companyLoadToken || currentRoute !== 'company') return;
    }
    const peers = companyPeerSymbols(asset);
    const isCompany = !!(asset.yahoo && (D.COMPANY_GROUPS || []).includes(asset.group));
    const chartPromise = API.hasLive(asset)
      ? API.chart(asset, '1D', force).catch(() => null)
      : Promise.resolve(null);
    let data = null;
    if (isCompany) data = await API.company(asset, peers, force).catch(() => null);
    const candles = await chartPromise;
    if (token !== companyLoadToken || currentRoute !== 'company') return;
    if (isCompany && data && data.ok) {
      root.innerHTML = companyReportHTML(asset, data, candles, false);
      bindCompanyReport(asset, data, candles);
      return;
    }
    if (isCompany && data && data.reason === 'no-fundamentals') {
      root.innerHTML = companyMarketFallbackHTML(asset, candles, data.error || 'Yahoo không cung cấp báo cáo doanh nghiệp cho mã này.', true);
      bindCompanyMarketFallback(asset, candles);
      return;
    }
    if (isCompany) {
      const simulated = companySimulated(asset, peers);
      root.innerHTML = companyReportHTML(asset, simulated, candles, true);
      bindCompanyReport(asset, simulated, candles);
      return;
    }
    root.innerHTML = companyMarketFallbackHTML(asset, candles, 'Tài sản này không có báo cáo doanh nghiệp. AURELIS chuyển sang phân tích thị trường: xu hướng giá, động lượng và chỉ báo kỹ thuật.', false);
    bindCompanyMarketFallback(asset, candles);
  }

  function companySourceBanner(asset, data, simulated) {
    if (simulated) {
      return '<div class="company-source-banner warn">' + icon('alert') + '<div><b>Báo cáo mô phỏng có kiểm soát</b><span>Yahoo Finance chưa trả về đủ dữ liệu cho ' + esc(asset.symbol) + '. AURELIS tạo báo cáo minh hoạ từ vốn hoá, giá và các tham số nội bộ. Không dùng để ra quyết định đầu tư.</span></div><span class="badge badge-down">SIMULATED</span></div>';
    }
    const at = data && data.at ? new Date(data.at) : new Date();
    const when = String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0') + ' ' +
      String(at.getDate()).padStart(2, '0') + '/' + String(at.getMonth() + 1).padStart(2, '0');
    return '<div class="company-source-banner">' + icon('shield') + '<div><b>Dữ liệu Yahoo Finance</b><span>Báo cáo tài chính, chỉ số định giá và đồng thuận chuyên gia · cập nhật ' + when + ' · đồng tiền ' + esc(companyCurrency(asset, data)) + '.</span></div><span class="badge badge-live">LIVE</span></div>';
  }

  function companyReportHTML(asset, data, candles, simulated) {
    return companyHeroHTML(asset, data, simulated) +
      companySourceBanner(asset, data, simulated) +
      companyKpiHTML(asset, data) +
      '<section class="company-section" id="companyCharts"><div class="company-section-head"><div><div class="page-eyebrow">' + icon('chart') + ' 6 biểu đồ cùng lúc</div><h2>6 biểu đồ phân tích cùng lúc</h2><p>Xu hướng giá, doanh thu, biên lợi nhuận, dòng tiền, bảng cân đối và EPS — không cần chuyển tab.</p></div><span class="badge badge-gold">' + (simulated ? 'MÔ PHỎNG' : 'YAHOO LIVE') + '</span></div>' +
      companyChartsHTML(asset, data, candles) + '</section>' +
      '<div class="company-two-col"><div class="company-col-main">' +
      companyStatementsHTML(asset, data) +
      companyPeersHTML(asset, data) +
      '</div><aside class="company-col-side">' +
      companyScorecardHTML(asset, data) +
      companyValuationHTML(asset, data) +
      companyAnalystHTML(asset, data) +
      '</aside></div>' +
      companyProfileHTML(asset, data) +
      companyNotesHTML(asset, data);
  }

  function companyHeroHTML(asset, data, simulated) {
    const s = data.summary || {};
    const st = data.stats || {};
    const currency = companyCurrency(asset, data);
    const price = s.price != null ? s.price : asset.price;
    const chg = s.changePct != null ? s.changePct : asset.changePct;
    const type = companyQuoteTypeLabel(s.quoteType || data.quoteType);
    const sector = companySectorLabel(s.sector || asset.sector);
    const industry = s.industry || '';
    const employees = s.employees;
    const cap = s.marketCap || asset.cap;
    const live = !simulated && data.source === 'yahoo';
    const rangeLo = st.fiftyTwoWeekLow;
    const rangeHi = st.fiftyTwoWeekHigh;
    const rangePos = rangeLo != null && rangeHi != null && rangeHi > rangeLo
      ? clamp((price - rangeLo) / (rangeHi - rangeLo) * 100, 0, 100) : null;
    return '<section class="company-hero"><div class="company-hero-main"><div class="company-hero-logo">' + assetLogo(asset, 'xl') + '</div>' +
      '<div class="company-identity"><div class="company-symbol-row"><span class="company-symbol">' + esc(asset.symbol) + '</span>' +
      '<span class="exchange-tag">' + esc(s.exchange || asset.exchange) + '</span>' +
      (simulated ? '<span class="sim-tag">MÔ PHỎNG</span>' : live ? '<span class="badge badge-live">LIVE</span>' : '<span class="badge">' + esc(type) + '</span>') +
      (s.marketState ? '<span class="badge">' + esc(s.marketState === 'REGULAR' ? 'ĐANG GIAO DỊCH' : s.marketState === 'CLOSED' ? 'ĐÃ ĐÓNG CỬA' : s.marketState) + '</span>' : '') + '</div>' +
      '<h2>' + esc(s.name || asset.name) + '</h2>' +
      '<div class="company-tags"><span>' + icon('layers') + ' ' + esc(sector) + '</span>' + (industry ? '<span>' + esc(industry) + '</span>' : '') +
      (employees ? '<span>' + icon('users') + ' ' + nf(employees, 0) + ' nhân viên</span>' : '') +
      (s.country ? '<span>' + esc(s.country) + '</span>' : '') + '<span>' + esc(type) + '</span></div>' +
      '<div class="company-hero-actions"><button class="btn btn-xs btn-gold" data-action="trade" data-id="' + asset.id + '">' + icon('bolt') + ' Mua / Bán</button>' +
      '<button class="btn btn-xs btn-ghost" data-action="terminal" data-id="' + asset.id + '">' + icon('chart') + ' Terminal</button>' +
      '<button class="btn btn-xs btn-ghost" data-action="star" data-id="' + asset.id + '">' + icon('star') + ' Watchlist</button>' +
      '<button class="btn btn-xs btn-ghost" data-action="company-refresh">' + icon('refresh') + ' Cập nhật</button></div></div></div>' +
      '<div class="company-hero-price"><div class="company-price" data-company-price data-company-currency="' + esc(currency) + '">' + companyPrice(price, currency) + '</div>' +
      '<div class="company-change ' + changeCls(chg) + '" data-company-change>' + (chg > 0 ? '▲ ' : chg < 0 ? '▼ ' : '') + fmtPct(chg || 0) + '</div>' +
      '<div class="company-price-meta"><span>Vốn hoá <b>' + companyMoney(cap, currency) + '</b></span><span>KL <b data-company-volume>' + companyCompact(s.volume || asset.volume) + '</b></span>' +
      (ensureCompany().auto ? '<span class="company-auto-stamp">' + icon('refresh') + ' tự động · <em data-company-updated>' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</em></span>' : '') + '</div>' +
      (rangePos != null ? '<div class="company-range"><div class="company-range-labels"><span>52W thấp ' + companyPrice(rangeLo, currency) + '</span><span>Cao ' + companyPrice(rangeHi, currency) + '</span></div>' +
        '<div class="company-range-bar"><span class="company-range-fill" style="width:' + rangePos + '%"></span><span class="company-range-dot" style="left:' + rangePos + '%"></span></div></div>' : '') +
      '</div></section>';
  }

  function companyStatCard(label, value, sub, cls, iconName) {
    return '<div class="company-kpi"><div class="company-kpi-top"><span>' + esc(label) + '</span>' + (iconName ? icon(iconName) : '') + '</div>' +
      '<b class="company-kpi-value ' + (cls || '') + '">' + value + '</b><span class="company-kpi-sub">' + (sub || '') + '</span></div>';
  }

  function companyKpiHTML(asset, data) {
    const s = data.stats || {};
    const f = data.financials || {};
    const summary = data.summary || {};
    const currency = companyCurrency(asset, data);
    const isFund = (summary.quoteType || data.quoteType) === 'ETF' || !!data.fund;
    if (isFund) {
      const fund = data.fund || {};
      return '<div class="company-kpis">' +
        companyStatCard('Giá / NAV', companyPrice(summary.price, currency), 'Giá thị trường hiện tại', '', 'money') +
        companyStatCard('Tổng tài sản quỹ', companyMoney(s.totalAssets || fund.totalAssets, currency), fund.category || 'Danh mục quỹ', '', 'layers') +
        companyStatCard('Lợi suất YTD', s.ytdReturn != null ? companyPctNum(s.ytdReturn) : '—', 'Từ đầu năm', s.ytdReturn != null && s.ytdReturn > 0 ? 'up' : '', 'trendline') +
        companyStatCard('Lợi suất 3 năm', s.threeYearAverageReturn != null ? companyPctNum(s.threeYearAverageReturn) : '—', 'Trung bình mỗi năm', '', 'target') +
        companyStatCard('Lợi suất 5 năm', s.fiveYearAverageReturn != null ? companyPctNum(s.fiveYearAverageReturn) : '—', 'Trung bình mỗi năm', '', 'chart') +
        companyStatCard('Phí quản lý', fund.expenseRatio != null ? companyPct(fund.expenseRatio, 2) : '—', 'Expense ratio', '', 'file') +
        companyStatCard('P/E', companyRatio(s.trailingPE), 'Định giá quỹ', '', 'scale') +
        companyStatCard('Khối lượng TB', companyCompact(s.avgVolume), 'Thanh khoản 3 tháng', '', 'candles') +
        '</div>';
    }
    const fcf = f.freeCashflow;
    return '<div class="company-kpis">' +
      companyStatCard('P/E trailing', companyRatio(s.trailingPE), 'Giá / lợi nhuận 12 tháng', s.trailingPE != null && s.trailingPE < 15 ? 'up' : '', 'target') +
      companyStatCard('P/B', companyRatio(s.priceToBook), 'Giá / giá trị sổ sách', '', 'scale') +
      companyStatCard('EPS', companyPrice(s.trailingEps, currency), 'Lợi nhuận trên cổ phiếu', '', 'coin') +
      companyStatCard('ROE', companyPct(s.returnOnEquity), 'Lợi nhuận / vốn chủ', s.returnOnEquity != null && s.returnOnEquity > 0.15 ? 'up' : '', 'trophy') +
      companyStatCard('Doanh thu', companyMoney(s.totalRevenue || f.totalRevenue, currency), '12 tháng gần nhất', '', 'money') +
      companyStatCard('Biên lợi nhuận ròng', companyPct(s.profitMargins), 'Lợi nhuận / doanh thu', s.profitMargins != null && s.profitMargins > 0.1 ? 'up' : '', 'pie') +
      companyStatCard('Nợ / vốn chủ', companyRatio(s.debtToEquity), 'Đòn bẩy tài chính', s.debtToEquity != null && s.debtToEquity > 150 ? 'down' : '', 'leverage') +
      companyStatCard('Dòng tiền tự do', companyMoney(fcf, currency), fcf != null && fcf > 0 ? 'FCF dương · tạo tiền mặt' : 'FCF âm · cần theo dõi', fcf != null && fcf < 0 ? 'down' : 'up', 'money') +
      '</div>';
  }

  function companyYearlyRows(data) {
    const earn = (data.earnings && data.earnings.yearly) || [];
    const inc = (data.statements && data.statements.incomeAnnual) || [];
    if (earn.length >= 2 && earn.length >= inc.length) {
      return earn.map(r => ({
        date: r.date, revenue: r.revenue, netIncome: r.earnings,
        netMargin: r.profitMargin, grossMargin: null, operatingMargin: null
      }));
    }
    return inc;
  }

  function companyMarginRows(data) {
    const inc = (data.statements && data.statements.incomeAnnual) || [];
    const earn = (data.earnings && data.earnings.yearly) || [];
    if (!inc.length) {
      return earn.map(r => ({ date: r.date, gross: null, operating: null, net: r.profitMargin }));
    }
    return inc.map(r => {
      const e = earn.find(x => x.date === r.date);
      return {
        date: r.date,
        gross: r.grossMargin,
        operating: r.operatingMargin,
        net: r.netMargin != null ? r.netMargin : (e ? e.profitMargin : null)
      };
    });
  }

  function companyCashRows(data) {
    const rows = (data.statements && data.statements.cashAnnual) || [];
    const usable = rows.filter(r => r.ocf != null || r.fcf != null || r.capex != null);
    if (usable.length) return usable;
    const s = (data.statements && data.statements.cashSnapshot) || {};
    if (s.ocf != null || s.fcf != null || s.netIncome != null) {
      return [{ date: s.date || 'Hiện tại', ocf: s.ocf, fcf: s.fcf, capex: s.capex, dividends: s.dividends, netIncome: s.netIncome }];
    }
    return [];
  }

  function companyBalanceRows(data) {
    const rows = (data.statements && data.statements.balanceAnnual) || [];
    const usable = rows.filter(r => r.assets != null || r.liabilities != null || r.equity != null || r.cash != null || r.totalDebt != null);
    if (usable.length) return usable;
    const s = (data.statements && data.statements.balanceSnapshot) || {};
    if (s.assets != null || s.equity != null || s.cash != null) {
      return [{ date: s.date || 'Hiện tại', assets: s.assets, liabilities: s.liabilities, equity: s.equity, cash: s.cash, totalDebt: s.debt }];
    }
    return [];
  }

  function companyLegend(items) {
    return items.map(x => '<span class="company-legend-item"><i style="background:' + x[1] + '"></i>' + esc(x[0]) + '</span>').join('');
  }

  function companyChartCard(id, title, sub, legend, foot, height) {
    return '<article class="company-chart-card"><div class="company-chart-head"><div><b>' + title + '</b><span>' + sub + '</span></div>' +
      '<div class="company-chart-tools"><div class="company-legend">' + legend + '</div>' +
      '<button class="company-chart-zoom" data-action="company-chart-zoom" data-chart="' + id + '" data-title="' + esc(title) + '" data-sub="' + esc(sub) + '" aria-label="Phóng to biểu đồ" title="Phóng to biểu đồ">' + icon('external') + '</button></div></div>' +
      '<div class="company-canvas-wrap"><canvas id="' + id + '" class="company-canvas" style="height:' + (height || 188) + 'px"></canvas></div>' +
      (foot ? '<div class="company-chart-foot">' + foot + '</div>' : '') + '</article>';
  }

  function companyChartsHTML(asset, data, candles) {
    const currency = companyCurrency(asset, data);
    const yearly = companyYearlyRows(data);
    const quarter = (data.earnings && data.earnings.quarterly) || [];
    const surprise = (data.earnings && data.earnings.surprises) || [];
    const lastDate = yearly.length ? yearly[yearly.length - 1].date : '—';
    const priceFoot = candles && candles.length ? candles.length + ' phiên · nến ngày' : 'Dữ liệu mô phỏng nội bộ';
    const qTitle = surprise.length >= 2 ? 'EPS thực tế vs dự báo' : 'Doanh thu & lợi nhuận quý';
    const qSub = surprise.length >= 2 ? 'Các quý gần nhất' : '4 quý gần nhất';
    const qLegend = surprise.length >= 2
      ? companyLegend([['Thực tế', 'var(--up)'], ['Dự báo', 'var(--muted)']])
      : companyLegend([['Doanh thu', 'var(--gold)'], ['Lợi nhuận', 'var(--cyan)']]);
    return '<div class="company-chart-grid">' +
      companyChartCard('coPriceChart', 'Xu hướng giá & trung bình động', '2 năm · MA50 / MA200', companyLegend([['Giá', 'var(--gold)'], ['MA50', 'var(--cyan)'], ['MA200', 'var(--purple)']]), priceFoot, 206) +
      companyChartCard('coRevenueChart', 'Doanh thu & lợi nhuận', 'Theo năm · ' + esc(lastDate), companyLegend([['Doanh thu', 'var(--gold)'], ['Lợi nhuận ròng', 'var(--cyan)']]), 'Đơn vị: ' + esc(currency), 188) +
      companyChartCard('coMarginChart', 'Biên lợi nhuận', 'Xu hướng sinh lời', companyLegend([['Gộp', 'var(--purple)'], ['Hoạt động', 'var(--cyan)'], ['Ròng', 'var(--up)']]), 'Tỷ lệ trên doanh thu', 188) +
      companyChartCard('coCashChart', 'Dòng tiền', 'CFO · FCF · Capex', companyLegend([['CFO', 'var(--up)'], ['FCF', 'var(--gold)'], ['Capex', 'var(--down)']]), 'Capex thường âm', 188) +
      companyChartCard('coBalanceChart', 'Bảng cân đối', 'Tài sản · nợ · vốn chủ', companyLegend([['Tài sản', 'var(--cyan)'], ['Nợ phải trả', 'var(--down)'], ['Vốn chủ', 'var(--gold)']]), 'Snapshot mới nhất khi thiếu lịch sử', 188) +
      companyChartCard('coQuarterChart', qTitle, qSub, qLegend, quarter.length ? quarter.length + ' quý có dữ liệu' : 'Chưa đủ dữ liệu quý', 188) +
      '</div>';
  }

  function drawCompanyCharts(asset, data, candles) {
    const currency = companyCurrency(asset, data);
    let sourceCandles = candles && candles.length > 5 ? candles : D.generateCandles(asset, '1D', 280, asset.price);
    const closes = sourceCandles.map(c => c.c);
    const labels = sourceCandles.map(c => dateLabel(c.t));
    const sma50 = CH.indicators.sma(closes, 50);
    const sma200 = CH.indicators.sma(closes, 200);
    const priceCanvas = $('#coPriceChart');
    if (priceCanvas) {
      CH.MiniChart.multiLine(priceCanvas, [
        { values: closes, color: '#f3c56b', width: 2, fill: true, label: 'Giá' },
        { values: sma50, color: '#5ac8fa', width: 1.2, label: 'MA50' },
        { values: sma200, color: '#b59cff', width: 1.2, label: 'MA200' }
      ], { xLabels: labels, formatAxis: v => companyCompact(v), zero: false });
    }
    const yearly = companyYearlyRows(data);
    const revenueCanvas = $('#coRevenueChart');
    if (revenueCanvas) {
      CH.MiniChart.bars(revenueCanvas, [
        { label: 'Doanh thu', color: '#f3c56b', values: yearly.map(r => r.revenue) },
        { label: 'Lợi nhuận', color: '#5ac8fa', values: yearly.map(r => r.netIncome) }
      ], { xLabels: yearly.map(r => companyDateShort(r.date)), formatAxis: v => companyCompact(v) });
    }
    const margins = companyMarginRows(data);
    const marginCanvas = $('#coMarginChart');
    if (marginCanvas) {
      CH.MiniChart.multiLine(marginCanvas, [
        { values: margins.map(r => r.gross != null ? r.gross * 100 : null), color: '#b59cff', width: 1.5 },
        { values: margins.map(r => r.operating != null ? r.operating * 100 : null), color: '#5ac8fa', width: 1.5 },
        { values: margins.map(r => r.net != null ? r.net * 100 : null), color: '#2ee6a6', width: 2, fill: true }
      ], { xLabels: margins.map(r => companyDateShort(r.date)), formatAxis: v => nf(v, 0) + '%', zero: true });
    }
    const cash = companyCashRows(data);
    const cashCanvas = $('#coCashChart');
    if (cashCanvas) {
      CH.MiniChart.bars(cashCanvas, [
        { label: 'CFO', color: '#2ee6a6', values: cash.map(r => r.ocf) },
        { label: 'FCF', color: '#f3c56b', values: cash.map(r => r.fcf) },
        { label: 'Capex', color: '#ff5d73', values: cash.map(r => r.capex) }
      ], { xLabels: cash.map(r => companyDateShort(r.date)), formatAxis: v => companyCompact(v) });
    }
    const balance = companyBalanceRows(data);
    const balanceCanvas = $('#coBalanceChart');
    if (balanceCanvas) {
      CH.MiniChart.bars(balanceCanvas, [
        { label: 'Tài sản', color: '#5ac8fa', values: balance.map(r => r.assets) },
        { label: 'Nợ', color: '#ff5d73', values: balance.map(r => r.liabilities) },
        { label: 'Vốn chủ', color: '#f3c56b', values: balance.map(r => r.equity) }
      ], { xLabels: balance.map(r => companyDateShort(r.date)), formatAxis: v => companyCompact(v) });
    }
    const quarterCanvas = $('#coQuarterChart');
    if (quarterCanvas) {
      const surprise = (data.earnings && data.earnings.surprises) || [];
      if (surprise.length >= 2) {
        CH.MiniChart.bars(quarterCanvas, [
          { label: 'Thực tế', color: '#2ee6a6', values: surprise.map(r => r.actual) },
          { label: 'Dự báo', color: '#8798a0', values: surprise.map(r => r.estimate) }
        ], { xLabels: surprise.map(r => r.date), formatAxis: v => nf(v, 2) });
      } else {
        const q = (data.earnings && data.earnings.quarterly) || [];
        CH.MiniChart.bars(quarterCanvas, [
          { label: 'Doanh thu', color: '#f3c56b', values: q.map(r => r.revenue) },
          { label: 'Lợi nhuận', color: '#5ac8fa', values: q.map(r => r.earnings) }
        ], { xLabels: q.map(r => r.date), formatAxis: v => companyCompact(v) });
      }
    }
    const peerCanvas = $('#coPeerMap');
    if (peerCanvas) {
      const points = companyPeerPoints(asset, data);
      CH.MiniChart.scatter(peerCanvas, points, { xSuffix: 'x', ySuffix: '%', xLabel: 'P/E', yLabel: 'ROE' });
    }
  }

  function companyStatementRows(data) {
    const st = data.statements || {};
    const period = ensureCompany().period;
    const statement = ensureCompany().statement;
    const source = statement === 'balance'
      ? (period === 'annual' ? (st.balanceAnnual || []) : (st.balanceQuarterly || []))
      : statement === 'cash'
        ? (period === 'annual' ? (st.cashAnnual || []) : (st.cashQuarterly || []))
        : (period === 'annual' ? (st.incomeAnnual || []) : (st.incomeQuarterly || []));
    if (statement === 'balance') {
      return source.filter(r => r.assets != null || r.liabilities != null || r.equity != null || r.cash != null || r.totalDebt != null);
    }
    if (statement === 'cash') {
      return source.filter(r => r.ocf != null || r.fcf != null || r.capex != null);
    }
    return source.filter(r => r.revenue != null || r.netIncome != null);
  }

  function companyStatementBodyHTML(asset, data) {
    const currency = companyCurrency(asset, data);
    const statement = ensureCompany().statement;
    const period = ensureCompany().period;
    let rows = companyStatementRows(data);
    let note = '';
    if (statement === 'income' && !rows.length) {
      const yearly = companyYearlyRows(data);
      rows = yearly.map(r => ({ date: r.date, revenue: r.revenue, netIncome: r.netIncome, netMargin: r.netMargin, grossProfit: null, operatingIncome: null, eps: null }));
      if (rows.length) note = 'Dùng chuỗi doanh thu / lợi nhuận từ module earnings của Yahoo.';
    }
    if (statement === 'balance' && !rows.length) {
      const s = (data.statements && data.statements.balanceSnapshot) || {};
      if (s.assets != null || s.equity != null || s.cash != null) {
        rows = [{ date: s.date || 'Hiện tại', assets: s.assets, liabilities: s.liabilities, equity: s.equity, cash: s.cash, totalDebt: s.debt }];
        note = 'Yahoo không cung cấp lịch sử bảng cân đối; hiển thị snapshot mới nhất.';
      }
    }
    if (statement === 'cash' && !rows.length) {
      const s = (data.statements && data.statements.cashSnapshot) || {};
      if (s.ocf != null || s.fcf != null || s.netIncome != null) {
        rows = [{ date: s.date || 'Hiện tại', ocf: s.ocf, fcf: s.fcf, capex: s.capex, dividends: s.dividends, netIncome: s.netIncome }];
        note = 'Yahoo không cung cấp lịch sử lưu chuyển tiền tệ; hiển thị snapshot mới nhất.';
      }
    }
    if (!rows.length) {
      const isFund = ((data.summary && data.summary.quoteType) || data.quoteType) === 'ETF' || !!data.fund;
      if (isFund) {
        return '<div class="company-empty">' + icon('info') + '<div><b>Quỹ không có báo cáo tài chính doanh nghiệp</b><span>ETF/quỹ chỉ số không công bố doanh thu, lợi nhuận hay bảng cân đối như doanh nghiệp. Hãy xem chỉ số quỹ, biểu đồ giá và so sánh cùng ngành phía trên.</span></div></div>';
      }
      return '<div class="company-empty">' + icon('info') + '<div><b>Chưa có dữ liệu ' + (period === 'annual' ? 'theo năm' : 'theo quý') + '</b><span>Yahoo Finance không trả về bảng này cho ' + esc(asset.symbol) + '. Thử chuyển kỳ báo cáo hoặc xem các chỉ số phía trên.</span></div></div>';
    }
    const columns = statement === 'balance'
      ? [
          { key: 'assets', label: 'Tổng tài sản', cls: '' },
          { key: 'liabilities', label: 'Nợ phải trả', cls: 'down' },
          { key: 'equity', label: 'Vốn chủ', cls: 'gold' },
          { key: 'cash', label: 'Tiền mặt', cls: '' },
          { key: 'totalDebt', label: 'Nợ vay', cls: '' },
        ]
      : statement === 'cash'
        ? [
            { key: 'ocf', label: 'CFO', cls: 'signed' },
            { key: 'capex', label: 'Capex', cls: 'signed' },
            { key: 'fcf', label: 'FCF', cls: 'signed' },
            { key: 'dividends', label: 'Cổ tức', cls: '' },
            { key: 'netIncome', label: 'Lợi nhuận ròng', cls: '' },
          ]
        : [
            { key: 'revenue', label: 'Doanh thu', cls: '' },
            { key: 'grossProfit', label: 'Lợi nhuận gộp', cls: '' },
            { key: 'operatingIncome', label: 'Lợi nhuận HĐ', cls: '' },
            { key: 'netIncome', label: 'Lợi nhuận ròng', cls: 'signed' },
            { key: 'eps', label: 'EPS', cls: 'price' },
          ];
    /* Ẩn cột mà Yahoo không trả về cho bất kỳ kỳ nào — tránh bảng toàn dấu "—". */
    const visible = columns.filter(c => rows.some(r => r[c.key] != null));
    if (!visible.length) visible.push({ key: 'netIncome', label: 'Lợi nhuận ròng', cls: '' });
    const cellHTML = (row, col) => {
      if (col.key === 'eps') return companyPrice(row.eps, currency, currency === 'VND' ? 0 : 2);
      const txt = companyMoney(row[col.key], currency);
      if (col.cls === 'signed') return '<span class="' + changeCls(row[col.key] || 0) + '">' + txt + '</span>';
      return txt;
    };
    const table = '<div class="table-wrap"><table class="data-table company-statement-table"><thead><tr><th>Kỳ</th>' +
      visible.map(c => '<th class="text-right">' + c.label + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr><td class="strong">' + esc(companyDateShort(r.date)) + '</td>' +
        visible.map(c => '<td class="text-right mono ' + (c.cls === 'gold' ? 'gold' : '') + '">' + cellHTML(r, c) + '</td>').join('') +
        '</tr>').join('') + '</tbody></table></div>';
    return table + (note ? '<div class="company-table-note">' + icon('info') + ' ' + note + '</div>' : '');
  }

  function companyStatementsHTML(asset, data) {
    const period = ensureCompany().period;
    const statement = ensureCompany().statement;
    return '<section class="card company-card" id="companyFinancials"><div class="card-head"><div><div class="card-title">' + icon('file') + ' Báo cáo tài chính</div><div class="card-sub">Doanh thu, lợi nhuận, bảng cân đối và dòng tiền</div></div>' +
      '<div class="segmented company-period-toggle"><button class="seg ' + (period === 'annual' ? 'active gold' : '') + '" data-company-period="annual">Năm</button><button class="seg ' + (period === 'quarterly' ? 'active gold' : '') + '" data-company-period="quarterly">Quý</button></div></div>' +
      '<div class="company-statement-tabs"><button class="company-statement-tab ' + (statement === 'income' ? 'active' : '') + '" data-company-statement="income">' + icon('chart') + ' Kết quả kinh doanh</button>' +
      '<button class="company-statement-tab ' + (statement === 'balance' ? 'active' : '') + '" data-company-statement="balance">' + icon('layers') + ' Bảng cân đối</button>' +
      '<button class="company-statement-tab ' + (statement === 'cash' ? 'active' : '') + '" data-company-statement="cash">' + icon('money') + ' Lưu chuyển tiền</button></div>' +
      '<div id="companyStatementBody">' + companyStatementBodyHTML(asset, data) + '</div>' +
      '<div class="calc-note">Giá trị có thể được làm tròn theo đơn vị tiền tệ. Dữ liệu Yahoo Finance có thể thiếu với một số mã Việt Nam.</div></section>';
  }

  function companyScorecard(data) {
    const s = data.stats || {};
    const f = data.financials || {};
    const summary = data.summary || {};
    const isFund = (summary.quoteType || data.quoteType) === 'ETF' || !!data.fund;
    if (isFund) {
      const fund = data.fund || {};
      const currency = summary.currency || 'USD';
      const aum = s.totalAssets || fund.totalAssets;
      const size = aum > 0 ? clamp(50 + (Math.log10(aum) - 9) * 22, 15, 96) : 55;
      const volume = s.avgVolume;
      const liquidity = volume > 0 ? clamp(40 + Math.log10(volume / 1e5) * 20, 10, 96) : 55;
      const expense = fund.expenseRatio;
      const cost = expense != null ? clamp(100 - expense * 100 * 4500, 10, 96) : 55;
      const fundYield = s.dividendYield;
      const yieldScore = fundYield != null ? clamp(32 + fundYield * 100 * 15, 10, 95) : 55;
      const ytd = s.ytdReturn;
      const performance = ytd != null ? clamp(50 + ytd * 2.4, 5, 95) : 55;
      const chg52 = s.change52w != null ? s.change52w * 100 : 0;
      let momentum = 50 + chg52 * 1.1;
      if (s.fiftyDayAverage && summary.price) momentum += summary.price > s.fiftyDayAverage ? 8 : -8;
      if (s.twoHundredDayAverage && summary.price) momentum += summary.price > s.twoHundredDayAverage ? 8 : -8;
      momentum = clamp(momentum, 0, 100);
      const dims = [
        { key: 'cost', label: 'Chi phí', score: cost, note: expense != null ? 'Phí quản lý ' + companyPct(expense, 2) : 'Thiếu dữ liệu phí quản lý' },
        { key: 'size', label: 'Quy mô', score: size, note: aum != null ? 'Tổng tài sản ' + companyMoney(aum, currency) : 'Thiếu dữ liệu quy mô' },
        { key: 'liquidity', label: 'Thanh khoản', score: liquidity, note: volume != null ? 'KL trung bình ' + companyCompact(volume) : 'Thiếu dữ liệu khối lượng' },
        { key: 'yield', label: 'Lợi suất', score: yieldScore, note: fundYield != null ? 'Phân phối ' + companyPct(fundYield) : 'Không phân phối / thiếu dữ liệu' },
        { key: 'performance', label: 'Hiệu suất', score: performance, note: ytd != null ? 'YTD ' + companyPctNum(ytd) : 'Thiếu dữ liệu YTD' },
        { key: 'momentum', label: 'Động lượng', score: momentum, note: '52 tuần ' + companyPct(s.change52w) + ' · so với MA50/200' }
      ];
      const weights = { cost: 0.25, size: 0.20, liquidity: 0.15, yield: 0.15, performance: 0.15, momentum: 0.10 };
      const overall = Math.round(dims.reduce((sum, d) => sum + d.score * weights[d.key], 0));
      const grade = overall >= 85 ? 'A+' : overall >= 75 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : overall >= 35 ? 'D' : 'E';
      return { overall, grade, dims, isFund: true };
    }
    const peers = data.peers || [];
    const peerPE = companyMedian(peers.map(p => p.trailingPE).filter(v => v > 0));
    const refPE = peerPE || 15;
    let valuation = 50;
    if (s.trailingPE != null && s.trailingPE > 0) {
      const rel = s.trailingPE / refPE;
      valuation = clamp(95 - (rel - 1) * 45, 5, 95);
    }
    const revGrowth = s.revenueGrowth != null ? s.revenueGrowth * 100 : 0;
    const earnGrowth = s.earningsGrowth != null ? s.earningsGrowth * 100 : revGrowth;
    const growth = clamp(50 + revGrowth * 1.3 + earnGrowth * 0.9, 0, 100);
    const roe = (s.returnOnEquity || 0) * 100;
    const netMargin = (s.profitMargins || 0) * 100;
    const grossMargin = (s.grossMargins || 0) * 100;
    const profitability = clamp(roe * 1.5 + netMargin * 1.1 + grossMargin * 0.35, 0, 100);
    const de = s.debtToEquity != null ? s.debtToEquity : 50;
    const current = s.currentRatio != null ? s.currentRatio : 1;
    const fcf = f.freeCashflow;
    const health = clamp(92 - de * 0.55 + (current - 1) * 12 + (fcf != null && fcf > 0 ? 12 : -8), 0, 100);
    const dividend = clamp(20 + (s.dividendYield || 0) * 100 * 13, 0, 100);
    const chg52 = s.change52w != null ? s.change52w * 100 : 0;
    const price = (data.summary && data.summary.price) || 0;
    let momentum = 50 + chg52 * 1.1;
    if (s.fiftyDayAverage && price) momentum += price > s.fiftyDayAverage ? 8 : -8;
    if (s.twoHundredDayAverage && price) momentum += price > s.twoHundredDayAverage ? 8 : -8;
    momentum = clamp(momentum, 0, 100);
    const dims = [
      { key: 'valuation', label: 'Định giá', score: valuation, note: s.trailingPE != null ? 'P/E ' + companyRatio(s.trailingPE) + ' so với cùng ngành ' + companyRatio(refPE) : 'Thiếu P/E' },
      { key: 'growth', label: 'Tăng trưởng', score: growth, note: 'Doanh thu ' + companyPct(s.revenueGrowth) + ' · LN ' + companyPct(s.earningsGrowth) },
      { key: 'profit', label: 'Sinh lời', score: profitability, note: 'ROE ' + companyPct(s.returnOnEquity) + ' · biên ròng ' + companyPct(s.profitMargins) },
      { key: 'health', label: 'Sức khoẻ tài chính', score: health, note: 'Nợ/Vốn ' + companyRatio(s.debtToEquity) + ' · thanh toán hiện hành ' + companyRatio(s.currentRatio) },
      { key: 'dividend', label: 'Cổ tức', score: dividend, note: s.dividendYield != null ? 'Tỷ suất ' + companyPct(s.dividendYield) : 'Không trả cổ tức / thiếu dữ liệu' },
      { key: 'momentum', label: 'Động lượng', score: momentum, note: '52 tuần ' + companyPct(s.change52w) + ' · so với MA50/200' }
    ];
    const weights = { valuation: 0.20, growth: 0.20, profit: 0.20, health: 0.20, dividend: 0.10, momentum: 0.10 };
    const overall = Math.round(dims.reduce((sum, d) => sum + d.score * weights[d.key], 0));
    const grade = overall >= 85 ? 'A+' : overall >= 75 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : overall >= 35 ? 'D' : 'E';
    return { overall, grade, dims };
  }

  function companyScorecardHTML(asset, data) {
    const score = companyScorecard(data);
    const isFund = !!score.isFund;
    return '<section class="card company-card company-score-card"><div class="card-head"><div><div class="card-title">' + icon('shield') + (isFund ? ' Điểm quỹ' : ' Điểm chất lượng') + '</div><div class="card-sub">6 nhóm tiêu chí · thang 100</div></div><span class="badge ' + (score.overall >= 65 ? 'badge-up' : score.overall >= 45 ? 'badge-gold' : 'badge-down') + '">' + score.grade + '</span></div>' +
      '<div class="company-score-hero"><div class="company-grade grade-' + score.grade.replace('+', 'plus') + '"><b>' + score.grade + '</b><span>' + score.overall + '/100</span></div>' +
      '<div class="company-score-copy"><b>' + (score.overall >= 75 ? (isFund ? 'Quỹ chất lượng cao' : 'Chất lượng cao') : score.overall >= 60 ? 'Khá cân bằng' : score.overall >= 45 ? 'Cần theo dõi' : 'Nhiều điểm cần lưu ý') + '</b><span>' + (isFund ? 'Điểm tổng hợp từ chi phí, quy mô, thanh khoản, lợi suất, hiệu suất và động lượng giá. Chỉ mang tính tham khảo.' : 'Điểm tổng hợp từ định giá, tăng trưởng, sinh lời, sức khoẻ tài chính, cổ tức và động lượng giá. Chỉ mang tính tham khảo.') + '</span></div></div>' +
      '<div class="company-score-dims">' + score.dims.map(d => '<div class="company-score-dim"><div class="csd-top"><span>' + esc(d.label) + '</span><b>' + Math.round(d.score) + '</b></div><div class="company-score-bar"><span style="width:' + d.score + '%"></span></div><div class="csd-note">' + esc(d.note) + '</div></div>').join('') + '</div></section>';
  }

  function companyDcfCalc(data, override) {
    const cfg = Object.assign({}, ensureCompany().dcf, override || {});
    const growth = Number(cfg.growth) / 100;
    const discount = Number(cfg.discount) / 100;
    const terminal = Number(cfg.terminal) / 100;
    const years = Math.max(1, Math.min(15, Math.round(Number(cfg.years) || 5)));
    const fin = data.financials || {};
    const stats = data.stats || {};
    const shares = stats.sharesOutstanding;
    let baseFcf = fin.freeCashflow;
    if (baseFcf == null || baseFcf <= 0) baseFcf = fin.operatingCashflow != null ? fin.operatingCashflow * 0.75 : (stats.netIncome != null ? stats.netIncome * 0.75 : null);
    const netDebt = (stats.totalDebt || 0) - (stats.totalCash || 0);
    const price = (data.summary && data.summary.price) || 0;
    if (baseFcf == null || baseFcf <= 0 || !shares || discount <= terminal) {
      return { valid: false, baseFcf, shares, price, netDebt, growth, discount, terminal, years, intrinsic: null, upside: null, margin: null, fcfYield: null, rows: [] };
    }
    let fcf = baseFcf;
    let pv = 0;
    const rows = [];
    for (let i = 1; i <= years; i++) {
      fcf *= 1 + growth;
      const discounted = fcf / Math.pow(1 + discount, i);
      pv += discounted;
      rows.push({ year: i, fcf, discounted });
    }
    const terminalValue = fcf * (1 + terminal) / (discount - terminal);
    const pvTerminal = terminalValue / Math.pow(1 + discount, years);
    const equityValue = pv + pvTerminal - netDebt;
    const intrinsic = equityValue / shares;
    const upside = price > 0 ? (intrinsic / price - 1) * 100 : null;
    const margin = intrinsic > 0 ? (intrinsic - price) / intrinsic * 100 : null;
    const fcfYield = data.summary && data.summary.marketCap ? baseFcf / data.summary.marketCap * 100 : null;
    return { valid: intrinsic > 0, baseFcf, shares, price, netDebt, growth, discount, terminal, years, intrinsic, upside, margin, fcfYield, rows, equityValue, pv, pvTerminal };
  }

  function companyDcfOutputHTML(asset, data, calc) {
    const currency = companyCurrency(asset, data);
    if (!calc.valid) {
      return '<div class="company-empty">' + icon('alert') + '<div><b>Chưa đủ dữ liệu để định giá DCF</b><span>Cần FCF dương, số cổ phiếu lưu hành và lãi suất chiết khấu lớn hơn tăng trưởng vĩnh viễn. Hãy thử giảm lãi suất chiết khấu hoặc dùng phương pháp so sánh P/E bên dưới.</span></div></div>';
    }
    const marginCls = calc.margin > 0 ? 'up' : 'down';
    return '<div class="dcf-result"><div class="dcf-result-main"><span>Giá trị nội tại / cổ phiếu</span><b>' + companyPrice(calc.intrinsic, currency) + '</b><span class="' + marginCls + '">' + (calc.upside >= 0 ? '▲ ' : '▼ ') + companyPctNum(calc.upside) + ' so với giá hiện tại</span></div>' +
      '<div class="dcf-result-grid"><div><span>Giá hiện tại</span><b>' + companyPrice(calc.price, currency) + '</b></div><div><span>Biên an toàn</span><b class="' + marginCls + '">' + companyPctNum(calc.margin) + '</b></div><div><span>FCF cơ sở</span><b>' + companyMoney(calc.baseFcf, currency) + '</b></div><div><span>FCF yield</span><b>' + companyPctNum(calc.fcfYield) + '</b></div></div></div>' +
      '<div class="dcf-note">' + icon('info') + ' Giả định: FCF tăng ' + nf(calc.growth * 100, 1) + '%/năm trong ' + calc.years + ' năm, chiết khấu ' + nf(calc.discount * 100, 1) + '%, tăng trưởng vĩnh viễn ' + nf(calc.terminal * 100, 1) + '%. Nợ ròng ' + companyMoney(calc.netDebt, currency) + '.</div>';
  }

  function companyDcfSensitivityHTML(asset, data, calc) {
    if (!calc.valid) return '';
    const cfg = ensureCompany().dcf;
    const currency = companyCurrency(asset, data);
    const discounts = [Number(cfg.discount) - 2, Number(cfg.discount), Number(cfg.discount) + 2];
    const growths = [Number(cfg.growth) - 2, Number(cfg.growth), Number(cfg.growth) + 2];
    return '<div class="dcf-sensitivity"><div class="dcf-sensitivity-head"><b>Độ nhạy giá trị nội tại</b><span>Lãi suất chiết khấu × tăng trưởng FCF</span></div>' +
      '<div class="table-wrap"><table class="data-table dcf-table"><thead><tr><th>Chiết khấu</th>' + growths.map(g => '<th class="text-right">' + nf(g, 1) + '%</th>').join('') + '</tr></thead><tbody>' +
      discounts.map(d => '<tr><td class="strong">' + nf(d, 1) + '%</td>' + growths.map(g => {
        const c = companyDcfCalc(data, { discount: d, growth: g });
        const active = Math.abs(d - cfg.discount) < 0.01 && Math.abs(g - cfg.growth) < 0.01;
        return '<td class="text-right mono ' + (active ? 'gold' : '') + '">' + (c.valid ? companyPrice(c.intrinsic, currency) : '—') + '</td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div></div>';
  }

  function companyFundValuationHTML(asset, data) {
    const s = data.stats || {};
    const fund = data.fund || {};
    const summary = data.summary || {};
    const currency = companyCurrency(asset, data);
    const nav = s.navPrice;
    const price = summary.price;
    const premium = nav && price ? (price / nav - 1) : null;
    const peers = data.peers || [];
    const peerPE = companyMedian(peers.map(p => p.trailingPE).filter(v => v > 0));
    const peVsPeers = s.trailingPE != null && peerPE ? s.trailingPE / peerPE - 1 : null;
    const premiumCopy = premium == null
      ? 'Yahoo Finance chưa cung cấp NAV gần nhất cho quỹ này.'
      : Math.abs(premium) < 0.002
        ? 'Giá đang bám sát NAV — chênh lệch không đáng kể.'
        : premium > 0
          ? 'Giá đang cao hơn NAV ' + companyPctNum(premium * 100) + ' — cần thận trọng khi mua đuổi.'
          : 'Giá đang thấp hơn NAV ' + companyPctNum(Math.abs(premium) * 100) + ' — có thể là cơ hội nếu thanh khoản tốt.';
    return '<section class="card company-card" id="companyValuation"><div class="card-head"><div><div class="card-title">' + icon('scale') + ' Định giá quỹ</div><div class="card-sub">NAV, P/E và lợi suất · không dùng DCF doanh nghiệp</div></div><span class="badge badge-cyan">FUND</span></div>' +
      '<div class="dcf-result"><div class="dcf-result-main"><span>Chênh lệch giá / NAV</span><b class="' + (premium != null && premium > 0 ? 'down' : premium != null && premium < 0 ? 'up' : 'gold') + '">' + (premium != null ? (premium > 0 ? '+' : '') + companyPctNum(premium * 100, 2) : '—') + '</b><span class="dim">' + premiumCopy + '</span></div>' +
      '<div class="dcf-result-grid"><div><span>NAV gần nhất</span><b>' + companyPrice(nav, currency) + '</b></div>' +
      '<div><span>P/E so với cùng ngành</span><b class="' + (peVsPeers != null && peVsPeers > 0.15 ? 'down' : peVsPeers != null && peVsPeers < -0.15 ? 'up' : '') + '">' + (peVsPeers != null ? (peVsPeers > 0 ? '+' : '') + companyPctNum(peVsPeers * 100) : '—') + '</b></div>' +
      '<div><span>Lợi suất phân phối</span><b>' + companyPct(s.dividendYield) + '</b></div>' +
      '<div><span>Tổng tài sản quỹ</span><b>' + companyMoney(s.totalAssets || fund.totalAssets, currency) + '</b></div></div></div>' +
      '<div class="dcf-note">' + icon('info') + ' ETF/quỹ chỉ số không có dòng tiền tự do và số cổ phiếu lưu hành như doanh nghiệp, nên DCF không phù hợp. Hãy so sánh NAV, phí quản lý, thanh khoản và hiệu suất dài hạn.</div></section>';
  }

  function companyValuationHTML(asset, data) {
    const isFund = ((data.summary && data.summary.quoteType) || data.quoteType) === 'ETF' || !!data.fund;
    if (isFund) return companyFundValuationHTML(asset, data);
    const cfg = ensureCompany().dcf;
    const calc = companyDcfCalc(data);
    return '<section class="card company-card" id="companyValuation"><div class="card-head"><div><div class="card-title">' + icon('calculator') + ' Định giá DCF</div><div class="card-sub">Chiết khấu dòng tiền tự do · kịch bản của bạn</div></div><span class="badge badge-cyan">DCF</span></div>' +
      '<div class="dcf-grid"><div class="field"><label class="field-label" for="dcfGrowth">Tăng trưởng FCF</label><div class="input-suffix"><input class="input mono" id="dcfGrowth" data-dcf="growth" type="number" step="0.5" min="-20" max="60" value="' + cfg.growth + '"><span>%</span></div></div>' +
      '<div class="field"><label class="field-label" for="dcfDiscount">Chiết khấu</label><div class="input-suffix"><input class="input mono" id="dcfDiscount" data-dcf="discount" type="number" step="0.5" min="1" max="50" value="' + cfg.discount + '"><span>%</span></div></div>' +
      '<div class="field"><label class="field-label" for="dcfTerminal">Tăng trưởng vĩnh viễn</label><div class="input-suffix"><input class="input mono" id="dcfTerminal" data-dcf="terminal" type="number" step="0.5" min="0" max="10" value="' + cfg.terminal + '"><span>%</span></div></div>' +
      '<div class="field"><label class="field-label" for="dcfYears">Số năm dự phóng</label><div class="input-suffix"><input class="input mono" id="dcfYears" data-dcf="years" type="number" step="1" min="1" max="15" value="' + cfg.years + '"><span>năm</span></div></div></div>' +
      '<div id="dcfOutput">' + companyDcfOutputHTML(asset, data, calc) + '</div>' +
      '<div id="dcfSensitivity">' + companyDcfSensitivityHTML(asset, data, calc) + '</div>' +
      '<div class="calc-note">DCF là mô hình giả định, rất nhạy với lãi suất chiết khấu và tăng trưởng. Không phải giá mục tiêu hay khuyến nghị mua bán.</div></section>';
  }

  function companyAnalystHTML(asset, data) {
    const a = data.analyst || {};
    const currency = companyCurrency(asset, data);
    const price = (data.summary && data.summary.price) || asset.price;
    const hasTargets = a.targetLow != null && a.targetHigh != null && a.targetHigh > a.targetLow;
    const hasTrend = a.trend && (a.trend.strongBuy + a.trend.buy + a.trend.hold + a.trend.sell + a.trend.strongSell) > 0;
    if (!hasTargets && !hasTrend) {
      return '<section class="card company-card" id="companyConsensus"><div class="card-head"><div><div class="card-title">' + icon('users') + ' Đồng thuận chuyên gia</div><div class="card-sub">Khuyến nghị & giá mục tiêu</div></div></div><div class="company-empty">' + icon('info') + '<div><b>Chưa đủ dữ liệu đồng thuận</b><span>Yahoo Finance không có đủ chuyên gia theo dõi mã này. Hãy tham khảo báo cáo tài chính và so sánh cùng ngành.</span></div></div></section>';
    }
    const keyMap = { strong_buy: 'Mua mạnh', buy: 'Mua', hold: 'Giữ', underperform: 'Kém khả quan', sell: 'Bán', strong_sell: 'Bán mạnh' };
    const key = keyMap[a.key] || (a.mean != null ? (a.mean <= 1.5 ? 'Mua mạnh' : a.mean <= 2.5 ? 'Mua' : a.mean <= 3.5 ? 'Giữ' : 'Bán') : 'Chưa rõ');
    const lo = Math.min(a.targetLow != null ? a.targetLow : price, price);
    const hi = Math.max(a.targetHigh != null ? a.targetHigh : price, price);
    const pos = v => hi > lo ? clamp((v - lo) / (hi - lo) * 100, 0, 100) : 50;
    const trend = a.trend || { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };
    const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
    const seg = (v, color) => total ? '<span style="width:' + (v / total * 100) + '%;background:' + color + '" title="' + v + '"></span>' : '';
    const upside = a.targetMean != null && price ? (a.targetMean / price - 1) * 100 : null;
    return '<section class="card company-card" id="companyConsensus"><div class="card-head"><div><div class="card-title">' + icon('users') + ' Đồng thuận chuyên gia</div><div class="card-sub">' + (a.count ? a.count + ' chuyên gia theo dõi' : 'Khuyến nghị tổng hợp') + '</div></div><span class="badge ' + (key === 'Mua' || key === 'Mua mạnh' ? 'badge-up' : key === 'Bán' || key === 'Bán mạnh' ? 'badge-down' : 'badge-gold') + '">' + esc(key) + '</span></div>' +
      '<div class="analyst-summary"><div class="analyst-mean"><span>Điểm khuyến nghị</span><b>' + companyRatio(a.mean, 2) + '</b><span class="dim">1 = mua mạnh · 5 = bán mạnh</span></div>' +
      '<div class="analyst-target"><span>Giá mục tiêu trung bình</span><b>' + companyPrice(a.targetMean, currency) + '</b><span class="' + changeCls(upside) + '">' + (upside >= 0 ? '▲ ' : '▼ ') + companyPctNum(upside) + ' upside</span></div></div>' +
      (hasTargets ? '<div class="target-range"><div class="target-range-labels"><span>Thấp ' + companyPrice(a.targetLow, currency) + '</span><span>Cao ' + companyPrice(a.targetHigh, currency) + '</span></div><div class="target-range-track">' +
        '<span class="target-range-zone" style="left:' + pos(a.targetLow) + '%;width:' + Math.max(1, pos(a.targetHigh) - pos(a.targetLow)) + '%"></span>' +
        '<span class="target-range-marker mean" style="left:' + pos(a.targetMean != null ? a.targetMean : price) + '%" title="Mục tiêu TB"></span>' +
        '<span class="target-range-marker price" style="left:' + pos(price) + '%" title="Giá hiện tại"></span></div>' +
        '<div class="target-range-note"><span><i class="dot gold"></i>Giá hiện tại ' + companyPrice(price, currency) + '</span><span><i class="dot cyan"></i>Mục tiêu TB ' + companyPrice(a.targetMean, currency) + '</span></div></div>' : '') +
      (total ? '<div class="analyst-trend"><div class="analyst-trend-bar">' + seg(trend.strongBuy, 'var(--up)') + seg(trend.buy, '#63d6a4') + seg(trend.hold, 'var(--gold)') + seg(trend.sell, '#ff9f43') + seg(trend.strongSell, 'var(--down)') + '</div>' +
        '<div class="analyst-trend-legend"><span><i class="dot up"></i>Mua mạnh ' + trend.strongBuy + '</span><span><i class="dot up" style="opacity:.6"></i>Mua ' + trend.buy + '</span><span><i class="dot gold"></i>Giữ ' + trend.hold + '</span><span><i class="dot down" style="opacity:.7"></i>Bán ' + trend.sell + '</span><span><i class="dot down"></i>Bán mạnh ' + trend.strongSell + '</span></div></div>' : '') +
      (data.earnings && data.earnings.surprises && data.earnings.surprises.length ? '<div class="earnings-surprise-list">' + data.earnings.surprises.slice(-4).map(s => '<div class="earnings-surprise-row"><span>' + esc(s.date) + '</span><b class="' + changeCls(s.surprisePct) + '">' + companyPctNum(s.surprisePct) + '</b><span class="dim">EPS ' + companyRatio(s.actual, 2) + ' / dự báo ' + companyRatio(s.estimate, 2) + '</span></div>').join('') + '</div>' : '') +
      '<div class="calc-note">Đồng thuận chuyên gia là quan điểm của bên thứ ba, không phải khuyến nghị của AURELIS.</div></section>';
  }

  function companyPeerPoints(asset, data) {
    const points = [];
    const s = data.stats || {};
    const price = (data.summary && data.summary.price) || asset.price;
    if (s.trailingPE != null && s.trailingPE > 0 && s.returnOnEquity != null) {
      points.push({ x: s.trailingPE, y: s.returnOnEquity * 100, label: asset.symbol, color: '#f3c56b', r: Math.sqrt(Math.max(1, (data.summary && data.summary.marketCap) || asset.cap || 1)) });
    }
    (data.peers || []).forEach(p => {
      if (p.trailingPE != null && p.trailingPE > 0 && p.returnOnEquity != null) {
        points.push({ x: p.trailingPE, y: p.returnOnEquity * 100, label: p.symbol, color: '#5ac8fa', r: Math.sqrt(Math.max(1, p.marketCap || 1)) });
      }
    });
    return points;
  }

  function companyPeersHTML(asset, data) {
    const peers = data.peers || [];
    if (!peers.length) {
      return '<section class="card company-card" id="companyPeers"><div class="card-head"><div><div class="card-title">' + icon('users') + ' So sánh cùng ngành</div><div class="card-sub">Định giá & hiệu quả so với doanh nghiệp tương đồng</div></div></div><div class="company-empty">' + icon('info') + '<div><b>Chưa có dữ liệu so sánh</b><span>Yahoo Finance chưa trả về báo cáo cho các mã cùng ngành. Bạn vẫn có thể xem điểm chất lượng và định giá DCF.</span></div></div></section>';
    }
    const currency = companyCurrency(asset, data);
    const s = data.stats || {};
    return '<section class="card company-card" id="companyPeers"><div class="card-head"><div><div class="card-title">' + icon('users') + ' So sánh cùng ngành</div><div class="card-sub">' + peers.length + ' doanh nghiệp tương đồng · P/E và ROE</div></div><span class="badge badge-cyan">PEER MAP</span></div>' +
      '<div class="company-peer-map"><canvas id="coPeerMap" class="company-canvas" style="height:238px"></canvas></div>' +
      '<div class="table-wrap"><table class="data-table company-peer-table" id="companyPeerTable"><thead><tr><th>Mã</th><th class="text-right">Giá</th><th class="text-right">P/E</th><th class="text-right">P/B</th><th class="text-right">ROE</th><th class="text-right">Biên ròng</th><th class="text-right">Vốn hoá</th></tr></thead><tbody>' +
      peers.map(p => {
        const peerAsset = companyAssetByYahoo(p.symbol);
        return '<tr class="' + (peerAsset ? 'clickable' : '') + '"' + (peerAsset ? ' data-company-peer="' + peerAsset.id + '"' : '') + '><td><b>' + esc(p.symbol) + '</b><span class="peer-name">' + esc(p.name) + '</span></td>' +
          '<td class="text-right mono">' + companyPrice(p.price, p.currency || currency) + '</td>' +
          '<td class="text-right mono">' + companyRatio(p.trailingPE) + '</td>' +
          '<td class="text-right mono">' + companyRatio(p.priceToBook) + '</td>' +
          '<td class="text-right mono ' + (p.returnOnEquity > 0.15 ? 'up' : '') + '">' + companyPct(p.returnOnEquity) + '</td>' +
          '<td class="text-right mono">' + companyPct(p.profitMargins) + '</td>' +
          '<td class="text-right mono">' + companyMoney(p.marketCap, p.currency || currency) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="company-table-note">' + icon('info') + ' Bấm vào một mã để chuyển nhanh sang báo cáo doanh nghiệp đó. ' +
      (s.trailingPE != null ? 'P/E hiện tại của ' + esc(asset.symbol) + ': <b>' + companyRatio(s.trailingPE) + '</b>.' : '') + '</div></section>';
  }

  function companyProfileHTML(asset, data) {
    const s = data.summary || {};
    const fund = data.fund;
    const officers = s.officers || [];
    const website = s.website ? (/^https?:\/\//i.test(s.website) ? s.website : 'https://' + s.website) : '';
    const summary = s.summary || '';
    return '<section class="card company-card" id="companyProfile"><div class="card-head"><div><div class="card-title">' + icon('building') + ' Hồ sơ doanh nghiệp</div><div class="card-sub">Mô hình kinh doanh, ban điều hành và thông tin nền</div></div>' +
      (website ? '<a class="btn btn-xs btn-ghost" href="' + esc(website) + '" target="_blank" rel="noopener">' + icon('external') + ' Website</a>' : '') + '</div>' +
      '<div class="company-profile-grid"><div class="company-profile-main"><div class="company-profile-summary">' +
      (summary ? esc(summary) : 'Yahoo Finance chưa cung cấp mô tả doanh nghiệp cho mã này. Bạn vẫn có thể dùng báo cáo tài chính, định giá và so sánh cùng ngành để phân tích.') + '</div>' +
      (officers.length ? '<div class="company-officers"><div class="company-subtitle">Ban điều hành</div>' + officers.map(o => '<div class="company-officer"><div class="co-avatar">' + esc((o.name || '?').replace(/^(Mr\.|Ms\.|Mrs\.)\s*/i, '').slice(0, 1)) + '</div><div><b>' + esc(o.name) + '</b><span>' + esc(o.title) + '</span></div>' + (o.age ? '<em>' + o.age + ' tuổi</em>' : '') + '</div>').join('') + '</div>' : '') + '</div>' +
      '<aside class="company-profile-facts"><div class="company-subtitle">Thông tin nhanh</div>' +
      '<div class="kv-row"><span class="k">Ngành</span><span class="v">' + esc(companySectorLabel(s.sector)) + '</span></div>' +
      '<div class="kv-row"><span class="k">Lĩnh vực</span><span class="v">' + esc(s.industry || '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Nhân viên</span><span class="v">' + (s.employees ? nf(s.employees, 0) : '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Quốc gia</span><span class="v">' + esc(s.country || '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Trụ sở</span><span class="v">' + esc([s.city, s.country].filter(Boolean).join(', ') || '—') + '</span></div>' +
      '<div class="kv-row"><span class="k">Sàn</span><span class="v">' + esc(s.exchange || asset.exchange) + '</span></div>' +
      '<div class="kv-row"><span class="k">Loại tài sản</span><span class="v">' + esc(companyQuoteTypeLabel(s.quoteType || data.quoteType)) + '</span></div>' +
      (s.heldPercentInsiders != null ? '<div class="kv-row"><span class="k">Nội bộ nắm giữ</span><span class="v">' + companyPct(s.heldPercentInsiders) + '</span></div>' : '') +
      (s.heldPercentInstitutions != null ? '<div class="kv-row"><span class="k">Tổ chức nắm giữ</span><span class="v">' + companyPct(s.heldPercentInstitutions) + '</span></div>' : '') +
      (fund ? '<div class="kv-row"><span class="k">Danh mục quỹ</span><span class="v">' + esc(fund.category || '—') + '</span></div><div class="kv-row"><span class="k">Công ty quản lý</span><span class="v">' + esc(fund.family || '—') + '</span></div><div class="kv-row"><span class="k">Phí quản lý</span><span class="v">' + companyPct(fund.expenseRatio, 2) + '</span></div>' : '') +
      (s.address ? '<div class="kv-row"><span class="k">Địa chỉ</span><span class="v company-address">' + esc(s.address) + '</span></div>' : '') +
      '</aside></div></section>';
  }

  function companyNotesHTML(asset, data) {
    const s = data.stats || {};
    const f = data.financials || {};
    const summary = data.summary || {};
    const isFund = (summary.quoteType || data.quoteType) === 'ETF' || !!data.fund;
    const peers = data.peers || [];
    const peerPE = companyMedian(peers.map(p => p.trailingPE).filter(v => v > 0));
    const fund = data.fund || {};
    const aum = s.totalAssets || fund.totalAssets;
    const price = summary.price;
    const aboveMa = !!(price && s.fiftyDayAverage && s.twoHundredDayAverage && price > s.fiftyDayAverage && price > s.twoHundredDayAverage);
    const checks = isFund ? [
      { ok: aum != null && aum >= 1e9, text: 'Quỹ có quy mô lớn' + (aum != null ? ' (' + companyMoney(aum, summary.currency || 'USD') + ')' : ''), bad: 'Quỹ nhỏ hoặc thiếu dữ liệu quy mô' },
      { ok: s.avgVolume != null && s.avgVolume >= 500000, text: 'Thanh khoản tốt' + (s.avgVolume != null ? ' (' + companyCompact(s.avgVolume) + ')' : ''), bad: 'Thanh khoản thấp hoặc thiếu dữ liệu' },
      { ok: fund.expenseRatio != null && fund.expenseRatio <= 0.005, text: 'Chi phí quản lý thấp' + (fund.expenseRatio != null ? ' (' + companyPct(fund.expenseRatio, 2) + ')' : ''), bad: fund.expenseRatio == null ? 'Chưa có dữ liệu phí quản lý' : 'Phí quản lý cao, bào mòn lợi nhuận dài hạn' },
      { ok: s.dividendYield != null && s.dividendYield > 0.01, text: 'Có phân phối lợi suất' + (s.dividendYield != null ? ' (' + companyPct(s.dividendYield) + ')' : ''), bad: 'Không phân phối hoặc thiếu dữ liệu' },
      { ok: s.ytdReturn != null && s.ytdReturn > 0, text: 'Hiệu suất từ đầu năm dương' + (s.ytdReturn != null ? ' (' + companyPctNum(s.ytdReturn) + ')' : ''), bad: 'Hiệu suất YTD âm hoặc thiếu dữ liệu' },
      { ok: aboveMa, text: 'Giá trên MA50 và MA200', bad: 'Giá dưới MA50/MA200 hoặc thiếu dữ liệu' }
    ] : [
      { ok: s.revenueGrowth != null && s.revenueGrowth > 0, text: 'Doanh thu đang tăng trưởng' + (s.revenueGrowth != null ? ' (' + companyPct(s.revenueGrowth) + ')' : ''), bad: 'Doanh thu chưa tăng trưởng hoặc thiếu dữ liệu' },
      { ok: f.freeCashflow != null && f.freeCashflow > 0, text: 'Dòng tiền tự do dương', bad: 'Dòng tiền tự do âm hoặc thiếu dữ liệu' },
      { ok: s.debtToEquity != null && s.debtToEquity < 100, text: 'Đòn bẩy trong vùng kiểm soát', bad: 'Nợ / vốn chủ cao, cần theo dõi' },
      { ok: s.returnOnEquity != null && s.returnOnEquity > 0.12, text: 'ROE trên 12%', bad: 'ROE thấp hoặc thiếu dữ liệu' },
      { ok: s.trailingPE != null && s.trailingPE > 0 && (!peerPE || s.trailingPE <= peerPE * 1.15), text: 'P/E không cao hơn nhiều so với cùng ngành', bad: 'P/E cao hơn đáng kể so với cùng ngành' },
      { ok: s.dividendYield != null && s.dividendYield > 0.01, text: 'Có cổ tức', bad: 'Không trả cổ tức hoặc thiếu dữ liệu' }
    ];
    return '<section class="card company-card company-notes-card"><div class="card-head"><div><div class="card-title">' + icon('check') + ' Checklist nhanh</div><div class="card-sub">6 điểm cần kiểm tra trước khi ' + (isFund ? 'chọn quỹ' : 'đầu tư') + '</div></div></div>' +
      '<div class="company-checklist">' + checks.map(c => '<div class="company-check ' + (c.ok ? 'ok' : 'warn') + '"><span class="cc-icon">' + icon(c.ok ? 'check' : 'alert') + '</span><span>' + esc(c.ok ? c.text : c.bad) + '</span></div>').join('') + '</div>' +
      '<div class="company-disclaimer">' + icon('info') + ' AURELIS là sàn giao dịch mô phỏng. Báo cáo doanh nghiệp chỉ phục vụ học tập, không phải lời khuyên đầu tư. Dữ liệu có thể chậm hoặc thiếu với một số mã.</div></section>';
  }

  function companyMarketData(asset) {
    const quoteType = asset.group === 'crypto' ? 'CRYPTOCURRENCY' : asset.group === 'forex' ? 'CURRENCY' : asset.group === 'commodity' ? 'COMMODITY' : asset.group === 'index' ? 'INDEX' : asset.group === 'etf' ? 'ETF' : 'EQUITY';
    return {
      ok: true, source: 'market', symbol: asset.yahoo || asset.symbol, name: asset.name,
      quoteType, currency: asset.currency,
      summary: {
        name: asset.name, price: asset.price, changePct: asset.changePct, currency: asset.currency,
        exchange: asset.exchange, sector: asset.sector, marketCap: asset.cap, volume: asset.volume,
        quoteType, marketState: ''
      },
      stats: {}, financials: {}, statements: { incomeAnnual: [], incomeQuarterly: [], balanceAnnual: [], balanceQuarterly: [], cashAnnual: [], cashQuarterly: [], balanceSnapshot: {}, cashSnapshot: {} },
      earnings: { yearly: [], quarterly: [], surprises: [] }, analyst: {}, peers: [], fund: null
    };
  }

  function companyMarketFallbackHTML(asset, candles, message, isEquity) {
    const data = companyMarketData(asset);
    let sourceCandles = candles && candles.length > 5 ? candles : D.generateCandles(asset, '1D', 280, asset.price);
    const closes = sourceCandles.map(c => c.c);
    const rsi = CH.indicators.rsi(closes, 14);
    const rsiV = rsi[rsi.length - 1];
    const macd = CH.indicators.macd(closes);
    const histV = macd.hist[macd.hist.length - 1];
    const ma20 = CH.indicators.sma(closes, 20);
    const ma50 = CH.indicators.sma(closes, 50);
    const ma20v = ma20[ma20.length - 1], ma50v = ma50[ma50.length - 1];
    const atr = CH.indicators.atr(sourceCandles, 14);
    const atrV = atr[atr.length - 1];
    const atrPct = atrV && asset.price ? atrV / asset.price * 100 : null;
    return companyHeroHTML(asset, data, false) +
      '<div class="company-source-banner warn">' + icon('alert') + '<div><b>' + (isEquity ? 'Chưa có báo cáo doanh nghiệp' : 'Phân tích thị trường thay thế') + '</b><span>' + esc(message) + '</span></div><span class="badge ' + (isEquity ? 'badge-gold' : 'badge-cyan') + '">' + (isEquity ? 'FALLBACK' : 'MARKET') + '</span></div>' +
      '<div class="company-kpis">' +
      companyStatCard('RSI (14)', nf(rsiV, 1), rsiV < 30 ? 'Vùng quá bán' : rsiV > 70 ? 'Vùng quá mua' : 'Trung tính', rsiV < 30 ? 'up' : rsiV > 70 ? 'down' : '', 'target') +
      companyStatCard('MACD histogram', nf(histV, 2), histV > 0 ? 'Phe mua chiếm ưu thế' : 'Phe bán chiếm ưu thế', changeCls(histV), 'chart') +
      companyStatCard('SMA 20', companyPrice(ma20v, asset.currency), asset.price > ma20v ? 'Giá trên MA20' : 'Giá dưới MA20', asset.price > ma20v ? 'up' : 'down', 'trendline') +
      companyStatCard('SMA 50', companyPrice(ma50v, asset.currency), asset.price > ma50v ? 'Giá trên MA50' : 'Giá dưới MA50', asset.price > ma50v ? 'up' : 'down', 'trendline') +
      companyStatCard('ATR (14)', companyPrice(atrV, asset.currency), atrPct != null ? 'Biến động ' + nf(atrPct, 2) + '%/phiên' : 'Độ biến động', '', 'bolt') +
      companyStatCard('Khối lượng', companyCompact(asset.volume), 'Khối lượng gần nhất', '', 'candles') +
      '</div>' +
      '<div class="company-chart-grid company-chart-grid-2">' +
      companyChartCard('coFallbackPrice', 'Xu hướng giá', '2 năm · nến ngày', companyLegend([['Giá', 'var(--gold)'], ['MA50', 'var(--cyan)']]), sourceCandles.length + ' phiên', 230) +
      companyChartCard('coFallbackRsi', 'RSI & động lượng', 'Vùng quá mua / quá bán', companyLegend([['RSI 14', 'var(--purple)']]), '30 = quá bán · 70 = quá mua', 230) +
      '</div>' +
      '<section class="card company-card company-fallback-note"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Vì sao không có báo cáo doanh nghiệp?</div></div></div>' +
      '<p>' + (isEquity ? 'Mã này là cổ phiếu nhưng Yahoo Finance chưa cung cấp đủ báo cáo tài chính. Bạn có thể xem phân tích kỹ thuật bên trên, hoặc chọn một doanh nghiệp khác trong danh sách.' : 'Crypto, ngoại hối, hàng hoá và chỉ số không có báo cáo doanh nghiệp. AURELIS hiển thị phân tích thị trường để bạn vẫn có góc nhìn xu hướng, động lượng và rủi ro.') + '</p>' +
      '<div class="company-fallback-actions"><button class="btn btn-sm btn-gold" data-nav="#/terminal">' + icon('chart') + ' Mở terminal</button><button class="btn btn-sm btn-ghost" data-nav="#/analysis">' + icon('flask') + ' Phòng phân tích</button><button class="btn btn-sm btn-ghost" data-nav="#/markets">' + icon('candles') + ' Chọn mã khác</button></div></section>';
  }

  function companySimulatedPeer(peerAsset) {
    const rand = D.mulberry32(D.hash32(peerAsset.id + 'peer-v1'));
    const cap = peerAsset.cap || peerAsset.price * 1e9;
    return {
      symbol: peerAsset.yahoo || peerAsset.symbol,
      name: peerAsset.name,
      currency: peerAsset.currency,
      price: peerAsset.price,
      changePct: peerAsset.changePct,
      marketCap: cap,
      trailingPE: 7 + rand() * 18,
      priceToBook: 0.8 + rand() * 4,
      returnOnEquity: 0.06 + rand() * 0.24,
      profitMargins: 0.04 + rand() * 0.2,
      revenueGrowth: -0.03 + rand() * 0.24,
      dividendYield: rand() > 0.35 ? 0.01 + rand() * 0.05 : 0,
      sector: peerAsset.sector,
      industry: peerAsset.sector,
      quoteType: 'EQUITY'
    };
  }

  function companySimulated(asset, peerSymbols) {
    const rand = D.mulberry32(D.hash32(asset.id + 'company-v1'));
    const currency = asset.currency || 'VND';
    const price = asset.price || 10000;
    const cap = asset.cap || price * (1e8 + rand() * 4e8);
    const shares = cap / price;
    const baseRevenue = cap * (0.25 + rand() * 0.55);
    const baseMargin = 0.055 + rand() * 0.16;
    const growth = 0.03 + rand() * 0.16;
    const thisYear = new Date().getFullYear();
    const years = [thisYear - 3, thisYear - 2, thisYear - 1, thisYear];
    const incomeAnnual = [];
    const balanceAnnual = [];
    const cashAnnual = [];
    years.forEach((year, i) => {
      const revenue = baseRevenue / Math.pow(1 + growth, years.length - 1 - i);
      const grossMargin = 0.22 + rand() * 0.3;
      const operatingMargin = Math.min(0.32, baseMargin + 0.04 + rand() * 0.1);
      const netMargin = baseMargin * (0.82 + rand() * 0.35);
      const netIncome = revenue * netMargin;
      const grossProfit = revenue * grossMargin;
      const operatingIncome = revenue * operatingMargin;
      incomeAnnual.push({
        date: String(year), revenue, grossProfit, operatingIncome, netIncome,
        ebitda: operatingIncome * 1.18, eps: netIncome / shares,
        grossMargin, operatingMargin, netMargin
      });
      const assets = revenue * (1.05 + rand() * 0.8);
      const liabilities = assets * (0.33 + rand() * 0.25);
      const equity = assets - liabilities;
      const cash = assets * (0.08 + rand() * 0.12);
      const debt = liabilities * (0.28 + rand() * 0.35);
      balanceAnnual.push({ date: String(year), assets, liabilities, equity, cash, totalDebt: debt, currentAssets: assets * 0.42, currentLiabilities: liabilities * 0.46 });
      const ocf = netIncome * (0.95 + rand() * 0.5);
      const capex = -revenue * (0.035 + rand() * 0.055);
      cashAnnual.push({ date: String(year), ocf, capex, fcf: ocf + capex, dividends: -netIncome * (0.08 + rand() * 0.22), netIncome });
    });
    const latest = incomeAnnual[incomeAnnual.length - 1];
    const latestBalance = balanceAnnual[balanceAnnual.length - 1];
    const latestCash = cashAnnual[cashAnnual.length - 1];
    const first = incomeAnnual[0];
    const revenueGrowth = Math.pow(latest.revenue / first.revenue, 1 / Math.max(1, years.length - 1)) - 1;
    const earningsGrowth = Math.pow(Math.max(1, latest.netIncome) / Math.max(1, first.netIncome), 1 / Math.max(1, years.length - 1)) - 1;
    const roe = latest.netIncome / latestBalance.equity;
    const roa = latest.netIncome / latestBalance.assets;
    const de = latestBalance.liabilities / latestBalance.equity * 100;
    const dividendYield = 0.012 + rand() * 0.045;
    const beta = 0.65 + rand() * 0.85;
    const pe = 8 + rand() * 18;
    const pb = 1 + rand() * 3.6;
    const targetMean = price * (1.08 + rand() * 0.28);
    const targetLow = price * (0.82 + rand() * 0.1);
    const targetHigh = price * (1.3 + rand() * 0.2);
    const trend = { strongBuy: Math.round(rand() * 4), buy: 2 + Math.round(rand() * 8), hold: 1 + Math.round(rand() * 6), sell: Math.round(rand() * 2), strongSell: rand() > 0.75 ? 1 : 0 };
    const quarterly = [];
    const surprises = [];
    for (let q = 0; q < 4; q++) {
      const qRevenue = latest.revenue / 4 * (0.85 + rand() * 0.3);
      const qEarnings = qRevenue * (latest.netMargin * (0.8 + rand() * 0.4));
      const label = 'Q' + (q + 1) + '/' + thisYear;
      quarterly.push({ date: label, revenue: qRevenue, earnings: qEarnings, profitMargin: qEarnings / qRevenue });
      const estimate = qEarnings * (0.86 + rand() * 0.25);
      surprises.push({ date: label, actual: qEarnings, estimate, surprisePct: estimate ? (qEarnings - estimate) / Math.abs(estimate) * 100 : null });
    }
    const peerAssets = (peerSymbols || []).map(companyAssetByYahoo).filter(Boolean);
    const peers = peerAssets.map(companySimulatedPeer);
    return {
      ok: true, source: 'simulated', simulated: true,
      symbol: asset.yahoo || asset.symbol, name: asset.name, quoteType: 'EQUITY', currency,
      summary: {
        symbol: asset.yahoo || asset.symbol, name: asset.name, quoteType: 'EQUITY', currency,
        exchange: asset.exchange, marketState: 'SIMULATED', price, prevClose: asset.prev,
        changePct: asset.changePct, dayHigh: asset.high, dayLow: asset.low, open: asset.open,
        volume: asset.volume, marketCap: cap, sector: asset.sector, industry: asset.sector,
        employees: 1200 + Math.round(rand() * 18000), country: currency === 'VND' ? 'Việt Nam' : 'Hoa Kỳ',
        city: '', address: '', phone: '', website: '', summary: asset.desc || '', officers: []
      },
      stats: {
        trailingPE: pe, forwardPE: pe * (0.85 + rand() * 0.2), priceToBook: pb, priceToSales: cap / latest.revenue,
        enterpriseValue: cap + latestBalance.totalDebt - latestBalance.cash, enterpriseToRevenue: 1 + rand() * 3,
        enterpriseToEbitda: 6 + rand() * 8, beta, trailingEps: latest.eps, forwardEps: latest.eps * (1.05 + rand() * 0.15),
        bookValue: latestBalance.equity / shares, pegRatio: pe / Math.max(1, revenueGrowth * 100), sharesOutstanding: shares,
        dividendRate: price * dividendYield, dividendYield, payoutRatio: 0.2 + rand() * 0.4,
        fiftyTwoWeekLow: price * (0.72 + rand() * 0.08), fiftyTwoWeekHigh: price * (1.18 + rand() * 0.16),
        fiftyDayAverage: price * (0.95 + rand() * 0.1), twoHundredDayAverage: price * (0.9 + rand() * 0.15),
        avgVolume: asset.avgVolume || asset.volume || 0, profitMargins: latest.netMargin, grossMargins: latest.grossMargin,
        operatingMargins: latest.operatingMargin, ebitdaMargins: latest.ebitda / latest.revenue,
        returnOnAssets: roa, returnOnEquity: roe, revenueGrowth, earningsGrowth,
        debtToEquity: de, currentRatio: latestBalance.currentAssets / latestBalance.currentLiabilities,
        quickRatio: latestBalance.currentAssets / latestBalance.currentLiabilities * 0.8,
        totalCash: latestBalance.cash, totalDebt: latestBalance.totalDebt, totalRevenue: latest.revenue,
        ebitda: latest.ebitda, grossProfits: latest.grossProfit, netIncome: latest.netIncome,
        revenuePerShare: latest.revenue / shares, freeCashflow: latestCash.fcf, operatingCashflow: latestCash.ocf,
        capex: latestCash.capex, change52w: (price / (price * (1.1 + rand() * 0.3)) - 1),
        heldPercentInsiders: 0.1 + rand() * 0.25, heldPercentInstitutions: 0.2 + rand() * 0.4
      },
      financials: {
        totalRevenue: latest.revenue, grossProfits: latest.grossProfit, operatingCashflow: latestCash.ocf,
        freeCashflow: latestCash.fcf, capex: latestCash.capex, totalCash: latestBalance.cash,
        totalDebt: latestBalance.totalDebt, returnOnEquity: roe, returnOnAssets: roa,
        debtToEquity: de, currentRatio: latestBalance.currentAssets / latestBalance.currentLiabilities,
        revenueGrowth, earningsGrowth, grossMargins: latest.grossMargin, operatingMargins: latest.operatingMargin,
        profitMargins: latest.netMargin
      },
      statements: {
        incomeAnnual, incomeQuarterly: incomeAnnual.slice(-1).map(r => Object.assign({}, r, { date: 'Q4/' + thisYear })),
        balanceAnnual, balanceQuarterly: balanceAnnual.slice(-1).map(r => Object.assign({}, r, { date: 'Q4/' + thisYear })),
        cashAnnual, cashQuarterly: cashAnnual.slice(-1).map(r => Object.assign({}, r, { date: 'Q4/' + thisYear })),
        balanceSnapshot: { date: String(thisYear), assets: latestBalance.assets, liabilities: latestBalance.liabilities, equity: latestBalance.equity, cash: latestBalance.cash, debt: latestBalance.totalDebt },
        cashSnapshot: { date: String(thisYear), ocf: latestCash.ocf, capex: latestCash.capex, fcf: latestCash.fcf, dividends: latestCash.dividends, netIncome: latestCash.netIncome }
      },
      earnings: { yearly: incomeAnnual.map(r => ({ date: r.date, revenue: r.revenue, earnings: r.netIncome, profitMargin: r.netMargin })), quarterly, surprises, nextEarnings: null },
      analyst: {
        key: trend.buy >= trend.hold ? 'buy' : 'hold', mean: 1.7 + rand() * 1.4,
        count: trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell,
        targetLow, targetMean, targetMedian: targetMean, targetHigh, trend
      },
      fund: null, peers, at: Date.now()
    };
  }

  function bindCompanyReport(asset, data, candles) {
    $$('[data-company-period]').forEach(btn => btn.addEventListener('click', () => {
      state.company.period = btn.getAttribute('data-company-period');
      save();
      $$('[data-company-period]').forEach(x => x.classList.toggle('active', x === btn));
      $$('[data-company-period]').forEach(x => x.classList.toggle('gold', x === btn));
      const body = $('#companyStatementBody');
      if (body) body.innerHTML = companyStatementBodyHTML(asset, data);
    }));
    $$('[data-company-statement]').forEach(btn => btn.addEventListener('click', () => {
      state.company.statement = btn.getAttribute('data-company-statement');
      save();
      $$('[data-company-statement]').forEach(x => x.classList.toggle('active', x === btn));
      const body = $('#companyStatementBody');
      if (body) body.innerHTML = companyStatementBodyHTML(asset, data);
    }));
    $$('[data-dcf]').forEach(input => input.addEventListener('input', () => {
      const key = input.getAttribute('data-dcf');
      const v = Number(input.value);
      if (!isFinite(v)) return;
      state.company.dcf[key] = v;
      save();
      const calc = companyDcfCalc(data);
      const out = $('#dcfOutput');
      const sens = $('#dcfSensitivity');
      if (out) out.innerHTML = companyDcfOutputHTML(asset, data, calc);
      if (sens) sens.innerHTML = companyDcfSensitivityHTML(asset, data, calc);
    }));
    const peerTable = $('#companyPeerTable');
    if (peerTable) peerTable.addEventListener('click', e => {
      const row = e.target.closest('[data-company-peer]');
      if (!row) return;
      state.company.symbol = row.getAttribute('data-company-peer');
      save();
      renderRoute();
    });
    drawCompanyCharts(asset, data, candles);
  }

  function bindCompanyMarketFallback(asset, candles) {
    let sourceCandles = candles && candles.length > 5 ? candles : D.generateCandles(asset, '1D', 280, asset.price);
    const closes = sourceCandles.map(c => c.c);
    const labels = sourceCandles.map(c => dateLabel(c.t));
    const sma50 = CH.indicators.sma(closes, 50);
    const priceCanvas = $('#coFallbackPrice');
    if (priceCanvas) {
      CH.MiniChart.multiLine(priceCanvas, [
        { values: closes, color: '#f3c56b', width: 2, fill: true },
        { values: sma50, color: '#5ac8fa', width: 1.2 }
      ], { xLabels: labels, formatAxis: v => companyCompact(v), zero: false });
    }
    const rsi = CH.indicators.rsi(closes, 14);
    const rsiCanvas = $('#coFallbackRsi');
    if (rsiCanvas) {
      CH.MiniChart.multiLine(rsiCanvas, [
        { values: rsi, color: '#b59cff', width: 1.8, fill: true }
      ], { xLabels: labels, formatAxis: v => nf(v, 0), baseline: 50, zero: false });
    }
  }

  /* ------------------------------ COMMAND PALETTE ------------------------------ */
  const CMD_PAGES = [
    { label: 'Tổng quan', sub: 'Tài sản, thị trường, nhiệm vụ', icon: 'grid', route: '#/dashboard' },
    { label: 'Thị trường', sub: 'Bảng giá đa thị trường', icon: 'candles', route: '#/markets' },
    { label: 'Biểu đồ & Giao dịch', sub: 'Nến, chỉ báo, công cụ vẽ', icon: 'chart', route: '#/terminal' },
    { label: 'Danh mục', sub: 'Tài sản, hiệu suất, phân bổ', icon: 'wallet', route: '#/portfolio' },
    { label: 'Quản lý tài sản', sub: 'Hồ sơ rủi ro, phân bổ mục tiêu, DCA, mục tiêu tài chính', icon: 'pie', route: '#/wealth' },
    { label: 'Ngân hàng & Tích lũy', sub: 'Tiết kiệm, ngoại tệ, vàng, lãi suất', icon: 'bank', route: '#/savings' },
    { label: 'Tín dụng & Vay vốn', sub: 'Vay nhanh theo giờ/ngày, điểm tín dụng, trả nợ', icon: 'scale', route: '#/credit' },
    { label: 'Thư viện tài chính', sub: 'Định lý, công thức, phân tích, khái niệm', icon: 'book', route: '#/library' },
    { label: 'Crypto', sub: 'Binance, funding, order book', icon: 'coin', route: '#/crypto' },
    { label: 'Phái sinh', sub: 'Long/short, ký quỹ, thanh lý', icon: 'leverage', route: '#/derivatives' },
    { label: 'Phòng phân tích', sub: 'Backtest, screener, rủi ro', icon: 'flask', route: '#/analysis' },
    { label: 'Phân tích doanh nghiệp', sub: 'Báo cáo tài chính, định giá DCF, đồng thuận', icon: 'building', route: '#/company' },
    { label: 'Danh hiệu & Xếp hạng', sub: 'Cấp độ, thành tựu, mùa giải', icon: 'trophy', route: '#/ranks' },
    { label: 'Cửa hàng Aura', sub: 'Danh hiệu, khung, theme', icon: 'bag', route: '#/shop' },
    { label: 'Học viện', sub: 'Bài học, quiz, AURA Survival', icon: 'academy', route: '#/academy' },
    { label: 'Việc làm & Thu nhập', sub: 'Ca làm, câu hỏi tài chính, nâng cấp nghề', icon: 'briefcase', route: '#/jobs' },
    { label: 'Đấu giá cổ phần', sub: 'Săn cổ phần dưới giá thị trường', icon: 'gavel', route: '#/auctions' },
    { label: 'Thám tử AURA', sub: 'Câu đố biểu đồ hằng ngày, chuỗi đúng', icon: 'search', route: '#/detective' },
    { label: 'PRIME · Đầu tư thực', sub: 'Tài khoản riêng, lệnh MP/LO/STOP, T+2, mandate', icon: 'sparkles', route: '#/prime' },
    { label: 'AURELIS Arcade', sub: 'Deal Room, Hedge Fund, Startup Studio, Candle Duel', icon: 'play', route: '#/arcade' },
    { label: 'Xưởng Coin', sub: 'Tạo meme coin, bonding curve, hype, thanh khoản ảo', icon: 'coin', route: '#/coin' }
  ];

  function commandResults(query) {
    const q = String(query || '').trim().toLowerCase();
    const nq = normSearch(q);
    const pages = CMD_PAGES.filter(p => !q || (p.label + ' ' + p.sub).toLowerCase().includes(q) || normSearch(p.label + ' ' + p.sub).includes(nq));
    const assets = D.ASSETS.filter(a => a.tradable && (!q || (a.symbol + ' ' + a.name + ' ' + a.exchange).toLowerCase().includes(q))).slice(0, q ? 8 : 5);
    const lessons = D.LESSONS.filter(l => q && (l.title + ' ' + l.summary).toLowerCase().includes(q)).slice(0, 3);
    const items = D.SHOP.filter(it => q && (it.name + ' ' + it.category + ' ' + it.desc).toLowerCase().includes(q)).slice(0, 3);
    const library = D.LIBRARY.filter(e => q && normSearch([e.title, e.subtitle, e.summary, e.formula, (e.tags || []).join(' ')].join(' ')).includes(nq)).slice(0, 4);
    return { pages, assets, lessons, items, library };
  }

  function openCommandPalette() {
    const root = $('#modalRoot');
    if (!root) return;
    root.innerHTML = '<div class="cmd-scrim" id="cmdScrim"><div class="cmd-box"><div class="cmd-input-wrap">' + icon('search') + '<input class="cmd-input" id="cmdInput" placeholder="Tìm mã, crypto, trang, bài học, vật phẩm…" autocomplete="off"><span class="cmd-esc">ESC</span></div><div class="cmd-results" id="cmdResults"></div><div class="cmd-foot"><span><kbd>↵</kbd> chọn</span><span><kbd>↑ ↓</kbd> di chuyển</span><span><kbd>Ctrl K</kbd> mở nhanh</span><span style="margin-left:auto">AURELIS Command</span></div></div></div>';
    const scrim = root.querySelector('#cmdScrim');
    const input = root.querySelector('#cmdInput');
    const results = root.querySelector('#cmdResults');
    let active = 0;
    function data() {
      const res = commandResults(input.value);
      const out = [];
      if (res.pages.length) out.push({ group: 'Điều hướng', items: res.pages.map(p => ({ type: 'page', label: p.label, sub: p.sub, icon: p.icon, route: p.route })) });
      if (res.assets.length) out.push({ group: 'Tài sản', items: res.assets.map(a => ({ type: 'asset', label: a.symbol, sub: a.name + ' · ' + a.exchange, asset: a, price: fmtPrice(a) + ' ' + priceUnit(a), chg: a.changePct })) });
      if (res.lessons.length) out.push({ group: 'Học viện', items: res.lessons.map(l => ({ type: 'lesson', label: l.title, sub: l.level + ' · ' + l.minutes + ' phút', icon: 'academy', lesson: l })) });
      if (res.library.length) out.push({ group: 'Thư viện', items: res.library.map(e => ({ type: 'library', label: e.title, sub: e.level + ' · ' + e.formula, icon: 'book', entry: e })) });
      if (res.items.length) out.push({ group: 'Cửa hàng', items: res.items.map(it => ({ type: 'item', label: it.name, sub: it.category + ' · ' + (RARITY_LABEL[it.rarity] || it.rarity), icon: 'bag', item: it })) });
      return out;
    }
    function run(entry) {
      if (!entry) return;
      if (entry.type === 'page') { closeModal(); if (location.hash === entry.route) renderRoute(); else location.hash = entry.route; }
      else if (entry.type === 'asset') { closeModal(); switchTerminalAsset(entry.asset.id); }
      else if (entry.type === 'lesson') { closeModal(); openLesson(entry.lesson.id); }
      else if (entry.type === 'library') { closeModal(); openLibraryEntry(entry.entry.id); }
      else if (entry.type === 'item') { closeModal(); openItemModal(entry.item.id); }
    }
    function paint() {
      const groups = data();
      const flat = [];
      results.innerHTML = groups.map(g => '<div class="cmd-section-label">' + g.group + '</div>' + g.items.map(it => {
        const idx = flat.length; flat.push(it);
        const isActive = idx === active;
        return '<div class="cmd-result ' + (isActive ? 'active' : '') + '" data-cmd-index="' + idx + '">' +
          (it.type === 'asset' ? assetLogo(it.asset) : '<span class="cmd-result-icon">' + (it.type === 'item' ? (it.item.icon || icon(it.icon)) : icon(it.icon)) + '</span>') +
          '<div class="cmd-result-body"><div class="cmd-result-title">' + esc(it.label) + '</div><div class="cmd-result-sub">' + esc(it.sub) + '</div></div>' +
          (it.type === 'asset' ? '<span class="cmd-result-price ' + changeCls(it.chg) + '">' + esc(it.price) + ' · ' + fmtPct(it.chg) + '</span>' : '<span class="cmd-result-price">' + (it.type === 'page' ? 'Mở' : it.type === 'lesson' ? 'Học' : it.type === 'library' ? 'Đọc' : 'Xem') + '</span>') + '</div>';
      }).join('')).join('') || '<div class="cmd-empty">Không tìm thấy kết quả phù hợp.<br>Thử “BTC”, “phái sinh”, “Fibonacci” hoặc “danh hiệu”.</div>';
      if (active >= flat.length) active = Math.max(0, flat.length - 1);
      results.querySelectorAll('[data-cmd-index]').forEach(el => {
        el.addEventListener('mouseenter', () => { active = Number(el.getAttribute('data-cmd-index')); results.querySelectorAll('[data-cmd-index]').forEach(x => x.classList.toggle('active', x === el)); });
        el.addEventListener('click', () => run(flat[Number(el.getAttribute('data-cmd-index'))]));
      });
      results._flat = flat;
    }
    input.addEventListener('input', () => { active = 0; paint(); });
    input.addEventListener('keydown', e => {
      const flat = results._flat || [];
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(flat.length - 1, active + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(flat[active]); }
    });
    scrim.addEventListener('click', e => { if (e.target === scrim) closeModal(); });
    paint();
    setTimeout(() => input.focus(), 40);
  }

  /* ------------------------------ ACTION BUS ------------------------------ */
  function handleAction(el, action) {
    const id = el.getAttribute('data-id');
    switch (action) {
      case 'chest': claimChest(); break;
      case 'claim-quest': claimQuest(id); break;
      case 'claim-ach': claimAchievement(id); break;
      case 'claim-weekly': claimWeekly(id); break;
      case 'claim-weekly-bonus': claimWeeklyBonus(); break;
      case 'trade': openTradeFor(id, el.getAttribute('data-side') || 'buy', el.getAttribute('data-mode') || 'spot'); break;
      case 'deriv-trade': {
        const a = byId[id];
        if (!a) return;
        state.lastAsset = id;
        terminalOrder.mode = 'futures';
        terminalOrder.side = el.getAttribute('data-side') === 'short' ? 'short' : 'long';
        save();
        go('terminal');
        break;
      }
      case 'terminal': switchTerminalAsset(id); break;
      case 'company': {
        const target = byId[id];
        if (!target) return;
        ensureCompany();
        state.company.symbol = target.id;
        save();
        if (currentRoute === 'company') renderRoute(); else go('company');
        break;
      }
      case 'company-refresh': {
        if (currentRoute !== 'company') { go('company'); break; }
        const btn = el;
        if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
        loadCompanyData(true).finally(() => {
          if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('is-loading'); }
        });
        refreshCompanyNews(true);
        toast('Đang làm mới báo cáo', 'Yahoo Finance và tin tức liên quan sẽ được gọi lại cho mã đang chọn.', 'info', '🏢');
        break;
      }
      case 'company-news-refresh': {
        if (currentRoute !== 'company') { go('company'); break; }
        if (el) { el.disabled = true; el.classList.add('is-loading'); }
        refreshCompanyNews(true).finally(() => {
          if (el && el.isConnected) { el.disabled = false; el.classList.remove('is-loading'); }
        });
        break;
      }
      case 'company-chart-zoom': {
        const chartId = el.getAttribute('data-chart');
        const canvas = chartId ? document.getElementById(chartId) : null;
        if (!canvas || !canvas.width) {
          toast('Biểu đồ chưa sẵn sàng', 'Dữ liệu biểu đồ đang được tải, thử lại sau vài giây.', 'info', '📊');
          break;
        }
        const card = canvas.closest('.company-chart-card');
        const legendEl = card ? card.querySelector('.company-legend') : null;
        const footEl = card ? card.querySelector('.company-chart-foot') : null;
        openChartZoom({
          title: el.getAttribute('data-title') || 'Biểu đồ doanh nghiệp',
          sub: el.getAttribute('data-sub') || '',
          legend: legendEl ? legendEl.innerHTML : '',
          note: footEl ? footEl.textContent.trim() : '',
          canvas
        });
        break;
      }
      case 'star': {
        if (!id) return;
        if (state.watchlist.includes(id)) {
          state.watchlist = state.watchlist.filter(x => x !== id);
          saveNow();
          toast('Đã bỏ theo dõi', byId[id].symbol + ' rời khỏi danh sách yêu thích.', 'info', '⭐');
        } else {
          if (state.watchlist.length >= watchLimit()) return toast('Watchlist đã đầy', 'Mua Watchlist Mở Rộng để theo dõi tới ' + watchLimit() + ' mã.', 'error', '⭐');
          state.watchlist.push(id);
          progressQuest('watch', 1);
          saveNow();
          toast('Đã thêm vào Watchlist', byId[id].symbol + ' · ' + state.watchlist.length + '/' + watchLimit() + ' mã.', 'success', '⭐');
        }
        $$('[data-action="star"][data-id="' + id + '"]').forEach(b => b.classList.toggle('active', state.watchlist.includes(id)));
        break;
      }
      case 'close-pos': {
        const p = state.positions.find(x => x.id === id);
        if (!p) return;
        const a = byId[p.assetId];
        const pl = positionList().find(x => x.id === id);
        confirmAction({
          title: 'Đóng vị thế ' + a.symbol + '?', sub: 'Giá mark hiện tại · ' + fmtPrice(a), danger: (pl && pl.pnl < 0), confirm: 'Đóng vị thế',
          body: 'Bạn đang đóng vị thế <b>' + (p.side === 'long' ? 'LONG' : 'SHORT') + ' ' + p.leverage + 'x</b> với khối lượng ' + fmtQty(a, p.qty) + ' ' + a.symbol + '. PnL tạm tính: <span class="' + changeCls(pl ? pl.pnl : 0) + '">' + (pl && pl.pnl >= 0 ? '+' : '') + fmtVND(pl ? pl.pnl : 0) + '</span>.',
          onConfirm: () => {
            const res = closePosition(id, a.price, false);
            if (!res.ok) return toast('Không thể đóng vị thế', res.error, 'error', '⚠️');
            pushNotif('✅', 'Đã đóng vị thế', a.symbol + ' · PnL ' + (res.pnl >= 0 ? '+' : '') + fmtVND(res.pnl));
            toast('Đã đóng vị thế', a.symbol + ' · ' + (res.pnl >= 0 ? '+' : '') + fmtVND(res.pnl), res.pnl >= 0 ? 'success' : 'info', '✅');
            if (res.pnl > 0) confetti(24);
            updateShell();
            refreshCurrentRoute();
          }
        });
        break;
      }
      case 'cancel-order': {
        const o = state.orders.find(x => x.id === id);
        if (!o) return;
        state.orders = state.orders.filter(x => x.id !== id);
        saveNow();
        toast('Đã huỷ lệnh chờ', (byId[o.assetId] ? byId[o.assetId].symbol : '') + ' @ ' + fmtPrice(byId[o.assetId], o.price), 'info', '📋');
        if (currentRoute === 'terminal') refreshTerminalPanels(); else refreshCurrentRoute();
        break;
      }
      case 'delete-alert': {
        state.alerts = state.alerts.filter(x => x.id !== id);
        saveNow();
        toast('Đã xoá cảnh báo', 'Bạn có thể tạo cảnh báo mới bất cứ lúc nào.', 'info', '🔔');
        if (currentRoute === 'terminal') refreshTerminalPanels(); else refreshCurrentRoute();
        break;
      }
      case 'toggle-privacy': {
        state.settings.privacy = !state.settings.privacy;
        saveNow(); updateShell();
        toast(state.settings.privacy ? 'Đã bật chế độ riêng tư' : 'Đã tắt chế độ riêng tư', state.settings.privacy ? 'Số dư tài sản đã được làm mờ.' : 'Số dư hiển thị trở lại.', 'info', '👁️');
        break;
      }
      case 'open-settings': settingsModal('profile'); break;
      case 'open-profile': openProfile(); break;
      case 'open-item': openItemModal(id); break;
      case 'equip-item': {
        const inModal = el.closest('.modal');
        if (inModal) closeModal();
        equipItem(id);
        break;
      }
      case 'sell-item': {
        const it = itemDef(id);
        if (!it) return;
        const refund = Math.floor(it.price * 0.6);
        confirmAction({
          title: 'Bán ' + it.name + '?', sub: 'Nhận lại ' + refund + ' Aura (60% giá gốc).', danger: true, confirm: 'Bán vật phẩm',
          body: 'Vật phẩm sẽ rời khỏi bộ sưu tập. Nếu đang trang bị, hệ thống sẽ tự đưa bạn về lựa chọn mặc định. Bạn có thể mua lại sau với giá đầy đủ.',
          onConfirm: () => {
            const res = sellItem(id);
            if (!res.ok) return toast('Không thể bán', res.error, 'error', '⚠️');
            if (currentRoute === 'shop') renderRoute();
          }
        });
        break;
      }
      case 'open-lesson': openLesson(id); break;
      case 'open-survival': openSurvival(id); break;
      case 'detective-practice': detectiveStartPractice(); break;
      case 'detective-daily': detectiveExitPractice(); break;
      case 'open-shop-perk': openItemModal('perk_lens'); break;
      case 'open-style': openStylePicker(); break;
      case 'replay-onboarding': openStylePicker(); break;
      case 'export-csv': if (currentRoute === 'portfolio') exportPortfolioCSV(); else { go('portfolio'); setTimeout(exportPortfolioCSV, 120); } break;
      case 'export-json': exportJSON(); break;
      case 'clear-notifs': state.notifications = []; saveNow(); updateNotifDot(); closeModal(); toast('Đã xoá thông báo', 'Hộp thông báo của bạn đã sạch.', 'info', '🔕'); break;
      case 'refresh-news': newsItems = null; loadNewsItems(); toast('Đang làm mới tin tức', 'Nguồn RSS sẽ được tải lại trong giây lát.', 'info', '📰'); break;
      case 'refresh-quotes': refreshQuotes(true); toast('Đang làm mới bảng giá', 'Dữ liệu thị trường sẽ cập nhật khi có phản hồi.', 'info', '🔄'); break;
      case 'savings-refresh': refreshSavingsRates(true); toast('Đang làm mới lãi suất', 'Benchmark TPCP, vàng và tỷ giá sẽ cập nhật khi có phản hồi.', 'info', '🏦'); break;
      case 'savings-deposit': openSavingsDeposit(id); break;
      case 'savings-withdraw': openSavingsWithdraw(id); break;
      case 'savings-roll': toggleSavingsRoll(id); break;
      case 'credit-borrow': openBorrowModal(id); break;
      case 'credit-repay': openRepayModal(id, el.getAttribute('data-full') === '1'); break;
      case 'credit-repay-all': {
        const active = creditActiveLoans();
        if (!active.length) { toast('Không có khoản vay', 'Bạn đang không có dư nợ nào cần tất toán.', 'info', '✅'); break; }
        const total = active.reduce((sum, l) => sum + loanOutstanding(l), 0);
        confirmAction({
          title: 'Tất toán tất cả khoản vay?', sub: 'Tổng cần trả ' + fmtVND(total) + ' · tiền mặt ' + fmtVND(state.cash), danger: total > state.cash, confirm: 'Tất toán tất cả',
          body: 'Hệ thống sẽ thanh toán lần lượt lãi phạt, lãi trong hạn và gốc cho ' + active.length + ' khoản vay. Nếu tiền mặt không đủ, thao tác sẽ dừng và không khoản nào bị trừ. Điểm tín dụng được cập nhật ngay sau khi tất toán.',
          onConfirm: () => {
            const res = settleAllLoans();
            if (!res.ok) return toast('Không thể tất toán', res.error, 'error', '⚠️');
            if (currentRoute === 'credit') renderRoute();
          }
        });
        break;
      }
      case 'credit-score-info': creditScoreInfoModal(); break;
      case 'library-open': {
        if (el.closest('.modal')) closeModal();
        openLibraryEntry(id);
        break;
      }
      case 'library-random': {
        if (el.closest('.modal')) closeModal();
        openRandomLibraryEntry();
        break;
      }
      case 'library-chart-zoom': {
        const entry = libraryEntry(id);
        if (!entry || !entry.visual) break;
        const v = entry.visual;
        const legend = v.series && v.series.length > 1
          ? v.series.map(s => '<span><i style="background:' + (s.color || '#f3c56b') + '"></i>' + esc(s.name) + '</span>').join('')
          : '';
        openChartZoom({
          title: entry.title,
          sub: (v.title || 'Biểu đồ dữ liệu') + (v.unit ? ' · ' + v.unit : ''),
          svg: libraryChartSVG(v),
          legend,
          note: v.note || ''
        });
        break;
      }
      case 'library-save': {
        const saved = toggleLibrarySaved(id);
        if (el) {
          el.classList.toggle('active', saved);
          el.setAttribute('aria-pressed', saved ? 'true' : 'false');
          if (el.id === 'librarySaveBtn') {
            el.classList.toggle('btn-outline-gold', saved);
            el.innerHTML = icon('star') + ' ' + (saved ? 'Đã lưu' : 'Lưu mục');
          }
        }
        if (currentRoute === 'library') refreshLibraryGrid();
        toast(saved ? 'Đã lưu vào thư viện' : 'Đã bỏ lưu', saved ? 'Mục này sẽ nằm trong bộ sưu tập của bạn.' : 'Mục đã rời bộ sưu tập.', 'info', saved ? '⭐' : '🗑️');
        break;
      }
      case 'library-reset': {
        libraryQuery = '';
        libraryCategory = 'all';
        libraryLevel = 'all';
        if (currentRoute === 'library') renderRoute();
        break;
      }
      case 'wealth-quiz-submit': submitWealthQuiz(); break;
      case 'wealth-quiz-retake': {
        const w = ensureWealth();
        w.risk = null;
        w.quiz = { score: 0, answers: {}, at: 0 };
        saveNow();
        renderRoute();
        break;
      }
      case 'wealth-target-edit': openWealthTargetModal(); break;
      case 'wealth-target-save': saveWealthTarget(); break;
      case 'wealth-dca-add': addWealthDca(); break;
      case 'wealth-dca-toggle': toggleWealthDca(id); break;
      case 'wealth-dca-run': runWealthDcaNow(id); break;
      case 'wealth-dca-delete': deleteWealthDca(id); break;
      case 'wealth-goal-open': openWealthGoalModal(); break;
      case 'wealth-goal-create': createWealthGoal(); break;
      case 'wealth-goal-contribute-open': openWealthGoalContribute(id); break;
      case 'wealth-goal-contribute': contributeWealthGoal(id); break;
      case 'wealth-goal-delete': deleteWealthGoal(id); break;
      case 'wealth-rebalance': {
        const plan = wealthRebalancePlan();
        if (!plan.rows.length) {
          toast('Danh mục đang cân bằng', 'Không có lệnh nào cần thực hiện theo mục tiêu hiện tại.', 'info', '⚖️');
          break;
        }
        confirmAction({
          title: 'Tái cân bằng danh mục?', sub: plan.rows.length + ' lệnh sẽ được khớp theo giá hiện tại.', confirm: 'Thực hiện',
          body: 'Hệ thống sẽ bán phần vượt tỷ trọng, nạp tiết kiệm/vàng nếu cần và mua thêm cổ phiếu, ETF hoặc crypto còn thiếu. Phí và thuế bán được tính tự động. Tiền mặt sau tái cân bằng dự kiến: <b>' + fmtVND(plan.cashAfter) + '</b>.',
          onConfirm: () => executeWealthRebalance()
        });
        break;
      }
      case 'wealth-rebalance-refresh': renderRoute(); toast('Đã tính lại', 'Kế hoạch tái cân bằng được cập nhật theo giá và tỷ trọng mới nhất.', 'info', '⚖️'); break;
      case 'company-auto': {
        const c = ensureCompany();
        c.auto = !c.auto;
        saveNow();
        if (currentRoute === 'company') {
          startCompanyAuto();
          renderRoute();
        }
        toast(c.auto ? 'Đã bật tự động cập nhật' : 'Đã tắt tự động cập nhật', c.auto ? 'Giá cập nhật mỗi 30 giây, tin tức mỗi 60 giây, báo cáo tài chính làm mới mỗi 5 phút.' : 'Bạn có thể làm mới báo cáo và tin tức bằng nút Làm mới.', 'info', '🏢');
        break;
      }
      case 'job-start': startJobShift(id); break;
      case 'job-upgrade': buyJobUpgrade(id); break;
      case 'job-filter-reset':
        jobFilter.field = 'all'; jobFilter.task = 'all'; jobFilter.level = 'all'; jobFilter.q = '';
        refreshCurrentRoute();
        break;
      case 'prime-pick-profile': {
        primeUi.profile = PRIME_PROFILE_BY_ID[id] ? id : 'balanced';
        primeUi.deposit = Math.min(state.cash, PRIME_PROFILE_BY_ID[primeUi.profile].minDeposit);
        renderRoute();
        break;
      }
      case 'prime-deposit-preset': {
        primeUi.deposit = id === 'max' ? state.cash : Math.min(state.cash, Number(id) || 0);
        renderRoute();
        break;
      }
      case 'prime-activate': {
        const amountEl = $('#primeDepositInput');
        const amount = amountEl ? Number(amountEl.value) : primeUi.deposit;
        const res = primeActivate(primeUi.profile, amount);
        if (!res.ok) return toast('Không thể mở tài khoản', res.error, 'error', '⚠️');
        toast('PRIME đã mở', 'Hồ sơ ' + primeProfile().name + ' · nạp ' + fmtVND(amount) + ' · ' + D.PRIME_SETTLE_LABEL + '.', 'success', '💎');
        renderRoute();
        break;
      }
      case 'prime-open-deposit': openPrimeCashModal('deposit'); break;
      case 'prime-open-withdraw': openPrimeCashModal('withdraw'); break;
      case 'prime-cash-submit': {
        const input = $('#primeCashInput');
        const amount = input ? Number(input.value) : 0;
        const mode = el.getAttribute('data-mode');
        const res = mode === 'deposit' ? primeDeposit(amount) : primeWithdraw(amount);
        if (!res.ok) return toast('Không thể thực hiện', res.error, 'error', '⚠️');
        closeModal();
        toast(mode === 'deposit' ? 'Đã nạp vào PRIME' : 'Đã rút về ví chính', (mode === 'deposit' ? '+' : '−') + fmtVND(amount), 'success', '💎');
        primeRefreshPanels();
        break;
      }
      case 'prime-close': openPrimeCloseModal(); break;
      case 'prime-deactivate-confirm': {
        const res = primeDeactivate();
        if (!res.ok) return toast('Không thể đóng tài khoản', res.error, 'error', '⚠️');
        closeModal();
        renderRoute();
        break;
      }
      case 'prime-ticket-side':
        primeUi.side = id === 'sell' ? 'sell' : 'buy';
        primeUi.qty = 0;
        primeRenderTicket();
        break;
      case 'prime-ticket-sell': {
        primeUi.side = 'sell';
        primeUi.assetId = id;
        primeUi.qty = 0;
        primeUi.price = byId[id] ? byId[id].price : 0;
        primeRenderTicket();
        const ticket = $('#primeTicket');
        if (ticket) ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      case 'prime-qty': {
        primeUi.qty = primeQtyByPct(Number(id) || 25);
        primeRenderTicket();
        break;
      }
      case 'prime-submit': primeSubmitOrder(); break;
      case 'prime-cancel-order': {
        const res = primeCancelOrder(id);
        if (!res.ok) return toast('Không thể huỷ lệnh', res.error, 'error', '⚠️');
        toast('Đã huỷ lệnh', 'Tiền tạm giữ đã được hoàn lại.', 'info', '📋');
        primeRefreshPanels();
        break;
      }
      case 'arcade-play': arcadeStart(id); break;
      case 'coin-create-open': coinCreateModal(); break;
      case 'coin-trade': coinTrade(id, el.getAttribute('data-side') === 'sell' ? 'sell' : 'buy'); break;
      case 'coin-shill': coinShill(id); break;
      case 'coin-buyback-open': coinBuybackModal(id); break;
      case 'coin-airdrop-open': coinAirdropModal(id); break;
      case 'coin-lock': coinLockLiquidity(id); break;
      case 'coin-rug': coinRug(id); break;
      case 'auction-open': openAuctionModal(id); break;
      case 'delete-journal': state.journal = (state.journal || []).filter(j => j.id !== id); saveNow(); renderAnalysisTool(); break;
      case 'reset-account': {
        confirmAction({
          title: 'Đặt lại toàn bộ tài khoản?', sub: 'Hành động này không thể hoàn tác.', danger: true, confirm: 'Xoá và bắt đầu lại',
          body: 'Toàn bộ danh mục, lịch sử giao dịch, Aura, vật phẩm và nhật ký sẽ bị xoá khỏi trình duyệt này. Bạn sẽ quay về màn hình chào mừng với 1 tỷ ₫ ảo.',
          onConfirm: () => {
            try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('aurelis.drawings.v1'); } catch (e) { /* bỏ qua */ }
            location.hash = '#/dashboard';
            location.reload();
          }
        });
        break;
      }
      case 'close-palette': closeModal(); break;
      default: break;
    }
  }

  function bindShellEvents() {
    const menuBtn = $('#menuBtn');
    const drawerClose = $('#drawerClose');
    const scrim = $('#drawerScrim');
    if (menuBtn) menuBtn.addEventListener('click', () => document.body.classList.toggle('drawer-open'));
    if (drawerClose) drawerClose.addEventListener('click', () => document.body.classList.remove('drawer-open'));
    if (scrim) scrim.addEventListener('click', () => document.body.classList.remove('drawer-open'));
    const search = $('#globalSearchBtn');
    if (search) {
      search.addEventListener('click', openCommandPalette);
      search.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCommandPalette(); } });
    }
    const notif = $('#notifBtn');
    if (notif) notif.addEventListener('click', notificationsModal);
    const profile = $('#profileBtn');
    if (profile) profile.addEventListener('click', openProfile);
    const settings = $('#openSettings');
    if (settings) settings.addEventListener('click', () => settingsModal('profile'));
    const balance = $('#balancePill');
    if (balance) balance.addEventListener('click', () => handleAction(balance, 'toggle-privacy'));

    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        closeChartZoom();
        if (nav.closest('.modal')) closeModal();
        const target = nav.getAttribute('data-nav');
        if (location.hash === target) renderRoute(); else location.hash = target;
        document.body.classList.remove('drawer-open');
        return;
      }
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        e.preventDefault();
        handleAction(actionEl, actionEl.getAttribute('data-action'));
        return;
      }
      const fundOpen = e.target.closest('[data-fund-open]');
      if (fundOpen) {
        e.preventDefault();
        openFundModal(fundOpen.getAttribute('data-fund-open'));
        return;
      }
      if (e.target.closest('[data-drip-toggle]')) {
        e.preventDefault();
        toggleDividendDrip();
        return;
      }
      if (e.target.closest('[data-scroll-funds]')) {
        e.preventDefault();
        const target = $('#fundList');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const news = e.target.closest('[data-news-link]');
      if (news) {
        const link = news.getAttribute('data-news-link');
        if (link.startsWith('#/')) { location.hash = link; }
        else if (/^https?:\/\//i.test(link)) window.open(link, '_blank', 'noopener');
        return;
      }
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === 'Escape') {
        if ($('#chartZoomRoot') && $('#chartZoomRoot').children.length) { closeChartZoom(); return; }
        if ($('#modalRoot') && $('#modalRoot').children.length) { closeModal(); return; }
        if (document.body.classList.contains('drawer-open')) document.body.classList.remove('drawer-open');
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action][role="button"]')) {
        e.preventDefault();
        handleAction(e.target, e.target.getAttribute('data-action'));
      }
    });
    window.addEventListener('hashchange', () => { closeChartZoom(); renderRoute(); });
    window.addEventListener('resize', () => {
      if (currentRoute !== 'detective') return;
      clearTimeout(detectiveResizeTimer);
      detectiveResizeTimer = setTimeout(detectiveDrawChart, 120);
    });
  }

  /* ============================================================
     XƯỞNG COIN · COIN LAB (v1.13)
     Meme launchpad mô phỏng. Giá chạy bằng bonding curve nội bộ,
     dòng tiền là tiền ảo trong state.cash. Không token thật.
     ============================================================ */
  const COIN = D.COIN_CREATE;
  const COIN_THEMES_BY_ID = Object.create(null);
  D.COIN_THEMES.forEach(t => { COIN_THEMES_BY_ID[t.id] = t; });
  const COIN_CREATOR_FEE = 0.003;
  const COIN_SHILL_COST = 800000;
  const COIN_SHILL_MS = 60000;
  function coinTradeFeeRate() { return hasItem('perk_coin_fee') ? 0.0075 : COIN.tradeFee; }
  function coinShillCost() { return hasItem('perk_coin_creator') ? Math.round(COIN_SHILL_COST * 0.75) : COIN_SHILL_COST; }
  function coinActionCooldown(ms) { return hasItem('perk_coin_creator') ? Math.round(ms * 0.75) : ms; }
  function coinShillCd() { return coinActionCooldown(COIN_SHILL_MS); }
  let coinTimer = null;
  let coinFilter = 'all';
  let coinSort = 'hot';
  let coinSearch = '';
  let coinTradeSide = 'buy';
  let coinTradeAmount = '';
  let coinDetailDraw = null;
  let coinChartValues = [];
  let coinFeedStamp = '';

  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

  function coinDefault() {
    return {
      coins: {}, holdings: {}, events: [], history: [], created: [],
      trades: 0, realized: 0, bestSell: 0, hypeBest: 0, creatorEarned: 0, rugs: 0,
      buybacks: 0, burned: 0, airdrops: 0, locks: 0,
      selected: null, lastTick: 0, lastEvent: 0
    };
  }

  function ensureCoinLab() {
    if (!state.coin || typeof state.coin !== 'object') state.coin = coinDefault();
    const lab = state.coin;
    if (!lab.coins || typeof lab.coins !== 'object') lab.coins = {};
    if (!lab.holdings || typeof lab.holdings !== 'object') lab.holdings = {};
    if (!Array.isArray(lab.events)) lab.events = [];
    if (!Array.isArray(lab.history)) lab.history = [];
    if (!Array.isArray(lab.created)) lab.created = [];
    if (!Number.isFinite(lab.trades)) lab.trades = 0;
    if (!Number.isFinite(lab.realized)) lab.realized = 0;
    if (!Number.isFinite(lab.bestSell)) lab.bestSell = 0;
    if (!Number.isFinite(lab.hypeBest)) lab.hypeBest = 0;
    if (!Number.isFinite(lab.creatorEarned)) lab.creatorEarned = 0;
    if (!Number.isFinite(lab.rugs)) lab.rugs = 0;
    if (!Number.isFinite(lab.buybacks)) lab.buybacks = 0;
    if (!Number.isFinite(lab.burned)) lab.burned = 0;
    if (!Number.isFinite(lab.airdrops)) lab.airdrops = 0;
    if (!Number.isFinite(lab.locks)) lab.locks = 0;
    Object.values(lab.coins).forEach(coin => {
      if (!Number.isFinite(coin.burned)) coin.burned = 0;
      if (!Number.isFinite(coin.buybackAt)) coin.buybackAt = 0;
      if (!Number.isFinite(coin.airdropAt)) coin.airdropAt = 0;
      if (!Number.isFinite(coin.lockUntil)) coin.lockUntil = 0;
      if (!Number.isFinite(coin.lockAmount)) coin.lockAmount = 0;
      if (!Number.isFinite(coin.lockAt)) coin.lockAt = 0;
    });
    if (!Object.keys(lab.coins).length) {
      D.COIN_STARTERS.forEach(s => {
        const coin = coinStarter(s);
        lab.coins[coin.id] = coin;
        coinSeedHistory(coin, 52);
      });
      lab.selected = D.COIN_STARTERS[0].id;
      lab.lastEvent = Date.now() - 6000;
      const first = lab.coins[lab.selected];
      first.history = first.history || [];
      lab.events.push({
        t: Date.now(), coinId: first.id, emoji: first.emoji, kind: 'flat',
        text: 'Chợ coin mở cửa. Giá ở đây chạy bằng niềm tin và dòng tiền ảo — không có token thật nào được tạo ra.'
      });
    }
    if (!lab.selected || !lab.coins[lab.selected]) lab.selected = Object.keys(lab.coins)[0];
    return lab;
  }

  function coinStarter(s) {
    const theme = COIN_THEMES_BY_ID[s.theme] || D.COIN_THEMES[0];
    const coin = {
      id: s.id, name: s.name, ticker: s.ticker, emoji: s.emoji, theme: s.theme,
      color: s.color || theme.color, tagline: s.tagline, creator: s.creator, desc: s.desc,
      supply: s.supply, reserve: s.reserve, curveTokens: Math.round(s.supply * COIN.curvePct),
      holders: s.holders, hype: s.hype, vol: s.vol,
      bornAt: Date.now() - s.ageH * 3600000,
      dayOpen: 0, rugged: false, userCreated: false, creatorMe: false,
      history: [], volume: s.vol * 12000000, trades: Math.round(s.holders / 3),
      creatorEarned: 0, shillAt: 0, burned: 0, buybackAt: 0, airdropAt: 0,
      lockUntil: 0, lockAmount: 0, lockAt: 0
    };
    coin.dayOpen = coinPrice(coin) * (0.82 + Math.random() * 0.3);
    return coin;
  }

  function coinSeedHistory(coin, n) {
    const now = Date.now();
    const target = coinPrice(coin);
    let p = target * (0.8 + Math.random() * 0.5);
    const pts = [];
    for (let i = 0; i < n; i++) {
      p = Math.max(target * 0.2, p * (1 + (Math.random() - 0.488) * 0.045 * (coin.vol || 1)));
      pts.push({ t: now - (n - i) * 22 * 60000, p });
    }
    const last = pts[pts.length - 1];
    if (last && last.p > 0) {
      const scale = target / last.p;
      pts.forEach(pt => { pt.p *= scale; });
    }
    coin.history = pts;
    return pts;
  }

  function coinPrice(coin) { return coin && coin.curveTokens > 0 ? coin.reserve / coin.curveTokens : 0; }

  function coinPriceFmt(p) {
    if (!isFinite(p)) return '—';
    if (p >= 1000) return money(p) + ' ₫';
    if (p >= 1) return nf(p, 2) + ' ₫';
    if (p >= 0.01) return nf(p, 4) + ' ₫';
    return nf(p, 6) + ' ₫';
  }

  function coinChangePct(coin) {
    const base = Number(coin.dayOpen) || coinPrice(coin);
    return base ? (coinPrice(coin) / base - 1) * 100 : 0;
  }

  function coinMarketCap(coin) { return coinPrice(coin) * coin.supply; }

  function coinAgeLabel(coin) {
    const ms = Math.max(0, Date.now() - (coin.bornAt || Date.now()));
    const h = ms / 3600000;
    if (h < 1) return Math.max(1, Math.round(ms / 60000)) + ' phút';
    if (h < 24) return Math.round(h) + ' giờ';
    return Math.round(h / 24) + ' ngày';
  }

  function coinPushPoint(coin) {
    if (!Array.isArray(coin.history)) coin.history = [];
    coin.history.push({ t: Date.now(), p: coinPrice(coin) });
    if (coin.history.length > 140) coin.history = coin.history.slice(-140);
  }

  function coinBuyQuote(coin, amount) {
    amount = Math.max(0, Math.round(Number(amount) || 0));
    const fee = amount * coinTradeFeeRate();
    const net = amount - fee;
    const k = coin.reserve * coin.curveTokens;
    const tokenOut = net > 0 ? Math.max(0, coin.curveTokens - k / (coin.reserve + net)) : 0;
    const priceBefore = coinPrice(coin);
    const avg = tokenOut > 0 ? amount / tokenOut : 0;
    return {
      amount, fee, net, tokens: tokenOut, priceBefore, avg,
      priceAfter: net > 0 ? (coin.reserve + net) / Math.max(1, coin.curveTokens - tokenOut) : priceBefore,
      slippage: priceBefore > 0 && avg > 0 ? (avg / priceBefore - 1) * 100 : 0
    };
  }

  function coinSellQuote(coin, tokens) {
    tokens = Math.max(0, Number(tokens) || 0);
    const k = coin.reserve * coin.curveTokens;
    const gross = tokens > 0 ? Math.max(0, coin.reserve - k / (coin.curveTokens + tokens)) : 0;
    const fee = gross * coinTradeFeeRate();
    const priceBefore = coinPrice(coin);
    return {
      tokens, gross, fee, net: gross - fee, priceBefore,
      avg: tokens > 0 ? gross / tokens : 0,
      priceAfter: tokens > 0 ? (coin.reserve - gross) / Math.max(1, coin.curveTokens + tokens) : priceBefore,
      slippage: priceBefore > 0 && gross > 0 ? (1 - (gross / tokens) / priceBefore) * 100 : 0
    };
  }

  function coinPortfolioValue() {
    const lab = ensureCoinLab();
    return Object.keys(lab.holdings).reduce((sum, id) => {
      const coin = lab.coins[id];
      const h = lab.holdings[id];
      if (!coin || !h || !(h.qty > 0)) return sum;
      return sum + h.qty * coinPrice(coin);
    }, 0);
  }

  function coinPortfolioCardHTML() {
    const lab = ensureCoinLab();
    const rows = Object.keys(lab.holdings).map(id => {
      const coin = lab.coins[id];
      const h = lab.holdings[id];
      if (!coin || !h || !(h.qty > 0)) return null;
      const value = h.qty * coinPrice(coin);
      const cost = h.cost || 0;
      const pnl = value - cost;
      return { coin, qty: h.qty, cost, value, pnl, pnlPct: cost > 0 ? pnl / cost * 100 : 0 };
    }).filter(Boolean).sort((a, b) => b.value - a.value);
    const totalValue = rows.reduce((s, r) => s + r.value, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const totalPnl = totalValue - totalCost;
    if (!rows.length) {
      return '<section class="card coin-portfolio-card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Danh mục coin</div><div class="card-sub">Chưa có vị thế nào</div></div></div><div class="coin-portfolio-empty">Mua một ít coin để xem phân bổ, giá vốn và lãi lỗ chưa thực hiện tại đây.</div></section>';
    }
    const top = rows[0];
    const topWeight = totalValue > 0 ? top.value / totalValue * 100 : 0;
    return '<section class="card coin-portfolio-card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Danh mục coin</div><div class="card-sub">' + rows.length + ' coin · phân bổ theo giá trị thị trường</div></div><span class="badge">' + fmtVND(totalValue) + '</span></div>' +
      '<div class="coin-portfolio-stats"><div><span>Giá trị hiện tại</span><b>' + fmtVND(totalValue) + '</b></div><div><span>Giá vốn</span><b>' + fmtVND(totalCost) + '</b></div><div><span>Lãi/lỗ chưa thực hiện</span><b class="' + changeCls(totalPnl) + '">' + (totalPnl >= 0 ? '+' : '') + fmtVND(totalPnl) + '</b></div><div><span>Tỷ trọng lớn nhất</span><b>' + esc(top.coin.ticker) + ' · ' + nf(topWeight, 1) + '%</b></div></div>' +
      (topWeight >= 55 ? '<div class="coin-portfolio-note">' + icon('info') + ' Hơn nửa danh mục đang nằm trong ' + esc(top.coin.ticker) + '. Nếu coin đó quay đầu, toàn bộ danh mục sẽ đi theo.</div>' : '<div class="coin-portfolio-note calm">' + icon('info') + ' Danh mục tạm cân bằng. Nhưng coin ảo vẫn có thể mất thanh khoản bất cứ lúc nào.</div>') +
      '<div class="coin-portfolio-table-wrap"><table class="coin-portfolio-table"><thead><tr><th>Coin</th><th>Số lượng</th><th>Giá vốn</th><th>Giá hiện tại</th><th>Giá trị</th><th>Lãi/lỗ</th><th>Tỷ trọng</th></tr></thead><tbody>' +
      rows.map(r => {
        const weight = totalValue > 0 ? r.value / totalValue * 100 : 0;
        return '<tr><td><button type="button" class="cp-coin" data-coin-select="' + r.coin.id + '"><span class="coin-avatar" style="--cc:' + r.coin.color + '">' + r.coin.emoji + '</span><span><b>' + esc(r.coin.ticker) + '</b><small>' + esc(r.coin.name) + '</small></span></button></td>' +
          '<td>' + nf(r.qty / 1e6, 2) + ' tr</td>' +
          '<td>' + fmtVND(r.cost) + '</td>' +
          '<td>' + coinPriceFmt(coinPrice(r.coin)) + '</td>' +
          '<td><b>' + fmtVND(r.value) + '</b></td>' +
          '<td class="' + changeCls(r.pnl) + '">' + (r.pnl >= 0 ? '+' : '') + fmtVND(r.pnl) + '<small>' + fmtPct(r.pnlPct) + '</small></td>' +
          '<td><div class="cp-weight"><span style="width:' + clamp(weight, 0, 100) + '%"></span></div><small>' + nf(weight, 1) + '%</small></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  function coinHoldingInfo(coin) {
    const lab = ensureCoinLab();
    const h = lab.holdings[coin.id];
    if (!h || !(h.qty > 0)) return null;
    const value = h.qty * coinPrice(coin);
    const cost = h.cost || 0;
    return { qty: h.qty, cost, value, pnl: value - cost, pnlPct: cost > 0 ? (value - cost) / cost * 100 : 0 };
  }

  function coinTrackHype(lab) {
    lab = lab || ensureCoinLab();
    let best = lab.hypeBest || 0;
    Object.values(lab.coins).forEach(c => { if (c.userCreated && c.hype > best) best = c.hype; });
    lab.hypeBest = best;
    return best;
  }

  function coinCreatorFee(coin, amount, silent) {
    if (!coin || !coin.creatorMe) return 0;
    const lab = ensureCoinLab();
    const fee = Math.max(0, amount) * COIN_CREATOR_FEE;
    if (!fee) return 0;
    state.cash += fee;
    lab.creatorEarned += fee;
    coin.creatorEarned = (coin.creatorEarned || 0) + fee;
    if (!silent) toast('Phí creator', '+' + fmtVND(fee) + ' từ giao dịch ' + coin.ticker + '.', 'gold', '🪙');
    return fee;
  }

  function coinAddEvent(coin, kind, text) {
    const lab = ensureCoinLab();
    lab.events.unshift({
      t: Date.now(), coinId: coin ? coin.id : '',
      emoji: coin ? coin.emoji : '📡', kind: kind || 'flat', text
    });
    lab.events = lab.events.slice(0, 36);
    coinFeedStamp = '';
  }

  function coinApplyEvent(force) {
    const lab = ensureCoinLab();
    const now = Date.now();
    if (!force && now - (lab.lastEvent || 0) < 9000) return null;
    const pool = Object.values(lab.coins).filter(c => !c.rugged);
    if (!pool.length) return null;
    let total = 0;
    const weights = pool.map(c => { const w = 1 + c.hype / 10 + (c.userCreated ? 2 : 0); total += w; return w; });
    let roll = Math.random() * total;
    let coin = pool[0];
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { coin = pool[i]; break; }
    }
    let evTotal = 0;
    D.COIN_EVENTS.forEach(ev => { evTotal += ev.weight || 1; });
    let evRoll = Math.random() * evTotal;
    let ev = D.COIN_EVENTS[0];
    for (let i = 0; i < D.COIN_EVENTS.length; i++) {
      evRoll -= D.COIN_EVENTS[i].weight || 1;
      if (evRoll <= 0) { ev = D.COIN_EVENTS[i]; break; }
    }
    coin.hype = clamp(coin.hype + (ev.hype || 0) * (0.75 + Math.random() * 0.7), 0, 100);
    if (ev.kind === 'up') coin.reserve *= 1 + (0.004 + Math.random() * 0.018);
    else if (ev.kind === 'down') coin.reserve = Math.max(coin.reserve * 0.35, coin.reserve * (1 - (0.004 + Math.random() * 0.02)));
    const amount = nf(coin.supply * (0.002 + Math.random() * 0.012) / 1e6, 1) + ' triệu token';
    const text = String(ev.text || '')
      .replace(/\{name\}/g, coin.name)
      .replace(/\{ticker\}/g, coin.ticker)
      .replace(/\{emoji\}/g, coin.emoji)
      .replace(/\{amount\}/g, amount);
    const holderDelta = ev.kind === 'up' ? Math.floor(Math.random() * 8) : ev.kind === 'down' ? -Math.floor(Math.random() * 6) : 0;
    coin.holders = Math.max(1, coin.holders + holderDelta);
    coinPushPoint(coin);
    coinAddEvent(coin, ev.kind, text);
    coinTrackHype(lab);
    lab.lastEvent = now;
    return { coin, ev, text };
  }

  function coinTick() {
    if (document.hidden) return;
    const lab = ensureCoinLab();
    const picks = shuffleList(Object.values(lab.coins)).slice(0, 4);
    picks.forEach(coin => {
      if (coin.rugged) { coin.hype = Math.max(0, coin.hype - 0.6); return; }
      const vol = coin.vol || 1;
      const locked = coin.lockUntil > Date.now();
      const drift = (Math.random() - 0.5) * 0.024 * vol + ((coin.hype - 50) / 50) * 0.0016 + (locked ? 0.0008 : 0);
      coin.reserve = Math.max(10000, coin.reserve * (1 + drift));
      if (Math.random() < 0.8) {
        const buyChance = clamp(0.48 + (coin.hype - 50) / 240 + (locked ? 0.06 : 0), 0.26, 0.78);
        const size = coin.reserve * (0.0015 + Math.random() * 0.0065);
        if (Math.random() < buyChance) {
          const q = coinBuyQuote(coin, size);
          if (q.tokens > 0) {
            coin.reserve += q.net;
            coin.curveTokens = Math.max(coin.supply * 0.03, coin.curveTokens - q.tokens);
            coin.hype = clamp(coin.hype + 0.5, 0, 100);
            coin.holders += Math.random() < 0.2 ? 1 + Math.floor(Math.random() * 3) : 0;
            coin.volume += size;
            coinCreatorFee(coin, size, true);
          }
        } else {
          const tokens = coin.curveTokens * (0.001 + Math.random() * 0.004);
          const q = coinSellQuote(coin, tokens);
          if (q.gross > 0) {
            coin.reserve = Math.max(10000, coin.reserve - q.gross);
            coin.curveTokens += tokens;
            coin.hype = clamp(coin.hype - 0.45, 0, 100);
            coin.volume += q.gross;
            coinCreatorFee(coin, q.gross, true);
          }
        }
        coin.trades++;
      }
      coin.hype = clamp(coin.hype + (50 - coin.hype) * 0.01, 0, 100);
      coinPushPoint(coin);
    });
    coinTrackHype(lab);
    if (Math.random() < 0.32) coinApplyEvent(false);
    lab.lastTick = Date.now();
    updateCoinLive();
    save();
  }

  function coinTrade(coinId, side) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin) return toast('Không tìm thấy coin', 'Coin này không còn trong chợ.', 'error', '👻');
    if (coin.rugged) return toast('Coin đã bị rút thanh khoản', 'Không nên mua lại một coin đã bị bỏ rơi. Đây chính là bài học.', 'error', '⚠️');
    if (side === 'buy') {
      const amount = Math.round(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0);
      if (amount < COIN.minBuy) return toast('Lệnh quá nhỏ', 'Mua tối thiểu ' + fmtVND(COIN.minBuy) + '.', 'error', '⚠️');
      if (amount > COIN.maxBuy) return toast('Vượt hạn mức mỗi lệnh', 'Tối đa ' + fmtVND(COIN.maxBuy) + ' mỗi lệnh để hạn chế một ví thao túng cả ao.', 'error', '⚠️');
      if (amount > state.cash) return toast('Không đủ tiền mặt', 'Cần ' + fmtVND(amount) + ', đang có ' + fmtVND(state.cash) + '.', 'error', '💰');
      const q = coinBuyQuote(coin, amount);
      if (!(q.tokens > 0)) return toast('Không thể khớp lệnh', 'Thanh khoản hiện tại quá mỏng.', 'error', '⚠️');
      state.cash -= amount;
      const h = lab.holdings[coinId] || (lab.holdings[coinId] = { qty: 0, cost: 0 });
      h.qty += q.tokens;
      h.cost = (h.cost || 0) + amount;
      coin.reserve += q.net;
      coin.curveTokens = Math.max(coin.supply * 0.03, coin.curveTokens - q.tokens);
      coin.hype = clamp(coin.hype + 2 + (amount / Math.max(1, coin.reserve)) * 14, 0, 100);
      coin.holders += Math.random() < 0.5 ? 1 : 0;
      coin.volume += amount;
      coin.trades++;
      coinPushPoint(coin);
      lab.trades++;
      state.stats.trades++;
      addXP(9);
      addAura(2);
      progressQuest('trade', 1);
      lab.history.unshift({ t: Date.now(), coinId, side: 'buy', qty: q.tokens, amount, pnl: 0 });
      lab.history = lab.history.slice(0, 40);
      coinCreatorFee(coin, amount, true);
      coinAddEvent(coin, 'up', 'Một lệnh mua ' + fmtVND(amount) + ' đổ vào ' + coin.name + '. Giá nhích lên ' + fmtPct((q.priceAfter / q.priceBefore - 1) * 100) + '.');
      coinTrackHype(lab);
      snapshotEquity(true);
      saveNow();
      updateShell();
      coinTradeAmount = '';
      renderRoute();
      toast('Đã mua ' + coin.ticker, 'Nhận ' + nf(q.tokens / 1e6, 2) + ' triệu token · giá vốn ' + coinPriceFmt(q.avg) + '.', 'success', coin.emoji);
      return;
    }
    const h = lab.holdings[coinId];
    if (!h || !(h.qty > 0)) return toast('Không có token để bán', 'Bạn chưa giữ ' + coin.ticker + '.', 'error', coin.emoji);
    const pct = clamp(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0, 0, 100);
    if (pct <= 0) return toast('Chọn tỷ lệ bán', 'Nhập hoặc chọn 25%, 50%, 75% hay 100%.', 'info', '📐');
    const tokens = h.qty * pct / 100;
    const q = coinSellQuote(coin, tokens);
    if (!(q.net > 0)) return toast('Không thể khớp lệnh', 'Thanh khoản còn quá ít để bán.', 'error', '⚠️');
    const costPart = (h.cost || 0) * (tokens / h.qty);
    const pnl = q.net - costPart;
    const gainPct = costPart > 0 ? (pnl / costPart) * 100 : 0;
    state.cash += q.net;
    coin.reserve = Math.max(10000, coin.reserve - q.gross);
    coin.curveTokens += tokens;
    coin.hype = clamp(coin.hype - 2 - (q.gross / Math.max(1, coin.reserve)) * 14, 0, 100);
    coin.volume += q.gross;
    coin.trades++;
    h.qty -= tokens;
    h.cost = Math.max(0, (h.cost || 0) - costPart);
    if (h.qty < 1e-6) delete lab.holdings[coinId];
    coinPushPoint(coin);
    lab.trades++;
    lab.realized += pnl;
    lab.bestSell = Math.max(lab.bestSell || 0, gainPct);
    state.realized += pnl;
    state.stats.trades++;
    addXP(9);
    addAura(pnl > 0 ? 4 : 1);
    progressQuest('trade', 1);
    lab.history.unshift({ t: Date.now(), coinId, side: 'sell', qty: tokens, amount: q.net, pnl });
    lab.history = lab.history.slice(0, 40);
    coinCreatorFee(coin, q.gross, true);
    coinAddEvent(coin, pnl >= 0 ? 'up' : 'down', 'Một lệnh bán ' + fmtVND(q.net) + ' ' + coin.ticker + ' khớp xong. Giá lùi về ' + coinPriceFmt(q.priceAfter) + '.');
    coinTrackHype(lab);
    snapshotEquity(true);
    saveNow();
    updateShell();
    coinTradeAmount = '';
    renderRoute();
    toast(pnl >= 0 ? 'Đã chốt lời ' + coin.ticker : 'Đã cắt lỗ ' + coin.ticker,
      (pnl >= 0 ? '+' : '') + fmtVND(pnl) + ' ₫ · bán ' + nf(tokens / 1e6, 2) + ' triệu token.', pnl >= 0 ? 'success' : 'error', coin.emoji);
  }

  function coinShill(coinId) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated) return;
    if (coin.rugged) return toast('Coin đã bị bỏ rơi', 'Không thể hâm nóng một coin đã rút thanh khoản.', 'error', '🪤');
    const now = Date.now();
    const cost = coinShillCost();
    const cd = coinShillCd();
    if (coin.shillAt && now - coin.shillAt < cd) {
      return toast('Đang lan truyền', 'Đợi ' + Math.ceil((cd - (now - coin.shillAt)) / 1000) + ' giây nữa rồi chạy bài tiếp.', 'info', '📣');
    }
    if (state.cash < cost) return toast('Không đủ tiền chạy bài', 'Cần ' + fmtVND(cost) + ', đang có ' + fmtVND(state.cash) + '.', 'error', '💰');
    state.cash -= cost;
    coin.shillAt = now;
    const hypeGain = 9 + Math.random() * 8;
    coin.hype = clamp(coin.hype + hypeGain, 0, 100);
    coin.reserve += cost * 0.55;
    coin.holders += 5 + Math.floor(Math.random() * 40);
    coin.volume += cost;
    coinPushPoint(coin);
    lab.hypeBest = Math.max(lab.hypeBest, coin.hype);
    coinAddEvent(coin, 'up', 'Creator chi ' + fmtVND(cost) + ' chạy bài cho ' + coin.name + '. Hype tăng ' + nf(hypeGain, 0) + ' điểm, giá nhích theo.');
    saveNow();
    updateShell();
    renderRoute();
    toast('Đã chạy bài', 'Hype +' + nf(hypeGain, 0) + ' · một phần tiền chảy vào pool.', 'gold', '📣');
  }

  function coinCooldownLeft(at, ms) { return Math.max(0, coinActionCooldown(ms) - (Date.now() - (at || 0))); }

  function coinBuybackQuoteHTML(coin, amount) {
    amount = Math.round(Number(amount) || 0);
    if (!amount) return '<span class="dim">Nhập số tiền muốn dùng để mua lại token.</span>';
    if (amount < COIN.buybackMin) return '<span class="down">Tối thiểu ' + fmtVND(COIN.buybackMin) + ' mỗi lần.</span>';
    if (amount > COIN.buybackMax) return '<span class="down">Tối đa ' + fmtVND(COIN.buybackMax) + ' mỗi lần.</span>';
    if (amount > state.cash) return '<span class="down">Thiếu ' + fmtVND(amount - state.cash) + ' tiền mặt.</span>';
    const q = coinBuyQuote(coin, amount);
    const supplyAfter = Math.max(1, coin.supply - q.tokens);
    return '<div class="coin-quote-grid"><div><span>Token mua & đốt</span><b>' + nf(q.tokens / 1e6, 3) + ' triệu</b></div><div><span>Giá sau đốt</span><b>' + coinPriceFmt(q.priceAfter) + '</b></div><div><span>Nguồn cung còn</span><b>' + nf(supplyAfter / 1e6, 1) + ' triệu</b></div></div><div class="coin-quote-foot">Phí mua lại ' + fmtVND(q.fee) + ' · token bị đốt vĩnh viễn khỏi nguồn cung.</div>';
  }

  function coinBuybackModal(coinId) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    const left = coinCooldownLeft(coin.buybackAt, COIN.buybackCooldown);
    if (left > 0) return toast('Lò đốt đang nguội', 'Đợi ' + Math.ceil(left / 1000) + ' giây nữa rồi mua lại tiếp.', 'info', '⏳');
    let amount = Math.min(COIN.buybackMax, Math.max(COIN.buybackMin, 5000000));
    openModal({
      title: '🔥 Mua lại & đốt token',
      sub: coin.emoji + ' ' + esc(coin.name) + ' · ' + esc(coin.ticker) + ' · hành động của creator',
      size: 'modal-sm',
      body: '<p class="modal-note">Bạn dùng tiền mặt mua token từ bonding curve rồi đốt vĩnh viễn. Giá có thể tăng vì thanh khoản dày hơn và nguồn cung giảm, nhưng đây chỉ là mô phỏng.</p>' +
        '<div class="coin-amount-row" style="margin-top:10px"><input class="coin-amount-input" id="coinBuybackInput" inputmode="numeric" autocomplete="off" value="' + amount + '"><span>₫</span></div>' +
        '<div class="coin-quick">' + [COIN.buybackMin, 5000000, 10000000, COIN.buybackMax].map(v => '<button type="button" data-buyback-quick="' + v + '">' + money(v) + '</button>').join('') + '<button type="button" data-buyback-quick="max">Tối đa</button></div>' +
        '<div class="coin-quote" id="coinBuybackQuote">' + coinBuybackQuoteHTML(coin, amount) + '</div>' +
        '<div class="risk-warning-inline">' + icon('info') + ' Đốt token không tạo ra giá trị thật. Ngoài đời, buyback chỉ đáng tin khi minh bạch ví và có nguồn tiền rõ ràng.</div>' +
        '<div class="trade-error" id="coinBuybackError"></div>',
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="coinBuybackBtn">Mua & đốt</button>',
      onOpen: modal => {
        const input = modal.querySelector('#coinBuybackInput');
        const quote = modal.querySelector('#coinBuybackQuote');
        const paint = () => { if (quote) quote.innerHTML = coinBuybackQuoteHTML(coin, input ? input.value : 0); };
        if (input) input.addEventListener('input', paint);
        modal.querySelectorAll('[data-buyback-quick]').forEach(b => b.addEventListener('click', () => {
          const v = b.getAttribute('data-buyback-quick');
          amount = v === 'max' ? Math.min(COIN.buybackMax, Math.floor(state.cash)) : Number(v);
          if (input) input.value = amount;
          paint();
        }));
        const btn = modal.querySelector('#coinBuybackBtn');
        if (btn) btn.addEventListener('click', () => coinBuybackSubmit(coinId, input ? input.value : 0));
        paint();
      }
    });
  }

  function coinBuybackSubmit(coinId, rawAmount) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    const left = coinCooldownLeft(coin.buybackAt, COIN.buybackCooldown);
    if (left > 0) return toast('Lò đốt đang nguội', 'Đợi ' + Math.ceil(left / 1000) + ' giây nữa.', 'info', '⏳');
    const amount = Math.round(Number(String(rawAmount).replace(/[^\d]/g, '')) || 0);
    if (amount < COIN.buybackMin) return toast('Số tiền quá nhỏ', 'Mua lại tối thiểu ' + fmtVND(COIN.buybackMin) + '.', 'error', '⚠️');
    if (amount > COIN.buybackMax) return toast('Vượt hạn mức', 'Mỗi lần mua lại tối đa ' + fmtVND(COIN.buybackMax) + '.', 'error', '⚠️');
    if (amount > state.cash) return toast('Không đủ tiền mặt', 'Cần ' + fmtVND(amount) + ', đang có ' + fmtVND(state.cash) + '.', 'error', '💰');
    const q = coinBuyQuote(coin, amount);
    if (!(q.tokens > 0)) return toast('Không thể mua lại', 'Thanh khoản hiện tại quá mỏng.', 'error', '⚠️');
    state.cash -= amount;
    coin.reserve += q.net;
    coin.curveTokens = Math.max(coin.supply * 0.03, coin.curveTokens - q.tokens);
    coin.supply = Math.max(1, coin.supply - q.tokens);
    coin.burned = (coin.burned || 0) + q.tokens;
    coin.hype = clamp(coin.hype + 4 + Math.random() * 6, 0, 100);
    coin.holders += Math.random() < 0.5 ? 1 : 0;
    coin.volume += amount;
    coin.buybackAt = Date.now();
    lab.buybacks++;
    lab.burned += q.tokens;
    coinPushPoint(coin);
    coinAddEvent(coin, 'up', 'Creator mua lại và đốt ' + nf(q.tokens / 1e6, 2) + ' triệu ' + coin.ticker + '. Nguồn cung giảm, giá nhích lên ' + coinPriceFmt(q.priceAfter) + '.');
    coinTrackHype(lab);
    snapshotEquity(true);
    saveNow();
    updateShell();
    closeModal();
    renderRoute();
    addXP(12);
    addAura(5);
    toast('Đã đốt token', nf(q.tokens / 1e6, 2) + ' triệu ' + coin.ticker + ' biến mất khỏi nguồn cung.', 'success', '🔥');
  }

  function coinAirdropQuoteHTML(coin, pct) {
    const lab = ensureCoinLab();
    const h = lab.holdings[coin.id];
    pct = clamp(Number(pct) || 0, 0, COIN.airdropMaxPct);
    if (!h || !(h.qty > 0)) return '<span class="down">Bạn không còn token để airdrop.</span>';
    const tokens = h.qty * pct / 100;
    const value = tokens * coinPrice(coin);
    const recipients = Math.max(1, Math.round(4 + pct * 3 + coin.hype / 12));
    return '<div class="coin-quote-grid"><div><span>Token phát</span><b>' + nf(tokens / 1e6, 3) + ' triệu</b></div><div><span>Giá trị ước tính</span><b>' + fmtVND(value) + '</b></div><div><span>Ví nhận dự kiến</span><b>~' + nf(recipients, 0) + '</b></div></div><div class="coin-quote-foot">Phí tổ chức ' + fmtVND(COIN.airdropCost) + ' · token lấy từ ví creator, không tạo thêm nguồn cung.</div>';
  }

  function coinAirdropModal(coinId) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    const h = lab.holdings[coinId];
    if (!h || !(h.qty > 0)) return toast('Không có token để phát', 'Bạn cần giữ token của coin này trước khi airdrop.', 'info', coin.emoji);
    const left = coinCooldownLeft(coin.airdropAt, COIN.airdropCooldown);
    if (left > 0) return toast('Đang chuẩn bị đợt phát', 'Đợi ' + Math.ceil(left / 1000) + ' giây nữa rồi airdrop tiếp.', 'info', '⏳');
    let pct = 5;
    openModal({
      title: '🪂 Airdrop cho cộng đồng',
      sub: coin.emoji + ' ' + esc(coin.name) + ' · ' + esc(coin.ticker),
      size: 'modal-sm',
      body: '<p class="modal-note">Bạn chia một phần token đang giữ cho người theo dõi. Hype và số người giữ sẽ tăng, nhưng vị thế của bạn nhỏ lại. Đây là token mô phỏng, không có giá trị thật.</p>' +
        '<div class="coin-trade-balance" style="margin-top:10px">Đang giữ: <b>' + nf(h.qty / 1e6, 2) + ' triệu token</b> · Tiền mặt: <b>' + fmtVND(state.cash) + '</b></div>' +
        '<div class="coin-amount-label">Tỷ lệ token muốn phát</div>' +
        '<div class="coin-quick">' + [1, 2, 5, 10].map(v => '<button type="button" class="' + (v === pct ? 'on' : '') + '" data-airdrop-pct="' + v + '">' + v + '%</button>').join('') + '</div>' +
        '<div class="coin-quote" id="coinAirdropQuote">' + coinAirdropQuoteHTML(coin, pct) + '</div>' +
        '<div class="risk-warning-inline">' + icon('info') + ' Airdrop không phải lãi. Nếu bạn phát hết token, bạn không còn vị thế để bán khi giá tăng.</div>' +
        '<div class="trade-error" id="coinAirdropError"></div>',
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="coinAirdropBtn">Phát token · ' + fmtVND(COIN.airdropCost) + '</button>',
      onOpen: modal => {
        const quote = modal.querySelector('#coinAirdropQuote');
        modal.querySelectorAll('[data-airdrop-pct]').forEach(b => b.addEventListener('click', () => {
          pct = Number(b.getAttribute('data-airdrop-pct'));
          modal.querySelectorAll('[data-airdrop-pct]').forEach(x => x.classList.toggle('on', x === b));
          if (quote) quote.innerHTML = coinAirdropQuoteHTML(coin, pct);
        }));
        const btn = modal.querySelector('#coinAirdropBtn');
        if (btn) btn.addEventListener('click', () => coinAirdropSubmit(coinId, pct));
      }
    });
  }

  function coinAirdropSubmit(coinId, pct) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    const left = coinCooldownLeft(coin.airdropAt, COIN.airdropCooldown);
    if (left > 0) return toast('Đang chuẩn bị đợt phát', 'Đợi ' + Math.ceil(left / 1000) + ' giây nữa.', 'info', '⏳');
    const h = lab.holdings[coinId];
    if (!h || !(h.qty > 0)) return toast('Không có token để phát', 'Ví creator đã hết token.', 'error', coin.emoji);
    pct = clamp(Number(pct) || 0, COIN.airdropMinPct, COIN.airdropMaxPct);
    const tokens = h.qty * pct / 100;
    if (!(tokens > 0)) return toast('Tỷ lệ không hợp lệ', 'Chọn từ ' + COIN.airdropMinPct + '% đến ' + COIN.airdropMaxPct + '%.', 'error', '⚠️');
    if (state.cash < COIN.airdropCost) return toast('Không đủ phí tổ chức', 'Cần ' + fmtVND(COIN.airdropCost) + '.', 'error', '💰');
    state.cash -= COIN.airdropCost;
    const costPart = (h.cost || 0) * (pct / 100);
    h.qty -= tokens;
    h.cost = Math.max(0, (h.cost || 0) - costPart);
    if (h.qty < 1e-6) delete lab.holdings[coinId];
    const hypeGain = 3 + pct * 0.45 + Math.random() * 4;
    coin.hype = clamp(coin.hype + hypeGain, 0, 100);
    coin.holders += Math.round(6 + pct * 4 + Math.random() * 20);
    coin.airdropAt = Date.now();
    lab.airdrops++;
    coinPushPoint(coin);
    coinAddEvent(coin, 'up', 'Creator airdrop ' + nf(tokens / 1e6, 2) + ' triệu ' + coin.ticker + ' cho cộng đồng. Hype +' + nf(hypeGain, 0) + ' và thêm người giữ mới.');
    coinTrackHype(lab);
    snapshotEquity(true);
    saveNow();
    updateShell();
    closeModal();
    renderRoute();
    addXP(10);
    addAura(4);
    toast('Đã airdrop', 'Phát ' + nf(tokens / 1e6, 2) + ' triệu token · hype +' + nf(hypeGain, 0) + '.', 'gold', '🪂');
  }

  function coinLockLiquidity(coinId) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    const now = Date.now();
    if (coin.lockUntil > now) return toast('Thanh khoản đang khoá', 'LP sẽ mở sau ' + Math.ceil((coin.lockUntil - now) / 60000) + ' phút.', 'info', '🔒');
    const left = coinCooldownLeft(coin.lockAt, COIN.lockCooldown);
    if (left > 0) return toast('Chưa thể khoá lại', 'Đợi ' + Math.ceil(left / 1000) + ' giây nữa.', 'info', '⏳');
    if (state.cash < COIN.lockCost) return toast('Không đủ phí khoá', 'Cần ' + fmtVND(COIN.lockCost) + '.', 'error', '💰');
    const lockAmount = coin.reserve * 0.3;
    confirmAction({
      title: '🔒 Khoá thanh khoản?',
      sub: coin.emoji + ' ' + esc(coin.name) + ' · ' + Math.ceil(COIN.lockDuration / 60000) + ' phút',
      body: 'Bạn cam kết khoá <b>30% thanh khoản</b> — khoảng <b>' + fmtVND(lockAmount) + '</b> — trong <b>' + Math.ceil(COIN.lockDuration / 60000) + ' phút</b>. Trong thời gian này không thể rút thanh khoản, đổi lại cộng đồng tin hơn và bot mua vào nhiều hơn.<br><br>Phí khoá: <b>' + fmtVND(COIN.lockCost) + '</b>. Khoá LP trong game không đảm bảo coin ngoài đời an toàn.',
      confirm: 'Khoá LP · ' + fmtVND(COIN.lockCost),
      onConfirm: () => {
        state.cash -= COIN.lockCost;
        coin.lockUntil = Date.now() + COIN.lockDuration;
        coin.lockAmount = lockAmount;
        coin.lockAt = Date.now();
        coin.hype = clamp(coin.hype + 5 + Math.random() * 5, 0, 100);
        coin.holders += Math.round(2 + Math.random() * 10);
        lab.locks++;
        coinPushPoint(coin);
        coinAddEvent(coin, 'up', 'Creator khoá ' + fmtVND(lockAmount) + ' thanh khoản ' + coin.ticker + ' trong ' + Math.ceil(COIN.lockDuration / 60000) + ' phút. Cộng đồng thở phào.');
        coinTrackHype(lab);
        snapshotEquity(true);
        saveNow();
        updateShell();
        renderRoute();
        addXP(8);
        addAura(4);
        toast('Đã khoá thanh khoản', 'LP khoá đến ' + new Date(coin.lockUntil).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + '.', 'success', '🔒');
      }
    });
  }

  function coinRug(coinId) {
    const lab = ensureCoinLab();
    const coin = lab.coins[coinId];
    if (!coin || !coin.userCreated || coin.rugged) return;
    if (coin.lockUntil > Date.now()) {
      return toast('Thanh khoản đang khoá', 'Bạn đã cam kết khoá LP còn ' + Math.ceil((coin.lockUntil - Date.now()) / 60000) + ' phút. Không thể rút trước hạn.', 'info', '🔒');
    }
    const age = Date.now() - (coin.bornAt || Date.now());
    if (age < COIN.rugMinAge) {
      return toast('Chưa đủ tuổi rút', 'Coin phải tồn tại ít nhất 10 phút. Còn ' + Math.ceil((COIN.rugMinAge - age) / 60000) + ' phút.', 'info', '⏳');
    }
    const pull = coin.reserve * 0.85;
    const receive = pull * 0.95;
    confirmAction({
      title: 'Rút thanh khoản?',
      sub: coin.emoji + ' ' + esc(coin.name) + ' · ' + esc(coin.ticker),
      danger: true,
      body: 'Bạn sẽ lấy <b>' + fmtVND(receive) + '</b> khỏi pool và để giá sụp gần như toàn bộ. Những người đang giữ coin — kể cả bạn — sẽ thấy giá trị bốc hơi.<br><br><b>Ngoài đời, đây là hành vi lừa đảo (rug pull).</b> Trong game, đây chỉ là mô phỏng để bạn hiểu vì sao đừng mua coin vô danh chỉ vì thấy giá đang tăng.',
      confirm: 'Vẫn rút thanh khoản',
      onConfirm: () => {
        coin.reserve = Math.max(300000, coin.reserve * 0.15);
        coin.rugged = true;
        coin.hype = Math.max(2, coin.hype * 0.2);
        state.cash += receive;
        lab.rugs++;
        coinAddEvent(coin, 'down', 'Thanh khoản ' + coin.name + ' bị rút. Giá sụp ' + nf(85, 0) + '% trong vài giây. Cộng đồng mất gần như toàn bộ.');
        pushNotif('🪤', 'Rug pull mô phỏng', 'Bạn vừa rút thanh khoản ' + coin.name + '. Ngoài đời, đây là hành vi lừa đảo và bị xử lý hình sự.');
        saveNow();
        updateShell();
        renderRoute();
        toast('Đã rút thanh khoản', 'Nhận ' + fmtVND(receive) + ' ₫ ảo — nhưng đây là hành vi xấu ngoài đời.', 'error', '🪤');
      }
    });
  }

  function coinSelected() {
    const lab = ensureCoinLab();
    return lab.coins[lab.selected] || Object.values(lab.coins)[0] || null;
  }

  function coinListFiltered() {
    const lab = ensureCoinLab();
    const q = coinSearch.trim().toLowerCase();
    const now = Date.now();
    const list = Object.values(lab.coins).filter(coin => {
      if (coinFilter === 'hot' && coin.hype < 65) return false;
      if (coinFilter === 'new' && now - coin.bornAt > 24 * 3600000) return false;
      if (coinFilter === 'mine' && !coin.userCreated) return false;
      if (coinFilter === 'holding' && !(lab.holdings[coin.id] && lab.holdings[coin.id].qty > 0)) return false;
      if (q && !(coin.name + ' ' + coin.ticker + ' ' + coin.tagline + ' ' + coin.creator).toLowerCase().includes(q)) return false;
      return true;
    });
    const sorters = {
      hot: (a, b) => b.hype - a.hype,
      gain: (a, b) => coinChangePct(b) - coinChangePct(a),
      mcap: (a, b) => coinMarketCap(b) - coinMarketCap(a),
      new: (a, b) => b.bornAt - a.bornAt,
      price: (a, b) => coinPrice(b) - coinPrice(a)
    };
    list.sort(sorters[coinSort] || sorters.hot);
    return list;
  }

  function coinCardHTML(coin) {
    const lab = ensureCoinLab();
    const price = coinPrice(coin);
    const chg = coinChangePct(coin);
    const held = lab.holdings[coin.id];
    const selected = lab.selected === coin.id;
    return '<button type="button" class="coin-row ' + (selected ? 'selected' : '') + '" data-coin-select="' + coin.id + '">' +
      '<span class="coin-avatar" style="--cc:' + coin.color + '">' + coin.emoji + (coin.userCreated ? '<i>của bạn</i>' : '') + '</span>' +
      '<span class="coin-main"><span class="coin-name-line"><b>' + esc(coin.name) + '</b><em>' + esc(coin.ticker) + '</em>' + (coin.rugged ? '<span class="coin-tag down">đã rút</span>' : '') + '</span>' +
      '<span class="coin-sub">' + nf(coin.holders, 0) + ' người giữ · ' + coinAgeLabel(coin) + (held && held.qty > 0 ? ' · đang giữ' : '') + '</span></span>' +
      '<canvas class="coin-spark" data-coin-spark="' + coin.id + '" aria-hidden="true"></canvas>' +
      '<span class="coin-nums"><b data-coin-price="' + coin.id + '">' + coinPriceFmt(price) + '</b><em class="' + changeCls(chg) + '" data-coin-chg="' + coin.id + '">' + fmtPct(chg) + '</em></span>' +
      '<span class="coin-hype-mini" title="Hype ' + Math.round(coin.hype) + '/100"><span data-coin-hype="' + coin.id + '" style="width:' + clamp(coin.hype, 0, 100) + '%"></span></span>' +
      '</button>';
  }

  function coinListHTML() {
    const list = coinListFiltered();
    if (!list.length) {
      return '<div class="empty-state coin-empty"><div class="empty-icon">🌱</div><strong>Chưa có coin nào khớp</strong><p>Thử đổi bộ lọc hoặc tự tạo coin đầu tiên của bạn.</p><button class="btn btn-gold btn-sm" data-action="coin-create-open">+ Tạo coin</button></div>';
    }
    return '<div class="coin-rows">' + list.map(coinCardHTML).join('') + '</div>';
  }

  function coinFeedHTML() {
    const lab = ensureCoinLab();
    if (!lab.events.length) return '<div class="coin-feed-empty">Chưa có tin gì. Thị trường đang ngủ.</div>';
    return '<div class="coin-feed">' + lab.events.slice(0, 14).map(e => {
      const c = e.coinId ? lab.coins[e.coinId] : null;
      return '<div class="coin-feed-row ' + (e.kind || 'flat') + '"><span class="coin-feed-emoji">' + (e.emoji || '📡') + '</span><div><p>' + esc(e.text) + '</p><span>' + (c ? '<b>' + esc(c.ticker) + '</b> · ' : '') + timeAgo(e.t) + '</span></div></div>';
    }).join('') + '</div>';
  }

  function coinHypeNote(coin) {
    if (coin.rugged) return 'Hype đã tắt sau khi thanh khoản bị rút.';
    if (coin.hype >= 80) return 'Cộng đồng đang rất hưng phấn. Đây thường là lúc người vào sau dễ mua đắt nhất.';
    if (coin.hype >= 60) return 'Hype khá cao. Có dòng tiền vào nhưng cũng dễ đảo chiều.';
    if (coin.hype >= 40) return 'Thị trường đang lưỡng lự. Chưa có gì đảm bảo giá sẽ tăng tiếp.';
    if (coin.hype >= 20) return 'Hype thấp. Coin đang ngủ hoặc cộng đồng đã mất kiên nhẫn.';
    return 'Gần như không còn ai quan tâm. Thanh khoản sẽ rất mỏng nếu bạn cần bán.';
  }

  function coinQuoteHTML(coin) {
    if (coinTradeSide === 'buy') {
      const amount = Math.round(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0);
      if (!amount) return '<span class="dim">Nhập số tiền để xem giá khớp dự kiến.</span>';
      if (amount < COIN.minBuy) return '<span class="down">Tối thiểu ' + fmtVND(COIN.minBuy) + ' mỗi lệnh.</span>';
      if (amount > COIN.maxBuy) return '<span class="down">Tối đa ' + fmtVND(COIN.maxBuy) + ' mỗi lệnh.</span>';
      if (amount > state.cash) return '<span class="down">Thiếu ' + fmtVND(amount - state.cash) + ' tiền mặt.</span>';
      const q = coinBuyQuote(coin, amount);
      return '<div class="coin-quote-grid"><div><span>Nhận dự kiến</span><b>' + nf(q.tokens / 1e6, 3) + ' triệu token</b></div><div><span>Giá vốn</span><b>' + coinPriceFmt(q.avg) + '</b></div><div><span>Trượt giá</span><b class="' + (q.slippage > 1 ? 'down' : '') + '">' + fmtPct(q.slippage) + '</b></div></div><div class="coin-quote-foot">Phí ' + fmtVND(q.fee) + ' · giá sau lệnh ' + coinPriceFmt(q.priceAfter) + '</div>';
    }
    const holding = coinHoldingInfo(coin);
    if (!holding) return '<span class="dim">Bạn không giữ ' + esc(coin.ticker) + ' nên không thể bán.</span>';
    const pct = clamp(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0, 0, 100);
    if (!pct) return '<span class="dim">Chọn tỷ lệ bán để xem số tiền nhận được.</span>';
    const tokens = holding.qty * pct / 100;
    const q = coinSellQuote(coin, tokens);
    const costPart = holding.cost * (pct / 100);
    const pnl = q.net - costPart;
    return '<div class="coin-quote-grid"><div><span>Bán</span><b>' + nf(tokens / 1e6, 3) + ' triệu token</b></div><div><span>Nhận dự kiến</span><b>' + fmtVND(q.net) + '</b></div><div><span>Lãi/lỗ</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + fmtVND(pnl) + '</b></div></div><div class="coin-quote-foot">Phí ' + fmtVND(q.fee) + ' · trượt giá ' + fmtPct(q.slippage) + '</div>';
  }

  function coinHoldingHTML(coin) {
    const h = coinHoldingInfo(coin);
    if (!h) return '<div class="coin-holding-empty">Bạn chưa giữ ' + esc(coin.ticker) + '. Mua thử một ít để cảm nhận độ trượt giá.</div>';
    return '<div class="coin-holding-grid"><div><span>Số lượng</span><b>' + nf(h.qty / 1e6, 2) + ' tr token</b></div><div><span>Giá trị</span><b>' + fmtVND(h.value) + '</b></div><div><span>Vốn</span><b>' + fmtVND(h.cost) + '</b></div><div><span>Lãi/lỗ</span><b class="' + changeCls(h.pnl) + '">' + (h.pnl >= 0 ? '+' : '') + fmtVND(h.pnl) + ' (' + fmtPct(h.pnlPct) + ')</b></div></div>';
  }

  function coinTradePanelHTML(coin) {
    const holding = coinHoldingInfo(coin);
    const isBuy = coinTradeSide === 'buy';
    const now = Date.now();
    const shillLeft = coin.userCreated && coin.shillAt ? coinCooldownLeft(coin.shillAt, COIN_SHILL_MS) : 0;
    const rugLeft = coin.userCreated && !coin.rugged ? Math.max(0, COIN.rugMinAge - (now - coin.bornAt)) : 0;
    const buybackLeft = coin.userCreated ? coinCooldownLeft(coin.buybackAt, COIN.buybackCooldown) : 0;
    const airdropLeft = coin.userCreated ? coinCooldownLeft(coin.airdropAt, COIN.airdropCooldown) : 0;
    const lockLeft = coin.userCreated ? Math.max(coin.lockUntil > now ? coin.lockUntil - now : 0, coinCooldownLeft(coin.lockAt, COIN.lockCooldown)) : 0;
    const creatorActions = coin.userCreated ? [
      { action: 'coin-shill', emoji: '📣', label: 'Chạy bài', note: shillLeft > 0 ? 'chờ ' + Math.ceil(shillLeft / 1000) + 's' : fmtVND(coinShillCost()), disabled: shillLeft > 0 || coin.rugged },
      { action: 'coin-buyback-open', emoji: '🔥', label: 'Mua & đốt', note: buybackLeft > 0 ? 'chờ ' + Math.ceil(buybackLeft / 1000) + 's' : fmtVND(COIN.buybackMin) + '+', disabled: buybackLeft > 0 || coin.rugged },
      { action: 'coin-airdrop-open', emoji: '🪂', label: 'Airdrop', note: airdropLeft > 0 ? 'chờ ' + Math.ceil(airdropLeft / 1000) + 's' : fmtVND(COIN.airdropCost), disabled: airdropLeft > 0 || coin.rugged || !holding },
      { action: 'coin-lock', emoji: '🔒', label: 'Khoá LP', note: lockLeft > 0 ? 'chờ ' + Math.ceil(lockLeft / 60000) + ' phút' : fmtVND(COIN.lockCost), disabled: lockLeft > 0 || coin.rugged },
      { action: 'coin-rug', emoji: '🪤', label: 'Rút thanh khoản', note: rugLeft > 0 ? 'chờ ' + Math.ceil(rugLeft / 60000) + ' phút' : 'về 0', disabled: rugLeft > 0 || coin.rugged, danger: true }
    ] : [];
    return '<div class="coin-trade" id="coinTradePanel">' +
      '<div class="coin-trade-tabs"><button type="button" class="' + (isBuy ? 'on buy' : '') + '" data-coin-side="buy">Mua</button><button type="button" class="' + (!isBuy ? 'on sell' : '') + '" data-coin-side="sell">Bán</button></div>' +
      '<div class="coin-trade-balance">' + (isBuy ? 'Tiền mặt: <b>' + fmtVND(state.cash) + '</b>' : holding ? 'Đang giữ: <b>' + nf(holding.qty / 1e6, 2) + ' triệu token</b>' : 'Bạn chưa giữ coin này') + '</div>' +
      '<label class="coin-amount-label" for="coinAmount">' + (isBuy ? 'Số tiền muốn mua (₫)' : 'Tỷ lệ token muốn bán (%)') + '</label>' +
      '<div class="coin-amount-row"><input class="coin-amount-input" id="coinAmount" inputmode="numeric" autocomplete="off" value="' + esc(coinTradeAmount) + '" placeholder="' + (isBuy ? 'Tối thiểu 100.000' : 'Ví dụ 50') + '"><span>' + (isBuy ? '₫' : '%') + '</span></div>' +
      '<div class="coin-quick">' + (isBuy
        ? [100000, 1000000, 5000000, 10000000].map(v => '<button type="button" data-coin-quick="' + v + '">' + money(v) + '</button>').join('') + '<button type="button" data-coin-quick="max">Tối đa</button>'
        : [25, 50, 75, 100].map(v => '<button type="button" data-coin-quick="' + v + '">' + v + '%</button>').join('')) + '</div>' +
      '<div class="coin-quote" id="coinQuote">' + coinQuoteHTML(coin) + '</div>' +
      '<button class="btn ' + (isBuy ? 'btn-gold' : 'btn-down') + ' btn-block" id="coinTradeBtn" data-action="coin-trade" data-id="' + coin.id + '" data-side="' + (isBuy ? 'buy' : 'sell') + '">' + (isBuy ? 'Mua ' + esc(coin.ticker) : 'Bán ' + esc(coin.ticker)) + '</button>' +
      (coin.userCreated
        ? '<div class="coin-creator-panel"><div class="coin-creator-head"><span>' + icon('sparkles') + ' Hành động creator</span><span class="coin-creator-tag">coin của bạn</span></div><div class="coin-creator-grid">' +
          creatorActions.map(a => '<button type="button" class="coin-creator-btn' + (a.danger ? ' danger' : '') + '" data-action="' + a.action + '" data-id="' + coin.id + '" ' + (a.disabled ? 'disabled' : '') + '><span class="ccb-emoji">' + a.emoji + '</span><span class="ccb-label">' + a.label + '</span><span class="ccb-note">' + a.note + '</span></button>').join('') +
          '</div><p class="coin-creator-hint">Hành động creator chỉ là mô phỏng. Ngoài đời, mua lại và khoá thanh khoản vẫn có thể là chiêu trò nếu ví không minh bạch.</p></div>'
        : '') +
      '<p class="coin-trade-note">Phí ' + nf(coinTradeFeeRate() * 100, 2) + '% mỗi lệnh · giá khớp theo thanh khoản · tiền ảo, không phải token thật.</p></div>';
  }

  function coinDetailHTML() {
    const coin = coinSelected();
    if (!coin) return '<div class="empty-state"><div class="empty-icon">🪙</div><strong>Chưa có coin</strong><p>Tạo coin đầu tiên để bắt đầu.</p></div>';
    const price = coinPrice(coin);
    const chg = coinChangePct(coin);
    return '<div class="coin-detail-head">' +
      '<div class="coin-detail-id"><span class="coin-avatar lg" style="--cc:' + coin.color + '">' + coin.emoji + '</span><div><div class="coin-detail-name"><h2>' + esc(coin.name) + '</h2><span>' + esc(coin.ticker) + '</span></div><div class="coin-detail-meta">' + esc(coin.tagline) + ' · tạo bởi ' + esc(coin.creator) + (coin.userCreated ? ' · <b class="up">coin của bạn</b>' : '') + '</div></div></div>' +
      '<div class="coin-detail-price"><b id="coinDetailPrice">' + coinPriceFmt(price) + '</b><span id="coinDetailChange" class="coin-detail-change ' + changeCls(chg) + '">' + fmtPct(chg) + '</span></div></div>' +
      '<div class="coin-detail-stats"><div><span>Vốn hóa</span><b id="coinDetailMcap">' + fmtVND(coinMarketCap(coin)) + '</b></div><div><span>Thanh khoản</span><b id="coinDetailReserve">' + fmtVND(coin.reserve) + '</b></div><div><span>Người giữ</span><b id="coinDetailHolders">' + nf(coin.holders, 0) + '</b></div><div><span>Volume</span><b id="coinDetailVolume">' + fmtVND(coin.volume) + '</b></div><div><span>Tuổi coin</span><b>' + coinAgeLabel(coin) + '</b></div>' +
      (coin.burned > 0 ? '<div><span>Đã đốt</span><b class="up">' + nf(coin.burned / 1e6, 2) + ' tr</b></div>' : '') +
      (coin.lockUntil > Date.now() ? '<div><span>LP đang khoá</span><b class="' + (coin.lockAmount ? 'up' : '') + '">' + Math.ceil((coin.lockUntil - Date.now()) / 60000) + ' phút</b></div>' : '') +
      (coin.userCreated && coin.creatorEarned > 0 ? '<div><span>Phí creator</span><b class="up">' + fmtVND(coin.creatorEarned) + '</b></div>' : '') +
      '</div>' +
      '<div class="coin-hype-box"><div class="coin-hype-label"><span>' + icon('flame') + ' Hype cộng đồng</span><b id="coinDetailHype">' + nf(coin.hype, 0) + '/100</b></div><div class="coin-hype-bar"><span id="coinDetailHypeBar" style="width:' + clamp(coin.hype, 0, 100) + '%"></span></div><div class="coin-hype-note">' + coinHypeNote(coin) + '</div></div>' +
      '<div class="coin-chart-wrap"><canvas id="coinChart" class="coin-chart" aria-label="Biểu đồ giá ' + esc(coin.ticker) + '"></canvas></div>' +
      (coin.rugged ? '<div class="coin-rug-state">🪤 Thanh khoản của coin này đã bị rút. Giá sụp và cộng đồng gần như mất trắng. Đây là điều rug pull ngoài đời gây ra.</div>' : '') +
      '<div class="coin-holding"><div class="coin-holding-head">' + icon('wallet') + ' Vị thế của bạn</div><div id="coinHoldingBox">' + coinHoldingHTML(coin) + '</div></div>' +
      coinTradePanelHTML(coin) +
      '<div class="coin-desc">' + esc(coin.desc || '') + '</div>';
  }

  function coinHTML() {
    const lab = ensureCoinLab();
    const list = coinListFiltered();
    const filters = [['all', 'Tất cả'], ['hot', 'Đang nóng'], ['new', 'Mới 24h'], ['mine', 'Của tôi'], ['holding', 'Đang giữ']];
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('coin') + ' XƯỞNG COIN</div><h1>Xưởng Coin</h1>' +
      '<p class="sub">Tạo coin bằng một cái tên, một biểu tượng và vài triệu đồng ảo. Không token thật, không ví thật, không blockchain — chỉ có dòng tiền, hype và bài học về thanh khoản.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/library">' + icon('book') + ' Đọc về bẫy coin</button><button class="btn btn-gold btn-sm" data-action="coin-create-open">' + icon('plus') + ' Tạo coin</button></div></div>' +
      '<div class="coin-warning">' + icon('alert') + '<div><b>Đây là sân chơi mô phỏng.</b> Không token nào được tạo trên blockchain, không ai nạp hay rút tiền thật. Ngoài đời, phần lớn meme coin do người vô danh tạo ra sẽ về 0.</div></div>' +
      '<div class="coin-kpis"><div class="prime-kpi"><span>Coin đang giữ</span><b>' + fmtVND(coinPortfolioValue()) + '</b><em>' + Object.keys(lab.holdings).length + ' coin trong ví</em></div>' +
      '<div class="prime-kpi"><span>Lãi thực hiện</span><b class="' + changeCls(lab.realized) + '">' + (lab.realized >= 0 ? '+' : '') + fmtVND(lab.realized) + '</b><em>Từ các lệnh đã bán</em></div>' +
      '<div class="prime-kpi"><span>Coin đã tạo</span><b>' + lab.created.length + '</b><em>' + lab.rugs + ' lần rút thanh khoản</em></div>' +
      '<div class="prime-kpi"><span>Lệnh coin</span><b>' + lab.trades + '</b><em>Mua và bán trong Xưởng</em></div>' +
      '<div class="prime-kpi"><span>Hype cao nhất</span><b class="' + (lab.hypeBest >= 80 ? 'up' : '') + '">' + nf(lab.hypeBest, 0) + '</b><em>Trên coin bạn tạo</em></div>' +
      '<div class="prime-kpi"><span>Phí creator</span><b>' + fmtVND(lab.creatorEarned) + '</b><em>0,3% mỗi giao dịch</em></div></div>' +
      coinPortfolioCardHTML() +
      '<div class="coin-layout"><section class="card coin-list-card"><div class="card-head"><div><div class="card-title">' + icon('candles') + ' Chợ coin</div><div class="card-sub" id="coinListSub">' + list.length + ' coin đang hiển thị · giá bằng VND ảo</div></div>' +
      '<select class="select coin-sort" id="coinSort">' + [['hot', 'Hype cao'], ['gain', 'Tăng mạnh'], ['mcap', 'Vốn hóa'], ['new', 'Mới nhất'], ['price', 'Giá cao']].map(o => '<option value="' + o[0] + '"' + (coinSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="coin-filterbar"><div class="coin-chips">' + filters.map(f => '<button type="button" class="coin-chip ' + (coinFilter === f[0] ? 'on' : '') + '" data-coin-filter="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
      '<div class="coin-search">' + icon('search') + '<input id="coinSearchInput" type="search" placeholder="Tìm tên hoặc ticker…" value="' + esc(coinSearch) + '"></div></div>' +
      '<div id="coinList">' + coinListHTML() + '</div></section>' +
      '<div class="coin-side"><section class="card coin-detail-card" id="coinDetail">' + coinDetailHTML() + '</section>' +
      '<section class="card coin-feed-card"><div class="card-head"><div><div class="card-title">' + icon('flame') + ' Tin từ chợ</div><div class="card-sub">Tin đồn, ví lớn và những cú xả hàng</div></div><span class="badge">' + lab.events.length + '</span></div><div id="coinFeed">' + coinFeedHTML() + '</div></section></div></div>';
  }

  function drawCoinSparks() {
    const lab = ensureCoinLab();
    $$('[data-coin-spark]').forEach(canvas => {
      const coin = lab.coins[canvas.getAttribute('data-coin-spark')];
      if (!coin) return;
      const values = (coin.history || []).slice(-40).map(p => p.p);
      const up = coinChangePct(coin) >= 0;
      CH.MiniChart.line(canvas, values.length > 1 ? values : [coinPrice(coin), coinPrice(coin)], {
        axis: false, labels: false, padLeft: 2, padRight: 2, width: 1.4,
        color: up ? '#2ee6a6' : '#ff5d73'
      });
    });
  }

  function refreshCoinList() {
    const el = $('#coinList');
    if (!el) return;
    el.innerHTML = coinListHTML();
    const sub = $('#coinListSub');
    if (sub) sub.textContent = coinListFiltered().length + ' coin đang hiển thị · giá bằng VND ảo';
    drawCoinSparks();
  }

  function updateCoinQuote() {
    const coin = coinSelected();
    const box = $('#coinQuote');
    if (!coin || !box) return;
    box.innerHTML = coinQuoteHTML(coin);
    const btn = $('#coinTradeBtn');
    if (!btn) return;
    if (coinTradeSide === 'buy') {
      const amount = Math.round(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0);
      btn.disabled = !(amount >= COIN.minBuy && amount <= COIN.maxBuy && amount <= state.cash);
    } else {
      const holding = coinHoldingInfo(coin);
      const pct = clamp(Number(String(coinTradeAmount).replace(/[^\d]/g, '')) || 0, 0, 100);
      btn.disabled = !holding || pct <= 0;
    }
  }

  function mountCoinDetail() {
    const coin = coinSelected();
    if (!coin) return;
    const canvas = $('#coinChart');
    if (canvas) {
      coinChartValues = (coin.history || []).map(p => p.p);
      const up = coinChangePct(coin) >= 0;
      coinDetailDraw = CH.MiniChart.line(canvas, coinChartValues, {
        color: up ? '#2ee6a6' : '#ff5d73',
        baseline: coin.dayOpen,
        formatAxis: v => coinPriceFmt(v).replace(' ₫', ''),
        xLabels: (coin.history || []).map(p => {
          const d = new Date(p.t);
          return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }),
        padRight: 56
      });
    }
    const input = $('#coinAmount');
    if (input) {
      input.value = coinTradeAmount;
      input.addEventListener('input', () => {
        coinTradeAmount = input.value;
        updateCoinQuote();
      });
    }
    $$('[data-coin-quick]').forEach(btn => btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-coin-quick');
      if (coinTradeSide === 'buy' && v === 'max') {
        coinTradeAmount = String(Math.max(0, Math.min(COIN.maxBuy, Math.floor(state.cash))));
      } else {
        coinTradeAmount = String(v);
      }
      if (input) input.value = coinTradeAmount;
      updateCoinQuote();
    }));
    $$('[data-coin-side]').forEach(btn => btn.addEventListener('click', () => {
      const side = btn.getAttribute('data-coin-side');
      if (side === coinTradeSide) return;
      coinTradeSide = side;
      coinTradeAmount = '';
      refreshCoinDetail();
    }));
    updateCoinQuote();
  }

  function refreshCoinDetail() {
    const el = $('#coinDetail');
    if (!el) return;
    el.innerHTML = coinDetailHTML();
    mountCoinDetail();
  }

  function coinSelect(id) {
    const lab = ensureCoinLab();
    if (!lab.coins[id]) return;
    lab.selected = id;
    coinTradeAmount = '';
    coinTradeSide = 'buy';
    save();
    renderRoute();
  }

  function mountCoin() {
    ensureCoinLab();
    const search = $('#coinSearchInput');
    if (search) {
      search.value = coinSearch;
      search.addEventListener('input', () => { coinSearch = search.value; refreshCoinList(); });
    }
    const sort = $('#coinSort');
    if (sort) sort.addEventListener('change', () => { coinSort = sort.value; refreshCoinList(); });
    $$('[data-coin-filter]').forEach(chip => chip.addEventListener('click', () => {
      coinFilter = chip.getAttribute('data-coin-filter');
      $$('[data-coin-filter]').forEach(x => x.classList.toggle('on', x === chip));
      refreshCoinList();
    }));
    const list = $('#coinList');
    if (list) list.addEventListener('click', e => {
      const row = e.target.closest('[data-coin-select]');
      if (!row) return;
      coinSelect(row.getAttribute('data-coin-select'));
    });
    mountCoinDetail();
    setTimeout(drawCoinSparks, 0);
    updateCoinLive();
  }

  function updateCoinLive() {
    if (currentRoute !== 'coin') return;
    const lab = ensureCoinLab();
    const setText = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
    Object.keys(lab.coins).forEach(id => {
      const coin = lab.coins[id];
      const chg = coinChangePct(coin);
      setText('[data-coin-price="' + id + '"]', coinPriceFmt(coinPrice(coin)));
      const chgEl = document.querySelector('[data-coin-chg="' + id + '"]');
      if (chgEl) { chgEl.textContent = fmtPct(chg); chgEl.className = changeCls(chg); }
      const hypeEl = document.querySelector('[data-coin-hype="' + id + '"]');
      if (hypeEl) hypeEl.style.width = clamp(coin.hype, 0, 100) + '%';
    });
    const coin = coinSelected();
    if (coin) {
      const chg = coinChangePct(coin);
      setText('#coinDetailPrice', coinPriceFmt(coinPrice(coin)));
      const chgEl = document.querySelector('#coinDetailChange');
      if (chgEl) { chgEl.textContent = fmtPct(chg); chgEl.className = 'coin-detail-change ' + changeCls(chg); }
      setText('#coinDetailMcap', fmtVND(coinMarketCap(coin)));
      setText('#coinDetailReserve', fmtVND(coin.reserve));
      setText('#coinDetailHolders', nf(coin.holders, 0));
      setText('#coinDetailVolume', fmtVND(coin.volume));
      setText('#coinDetailHype', nf(coin.hype, 0) + '/100');
      const hypeBar = document.querySelector('#coinDetailHypeBar');
      if (hypeBar) hypeBar.style.width = clamp(coin.hype, 0, 100) + '%';
      if (coin.history && coin.history.length) {
        coinChartValues.length = 0;
        coin.history.forEach(pt => coinChartValues.push(pt.p));
        if (coinDetailDraw) coinDetailDraw();
      }
      const holdingBox = $('#coinHoldingBox');
      if (holdingBox) holdingBox.innerHTML = coinHoldingHTML(coin);
      updateCoinQuote();
    }
    const stamp = String(lab.events.length) + ':' + (lab.events[0] ? lab.events[0].t : 0);
    if (stamp !== coinFeedStamp) {
      coinFeedStamp = stamp;
      const feed = $('#coinFeed');
      if (feed) feed.innerHTML = coinFeedHTML();
    }
  }

  function coinRandomIdea() {
    const pre = pickOne(D.COIN_NAME_PARTS.pre);
    const core = pickOne(D.COIN_NAME_PARTS.core);
    const post = Math.random() < 0.55 ? ' ' + pickOne(D.COIN_NAME_PARTS.post) : '';
    const theme = pickOne(D.COIN_THEMES);
    const symbols = ['🚀', '🐸', '🐕', '🪷', '👻', '🤖', '🧋', '🥖', '🪙', '⚡', '🌙', '🔥', '🐋', '🍜', '🦊'];
    const taglines = [
      'Cộng đồng tin là đủ', 'Không roadmap, chỉ có niềm tin', 'Meme trước, hỏi sau',
      'Sản phẩm sẽ có sau', 'Đi cùng nhau tới mặt trăng', 'Một cú click, một giấc mơ'
    ];
    return {
      name: pre + ' ' + core + post,
      ticker: (core + (post ? post.trim() : '')).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'COIN',
      theme: theme.id, emoji: pickOne(symbols), tagline: pickOne(taglines)
    };
  }

  function coinCreateModal() {
    const total = COIN.fee + COIN.liquidity;
    const idea = coinRandomIdea();
    openModal({
      title: '🛠️ Tạo coin mới',
      sub: 'Phát hành một meme coin trong game bằng tiền ảo. Không token thật nào được sinh ra.',
      size: 'modal-lg',
      body: '<div class="coin-create">' +
        '<div class="coin-create-grid">' +
        '<label class="field"><span class="field-label">Tên coin</span><input class="input" id="coinNameInput" maxlength="28" value="' + esc(idea.name) + '"></label>' +
        '<label class="field"><span class="field-label">Ticker</span><input class="input" id="coinTickerInput" maxlength="8" value="' + esc(idea.ticker) + '"></label>' +
        '<label class="field"><span class="field-label">Biểu tượng</span><input class="input" id="coinEmojiInput" maxlength="4" value="' + esc(idea.emoji) + '"></label>' +
        '<label class="field"><span class="field-label">Câu giới thiệu</span><input class="input" id="coinTaglineInput" maxlength="60" value="' + esc(idea.tagline) + '"></label>' +
        '</div>' +
        '<div class="coin-theme-grid" id="coinThemeGrid">' + D.COIN_THEMES.map(t => '<button type="button" class="coin-theme ' + (t.id === idea.theme ? 'on' : '') + '" data-coin-theme="' + t.id + '" style="--cc:' + t.color + '"><span>' + t.icon + '</span><b>' + esc(t.name) + '</b></button>').join('') + '</div>' +
        '<div class="coin-create-summary"><div><span>Phí tạo coin</span><b>' + fmtVND(COIN.fee) + '</b></div><div><span>Thanh khoản vào pool</span><b>' + fmtVND(COIN.liquidity) + '</b></div><div><span>Tổng cần có</span><b>' + fmtVND(total) + '</b></div><div><span>Bạn nhận</span><b>' + nf(COIN.supply * COIN.creatorPct / 1e6, 0) + ' triệu token (5%)</b></div></div>' +
        '<div class="coin-create-note">' + icon('info') + ' Giá do pool quyết định, không phải bạn đặt. Creator hưởng 0,3% phí mỗi giao dịch và có thể chạy bài để đẩy hype.</div>' +
        '<div class="coin-create-actions"><button type="button" class="btn btn-ghost btn-sm" id="coinRandomBtn">' + icon('refresh') + ' Ý tưởng khác</button><span class="dim">Tiền mặt: ' + fmtVND(state.cash) + '</span></div></div>',
      foot: '<button class="btn btn-ghost btn-sm" data-close-modal>Huỷ</button><button class="btn btn-gold btn-sm" id="coinCreateBtn"' + (state.cash < total ? ' disabled' : '') + '>Ra mắt coin · ' + fmtVND(total) + '</button>',
      onOpen: modal => {
        let themeId = idea.theme;
        const fields = {
          name: modal.querySelector('#coinNameInput'),
          ticker: modal.querySelector('#coinTickerInput'),
          emoji: modal.querySelector('#coinEmojiInput'),
          tagline: modal.querySelector('#coinTaglineInput')
        };
        const grid = modal.querySelector('#coinThemeGrid');
        if (grid) grid.addEventListener('click', e => {
          const btn = e.target.closest('[data-coin-theme]');
          if (!btn) return;
          themeId = btn.getAttribute('data-coin-theme');
          grid.querySelectorAll('[data-coin-theme]').forEach(b => b.classList.toggle('on', b === btn));
          const theme = COIN_THEMES_BY_ID[themeId];
          if (theme && fields.emoji && !fields.emoji.dataset.touched) fields.emoji.value = theme.icon;
        });
        if (fields.emoji) fields.emoji.addEventListener('input', () => { fields.emoji.dataset.touched = '1'; });
        const randomBtn = modal.querySelector('#coinRandomBtn');
        if (randomBtn) randomBtn.addEventListener('click', () => {
          const next = coinRandomIdea();
          themeId = next.theme;
          if (fields.name) fields.name.value = next.name;
          if (fields.ticker) fields.ticker.value = next.ticker;
          if (fields.emoji) { fields.emoji.value = next.emoji; delete fields.emoji.dataset.touched; }
          if (fields.tagline) fields.tagline.value = next.tagline;
          if (grid) grid.querySelectorAll('[data-coin-theme]').forEach(b => b.classList.toggle('on', b.getAttribute('data-coin-theme') === themeId));
        });
        const createBtn = modal.querySelector('#coinCreateBtn');
        if (createBtn) createBtn.addEventListener('click', () => coinCreateSubmit(themeId, fields));
      }
    });
  }

  function coinCreateSubmit(themeId, fields) {
    const name = (fields.name.value || '').trim();
    const ticker = (fields.ticker.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const emoji = (fields.emoji.value || '').trim().slice(0, 4) || '🪙';
    const tagline = (fields.tagline.value || '').trim().slice(0, 60);
    if (name.length < 2) return toast('Tên quá ngắn', 'Đặt tên coin ít nhất 2 ký tự.', 'error', '✏️');
    if (ticker.length < 2) return toast('Ticker không hợp lệ', 'Ticker cần ít nhất 2 ký tự chữ hoặc số.', 'error', '🔤');
    const lab = ensureCoinLab();
    if (Object.values(lab.coins).some(c => c.ticker === ticker)) return toast('Ticker đã tồn tại', 'Chọn ticker khác để tránh nhầm lẫn.', 'error', '🔁');
    const total = COIN.fee + COIN.liquidity;
    if (state.cash < total) return toast('Không đủ tiền', 'Cần ' + fmtVND(total) + ', đang có ' + fmtVND(state.cash) + '.', 'error', '💰');
    const theme = COIN_THEMES_BY_ID[themeId] || D.COIN_THEMES[0];
    const supply = COIN.supply;
    const curveTokens = Math.round(supply * COIN.curvePct);
    const creatorTokens = Math.round(supply * COIN.creatorPct);
    const coin = {
      id: uid('coin'), name, ticker, emoji, theme: theme.id, color: theme.color,
      tagline: tagline || 'Một coin được tạo bằng niềm tin.',
      creator: '@' + String(state.username || 'creator').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase(),
      creatorMe: true, userCreated: true,
      desc: tagline || 'Không roadmap, không whitepaper, không sản phẩm. Chỉ có cộng đồng và một cái ticker.',
      supply, reserve: COIN.liquidity, curveTokens,
      holders: 1, hype: clamp(30 + theme.hype, 0, 100), vol: theme.vol + 0.18,
      bornAt: Date.now(), dayOpen: 0, rugged: false, history: [], volume: 0, trades: 0,
      shillAt: 0, creatorEarned: 0
    };
    coin.dayOpen = coinPrice(coin);
    state.cash -= total;
    lab.coins[coin.id] = coin;
    lab.created.push(coin.id);
    lab.holdings[coin.id] = { qty: creatorTokens, cost: coinPrice(coin) * creatorTokens };
    lab.selected = coin.id;
    coinSeedHistory(coin, 36);
    coin.hype = clamp(coin.hype + 6, 0, 100);
    coinPushPoint(coin);
    coinTrackHype(lab);
    coinAddEvent(coin, 'up', '🚀 ' + coin.name + ' vừa ra mắt với ' + fmtVND(COIN.liquidity) + ' thanh khoản. Creator giữ 5% nguồn cung.');
    closeModal();
    coinFilter = 'mine';
    coinSort = 'new';
    coinTradeSide = 'buy';
    coinTradeAmount = '';
    snapshotEquity(true);
    saveNow();
    updateShell();
    renderRoute();
    addXP(25);
    addAura(20);
    confetti(40);
    toast('Coin đã ra mắt', coin.emoji + ' ' + coin.ticker + ' · bạn nhận ' + nf(creatorTokens / 1e6, 0) + ' triệu token.', 'gold', '🚀');
    pushNotif(coin.emoji, 'Coin mới ra mắt', coin.name + ' (' + coin.ticker + ') đã vào chợ. Hype ban đầu ' + nf(coin.hype, 0) + '/100.');
  }

  /* =====================================================================
     v1.14 — QUỸ MỞ MÔ PHỎNG, CỔ TỨC VÀ SỰ KIỆN THỊ TRƯỜNG
     Toàn bộ NAV, cổ tức và tin tức dưới đây là dữ liệu giả lập trong game.
     Không có chứng chỉ quỹ, cổ tức hay giao dịch thật nào được tạo ra.
     ===================================================================== */
  const FUND_RISK_LABELS = ['', 'Thấp', 'Thấp–trung bình', 'Trung bình', 'Cao', 'Rất cao'];

  function fundRiskLabel(risk) { return FUND_RISK_LABELS[clamp(Number(risk) || 3, 1, 5)]; }
  function fundRiskDots(risk) {
    const r = clamp(Number(risk) || 3, 1, 5);
    return '<span class="fund-risk-dots" title="Rủi ro: ' + fundRiskLabel(r) + '">' +
      Array.from({ length: 5 }, (_, i) => '<i class="' + (i < r ? 'on' : '') + '"></i>').join('') + '</span>';
  }

  function ensureFunds() {
    if (!state.funds || typeof state.funds !== 'object') state.funds = fundsDefault();
    const f = state.funds;
    if (!f.positions || typeof f.positions !== 'object') f.positions = {};
    if (!f.history || typeof f.history !== 'object') f.history = {};
    if (!f.navBase || typeof f.navBase !== 'object') f.navBase = {};
    if (!Array.isArray(f.flows)) f.flows = [];
    ['realized', 'fees', 'buys', 'sells', 'lastHistoryAt'].forEach(k => {
      if (!Number.isFinite(f[k])) f[k] = 0;
    });
    D.FUND_CATALOG.forEach(fund => {
      if (!f.navBase[fund.id] || typeof f.navBase[fund.id] !== 'object') {
        const base = {};
        fund.basket.forEach(item => {
          const a = byId[item.id];
          if (a) base[item.id] = Number(a.prev || a.price) || 1;
        });
        f.navBase[fund.id] = base;
      }
      if (!Array.isArray(f.history[fund.id]) || !f.history[fund.id].length) {
        f.history[fund.id] = seedFundHistory(fund, f.navBase[fund.id]);
      }
      const pos = f.positions[fund.id];
      if (pos) {
        ['units', 'cost', 'invested', 'firstAt'].forEach(k => {
          if (!Number.isFinite(pos[k])) pos[k] = 0;
        });
        if (pos.units <= 0) delete f.positions[fund.id];
      }
    });
    Object.keys(f.positions).forEach(id => { if (!FUND_BY_ID[id]) delete f.positions[id]; });
    return f;
  }

  function fundNavFromBase(fund, base) {
    if (!fund) return 0;
    base = base || {};
    let weight = 0, ratio = 0;
    fund.basket.forEach(item => {
      const a = byId[item.id];
      const b = Number(base[item.id]);
      if (!a || !Number.isFinite(b) || b <= 0) return;
      weight += item.w;
      ratio += item.w * (a.price / b);
    });
    return weight > 0 ? 10000 * ratio / weight : 10000;
  }

  function fundNav(fund) {
    const f = state.funds;
    const base = f && f.navBase ? f.navBase[fund.id] : null;
    return fundNavFromBase(fund, base);
  }

  function seedFundHistory(fund, base) {
    const nav = fundNavFromBase(fund, base) || 10000;
    const count = 48;
    const rand = D.mulberry32(D.hash32(fund.id + ':' + todayKey()));
    const pts = [];
    let v = nav * (1 + (rand() - 0.5) * 0.018);
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const drift = (nav - v) / Math.max(1, count - i);
      v = Math.max(1, v + drift + (rand() - 0.5) * nav * 0.0028);
      pts.push({ t: now - (count - 1 - i) * 30 * 60000, nav: i === count - 1 ? nav : v });
    }
    pts[count - 1].nav = nav;
    return pts;
  }

  function fundHistory(fund) {
    const f = ensureFunds();
    return f.history[fund.id] || [];
  }

  function fundChangePct(fund) {
    const hist = fundHistory(fund);
    if (!hist.length) return 0;
    const first = Number(hist[0].nav) || fundNav(fund) || 1;
    return (fundNav(fund) / first - 1) * 100;
  }

  function fundPosition(fundId) {
    const f = ensureFunds();
    return f.positions[fundId] || null;
  }

  function fundHoldingValue(fundId) {
    const fund = FUND_BY_ID[fundId];
    const pos = state.funds && state.funds.positions ? state.funds.positions[fundId] : null;
    if (!fund || !pos || !(pos.units > 0)) return 0;
    return pos.units * fundNav(fund);
  }

  function fundPortfolioValue() {
    const f = state.funds;
    if (!f || !f.positions) return 0;
    let v = 0;
    Object.keys(f.positions).forEach(id => {
      const pos = f.positions[id];
      const fund = FUND_BY_ID[id];
      if (fund && pos && pos.units > 0) v += pos.units * fundNav(fund);
    });
    return v;
  }

  function fundPortfolioCost() {
    const f = state.funds;
    if (!f || !f.positions) return 0;
    return Object.keys(f.positions).reduce((sum, id) => {
      const pos = f.positions[id];
      return sum + (pos && Number.isFinite(pos.cost) ? pos.cost : 0);
    }, 0);
  }

  function fundPortfolioPnl() { return fundPortfolioValue() - fundPortfolioCost(); }

  function fundSparkSVG(fund, w, h, big) {
    const pts = fundHistory(fund).slice(-72).map(p => Number(p.nav) || 0);
    if (pts.length < 2) pts.push(pts[0] || 10000);
    const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
    const padY = 5;
    const step = w / (pts.length - 1);
    const xy = pts.map((v, i) => [i * step, h - padY - (v - min) / span * (h - padY * 2)]);
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ' L ' + w.toFixed(1) + ' ' + h + ' L 0 ' + h + ' Z';
    const gid = 'fg-' + fund.id + '-' + (big ? 'big' : 'mini');
    return '<svg class="fund-spark-svg ' + (big ? 'big' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + fund.color + '" stop-opacity=".30"/><stop offset="1" stop-color="' + fund.color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"></path>' +
      '<path d="' + line + '" fill="none" stroke="' + fund.color + '" stroke-width="' + (big ? 1.8 : 1.5) + '" stroke-linejoin="round" stroke-linecap="round"></path></svg>';
  }

  function fundBasketTags(fund) {
    return fund.basket.map(item => {
      const a = byId[item.id];
      return '<span class="fund-tag" title="' + esc(a ? a.name : item.id) + ' · ' + item.w + '%">' +
        esc(a ? a.symbol : item.id) + '<em>' + item.w + '%</em></span>';
    }).join('');
  }

  function fundCardHTML(fund) {
    const pos = fundPosition(fund.id);
    const nav = fundNav(fund);
    const chg = fundChangePct(fund);
    const heldValue = pos ? pos.units * nav : 0;
    return '<article class="fund-card" style="--fc:' + fund.color + '">' +
      '<div class="fund-card-top"><span class="fund-icon">' + fund.icon + '</span>' +
      '<div class="fund-name"><b>' + esc(fund.name) + '</b><span>' + esc(fund.ticker) + ' · ' + esc(fund.benchmark) + '</span></div>' +
      fundRiskDots(fund.risk) + '</div>' +
      '<div class="fund-nav-row"><div><span>NAV / chứng chỉ</span><b data-fund-nav="' + fund.id + '">' + nf(nav, 0) + ' ₫</b></div>' +
      '<span class="fund-chg ' + changeCls(chg) + '" data-fund-chg="' + fund.id + '">' + (chg >= 0 ? '+' : '') + nf(chg, 2) + '%</span></div>' +
      '<div class="fund-spark">' + fundSparkSVG(fund, 260, 56, false) + '</div>' +
      '<div class="fund-tags">' + fundBasketTags(fund) + '</div>' +
      '<div class="fund-meta"><span>Phí mua ' + nf(fund.buyFee, 2) + '%</span><span>Bán ' + nf(fund.sellFee, 2) + '%</span><span>Tối thiểu ' + money(fund.min) + ' ₫</span></div>' +
      (pos ? '<div class="fund-held"><span>Đang giữ ' + nf(pos.units, 2) + ' CCQ</span><b data-fund-value="' + fund.id + '">' + money(heldValue) + ' ₫</b></div>' : '') +
      '<div class="fund-foot"><button class="btn btn-xs btn-ghost" data-fund-open="' + fund.id + '">Chi tiết</button>' +
      '<button class="btn btn-xs btn-gold" data-fund-open="' + fund.id + '">' + (pos ? 'Mua thêm' : 'Đầu tư') + '</button></div></article>';
  }

  function fundHoldingsHTML() {
    const f = ensureFunds();
    const ids = Object.keys(f.positions).filter(id => FUND_BY_ID[id] && f.positions[id].units > 0);
    if (!ids.length) {
      return '<div class="fund-empty"><span>🧺</span><div><b>Bạn chưa góp quỹ nào</b><p>Chọn một quỹ bên trên để sở hữu nhiều tài sản cùng lúc với một lệnh duy nhất.</p></div></div>';
    }
    return '<div class="fund-holdings">' + ids.map(id => {
      const fund = FUND_BY_ID[id];
      const pos = f.positions[id];
      const nav = fundNav(fund);
      const value = pos.units * nav;
      const pnl = value - pos.cost;
      const pct = pos.cost ? pnl / pos.cost * 100 : 0;
      return '<div class="fund-holding-row">' +
        '<span class="fund-icon sm" style="--fc:' + fund.color + '">' + fund.icon + '</span>' +
        '<div class="fund-holding-name"><b>' + esc(fund.ticker) + '</b><span>' + esc(fund.name) + '</span></div>' +
        '<div class="fund-holding-cell"><span>Chứng chỉ</span><b>' + nf(pos.units, 2) + '</b></div>' +
        '<div class="fund-holding-cell"><span>NAV hiện tại</span><b data-fund-nav="' + fund.id + '">' + nf(nav, 0) + ' ₫</b></div>' +
        '<div class="fund-holding-cell"><span>Giá trị</span><b data-fund-value="' + fund.id + '">' + money(value) + ' ₫</b></div>' +
        '<div class="fund-holding-cell"><span>Lãi / lỗ</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫ · ' + (pct >= 0 ? '+' : '') + nf(pct, 2) + '%</b></div>' +
        '<button class="btn btn-xs btn-ghost" data-fund-open="' + fund.id + '">Quản lý</button></div>';
    }).join('') + '</div>';
  }

  function fundsHTML() {
    ensureFunds();
    const total = fundPortfolioValue();
    const cost = fundPortfolioCost();
    const pnl = total - cost;
    const pnlPct = cost ? pnl / cost * 100 : 0;
    const owned = Object.keys(ensureFunds().positions).filter(id => ensureFunds().positions[id].units > 0).length;
    const div = ensureDividends();
    return '<div class="page-head"><div><div class="page-eyebrow">' + icon('layers') + ' Quỹ mở · Đa dạng hoá</div>' +
      '<h1>Quỹ mở AURELIS</h1><p class="sub">Mua một rổ tài sản bằng một lệnh, theo dõi NAV cập nhật theo giá thị trường. Tất cả là mô phỏng — không có chứng chỉ quỹ thật.</p></div>' +
      '<div class="head-actions"><button class="btn btn-ghost btn-sm" data-nav="#/portfolio">' + icon('wallet') + ' Danh mục</button><button class="btn btn-gold btn-sm" data-nav="#/markets">' + icon('candles') + ' Xem thị trường</button></div></div>' +
      '<section class="fund-hero"><div class="fund-hero-main"><span class="page-eyebrow">QUỸ MÔ PHỎNG · NAV THEO GIÁ THỊ TRƯỜNG</span>' +
      '<h2>Một lệnh, cả một danh mục</h2><p>Quỹ gom nhiều mã theo tỷ trọng cố định. NAV tăng khi rổ tài sản tăng và giảm khi rổ giảm. Bạn mua hoặc bán chứng chỉ quỹ theo NAV hiện tại, không cần tự cân từng mã.</p>' +
      '<div class="fund-hero-actions"><button class="btn btn-gold btn-sm" data-scroll-funds="1">' + icon('layers') + ' Chọn quỹ</button>' +
      '<span class="fund-hero-note">Phí mua 0,3–0,6% · Phí bán 0,2–0,4%</span></div></div>' +
      '<div class="fund-hero-stats">' +
      '<div><span>Tổng giá trị quỹ</span><b data-fund-total>' + money(total) + ' ₫</b></div>' +
      '<div><span>Lãi / lỗ chưa thực hiện</span><b class="' + changeCls(pnl) + '" data-fund-pnl>' + (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫ · ' + (pnlPct >= 0 ? '+' : '') + nf(pnlPct, 2) + '%</b></div>' +
      '<div><span>Quỹ đang nắm</span><b>' + owned + ' / ' + D.FUND_CATALOG.length + '</b></div>' +
      '<div><span>Cổ tức đã nhận</span><b style="color:var(--gold)">' + money(div.total) + ' ₫</b></div></div></section>' +
      '<div class="fund-section-head" id="fundList"><div><h3>Chọn quỹ phù hợp khẩu vị</h3><span>NAV khởi điểm 10.000 ₫ / chứng chỉ · cập nhật mỗi 15 giây</span></div><span class="badge badge-gold">' + D.FUND_CATALOG.length + ' QUỸ</span></div>' +
      '<div class="fund-grid">' + D.FUND_CATALOG.map(fundCardHTML).join('') + '</div>' +
      '<div class="fund-lower">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('wallet') + ' Quỹ bạn đang nắm</div><div class="card-sub">Giá trị tính theo NAV hiện tại · bán bất kỳ lúc nào</div></div><span class="badge">' + owned + ' quỹ</span></div>' + fundHoldingsHTML() + '</section>' +
      '<section class="card fund-rules"><div class="card-head"><div><div class="card-title">' + icon('info') + ' Quỹ vận hành thế nào?</div><div class="card-sub">Bốn điều cần biết trước khi góp vốn</div></div></div>' +
      '<ol class="fund-rule-list">' +
      '<li><b>NAV là giá trị một chứng chỉ.</b> NAV = 10.000 ₫ × mức thay đổi bình quân của rổ so với giá đóng cửa hôm trước. Mua sau khi NAV tăng nghĩa là bạn mua đắt hơn.</li>' +
      '<li><b>Phí vào và ra được trừ ngay.</b> Phí mua làm giảm số chứng chỉ nhận được; phí bán làm giảm tiền về ví. Không có phí ẩn.</li>' +
      '<li><b>Quỹ không cam kết lợi nhuận.</b> Rổ càng tập trung, NAV càng dễ dao động mạnh. Quỹ crypto có thể giảm 20–40% trong một đợt risk-off.</li>' +
      '<li><b>Tất cả là mô phỏng.</b> Không có chứng chỉ quỹ thật, không có tổ chức quản lý quỹ thật và không có dòng tiền thật nào rời khỏi game.</li></ol></section></div>';
  }

  function fundModalHTML(fund) {
    const pos = fundPosition(fund.id);
    const nav = fundNav(fund);
    const chg = fundChangePct(fund);
    const value = pos ? pos.units * nav : 0;
    const pnl = pos ? value - pos.cost : 0;
    const basketRows = fund.basket.map(item => {
      const a = byId[item.id];
      if (!a) return '';
      return '<div class="fund-alloc-row"><span class="fund-alloc-sym">' + esc(a.symbol) + '</span><span class="fund-alloc-name">' + esc(a.name) + '</span>' +
        '<span class="fund-alloc-bar"><i style="width:' + item.w + '%;background:' + a.color + '"></i></span><b>' + item.w + '%</b>' +
        '<em class="' + changeCls(a.changePct) + '">' + fmtPct(a.changePct) + '</em></div>';
    }).join('');
    return '<div class="fund-modal-head" style="--fc:' + fund.color + '"><span class="fund-icon lg">' + fund.icon + '</span><div><h3>' + esc(fund.name) + '</h3><div class="fund-modal-sub">' + esc(fund.ticker) + ' · ' + esc(fund.benchmark) + ' · Rủi ro ' + fundRiskLabel(fund.risk).toLowerCase() + '</div></div></div>' +
      '<div class="fund-modal-kpis">' +
      '<div><span>NAV / chứng chỉ</span><b data-fund-nav="' + fund.id + '">' + nf(nav, 0) + ' ₫</b></div>' +
      '<div><span>Biến động kỳ</span><b data-fund-chg="' + fund.id + '" class="' + changeCls(chg) + '">' + (chg >= 0 ? '+' : '') + nf(chg, 2) + '%</b></div>' +
      '<div><span>Bạn đang giữ</span><b data-fund-units="' + fund.id + '">' + (pos ? nf(pos.units, 2) + ' CCQ' : '—') + '</b></div>' +
      '<div><span>Giá trị hiện tại</span><b data-fund-value="' + fund.id + '">' + (pos ? money(value) + ' ₫' : '—') + '</b></div>' +
      '<div><span>Lãi / lỗ</span><b data-fund-pnl="' + fund.id + '" class="' + changeCls(pnl) + '">' + (pos ? (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫' : '—') + '</b></div></div>' +
      '<div class="fund-chart-wrap">' + fundSparkSVG(fund, 760, 160, true) + '<span class="fund-chart-note">NAV mô phỏng · không phải hiệu suất thật</span></div>' +
      '<p class="fund-modal-desc">' + esc(fund.desc) + '</p>' +
      '<div class="fund-detail-grid"><div class="fund-basket-box"><h4>Rổ tài sản &amp; tỷ trọng</h4><div class="fund-alloc-head"><span>Mã</span><span>Tên</span><span>Tỷ trọng</span><span></span><span>Hôm nay</span></div>' + basketRows + '</div>' +
      '<div class="fund-trade-box"><h4>Mua / bán chứng chỉ</h4>' +
      '<div class="fund-form"><div class="fund-form-head"><b>MUA THÊM</b><span>Phí ' + nf(fund.buyFee, 2) + '%</span></div>' +
      '<div class="fund-input-wrap"><input id="fundBuyAmount" type="number" inputmode="numeric" min="' + fund.min + '" step="100000" placeholder="Số tiền muốn mua"><span>₫</span></div>' +
      '<div class="fund-quick"><button data-fund-buy-quick="10000000">10 tr</button><button data-fund-buy-quick="50000000">50 tr</button><button data-fund-buy-quick="100000000">100 tr</button><button data-fund-buy-quick="max">Tối đa</button></div>' +
      '<div class="fund-estimate">≈ <b id="fundBuyUnits">0</b> CCQ · phí <b id="fundBuyFee">0 ₫</b></div>' +
      '<button class="btn btn-gold btn-block" id="fundBuyBtn">Mua chứng chỉ</button></div>' +
      '<div class="fund-form fund-form-sell"><div class="fund-form-head"><b>BÁN CHỨNG CHỈ</b><span>Phí ' + nf(fund.sellFee, 2) + '%</span></div>' +
      '<div class="fund-input-wrap"><input id="fundSellAmount" type="number" inputmode="numeric" min="0" step="100000" placeholder="Số tiền muốn bán"><span>₫</span></div>' +
      '<div class="fund-quick"><button data-fund-sell-pct="25">25%</button><button data-fund-sell-pct="50">50%</button><button data-fund-sell-pct="100">Tất cả</button></div>' +
      '<div class="fund-estimate">≈ <b id="fundSellUnits">0</b> CCQ · nhận về <b id="fundSellNet">0 ₫</b></div>' +
      '<button class="btn btn-ghost btn-block" id="fundSellBtn" ' + (pos ? '' : 'disabled') + '>Bán chứng chỉ</button></div>' +
      '<div class="fund-trade-note">Tối thiểu mua ' + money(fund.min) + ' ₫ · Ví khả dụng ' + money(state.cash) + ' ₫</div></div></div>' +
      '<div class="fund-disclaimer">' + icon('shield') + ' <span>Quỹ, NAV và mọi giao dịch trong mục này đều là mô phỏng giáo dục. Không có chứng chỉ quỹ thật, không có tổ chức quản lý quỹ thật và không có tiền thật.</span></div>';
  }

  function bindFundModal(fundId) {
    const fund = FUND_BY_ID[fundId];
    if (!fund) return;
    const nav = () => fundNav(fund);
    const updateBuy = () => {
      const input = $('#fundBuyAmount');
      if (!input) return;
      const amount = Math.max(0, Number(input.value) || 0);
      const units = amount > 0 ? amount * (1 - fund.buyFee / 100) / nav() : 0;
      const feeEl = $('#fundBuyFee'), unitEl = $('#fundBuyUnits');
      if (feeEl) feeEl.textContent = money(amount * fund.buyFee / 100) + ' ₫';
      if (unitEl) unitEl.textContent = nf(units, 2);
    };
    const updateSell = () => {
      const input = $('#fundSellAmount');
      if (!input) return;
      const pos = fundPosition(fundId);
      const maxValue = pos ? pos.units * nav() : 0;
      const amount = Math.min(Math.max(0, Number(input.value) || 0), maxValue);
      const units = nav() > 0 ? amount / nav() : 0;
      const net = amount * (1 - fund.sellFee / 100);
      const feeEl = $('#fundSellNet'), unitEl = $('#fundSellUnits');
      if (feeEl) feeEl.textContent = money(net) + ' ₫';
      if (unitEl) unitEl.textContent = nf(units, 2);
    };
    $$('[data-fund-buy-quick]').forEach(btn => btn.addEventListener('click', () => {
      const input = $('#fundBuyAmount');
      if (!input) return;
      const v = btn.getAttribute('data-fund-buy-quick');
      input.value = v === 'max' ? String(Math.max(0, Math.floor(state.cash / 100000) * 100000)) : v;
      updateBuy();
    }));
    $$('[data-fund-sell-pct]').forEach(btn => btn.addEventListener('click', () => {
      const input = $('#fundSellAmount');
      if (!input) return;
      const pos = fundPosition(fundId);
      const pct = Number(btn.getAttribute('data-fund-sell-pct')) / 100;
      const maxValue = pos ? pos.units * nav() : 0;
      input.value = String(pct >= 1 ? Math.ceil(maxValue) : Math.floor(maxValue * pct));
      updateSell();
    }));
    const buyInput = $('#fundBuyAmount'), sellInput = $('#fundSellAmount');
    if (buyInput) buyInput.addEventListener('input', updateBuy);
    if (sellInput) sellInput.addEventListener('input', updateSell);
    const buyBtn = $('#fundBuyBtn');
    if (buyBtn) buyBtn.addEventListener('click', () => buyFund(fundId, buyInput ? buyInput.value : 0));
    const sellBtn = $('#fundSellBtn');
    if (sellBtn) sellBtn.addEventListener('click', () => sellFund(fundId, sellInput ? sellInput.value : 0));
  }

  function openFundModal(fundId) {
    const fund = FUND_BY_ID[fundId];
    if (!fund) return;
    fundModalId = fundId;
    openModal({
      title: fund.icon + ' ' + fund.name,
      sub: 'Quỹ mở mô phỏng · NAV cập nhật theo giá thị trường',
      size: 'lg',
      body: fundModalHTML(fund)
    });
    const modal = $('#modalRoot .modal');
    if (modal) modal.setAttribute('data-fund-modal', fund.id);
    bindFundModal(fund.id);
  }

  function buyFund(fundId, rawAmount) {
    const fund = FUND_BY_ID[fundId];
    if (!fund) return;
    const amount = Math.floor(Number(rawAmount) || 0);
    if (amount < fund.min) return toast('Số tiền quá nhỏ', 'Quỹ này nhận tối thiểu ' + fmtVND(fund.min) + '.', 'error', '🧺');
    if (amount > state.cash) return toast('Không đủ tiền mặt', 'Ví đang có ' + fmtVND(state.cash) + ', cần ' + fmtVND(amount) + '.', 'error', '💸');
    const f = ensureFunds();
    const nav = fundNav(fund);
    const fee = amount * fund.buyFee / 100;
    const units = (amount - fee) / nav;
    if (!(units > 0)) return;
    let pos = f.positions[fundId];
    if (!pos) pos = f.positions[fundId] = { units: 0, cost: 0, invested: 0, firstAt: Date.now() };
    pos.units += units;
    pos.cost += amount;
    pos.invested += amount;
    state.cash -= amount;
    f.fees += fee;
    f.buys++;
    f.flows.unshift({ t: Date.now(), type: 'buy', fundId, amount, units, nav, fee });
    f.flows = f.flows.slice(0, 80);
    snapshotEquity(true);
    saveNow();
    addXP(18);
    addAura(5);
    pushNotif(fund.icon, 'Đã góp quỹ', fund.name + ' · ' + fmtVND(amount) + ' → ' + nf(units, 2) + ' CCQ.');
    toast('Đã mua chứng chỉ quỹ', fund.ticker + ' · ' + nf(units, 2) + ' CCQ, phí ' + fmtVND(fee) + '.', 'gold', fund.icon);
    refreshFundSurface(fundId);
  }

  function sellFund(fundId, rawAmount) {
    const fund = FUND_BY_ID[fundId];
    if (!fund) return;
    const f = ensureFunds();
    const pos = f.positions[fundId];
    if (!pos || pos.units <= 0) return toast('Bạn chưa giữ quỹ này', 'Hãy mua chứng chỉ trước khi bán.', 'error', '🧺');
    const nav = fundNav(fund);
    const maxValue = pos.units * nav;
    let amount = Math.floor(Number(rawAmount) || 0);
    if (amount <= 0) return toast('Chưa nhập số tiền', 'Nhập số tiền muốn bán hoặc chọn 25% / 50% / Tất cả.', 'error', '🧺');
    if (amount > maxValue) amount = maxValue;
    let units = amount / nav;
    if (units > pos.units) units = pos.units;
    amount = units * nav;
    if (units <= 0) return;
    const fee = amount * fund.sellFee / 100;
    const proceeds = amount - fee;
    const costSold = pos.units > 0 ? pos.cost * (units / pos.units) : 0;
    const pnl = proceeds - costSold;
    pos.units -= units;
    pos.cost = Math.max(0, pos.cost - costSold);
    if (pos.units <= 1e-8) delete f.positions[fundId];
    state.cash += proceeds;
    f.fees += fee;
    f.sells++;
    f.realized += pnl;
    state.realized += pnl;
    f.flows.unshift({ t: Date.now(), type: 'sell', fundId, amount, units, nav, fee, pnl });
    f.flows = f.flows.slice(0, 80);
    snapshotEquity(true);
    saveNow();
    addXP(14);
    addAura(4);
    pushNotif(fund.icon, 'Đã bán chứng chỉ quỹ', fund.name + ' · nhận ' + fmtVND(proceeds) + (pnl >= 0 ? ' · lãi ' : ' · lỗ ') + fmtVND(Math.abs(pnl)) + '.');
    toast('Đã bán chứng chỉ quỹ', fund.ticker + ' · nhận ' + fmtVND(proceeds) + ' · ' + (pnl >= 0 ? 'lãi ' : 'lỗ ') + fmtVND(Math.abs(pnl)), pnl >= 0 ? 'success' : 'info', fund.icon);
    refreshFundSurface(fundId);
  }

  function refreshFundSurface(fundId) {
    refreshFundsLive();
    if (currentRoute === 'funds') renderRoute();
    if (fundModalId === fundId) openFundModal(fundId);
  }

  function pushFundHistory(force) {
    const f = ensureFunds();
    const now = Date.now();
    if (!force && now - f.lastHistoryAt < 5 * 60000) return;
    f.lastHistoryAt = now;
    D.FUND_CATALOG.forEach(fund => {
      const hist = f.history[fund.id] || (f.history[fund.id] = []);
      hist.push({ t: now, nav: fundNav(fund) });
      if (hist.length > 600) f.history[fund.id] = hist.slice(-600);
    });
    save();
  }

  function refreshFundsLive() {
    if (!state.funds) return;
    pushFundHistory(false);
    $$('[data-fund-nav]').forEach(el => {
      const fund = FUND_BY_ID[el.getAttribute('data-fund-nav')];
      if (fund) el.textContent = nf(fundNav(fund), 0) + ' ₫';
    });
    $$('[data-fund-chg]').forEach(el => {
      const fund = FUND_BY_ID[el.getAttribute('data-fund-chg')];
      if (!fund) return;
      const chg = fundChangePct(fund);
      el.textContent = (chg >= 0 ? '+' : '') + nf(chg, 2) + '%';
      el.classList.remove('up', 'down', 'flat', 'badge-up', 'badge-down');
      el.classList.add(changeCls(chg));
    });
    $$('[data-fund-value]').forEach(el => {
      const id = el.getAttribute('data-fund-value');
      if (FUND_BY_ID[id]) el.textContent = money(fundHoldingValue(id)) + ' ₫';
    });
    $$('[data-fund-units]').forEach(el => {
      const id = el.getAttribute('data-fund-units');
      const pos = fundPosition(id);
      el.textContent = pos ? nf(pos.units, 2) + ' CCQ' : '—';
    });
    $$('[data-fund-pnl]').forEach(el => {
      const id = el.getAttribute('data-fund-pnl');
      const pos = fundPosition(id);
      if (!pos) { el.textContent = '—'; return; }
      const pnl = fundHoldingValue(id) - pos.cost;
      el.textContent = (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫';
      el.classList.remove('up', 'down', 'flat');
      el.classList.add(changeCls(pnl));
    });
    const totalEl = $('[data-fund-total]');
    if (totalEl) totalEl.textContent = money(fundPortfolioValue()) + ' ₫';
  }

  function mountFunds() {
    refreshFundsLive();
    refreshDividendUI();
  }

  function portfolioFundsHTML() {
    const f = ensureFunds();
    const ids = Object.keys(f.positions).filter(id => FUND_BY_ID[id] && f.positions[id].units > 0);
    if (!ids.length) {
      return '<div class="fund-empty compact"><span>🧺</span><div><b>Chưa góp quỹ mở nào</b><p>Một lệnh để sở hữu cả rổ tài sản, NAV cập nhật theo thị trường.</p><button class="btn btn-xs btn-ghost" data-nav="#/funds">Khám phá 6 quỹ</button></div></div>';
    }
    const total = fundPortfolioValue();
    const pnl = total - fundPortfolioCost();
    return '<div class="portfolio-fund-summary"><div><span>Tổng giá trị quỹ</span><b>' + money(total) + ' ₫</b></div><div><span>Lãi / lỗ</span><b class="' + changeCls(pnl) + '">' + (pnl >= 0 ? '+' : '') + money(pnl) + ' ₫</b></div></div>' +
      ids.map(id => {
        const fund = FUND_BY_ID[id];
        const pos = f.positions[id];
        const value = pos.units * fundNav(fund);
        return '<div class="portfolio-fund-row"><span class="fund-icon sm" style="--fc:' + fund.color + '">' + fund.icon + '</span>' +
          '<div><b>' + esc(fund.ticker) + '</b><span>' + esc(fund.name) + '</span></div>' +
          '<em>' + money(value) + ' ₫</em>' +
          '<button class="btn btn-xs btn-ghost" data-fund-open="' + fund.id + '">Mở</button></div>';
      }).join('');
  }

  /* ------------------------------ CỔ TỨC MÔ PHỎNG ------------------------------ */
  function ensureDividends() {
    if (!state.dividends || typeof state.dividends !== 'object') state.dividends = dividendsDefault();
    const d = state.dividends;
    if (!Array.isArray(d.history)) d.history = [];
    ['total', 'count', 'cycles', 'reinvested', 'dripCycles'].forEach(k => {
      if (!Number.isFinite(d[k])) d[k] = 0;
    });
    if (typeof d.drip !== 'boolean') d.drip = false;
    if (!Number.isFinite(d.nextAt) || d.nextAt <= 0) d.nextAt = Date.now() + DIVIDEND_CYCLE_MS;
    return d;
  }

  function dividendRows() {
    return holdingList().map(h => {
      const yieldPct = Number(D.DIVIDEND_YIELD[h.asset.id]) || 0;
      if (yieldPct <= 0) return null;
      const income = h.value * yieldPct / 100 / 4;
      if (!(income > 0)) return null;
      return { asset: h.asset, qty: h.qty, value: h.value, yieldPct, income };
    }).filter(Boolean).sort((a, b) => b.income - a.income);
  }

  function dividendEstimate() { return dividendRows().reduce((s, r) => s + r.income, 0); }

  function processDividends() {
    const d = ensureDividends();
    const now = Date.now();
    let guard = 0;
    while (now >= d.nextAt && guard < 4) {
      const rows = dividendRows();
      const total = rows.reduce((s, r) => s + r.income, 0);
      if (total > 0) payDividends(rows, total, d);
      d.cycles++;
      d.nextAt += DIVIDEND_CYCLE_MS;
      guard++;
    }
    if (guard >= 4 && Date.now() >= d.nextAt) d.nextAt = Date.now() + DIVIDEND_CYCLE_MS;
    if (guard > 0) { saveNow(); refreshDividendUI(); }
    return d;
  }

  function payDividends(rows, total, d) {
    const drip = !!d.drip;
    if (drip) {
      rows.forEach(r => {
        const h = state.holdings[r.asset.id];
        if (!h || !(r.income > 0)) return;
        const unitVND = notionalVND(r.asset, r.asset.price, 1);
        if (!(unitVND > 0)) return;
        const addQty = r.income / unitVND;
        const prevCost = h.avgVND * h.qty;
        h.qty += addQty;
        h.avgVND = h.qty > 0 ? (prevCost + r.income) / h.qty : h.avgVND;
      });
      d.reinvested += total;
      d.dripCycles++;
    } else {
      state.cash += total;
    }
    d.total += total;
    d.count++;
    d.history.unshift({
      t: Date.now(), total, drip,
      rows: rows.slice(0, 8).map(r => ({ id: r.asset.id, symbol: r.asset.symbol, income: r.income }))
    });
    d.history = d.history.slice(0, 24);
    addXP(20);
    addAura(8);
    snapshotEquity(true);
    pushNotif('💵', 'Cổ tức mô phỏng đã về', (drip ? 'Tái đầu tư ' : 'Nhận ') + fmtVND(total) + ' từ ' + rows.length + ' mã có cổ tức.');
    if (state.onboarded && !document.hidden) {
      toast(drip ? 'Cổ tức đã tái đầu tư' : 'Cổ tức đã về ví', '+' + fmtVND(total) + ' · ' + rows.slice(0, 3).map(r => r.asset.symbol).join(', ') + (rows.length > 3 ? '…' : ''), 'gold', '💵');
    }
    saveNow();
  }

  function dividendCardHTML() {
    const d = ensureDividends();
    const rows = dividendRows();
    const est = rows.reduce((s, r) => s + r.income, 0);
    const left = Math.max(0, d.nextAt - Date.now());
    const pct = clamp(100 - left / DIVIDEND_CYCLE_MS * 100, 0, 100);
    const rowsHTML = rows.length ? rows.slice(0, 5).map(r =>
      '<div class="dividend-row"><span class="dividend-sym">' + esc(r.asset.symbol) + '</span>' +
      '<div class="dividend-name">' + esc(r.asset.name) + '<span>TL ' + nf(r.yieldPct, 1) + '% / năm · ' + money(r.value) + ' ₫</span></div>' +
      '<b>+' + money(r.income) + ' ₫</b></div>'
    ).join('') : '<div class="dividend-empty"><span>🌱</span><div><b>Chưa có cổ phiếu trả cổ tức</b><p>Mua các mã như VNM, SAB, BMP hoặc PLX để nhận tiền mỗi quý mô phỏng.</p><button class="btn btn-xs btn-ghost" data-nav="#/markets">Tìm cổ phiếu cổ tức</button></div></div>';
    const histHTML = d.history.length ? '<div class="dividend-history">' + d.history.slice(0, 3).map(h =>
      '<div class="dividend-history-row"><span>' + timeAgo(h.t) + '</span><b>+' + money(h.total) + ' ₫</b><em>' + (h.drip ? 'tái đầu tư' : 'tiền mặt') + '</em></div>'
    ).join('') + '</div>' : '';
    return '<section class="card dividend-card"><div class="card-head"><div><div class="card-title">' + icon('gift') + ' Cổ tức &amp; thu nhập thụ động</div>' +
      '<div class="card-sub">Mỗi 7 phút = 1 quý mô phỏng · tính trên giá trị đang nắm giữ</div></div>' +
      '<span class="dividend-count-pill" data-div-count>' + liveCountdown(left) + '</span></div>' +
      '<div class="dividend-summary"><div><span>Kỳ cổ tức tới</span><b data-div-est>' + money(est) + ' ₫</b></div><div><span>Đã nhận</span><b style="color:var(--gold)">' + money(d.total) + ' ₫</b></div>' +
      '<div><span>Số kỳ</span><b>' + d.count + '</b></div><div><span>Chế độ</span><b>' + (d.drip ? 'Tái đầu tư' : 'Tiền mặt') + '</b></div></div>' +
      '<div class="dividend-progress"><span id="divProgress" style="width:' + pct.toFixed(1) + '%"></span></div>' +
      '<div class="dividend-rows">' + rowsHTML + '</div>' + histHTML +
      '<div class="dividend-foot"><div class="dividend-toggle"><button class="switch ' + (d.drip ? 'on' : '') + '" data-drip-toggle aria-pressed="' + (d.drip ? 'true' : 'false') + '" aria-label="Bật tái đầu tư cổ tức"></button><div><b>Tái đầu tư cổ tức</b><span>' + (d.drip ? 'Tiền cổ tức tự mua thêm cổ phiếu, không qua ví.' : 'Bật để dùng cổ tức mua thêm chính mã đó.') + '</span></div></div>' +
      '<span class="dividend-note">Cổ tức mô phỏng, không phải cổ tức thật.</span></div></section>';
  }

  function refreshDividendUI() {
    $$('[data-div-slot]').forEach(el => { el.innerHTML = dividendCardHTML(); });
    $$('[data-div-side]').forEach(el => {
      const d = ensureDividends();
      el.textContent = money(d.total) + ' ₫';
    });
  }

  function toggleDividendDrip() {
    const d = ensureDividends();
    d.drip = !d.drip;
    saveNow();
    refreshDividendUI();
    toast(d.drip ? 'Đã bật tái đầu tư cổ tức' : 'Đã chuyển về nhận tiền mặt', d.drip ? 'Cổ tức sẽ tự mua thêm cổ phiếu mỗi kỳ.' : 'Cổ tức sẽ được cộng vào ví mỗi kỳ.', 'success', '♻️');
  }

  /* ------------------------------ SỰ KIỆN THỊ TRƯỜNG ------------------------------ */
  function ensureEvents() {
    if (!state.events || typeof state.events !== 'object') state.events = eventsDefault();
    const ev = state.events;
    if (!Array.isArray(ev.history)) ev.history = [];
    if (!Number.isFinite(ev.seen)) ev.seen = 0;
    if (!Number.isFinite(ev.trades)) ev.trades = 0;
    if (!Number.isFinite(ev.nextAt) || ev.nextAt <= 0) ev.nextAt = Date.now() + 45000;
    if (ev.active) {
      if (typeof ev.active.id !== 'string' || !EVENT_BY_ID[ev.active.id]) ev.active = null;
      else {
        if (!Array.isArray(ev.active.ids)) ev.active.ids = [];
        if (!Number.isFinite(ev.active.endsAt)) ev.active.endsAt = Date.now() + 90000;
      }
    }
    return ev;
  }

  function resolveEventIds(def) {
    if (Array.isArray(def.ids) && def.ids.length) return def.ids.filter(id => byId[id]);
    const groups = Array.isArray(def.groups) ? def.groups : [];
    const sectors = Array.isArray(def.sectors) ? def.sectors : [];
    let list = D.ASSETS.filter(a => {
      if (a.group === 'derivatives') return false;
      if (groups.length && !groups.includes(a.group)) return false;
      if (sectors.length && !sectors.includes(a.sector)) return false;
      return true;
    });
    if (!list.length && groups.length) list = D.ASSETS.filter(a => groups.includes(a.group) && a.group !== 'derivatives');
    return list.map(a => a.id);
  }

  function startMarketEvent(forceId) {
    const ev = ensureEvents();
    if (ev.active) return;
    const recent = ev.history.slice(0, 6).map(h => h.id);
    let pool = D.MARKET_EVENTS.filter(def => !recent.includes(def.id));
    if (!pool.length) pool = D.MARKET_EVENTS;
    const def = forceId && EVENT_BY_ID[forceId] ? EVENT_BY_ID[forceId] : pool[Math.floor(Math.random() * pool.length)];
    if (!def) return;
    const ids = resolveEventIds(def);
    if (!ids.length) return;
    const sign = def.kind === 'up' ? 1 : -1;
    ids.forEach(id => {
      const a = byId[id];
      if (!a) return;
      const next = Math.max(0.00000001, a.price * (1 + sign * Math.abs(def.shock) / 100));
      a.price = next;
      a.high = Math.max(a.high || next, next);
      a.low = Math.min(a.low || next, next);
      a.changePct = a.prev ? (a.price - a.prev) / a.prev * 100 : a.changePct;
      if (a.spark && a.spark.length) a.spark[a.spark.length - 1] = a.price;
    });
    ev.active = {
      id: def.id, kind: def.kind, startedAt: Date.now(),
      endsAt: Date.now() + (def.duration || 90000),
      ids, shock: def.shock
    };
    ev.seen++;
    syncDerivatives();
    updateGlobalQuotes();
    refreshEventUI();
    pushNotif(def.icon, 'Sự kiện thị trường', def.title + ' · ' + (def.shock >= 0 ? '+' : '') + nf(def.shock, 2) + '% lên ' + ids.length + ' mã.');
    if (state.onboarded && !document.hidden && Math.abs(def.shock) >= 1.2) {
      toast('Sự kiện thị trường', def.title, def.kind === 'up' ? 'success' : 'info', def.icon);
    }
    saveNow();
  }

  function endMarketEvent() {
    const ev = ensureEvents();
    if (!ev.active) return;
    ev.history.unshift({
      id: ev.active.id, kind: ev.active.kind, at: ev.active.startedAt,
      endedAt: Date.now(), shock: ev.active.shock, ids: ev.active.ids.length
    });
    ev.history = ev.history.slice(0, 24);
    ev.active = null;
    ev.nextAt = Date.now() + 60000 + Math.round(Math.random() * 75000);
    refreshEventUI();
    saveNow();
  }

  function processMarketEvents() {
    const ev = ensureEvents();
    const now = Date.now();
    if (ev.active && now >= ev.active.endsAt) endMarketEvent();
    else if (!ev.active && now >= ev.nextAt && !document.hidden) startMarketEvent();
  }

  function eventTargetLabel(def) {
    if (Array.isArray(def.sectors) && def.sectors.length) return def.sectors.join(' · ');
    if (Array.isArray(def.groups) && def.groups.length) return def.groups.map(g => String(g).toUpperCase()).join(', ');
    return 'Một nhóm tài sản';
  }

  function eventHistoryHTML() {
    const ev = ensureEvents();
    if (!ev.history.length) return '<div class="event-history empty">Chưa có sự kiện nào trong phiên này. Cứ bình tĩnh quan sát thị trường.</div>';
    return '<div class="event-history"><span class="event-history-title">Sự kiện gần đây</span>' + ev.history.slice(0, 3).map(h => {
      const def = EVENT_BY_ID[h.id];
      if (!def) return '';
      return '<div class="event-history-row"><span class="event-history-icon">' + def.icon + '</span><span class="event-history-title-text">' + esc(def.title) + '</span>' +
        '<span class="event-history-impact ' + (h.kind === 'up' ? 'up' : 'down') + '">' + (h.shock >= 0 ? '+' : '') + nf(h.shock, 2) + '%</span><span class="event-history-time">' + timeAgo(h.at) + '</span></div>';
    }).join('') + '</div>';
  }

  function marketEventCardHTML(compact) {
    const ev = ensureEvents();
    if (ev.active) {
      const def = EVENT_BY_ID[ev.active.id];
      if (!def) return '';
      const left = Math.max(0, ev.active.endsAt - Date.now());
      const impact = (def.shock >= 0 ? '+' : '') + nf(def.shock, 2) + '%';
      const kind = def.kind === 'up' ? 'up' : 'down';
      if (compact) {
        return '<div class="event-strip ' + kind + '"><span class="event-strip-icon">' + def.icon + '</span>' +
          '<b>' + esc(def.title) + '</b><span class="event-strip-impact ' + kind + '">' + impact + '</span>' +
          '<span class="event-strip-time" data-event-count>' + liveCountdown(left) + '</span></div>';
      }
      return '<section class="card event-card ' + kind + '"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Sự kiện thị trường <span class="event-live-pill"><i></i>LIVE</span></div>' +
        '<div class="card-sub">Tin mô phỏng · ' + ev.active.ids.length + ' mã đang chịu tác động</div></div>' +
        '<span class="event-timer" data-event-count>' + liveCountdown(left) + '</span></div>' +
        '<div class="event-main"><span class="event-icon">' + def.icon + '</span><div><b>' + esc(def.title) + '</b><p>' + esc(def.body) + '</p>' +
        '<div class="event-meta"><span class="badge ' + (kind === 'up' ? 'badge-up' : 'badge-down') + '">' + impact + '</span><span>' + esc(def.short) + '</span><span>' + esc(def.source) + '</span></div></div></div>' +
        '<div class="event-foot"><span class="event-affected">Ảnh hưởng: ' + esc(eventTargetLabel(def)) + ' · ' + ev.active.ids.length + ' mã</span>' +
        '<button class="btn btn-xs btn-ghost" data-nav="#/markets">Xem thị trường</button></div>' + eventHistoryHTML() + '</section>';
    }
    const left = Math.max(0, ev.nextAt - Date.now());
    if (compact) {
      return '<div class="event-strip idle"><span class="event-strip-icon">⏳</span><b>Thị trường đang yên</b><span class="event-strip-time">Sự kiện sau <span data-event-next>' + liveCountdown(left) + '</span></span></div>';
    }
    return '<section class="card event-card idle"><div class="card-head"><div><div class="card-title">' + icon('bolt') + ' Sự kiện thị trường</div><div class="card-sub">Tin mô phỏng xuất hiện ngẫu nhiên</div></div>' +
      '<span class="event-timer">sau <span data-event-next>' + liveCountdown(left) + '</span></span></div>' +
      '<div class="event-main"><span class="event-icon">⏳</span><div><b>Thị trường đang yên</b><p>Sự kiện tiếp theo sẽ xuất hiện trong ít phút. Khi tin nổ ra, giá một nhóm tài sản phản ứng ngay — đọc kỹ trước khi giao dịch, đừng chase theo tin.</p></div></div>' +
      eventHistoryHTML() + '</section>';
  }

  function refreshEventUI() {
    $$('[data-event-slot]').forEach(el => {
      el.innerHTML = marketEventCardHTML(el.getAttribute('data-event-slot') === 'compact');
    });
    document.body.classList.toggle('has-market-event', !!ensureEvents().active);
  }

  function noteEventTrade(assetId) {
    const ev = ensureEvents();
    if (!ev.active || !ev.active.ids.includes(assetId)) return;
    ev.trades++;
    state.stats.event_trades = ev.trades;
    save();
  }

  function liveCountdown(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateLiveWidgets() {
    if (document.hidden) return;
    processDividends();
    processMarketEvents();
    const d = ensureDividends();
    const left = Math.max(0, d.nextAt - Date.now());
    $$('[data-div-count]').forEach(el => { el.textContent = liveCountdown(left); });
    const bar = $('#divProgress');
    if (bar) bar.style.width = clamp(100 - left / DIVIDEND_CYCLE_MS * 100, 0, 100).toFixed(1) + '%';
    const est = dividendEstimate();
    $$('[data-div-est]').forEach(el => { el.textContent = money(est) + ' ₫'; });
    const ev = ensureEvents();
    if (ev.active) {
      const evLeft = Math.max(0, ev.active.endsAt - Date.now());
      $$('[data-event-count]').forEach(el => { el.textContent = liveCountdown(evLeft); });
    } else {
      const nextLeft = Math.max(0, ev.nextAt - Date.now());
      $$('[data-event-next]').forEach(el => { el.textContent = liveCountdown(nextLeft); });
    }
  }

  function startLiveWidgets() {
    if (liveWidgetTimer) clearInterval(liveWidgetTimer);
    liveWidgetTimer = setInterval(updateLiveWidgets, 1000);
  }

  /* ------------------------------ VIEW REGISTRATION / BOOT ------------------------------ */
  views.dashboard = { html: dashboardHTML, mount: mountDashboard };
  views.markets = { html: marketsHTML, mount: mountMarkets };
  views.terminal = { html: terminalHTML, mount: mountTerminal };
  views.portfolio = { html: portfolioHTML, mount: mountPortfolio };
  views.funds = { html: fundsHTML, mount: mountFunds };
  views.savings = { html: savingsHTML, mount: mountSavings };
  views.credit = { html: creditHTML, mount: mountCredit };
  views.library = { html: libraryHTML, mount: mountLibrary };
  views.jobs = { html: jobsHTML, mount: mountJobs };
  views.auctions = { html: auctionsHTML, mount: mountAuctions };
  views.crypto = { html: cryptoHTML, mount: mountCrypto };
  views.derivatives = { html: derivativesHTML, mount: mountDerivatives };
  views.analysis = { html: analysisHTML, mount: mountAnalysis };
  views.company = { html: companyHTML, mount: mountCompany };
  views.wealth = { html: wealthHTML, mount: mountWealth };
  views.prime = { html: primeHTML, mount: mountPrime };
  views.arcade = { html: arcadeHTML, mount: mountArcade };
  views.coin = { html: coinHTML, mount: mountCoin };
  views.ranks = { html: ranksHTML, mount: () => {} };
  views.shop = { html: shopHTML, mount: mountShop };
  views.academy = { html: academyHTML, mount: () => {} };
  views.detective = { html: detectivePageHTML, mount: mountDetective };

  function boot() {
    ensureDaily();
    ensureWeekly();
    ensureSavings();
    processSavings();
    ensureCredit();
    processLoans();
    ensureLibrary();
    ensureJobs();
    ensureAuctions();
    ensureCompany();
    ensureWealth();
    ensurePrime();
    ensureArcade();
    ensureCoinLab();
    ensureFunds();
    pushFundHistory(true);
    ensureDividends();
    processDividends();
    ensureEvents();
    processMarketEvents();
    ensureProfile();
    processWealthDca();
    updateShell();
    updateSourceUI();
    updateNotifDot();
    buildAmbient();
    bindLogoFallbacks();
    bindShellEvents();
    if (!location.hash) {
      try { history.replaceState(null, '', '#/dashboard'); } catch (e) { location.hash = '#/dashboard'; }
    }
    API.ready = API.boot();
    renderRoute();
    API.ready
      .then(() => {
        detectiveDaily = null;
        detectiveDailyPromise = null;
        updateSourceUI();
        startData();
        if (currentRoute === 'terminal') loadTerminalChart(true);
        if (currentRoute === 'detective') renderRoute();
      })
      .catch(() => {
        updateSourceUI();
        startData();
      });
    const splash = $('#splash');
    if (splash) {
      setTimeout(() => { splash.classList.add('hide'); }, 520);
      setTimeout(() => {
        splash.remove();
        if (!state.onboarded) showWelcome();
      }, 1200);
    } else if (!state.onboarded) {
      setTimeout(showWelcome, 200);
    }
  }

  boot();
})();
