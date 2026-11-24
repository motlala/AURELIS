/* ============================================================
   AURELIS MARKETS — local data proxy & static server
   Node 18+ · no dependencies
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const YAHOO_HOST = 'https://query1.finance.yahoo.com';
const BINANCE_HOST = 'https://api.binance.com';
const BINANCE_FUTURES_HOST = 'https://fapi.binance.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 AURELIS/1.7';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) { cache.delete(key); return null; }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  if (cache.size > 300) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires).slice(0, 40);
    oldest.forEach(([k]) => cache.delete(k));
  }
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function getJSON(url, ttlMs, cacheKey) {
  const noCache = cacheKey === null;
  const key = cacheKey || url;
  if (!noCache) {
    const cached = cacheGet(key);
    if (cached) return cached;
  }
  const res = await fetch(url, {
    headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': UA },
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' từ ' + new URL(url).hostname);
  const data = await res.json();
  if (!noCache) cacheSet(key, data, ttlMs == null ? 15000 : ttlMs);
  return data;
}

async function getText(url, ttlMs, cacheKey) {
  const key = cacheKey || url;
  const cached = cacheGet(key);
  if (cached) return cached;
  const res = await fetch(url, {
    headers: { Accept: 'application/rss+xml,application/xml,text/xml,text/html,*/*', 'User-Agent': UA },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  cacheSet(key, text, ttlMs == null ? 300000 : ttlMs);
  return text;
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function safeSymbol(s) {
  return typeof s === 'string' && /^[A-Za-z0-9.^=_-]{1,32}$/.test(s);
}

/* ------------------------------ QUOTES ------------------------------ */
function splitList(raw, max) {
  if (!raw) return [];
  return [...new Set(String(raw).split(',').map(s => s.trim()).filter(Boolean))].slice(0, max || 80);
}

function cleanCloses(arr) {
  return Array.isArray(arr) ? arr.filter(v => Number.isFinite(v) && v > 0) : [];
}

async function yahooSpark(symbols, fresh) {
  const out = {};
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 18) chunks.push(symbols.slice(i, i + 18));
  const results = await Promise.allSettled(chunks.map(chunk => {
    const url = YAHOO_HOST + '/v8/finance/spark?symbols=' + encodeURIComponent(chunk.join(',')) +
      '&range=1d&interval=5m&indicators=close&includePrePost=false' + (fresh ? '&_=' + Date.now() : '');
    return getJSON(url, 14000, fresh ? null : 'spark:' + chunk.join(','));
  }));
  results.forEach(result => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const data = result.value;
    Object.keys(data).forEach(symbol => {
      const item = data[symbol];
      if (!item || typeof item !== 'object') return;
      const closes = cleanCloses(item.close);
      const price = Number(item.fulldayPrice || item.regularMarketPrice || closes[closes.length - 1]);
      const prev = Number(item.previousClose || item.chartPreviousClose);
      if (!Number.isFinite(price) || price <= 0) return;
      const open = closes.length ? closes[0] : price;
      const high = closes.length ? Math.max(...closes) : price;
      const low = closes.length ? Math.min(...closes) : price;
      const spark = closes.length > 60
        ? closes.filter((_, i) => i % Math.ceil(closes.length / 60) === 0)
        : closes;
      out[symbol] = {
        price,
        prevClose: Number.isFinite(prev) && prev > 0 ? prev : price,
        changePct: Number.isFinite(prev) && prev > 0 ? (price - prev) / prev * 100 : 0,
        open, high, low,
        volume: null,
        spark,
        source: 'yahoo',
        at: Date.now(),
      };
    });
  });
  return out;
}

async function binanceQuotes(symbols, fresh) {
  if (!symbols.length) return {};
  const out = {};
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 60) chunks.push(symbols.slice(i, i + 60));
  const results = await Promise.allSettled(chunks.map(chunk => {
    const url = BINANCE_HOST + '/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(chunk));
    return getJSON(url, 12000, fresh ? null : undefined);
  }));
  results.forEach(result => {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
    result.value.forEach(t => {
      const price = parseFloat(t.lastPrice);
      if (!Number.isFinite(price)) return;
      out[t.symbol] = {
        price,
        prevClose: parseFloat(t.openPrice),
        changePct: parseFloat(t.priceChangePercent),
        open: parseFloat(t.openPrice),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
        volume: parseFloat(t.volume),
        spark: null,
        source: 'binance',
        at: Date.now(),
      };
    });
  });
  return out;
}

async function handleQuotes(q, res) {
  const yahoo = splitList(q.get('yahoo'), 260).filter(safeSymbol);
  const crypto = splitList(q.get('crypto'), 120).filter(s => /^[A-Z0-9]{5,18}$/.test(s));
  const fresh = q.get('fresh') === '1';
  if (!yahoo.length && !crypto.length) return json(res, 200, { ok: true, quotes: {} });
  const yahooSymbols = [...new Set(yahoo.concat(['USDVND=X']))];
  const [y, b] = await Promise.all([
    yahooSpark(yahooSymbols, fresh).catch(() => ({})),
    binanceQuotes(crypto, fresh).catch(() => ({})),
  ]);
  json(res, 200, { ok: true, quotes: Object.assign({}, y, b), fresh, at: Date.now() });
}

