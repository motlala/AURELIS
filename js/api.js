/* ============================================================
   AURELIS MARKETS — data connection layer
   Ưu tiên proxy nội bộ (/api) để tránh CORS.
   Khi mở file tĩnh: tự thử Binance trực tiếp cho crypto.
   ============================================================ */
(function () {
  'use strict';
  const D = window.AURELIS_DATA;
  const YAHOO_ASSETS = D.ASSETS.filter(a => a.yahoo);
  const CRYPTO_ASSETS = D.ASSETS.filter(a => a.binance);
  const RATE_SYMBOLS = ['^IRX', '^TNX', '^FVX', '^VIX', 'GC=F', 'USDVND=X', 'EURUSD=X', 'GBPUSD=X', 'JPY=X', 'AUDUSD=X'];

  const TF_BINANCE = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
  const TF_RANGE = {
    '1m': { range: '1d', interval: '1m' },
    '5m': { range: '5d', interval: '5m' },
    '15m': { range: '1mo', interval: '15m' },
    '1H': { range: '3mo', interval: '60m' },
    '4H': { range: '6mo', interval: '60m', aggregate: 4 },
    '1D': { range: '2y', interval: '1d' },
    '1W': { range: '10y', interval: '1wk' }
  };

  async function fetchJSON(url, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 14000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const Api = {
    mode: 'demo',            // live | binance | demo
    server: false,
    ready: null,             // promise của lần boot đầu tiên
    lastQuoteAt: 0,
    lastError: '',
    fx: 25594,
    chartCache: new Map(),
    companyCache: new Map(),
    companyNewsCache: new Map(),
    newsCache: { at: 0, items: [] },
    ratesCache: { at: 0, data: null },

    async boot() {
      try {
        const st = await fetchJSON('/api/status', 4000);
        if (st && st.ok) {
          this.server = true;
          this.mode = 'live';
          return this.mode;
        }
      } catch (e) { /* chưa có server */ }
      try {
        const test = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', 7000);
        if (test && test.lastPrice) {
          this.mode = 'binance';
          return this.mode;
        }
      } catch (e) { /* offline hoặc bị chặn */ }
      this.mode = 'demo';
      return this.mode;
    },

    hasLive(asset) {
      if (!asset) return false;
      if (this.mode === 'live') return !!(asset.yahoo || asset.binance);
      if (this.mode === 'binance') return !!asset.binance;
      return false;
    },

    /** Lấy báo giá thật cho toàn bộ tài sản. Trả về Map id -> quote */
    async quotes(force) {
      const result = new Map();
      if (this.mode === 'live') {
        const yahoo = YAHOO_ASSETS.map(a => a.yahoo).join(',');
        const crypto = CRYPTO_ASSETS.map(a => a.binance).join(',');
        const url = '/api/quotes?yahoo=' + encodeURIComponent(yahoo) + '&crypto=' + encodeURIComponent(crypto) + (force ? '&fresh=1&_=' + Date.now() : '');
        const data = await fetchJSON(url, 18000);
        if (data && data.ok) {
          const q = data.quotes || {};
          YAHOO_ASSETS.forEach(a => {
            const item = q[a.yahoo];
            if (item && isFinite(item.price)) result.set(a.id, item);
          });
          CRYPTO_ASSETS.forEach(a => {
            const item = q[a.binance];
            if (item && isFinite(item.price)) result.set(a.id, item);
          });
          const fxq = q['USDVND=X'];
          if (fxq && isFinite(fxq.price) && fxq.price > 1000) this.fx = fxq.price;
        }
      } else if (this.mode === 'binance') {
        const symbols = CRYPTO_ASSETS.map(a => a.binance);
        const encoded = encodeURIComponent(JSON.stringify(symbols));
        const arr = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encoded, 12000);
        if (Array.isArray(arr)) {
          const map = new Map(arr.map(x => [x.symbol, x]));
          CRYPTO_ASSETS.forEach(a => {
            const t = map.get(a.binance);
            if (!t) return;
            const price = parseFloat(t.lastPrice);
            const prev = parseFloat(t.openPrice);
            result.set(a.id, {
              price,
              prevClose: prev,
              changePct: parseFloat(t.priceChangePercent),
              open: prev,
              high: parseFloat(t.highPrice),
              low: parseFloat(t.lowPrice),
              volume: parseFloat(t.volume),
              spark: null,
              source: 'binance'
            });
          });
        }
      }
      if (result.size) this.lastQuoteAt = Date.now();
      return result;
    },

    /** Lấy lãi suất / tỷ giá vĩ mô cho ngân hàng mô phỏng. Cache 90 giây. */
    async rates(force) {
      const cached = this.ratesCache;
      if (!force && cached.data && Date.now() - cached.at < 90000) return cached.data;
      const fallback = Object.assign({}, D.SAVINGS_BENCH, { at: Date.now(), live: false, symbols: {} });
      let quotes = null;
      if (this.mode === 'live') {
        try {
          const url = '/api/quotes?yahoo=' + encodeURIComponent(RATE_SYMBOLS.join(','));
          const data = await fetchJSON(url, 14000);
          if (data && data.ok && data.quotes) quotes = data.quotes;
        } catch (e) { this.lastError = e.message || String(e); }
      }
      const pick = (symbol, fallbackValue) => {
        const q = quotes && quotes[symbol];
        const v = q ? Number(q.price) : NaN;
        return isFinite(v) && v > 0 ? v : fallbackValue;
      };
      const out = {
        irx: pick('^IRX', fallback.irx),
        tnx: pick('^TNX', fallback.tnx),
        fvx: pick('^FVX', fallback.fvx),
        vix: pick('^VIX', fallback.vix),
        goldUsd: pick('GC=F', fallback.goldUsd),
        usdvnd: pick('USDVND=X', fallback.usdvnd),
        eurusd: pick('EURUSD=X', fallback.eurusd),
        gbpusd: pick('GBPUSD=X', fallback.gbpusd),
        jpy: pick('JPY=X', fallback.jpy),
        audusd: pick('AUDUSD=X', fallback.audusd),
        at: Date.now(),
        live: false,
        symbols: {}
      };
      let valid = 0;
      RATE_SYMBOLS.forEach(symbol => {
        const q = quotes && quotes[symbol];
        if (q && isFinite(Number(q.price)) && Number(q.price) > 0) {
          valid++;
          out.symbols[symbol] = { price: Number(q.price), changePct: Number(q.changePct) || 0, prevClose: Number(q.prevClose) || Number(q.price) };
        }
      });
      out.live = valid >= 4;
      if (quotes && quotes['USDVND=X']) {
        const fx = Number(quotes['USDVND=X'].price);
        if (isFinite(fx) && fx > 1000) this.fx = fx;
      }
      if (out.live) this.ratesCache = { at: Date.now(), data: out };
      return out;
    },

    /** Lấy nến thật. Trả về mảng nến hoặc null. force = bỏ qua cache client + upstream. */
    async chart(asset, tf, force) {
      if (!this.hasLive(asset)) return null;
      const key = asset.id + '|' + tf;
      const cached = this.chartCache.get(key);
      if (!force && cached && Date.now() - cached.at < 45000) return cached.candles;

      let candles = null;
      try {
        if (this.mode === 'live') {
          const source = asset.binance ? 'binance' : 'yahoo';
          const symbol = asset.binance || asset.yahoo;
          const url = '/api/chart?source=' + source + '&symbol=' + encodeURIComponent(symbol) + '&tf=' + encodeURIComponent(tf) + (force ? '&fresh=1&_=' + Date.now() : '');
          const data = await fetchJSON(url, 16000);
          if (data && data.ok && Array.isArray(data.candles) && data.candles.length > 5) candles = data.candles;
        } else if (this.mode === 'binance' && asset.binance) {
          const interval = TF_BINANCE[tf] || '1d';
          const url = 'https://api.binance.com/api/v3/klines?symbol=' + asset.binance + '&interval=' + interval + '&limit=400';
          const rows = await fetchJSON(url, 12000);
          if (Array.isArray(rows)) {
            candles = rows.map(r => ({
              t: Math.floor(r[0] / 1000),
              o: parseFloat(r[1]), h: parseFloat(r[2]),
              l: parseFloat(r[3]), c: parseFloat(r[4]),
              v: parseFloat(r[5])
            }));
          }
        }
      } catch (e) {
        this.lastError = e.message;
      }
      if (candles && candles.length) {
        this.chartCache.set(key, { at: Date.now(), candles });
        return candles;
      }
      return null;
    },

    /** Báo cáo doanh nghiệp từ Yahoo quoteSummary qua proxy nội bộ. Cache 5 phút. */
    async company(asset, peers, force) {
      if (!asset || !asset.yahoo) return null;
      if (this.mode !== 'live' && this.ready) {
        try { await this.ready; } catch (e) { /* boot lỗi */ }
      }
      if (this.mode !== 'live') return null;
      const peerList = (peers || []).filter(Boolean).slice(0, 6);
      const key = asset.yahoo + '|' + peerList.slice().sort().join(',');
      const cached = this.companyCache.get(key);
      if (!force && cached && Date.now() - cached.at < 5 * 60000) return cached.data;
      try {
        const url = '/api/company?symbol=' + encodeURIComponent(asset.yahoo) +
          '&peers=' + encodeURIComponent(peerList.join(',')) + (force ? '&fresh=1&_=' + Date.now() : '');
        const data = await fetchJSON(url, 24000);
        if (data) {
          this.companyCache.set(key, { at: Date.now(), data });
          return data;
        }
      } catch (e) {
        this.lastError = e.message || String(e);
      }
      return null;
    },

    async news() {
      if (Date.now() - this.newsCache.at < 5 * 60000 && this.newsCache.items.length) return this.newsCache.items;
      if (this.mode !== 'live') return [];
      try {
        const data = await fetchJSON('/api/news', 12000);
        if (data && data.ok && Array.isArray(data.items)) {
          this.newsCache = { at: Date.now(), items: data.items };
          return data.items;
        }
      } catch (e) { /* dùng fallback */ }
      return [];
    },

    /** Tin tức liên quan tới một doanh nghiệp. Cache client 55 giây. */
    async companyNews(asset, force) {
      if (!asset) return null;
      const key = asset.yahoo || asset.symbol;
      const cached = this.companyNewsCache.get(key);
      if (!force && cached && Date.now() - cached.at < 55000) return cached.data;
      if (this.mode !== 'live' && this.ready) {
        try { await this.ready; } catch (e) { /* boot lỗi */ }
      }
      if (this.mode !== 'live') return null;
      try {
        const url = '/api/company-news?symbol=' + encodeURIComponent(asset.yahoo || asset.symbol) +
          '&name=' + encodeURIComponent(asset.name || '') +
          '&sector=' + encodeURIComponent(asset.sector || '') +
          '&group=' + encodeURIComponent(asset.group || '') +
          (force ? '&fresh=1&_=' + Date.now() : '');
        const data = await fetchJSON(url, 16000);
        if (data) {
          this.companyNewsCache.set(key, { at: Date.now(), data });
          return data;
        }
      } catch (e) {
        this.lastError = e.message || String(e);
      }
      return null;
    },

    async derivatives() {
      if (this.mode === 'live') {
        try {
          const data = await fetchJSON('/api/derivs', 12000);
          if (data && data.ok && Array.isArray(data.items)) return data.items;
        } catch (e) { /* fallback */ }
      }
      // Gọi trực tiếp Binance futures (CORS mở)
      if (this.mode !== 'demo') {
        try {
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
          const [premiums, ratios] = await Promise.all([
            Promise.all(symbols.map(s => fetchJSON('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=' + s, 8000).catch(() => null))),
            Promise.all(symbols.map(s => fetchJSON('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=' + s + '&period=1h&limit=1', 8000).catch(() => null)))
          ]);
          const items = [];
          for (let i = 0; i < symbols.length; i++) {
            const p = premiums[i];
            const r = Array.isArray(ratios[i]) ? ratios[i][0] : null;
            if (!p) continue;
            items.push({
              symbol: symbols[i],
              funding: parseFloat(p.lastFundingRate),
              markPrice: parseFloat(p.markPrice),
              indexPrice: parseFloat(p.indexPrice),
              nextFundingTime: p.nextFundingTime,
              longAccount: r ? parseFloat(r.longAccount) : null,
              longShortRatio: r ? parseFloat(r.longShortRatio) : null
            });
          }
          if (items.length) return items;
        } catch (e) { /* ignore */ }
      }
      return [];
    },

    async depth(symbol) {
      const s = symbol || 'BTCUSDT';
      try {
        if (this.mode === 'live') {
          const data = await fetchJSON('/api/depth?symbol=' + s, 8000);
          if (data && data.ok) return data;
        } else if (this.mode === 'binance') {
          const data = await fetchJSON('https://api.binance.com/api/v3/depth?symbol=' + s + '&limit=14', 8000);
          if (data && data.bids) {
            return {
              ok: true,
              bids: data.bids.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
              asks: data.asks.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }))
            };
          }
        }
      } catch (e) { /* ignore */ }
      return null;
    }
  };

  window.AURELIS_API = Api;
})();
