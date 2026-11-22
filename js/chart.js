/* ============================================================
   AURELIS MARKETS — chart engine
   Nến Nhật, MA/EMA/BOLL, RSI/MACD, volume, crosshair, zoom/pan
   Công cụ vẽ: trendline, ray, hline, Fibonacci, hình chữ nhật,
   brush, text, thước đo, tẩy. AURA Vision tự tìm S/R.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------- INDICATORS ----------------------------- */
  function sma(values, period) {
    const out = new Array(values.length).fill(NaN);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) sum -= values[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  function ema(values, period) {
    const out = new Array(values.length).fill(NaN);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    out[period - 1] = sum / period;
    for (let i = period; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k);
    return out;
  }

  function rsi(closes, period) {
    period = period || 14;
    const out = new Array(closes.length).fill(NaN);
    if (closes.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gain += d; else loss -= d;
    }
    gain /= period; loss /= period;
    out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      gain = (gain * (period - 1) + Math.max(d, 0)) / period;
      loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
  }

  function macd(closes, fast, slow, signal) {
    fast = fast || 12; slow = slow || 26; signal = signal || 9;
    const eFast = ema(closes, fast);
    const eSlow = ema(closes, slow);
    const line = closes.map((_, i) => (isFinite(eFast[i]) && isFinite(eSlow[i])) ? eFast[i] - eSlow[i] : NaN);
    const valid = line.filter(v => isFinite(v));
    const sigValid = ema(valid, signal);
    const sig = new Array(closes.length).fill(NaN);
    let k = 0;
    for (let i = 0; i < line.length; i++) {
      if (isFinite(line[i])) {
        sig[i] = sigValid[k++];
      }
    }
    const hist = line.map((v, i) => isFinite(v) && isFinite(sig[i]) ? v - sig[i] : NaN);
    return { line, signal: sig, hist };
  }

  function bollinger(closes, period, mult) {
    period = period || 20; mult = mult || 2;
    const mid = sma(closes, period);
    const upper = new Array(closes.length).fill(NaN);
    const lower = new Array(closes.length).fill(NaN);
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += (closes[j] - mid[i]) ** 2;
      const sd = Math.sqrt(sum / period);
      upper[i] = mid[i] + sd * mult;
      lower[i] = mid[i] - sd * mult;
    }
    return { mid, upper, lower };
  }

  function stochastic(candles, kPeriod, dPeriod) {
    kPeriod = kPeriod || 14; dPeriod = dPeriod || 3;
    const k = new Array(candles.length).fill(NaN);
    for (let i = kPeriod - 1; i < candles.length; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        hi = Math.max(hi, candles[j].h);
        lo = Math.min(lo, candles[j].l);
      }
      k[i] = hi === lo ? 50 : ((candles[i].c - lo) / (hi - lo)) * 100;
    }
    const d = sma(k.map(v => isFinite(v) ? v : 0), dPeriod);
    return { k, d };
  }

  function cci(candles, period) {
    period = period || 20;
    const out = new Array(candles.length).fill(NaN);
    const tp = candles.map(c => (c.h + c.l + c.c) / 3);
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += tp[j];
      const avg = sum / period;
      let dev = 0;
      for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - avg);
      dev /= period;
      out[i] = dev === 0 ? 0 : (tp[i] - avg) / (0.015 * dev);
    }
    return out;
  }

  function williamsR(candles, period) {
    period = period || 14;
    const out = new Array(candles.length).fill(NaN);
    for (let i = period - 1; i < candles.length; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        hi = Math.max(hi, candles[j].h);
        lo = Math.min(lo, candles[j].l);
      }
      out[i] = hi === lo ? -50 : ((hi - candles[i].c) / (hi - lo)) * -100;
    }
    return out;
  }

  function atr(candles, period) {
    period = period || 14;
    const out = new Array(candles.length).fill(NaN);
    if (!candles.length) return out;
    let prev = candles[0].c;
    let sum = 0;
    for (let i = 1; i < candles.length; i++) {
      const tr = Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - prev), Math.abs(candles[i].l - prev));
      if (i <= period) sum += tr;
      if (i === period) out[i] = sum / period;
      else if (i > period) out[i] = (out[i - 1] * (period - 1) + tr) / period;
      prev = candles[i].c;
    }
    return out;
  }

  function adx(candles, period) {
    period = period || 14;
    const n = candles.length;
    const out = new Array(n).fill(NaN);
    if (n < period * 2) return out;
    const tr = new Array(n).fill(0);
    const plusDM = new Array(n).fill(0);
    const minusDM = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const up = candles[i].h - candles[i - 1].h;
      const down = candles[i - 1].l - candles[i].l;
      plusDM[i] = up > down && up > 0 ? up : 0;
      minusDM[i] = down > up && down > 0 ? down : 0;
      tr[i] = Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - candles[i - 1].c), Math.abs(candles[i].l - candles[i - 1].c));
    }
    let trS = 0, pS = 0, mS = 0;
    for (let i = 1; i <= period; i++) { trS += tr[i]; pS += plusDM[i]; mS += minusDM[i]; }
    const dx = [];
    for (let i = period + 1; i < n; i++) {
      trS = trS - trS / period + tr[i];
      pS = pS - pS / period + plusDM[i];
      mS = mS - mS / period + minusDM[i];
      const pDI = trS ? 100 * pS / trS : 0;
      const mDI = trS ? 100 * mS / trS : 0;
      const sum = pDI + mDI;
      dx.push(sum ? 100 * Math.abs(pDI - mDI) / sum : 0);
    }
    let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period * 2] = adxVal;
    for (let i = period; i < dx.length; i++) {
      adxVal = (adxVal * (period - 1) + dx[i]) / period;
      out[period + i + 1] = adxVal;
    }
    return out;
  }

  function linearRegression(points) {
    const n = points.length;
    if (!n) return { slope: 0, intercept: 0, std: 0 };
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
      sx += i; sy += points[i]; sxy += i * points[i]; sxx += i * i;
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
    const intercept = (sy - slope * sx) / n;
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (points[i] - (slope * i + intercept)) ** 2;
    return { slope, intercept, std: Math.sqrt(ss / n) };
  }

  const indicators = { sma, ema, rsi, macd, bollinger, stochastic, cci, williamsR, atr, adx, linearRegression };

  /* ----------------------------- DRAWING STORAGE ----------------------------- */
  const DRAW_KEY = 'aurelis.drawings.v1';
  function readDrawings() {
    try { return JSON.parse(localStorage.getItem(DRAW_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeDrawings(key, list) {
    try {
      const all = readDrawings();
      all[key] = list.slice(-120);
      localStorage.setItem(DRAW_KEY, JSON.stringify(all));
    } catch (e) { /* localStorage đầy hoặc bị chặn */ }
  }

  const COLORS = {
    up: '#2ee6a6', down: '#ff5d73', gold: '#f3c56b', cyan: '#5ac8fa',
    purple: '#b59cff', text: '#dbe6e2', muted: '#7d8d95', grid: 'rgba(255,255,255,.055)'
  };

  class Chart {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts || {};
      this.data = [];
      this.asset = null;
      this.tf = '1D';
      this.offset = 0;
      this.visible = 140;
      this.hover = null;
      this.pending = null;
      this.drag = null;
      this.brush = null;
      this.destroyed = false;
      this.tool = 'cursor';
      this.color = COLORS.gold;
      this.magnet = false;
      this.autoVision = false;
      this.drawings = [];
      this.drawingsKey = '';
      this.callbacks = Object.assign({}, opts && opts.callbacks, {
        onHover: opts && opts.onHover,
        onDrawingAdded: opts && opts.onDrawingAdded,
        onDrawingChange: opts && opts.onDrawingChange
      });
      this.config = Object.assign({ ma: true, ema: false, boll: false, osc: 'rsi', volume: true, type: 'candles' }, opts && opts.config);
      this.fmt = (opts && opts.formatPrice) || (v => Number(v).toLocaleString('vi-VN'));
      this.theme = this._readTheme();
      this._ind = null;
      this._indKey = '';
      this._raf = 0;
      this.abort = new AbortController();
      this._bind();
      this.resizeObs = null;
      if (window.ResizeObserver) {
        this.resizeObs = new ResizeObserver(() => this.resize());
        this.resizeObs.observe(canvas.parentElement || canvas);
      } else {
        window.addEventListener('resize', () => this.resize(), { signal: this.abort.signal });
      }
      this.resize();
    }

    _readTheme() {
      const cs = getComputedStyle(document.body);
      const pick = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
      return {
        up: pick('--up', COLORS.up),
        down: pick('--down', COLORS.down),
        gold: pick('--gold', COLORS.gold),
        cyan: pick('--cyan', COLORS.cyan),
        purple: pick('--purple', COLORS.purple),
        text: pick('--text', COLORS.text),
        muted: pick('--muted', COLORS.muted),
        grid: pick('--chart-grid', 'rgba(255,255,255,.055)'),
        panel: pick('--panel-solid', '#0c141c')
      };
    }

    refreshTheme() {
      this.theme = this._readTheme();
      this.draw();
    }

    _bind() {
      const c = this.canvas;
      const signal = this.abort.signal;
      c.addEventListener('wheel', e => this._onWheel(e), { passive: false, signal });
      c.addEventListener('pointerdown', e => this._onDown(e), { signal });
      c.addEventListener('pointermove', e => this._onMove(e), { signal });
      c.addEventListener('pointerup', e => this._onUp(e), { signal });
      c.addEventListener('pointerleave', () => { this.hover = null; this.draw(); this.callbacks.onHover && this.callbacks.onHover(null); }, { signal });
      c.addEventListener('contextmenu', e => { e.preventDefault(); this.cancel(); }, { signal });
      this._onKey = e => {
        if (e.key === 'Escape') { this.cancel(); }
      };
      document.addEventListener('keydown', this._onKey, { signal });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.draw(); }, { signal });
      this._applyCursor();
    }

    destroy() {
      this.destroyed = true;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
      if (this._rafFallback) { clearTimeout(this._rafFallback); this._rafFallback = 0; }
      this.abort.abort();
      if (this.resizeObs) this.resizeObs.disconnect();
      if (this.textInput) this.textInput.remove();
    }

    _applyCursor() {
      const map = {
        cursor: 'grab', pan: 'grab', eraser: 'crosshair', text: 'text',
        brush: 'crosshair', trend: 'crosshair', ray: 'crosshair',
        hline: 'crosshair', rect: 'crosshair', fib: 'crosshair', measure: 'crosshair'
      };
      this.canvas.style.cursor = map[this.tool] || 'crosshair';
    }

    resize() {
      if (this.destroyed) return;
      const parent = this.canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
      const w = Math.max(280, Math.round(rect.width));
      const h = Math.max(260, Math.round(rect.height));
      if (w === this.w && h === this.h) { this.draw(); return; }
      this.w = w; this.h = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    setData(candles, asset, tf, key) {
      this.data = Array.isArray(candles) ? candles.filter(c => isFinite(c.c)) : [];
      this.asset = asset || null;
      this.tf = tf || '1D';
      this.drawingsKey = key || ((asset ? asset.id : 'x') + '|' + this.tf);
      const all = readDrawings();
      this.drawings = all[this.drawingsKey] || [];
      this.pending = null;
      this.brush = null;
      this.visible = Math.min(150, Math.max(40, this.data.length));
      this.offset = Math.max(0, this.data.length - this.visible);
      this.hover = null;
      this.resize();
    }

    updatePrice(price, opts) {
      if (!this.data.length || !isFinite(price)) return;
      if (opts && opts.append) { this.applyLive(price); return; }
      const last = this.data[this.data.length - 1];
      last.c = price;
      last.h = Math.max(last.h, price);
      last.l = Math.min(last.l, price);
      this.draw();
    }

    /**
     * Đồng bộ giá live vào nến cuối. Nếu đã sang kỳ mới và thị trường đang mở,
     * tạo thêm nến hiện tại để biểu đồ không bị “dậm chân” sau khi reload.
     */
    applyLive(price) {
      if (!this.data.length || !isFinite(price)) return;
      const tfMs = (window.AURELIS_DATA.TF_MS[this.tf] || 86400000);
      const nowSec = Math.floor(Date.now() / 1000);
      const last = this.data[this.data.length - 1];
      const atEnd = this.offset + this.visible >= this.data.length - 1;
      const group = this.asset ? this.asset.group : '';
      const alwaysOpen = !this.asset || ['crypto', 'forex', 'derivatives'].includes(group);
      const marketOpen = () => {
        if (alwaysOpen) return true;
        try {
          const zone = (group === 'us' || group === 'etf') ? 'America/New_York' : 'Asia/Ho_Chi_Minh';
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
          }).formatToParts(new Date());
          const part = type => (parts.find(p => p.type === type) || {}).value;
          const weekday = part('weekday');
          if (weekday === 'Sat' || weekday === 'Sun') return false;
          const mins = Number(part('hour')) * 60 + Number(part('minute'));
          if (group === 'us' || group === 'etf') return mins >= 570 && mins < 960; // 09:30–16:00 ET
          if (['hose', 'hnx', 'upcom'].includes(group)) return mins >= 540 && mins <= 900; // 09:00–15:00 ICT
        } catch (e) {
          const day = new Date().getDay();
          if (day === 0 || day === 6) return false;
        }
        return true;
      };
      const periodSec = Math.max(60, tfMs / 1000);
      const currentStart = Math.floor(nowSec / periodSec) * periodSec;
      const lastStart = Math.floor(last.t / periodSec) * periodSec;
      const newBar = tfMs < 86400000 && this.tf !== '1W'
        ? nowSec - last.t >= periodSec
        : lastStart < currentStart;
      if (newBar && marketOpen()) {
        // Nến mới bắt đầu bằng giá live và một phần volume ước tính để cột VOL không bị trống.
        this.data.push({ t: currentStart, o: price, h: price, l: price, c: price, v: Math.max(0, (last.v || 0) * 0.08) });
        if (atEnd) this.offset = Math.max(0, this.data.length - this.visible);
      } else {
        last.c = price;
        last.h = Math.max(last.h, price);
        last.l = Math.min(last.l, price);
        if (last.v > 0) last.v += Math.max(1, last.v * 0.004);
      }
      this.lastLiveAt = Date.now();
      this.draw();
    }

    setConfig(cfg) {
      Object.assign(this.config, cfg);
      this.draw();
    }

    setTool(tool) {
      this.tool = tool;
      this.pending = null;
      this.brush = null;
      this._applyCursor();
      this.draw();
    }

    setColor(color) {
      this.color = color;
    }

    setVision(on) {
      this.autoVision = !!on;
      this.draw();
    }

    setMagnet(on) {
      this.magnet = !!on;
    }

    cancel() {
      if (this.textInput) { this.textInput.remove(); this.textInput = null; }
      this.pending = null;
      this.brush = null;
      this.drag = null;
      this.draw();
    }

    undo() {
      if (!this.drawings.length) return false;
      this.drawings.pop();
      writeDrawings(this.drawingsKey, this.drawings);
      this.draw();
      this.callbacks.onDrawingChange && this.callbacks.onDrawingChange(this.drawings.length);
      return true;
    }

    clearDrawings() {
      this.drawings = [];
      writeDrawings(this.drawingsKey, this.drawings);
      this.draw();
      this.callbacks.onDrawingChange && this.callbacks.onDrawingChange(0);
    }

    countDrawings() { return this.drawings.length; }

    /* ------------------------------ GEOMETRY ------------------------------ */
    _layout() {
      const w = this.w || 600, h = this.h || 400;
      const padL = 8, padR = 78, padT = 8, padB = 22;
      const innerW = Math.max(120, w - padL - padR);
      const contentTop = padT + 18;
      const contentBottom = h - padB;
      const total = Math.max(100, contentBottom - contentTop);
      const hasOsc = this.config.osc !== 'none';
      const oscH = hasOsc ? Math.max(48, Math.min(120, total * 0.21)) : 0;
      const volH = Math.max(26, Math.min(90, total * 0.13));
      const gap = 10;
      const priceH = Math.max(80, total - volH - oscH - gap * (hasOsc ? 2 : 1));
      const priceTop = contentTop;
      const priceBottom = priceTop + priceH;
      const volTop = priceBottom + gap;
      const volBottom = volTop + volH;
      const oscTop = volBottom + gap;
      const oscBottom = oscTop + oscH;
      return { w, h, padL, padR, innerW, innerRight: padL + innerW, priceTop, priceBottom, volTop, volBottom, oscTop, oscBottom, hasOsc };
    }

    /**
     * Tính chỉ báo một lần cho mỗi phiên bản dữ liệu. Trước đây MA/Bollinger/RSI
     * được tính lại mỗi lần rê chuột, khiến chart 140 nến vẫn tốn CPU vô ích.
     */
    _indicatorCache() {
      const closes = this.data.map(c => c.c);
      const last = closes.length ? closes[closes.length - 1] : 0;
      const key = closes.length + ':' + last + ':' + (this.data.length ? this.data[0].t : 0) + ':' +
        this.config.ma + ':' + this.config.ema + ':' + this.config.boll + ':' + this.config.osc;
      if (this._ind && this._indKey === key) return this._ind;
      const out = { closes };
      if (this.config.ma) {
        out.ma20 = sma(closes, 20);
        out.ma50 = sma(closes, 50);
      }
      if (this.config.ema) out.ema21 = ema(closes, 21);
      if (this.config.boll) out.boll = bollinger(closes, 20, 2);
      if (this.config.osc === 'rsi') out.rsi = rsi(closes, 14);
      if (this.config.osc === 'macd') out.macd = macd(closes, 12, 26, 9);
      this._ind = out;
      this._indKey = key;
      return out;
    }

    _view() {
      const len = this.data.length;
      this.visible = Math.max(24, Math.min(this.visible, len));
      this.offset = Math.max(0, Math.min(this.offset, len - this.visible));
      const start = Math.floor(this.offset);
      const end = Math.min(len, start + Math.floor(this.visible));
      const slice = this.data.slice(start, end);
      let min = Infinity, max = -Infinity;
      for (const c of slice) {
        if (c.l < min) min = c.l;
        if (c.h > max) max = c.h;
      }
      if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
      const ind = this._indicatorCache();
      const overlays = [];
      if (ind.ma20) overlays.push(ind.ma20);
      if (ind.ma50) overlays.push(ind.ma50);
      if (ind.ema21) overlays.push(ind.ema21);
      if (ind.boll) overlays.push(ind.boll.upper, ind.boll.lower);
      for (const arr of overlays) {
        for (let i = start; i < end; i++) {
          if (!isFinite(arr[i])) continue;
          if (arr[i] < min) min = arr[i];
          if (arr[i] > max) max = arr[i];
        }
      }
      const pad = (max - min) * 0.08 || max * 0.01 || 1;
      return { start, end, min: min - pad, max: max + pad, bars: Math.max(1, end - start) };
    }

    _x(i, view, lay) {
      const barW = lay.innerW / view.bars;
      return lay.padL + ((i - view.start) + 0.5) * barW;
    }

    _y(p, view, lay) {
      return lay.priceTop + (view.max - p) / (view.max - view.min) * (lay.priceBottom - lay.priceTop);
    }

    _priceAtY(y, view, lay) {
      return view.max - (y - lay.priceTop) / (lay.priceBottom - lay.priceTop) * (view.max - view.min);
    }

    _indexAtX(x, view, lay) {
      const barW = lay.innerW / view.bars;
      return Math.round(view.start + (x - lay.padL) / barW - 0.5);
    }

    _indexForTime(t) {
      const d = this.data;
      if (!d.length) return 0;
      if (t <= d[0].t) return 0;
      if (t >= d[d.length - 1].t) {
        const step = (window.AURELIS_DATA.TF_MS[this.tf] || 86400000) / 1000;
        return d.length - 1 + (t - d[d.length - 1].t) / step;
      }
      let lo = 0, hi = d.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (d[mid].t < t) lo = mid + 1; else hi = mid;
      }
      return lo;
    }

    _xForTime(t, view, lay) {
      return this._x(this._indexForTime(t), view, lay);
    }

    _snap(price, idx) {
      if (!this.magnet) return price;
      const c = this.data[Math.max(0, Math.min(this.data.length - 1, idx))];
      if (!c) return price;
      const fields = [c.o, c.h, c.l, c.c];
      let best = price, bd = Math.abs(price) * 0.02;
      for (const f of fields) {
        const d = Math.abs(f - price);
        if (d < bd) { bd = d; best = f; }
      }
      return best;
    }

    /* ------------------------------ EVENTS ------------------------------ */
    _pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    _hoverInfo(idx, candle, price) {
      if (!candle) return null;
      return {
        index: idx, candle, price,
        changePct: candle.o ? ((candle.c - candle.o) / candle.o) * 100 : 0,
        time: candle.t
      };
    }

    _onMove(e) {
      if (!this.data.length) return;
      const { x, y } = this._pos(e);
      const lay = this._layout();
      const view = this._view();
      this._lay = lay; this._viewCache = view;

      if (this.drag) {
        const barW = lay.innerW / view.bars;
        const delta = (this.drag.x - x) / barW;
        this.offset = Math.max(0, Math.min(this.data.length - this.visible, this.drag.offset + delta));
        this.offset = Math.round(this.offset);
        this.draw();
        return;
      }

      const inside = x >= lay.padL && x <= lay.innerRight && y >= lay.priceTop && y <= lay.volBottom + (lay.hasOsc ? 0 : 0);
      let idx = this._indexAtX(x, view, lay);
      idx = Math.max(0, Math.min(this.data.length - 1, idx));
      const c = this.data[idx];
      let price = this._priceAtY(Math.max(lay.priceTop, Math.min(lay.priceBottom, y)), view, lay);
      price = this._snap(price, idx);
      const prevHover = this.hover;
      const unchanged = prevHover && prevHover.idx === idx && prevHover.inside === (inside && y <= lay.priceBottom) &&
        Math.abs(prevHover.x - x) < 0.6 && Math.abs(prevHover.y - y) < 0.6;
      this.hover = { x, y, idx, price, inside: inside && y <= lay.priceBottom };
      this.callbacks.onHover && this.callbacks.onHover(inside ? this._hoverInfo(idx, c, price) : null);

      if (this.brush) {
        const pt = { t: c.t, p: this._snap(price, idx) };
        const lastPt = this.brush[this.brush.length - 1];
        if (!lastPt || lastPt.t !== pt.t) this.brush.push(pt);
      }

      if (!unchanged) this.draw();
    }

    _onDown(e) {
      if (!this.data.length || e.button === 2) return;
      const { x, y } = this._pos(e);
      const lay = this._layout();
      const view = this._view();
      const idx = Math.max(0, Math.min(this.data.length - 1, this._indexAtX(x, view, lay)));
      const c = this.data[idx];
      if (!c) return;

      if (this.tool === 'cursor' || this.tool === 'pan') {
        this.drag = { x, offset: this.offset };
        this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
        return;
      }

      const p = this._snap(this._priceAtY(Math.max(lay.priceTop, Math.min(lay.priceBottom, y)), view, lay), idx);
      const pt = { t: c.t, p };

      if (this.tool === 'eraser') {
        this._eraseAt(x, y, lay, view);
        return;
      }
      if (this.tool === 'brush') {
        this.brush = [pt];
        this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (this.tool === 'text') {
        this._openTextInput(x, y, pt);
        return;
      }
      if (this.tool === 'hline') {
        this._addDrawing({ tool: 'hline', pts: [{ t: c.t, p }], color: this.color });
        return;
      }
      if (['trend', 'ray', 'rect', 'fib', 'measure'].includes(this.tool)) {
        if (!this.pending) {
          this.pending = { tool: this.tool, pts: [pt] };
        } else {
          this.pending.pts[1] = pt;
          this._addDrawing(this.pending);
          this.pending = null;
        }
        this.draw();
      }
    }

    _onUp(e) {
      if (this.brush && this.brush.length > 1) {
        this._addDrawing({ tool: 'brush', pts: this.brush.slice(), color: this.color });
      }
      this.brush = null;
      this.drag = null;
      this.draw();
    }

    _onWheel(e) {
      if (!this.data.length) return;
      e.preventDefault();
      const { x } = this._pos(e);
      const lay = this._layout();
      const view = this._view();
      const frac = Math.max(0, Math.min(1, (x - lay.padL) / lay.innerW));
      const anchorIndex = this.offset + frac * this.visible;
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const newVisible = Math.max(26, Math.min(this.data.length, Math.round(this.visible * factor)));
      let newOffset = anchorIndex - frac * newVisible;
      newOffset = Math.max(0, Math.min(this.data.length - newVisible, newOffset));
      this.visible = newVisible;
      this.offset = Math.round(newOffset);
      this.draw();
    }

    _eraseAt(x, y, lay, view) {
      let bestIdx = -1, bestD = 14;
      for (let i = this.drawings.length - 1; i >= 0; i--) {
        const d = this.drawings[i];
        const pts = d.pts.map(pt => ({ x: this._xForTime(pt.t, view, lay), y: this._y(pt.p, view, lay) }));
        let dist = Infinity;
        if (d.tool === 'hline') dist = Math.abs(y - pts[0].y);
        else if (d.tool === 'rect' || d.tool === 'fib') {
          const x1 = Math.min(pts[0].x, pts[1].x), x2 = Math.max(pts[0].x, pts[1].x);
          const y1 = Math.min(pts[0].y, pts[1].y), y2 = Math.max(pts[0].y, pts[1].y);
          dist = Math.min(Math.abs(x - x1), Math.abs(x - x2), Math.abs(y - y1), Math.abs(y - y2));
          if (x >= x1 && x <= x2 && y >= y1 && y <= y2) dist = Math.min(dist, 10);
        } else if (d.tool === 'text') dist = Math.hypot(x - pts[0].x, y - pts[0].y);
        else {
          for (let j = 0; j < pts.length - 1; j++) {
            dist = Math.min(dist, this._distToSegment(x, y, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y));
          }
          if (pts.length === 1) dist = Math.hypot(x - pts[0].x, y - pts[0].y);
        }
        if (dist < bestD) { bestD = dist; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        this.drawings.splice(bestIdx, 1);
        writeDrawings(this.drawingsKey, this.drawings);
        this.callbacks.onDrawingChange && this.callbacks.onDrawingChange(this.drawings.length);
        this.draw();
      }
    }

    _distToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    _openTextInput(x, y, pt) {
      if (this.textInput) this.textInput.remove();
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const input = document.createElement('input');
      input.className = 'chart-text-input';
      input.maxLength = 42;
      input.placeholder = 'Nhập ghi chú…';
      input.style.left = Math.min(Math.max(8, x), this.w - 190) + 'px';
      input.style.top = Math.max(8, y - 14) + 'px';
      parent.appendChild(input);
      this.textInput = input;
      setTimeout(() => input.focus(), 10);
      let done = false;
      const finish = save => {
        if (done) return;
        done = true;
        const text = input.value.trim();
        input.remove();
        this.textInput = null;
        if (save && text) this._addDrawing({ tool: 'text', pts: [pt], color: this.color, text });
        this.draw();
      };
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
    }

    _addDrawing(d) {
      const item = Object.assign({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 7) }, d);
      this.drawings.push(item);
      writeDrawings(this.drawingsKey, this.drawings);
      this.callbacks.onDrawingAdded && this.callbacks.onDrawingAdded(item, this.drawings.length);
      this.callbacks.onDrawingChange && this.callbacks.onDrawingChange(this.drawings.length);
      this.draw();
    }

    /* ------------------------------ RENDER ------------------------------ */
    /**
     * Gộp nhiều yêu cầu vẽ trong cùng một frame. Pointermove, ResizeObserver và
     * tick giá có thể gọi draw() liên tục; canvas chỉ thật sự vẽ một lần/frame.
     */
    draw() {
      if (this.destroyed || this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        if (this._rafFallback) { clearTimeout(this._rafFallback); this._rafFallback = 0; }
        this._render();
      });
      // Một số trình duyệt nhúng/tiết kiệm pin có thể treo rAF. Hẹn giờ dự phòng
      // bảo đảm biểu đồ vẫn vẽ sau reload thay vì đứng ở lớp "đang tải".
      if (this._rafFallback) clearTimeout(this._rafFallback);
      this._rafFallback = setTimeout(() => {
        this._rafFallback = 0;
        if (this.destroyed || !this._raf) return;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
        this._render();
      }, 220);
    }

    _render() {
      if (this.destroyed || document.hidden) return;
      const ctx = this.ctx;
      if (!ctx || !this.w) return;
      const lay = this._layout();
      this._lay = lay;
      const view = this._view();
      this._viewCache = view;
      const th = this.theme;
      ctx.clearRect(0, 0, this.w, this.h);

      if (!this.data.length) {
        ctx.fillStyle = th.muted;
        ctx.font = '12px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu nến', this.w / 2, this.h / 2);
        return;
      }

      this._drawGrid(ctx, lay, view);
      this._drawVolume(ctx, lay, view);
      if (this.config.type === 'line') this._drawLineChart(ctx, lay, view); else this._drawCandles(ctx, lay, view);
      this._drawMA(ctx, lay, view);
      if (this.config.boll) this._drawBoll(ctx, lay, view);
      if (this.autoVision) this._drawVision(ctx, lay, view);
      this._drawCurrentPrice(ctx, lay, view);
      this._drawDrawings(ctx, lay, view);
      this._drawCandleInfo(ctx, lay, view);
      if (this.config.osc === 'rsi') this._drawRSI(ctx, lay, view);
      else if (this.config.osc === 'macd') this._drawMACD(ctx, lay, view);
      this._drawCrosshair(ctx, lay, view);
      this._drawXAxis(ctx, lay, view);
    }

    _drawGrid(ctx, lay, view) {
      const th = this.theme;
      ctx.save();
      ctx.strokeStyle = th.grid;
      ctx.lineWidth = 1;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = th.muted;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) {
        const y = lay.priceTop + (lay.priceBottom - lay.priceTop) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(lay.padL, Math.round(y) + 0.5);
        ctx.lineTo(lay.innerRight, Math.round(y) + 0.5);
        ctx.stroke();
        const price = view.max - (view.max - view.min) * (i / 4);
        ctx.fillText(this.fmt(price), lay.innerRight + 8, y);
      }
      ctx.strokeStyle = th.grid;
      for (let i = 1; i <= 4; i++) {
        const x = lay.padL + lay.innerW * (i / 5);
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, lay.priceTop);
        ctx.lineTo(Math.round(x) + 0.5, lay.volBottom + (lay.hasOsc ? (lay.oscBottom - lay.volBottom) : 0));
        ctx.stroke();
      }
      // volume label
      ctx.fillStyle = th.muted;
      ctx.font = '9px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VOL', lay.padL + 2, lay.volTop - 2);
      ctx.restore();
    }

    _drawCandles(ctx, lay, view) {
      const th = this.theme;
      const barW = lay.innerW / view.bars;
      const bodyW = Math.max(1, Math.min(14, barW * 0.68));
      const radius = bodyW >= 4.5 ? Math.min(2.2, bodyW / 3) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop - 2, lay.innerW, lay.priceBottom - lay.priceTop + 4);
      ctx.clip();

      // Bóng nến vẽ theo từng nhóm màu, mỗi nhóm chỉ stroke một lần.
      const drawWicks = (up) => {
        ctx.beginPath();
        let any = false;
        for (let i = view.start; i < view.end; i++) {
          const c = this.data[i];
          if (!c || (c.c >= c.o) !== up) continue;
          const x = Math.round(this._x(i, view, lay)) + 0.5;
          ctx.moveTo(x, this._y(c.h, view, lay));
          ctx.lineTo(x, this._y(c.l, view, lay));
          any = true;
        }
        if (!any) return;
        ctx.strokeStyle = up ? th.up : th.down;
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = Math.max(1, Math.min(1.4, barW * 0.08));
        ctx.lineCap = 'round';
        ctx.stroke();
      };
      drawWicks(true);
      drawWicks(false);

      for (let i = view.start; i < view.end; i++) {
        const c = this.data[i];
        if (!c) continue;
        const x = this._x(i, view, lay);
        const up = c.c >= c.o;
        const bodyTop = this._y(Math.max(c.o, c.c), view, lay);
        const bodyBottom = this._y(Math.min(c.o, c.c), view, lay);
        const bh = Math.max(1.2, bodyBottom - bodyTop);
        const bx = x - bodyW / 2;
        ctx.fillStyle = up ? th.up : th.down;
        ctx.globalAlpha = up ? 0.94 : 0.92;
        if (bodyW >= 4.5 && bh >= 2.5) {
          const r = Math.min(radius, bh / 2);
          ctx.beginPath();
          ctx.moveTo(bx + r, bodyTop);
          ctx.lineTo(bx + bodyW - r, bodyTop);
          ctx.quadraticCurveTo(bx + bodyW, bodyTop, bx + bodyW, bodyTop + r);
          ctx.lineTo(bx + bodyW, bodyTop + bh - r);
          ctx.quadraticCurveTo(bx + bodyW, bodyTop + bh, bx + bodyW - r, bodyTop + bh);
          ctx.lineTo(bx + r, bodyTop + bh);
          ctx.quadraticCurveTo(bx, bodyTop + bh, bx, bodyTop + bh - r);
          ctx.lineTo(bx, bodyTop + r);
          ctx.quadraticCurveTo(bx, bodyTop, bx + r, bodyTop);
          ctx.closePath();
          ctx.fill();
          if (bodyW >= 7 && bh >= 5) {
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = up ? '#d8fff4' : '#ffe0e5';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        } else {
          ctx.fillRect(bx, bodyTop, bodyW, bh);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    _drawLineChart(ctx, lay, view) {
      const th = this.theme;
      const pts = [];
      for (let i = view.start; i < view.end; i++) {
        const c = this.data[i];
        if (!c) continue;
        pts.push([this._x(i, view, lay), this._y(c.c, view, lay)]);
      }
      if (pts.length < 2) return;
      const color = this.data[view.end - 1].c >= this.data[view.start].c ? th.up : th.down;
      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2;
          const my = (pts[i][1] + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last[0], last[1]);
      };
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop - 2, lay.innerW, lay.priceBottom - lay.priceTop + 4);
      ctx.clip();
      trace();
      ctx.lineTo(pts[pts.length - 1][0], lay.priceBottom);
      ctx.lineTo(pts[0][0], lay.priceBottom);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, lay.priceTop, 0, lay.priceBottom);
      grad.addColorStop(0, color + '3d');
      grad.addColorStop(0.55, color + '14');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fill();
      trace();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color + '66';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const lp = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(lp[0], lp[1], 5.5, 0, Math.PI * 2);
      ctx.fillStyle = color + '1f';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lp[0], lp[1], 2.6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    _drawVolume(ctx, lay, view) {
      const th = this.theme;
      const heights = lay.volBottom - lay.volTop;
      let maxV = 0;
      for (let i = view.start; i < view.end; i++) if (this.data[i]) maxV = Math.max(maxV, this.data[i].v || 0);
      if (!maxV) maxV = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.volTop, lay.innerW, heights);
      ctx.clip();
      const barW = lay.innerW / view.bars;
      const bw = Math.max(1, Math.min(12, barW * 0.62));
      for (let i = view.start; i < view.end; i++) {
        const c = this.data[i];
        if (!c) continue;
        const x = this._x(i, view, lay);
        const h = Math.max(1, ((c.v || 0) / maxV) * (heights - 4));
        const up = c.c >= c.o;
        const y = lay.volBottom - h;
        ctx.fillStyle = up ? th.up : th.down;
        ctx.globalAlpha = 0.27;
        if (bw >= 3.5 && h >= 4) {
          const r = Math.min(1.6, bw / 3);
          ctx.beginPath();
          ctx.moveTo(x - bw / 2, lay.volBottom);
          ctx.lineTo(x - bw / 2, y + r);
          ctx.quadraticCurveTo(x - bw / 2, y, x - bw / 2 + r, y);
          ctx.lineTo(x + bw / 2 - r, y);
          ctx.quadraticCurveTo(x + bw / 2, y, x + bw / 2, y + r);
          ctx.lineTo(x + bw / 2, lay.volBottom);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(x - bw / 2, y, bw, h);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.strokeStyle = th.grid;
      ctx.beginPath();
      ctx.moveTo(lay.padL, lay.volBottom + 0.5);
      ctx.lineTo(lay.innerRight, lay.volBottom + 0.5);
      ctx.stroke();
    }

    _drawMA(ctx, lay, view) {
      if (!this.config.ma && !this.config.ema) return;
      const th = this.theme;
      const ind = this._indicatorCache();
      const items = [];
      if (this.config.ma) {
        if (ind.ma20) items.push({ values: ind.ma20, color: th.gold, label: 'MA20' });
        if (ind.ma50) items.push({ values: ind.ma50, color: th.cyan, label: 'MA50' });
      }
      if (this.config.ema && ind.ema21) {
        items.push({ values: ind.ema21, color: th.purple, label: 'EMA21' });
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop, lay.innerW, lay.priceBottom - lay.priceTop);
      ctx.clip();
      ctx.lineWidth = 1.35;
      for (const item of items) {
        ctx.beginPath();
        let started = false;
        for (let i = view.start; i < view.end; i++) {
          const v = item.values[i];
          if (!isFinite(v)) continue;
          const x = this._x(i, view, lay), y = this._y(v, view, lay);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = item.color;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // legend
      let lx = lay.padL + 4;
      const ly = lay.priceTop + 9;
      ctx.font = '9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const item of items) {
        const last = item.values[view.end - 1];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lx + 3, ly, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = th.muted;
        ctx.fillText(item.label + (isFinite(last) ? ' ' + this.fmt(last) : ''), lx + 9, ly);
        lx += ctx.measureText(item.label + (isFinite(last) ? ' ' + this.fmt(last) : '')).width + 22;
      }
      if (this.autoVision) {
        ctx.fillStyle = th.gold;
        ctx.globalAlpha = 0.8;
        ctx.font = '9px "Be Vietnam Pro", sans-serif';
        ctx.fillText('✦ AURA VISION', lay.innerRight - 88, ly);
        ctx.globalAlpha = 1;
      }
    }

    _drawBoll(ctx, lay, view) {
      const th = this.theme;
      const b = this._indicatorCache().boll;
      if (!b) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop, lay.innerW, lay.priceBottom - lay.priceTop);
      ctx.clip();
      ctx.beginPath();
      let started = false;
      for (let i = view.start; i < view.end; i++) {
        if (!isFinite(b.upper[i])) continue;
        const x = this._x(i, view, lay), y = this._y(b.upper[i], view, lay);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      for (let i = view.end - 1; i >= view.start; i--) {
        if (!isFinite(b.lower[i])) continue;
        ctx.lineTo(this._x(i, view, lay), this._y(b.lower[i], view, lay));
      }
      ctx.closePath();
      ctx.fillStyle = th.cyan + '0d';
      ctx.fill();
      ctx.strokeStyle = th.cyan + '55';
      ctx.lineWidth = 1;
      for (const arr of [b.upper, b.lower, b.mid]) {
        ctx.beginPath();
        let st = false;
        for (let i = view.start; i < view.end; i++) {
          if (!isFinite(arr[i])) continue;
          const x = this._x(i, view, lay), y = this._y(arr[i], view, lay);
          if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawVision(ctx, lay, view) {
      const th = this.theme;
      const startIdx = Math.max(0, this.data.length - 160);
      const subset = this.data.slice(startIdx);
      if (subset.length < 20) return;
      const highs = [], lows = [];
      for (let i = 3; i < subset.length - 3; i++) {
        const c = subset[i];
        let isHigh = true, isLow = true;
        for (let j = i - 3; j <= i + 3; j++) {
          if (j === i) continue;
          if (subset[j].h >= c.h) isHigh = false;
          if (subset[j].l <= c.l) isLow = false;
        }
        if (isHigh) highs.push({ i: startIdx + i, p: c.h });
        if (isLow) lows.push({ i: startIdx + i, p: c.l });
      }
      const cluster = (arr) => {
        const groups = [];
        for (const item of arr.slice(-12)) {
          let g = groups.find(x => Math.abs(x.p - item.p) / item.p < 0.006);
          if (!g) groups.push({ p: item.p, count: 1 });
          else { g.p = (g.p * g.count + item.p) / (g.count + 1); g.count++; }
        }
        return groups.sort((a, b) => b.count - a.count).slice(0, 3);
      };
      const resistances = cluster(highs);
      const supports = cluster(lows);
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop, lay.innerW, lay.priceBottom - lay.priceTop);
      ctx.clip();

      // regression channel
      const n = Math.min(90, subset.length);
      const closes = subset.slice(-n).map(c => c.c);
      const reg = linearRegression(closes);
      if (isFinite(reg.slope)) {
        const base = startIdx + subset.length - n;
        const x1 = this._x(base, view, lay), y1 = this._y(reg.intercept + reg.slope * 0 + reg.std * 1.6, view, lay);
        const x2 = this._x(base + n - 1, view, lay), y2 = this._y(reg.intercept + reg.slope * (n - 1) + reg.std * 1.6, view, lay);
        const y3 = this._y(reg.intercept + reg.slope * (n - 1) - reg.std * 1.6, view, lay);
        const y4 = this._y(reg.intercept - reg.std * 1.6, view, lay);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y3); ctx.lineTo(x1, y4); ctx.closePath();
        ctx.fillStyle = th.cyan + '0a';
        ctx.fill();
        ctx.strokeStyle = th.cyan + '55';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y4); ctx.lineTo(x2, y3); ctx.stroke();
        const midY1 = this._y(reg.intercept, view, lay), midY2 = this._y(reg.intercept + reg.slope * (n - 1), view, lay);
        ctx.strokeStyle = th.cyan + '99';
        ctx.beginPath(); ctx.moveTo(x1, midY1); ctx.lineTo(x2, midY2); ctx.stroke();
        ctx.setLineDash([]);
      }

      const drawLevel = (level, label, color) => {
        if (!isFinite(level)) return;
        const y = this._y(level, view, lay);
        if (y < lay.priceTop || y > lay.priceBottom) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(lay.padL, y);
        ctx.lineTo(lay.innerRight, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = color;
        ctx.fillText(label + ' ' + this.fmt(level), lay.innerRight - 4, y - 2);
      };
      resistances.forEach((g, i) => drawLevel(g.p, 'R' + (i + 1), th.down + 'cc'));
      supports.forEach((g, i) => drawLevel(g.p, 'S' + (i + 1), th.up + 'cc'));
      ctx.restore();
    }

    _drawCurrentPrice(ctx, lay, view) {
      const last = this.data[this.data.length - 1];
      if (!last) return;
      const th = this.theme;
      const up = last.c >= last.o;
      const color = up ? th.up : th.down;
      const y = this._y(last.c, view, lay);
      if (y < lay.priceTop || y > lay.priceBottom) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.65;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lay.padL, y);
      ctx.lineTo(lay.innerRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const text = this.fmt(last.c);
      ctx.font = '10px "JetBrains Mono", monospace';
      const tw = ctx.measureText(text).width;
      const bw = Math.max(tw + 12, 66);
      const bx = lay.innerRight + 4;
      ctx.fillStyle = color;
      this._roundRect(ctx, bx, y - 9, bw, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#06100c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 6, y + 0.5);
      ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    _drawCandleInfo(ctx, lay, view) {
      // Thông tin O/H/L/C của nến cuối, hiển thị nhẹ ở góc trái vùng giá
      const c = this.data[this.data.length - 1];
      if (!c) return;
      const th = this.theme;
      const up = c.c >= c.o;
      ctx.save();
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const parts = ['O ' + this.fmt(c.o), 'H ' + this.fmt(c.h), 'L ' + this.fmt(c.l), 'C ' + this.fmt(c.c)];
      let x = lay.padL + 4;
      const y = lay.priceTop + 20;
      for (const p of parts) {
        ctx.fillStyle = th.muted;
        ctx.fillText(p, x, y);
        x += ctx.measureText(p).width + 9;
      }
      const pct = c.o ? ((c.c - c.o) / c.o) * 100 : 0;
      ctx.fillStyle = up ? th.up : th.down;
      ctx.fillText((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', x, y);
      ctx.restore();
    }

    _drawRSI(ctx, lay, view) {
      const th = this.theme;
      const vals = this._indicatorCache().rsi;
      if (!vals) return;
      const top = lay.oscTop, bottom = lay.oscBottom;
      if (!top || bottom <= top) return;
      const h = bottom - top;
      const yFor = v => bottom - (v / 100) * h;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, top, lay.innerW, h);
      ctx.clip();
      // zones
      ctx.fillStyle = th.down + '0b';
      ctx.fillRect(lay.padL, top, lay.innerW, yFor(70) - top);
      ctx.fillStyle = th.up + '0b';
      ctx.fillRect(lay.padL, yFor(30), lay.innerW, bottom - yFor(30));
      ctx.strokeStyle = th.grid;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(lay.padL, yFor(70)); ctx.lineTo(lay.innerRight, yFor(70)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lay.padL, yFor(30)); ctx.lineTo(lay.innerRight, yFor(30)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      let st = false;
      for (let i = view.start; i < view.end; i++) {
        if (!isFinite(vals[i])) continue;
        const x = this._x(i, view, lay), y = yFor(vals[i]);
        if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = th.gold;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // fill under
      const lastX = this._x(view.end - 1, view, lay), firstX = this._x(view.start, view, lay);
      ctx.lineTo(lastX, bottom); ctx.lineTo(firstX, bottom); ctx.closePath();
      ctx.fillStyle = th.gold + '09';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = th.muted;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('RSI 14', lay.padL + 2, top + 7);
      const last = vals[view.end - 1];
      if (isFinite(last)) {
        ctx.fillStyle = last > 70 ? th.down : last < 30 ? th.up : th.gold;
        ctx.fillText(last.toFixed(1), lay.padL + 42, top + 7);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = th.muted;
      ctx.fillText('70', lay.innerRight + 8, yFor(70) + 3);
      ctx.fillText('30', lay.innerRight + 8, yFor(30) + 3);
    }

    _drawMACD(ctx, lay, view) {
      const th = this.theme;
      const m = this._indicatorCache().macd;
      if (!m) return;
      const top = lay.oscTop, bottom = lay.oscBottom;
      if (!top || bottom <= top) return;
      const h = bottom - top;
      let maxAbs = 0;
      for (let i = view.start; i < view.end; i++) {
        if (isFinite(m.line[i])) maxAbs = Math.max(maxAbs, Math.abs(m.line[i]));
        if (isFinite(m.sig[i])) maxAbs = Math.max(maxAbs, Math.abs(m.sig[i]));
        if (isFinite(m.hist[i])) maxAbs = Math.max(maxAbs, Math.abs(m.hist[i]));
      }
      maxAbs = maxAbs || 1;
      const yFor = v => top + h / 2 - (v / maxAbs) * (h / 2 - 6);
      const barW = Math.max(1, Math.min(8, (lay.innerW / view.bars) * 0.55));
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, top, lay.innerW, h);
      ctx.clip();
      const zero = yFor(0);
      ctx.strokeStyle = th.grid;
      ctx.beginPath(); ctx.moveTo(lay.padL, zero); ctx.lineTo(lay.innerRight, zero); ctx.stroke();
      for (let i = view.start; i < view.end; i++) {
        if (!isFinite(m.hist[i])) continue;
        const x = this._x(i, view, lay);
        ctx.fillStyle = m.hist[i] >= 0 ? th.up : th.down;
        ctx.globalAlpha = 0.42;
        const y = yFor(m.hist[i]);
        ctx.fillRect(x - barW / 2, Math.min(y, zero), barW, Math.max(1, Math.abs(zero - y)));
      }
      ctx.globalAlpha = 1;
      for (const [arr, color] of [[m.line, th.cyan], [m.sig, th.gold]]) {
        ctx.beginPath();
        let st = false;
        for (let i = view.start; i < view.end; i++) {
          if (!isFinite(arr[i])) continue;
          const x = this._x(i, view, lay), y = yFor(arr[i]);
          if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = th.muted;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MACD 12 26 9', lay.padL + 2, top + 7);
    }

    _drawDrawings(ctx, lay, view) {
      if (!this.drawings.length && !this.pending) return;
      const th = this.theme;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.padL, lay.priceTop, lay.innerW, lay.priceBottom - lay.priceTop);
      ctx.clip();
      const all = this.pending ? this.drawings.concat([this.pending]) : this.drawings;
      for (const d of all) {
        if (!d.pts || !d.pts.length) continue;
        const color = d.color || th.gold;
        const pts = d.pts.map(pt => ({
          x: this._xForTime(pt.t, view, lay),
          y: this._y(pt.p, view, lay)
        }));
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([]);
        if (d.tool === 'hline') {
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(lay.padL, pts[0].y);
          ctx.lineTo(lay.innerRight, pts[0].y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          this._tag(ctx, this.fmt(d.pts[0].p), lay.innerRight - 4, pts[0].y - 10, color, 'right');
        } else if (d.tool === 'trend' && pts.length >= 2) {
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
          this._point(ctx, pts[0], color);
          this._point(ctx, pts[1], color);
        } else if (d.tool === 'ray' && pts.length >= 2) {
          const dx = pts[1].x - pts[0].x || 0.01;
          const dy = pts[1].y - pts[0].y;
          const ex = lay.innerRight + 10;
          const ey = pts[0].y + (ex - pts[0].x) * (dy / dx);
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(ex, ey); ctx.stroke();
          this._point(ctx, pts[0], color);
        } else if (d.tool === 'rect' && pts.length >= 2) {
          const x = Math.min(pts[0].x, pts[1].x), w = Math.abs(pts[1].x - pts[0].x);
          const y = Math.min(pts[0].y, pts[1].y), h = Math.abs(pts[1].y - pts[0].y);
          ctx.globalAlpha = 0.12;
          ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = 0.9;
          ctx.strokeRect(x, y, w, h);
          ctx.globalAlpha = 1;
        } else if (d.tool === 'fib' && pts.length >= 2) {
          this._drawFib(ctx, d, pts, color, lay);
        } else if (d.tool === 'brush' && pts.length > 1) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        } else if (d.tool === 'measure' && pts.length >= 2) {
          ctx.setLineDash([5, 3]);
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
          ctx.setLineDash([]);
          const a = d.pts[0].p, b = d.pts[1].p;
          const pct = a ? ((b - a) / a) * 100 : 0;
          const label = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
          const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
          this._tag(ctx, label, mx, my - 12, pct >= 0 ? this.theme.up : this.theme.down, 'center');
          this._point(ctx, pts[0], color);
          this._point(ctx, pts[1], color);
        } else if (d.tool === 'text' && pts.length >= 1 && d.text) {
          ctx.font = '11px "Be Vietnam Pro", sans-serif';
          const tw = ctx.measureText(d.text).width;
          ctx.fillStyle = 'rgba(6,14,12,.82)';
          this._roundRect(ctx, pts[0].x - 2, pts[0].y - 12, tw + 12, 20, 5);
          ctx.fill();
          ctx.strokeStyle = color + '66';
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(d.text, pts[0].x + 4, pts[0].y - 1);
        }
      }
      ctx.restore();
    }

    _point(ctx, pt, color) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    _tag(ctx, text, x, y, color, align) {
      ctx.save();
      ctx.font = '9.5px "JetBrains Mono", monospace';
      const tw = ctx.measureText(text).width;
      let bx = x;
      if (align === 'center') bx = x - tw / 2 - 5;
      else if (align === 'right') bx = x - tw - 10;
      ctx.fillStyle = 'rgba(5,11,9,.86)';
      this._roundRect(ctx, bx, y - 8, tw + 10, 16, 4);
      ctx.fill();
      ctx.strokeStyle = color + '77';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 5, y + 0.5);
      ctx.restore();
    }

    _drawFib(ctx, d, pts, color, lay) {
      const p1 = d.pts[0].p, p2 = d.pts[1].p;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const x1 = Math.min(pts[0].x, pts[1].x);
      const x2 = Math.max(pts[0].x, pts[1].x);
      ctx.save();
      ctx.font = '9.5px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      levels.forEach((lv, i) => {
        const price = p1 + (p2 - p1) * lv;
        const y = this._y(price, this._viewCache, lay);
        ctx.globalAlpha = i % 2 ? 0.06 : 0.12;
        ctx.fillStyle = color;
        ctx.fillRect(x1, y - 3, Math.max(40, x2 - x1), 6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color + '99';
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(Math.max(x2, x1 + 60), y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(lv.toFixed(3) + '  ' + this.fmt(price), x1 + 4, y - 6);
      });
      ctx.restore();
      this._point(ctx, pts[0], color);
      this._point(ctx, pts[1], color);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.strokeStyle = color + '88';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    _drawCrosshair(ctx, lay, view) {
      if (!this.hover || !this.hover.inside) {
        // Nếu có pending, vẽ đường preview tới vị trí chuột
        if (this.pending && this.hover) {
          const p0 = this.pending.pts[0];
          const x0 = this._xForTime(p0.t, view, lay), y0 = this._y(p0.p, view, lay);
          ctx.save();
          ctx.strokeStyle = this.color + '99';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(this.hover.x, this.hover.y);
          ctx.stroke();
          ctx.restore();
        }
        return;
      }
      const th = this.theme;
      const { x, y, idx } = this.hover;
      if (idx < 0 || idx >= this.data.length) return;
      const candle = this.data[idx];
      const cx = this._x(idx, view, lay);
      ctx.save();
      ctx.strokeStyle = 'rgba(220,240,235,.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, lay.priceTop);
      ctx.lineTo(cx, lay.volBottom + (lay.hasOsc ? lay.oscBottom - lay.volBottom : 0));
      ctx.stroke();
      if (y >= lay.priceTop && y <= lay.priceBottom) {
        ctx.beginPath();
        ctx.moveTo(lay.padL, y);
        ctx.lineTo(lay.innerRight, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // highlight candle
      const barW = lay.innerW / view.bars;
      if (barW > 4) {
        ctx.strokeStyle = 'rgba(255,255,255,.16)';
        ctx.strokeRect(cx - barW / 2, lay.priceTop, barW, lay.priceBottom - lay.priceTop);
      }
      // price tag
      if (y >= lay.priceTop && y <= lay.priceBottom) {
        const price = this._priceAtY(y, view, lay);
        const text = this.fmt(price);
        ctx.font = '10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(18,28,33,.96)';
        this._roundRect(ctx, lay.innerRight + 3, y - 9, Math.max(66, tw + 12), 18, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.stroke();
        ctx.fillStyle = th.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, lay.innerRight + 9, y + 0.5);
      }
      // time tag
      const label = this._fmtTime(candle.t);
      ctx.font = '9.5px "JetBrains Mono", monospace';
      const tw2 = ctx.measureText(label).width;
      const tx = Math.max(lay.padL, Math.min(cx - tw2 / 2 - 5, lay.innerRight - tw2 - 12));
      ctx.fillStyle = 'rgba(18,28,33,.96)';
      this._roundRect(ctx, tx, this.h - 20, tw2 + 10, 16, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.stroke();
      ctx.fillStyle = th.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tx + 5, this.h - 12);
      ctx.restore();
      if (this.pending) {
        const p0 = this.pending.pts[0];
        const x0 = this._xForTime(p0.t, view, lay), y0 = this._y(p0.p, view, lay);
        ctx.save();
        ctx.strokeStyle = this.color + '99';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawXAxis(ctx, lay, view) {
      const th = this.theme;
      ctx.save();
      ctx.font = '9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = th.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const count = 5;
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(view.start + (view.bars - 1) * (i / (count - 1)));
        const c = this.data[Math.min(this.data.length - 1, idx)];
        if (!c) continue;
        const x = this._x(idx, view, lay);
        let label = this._fmtTime(c.t);
        if (x < lay.padL + 24) ctx.textAlign = 'left';
        else if (x > lay.innerRight - 24) ctx.textAlign = 'right';
        else ctx.textAlign = 'center';
        ctx.fillText(label, x, this.h - 9);
      }
      ctx.restore();
    }

    _fmtTime(ts) {
      const d = new Date(ts * 1000);
      const intraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.tf);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      if (this.tf === '1W') return dd + '/' + mm + '/' + String(d.getFullYear()).slice(2);
      if (intraday) return hh + ':' + mi;
      return dd + '/' + mm;
    }
  }

  /* ----------------------------- MINI CHARTS ----------------------------- */
  const registry = [];
  function requestMiniDraw(canvas, draw) {
    if (canvas._miniRaf) return;
    canvas._miniRaf = requestAnimationFrame(() => {
      canvas._miniRaf = 0;
      if (canvas._miniFallback) { clearTimeout(canvas._miniFallback); canvas._miniFallback = 0; }
      if (canvas.isConnected) draw();
    });
    if (canvas._miniFallback) clearTimeout(canvas._miniFallback);
    canvas._miniFallback = setTimeout(() => {
      canvas._miniFallback = 0;
      if (!canvas._miniRaf) return;
      cancelAnimationFrame(canvas._miniRaf);
      canvas._miniRaf = 0;
      if (canvas.isConnected) draw();
    }, 220);
  }
  function register(canvas, draw) {
    registry.push({ canvas, draw });
    if (registry.length > 40) {
      for (let i = registry.length - 1; i >= 0; i--) if (!registry[i].canvas.isConnected) registry.splice(i, 1);
    }
    requestMiniDraw(canvas, draw);
  }
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      for (const item of registry) {
        if (item.canvas.isConnected) requestMiniDraw(item.canvas, item.draw);
      }
    }, 120);
  });

  function cssColor(name, fb) {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fb;
  }

  function nfShort(v) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return (v / 1e12).toFixed(a >= 1e13 ? 0 : 1) + 'T';
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
    return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }

  const MiniChart = {
    line(canvas, values, opts) {
      opts = opts || {};
      const draw = () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(80, Math.round(rect.width));
        const h = Math.max(60, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        let data = (values || []).filter(v => isFinite(v));
        if (!data.length) data = [0, 0];
        if (data.length === 1) data = [data[0], data[0]];
        const pad = { l: opts.padLeft != null ? opts.padLeft : 4, r: opts.padRight != null ? opts.padRight : 48, t: 12, b: opts.axis === false ? 8 : 18 };
        const up = data[data.length - 1] >= data[0];
        const color = opts.color || (up ? cssColor('--up', '#2ee6a6') : cssColor('--down', '#ff5d73'));
        const baseline = opts.baseline;
        let min = Math.min(...data), max = Math.max(...data);
        if (isFinite(baseline)) { min = Math.min(min, baseline); max = Math.max(max, baseline); }
        if (min === max) { min -= 1; max += 1; }
        const range = max - min;
        min -= range * 0.08; max += range * 0.08;
        const x = i => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
        const y = v => pad.t + (max - v) / (max - min) * (h - pad.t - pad.b);
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.lineWidth = 1;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = cssColor('--muted', '#7d8d95');
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const yy = pad.t + (h - pad.t - pad.b) * (i / 2);
          ctx.beginPath();
          ctx.moveTo(pad.l, yy);
          ctx.lineTo(w - pad.r, yy);
          ctx.stroke();
          let val = max - (max - min) * (i / 2);
          if (opts.formatAxis) ctx.fillText(opts.formatAxis(val), w - 3, yy);
        }
        if (isFinite(baseline)) {
          const by = y(baseline);
          ctx.strokeStyle = 'rgba(255,255,255,.16)';
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(pad.l, by); ctx.lineTo(w - pad.r, by); ctx.stroke();
          ctx.setLineDash([]);
        }
        // area
        ctx.beginPath();
        data.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
        ctx.lineTo(x(data.length - 1), h - pad.b);
        ctx.lineTo(x(0), h - pad.b);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
        grad.addColorStop(0, color + '42');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
        // line
        ctx.beginPath();
        data.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
        ctx.strokeStyle = color;
        ctx.lineWidth = opts.width || 1.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        // last point
        const lx = x(data.length - 1), ly = y(data[data.length - 1]);
        ctx.beginPath();
        ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color + '22';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx, ly, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (opts.labels === false) return;
        if (opts.xLabels && opts.xLabels.length === data.length) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.font = '9px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(opts.xLabels[0], pad.l, h - 5);
          ctx.textAlign = 'right';
          ctx.fillText(opts.xLabels[opts.xLabels.length - 1], w - pad.r, h - 5);
        }
      };
      register(canvas, draw);
      return draw;
    },

    bands(canvas, series, opts) {
      opts = opts || {};
      const draw = () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(120, Math.round(rect.width));
        const h = Math.max(100, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const low = (series.low || []).filter(isFinite);
        const mid = (series.mid || []).filter(isFinite);
        const high = (series.high || []).filter(isFinite);
        const n = Math.min(low.length, mid.length, high.length);
        if (n < 2) return;
        const pad = { l: 4, r: 54, t: 12, b: 20 };
        let min = Math.min(...low), max = Math.max(...high);
        if (min === max) { min -= 1; max += 1; }
        const range = max - min;
        min -= range * 0.06; max += range * 0.06;
        const x = i => pad.l + (i / (n - 1)) * (w - pad.l - pad.r);
        const y = v => pad.t + (max - v) / (max - min) * (h - pad.t - pad.b);
        const up = mid[n - 1] >= mid[0];
        const color = opts.color || cssColor(up ? '--up' : '--down', up ? '#2ee6a6' : '#ff5d73');
        // grid + axis
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.lineWidth = 1;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = cssColor('--muted', '#7d8d95');
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const yy = pad.t + (h - pad.t - pad.b) * (i / 2);
          ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
          const val = max - (max - min) * (i / 2);
          if (opts.formatAxis) ctx.fillText(opts.formatAxis(val), w - 3, yy);
        }
        // band fill
        ctx.beginPath();
        for (let i = 0; i < n; i++) i ? ctx.lineTo(x(i), y(high[i])) : ctx.moveTo(x(i), y(high[i]));
        for (let i = n - 1; i >= 0; i--) ctx.lineTo(x(i), y(low[i]));
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
        grad.addColorStop(0, color + '2e');
        grad.addColorStop(1, color + '08');
        ctx.fillStyle = grad;
        ctx.fill();
        // lines
        for (const [arr, alpha, width] of [[high, .45, 1], [low, .45, 1], [mid, 1, 1.9]]) {
          ctx.beginPath();
          for (let i = 0; i < n; i++) i ? ctx.lineTo(x(i), y(arr[i])) : ctx.moveTo(x(i), y(arr[i]));
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = width;
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (opts.labels === false) return;
        if (opts.xLabels && opts.xLabels.length === n) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.font = '9px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(opts.xLabels[0], pad.l, h - 5);
          ctx.textAlign = 'right';
          ctx.fillText(opts.xLabels[n - 1], w - pad.r, h - 5);
        }
      };
      register(canvas, draw);
      return draw;
    },

    multiLine(canvas, series, opts) {
      opts = opts || {};
      const draw = () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(120, Math.round(rect.width));
        const h = Math.max(90, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const sets = (series || []).map((s, i) => ({
          values: (s.values || []).map(v => isFinite(v) ? Number(v) : null),
          color: s.color || ['#f3c56b', '#5ac8fa', '#2ee6a6', '#b59cff', '#ff9f43'][i % 5],
          width: s.width || 1.8,
          dash: s.dash || null,
          fill: !!s.fill,
          label: s.label || '',
        })).filter(s => s.values.some(v => v != null));
        const pad = { l: opts.padLeft != null ? opts.padLeft : 4, r: opts.padRight != null ? opts.padRight : 56, t: 12, b: 22 };
        ctx.font = '9px "JetBrains Mono", monospace';
        if (!sets.length) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Không có dữ liệu', w / 2, h / 2);
          return;
        }
        const all = [];
        sets.forEach(s => s.values.forEach(v => { if (v != null) all.push(v); }));
        let min = Math.min(...all), max = Math.max(...all);
        if (isFinite(opts.baseline)) { min = Math.min(min, opts.baseline); max = Math.max(max, opts.baseline); }
        if (opts.zero !== false) { min = Math.min(min, 0); max = Math.max(max, 0); }
        if (min === max) { min -= 1; max += 1; }
        const range = max - min;
        min -= range * 0.07; max += range * 0.07;
        const count = Math.max(...sets.map(s => s.values.length));
        const x = i => pad.l + (count > 1 ? i / (count - 1) : 0.5) * (w - pad.l - pad.r);
        const y = v => pad.t + (max - v) / (max - min) * (h - pad.t - pad.b);
        // grid
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.lineWidth = 1;
        ctx.fillStyle = cssColor('--muted', '#8798a0');
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const yy = pad.t + (h - pad.t - pad.b) * (i / 2);
          ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
          const val = max - (max - min) * (i / 2);
          const text = opts.formatAxis ? opts.formatAxis(val) : (opts.percent ? nfShort(val) + '%' : nfShort(val));
          ctx.fillText(text, w - 3, yy);
        }
        if (isFinite(opts.baseline)) {
          const by = y(opts.baseline);
          ctx.strokeStyle = 'rgba(255,255,255,.17)';
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(pad.l, by); ctx.lineTo(w - pad.r, by); ctx.stroke();
          ctx.setLineDash([]);
        }
        // lines
        sets.forEach(s => {
          const pts = [];
          s.values.forEach((v, i) => { if (v != null) pts.push([x(i), y(v), i]); });
          if (pts.length < 2) return;
          if (s.fill) {
            ctx.beginPath();
            pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
            ctx.lineTo(pts[pts.length - 1][0], h - pad.b);
            ctx.lineTo(pts[0][0], h - pad.b);
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
            grad.addColorStop(0, s.color + '38');
            grad.addColorStop(1, s.color + '00');
            ctx.fillStyle = grad;
            ctx.fill();
          }
          ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          if (s.dash) ctx.setLineDash(s.dash);
          ctx.stroke();
          ctx.setLineDash([]);
          const last = pts[pts.length - 1];
          ctx.beginPath(); ctx.arc(last[0], last[1], 2.6, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.fill();
        });
        if (opts.xLabels && opts.xLabels.length) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.font = '9px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.fillText(opts.xLabels[0], pad.l, h - 5);
          ctx.textAlign = 'right';
          ctx.fillText(opts.xLabels[opts.xLabels.length - 1], w - pad.r, h - 5);
        }
      };
      register(canvas, draw);
      return draw;
    },

    bars(canvas, groups, opts) {
      opts = opts || {};
      const draw = () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(120, Math.round(rect.width));
        const h = Math.max(100, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const sets = (groups || []).map((g, i) => ({
          values: (g.values || []).map(v => isFinite(v) ? Number(v) : null),
          color: g.color || ['#f3c56b', '#5ac8fa', '#2ee6a6', '#b59cff'][i % 4],
          label: g.label || '',
        })).filter(g => g.values.some(v => v != null));
        const pad = { l: 4, r: 58, t: 12, b: 24 };
        ctx.font = '9px "JetBrains Mono", monospace';
        if (!sets.length) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Không có dữ liệu', w / 2, h / 2);
          return;
        }
        const count = Math.max(...sets.map(s => s.values.length));
        let min = 0, max = 0;
        if (opts.stacked) {
          for (let i = 0; i < count; i++) {
            let pos = 0, neg = 0;
            sets.forEach(s => { const v = s.values[i]; if (v == null) return; if (v >= 0) pos += v; else neg += v; });
            max = Math.max(max, pos); min = Math.min(min, neg);
          }
        } else {
          sets.forEach(s => s.values.forEach(v => { if (v == null) return; max = Math.max(max, v); min = Math.min(min, v); }));
        }
        if (min === max) { min -= 1; max += 1; }
        const range = max - min;
        max += range * 0.08; min -= range * 0.08;
        const plotW = w - pad.l - pad.r;
        const plotH = h - pad.t - pad.b;
        const y = v => pad.t + (max - v) / (max - min) * plotH;
        const slot = plotW / count;
        const groupW = Math.min(slot * 0.66, 54);
        const barW = opts.stacked ? groupW : Math.max(3, groupW / sets.length - 2);
        // grid
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.lineWidth = 1;
        ctx.fillStyle = cssColor('--muted', '#8798a0');
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const val = max - (max - min) * (i / 2);
          const yy = y(val);
          ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
          const text = opts.formatAxis ? opts.formatAxis(val) : nfShort(val);
          ctx.fillText(text, w - 3, yy);
        }
        // zero line
        const zeroY = y(0);
        ctx.strokeStyle = 'rgba(255,255,255,.16)';
        ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(w - pad.r, zeroY); ctx.stroke();
        // bars
        for (let i = 0; i < count; i++) {
          const cx = pad.l + slot * i + slot / 2;
          if (opts.stacked) {
            let pos = 0, neg = 0;
            sets.forEach(s => {
              const v = s.values[i];
              if (v == null) return;
              const start = v >= 0 ? pos : neg;
              const end = start + v;
              const top = y(Math.max(start, end));
              const bottom = y(Math.min(start, end));
              ctx.fillStyle = s.color;
              ctx.globalAlpha = 0.88;
              ctx.fillRect(cx - groupW / 2, top, groupW, Math.max(1, bottom - top));
              ctx.globalAlpha = 1;
              if (v >= 0) pos = end; else neg = end;
            });
          } else {
            const total = sets.length * barW + (sets.length - 1) * 2;
            sets.forEach((s, si) => {
              const v = s.values[i];
              if (v == null) return;
              const left = cx - total / 2 + si * (barW + 2);
              const top = y(Math.max(0, v));
              const bottom = y(Math.min(0, v));
              ctx.fillStyle = s.color;
              ctx.globalAlpha = 0.9;
              ctx.fillRect(left, top, barW, Math.max(1, bottom - top));
              ctx.globalAlpha = 1;
            });
          }
        }
        // x labels
        if (opts.xLabels && opts.xLabels.length) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.font = '8.5px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          const step = Math.max(1, Math.ceil(count / 6));
          for (let i = 0; i < count; i += step) {
            const label = opts.xLabels[i] || '';
            if (label) ctx.fillText(String(label), pad.l + slot * i + slot / 2, h - 6);
          }
        }
      };
      register(canvas, draw);
      return draw;
    },

    scatter(canvas, points, opts) {
      opts = opts || {};
      const draw = () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(160, Math.round(rect.width));
        const h = Math.max(140, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const data = (points || []).filter(p => isFinite(p.x) && isFinite(p.y));
        const pad = { l: 34, r: 18, t: 16, b: 30 };
        ctx.font = '9px "JetBrains Mono", monospace';
        if (data.length < 2) {
          ctx.fillStyle = cssColor('--dim', '#5e6b75');
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Cần thêm dữ liệu so sánh', w / 2, h / 2);
          return;
        }
        let minX = Math.min(...data.map(p => p.x)), maxX = Math.max(...data.map(p => p.x));
        let minY = Math.min(...data.map(p => p.y)), maxY = Math.max(...data.map(p => p.y));
        if (minX === maxX) { minX -= 1; maxX += 1; }
        if (minY === maxY) { minY -= 1; maxY += 1; }
        const rx = maxX - minX, ry = maxY - minY;
        minX -= rx * 0.1; maxX += rx * 0.1; minY -= ry * 0.12; maxY += ry * 0.12;
        const x = v => pad.l + (v - minX) / (maxX - minX) * (w - pad.l - pad.r);
        const y = v => pad.t + (maxY - v) / (maxY - minY) * (h - pad.t - pad.b);
        ctx.strokeStyle = 'rgba(255,255,255,.06)';
        ctx.lineWidth = 1;
        ctx.fillStyle = cssColor('--dim', '#5e6b75');
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 4; i++) {
          const yy = pad.t + (h - pad.t - pad.b) * i / 3;
          ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
          ctx.textAlign = 'right';
          const val = maxY - (maxY - minY) * i / 3;
          ctx.fillText(nfShort(val) + (opts.ySuffix || ''), pad.l - 5, yy);
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        for (let i = 0; i < 4; i++) {
          const xx = pad.l + (w - pad.l - pad.r) * i / 3;
          const val = minX + (maxX - minX) * i / 3;
          ctx.fillText(nfShort(val) + (opts.xSuffix || ''), xx, h - 12);
        }
        ctx.fillStyle = cssColor('--dim', '#5e6b75');
        ctx.textAlign = 'right';
        if (opts.xLabel) ctx.fillText(opts.xLabel, w - pad.r, h - 1);
        if (opts.yLabel) { ctx.textAlign = 'left'; ctx.fillText(opts.yLabel, 2, 8); }
        const maxR = Math.max(...data.map(p => p.r || 5));
        data.forEach(p => {
          const r = 5 + (p.r || 5) / maxR * 10;
          const color = p.color || cssColor('--gold', '#f3c56b');
          ctx.beginPath(); ctx.arc(x(p.x), y(p.y), r + 3, 0, Math.PI * 2);
          ctx.fillStyle = color + '22'; ctx.fill();
          ctx.beginPath(); ctx.arc(x(p.x), y(p.y), r, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.globalAlpha = 0.72; ctx.fill(); ctx.globalAlpha = 1;
          if (opts.labels !== false && p.label) {
            ctx.fillStyle = cssColor('--text-soft', '#c7d5d1');
            ctx.font = '8.5px "Be Vietnam Pro", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(String(p.label), x(p.x), y(p.y) - r - 3);
          }
        });
      };
      register(canvas, draw);
      return draw;
    },

    sparkSVG(values, opts) {
      opts = opts || {};
      let data = (values || []).filter(v => isFinite(v));
      if (data.length < 2) data = [0, 1];
      const w = 120, h = 32, pad = 2;
      let min = Math.min(...data), max = Math.max(...data);
      if (min === max) { min -= 1; max += 1; }
      const range = max - min;
      const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + (max - v) / range * (h - pad * 2);
        return [x, y];
      });
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
      const area = line + ` L${w - pad} ${h} L${pad} ${h} Z`;
      const up = data[data.length - 1] >= data[0];
      const color = opts.color || (up ? 'var(--up)' : 'var(--down)');
      return `<svg class="mini-spark-svg ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${area}" fill="${color}" opacity=".12"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    }
  };

  window.AURELIS_CHART = { Chart, MiniChart, indicators };
})();