/* ------------------------------ CHARTS ------------------------------ */
const TF_BINANCE = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
const TF_YAHOO = {
  '1m': { range: '1d', interval: '1m' },
  '5m': { range: '5d', interval: '5m' },
  '15m': { range: '1mo', interval: '15m' },
  '1H': { range: '3mo', interval: '60m' },
  '4H': { range: '6mo', interval: '60m', aggregate: 4 },
  '1D': { range: '2y', interval: '1d' },
  '1W': { range: '10y', interval: '1wk' },
};

async function binanceCandles(symbol, tf, fresh) {
  const interval = TF_BINANCE[tf] || '1d';
  const url = BINANCE_HOST + '/api/v3/klines?symbol=' + encodeURIComponent(symbol) + '&interval=' + interval + '&limit=400';
  const rows = await getJSON(url, 35000, fresh ? null : 'bcandles:' + symbol + ':' + interval);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    t: Math.floor(r[0] / 1000),
    o: parseFloat(r[1]), h: parseFloat(r[2]),
    l: parseFloat(r[3]), c: parseFloat(r[4]),
    v: parseFloat(r[5]),
  })).filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite));
}

function aggregateCandles(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const group = rows.slice(i, i + size);
    if (!group.length) continue;
    out.push({
      t: group[0].t,
      o: group[0].o,
      h: Math.max(...group.map(x => x.h)),
      l: Math.min(...group.map(x => x.l)),
      c: group[group.length - 1].c,
      v: group.reduce((sum, x) => sum + (Number(x.v) || 0), 0),
    });
  }
  return out;
}

async function yahooCandles(symbol, tf, fresh) {
  const cfg = TF_YAHOO[tf] || TF_YAHOO['1D'];
  const url = YAHOO_HOST + '/v8/finance/chart/' + encodeURIComponent(symbol) +
    '?range=' + cfg.range + '&interval=' + cfg.interval + '&includePrePost=false&events=div%2Csplits' + (fresh ? '&_=' + Date.now() : '');
  const data = await getJSON(url, 35000, fresh ? null : 'ycandles:' + symbol + ':' + tf);
  const result = data && data.chart && Array.isArray(data.chart.result) ? data.chart.result[0] : null;
  if (!result) return [];
  const ts = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  if (!quote) return [];
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const o = quote.open ? quote.open[i] : null;
    const h = quote.high ? quote.high[i] : null;
    const l = quote.low ? quote.low[i] : null;
    const c = quote.close ? quote.close[i] : null;
    const v = quote.volume ? quote.volume[i] : 0;
    if (![o, h, l, c].every(x => Number.isFinite(x) && x > 0)) continue;
    rows.push({ t: Math.floor(ts[i]), o, h, l, c, v: Number(v) || 0 });
  }
  return cfg.aggregate ? aggregateCandles(rows, cfg.aggregate) : rows;
}

async function handleChart(q, res) {
  const source = q.get('source') === 'binance' ? 'binance' : 'yahoo';
  const symbol = (q.get('symbol') || '').trim();
  const tf = q.get('tf') || '1D';
  const fresh = q.get('fresh') === '1';
  if (!safeSymbol(symbol)) return json(res, 400, { ok: false, error: 'Mã không hợp lệ.' });
  if (!TF_BINANCE[tf]) return json(res, 400, { ok: false, error: 'Khung thời gian không hợp lệ.' });
  try {
    const candles = source === 'binance'
      ? await binanceCandles(symbol, tf, fresh)
      : await yahooCandles(symbol, tf, fresh);
    json(res, 200, { ok: candles.length > 0, source, symbol, tf, fresh, candles });
  } catch (e) {
    json(res, 502, { ok: false, error: e.message });
  }
}

/* ------------------------------ NEWS ------------------------------ */
const FEEDS = [
  { url: 'https://cafef.vn/thi-truong-chung-khoan.rss', source: 'CafeF' },
  { url: 'https://cafef.vn/tai-chinh-ngan-hang.rss', source: 'CafeF' },
  { url: 'https://vnexpress.net/rss/kinh-doanh.rss', source: 'VnExpress' },
];

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}
function stripHtml(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function pickTag(block, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}
function parseFeed(xml, source) {
  const items = [];
  const blocks = String(xml).match(/<item\b[\s\S]*?<\/item>/gi) || [];
  blocks.slice(0, 20).forEach(block => {
    const sourceTag = stripHtml(pickTag(block, 'source'));
    let title = stripHtml(pickTag(block, 'title'));
    const link = pickTag(block, 'link') || pickTag(block, 'guid');
    if (!title || !link) return;
    if (sourceTag && title.endsWith(' - ' + sourceTag)) title = title.slice(0, -(sourceTag.length + 3)).trim();
    const rawDesc = pickTag(block, 'description');
    const imageMatch = block.match(/<(?:media:content|enclosure)\b[^>]*url=["']([^"']+)["']/i) ||
      rawDesc.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const dateRaw = pickTag(block, 'pubDate');
    const time = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
    items.push({
      title,
      link,
      source: sourceTag || source || 'Google News',
      time,
      desc: stripHtml(rawDesc).slice(0, 260),
      image: imageMatch ? decodeEntities(imageMatch[1]) : '',
    });
  });
  return items;
}

async function loadMarketNews() {
  const cached = cacheGet('news:all');
  if (cached) return cached;
  const results = await Promise.allSettled(FEEDS.map(feed =>
    getText(feed.url, 300000, 'feed:' + feed.url).then(xml => parseFeed(xml, feed.source))
  ));
  let items = [];
  results.forEach(r => { if (r.status === 'fulfilled') items = items.concat(r.value); });
  const seen = new Set();
  items = items.filter(item => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 40);
  cacheSet('news:all', items, 240000);
  return items;
}

async function handleNews(res) {
  const items = await loadMarketNews();
  json(res, 200, { ok: items.length > 0, items });
}

/* Tin tức gắn với một doanh nghiệp cụ thể.
   Nguồn chính: Google News RSS theo tên + mã. Nguồn dự phòng: feed thị trường
   đã lọc theo tên/mã doanh nghiệp. Client tự có fallback mô phỏng nếu cả hai đều lỗi. */
function plainText(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
}

function companyNewsTokens(name, symbol) {
  const tokens = [];
  const push = value => {
    const raw = String(value || '').trim();
    if (!raw) return;
    const plain = plainText(raw);
    if (plain.length >= 2) tokens.push(plain);
  };
  push(symbol);
  const base = String(symbol || '').split('.')[0];
  push(base);
  push(name);
  return [...new Set(tokens)].slice(0, 6);
}

async function handleCompanyNews(q, res) {
  const symbol = (q.get('symbol') || '').trim().toUpperCase();
  if (!safeSymbol(symbol)) return json(res, 400, { ok: false, error: 'Mã không hợp lệ.' });
  const name = String(q.get('name') || '').trim().replace(/[\u0000-\u001f<>]/g, ' ').slice(0, 80);
  const sector = String(q.get('sector') || '').trim().replace(/[\u0000-\u001f<>]/g, ' ').slice(0, 60);
  const group = (q.get('group') || '').toLowerCase();
  const baseSymbol = symbol.split('.')[0];
  const cacheKey = 'company-news:' + symbol + ':' + name;
  const fresh = q.get('fresh') === '1';
  const cached = fresh ? null : cacheGet(cacheKey);
  if (cached) return json(res, 200, Object.assign({}, cached, { cached: true }));

  const query = name
    ? '("' + name + '" OR "' + baseSymbol + '") ' + (group === 'us' ? 'stock' : 'cổ phiếu')
    : '"' + baseSymbol + '" ' + (group === 'us' ? 'stock' : 'chứng khoán');
  let items = [];
  let source = 'google-news';
  let error = '';
  try {
    const feedUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=vi&gl=VN&ceid=VN:vi';
    const xml = await getText(feedUrl, 120000, 'gnews:' + symbol + ':' + plainText(name).slice(0, 40));
    items = parseFeed(xml, 'Google News').map(item => Object.assign({}, item, { related: true }));
  } catch (e) {
    error = e.message || String(e);
  }

  let fallback = 'none';
  if (items.length < 2) {
    try {
      const market = await loadMarketNews();
      const tokens = companyNewsTokens(name, symbol);
      const matched = market.filter(item => {
        const hay = plainText(item.title + ' ' + (item.desc || ''));
        return tokens.some(token => hay.includes(token));
      });
      if (matched.length) {
        fallback = 'market-feeds';
        source = 'market-feeds';
        items = items.concat(matched.map(item => Object.assign({}, item, { related: true })));
      }
    } catch (e) {
      if (!error) error = e.message || String(e);
    }
  }

  const seen = new Set();
  items = items.filter(item => {
    const key = String(item.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 12);

  const payload = {
    ok: items.length > 0,
    symbol,
    name,
    sector,
    query,
    source,
    fallback,
    error: items.length ? '' : error,
    at: Date.now(),
    items
  };
  if (items.length) cacheSet(cacheKey, payload, 45000);
  json(res, 200, payload);
}

/* ------------------------------ DERIVATIVES ------------------------------ */
async function handleDerivs(res) {
  const cached = cacheGet('derivs');
  if (cached) return json(res, 200, { ok: true, items: cached, cached: true });
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
  const rows = await Promise.allSettled(symbols.map(async symbol => {
    const [premium, ratios] = await Promise.all([
      getJSON(BINANCE_FUTURES_HOST + '/fapi/v1/premiumIndex?symbol=' + symbol, 12000, 'premium:' + symbol),
      getJSON(BINANCE_FUTURES_HOST + '/futures/data/globalLongShortAccountRatio?symbol=' + symbol + '&period=1h&limit=1', 30000, 'ratio:' + symbol).catch(() => null),
    ]);
    if (!premium) return null;
    const r = Array.isArray(ratios) ? ratios[0] : null;
    return {
      symbol,
      funding: parseFloat(premium.lastFundingRate),
      markPrice: parseFloat(premium.markPrice),
      indexPrice: parseFloat(premium.indexPrice),
      nextFundingTime: premium.nextFundingTime,
      longAccount: r ? parseFloat(r.longAccount) : null,
      longShortRatio: r ? parseFloat(r.longShortRatio) : null,
    };
  }));
  const items = rows.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  cacheSet('derivs', items, 15000);
  json(res, 200, { ok: items.length > 0, items });
}

/* ------------------------------ DEPTH ------------------------------ */
async function handleDepth(q, res) {
  const symbol = (q.get('symbol') || 'BTCUSDT').toUpperCase();
  if (!/^[A-Z0-9]{5,18}$/.test(symbol)) return json(res, 400, { ok: false, error: 'Mã không hợp lệ.' });
  try {
    const data = await getJSON(BINANCE_HOST + '/api/v3/depth?symbol=' + symbol + '&limit=14', 6000, 'depth:' + symbol);
    json(res, 200, {
      ok: true,
      bids: (data.bids || []).map(([p, qty]) => ({ price: parseFloat(p), qty: parseFloat(qty) })),
      asks: (data.asks || []).map(([p, qty]) => ({ price: parseFloat(p), qty: parseFloat(qty) })),
    });
  } catch (e) {
    json(res, 502, { ok: false, error: e.message });
  }
}

/* ------------------------------ COMPANY FUNDAMENTALS ------------------------------ */
const COMPANY_MODULES = [
  'assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData',
  'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory',
  'incomeStatementHistoryQuarterly', 'balanceSheetHistoryQuarterly', 'cashflowStatementHistoryQuarterly',
  'earnings', 'recommendationTrend', 'price', 'fundProfile'
].join(',');

let yahooAuth = { cookie: '', crumb: '', at: 0, pending: null };

async function yahooAuthToken(force) {
  if (!force && yahooAuth.crumb && Date.now() - yahooAuth.at < 6 * 3600 * 1000) return yahooAuth;
  if (yahooAuth.pending) return yahooAuth.pending;
  yahooAuth.pending = (async () => {
    let cookie = '';
    try {
      const res = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        redirect: 'manual',
        signal: AbortSignal.timeout(12000),
      });
      const list = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie') || ''];
      const a3 = list.map(c => String(c || '').split(';')[0]).find(c => c.startsWith('A3='));
      if (a3) cookie = a3;
    } catch (e) { /* thử tiếp */ }
    if (!cookie) throw new Error('Yahoo không cấp cookie phiên.');
    const res = await fetch(YAHOO_HOST + '/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'text/plain' },
      signal: AbortSignal.timeout(12000),
    });
    const crumb = (await res.text()).trim();
    if (!res.ok || !crumb || crumb.length > 80 || /[<>\s]/.test(crumb)) {
      throw new Error('Yahoo không cấp crumb hợp lệ.');
    }
    yahooAuth = { cookie, crumb, at: Date.now(), pending: null };
    return yahooAuth;
  })().then(
    auth => { yahooAuth.pending = null; return auth; },
    err => { yahooAuth.pending = null; throw err; }
  );
  return yahooAuth.pending;
}

async function fetchCompanySummary(symbol, fresh) {
  const key = 'company:' + symbol;
  if (!fresh) {
    const cached = cacheGet(key);
    if (cached) return cached;
  }
  let auth = await yahooAuthToken(false);
  const buildUrl = () => YAHOO_HOST + '/v10/finance/quoteSummary/' + encodeURIComponent(symbol) +
    '?modules=' + COMPANY_MODULES + '&crumb=' + encodeURIComponent(auth.crumb);
  let res = await fetch(buildUrl(), {
    headers: { 'User-Agent': UA, Cookie: auth.cookie, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401) {
    auth = await yahooAuthToken(true);
    res = await fetch(buildUrl(), {
      headers: { 'User-Agent': UA, Cookie: auth.cookie, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
  }
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status + ' cho ' + symbol);
  const data = await res.json();
  const block = data && data.quoteSummary;
  const result = block && Array.isArray(block.result) ? block.result[0] : null;
  if (!result) {
    const detail = block && block.error && block.error.description ? block.error.description : 'Không có dữ liệu.';
    throw new Error(detail);
  }
  cacheSet(key, result, 10 * 60 * 1000);
  return result;
}

function ynum(v) {
  if (v && typeof v === 'object') v = v.raw;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/* Yahoo trả 0 cho nhiều trường thiếu trong báo cáo tài chính. */
function ynumNZ(v) {
  const n = ynum(v);
  return n === 0 ? null : n;
}
function ystr(v) {
  if (v && typeof v === 'object') v = v.raw;
  return v == null ? '' : String(v);
}
function ratio(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;
}
function dateYear(ts) {
  const n = ynum(ts);
  if (!n) return '';
  return String(new Date(n * 1000).getUTCFullYear());
}
function dateQuarter(ts) {
  const n = ynum(ts);
  if (!n) return '';
  const d = new Date(n * 1000);
  return 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + '/' + d.getUTCFullYear();
}

function normalizeIncomeRow(row, fin, shares, quarterly) {
  const revenue = ynumNZ(row.totalRevenue) || ynumNZ(row.operatingRevenue);
  const grossProfit = ynumNZ(row.grossProfit);
  const operatingIncome = ynumNZ(row.operatingIncome);
  const netIncome = ynumNZ(row.netIncome) != null ? ynumNZ(row.netIncome) : ynumNZ(row.netIncomeApplicableToCommonShares);
  const ebitda = ynumNZ(row.ebitda);
  const eps = shares && netIncome != null ? netIncome / shares : ynum(row.dilutedEPS) || ynum(row.basicEPS);
  return {
    date: quarterly ? dateQuarter(row.endDate) : dateYear(row.endDate),
    revenue,
    grossProfit,
    operatingIncome,
    netIncome,
    ebitda,
    eps,
    grossMargin: ratio(grossProfit, revenue),
    operatingMargin: ratio(operatingIncome, revenue),
    netMargin: ratio(netIncome, revenue),
  };
}

function normalizeBalanceRow(row, quarterly) {
  const assets = ynumNZ(row.totalAssets);
  const liabilities = ynumNZ(row.totalLiabilities);
  const equity = ynumNZ(row.totalStockholderEquity) || ynumNZ(row.totalEquity);
  return {
    date: quarterly ? dateQuarter(row.endDate) : dateYear(row.endDate),
    assets,
    liabilities,
    equity,
    cash: ynum(row.cash) || ynum(row.cashAndCashEquivalents),
    shortTermInvestments: ynum(row.shortTermInvestments),
    inventory: ynum(row.inventory),
    receivables: ynum(row.netReceivables),
    currentAssets: ynumNZ(row.totalCurrentAssets),
    currentLiabilities: ynumNZ(row.totalCurrentLiabilities),
    longTermDebt: ynum(row.longTermDebt),
    totalDebt: ynum(row.totalDebt) || (ynum(row.shortLongTermDebt) != null || ynum(row.longTermDebt) != null
      ? (ynum(row.shortLongTermDebt) || 0) + (ynum(row.longTermDebt) || 0)
      : null),
  };
}

function normalizeCashRow(row, quarterly) {
  const ocf = ynum(row.totalCashFromOperatingActivities);
  const capex = ynum(row.capitalExpenditures);
  const fcf = ynum(row.freeCashFlow) != null ? ynum(row.freeCashFlow) : (ocf != null && capex != null ? ocf + capex : null);
  return {
    date: quarterly ? dateQuarter(row.endDate) : dateYear(row.endDate),
    ocf,
    capex,
    fcf,
    dividends: ynum(row.dividendsPaid),
    netIncome: ynum(row.netIncome),
  };
}

function sortStatementRows(rows, mapper) {
  return (rows || []).slice()
    .sort((a, b) => (ynum(a.endDate) || 0) - (ynum(b.endDate) || 0))
    .map(mapper)
    .filter(r => r && r.date);
}

function normalizeCompany(symbol, raw) {
  const price = raw.price || {};
  const detail = raw.summaryDetail || {};
  const stats = raw.defaultKeyStatistics || {};
  const fin = raw.financialData || {};
  const profile = raw.assetProfile || {};
  const fund = raw.fundProfile || {};
  const earnings = raw.earnings || {};
  const trend = raw.recommendationTrend || {};

  const quoteType = ystr(price.quoteType) || 'EQUITY';
  const shares = ynum(stats.sharesOutstanding) || ynum(stats.impliedSharesOutstanding);
  const marketCap = ynum(price.marketCap) || ynum(detail.marketCap);
  const priceNow = ynum(price.regularMarketPrice) || ynum(detail.fulldayPrice) || ynum(fin.currentPrice);
  const prevClose = ynum(price.regularMarketPreviousClose) || ynum(detail.previousClose);
  const changePct = ynum(price.regularMarketChangePercent) != null
    ? ynum(price.regularMarketChangePercent) * 100
    : (priceNow != null && prevClose ? (priceNow - prevClose) / prevClose * 100 : null);
  const currency = ystr(price.currency) || ystr(detail.currency) || ystr(fin.financialCurrency) || 'USD';
  const name = ystr(price.longName) || ystr(price.shortName) || symbol;

  const incomeAnnualRaw = (raw.incomeStatementHistory && raw.incomeStatementHistory.incomeStatementHistory) || [];
  const incomeQuarterlyRaw = (raw.incomeStatementHistoryQuarterly && raw.incomeStatementHistoryQuarterly.incomeStatementHistory) || [];
  const balanceAnnualRaw = (raw.balanceSheetHistory && raw.balanceSheetHistory.balanceSheetStatements) || [];
  const balanceQuarterlyRaw = (raw.balanceSheetHistoryQuarterly && raw.balanceSheetHistoryQuarterly.balanceSheetStatements) || [];
  const cashAnnualRaw = (raw.cashflowStatementHistory && raw.cashflowStatementHistory.cashflowStatements) || [];
  const cashQuarterlyRaw = (raw.cashflowStatementHistoryQuarterly && raw.cashflowStatementHistoryQuarterly.cashflowStatements) || [];

  const incomeAnnual = sortStatementRows(incomeAnnualRaw, r => normalizeIncomeRow(r, fin, shares, false));
  const incomeQuarterly = sortStatementRows(incomeQuarterlyRaw, r => normalizeIncomeRow(r, fin, shares, true));
  const balanceAnnual = sortStatementRows(balanceAnnualRaw, r => normalizeBalanceRow(r, false));
  const balanceQuarterly = sortStatementRows(balanceQuarterlyRaw, r => normalizeBalanceRow(r, true));
  const cashAnnual = sortStatementRows(cashAnnualRaw, r => normalizeCashRow(r, false));
  const cashQuarterly = sortStatementRows(cashQuarterlyRaw, r => normalizeCashRow(r, true));

  const earningsYearly = ((earnings.financialsChart && earnings.financialsChart.yearly) || []).map(r => ({
    date: String(r.date || ''),
    revenue: ynum(r.revenue),
    earnings: ynum(r.earnings),
    profitMargin: ynum(r.profitMargin),
  })).sort((a, b) => a.date.localeCompare(b.date));
  const earningsQuarterly = ((earnings.financialsChart && earnings.financialsChart.quarterly) || []).map(r => ({
    date: ystr(r.date) || ystr(r.fiscalQuarter),
    revenue: ynum(r.revenue),
    earnings: ynum(r.earnings),
    profitMargin: ynum(r.profitMargin),
  }));
  const surprises = ((earnings.earningsChart && earnings.earningsChart.quarterly) || []).map(r => ({
    date: ystr(r.date) || ystr(r.fiscalQuarter),
    actual: ynum(r.actual),
    estimate: ynum(r.estimate),
    surprisePct: ynum(r.surprisePct),
  }));

  const latestIncome = incomeAnnual[incomeAnnual.length - 1] || null;
  const latestBalance = balanceAnnual[balanceAnnual.length - 1] || null;
  const latestCash = cashAnnual[cashAnnual.length - 1] || null;
  const equityBook = ynum(stats.bookValue) != null && shares ? ynum(stats.bookValue) * shares : null;
  const totalCash = ynum(fin.totalCash);
  const totalDebt = ynum(fin.totalDebt);
  const ocf = ynum(fin.operatingCashflow) || (latestCash && latestCash.ocf);
  const fcf = ynum(fin.freeCashflow) || (latestCash && latestCash.fcf);
  const capex = latestCash && latestCash.capex != null
    ? latestCash.capex
    : (fcf != null && ocf != null ? fcf - ocf : null);

  const currentTrend = ((trend.trend || []).find(t => t.period === '0m')) || ((trend.trend || [])[0]) || null;
  const analyst = {
    key: ystr(fin.recommendationKey),
    mean: ynum(fin.recommendationMean),
    count: ynum(fin.numberOfAnalystOpinions),
    targetLow: ynum(fin.targetLowPrice),
    targetMean: ynum(fin.targetMeanPrice),
    targetMedian: ynum(fin.targetMedianPrice),
    targetHigh: ynum(fin.targetHighPrice),
    trend: currentTrend ? {
      strongBuy: ynum(currentTrend.strongBuy) || 0,
      buy: ynum(currentTrend.buy) || 0,
      hold: ynum(currentTrend.hold) || 0,
      sell: ynum(currentTrend.sell) || 0,
      strongSell: ynum(currentTrend.strongSell) || 0,
    } : null,
  };

  const summary = {
    symbol,
    name,
    quoteType,
    currency,
    exchange: ystr(price.exchangeName) || ystr(price.exchange),
    marketState: ystr(price.marketState),
    price: priceNow,
    prevClose,
    changePct,
    dayHigh: ynum(price.regularMarketDayHigh) || ynum(detail.dayHigh),
    dayLow: ynum(price.regularMarketDayLow) || ynum(detail.dayLow),
    open: ynum(price.regularMarketOpen) || ynum(detail.open),
    volume: ynum(price.regularMarketVolume) || ynum(detail.volume),
    marketCap,
    sector: ystr(profile.sector) || ystr(fund.categoryName) || '',
    industry: ystr(profile.industry) || ystr(fund.legalType) || '',
    employees: ynum(profile.fullTimeEmployees),
    country: ystr(profile.country),
    city: ystr(profile.city),
    address: [ystr(profile.address1), ystr(profile.address2)].filter(Boolean).join(', '),
    phone: ystr(profile.phone),
    website: ystr(profile.website),
    summary: ystr(profile.longBusinessSummary),
    officers: (profile.companyOfficers || []).slice(0, 8).map(o => ({
      name: ystr(o.name),
      title: ystr(o.title),
      age: ynum(o.age),
      pay: ynum(o.totalPay),
    })).filter(o => o.name),
  };

  const statsOut = {
    trailingPE: ynum(detail.trailingPE),
    forwardPE: ynum(detail.forwardPE) || ynum(stats.forwardPE),
    priceToBook: ynum(stats.priceToBook),
    priceToSales: ynum(detail.priceToSalesTrailing12Months),
    enterpriseValue: ynum(stats.enterpriseValue),
    enterpriseToRevenue: ynum(stats.enterpriseToRevenue),
    enterpriseToEbitda: ynum(stats.enterpriseToEbitda),
    beta: ynum(stats.beta) || ynum(detail.beta),
    trailingEps: ynum(stats.trailingEps),
    forwardEps: ynum(stats.forwardEps),
    bookValue: ynum(stats.bookValue),
    pegRatio: ynum(stats.pegRatio),
    sharesOutstanding: shares,
    dividendRate: ynum(detail.dividendRate),
    dividendYield: ynum(detail.dividendYield),
    payoutRatio: ynum(detail.payoutRatio),
    fiveYearAvgDividendYield: ynum(detail.fiveYearAvgDividendYield),
    fiftyTwoWeekLow: ynum(detail.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: ynum(detail.fiftyTwoWeekHigh),
    fiftyDayAverage: ynum(detail.fiftyDayAverage),
    twoHundredDayAverage: ynum(detail.twoHundredDayAverage),
    avgVolume: ynum(detail.averageVolume),
    profitMargins: ynum(fin.profitMargins) || ynum(stats.profitMargins),
    grossMargins: ynum(fin.grossMargins),
    operatingMargins: ynum(fin.operatingMargins),
    ebitdaMargins: ynum(fin.ebitdaMargins),
    returnOnAssets: ynum(fin.returnOnAssets),
    returnOnEquity: ynum(fin.returnOnEquity),
    revenueGrowth: ynum(fin.revenueGrowth),
    earningsGrowth: ynum(fin.earningsGrowth),
    revenueQuarterlyGrowth: ynum(stats.revenueQuarterlyGrowth),
    earningsQuarterlyGrowth: ynum(stats.earningsQuarterlyGrowth),
    debtToEquity: ynum(fin.debtToEquity),
    currentRatio: ynum(fin.currentRatio),
    quickRatio: ynum(fin.quickRatio),
    totalCash,
    totalDebt,
    totalRevenue: ynum(fin.totalRevenue) || (latestIncome && latestIncome.revenue),
    ebitda: ynum(fin.ebitda),
    grossProfits: ynum(fin.grossProfits),
    netIncome: ynum(stats.netIncomeToCommon) || (latestIncome && latestIncome.netIncome),
    revenuePerShare: ynum(fin.revenuePerShare),
    freeCashflow: fcf,
    operatingCashflow: ocf,
    capex,
    change52w: ynum(stats['52WeekChange']),
    heldPercentInsiders: ynum(stats.heldPercentInsiders),
    heldPercentInstitutions: ynum(stats.heldPercentInstitutions),
    lastFiscalYearEnd: ynum(stats.lastFiscalYearEnd),
    mostRecentQuarter: ynum(stats.mostRecentQuarter),
    totalAssets: ynum(detail.totalAssets) || ynum(stats.totalAssets),
    navPrice: ynum(stats.navPrice) || ynum(detail.navPrice),
    yield: ynum(detail.yield) || ynum(stats.yield),
    ytdReturn: ynum(detail.ytdReturn) || ynum(stats.ytdReturn),
    threeYearAverageReturn: ynum(detail.threeYearAverageReturn) || ynum(stats.threeYearAverageReturn),
    fiveYearAverageReturn: ynum(detail.fiveYearAverageReturn) || ynum(stats.fiveYearAverageReturn),
  };

  const balanceSnapshot = {
    date: latestBalance ? latestBalance.date : '',
    assets: latestBalance ? latestBalance.assets : null,
    liabilities: latestBalance ? latestBalance.liabilities : null,
    equity: latestBalance && latestBalance.equity != null ? latestBalance.equity : equityBook,
    cash: latestBalance && latestBalance.cash != null ? latestBalance.cash : totalCash,
    debt: latestBalance && latestBalance.totalDebt != null ? latestBalance.totalDebt : totalDebt,
    currentAssets: latestBalance ? latestBalance.currentAssets : null,
    currentLiabilities: latestBalance ? latestBalance.currentLiabilities : null,
  };

  const cashSnapshot = {
    date: latestCash ? latestCash.date : '',
    ocf,
    capex,
    fcf,
    dividends: latestCash ? latestCash.dividends : null,
    netIncome: latestCash && latestCash.netIncome != null ? latestCash.netIncome : statsOut.netIncome,
  };

  const hasFundProfile = !!(ystr(fund.categoryName) || ystr(fund.fundFamily) || ystr(fund.legalType) ||
    ynum(fund.annualReportExpenseRatio) || ynum(fund.feesExpenseRatio) || ynum(fund.fundInceptionDate));
  const isFundType = quoteType === 'ETF' || quoteType === 'MUTUALFUND';
  const fundOut = (hasFundProfile || isFundType) ? {
    category: ystr(fund.categoryName),
    family: ystr(fund.fundFamily),
    legalType: ystr(fund.legalType),
    expenseRatio: ynum(fund.annualReportExpenseRatio) || ynum(fund.feesExpenseRatio),
    inception: ynum(fund.fundInceptionDate),
    totalAssets: statsOut.totalAssets,
    navPrice: statsOut.navPrice,
    yield: statsOut.yield,
    ytdReturn: statsOut.ytdReturn,
    threeYearAverageReturn: statsOut.threeYearAverageReturn,
    fiveYearAverageReturn: statsOut.fiveYearAverageReturn,
  } : null;

  return {
    symbol,
    name,
    quoteType,
    currency,
    summary,
    stats: statsOut,
    financials: {
      totalRevenue: statsOut.totalRevenue,
      grossProfits: statsOut.grossProfits,
      operatingCashflow: ocf,
      freeCashflow: fcf,
      capex,
      totalCash,
      totalDebt,
      returnOnEquity: statsOut.returnOnEquity,
      returnOnAssets: statsOut.returnOnAssets,
      debtToEquity: statsOut.debtToEquity,
      currentRatio: statsOut.currentRatio,
      revenueGrowth: statsOut.revenueGrowth,
      earningsGrowth: statsOut.earningsGrowth,
      grossMargins: statsOut.grossMargins,
      operatingMargins: statsOut.operatingMargins,
      profitMargins: statsOut.profitMargins,
    },
    statements: {
      incomeAnnual,
      incomeQuarterly,
      balanceAnnual,
      balanceQuarterly,
      cashAnnual,
      cashQuarterly,
      balanceSnapshot,
      cashSnapshot,
    },
    earnings: {
      yearly: earningsYearly,
      quarterly: earningsQuarterly,
      surprises,
      nextEarnings: (earnings.earningsChart && Array.isArray(earnings.earningsChart.earningsDate) ? ynum(earnings.earningsChart.earningsDate[0]) : null),
    },
    analyst,
    fund: fundOut,
    hasFundamentals: !!(incomeAnnual.length || earningsYearly.length || profile.longBusinessSummary || ynumNZ(fin.totalRevenue) || fundOut),
    source: 'yahoo',
    at: Date.now(),
  };
}

function normalizePeer(symbol, raw) {
  const c = normalizeCompany(symbol, raw);
  return {
    symbol: c.symbol,
    name: c.name,
    currency: c.currency,
    price: c.summary.price,
    changePct: c.summary.changePct,
    marketCap: c.summary.marketCap,
    trailingPE: c.stats.trailingPE,
    priceToBook: c.stats.priceToBook,
    returnOnEquity: c.stats.returnOnEquity,
    profitMargins: c.stats.profitMargins,
    revenueGrowth: c.stats.revenueGrowth,
    dividendYield: c.stats.dividendYield,
    sector: c.summary.sector,
    industry: c.summary.industry,
    quoteType: c.quoteType,
  };
}

async function handleCompany(q, res) {
  const symbol = (q.get('symbol') || '').trim();
  const fresh = q.get('fresh') === '1';
  const peers = splitList(q.get('peers'), 6).filter(safeSymbol);
  if (!safeSymbol(symbol)) return json(res, 400, { ok: false, error: 'Mã doanh nghiệp không hợp lệ.' });
  const cacheKey = 'company-response:' + symbol + ':' + peers.slice().sort().join(',');
  if (!fresh) {
    const cached = cacheGet(cacheKey);
    if (cached) return json(res, 200, Object.assign({}, cached, { cached: true }));
  }
  try {
    const [mainResult, peerResults] = await Promise.all([
      fetchCompanySummary(symbol, fresh),
      Promise.allSettled(peers.map(p => fetchCompanySummary(p, false))),
    ]);
    const normalized = normalizeCompany(symbol, mainResult);
    if (!normalized.hasFundamentals && !normalized.summary.summary) {
      const response = {
        ok: false,
        reason: 'no-fundamentals',
        symbol,
        quoteType: normalized.quoteType,
        summary: normalized.summary,
        at: Date.now(),
        error: 'Yahoo không cung cấp báo cáo doanh nghiệp cho mã này.',
      };
      cacheSet(cacheKey, response, 5 * 60 * 1000);
      return json(res, 200, response);
    }
    const peerList = [];
    peerResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        try { peerList.push(normalizePeer(peers[i], r.value)); } catch (e) { /* bỏ qua peer lỗi */ }
      }
    });
    const response = Object.assign({}, normalized, {
      ok: true,
      peers: peerList,
      peerErrors: peerResults.map(r => r.status === 'rejected' ? r.reason.message : null).filter(Boolean),
    });
    cacheSet(cacheKey, response, 5 * 60 * 1000);
    json(res, 200, response);
  } catch (e) {
    json(res, 502, { ok: false, error: e.message || 'Không tải được dữ liệu doanh nghiệp.' });
  }
}

/* ------------------------------ STATIC ------------------------------ */
function serveStatic(pathname, res) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { rel = '/'; }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.resolve(ROOT, '.' + rel);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Không tìm thấy tệp.');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    fs.createReadStream(file).pipe(res);
  });
}

/* ------------------------------ SERVER ------------------------------ */
const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) {
    res.writeHead(400); return res.end('Bad request');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { ok: false, error: 'Chỉ hỗ trợ GET.' });
  }

  const route = url.pathname;
  try {
    if (route === '/api/status') return json(res, 200, { ok: true, mode: 'live', at: Date.now(), version: '1.15.0' });
    if (route === '/api/quotes') return handleQuotes(url.searchParams, res);
    if (route === '/api/chart') return handleChart(url.searchParams, res);
    if (route === '/api/company') return handleCompany(url.searchParams, res);
    if (route === '/api/company-news') return handleCompanyNews(url.searchParams, res);
    if (route === '/api/news') return handleNews(res);
    if (route === '/api/derivs') return handleDerivs(res);
    if (route === '/api/depth') return handleDepth(url.searchParams, res);
    if (route.startsWith('/api/')) return json(res, 404, { ok: false, error: 'API không tồn tại.' });
    return serveStatic(route, res);
  } catch (e) {
    console.error('[AURELIS]', route, e.message);
    return json(res, 500, { ok: false, error: 'Lỗi máy chủ dữ liệu.' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  AURELIS MARKETS · dữ liệu thị trường thật');
  console.log('  ➜  http://localhost:' + PORT);
  console.log('  API: /api/status · /api/quotes · /api/chart · /api/company · /api/company-news · /api/news');
  console.log('');
});
