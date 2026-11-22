/* ============================================================
   AURELIS MARKETS — data layer
   Danh mục tài sản, shop, thành tựu, bài học, dữ liệu nến demo.
   Dữ liệu giá thật được đồng bộ bởi api.js (Yahoo Finance / Binance).
   ============================================================ */
(function () {
  'use strict';

  const GROUPS = {
    hose:   { id: 'hose',   name: 'HOSE',        long: 'Sàn TP. Hồ Chí Minh', color: '#42e3a4', flag: '🇻🇳' },
    hnx:    { id: 'hnx',    name: 'HNX',         long: 'Sàn Hà Nội',           color: '#f2c45e', flag: '🇻🇳' },
    upcom:  { id: 'upcom',  name: 'UPCOM',       long: 'Thị trường UPCoM',     color: '#c89cff', flag: '🇻🇳' },
    us:     { id: 'us',     name: 'US',          long: 'Chứng khoán Mỹ',       color: '#6cb8ff', flag: '🇺🇸' },
    crypto: { id: 'crypto', name: 'CRYPTO',      long: 'Tiền mã hoá 24/7',     color: '#f7a94b', flag: '₿' },
    forex:  { id: 'forex',  name: 'FOREX',       long: 'Thị trường ngoại hối', color: '#7ce7ff', flag: '💱' },
    commodity:{id:'commodity',name:'HÀNG HOÁ',  long: 'Vàng · Dầu · Khí',     color: '#e9b96e', flag: '🛢️' },
    etf:    { id: 'etf',    name: 'ETF',         long: 'Quỹ chỉ số & ETF',     color: '#ffd166', flag: '🧺' },
    index:  { id: 'index',  name: 'CHỈ SỐ',      long: 'Chỉ số thị trường',    color: '#a5b4fc', flag: '📊' },
    derivatives:{id:'derivatives',name:'PHÁI SINH',long:'Hợp đồng đòn bẩy',  color: '#ff9b8a', flag: '⚡' }
  };

  /* ------------------------- SAVINGS / BANKING ------------------------- */
  const SAVINGS_BENCH = {
    irx: 4.13, tnx: 5.10, fvx: 4.95, vix: 18.7,
    goldUsd: 3902.8, usdvnd: 25674, eurusd: 1.1064,
    gbpusd: 1.3234, jpy: 159.9, audusd: 0.6798,
    at: 0, live: false
  };

  const clampRate = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const vndBase = r => clampRate(4.35 + (r.irx - 4) * 0.28 + (r.tnx - 4.3) * 0.10, 3.4, 6.8);
  const usdBase = r => clampRate(r.irx * 0.72 + 0.55, 0.6, 5.6);

  const SAVINGS_PRODUCTS = [
    {
      id: 'vnd_flex', name: 'Tích lũy linh hoạt', short: 'Linh hoạt', currency: 'VND', kind: 'cash',
      termDays: 0, termLabel: 'Không kỳ hạn', min: 100000, icon: '💧', color: '#2ee6a6',
      tag: 'RÚT BẤT KỲ LÚC NÀO', benchmark: '^IRX · thanh khoản VND', liquidity: 'Tức thì', risk: 'Thấp',
      desc: 'Quỹ dự phòng sinh lời theo ngày. Rút vốn bất kỳ lúc nào, lãi cộng dồn đến thời điểm tất toán.',
      earlyNote: 'Không phạt rút trước hạn.', rate: r => vndBase(r) - 0.55
    },
    {
      id: 'vnd_1m', name: 'Tiết kiệm 7 ngày', short: '7 ngày', currency: 'VND', kind: 'cash',
      termDays: 7, termLabel: '7 ngày', min: 500000, icon: '🗓️', color: '#5ac8fa',
      tag: 'SIÊU NGẮN', benchmark: '^IRX · chênh lệch VND', liquidity: 'Tất toán sau 7 ngày', risk: 'Thấp',
      desc: 'Kênh tích lũy một tuần cho khoản tiền sắp dùng. Lãi cố định khi gửi, tự động tái tục nếu bật.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => vndBase(r) - 0.30
    },
    {
      id: 'vnd_14d', name: 'Tiết kiệm 14 ngày', short: '14 ngày', currency: 'VND', kind: 'cash',
      termDays: 14, termLabel: '14 ngày', min: 500000, icon: '📅', color: '#7ce7ff',
      tag: 'NGẮN HẠN', benchmark: '^IRX · chênh lệch VND', liquidity: 'Tất toán sau 14 ngày', risk: 'Thấp',
      desc: 'Hai tuần gọn nhẹ, lãi cao hơn tích lũy linh hoạt. Phù hợp nhịp chơi ngắn và luân chuyển vốn nhanh.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => vndBase(r) - 0.15
    },
    {
      id: 'vnd_6m', name: 'Tiết kiệm 30 ngày', short: '30 ngày', currency: 'VND', kind: 'cash',
      termDays: 30, termLabel: '30 ngày', min: 1000000, icon: '🏦', color: '#6cb8ff',
      tag: 'LINH HOẠT', benchmark: '^IRX · ^TNX · VND', liquidity: 'Tất toán sau 30 ngày', risk: 'Thấp',
      desc: 'Một tháng cho dòng tiền nhàn rỗi. Lãi suất cố định, có thể bật tái tục để bắt đầu chuỗi lãi kép.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => vndBase(r) + 0.05
    },
    {
      id: 'vnd_12m', name: 'Tiết kiệm 90 ngày', short: '90 ngày', currency: 'VND', kind: 'cash',
      termDays: 90, termLabel: '90 ngày', min: 1000000, icon: '🏛️', color: '#b59cff',
      tag: 'CÂN BẰNG', benchmark: '^IRX · ^TNX · VND', liquidity: 'Tất toán sau 90 ngày', risk: 'Thấp',
      desc: 'Một quý — đủ dài để hưởng lãi tốt hơn nhưng vẫn linh hoạt cho kế hoạch ngắn. Tái tục tự động khi đáo hạn.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => vndBase(r) + 0.28
    },
    {
      id: 'vnd_24m', name: 'Tiết kiệm 180 ngày', short: '180 ngày', currency: 'VND', kind: 'cash',
      termDays: 180, termLabel: '180 ngày', min: 1000000, icon: '💎', color: '#c89cff',
      tag: 'LÃI CAO', benchmark: '^IRX · ^TNX · VND', liquidity: 'Tất toán sau 180 ngày', risk: 'Thấp',
      desc: 'Nửa năm cho mục tiêu lớn hơn. Lãi cao nhất trong nhóm VND nhưng vẫn đủ ngắn để xoay vòng trong game.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => vndBase(r) + 0.48
    },
    {
      id: 'usd_flex', name: 'USD linh hoạt', short: 'USD linh hoạt', currency: 'USD', kind: 'cash',
      termDays: 0, termLabel: 'Không kỳ hạn', min: 100, icon: '$', color: '#2ee6a6',
      tag: 'NGOẠI TỆ', benchmark: '^IRX · USD', liquidity: 'Tức thì', risk: 'Trung bình (tỷ giá)',
      desc: 'Giữ USD sinh lãi, hưởng thêm biến động tỷ giá USD/VND. Phù hợp khi bạn có kế hoạch dùng ngoại tệ.',
      earlyNote: 'Không phạt rút trước hạn. Giá trị quy đổi theo tỷ giá hiện tại.', rate: r => usdBase(r) - 0.75
    },
    {
      id: 'usd_6m', name: 'USD 30 ngày', short: 'USD 30 ngày', currency: 'USD', kind: 'cash',
      termDays: 30, termLabel: '30 ngày', min: 100, icon: '$', color: '#5ac8fa',
      tag: 'NGOẠI TỆ', benchmark: '^IRX · USD', liquidity: 'Tất toán sau 30 ngày', risk: 'Trung bình (tỷ giá)',
      desc: 'Một tháng giữ USD tham chiếu T-bill 13 tuần. Có rủi ro tỷ giá khi quy đổi về VND.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => usdBase(r) - 0.10
    },
    {
      id: 'usd_12m', name: 'USD 90 ngày', short: 'USD 90 ngày', currency: 'USD', kind: 'cash',
      termDays: 90, termLabel: '90 ngày', min: 100, icon: '$', color: '#6cb8ff',
      tag: 'NGOẠI TỆ', benchmark: '^IRX · USD', liquidity: 'Tất toán sau 90 ngày', risk: 'Trung bình (tỷ giá)',
      desc: 'Một quý cho mục tiêu bằng USD. Lãi suất và tỷ giá đều biến động theo thị trường thật.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => usdBase(r) + 0.10
    },
    {
      id: 'eur_6m', name: 'EUR 30 ngày', short: 'EUR 30 ngày', currency: 'EUR', kind: 'cash',
      termDays: 30, termLabel: '30 ngày', min: 100, icon: '€', color: '#7ce7ff',
      tag: 'NGOẠI TỆ', benchmark: '^IRX · EUR basis', liquidity: 'Tất toán sau 30 ngày', risk: 'Trung bình (tỷ giá)',
      desc: 'Đa dạng hoá sang EUR trong một tháng. Lãi suất mô phỏng theo mặt bằng USD và chênh lệch EUR.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => clampRate(0.75 + (r.irx - 4) * 0.20, 0.05, 2.50)
    },
    {
      id: 'jpy_6m', name: 'JPY 30 ngày', short: 'JPY 30 ngày', currency: 'JPY', kind: 'cash',
      termDays: 30, termLabel: '30 ngày', min: 10000, icon: '¥', color: '#ff9f43',
      tag: 'NGOẠI TỆ', benchmark: '^IRX · JPY basis', liquidity: 'Tất toán sau 30 ngày', risk: 'Trung bình (tỷ giá)',
      desc: 'Kênh tích lũy JPY ngắn hạn với lãi suất thấp đặc trưng. Phù hợp mục tiêu du lịch hoặc thanh toán bằng yên.',
      earlyNote: 'Rút trước hạn hưởng lãi không kỳ hạn 0,5%/năm.', rate: r => clampRate(0.12 + (r.irx - 4) * 0.04, 0.01, 0.50)
    },
    {
      id: 'gold_acc', name: 'Tích lũy vàng', short: 'Vàng', currency: 'GOLD', kind: 'gold',
      termDays: 0, termLabel: 'Không kỳ hạn', min: 200000, icon: '🪙', color: '#f3c56b',
      tag: 'THEO GIÁ THẾ GIỚI', benchmark: 'GC=F · USDVND', liquidity: 'Trong ngày', risk: 'Trung bình',
      desc: 'Mua vàng theo từng gam, giá quy đổi trực tiếp từ hợp đồng tương lai vàng Mỹ và tỷ giá USD/VND.',
      earlyNote: 'Chênh lệch mua/bán mô phỏng 0,8% mỗi chiều.', rate: () => 0
    }
  ];

  /* ------------------------- CREDIT / LOANS ------------------------- */
  /* Lãi suất mô phỏng cho vay nhanh, tính theo giờ hoặc theo ngày.
     Đây là sản phẩm trong game, không phải hợp đồng tín dụng thật. */
  const LOAN_PRODUCTS = [
    {
      id: 'fast_6h', name: 'Vay nhanh 6 giờ', short: '6 giờ', icon: '⚡', color: '#f3c56b',
      tag: 'GIẢI NGÂN TỨC THÌ', termHours: 6, termLabel: '6 giờ', minAmount: 1000000, maxAmount: 50000000,
      ratePerHour: 0.0010, penaltyPerHour: 0.0015, rateLabel: '0,10%/giờ', risk: 'Rất cao',
      desc: 'Khoản vay siêu ngắn cho cơ hội cần tiền ngay. Lãi cộng dồn theo giờ, trả càng sớm càng rẻ.',
      note: 'Tương đương khoảng 2,4%/ngày. Quá hạn chịu lãi phạt 0,15%/giờ.'
    },
    {
      id: 'fast_24h', name: 'Vay nhanh 24 giờ', short: '24 giờ', icon: '🕐', color: '#5ac8fa',
      tag: 'TRONG NGÀY', termHours: 24, termLabel: '24 giờ', minAmount: 1000000, maxAmount: 100000000,
      ratePerHour: 0.0007, penaltyPerHour: 0.0011, rateLabel: '0,07%/giờ', risk: 'Cao',
      desc: 'Vay qua đêm cho nhu cầu thanh khoản ngắn. Lãi tính theo giờ và có thể tất toán bất kỳ lúc nào.',
      note: 'Tương đương khoảng 1,68%/ngày. Quá hạn chịu lãi phạt 0,11%/giờ.'
    },
    {
      id: 'daily_7d', name: 'Vay ngắn hạn 7 ngày', short: '7 ngày', icon: '📅', color: '#2ee6a6',
      tag: 'THEO NGÀY', termHours: 168, termLabel: '7 ngày', minAmount: 2000000, maxAmount: 200000000,
      ratePerHour: 0.008 / 24, penaltyPerHour: 0.012 / 24, rateLabel: '0,80%/ngày', risk: 'Trung bình cao',
      desc: 'Khoản vay một tuần cho kế hoạch mua sắm hoặc xoay vốn. Lãi tính theo ngày trên dư nợ gốc.',
      note: 'Tương đương 0,0333%/giờ. Quá hạn chịu lãi phạt 1,2%/ngày.'
    },
    {
      id: 'daily_30d', name: 'Vay tiêu dùng 30 ngày', short: '30 ngày', icon: '🗓️', color: '#b59cff',
      tag: 'KỲ HẠN THÁNG', termHours: 720, termLabel: '30 ngày', minAmount: 5000000, maxAmount: 400000000,
      ratePerHour: 0.0035 / 24, penaltyPerHour: 0.00525 / 24, rateLabel: '0,35%/ngày', risk: 'Trung bình',
      desc: 'Khoản vay tiêu dùng một tháng với hạn mức cao hơn. Phù hợp khi dòng tiền về chậm nhưng vẫn muốn chủ động trả trước.',
      note: 'Tương đương 0,0146%/giờ. Quá hạn chịu lãi phạt 0,525%/ngày.'
    }
  ];

  const ASSETS = [];

  function A(id, symbol, name, group, cfg) {
    const prev = cfg.prev != null ? cfg.prev : cfg.price;
    const price = cfg.price;
    const spread = Math.abs(price) * 0.008 || 1;
    const asset = {
      id, symbol, name, group,
      exchange: cfg.exchange || GROUPS[group].name,
      currency: cfg.currency || 'VND',
      sector: cfg.sector || '',
      price, prev,
      open: cfg.open != null ? cfg.open : prev,
      high: cfg.high != null ? cfg.high : Math.max(price, prev) + spread * 0.6,
      low: cfg.low != null ? cfg.low : Math.min(price, prev) - spread * 0.6,
      volume: cfg.volume || 0,
      avgVolume: cfg.avgVolume || cfg.volume || 0,
      cap: cfg.cap || 0,
      yahoo: cfg.yahoo || null,
      binance: cfg.binance || null,
      color: cfg.color || '#42e3a4',
      icon: cfg.icon || symbol.slice(0, 1),
      desc: cfg.desc || '',
      decimals: cfg.decimals != null ? cfg.decimals : (cfg.currency === 'VND' ? 0 : 2),
      lot: cfg.lot || 1,
      unit: cfg.unit || (group === 'crypto' ? 'coin' : group === 'forex' ? 'lot' : 'đơn vị'),
      tradable: cfg.tradable !== false,
      demoOnly: !!cfg.demoOnly,
      contractSize: cfg.contractSize || 1,
      maxLeverage: cfg.maxLeverage || 10,
      underlying: cfg.underlying || null,
      spark: null,
      changePct: 0,
      live: false,
      updatedAt: 0
    };
    asset.changePct = prev ? ((price - prev) / prev) * 100 : 0;
    ASSETS.push(asset);
    return asset;
  }

  /* ------------------------- HOSE ------------------------- */
  A('vcb', 'VCB', 'Vietcombank', 'hose', { price: 54100, prev: 53800, volume: 2420000, avgVolume: 3100000, cap: 302e12, yahoo: 'VCB.VN', color: '#1f8a70', sector: 'Ngân hàng', icon: 'V', desc: 'Ngân hàng TMCP Ngoại thương Việt Nam — vốn hoá lớn nhất sàn HOSE, thuộc rổ VN30.' });
  A('vic', 'VIC', 'Vingroup', 'hose', { price: 243900, prev: 242000, volume: 980000, avgVolume: 1400000, cap: 185e12, yahoo: 'VIC.VN', color: '#8a6d3b', sector: 'Bất động sản', icon: 'V', desc: 'Tập đoàn Vingroup — hệ sinh thái bất động sản, xe điện VinFast và bán lẻ.' });
  A('vhm', 'VHM', 'Vinhomes', 'hose', { price: 62100, prev: 62000, volume: 1350000, avgVolume: 2100000, cap: 168e12, yahoo: 'VHM.VN', color: '#b05c46', sector: 'Bất động sản', icon: 'V', desc: 'Nhà phát triển bất động sản nhà ở lớn nhất Việt Nam.' });
  A('hpg', 'HPG', 'Hòa Phát', 'hose', { price: 21300, prev: 21250, volume: 5800000, avgVolume: 7200000, cap: 137e12, yahoo: 'HPG.VN', color: '#4b7bec', sector: 'Thép', icon: 'H', desc: 'Tập đoàn Hòa Phát — nhà sản xuất thép lớn nhất Việt Nam, đầu tàu ngành vật liệu.' });
  A('fpt', 'FPT', 'FPT Corp', 'hose', { price: 50700, prev: 50900, volume: 3100000, avgVolume: 4200000, cap: 74e12, yahoo: 'FPT.VN', color: '#f39c12', sector: 'Công nghệ', icon: 'F', desc: 'Tập đoàn FPT — công nghệ, viễn thông và giáo dục; cổ phiếu công nghệ được săn đón nhất.' });
  A('vnm', 'VNM', 'Vinamilk', 'hose', { price: 55100, prev: 57900, volume: 4200000, avgVolume: 2600000, cap: 115e12, yahoo: 'VNM.VN', color: '#2e86de', sector: 'Tiêu dùng', icon: 'V', desc: 'Công ty Sữa Việt Nam — thương hiệu tiêu dùng phòng thủ quen thuộc.' });
  A('mwg', 'MWG', 'Thế Giới Di Động', 'hose', { price: 73200, prev: 74000, volume: 2100000, avgVolume: 2800000, cap: 107e12, yahoo: 'MWG.VN', color: '#f5cd79', sector: 'Bán lẻ', icon: 'M', desc: 'Chuỗi bán lẻ điện thoại, điện máy và Bách Hoá Xanh.' });
  A('ssi', 'SSI', 'Chứng khoán SSI', 'hose', { price: 20400, prev: 20650, volume: 8900000, avgVolume: 11000000, cap: 40e12, yahoo: 'SSI.VN', color: '#3867d6', sector: 'Chứng khoán', icon: 'S', desc: 'Công ty Chứng khoán SSI — đại gia môi giới, tư vấn đầu tư và quản lý quỹ.' });
  A('vnd', 'VND', 'Chứng khoán VNDirect', 'hose', { price: 14650, prev: 14900, volume: 12500000, avgVolume: 9800000, cap: 24e12, yahoo: 'VND.VN', color: '#ff7979', sector: 'Chứng khoán', icon: 'V', desc: 'Chứng khoán VNDirect — mạnh về công nghệ giao dịch và môi giới trực tuyến.' });
  A('tcb', 'TCB', 'Techcombank', 'hose', { price: 21750, prev: 22000, volume: 3600000, avgVolume: 4400000, cap: 153e12, yahoo: 'TCB.VN', color: '#20bf6b', sector: 'Ngân hàng', icon: 'T', desc: 'Ngân hàng TMCP Kỹ thương Việt Nam — ngân hàng tư nhân hàng đầu.' });
  A('bid', 'BID', 'BIDV', 'hose', { price: 32350, prev: 32200, volume: 2600000, avgVolume: 3000000, cap: 185e12, yahoo: 'BID.VN', color: '#0fb9b1', sector: 'Ngân hàng', icon: 'B', desc: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam — trụ cột ngân hàng quốc doanh.' });
  A('ctg', 'CTG', 'VietinBank', 'hose', { price: 31650, prev: 31900, volume: 2800000, avgVolume: 3400000, cap: 170e12, yahoo: 'CTG.VN', color: '#2d98da', sector: 'Ngân hàng', icon: 'C', desc: 'Ngân hàng TMCP Công thương Việt Nam — một trong bốn ông lớn ngân hàng.' });
  A('vpb', 'VPB', 'VPBank', 'hose', { price: 22300, prev: 22550, volume: 4100000, avgVolume: 5200000, cap: 177e12, yahoo: 'VPB.VN', color: '#26de81', sector: 'Ngân hàng', icon: 'V', desc: 'Ngân hàng TMCP Việt Nam Thịnh Vượng — mạnh bán lẻ và tín dụng tiêu dùng.' });
  A('acb', 'ACB', 'ACB', 'hose', { price: 20500, prev: 20700, volume: 3200000, avgVolume: 3700000, cap: 92e12, yahoo: 'ACB.VN', color: '#45aaf2', sector: 'Ngân hàng', icon: 'A', desc: 'Ngân hàng TMCP Á Châu — hiệu quả sinh lời thuộc nhóm dẫn đầu.' });
  A('mbb', 'MBB', 'MB Bank', 'hose', { price: 19200, prev: 19400, volume: 5600000, avgVolume: 6700000, cap: 128e12, yahoo: 'MBB.VN', color: '#4b6584', sector: 'Ngân hàng', icon: 'M', desc: 'Ngân hàng TMCP Quân đội — tăng trưởng tín dụng mạnh, cổ đông chiến lược.' });
  A('msn', 'MSN', 'Masan Group', 'hose', { price: 72000, prev: 72600, volume: 1500000, avgVolume: 1800000, cap: 103e12, yahoo: 'MSN.VN', color: '#eb3b5a', sector: 'Tiêu dùng', icon: 'M', desc: 'Tập đoàn Masan — tiêu dùng, bán lẻ và mảng khoáng sản vonfram.' });
  A('gvr', 'GVR', 'Cao su Việt Nam', 'hose', { price: 29500, prev: 29650, volume: 1900000, avgVolume: 2400000, cap: 118e12, yahoo: 'GVR.VN', color: '#20bf6b', sector: 'Cao su', icon: 'G', desc: 'Tập đoàn Công nghiệp Cao su Việt Nam — hưởng lợi chu kỳ giá cao su.' });
  A('stb', 'STB', 'Sacombank', 'hose', { price: 69000, prev: 69700, volume: 3700000, avgVolume: 4600000, cap: 130e12, yahoo: 'STB.VN', color: '#8854d0', sector: 'Ngân hàng', icon: 'S', desc: 'Ngân hàng TMCP Sài Gòn Thương Tín — câu chuyện tái cấu trúc được chú ý.' });
  A('tpb', 'TPB', 'TPBank', 'hose', { price: 12750, prev: 12700, volume: 4600000, avgVolume: 5300000, cap: 56e12, yahoo: 'TPB.VN', color: '#a55eea', sector: 'Ngân hàng', icon: 'T', desc: 'Ngân hàng TMCP Tiên Phong — ngân hàng số tăng trưởng nhanh.' });
  A('shb', 'SHB', 'SHB', 'hose', { price: 11250, prev: 10900, volume: 14800000, avgVolume: 10200000, cap: 56e12, yahoo: 'SHB.VN', color: '#fa8231', sector: 'Ngân hàng', icon: 'S', desc: 'Ngân hàng TMCP Sài Gòn – Hà Nội — thanh khoản cao, nhịp đập đầu cơ.' });
  A('sab', 'SAB', 'Sabeco', 'hose', { price: 43150, prev: 42900, volume: 720000, avgVolume: 850000, cap: 55e12, yahoo: 'SAB.VN', color: '#d4a017', sector: 'Đồ uống', icon: 'S', desc: 'Tổng Công ty Bia – Rượu – Nước giải khát Sài Gòn.' });
  A('plx', 'PLX', 'Petrolimex', 'hose', { price: 32850, prev: 32800, volume: 1100000, avgVolume: 1350000, cap: 42e12, yahoo: 'PLX.VN', color: '#e67e22', sector: 'Năng lượng', icon: 'P', desc: 'Tập đoàn Xăng dầu Việt Nam — bán lẻ xăng dầu lớn nhất cả nước.' });
  A('pow', 'POW', 'PV Power', 'hose', { price: 12700, prev: 12500, volume: 4500000, avgVolume: 3900000, cap: 30e12, yahoo: 'POW.VN', color: '#f1c40f', sector: 'Điện', icon: 'P', desc: 'Tổng Công ty Điện lực Dầu khí Việt Nam — sản xuất điện khí.' });
  A('pnj', 'PNJ', 'PNJ', 'hose', { price: 14900, prev: 14700, volume: 2400000, avgVolume: 2100000, cap: 25e12, yahoo: 'PNJ.VN', color: '#e84393', sector: 'Bán lẻ', icon: 'P', desc: 'Công ty Vàng bạc Đá quý Phú Nhuận — bán lẻ trang sức cao cấp.' });
  A('ree', 'REE', 'Cơ Điện Lạnh', 'hose', { price: 47600, prev: 47700, volume: 850000, avgVolume: 980000, cap: 17e12, yahoo: 'REE.VN', color: '#00a8ff', sector: 'Cơ điện', icon: 'R', desc: 'Công ty Cơ Điện Lạnh — cơ điện, bất động sản và năng lượng.' });
  A('dgc', 'DGC', 'Đức Giang', 'hose', { price: 32750, prev: 32850, volume: 780000, avgVolume: 920000, cap: 12e12, yahoo: 'DGC.VN', color: '#7bed9f', sector: 'Hoá chất', icon: 'D', desc: 'Công ty Cổ phần Tập đoàn Hoá chất Đức Giang — photpho vàng.' });
  A('hdb', 'HDB', 'HDBank', 'hose', { price: 22350, prev: 22500, volume: 2100000, avgVolume: 2600000, cap: 65e12, yahoo: 'HDB.VN', color: '#17c0eb', sector: 'Ngân hàng', icon: 'H', desc: 'Ngân hàng TMCP Phát triển TP.HCM — tín dụng tiêu dùng và SME.' });
  A('lpb', 'LPB', 'LPBank', 'hose', { price: 36450, prev: 36100, volume: 2700000, avgVolume: 3200000, cap: 92e12, yahoo: 'LPB.VN', color: '#78e08f', sector: 'Ngân hàng', icon: 'L', desc: 'Ngân hàng TMCP Lộc Phát Việt Nam — tăng trưởng mạnh nhờ tái cấu trúc.' });
  A('vre', 'VRE', 'Vincom Retail', 'hose', { price: 24100, prev: 24100, volume: 1600000, avgVolume: 2000000, cap: 54e12, yahoo: 'VRE.VN', color: '#be2edd', sector: 'Bán lẻ', icon: 'V', desc: 'Vincom Retail — vận hành hệ thống trung tâm thương mại Vincom.' });
  A('vjc', 'VJC', 'Vietjet Air', 'hose', { price: 102500, prev: 101800, volume: 1400000, avgVolume: 1700000, cap: 62e12, yahoo: 'VJC.VN', color: '#e74c3c', sector: 'Hàng không', icon: '✈', desc: 'Vietjet Air — hãng hàng không tư nhân lớn nhất Việt Nam, mạng bay quốc tế rộng.' });
  A('gas', 'GAS', 'PV Gas', 'hose', { price: 68500, prev: 68200, volume: 1100000, avgVolume: 1300000, cap: 131e12, yahoo: 'GAS.VN', color: '#2980b9', sector: 'Khí đốt', icon: 'G', desc: 'Tổng Công ty Khí Việt Nam — hạ tầng khí tự nhiên và LNG đầu ngành.' });
  A('kdh', 'KDH', 'Khang Điền', 'hose', { price: 28500, prev: 28300, volume: 1600000, avgVolume: 1900000, cap: 22e12, yahoo: 'KDH.VN', color: '#16a085', sector: 'Bất động sản', icon: 'K', desc: 'Khang Điền House — nhà phát triển bất động sản nhà ở tại TP.HCM.' });
  A('nvl', 'NVL', 'Novaland', 'hose', { price: 11200, prev: 11050, volume: 6900000, avgVolume: 8200000, cap: 21e12, yahoo: 'NVL.VN', color: '#8e44ad', sector: 'Bất động sản', icon: 'N', desc: 'Novaland — bất động sản nghỉ dưỡng và đô thị, nhịp đập của dòng tiền đầu cơ.' });
  A('dxg', 'DXG', 'Đất Xanh', 'hose', { price: 14800, prev: 14600, volume: 5200000, avgVolume: 6100000, cap: 10e12, yahoo: 'DXG.VN', color: '#27ae60', sector: 'Bất động sản', icon: 'D', desc: 'Đất Xanh Group — môi giới và phát triển bất động sản nhà ở.' });
  A('dig', 'DIG', 'DIC Corp', 'hose', { price: 17200, prev: 16950, volume: 7400000, avgVolume: 8600000, cap: 10e12, yahoo: 'DIG.VN', color: '#d35400', sector: 'Bất động sản', icon: 'D', desc: 'DIC Corp — phát triển đô thị và khu công nghiệp, cổ phiếu đầu cơ quen thuộc.' });
  A('vci', 'VCI', 'Vietcap', 'hose', { price: 23800, prev: 24100, volume: 3400000, avgVolume: 4100000, cap: 13e12, yahoo: 'VCI.VN', color: '#c0392b', sector: 'Chứng khoán', icon: 'V', desc: 'Vietcap — chứng khoán, ngân hàng đầu tư và quản lý tài sản.' });
  A('hcm', 'HCM', 'HSC', 'hose', { price: 25600, prev: 25200, volume: 2600000, avgVolume: 3100000, cap: 12e12, yahoo: 'HCM.VN', color: '#e67e22', sector: 'Chứng khoán', icon: 'H', desc: 'Chứng khoán TP.HCM — môi giới, tư vấn và giao dịch ký quỹ.' });
  A('frt', 'FRT', 'FPT Retail', 'hose', { price: 128000, prev: 126500, volume: 780000, avgVolume: 900000, cap: 11e12, yahoo: 'FRT.VN', color: '#f39c12', sector: 'Bán lẻ', icon: 'F', desc: 'FPT Retail — chuỗi FPT Shop và nhà thuốc Long Châu.' });
  A('gmd', 'GMD', 'Gemadept', 'hose', { price: 68500, prev: 67900, volume: 920000, avgVolume: 1100000, cap: 21e12, yahoo: 'GMD.VN', color: '#3498db', sector: 'Logistics', icon: 'G', desc: 'Gemadept — cảng biển và logistics, hưởng lợi dòng chảy thương mại.' });
  A('kbc', 'KBC', 'Kinh Bắc', 'hose', { price: 28900, prev: 28600, volume: 3100000, avgVolume: 3600000, cap: 22e12, yahoo: 'KBC.VN', color: '#9b59b6', sector: 'Khu công nghiệp', icon: 'K', desc: 'Kinh Bắc City — cho thuê khu công nghiệp và bất động sản công nghiệp.' });
  A('hsg', 'HSG', 'Hoa Sen', 'hose', { price: 19800, prev: 19600, volume: 4800000, avgVolume: 5400000, cap: 12e12, yahoo: 'HSG.VN', color: '#1abc9c', sector: 'Thép', icon: 'H', desc: 'Hoa Sen Group — tôn thép và vật liệu xây dựng, xuất khẩu lớn.' });
  A('bmp', 'BMP', 'Bình Minh', 'hose', { price: 118000, prev: 117500, volume: 260000, avgVolume: 310000, cap: 9.6e12, yahoo: 'BMP.VN', color: '#00b894', sector: 'Nhựa', icon: 'B', desc: 'Nhựa Bình Minh — ống nhựa uPVC và HDPE cho xây dựng dân dụng.' });
  A('pvt', 'PVT', 'PV Trans', 'hose', { price: 27500, prev: 27200, volume: 2100000, avgVolume: 2500000, cap: 9.8e12, yahoo: 'PVT.VN', color: '#0984e3', sector: 'Vận tải biển', icon: 'P', desc: 'PV Trans — đội tàu chở dầu và hóa chất, nhạy với cước vận tải.' });

  /* ------------------------- HNX (mô phỏng) ------------------------- */
  A('pvs', 'PVS', 'PetroVietnam Services', 'hnx', { price: 42000, prev: 41500, volume: 3200000, avgVolume: 2600000, cap: 21e12, demoOnly: true, color: '#0abde3', sector: 'Dầu khí', icon: 'P', desc: 'Dịch vụ kỹ thuật dầu khí — cổ phiếu đầu cơ nhạy với giá dầu.' });
  A('shs', 'SHS', 'Chứng khoán SHS', 'hnx', { price: 19800, prev: 20200, volume: 7600000, avgVolume: 6200000, cap: 16e12, demoOnly: true, color: '#f0932b', sector: 'Chứng khoán', icon: 'S', desc: 'Chứng khoán Sài Gòn – Hà Nội — thanh khoản lớn trên sàn HNX.' });
  A('vcs', 'VCS', 'Vicostone', 'hnx', { price: 85000, prev: 84200, volume: 420000, avgVolume: 380000, cap: 9e12, demoOnly: true, color: '#a29bfe', sector: 'Vật liệu', icon: 'V', desc: 'Vicostone — đá thạch anh cao cấp xuất khẩu.' });
  A('nvb', 'NVB', 'NCB', 'hnx', { price: 13000, prev: 12750, volume: 1400000, avgVolume: 1100000, cap: 7e12, demoOnly: true, color: '#81ecec', sector: 'Ngân hàng', icon: 'N', desc: 'Ngân hàng TMCP Quốc Dân — cổ phiếu ngân hàng vốn hoá nhỏ.' });
  A('ceo', 'CEO', 'CEO Group', 'hnx', { price: 28700, prev: 29200, volume: 1900000, avgVolume: 2300000, cap: 12e12, demoOnly: true, color: '#e17055', sector: 'Bất động sản', icon: 'C', desc: 'CEO Group — bất động sản nghỉ dưỡng và du lịch.' });

  /* ------------------------- UPCoM (mô phỏng) ------------------------- */
  A('acv', 'ACV', 'ACV', 'upcom', { price: 65000, prev: 64500, volume: 260000, avgVolume: 310000, cap: 228e12, demoOnly: true, color: '#55efc4', sector: 'Hạ tầng', icon: 'A', desc: 'Tổng Công ty Cảng hàng không Việt Nam — vận hành 22 sân bay.' });
  A('bsr', 'BSR', 'Bình Sơn', 'upcom', { price: 25350, prev: 25450, volume: 3400000, avgVolume: 3000000, cap: 78e12, yahoo: 'BSR.VN', color: '#fab1a0', sector: 'Dầu khí', icon: 'B', desc: 'Lọc hoá dầu Bình Sơn — nhà máy Dung Quất.' });
  A('oil', 'OIL', 'PVOIL', 'upcom', { price: 13500, prev: 13400, volume: 860000, avgVolume: 750000, cap: 18e12, demoOnly: true, color: '#ff9f43', sector: 'Dầu khí', icon: 'O', desc: 'Tổng Công ty Dầu Việt Nam — phân phối xăng dầu.' });
  A('qns', 'QNS', 'Đường Quảng Ngãi', 'upcom', { price: 48000, prev: 47600, volume: 340000, avgVolume: 390000, cap: 16e12, demoOnly: true, color: '#fdcb6e', sector: 'Tiêu dùng', icon: 'Q', desc: 'Đường Quảng Ngãi — mía đường, sữa đậu nành Vinasoy.' });
  A('vea', 'VEA', 'VEAM', 'upcom', { price: 39000, prev: 38700, volume: 210000, avgVolume: 250000, cap: 51e12, demoOnly: true, color: '#74b9ff', sector: 'Cơ khí', icon: 'V', desc: 'Tổng Công ty Máy động lực và Máy nông nghiệp.' });

  /* ------------------------- US ------------------------- */
  A('aapl', 'AAPL', 'Apple', 'us', { price: 347.96, prev: 350.69, volume: 58000000, avgVolume: 62000000, cap: 5.2e12, currency: 'USD', yahoo: 'AAPL', color: '#c9ccd5', sector: 'Công nghệ', icon: '⌘', desc: 'Apple Inc. — iPhone, MacBook, dịch vụ và hệ sinh thái 2 tỷ thiết bị.' });
  A('msft', 'MSFT', 'Microsoft', 'us', { price: 535.61, prev: 545.18, volume: 21000000, avgVolume: 24000000, cap: 5.0e12, currency: 'USD', yahoo: 'MSFT', color: '#4aa3ff', sector: 'Công nghệ', icon: 'M', desc: 'Microsoft — Windows, Azure, Office và trí tuệ nhân tạo Copilot.' });
  A('nvda', 'NVDA', 'NVIDIA', 'us', { price: 172.72, prev: 178.67, volume: 210000000, avgVolume: 190000000, cap: 4.2e12, currency: 'USD', yahoo: 'NVDA', color: '#76b900', sector: 'Bán dẫn', icon: 'N', desc: 'NVIDIA — bộ xử lý đồ hoạ và hạ tầng AI; trái tim của kỷ nguyên AI.' });
  A('tsla', 'TSLA', 'Tesla', 'us', { price: 385.15, prev: 378.05, volume: 98000000, avgVolume: 92000000, cap: 1.3e12, currency: 'USD', yahoo: 'TSLA', color: '#e82127', sector: 'Xe điện', icon: 'T', desc: 'Tesla — xe điện, năng lượng và robotaxi; cổ phiếu biến động mạnh.' });
  A('amzn', 'AMZN', 'Amazon', 'us', { price: 273.08, prev: 266.93, volume: 46000000, avgVolume: 42000000, cap: 2.4e12, currency: 'USD', yahoo: 'AMZN', color: '#ff9900', sector: 'Bán lẻ', icon: 'a', desc: 'Amazon — thương mại điện tử và AWS, mảng điện toán đám mây số 1.' });
  A('googl', 'GOOGL', 'Alphabet', 'us', { price: 291.15, prev: 288.15, volume: 28000000, avgVolume: 31000000, cap: 2.8e12, currency: 'USD', yahoo: 'GOOGL', color: '#4285f4', sector: 'Công nghệ', icon: 'G', desc: 'Alphabet — Google Search, YouTube, Android và Gemini AI.' });
  A('meta', 'META', 'Meta Platforms', 'us', { price: 648.60, prev: 641.37, volume: 14000000, avgVolume: 16000000, cap: 1.9e12, currency: 'USD', yahoo: 'META', color: '#0866ff', sector: 'Mạng xã hội', icon: 'M', desc: 'Meta — Facebook, Instagram, WhatsApp và miền ảo Metaverse.' });
  A('nflx', 'NFLX', 'Netflix', 'us', { price: 63.20, prev: 63.95, volume: 31000000, avgVolume: 35000000, cap: 290e9, currency: 'USD', yahoo: 'NFLX', color: '#e50914', sector: 'Giải trí', icon: 'N', desc: 'Netflix — streaming toàn cầu, mảng quảng cáo đang tăng tốc.' });
  A('amd', 'AMD', 'AMD', 'us', { price: 536.19, prev: 508.58, volume: 52000000, avgVolume: 43000000, cap: 380e9, currency: 'USD', yahoo: 'AMD', color: '#ed1c24', sector: 'Bán dẫn', icon: 'A', desc: 'Advanced Micro Devices — CPU, GPU và chip AI cạnh tranh trực tiếp NVIDIA.' });
  A('coin', 'COIN', 'Coinbase', 'us', { price: 133.59, prev: 136.10, volume: 12000000, avgVolume: 14000000, cap: 36e9, currency: 'USD', yahoo: 'COIN', color: '#0052ff', sector: 'Crypto', icon: 'C', desc: 'Coinbase — sàn crypto niêm yết tại Mỹ; beta cao theo thị trường số.' });
  A('jpm', 'JPM', 'JPMorgan Chase', 'us', { price: 310.25, prev: 307.80, volume: 9000000, avgVolume: 10000000, cap: 880e9, currency: 'USD', yahoo: 'JPM', color: '#1f4e79', sector: 'Ngân hàng', icon: 'J', desc: 'JPMorgan Chase — ngân hàng đầu tư lớn nhất nước Mỹ, chuẩn mực của ngành tài chính.' });
  A('v', 'V', 'Visa', 'us', { price: 365.40, prev: 362.20, volume: 7000000, avgVolume: 8000000, cap: 710e9, currency: 'USD', yahoo: 'V', color: '#1a1f71', sector: 'Thanh toán', icon: 'V', desc: 'Visa — mạng lưới thanh toán toàn cầu, hưởng lợi từ chi tiêu tiêu dùng.' });
  A('wmt', 'WMT', 'Walmart', 'us', { price: 112.80, prev: 111.90, volume: 17000000, avgVolume: 19000000, cap: 900e9, currency: 'USD', yahoo: 'WMT', color: '#0071ce', sector: 'Bán lẻ', icon: 'W', desc: 'Walmart — bán lẻ hàng đầu thế giới, doanh thu phòng thủ giữa chu kỳ.' });
  A('ko', 'KO', 'Coca-Cola', 'us', { price: 76.40, prev: 76.10, volume: 14000000, avgVolume: 15000000, cap: 330e9, currency: 'USD', yahoo: 'KO', color: '#f40009', sector: 'Đồ uống', icon: 'K', desc: 'Coca-Cola — thương hiệu đồ uống toàn cầu, cổ phiếu phòng thủ quen thuộc.' });
  A('pep', 'PEP', 'PepsiCo', 'us', { price: 158.70, prev: 159.20, volume: 8000000, avgVolume: 9000000, cap: 218e9, currency: 'USD', yahoo: 'PEP', color: '#004b93', sector: 'Đồ uống', icon: 'P', desc: 'PepsiCo — đồ uống và snack, danh mục thương hiệu phòng thủ.' });
  A('xom', 'XOM', 'Exxon Mobil', 'us', { price: 128.60, prev: 127.40, volume: 16000000, avgVolume: 18000000, cap: 560e9, currency: 'USD', yahoo: 'XOM', color: '#e31b23', sector: 'Năng lượng', icon: 'X', desc: 'Exxon Mobil — dầu khí tích hợp, hưởng lợi chu kỳ giá năng lượng.' });
  A('ba', 'BA', 'Boeing', 'us', { price: 235.80, prev: 232.90, volume: 6000000, avgVolume: 7000000, cap: 178e9, currency: 'USD', yahoo: 'BA', color: '#0033a0', sector: 'Hàng không vũ trụ', icon: 'B', desc: 'Boeing — máy bay thương mại và quốc phòng, chu kỳ đơn hàng dài hạn.' });
  A('pltr', 'PLTR', 'Palantir', 'us', { price: 182.40, prev: 176.80, volume: 48000000, avgVolume: 52000000, cap: 430e9, currency: 'USD', yahoo: 'PLTR', color: '#101820', sector: 'AI / Phần mềm', icon: 'P', desc: 'Palantir — nền tảng dữ liệu và AI cho chính phủ và doanh nghiệp.' });
  A('uber', 'UBER', 'Uber', 'us', { price: 104.20, prev: 102.90, volume: 18000000, avgVolume: 20000000, cap: 218e9, currency: 'USD', yahoo: 'UBER', color: '#000000', sector: 'Gọi xe', icon: 'U', desc: 'Uber — gọi xe, giao đồ ăn và vận tải, mạng lưới hai chiều toàn cầu.' });
  A('dis', 'DIS', 'Disney', 'us', { price: 124.60, prev: 123.80, volume: 9000000, avgVolume: 10000000, cap: 225e9, currency: 'USD', yahoo: 'DIS', color: '#113ccf', sector: 'Giải trí', icon: 'D', desc: 'Disney — công viên, phim ảnh và streaming, thương hiệu giải trí biểu tượng.' });

  /* ------------------------- CRYPTO (Binance) ------------------------- */
  A('btc', 'BTC', 'Bitcoin', 'crypto', { price: 73781, prev: 73708.87, volume: 370000, avgVolume: 420000, cap: 1.46e12, currency: 'USD', binance: 'BTCUSDT', decimals: 2, lot: 0.000001, color: '#f7931a', sector: 'Layer 1', icon: '₿', desc: 'Bitcoin — tài sản kỹ thuật số đầu tiên, “vàng số” của thị trường crypto.' });
  A('eth', 'ETH', 'Ethereum', 'crypto', { price: 2066.4, prev: 2050.65, volume: 240000, avgVolume: 280000, cap: 249e9, currency: 'USD', binance: 'ETHUSDT', decimals: 2, lot: 0.0001, color: '#8b93ff', sector: 'Smart contract', icon: 'Ξ', desc: 'Ethereum — nền tảng hợp đồng thông minh lớn nhất, trái tim của DeFi.' });
  A('sol', 'SOL', 'Solana', 'crypto', { price: 83.00, prev: 83.26, volume: 2100000, avgVolume: 2600000, cap: 45e9, currency: 'USD', binance: 'SOLUSDT', decimals: 2, lot: 0.001, color: '#14f195', sector: 'Layer 1', icon: '◎', desc: 'Solana — blockchain tốc độ cao, phí thấp, mạnh về DeFi và NFT.' });
  A('bnb', 'BNB', 'BNB', 'crypto', { price: 681.03, prev: 679.61, volume: 620000, avgVolume: 700000, cap: 99e9, currency: 'USD', binance: 'BNBUSDT', decimals: 2, lot: 0.001, color: '#f3ba2f', sector: 'Exchange', icon: 'B', desc: 'BNB — token hệ sinh thái Binance, dùng cho phí giao dịch và BNB Chain.' });
  A('xrp', 'XRP', 'XRP', 'crypto', { price: 1.0572, prev: 1.0556, volume: 950000000, avgVolume: 1100000000, cap: 118e9, currency: 'USD', binance: 'XRPUSDT', decimals: 4, lot: 0.1, color: '#25a0e0', sector: 'Thanh toán', icon: 'X', desc: 'XRP — token của Ripple, tập trung vào thanh toán xuyên biên giới.' });
  A('doge', 'DOGE', 'Dogecoin', 'crypto', { price: 0.06816, prev: 0.06796, volume: 2800000000, avgVolume: 3200000000, cap: 13e9, currency: 'USD', binance: 'DOGEUSDT', decimals: 5, lot: 1, color: '#c2a633', sector: 'Meme', icon: 'Ð', desc: 'Dogecoin — meme coin lâu đời nhất, nhạy cảm với tâm lý cộng đồng.' });
  A('ada', 'ADA', 'Cardano', 'crypto', { price: 0.17532, prev: 0.17379, volume: 1900000000, avgVolume: 2100000000, cap: 6.5e9, currency: 'USD', binance: 'ADAUSDT', decimals: 4, lot: 1, color: '#0033ad', sector: 'Layer 1', icon: 'A', desc: 'Cardano — blockchain nghiên cứu học thuật, tập trung bảo mật và bền vững.' });
  A('avax', 'AVAX', 'Avalanche', 'crypto', { price: 8.451, prev: 8.370, volume: 62000000, avgVolume: 70000000, cap: 3.8e9, currency: 'USD', binance: 'AVAXUSDT', decimals: 3, lot: 0.01, color: '#e84142', sector: 'Layer 1', icon: 'A', desc: 'Avalanche — nền tảng subnets tốc độ cao cho tổ chức tài chính.' });
  A('link', 'LINK', 'Chainlink', 'crypto', { price: 10.385, prev: 10.277, volume: 38000000, avgVolume: 45000000, cap: 7.1e9, currency: 'USD', binance: 'LINKUSDT', decimals: 3, lot: 0.01, color: '#2a5ada', sector: 'Oracle', icon: 'L', desc: 'Chainlink — mạng oracle dữ liệu chuẩn cho DeFi và RWA.' });
  A('ltc', 'LTC', 'Litecoin', 'crypto', { price: 51.04, prev: 51.45, volume: 2900000, avgVolume: 3300000, cap: 4.2e9, currency: 'USD', binance: 'LTCUSDT', decimals: 2, lot: 0.01, color: '#a7a7a7', sector: 'Thanh toán', icon: 'Ł', desc: 'Litecoin — “bạc số”, bản fork nhẹ và nhanh của Bitcoin.' });
  A('trx', 'TRX', 'TRON', 'crypto', { price: 0.31764, prev: 0.31739, volume: 290000000, avgVolume: 350000000, cap: 28e9, currency: 'USD', binance: 'TRXUSDT', decimals: 4, lot: 1, color: '#ff060a', sector: 'Layer 1', icon: 'T', desc: 'TRON — mạng chuyển stablecoin khối lượng lớn, phí giao dịch thấp.' });
  A('sui', 'SUI', 'Sui', 'crypto', { price: 3.42, prev: 3.51, volume: 41000000, avgVolume: 48000000, cap: 12e9, currency: 'USD', binance: 'SUIUSDT', decimals: 3, lot: 0.1, color: '#4da2ff', sector: 'Layer 1', icon: 'S', desc: 'Sui — blockchain song song hoá, mạnh game và tài sản số.' });
  A('pepe', 'PEPE', 'Pepe', 'crypto', { price: 0.00000642, prev: 0.00000637, volume: 4200000000000, avgVolume: 4800000000000, cap: 5.6e9, currency: 'USD', binance: 'PEPEUSDT', decimals: 8, lot: 1000, color: '#3b9b3b', sector: 'Meme', icon: '🐸', desc: 'Pepe — meme coin vốn hoá lớn, biến động cực mạnh theo dòng tiền đầu cơ.' });
  A('ton', 'TON', 'Toncoin', 'crypto', { price: 2.41, prev: 2.44, volume: 18000000, avgVolume: 21000000, cap: 11e9, currency: 'USD', binance: 'TONUSDT', decimals: 3, lot: 0.1, color: '#0098ea', sector: 'Layer 1', icon: 'T', desc: 'Toncoin — blockchain gắn với hệ sinh thái Telegram.' });
  A('dot', 'DOT', 'Polkadot', 'crypto', { price: 4.85, prev: 4.79, volume: 24000000, avgVolume: 28000000, cap: 7.2e9, currency: 'USD', binance: 'DOTUSDT', decimals: 3, lot: 0.1, color: '#e6007a', sector: 'Layer 0', icon: '●', desc: 'Polkadot — mạng đa chuỗi kết nối các parachain bằng cơ chế chia sẻ bảo mật.' });
  A('apt', 'APT', 'Aptos', 'crypto', { price: 5.62, prev: 5.71, volume: 31000000, avgVolume: 36000000, cap: 3.6e9, currency: 'USD', binance: 'APTUSDT', decimals: 3, lot: 0.1, color: '#4dd0a8', sector: 'Layer 1', icon: 'A', desc: 'Aptos — blockchain Move thế hệ mới, tập trung trải nghiệm người dùng.' });
  A('arb', 'ARB', 'Arbitrum', 'crypto', { price: 0.4200, prev: 0.4150, volume: 180000000, avgVolume: 210000000, cap: 2.1e9, currency: 'USD', binance: 'ARBUSDT', decimals: 4, lot: 1, color: '#28a0f0', sector: 'Layer 2', icon: 'A', desc: 'Arbitrum — rollup Layer 2 lớn nhất Ethereum, phí thấp và hệ sinh thái DeFi sâu.' });
  A('op', 'OP', 'Optimism', 'crypto', { price: 0.6800, prev: 0.6720, volume: 92000000, avgVolume: 110000000, cap: 1.4e9, currency: 'USD', binance: 'OPUSDT', decimals: 4, lot: 1, color: '#ff0420', sector: 'Layer 2', icon: 'O', desc: 'Optimism — Layer 2 Ethereum với mô hình quản trị cộng đồng Optimism Collective.' });
  A('near', 'NEAR', 'NEAR Protocol', 'crypto', { price: 2.35, prev: 2.31, volume: 48000000, avgVolume: 55000000, cap: 2.9e9, currency: 'USD', binance: 'NEARUSDT', decimals: 3, lot: 0.1, color: '#00ec97', sector: 'Layer 1', icon: 'N', desc: 'NEAR — blockchain thân thiện với người dùng, mạnh về AI agent và tài khoản đơn giản.' });
  A('inj', 'INJ', 'Injective', 'crypto', { price: 8.90, prev: 8.75, volume: 21000000, avgVolume: 25000000, cap: 880e6, currency: 'USD', binance: 'INJUSDT', decimals: 3, lot: 0.1, color: '#00a3ff', sector: 'DeFi', icon: 'I', desc: 'Injective — blockchain DeFi chuyên biệt với sổ lệnh on-chain và sản phẩm phái sinh.' });
  A('bch', 'BCH', 'Bitcoin Cash', 'crypto', { price: 520.40, prev: 515.20, volume: 3200000, avgVolume: 3600000, cap: 10e9, currency: 'USD', binance: 'BCHUSDT', decimals: 2, lot: 0.001, color: '#8dc351', sector: 'Thanh toán', icon: 'B', desc: 'Bitcoin Cash — bản fork tập trung vào thanh toán nhanh với block lớn.' });
  A('shib', 'SHIB', 'Shiba Inu', 'crypto', { price: 0.00001020, prev: 0.00001010, volume: 2100000000000, avgVolume: 2400000000000, cap: 6.0e9, currency: 'USD', binance: 'SHIBUSDT', decimals: 8, lot: 1000, color: '#f00500', sector: 'Meme', icon: '🐕', desc: 'Shiba Inu — meme coin cộng đồng lớn, hệ sinh thái Shibarium và token sinh thái.' });

  /* ------------------------- FOREX ------------------------- */
  A('eurusd', 'EURUSD', 'EUR / USD', 'forex', { price: 1.1169, prev: 1.1167, volume: 0, currency: 'FX', yahoo: 'EURUSD=X', decimals: 4, lot: 0.01, color: '#3d7eff', sector: 'Major', icon: '€', unit: 'lot', desc: 'Cặp tiền lớn nhất thế giới — EUR/USD, thanh khoản cao nhất.' });
  A('gbpusd', 'GBPUSD', 'GBP / USD', 'forex', { price: 1.3352, prev: 1.3346, volume: 0, currency: 'FX', yahoo: 'GBPUSD=X', decimals: 4, lot: 0.01, color: '#f0b90b', sector: 'Major', icon: '£', unit: 'lot', desc: 'Bảng Anh / Đô la Mỹ — biến động cao trong phiên London.' });
  A('usdjpy', 'USDJPY', 'USD / JPY', 'forex', { price: 158.744, prev: 158.702, volume: 0, currency: 'FX', yahoo: 'USDJPY=X', decimals: 3, lot: 0.01, color: '#ff6b81', sector: 'Major', icon: '¥', unit: 'lot', desc: 'Đô la Mỹ / Yên Nhật — nhạy cảm với chính sách BOJ và lợi suất Mỹ.' });
  A('audusd', 'AUDUSD', 'AUD / USD', 'forex', { price: 0.6881, prev: 0.6871, volume: 0, currency: 'FX', yahoo: 'AUDUSD=X', decimals: 4, lot: 0.01, color: '#2ed573', sector: 'Major', icon: 'A', unit: 'lot', desc: 'Đô la Úc / Đô la Mỹ — gắn với giá quặng sắt và kinh tế Trung Quốc.' });
  A('usdvnd', 'USDVND', 'USD / VND', 'forex', { price: 25594, prev: 25594, volume: 0, currency: 'VND', yahoo: 'USDVND=X', decimals: 0, lot: 0.01, color: '#00d2d3', sector: 'Emerging', icon: '₫', unit: 'lot', desc: 'Tỷ giá USD/VND — tham chiếu cho mọi tài sản định giá bằng USD.' });
  A('usdcad', 'USDCAD', 'USD / CAD', 'forex', { price: 1.3800, prev: 1.3790, volume: 0, currency: 'FX', yahoo: 'USDCAD=X', decimals: 4, lot: 0.01, color: '#e74c3c', sector: 'Major', icon: 'C$', unit: 'lot', desc: 'Đô la Mỹ / Đô la Canada — nhạy với giá dầu và chính sách BoC.' });
  A('usdchf', 'USDCHF', 'USD / CHF', 'forex', { price: 0.8100, prev: 0.8095, volume: 0, currency: 'FX', yahoo: 'USDCHF=X', decimals: 4, lot: 0.01, color: '#ff5d73', sector: 'Major', icon: 'Fr', unit: 'lot', desc: 'Đô la Mỹ / Franc Thụy Sĩ — cặp trú ẩn, biến động mạnh khi thị trường lo ngại.' });
  A('nzdusd', 'NZDUSD', 'NZD / USD', 'forex', { price: 0.5900, prev: 0.5895, volume: 0, currency: 'FX', yahoo: 'NZDUSD=X', decimals: 4, lot: 0.01, color: '#00b894', sector: 'Major', icon: 'NZ$', unit: 'lot', desc: 'Đô la New Zealand / Đô la Mỹ — gắn với nông sản và kinh tế châu Á.' });
  A('eurjpy', 'EURJPY', 'EUR / JPY', 'forex', { price: 177.30, prev: 177.10, volume: 0, currency: 'FX', yahoo: 'EURJPY=X', decimals: 3, lot: 0.01, color: '#9b59b6', sector: 'Cross', icon: '€¥', unit: 'lot', desc: 'EUR/JPY — cặp chéo thanh khoản cao, nhạy với lợi suất trái phiếu châu Âu và BOJ.' });

  /* ------------------------- COMMODITY ------------------------- */
  A('xauusd', 'XAUUSD', 'Vàng thế giới', 'commodity', { price: 4060.2, prev: 4030.2, volume: 0, currency: 'USD', yahoo: 'GC=F', decimals: 2, lot: 0.01, color: '#f5c451', sector: 'Kim loại quý', icon: '🥇', unit: 'oz', desc: 'Vàng giao ngay quy đổi từ hợp đồng tương lai vàng COMEX (GC). Hầm trú ẩn cổ điển.' });
  A('xagusd', 'XAGUSD', 'Bạc thế giới', 'commodity', { price: 52.695, prev: 51.225, volume: 0, currency: 'USD', yahoo: 'SI=F', decimals: 3, lot: 1, color: '#cfd8dc', sector: 'Kim loại quý', icon: '🥈', unit: 'oz', desc: 'Bạc COMEX — kim loại công nghiệp và trú ẩn, biến động mạnh hơn vàng.' });
  A('usoil', 'USOIL', 'Dầu WTI', 'commodity', { price: 86.36, prev: 86.04, volume: 0, currency: 'USD', yahoo: 'CL=F', decimals: 2, lot: 0.01, color: '#6f6f6f', sector: 'Năng lượng', icon: '🛢️', unit: 'thùng', desc: 'Dầu thô WTI — chuẩn dầu Bắc Mỹ, nhạy cảm với OPEC+ và dự trữ.' });
  A('natgas', 'NATGAS', 'Khí tự nhiên', 'commodity', { price: 3.286, prev: 3.296, volume: 0, currency: 'USD', yahoo: 'NG=F', decimals: 3, lot: 1, color: '#74b9ff', sector: 'Năng lượng', icon: '💠', unit: 'MMBtu', desc: 'Khí tự nhiên Henry Hub — mùa đông và dự trữ là hai biến số chính.' });
  A('copper', 'COPPER', 'Đồng', 'commodity', { price: 5.120, prev: 5.080, volume: 0, currency: 'USD', yahoo: 'HG=F', decimals: 3, lot: 1, color: '#d35400', sector: 'Kim loại công nghiệp', icon: '🥉', unit: 'lb', desc: 'Đồng COMEX — thước đo sức khỏe sản xuất và đầu tư hạ tầng toàn cầu.' });
  A('brent', 'BRENT', 'Dầu Brent', 'commodity', { price: 89.80, prev: 89.40, volume: 0, currency: 'USD', yahoo: 'BZ=F', decimals: 2, lot: 0.01, color: '#2d3436', sector: 'Năng lượng', icon: '🛢️', unit: 'thùng', desc: 'Dầu thô Brent — chuẩn giá dầu quốc tế, phản ánh cung cầu OPEC+.' });
  A('corn', 'CORN', 'Ngô', 'commodity', { price: 4.350, prev: 4.320, volume: 0, currency: 'USD', yahoo: 'ZC=F', decimals: 3, lot: 1, color: '#f1c40f', sector: 'Nông sản', icon: '🌽', unit: 'bushel', desc: 'Ngô CBOT — đầu vào thức ăn chăn nuôi và nhiên liệu sinh học.' });
  A('coffee', 'COFFEE', 'Cà phê Arabica', 'commodity', { price: 3.850, prev: 3.780, volume: 0, currency: 'USD', yahoo: 'KC=F', decimals: 3, lot: 1, color: '#6f4e37', sector: 'Nông sản', icon: '☕', unit: 'lb', desc: 'Cà phê Arabica — Việt Nam là nước xuất khẩu lớn, giá nhạy thời tiết Brazil.' });

  /* ------------------------- ETF / QUỸ CHỈ SỐ ------------------------- */
  A('spy', 'SPY', 'SPDR S&P 500 ETF', 'etf', { price: 748.50, prev: 751.20, volume: 72000000, avgVolume: 78000000, cap: 620e9, currency: 'USD', yahoo: 'SPY', color: '#5ac8fa', sector: 'S&P 500', icon: '📈', desc: 'ETF mô phỏng S&P 500 — cách đa dạng hoá vào 500 doanh nghiệp Mỹ chỉ với một lệnh.' });
  A('qqq', 'QQQ', 'Invesco Nasdaq 100', 'etf', { price: 612.40, prev: 617.80, volume: 42000000, avgVolume: 46000000, cap: 350e9, currency: 'USD', yahoo: 'QQQ', color: '#a78bfa', sector: 'Nasdaq 100', icon: '💻', desc: 'ETF Nasdaq 100 — tập trung vào công nghệ và tăng trưởng, biến động cao hơn S&P 500.' });
  A('voo', 'VOO', 'Vanguard S&P 500', 'etf', { price: 688.20, prev: 690.90, volume: 8000000, avgVolume: 9000000, cap: 580e9, currency: 'USD', yahoo: 'VOO', color: '#42e3a4', sector: 'S&P 500', icon: '🇺🇸', desc: 'ETF S&P 500 chi phí thấp của Vanguard — lựa chọn nắm giữ dài hạn kinh điển.' });
  A('gld', 'GLD', 'SPDR Gold Shares', 'etf', { price: 372.40, prev: 369.80, volume: 9000000, avgVolume: 10000000, cap: 82e9, currency: 'USD', yahoo: 'GLD', color: '#f5c451', sector: 'Vàng', icon: '🥇', desc: 'ETF vàng vật chất — phơi nhiễm giá vàng không cần lưu trữ kim loại.' });
  A('tlt', 'TLT', 'iShares 20+ Year Treasury', 'etf', { price: 92.60, prev: 92.10, volume: 32000000, avgVolume: 35000000, cap: 52e9, currency: 'USD', yahoo: 'TLT', color: '#74b9ff', sector: 'Trái phiếu Mỹ', icon: '🏛️', desc: 'ETF trái phiếu kho bạc Mỹ dài hạn — nhạy với lãi suất và là kênh phòng thủ.' });
  A('eem', 'EEM', 'iShares MSCI Emerging Markets', 'etf', { price: 54.80, prev: 54.50, volume: 28000000, avgVolume: 31000000, cap: 18e9, currency: 'USD', yahoo: 'EEM', color: '#ffd166', sector: 'Thị trường mới nổi', icon: '🌏', desc: 'ETF thị trường mới nổi — đa dạng hoá sang châu Á, Mỹ Latinh và EMEA.' });

  /* ------------------------- INDICES ------------------------- */
  A('vnindex', 'VNINDEX', 'VN-Index tổng hợp', 'index', { price: 1918.42, prev: 1909.65, currency: 'PTS', tradable: false, demoOnly: true, color: '#42e3a4', sector: 'Việt Nam', icon: '📈', desc: 'Chỉ số mô phỏng được tổng hợp từ biến động của rổ cổ phiếu HOSE trong AURELIS. Không phải VN-Index chính thức.' });
  A('vn30', 'VN30', 'VN30 tổng hợp', 'index', { price: 2021.36, prev: 2013.08, currency: 'PTS', tradable: false, demoOnly: true, color: '#f2c45e', sector: 'Việt Nam', icon: '🏛️', desc: 'Chỉ số mô phỏng từ 10 cổ phiếu vốn hoá lớn nhất rổ HOSE. Dùng làm tài sản cơ sở cho VN30F.' });
  A('spx', 'SPX', 'S&P 500', 'index', { price: 7520.93, prev: 7549.94, currency: 'PTS', tradable: false, yahoo: '^GSPC', color: '#5ac8fa', sector: 'Mỹ', icon: '🇺🇸', desc: 'S&P 500 — thước đo 500 công ty lớn nhất nước Mỹ.' });
  A('nasdaq', 'NASDAQ', 'Nasdaq Composite', 'index', { price: 25065.88, prev: 25253.14, currency: 'PTS', tradable: false, yahoo: '^IXIC', color: '#a78bfa', sector: 'Mỹ', icon: '💻', desc: 'Nasdaq Composite — chỉ số công nghệ, nơi tập trung các gã khổng lồ AI.' });
  A('dji', 'DJI', 'Dow Jones', 'index', { price: 52231.89, prev: 52389.8, currency: 'PTS', tradable: false, yahoo: '^DJI', color: '#f472b6', sector: 'Mỹ', icon: '🏭', desc: 'Dow Jones Industrial Average — 30 công ty công nghiệp chủ chốt của Mỹ.' });
  A('nikkei', 'NIKKEI', 'Nikkei 225', 'index', { price: 52300.20, prev: 52100.50, currency: 'PTS', tradable: false, yahoo: '^N225', color: '#ff6b81', sector: 'Nhật Bản', icon: '🇯🇵', desc: 'Nikkei 225 — chỉ số blue-chip Nhật Bản, nhạy với JPY và chu kỳ xuất khẩu.' });
  A('hsi', 'HSI', 'Hang Seng', 'index', { price: 26800.40, prev: 26650.10, currency: 'PTS', tradable: false, yahoo: '^HSI', color: '#ff9f43', sector: 'Hồng Kông', icon: '🇭🇰', desc: 'Hang Seng — cửa ngõ cổ phiếu Trung Quốc qua thị trường Hồng Kông.' });
  A('ftse', 'FTSE', 'FTSE 100', 'index', { price: 9850.60, prev: 9820.30, currency: 'PTS', tradable: false, yahoo: '^FTSE', color: '#6cb8ff', sector: 'Anh', icon: '🇬🇧', desc: 'FTSE 100 — 100 công ty vốn hoá lớn nhất niêm yết tại London.' });
  A('dax', 'DAX', 'DAX 40', 'index', { price: 24600.80, prev: 24480.20, currency: 'PTS', tradable: false, yahoo: '^GDAXI', color: '#f1c40f', sector: 'Đức', icon: '🇩🇪', desc: 'DAX 40 — chỉ số đầu tàu kinh tế Đức, tập trung công nghiệp và ô tô.' });

  /* ------------------------- DERIVATIVES ------------------------- */
  A('vn30f', 'VN30F1M', 'VN30 Futures 1M', 'derivatives', { price: 2028.50, prev: 2019.20, currency: 'PTS', contractSize: 100000, lot: 1, maxLeverage: 10, underlying: 'vn30', demoOnly: true, unit: 'hợp đồng', color: '#ff9f7a', sector: 'Chỉ số', icon: '⚡', desc: 'Hợp đồng tương lai VN30 1 tháng. 1 điểm = 100.000 ₫. Ký quỹ thực tế ~20 triệu/hợp đồng.' });
  A('btcperp', 'BTC-PERP', 'Bitcoin Perpetual', 'derivatives', { price: 73810, prev: 73745, currency: 'USD', contractSize: 1, lot: 0.0001, maxLeverage: 50, underlying: 'btc', unit: 'BTC', color: '#f7931a', sector: 'Crypto perp', icon: '₿', desc: 'Hợp đồng vĩnh viễn Bitcoin — không có ngày đáo hạn, thanh toán phí funding mỗi 8 giờ.' });
  A('ethperp', 'ETH-PERP', 'Ethereum Perpetual', 'derivatives', { price: 2068.1, prev: 2051.4, currency: 'USD', contractSize: 1, lot: 0.001, maxLeverage: 50, underlying: 'eth', unit: 'ETH', color: '#8b93ff', sector: 'Crypto perp', icon: 'Ξ', desc: 'Hợp đồng vĩnh viễn Ethereum với thanh khoản sâu trên các sàn phái sinh.' });
  A('xauperp', 'XAU-PERP', 'Vàng Perpetual', 'derivatives', { price: 4065.5, prev: 4035.0, currency: 'USD', contractSize: 1, lot: 0.001, maxLeverage: 50, underlying: 'xauusd', unit: 'oz', color: '#f5c451', sector: 'Hàng hoá', icon: '🥇', desc: 'Vàng perpetual — đầu cơ vàng với đòn bẩy, thanh lý theo giá đánh dấu.' });
  A('spxperp', 'SPX-PERP', 'S&P 500 Perpetual', 'derivatives', { price: 7528.4, prev: 7557.2, currency: 'USD', contractSize: 1, lot: 0.01, maxLeverage: 20, underlying: 'spx', unit: 'hợp đồng', color: '#5ac8fa', sector: 'Chỉ số', icon: '🇺🇸', desc: 'S&P 500 perpetual — bắt nhịp chỉ số Mỹ 24/5 với đòn bẩy.' });
  A('vn30f2m', 'VN30F2M', 'VN30 Futures 2M', 'derivatives', { price: 2036.20, prev: 2027.10, currency: 'PTS', contractSize: 100000, lot: 1, maxLeverage: 10, underlying: 'vn30', demoOnly: true, unit: 'hợp đồng', color: '#ffb26b', sector: 'Chỉ số', icon: '⚡', desc: 'Hợp đồng tương lai VN30 tháng thứ hai — thanh khoản thấp hơn F1M nhưng ít nhiễu hơn.' });
  A('solperp', 'SOL-PERP', 'Solana Perpetual', 'derivatives', { price: 83.20, prev: 83.50, currency: 'USD', contractSize: 1, lot: 0.01, maxLeverage: 25, underlying: 'sol', unit: 'SOL', color: '#14f195', sector: 'Crypto perp', icon: '◎', desc: 'Solana perpetual — đòn bẩy cao trên blockchain tốc độ cao, phù hợp scalping.' });

  /* ------------------------- HOSE · BỔ SUNG LIVE 1.6 ------------------------- */
  A('vcg', 'VCG', 'Vinaconex', 'hose', { price: 22400, prev: 22100, volume: 3400000, avgVolume: 3900000, cap: 12e12, yahoo: 'VCG.VN', color: '#3d7eff', sector: 'Xây dựng', icon: 'V', desc: 'Vinaconex — tổng thầu xây dựng hạ tầng, sân bay và bất động sản.' });
  A('ctd', 'CTD', 'Coteccons', 'hose', { price: 68200, prev: 67600, volume: 620000, avgVolume: 740000, cap: 7e12, yahoo: 'CTD.VN', color: '#e67e22', sector: 'Xây dựng', icon: 'C', desc: 'Coteccons — nhà thầu xây dựng dân dụng và công nghiệp hàng đầu Việt Nam.' });
  A('hdg', 'HDG', 'Hà Đô', 'hose', { price: 27300, prev: 27000, volume: 1800000, avgVolume: 2100000, cap: 10e12, yahoo: 'HDG.VN', color: '#16a085', sector: 'Bất động sản', icon: 'H', desc: 'Hà Đô Group — bất động sản, thủy điện và năng lượng tái tạo.' });
  A('pdr', 'PDR', 'Phát Đạt', 'hose', { price: 18400, prev: 18100, volume: 4600000, avgVolume: 5200000, cap: 14e12, yahoo: 'PDR.VN', color: '#c0392b', sector: 'Bất động sản', icon: 'P', desc: 'Phát Đạt — phát triển bất động sản nhà ở và khu đô thị.' });
  A('nkg', 'NKG', 'Nam Kim', 'hose', { price: 15200, prev: 15000, volume: 3800000, avgVolume: 4300000, cap: 5e12, yahoo: 'NKG.VN', color: '#7f8c8d', sector: 'Thép', icon: 'N', desc: 'Nam Kim Steel — tôn thép mạ, xuất khẩu sang châu Âu và Mỹ.' });
  A('ht1', 'HT1', 'Hà Tiên', 'hose', { price: 14100, prev: 13900, volume: 520000, avgVolume: 610000, cap: 4.9e12, yahoo: 'HT1.VN', color: '#95a5a6', sector: 'Xi măng', icon: 'H', desc: 'Vicem Hà Tiên — xi măng khu vực phía Nam, gắn với chu kỳ xây dựng.' });
  A('sbt', 'SBT', 'TTC AgriS', 'hose', { price: 15300, prev: 15100, volume: 2900000, avgVolume: 3400000, cap: 10e12, yahoo: 'SBT.VN', color: '#f1c40f', sector: 'Nông nghiệp', icon: 'S', desc: 'TTC AgriS — mía đường, nông nghiệp và thực phẩm, hưởng lợi giá đường.' });
  A('dpm', 'DPM', 'Đạm Phú Mỹ', 'hose', { price: 34200, prev: 33800, volume: 1100000, avgVolume: 1300000, cap: 13e12, yahoo: 'DPM.VN', color: '#3498db', sector: 'Phân bón', icon: 'D', desc: 'Đạm Phú Mỹ — phân bón urê, nhạy với giá khí và nhu cầu nông nghiệp.' });
  A('dcm', 'DCM', 'Đạm Cà Mau', 'hose', { price: 35600, prev: 35100, volume: 1600000, avgVolume: 1900000, cap: 18e12, yahoo: 'DCM.VN', color: '#2980b9', sector: 'Phân bón', icon: 'D', desc: 'Đạm Cà Mau — phân bón và hóa chất, biên lợi nhuận nhạy giá khí.' });
  A('pvd', 'PVD', 'PV Drilling', 'hose', { price: 27400, prev: 27000, volume: 2400000, avgVolume: 2800000, cap: 14e12, yahoo: 'PVD.VN', color: '#0abde3', sector: 'Dầu khí', icon: 'P', desc: 'PV Drilling — khoan và dịch vụ kỹ thuật dầu khí, hưởng lợi chu kỳ capex.' });
  A('vhc', 'VHC', 'Vĩnh Hoàn', 'hose', { price: 72400, prev: 71600, volume: 760000, avgVolume: 890000, cap: 13e12, yahoo: 'VHC.VN', color: '#1abc9c', sector: 'Thủy sản', icon: 'V', desc: 'Vĩnh Hoàn — cá tra xuất khẩu, thương hiệu thủy sản lớn của Việt Nam.' });
  A('tcm', 'TCM', 'Dệt may Thành Công', 'hose', { price: 48200, prev: 47700, volume: 410000, avgVolume: 480000, cap: 4e12, yahoo: 'TCM.VN', color: '#e84393', sector: 'Dệt may', icon: 'T', desc: 'Thành Công — dệt may xuất khẩu, nhạy với đơn hàng và tỷ giá.' });
  A('pc1', 'PC1', 'PCC1', 'hose', { price: 28600, prev: 28200, volume: 1500000, avgVolume: 1800000, cap: 9e12, yahoo: 'PC1.VN', color: '#f39c12', sector: 'Xây dựng', icon: 'P', desc: 'PC1 Group — xây lắp điện, năng lượng tái tạo và hạ tầng.' });
  A('szc', 'SZC', 'Sonadezi Châu Đức', 'hose', { price: 38400, prev: 37900, volume: 690000, avgVolume: 820000, cap: 8e12, yahoo: 'SZC.VN', color: '#8e44ad', sector: 'Khu công nghiệp', icon: 'S', desc: 'Sonadezi Châu Đức — khu công nghiệp và bất động sản công nghiệp.' });
  A('nlg', 'NLG', 'Nam Long', 'hose', { price: 38200, prev: 37700, volume: 2200000, avgVolume: 2600000, cap: 12e12, yahoo: 'NLG.VN', color: '#2ecc71', sector: 'Bất động sản', icon: 'N', desc: 'Nam Long — nhà ở vừa túi tiền và khu đô thị, quỹ đất lớn.' });
  A('hdc', 'HDC', 'Hodeco', 'hose', { price: 26400, prev: 26000, volume: 540000, avgVolume: 620000, cap: 5e12, yahoo: 'HDC.VN', color: '#d35400', sector: 'Bất động sản', icon: 'H', desc: 'Hodeco — bất động sản Bà Rịa - Vũng Tàu, du lịch và nhà ở.' });
  A('ijc', 'IJC', 'Becamex IJC', 'hose', { price: 14600, prev: 14400, volume: 1200000, avgVolume: 1400000, cap: 4e12, yahoo: 'IJC.VN', color: '#1f8a70', sector: 'Bất động sản', icon: 'I', desc: 'Becamex IJC — hạ tầng và bất động sản khu công nghiệp Bình Dương.' });
  A('bcm', 'BCM', 'Becamex', 'hose', { price: 45800, prev: 45200, volume: 210000, avgVolume: 260000, cap: 47e12, yahoo: 'BCM.VN', color: '#27ae60', sector: 'Khu công nghiệp', icon: 'B', desc: 'Becamex IDC — khu công nghiệp và đô thị Bình Dương, quỹ đất công nghiệp lớn.' });
  A('bvh', 'BVH', 'Bảo Việt', 'hose', { price: 45200, prev: 44800, volume: 430000, avgVolume: 510000, cap: 30e12, yahoo: 'BVH.VN', color: '#e74c3c', sector: 'Bảo hiểm', icon: 'B', desc: 'Bảo Việt Holdings — bảo hiểm nhân thọ, phi nhân thọ và tài chính.' });
  A('eib', 'EIB', 'Eximbank', 'hose', { price: 19200, prev: 19000, volume: 2500000, avgVolume: 2900000, cap: 21e12, yahoo: 'EIB.VN', color: '#c0392b', sector: 'Ngân hàng', icon: 'E', desc: 'Eximbank — ngân hàng TMCP xuất nhập khẩu, câu chuyện tái cấu trúc.' });
  A('ocb', 'OCB', 'OCB', 'hose', { price: 12400, prev: 12200, volume: 1400000, avgVolume: 1600000, cap: 15e12, yahoo: 'OCB.VN', color: '#2980b9', sector: 'Ngân hàng', icon: 'O', desc: 'Ngân hàng Phương Đông — bán lẻ, SME và số hóa ngân hàng.' });
  A('ssb', 'SSB', 'SeABank', 'hose', { price: 18200, prev: 18000, volume: 1700000, avgVolume: 1900000, cap: 36e12, yahoo: 'SSB.VN', color: '#8e44ad', sector: 'Ngân hàng', icon: 'S', desc: 'SeABank — ngân hàng bán lẻ, tín dụng tiêu dùng và SME.' });
  A('vib', 'VIB', 'VIB', 'hose', { price: 19400, prev: 19200, volume: 2600000, avgVolume: 3000000, cap: 25e12, yahoo: 'VIB.VN', color: '#e67e22', sector: 'Ngân hàng', icon: 'V', desc: 'VIB — ngân hàng bán lẻ, thẻ tín dụng và cho vay tiêu dùng.' });
  A('msb', 'MSB', 'MSB', 'hose', { price: 12300, prev: 12100, volume: 1900000, avgVolume: 2200000, cap: 18e12, yahoo: 'MSB.VN', color: '#16a085', sector: 'Ngân hàng', icon: 'M', desc: 'MSB — ngân hàng TMCP Hàng Hải, bán lẻ và tài trợ thương mại.' });

  /* ------------------------- US · BỔ SUNG LIVE 1.6 ------------------------- */
  A('orcl', 'ORCL', 'Oracle', 'us', { price: 218.40, prev: 216.20, volume: 12000000, avgVolume: 14000000, cap: 610e9, currency: 'USD', yahoo: 'ORCL', color: '#c74634', sector: 'Công nghệ', icon: 'O', desc: 'Oracle — cơ sở dữ liệu doanh nghiệp, cloud và hạ tầng AI.' });
  A('crm', 'CRM', 'Salesforce', 'us', { price: 258.60, prev: 255.10, volume: 8000000, avgVolume: 9000000, cap: 245e9, currency: 'USD', yahoo: 'CRM', color: '#00a1e0', sector: 'Phần mềm', icon: 'S', desc: 'Salesforce — nền tảng CRM và AI doanh nghiệp hàng đầu.' });
  A('adbe', 'ADBE', 'Adobe', 'us', { price: 382.40, prev: 378.90, volume: 4000000, avgVolume: 4500000, cap: 168e9, currency: 'USD', yahoo: 'ADBE', color: '#ff0000', sector: 'Phần mềm', icon: 'A', desc: 'Adobe — Creative Cloud, tài liệu số và AI tạo sinh Firefly.' });
  A('avgo', 'AVGO', 'Broadcom', 'us', { price: 352.80, prev: 347.60, volume: 22000000, avgVolume: 25000000, cap: 1.6e12, currency: 'USD', yahoo: 'AVGO', color: '#cc0000', sector: 'Bán dẫn', icon: 'B', desc: 'Broadcom — chip mạng, hạ tầng AI và phần mềm doanh nghiệp.' });
  A('qcom', 'QCOM', 'Qualcomm', 'us', { price: 172.30, prev: 169.80, volume: 10000000, avgVolume: 11000000, cap: 188e9, currency: 'USD', yahoo: 'QCOM', color: '#3253dc', sector: 'Bán dẫn', icon: 'Q', desc: 'Qualcomm — chip di động, modem 5G và bán dẫn ô tô.' });
  A('mu', 'MU', 'Micron', 'us', { price: 224.50, prev: 218.40, volume: 26000000, avgVolume: 29000000, cap: 250e9, currency: 'USD', yahoo: 'MU', color: '#005eb8', sector: 'Bán dẫn', icon: 'M', desc: 'Micron — bộ nhớ DRAM và NAND, hưởng lợi chu kỳ AI.' });
  A('intc', 'INTC', 'Intel', 'us', { price: 45.20, prev: 44.60, volume: 62000000, avgVolume: 68000000, cap: 198e9, currency: 'USD', yahoo: 'INTC', color: '#0071c5', sector: 'Bán dẫn', icon: 'I', desc: 'Intel — CPU, foundry và chiến lược hạ tầng bán dẫn Mỹ.' });
  A('csco', 'CSCO', 'Cisco', 'us', { price: 74.80, prev: 74.20, volume: 18000000, avgVolume: 20000000, cap: 296e9, currency: 'USD', yahoo: 'CSCO', color: '#1ba0d7', sector: 'Công nghệ', icon: 'C', desc: 'Cisco — thiết bị mạng, bảo mật và hạ tầng doanh nghiệp.' });
  A('mcd', 'MCD', "McDonald's", 'us', { price: 312.60, prev: 309.80, volume: 4000000, avgVolume: 4500000, cap: 222e9, currency: 'USD', yahoo: 'MCD', color: '#ffc72c', sector: 'Bán lẻ', icon: 'M', desc: "McDonald's — chuỗi nhà hàng thức ăn nhanh toàn cầu, dòng tiền ổn định." });
  A('nke', 'NKE', 'Nike', 'us', { price: 66.40, prev: 65.70, volume: 14000000, avgVolume: 16000000, cap: 98e9, currency: 'USD', yahoo: 'NKE', color: '#111111', sector: 'Tiêu dùng', icon: 'N', desc: 'Nike — thương hiệu thể thao toàn cầu, nhạy với chi tiêu tiêu dùng.' });
  A('sbux', 'SBUX', 'Starbucks', 'us', { price: 96.20, prev: 95.10, volume: 10000000, avgVolume: 11000000, cap: 109e9, currency: 'USD', yahoo: 'SBUX', color: '#00704a', sector: 'Bán lẻ', icon: 'S', desc: 'Starbucks — chuỗi cà phê toàn cầu, câu chuyện phục hồi nhu cầu.' });
  A('shop', 'SHOP', 'Shopify', 'us', { price: 152.80, prev: 148.60, volume: 9000000, avgVolume: 10000000, cap: 198e9, currency: 'USD', yahoo: 'SHOP', color: '#96bf48', sector: 'Thương mại điện tử', icon: 'S', desc: 'Shopify — nền tảng bán hàng trực tuyến cho merchant toàn cầu.' });
  A('pypl', 'PYPL', 'PayPal', 'us', { price: 71.40, prev: 70.20, volume: 13000000, avgVolume: 15000000, cap: 68e9, currency: 'USD', yahoo: 'PYPL', color: '#003087', sector: 'Thanh toán', icon: 'P', desc: 'PayPal — ví điện tử và thanh toán xuyên biên giới.' });
  A('gs', 'GS', 'Goldman Sachs', 'us', { price: 748.20, prev: 740.60, volume: 2500000, avgVolume: 2800000, cap: 232e9, currency: 'USD', yahoo: 'GS', color: '#7399c6', sector: 'Ngân hàng', icon: 'G', desc: 'Goldman Sachs — ngân hàng đầu tư, M&A và quản lý tài sản.' });
  A('bac', 'BAC', 'Bank of America', 'us', { price: 54.80, prev: 54.20, volume: 38000000, avgVolume: 42000000, cap: 410e9, currency: 'USD', yahoo: 'BAC', color: '#e31837', sector: 'Ngân hàng', icon: 'B', desc: 'Bank of America — ngân hàng bán lẻ và đầu tư lớn thứ hai nước Mỹ.' });
  A('brkb', 'BRK-B', 'Berkshire Hathaway', 'us', { price: 502.40, prev: 498.80, volume: 4000000, avgVolume: 4500000, cap: 1.08e12, currency: 'USD', yahoo: 'BRK-B', color: '#7b1e2b', sector: 'Tài chính', icon: 'B', desc: 'Berkshire Hathaway — holding của Warren Buffett, bảo hiểm và đầu tư giá trị.' });
  A('lly', 'LLY', 'Eli Lilly', 'us', { price: 1002.60, prev: 988.40, volume: 3500000, avgVolume: 4000000, cap: 950e9, currency: 'USD', yahoo: 'LLY', color: '#d52b1e', sector: 'Dược phẩm', icon: 'L', desc: 'Eli Lilly — dược phẩm, thuốc giảm cân và tiểu đường thế hệ mới.' });
  A('unh', 'UNH', 'UnitedHealth', 'us', { price: 352.40, prev: 348.20, volume: 6000000, avgVolume: 6800000, cap: 325e9, currency: 'USD', yahoo: 'UNH', color: '#002677', sector: 'Y tế', icon: 'U', desc: 'UnitedHealth — bảo hiểm y tế và dịch vụ chăm sóc sức khỏe lớn nhất Mỹ.' });
  A('cat', 'CAT', 'Caterpillar', 'us', { price: 452.80, prev: 447.60, volume: 3000000, avgVolume: 3400000, cap: 218e9, currency: 'USD', yahoo: 'CAT', color: '#ffcd11', sector: 'Công nghiệp', icon: 'C', desc: 'Caterpillar — máy móc xây dựng, khai khoáng và hạ tầng toàn cầu.' });
  A('ge', 'GE', 'GE Aerospace', 'us', { price: 284.60, prev: 280.20, volume: 5000000, avgVolume: 5600000, cap: 305e9, currency: 'USD', yahoo: 'GE', color: '#0033a0', sector: 'Hàng không', icon: 'G', desc: 'GE Aerospace — động cơ máy bay và dịch vụ hàng không, chu kỳ dài hạn.' });
  A('rblx', 'RBLX', 'Roblox', 'us', { price: 122.40, prev: 118.60, volume: 9000000, avgVolume: 10000000, cap: 82e9, currency: 'USD', yahoo: 'RBLX', color: '#e2231a', sector: 'Gaming', icon: 'R', desc: 'Roblox — nền tảng game và metaverse, tăng trưởng nhờ người dùng trẻ.' });
  A('snow', 'SNOW', 'Snowflake', 'us', { price: 238.60, prev: 232.40, volume: 6000000, avgVolume: 6800000, cap: 79e9, currency: 'USD', yahoo: 'SNOW', color: '#29b5e8', sector: 'Phần mềm', icon: 'S', desc: 'Snowflake — data cloud và AI dữ liệu doanh nghiệp.' });
  A('arm', 'ARM', 'Arm Holdings', 'us', { price: 164.20, prev: 159.80, volume: 12000000, avgVolume: 14000000, cap: 172e9, currency: 'USD', yahoo: 'ARM', color: '#0091bd', sector: 'Bán dẫn', icon: 'A', desc: 'Arm — kiến trúc chip tiết kiệm điện cho di động, AI và ô tô.' });
  A('smci', 'SMCI', 'Super Micro', 'us', { price: 46.80, prev: 44.90, volume: 32000000, avgVolume: 36000000, cap: 27e9, currency: 'USD', yahoo: 'SMCI', color: '#3fbf3f', sector: 'Máy chủ AI', icon: 'S', desc: 'Super Micro — máy chủ và giải pháp làm mát cho hạ tầng AI.' });
  A('ionq', 'IONQ', 'IonQ', 'us', { price: 46.20, prev: 43.80, volume: 22000000, avgVolume: 25000000, cap: 14e9, currency: 'USD', yahoo: 'IONQ', color: '#6c5ce7', sector: 'Lượng tử', icon: 'I', desc: 'IonQ — máy tính lượng tử thương mại, cổ phiếu tăng trưởng giàu biến động.' });
  A('hood', 'HOOD', 'Robinhood', 'us', { price: 124.60, prev: 120.80, volume: 21000000, avgVolume: 24000000, cap: 110e9, currency: 'USD', yahoo: 'HOOD', color: '#00c805', sector: 'Fintech', icon: 'H', desc: 'Robinhood — môi giới đầu tư, crypto và tài khoản hưu trí.' });
  A('mstr', 'MSTR', 'Strategy', 'us', { price: 248.40, prev: 236.20, volume: 18000000, avgVolume: 21000000, cap: 68e9, currency: 'USD', yahoo: 'MSTR', color: '#f7931a', sector: 'Crypto', icon: 'M', desc: 'Strategy (MSTR) — công ty nắm giữ Bitcoin lớn nhất, beta cao theo BTC.' });

  /* ------------------------- CRYPTO · BỔ SUNG LIVE 1.6 ------------------------- */
  A('wif', 'WIF', 'dogwifhat', 'crypto', { price: 0.352, prev: 0.341, volume: 62000000, avgVolume: 70000000, cap: 352e6, currency: 'USD', binance: 'WIFUSDT', decimals: 4, lot: 0.1, color: '#d6a56b', sector: 'Meme', icon: '🐕', desc: 'dogwifhat — meme coin trên Solana, biến động mạnh theo dòng tiền đầu cơ.' });
  A('bonk', 'BONK', 'Bonk', 'crypto', { price: 0.0000182, prev: 0.0000176, volume: 820000000000, avgVolume: 900000000000, cap: 1.4e9, currency: 'USD', binance: 'BONKUSDT', decimals: 8, lot: 1000, color: '#f7a94b', sector: 'Meme', icon: '🐶', desc: 'Bonk — meme coin cộng đồng trên Solana, thanh khoản cao và biến động lớn.' });
  A('jup', 'JUP', 'Jupiter', 'crypto', { price: 0.452, prev: 0.438, volume: 58000000, avgVolume: 65000000, cap: 680e6, currency: 'USD', binance: 'JUPUSDT', decimals: 4, lot: 0.1, color: '#c7f284', sector: 'DeFi', icon: 'J', desc: 'Jupiter — aggregator DEX lớn nhất Solana, hưởng lợi thanh khoản on-chain.' });
  A('sei', 'SEI', 'Sei', 'crypto', { price: 0.184, prev: 0.178, volume: 92000000, avgVolume: 100000000, cap: 1.1e9, currency: 'USD', binance: 'SEIUSDT', decimals: 4, lot: 1, color: '#9e1f19', sector: 'Layer 1', icon: 'S', desc: 'Sei — blockchain tối ưu giao dịch, tập trung DeFi và ứng dụng tài chính.' });
  A('tia', 'TIA', 'Celestia', 'crypto', { price: 1.82, prev: 1.74, volume: 24000000, avgVolume: 27000000, cap: 1.2e9, currency: 'USD', binance: 'TIAUSDT', decimals: 3, lot: 0.1, color: '#7b2bf9', sector: 'Layer 0', icon: 'T', desc: 'Celestia — lớp data availability cho modular blockchain.' });
  A('fil', 'FIL', 'Filecoin', 'crypto', { price: 3.24, prev: 3.16, volume: 31000000, avgVolume: 35000000, cap: 2.2e9, currency: 'USD', binance: 'FILUSDT', decimals: 3, lot: 0.01, color: '#0090ff', sector: 'Storage', icon: 'F', desc: 'Filecoin — mạng lưu trữ phi tập trung, cạnh tranh cloud truyền thống.' });
  A('atom', 'ATOM', 'Cosmos', 'crypto', { price: 4.24, prev: 4.12, volume: 28000000, avgVolume: 31000000, cap: 1.7e9, currency: 'USD', binance: 'ATOMUSDT', decimals: 3, lot: 0.01, color: '#2e3148', sector: 'Layer 0', icon: '⚛', desc: 'Cosmos — mạng liên chuỗi IBC, trung tâm của hệ sinh thái app-chain.' });
  A('etc', 'ETC', 'Ethereum Classic', 'crypto', { price: 18.24, prev: 17.86, volume: 12000000, avgVolume: 13000000, cap: 2.8e9, currency: 'USD', binance: 'ETCUSDT', decimals: 2, lot: 0.01, color: '#328332', sector: 'Layer 1', icon: 'E', desc: 'Ethereum Classic — bản fork giữ nguyên nguyên tắc proof-of-work.' });
  A('xlm', 'XLM', 'Stellar', 'crypto', { price: 0.282, prev: 0.276, volume: 180000000, avgVolume: 200000000, cap: 8.6e9, currency: 'USD', binance: 'XLMUSDT', decimals: 4, lot: 1, color: '#7d00ff', sector: 'Thanh toán', icon: 'X', desc: 'Stellar — mạng thanh toán xuyên biên giới, tập trung chuyển tiền giá rẻ.' });
  A('algo', 'ALGO', 'Algorand', 'crypto', { price: 0.164, prev: 0.159, volume: 62000000, avgVolume: 70000000, cap: 1.4e9, currency: 'USD', binance: 'ALGOUSDT', decimals: 4, lot: 1, color: '#00c1c1', sector: 'Layer 1', icon: 'A', desc: 'Algorand — blockchain thuần PoS, tập trung tài chính và thanh toán.' });
  A('vet', 'VET', 'VeChain', 'crypto', { price: 0.0254, prev: 0.0248, volume: 140000000, avgVolume: 160000000, cap: 2.1e9, currency: 'USD', binance: 'VETUSDT', decimals: 5, lot: 1, color: '#15bdff', sector: 'Supply chain', icon: 'V', desc: 'VeChain — blockchain chuỗi cung ứng và truy xuất nguồn gốc.' });
  A('render', 'RENDER', 'Render', 'crypto', { price: 3.42, prev: 3.28, volume: 26000000, avgVolume: 30000000, cap: 1.8e9, currency: 'USD', binance: 'RENDERUSDT', decimals: 3, lot: 0.01, color: '#ff2d55', sector: 'DePIN', icon: 'R', desc: 'Render — mạng GPU phi tập trung cho render và AI.' });
  A('fet', 'FET', 'Artificial Superintelligence', 'crypto', { price: 0.556, prev: 0.534, volume: 72000000, avgVolume: 80000000, cap: 1.4e9, currency: 'USD', binance: 'FETUSDT', decimals: 4, lot: 1, color: '#7b3fe4', sector: 'AI', icon: 'F', desc: 'FET — token của liên minh AI phi tập trung, nhạy với câu chuyện AI.' });
  A('ena', 'ENA', 'Ethena', 'crypto', { price: 0.352, prev: 0.338, volume: 110000000, avgVolume: 120000000, cap: 2.1e9, currency: 'USD', binance: 'ENAUSDT', decimals: 4, lot: 1, color: '#5ac8fa', sector: 'DeFi', icon: 'E', desc: 'Ethena — giao thức stablecoin tổng hợp USDe, phụ thuộc funding và basis.' });
  A('wld', 'WLD', 'Worldcoin', 'crypto', { price: 1.12, prev: 1.06, volume: 58000000, avgVolume: 65000000, cap: 2.3e9, currency: 'USD', binance: 'WLDUSDT', decimals: 3, lot: 0.1, color: '#c7c7c7', sector: 'AI', icon: 'W', desc: 'Worldcoin — dự án định danh số và AI, biến động theo tin tức hệ sinh thái.' });
  A('ordi', 'ORDI', 'ORDI', 'crypto', { price: 12.40, prev: 11.90, volume: 6200000, avgVolume: 7000000, cap: 260e6, currency: 'USD', binance: 'ORDIUSDT', decimals: 2, lot: 0.001, color: '#f7931a', sector: 'Bitcoin', icon: 'O', desc: 'ORDI — token BRC-20 đầu tiên trên Bitcoin, đại diện cho hệ sinh thái inscription.' });
  A('stx', 'STX', 'Stacks', 'crypto', { price: 0.612, prev: 0.592, volume: 34000000, avgVolume: 38000000, cap: 920e6, currency: 'USD', binance: 'STXUSDT', decimals: 4, lot: 0.1, color: '#5546ff', sector: 'Bitcoin L2', icon: 'S', desc: 'Stacks — smart contract trên Bitcoin, hệ sinh thái DeFi BTC.' });
  A('imx', 'IMX', 'Immutable', 'crypto', { price: 0.508, prev: 0.489, volume: 24000000, avgVolume: 27000000, cap: 880e6, currency: 'USD', binance: 'IMXUSDT', decimals: 4, lot: 0.1, color: '#0a68f5', sector: 'Gaming', icon: 'I', desc: 'Immutable — Layer 2 cho gaming và NFT, hưởng lợi chu kỳ game on-chain.' });
  A('grt', 'GRT', 'The Graph', 'crypto', { price: 0.0824, prev: 0.0796, volume: 68000000, avgVolume: 74000000, cap: 820e6, currency: 'USD', binance: 'GRTUSDT', decimals: 4, lot: 1, color: '#6747ed', sector: 'Infrastructure', icon: 'G', desc: 'The Graph — giao thức index dữ liệu blockchain, hạ tầng cho DeFi và dApp.' });
  A('theta', 'THETA', 'Theta Network', 'crypto', { price: 0.812, prev: 0.784, volume: 26000000, avgVolume: 29000000, cap: 810e6, currency: 'USD', binance: 'THETAUSDT', decimals: 4, lot: 0.1, color: '#2ab8b8', sector: 'DePIN', icon: 'T', desc: 'Theta — mạng phân phối video và compute phi tập trung.' });
  A('hbar', 'HBAR', 'Hedera', 'crypto', { price: 0.164, prev: 0.158, volume: 180000000, avgVolume: 200000000, cap: 6.9e9, currency: 'USD', binance: 'HBARUSDT', decimals: 4, lot: 1, color: '#222222', sector: 'Layer 1', icon: 'H', desc: 'Hedera — mạng hashgraph doanh nghiệp, quản trị bởi hội đồng lớn.' });
  A('icp', 'ICP', 'Internet Computer', 'crypto', { price: 4.52, prev: 4.38, volume: 18000000, avgVolume: 20000000, cap: 2.2e9, currency: 'USD', binance: 'ICPUSDT', decimals: 3, lot: 0.01, color: '#f15a24', sector: 'Layer 1', icon: 'I', desc: 'Internet Computer — blockchain có thể chạy ứng dụng web hoàn chỉnh on-chain.' });
  A('ldo', 'LDO', 'Lido DAO', 'crypto', { price: 0.912, prev: 0.878, volume: 28000000, avgVolume: 31000000, cap: 820e6, currency: 'USD', binance: 'LDOUSDT', decimals: 4, lot: 0.1, color: '#00a3ff', sector: 'DeFi', icon: 'L', desc: 'Lido — liquid staking lớn nhất Ethereum, hưởng lợi nhu cầu staking.' });
  A('jto', 'JTO', 'Jito', 'crypto', { price: 1.84, prev: 1.76, volume: 22000000, avgVolume: 25000000, cap: 680e6, currency: 'USD', binance: 'JTOUSDT', decimals: 3, lot: 0.1, color: '#4dd0a8', sector: 'DeFi', icon: 'J', desc: 'Jito — liquid staking và MEV trên Solana, gắn với thanh khoản SOL.' });

  /* ------------------------- FOREX · BỔ SUNG LIVE 1.6 ------------------------- */
  A('eurgbp', 'EURGBP', 'EUR / GBP', 'forex', { price: 0.8624, prev: 0.8618, volume: 0, currency: 'FX', yahoo: 'EURGBP=X', decimals: 4, lot: 0.01, color: '#5ac8fa', sector: 'Cross', icon: '€£', unit: 'lot', desc: 'EUR/GBP — cặp chéo châu Âu, nhạy với ECB, BoE và dữ liệu lạm phát.' });
  A('eurchf', 'EURCHF', 'EUR / CHF', 'forex', { price: 0.9382, prev: 0.9374, volume: 0, currency: 'FX', yahoo: 'EURCHF=X', decimals: 4, lot: 0.01, color: '#b59cff', sector: 'Cross', icon: '€Fr', unit: 'lot', desc: 'EUR/CHF — cặp chéo trú ẩn, thường bị SNB can thiệp khi biến động mạnh.' });
  A('gbpjpy', 'GBPJPY', 'GBP / JPY', 'forex', { price: 196.42, prev: 195.88, volume: 0, currency: 'FX', yahoo: 'GBPJPY=X', decimals: 3, lot: 0.01, color: '#ff6b81', sector: 'Cross', icon: '£¥', unit: 'lot', desc: 'GBP/JPY — cặp chéo biến động mạnh, ví như “quái thú” của forex.' });
  A('audjpy', 'AUDJPY', 'AUD / JPY', 'forex', { price: 103.24, prev: 102.86, volume: 0, currency: 'FX', yahoo: 'AUDJPY=X', decimals: 3, lot: 0.01, color: '#2ed573', sector: 'Cross', icon: 'A¥', unit: 'lot', desc: 'AUD/JPY — thước đo khẩu vị rủi ro châu Á - Thái Bình Dương.' });
  A('cadjpy', 'CADJPY', 'CAD / JPY', 'forex', { price: 108.62, prev: 108.24, volume: 0, currency: 'FX', yahoo: 'CADJPY=X', decimals: 3, lot: 0.01, color: '#e74c3c', sector: 'Cross', icon: 'C$¥', unit: 'lot', desc: 'CAD/JPY — kết hợp giá dầu Canada và lợi suất trái phiếu Nhật.' });

  /* ------------------------- COMMODITY · BỔ SUNG LIVE 1.6 ------------------------- */
  A('xptusd', 'XPTUSD', 'Bạch kim', 'commodity', { price: 1352.4, prev: 1338.6, volume: 0, currency: 'USD', yahoo: 'PL=F', decimals: 2, lot: 0.01, color: '#cfd8dc', sector: 'Kim loại quý', icon: '💎', unit: 'oz', desc: 'Bạch kim COMEX — kim loại quý công nghiệp, nhạy với sản xuất ô tô và đầu tư.' });
  A('xpdusd', 'XPDUSD', 'Palladium', 'commodity', { price: 1448.2, prev: 1426.8, volume: 0, currency: 'USD', yahoo: 'PA=F', decimals: 2, lot: 0.01, color: '#b0bec5', sector: 'Kim loại quý', icon: '🔘', unit: 'oz', desc: 'Palladium COMEX — kim loại xúc tác ô tô, biến động mạnh theo cung cầu Nga.' });
  A('wheat', 'WHEAT', 'Lúa mì', 'commodity', { price: 5.42, prev: 5.36, volume: 0, currency: 'USD', yahoo: 'ZW=F', decimals: 3, lot: 1, color: '#f1c40f', sector: 'Nông sản', icon: '🌾', unit: 'bushel', desc: 'Lúa mì CBOT — lương thực chiến lược, nhạy với thời tiết và địa chính trị.' });
  A('soybean', 'SOYBEAN', 'Đậu tương', 'commodity', { price: 10.84, prev: 10.72, volume: 0, currency: 'USD', yahoo: 'ZS=F', decimals: 3, lot: 1, color: '#7cb342', sector: 'Nông sản', icon: '🌱', unit: 'bushel', desc: 'Đậu tương CBOT — đầu vào thức ăn chăn nuôi và dầu thực vật.' });
  A('sugar', 'SUGAR', 'Đường', 'commodity', { price: 0.1924, prev: 0.1896, volume: 0, currency: 'USD', yahoo: 'SB=F', decimals: 4, lot: 1, color: '#f8c471', sector: 'Nông sản', icon: '🍬', unit: 'lb', desc: 'Đường thô ICE — Việt Nam là nước sản xuất lớn, giá nhạy thời tiết Brazil và Ấn Độ.' });
  A('cocoa', 'COCOA', 'Ca cao', 'commodity', { price: 8.42, prev: 8.18, volume: 0, currency: 'USD', yahoo: 'CC=F', decimals: 3, lot: 1, color: '#6f4e37', sector: 'Nông sản', icon: '🍫', unit: 'tấn', desc: 'Ca cao ICE — nguyên liệu chocolate, thị trường hẹp và biến động cực mạnh.' });
  A('cotton', 'COTTON', 'Bông', 'commodity', { price: 0.682, prev: 0.674, volume: 0, currency: 'USD', yahoo: 'CT=F', decimals: 4, lot: 1, color: '#ecf0f1', sector: 'Nông sản', icon: '☁️', unit: 'lb', desc: 'Bông ICE — nguyên liệu dệt may, cạnh tranh với sợi tổng hợp.' });

  /* ------------------------- ETF · BỔ SUNG LIVE 1.6 ------------------------- */
  A('dia', 'DIA', 'SPDR Dow Jones ETF', 'etf', { price: 482.60, prev: 480.20, volume: 4000000, avgVolume: 4500000, cap: 38e9, currency: 'USD', yahoo: 'DIA', color: '#f472b6', sector: 'Dow Jones', icon: '🏭', desc: 'ETF mô phỏng Dow Jones 30 — nhóm công ty công nghiệp và blue-chip Mỹ.' });
  A('iwm', 'IWM', 'iShares Russell 2000', 'etf', { price: 246.80, prev: 244.60, volume: 28000000, avgVolume: 31000000, cap: 68e9, currency: 'USD', yahoo: 'IWM', color: '#ffd166', sector: 'Small cap', icon: '🌱', desc: 'ETF Russell 2000 — cổ phiếu vốn hoá nhỏ Mỹ, nhạy với lãi suất.' });
  A('vti', 'VTI', 'Vanguard Total Market', 'etf', { price: 302.40, prev: 300.80, volume: 5000000, avgVolume: 5500000, cap: 520e9, currency: 'USD', yahoo: 'VTI', color: '#42e3a4', sector: 'Toàn thị trường', icon: '🇺🇸', desc: 'ETF toàn bộ thị trường chứng khoán Mỹ — một lệnh, hàng nghìn doanh nghiệp.' });
  A('arkk', 'ARKK', 'ARK Innovation ETF', 'etf', { price: 62.40, prev: 60.80, volume: 12000000, avgVolume: 14000000, cap: 8e9, currency: 'USD', yahoo: 'ARKK', color: '#b59cff', sector: 'Đổi mới', icon: '🚀', desc: 'ETF ARK Innovation — danh mục công nghệ đột phá, biến động rất cao.' });
  A('xle', 'XLE', 'Energy Select SPDR', 'etf', { price: 96.20, prev: 95.40, volume: 16000000, avgVolume: 18000000, cap: 36e9, currency: 'USD', yahoo: 'XLE', color: '#ff9f43', sector: 'Năng lượng', icon: '🛢️', desc: 'ETF năng lượng Mỹ — dầu khí, dịch vụ và hạ tầng năng lượng.' });
  A('xlf', 'XLF', 'Financial Select SPDR', 'etf', { price: 53.80, prev: 53.30, volume: 22000000, avgVolume: 24000000, cap: 48e9, currency: 'USD', yahoo: 'XLF', color: '#6cb8ff', sector: 'Tài chính', icon: '🏦', desc: 'ETF tài chính Mỹ — ngân hàng, bảo hiểm và công ty chứng khoán.' });
  A('smh', 'SMH', 'VanEck Semiconductor', 'etf', { price: 324.60, prev: 318.20, volume: 9000000, avgVolume: 10000000, cap: 28e9, currency: 'USD', yahoo: 'SMH', color: '#76b900', sector: 'Bán dẫn', icon: '💾', desc: 'ETF bán dẫn — rổ chip AI, thiết bị và chuỗi cung ứng toàn cầu.' });
  A('tqqq', 'TQQQ', 'ProShares UltraPro QQQ', 'etf', { price: 112.40, prev: 108.60, volume: 62000000, avgVolume: 68000000, cap: 32e9, currency: 'USD', yahoo: 'TQQQ', color: '#a78bfa', sector: 'Nasdaq 3x', icon: '⚡', desc: 'ETF đòn bẩy 3x Nasdaq 100 — lợi nhuận và rủi ro đều được khuếch đại.' });

  /* ------------------------- INDEX · BỔ SUNG LIVE 1.6 ------------------------- */
  A('kospi', 'KOSPI', 'KOSPI', 'index', { price: 3218.40, prev: 3196.20, currency: 'PTS', tradable: false, yahoo: '^KS11', color: '#5ac8fa', sector: 'Hàn Quốc', icon: '🇰🇷', desc: 'KOSPI — chỉ số chứng khoán Hàn Quốc, nặng về bán dẫn và ô tô.' });
  A('asx', 'ASX200', 'ASX 200', 'index', { price: 8842.60, prev: 8796.40, currency: 'PTS', tradable: false, yahoo: '^AXJO', color: '#2ed573', sector: 'Úc', icon: '🇦🇺', desc: 'ASX 200 — 200 công ty lớn nhất Australia, nhạy với khai khoáng và ngân hàng.' });
  A('bovespa', 'BOVESPA', 'Bovespa', 'index', { price: 146820.40, prev: 145640.20, currency: 'PTS', tradable: false, yahoo: '^BVSP', color: '#ffd166', sector: 'Brazil', icon: '🇧🇷', desc: 'Bovespa — chỉ số chứng khoán Brazil, gắn với hàng hóa và dòng tiền mới nổi.' });
  A('ipc', 'IPC', 'IPC Mexico', 'index', { price: 62480.20, prev: 62040.60, currency: 'PTS', tradable: false, yahoo: '^MXX', color: '#42e3a4', sector: 'Mexico', icon: '🇲🇽', desc: 'IPC — chỉ số chứng khoán Mexico, tập trung viễn thông và tiêu dùng.' });
  A('stoxx50', 'STOXX50', 'Euro Stoxx 50', 'index', { price: 5842.80, prev: 5806.40, currency: 'PTS', tradable: false, yahoo: '^STOXX50E', color: '#6cb8ff', sector: 'Châu Âu', icon: '🇪🇺', desc: 'Euro Stoxx 50 — 50 blue-chip khu vực đồng euro, đại diện kinh tế châu Âu.' });

  const HOSE_IDS = ASSETS.filter(a => a.group === 'hose').map(a => a.id);
  const VN30_IDS = ['vcb', 'vic', 'vhm', 'fpt', 'hpg', 'tcb', 'bid', 'ctg', 'vpb', 'mbb'];

  /* ------------------------- SHOP ------------------------- */
  const SHOP = [
    // Titles
    { id: 'title_rookie', type: 'title', category: 'Danh hiệu', name: 'Tân Binh', desc: 'Ai cũng bắt đầu từ đâu đó. Danh hiệu khởi nguyên của mọi huyền thoại.', price: 10, rarity: 'common', icon: '🌱', value: 'Tân Binh', defaultValue: true },
    { id: 'title_degen', type: 'title', category: 'Danh hiệu', name: 'Degen Chính Hiệu', desc: '“Tôi mua đỉnh vì tôi thích cảm giác mạnh.” Dành cho người chơi hệ cảm xúc.', price: 540, rarity: 'rare', icon: '🎲', value: 'Degen Chính Hiệu' },
    { id: 'title_zen', type: 'title', category: 'Danh hiệu', name: 'Thiền Sư Thị Trường', desc: 'Không FOMO, không panic sell. Chỉ có nến và hơi thở.', price: 620, rarity: 'rare', icon: '🧘', value: 'Thiền Sư Thị Trường' },
    { id: 'title_sniper', type: 'title', category: 'Danh hiệu', name: 'Bắn Tỉa Nến Xanh', desc: 'Một phát trúng đích. Vào lệnh như gió, chốt lời như sấm.', price: 730, rarity: 'rare', icon: '🎯', value: 'Bắn Tỉa Nến Xanh' },
    { id: 'title_banker', type: 'title', category: 'Danh hiệu', name: 'Trùm Bank', desc: 'Cổ phiếu ngân hàng chảy trong huyết quản. Nhìn bảng là thấy room tín dụng.', price: 950, rarity: 'epic', icon: '🏦', value: 'Trùm Bank' },
    { id: 'title_wolf', type: 'title', category: 'Danh hiệu', name: 'Sói Phố Wall', desc: 'Đánh hơi dòng tiền trước khi đám đông kịp mở bảng điện.', price: 1010, rarity: 'epic', icon: '🐺', value: 'Sói Phố Wall' },
    { id: 'title_shark', type: 'title', category: 'Danh hiệu', name: 'Cá Mập Bến Thành', desc: 'Một mình khuấy đảo thanh khoản. Giao dịch như cá mập, không nói nhiều.', price: 1230, rarity: 'epic', icon: '🦈', value: 'Cá Mập Bến Thành' },
    { id: 'title_whale', type: 'title', category: 'Danh hiệu', name: 'Cá Voi Crypto', desc: 'Ví của bạn làm cả blockchain rung chuyển. HODL là tôn giáo.', price: 1790, rarity: 'legendary', icon: '🐋', value: 'Cá Voi Crypto' },
    { id: 'title_moon', type: 'title', category: 'Danh hiệu', name: 'Người Đưa Tàu Lên Trăng', desc: 'Mua dưới, bán trên. Không cần giải thích. Tàu đã rời bến.', price: 2240, rarity: 'legendary', icon: '🚀', value: 'Người Đưa Tàu Lên Trăng' },
    { id: 'title_legend', type: 'title', category: 'Danh hiệu', name: 'Huyền Thoại Sàn', desc: 'Tên bạn được nhắc trong mọi hội nhóm. Bảng điện đổi màu vì bạn.', price: 3360, rarity: 'mythic', icon: '👑', value: 'Huyền Thoại Sàn' },

    // Frames
    { id: 'frame_none', type: 'frame', category: 'Khung avatar', name: 'Tối Giản', desc: 'Sạch sẽ và tinh tế. Không cần phô trương.', price: 10, rarity: 'common', icon: '⚪', value: 'none', defaultValue: true },
    { id: 'frame_minimal', type: 'frame', category: 'Khung avatar', name: 'Viền Bạc', desc: 'Một đường viền mảnh, đủ để người khác phải nhìn lại.', price: 280, rarity: 'common', icon: '🩶', value: 'minimal' },
    { id: 'frame_emerald', type: 'frame', category: 'Khung avatar', name: 'Lục Bảo', desc: 'Sắc xanh của nến tăng phủ quanh avatar của bạn.', price: 450, rarity: 'rare', icon: '💚', value: 'emerald' },
    { id: 'frame_neon', type: 'frame', category: 'Khung avatar', name: 'Neon Cyber', desc: 'Hào quang tím neon như một terminal tương lai.', price: 840, rarity: 'epic', icon: '🟣', value: 'neon' },
    { id: 'frame_gold', type: 'frame', category: 'Khung avatar', name: 'Hoàng Kim', desc: 'Viền vàng ánh kim — dấu hiệu của người không thiếu Aura.', price: 950, rarity: 'epic', icon: '✨', value: 'gold' },
    { id: 'frame_fire', type: 'frame', category: 'Khung avatar', name: 'Lửa Phượng Hoàng', desc: 'Bạn không mua đỉnh, bạn tạo ra đỉnh. Ngọn lửa bất diệt.', price: 1340, rarity: 'legendary', icon: '🔥', value: 'fire' },
    { id: 'frame_aurora', type: 'frame', category: 'Khung avatar', name: 'Cực Quang', desc: 'Một dải sáng xoay quanh avatar, đẹp như chart ở khung 1W.', price: 2020, rarity: 'mythic', icon: '🌌', value: 'aurora' },
    { id: 'frame_rainbow', type: 'frame', category: 'Khung avatar', name: 'Cầu Vồng Tài Lộc', desc: 'Sau cơn mưa, tài khoản lại xanh. Dành cho người đã đi qua mùa đông crypto.', price: 2460, rarity: 'mythic', icon: '🌈', value: 'rainbow' },

    // Themes
    { id: 'theme_midnight', type: 'theme', category: 'Giao diện', name: 'Midnight Gold', desc: 'Đen sâu thẳm, vàng hoàng gia. Giao diện mặc định của AURELIS.', price: 10, rarity: 'common', icon: '🌙', value: 'midnight', defaultValue: true },
    { id: 'theme_ocean', type: 'theme', category: 'Giao diện', name: 'Deep Ocean', desc: 'Xanh đại dương sâu, ánh cyan lạnh. Tập trung, tĩnh lặng, sắc bén.', price: 1120, rarity: 'rare', icon: '🌊', value: 'ocean' },
    { id: 'theme_arctic', type: 'theme', category: 'Giao diện', name: 'Arctic Ice', desc: 'Sắc băng trắng xanh, phù hợp với những phiên giao dịch “lạnh đầu”.', price: 1120, rarity: 'rare', icon: '❄️', value: 'arctic' },
    { id: 'theme_matrix', type: 'theme', category: 'Giao diện', name: 'Matrix Green', desc: 'Bảng điện xanh lá trên nền đen. Nhìn đâu cũng ra tín hiệu mua.', price: 1340, rarity: 'epic', icon: '🟩', value: 'matrix' },
    { id: 'theme_sakura', type: 'theme', category: 'Giao diện', name: 'Sakura', desc: 'Hồng anh đào dịu dàng. Giao dịch cũng cần lãng mạn một chút.', price: 1460, rarity: 'epic', icon: '🌸', value: 'sakura' },
    { id: 'theme_ember', type: 'theme', category: 'Giao diện', name: 'Ember', desc: 'Than hồng và đồng đỏ — dành cho người thích cảm giác cháy bỏng.', price: 1570, rarity: 'legendary', icon: '🔥', value: 'ember' },
    { id: 'theme_royal', type: 'theme', category: 'Giao diện', name: 'Royal Purple', desc: 'Tím hoàng gia, sang trọng và bí ẩn như một quỹ đầu cơ kín tiếng.', price: 1680, rarity: 'legendary', icon: '🔮', value: 'royal' },

    // Perks
    { id: 'perk_lens', type: 'perk', category: 'Nâng cấp', name: 'Kính Lúp AURA', desc: 'Mở khoá cột OHLC chi tiết trong bảng thị trường. Nhìn sâu hơn số đông.', price: 340, rarity: 'common', icon: '🔍' },
    { id: 'perk_watchlist', type: 'perk', category: 'Nâng cấp', name: 'Watchlist Mở Rộng', desc: 'Tăng sức chứa danh sách yêu thích từ 10 lên 25 mã.', price: 390, rarity: 'rare', icon: '⭐' },
    { id: 'perk_alerts', type: 'perk', category: 'Nâng cấp', name: 'Chuông Báo Giá Pro', desc: 'Tăng số cảnh báo giá hoạt động cùng lúc từ 3 lên 8.', price: 500, rarity: 'rare', icon: '🔔' },
    { id: 'perk_scanner', type: 'perk', category: 'Nâng cấp', name: 'Nhiệt Kế Dòng Tiền', desc: 'Mở khoá bảng phát hiện dòng tiền bất thường trên trang Tổng quan.', price: 730, rarity: 'epic', icon: '📡' },
    { id: 'boost_xp', type: 'consumable', category: 'Nâng cấp', name: 'Gói XP ×2 · 24h', desc: 'Nhân đôi XP kiếm được trong 24 giờ. Có thể cộng dồn thời gian.', price: 390, rarity: 'epic', icon: '⚡', value: 'xp2', consumable: true },
    { id: 'boost_coffee', type: 'consumable', category: 'Nâng cấp', name: 'Cà Phê Trader · 6h', desc: 'Tăng thêm 50% XP trong 6 giờ. Uống một ngụm, nhìn nến rõ hơn.', price: 170, rarity: 'rare', icon: '☕', value: 'coffee', consumable: true },

    // Pets / effects
    { id: 'fx_confetti', type: 'effect', category: 'Hiệu ứng', name: 'Confetti Chiến Thắng', desc: 'Bắn confetti mỗi khi chốt lời thành công. Niềm vui phải được nhìn thấy.', price: 340, rarity: 'rare', icon: '🎉' },
    { id: 'fx_glow', type: 'effect', category: 'Hiệu ứng', name: 'Hào Quang Danh Vọng', desc: 'Avatar toả sáng nhẹ như một ngôi sao trên bảng xếp hạng.', price: 500, rarity: 'epic', icon: '🌟' },
    { id: 'pet_cat', type: 'pet', category: 'Hiệu ứng', name: 'Mèo Vàng May Mắn', desc: 'Một chú mèo vàng ngồi cạnh số dư của bạn. Không đảm bảo lợi nhuận, chỉ đảm bảo dễ thương.', price: 560, rarity: 'epic', icon: '🐈', value: '🐈' },
    { id: 'fx_rain', type: 'effect', category: 'Hiệu ứng', name: 'Mưa Aura', desc: 'Những hạt sáng vàng lấp lánh rơi chậm phía sau giao diện.', price: 730, rarity: 'epic', icon: '✨' },
    { id: 'fx_particles', type: 'effect', category: 'Hiệu ứng', name: 'Mưa Nến Xanh', desc: 'Nến xanh trôi lơ lửng trong nền. Tâm lý tích cực, nhưng đừng chủ quan.', price: 1010, rarity: 'legendary', icon: '🕯️' },
    { id: 'pet_dragon', type: 'pet', category: 'Hiệu ứng', name: 'Rồng Bạc', desc: 'Rồng bạc canh giữ danh mục của bạn. Chỉ để đẹp, không phải lời khuyên đầu tư.', price: 2020, rarity: 'legendary', icon: '🐉', value: '🐉' },

    // v1.13 · Bộ sưu tập mở rộng
    { id: 'title_coinchef', type: 'title', category: 'Danh hiệu', name: 'Đầu Bếp Tạo Coin', desc: 'Bạn nêm hype, thêm thanh khoản rồi bán cho người đến sau. Món ăn lúc nào cũng có người ăn.', price: 1250, rarity: 'epic', icon: '🍳', value: 'Đầu Bếp Tạo Coin' },
    { id: 'title_burner', type: 'title', category: 'Danh hiệu', name: 'Trưởng Lò Đốt', desc: 'Bạn tin vào sự khan hiếm. Mỗi lần đốt token, nguồn cung lại nhỏ đi một chút.', price: 1450, rarity: 'legendary', icon: '🔥', value: 'Trưởng Lò Đốt' },
    { id: 'title_airdrop', type: 'title', category: 'Danh hiệu', name: 'Ông Trùm Airdrop', desc: 'Phát token như phát kẹo, miễn là cộng đồng còn nhớ tên bạn.', price: 1350, rarity: 'epic', icon: '🪂', value: 'Ông Trùm Airdrop' },

    { id: 'frame_coin', type: 'frame', category: 'Khung avatar', name: 'Viền Xu Vàng', desc: 'Một vòng xu vàng quanh avatar. Dành cho người thích nghe tiếng lẻng kẻng.', price: 600, rarity: 'rare', icon: '🪙', value: 'coin' },
    { id: 'frame_toxic', type: 'frame', category: 'Khung avatar', name: 'Xanh Độc', desc: 'Hào quang xanh axit như một chart pump không có thanh khoản.', price: 950, rarity: 'epic', icon: '☢️', value: 'toxic' },
    { id: 'frame_void', type: 'frame', category: 'Khung avatar', name: 'Hố Đen', desc: 'Ánh sáng bị bẻ cong quanh avatar. Cũng giống như tiền của người mua đỉnh.', price: 1750, rarity: 'legendary', icon: '🕳️', value: 'void' },

    { id: 'theme_matcha', type: 'theme', category: 'Giao diện', name: 'Matcha', desc: 'Xanh trà nhẹ, dịu mắt và bình tĩnh. Dành cho người muốn giữ đầu lạnh.', price: 1200, rarity: 'epic', icon: '🍵', value: 'matcha' },
    { id: 'theme_obsidian', type: 'theme', category: 'Giao diện', name: 'Obsidian', desc: 'Đen đá núi lửa, viền bạc lạnh. Tối giản đến mức khó gần.', price: 1700, rarity: 'legendary', icon: '⚫', value: 'obsidian' },

    { id: 'fx_petals', type: 'effect', category: 'Hiệu ứng', name: 'Mưa Cánh Hoa', desc: 'Những cánh hoa hồng rơi chậm phía sau giao diện. Không làm giá tăng, chỉ làm tâm trạng tăng.', price: 550, rarity: 'rare', icon: '🌸' },
    { id: 'fx_coins', type: 'effect', category: 'Hiệu ứng', name: 'Mưa Xu', desc: 'Xu vàng lấp lánh rơi trong nền. Tiền ảo vẫn là tiền ảo, nhưng nhìn thì vui.', price: 850, rarity: 'epic', icon: '🪙' },

    { id: 'pet_owl', type: 'pet', category: 'Hiệu ứng', name: 'Cú Mèo Canh Sổ', desc: 'Một chú cú vàng thức đêm canh danh mục. Nó không khuyên bạn mua đỉnh, đáng tin hơn nhiều người.', price: 750, rarity: 'epic', icon: '🦉', value: '🦉' },
    { id: 'pet_fox', type: 'pet', category: 'Hiệu ứng', name: 'Cáo Nhỏ Tinh Nghịch', desc: 'Chú cáo nhỏ luôn tìm cách lẻn vào giỏ hàng của bạn. Chỉ để đẹp thôi.', price: 950, rarity: 'epic', icon: '🦊', value: '🦊' },

    { id: 'perk_coin_fee', type: 'perk', category: 'Xưởng Coin', name: 'Thẻ Xưởng Coin', desc: 'Giảm phí giao dịch coin từ 1% xuống 0,75%. Mỗi lệnh nhỏ cũng tiết kiệm dần.', price: 980, rarity: 'epic', icon: '🎟️' },
    { id: 'perk_coin_creator', type: 'perk', category: 'Xưởng Coin', name: 'Bộ Đàm Creator', desc: 'Chi phí chạy bài giảm 25%, mọi hành động creator hồi nhanh hơn 25%.', price: 1250, rarity: 'legendary', icon: '📻' }
  ];

  /* ------------------------- ACHIEVEMENTS ------------------------- */
  const ACHIEVEMENTS = [
    { id: 'first_trade', name: 'Bước chân đầu tiên', desc: 'Thực hiện lệnh giao dịch đầu tiên.', icon: '👣', aura: 200, xp: 60, metric: 'trades', goal: 1, rarity: 'common' },
    { id: 'trader_10', name: 'Tay Giao Dịch', desc: 'Thực hiện 10 lệnh giao dịch.', icon: '🖐️', aura: 350, xp: 120, metric: 'trades', goal: 10, rarity: 'rare' },
    { id: 'trader_50', name: 'Lão Làng Bảng Điện', desc: 'Thực hiện 50 lệnh giao dịch.', icon: '🧓', aura: 800, xp: 300, metric: 'trades', goal: 50, rarity: 'epic' },
    { id: 'profit_10m', name: 'Mùi Vị Lợi Nhuận', desc: 'Lãi thực hiện đạt 10 triệu ₫.', icon: '💵', aura: 300, xp: 120, metric: 'realized', goal: 10000000, rarity: 'rare' },
    { id: 'profit_100m', name: 'Nhà Đầu Tư Thực Thụ', desc: 'Lãi thực hiện đạt 100 triệu ₫.', icon: '💰', aura: 1000, xp: 400, metric: 'realized', goal: 100000000, rarity: 'legendary' },
    { id: 'crypto_first', name: 'Bước Vào Web3', desc: 'Giao dịch coin lần đầu tiên.', icon: '₿', aura: 250, xp: 100, metric: 'crypto_trades', goal: 1, rarity: 'rare' },
    { id: 'futures_first', name: 'Đòn Bẩy Đầu Tiên', desc: 'Mở một vị thế phái sinh.', icon: '⚡', aura: 300, xp: 120, metric: 'futures_trades', goal: 1, rarity: 'rare' },
    { id: 'diversity_5', name: 'Danh Mục Đa Sắc', desc: 'Nắm giữ 5 tài sản cùng lúc.', icon: '🌈', aura: 300, xp: 130, metric: 'holdings_count', goal: 5, rarity: 'rare' },
    { id: 'draw_10', name: 'Họa Sĩ Nến', desc: 'Tạo 10 nét vẽ trên biểu đồ.', icon: '🎨', aura: 350, xp: 150, metric: 'drawings', goal: 10, rarity: 'epic' },
    { id: 'lesson_3', name: 'Người Ham Học', desc: 'Hoàn thành 3 bài học.', icon: '📚', aura: 400, xp: 180, metric: 'lessons', goal: 3, rarity: 'epic' },
    { id: 'streak_3', name: 'Chuỗi 3 Ngày', desc: 'Điểm danh 3 ngày liên tiếp.', icon: '🔥', aura: 450, xp: 200, metric: 'streak', goal: 3, rarity: 'epic' },
    { id: 'level_5', name: 'Tay Chơi Hạng Nặng', desc: 'Đạt cấp độ 5.', icon: '⚔️', aura: 600, xp: 0, metric: 'level', goal: 5, rarity: 'epic' },
    { id: 'collector_5', name: 'Nhà Sưu Tầm', desc: 'Sở hữu 5 vật phẩm trong shop.', icon: '🏺', aura: 500, xp: 200, metric: 'items', goal: 5, rarity: 'epic' },
    { id: 'alert_3', name: 'Mắt Đại Bàng', desc: 'Tạo 3 cảnh báo giá.', icon: '🦅', aura: 200, xp: 100, metric: 'alerts', goal: 3, rarity: 'rare' },
    { id: 'backtest_first', name: 'Khoa Học Gia', desc: 'Chạy thử một chiến lược backtest.', icon: '🧪', aura: 250, xp: 120, metric: 'backtests', goal: 1, rarity: 'rare' },
    { id: 'all_groups', name: 'Đa Vũ Trụ', desc: 'Nắm giữ tài sản từ 3 nhóm thị trường trở lên.', icon: '🪐', aura: 600, xp: 250, metric: 'groups_held', goal: 3, rarity: 'legendary' },
    { id: 'detective_first', name: 'Manh Mối Đầu Tiên', desc: 'Giải đúng vụ án đầu tiên ở AURA Detective.', icon: '🔍', aura: 250, xp: 100, metric: 'detective_solved', goal: 1, rarity: 'rare' },
    { id: 'detective_10', name: 'Mắt Nến', desc: 'Giải đúng 10 vụ án biểu đồ.', icon: '🕵️', aura: 650, xp: 260, metric: 'detective_solved', goal: 10, rarity: 'epic' },
    { id: 'detective_streak_5', name: 'Chuỗi Suy Luận', desc: 'Đạt chuỗi 5 phán đoán đúng liên tiếp.', icon: '🧠', aura: 500, xp: 210, metric: 'detective_streak', goal: 5, rarity: 'epic' },
    { id: 'savings_first', name: 'Ngân Hàng Đầu Tiên', desc: 'Gửi khoản tiết kiệm đầu tiên.', icon: '🏦', aura: 250, xp: 100, metric: 'savings_deposits', goal: 1, rarity: 'rare' },
    { id: 'savings_100m', name: 'Quỹ Dự Phòng', desc: 'Tổng tiền đã gửi tích lũy đạt 100 triệu ₫.', icon: '💵', aura: 600, xp: 220, metric: 'savings_deposited', goal: 100000000, rarity: 'epic' },
    { id: 'savings_gold', name: 'Người Giữ Vàng', desc: 'Mua vàng tích lũy lần đầu.', icon: '🪙', aura: 300, xp: 120, metric: 'savings_gold', goal: 1, rarity: 'rare' },
    { id: 'savings_multi', name: 'Đa Tiền Tệ', desc: 'Nắm giữ sản phẩm tích lũy ở 2 loại tiền tệ trở lên.', icon: '🌐', aura: 450, xp: 180, metric: 'savings_currencies', goal: 2, rarity: 'epic' },
    { id: 'job_first', name: 'Ca Làm Đầu Tiên', desc: 'Hoàn thành ca làm việc đầu tiên tại AURELIS Jobs.', icon: '💼', aura: 250, xp: 100, metric: 'job_shifts', goal: 1, rarity: 'rare' },
    { id: 'job_10', name: 'Người Chăm Chỉ', desc: 'Hoàn thành 10 ca làm việc.', icon: '🛠️', aura: 650, xp: 260, metric: 'job_shifts', goal: 10, rarity: 'epic' },
    { id: 'job_earn_50m', name: 'Thu Nhập Ngoài', desc: 'Kiếm 50 triệu ₫ từ các ca làm việc.', icon: '💰', aura: 700, xp: 280, metric: 'job_earned', goal: 50000000, rarity: 'epic' },
    { id: 'auction_first', name: 'Tay Đấu Giá', desc: 'Thắng phiên đấu giá đầu tiên và nhận cổ phần.', icon: '🔨', aura: 300, xp: 120, metric: 'auction_wins', goal: 1, rarity: 'rare' },
    { id: 'auction_3', name: 'Săn Cổ Phần', desc: 'Thắng 3 phiên đấu giá.', icon: '🏆', aura: 800, xp: 320, metric: 'auction_wins', goal: 3, rarity: 'legendary' },
    { id: 'auction_save_20m', name: 'Mua Dưới Giá Trị', desc: 'Tiết kiệm 20 triệu ₫ so với giá thị trường khi thắng đấu giá.', icon: '🎯', aura: 600, xp: 240, metric: 'auction_saved', goal: 20000000, rarity: 'epic' }
  ];

  /* ------------------- v1.12: THÀNH TỰU PRIME & ARCADE ------------------- */
  const ACHIEVEMENTS_V12 = [
    { id: 'prime_open', name: 'Tài Khoản PRIME', desc: 'Mở tài khoản đầu tư thực mô phỏng PRIME.', icon: '💎', aura: 350, xp: 140, metric: 'prime_active', goal: 1, rarity: 'rare' },
    { id: 'prime_first_fill', name: 'Khớp Lệnh Đầu Tiên', desc: 'Khớp lệnh đầu tiên tại PRIME.', icon: '🧾', aura: 300, xp: 120, metric: 'prime_fills', goal: 1, rarity: 'rare' },
    { id: 'prime_10_fills', name: 'Nhà Đầu Tư Có Kỷ Luật', desc: 'Khớp 10 lệnh tại PRIME.', icon: '📚', aura: 700, xp: 280, metric: 'prime_fills', goal: 10, rarity: 'epic' },
    { id: 'prime_profit_20m', name: 'Alpha Thực Sự', desc: 'Lãi thực hiện tại PRIME đạt 20 triệu ₫.', icon: '📈', aura: 900, xp: 360, metric: 'prime_realized', goal: 20000000, rarity: 'legendary' },
    { id: 'prime_diversify_4', name: 'Danh Mục PRIME', desc: 'Nắm giữ 4 mã tại PRIME cùng lúc.', icon: '🧺', aura: 550, xp: 220, metric: 'prime_holdings', goal: 4, rarity: 'epic' },
    { id: 'prime_settled', name: 'Hiểu T+2', desc: 'Hoàn tất khoản quyết toán bán đầu tiên tại PRIME.', icon: '⏳', aura: 350, xp: 140, metric: 'prime_settlements', goal: 1, rarity: 'rare' },
    { id: 'arcade_first', name: 'Bước Vào Arcade', desc: 'Chơi một lượt trong AURELIS Arcade.', icon: '🕹️', aura: 250, xp: 100, metric: 'arcade_plays', goal: 1, rarity: 'rare' },
    { id: 'arcade_10', name: 'Game Thủ Tài Chính', desc: 'Chơi 10 lượt Arcade.', icon: '🎮', aura: 650, xp: 260, metric: 'arcade_plays', goal: 10, rarity: 'epic' },
    { id: 'deal_first', name: 'Chốt Thương Vụ', desc: 'Hoàn tất một thương vụ M&A có lãi tại Deal Room.', icon: '🤝', aura: 400, xp: 160, metric: 'arcade_deal_wins', goal: 1, rarity: 'rare' },
    { id: 'deal_3', name: 'Nhà Tư Vấn M&A', desc: 'Chốt 3 thương vụ M&A có lãi.', icon: '🏛️', aura: 850, xp: 340, metric: 'arcade_deal_wins', goal: 3, rarity: 'legendary' },
    { id: 'fund_best_15', name: 'Alpha Hedge Fund', desc: 'Đạt lợi nhuận một lượt Hedge Fund từ 15% trở lên.', icon: '📊', aura: 700, xp: 280, metric: 'arcade_fund_best', goal: 15, rarity: 'epic' },
    { id: 'startup_exit', name: 'Thoát Hàng Thành Công', desc: 'Đưa một startup tới vòng exit có lãi tại Startup Studio.', icon: '🚀', aura: 750, xp: 300, metric: 'arcade_startup_exits', goal: 1, rarity: 'epic' },
    { id: 'startup_5x', name: 'Kỳ Lân Trong Tầm Tay', desc: 'Đạt tỷ lệ exit từ 5× vốn định giá ban đầu.', icon: '🦄', aura: 1200, xp: 480, metric: 'arcade_startup_best', goal: 5, rarity: 'legendary' },
    { id: 'duel_first', name: 'Thắng Nến Đầu Tiên', desc: 'Đánh bại một bot trong Candle Duel.', icon: '🕯️', aura: 350, xp: 140, metric: 'arcade_duel_wins', goal: 1, rarity: 'rare' },
    { id: 'duel_streak_3', name: 'Chuỗi Nến Thắng', desc: 'Thắng 3 trận Candle Duel liên tiếp.', icon: '🔥', aura: 700, xp: 280, metric: 'arcade_duel_streak_best', goal: 3, rarity: 'epic' },
    { id: 'arcade_profit_50m', name: 'Ông Trùm Giải Trí', desc: 'Tổng lợi nhuận từ Arcade đạt 50 triệu ₫.', icon: '💰', aura: 1000, xp: 400, metric: 'arcade_profit', goal: 50000000, rarity: 'legendary' }
  ];
  ACHIEVEMENTS.push(...ACHIEVEMENTS_V12);

  /* ------------------- v1.13: THÀNH TỰU XƯỞNG COIN ------------------- */
  const ACHIEVEMENTS_V13 = [
    { id: 'coin_first_trade', name: 'Tay Chơi Meme', desc: 'Mua hoặc bán một coin trong Xưởng Coin.', icon: '🐕', aura: 300, xp: 120, metric: 'coin_trades', goal: 1, rarity: 'rare' },
    { id: 'coin_creator', name: 'Xưởng Trưởng', desc: 'Tự phát hành một coin trong game.', icon: '🛠️', aura: 500, xp: 200, metric: 'coins_created', goal: 1, rarity: 'epic' },
    { id: 'coin_trades_10', name: 'Lướt Sóng Niềm Tin', desc: 'Thực hiện 10 lệnh coin.', icon: '🌊', aura: 650, xp: 260, metric: 'coin_trades', goal: 10, rarity: 'epic' },
    { id: 'coin_profit_10m', name: 'Chốt Lời Trước Đám Đông', desc: 'Lãi thực hiện từ coin đạt 10 triệu ₫.', icon: '💵', aura: 800, xp: 320, metric: 'coin_realized', goal: 10000000, rarity: 'epic' },
    { id: 'coin_value_100m', name: 'Danh Mục Niềm Tin', desc: 'Giá trị coin đang giữ đạt 100 triệu ₫.', icon: '🧺', aura: 900, xp: 360, metric: 'coin_value', goal: 100000000, rarity: 'legendary' },
    { id: 'coin_hype_90', name: 'Làm Nóng Cộng Đồng', desc: 'Đưa một coin do bạn tạo lên mức hype 90.', icon: '🔥', aura: 700, xp: 280, metric: 'coin_hype_best', goal: 90, rarity: 'epic' },
    { id: 'coin_creator_3', name: 'Ba Lần Ra Mắt', desc: 'Tạo 3 coin khác nhau.', icon: '🚀', aura: 850, xp: 340, metric: 'coins_created', goal: 3, rarity: 'legendary' },
    { id: 'coin_best_sell', name: 'Thoát Đỉnh', desc: 'Bán một coin với lãi từ 100% trở lên.', icon: '🎯', aura: 750, xp: 300, metric: 'coin_best_sell', goal: 100, rarity: 'epic' }
  ];
  ACHIEVEMENTS.push(...ACHIEVEMENTS_V13);

  const ACHIEVEMENTS_V14 = [
    { id: 'coin_burn_first', name: 'Lò Đốt Đầu Tiên', desc: 'Mua lại và đốt ít nhất một lượng token trong Xưởng Coin.', icon: '🔥', aura: 600, xp: 240, metric: 'coin_burned', goal: 1, rarity: 'rare' },
    { id: 'coin_burn_10m', name: 'Thiêu Rụi Nguồn Cung', desc: 'Đốt tổng cộng 10 triệu token.', icon: '🧨', aura: 950, xp: 380, metric: 'coin_burned', goal: 10000000, rarity: 'legendary' },
    { id: 'coin_airdrop_first', name: 'Phát Lộc Cộng Đồng', desc: 'Thực hiện một đợt airdrop token cho người giữ.', icon: '🪂', aura: 650, xp: 260, metric: 'coin_airdrops', goal: 1, rarity: 'epic' },
    { id: 'coin_lock_first', name: 'Khoá Chặt Thanh Khoản', desc: 'Khoá thanh khoản một coin do bạn tạo.', icon: '🔒', aura: 600, xp: 240, metric: 'coin_locks', goal: 1, rarity: 'rare' },
    { id: 'coin_lock_3', name: 'Ba Lần Cam Kết', desc: 'Khoá thanh khoản 3 lần.', icon: '⛓️', aura: 850, xp: 340, metric: 'coin_locks', goal: 3, rarity: 'epic' },
    { id: 'coin_buybacks_5', name: 'Tay To Cứu Giá', desc: 'Thực hiện 5 lần mua lại token.', icon: '💪', aura: 900, xp: 360, metric: 'coin_buybacks', goal: 5, rarity: 'epic' },
    { id: 'coin_holdings_5', name: 'Năm Chấm Niềm Tin', desc: 'Cùng lúc giữ 5 coin khác nhau.', icon: '🧺', aura: 800, xp: 320, metric: 'coin_holdings', goal: 5, rarity: 'epic' },
    { id: 'coin_creator_5m', name: 'Nghề Làm Creator', desc: 'Nhận 5 triệu ₫ phí creator từ các coin của bạn.', icon: '🪙', aura: 1100, xp: 420, metric: 'coin_creator_earned', goal: 5000000, rarity: 'legendary' }
  ];
  ACHIEVEMENTS.push(...ACHIEVEMENTS_V14);

  /* ------------------- v1.14: QUỸ MỞ, CỔ TỨC & SỰ KIỆN ------------------- */
  const ACHIEVEMENTS_V15 = [
    { id: 'fund_first', name: 'Người Góp Vốn', desc: 'Mua chứng chỉ quỹ lần đầu tiên.', icon: '🧺', aura: 350, xp: 140, metric: 'fund_buys', goal: 1, rarity: 'rare' },
    { id: 'fund_three', name: 'Đa Dạng Hoá Thật Sự', desc: 'Cùng lúc nắm giữ 3 quỹ khác nhau.', icon: '🌐', aura: 700, xp: 280, metric: 'fund_holdings', goal: 3, rarity: 'epic' },
    { id: 'fund_value_100m', name: 'Uỷ Thác Lớn', desc: 'Giá trị các quỹ đang nắm giữ đạt 100 triệu ₫.', icon: '💼', aura: 900, xp: 360, metric: 'fund_value', goal: 100000000, rarity: 'legendary' },
    { id: 'fund_profit_5m', name: 'Chọn Quỹ Đúng', desc: 'Lãi thực hiện từ quỹ đạt 5 triệu ₫.', icon: '🎯', aura: 800, xp: 320, metric: 'fund_realized', goal: 5000000, rarity: 'epic' },
    { id: 'dividend_first', name: 'Dòng Tiền Đầu Tiên', desc: 'Nhận kỳ cổ tức đầu tiên.', icon: '💵', aura: 300, xp: 120, metric: 'dividend_count', goal: 1, rarity: 'common' },
    { id: 'dividend_10', name: 'Mười Kỳ Đều Đặn', desc: 'Nhận 10 kỳ cổ tức.', icon: '📅', aura: 750, xp: 300, metric: 'dividend_count', goal: 10, rarity: 'epic' },
    { id: 'dividend_total_5m', name: 'Thu Nhập Thụ Động', desc: 'Tổng cổ tức đã nhận đạt 5 triệu ₫.', icon: '🌾', aura: 900, xp: 360, metric: 'dividend_total', goal: 5000000, rarity: 'legendary' },
    { id: 'dividend_drip', name: 'Tái Đầu Tư Tự Động', desc: 'Tái đầu tư ít nhất một kỳ cổ tức.', icon: '♻️', aura: 500, xp: 200, metric: 'dividend_reinvested', goal: 1, rarity: 'rare' },
    { id: 'event_witness', name: 'Người Đọc Tin Nhanh', desc: 'Chứng kiến 5 sự kiện thị trường trực tiếp.', icon: '📰', aura: 450, xp: 180, metric: 'events_seen', goal: 5, rarity: 'rare' },
    { id: 'event_trade', name: 'Giao Dịch Trong Tâm Bão', desc: 'Thực hiện giao dịch khi sự kiện thị trường đang diễn ra.', icon: '🌪️', aura: 600, xp: 240, metric: 'event_trades', goal: 1, rarity: 'epic' }
  ];
  ACHIEVEMENTS.push(...ACHIEVEMENTS_V15);


  /* ------------------------- QUESTS ------------------------- */
  const QUESTS = [
    { id: 'trade', title: 'Đặt 1 lệnh giao dịch', desc: 'Mua hoặc bán bất kỳ tài sản nào.', icon: '💸', aura: 60, xp: 50, metric: 'trade', goal: 1 },
    { id: 'watch', title: 'Thêm 2 mã yêu thích', desc: 'Nhấn ngôi sao ở bảng thị trường.', icon: '⭐', aura: 40, xp: 30, metric: 'watch', goal: 2 },
    { id: 'chart', title: 'Vẽ 1 công cụ lên chart', desc: 'Thử trendline, Fibonacci hoặc vẽ tay.', icon: '📐', aura: 50, xp: 45, metric: 'chart', goal: 1 },
    { id: 'portfolio', title: 'Ghé thăm danh mục', desc: 'Mở trang Danh mục và kiểm tra vị thế.', icon: '💼', aura: 30, xp: 20, metric: 'portfolio', goal: 1 },
    { id: 'lesson', title: 'Học 1 bài trong Học viện', desc: 'Đọc và trả lời đúng câu hỏi cuối bài.', icon: '🎓', aura: 70, xp: 60, metric: 'lesson', goal: 1 },
    { id: 'detective', title: 'Phá 1 vụ án biểu đồ', desc: 'Đọc đúng hướng giá ở AURA Detective.', icon: '🕵️', aura: 90, xp: 65, metric: 'detective', goal: 1 },
    { id: 'savings', title: 'Gửi 1 khoản tích lũy', desc: 'Mở tiết kiệm hoặc mua vàng tại Ngân hàng AURELIS.', icon: '🏦', aura: 80, xp: 55, metric: 'savings', goal: 1 },
    { id: 'work', title: 'Hoàn thành 1 ca làm', desc: 'Nhận việc tại AURELIS Jobs và hoàn thành ca làm.', icon: '💼', aura: 80, xp: 55, metric: 'work', goal: 1 },
    { id: 'auction', title: 'Tham gia 1 phiên đấu giá', desc: 'Đặt giá hoặc mua ngay một lot cổ phần.', icon: '🔨', aura: 90, xp: 60, metric: 'auction', goal: 1 }
  ];

  /* ------------------------- JOBS / CAREER ------------------------- */
  /* Mỗi nghề thuộc một lĩnh vực. Làm việc lặp lại sẽ tăng XP lĩnh vực,
     mở bậc thạo nghề và cộng % vào lương của mọi nghề cùng lĩnh vực. */
  const JOB_FIELDS = [
    { id: 'operations', name: 'Vận hành & dịch vụ', short: 'Vận hành', icon: '🛵', color: '#2ee6a6', desc: 'Giao vận, F&B và điều phối vận hành tại chỗ.' },
    { id: 'research', name: 'Phân tích & nghiên cứu', short: 'Nghiên cứu', icon: '📊', color: '#5ac8fa', desc: 'Đọc báo cáo, xây luận điểm và định giá doanh nghiệp.' },
    { id: 'client', name: 'Khách hàng & tư vấn', short: 'Tư vấn', icon: '🎧', color: '#b59cff', desc: 'Lắng nghe, giải thích rủi ro và thiết kế giải pháp tài chính.' },
    { id: 'technology', name: 'Công nghệ & sản phẩm', short: 'Công nghệ', icon: '💻', color: '#6cb8ff', desc: 'Xây dựng dashboard, API và công cụ dữ liệu tài chính.' },
    { id: 'media', name: 'Truyền thông & cộng đồng', short: 'Truyền thông', icon: '🎥', color: '#ff8fb1', desc: 'Truyền đạt thị trường có trách nhiệm và tương tác cộng đồng.' },
    { id: 'portfolio', name: 'Danh mục & đầu tư', short: 'Danh mục', icon: '🏛️', color: '#f3c56b', desc: 'Phân bổ vốn, tái cân bằng và bảo vệ lợi nhuận dài hạn.' },
    { id: 'quant', name: 'Quant & thống kê', short: 'Quant', icon: '🧪', color: '#c9a7ff', desc: 'Kiểm định mô hình, backtest và tìm lợi thế thống kê.' },
    { id: 'macro', name: 'Vĩ mô & thị trường', short: 'Vĩ mô', icon: '🌐', color: '#ff9f43', desc: 'Lãi suất, lạm phát, thanh khoản và khẩu vị rủi ro toàn cầu.' },
    { id: 'data', name: 'Dữ liệu tài chính', short: 'Dữ liệu', icon: '🗂️', color: '#4dd0e1', desc: 'Làm sạch, kiểm tra và diễn giải dữ liệu trước khi mô hình hoá.' },
    { id: 'credit', name: 'Tín dụng & xếp hạng', short: 'Tín dụng', icon: '🏦', color: '#6cb8ff', desc: 'Thẩm định dòng tiền, tài sản bảo đảm và khả năng trả nợ.' },
    { id: 'tax', name: 'Thuế & tuân thủ', short: 'Thuế', icon: '🧾', color: '#2ee6a6', desc: 'Tối ưu thuế hợp pháp và quản trị nghĩa vụ tài chính.' },
    { id: 'risk', name: 'Rủi ro & bảo hiểm', short: 'Rủi ro', icon: '🛡️', color: '#ff5d73', desc: 'Đo lường tổn thất, stress test và chuyển giao rủi ro.' },
    { id: 'deals', name: 'M&A & thương vụ', short: 'M&A', icon: '🤝', color: '#b59cff', desc: 'Định giá, cộng hưởng, thương lượng và hoàn tất giao dịch.' }
  ];

  const JOBS = [
    {
      id: 'shipper', title: 'Shipper AURELIS Express', company: 'AURELIS Express', tag: 'Giao hàng', icon: '🛵', color: '#2ee6a6', field: 'operations',
      level: 1, energy: 1, pay: 180000, xp: 18, aura: 8, cooldown: 25, task: 'timing', rounds: 3, speed: 0.78,
      desc: 'Giao đơn hàng qua các quận trung tâm. Canh đúng nhịp để giao nhanh, nhận tip cao hơn.',
      upgrade: { name: 'Xe điện giao hàng', cost: 1200000, bonus: 0.30, desc: '+30% thu nhập mỗi ca nhờ xe nhanh và ít tốn pin.' }
    },
    {
      id: 'barista', title: 'Barista Nến Xanh Coffee', company: 'Nến Xanh Coffee', tag: 'F&B', icon: '☕', color: '#f3c56b', field: 'operations',
      level: 1, energy: 1, pay: 210000, xp: 20, aura: 9, cooldown: 30, task: 'timing', rounds: 3, speed: 0.86,
      desc: 'Pha espresso và latte art trong giờ cao điểm. Canh thời điểm rót sữa để ly cà phê hoàn hảo.',
      upgrade: { name: 'Máy pha espresso Pro', cost: 1500000, bonus: 0.30, desc: '+30% thu nhập mỗi ca nhờ máy pha ổn định hơn.' }
    },
    {
      id: 'analyst', title: 'Thực tập phân tích', company: 'AURELIS Research', tag: 'Phân tích', icon: '📊', color: '#5ac8fa', field: 'research',
      level: 2, energy: 2, pay: 480000, xp: 32, aura: 16, cooldown: 45, task: 'choice', rounds: 3,
      desc: 'Đọc báo cáo, kiểm tra luận điểm đầu tư và trả lời nhanh cho quản lý quỹ.',
      upgrade: { name: 'Bộ dữ liệu Bloomberg', cost: 3000000, bonus: 0.35, desc: '+35% thu nhập mỗi ca nhờ dữ liệu nhanh và chính xác hơn.' },
      questions: [
        { q: 'P/E thấp hơn trung bình ngành thường gợi ý điều gì?', options: ['Cổ phiếu có thể đang rẻ hơn tương đối', 'Doanh nghiệp chắc chắn tăng trưởng', 'Giá cổ phiếu sẽ tăng ngay'], answer: 0, explain: 'P/E thấp chỉ là tương quan; cần kiểm tra chất lượng lợi nhuận và triển vọng.' },
        { q: 'Khi lợi suất trái phiếu chính phủ tăng mạnh, nhóm nào thường chịu áp lực?', options: ['Cổ phiếu tăng trưởng dài hạn', 'Cổ phiếu tiện ích phòng thủ', 'Tiền mặt'], answer: 0, explain: 'Lãi suất chiết khấu tăng làm hiện giá dòng tiền tương lai của cổ phiếu tăng trưởng giảm.' },
        { q: 'Dòng tiền tự do (FCF) dương liên tục cho thấy điều gì?', options: ['Doanh nghiệp tạo tiền sau đầu tư', 'Doanh nghiệp không có nợ', 'Doanh nghiệp luôn trả cổ tức'], answer: 0, explain: 'FCF dương là tiền còn lại sau chi đầu tư, có thể dùng trả nợ, mua lại cổ phiếu hoặc chia cổ tức.' },
        { q: 'Beta của một cổ phiếu bằng 1,4 nghĩa là gì?', options: ['Cổ phiếu biến động mạnh hơn thị trường khoảng 40%', 'Cổ phiếu luôn tăng 40% mỗi năm', 'Cổ phiếu có P/E 1,4'], answer: 0, explain: 'Beta đo độ nhạy với thị trường; beta 1,4 hàm ý biến động lớn hơn thị trường.' }
      ]
    },
    {
      id: 'support', title: 'Chuyên viên CSKH', company: 'AURELIS Care', tag: 'Chăm sóc khách hàng', icon: '🎧', color: '#b59cff', field: 'client',
      level: 2, energy: 1, pay: 360000, xp: 26, aura: 13, cooldown: 35, task: 'choice', rounds: 3,
      desc: 'Xử lý tin nhắn của nhà đầu tư mới. Bình tĩnh, rõ ràng và đúng quy trình là chìa khoá.',
      upgrade: { name: 'Tai nghe chống ồn', cost: 2000000, bonus: 0.30, desc: '+30% thu nhập mỗi ca nhờ xử lý cuộc gọi nhanh hơn.' },
      questions: [
        { q: 'Khách hàng hoảng loạn vì danh mục giảm 8%. Phản hồi nào phù hợp nhất?', options: ['Lắng nghe, giải thích biến động và hỏi mục tiêu đầu tư', 'Khuyên mua thêm ngay để gỡ', 'Nói rằng thị trường sẽ chắc chắn hồi'], answer: 0, explain: 'Cần hiểu mục tiêu và mức chịu rủi ro trước khi đưa ra bất kỳ hành động nào.' },
        { q: 'Khách hỏi “có chắc lãi không?”. Câu trả lời đúng là:', options: ['Không có khoản đầu tư nào đảm bảo lãi', 'Chắc chắn, vì đây là blue-chip', 'Chỉ cần nắm giữ 1 tuần'], answer: 0, explain: 'Không được hứa hẹn lợi nhuận; cần nêu rõ rủi ro và kỳ hạn.' },
        { q: 'Khi chưa chắc về một sản phẩm, bạn nên:', options: ['Ghi nhận câu hỏi và kiểm tra với bộ phận chuyên môn', 'Tự suy đoán để trả lời ngay', 'Chuyển máy mà không báo'], answer: 0, explain: 'Độ chính xác quan trọng hơn tốc độ; hứa hẹn sai gây rủi ro lớn.' },
        { q: 'Một khách muốn rút toàn bộ tiết kiệm trước hạn. Bạn nên:', options: ['Giải thích phí/rủi ro trước hạn rồi xác nhận', 'Từ chối vì đã gửi', 'Tự động gia hạn thay khách'], answer: 0, explain: 'Cần minh bạch điều khoản và để khách quyết định sau khi hiểu rõ.' }
      ]
    },
    {
      id: 'dev', title: 'Lập trình viên freelance', company: 'AURELIS Labs', tag: 'Công nghệ', icon: '💻', color: '#6cb8ff', field: 'technology',
      level: 3, energy: 2, pay: 780000, xp: 42, aura: 22, cooldown: 50, task: 'choice', rounds: 3,
      desc: 'Sửa bug dashboard, tối ưu API và review code. Càng ít lỗi, khách càng trả cao.',
      upgrade: { name: 'Màn hình 4K + GPU', cost: 6000000, bonus: 0.40, desc: '+40% thu nhập mỗi ca nhờ build nhanh và debug hiệu quả.' },
      questions: [
        { q: 'API trả về dữ liệu giá chậm 3 giây. Cải thiện nào hợp lý nhất?', options: ['Thêm cache và nén payload', 'Tăng font-size giao diện', 'Xoá toàn bộ dữ liệu lịch sử'], answer: 0, explain: 'Cache và nén giảm độ trễ mạng mà không mất dữ liệu.' },
        { q: 'Một bug chỉ xuất hiện trên mobile. Bạn nên kiểm tra gì trước?', options: ['Viewport, responsive CSS và sự kiện cảm ứng', 'Màu nền của desktop', 'Số lượng file JS'], answer: 0, explain: 'Bug theo thiết bị thường đến từ layout, touch event hoặc khác biệt trình duyệt.' },
        { q: 'Khi review code, ưu tiên nào quan trọng nhất?', options: ['Tính đúng đắn, bảo mật và khả năng bảo trì', 'Code càng ngắn càng tốt', 'Dùng thật nhiều thư viện'], answer: 0, explain: 'Code đúng và dễ bảo trì quan trọng hơn việc ngắn hay dùng nhiều công cụ.' },
        { q: 'Dữ liệu tài chính cần hiển thị theo thời gian thực. Cách nào phù hợp?', options: ['WebSocket hoặc polling có kiểm soát', 'Tải lại toàn bộ trang mỗi giây', 'Chỉ cập nhật khi mở lại trình duyệt'], answer: 0, explain: 'WebSocket hoặc polling hợp lý giúp cập nhật mà không phá trải nghiệm.' }
      ]
    },
    {
      id: 'chef', title: 'Bếp trưởng cloud kitchen', company: 'AURELIS Kitchen', tag: 'F&B', icon: '🍜', color: '#ff9f43', field: 'operations',
      level: 3, energy: 2, pay: 690000, xp: 38, aura: 20, cooldown: 45, task: 'timing', rounds: 3, speed: 0.94,
      desc: 'Điều phối 3 món trong giờ cao điểm. Canh lửa và thời điểm ra đĩa để không món nào nguội.',
      upgrade: { name: 'Bếp công nghiệp + sous-vide', cost: 5000000, bonus: 0.35, desc: '+35% thu nhập mỗi ca nhờ kiểm soát nhiệt độ và thời gian.' }
    },
    {
      id: 'streamer', title: 'Streamer tài chính', company: 'AURELIS Media', tag: 'Truyền thông', icon: '🎥', color: '#ff8fb1', field: 'media',
      level: 4, energy: 2, pay: 1100000, xp: 55, aura: 30, cooldown: 60, task: 'choice', rounds: 3,
      desc: 'Lên sóng phân tích thị trường. Giữ bình tĩnh, nói có trách nhiệm và tương tác với người xem.',
      upgrade: { name: 'Studio ánh sáng + mic', cost: 10000000, bonus: 0.45, desc: '+45% thu nhập mỗi ca nhờ chất lượng hình ảnh và âm thanh.' },
      questions: [
        { q: 'Một viewer hỏi “mã nào chắc chắn x2?”. Bạn nên:', options: ['Nói rõ không có gì chắc chắn và giải thích rủi ro', 'Đọc một mã bất kỳ để tăng tương tác', 'Hứa hẹn nếu họ donate'], answer: 0, explain: 'Người có ảnh hưởng phải tránh hứa hẹn lợi nhuận và nêu rõ rủi ro.' },
        { q: 'Tiêu đề nào đáng tin cậy nhất?', options: ['“Cách đọc báo cáo tài chính trong 5 phút”', '“Bí mật làm giàu không ai nói”', '“Mua ngay kẻo lỡ sóng thần”'], answer: 0, explain: 'Nội dung giáo dục, trung lập tạo uy tín dài hạn hơn clickbait.' },
        { q: 'Khi thị trường sập mạnh trên sóng, bạn nên:', options: ['Giữ bình tĩnh, cập nhật dữ kiện và khuyến nghị quản trị rủi ro', 'Hét lên để tăng view', 'Khuyên all-in bắt đáy'], answer: 0, explain: 'Bình tĩnh và quản trị rủi ro là thông điệp có ích trong biến động.' },
        { q: 'Một tài khoản lạ gửi link “lợi nhuận 30%/tháng”. Bạn nên:', options: ['Cảnh báo lừa đảo và không chia sẻ link', 'Thử trước rồi nói sau', 'Chia sẻ để lấy phí giới thiệu'], answer: 0, explain: 'Lợi nhuận cam kết cao bất thường là dấu hiệu lừa đảo phổ biến.' }
      ]
    },
    {
      id: 'fund', title: 'Chuyên gia quỹ đầu tư', company: 'AURELIS Capital', tag: 'Quản lý quỹ', icon: '🏛️', color: '#f3c56b', field: 'portfolio',
      level: 5, energy: 3, pay: 2100000, xp: 75, aura: 45, cooldown: 75, task: 'choice', rounds: 3,
      desc: 'Thuyết trình luận điểm đầu tư trước hội đồng quỹ. Số liệu, rủi ro và kỷ luật phải rõ ràng.',
      upgrade: { name: 'Bộ dữ liệu institutional', cost: 20000000, bonus: 0.50, desc: '+50% thu nhập mỗi ca nhờ mô hình định giá và dữ liệu độc quyền.' },
      questions: [
        { q: 'Một cổ phiếu giảm 30% nhưng luận điểm dài hạn vẫn còn. Bạn nên:', options: ['Kiểm tra lại luận điểm, định giá và sizing trước khi hành động', 'Bán ngay vì giá giảm', 'Mua gấp đôi không cần kiểm tra'], answer: 0, explain: 'Giá giảm không tự động làm luận điểm sai; cần kiểm tra dữ kiện và phân bổ vốn.' },
        { q: 'Cách tốt nhất để giảm rủi ro tập trung là:', options: ['Đa dạng hoá theo ngành và tương quan', 'Mua thêm cùng một mã', 'Dùng đòn bẩy cao hơn'], answer: 0, explain: 'Đa dạng hoá hiệu quả khi các tài sản không tương quan quá cao.' },
        { q: 'Khi backtest cho lợi nhuận đẹp bất thường, việc đầu tiên là:', options: ['Kiểm tra look-ahead bias và chi phí giao dịch', 'Tăng đòn bẩy ngay', 'Công bố kết quả'], answer: 0, explain: 'Backtest thường bị lạc quan do dùng dữ liệu tương lai hoặc bỏ qua chi phí.' },
        { q: 'Một vị thế lỗ vượt quá giới hạn rủi ro. Bạn nên:', options: ['Cắt lỗ theo kỷ luật đã đặt ra', 'Bình quân giá xuống không giới hạn', 'Tăng margin để giữ vị thế'], answer: 0, explain: 'Kỷ luật cắt lỗ bảo vệ vốn khỏi tổn thất không kiểm soát.' }
      ]
    },
    {
      id: 'equity_research', title: 'Chuyên viên phân tích cổ phiếu', company: 'AURELIS Research', tag: 'Equity Research', icon: '🔎', color: '#5ac8fa', field: 'research',
      level: 3, energy: 2, pay: 880000, xp: 46, aura: 25, cooldown: 50, task: 'choice', rounds: 4, topic: 'EQUITY RESEARCH · ĐỊNH GIÁ',
      desc: 'Xây dựng luận điểm đầu tư, mô hình định giá và bảo vệ khuyến nghị trước hội đồng đầu tư. Câu hỏi xoay quanh định giá, lợi thế cạnh tranh và chất lượng lợi nhuận.',
      upgrade: { name: 'Mô hình định giá 3 kịch bản', cost: 4500000, bonus: 0.38, desc: '+38% thu nhập mỗi ca nhờ mô hình base/bull/bear và dữ liệu ngành.' },
      questions: [
        { q: 'EV/EBITDA phù hợp nhất để so sánh các doanh nghiệp có đặc điểm nào?', options: ['Cùng mức thuế và cùng ngành', 'Khác cấu trúc vốn và khác mức khấu hao', 'Cùng số lượng cổ phiếu lưu hành'], answer: 1, explain: 'EV/EBITDA loại bỏ ảnh hưởng của cấu trúc vốn, thuế và khấu hao nên hữu ích khi so sánh các doanh nghiệp khác nhau về đòn bẩy.' },
        { q: 'Mô hình DCF thường nhạy nhất với cặp biến nào?', options: ['Tỷ lệ chiết khấu và tăng trưởng dài hạn', 'Số lượng nhân viên và số chi nhánh', 'Giá cổ phiếu hôm nay và khối lượng giao dịch'], answer: 0, explain: 'Hai giả định này ảnh hưởng trực tiếp đến giá trị hiện tại của dòng tiền xa trong tương lai.' },
        { q: 'Lợi thế cạnh tranh bền vững (moat) thường biểu hiện rõ nhất qua:', options: ['ROIC cao và ổn định qua nhiều chu kỳ', 'Doanh thu tăng trong một quý', 'Giá cổ phiếu tăng mạnh'], answer: 0, explain: 'Moat giúp doanh nghiệp duy trì lợi nhuận trên vốn cao hơn chi phí vốn trong thời gian dài.' },
        { q: 'Dấu hiệu nào cho thấy chất lượng lợi nhuận kém?', options: ['Lợi nhuận đến từ hoàn nhập dự phòng và bán tài sản', 'Dòng tiền hoạt động xấp xỉ lợi nhuận ròng', 'Biên lợi nhuận ổn định qua các năm'], answer: 0, explain: 'Lợi nhuận một lần không lặp lại không phản ánh sức tạo tiền của hoạt động kinh doanh cốt lõi.' },
        { q: 'Công ty phát hành thêm cổ phiếu để trả nợ. Điều gì thường xảy ra?', options: ['EPS bị pha loãng nếu lợi nhuận không tăng tương ứng', 'EPS luôn tăng', 'Giá cổ phiếu chắc chắn giảm'], answer: 0, explain: 'Số cổ phiếu tăng làm lợi nhuận trên mỗi cổ phiếu giảm nếu tổng lợi nhuận không tăng tương ứng.' },
        { q: 'Một báo cáo phân tích tốt nên có gì?', options: ['Luận điểm, rủi ro và các kịch bản định giá', 'Chỉ một con số giá mục tiêu', 'Tin đồn từ hội nhóm'], answer: 0, explain: 'Nhà đầu tư cần hiểu cả kịch bản cơ sở, kịch bản xấu và các yếu tố có thể làm luận điểm sai.' }
      ]
    },
    {
      id: 'portfolio_manager', title: 'Quản lý danh mục', company: 'AURELIS Capital', tag: 'Portfolio Management', icon: '🧭', color: '#2ee6a6', field: 'portfolio',
      level: 4, energy: 3, pay: 1520000, xp: 62, aura: 36, cooldown: 65, task: 'choice', rounds: 4, topic: 'PORTFOLIO MANAGEMENT · RỦI RO',
      desc: 'Điều phối tỷ trọng, tương quan và ngân sách rủi ro cho danh mục. Trả lời đúng các câu hỏi về lý thuyết danh mục và kỷ luật tái cân bằng.',
      upgrade: { name: 'Hệ thống rủi ro danh mục', cost: 15000000, bonus: 0.45, desc: '+45% thu nhập mỗi ca nhờ phân tích tương quan, drawdown và phân bổ rủi ro.' },
      questions: [
        { q: 'Sharpe ratio đo lường điều gì?', options: ['Lợi nhuận vượt trội trên mỗi đơn vị rủi ro tổng thể', 'Tỷ lệ lệnh thắng', 'Mức độ tập trung của danh mục'], answer: 0, explain: 'Sharpe = (lợi suất danh mục − lãi suất phi rủi ro) / độ lệch chuẩn của danh mục.' },
        { q: 'Tương quan giữa hai tài sản bằng −1 có ý nghĩa gì?', options: ['Biến động ngược chiều hoàn hảo, giúp giảm rủi ro danh mục', 'Hai tài sản không liên quan', 'Hai tài sản luôn cùng chiều'], answer: 0, explain: 'Tương quan âm hoàn hảo cho phép kết hợp hai tài sản để triệt tiêu một phần biến động.' },
        { q: 'Tái cân bằng danh mục định kỳ giúp:', options: ['Đưa tỷ trọng về mục tiêu và kiểm soát rủi ro', 'Đảm bảo lợi nhuận dương', 'Loại bỏ hoàn toàn biến động'], answer: 0, explain: 'Tái cân bằng kỷ luật giúp tránh danh mục trôi quá xa khỏi hồ sơ rủi ro đã chọn.' },
        { q: 'Tracking error của một quỹ đo:', options: ['Độ lệch chuẩn chênh lệch lợi suất so với benchmark', 'Phí quản lý quỹ', 'Số lượng cổ phiếu trong quỹ'], answer: 0, explain: 'Tracking error càng cao, quỹ càng lệch khỏi chỉ số tham chiếu.' },
        { q: 'Một vị thế chiếm 40% danh mục tạo ra rủi ro gì?', options: ['Rủi ro tập trung', 'Rủi ro lạm phát', 'Rủi ro thiếu tiền mặt'], answer: 0, explain: 'Tỷ trọng quá lớn ở một tài sản khiến kết quả danh mục phụ thuộc vào một biến số.' },
        { q: 'Beta danh mục 0,8 so với thị trường cho thấy:', options: ['Danh mục ít biến động hơn thị trường', 'Danh mục luôn thắng thị trường', 'Danh mục không có rủi ro'], answer: 0, explain: 'Beta dưới 1 hàm ý độ nhạy với thị trường thấp hơn mức trung bình.' }
      ]
    },
    {
      id: 'wealth_advisor', title: 'Chuyên viên quản lý tài sản', company: 'AURELIS Private Wealth', tag: 'Wealth Management', icon: '💎', color: '#f3c56b', field: 'client',
      level: 3, energy: 2, pay: 820000, xp: 44, aura: 24, cooldown: 50, task: 'choice', rounds: 4, topic: 'WEALTH MANAGEMENT · CÁ NHÂN',
      desc: 'Tư vấn hồ sơ rủi ro, quỹ khẩn cấp, bảo hiểm và mục tiêu tài chính cho khách hàng cá nhân. Mỗi câu trả lời là một nguyên tắc quản lý tài sản.',
      upgrade: { name: 'Bộ hồ sơ khách hàng số', cost: 4000000, bonus: 0.36, desc: '+36% thu nhập mỗi ca nhờ phân tích dòng tiền và mục tiêu tự động.' },
      questions: [
        { q: 'Quỹ khẩn cấp hợp lý thường bằng bao nhiêu tháng chi tiêu?', options: ['3 đến 6 tháng', '1 tuần', '5 năm'], answer: 0, explain: 'Quỹ khẩn cấp 3–6 tháng chi tiêu giúp tránh phải bán tài sản dài hạn khi có biến cố.' },
        { q: 'Hồ sơ rủi ro của khách hàng phụ thuộc chủ yếu vào:', options: ['Mục tiêu, kỳ hạn, thu nhập và mức chịu đựng rủi ro', 'Màu biểu đồ yêu thích', 'Số lượng mã đang hot trên mạng'], answer: 0, explain: 'Không có một danh mục tốt cho tất cả; hồ sơ rủi ro phải xuất phát từ hoàn cảnh và mục tiêu cụ thể.' },
        { q: 'Bảo hiểm nhân thọ phù hợp nhất với ai?', options: ['Người có người phụ thuộc và nghĩa vụ tài chính', 'Mọi người bất kể hoàn cảnh', 'Người chỉ gửi tiết kiệm'], answer: 0, explain: 'Bảo hiểm nhân thọ bảo vệ thu nhập của người trụ cột và những người phụ thuộc.' },
        { q: 'Khách có mục tiêu mua nhà trong 2 năm tới. Nên ưu tiên:', options: ['Kênh an toàn, thanh khoản cao', 'All-in crypto', 'Đòn bẩy tối đa'], answer: 0, explain: 'Mục tiêu ngắn hạn không nên gánh rủi ro biến động lớn vì thời gian phục hồi không đủ.' },
        { q: 'Đa dạng hoá tài sản giúp:', options: ['Giảm rủi ro riêng lẻ nhưng không loại bỏ rủi ro hệ thống', 'Đảm bảo không bao giờ lỗ', 'Tăng phí giao dịch là mục tiêu'], answer: 0, explain: 'Đa dạng hoá làm giảm rủi ro không hệ thống; rủi ro thị trường chung vẫn còn.' },
        { q: 'Kế hoạch tài chính cá nhân nên bắt đầu bằng:', options: ['Xác định mục tiêu và dòng tiền hiện tại', 'Chọn cổ phiếu tăng mạnh nhất', 'Vay margin để tối đa lợi nhuận'], answer: 0, explain: 'Mục tiêu và dòng tiền là nền tảng để chọn kênh đầu tư, kỳ hạn và mức rủi ro phù hợp.' }
      ]
    },
    {
      id: 'quant', title: 'Quant analyst', company: 'AURELIS Quant Lab', tag: 'Quant Finance', icon: '🧪', color: '#b59cff', field: 'quant',
      level: 4, energy: 3, pay: 1680000, xp: 66, aura: 38, cooldown: 70, task: 'choice', rounds: 4, topic: 'QUANT FINANCE · THỐNG KÊ',
      desc: 'Kiểm định mô hình, backtest và factor investing. Câu hỏi tập trung vào thống kê, độ tin cậy của chiến lược và các bẫy thường gặp.',
      upgrade: { name: 'Cụm GPU backtest', cost: 18000000, bonus: 0.48, desc: '+48% thu nhập mỗi ca nhờ chạy mô phỏng lớn và kiểm tra chéo nhanh hơn.' },
      questions: [
        { q: 'Look-ahead bias trong backtest là gì?', options: ['Dùng dữ liệu không có tại thời điểm ra quyết định', 'Bỏ qua phí giao dịch', 'Dùng quá nhiều mã trong danh mục'], answer: 0, explain: 'Look-ahead bias khiến kết quả đẹp giả tạo vì chiến lược nhìn thấy thông tin tương lai.' },
        { q: 'Overfitting xảy ra khi:', options: ['Mô hình học quá nhiều nhiễu trong dữ liệu quá khứ', 'Dữ liệu có quá ít cột', 'Mô hình có ít tham số'], answer: 0, explain: 'Mô hình quá phức tạp có thể khớp nhiễu và kém hiệu quả trên dữ liệu mới.' },
        { q: 'Factor momentum dựa trên:', options: ['Xu hướng tiếp diễn của lợi suất quá khứ', 'Giá trị sổ sách', 'Tỷ lệ cổ tức'], answer: 0, explain: 'Momentum khai thác xu hướng giá tiếp diễn trong một khoảng thời gian.' },
        { q: 'Độ lệch chuẩn của lợi suất đo:', options: ['Mức phân tán quanh lợi suất trung bình', 'Lợi nhuận trung bình', 'Số lượng giao dịch'], answer: 0, explain: 'Độ lệch chuẩn là thước đo rủi ro biến động phổ biến của lợi suất.' },
        { q: 'Sharpe ratio cao hơn có thể đến từ:', options: ['Lợi suất cao hơn hoặc rủi ro thấp hơn', 'Chắc chắn sinh lời', 'Không có drawdown'], answer: 0, explain: 'Sharpe là tỷ số giữa lợi nhuận vượt trội và rủi ro, nên cả hai phía đều ảnh hưởng.' },
        { q: 'Walk-forward analysis giúp:', options: ['Kiểm tra mô hình trên dữ liệu ngoài mẫu theo thời gian', 'Tăng đòn bẩy', 'Loại bỏ mọi rủi ro'], answer: 0, explain: 'Walk-forward mô phỏng quá trình huấn luyện và kiểm tra luân phiên, sát thực tế hơn một lần backtest.' }
      ]
    },
    {
      id: 'macro', title: 'Chiến lược gia vĩ mô', company: 'AURELIS Macro', tag: 'Macro Strategy', icon: '🌐', color: '#ff9f43', field: 'macro',
      level: 5, energy: 3, pay: 2350000, xp: 82, aura: 50, cooldown: 80, task: 'choice', rounds: 4, topic: 'MACRO STRATEGY · VĨ MÔ',
      desc: 'Đọc lãi suất, lạm phát, đường cong lợi suất và khẩu vị rủi ro toàn cầu. Đưa ra góc nhìn vĩ mô có thể bảo vệ danh mục.',
      upgrade: { name: 'Bảng dữ liệu vĩ mô toàn cầu', cost: 28000000, bonus: 0.52, desc: '+52% thu nhập mỗi ca nhờ dữ liệu liên thị trường và mô hình kịch bản.' },
      questions: [
        { q: 'Đường cong lợi suất đảo ngược thường báo hiệu:', options: ['Suy giảm tăng trưởng hoặc suy thoái tiềm năng', 'Lạm phát bằng 0', 'Giá vàng chắc chắn giảm'], answer: 0, explain: 'Đảo ngược đường cong phản ánh kỳ vọng tăng trưởng yếu và chính sách tiền tệ thắt chặt.' },
        { q: 'Fed tăng lãi suất thường gây áp lực lên:', options: ['Tài sản rủi ro và cổ phiếu tăng trưởng dài hạn', 'Crypto chắc chắn tăng', 'Không ảnh hưởng đến thị trường'], answer: 0, explain: 'Lãi suất chiết khấu tăng làm giảm hiện giá dòng tiền tương lai, đặc biệt với tài sản tăng trưởng.' },
        { q: 'Lạm phát cao kéo dài thường có lợi cho:', options: ['Tài sản thực như hàng hoá, vàng và bất động sản', 'Tiền mặt', 'Trái phiếu dài hạn'], answer: 0, explain: 'Tài sản thực thường giữ giá tốt hơn trong môi trường lạm phát cao.' },
        { q: 'USD mạnh thường gây áp lực lên:', options: ['Thị trường mới nổi và hàng hoá định giá bằng USD', 'Vàng chắc chắn tăng', 'Cổ phiếu Mỹ luôn giảm'], answer: 0, explain: 'USD mạnh làm chi phí vay và giá hàng hoá tính bằng USD trở nên đắt hơn với thị trường mới nổi.' },
        { q: 'PMI dưới 50 cho thấy:', options: ['Hoạt động sản xuất đang thu hẹp', 'Tăng trưởng rất mạnh', 'Lạm phát âm'], answer: 0, explain: 'PMI dưới ngưỡng 50 hàm ý số doanh nghiệp thu hẹp nhiều hơn mở rộng.' },
        { q: 'Khi VIX tăng mạnh, nhà đầu tư thường:', options: ['Giảm khẩu vị rủi ro và tìm tài sản trú ẩn', 'Tăng all-in', 'Bỏ qua mọi rủi ro'], answer: 0, explain: 'VIX tăng phản ánh lo ngại biến động tăng, thường đi kèm dòng tiền chuyển sang tài sản an toàn.' }
      ]
    },
    {
      id: 'financial_data', title: 'Chuyên viên dữ liệu tài chính', company: 'AURELIS Data Lab', tag: 'Financial Data', icon: '📊', color: '#5ac8fa', field: 'data',
      level: 2, energy: 2, pay: 460000, xp: 32, aura: 18, cooldown: 40, task: 'choice', rounds: 3, topic: 'FINANCIAL DATA · THỐNG KÊ',
      desc: 'Làm sạch dữ liệu giá, kiểm tra mẫu và đọc thống kê mô tả trước khi đưa vào mô hình. Câu hỏi về dữ liệu, sai lệch và cách đọc con số.',
      upgrade: { name: 'Pipeline dữ liệu tự động', cost: 2500000, bonus: 0.30, desc: '+30% thu nhập mỗi ca nhờ tự động chuẩn hoá giá và kiểm tra chất lượng dữ liệu.' },
      questions: [
        { q: 'Khi dữ liệu có vài giá trị ngoại lai rất lớn, thước đo trung tâm nào ít bị ảnh hưởng nhất?', options: ['Trung vị (median)', 'Trung bình cộng', 'Tổng giá trị'], answer: 0, explain: 'Trung vị chỉ phụ thuộc thứ hạng nên bền vững hơn trung bình cộng khi có ngoại lai.' },
        { q: 'Giá đóng cửa điều chỉnh (adjusted close) quan trọng vì:', options: ['Đã điều chỉnh chia tách và cổ tức để so sánh lợi suất', 'Luôn cao hơn giá thị trường', 'Loại bỏ hoàn toàn biến động'], answer: 0, explain: 'Giá điều chỉnh giúp chuỗi lợi suất không bị bóp méo bởi sự kiện chia tách hoặc trả cổ tức.' },
        { q: 'Survivorship bias trong dữ liệu quỹ xảy ra khi:', options: ['Chỉ giữ lại các quỹ còn tồn tại và bỏ qua quỹ đã đóng', 'Dùng quá nhiều quỹ', 'Tính lợi suất theo ngày'], answer: 0, explain: 'Bỏ qua quỹ đã đóng hoặc bị giải thể làm kết quả trung bình trông tốt hơn thực tế.' },
        { q: 'Tương quan dương mạnh giữa hai tài sản nghĩa là:', options: ['Chúng thường biến động cùng chiều', 'Chúng chắc chắn sinh lời', 'Chúng không có rủi ro'], answer: 0, explain: 'Tương quan dương cho thấy hai tài sản có xu hướng tăng giảm cùng lúc, giảm hiệu quả đa dạng hoá.' },
        { q: 'Một mẫu quá nhỏ để kết luận chiến lược có hiệu quả vì:', options: ['Kết quả dễ do may mắn và sai số lớn', 'Mẫu nhỏ luôn lỗ', 'Không thể tính lợi suất'], answer: 0, explain: 'Mẫu nhỏ có độ bất định cao; cần đủ quan sát và kiểm tra ngoài mẫu trước khi tin vào chiến lược.' },
        { q: 'P/E âm thường cho biết:', options: ['Doanh nghiệp đang lỗ hoặc EPS âm', 'Cổ phiếu chắc chắn rẻ', 'Công ty không có doanh thu'], answer: 0, explain: 'P/E chỉ có ý nghĩa khi lợi nhuận dương; P/E âm thường phản ánh thua lỗ và không dùng để so sánh định giá.' }
      ]
    },
    {
      id: 'credit_analyst', title: 'Chuyên viên phân tích tín dụng', company: 'AURELIS Credit', tag: 'Credit Analysis', icon: '🏦', color: '#6cb8ff', field: 'credit',
      level: 3, energy: 2, pay: 940000, xp: 48, aura: 26, cooldown: 55, task: 'choice', rounds: 4, topic: 'CREDIT · TÍN DỤNG',
      desc: 'Thẩm định khả năng trả nợ, cấu trúc khoản vay và xếp hạng tín dụng. Câu hỏi về dòng tiền, tài sản bảo đảm và rủi ro vỡ nợ.',
      upgrade: { name: 'Mô hình xếp hạng nội bộ', cost: 6500000, bonus: 0.40, desc: '+40% thu nhập mỗi ca nhờ chấm điểm tín dụng và mô phỏng dòng tiền tự động.' },
      questions: [
        { q: 'DSCR (Debt Service Coverage Ratio) nhỏ hơn 1 có nghĩa là:', options: ['Dòng tiền hoạt động không đủ trả nợ đến hạn', 'Công ty đang có lãi lớn', 'Khoản vay không cần tài sản bảo đảm'], answer: 0, explain: 'DSCR dưới 1 cho thấy dòng tiền tạo ra không đủ trang trải lãi và gốc phải trả trong kỳ.' },
        { q: 'Mục đích chính của tài sản bảo đảm là:', options: ['Giảm tổn thất cho người cho vay khi người vay vỡ nợ', 'Tăng lợi nhuận chắc chắn cho người vay', 'Thay thế hoàn toàn việc thẩm định dòng tiền'], answer: 0, explain: 'Tài sản bảo đảm là nguồn thu hồi thứ cấp, giúp giảm thiệt hại nếu dòng tiền của người vay suy yếu.' },
        { q: 'Khi rủi ro vỡ nợ của một doanh nghiệp tăng, credit spread thường:', options: ['Mở rộng', 'Thu hẹp về 0', 'Không thay đổi'], answer: 0, explain: 'Nhà đầu tư yêu cầu lợi suất cao hơn để bù rủi ro, khiến chênh lệch so với trái phiếu phi rủi ro tăng.' },
        { q: 'Hệ số thanh khoản hiện hành (current ratio) dưới 1 gợi ý:', options: ['Tài sản ngắn hạn không đủ phủ nợ ngắn hạn', 'Công ty đang giữ quá nhiều tiền mặt', 'Công ty không có nợ dài hạn'], answer: 0, explain: 'Current ratio dưới 1 cho thấy nghĩa vụ ngắn hạn vượt tài sản ngắn hạn, áp lực thanh khoản cao hơn.' },
        { q: 'Điều khoản covenant trong hợp đồng tín dụng nhằm:', options: ['Ràng buộc hành vi người vay để bảo vệ người cho vay', 'Tăng lãi suất cố định', 'Miễn trừ mọi nghĩa vụ trả nợ'], answer: 0, explain: 'Covenant đặt ra các giới hạn như tỷ lệ nợ hoặc chi trả cổ tức để ngăn hành vi làm tăng rủi ro cho chủ nợ.' },
        { q: 'Bộ tiêu chí 5C trong tín dụng gồm:', options: ['Character, Capacity, Capital, Collateral, Conditions', 'Cash, Cost, Credit, Crypto, Currency', 'Chart, Cycle, Correlation, Capital, Carry'], answer: 0, explain: '5C đánh giá con người, năng lực trả nợ, vốn, tài sản bảo đảm và điều kiện kinh doanh của người vay.' }
      ]
    },
    {
      id: 'tax_advisor', title: 'Chuyên viên tư vấn thuế', company: 'AURELIS Tax', tag: 'Tax Advisory', icon: '🧾', color: '#2ee6a6', field: 'tax',
      level: 3, energy: 2, pay: 860000, xp: 46, aura: 25, cooldown: 50, task: 'choice', rounds: 4, topic: 'TAX · THUẾ',
      desc: 'Tối ưu thuế trong khuôn khổ pháp luật, đọc lá chắn thuế và ảnh hưởng của thuế đến dòng tiền. Câu hỏi về thuế doanh nghiệp và cá nhân.',
      upgrade: { name: 'Bộ mô phỏng thuế đa tầng', cost: 6000000, bonus: 0.38, desc: '+38% thu nhập mỗi ca nhờ tính nhanh thuế hiệu dụng và lá chắn thuế.' },
      questions: [
        { q: 'Lá chắn thuế từ lãi vay (interest tax shield) làm:', options: ['Giảm thuế phải nộp vì lãi vay được khấu trừ', 'Tăng thuế doanh nghiệp', 'Loại bỏ hoàn toàn rủi ro tài chính'], answer: 0, explain: 'Chi phí lãi vay làm giảm lợi nhuận chịu thuế, tạo ra khoản tiết kiệm thuế có giá trị.' },
        { q: 'Thuế hiệu dụng (effective tax rate) khác thuế suất danh nghĩa vì:', options: ['Có khấu trừ, ưu đãi và khoản thu nhập chịu thuế khác nhau', 'Luôn cao hơn thuế suất danh nghĩa', 'Chỉ áp dụng cho cá nhân'], answer: 0, explain: 'Thuế hiệu dụng phản ánh tỷ lệ thuế thực tế trên lợi nhuận sau các khoản điều chỉnh và ưu đãi.' },
        { q: 'Tax loss harvesting là chiến lược:', options: ['Bán khoản lỗ để bù trừ lãi chịu thuế', 'Giữ mọi khoản lỗ mãi mãi', 'Tăng lãi vay để tránh thuế'], answer: 0, explain: 'Hiện thực hoá khoản lỗ có thể bù trừ thu nhập chịu thuế, nhưng cần tuân thủ quy định và tránh bán rồi mua lại quá nhanh.' },
        { q: 'Khấu hao tài sản cố định ảnh hưởng đến thuế như thế nào?', options: ['Là chi phí không dùng tiền mặt, làm giảm lợi nhuận chịu thuế', 'Làm tăng tiền mặt ngay lập tức', 'Không ảnh hưởng đến thuế'], answer: 0, explain: 'Khấu hao được trừ vào lợi nhuận kế toán dù không chi tiền, tạo lá chắn thuế theo thời gian.' },
        { q: 'Thuế đánh vào cổ tức thường khác thuế đánh vào lãi vốn ở điểm:', options: ['Thời điểm và cách xác định thu nhập', 'Cổ tức không bao giờ bị đánh thuế', 'Lãi vốn luôn bị đánh thuế cao hơn'], answer: 0, explain: 'Cổ tức thường chịu thuế khi nhận, còn lãi vốn chỉ chịu thuế khi bán và có thể được ưu đãi theo thời gian nắm giữ.' },
        { q: 'Một kế hoạch thuế tốt nên ưu tiên:', options: ['Tuân thủ pháp luật và tối ưu dòng tiền sau thuế', 'Che giấu thu nhập', 'Trì hoãn mọi nghĩa vụ thuế vô thời hạn'], answer: 0, explain: 'Tối ưu thuế hợp pháp tập trung vào cấu trúc, thời điểm và các ưu đãi được luật cho phép, không phải trốn thuế.' }
      ]
    },
    {
      id: 'insurance_advisor', title: 'Chuyên viên bảo hiểm', company: 'AURELIS Insure', tag: 'Insurance', icon: '🛡️', color: '#ff9f43', field: 'risk',
      level: 3, energy: 2, pay: 790000, xp: 42, aura: 23, cooldown: 50, task: 'choice', rounds: 4, topic: 'INSURANCE · BẢO HIỂM',
      desc: 'Thiết kế hợp đồng bảo hiểm, định giá rủi ro và giải thích quyền lợi. Câu hỏi về nguyên tắc bồi thường, moral hazard và bảo hiểm nhân thọ.',
      upgrade: { name: 'Bảng tỷ lệ rủi ro số', cost: 5200000, bonus: 0.34, desc: '+34% thu nhập mỗi ca nhờ định giá rủi ro và so sánh quyền lợi nhanh hơn.' },
      questions: [
        { q: 'Nguyên tắc bồi thường (indemnity) trong bảo hiểm tài sản nhằm:', options: ['Khôi phục người được bảo hiểm về mức tài chính trước tổn thất, không tạo lợi nhuận', 'Cho phép nhận nhiều hơn giá trị tổn thất', 'Miễn trừ mọi khoản khấu trừ'], answer: 0, explain: 'Bảo hiểm tài sản bù đắp tổn thất thực tế, tránh việc mua bảo hiểm trở thành cơ hội kiếm lời.' },
        { q: 'Moral hazard xảy ra khi:', options: ['Người có bảo hiểm chủ động chấp nhận rủi ro hơn vì tổn thất đã được che chắn', 'Công ty bảo hiểm tăng phí', 'Người mua bảo hiểm không hiểu hợp đồng'], answer: 0, explain: 'Khi tổn thất được bảo hiểm, người được bảo hiểm có thể giảm bớt cẩn trọng, làm tăng xác suất tổn thất.' },
        { q: 'Khoản khấu trừ (deductible) trong hợp đồng bảo hiểm là:', options: ['Phần tổn thất người được bảo hiểm tự chịu trước khi bảo hiểm chi trả', 'Phí bảo hiểm hàng tháng', 'Số tiền bảo hiểm tối đa'], answer: 0, explain: 'Deductible giúp chia sẻ rủi ro, giảm phí bảo hiểm và hạn chế các yêu cầu bồi thường nhỏ.' },
        { q: 'Bảo hiểm nhân thọ có kỳ hạn (term life) thường:', options: ['Chi trả nếu người được bảo hiểm tử vong trong thời hạn, không có giá trị tiết kiệm', 'Luôn có giá trị hoàn lại lớn', 'Chi trả mọi chi phí y tế'], answer: 0, explain: 'Term life tập trung vào bảo vệ thuần túy trong một khoảng thời gian, thường có phí thấp hơn bảo hiểm trọn đời.' },
        { q: 'Reinsurance (tái bảo hiểm) giúp công ty bảo hiểm:', options: ['Chia sẻ rủi ro lớn với công ty bảo hiểm khác', 'Tăng gấp đôi số hợp đồng', 'Miễn trừ mọi nghĩa vụ bồi thường'], answer: 0, explain: 'Tái bảo hiểm chuyển một phần rủi ro sang đối tác, bảo vệ khả năng thanh toán trước các tổn thất lớn.' },
        { q: 'Insurable interest (quyền lợi được bảo hiểm) yêu cầu:', options: ['Người mua bảo hiểm phải có lợi ích tài chính hợp pháp gắn với đối tượng được bảo hiểm', 'Ai cũng có thể mua bảo hiểm cho bất kỳ người lạ', 'Chỉ công ty mới có quyền lợi'], answer: 0, explain: 'Quyền lợi được bảo hiểm ngăn việc mua bảo hiểm như một canh bạc vào sinh mạng hoặc tài sản của người khác.' }
      ]
    },
    {
      id: 'risk_manager', title: 'Chuyên gia quản trị rủi ro', company: 'AURELIS Risk', tag: 'Risk Management', icon: '🧯', color: '#ff5d73', field: 'risk',
      level: 4, energy: 3, pay: 1500000, xp: 62, aura: 36, cooldown: 65, task: 'choice', rounds: 4, topic: 'RISK · QUẢN TRỊ RỦI RO',
      desc: 'Đo lường VaR, stress test và đặt ngân sách rủi ro cho danh mục. Câu hỏi về đuôi rủi ro, thanh khoản và kỷ luật cắt lỗ.',
      upgrade: { name: 'Hệ thống cảnh báo rủi ro', cost: 16000000, bonus: 0.46, desc: '+46% thu nhập mỗi ca nhờ mô phỏng sốc thị trường và giám sát hạn mức tự động.' },
      questions: [
        { q: 'VaR 95% một ngày của danh mục là 100 triệu đồng có nghĩa là:', options: ['Trong 95% ngày, khoản lỗ dự kiến không vượt 100 triệu', 'Danh mục chắc chắn lỗ 100 triệu mỗi ngày', 'Lợi nhuận tối đa là 100 triệu'], answer: 0, explain: 'VaR là ngưỡng lỗ theo xác suất; 5% còn lại có thể lỗ lớn hơn nhiều và VaR không nói mức lỗ tối đa.' },
        { q: 'CVaR (Expected Shortfall) khắc phục điểm yếu nào của VaR?', options: ['Cho biết mức lỗ trung bình trong phần đuôi vượt VaR', 'Loại bỏ hoàn toàn rủi ro', 'Tính lợi nhuận trung bình'], answer: 0, explain: 'CVaR tập trung vào mức tổn thất trung bình khi vượt ngưỡng VaR, hữu ích hơn cho rủi ro đuôi.' },
        { q: 'Đa dạng hoá danh mục có thể giảm:', options: ['Rủi ro riêng lẻ nhưng không loại bỏ rủi ro hệ thống', 'Mọi loại rủi ro', 'Rủi ro lãi suất toàn cầu'], answer: 0, explain: 'Rủi ro hệ thống gắn với toàn thị trường vẫn còn dù danh mục được đa dạng hoá tốt.' },
        { q: 'Stress test khác backtest ở chỗ:', options: ['Stress test mô phỏng kịch bản cực đoan giả định, backtest kiểm tra trên dữ liệu quá khứ', 'Stress test luôn cho kết quả đẹp hơn', 'Backtest không cần dữ liệu'], answer: 0, explain: 'Backtest đo hiệu quả trong quá khứ; stress test hỏi danh mục sẽ ra sao dưới cú sốc chưa từng xảy ra.' },
        { q: 'Rủi ro thanh khoản là:', options: ['Không thể bán tài sản nhanh mà không bị giảm giá đáng kể', 'Giá tài sản không bao giờ biến động', 'Lãi suất luôn tăng'], answer: 0, explain: 'Thanh khoản kém khiến việc thoát vị thế tốn chi phí hoặc mất thời gian, đặc biệt trong căng thẳng thị trường.' },
        { q: 'Ngân sách rủi ro (risk budget) giúp nhà đầu tư:', options: ['Phân bổ mức rủi ro cho từng vị thế thay vì chỉ nhìn số tiền', 'Đảm bảo mọi lệnh đều thắng', 'Tăng đòn bẩy không giới hạn'], answer: 0, explain: 'Risk budget giới hạn tổn thất tiềm năng theo từng chiến lược, giúp tránh một vị thế làm sụp cả danh mục.' }
      ]
    },
    {
      id: 'ma_advisor', title: 'Chuyên gia M&A', company: 'AURELIS Advisory', tag: 'M&A', icon: '🤝', color: '#b59cff', field: 'deals',
      level: 5, energy: 3, pay: 2480000, xp: 84, aura: 50, cooldown: 85, task: 'choice', rounds: 4, topic: 'M&A · ĐỊNH GIÁ',
      desc: 'Định giá thương vụ, kiểm tra cộng hưởng và thương lượng điều khoản. Câu hỏi về synergy, accretion/dilution, due diligence và giá mua.',
      upgrade: { name: 'War room dữ liệu thương vụ', cost: 30000000, bonus: 0.52, desc: '+52% thu nhập mỗi ca nhờ mô hình định giá, so sánh thương vụ và phân tích cộng hưởng.' },
      questions: [
        { q: 'Giá trị cộng hưởng (synergy) của một thương vụ M&A được tính bằng:', options: ['Giá trị công ty kết hợp trừ tổng giá trị hai công ty riêng lẻ', 'Doanh thu của công ty mua', 'Số tiền vay để mua công ty'], answer: 0, explain: 'Synergy là phần giá trị tăng thêm nhờ kết hợp hoạt động, thường đến từ cắt chi phí hoặc tăng doanh thu.' },
        { q: 'Một thương vụ được gọi là accretion nếu:', options: ['EPS của công ty mua tăng sau thương vụ', 'Giá cổ phiếu chắc chắn tăng', 'Công ty mua phải trả toàn bộ bằng tiền mặt'], answer: 0, explain: 'Accretion/dilution so sánh EPS trước và sau giao dịch; pha loãng xảy ra khi EPS giảm.' },
        { q: 'Control premium là:', options: ['Phần giá trị tăng thêm trả để giành quyền kiểm soát công ty', 'Phí tư vấn của ngân hàng', 'Lãi suất của khoản vay mua công ty'], answer: 0, explain: 'Người mua thường trả cao hơn giá thị trường để có quyền kiểm soát và khai thác cộng hưởng.' },
        { q: 'Due diligence trong M&A tập trung vào:', options: ['Kiểm tra tài chính, pháp lý, thuế và vận hành trước khi ký kết', 'Chỉ kiểm tra giá cổ phiếu', 'Chỉ đàm phán giá mua'], answer: 0, explain: 'Due diligence phát hiện rủi ro ẩn và xác minh giả định định giá trước khi cam kết vốn.' },
        { q: 'Earn-out trong hợp đồng M&A là:', options: ['Phần giá mua trả thêm nếu công ty đạt mục tiêu tương lai', 'Khoản phạt khi thương vụ thất bại', 'Cổ tức trả cho cổ đông cũ'], answer: 0, explain: 'Earn-out gắn một phần giá mua với kết quả tương lai, giúp thu hẹp khoảng cách định giá giữa hai bên.' },
        { q: 'Goodwill xuất hiện trong thương vụ mua lại khi:', options: ['Giá mua vượt giá trị hợp lý của tài sản ròng được mua', 'Công ty mua có lợi nhuận âm', 'Thương vụ được thanh toán bằng cổ phiếu'], answer: 0, explain: 'Goodwill là phần chênh lệch vượt giá trị tài sản ròng hợp lý, phản ánh kỳ vọng cộng hưởng và tài sản vô hình.' }
      ]
    }
  ];

  /* ------------------- v1.12: MỞ RỘNG CƠ SỞ DỮ LIỆU VIỆC LÀM ------------------- */
  /* 10 lĩnh vực mới + 40 nghề mới, bổ sung 3 kiểu mini-game: tính toán nhanh,
     ghi nhớ quy trình nhiều bước và canh nhịp. Tổng cộng 59 nghề / 23 lĩnh vực. */
  const JOB_FIELDS_V12 = [
    { id: 'hospitality', name: 'Khách sạn & du lịch', short: 'Khách sạn', icon: '🏨', color: '#ff9f43', desc: 'Trải nghiệm khách hàng, vận hành buồng phòng, tour và dịch vụ cao cấp.' },
    { id: 'health', name: 'Y tế & chăm sóc', short: 'Y tế', icon: '🩺', color: '#2ee6a6', desc: 'Chăm sóc sức khoẻ, dược lâm sàng và vận hành cơ sở y tế.' },
    { id: 'legal', name: 'Pháp lý & tuân thủ', short: 'Pháp lý', icon: '⚖️', color: '#b59cff', desc: 'Hợp đồng, tuân thủ, quản trị rủi ro pháp lý và tranh chấp.' },
    { id: 'education', name: 'Giáo dục & đào tạo', short: 'Giáo dục', icon: '🎓', color: '#5ac8fa', desc: 'Thiết kế chương trình, giảng dạy và truyền đạt kiến thức tài chính.' },
    { id: 'energy', name: 'Năng lượng & hạ tầng', short: 'Năng lượng', icon: '⚡', color: '#ffd166', desc: 'Điện, tái tạo, lưới điện và phân tích hạ tầng dài hạn.' },
    { id: 'logistics', name: 'Chuỗi cung ứng', short: 'Chuỗi cung ứng', icon: '📦', color: '#4dd0e1', desc: 'Kho bãi, vận tải, thu mua và tối ưu dòng hàng.' },
    { id: 'agriculture', name: 'Nông nghiệp & thực phẩm', short: 'Nông nghiệp', icon: '🌾', color: '#9ccc65', desc: 'Canh tác, thu mua, chất lượng và chuỗi thực phẩm.' },
    { id: 'public', name: 'Công & chính sách', short: 'Công vụ', icon: '🏛️', color: '#94a3b8', desc: 'Chính sách, thuế, quy hoạch và dịch vụ công.' },
    { id: 'sales', name: 'Kinh doanh & thương mại', short: 'Kinh doanh', icon: '📈', color: '#ff8fb1', desc: 'Bán hàng, quan hệ khách hàng và mở rộng thị trường.' },
    { id: 'creative', name: 'Sáng tạo & thiết kế', short: 'Sáng tạo', icon: '🎨', color: '#c9a7ff', desc: 'Thương hiệu, nội dung, thiết kế và trải nghiệm người dùng.' }
  ];

  const JOBS_V12 = [
    {
      id: 'warehouse', title: 'Thủ kho thông minh', company: 'AURELIS Logistics', tag: 'Kho vận', icon: '📦', color: '#4dd0e1', field: 'logistics',
      level: 1, energy: 1, pay: 240000, xp: 20, aura: 9, cooldown: 28, task: 'timing', rounds: 3, speed: 0.84,
      desc: 'Sắp xếp hàng vào đúng ô trong kho tự động. Canh nhịp băng tải để không lệch mã hàng.',
      upgrade: { name: 'Súng quét mã tốc độ cao', cost: 1600000, bonus: 0.30, desc: '+30% thu nhập nhờ quét mã và đối chiếu vị trí tự động.' }
    },
    {
      id: 'sales_exec', title: 'Nhân viên kinh doanh', company: 'AURELIS Commerce', tag: 'Bán hàng', icon: '📞', color: '#ff8fb1', field: 'sales',
      level: 1, energy: 1, pay: 300000, xp: 22, aura: 10, cooldown: 32, task: 'timing', rounds: 3, speed: 0.92,
      desc: 'Gọi điện chốt đơn trong khung giờ vàng. Canh đúng thời điểm khách hàng sẵn sàng để chốt.',
      upgrade: { name: 'CRM bán hàng tự động', cost: 2200000, bonus: 0.32, desc: '+32% thu nhập nhờ nhắc lịch và xếp hạng khách tiềm năng.' }
    },
    {
      id: 'graphic', title: 'Thiết kế đồ hoạ', company: 'AURELIS Creative', tag: 'Thiết kế', icon: '🎨', color: '#c9a7ff', field: 'creative',
      level: 1, energy: 1, pay: 320000, xp: 23, aura: 11, cooldown: 35, task: 'timing', rounds: 3, speed: 0.88,
      desc: 'Canh thời điểm giao bản thiết kế cho khách hàng khó tính. Đúng nhịp sẽ được duyệt ngay.',
      upgrade: { name: 'Bộ công cụ thiết kế Pro', cost: 2600000, bonus: 0.35, desc: '+35% thu nhập nhờ template, asset và quy trình review nhanh.' }
    },
    {
      id: 'event', title: 'Điều phối sự kiện đầu tư', company: 'AURELIS Events', tag: 'Sự kiện', icon: '🎤', color: '#f3c56b', field: 'operations',
      level: 2, energy: 1, pay: 450000, xp: 30, aura: 14, cooldown: 40, task: 'timing', rounds: 3, speed: 0.9,
      desc: 'Điều phối hội thảo nhà đầu tư: âm thanh, slide, khách mời. Canh nhịp chuyển tiết mục thật chuẩn.',
      upgrade: { name: 'Bộ đàm + runbook số', cost: 3200000, bonus: 0.30, desc: '+30% thu nhập nhờ điều phối đồng bộ cả ê-kíp.' }
    },
    {
      id: 'cargo', title: 'Điều phối vận tải', company: 'AURELIS Freight', tag: 'Vận tải', icon: '🚛', color: '#4dd0e1', field: 'logistics',
      level: 2, energy: 2, pay: 520000, xp: 34, aura: 16, cooldown: 42, task: 'choice', rounds: 3, topic: 'VẬN TẢI · TỐI ƯU CHI PHÍ',
      desc: 'Xếp tuyến, chọn tải trọng và xử lý phát sinh giao hàng. Mỗi quyết định ảnh hưởng chi phí và hạn giao.',
      upgrade: { name: 'Hệ thống định tuyến AI', cost: 3800000, bonus: 0.34, desc: '+34% thu nhập nhờ tối ưu tuyến và dự báo ùn tắc.' },
      questions: [
        { q: 'Một tuyến giao hàng có chi phí cố định 2 triệu và biến phí 40.000 ₫/km. Tuyến 60 km nên được chọn khi doanh thu tối thiểu là bao nhiêu để hoà vốn?', options: ['4,4 triệu ₫', '2,4 triệu ₫', '6,0 triệu ₫'], answer: 0, explain: 'Hoà vốn = 2.000.000 + 40.000 × 60 = 4.400.000 ₫.' },
        { q: 'Khi xe tải bị trễ do thời tiết, ưu tiên xử lý nào hợp lý nhất?', options: ['Báo khách, tính lại ETA và điều xe dự phòng cho đơn gấp', 'Im lặng chờ hàng đến', 'Tăng giá cước để bù thiệt hại'], answer: 0, explain: 'Minh bạch ETA và phương án thay thế giúp giữ cam kết và uy tín.' },
        { q: 'Chỉ số nào đo mức sử dụng tải trọng hiệu quả nhất?', options: ['Tỷ lệ lấp đầy container hoặc tải trọng', 'Số lượng xe trong đội', 'Số cuộc gọi mỗi ngày'], answer: 0, explain: 'Hệ số lấp đầy càng cao thì chi phí trên mỗi đơn vị hàng càng thấp.' }
      ]
    },
    {
      id: 'hotel', title: 'Lễ tân khách sạn', company: 'AURELIS Grand', tag: 'Khách sạn', icon: '🏨', color: '#ff9f43', field: 'hospitality',
      level: 2, energy: 1, pay: 390000, xp: 28, aura: 13, cooldown: 36, task: 'choice', rounds: 3, topic: 'KHÁCH SẠN · DỊCH VỤ',
      desc: 'Nhận phòng, xử lý khiếu nại và nâng cấp dịch vụ. Giữ bình tĩnh và đúng quy trình là chìa khoá.',
      upgrade: { name: 'Hệ thống PMS thông minh', cost: 2600000, bonus: 0.30, desc: '+30% thu nhập nhờ check-in nhanh và quản lý buồng phòng.' },
      questions: [
        { q: 'Khách phàn nàn phòng chưa sạch dù đã đến giờ nhận phòng. Bạn nên:', options: ['Xin lỗi, kiểm tra lại và ưu tiên dọn phòng hoặc đổi phòng tương đương', 'Nói đó là lỗi của bộ phận buồng phòng', 'Đề nghị khách chờ đến tối'], answer: 0, explain: 'Nhận trách nhiệm, đưa giải pháp ngay và giữ trải nghiệm khách hàng là ưu tiên.' },
        { q: 'Khách đặt phòng qua đại lý với giá thấp hơn giá công bố. Cách xử lý đúng:', options: ['Tôn trọng giá đã xác nhận và kiểm tra lại điều kiện đặt phòng', 'Yêu cầu khách trả thêm ngay tại quầy', 'Huỷ đặt phòng để bán cho khách khác'], answer: 0, explain: 'Giữ cam kết với kênh phân phối và khách hàng, tránh tranh chấp không cần thiết.' },
        { q: 'Chỉ số RevPAR của khách sạn bằng:', options: ['Doanh thu phòng bình quân trên mỗi phòng có sẵn', 'Số khách trên mỗi nhân viên', 'Tỷ lệ huỷ phòng'], answer: 0, explain: 'RevPAR = ADR × công suất phòng; đo hiệu quả khai thác doanh thu phòng.' }
      ]
    },
    {
      id: 'tour_guide', title: 'Hướng dẫn viên du lịch', company: 'AURELIS Travel', tag: 'Du lịch', icon: '🧭', color: '#5ac8fa', field: 'hospitality',
      level: 2, energy: 2, pay: 470000, xp: 32, aura: 15, cooldown: 44, task: 'choice', rounds: 3, topic: 'DU LỊCH · TRẢI NGHIỆM',
      desc: 'Dẫn đoàn qua các điểm đến và xử lý tình huống bất ngờ. Kiến thức, sự điềm tĩnh và lịch trình linh hoạt.',
      upgrade: { name: 'Tai nghe thuyết minh đa ngôn ngữ', cost: 3000000, bonus: 0.32, desc: '+32% thu nhập nhờ phục vụ đoàn lớn và nhiều ngôn ngữ.' },
      questions: [
        { q: 'Một điểm tham quan đóng cửa đột xuất. Bạn nên:', options: ['Thông báo ngay và đề xuất điểm thay thế phù hợp lịch trình', 'Vẫn đưa đoàn đến và chờ', 'Tự ý cắt bữa ăn để bù giờ'], answer: 0, explain: 'Minh bạch và linh hoạt giữ trải nghiệm đoàn, tránh mất thời gian vô ích.' },
        { q: 'Khi khách mua đồ lưu niệm với giá cao bất thường, bạn nên:', options: ['Nhắc khách tham khảo giá và không ép mua', 'Khuyên khách mua vì có hoa hồng', 'Im lặng vì không liên quan'], answer: 0, explain: 'Hướng dẫn viên chuyên nghiệp bảo vệ quyền lợi khách, không đặt hoa hồng lên trên.' },
        { q: 'Yếu tố nào quan trọng nhất khi thiết kế lịch trình 3 ngày?', options: ['Cân bằng thời gian di chuyển, nghỉ ngơi và điểm chính', 'Nhồi càng nhiều điểm càng tốt', 'Chỉ chọn điểm đắt tiền'], answer: 0, explain: 'Lịch trình hợp lý giảm mệt mỏi và tăng giá trị trải nghiệm thực tế.' }
      ]
    },
    {
      id: 'flight_attendant', title: 'Tiếp viên hàng không', company: 'AURELIS Air', tag: 'Hàng không', icon: '✈️', color: '#6cb8ff', field: 'hospitality',
      level: 3, energy: 2, pay: 850000, xp: 46, aura: 24, cooldown: 55, task: 'choice', rounds: 3, topic: 'HÀNG KHÔNG · AN TOÀN',
      desc: 'Phục vụ khoang khách và xử lý tình huống trên chuyến bay. An toàn luôn đứng trước sự tiện lợi.',
      upgrade: { name: 'Chứng chỉ service cao cấp', cost: 7000000, bonus: 0.38, desc: '+38% thu nhập nhờ phục vụ khoang thương gia và đào tạo chuẩn.' },
      questions: [
        { q: 'Một hành khách không chịu thắt dây an toàn khi máy bay rung lắc. Bạn nên:', options: ['Nhắc nhở kiên quyết theo quy trình an toàn và báo tổ trưởng nếu cần', 'Bỏ qua vì khách đã trả tiền', 'Tự thắt dây cho khách'], answer: 0, explain: 'Quy định an toàn áp dụng cho mọi hành khách; cần xử lý dứt khoát và đúng cấp báo.' },
        { q: 'Hành khách bị dị ứng đậu phộng trước bữa ăn. Ưu tiên nào đúng?', options: ['Kiểm tra thành phần, thông báo tổ bay và bố trí suất ăn phù hợp', 'Đưa suất ăn thường và dặn khách cẩn thận', 'Nói khách tự lo'], answer: 0, explain: 'Dị ứng có thể nguy hiểm; cần kiểm tra thành phần và phối hợp tổ bay.' },
        { q: 'Khi có sự cố y tế trên chuyến bay, thứ tự ưu tiên là:', options: ['An toàn chuyến bay, gọi hỗ trợ y tế, sơ cứu theo đào tạo', 'Bán đồ miễn thuế tiếp', 'Quay video đăng mạng'], answer: 0, explain: 'An toàn và hỗ trợ y tế là ưu tiên tuyệt đối; mọi việc khác dừng lại.' }
      ]
    },
    {
      id: 'nurse', title: 'Điều dưỡng ca lâm sàng', company: 'AURELIS Health', tag: 'Điều dưỡng', icon: '🩺', color: '#2ee6a6', field: 'health',
      level: 2, energy: 2, pay: 520000, xp: 34, aura: 16, cooldown: 44, task: 'sequence', rounds: 3, topic: 'LÂM SÀNG · QUY TRÌNH',
      signals: ['🩺', '💊', '💉', '📋'],
      desc: 'Ghi nhớ và thực hiện đúng thứ tự quy trình chăm sóc. Chỉ một bước sai có thể ảnh hưởng an toàn người bệnh.',
      upgrade: { name: 'Bảng kiểm điện tử', cost: 3400000, bonus: 0.32, desc: '+32% thu nhập nhờ checklist và nhắc liều tự động.' }
    },
    {
      id: 'pharmacist', title: 'Dược sĩ nhà thuốc', company: 'AURELIS Pharmacy', tag: 'Dược', icon: '💊', color: '#2ee6a6', field: 'health',
      level: 3, energy: 2, pay: 780000, xp: 42, aura: 22, cooldown: 48, task: 'math', rounds: 3, mathType: 'discount', topic: 'DƯỢC · GIÁ & LIỀU',
      desc: 'Tính giá nhập, chiết khấu và liều lượng nhanh. Sai một con số có thể ảnh hưởng sức khoẻ hoặc biên lợi nhuận.',
      upgrade: { name: 'Phần mềm quản lý dược', cost: 4800000, bonus: 0.36, desc: '+36% thu nhập nhờ kiểm tra tương tác thuốc và tồn kho.' }
    },
    {
      id: 'doctor_assist', title: 'Trợ lý bác sĩ', company: 'AURELIS Clinic', tag: 'Y tế', icon: '🧑‍⚕️', color: '#2ee6a6', field: 'health',
      level: 4, energy: 3, pay: 1450000, xp: 60, aura: 34, cooldown: 62, task: 'choice', rounds: 3, topic: 'Y TẾ · AN TOÀN',
      desc: 'Hỗ trợ khám, đọc chỉ định và phối hợp ê-kíp. Giao tiếp rõ ràng giúp giảm sai sót y khoa.',
      upgrade: { name: 'Bộ hồ sơ bệnh án số', cost: 12000000, bonus: 0.44, desc: '+44% thu nhập nhờ truy xuất lịch sử và cảnh báo dị ứng.' },
      questions: [
        { q: 'Bệnh nhân dị ứng penicillin nhưng đơn thuốc ghi kháng sinh nhóm beta-lactam. Bạn nên:', options: ['Dừng lại, xác nhận với bác sĩ trước khi thực hiện', 'Phát thuốc theo đơn', 'Giảm liều một nửa'], answer: 0, explain: 'Dị ứng đã biết là chống chỉ định; cần xác nhận lại trước khi dùng.' },
        { q: 'Khi bệnh nhân hỏi kết quả xét nghiệm qua điện thoại, bạn nên:', options: ['Giải thích quy trình bảo mật và hẹn trao đổi trực tiếp với bác sĩ', 'Đọc toàn bộ kết quả ngay', 'Gửi ảnh hồ sơ qua tin nhắn cá nhân'], answer: 0, explain: 'Bảo mật thông tin y tế và đảm bảo người nhận đúng là bệnh nhân.' },
        { q: 'Một đồng nghiệp quên rửa tay trước khi thăm khám. Cách xử lý chuyên nghiệp:', options: ['Nhắc nhẹ theo quy trình kiểm soát nhiễm khuẩn', 'Im lặng để giữ hoà khí', 'Báo cáo ngay lên cấp trên mà không nhắc'], answer: 0, explain: 'Nhắc nhở trực tiếp, tôn trọng và dựa trên quy trình giúp bảo vệ cả bệnh nhân lẫn ê-kíp.' }
      ]
    },
    {
      id: 'paralegal', title: 'Trợ lý pháp chế', company: 'AURELIS Legal', tag: 'Pháp chế', icon: '⚖️', color: '#b59cff', field: 'legal',
      level: 2, energy: 2, pay: 560000, xp: 36, aura: 17, cooldown: 46, task: 'choice', rounds: 3, topic: 'PHÁP CHẾ · HỢP ĐỒNG',
      desc: 'Rà soát điều khoản, hạn chế rủi ro và quản lý hồ sơ. Chi tiết nhỏ có thể tạo ra tranh chấp lớn.',
      upgrade: { name: 'Kho điều khoản mẫu', cost: 3600000, bonus: 0.32, desc: '+32% thu nhập nhờ so sánh hợp đồng và phát hiện điều khoản bất lợi.' },
      questions: [
        { q: 'Điều khoản phạt vi phạm trong hợp đồng quá cao so với giá trị thực tế. Rủi ro chính là:', options: ['Có thể bị vô hiệu hoặc tranh chấp khi yêu cầu thi hành', 'Luôn có lợi cho bên bán', 'Không ảnh hưởng gì'], answer: 0, explain: 'Mức phạt phải tương xứng với thiệt hại; quá cao có thể không được toà chấp nhận.' },
        { q: 'Trước khi ký hợp đồng với đối tác nước ngoài, cần kiểm tra trước hết:', options: ['Tư cách pháp lý, điều khoản giải quyết tranh chấp và luật áp dụng', 'Màu logo đối tác', 'Số lượng nhân viên bán hàng'], answer: 0, explain: 'Tư cách pháp lý và cơ chế giải quyết tranh chấp quyết định khả năng thi hành hợp đồng.' },
        { q: 'Điều khoản bảo mật thiếu thời hạn cụ thể thường gây ra:', options: ['Khó xác định nghĩa vụ kéo dài bao lâu', 'Hợp đồng tự động vô hiệu', 'Không cần bảo mật'], answer: 0, explain: 'Thời hạn bảo mật cần rõ ràng để xác định nghĩa vụ của các bên sau khi hợp đồng kết thúc.' }
      ]
    },
    {
      id: 'compliance', title: 'Chuyên viên tuân thủ', company: 'AURELIS Securities', tag: 'Tuân thủ', icon: '🛡️', color: '#b59cff', field: 'legal',
      level: 3, energy: 2, pay: 980000, xp: 48, aura: 26, cooldown: 52, task: 'choice', rounds: 3, topic: 'TUÂN THỦ · CHỨNG KHOÁN',
      desc: 'Kiểm soát giao dịch nội bộ, xung đột lợi ích và hồ sơ khách hàng. Tuân thủ bảo vệ cả công ty và nhà đầu tư.',
      upgrade: { name: 'Hệ thống giám sát giao dịch', cost: 9000000, bonus: 0.40, desc: '+40% thu nhập nhờ cảnh báo giao dịch bất thường theo thời gian thực.' },
      questions: [
        { q: 'Một nhân viên môi giới mua cổ phiếu của khách hàng trước khi công bố khuyến nghị tăng giá. Đây là:', options: ['Hành vi có thể vi phạm quy định về giao dịch nội bộ và xung đột lợi ích', 'Chiến lược hợp lý để tăng lợi nhuận', 'Việc bình thường trong ngành'], answer: 0, explain: 'Giao dịch dựa trên thông tin chưa công bố hoặc trước khuyến nghị gây xung đột lợi ích nghiêm trọng.' },
        { q: 'Khi phát hiện khách hàng cung cấp thông tin nhận diện không khớp, bạn nên:', options: ['Tạm dừng giao dịch và yêu cầu xác minh lại theo quy trình KYC', 'Bỏ qua nếu khách đã nộp tiền', 'Tự sửa hồ sơ cho khớp'], answer: 0, explain: 'KYC là yêu cầu bắt buộc; cần xác minh lại trước khi tiếp tục quan hệ.' },
        { q: 'Mục tiêu chính của kiểm soát tuân thủ là:', options: ['Bảo vệ nhà đầu tư và sự ổn định của thị trường', 'Tăng doanh thu phí giao dịch', 'Giảm số lượng khách hàng'], answer: 0, explain: 'Tuân thủ duy trì niềm tin, bảo vệ nhà đầu tư và giảm rủi ro hệ thống.' }
      ]
    },
    {
      id: 'contract', title: 'Chuyên viên hợp đồng', company: 'AURELIS Legal', tag: 'Hợp đồng', icon: '📄', color: '#b59cff', field: 'legal',
      level: 3, energy: 2, pay: 860000, xp: 45, aura: 24, cooldown: 50, task: 'math', rounds: 3, mathType: 'tax', topic: 'HỢP ĐỒNG · THUẾ & PHẠT',
      desc: 'Tính thuế, phạt chậm thanh toán và giá trị hợp đồng. Con số phải khớp trước khi trình ký.',
      upgrade: { name: 'Bộ kiểm tra điều khoản tự động', cost: 7000000, bonus: 0.36, desc: '+36% thu nhập nhờ phát hiện lỗi số liệu và điều khoản xung đột.' }
    },
    {
      id: 'teacher', title: 'Giáo viên tài chính', company: 'AURELIS Academy', tag: 'Giảng dạy', icon: '🎓', color: '#5ac8fa', field: 'education',
      level: 2, energy: 2, pay: 480000, xp: 32, aura: 15, cooldown: 42, task: 'choice', rounds: 3, topic: 'GIÁO DỤC · TÀI CHÍNH',
      desc: 'Dạy kiến thức đầu tư cho học viên mới. Giải thích dễ hiểu và đúng bản chất quan trọng hơn thuật ngữ hào nhoáng.',
      upgrade: { name: 'Bộ học liệu tương tác', cost: 2800000, bonus: 0.30, desc: '+30% thu nhập nhờ bài giảng số và bài tập tự chấm.' },
      questions: [
        { q: 'Học viên hỏi “cổ phiếu nào chắc chắn tăng?”. Cách trả lời đúng:', options: ['Không có cổ phiếu nào chắc chắn tăng; hãy học cách đánh giá rủi ro và định giá', 'Đưa ra một mã đang hot', 'Nói rằng chỉ cần mua và giữ'], answer: 0, explain: 'Giáo dục tài chính phải trung thực về bất định, tránh hứa hẹn lợi nhuận.' },
        { q: 'Cách tốt nhất để giải thích lãi kép là:', options: ['Dùng ví dụ số tiền nhỏ tăng dần qua từng năm', 'Đọc định nghĩa công thức', 'Nói học viên tự tìm hiểu'], answer: 0, explain: 'Ví dụ trực quan giúp người mới hiểu tác động thời gian của lãi kép.' },
        { q: 'Một học viên sợ rủi ro nhưng muốn đầu tư 1 tháng. Bạn nên:', options: ['Giải thích kỳ hạn ngắn phù hợp kênh an toàn, thanh khoản cao', 'Khuyên all-in crypto', 'Khuyên vay margin'], answer: 0, explain: 'Kỳ hạn ngắn không phù hợp với tài sản biến động mạnh; ưu tiên bảo toàn vốn.' }
      ]
    },
    {
      id: 'tutor', title: 'Gia sư toán tài chính', company: 'AURELIS Academy', tag: 'Gia sư', icon: '🧮', color: '#5ac8fa', field: 'education',
      level: 1, energy: 1, pay: 280000, xp: 21, aura: 10, cooldown: 30, task: 'math', rounds: 3, mathType: 'interest', topic: 'TOÁN · LÃI SUẤT',
      desc: 'Luyện tính lãi, tỷ suất và phần trăm cho học viên. Tính nhanh và giải thích từng bước.',
      upgrade: { name: 'Bảng bài tập tự động', cost: 1800000, bonus: 0.30, desc: '+30% thu nhập nhờ kho bài tập và chấm điểm tự động.' }
    },
    {
      id: 'course_designer', title: 'Thiết kế khoá học', company: 'AURELIS Academy', tag: 'EdTech', icon: '🧠', color: '#5ac8fa', field: 'education',
      level: 3, energy: 2, pay: 920000, xp: 47, aura: 25, cooldown: 52, task: 'choice', rounds: 3, topic: 'EDTECH · THIẾT KẾ',
      desc: 'Xây lộ trình học, chọn học liệu và đo hiệu quả. Mục tiêu là người học làm được, không chỉ xem hết video.',
      upgrade: { name: 'Nền tảng LMS + analytics', cost: 8000000, bonus: 0.38, desc: '+38% thu nhập nhờ đo tiến độ và cá nhân hoá lộ trình.' },
      questions: [
        { q: 'Một khoá học có tỷ lệ hoàn thành thấp. Cải thiện nào hiệu quả nhất?', options: ['Chia nhỏ bài học và thêm bài tập ngắn phản hồi ngay', 'Tăng thời lượng video', 'Bỏ bài kiểm tra'], answer: 0, explain: 'Nội dung ngắn, tương tác và phản hồi nhanh giúp duy trì động lực học.' },
        { q: 'Mục tiêu học tập tốt nhất nên được viết theo cách:', options: ['Hành vi quan sát được và tiêu chí đo lường rõ ràng', 'Càng chung chung càng tốt', 'Chỉ nêu thời lượng khoá học'], answer: 0, explain: 'Mục tiêu rõ giúp thiết kế bài tập và đánh giá đúng kết quả.' },
        { q: 'Khi thiết kế quiz, nên tránh:', options: ['Phương án nhiễu quá dễ loại trừ hoặc câu hỏi đánh đố không liên quan', 'Câu hỏi kiểm tra hiểu bản chất', 'Phản hồi giải thích đáp án'], answer: 0, explain: 'Câu hỏi chất lượng đo đúng năng lực, không dựa vào mẹo.' }
      ]
    },
    {
      id: 'solar_tech', title: 'Kỹ thuật viên điện mặt trời', company: 'AURELIS Energy', tag: 'Tái tạo', icon: '☀️', color: '#ffd166', field: 'energy',
      level: 2, energy: 2, pay: 600000, xp: 37, aura: 18, cooldown: 46, task: 'sequence', rounds: 3, topic: 'NĂNG LƯỢNG · AN TOÀN',
      signals: ['🔌', '⚡', '☀️', '🛠️'],
      desc: 'Thực hiện đúng thứ tự kiểm tra hệ thống điện mặt trời. Ngắt điện sai bước có thể gây nguy hiểm.',
      upgrade: { name: 'Bộ đo inverter thông minh', cost: 4200000, bonus: 0.34, desc: '+34% thu nhập nhờ chẩn đoán nhanh và báo cáo tự động.' }
    },
    {
      id: 'grid_operator', title: 'Điều độ viên lưới điện', company: 'AURELIS Grid', tag: 'Hạ tầng', icon: '🔋', color: '#ffd166', field: 'energy',
      level: 4, energy: 3, pay: 1650000, xp: 64, aura: 36, cooldown: 66, task: 'choice', rounds: 3, topic: 'LƯỚI ĐIỆN · VẬN HÀNH',
      desc: 'Cân bằng cung cầu, xử lý quá tải và điều phối nguồn. Ưu tiên an toàn hệ thống và ổn định tần số.',
      upgrade: { name: 'Trung tâm điều độ số', cost: 16000000, bonus: 0.46, desc: '+46% thu nhập nhờ mô phỏng phụ tải và dự báo sự cố.' },
      questions: [
        { q: 'Phụ tải tăng đột ngột trong giờ cao điểm, tần số giảm. Hành động đầu tiên:', options: ['Huy động nguồn dự phòng và điều chỉnh công suất theo quy trình', 'Cắt điện toàn bộ thành phố', 'Tăng giá điện ngay'], answer: 0, explain: 'Cân bằng công suất theo thứ tự ưu tiên giúp giữ ổn định tần số và tránh sự cố lan rộng.' },
        { q: 'Nguồn điện mặt trời biến động mạnh cuối ngày. Giải pháp hợp lý:', options: ['Kết hợp lưu trữ và dự phòng linh hoạt', 'Phụ thuộc hoàn toàn vào mặt trời', 'Tắt toàn bộ lưới'], answer: 0, explain: 'Lưu trữ và nguồn dự phòng giúp cân bằng khi nguồn tái tạo giảm nhanh.' },
        { q: 'Vì sao cần dự phòng quay vòng (spinning reserve)?', options: ['Để bù công suất mất đi trong vài giây và giữ tần số', 'Để tăng doanh thu bán điện', 'Để giảm giá nhiên liệu'], answer: 0, explain: 'Dự phòng quay vòng đáp ứng mất cân bằng tức thời, bảo vệ ổn định hệ thống.' }
      ]
    },
    {
      id: 'energy_analyst', title: 'Chuyên viên phân tích năng lượng', company: 'AURELIS Energy Research', tag: 'Phân tích', icon: '📊', color: '#ffd166', field: 'energy',
      level: 4, energy: 3, pay: 1580000, xp: 62, aura: 35, cooldown: 64, task: 'math', rounds: 3, mathType: 'cagr', topic: 'NĂNG LƯỢNG · TĂNG TRƯỞNG',
      desc: 'Tính tốc độ tăng trưởng, chi phí vốn và hiệu quả dự án năng lượng. Con số quyết định có rót vốn hay không.',
      upgrade: { name: 'Mô hình tài chính dự án', cost: 15000000, bonus: 0.45, desc: '+45% thu nhập nhờ mô hình dòng tiền và độ nhạy tự động.' }
    },
    {
      id: 'agronomist', title: 'Kỹ sư nông nghiệp', company: 'AURELIS Agri', tag: 'Nông nghiệp', icon: '🌾', color: '#9ccc65', field: 'agriculture',
      level: 2, energy: 2, pay: 540000, xp: 35, aura: 17, cooldown: 45, task: 'sequence', rounds: 3, topic: 'NÔNG NGHIỆP · MÙA VỤ',
      signals: ['🌱', '💧', '🌾', '🚜'],
      desc: 'Ghi nhớ thứ tự chăm sóc theo mùa vụ. Đúng quy trình giúp cây khoẻ và giảm hao hụt.',
      upgrade: { name: 'Cảm biến đất & thời tiết', cost: 3800000, bonus: 0.33, desc: '+33% thu nhập nhờ tưới tiêu và dự báo sâu bệnh chính xác.' }
    },
    {
      id: 'supply_buyer', title: 'Chuyên viên thu mua nông sản', company: 'AURELIS Agri Trade', tag: 'Thu mua', icon: '🌽', color: '#9ccc65', field: 'agriculture',
      level: 3, energy: 2, pay: 880000, xp: 46, aura: 25, cooldown: 50, task: 'math', rounds: 3, mathType: 'markup', topic: 'NÔNG SẢN · BIÊN LỢI NHUẬN',
      desc: 'Tính giá thu mua, hao hụt và biên bán buôn. Một sai số nhỏ trên tấn hàng là lỗ lớn.',
      upgrade: { name: 'Sàn thu mua trực tuyến', cost: 7200000, bonus: 0.38, desc: '+38% thu nhập nhờ so sánh giá vùng trồng và dự báo tồn kho.' }
    },
    {
      id: 'food_qa', title: 'Chuyên viên QA thực phẩm', company: 'AURELIS Food', tag: 'Chất lượng', icon: '🥗', color: '#9ccc65', field: 'agriculture',
      level: 3, energy: 2, pay: 820000, xp: 44, aura: 24, cooldown: 50, task: 'choice', rounds: 3, topic: 'THỰC PHẨM · CHẤT LƯỢNG',
      desc: 'Kiểm tra lô hàng, truy xuất nguồn gốc và xử lý các lô không đạt. An toàn thực phẩm không có chỗ cho may mắn.',
      upgrade: { name: 'Phòng lab kiểm nhanh', cost: 6800000, bonus: 0.36, desc: '+36% thu nhập nhờ phát hiện lô lỗi trước khi xuất kho.' },
      questions: [
        { q: 'Một lô hàng có kết quả vi sinh vượt ngưỡng nhẹ. Bạn nên:', options: ['Cách ly lô, kiểm tra lại và đánh giá rủi ro trước khi quyết định', 'Phát hành ngay vì vượt ít', 'Pha trộn với lô đạt chuẩn'], answer: 0, explain: 'Không đánh đổi an toàn thực phẩm; cần cách ly và xử lý theo quy trình.' },
        { q: 'Truy xuất nguồn gốc giúp ích trực tiếp nhất khi:', options: ['Có sự cố an toàn cần thu hồi sản phẩm', 'Tăng giá bán', 'Giảm số nhân viên'], answer: 0, explain: 'Truy xuất nhanh giới hạn phạm vi thu hồi và bảo vệ người tiêu dùng.' },
        { q: 'HACCP tập trung vào:', options: ['Phòng ngừa mối nguy ở điểm kiểm soát tới hạn', 'Kiểm tra thành phẩm sau cùng', 'Tăng sản lượng bằng mọi giá'], answer: 0, explain: 'HACCP quản lý mối nguy từ sớm thay vì chỉ kiểm tra cuối quy trình.' }
      ]
    },
    {
      id: 'policy_analyst', title: 'Chuyên viên phân tích chính sách', company: 'AURELIS Policy Lab', tag: 'Chính sách', icon: '🏛️', color: '#94a3b8', field: 'public',
      level: 4, energy: 3, pay: 1480000, xp: 60, aura: 34, cooldown: 62, task: 'choice', rounds: 3, topic: 'CHÍNH SÁCH · KINH TẾ',
      desc: 'Đánh giá tác động chính sách lên doanh nghiệp, ngân sách và thị trường. Cần dữ kiện và tư duy phản biện.',
      upgrade: { name: 'Mô hình vi mô mô phỏng', cost: 13000000, bonus: 0.44, desc: '+44% thu nhập nhờ mô phỏng tác động chính sách theo nhóm dân cư.' },
      questions: [
        { q: 'Trước khi tăng thuế tiêu thụ đặc biệt, cần phân tích trước hết:', options: ['Độ co giãn cầu và tác động lên thu ngân sách, hành vi tiêu dùng', 'Số lượng bài báo viết về chính sách', 'Màu sắc báo cáo'], answer: 0, explain: 'Độ co giãn giúp dự báo thay đổi tiêu dùng và nguồn thu thực tế.' },
        { q: 'Chính sách trợ cấp có thể gây méo mó thị trường khi:', options: ['Nó khuyến khích sản xuất hoặc tiêu dùng quá mức hiệu quả thị trường', 'Nó minh bạch và có thời hạn', 'Nó hướng tới người yếu thế'], answer: 0, explain: 'Trợ cấp không thiết kế tốt có thể làm nguồn lực lệch khỏi phân bổ hiệu quả.' },
        { q: 'Đánh giá chính sách tốt cần dựa trên:', options: ['Dữ liệu, giả định rõ ràng và tác động phân phối', 'Ý kiến đám đông trên mạng', 'Lợi ích của một nhóm duy nhất'], answer: 0, explain: 'Phân tích chính sách cần minh bạch giả định và xem xét ai được, ai mất.' }
      ]
    },
    {
      id: 'tax_officer', title: 'Cán bộ nghiệp vụ thuế', company: 'AURELIS Tax Office', tag: 'Thuế công', icon: '🧾', color: '#94a3b8', field: 'public',
      level: 3, energy: 2, pay: 780000, xp: 42, aura: 22, cooldown: 50, task: 'math', rounds: 3, mathType: 'tax', topic: 'THUẾ · NGHĨA VỤ',
      desc: 'Kiểm tra nghĩa vụ thuế và tính số thuế phải nộp. Công bằng và chính xác là yêu cầu bắt buộc.',
      upgrade: { name: 'Hệ thống đối chiếu hoá đơn', cost: 6000000, bonus: 0.35, desc: '+35% thu nhập nhờ phát hiện chênh lệch và tính thuế tự động.' }
    },
    {
      id: 'urban_planner', title: 'Quy hoạch đô thị', company: 'AURELIS Urban', tag: 'Quy hoạch', icon: '🏙️', color: '#94a3b8', field: 'public',
      level: 5, energy: 3, pay: 2400000, xp: 82, aura: 48, cooldown: 82, task: 'choice', rounds: 3, topic: 'QUY HOẠCH · ĐÔ THỊ',
      desc: 'Cân bằng hạ tầng, dân cư và ngân sách cho một khu đô thị mới. Mỗi quyết định có tác động hàng chục năm.',
      upgrade: { name: 'Bản đồ số thành phố', cost: 26000000, bonus: 0.50, desc: '+50% thu nhập nhờ mô phỏng giao thông và sử dụng đất.' },
      questions: [
        { q: 'Khi quy hoạch khu dân cư mới, ưu tiên nào giúp giảm ùn tắc dài hạn?', options: ['Kết nối giao thông công cộng và trộn lẫn chức năng sử dụng đất', 'Chỉ mở rộng đường ô tô', 'Tăng mật độ xây dựng tối đa'], answer: 0, explain: 'TOD và đất hỗn hợp giảm nhu cầu di chuyển và tăng hiệu quả hạ tầng.' },
        { q: 'Đánh giá tác động môi trường cần thực hiện:', options: ['Trước khi phê duyệt quy hoạch và có tham vấn cộng đồng', 'Sau khi dự án hoàn thành', 'Chỉ khi có khiếu nại'], answer: 0, explain: 'Đánh giá sớm giúp điều chỉnh phương án và giảm chi phí khắc phục.' },
        { q: 'Nguồn thu tốt nhất để đầu tư hạ tầng đô thị bền vững là:', options: ['Thuế/đấu giá đất gắn với giá trị gia tăng do hạ tầng tạo ra', 'Vay nợ không giới hạn', 'Bán toàn bộ đất công giá rẻ'], answer: 0, explain: 'Thu hồi giá trị đất do hạ tầng tạo ra giúp chia sẻ lợi ích và giảm gánh nặng ngân sách.' }
      ]
    },
    {
      id: 'key_account', title: 'Quản lý khách hàng doanh nghiệp', company: 'AURELIS Bank', tag: 'Corporate Banking', icon: '🤝', color: '#ff8fb1', field: 'sales',
      level: 3, energy: 2, pay: 1050000, xp: 50, aura: 27, cooldown: 54, task: 'choice', rounds: 3, topic: 'BANKING · KHÁCH HÀNG',
      desc: 'Chăm sóc doanh nghiệp vay vốn và sử dụng dịch vụ. Hiểu dòng tiền khách hàng quan trọng hơn chốt doanh số.',
      upgrade: { name: 'CRM quan hệ khách hàng', cost: 9200000, bonus: 0.40, desc: '+40% thu nhập nhờ cảnh báo nhu cầu vốn và bán chéo dịch vụ.' },
      questions: [
        { q: 'Doanh nghiệp xin tăng hạn mức tín dụng nhưng dòng tiền hoạt động yếu. Bạn nên:', options: ['Phân tích dòng tiền, tài sản bảo đảm và đề xuất cấu trúc phù hợp', 'Duyệt ngay để giữ khách', 'Từ chối không giải thích'], answer: 0, explain: 'Cấp tín dụng phải dựa trên khả năng trả nợ, không chỉ quan hệ.' },
        { q: 'Bán chéo sản phẩm hiệu quả nhất khi:', options: ['Sản phẩm giải quyết nhu cầu thật của khách hàng', 'Khách hàng không biết gì về sản phẩm', 'Nhân viên được thưởng cao'], answer: 0, explain: 'Tư vấn dựa trên nhu cầu tạo quan hệ bền vững và giảm rủi ro.' },
        { q: 'Khi khách hàng phàn nàn về phí dịch vụ, cách xử lý tốt nhất:', options: ['Giải thích cấu trúc phí và đề xuất gói phù hợp', 'Miễn phí vô thời hạn', 'Đổ lỗi cho bộ phận khác'], answer: 0, explain: 'Minh bạch giá trị dịch vụ và lựa chọn gói giúp giữ khách hàng đúng cách.' }
      ]
    },
    {
      id: 'sales_director', title: 'Giám đốc kinh doanh', company: 'AURELIS Group', tag: 'Lãnh đạo', icon: '🏆', color: '#ff8fb1', field: 'sales',
      level: 5, energy: 3, pay: 2600000, xp: 86, aura: 50, cooldown: 88, task: 'choice', rounds: 3, topic: 'SALES · CHIẾN LƯỢC',
      desc: 'Thiết kế mục tiêu, đội ngũ và chính sách bán hàng. Tăng trưởng bền vững không đến từ ép chỉ tiêu vô lý.',
      upgrade: { name: 'Bảng điều khiển doanh thu', cost: 24000000, bonus: 0.50, desc: '+50% thu nhập nhờ dự báo doanh thu và tối ưu năng suất đội.' },
      questions: [
        { q: 'Đội sales mới chỉ đạt 60% chỉ tiêu. Ưu tiên nào hợp lý nhất?', options: ['Chẩn đoán kỹ năng, thị trường và quy trình trước khi đổi mục tiêu', 'Sa thải toàn bộ đội', 'Tăng chỉ tiêu gấp đôi'], answer: 0, explain: 'Cần tìm nguyên nhân gốc thay vì phản ứng bằng áp lực lớn hơn.' },
        { q: 'Chỉ số nào phản ánh chất lượng tăng trưởng tốt hơn doanh thu thuần?', options: ['Doanh thu thuần và tỷ lệ giữ chân khách hàng cùng chi phí thu hút', 'Số cuộc gọi', 'Số lượng quảng cáo'], answer: 0, explain: 'Tăng trưởng bền vững cần xem giữ chân khách hàng và chi phí có lại vốn.' },
        { q: 'Hoa hồng bán hàng nên được thiết kế để:', options: ['Thưởng cho giá trị khách hàng dài hạn, không chỉ doanh số ngắn hạn', 'Khuyến khích bán sản phẩm không phù hợp', 'Chỉ thưởng cho người bán lớn nhất'], answer: 0, explain: 'Cơ chế thưởng định hình hành vi; cần gắn với giá trị bền vững.' }
      ]
    },
    {
      id: 'copywriter', title: 'Copywriter tài chính', company: 'AURELIS Media', tag: 'Nội dung', icon: '✍️', color: '#c9a7ff', field: 'creative',
      level: 2, energy: 2, pay: 500000, xp: 33, aura: 16, cooldown: 42, task: 'choice', rounds: 3, topic: 'NỘI DUNG · TÀI CHÍNH',
      desc: 'Viết tiêu đề, nội dung và CTA cho sản phẩm tài chính. Rõ ràng, trung thực và không thổi phồng.',
      upgrade: { name: 'Bộ template nội dung', cost: 3000000, bonus: 0.32, desc: '+32% thu nhập nhờ quy trình brief và kiểm duyệt nhanh.' },
      questions: [
        { q: 'Tiêu đề nào phù hợp với sản phẩm tiết kiệm?', options: ['“Tích lũy đều mỗi tháng — lãi suất tham khảo 4,5%/năm”', '“Lãi suất cao nhất thị trường, chắc chắn sinh lời”', '“Làm giàu sau 7 ngày”'], answer: 0, explain: 'Minh bạch lãi suất tham khảo và kỳ hạn, không hứa hẹn lợi nhuận chắc chắn.' },
        { q: 'Khi viết về rủi ro đầu tư, nên:', options: ['Nêu rõ rủi ro có thể mất vốn bằng ngôn ngữ dễ hiểu', 'Ẩn rủi ro ở cuối trang', 'Nói rủi ro chỉ dành cho người khác'], answer: 0, explain: 'Truyền thông tài chính có trách nhiệm phải giúp người đọc hiểu rủi ro thực tế.' },
        { q: 'CTA tốt nên:', options: ['Rõ hành động và kỳ vọng, không gây áp lực giả tạo', 'Dùng đếm ngược giả', 'Hứa quà tặng chắc chắn'], answer: 0, explain: 'CTA trung thực giảm tỷ lệ huỷ và bảo vệ uy tín thương hiệu.' }
      ]
    },
    {
      id: 'ux', title: 'UX researcher', company: 'AURELIS Product', tag: 'UX', icon: '🔎', color: '#c9a7ff', field: 'creative',
      level: 3, energy: 2, pay: 1120000, xp: 52, aura: 28, cooldown: 56, task: 'choice', rounds: 3, topic: 'UX · NGHIÊN CỨU',
      desc: 'Phỏng vấn người dùng, phân tích hành vi và đề xuất cải tiến. Hiểu vấn đề đúng trước khi xây giải pháp.',
      upgrade: { name: 'Bộ công cụ usability test', cost: 10000000, bonus: 0.42, desc: '+42% thu nhập nhờ test nhanh và tổng hợp insight tự động.' },
      questions: [
        { q: 'Người dùng bỏ dở luồng đặt lệnh ở bước xác nhận. Bạn nên:', options: ['Phỏng vấn và quan sát hành vi để tìm nguyên nhân', 'Đổi màu nút ngay', 'Thêm nhiều bước hơn'], answer: 0, explain: 'Cần hiểu nguyên nhân (thiếu tin cậy, phí, lỗi) trước khi thiết kế lại.' },
        { q: 'Một mẫu 5 người dùng cho kết quả trái chiều. Cách xử lý đúng:', options: ['Xem đây là tín hiệu định tính, kiểm tra thêm với dữ liệu và mẫu lớn hơn', 'Chọn ý kiến đông hơn', 'Bỏ qua toàn bộ'], answer: 0, explain: 'Nghiên cứu nhỏ phát hiện vấn đề, nhưng cần dữ liệu định lượng để xác nhận.' },
        { q: 'Chỉ số nào đo mức độ dễ dùng của một tác vụ?', options: ['Tỷ lệ hoàn thành tác vụ và thời gian hoàn thành', 'Số lượng màu trên màn hình', 'Số lượt tải ứng dụng'], answer: 0, explain: 'Hoàn thành đúng và nhanh là thước đo cốt lõi của usability.' }
      ]
    },
    {
      id: 'brand', title: 'Giám đốc thương hiệu', company: 'AURELIS Group', tag: 'Thương hiệu', icon: '💎', color: '#c9a7ff', field: 'creative',
      level: 5, energy: 3, pay: 2550000, xp: 84, aura: 49, cooldown: 86, task: 'choice', rounds: 3, topic: 'BRAND · CHIẾN LƯỢC',
      desc: 'Định vị thương hiệu, quản trị khủng hoảng và tăng trưởng niềm tin. Danh tiếng tài chính được xây bằng nhất quán.',
      upgrade: { name: 'Bộ đo sức khoẻ thương hiệu', cost: 22000000, bonus: 0.48, desc: '+48% thu nhập nhờ theo dõi nhận diện và cảm xúc khách hàng.' },
      questions: [
        { q: 'Khi thương hiệu bị lan truyền thông tin sai lệch, hành động đầu tiên:', options: ['Xác minh dữ kiện, phản hồi minh bạch và cập nhật liên tục', 'Xoá bình luận và im lặng', 'Tấn công người phản ánh'], answer: 0, explain: 'Minh bạch và xác minh giúp kiểm soát khủng hoảng, im lặng dễ làm mất niềm tin.' },
        { q: 'Định vị thương hiệu tài chính tốt nên dựa trên:', options: ['Giá trị khác biệt khách hàng thật sự quan tâm và có thể chứng minh', 'Một khẩu hiệu hoa mỹ', 'Chi phí quảng cáo lớn nhất'], answer: 0, explain: 'Định vị phải đúng, khác biệt và được chứng minh qua trải nghiệm.' },
        { q: 'Chỉ số nào gắn nhất với niềm tin thương hiệu dài hạn?', options: ['Tỷ lệ giữ chân và giới thiệu của khách hàng', 'Số lượt xem một video', 'Số bài đăng mỗi ngày'], answer: 0, explain: 'Giữ chân và giới thiệu phản ánh trải nghiệm và niềm tin thực tế.' }
      ]
    },
    {
      id: 'podcast', title: 'Podcaster tài chính', company: 'AURELIS Media', tag: 'Podcast', icon: '🎙️', color: '#ff8fb1', field: 'media',
      level: 2, energy: 2, pay: 610000, xp: 36, aura: 18, cooldown: 46, task: 'choice', rounds: 3, topic: 'PODCAST · TRUYỀN THÔNG',
      desc: 'Sản xuất tập podcast về thị trường. Giữ người nghe bằng giá trị thật, không bằng tin giật gân.',
      upgrade: { name: 'Phòng thu podcast', cost: 4500000, bonus: 0.35, desc: '+35% thu nhập nhờ âm thanh sạch và quy trình sản xuất nhanh.' },
      questions: [
        { q: 'Khách mời đưa ra dự báo chắc chắn thị trường tăng 50%. Bạn nên:', options: ['Hỏi lại giả định, nêu rủi ro và nhắc đây là quan điểm cá nhân', 'Đồng ý để tăng lượt nghe', 'Cắt bỏ hoàn toàn'], answer: 0, explain: 'Người dẫn có trách nhiệm kiểm chứng và bối cảnh hoá quan điểm.' },
        { q: 'Tiêu đề tập podcast tốt nhất:', options: ['“Đọc báo cáo tài chính: 5 điều quan trọng nhất”', '“Mã này sắp x10, nghe ngay”', '“Bí mật kiếm tiền không ai dám nói”'], answer: 0, explain: 'Nội dung giáo dục rõ ràng tạo uy tín dài hạn và đúng quy định.' },
        { q: 'Khi thị trường giảm mạnh, tập podcast nên:', options: ['Bình tĩnh cung cấp dữ kiện và nguyên tắc quản trị rủi ro', 'Kêu gọi bắt đáy all-in', 'Ngừng phát sóng'], answer: 0, explain: 'Trong biến động, thông tin bình tĩnh và kỷ luật có giá trị nhất.' }
      ]
    },
    {
      id: 'data_journalist', title: 'Nhà báo dữ liệu', company: 'AURELIS Media', tag: 'Data Journalism', icon: '📰', color: '#ff8fb1', field: 'media',
      level: 3, energy: 2, pay: 900000, xp: 46, aura: 25, cooldown: 52, task: 'math', rounds: 3, mathType: 'ratio', topic: 'DỮ LIỆU · TỶ LỆ',
      desc: 'Tính tỷ lệ, so sánh và kiểm tra số liệu trước khi đăng. Một con số sai có thể làm sai cả câu chuyện.',
      upgrade: { name: 'Bộ kiểm chứng dữ liệu', cost: 7400000, bonus: 0.38, desc: '+38% thu nhập nhờ đối chiếu nguồn và trực quan hoá nhanh.' }
    },
    {
      id: 'procurement', title: 'Chuyên viên đấu thầu', company: 'AURELIS Group', tag: 'Đấu thầu', icon: '📑', color: '#4dd0e1', field: 'logistics',
      level: 4, energy: 3, pay: 1550000, xp: 61, aura: 34, cooldown: 64, task: 'choice', rounds: 3, topic: 'ĐẤU THẦU · NHÀ CUNG CẤP',
      desc: 'Chuẩn bị hồ sơ, đánh giá nhà cung cấp và kiểm soát rủi ro. Giá thấp chưa chắc là tổng chi phí thấp nhất.',
      upgrade: { name: 'Nền tảng đấu thầu số', cost: 14000000, bonus: 0.44, desc: '+44% thu nhập nhờ chấm điểm nhà cung cấp và so sánh TCO.' },
      questions: [
        { q: 'Nhà cung cấp báo giá thấp nhất nhưng thời gian giao hàng dài. Nên đánh giá thêm:', options: ['Tổng chi phí sở hữu, rủi ro trễ hạn và chi phí dự phòng', 'Chỉ giá báo', 'Màu hồ sơ'], answer: 0, explain: 'TCO và rủi ro vận hành quan trọng hơn giá niêm yết đơn thuần.' },
        { q: 'Để giảm rủi ro tập trung nhà cung cấp, nên:', options: ['Duy trì nhà cung cấp dự phòng và đánh giá định kỳ', 'Chỉ dùng một nhà cung cấp', 'Tăng khối lượng cho nhà cung cấp duy nhất'], answer: 0, explain: 'Đa dạng nguồn cung giúp giảm gián đoạn khi một nhà cung cấp gặp sự cố.' },
        { q: 'Khi nhà cung cấp đề nghị quà tặng cá nhân, bạn nên:', options: ['Từ chối hoặc báo cáo theo quy định xung đột lợi ích', 'Nhận nếu giá trị nhỏ', 'Nhận và giữ kín'], answer: 0, explain: 'Quà tặng có thể ảnh hưởng quyết định và vi phạm quy định đấu thầu.' }
      ]
    },
    {
      id: 'ai_trainer', title: 'Huấn luyện viên AI', company: 'AURELIS AI', tag: 'AI', icon: '🤖', color: '#6cb8ff', field: 'technology',
      level: 4, energy: 3, pay: 1720000, xp: 65, aura: 37, cooldown: 66, task: 'choice', rounds: 3, topic: 'AI · DỮ LIỆU & AN TOÀN',
      desc: 'Huấn luyện mô hình, kiểm tra thiên lệch và đánh giá rủi ro. AI tốt phải minh bạch và có kiểm soát.',
      upgrade: { name: 'Cụm GPU + công cụ đánh giá', cost: 18000000, bonus: 0.46, desc: '+46% thu nhập nhờ huấn luyện nhanh và kiểm thử an toàn.' },
      questions: [
        { q: 'Mô hình dự báo tín dụng cho kết quả tốt tổng thể nhưng bất lợi cho một nhóm. Bạn nên:', options: ['Đánh giá thiên lệch theo nhóm và điều chỉnh dữ liệu/tiêu chí', 'Bỏ qua vì chỉ số tổng tốt', 'Xoá nhóm khỏi dữ liệu'], answer: 0, explain: 'Công bằng cần đo theo nhóm; bỏ dữ liệu chỉ che giấu vấn đề.' },
        { q: 'Dữ liệu huấn luyện bị rò rỉ nhãn tương lai sẽ dẫn đến:', options: ['Kết quả đánh giá lạc quan giả tạo', 'Mô hình chắc chắn tốt hơn ngoài thực tế', 'Không ảnh hưởng'], answer: 0, explain: 'Rò rỉ dữ liệu làm mô hình học thông tin không có khi dự báo thực tế.' },
        { q: 'Một mô hình AI đưa khuyến nghị đầu tư. Cần bổ sung gì trước khi dùng?', options: ['Giải thích, giới hạn sử dụng và con người chịu trách nhiệm', 'Ẩn mọi giới hạn', 'Cho mô hình tự quyết định'], answer: 0, explain: 'Minh bạch và trách nhiệm con người là yêu cầu thiết yếu với AI tài chính.' }
      ]
    },
    {
      id: 'risk_insurtech', title: 'Chuyên viên insurtech', company: 'AURELIS Insure', tag: 'Insurtech', icon: '📡', color: '#ff5d73', field: 'risk',
      level: 4, energy: 3, pay: 1600000, xp: 63, aura: 35, cooldown: 64, task: 'math', rounds: 3, mathType: 'breakeven', topic: 'BẢO HIỂM · ĐIỂM HOÀ VỐN',
      desc: 'Định giá rủi ro, tính điểm hoà vốn và thiết kế sản phẩm bảo hiểm số. Số liệu quyết định khả năng sinh lời.',
      upgrade: { name: 'Mô hình định phí realtime', cost: 15000000, bonus: 0.45, desc: '+45% thu nhập nhờ dự báo tổn thất và định phí theo hành vi.' }
    },
    {
      id: 'mechanic', title: 'Kỹ thuật viên máy', company: 'AURELIS Industrial', tag: 'Bảo trì', icon: '🔧', color: '#78909c', field: 'operations',
      level: 2, energy: 2, pay: 560000, xp: 35, aura: 17, cooldown: 45, task: 'sequence', rounds: 3, topic: 'BẢO TRÌ · AN TOÀN',
      signals: ['🛑', '🔧', '⚙️', '✅'],
      desc: 'Ghi nhớ quy trình dừng máy, khoá nguồn và bảo trì. Bỏ qua bước an toàn có thể gây tai nạn.',
      upgrade: { name: 'Bộ dụng cụ chẩn đoán', cost: 3900000, bonus: 0.33, desc: '+33% thu nhập nhờ phát hiện sớm hao mòn và giảm downtime.' }
    },
    {
      id: 'electrician', title: 'Thợ điện công nghiệp', company: 'AURELIS Industrial', tag: 'Điện', icon: '💡', color: '#78909c', field: 'operations',
      level: 3, energy: 2, pay: 820000, xp: 44, aura: 24, cooldown: 50, task: 'sequence', rounds: 3, topic: 'ĐIỆN · QUY TRÌNH',
      signals: ['⚡', '🔌', '🛠️', '🧤'],
      desc: 'Thực hiện đúng thứ tự cách ly, kiểm tra và đấu nối. Một bước sai có thể gây hồ quang.',
      upgrade: { name: 'Thiết bị đo cách điện', cost: 6200000, bonus: 0.35, desc: '+35% thu nhập nhờ kiểm tra an toàn nhanh và chính xác.' }
    },
    {
      id: 'travel_agent', title: 'Chuyên viên tư vấn du lịch', company: 'AURELIS Travel', tag: 'Tư vấn', icon: '🌴', color: '#5ac8fa', field: 'hospitality',
      level: 2, energy: 1, pay: 430000, xp: 30, aura: 14, cooldown: 40, task: 'math', rounds: 3, mathType: 'roi', topic: 'DU LỊCH · NGÂN SÁCH',
      desc: 'Tính ngân sách tour, tỷ lệ hoàn huỷ và chi phí tối ưu cho khách. Con số phải rõ trước khi chốt.',
      upgrade: { name: 'Công cụ báo giá tự động', cost: 2400000, bonus: 0.31, desc: '+31% thu nhập nhờ so sánh vé, khách sạn và chính sách hoàn huỷ.' }
    },
    {
      id: 'chef_teacher', title: 'Giảng viên ẩm thực', company: 'AURELIS Kitchen', tag: 'Đào tạo F&B', icon: '👨‍🍳', color: '#ff9f43', field: 'education',
      level: 3, energy: 2, pay: 900000, xp: 46, aura: 25, cooldown: 52, task: 'sequence', rounds: 3, topic: 'ẨM THỰC · QUY TRÌNH',
      signals: ['🔪', '🍳', '🥘', '🍽️'],
      desc: 'Hướng dẫn học viên đúng thứ tự sơ chế, nấu và trình bày. Quy trình chuẩn tạo món ăn ổn định.',
      upgrade: { name: 'Bếp demo 12 chỗ', cost: 7600000, bonus: 0.37, desc: '+37% thu nhập nhờ lớp học quy mô lớn và nguyên liệu tối ưu.' }
    },
    {
      id: 'fin_podcast_editor', title: 'Biên tập viên tài chính', company: 'AURELIS Media', tag: 'Biên tập', icon: '📝', color: '#ff8fb1', field: 'media',
      level: 2, energy: 2, pay: 480000, xp: 32, aura: 15, cooldown: 42, task: 'math', rounds: 3, mathType: 'margin', topic: 'BIÊN TẬP · HIỆU QUẢ',
      desc: 'Kiểm tra số liệu, tính toán tỷ lệ và biên nội dung trước khi xuất bản. Chính xác là chuẩn mực nghề.',
      upgrade: { name: 'Bộ kiểm tra số liệu tự động', cost: 2800000, bonus: 0.30, desc: '+30% thu nhập nhờ đối chiếu nguồn và phát hiện lỗi nhanh.' }
    },
    {
      id: 'recruiter', title: 'Chuyên viên tuyển dụng', company: 'AURELIS People', tag: 'Nhân sự', icon: '🧑‍💼', color: '#b59cff', field: 'client',
      level: 3, energy: 2, pay: 840000, xp: 44, aura: 24, cooldown: 50, task: 'choice', rounds: 3, topic: 'NHÂN SỰ · TUYỂN DỤNG',
      desc: 'Sàng lọc ứng viên, đánh giá năng lực và thương lượng offer. Tuyển đúng người quan trọng hơn tuyển nhanh.',
      upgrade: { name: 'ATS + bài test năng lực', cost: 6800000, bonus: 0.36, desc: '+36% thu nhập nhờ sàng lọc tự động và giảm thời gian tuyển.' },
      questions: [
        { q: 'Ứng viên rất giỏi chuyên môn nhưng không phù hợp văn hoá đội. Bạn nên:', options: ['Đánh giá thêm hành vi, kỳ vọng và thử việc có mục tiêu', 'Tuyển ngay vì giỏi', 'Loại hồ sơ ngay'], answer: 0, explain: 'Cả năng lực và phù hợp văn hoá đều ảnh hưởng hiệu quả dài hạn.' },
        { q: 'Khi ứng viên hỏi về mức lương kỳ vọng, cách tốt nhất:', options: ['Trao đổi dải lương dựa trên giá trị vị trí và mặt bằng thị trường', 'Hứa mức cao nhất để chốt', 'Từ chối trả lời'], answer: 0, explain: 'Minh bạch dải lương giúp tránh kỳ vọng sai và giữ chân nhân sự.' },
        { q: 'Chỉ số nào đo chất lượng tuyển dụng tốt nhất?', options: ['Tỷ lệ nhân viên mới đạt hiệu suất và ở lại sau 12 tháng', 'Số lượng CV nhận được', 'Thời gian đăng tin'], answer: 0, explain: 'Chất lượng tuyển dụng thể hiện ở hiệu suất và giữ chân, không phải lượng hồ sơ.' }
      ]
    }
  ];

  JOB_FIELDS.push(...JOB_FIELDS_V12);
  JOBS.push(...JOBS_V12);

  /* ------------------- v1.13: NGÂN HÀNG CÂU HỎI THEO LĨNH VỰC -------------------
     Mỗi ca làm sẽ trộn câu hỏi riêng của nghề, câu hỏi theo lĩnh vực và vài câu
     kiến thức chung. Nhờ vậy một nghề không lặp lại mãi 3-5 câu cũ. */
  const JOB_QUESTION_BANK = {
    general: [
      { q: 'Gửi 100 triệu với lãi kép 10%/năm, sau 2 năm (ghép lãi mỗi năm) bạn có khoảng:', options: ['121 triệu', '120 triệu', '110 triệu', '100 triệu'], answer: 0, explain: '100 × 1,1² = 121 triệu. Lãi kép tính cả phần lãi của năm trước.' },
      { q: 'Quỹ khẩn cấp hợp lý thường nên đủ chi tiêu bao lâu?', options: ['1 tuần', '3-6 tháng', '5-10 năm', 'Không cần quỹ khẩn cấp'], answer: 1, explain: '3-6 tháng chi phí giúp bạn không phải bán tài sản đầu tư khi gặp việc đột xuất.' },
      { q: 'Lạm phát 3%/năm. Sau 3 năm, 100 triệu chỉ còn sức mua tương đương khoảng:', options: ['97 triệu', '91,5 triệu', '85 triệu', '70 triệu'], answer: 1, explain: '100 / 1,03³ ≈ 91,5 triệu theo giá trị hiện tại.' },
      { q: 'Đa dạng hóa danh mục giúp gì?', options: ['Loại bỏ hoàn toàn rủi ro', 'Giảm rủi ro riêng của từng mã, không xóa rủi ro toàn thị trường', 'Đảm bảo luôn có lãi', 'Tăng phí giao dịch'], answer: 1, explain: 'Đa dạng hóa giảm rủi ro không hệ thống; rủi ro thị trường vẫn còn.' },
      { q: 'Mua một coin chỉ vì thấy người khác lãi lớn là biểu hiện của:', options: ['Phân tích cơ bản', 'FOMO', 'Tái cân bằng', 'Phòng ngừa rủi ro'], answer: 1, explain: 'FOMO khiến bạn mua ở giá xấu và bỏ qua rủi ro.' },
      { q: 'Seed phrase của ví crypto nên được:', options: ['Chụp ảnh lưu trong điện thoại', 'Gửi qua chat cho người hỗ trợ', 'Lưu offline ở nơi an toàn và không chia sẻ', 'Đăng lên mạng xã hội để sao lưu'], answer: 2, explain: 'Ai có seed phrase có thể lấy toàn bộ tài sản. Không chia sẻ với bất kỳ ai.' },
      { q: 'Dấu hiệu rõ nhất của mô hình Ponzi là:', options: ['Cam kết lợi nhuận cao cố định và trả tiền người cũ bằng tiền người mới', 'Có sản phẩm thật và báo cáo tài chính', 'Phí giao dịch minh bạch', 'Có nhiều chi nhánh'], answer: 0, explain: 'Ponzi dùng tiền người sau trả người trước; không có nguồn thu bền vững.' },
      { q: 'Phí 0,5% mỗi lần giao dịch ảnh hưởng thế nào nếu bạn giao dịch 40 lần/tháng?', options: ['Không đáng kể', 'Khoảng 20% vốn bị phí bào mòn', 'Chỉ 0,5% một lần', 'Giảm khi lỗ'], answer: 1, explain: '0,5% × 40 = 20% giá trị giao dịch. Giao dịch dày làm phí thành chi phí lớn.' },
      { q: 'Vai trò chính của bảo hiểm là:', options: ['Sinh lời nhanh', 'Chuyển rủi ro lớn, hiếm gặp sang công ty bảo hiểm', 'Thay thế quỹ khẩn cấp', 'Đảm bảo giàu có'], answer: 1, explain: 'Bảo hiểm bảo vệ trước tổn thất lớn, không phải kênh đầu tư sinh lời chính.' },
      { q: 'Quy tắc 50/30/20 chia thu nhập cho:', options: ['Đầu tư/cờ bạc/tiết kiệm', 'Nhu cầu thiết yếu/mong muốn/tiết kiệm và trả nợ', 'Thuế/phí/lãi', 'Cổ phiếu/trái phiếu/vàng'], answer: 1, explain: 'Đây là khung tham khảo để cân đối chi tiêu, không phải quy tắc cứng.' },
      { q: 'Chi phí đã bỏ ra không thể thu hồi được gọi là:', options: ['Chi phí cơ hội', 'Chi phí chìm', 'Chi phí biên', 'Chi phí cố định'], answer: 1, explain: 'Chi phí chìm không nên ảnh hưởng đến quyết định tiếp theo.' },
      { q: 'Chi phí cơ hội của việc giữ 500 triệu trong tiền mặt là:', options: ['Số tiền bị mất khi bị trộm', 'Lợi tức có thể kiếm được từ phương án tốt nhất bị bỏ qua', 'Phí chuyển khoản', 'Lạm phát của năm trước'], answer: 1, explain: 'Giữ tiền mặt có thể an toàn nhưng bạn bỏ qua lợi tức của lựa chọn khác.' },
      { q: 'Trung bình giá xuống nguy hiểm nhất khi:', options: ['Bạn có kế hoạch dài hạn và luận điểm còn đúng', 'Luận điểm đầu tư đã sai nhưng bạn vẫn mua thêm để gỡ', 'Bạn mua theo tỷ lệ cố định', 'Bạn có tiền nhàn rỗi'], answer: 1, explain: 'Mua thêm vào khoản đầu tư sai chỉ làm lỗ lớn hơn.' },
      { q: 'Margin call xảy ra khi:', options: ['Tài khoản có lãi quá lớn', 'Giá trị tài sản đảm bảo giảm dưới mức ký quỹ yêu cầu', 'Bạn rút tiền mặt', 'Bạn mua thêm cổ phiếu'], answer: 1, explain: 'Khi ký quỹ không đủ, công ty môi giới yêu cầu nộp thêm hoặc bán tài sản.' },
      { q: 'Nợ thẻ tín dụng 25%/năm nên được ưu tiên:', options: ['Đầu tư crypto trước', 'Trả hết trước khi đầu tư mạo hiểm', 'Để đó vì lạm phát', 'Chỉ trả khi bị nhắc'], answer: 1, explain: 'Lãi 25%/năm cao hơn lợi nhuận kỳ vọng của phần lớn khoản đầu tư.' },
      { q: 'Khác biệt cốt lõi giữa đầu tư và đầu cơ là:', options: ['Đầu tư chỉ dành cho người giàu', 'Đầu tư dựa vào dòng tiền/giá trị, đầu cơ dựa chủ yếu vào giá bán lại', 'Đầu cơ luôn bất hợp pháp', 'Không có khác biệt'], answer: 1, explain: 'Cả hai đều có rủi ro; khác biệt nằm ở cơ sở kỳ vọng lợi nhuận.' },
      { q: 'DCA (mua đều định kỳ) có tác dụng chính là:', options: ['Đảm bảo thắng thị trường', 'Giảm ảnh hưởng của việc chọn sai thời điểm', 'Loại bỏ phí giao dịch', 'Tăng lãi suất tiết kiệm'], answer: 1, explain: 'DCA phân tán thời điểm mua, nhưng không đảm bảo có lãi.' },
      { q: 'Thanh khoản của một tài sản thể hiện:', options: ['Mức lãi cam kết', 'Khả năng bán nhanh với giá gần giá thị trường', 'Số lượng người theo dõi', 'Tuổi của tài sản'], answer: 1, explain: 'Thanh khoản thấp khiến bạn khó thoát hoặc phải bán rẻ.' },
      { q: 'Dùng đòn bẩy 10x, giá giảm 10% sẽ:', options: ['Lỗ 1% vốn', 'Lỗ khoảng 100% vốn', 'Không ảnh hưởng', 'Có lãi 10%'], answer: 1, explain: 'Đòn bẩy khuếch đại cả lãi và lỗ; mức giảm 10% xóa gần hết vốn.' },
      { q: 'Mô hình đa cấp (MLM) thường có dấu hiệu:', options: ['Doanh thu chủ yếu từ tuyển người mới', 'Sản phẩm được kiểm định độc lập', 'Báo cáo tài chính công khai', 'Hoàn tiền không điều kiện'], answer: 0, explain: 'Nếu thu nhập chủ yếu đến từ tuyển người, đó là dấu hiệu mô hình bền vững kém.' },
      { q: 'Khi đọc hợp đồng vay, con số quan trọng nhất là:', options: ['Số tiền quảng cáo', 'Lãi suất thực, phí và điều khoản phạt', 'Màu logo', 'Số chi nhánh'], answer: 1, explain: 'Lãi suất danh nghĩa có thể che giấu phí và lãi phạt.' },
      { q: 'Giữ toàn bộ tài sản trong tiền mặt trong thời gian dài có rủi ro:', options: ['Mất giá thực do lạm phát', 'Không thể rút tiền', 'Bị đánh thuế 100%', 'Không có rủi ro'], answer: 0, explain: 'Tiền mặt an toàn về số danh nghĩa nhưng sức mua giảm theo lạm phát.' },
      { q: 'Bán chứng khoán theo T+2 nghĩa là:', options: ['Tiền có ngay lập tức', 'Tiền thường về sau 2 ngày làm việc', 'Phải bán sau 2 năm', 'Chỉ được bán 2 lần'], answer: 1, explain: 'T+2 là chu kỳ thanh toán; tiền bán chưa dùng được ngay.' },
      { q: 'Nhật ký giao dịch hữu ích nhất ở điểm nào?', options: ['Làm đẹp báo cáo', 'Giúp nhận ra lỗi lặp lại và đánh giá quyết định', 'Tăng lợi nhuận tự động', 'Giảm thuế'], answer: 1, explain: 'Ghi lý do vào lệnh, cảm xúc và kết quả giúp cải thiện quy trình.' }
    ],
    operations: [
      { q: 'Đơn giao hàng trễ 20 phút, khách đã chờ lâu. Bạn nên:', options: ['Im lặng chờ giao xong', 'Gọi xin lỗi, báo giờ mới và đề xuất phương án bù', 'Đổ lỗi cho tài xế trước mặt khách', 'Hủy đơn không thông báo'], answer: 1, explain: 'Thông tin sớm và chủ động bù đắp giữ được niềm tin tốt hơn là im lặng.' },
      { q: 'Hàng tồn kho tăng nhanh hơn doanh thu. Dấu hiệu này cho thấy:', options: ['Vòng quay hàng tồn giảm, vốn bị chôn', 'Doanh nghiệp đang lãi lớn', 'Nên nhập thêm hàng', 'Không cần quan tâm'], answer: 0, explain: 'Tồn kho phình ra trong khi bán chậm là dấu hiệu vốn bị giữ trong hàng hóa.' },
      { q: 'Giờ cao điểm quán đông, một nhân viên nghỉ đột xuất. Cách xử lý hợp lý nhất:', options: ['Đóng cửa ngay', 'Điều phối người đa năng, tạm rút gọn menu và xin lỗi khách', 'Giảm chất lượng phục vụ cho nhanh', 'Tăng giá đột ngột'], answer: 1, explain: 'Giảm tải có kiểm soát và giữ trải nghiệm cốt lõi tốt hơn là vỡ trận.' },
      { q: 'Một quy trình chuẩn (SOP) tốt nên:', options: ['Thật dài để chứng minh chuyên nghiệp', 'Ngắn, có bước kiểm tra và được cập nhật từ lỗi thực tế', 'Không ai cần đọc', 'Chỉ dùng khi có kiểm tra'], answer: 1, explain: 'SOP chỉ có giá trị khi dễ làm theo và được sửa sau mỗi sự cố.' },
      { q: 'Chi phí giao hàng mỗi đơn đang cao. Cách giảm bền vững:', options: ['Gộp đơn theo tuyến và tối ưu khung giờ', 'Cắt hết phí giao hàng', 'Tăng lương tài xế gấp đôi', 'Giao chậm hơn'], answer: 0, explain: 'Gom đơn và tối ưu tuyến giảm chi phí mà không phá chất lượng.' },
      { q: 'Tỷ lệ hàng hoàn về tăng. Việc cần làm đầu tiên:', options: ['Tăng giá bán', 'Ghi nhận lý do hoàn và sửa khâu đóng gói/giao', 'Bỏ qua vì đã có bảo hiểm', 'Đổ lỗi cho khách'], answer: 1, explain: 'Dữ liệu lý do hoàn giúp sửa đúng gốc thay vì chỉ đền bù.' }
    ],
    research: [
      { q: 'Cổ phiếu có P/E thấp hơn ngành chưa chắc rẻ vì:', options: ['P/E không bao giờ đúng', 'Lợi nhuận có thể đang ở đỉnh chu kỳ hoặc doanh nghiệp có rủi ro', 'P/E chỉ dành cho ngân hàng', 'Giá cổ phiếu luôn phản ánh đúng'], answer: 1, explain: 'P/E thấp có thể là bẫy giá trị nếu lợi nhuận không bền.' },
      { q: 'EV/EBITDA phù hợp khi nào?', options: ['Khi so sánh doanh nghiệp khác cấu trúc vốn và thuế', 'Khi doanh nghiệp lỗ', 'Khi định giá ngân hàng', 'Khi không có báo cáo tài chính'], answer: 0, explain: 'EV/EBITDA trung hòa một phần khác biệt nợ và thuế giữa các doanh nghiệp.' },
      { q: 'Dòng tiền tự do (FCF) quan trọng vì:', options: ['Là lợi nhuận kế toán', 'Là tiền còn lại sau đầu tư duy trì, dùng để trả nợ/cổ tức/mua lại', 'Luôn cao hơn doanh thu', 'Không bị ảnh hưởng bởi vốn lưu động'], answer: 1, explain: 'FCF cho thấy doanh nghiệp thực sự tạo ra tiền sau chi đầu tư cần thiết.' },
      { q: 'Biên an toàn (margin of safety) nghĩa là:', options: ['Mua bằng mọi giá', 'Mua dưới giá trị ước tính đủ xa để chịu được sai số', 'Chỉ mua cổ phiếu giá thấp', 'Bán ngay khi có lãi'], answer: 1, explain: 'Định giá luôn có sai số; biên an toàn bảo vệ bạn khỏi ước tính quá lạc quan.' },
      { q: 'Khi đọc một bài phân tích, nguồn thứ cấp nên được:', options: ['Tin hoàn toàn', 'Kiểm tra lại với báo cáo gốc và số liệu công bố', 'Bỏ qua', 'Chỉ đọc tiêu đề'], answer: 1, explain: 'Bài viết có thể sai hoặc thiếu bối cảnh; báo cáo gốc là nguồn kiểm chứng.' },
      { q: 'Một luận điểm đầu tư tốt cần có:', options: ['Càng nhiều từ khóa càng tốt', 'Điều kiện đúng/sai rõ, rủi ro chính và định giá', 'Chỉ một câu dự đoán', 'Không cần kiểm tra lại'], answer: 1, explain: 'Luận điểm phải có thể kiểm chứng và có kế hoạch nếu sai.' }
    ],
    client: [
      { q: 'Khách lớn tuổi muốn dồn toàn bộ tiền hưu vào một cổ phiếu đang hot. Bạn nên:', options: ['Làm theo ngay', 'Hỏi mục tiêu, thời hạn, khả năng chịu rủi ro và giải thích rủi ro tập trung', 'Từ chối phục vụ', 'Bán sản phẩm khác có phí cao hơn'], answer: 1, explain: 'Tư vấn phải dựa trên hồ sơ khách hàng và rủi ro mất vốn.' },
      { q: 'Mục đích của KYC là:', options: ['Tăng doanh số', 'Hiểu khách hàng, chống rửa tiền và xác định sản phẩm phù hợp', 'Thu thập dữ liệu để bán', 'Trì hoãn giao dịch'], answer: 1, explain: 'KYC bảo vệ khách hàng và hệ thống tài chính.' },
      { q: 'Khi có xung đột lợi ích trong tư vấn, bạn nên:', options: ['Giấu đi để chốt nhanh', 'Công bố rõ và ưu tiên lợi ích khách hàng', 'Chỉ nói khi khách hỏi', 'Chuyển sang sản phẩm khác'], answer: 1, explain: 'Minh bạch xung đột lợi ích là nguyên tắc đạo đức cơ bản.' },
      { q: 'Khách phàn nàn phí quá cao. Cách phản hồi tốt nhất:', options: ['Giảm phí ngay lập tức', 'Giải thích cấu phần phí và so sánh giá trị nhận được', 'Nói đó là quy định', 'Chuyển máy'], answer: 1, explain: 'Hiểu phí gắn với giá trị nào giúp khách ra quyết định tỉnh táo.' },
      { q: 'Khi giới thiệu sản phẩm phức tạp, cần:', options: ['Dùng nhiều thuật ngữ để tạo uy tín', 'Giải thích bằng ví dụ, nêu rủi ro mất vốn, không hứa lợi nhuận', 'Chỉ đưa bảng lãi', 'Cam kết lãi suất'], answer: 1, explain: 'Khách cần hiểu rủi ro trước khi ký, không chỉ thấy lợi nhuận.' },
      { q: 'Khách đang rất giận. Bước đầu tiên là:', options: ['Tranh luận để bảo vệ mình', 'Lắng nghe, xác nhận vấn đề và nêu bước xử lý cụ thể', 'Chuyển cuộc gọi', 'Hứa mọi thứ'], answer: 1, explain: 'Lắng nghe và cam kết hành động rõ ràng làm dịu tình huống.' }
    ],
    technology: [
      { q: 'API thanh toán timeout nhưng có thể đã trừ tiền. Cách xử lý đúng:', options: ['Gọi lại mù quáng nhiều lần', 'Dùng idempotency key và đối soát trạng thái giao dịch', 'Bỏ qua', 'Xóa log'], answer: 1, explain: 'Idempotency tránh trừ tiền hai lần; đối soát xác định trạng thái thật.' },
      { q: 'Khi lưu số tiền trong hệ thống tài chính, nên dùng:', options: ['Số thực float', 'Số nguyên đơn vị nhỏ nhất hoặc kiểu decimal', 'Chuỗi tùy ý', 'Số mũ'], answer: 1, explain: 'Float gây sai số làm tròn; decimal hoặc integer an toàn hơn.' },
      { q: 'Khi gọi API bên thứ ba bị giới hạn tần suất, nên:', options: ['Gọi liên tục cho tới khi được', 'Tôn trọng rate limit, cache và retry với backoff', 'Đổi IP liên tục', 'Bỏ qua lỗi'], answer: 1, explain: 'Backoff và cache giảm tải, tránh bị khóa.' },
      { q: 'Dashboard tài chính tải chậm vì gọi 20 API mỗi lần mở. Cải thiện:', options: ['Thêm animation', 'Gộp request, cache và tải dữ liệu theo nhu cầu', 'Tăng kích thước ảnh', 'Bỏ phân trang'], answer: 1, explain: 'Giảm số round-trip và dùng cache là cách hiệu quả nhất.' },
      { q: 'API key bí mật nên được đặt ở đâu?', options: ['Trong JavaScript frontend', 'Trong biến môi trường phía server hoặc proxy', 'Trong HTML', 'Trong localStorage'], answer: 1, explain: 'Mọi thứ ở frontend đều có thể bị xem; secret phải nằm phía server.' },
      { q: 'Log lỗi production nên có:', options: ['Toàn bộ dữ liệu khách hàng', 'Mã tương quan, thời điểm, ngữ cảnh và che dữ liệu nhạy cảm', 'Chỉ dòng "error"', 'Không cần log'], answer: 1, explain: 'Log đủ ngữ cảnh để điều tra nhưng phải bảo vệ dữ liệu cá nhân.' }
    ],
    media: [
      { q: 'Một tiêu đề giật gân nhưng sai bản chất. Bạn nên:', options: ['Giữ nguyên vì tăng view', 'Sửa lại cho đúng và giữ sự chú ý bằng dữ liệu', 'Xóa bài', 'Đổi tác giả'], answer: 1, explain: 'Sai lệch gây mất uy tín lâu dài, kể cả khi được nhiều view.' },
      { q: 'Tin chưa được kiểm chứng nên:', options: ['Đăng ngay để nhanh', 'Chờ xác nhận từ nguồn đáng tin và ghi rõ nguồn', 'Đăng kèm dấu hỏi', 'Xóa sau khi đăng'], answer: 1, explain: 'Tốc độ không đáng để đánh đổi độ chính xác.' },
      { q: 'Cộng đồng hỏi "có nên mua mã này không". Phản hồi phù hợp:', options: ['Khuyến nghị mua mạnh', 'Nêu rủi ro, nguyên tắc tự nghiên cứu, không đưa lời khuyên cá nhân hóa', 'Bán tín hiệu', 'Chặn người hỏi'], answer: 1, explain: 'Người truyền thông không nên đưa khuyến nghị đầu tư cá nhân khi không có giấy phép.' },
      { q: 'Khi xảy ra khủng hoảng truyền thông, nên:', options: ['Im lặng hoàn toàn', 'Phản hồi sớm, nhận phần sai và nêu hành động cụ thể', 'Đổ lỗi cho đối thủ', 'Xóa bình luận'], answer: 1, explain: 'Phản hồi minh bạch và có hành động giúp giảm thiệt hại.' },
      { q: 'Nội dung được tài trợ cần:', options: ['Ẩn nhãn tài trợ', 'Gắn nhãn rõ ràng để người đọc biết', 'Viết như tin thường', 'Chỉ ghi ở cuối trang'], answer: 1, explain: 'Minh bạch tài trợ là yêu cầu đạo đức và pháp lý.' },
      { q: 'Hai nguồn số liệu mâu thuẫn. Cách làm tốt nhất:', options: ['Chọn số có lợi cho bài viết', 'Trình bày cả hai, giải thích phương pháp và giới hạn', 'Bỏ số liệu', 'Tự bịa số trung bình'], answer: 1, explain: 'Trình bày minh bạch giúp người đọc tự đánh giá.' }
    ],
    portfolio: [
      { q: 'Danh mục có 10 mã nhưng cùng một ngành. Điều này:', options: ['Đã đa dạng hóa tốt', 'Chưa đa dạng, rủi ro ngành vẫn tập trung', 'Luôn an toàn hơn trái phiếu', 'Không ảnh hưởng'], answer: 1, explain: 'Số lượng mã không thay thế được đa dạng ngành và yếu tố rủi ro.' },
      { q: 'Khi nào nên tái cân bằng danh mục?', options: ['Mỗi giờ', 'Khi tỷ trọng lệch mục tiêu đủ lớn hoặc theo lịch định kỳ', 'Chỉ khi thị trường tăng', 'Không bao giờ'], answer: 1, explain: 'Tái cân bằng có kỷ luật giúp kiểm soát rủi ro, tránh giao dịch cảm tính.' },
      { q: 'Hai tài sản có tương quan cao nghĩa là:', options: ['Luôn tăng cùng lúc', 'Biến động cùng chiều mạnh, giảm tác dụng đa dạng hóa', 'Không liên quan', 'Chắc chắn sinh lời'], answer: 1, explain: 'Tương quan cao khiến danh mục chịu rủi ro giống nhau dù có nhiều mã.' },
      { q: 'Position sizing (quy mô vị thế) nhằm:', options: ['Tối đa hóa số lệnh', 'Giới hạn tỷ trọng theo rủi ro và thanh khoản', 'Tăng phí', 'Bỏ qua stop loss'], answer: 1, explain: 'Một vị thế quá lớn có thể xóa thành quả của nhiều lệnh đúng.' },
      { q: 'Danh mục giảm 30%. Phản ứng hợp lý:', options: ['Bán tất cả ngay', 'Kiểm tra luận điểm và kế hoạch, không bán hoảng nếu kế hoạch còn đúng', 'Mua tất tay', 'Xóa ứng dụng'], answer: 1, explain: 'Drawdown là bình thường; quyết định nên dựa trên kế hoạch, không chỉ cảm xúc.' },
      { q: 'Mục tiêu tài chính ngắn hạn 6 tháng nên ưu tiên:', options: ['Cổ phiếu biến động cao', 'Thanh khoản cao và ít biến động', 'Bất động sản', 'Hợp đồng phái sinh'], answer: 1, explain: 'Tiền cần dùng gần không nên chịu rủi ro thị trường lớn.' }
    ],
    quant: [
      { q: 'Backtest báo thắng 95% nhưng lệnh rất ít. Bạn nên:', options: ['Tin ngay', 'Kiểm tra overfit, lookahead và ý nghĩa thống kê', 'Tăng đòn bẩy', 'Đăng bán tín hiệu'], answer: 1, explain: 'Kết quả đẹp trên mẫu nhỏ hoặc mẫu đã tối ưu thường không lặp lại.' },
      { q: 'Survivorship bias là gì?', options: ['Chỉ dùng mã còn tồn tại, bỏ qua mã đã hủy niêm yết', 'Chỉ dùng dữ liệu tuần', 'Bỏ qua phí', 'Dùng dữ liệu thật'], answer: 0, explain: 'Bỏ mã đã chết làm hiệu suất quá khứ trông tốt hơn thực tế.' },
      { q: 'Sharpe ratio cao nhưng chỉ có 20 lệnh. Cần lưu ý:', options: ['Sharpe luôn đúng', 'Kết quả có thể do may mắn, cần kiểm định ý nghĩa', 'Nên vay tối đa', 'Không cần out-of-sample'], answer: 1, explain: 'Mẫu nhỏ dễ tạo kết quả ấn tượng ngẫu nhiên.' },
      { q: 'Slippage và phí nên được:', options: ['Bỏ qua cho đẹp kết quả', 'Đưa vào backtest để phản ánh chi phí thật', 'Chỉ tính khi lỗ', 'Tính sau khi giao dịch'], answer: 1, explain: 'Chi phí giao dịch có thể biến chiến lược lãi thành lỗ.' },
      { q: 'Out-of-sample test dùng để:', options: ['Tối ưu thêm tham số', 'Kiểm tra chiến lược trên dữ liệu chưa dùng để tối ưu', 'Tăng số lệnh', 'Bỏ qua phí'], answer: 1, explain: 'Dữ liệu ngoài mẫu cho biết chiến lược có tổng quát hóa hay không.' },
      { q: 'Tín hiệu dựa trên giá đóng cửa nhưng vào lệnh cùng lúc đóng cửa là:', options: ['Hợp lệ', 'Lookahead bias', 'Đòn bẩy', 'Tái cân bằng'], answer: 1, explain: 'Bạn chỉ biết giá đóng cửa sau khi phiên kết thúc, nên phải vào lệnh sau đó.' }
    ],
    macro: [
      { q: 'Lãi suất tăng thường tác động thế nào?', options: ['Tăng định giá tài sản dài hạn', 'Gây áp lực lên định giá tài sản dài hạn và chi phí vay', 'Không ảnh hưởng', 'Luôn làm cổ phiếu tăng'], answer: 1, explain: 'Lãi suất cao làm chiết khấu dòng tiền tương lai mạnh hơn và vay đắt hơn.' },
      { q: 'Lạm phát cao kéo dài thường bất lợi cho:', options: ['Tiền mặt nhàn rỗi', 'Doanh nghiệp có khả năng định giá', 'Tài sản thực', 'Cổ phiếu hưởng lợi lạm phát'], answer: 0, explain: 'Tiền mặt mất sức mua; tài sản thực hoặc doanh nghiệp có pricing power thường chống chịu tốt hơn.' },
      { q: 'Đường cong lợi suất đảo ngược là:', options: ['Lãi suất dài hạn thấp hơn ngắn hạn, tín hiệu kỳ vọng suy giảm', 'Lãi suất luôn tăng', 'Dấu hiệu chắc chắn suy thoái', 'Lỗi dữ liệu'], answer: 0, explain: 'Đây là tín hiệu tham khảo, không phải dự báo chắc chắn.' },
      { q: 'GDP tăng nhưng thu nhập bình quân giảm cho thấy:', options: ['Tăng trưởng không lan tỏa đều', 'Lạm phát bằng 0', 'Không có bất bình đẳng', 'Dữ liệu sai chắc chắn'], answer: 0, explain: 'Tăng trưởng tổng có thể đến từ một nhóm nhỏ hoặc yếu tố dân số.' },
      { q: 'Ngân hàng trung ương hạ lãi suất thường nhằm:', options: ['Kích thích vay và tiêu dùng', 'Tăng lạm phát chắc chắn', 'Giảm cung tiền', 'Tăng thuế'], answer: 0, explain: 'Hạ lãi suất làm vay rẻ hơn, nhưng có thể kéo theo lạm phát.' },
      { q: 'Tỷ giá USD/VND tăng, doanh nghiệp nhập khẩu sẽ:', options: ['Có lợi hơn', 'Chịu chi phí đầu vào cao hơn', 'Không bị ảnh hưởng', 'Luôn tăng lợi nhuận'], answer: 1, explain: 'Hàng nhập khẩu đắt hơn bằng VND; doanh nghiệp xuất khẩu có thể hưởng lợi tương đối.' }
    ],
    data: [
      { q: 'Lookahead bias trong phân tích dữ liệu là:', options: ['Dùng thông tin chưa có tại thời điểm quyết định', 'Dùng quá nhiều dữ liệu', 'Dữ liệu quá cũ', 'Thiếu dữ liệu'], answer: 0, explain: 'Dùng tương lai để dự báo quá khứ tạo kết quả đẹp giả tạo.' },
      { q: 'Khi dữ liệu bị thiếu, việc đầu tiên nên làm:', options: ['Điền số 0 toàn bộ', 'Hiểu lý do thiếu trước khi chọn cách xử lý', 'Xóa cả cột', 'Bỏ qua'], answer: 1, explain: 'Thiếu dữ liệu có thể có ý nghĩa; điền bừa làm sai lệch phân tích.' },
      { q: 'Một outlier (giá trị bất thường) nên được:', options: ['Xóa ngay', 'Kiểm tra lỗi nhập liệu và bối cảnh trước khi quyết định', 'Thay bằng trung bình', 'Nhân đôi'], answer: 1, explain: 'Outlier có thể là lỗi hoặc sự kiện thật quan trọng.' },
      { q: 'Trước khi tính toán, dữ liệu cần được:', options: ['Chuẩn hóa đơn vị và định dạng', 'Làm tròn tất cả', 'Xóa cột thời gian', 'Gộp mọi bảng'], answer: 0, explain: 'Sai đơn vị hoặc định dạng tạo ra kết quả vô nghĩa.' },
      { q: 'Khi ghép dữ liệu từ nhiều nguồn, múi giờ nên:', options: ['Giữ nguyên tùy nguồn', 'Chuẩn hóa về một múi giờ chung, thường là UTC', 'Bỏ qua', 'Dùng giờ địa phương của người phân tích'], answer: 1, explain: 'Lệch múi giờ làm sai thứ tự và ghép sai sự kiện.' },
      { q: 'Dữ liệu trùng lặp nên được xử lý bằng:', options: ['Cộng dồn tất cả', 'Xác định khóa duy nhất và loại bản ghi trùng', 'Xóa ngẫu nhiên', 'Giữ cả hai'], answer: 1, explain: 'Bản ghi trùng làm tăng trọng số sai cho một quan sát.' }
    ],
    credit: [
      { q: 'DTI (nợ/thu nhập) cao nghĩa là:', options: ['Khách có nhiều tài sản', 'Gánh nặng trả nợ lớn so với thu nhập', 'Lãi suất thấp', 'Không ảnh hưởng xếp hạng'], answer: 1, explain: 'DTI cao làm khả năng trả nợ mong manh hơn.' },
      { q: 'Khoản vay lãi 12%/năm nhưng có phí 2% trả trước. Chi phí thực:', options: ['Đúng 12%', 'Cao hơn 12% khi tính đủ phí', 'Thấp hơn 12%', 'Không xác định được'], answer: 1, explain: 'Phí làm chi phí vay thực tế cao hơn lãi suất danh nghĩa.' },
      { q: 'Vay đảo nợ chỉ hợp lý khi:', options: ['Lãi suất thấp hơn đáng kể và không kéo dài quá mức', 'Luôn có lợi', 'Để mua tài sản đầu cơ', 'Không cần đọc hợp đồng'], answer: 0, explain: 'Đảo nợ có thể giảm lãi, nhưng kéo dài thời hạn có thể làm tổng chi phí tăng.' },
      { q: 'Tài sản thế chấp giúp:', options: ['Xóa nghĩa vụ trả nợ', 'Giảm rủi ro cho bên cho vay và có thể giảm lãi suất', 'Tăng lãi suất', 'Không có tác dụng'], answer: 1, explain: 'Thế chấp là bảo đảm, không thay thế nghĩa vụ trả nợ.' },
      { q: 'Trả nợ trễ thường kéo theo:', options: ['Không ảnh hưởng', 'Phí phạt, lãi phạt và giảm điểm tín dụng', 'Được xóa nợ', 'Tăng hạn mức'], answer: 1, explain: 'Lịch sử trả nợ là yếu tố quan trọng của điểm tín dụng.' },
      { q: 'Vay tiền để đầu tư tài sản biến động mạnh có rủi ro:', options: ['Không có', 'Có thể bị margin call hoặc lỗ vượt khả năng trả', 'Chỉ ảnh hưởng khi lãi suất giảm', 'Luôn có lợi'], answer: 1, explain: 'Đòn bẩy làm lỗ khuếch đại và tạo áp lực trả nợ.' }
    ],
    tax: [
      { q: 'Chi phí hợp lý để được trừ khi tính thuế cần:', options: ['Chỉ cần kể miệng', 'Hóa đơn, chứng từ và đúng mục đích kinh doanh', 'Càng lớn càng tốt', 'Không cần lưu'], answer: 1, explain: 'Cơ quan thuế yêu cầu chứng từ chứng minh chi phí.' },
      { q: 'Thuế thu nhập từ chuyển nhượng vốn thường phát sinh khi:', options: ['Mua tài sản', 'Bán hoặc chuyển nhượng tài sản', 'Giữ tài sản', 'Đọc báo cáo'], answer: 1, explain: 'Nghĩa vụ thường phát sinh tại thời điểm bán/chuyển nhượng theo quy định.' },
      { q: 'Vì sao cần giữ hóa đơn?', options: ['Để trang trí', 'Chứng minh chi phí và tránh bị loại khi quyết toán', 'Để bán lại', 'Không cần'], answer: 1, explain: 'Không có chứng từ, khoản chi có thể không được chấp nhận.' },
      { q: 'Kê khai thuế muộn thường dẫn đến:', options: ['Được miễn phạt', 'Phạt và lãi chậm nộp', 'Tăng hoàn thuế', 'Không ảnh hưởng'], answer: 1, explain: 'Chậm nộp làm tăng chi phí và rủi ro tuân thủ.' },
      { q: 'Thuế VAT đầu vào được khấu trừ khi:', options: ['Có hóa đơn hợp lệ và đủ điều kiện theo quy định', 'Bất kỳ hóa đơn nào', 'Không cần chứng từ', 'Chỉ khi bán được hàng'], answer: 0, explain: 'Điều kiện khấu trừ phụ thuộc hóa đơn, mục đích và quy định hiện hành.' },
      { q: 'Tối ưu thuế hợp pháp khác trốn thuế ở chỗ:', options: ['Không khác', 'Lập kế hoạch trong khuôn khổ pháp luật, không che giấu thu nhập', 'Dùng tiền mặt để tránh khai báo', 'Không xuất hóa đơn'], answer: 1, explain: 'Tối ưu hợp pháp dựa trên quy định; trốn thuế là vi phạm.' }
    ],
    risk: [
      { q: 'VaR 95% một ngày là 20 triệu nghĩa là:', options: ['Chắc chắn lỗ 20 triệu', 'Theo mô hình, khoảng 5% khả năng lỗ vượt 20 triệu trong một ngày', 'Lãi tối đa 20 triệu', 'Không thể lỗ'], answer: 1, explain: 'VaR là ngưỡng thống kê, không phải giới hạn lỗ tuyệt đối.' },
      { q: 'Stop loss có tác dụng:', options: ['Đảm bảo khớp đúng giá', 'Giới hạn khoản lỗ dự kiến, nhưng có thể trượt giá khi gap', 'Tăng lợi nhuận', 'Xóa rủi ro'], answer: 1, explain: 'Trong thị trường nhảy gap, lệnh stop có thể khớp xa hơn mức đặt.' },
      { q: 'Đòn bẩy 10x khiến giá giảm 10% sẽ:', options: ['Lỗ 1% vốn', 'Gần như xóa toàn bộ vốn', 'Không ảnh hưởng', 'Tăng vốn'], answer: 1, explain: 'Lỗ 10% nhân 10 lần đòn bẩy tương đương 100% vốn.' },
      { q: 'Rủi ro tập trung là:', options: ['Nắm nhiều mã cùng ngành hoặc một mã quá lớn', 'Nắm nhiều loại tài sản', 'Giữ tiền mặt', 'Đa dạng hóa'], answer: 0, explain: 'Tập trung làm một sự kiện xấu ảnh hưởng lớn đến toàn bộ danh mục.' },
      { q: 'Thanh khoản thấp có thể dẫn đến:', options: ['Bán nhanh với giá tốt', 'Khó thoát vị thế và trượt giá lớn', 'Giảm phí', 'Không rủi ro'], answer: 1, explain: 'Khi ít người mua, bạn phải giảm giá mới bán được.' },
      { q: 'Tail risk là:', options: ['Rủi ro nhỏ thường gặp', 'Sự kiện hiếm nhưng tác động rất lớn', 'Lỗi nhập liệu', 'Phí giao dịch'], answer: 1, explain: 'Sự kiện đuôi phân phối hiếm nhưng có thể gây thiệt hại nặng.' }
    ],
    deals: [
      { q: 'Khi định giá doanh nghiệp theo EBITDA, cần điều chỉnh thêm:', options: ['Màu thương hiệu', 'Nợ ròng, tiền mặt và chi phí vốn', 'Số nhân viên', 'Tuổi công ty'], answer: 1, explain: 'EV phản ánh cấu trúc vốn; so sánh chỉ số cần nhất quán.' },
      { q: 'Due diligence trong M&A nhằm:', options: ['Làm đẹp hồ sơ', 'Xác minh tài chính, pháp lý, vận hành và rủi ro', 'Tăng giá bán', 'Bỏ qua rủi ro'], answer: 1, explain: 'Due diligence phát hiện vấn đề trước khi cam kết tiền.' },
      { q: 'Synergy chỉ nên được tính khi:', options: ['Có kế hoạch thực thi và số liệu hỗ trợ', 'Ban lãnh đạo tin tưởng', 'Đối thủ cũng làm', 'Không cần chứng minh'], answer: 0, explain: 'Nhiều thương vụ thất bại vì synergy trên giấy không thành hiện thực.' },
      { q: 'Earn-out trong M&A là:', options: ['Phạt khi giao hàng chậm', 'Khoản trả thêm dựa trên kết quả tương lai', 'Lãi suất vay', 'Cổ tức'], answer: 1, explain: 'Earn-out chia sẻ rủi ro định giá nhưng có thể gây bất đồng sau giao dịch.' },
      { q: 'BATNA là:', options: ['Giá cao nhất', 'Phương án tốt nhất nếu đàm phán thất bại', 'Một loại thuế', 'Khoản vay'], answer: 1, explain: 'Biết BATNA giúp bạn không chấp nhận thỏa thuận tệ hơn lựa chọn thay thế.' },
      { q: 'Sau sáp nhập, yếu tố thường bị xem nhẹ nhưng quyết định thành công:', options: ['Màu văn phòng', 'Văn hóa và giữ chân nhân sự chủ chốt', 'Logo', 'Số lượng họp'], answer: 1, explain: 'Xung đột văn hóa làm mất người giỏi và khách hàng.' }
    ],
    hospitality: [
      { q: 'RevPAR được tính bằng:', options: ['ADR × công suất phòng', 'Doanh thu / số nhân viên', 'Chi phí / số phòng', 'Số khách / số ngày'], answer: 0, explain: 'RevPAR = doanh thu phòng bình quân trên mỗi phòng có thể bán.' },
      { q: 'Food cost tăng cao. Cách kiểm soát bền vững:', options: ['Giảm khẩu phần không thông báo', 'Kiểm soát định lượng, giá nhập và hao hụt', 'Tăng giá gấp đôi', 'Bỏ qua'], answer: 1, explain: 'Kiểm soát ba khâu định lượng, mua hàng và hao hụt mới giảm chi phí thật.' },
      { q: 'Khách phàn nàn phòng chưa sạch. Xử lý đúng:', options: ['Xin lỗi, đổi phòng và kiểm tra lại quy trình buồng phòng', 'Nói phòng đã sạch', 'Đổ lỗi cho khách', 'Phớt lờ'], answer: 0, explain: 'Khắc phục trải nghiệm ngay và sửa nguyên nhân gốc.' },
      { q: 'Mùa cao điểm cần chuẩn bị:', options: ['Giảm nhân viên', 'Tuyển thêm, xếp lịch và dự phòng vật tư', 'Tăng giá mà không báo', 'Đóng cửa'], answer: 1, explain: 'Chuẩn bị nguồn lực trước mùa giúp tránh quá tải.' },
      { q: 'Một đánh giá 1 sao xuất hiện công khai. Nên:', options: ['Xóa bình luận', 'Phản hồi lịch sự, xử lý riêng và công bố hành động nếu phù hợp', 'Mắng khách', 'Không làm gì'], answer: 1, explain: 'Phản hồi chuyên nghiệp thể hiện trách nhiệm với khách khác đang đọc.' },
      { q: 'Công suất phòng thấp, doanh thu giảm. Cần kiểm tra:', options: ['Chỉ tăng giá', 'Giá, kênh phân phối, sản phẩm và đối thủ', 'Sa thải toàn bộ', 'Đổi logo'], answer: 1, explain: 'Công suất phụ thuộc giá, kênh bán, trải nghiệm và nhu cầu thị trường.' }
    ],
    health: [
      { q: 'Bệnh nhân khó thở đột ngột, tím tái. Ưu tiên:', options: ['Hỏi thủ tục giấy tờ', 'Kích hoạt quy trình cấp cứu ngay', 'Cho uống nước', 'Chờ bác sĩ trực'], answer: 1, explain: 'Dấu hiệu nguy kịch cần xử trí khẩn cấp theo phác đồ.' },
      { q: 'Rửa tay đúng cách giúp:', options: ['Tăng lương', 'Giảm lây nhiễm chéo', 'Không có tác dụng', 'Thay thế găng tay'], answer: 1, explain: 'Vệ sinh tay là biện pháp kiểm soát nhiễm khuẩn quan trọng nhất.' },
      { q: 'Phát hiện nghi ngờ sai liều thuốc. Nên:', options: ['Giấu đi', 'Dừng lại, báo ngay theo quy trình và theo dõi bệnh nhân', 'Tự điều chỉnh không ghi chép', 'Chờ hết ca'], answer: 1, explain: 'Báo cáo sớm giúp giảm hại và ngăn lặp lại.' },
      { q: 'Hồ sơ bệnh án cần được:', options: ['Chia sẻ công khai', 'Bảo mật và ghi chép đúng thời điểm', 'Xóa sau mỗi ca', 'Để cá nhân tự giữ'], answer: 1, explain: 'Hồ sơ vừa là tài liệu chuyên môn vừa là dữ liệu riêng tư.' },
      { q: 'Tư vấn sức khỏe qua điện thoại, cần:', options: ['Chẩn đoán chắc chắn', 'Hỏi triệu chứng, khuyên khám khi cần, không kê đơn tùy tiện', 'Kê kháng sinh ngay', 'Kết thúc nhanh'], answer: 1, explain: 'Thiếu thăm khám trực tiếp nên cần thận trọng và chuyển tuyến phù hợp.' },
      { q: 'Đồng nghiệp mắc lỗi chuyên môn. Cách xử lý đúng:', options: ['Che giấu để bảo vệ đồng nghiệp', 'Báo cáo theo hệ thống an toàn người bệnh và rút kinh nghiệm', 'Đăng lên mạng', 'Không quan tâm'], answer: 1, explain: 'Hệ thống báo cáo sự cố giúp cải thiện an toàn thay vì đổ lỗi cá nhân.' }
    ],
    legal: [
      { q: 'Điều khoản phạt vi phạm hợp đồng cần:', options: ['Mơ hồ để dễ thắng', 'Rõ mức phạt, căn cứ và giới hạn theo pháp luật', 'Không cần ghi', 'Chỉ ghi bằng lời'], answer: 1, explain: 'Điều khoản rõ ràng giúp tránh tranh chấp và có thể bị vô hiệu nếu trái luật.' },
      { q: 'Phát hiện xung đột lợi ích với khách hàng, luật sư nên:', options: ['Tiếp tục nếu khách không biết', 'Khai báo và từ chối nếu không thể bảo đảm lợi ích khách', 'Tăng phí', 'Chuyển hồ sơ cho người khác mà không báo'], answer: 1, explain: 'Xung đột lợi ích ảnh hưởng đến tính trung thực của tư vấn.' },
      { q: 'Thông tin khách hàng nên được chia sẻ khi:', options: ['Có lợi cho công ty', 'Có cơ sở pháp lý hoặc được khách đồng ý', 'Bất kỳ lúc nào', 'Cho đồng nghiệp nghe'], answer: 1, explain: 'Bảo mật là nghĩa vụ nghề nghiệp, trừ trường hợp pháp luật cho phép.' },
      { q: 'Hạn nộp hồ sơ quan trọng nên:', options: ['Chờ đến ngày cuối', 'Đưa vào lịch nhắc và nộp sớm', 'Giao cho người mới', 'Không cần theo dõi'], answer: 1, explain: 'Trễ hạn có thể mất quyền và tạo trách nhiệm nghề nghiệp.' },
      { q: 'Khách hỏi vấn đề ngoài phạm vi chuyên môn. Nên:', options: ['Trả lời liều', 'Giải thích giới hạn và giới thiệu chuyên gia phù hợp', 'Từ chối không lý do', 'Thu phí rồi bỏ qua'], answer: 1, explain: 'Tư vấn ngoài phạm vi có thể gây hại cho khách.' },
      { q: 'Bằng chứng trong tranh chấp nên được:', options: ['Lưu bản gốc và chuỗi lưu trữ rõ ràng', 'Chỉnh sửa cho dễ hiểu', 'Xóa bớt', 'Chỉ giữ bản photo'], answer: 0, explain: 'Tính xác thực và toàn vẹn bằng chứng rất quan trọng.' }
    ],
    education: [
      { q: 'Mục tiêu học tập tốt nên:', options: ['Chung chung để dễ đạt', 'Cụ thể, đo được và gắn với hành vi', 'Chỉ do giáo viên biết', 'Không cần đánh giá'], answer: 1, explain: 'Mục tiêu rõ giúp thiết kế hoạt động và đánh giá đúng.' },
      { q: 'Formative assessment là:', options: ['Thi cuối kỳ', 'Kiểm tra trong quá trình học để điều chỉnh dạy và học', 'Chấm điểm xếp hạng', 'Bài tập về nhà'], answer: 1, explain: 'Đánh giá quá trình giúp phát hiện lỗ hổng sớm.' },
      { q: 'Phản hồi hiệu quả cho học sinh nên:', options: ['Chỉ khen chung chung', 'Cụ thể, chỉ ra điều cần sửa và bước tiếp theo', 'So sánh với bạn khác', 'Chỉ cho điểm'], answer: 1, explain: 'Phản hồi hướng hành động giúp học sinh tiến bộ.' },
      { q: 'Học sinh mất tập trung trong giờ. Nên:', options: ['Mắng ngay', 'Đổi hoạt động và tìm hiểu nguyên nhân', 'Bỏ qua', 'Cho nghỉ học'], answer: 1, explain: 'Nguyên nhân có thể là mệt, chán, hoặc chưa hiểu bài.' },
      { q: 'Scaffolding (giàn giáo học tập) là:', options: ['Xây trường', 'Hỗ trợ tạm thời rồi giảm dần để học sinh tự làm', 'Giao bài khó', 'Thi không báo trước'], answer: 1, explain: 'Hỗ trợ đúng mức giúp học sinh tiến tới tự chủ.' },
      { q: 'Để phòng đạo văn, nên:', options: ['Chỉ phạt khi phát hiện', 'Hướng dẫn trích dẫn, thiết kế bài tập yêu cầu quy trình', 'Không giao bài viết', 'Bỏ qua'], answer: 1, explain: 'Dạy kỹ năng trích dẫn và kiểm tra quá trình giảm đạo văn hiệu quả.' }
    ],
    energy: [
      { q: 'kWh là đơn vị của:', options: ['Công suất', 'Năng lượng', 'Dòng điện', 'Điện áp'], answer: 1, explain: 'kWh đo năng lượng tiêu thụ; kW đo công suất.' },
      { q: 'Capacity factor của một nhà máy điện là:', options: ['Công suất lắp đặt', 'Sản lượng thực tế chia sản lượng tối đa lý thuyết', 'Giá điện', 'Số giờ bảo trì'], answer: 1, explain: 'Hệ số này phản ánh mức độ sử dụng công suất theo thời gian.' },
      { q: 'LCOE là:', options: ['Giá bán lẻ điện', 'Chi phí quy đổi trên mỗi kWh trong vòng đời dự án', 'Lợi nhuận nhà máy', 'Thuế carbon'], answer: 1, explain: 'LCOE giúp so sánh chi phí giữa các nguồn phát điện.' },
      { q: 'Phụ tải đỉnh (peak load) là:', options: ['Mức tiêu thụ thấp nhất', 'Mức tiêu thụ cao nhất trong kỳ', 'Công suất dự phòng', 'Điện áp cao'], answer: 1, explain: 'Phụ tải đỉnh quyết định nhu cầu nguồn và lưới.' },
      { q: 'Trước khi sửa thiết bị điện, cần:', options: ['Chỉ cần găng tay', 'Cắt nguồn, khóa thẻ và kiểm tra không còn điện', 'Nhờ người giữ cửa', 'Làm nhanh'], answer: 1, explain: 'Quy trình khóa/treo thẻ ngăn điện bất ngờ đóng lại.' },
      { q: 'Dự báo nhu cầu điện nên dựa trên:', options: ['Cảm tính', 'Dữ liệu quá khứ, thời tiết, tăng trưởng kinh tế', 'Giá vàng', 'Số nhân viên'], answer: 1, explain: 'Mô hình dự báo kết hợp nhiều yếu tố cho kế hoạch nguồn tốt hơn.' }
    ],
    logistics: [
      { q: 'EOQ (số lượng đặt hàng kinh tế) cân bằng:', options: ['Chi phí đặt hàng và chi phí tồn kho', 'Giá bán và thuế', 'Lương và vận chuyển', 'Cung và cầu lao động'], answer: 0, explain: 'EOQ tìm điểm tối thiểu hóa tổng chi phí đặt hàng và lưu kho.' },
      { q: 'Tồn kho an toàn (safety stock) dùng để:', options: ['Trang trí kho', 'Đệm trước biến động nhu cầu và thời gian giao hàng', 'Tăng chi phí', 'Giảm chất lượng'], answer: 1, explain: 'Tồn an toàn giảm nguy cơ hết hàng khi nhu cầu hoặc lead time thay đổi.' },
      { q: 'Incoterms quy định:', options: ['Màu bao bì', 'Trách nhiệm và chi phí giữa người mua và người bán', 'Thuế thu nhập', 'Lương tài xế'], answer: 1, explain: 'Incoterms phân định rủi ro, chi phí và thủ tục giao nhận.' },
      { q: 'Chi phí chặng cuối (last-mile) thường cao vì:', options: ['Khoảng cách ngắn', 'Nhiều điểm giao nhỏ lẻ, giao thông và tỷ lệ thất bại', 'Không cần nhân viên', 'Hàng nhẹ'], answer: 1, explain: 'Giao nhiều điểm nhỏ làm chi phí trên mỗi đơn tăng.' },
      { q: 'Slotting trong kho là:', options: ['Xếp hàng theo tần suất lấy và đặc tính', 'Xếp ngẫu nhiên', 'Tăng giá thuê', 'Kiểm kê'], answer: 0, explain: 'Bố trí hàng bán chạy gần khu xuất giúp giảm thời gian lấy hàng.' },
      { q: 'Lead time nhập hàng dài nên:', options: ['Giảm tồn kho tối đa', 'Tăng tồn an toàn hoặc tìm nguồn gần hơn', 'Bỏ qua', 'Tăng giá bán'], answer: 1, explain: 'Lead time dài làm tăng rủi ro thiếu hàng nếu không có đệm.' }
    ],
    agriculture: [
      { q: 'pH đất ảnh hưởng trực tiếp đến:', options: ['Màu lá', 'Khả năng hấp thu dinh dưỡng của cây', 'Giá nông sản', 'Số lượng ong'], answer: 1, explain: 'pH quyết định nhiều chất dinh dưỡng có tan và hấp thu được hay không.' },
      { q: 'Luân canh cây trồng giúp:', options: ['Tăng sâu bệnh', 'Giảm sâu bệnh và cải tạo đất', 'Luôn tăng năng suất ngay', 'Không cần phân bón'], answer: 1, explain: 'Luân canh phá vòng đời sâu bệnh và cân bằng dinh dưỡng đất.' },
      { q: 'Tưới nhỏ giọt có ưu điểm:', options: ['Tiết kiệm nước và kiểm soát lượng tưới', 'Tốn nước hơn', 'Không cần bảo trì', 'Chỉ dùng cho lúa'], answer: 0, explain: 'Nước đi trực tiếp vùng rễ, giảm thất thoát.' },
      { q: 'Giảm hao hụt sau thu hoạch bằng cách:', options: ['Phơi nắng mọi loại nông sản', 'Làm khô/lạnh đúng cách và bảo quản kín', 'Để ngoài trời', 'Thu hoạch non'], answer: 1, explain: 'Kiểm soát độ ẩm và nhiệt độ giảm hư hỏng.' },
      { q: 'Sử dụng thuốc bảo vệ thực vật cần:', options: ['Tăng liều để nhanh', 'Đúng liều, đúng thời điểm và tuân thủ thời gian cách ly', 'Phun gần thu hoạch', 'Không cần bảo hộ'], answer: 1, explain: 'Sai liều gây tồn dư và ảnh hưởng sức khỏe.' },
      { q: 'Giá nông sản biến động mạnh, cách giảm rủi ro:', options: ['Chỉ bán khi giá cao nhất', 'Dùng hợp đồng kỳ hạn hoặc đa dạng kênh bán', 'Không bán', 'Tăng sản lượng bằng mọi giá'], answer: 1, explain: 'Hợp đồng và đa dạng kênh giúp ổn định đầu ra.' }
    ],
    public: [
      { q: 'Đấu thầu công minh bạch cần:', options: ['Giữ kín tiêu chí', 'Công khai tiêu chí, giá và kết quả theo quy định', 'Chọn nhà thân quen', 'Không giải thích'], answer: 1, explain: 'Minh bạch giảm tham nhũng và tăng niềm tin.' },
      { q: 'Tham vấn cộng đồng trước dự án lớn nhằm:', options: ['Làm cho có', 'Lắng nghe tác động và điều chỉnh thiết kế', 'Tăng chi phí', 'Trì hoãn vô ích'], answer: 1, explain: 'Tham vấn sớm giúp phát hiện xung đột và cải thiện quyết định.' },
      { q: 'Ngân sách công nên được phân bổ dựa trên:', options: ['Cảm tính', 'Ưu tiên chính sách, bằng chứng và giám sát kết quả', 'Số lượng bài phát biểu', 'Màu logo'], answer: 1, explain: 'Phân bổ theo ưu tiên và kết quả giúp dùng tiền hiệu quả.' },
      { q: 'KPI của cơ quan công nên đo:', options: ['Số cuộc họp', 'Kết quả thực tế cho người dân', 'Số giấy tờ in', 'Số xe công'], answer: 1, explain: 'Đo kết quả thay vì hoạt động tránh hình thức.' },
      { q: 'Công chức có xung đột lợi ích nên:', options: ['Kê khai và tránh tham gia quyết định', 'Giấu đi', 'Nhờ người thân đứng tên', 'Vẫn quyết định bình thường'], answer: 0, explain: 'Kê khai và tránh xung đột bảo vệ tính liêm chính.' },
      { q: 'Dịch vụ công dễ tiếp cận cần:', options: ['Chỉ dùng ngôn ngữ chuyên môn', 'Thiết kế cho người già, người khuyết tật và người thu nhập thấp', 'Chỉ trực tuyến', 'Tăng giấy tờ'], answer: 1, explain: 'Thiết kế bao trùm giúp dịch vụ đến được nhóm yếu thế.' }
    ],
    sales: [
      { q: 'Khách nói "đắt quá". Cách xử lý tốt nhất:', options: ['Giảm giá ngay', 'Hỏi tiêu chí giá trị và so sánh tổng chi phí/lợi ích', 'Tranh cãi', 'Kết thúc cuộc gọi'], answer: 1, explain: 'Hiểu điều khách so sánh giúp định vị giá trị thay vì cắt giá.' },
      { q: 'Câu hỏi discovery nên tập trung vào:', options: ['Sở thích cá nhân', 'Vấn đề, mục tiêu, ngân sách và thời hạn', 'Đối thủ', 'Màu yêu thích'], answer: 1, explain: 'Discovery xác định nhu cầu thật và mức độ phù hợp.' },
      { q: 'Pipeline bán hàng khỏe khi:', options: ['Chỉ có vài khách gần chốt', 'Đủ đầu phễu và chất lượng lead được phân loại', 'Không cần theo dõi', 'Chỉ dựa vào giới thiệu'], answer: 1, explain: 'Đầu phễu đủ và chất lượng giúp dự báo doanh thu ổn định.' },
      { q: 'Follow-up hiệu quả nên:', options: ['Gọi liên tục mỗi giờ', 'Đúng hẹn, có lý do và thông tin mới', 'Chỉ nhắn khi cần chốt', 'Không cần'], answer: 1, explain: 'Liên hệ có giá trị giúp duy trì quan hệ và tăng tỷ lệ chốt.' },
      { q: 'Khi giảm giá, nên:', options: ['Giảm không điều kiện', 'Đổi lấy cam kết về số lượng, thời hạn hoặc giới thiệu', 'Giảm rồi tăng lại', 'Không ghi hợp đồng'], answer: 1, explain: 'Nhượng bộ có điều kiện bảo vệ biên lợi nhuận.' },
      { q: 'Dữ liệu CRM nên được:', options: ['Ghi một lần rồi bỏ', 'Cập nhật thường xuyên và đúng thực tế', 'Chỉ quản lý nhập', 'Xóa sau mỗi quý'], answer: 1, explain: 'CRM chính xác giúp chăm sóc khách và dự báo doanh thu.' }
    ],
    creative: [
      { q: 'Brief thiếu mục tiêu. Việc đầu tiên nên làm:', options: ['Bắt tay thiết kế ngay', 'Hỏi lại đối tượng, thông điệp và KPI', 'Sao chép đối thủ', 'Tăng ngân sách'], answer: 1, explain: 'Thiếu mục tiêu dẫn đến sản phẩm đẹp nhưng không hiệu quả.' },
      { q: 'A/B test đúng cách là:', options: ['Đổi nhiều biến cùng lúc', 'Chỉ đổi một biến mỗi lần để đo tác động', 'Chạy một bản', 'Chọn theo cảm tính'], answer: 1, explain: 'Một biến giúp quy kết kết quả cho thay đổi đó.' },
      { q: 'Sử dụng hình ảnh/âm nhạc cần:', options: ['Lấy trên mạng tùy ý', 'Dùng tài sản có giấy phép hoặc nguồn cho phép', 'Ghi nguồn là đủ', 'Chỉ cần xóa watermark'], answer: 1, explain: 'Bản quyền có thể gây thiệt hại pháp lý và uy tín.' },
      { q: 'Đặt tên file thiết kế nên:', options: ['final_final2', 'Thống nhất quy ước, có phiên bản và ngày', 'Dùng tên ngẫu nhiên', 'Không cần'], answer: 1, explain: 'Quy ước rõ giúp cộng tác và tránh nhầm phiên bản.' },
      { q: 'Nhận nhiều ý kiến trái chiều từ khách, nên:', options: ['Làm theo tất cả', 'Gom nhóm, đối chiếu mục tiêu và chốt tiêu chí đánh giá', 'Bỏ qua hết', 'Chọn ý của người nói to nhất'], answer: 1, explain: 'Tiêu chí rõ giúp phân xử phản hồi và giữ chất lượng.' },
      { q: 'Thiết kế cho mobile cần ưu tiên:', options: ['Nhiều hiệu ứng', 'Cỡ chữ, tương phản và tốc độ tải', 'Ảnh nền lớn', 'Menu phức tạp'], answer: 1, explain: 'Màn hình nhỏ và mạng yếu nên khả năng đọc và tốc độ rất quan trọng.' }
    ]
  };

  /* Tỷ suất cổ tức ước tính cho thu nhập thụ động trong quản lý tài sản.
     Đây là giả định mô phỏng, không phải cam kết cổ tức thực tế. */
  const DIVIDEND_YIELD = {
    vcb: 1.4, bid: 1.2, ctg: 1.6, tcb: 1.1, vpb: 1.0, acb: 1.5, mbb: 1.3, stb: 0.9, hdb: 1.2, lpb: 1.1,
    fpt: 2.1, hpg: 2.6, vnm: 4.6, mwg: 0.8, msn: 1.2, sab: 3.8, plx: 2.9, pow: 2.0, pnj: 2.2, ree: 2.4,
    gas: 3.2, kdh: 1.8, nvl: 0.0, dxg: 1.0, dig: 0.8, vci: 1.2, hcm: 1.4, frt: 0.7, gmd: 2.8, kbc: 1.5,
    hsg: 1.6, bmp: 4.1, pvt: 2.5, bvh: 2.2, eib: 0.0, ocb: 1.3, ssb: 1.0, vib: 1.4, msb: 1.5,
    aapl: 0.5, msft: 0.8, nvda: 0.03, tsla: 0, amzn: 0, googl: 0.5, meta: 0.4, nflx: 0, jpm: 2.2, v: 0.7,
    ko: 3.0, pep: 3.2, xom: 3.4, wmt: 1.0, mcd: 2.4, nke: 1.6, sbux: 2.2, gs: 1.9, bac: 2.6, brkb: 0,
    lly: 0.7, unh: 1.6, cat: 1.5, ge: 0.8, dis: 0.9, orcl: 1.0, crm: 0.6, adbe: 0, avgo: 1.2, qcom: 2.0,
    mu: 0.5, intc: 2.1, csco: 2.8, shop: 0, pypl: 0, arm: 0, smci: 0, ionq: 0, hood: 0, mstr: 0,
    spy: 1.3, qqq: 0.6, voo: 1.3, gld: 0, tlt: 3.8, eem: 2.4, dia: 1.7, iwm: 1.2, vti: 1.4,
    arkk: 0, xle: 3.1, xlf: 1.6, smh: 0.5, tqqq: 0.4
  };

  /* ------------------------- QUỸ MỞ AURELIS (v1.14) -------------------------
     NAV của mỗi quỹ là chỉ số mô phỏng từ giá các tài sản trong rổ.
     Không có chứng chỉ quỹ thật, không có dòng tiền thật. */
  const FUND_CATALOG = [
    {
      id: 'fund_vn_growth', ticker: 'AVG', name: 'AURELIS Việt Nam Tăng Trưởng', short: 'Việt Nam tăng trưởng',
      icon: '🐉', color: '#2ee6a6', risk: 4, benchmark: 'VN-Index', min: 1000000, buyFee: 0.45, sellFee: 0.3,
      desc: 'Rổ cổ phiếu niêm yết lớn nhất Việt Nam, nghiêng về ngân hàng, công nghệ và bán lẻ. Phù hợp người tin vào tăng trưởng dài hạn của kinh tế nội địa.',
      basket: [{ id: 'vcb', w: 18 }, { id: 'fpt', w: 20 }, { id: 'hpg', w: 16 }, { id: 'mwg', w: 14 }, { id: 'ssi', w: 12 }, { id: 'vnm', w: 20 }]
    },
    {
      id: 'fund_dividend', ticker: 'ADI', name: 'AURELIS Cổ Tức Bền Vững', short: 'Cổ tức bền vững',
      icon: '🌾', color: '#f3c56b', risk: 2, benchmark: 'VN30', min: 1000000, buyFee: 0.35, sellFee: 0.25,
      desc: 'Tập trung doanh nghiệp trả cổ tức đều và dòng tiền ổn định. Mục tiêu là thu nhập, không phải tăng giá nhanh. Quỹ này cũng được hưởng lợi khi mùa cổ tức đến gần.',
      basket: [{ id: 'vnm', w: 24 }, { id: 'sab', w: 16 }, { id: 'bid', w: 18 }, { id: 'ctg', w: 14 }, { id: 'plx', w: 14 }, { id: 'bmp', w: 14 }]
    },
    {
      id: 'fund_tech', ticker: 'ATE', name: 'AURELIS Công Nghệ Toàn Cầu', short: 'Công nghệ toàn cầu',
      icon: '🛰️', color: '#5ac8fa', risk: 5, benchmark: 'Nasdaq 100', min: 1000000, buyFee: 0.5, sellFee: 0.35,
      desc: 'Rổ cổ phiếu công nghệ Mỹ dẫn dắt AI và hạ tầng dữ liệu. Biến động cao, chỉ phù hợp người nắm giữ dài và chấp nhận drawdown sâu.',
      basket: [{ id: 'aapl', w: 16 }, { id: 'msft', w: 18 }, { id: 'nvda', w: 24 }, { id: 'googl', w: 14 }, { id: 'meta', w: 14 }, { id: 'avgo', w: 14 }]
    },
    {
      id: 'fund_crypto', ticker: 'ACR', name: 'AURELIS Crypto Beta', short: 'Crypto beta cao',
      icon: '⚡', color: '#ff9f43', risk: 5, benchmark: 'Crypto 10', min: 500000, buyFee: 0.6, sellFee: 0.4,
      desc: 'Danh mục crypto vốn hoá lớn, beta cao với dòng tiền rủi ro. Chỉ phù hợp khẩu vị chấp nhận biến động mạnh và không dùng tiền cần trong ngắn hạn.',
      basket: [{ id: 'btc', w: 40 }, { id: 'eth', w: 30 }, { id: 'sol', w: 18 }, { id: 'bnb', w: 12 }]
    },
    {
      id: 'fund_multi', ticker: 'AMA', name: 'AURELIS Đa Tài Sản', short: 'Đa tài sản',
      icon: '🌐', color: '#b59cff', risk: 3, benchmark: 'Đa tài sản', min: 1000000, buyFee: 0.4, sellFee: 0.3,
      desc: 'Kết hợp cổ phiếu, trái phiếu, vàng, thị trường mới nổi và một phần crypto để giảm tương quan. Một quỹ "của mọi thứ" cho người không muốn chọn một hướng.',
      basket: [{ id: 'spy', w: 26 }, { id: 'tlt', w: 20 }, { id: 'gld', w: 18 }, { id: 'eem', w: 16 }, { id: 'xle', w: 10 }, { id: 'btc', w: 10 }]
    },
    {
      id: 'fund_defensive', ticker: 'APF', name: 'AURELIS Phòng Thủ', short: 'Phòng thủ',
      icon: '🛡️', color: '#6cb8ff', risk: 2, benchmark: '60/40', min: 1000000, buyFee: 0.3, sellFee: 0.2,
      desc: 'Ưu tiên trái phiếu dài hạn, vàng và cổ phiếu phòng thủ. Mục tiêu bảo toàn vốn hơn là tối đa hoá lợi nhuận — nhưng vẫn có thể giảm khi lãi suất biến động.',
      basket: [{ id: 'tlt', w: 28 }, { id: 'gld', w: 20 }, { id: 'ko', w: 14 }, { id: 'pep', w: 12 }, { id: 'vnm', w: 14 }, { id: 'bid', w: 12 }]
    }
  ];

  /* ------------------------- SỰ KIỆN THỊ TRƯỜNG (v1.14) -------------------------
     Sự kiện mô phỏng, không phải tin tức thật. Mỗi sự kiện tác động một nhóm tài sản
     trong thời gian ngắn để người chơi luyện phản ứng với dòng thông tin. */
  const MARKET_EVENTS = [
    { id: 'bank_rate_cut', kind: 'up', icon: '🏦', title: 'Ngân hàng đồng loạt hạ lãi suất huy động', short: 'Dòng tiền rẻ hơn', shock: 1.15, drift: 0.0005, duration: 110000, groups: ['hose', 'hnx', 'upcom'], sectors: ['Ngân hàng'], source: 'AURELIS News', body: 'Mặt bằng lãi suất huy động giảm giúp biên lợi nhuận ngân hàng được kỳ vọng cải thiện. Nhóm ngân hàng đồng loạt được mua lên, nhưng đừng quên rủi ro nợ xấu vẫn còn đó.' },
    { id: 'foreign_buy', kind: 'up', icon: '🌏', title: 'Khối ngoại mua ròng hơn 1.200 tỷ đồng', short: 'Dòng tiền ngoại quay lại', shock: 0.55, drift: 0.00026, duration: 90000, groups: ['hose'], source: 'AURELIS News', body: 'Khối ngoại quay lại mua ròng trên diện rộng, tập trung ở các mã vốn hoá lớn. Thanh khoản cải thiện nhưng dòng tiền này có thể đảo chiều nhanh.' },
    { id: 'foreign_sell', kind: 'down', icon: '🌫️', title: 'Khối ngoại bán ròng, áp lực lên bluechip', short: 'Bluechip bị xả hàng', shock: -0.6, drift: -0.00028, duration: 90000, groups: ['hose'], source: 'AURELIS News', body: 'Khối ngoại bán ròng hơn 900 tỷ đồng, tập trung ở nhóm vốn hoá lớn. Chỉ số chịu áp lực dù một số nhóm nhỏ vẫn giữ sắc xanh.' },
    { id: 'fed_hold', kind: 'up', icon: '🇺🇸', title: 'Fed giữ nguyên lãi suất, thị trường thở phào', short: 'Fed không tăng lãi suất', shock: 0.55, drift: 0.00024, duration: 100000, groups: ['us'], source: 'AURELIS News', body: 'Fed giữ nguyên lãi suất và phát tín hiệu ôn hoà. Cổ phiếu Mỹ tăng nhẹ, nhưng kỳ vọng cắt giảm lãi suất vẫn có thể thay đổi theo dữ liệu lạm phát.' },
    { id: 'tech_earnings', kind: 'up', icon: '💻', title: 'Mùa báo cáo công nghệ khởi sắc', short: 'Lợi nhuận công nghệ vượt kỳ vọng', shock: 1.1, drift: 0.00045, duration: 110000, groups: ['us'], sectors: ['Công nghệ', 'Bán dẫn', 'AI / Phần mềm', 'Máy chủ AI', 'Phần mềm'], source: 'AURELIS News', body: 'Các ông lớn công nghệ công bố lợi nhuận tốt hơn dự báo. Dòng tiền đổ vào nhóm tăng trưởng, kéo theo cả chuỗi cung ứng AI và bán dẫn.' },
    { id: 'ai_chip', kind: 'up', icon: '🧠', title: 'Đơn hàng chip AI tăng vọt', short: 'Cầu chip AI vượt cung', shock: 1.5, drift: 0.0006, duration: 100000, groups: ['us'], sectors: ['Bán dẫn', 'Máy chủ AI', 'AI'], source: 'AURELIS News', body: 'Một nhà sản xuất chip lớn cho biết đơn hàng AI đã kín đến năm sau. Nhóm bán dẫn và hạ tầng AI bùng nổ, nhưng định giá đã phản ánh nhiều kỳ vọng.' },
    { id: 'tariff', kind: 'down', icon: '📦', title: 'Lo ngại thuế quan mới đè nặng thị trường Mỹ', short: 'Rủi ro thuế quan', shock: -0.85, drift: -0.0004, duration: 100000, groups: ['us'], source: 'AURELIS News', body: 'Đề xuất thuế quan mới làm dấy lên lo ngại chi phí đầu vào tăng. Nhóm bán lẻ và sản xuất chịu áp lực, dòng tiền tìm đến tài sản phòng thủ.' },
    { id: 'crypto_etf', kind: 'up', icon: '🪙', title: 'ETF crypto hút thêm vốn tổ chức', short: 'Dòng vốn ETF tích cực', shock: 1.25, drift: 0.00055, duration: 100000, groups: ['crypto'], source: 'AURELIS News', body: 'Các quỹ ETF crypto ghi nhận dòng tiền vào ròng nhiều phiên liên tiếp. Bitcoin dẫn dắt, sau đó lan sang các token vốn hoá lớn.' },
    { id: 'crypto_hack', kind: 'down', icon: '🕳️', title: 'Một sàn crypto lớn bị tấn công', short: 'Rủi ro bảo mật', shock: -1.5, drift: -0.0006, duration: 110000, groups: ['crypto'], source: 'AURELIS News', body: 'Tin tức về một vụ tấn công khiến nhà đầu tư bán tháo crypto trên diện rộng. Đây là lời nhắc rằng rủi ro bảo mật và rủi ro đối tác luôn tồn tại.' },
    { id: 'btc_halving', kind: 'up', icon: '⛏️', title: 'Chu kỳ halving Bitcoin được chú ý trở lại', short: 'Câu chuyện nguồn cung', shock: 1.0, drift: 0.00045, duration: 95000, groups: ['crypto'], sectors: ['Bitcoin', 'Bitcoin L2', 'Layer 1', 'Major'], source: 'AURELIS News', body: 'Narrative khan hiếm nguồn cung quay lại, kéo dòng tiền đầu cơ vào Bitcoin và các layer 1 lớn. Hãy nhớ narrative không thay thế được quản trị rủi ro.' },
    { id: 'oil_spike', kind: 'up', icon: '🛢️', title: 'Giá dầu tăng sau căng thẳng nguồn cung', short: 'Dầu và năng lượng tăng', shock: 1.2, drift: 0.0005, duration: 95000, groups: ['commodity', 'us'], sectors: ['Dầu khí', 'Năng lượng', 'Hàng hoá'], source: 'AURELIS News', body: 'Lo ngại nguồn cung đẩy giá dầu lên. Cổ phiếu dầu khí hưởng lợi, trong khi chi phí vận tải và sản xuất có thể tăng theo.' },
    { id: 'gold_cool', kind: 'down', icon: '🥇', title: 'Vàng điều chỉnh sau chuỗi ngày tăng nóng', short: 'Vàng chốt lời', shock: -0.9, drift: -0.00038, duration: 90000, groups: ['commodity'], sectors: ['Kim loại quý', 'Vàng'], source: 'AURELIS News', body: 'Áp lực chốt lời khiến vàng và bạc điều chỉnh. Xu hướng dài hạn chưa bị phá vỡ, nhưng biến động ngắn hạn có thể rất mạnh.' },
    { id: 'steel_dump', kind: 'down', icon: '🏗️', title: 'Thép nhập khẩu giá rẻ gây áp lực cạnh tranh', short: 'Biên lợi nhuận thép bị ép', shock: -1.2, drift: -0.0005, duration: 95000, groups: ['hose', 'hnx'], sectors: ['Thép', 'Vật liệu', 'Xây dựng'], source: 'AURELIS News', body: 'Lo ngại thép nhập khẩu giá rẻ làm thu hẹp biên lợi nhuận doanh nghiệp nội địa. Nhóm vật liệu và xây dựng bị bán ra.' },
    { id: 'real_estate_credit', kind: 'up', icon: '🏘️', title: 'Tín dụng bất động sản được nới room', short: 'Room tín dụng mở hơn', shock: 1.0, drift: 0.00042, duration: 95000, groups: ['hose', 'hnx'], sectors: ['Bất động sản', 'Xây dựng', 'Xi măng'], source: 'AURELIS News', body: 'Thông tin nới room tín dụng giúp nhóm bất động sản và vật liệu xây dựng hồi phục. Thanh khoản ngắn hạn cải thiện nhưng nợ vay vẫn là rủi ro.' },
    { id: 'fpt_contract', kind: 'up', icon: '📄', title: 'FPT công bố hợp đồng công nghệ lớn', short: 'Hợp đồng mới cho FPT', shock: 2.0, drift: 0.0008, duration: 80000, ids: ['fpt'], source: 'AURELIS News', body: 'FPT ký hợp đồng chuyển đổi số quy mô lớn với đối tác nước ngoài. Cổ phiếu tăng mạnh, nhưng cần theo dõi tiến độ triển khai và biên lợi nhuận thực tế.' },
    { id: 'hpg_incident', kind: 'down', icon: '🔥', title: 'Sự cố vận hành tại một nhà máy thép lớn', short: 'Sự cố nhà máy thép', shock: -1.8, drift: -0.0007, duration: 85000, ids: ['hpg'], source: 'AURELIS News', body: 'Sự cố kỹ thuật khiến một dây chuyền tạm dừng. Sản lượng quý có thể bị ảnh hưởng, cổ phiếu giảm mạnh trước khi có thông tin khắc phục.' },
    { id: 'vnm_price', kind: 'up', icon: '🥛', title: 'VNM tăng giá bán, kỳ vọng biên lợi nhuận cải thiện', short: 'Giá sữa tăng', shock: 1.4, drift: 0.0006, duration: 85000, ids: ['vnm'], source: 'AURELIS News', body: 'Vinamilk thông báo điều chỉnh giá bán một số dòng sản phẩm. Thị trường kỳ vọng biên lợi nhuận cải thiện, dù sức mua tiêu dùng vẫn là biến số.' },
    { id: 'dividend_season', kind: 'up', icon: '💵', title: 'Mùa cổ tức đến gần, nhóm thu nhập được chú ý', short: 'Mùa cổ tức', shock: 0.8, drift: 0.0003, duration: 95000, groups: ['hose', 'hnx', 'upcom'], sectors: ['Đồ uống', 'Điện', 'Bảo hiểm', 'Dược phẩm'], source: 'AURELIS News', body: 'Các doanh nghiệp công bố lịch chốt quyền nhận cổ tức. Dòng tiền tìm đến cổ phiếu có lịch sử trả cổ tức đều, đặc biệt khi lãi suất tiết kiệm ở mức thấp.' },
    { id: 'vn_etf_inflow', kind: 'up', icon: '📈', title: 'ETF mô phỏng Việt Nam hút vốn', short: 'ETF Việt Nam được mua', shock: 0.85, drift: 0.00035, duration: 90000, groups: ['etf'], sectors: ['Việt Nam'], source: 'AURELIS News', body: 'Dòng tiền vào các ETF mô phỏng thị trường Việt Nam tăng. Nhóm cổ phiếu vốn hoá lớn trong rổ chỉ số được hưởng lợi trước.' }
  ];

  const AUCTION_TYPES = [
    { id: 'english', name: 'Đấu giá Anh', short: 'Tăng dần', icon: '🔨', color: '#2ee6a6', desc: 'Trả giá cao nhất khi đồng hồ kết thúc sẽ thắng. Có thể mua ngay nếu chủ lot mở quyền.' },
    { id: 'dutch', name: 'Đấu giá Hà Lan', short: 'Giảm dần', icon: '⏳', color: '#5ac8fa', desc: 'Giá khởi điểm cao rồi giảm dần. Ai chấp nhận mua trước sẽ thắng lot.' },
    { id: 'sealed', name: 'Đấu giá kín', short: 'Một lần', icon: '✉️', color: '#b59cff', desc: 'Mỗi người gửi một mức giá kín. Mức cao nhất thắng và trả đúng giá đã gửi.' },
    { id: 'flash', name: 'Flash Auction', short: 'Siêu tốc', icon: '⚡', color: '#ff9f43', desc: 'Phiên ngắn 60–90 giây. Giá nhảy nhanh, có gia hạn chống bắn tỉa ở giây cuối.' }
  ];

  /* ------------------------- ACADEMY ------------------------- */
  const LESSONS = [
    {
      id: 'what-is-stock', title: 'Cổ phiếu là gì?', level: 'Nhập môn', minutes: 4, icon: '📈', color: '#42e3a4',
      summary: 'Hiểu bản chất cổ phiếu, cổ đông và vì sao giá cổ phiếu dao động mỗi ngày.',
      blocks: [
        { type: 'p', text: 'Cổ phiếu là một phần sở hữu của doanh nghiệp. Khi bạn mua 100 cổ phiếu VCB, bạn trở thành một cổ đông rất nhỏ của Vietcombank. Giá cổ phiếu thay đổi vì kỳ vọng của nhà đầu tư về tương lai doanh nghiệp thay đổi — chứ không chỉ vì lợi nhuận hiện tại.' },
        { type: 'h', text: 'Ba nguồn lợi nhuận chính' },
        { type: 'list', items: ['Chênh lệch giá: mua thấp, bán cao.', 'Cổ tức: một phần lợi nhuận doanh nghiệp chia cho cổ đông.', 'Quyền mua ưu đãi: được mua cổ phiếu mới với giá ưu đãi trong các đợt phát hành.'] },
        { type: 'p', text: 'Trong AURELIS, bạn trade với vốn ảo nhưng giá là giá thật. Hãy xem đây là phòng tập: sai ở đây rẻ hơn sai bằng tiền thật rất nhiều.' }
      ],
      quiz: { question: 'Khi mua cổ phiếu, bạn thực chất đang mua gì?', options: ['Một khoản vay của doanh nghiệp', 'Một phần quyền sở hữu doanh nghiệp', 'Một hợp đồng bảo hiểm'], answer: 1, explain: 'Cổ phiếu là chứng chỉ sở hữu một phần doanh nghiệp. Trái phiếu mới là khoản vay.' }
    },
    {
      id: 'candlestick', title: 'Đọc nến Nhật trong 3 phút', level: 'Cơ bản', minutes: 3, icon: '🕯️', color: '#f2c45e',
      summary: 'Một cây nến chứa đủ bốn mức giá. Học cách đọc tâm lý mua bán trong từng cây nến.',
      blocks: [
        { type: 'p', text: 'Mỗi cây nến có 4 mức giá: mở cửa (O), cao nhất (H), thấp nhất (L) và đóng cửa (C). Phần thân nến nằm giữa giá mở và đóng; hai bóng nến cho biết mức cao/thấp trong phiên.' },
        { type: 'h', text: 'Nến xanh và nến đỏ' },
        { type: 'list', items: ['Nến xanh: đóng cửa cao hơn mở cửa, người mua chiếm ưu thế.', 'Nến đỏ: đóng cửa thấp hơn mở cửa, người bán chiếm ưu thế.', 'Bóng dưới dài + thân nhỏ: lực cầu xuất hiện ở vùng giá thấp.', 'Bóng trên dài + thân nhỏ: lực bán chặn giá ở vùng cao.'] },
        { type: 'p', text: 'Đừng đọc một cây nến đơn lẻ. Hãy đọc nến trong bối cảnh xu hướng và khối lượng giao dịch. Trên AURELIS, bạn có thể dùng công cụ vẽ để đánh dấu vùng giá quan trọng.' }
      ],
      quiz: { question: 'Nến có bóng dưới rất dài, thân nhỏ thường gợi ý điều gì?', options: ['Lực cầu xuất hiện ở vùng giá thấp', 'Giá sẽ giảm chắc chắn', 'Khối lượng giao dịch bằng 0'], answer: 0, explain: 'Bóng dưới dài cho thấy giá bị đẩy xuống nhưng bị mua lên, phản ánh lực cầu.' }
    },
    {
      id: 'exchanges', title: 'HOSE, HNX & UPCoM khác gì nhau?', level: 'Cơ bản', minutes: 4, icon: '🏛️', color: '#6cb8ff',
      summary: 'Ba sàn Việt Nam, ba bộ tiêu chuẩn niêm yết, ba mức thanh khoản. Chọn sân chơi phù hợp.',
      blocks: [
        { type: 'p', text: 'HOSE là Sở Giao dịch Chứng khoán TP.HCM, nơi niêm yết các doanh nghiệp lớn nhất. HNX là sàn Hà Nội, quy mô nhỏ hơn nhưng nhiều doanh nghiệp tăng trưởng. UPCoM là thị trường giao dịch cổ phiếu chưa niêm yết, thanh khoản thường thấp hơn và biên độ rộng hơn.' },
        { type: 'h', text: 'Những khác biệt cần nhớ' },
        { type: 'list', items: ['Lô giao dịch: HOSE thường 100 cổ phiếu/lô; HNX và UPCoM cũng có quy định riêng.', 'Biên độ giá: HOSE ±7%, HNX ±10%, UPCoM ±15% (theo quy định hiện hành).', 'Thanh khoản: HOSE sâu nhất, UPCoM dễ bị kéo giá hơn.'] },
        { type: 'p', text: 'Với người mới, HOSE là nơi dễ quan sát. Nhưng đừng bỏ qua HNX/UPCoM nếu muốn tìm doanh nghiệp nhỏ đang tăng trưởng. Trong AURELIS, dữ liệu HNX/UPCoM được mô phỏng để bạn luyện tập.' }
      ],
      quiz: { question: 'Sàn nào thường có thanh khoản sâu nhất tại Việt Nam?', options: ['HNX', 'UPCoM', 'HOSE'], answer: 2, explain: 'HOSE tập trung các doanh nghiệp vốn hoá lớn nhất và thanh khoản cao nhất.' }
    },
    {
      id: 'risk', title: 'Quản trị rủi ro & đòn bẩy', level: 'Trung cấp', minutes: 5, icon: '🛡️', color: '#ff7a8a',
      summary: 'Đòn bẩy là con dao hai lưỡi. Công thức sống còn: không bao giờ để một lệnh giết cả tài khoản.',
      blocks: [
        { type: 'p', text: 'Quy tắc quan trọng nhất: chỉ mạo hiểm một phần nhỏ tài khoản cho mỗi lệnh. Nhiều trader chuyên nghiệp giới hạn rủi ro 0,5% – 2% vốn cho một lệnh. Với 1 tỷ đồng, 1% là 10 triệu — đủ để sai 50 lần liên tiếp mà vẫn còn vốn.' },
        { type: 'h', text: 'Công thức position size' },
        { type: 'p', text: 'Khối lượng vị thế = (Vốn × % rủi ro) ÷ (Giá vào − Giá dừng lỗ). Nếu bạn mua VCB ở 54.100 và cắt lỗ ở 52.000, mỗi cổ phiếu rủi ro 2.100 đồng. Với 10 triệu rủi ro, khối lượng tối đa là khoảng 4.700 cổ phiếu.' },
        { type: 'list', items: ['Đòn bẩy làm tăng cả lợi nhuận lẫn tốc độ thua lỗ.', 'Luôn đặt stop-loss trước khi mua, không phải sau khi lỗ.', 'Khi lệnh đi ngược, đừng bình quân giá xuống theo cảm xúc.', 'Dùng công cụ Risk Calculator trong Phòng phân tích để tính nhanh.'] }
      ],
      quiz: { question: 'Rủi ro 1% cho mỗi lệnh nghĩa là gì?', options: ['Đầu tư 1% vốn vào mỗi lệnh', 'Chấp nhận mất tối đa 1% vốn nếu lệnh sai', 'Chỉ mua cổ phiếu có giá dưới 1% thị trường'], answer: 1, explain: 'Rủi ro 1% là giới hạn số tiền tối đa có thể mất trên một lệnh so với tổng vốn.' }
    },
    {
      id: 'crypto', title: 'Crypto 101: Bitcoin & Ethereum', level: 'Cơ bản', minutes: 5, icon: '₿', color: '#f7a94b',
      summary: 'Bitcoin là vàng số, Ethereum là nền tảng ứng dụng. Hiểu trước khi mua.',
      blocks: [
        { type: 'p', text: 'Bitcoin là mạng lưới thanh toán phi tập trung với nguồn cung giới hạn 21 triệu đồng coin. Ethereum là một nền tảng máy tính phi tập trung cho phép chạy hợp đồng thông minh — nền tảng của DeFi, NFT và stablecoin.' },
        { type: 'h', text: 'Điều gì làm giá crypto biến động?' },
        { type: 'list', items: ['Dòng tiền tổ chức qua ETF và sàn giao dịch.', 'Chính sách lãi suất của Fed — crypto là tài sản rủi ro.', 'Nâng cấp mạng lưới và narrative của từng dự án.', 'Thanh lý đòn bẩy: các cú squeeze có thể làm giá nhảy 10–20% trong vài giờ.'] },
        { type: 'p', text: 'Crypto giao dịch 24/7, không có phiên nghỉ. Điều đó có nghĩa là rủi ro qua đêm luôn tồn tại. Hãy chọn tỷ trọng phù hợp với khả năng chịu đựng, đừng all-in vì một video TikTok.' }
      ],
      quiz: { question: 'Đâu là điểm khác biệt cốt lõi của Ethereum so với Bitcoin?', options: ['Ethereum có nguồn cung cố định 21 triệu', 'Ethereum cho phép chạy hợp đồng thông minh và ứng dụng phi tập trung', 'Ethereum không thể giao dịch 24/7'], answer: 1, explain: 'Ethereum là nền tảng smart contract, mở ra DeFi, NFT và hàng nghìn ứng dụng khác.' }
    },
    {
      id: 'psychology', title: 'Tâm lý giao dịch: FOMO & kỷ luật', level: 'Trung cấp', minutes: 4, icon: '🧠', color: '#a78bfa',
      summary: 'Thị trường được vận hành bởi cảm xúc. Người thắng là người kiểm soát được cảm xúc của mình.',
      blocks: [
        { type: 'p', text: 'FOMO (sợ bỏ lỡ) khiến bạn mua ở đỉnh. Panic selling khiến bạn bán ở đáy. Cả hai đều xuất phát từ việc so sánh bản thân với người khác thay vì tuân thủ kế hoạch của mình.' },
        { type: 'h', text: 'Ba cách rèn kỷ luật' },
        { type: 'list', items: ['Viết lý do vào lệnh trước khi bấm mua — nếu không viết được, đừng mua.', 'Đặt cảnh báo giá thay vì nhìn bảng điện cả ngày.', 'Ghi nhật ký giao dịch: cảm xúc lúc vào lệnh, lý do thoát lệnh, bài học.'] },
        { type: 'p', text: 'AURELIS có Nhật ký giao dịch trong Phòng phân tích. Hãy dùng nó. Nhìn lại 20 lệnh của chính mình sẽ dạy bạn nhiều hơn 200 video dạy đầu tư.' }
      ],
      quiz: { question: 'Cách tốt nhất để chống FOMO là gì?', options: ['Theo dõi thêm nhiều hội nhóm tín hiệu', 'Viết lý do vào lệnh và tuân thủ kế hoạch đã định', 'Mua thật nhanh trước khi giá tăng tiếp'], answer: 1, explain: 'Một kế hoạch viết sẵn với lý do rõ ràng giúp bạn tránh quyết định bốc đồng.' }
    }
  ];

  /* ------------------------- RANKS & BOTS ------------------------- */
  const RANKS = [
    { level: 1, name: 'Tân Binh', icon: '🌱', color: '#8b9aa4', desc: 'Vừa bước vào thị trường. Hãy học cách không thua trước đã.' },
    { level: 3, name: 'Nhà Đầu Tư', icon: '📈', color: '#42e3a4', desc: 'Đã có lệnh đầu tiên và bắt đầu hiểu nhịp thị trường.' },
    { level: 5, name: 'Chiến Binh Nến', icon: '🕯️', color: '#f2c45e', desc: 'Đọc chart như đọc truyện. Kỷ luật đang hình thành.' },
    { level: 7, name: 'Chuyên Gia PTKT', icon: '📊', color: '#6cb8ff', desc: 'Chỉ báo, mẫu hình, cấu trúc thị trường — tất cả đều quen tay.' },
    { level: 9, name: 'Cá Mập', icon: '🦈', color: '#7ce7ff', desc: 'Dòng tiền đổi hướng, bạn là người nhận ra trước.' },
    { level: 11, name: 'Trùm Thị Trường', icon: '👑', color: '#f3c56b', desc: 'Không còn phản ứng với tin tức — bạn đã ở trước một bước.' },
    { level: 14, name: 'Huyền Thoại', icon: '🔱', color: '#c89cff', desc: 'Tên bạn xuất hiện trên bảng xếp hạng mùa giải.' },
    { level: 17, name: 'Bậc Thầy AURELIS', icon: '🔮', color: '#ff8fb1', desc: 'Người thầy của chính mình. Thị trường là trường học vô tận.' }
  ];

  const BOTS = [
    { name: 'Cá Mập Bến Thành', avatar: '🦈', title: 'Huyền Thoại Sàn', level: 18, netWorth: 1.84e9, strategy: 'Blue-chip + margin', change: 84 },
    { name: '0xWhale', avatar: '🐋', title: 'Cá Voi Crypto', level: 16, netWorth: 1.52e9, strategy: 'BTC dominance', change: 52 },
    { name: 'Tokyo Scalper', avatar: '🗼', title: 'Bắn Tỉa Nến Xanh', level: 15, netWorth: 1.41e9, strategy: 'Scalping VN30F', change: 41 },
    { name: 'Cô Giáo Chứng Khoán', avatar: '👩‍🏫', title: 'Thiền Sư Thị Trường', level: 13, netWorth: 1.28e9, strategy: 'Value investing', change: 28 },
    { name: 'Buffett Sài Gòn', avatar: '🎩', title: 'Nhà Đầu Tư', level: 12, netWorth: 1.19e9, strategy: 'Buy & hold 10 năm', change: 19 },
    { name: 'HODL Queen', avatar: '💎', title: 'Cá Voi Crypto', level: 11, netWorth: 1.07e9, strategy: 'DCA Ethereum', change: 7 },
    { name: 'Nến Xanh', avatar: '🕯️', title: 'Chiến Binh Nến', level: 8, netWorth: 0.96e9, strategy: 'Breakout HOSE', change: -4 },
    { name: 'Short Squeeze', avatar: '🐻', title: 'Degen Chính Hiệu', level: 7, netWorth: 0.88e9, strategy: 'Short meme coin', change: -12 }
  ];

  const AVATARS = ['🦊', '🐺', '🦈', '🐋', '🦉', '🐯', '🚀', '🧠', '🐉', '🦁', '👨‍💻', '👩‍💼'];

  const CAPITAL_PRESETS = [
    { value: 500000000, label: '500 triệu', note: 'Nhẹ nhàng làm quen' },
    { value: 1000000000, label: '1 tỷ', note: 'Cân bằng & linh hoạt', recommended: true },
    { value: 5000000000, label: '5 tỷ', note: 'Thử sức danh mục lớn' }
  ];

  const GLOSSARY = [
    { term: 'HOSE', text: 'Sở Giao dịch Chứng khoán TP.HCM — nơi niêm yết các doanh nghiệp lớn nhất Việt Nam.' },
    { term: 'VN30', text: 'Rổ 30 cổ phiếu vốn hoá và thanh khoản lớn nhất sàn HOSE.' },
    { term: 'Cổ tức', text: 'Phần lợi nhuận doanh nghiệp chia cho cổ đông, thường bằng tiền hoặc cổ phiếu.' },
    { term: 'Đòn bẩy', text: 'Tỷ lệ vị thế so với vốn ký quỹ. Đòn bẩy 10x cho phép mở vị thế lớn gấp 10 lần tiền bạn bỏ ra.' },
    { term: 'Funding rate', text: 'Phí định kỳ giữa long và short trên hợp đồng vĩnh viễn, giữ giá perp bám sát spot.' },
    { term: 'Thanh lý', text: 'Sàn đóng vị thế khi khoản lỗ vượt ký quỹ duy trì. Với đòn bẩy cao, thanh lý đến rất nhanh.' },
    { term: 'RSI', text: 'Relative Strength Index — chỉ báo động lượng từ 0 đến 100. Trên 70 thường bị coi là quá mua.' },
    { term: 'FOMO', text: 'Fear Of Missing Out — nỗi sợ bỏ lỡ khiến nhà đầu tư mua đuổi ở vùng giá cao.' },
    { term: 'Stop-loss', text: 'Lệnh cắt lỗ tự động tại một mức giá xác định trước để giới hạn thua lỗ.' },
    { term: 'HODL', text: 'Cách viết sai kinh điển của “hold” — nắm giữ dài hạn bất chấp biến động.' }
  ];

  /* ------------------------- FINANCE LIBRARY ------------------------- */
  const LIBRARY_CATEGORIES = [
    { id: 'theorems', name: 'Định lý & mô hình', short: 'Định lý', icon: '📐', color: '#f3c56b', desc: 'Những nền tảng lý thuyết giải thích cách thị trường, rủi ro và định giá vận hành.' },
    { id: 'formulas', name: 'Công thức', short: 'Công thức', icon: '🧮', color: '#5ac8fa', desc: 'Công thức định giá, đo lường hiệu quả và ra quyết định vốn.' },
    { id: 'analysis', name: 'Phân tích', short: 'Phân tích', icon: '📊', color: '#2ee6a6', desc: 'Các phương pháp đọc dữ liệu, kiểm định chiến lược và quản trị rủi ro.' },
    { id: 'concepts', name: 'Khái niệm', short: 'Khái niệm', icon: '💡', color: '#b59cff', desc: 'Từ vựng cốt lõi của tài chính, từ beta đến thanh khoản và tâm lý thị trường.' }
  ];

  const LIBRARY = [
    {
      id: 'capm', category: 'theorems', level: 'Cơ bản', title: 'CAPM — Mô hình định giá tài sản vốn',
      subtitle: 'Lợi suất kỳ vọng bù đắp rủi ro hệ thống như thế nào?',
      formula: 'E(R_i) = R_f + β_i × [E(R_m) − R_f]',
      summary: 'CAPM cho rằng lợi suất kỳ vọng của một tài sản bằng lãi suất phi rủi ro cộng phần bù rủi ro tỷ lệ với beta của nó.',
      detail: 'Mô hình giả định nhà đầu tư đa dạng hoá tối ưu và chỉ được bù đắp cho rủi ro hệ thống — phần không thể loại bỏ bằng cách chia vốn. Beta đo độ nhạy của tài sản với thị trường. CAPM đơn giản, dễ áp dụng nhưng nhạy với việc chọn chỉ số thị trường và giả định lãi suất phi rủi ro. Trong thực tế, nhà đầu tư còn dùng mô hình đa nhân tố như Fama-French.',
      example: 'Nếu R_f = 4%, E(R_m) = 10% và β = 1,2 thì lợi suất yêu cầu ≈ 4% + 1,2 × 6% = 11,2%/năm.',
      tags: ['beta', 'lợi suất', 'rủi ro hệ thống'], related: ['mpt', 'beta', 'wacc']
    },
    {
      id: 'mm', category: 'theorems', level: 'Nâng cao', title: 'Định lý Modigliani-Miller',
      subtitle: 'Cấu trúc vốn có làm thay đổi giá trị doanh nghiệp?',
      formula: 'V_L = V_U + T_C × D (khi có thuế)',
      summary: 'Trong thị trường hoàn hảo không thuế, giá trị doanh nghiệp không phụ thuộc vào cấu trúc vốn; khi có thuế, nợ tạo lá chắn thuế làm tăng giá trị.',
      detail: 'MM I nói rằng việc vay nợ hay phát hành cổ phiếu không tạo ra giá trị trong thế giới không ma sát. MM II cho thấy chi phí vốn chủ sở hữu tăng khi nợ tăng vì cổ đông chịu rủi ro tài chính cao hơn. Khi thêm thuế, lãi vay được khấu trừ tạo lá chắn thuế, nhưng lợi ích này bị giới hạn bởi chi phí kiệt quệ tài chính và rủi ro vỡ nợ. Đây là lý do có một cấu trúc vốn tối ưu trong thực tế.',
      example: 'Một doanh nghiệp vay 100 tỷ với thuế suất 20% có lá chắn thuế lý thuyết khoảng 20 tỷ, trước khi trừ chi phí kiệt quệ tài chính.',
      tags: ['cấu trúc vốn', 'lá chắn thuế', 'nợ'], related: ['wacc', 'dcf_gordon', 'credit_risk']
    },
    {
      id: 'emh', category: 'theorems', level: 'Cơ bản', title: 'Giả thuyết thị trường hiệu quả (EMH)',
      subtitle: 'Giá đã phản ánh bao nhiêu thông tin?',
      formula: 'Giá ≈ E[Giá trị nội tại | thông tin công khai]',
      summary: 'EMH cho rằng giá tài sản phản ánh thông tin sẵn có; mức độ hiệu quả phụ thuộc vào loại thông tin được phản ánh.',
      detail: 'Dạng yếu nói giá đã phản ánh dữ liệu quá khứ, nên phân tích kỹ thuật khó tạo lợi thế bền vững. Dạng bán mạnh cho rằng giá phản ánh mọi thông tin công khai, còn dạng mạnh cho rằng cả thông tin nội bộ cũng được phản ánh. Thị trường thực tế có thể hiệu quả ở mức trung bình: khó đánh bại chỉ số sau phí, nhưng vẫn tồn tại bất thường và cơ hội ngắn hạn. EMH không có nghĩa giá luôn đúng, mà là khó kiếm lợi nhuận bền vững từ thông tin đã biết.',
      example: 'Sau khi tin lợi nhuận tốt được công bố, giá thường nhảy ngay; nhà đầu tư mua sau đó khó hưởng lợi từ chính thông tin ấy.',
      tags: ['hiệu quả thị trường', 'thông tin', 'alpha'], related: ['alpha', 'technical', 'behavioral']
    },
    {
      id: 'mpt', category: 'theorems', level: 'Trung bình', title: 'Lý thuyết danh mục hiện đại (Markowitz)',
      subtitle: 'Đa dạng hoá tối ưu theo lợi suất và phương sai.',
      formula: 'σ_p² = Σ_i Σ_j w_i w_j σ_i σ_j ρ_ij',
      summary: 'MPT xây dựng danh mục hiệu quả bằng cách kết hợp tài sản để đạt lợi suất kỳ vọng cao nhất với mức rủi ro cho trước.',
      detail: 'Rủi ro danh mục không chỉ là trung bình rủi ro từng tài sản; tương quan đóng vai trò quyết định. Khi tương quan thấp hoặc âm, đa dạng hoá giảm phương sai mà không nhất thiết giảm lợi suất kỳ vọng. Đường biên hiệu quả là tập hợp các danh mục tốt nhất. MPT giả định lợi suất phân phối chuẩn và nhà đầu tư chỉ quan tâm mean-variance, nên cần bổ sung cho rủi ro đuôi và thanh khoản.',
      example: 'Hai cổ phiếu cùng lợi suất 10% nhưng tương quan thấp có thể ghép thành danh mục có độ lệch chuẩn thấp hơn từng mã riêng lẻ.',
      tags: ['đa dạng hoá', 'tương quan', 'đường biên hiệu quả'], related: ['correlation', 'capm', 'var']
    },
    {
      id: 'black_scholes', category: 'theorems', level: 'Nâng cao', title: 'Black-Scholes-Merton',
      subtitle: 'Định giá quyền chọn bằng danh mục phòng hộ.',
      formula: 'C = S × N(d1) − K × e^(−rT) × N(d2)',
      summary: 'Mô hình định giá quyền chọn châu Âu dựa trên giả định giá tài sản biến động theo chuyển động Brown hình học và có thể phòng hộ liên tục.',
      detail: 'Công thức cho thấy giá quyền chọn phụ thuộc vào giá tài sản, giá thực hiện, thời gian, lãi suất phi rủi ro và độ biến động. Mô hình tạo nền tảng cho phòng hộ bằng delta và định giá sản phẩm phái sinh. Hạn chế gồm giả định biến động không đổi, không có nhảy giá và giao dịch liên tục. Thực tế dùng mô hình biến động ngụ ý và bề mặt biến động để hiệu chỉnh.',
      example: 'Một quyền chọn mua cổ phiếu 100.000 ₫, còn 3 tháng, biến động 30% sẽ có giá trị thời gian tăng khi độ biến động kỳ vọng tăng.',
      tags: ['quyền chọn', 'biến động', 'phòng hộ'], related: ['put_call_parity', 'beta', 'var']
    },
    {
      id: 'put_call_parity', category: 'theorems', level: 'Trung bình', title: 'Put-Call Parity',
      subtitle: 'Mối quan hệ không thể chênh lệch giữa quyền chọn mua và bán.',
      formula: 'C + K × e^(−rT) = P + S',
      summary: 'Với quyền chọn châu Âu cùng giá thực hiện và thời gian, quyền chọn mua cộng trái phiếu phi rủi ro phải có cùng giá trị với quyền chọn bán cộng cổ phiếu.',
      detail: 'Nếu đẳng thức bị phá vỡ, nhà đầu tư có thể tạo danh mục phòng hộ và thu lợi phi rủi ro, nên thị trường sẽ nhanh chóng đưa giá về cân bằng. Công thức giúp tách giá trị nội tại và giá trị thời gian, đồng thời là nền tảng của nhiều chiến lược như covered call và protective put. Nó cũng cho thấy quyền chọn không thể được định giá hoàn toàn độc lập với cổ phiếu cơ sở.',
      example: 'Nếu C + K×e^(−rT) rẻ hơn P + S, nhà đầu tư có thể mua vế rẻ và bán vế đắt để kiếm chênh lệch gần như phi rủi ro.',
      tags: ['quyền chọn', 'arbitrage', 'phòng hộ'], related: ['black_scholes', 'technical']
    },
    {
      id: 'npv', category: 'formulas', level: 'Cơ bản', title: 'NPV — Giá trị hiện tại ròng',
      subtitle: 'Một dự án có đáng đầu tư hay không?',
      formula: 'NPV = Σ CF_t / (1 + r)^t − C_0',
      summary: 'NPV quy đổi mọi dòng tiền tương lai về hiện tại và trừ vốn đầu tư ban đầu; NPV dương nghĩa là dự án tạo giá trị.',
      detail: 'NPV là tiêu chuẩn vàng vì nó tính đến giá trị thời gian của tiền và toàn bộ dòng tiền của dự án. Tỷ lệ chiết khấu r phản ánh chi phí vốn và rủi ro. NPV dương cho thấy dự án sinh lợi suất cao hơn chi phí vốn; NPV âm cho thấy nên từ chối nếu không có lý do chiến lược. So với IRR, NPV ít bị đánh lừa bởi quy mô và dòng tiền đổi dấu.',
      example: 'Dự án cần 1 tỷ, tạo 300 triệu mỗi năm trong 5 năm, chiết khấu 10% có NPV dương nếu tổng hiện giá dòng tiền vượt 1 tỷ.',
      tags: ['đầu tư', 'chiết khấu', 'dòng tiền'], related: ['irr', 'dcf_gordon', 'wacc']
    },
    {
      id: 'irr', category: 'formulas', level: 'Trung bình', title: 'IRR — Tỷ suất hoàn vốn nội bộ',
      subtitle: 'Mức lãi suất làm NPV bằng 0.',
      formula: '0 = Σ CF_t / (1 + IRR)^t − C_0',
      summary: 'IRR là tỷ lệ chiết khấu khiến NPV của dự án bằng 0, thường được so sánh với chi phí vốn để ra quyết định.',
      detail: 'IRR dễ truyền đạt nhưng có thể có nhiều nghiệm khi dòng tiền đổi dấu nhiều lần, và có thể ưu tiên dự án nhỏ có IRR cao thay vì dự án lớn tạo NPV lớn. Với các dự án loại trừ lẫn nhau, nên dùng NPV hoặc IRR gia tăng. IRR giả định dòng tiền được tái đầu tư tại chính IRR, điều hiếm khi đúng trong thực tế.',
      example: 'Dự án có IRR 18% trong khi chi phí vốn 12% thường được chấp nhận, nhưng nếu quy mô quá nhỏ thì NPV mới là thước đo giá trị tạo ra.',
      tags: ['hoàn vốn', 'dự án', 'chi phí vốn'], related: ['npv', 'wacc', 'dcf_gordon']
    },
    {
      id: 'wacc', category: 'formulas', level: 'Trung bình', title: 'WACC — Chi phí vốn bình quân gia quyền',
      subtitle: 'Chi phí vốn của toàn bộ doanh nghiệp.',
      formula: 'WACC = (E/V) × R_e + (D/V) × R_d × (1 − T)',
      summary: 'WACC là chi phí trung bình của vốn chủ sở hữu và nợ, sau khi tính lá chắn thuế của lãi vay.',
      detail: 'WACC là tỷ lệ chiết khấu phù hợp cho dòng tiền tự do của doanh nghiệp khi định giá toàn bộ doanh nghiệp. Chi phí vốn chủ sở hữu thường ước lượng bằng CAPM; chi phí nợ là lãi suất vay sau thuế. WACC thay đổi theo cấu trúc vốn, rủi ro kinh doanh và lãi suất thị trường. Dùng sai WACC có thể làm sai lệch định giá rất lớn, đặc biệt với doanh nghiệp có đòn bẩy cao.',
      example: 'Doanh nghiệp 60% vốn chủ sở hữu chi phí 14%, 40% nợ chi phí 8% trước thuế, thuế 20% có WACC = 0,6×14% + 0,4×8%×0,8 = 10,96%.',
      tags: ['chi phí vốn', 'định giá', 'cấu trúc vốn'], related: ['capm', 'npv', 'mm']
    },
    {
      id: 'dcf_gordon', category: 'formulas', level: 'Trung bình', title: 'DCF & Gordon Growth',
      subtitle: 'Định giá dựa trên dòng tiền tương lai.',
      formula: 'V = Σ FCF_t / (1 + r)^t + TV / (1 + r)^n; TV = FCF_(n+1) / (r − g)',
      summary: 'DCF chiết khấu dòng tiền tự do về hiện tại; Gordon Growth tính giá trị cuối kỳ với giả định tăng trưởng ổn định mãi mãi.',
      detail: 'DCF là khung định giá linh hoạt nhất nhưng phụ thuộc mạnh vào giả định tăng trưởng và chi phí vốn. Giá trị cuối kỳ thường chiếm phần lớn kết quả, nên cần kiểm tra độ nhạy. Gordon Growth chỉ phù hợp khi doanh nghiệp đã ổn định và g < r. Với doanh nghiệp chu kỳ hoặc tăng trưởng cao, nên dùng mô hình nhiều giai đoạn.',
      example: 'FCF năm sau 100 tỷ, r = 12%, g = 3% cho giá trị cuối kỳ khoảng 100 / (12% − 3%) = 1.111 tỷ.',
      tags: ['DCF', 'định giá', 'tăng trưởng'], related: ['npv', 'wacc', 'fundamental']
    },
    {
      id: 'dupont', category: 'formulas', level: 'Cơ bản', title: 'Phân tích DuPont',
      subtitle: 'Bóc tách ROE thành ba động lực.',
      formula: 'ROE = Biên lợi nhuận × Vòng quay tài sản × Đòn bẩy tài chính',
      summary: 'DuPont cho thấy ROE cao đến từ biên lợi nhuận, hiệu quả sử dụng tài sản hay đòn bẩy, mỗi nguồn có rủi ro khác nhau.',
      detail: 'Công thức giúp nhà phân tích không chỉ nhìn ROE mà còn hiểu chất lượng của nó. Biên lợi nhuận cao thể hiện lợi thế giá hoặc chi phí; vòng quay cao thể hiện hiệu quả vận hành; đòn bẩy cao có thể khuếch đại lợi nhuận nhưng cũng tăng rủi ro. So sánh DuPont qua các năm và với đối thủ giúp phát hiện nguyên nhân thay đổi hiệu quả.',
      example: 'ROE 20% có thể đến từ biên 10% × vòng quay 2 × đòn bẩy 1, hoặc biên 5% × vòng quay 1 × đòn bẩy 4 — rủi ro rất khác nhau.',
      tags: ['ROE', 'hiệu quả', 'đòn bẩy'], related: ['fundamental', 'credit_risk', 'wacc']
    },
    {
      id: 'kelly', category: 'formulas', level: 'Nâng cao', title: 'Kelly Criterion',
      subtitle: 'Đặt bao nhiêu vốn cho một cơ hội có lợi thế?',
      formula: 'f* = (p × b − q) / b',
      summary: 'Kelly tính tỷ lệ vốn tối ưu để tối đa hoá tăng trưởng dài hạn khi biết xác suất thắng và tỷ lệ thắng/thua.',
      detail: 'f* là tỷ lệ vốn nên đặt, p là xác suất thắng, q = 1 − p, b là tỷ lệ lời/lỗ. Kelly đầy đủ thường quá mạo hiểm vì ước lượng xác suất không chính xác; thực tế dùng half-Kelly hoặc fractional Kelly. Công thức nhấn mạnh rằng ngay cả khi có lợi thế, đặt quá lớn vẫn có thể dẫn đến phá sản. Nó cũng giải thích vì sao quản trị rủi ro quan trọng hơn dự đoán đúng.',
      example: 'Nếu p = 55%, b = 1 (thắng/thua 1:1), f* = (0,55 − 0,45) / 1 = 10% vốn cho mỗi lần đặt.',
      tags: ['quản trị rủi ro', 'position sizing', 'xác suất'], related: ['var', 'sharpe', 'behavioral']
    },
    {
      id: 'sharpe', category: 'formulas', level: 'Cơ bản', title: 'Sharpe & Sortino',
      subtitle: 'Đo hiệu quả trên mỗi đơn vị rủi ro.',
      formula: 'Sharpe = (R_p − R_f) / σ_p; Sortino = (R_p − R_f) / σ_downside',
      summary: 'Sharpe đo lợi suất vượt trội trên tổng biến động; Sortino chỉ tính biến động giảm, phù hợp với nhà đầu tư quan tâm rủi ro lỗ.',
      detail: 'Sharpe cao có thể đến từ lợi suất cao hoặc biến động thấp, nhưng có thể bị thổi phồng bởi chiến lược bán quyền chọn đuôi. Sortino thay độ lệch chuẩn bằng độ lệch giảm, gần với trải nghiệm thực tế hơn. Cả hai đều cần so sánh cùng kỳ, cùng tần suất và cùng loại tài sản. Không có tỷ lệ nào thay thế được việc hiểu bản chất rủi ro.',
      example: 'Hai quỹ cùng lợi suất 12%; quỹ A biến động 10%, quỹ B biến động 18% — quỹ A có Sharpe cao hơn nếu lãi suất phi rủi ro như nhau.',
      tags: ['Sharpe', 'Sortino', 'hiệu quả'], related: ['var', 'mpt', 'alpha']
    },
    {
      id: 'technical', category: 'analysis', level: 'Cơ bản', title: 'Phân tích kỹ thuật',
      subtitle: 'Đọc xu hướng, động lượng và vùng giá.',
      formula: 'Tín hiệu = f(Giá, Khối lượng, Thời gian)',
      summary: 'Phân tích kỹ thuật dùng dữ liệu giá và khối lượng để nhận diện xu hướng, động lượng và các vùng hỗ trợ/kháng cự.',
      detail: 'Các công cụ phổ biến gồm MA, EMA, RSI, MACD, Bollinger Bands và Fibonacci. Phân tích kỹ thuật không dự báo chắc chắn tương lai; nó giúp cấu trúc quyết định và quản trị điểm vào/ra. Tín hiệu mạnh hơn khi nhiều công cụ đồng thuận và có khối lượng xác nhận. Trong thị trường hiệu quả yếu, lợi thế từ kỹ thuật có thể tồn tại ngắn hạn nhưng thường bị phí và trượt giá bào mòn.',
      example: 'Giá vượt MA200 kèm khối lượng tăng thường được xem là xác nhận xu hướng tăng, nhưng cần stop-loss vì tín hiệu có thể sai.',
      tags: ['MA', 'RSI', 'MACD', 'xu hướng'], related: ['emh', 'factor', 'behavioral']
    },
    {
      id: 'fundamental', category: 'analysis', level: 'Cơ bản', title: 'Phân tích cơ bản',
      subtitle: 'Định giá doanh nghiệp từ báo cáo tài chính.',
      formula: 'Giá trị nội tại = f(Dòng tiền, Tăng trưởng, Rủi ro)',
      summary: 'Phân tích cơ bản nghiên cứu doanh thu, lợi nhuận, dòng tiền, bảng cân đối và lợi thế cạnh tranh để ước lượng giá trị doanh nghiệp.',
      detail: 'Nhà phân tích cơ bản kết hợp báo cáo tài chính, chỉ số định giá (P/E, P/B, EV/EBITDA), chất lượng lợi nhuận và triển vọng ngành. Cần phân biệt lợi nhuận kế toán với dòng tiền thực, và kiểm tra các khoản mục một lần. Định giá tương đối so sánh với peers; định giá tuyệt đối dùng DCF. Kết luận nên kèm kịch bản và rủi ro làm sai luận điểm.',
      example: 'P/E thấp có thể là cơ hội hoặc dấu hiệu lợi nhuận sắp giảm; cần đọc nguyên nhân thay vì chỉ nhìn con số.',
      tags: ['P/E', 'ROE', 'DCF', 'báo cáo tài chính'], related: ['dcf_gordon', 'dupont', 'credit_risk']
    },
    {
      id: 'factor', category: 'analysis', level: 'Trung bình', title: 'Đầu tư theo nhân tố',
      subtitle: 'Value, momentum, quality, size và low volatility.',
      formula: 'R_i − R_f = α + β_m(R_m − R_f) + β_1F_1 + … + β_kF_k + ε',
      summary: 'Factor investing giải thích lợi suất bằng các nhân tố rủi ro có bằng chứng dài hạn thay vì chỉ beta thị trường.',
      detail: 'Các nhân tố phổ biến gồm value (giá trị), momentum (động lượng), quality (chất lượng), size (quy mô nhỏ) và low volatility (biến động thấp). Nhà đầu tư có thể tiếp cận qua quỹ chỉ số nhân tố hoặc xây dựng danh mục riêng. Nhân tố có thể trải qua giai đoạn kém hiệu quả dài, nên cần kỷ luật và đa dạng hoá nhân tố. Dữ liệu mining quá mức có thể tạo ra nhân tố giả.',
      example: 'Một quỹ value mua cổ phiếu có P/B thấp và bán cổ phiếu P/B cao, kỳ vọng phần bù value trong dài hạn.',
      tags: ['value', 'momentum', 'quality', 'factor'], related: ['capm', 'technical', 'emh']
    },
    {
      id: 'var', category: 'analysis', level: 'Trung bình', title: 'VaR & CVaR',
      subtitle: 'Đo tổn thất tiềm năng theo xác suất.',
      formula: 'P(L > VaR_α) = 1 − α; CVaR_α = E[L | L > VaR_α]',
      summary: 'VaR cho biết ngưỡng lỗ tại một mức tin cậy; CVaR đo mức lỗ trung bình trong phần đuôi vượt ngưỡng đó.',
      detail: 'VaR 95% một ngày trả lời câu hỏi: trong 95% ngày, lỗ không vượt quá bao nhiêu. Nó không cho biết mức lỗ tối đa và có thể bị đánh lừa bởi phân phối đuôi dày. CVaR/Expected Shortfall khắc phục bằng cách lấy trung bình các tổn thất vượt VaR. Cả hai phụ thuộc vào dữ liệu lịch sử và giả định phân phối, nên cần kết hợp stress test.',
      example: 'VaR 99% một ngày là 2% danh mục nghĩa là 1% trường hợp xấu nhất có thể lỗ hơn 2%; CVaR cho biết mức lỗ trung bình khi rơi vào 1% đó.',
      tags: ['VaR', 'CVaR', 'rủi ro đuôi'], related: ['monte_carlo', 'kelly', 'correlation']
    },
    {
      id: 'monte_carlo', category: 'analysis', level: 'Trung bình', title: 'Mô phỏng Monte Carlo',
      subtitle: 'Chạy hàng nghìn kịch bản để hiểu phân phối kết quả.',
      formula: 'Kết quả = mô phỏng lặp lại các biến ngẫu nhiên theo phân phối giả định',
      summary: 'Monte Carlo tạo nhiều đường đi ngẫu nhiên của giá hoặc dòng tiền để ước lượng phân phối lợi nhuận, rủi ro và xác suất đạt mục tiêu.',
      detail: 'Mô phỏng hữu ích khi bài toán không có công thức đóng, ví dụ đường cong tài sản hưu trí hoặc chiến lược có nhiều quy tắc. Chất lượng kết quả phụ thuộc vào phân phối đầu vào và tương quan giữa các biến. Cần chạy đủ số lần để giảm sai số và kiểm tra độ nhạy. Monte Carlo không dự báo tương lai chính xác; nó cho thấy dải kết quả có thể xảy ra.',
      example: 'Mô phỏng 10.000 đường giá cổ phiếu với lợi suất kỳ vọng 8% và độ lệch chuẩn 20% để ước lượng xác suất lỗ sau 1 năm.',
      tags: ['mô phỏng', 'xác suất', 'kịch bản'], related: ['var', 'mpt', 'behavioral']
    },
    {
      id: 'correlation', category: 'analysis', level: 'Cơ bản', title: 'Tương quan & đa dạng hoá',
      subtitle: 'Tại sao ghép tài sản có thể giảm rủi ro?',
      formula: 'ρ_AB = Cov(A,B) / (σ_A × σ_B), −1 ≤ ρ ≤ 1',
      summary: 'Tương quan đo mức độ hai tài sản biến động cùng nhau; tương quan thấp giúp đa dạng hoá hiệu quả hơn.',
      detail: 'Tương quan dương gần 1 làm lợi ích đa dạng hoá giảm; tương quan âm có thể giảm mạnh biến động danh mục. Tương quan không ổn định và thường tăng trong khủng hoảng, đúng lúc nhà đầu tư cần nhất. Vì vậy không nên giả định tương quan lịch sử sẽ giữ nguyên. Đa dạng hoá theo ngành, khu vực và loại tài sản giúp giảm rủi ro riêng lẻ nhưng không loại bỏ rủi ro hệ thống.',
      example: 'Cổ phiếu ngân hàng và cổ phiếu công nghệ có thể cùng giảm khi lãi suất tăng; thêm trái phiếu hoặc vàng có thể giúp cân bằng danh mục.',
      tags: ['tương quan', 'đa dạng hoá', 'rủi ro'], related: ['mpt', 'var', 'beta']
    },
    {
      id: 'beta', category: 'concepts', level: 'Cơ bản', title: 'Beta',
      subtitle: 'Độ nhạy của tài sản với thị trường.',
      formula: 'β_i = Cov(R_i, R_m) / Var(R_m)',
      summary: 'Beta đo mức thay đổi kỳ vọng của lợi suất tài sản khi thị trường thay đổi 1%, là thước đo rủi ro hệ thống.',
      detail: 'Beta 1 nghĩa là tài sản biến động tương đương thị trường; beta 1,5 khuếch đại biến động thị trường; beta 0,5 ít nhạy hơn. Beta âm hiếm và có thể dùng để phòng hộ. Beta ước lượng từ dữ liệu quá khứ và thay đổi theo thời gian, ngành và chu kỳ. Nó không phản ánh rủi ro riêng lẻ hoặc rủi ro thanh khoản.',
      example: 'Cổ phiếu beta 1,3 thường tăng 1,3% khi thị trường tăng 1% và giảm 1,3% khi thị trường giảm 1%, theo lý thuyết.',
      tags: ['beta', 'rủi ro hệ thống', 'CAPM'], related: ['capm', 'alpha', 'correlation']
    },
    {
      id: 'alpha', category: 'concepts', level: 'Trung bình', title: 'Alpha',
      subtitle: 'Phần lợi suất vượt trội so với rủi ro đã chấp nhận.',
      formula: 'α = R_p − [R_f + β_p × (R_m − R_f)]',
      summary: 'Alpha đo phần lợi suất không được giải thích bởi rủi ro thị trường; alpha dương cho thấy kỹ năng hoặc may mắn vượt chuẩn.',
      detail: 'Alpha thường được ước lượng sau khi điều chỉnh beta, nhưng có thể do may mắn, phong cách đầu tư hoặc rủi ro ẩn. Alpha bền vững rất khó duy trì sau phí. Nhà đầu tư nên kiểm tra độ dài chuỗi, drawdown và tính nhất quán trước khi tin vào alpha. Trong thực tế, nhiều chiến lược gọi là alpha thực chất là phần bù rủi ro nhân tố.',
      example: 'Quỹ đạt 15% trong khi CAPM dự báo 12% với beta tương ứng có alpha thô khoảng 3%, trước khi xét phí và may mắn.',
      tags: ['alpha', 'hiệu suất', 'CAPM'], related: ['capm', 'beta', 'emh']
    },
    {
      id: 'duration', category: 'concepts', level: 'Trung bình', title: 'Duration & Convexity',
      subtitle: 'Độ nhạy của trái phiếu với lãi suất.',
      formula: 'ΔP/P ≈ −D × Δy + ½ × C × (Δy)²',
      summary: 'Duration đo mức thay đổi giá trái phiếu khi lãi suất thay đổi; convexity mô tả độ cong của mối quan hệ đó.',
      detail: 'Duration càng cao, giá trái phiếu càng nhạy với lãi suất. Trái phiếu dài hạn và coupon thấp thường có duration cao. Convexity cho thấy giá tăng nhiều hơn khi lãi suất giảm và giảm ít hơn khi lãi suất tăng, tạo lợi thế cho nhà đầu tư. Quản trị rủi ro lãi suất thường dùng duration matching giữa tài sản và nghĩa vụ.',
      example: 'Trái phiếu duration 7 năm có thể giảm khoảng 7% giá khi lãi suất tăng 1 điểm phần trăm, trước khi tính convexity.',
      tags: ['trái phiếu', 'lãi suất', 'duration'], related: ['yield_curve', 'wacc', 'var']
    },
    {
      id: 'credit_risk', category: 'concepts', level: 'Trung bình', title: 'Rủi ro tín dụng',
      subtitle: 'Khả năng người vay không trả được nợ.',
      formula: 'Tổn thất kỳ vọng = PD × LGD × EAD',
      summary: 'Rủi ro tín dụng là nguy cơ người vay không thanh toán đúng hạn; được đo bằng xác suất vỡ nợ, tổn thất khi vỡ nợ và dư nợ tại thời điểm vỡ nợ.',
      detail: 'PD (probability of default) là xác suất vỡ nợ; LGD (loss given default) là phần dư nợ không thu hồi được; EAD (exposure at default) là số tiền đang cho vay khi vỡ nợ. Rủi ro tín dụng không chỉ ở trái phiếu mà còn trong cho vay tiêu dùng, bảo lãnh và đối tác phái sinh. Xếp hạng tín dụng, tài sản bảo đảm và covenant giúp giảm tổn thất kỳ vọng.',
      example: 'Nếu PD 2%, LGD 50% và EAD 100 triệu thì tổn thất kỳ vọng khoảng 1 triệu đồng.',
      tags: ['tín dụng', 'PD', 'LGD', 'vỡ nợ'], related: ['credit_analyst', 'mm', 'var']
    },
    {
      id: 'liquidity', category: 'concepts', level: 'Cơ bản', title: 'Thanh khoản',
      subtitle: 'Khả năng mua bán nhanh mà không làm lệch giá.',
      formula: 'Chi phí thanh khoản ≈ spread + market impact',
      summary: 'Thanh khoản là mức độ dễ dàng chuyển tài sản thành tiền mặt; thanh khoản kém làm tăng chi phí giao dịch và rủi ro thoát vị thế.',
      detail: 'Thị trường thanh khoản cao có spread hẹp và độ sâu lớn. Khi căng thẳng, thanh khoản có thể biến mất đúng lúc nhiều người muốn bán. Nhà đầu tư nên tính đến quy mô vị thế so với khối lượng giao dịch và giữ đệm tiền mặt. Rủi ro thanh khoản là một trong những nguyên nhân khiến chiến lược đòn bẩy đổ vỡ.',
      example: 'Một cổ phiếu nhỏ giao dịch vài trăm triệu mỗi phiên khó hấp thụ lệnh bán vài chục tỷ mà không bị trượt giá mạnh.',
      tags: ['thanh khoản', 'spread', 'trượt giá'], related: ['var', 'credit_risk', 'behavioral']
    },
    {
      id: 'behavioral', category: 'concepts', level: 'Cơ bản', title: 'Tài chính hành vi',
      subtitle: 'Tâm lý và thiên kiến ảnh hưởng đến quyết định đầu tư.',
      formula: 'Quyết định = Lý trí + Thiên kiến + Cảm xúc + Bối cảnh',
      summary: 'Tài chính hành vi nghiên cứu cách con người thực sự ra quyết định, thường khác với giả định nhà đầu tư hoàn toàn lý trí.',
      detail: 'Các thiên kiến phổ biến gồm neo giá, sợ thua lỗ, tự tin quá mức, thiên kiến xác nhận và hiệu ứng bầy đàn. Chúng dẫn đến mua đuổi, bán hoảng loạn và giữ vị thế lỗ quá lâu. Cách giảm thiểu gồm quy tắc đầu tư viết trước, kiểm tra chéo, giới hạn rủi ro và tách quyết định khỏi cảm xúc. Hiểu tâm lý không đảm bảo thắng, nhưng giúp tránh sai lầm lặp lại.',
      example: 'Nhà đầu tư neo vào giá mua 100.000 ₫ và từ chối bán ở 80.000 ₫ dù luận điểm đã thay đổi — đó là thiên kiến neo giá và sợ hiện thực hoá lỗ.',
      tags: ['tâm lý', 'thiên kiến', 'kỷ luật'], related: ['emh', 'kelly', 'technical']
    },
    {
      id: 'time_value', category: 'concepts', level: 'Cơ bản', title: 'Giá trị thời gian của tiền',
      subtitle: 'Một đồng hôm nay đáng giá hơn một đồng ngày mai.',
      formula: 'FV = PV × (1 + r)^n; PV = FV / (1 + r)^n',
      summary: 'Tiền có thể sinh lãi, nên dòng tiền ở các thời điểm khác nhau phải được quy về cùng một mốc để so sánh.',
      detail: 'Giá trị thời gian của tiền là nền tảng của định giá, lập ngân sách vốn và tiết kiệm. Lãi kép khiến thời gian nắm giữ quan trọng: bắt đầu sớm thường hiệu quả hơn cố gắng đầu tư nhiều sau này. Lạm phát làm giảm sức mua, nên cần phân biệt lãi suất danh nghĩa và lãi suất thực. Mọi công thức NPV, IRR, DCF đều dựa trên nguyên lý này.',
      example: '100 triệu ở lãi suất 8%/năm sau 10 năm thành khoảng 216 triệu nếu lãi nhập gốc, trước thuế và lạm phát.',
      tags: ['lãi kép', 'chiết khấu', 'lạm phát'], related: ['npv', 'irr', 'dcf_gordon']
    },
    {
      id: 'yield_curve', category: 'concepts', level: 'Trung bình', title: 'Đường cong lợi suất',
      subtitle: 'Lãi suất ngắn hạn và dài hạn nói gì về nền kinh tế?',
      formula: 'Yield(t) = lợi suất trái phiếu kỳ hạn t',
      summary: 'Đường cong lợi suất biểu diễn lợi suất theo kỳ hạn; hình dạng của nó phản ánh kỳ vọng tăng trưởng, lạm phát và chính sách tiền tệ.',
      detail: 'Đường cong bình thường dốc lên vì nhà đầu tư yêu cầu bù rủi ro kỳ hạn. Đường cong đảo ngược khi lãi suất ngắn hạn cao hơn dài hạn, thường là tín hiệu suy giảm tăng trưởng. Đường cong phẳng cho thấy thị trường bất định. Nhà đầu tư dùng đường cong để định giá trái phiếu, dự báo lạm phát và luân chuyển danh mục giữa kỳ hạn.',
      example: 'Khi Fed tăng lãi suất mạnh, lợi suất 2 năm có thể vượt 10 năm, tạo đường cong đảo ngược.',
      tags: ['trái phiếu', 'lãi suất', 'vĩ mô'], related: ['duration', 'wacc', 'credit_risk']
    }
  ];

  /* ------------------------- FINANCE LIBRARY · BỔ SUNG ------------------------- */
  const LIBRARY_ADDITIONS = [
    {
      id: 'fama_french', category: 'theorems', level: 'Trung bình', title: 'Mô hình 3 nhân tố Fama-French',
      subtitle: 'Beta thị trường chưa đủ để giải thích lợi suất.',
      formula: 'E(R_i) − R_f = β_m × MRP + β_s × SMB + β_v × HML',
      summary: 'Ngoài rủi ro thị trường, lợi suất cổ phiếu còn được giải thích bởi quy mô doanh nghiệp (size) và tỷ lệ giá trị sổ sách trên giá (value).',
      detail: 'Fama và French bổ sung hai nhân tố SMB (small minus big) và HML (high minus low book-to-market) vào CAPM. Các nhân tố này có bằng chứng dài hạn ở nhiều thị trường, nhưng cũng trải qua giai đoạn kém hiệu quả kéo dài và chịu ảnh hưởng của dữ liệu mining. Mô hình 5 nhân tố sau này còn thêm profitability và investment. Điểm cốt lõi: lợi suất kỳ vọng phải đi kèm rủi ro và phong cách đầu tư, không chỉ beta.',
      example: 'Một cổ phiếu nhỏ, định giá thấp có thể có lợi suất kỳ vọng cao hơn CAPM nhờ phơi nhiễm SMB và HML, nhưng cũng chịu rủi ro thanh khoản và chu kỳ lớn hơn.',
      tags: ['Fama-French', 'SMB', 'HML', 'factor'], related: ['capm', 'factor', 'beta'],
      metrics: [
        { label: 'Phần bù thị trường', value: '≈ 6,5%/năm', hint: 'MRP dài hạn tham khảo' },
        { label: 'SMB', value: '≈ 2,1%/năm', hint: 'Small minus big' },
        { label: 'HML', value: '≈ 3,8%/năm', hint: 'High minus low' },
        { label: 'Dữ liệu kiểm định', value: '1927–2024', hint: 'Thị trường Mỹ' }
      ],
      visual: {
        kind: 'bar', title: 'Phần bù nhân tố dài hạn (minh hoạ)', unit: '%/năm',
        note: 'Số liệu tham khảo từ nghiên cứu học thuật, không phải dự báo lợi suất tương lai.',
        labels: ['Thị trường', 'SMB', 'HML', 'Momentum', 'Quality'],
        series: [{ name: 'Phần bù', color: '#f3c56b', values: [6.5, 2.1, 3.8, 4.5, 3.0] }]
      }
    },
    {
      id: 'prospect_theory', category: 'theorems', level: 'Trung bình', title: 'Lý thuyết triển vọng (Prospect Theory)',
      subtitle: 'Con người sợ lỗ hơn thích lãi cùng độ lớn.',
      formula: 'V(x) = x^α nếu x ≥ 0; V(x) = −λ(−x)^β nếu x < 0',
      summary: 'Kahneman và Tversky cho thấy con người đánh giá kết quả tương đối so với điểm tham chiếu, và nỗi đau khi lỗ lớn hơn niềm vui khi lãi cùng số tiền.',
      detail: 'Hệ số loss aversion λ thường được ước lượng quanh 2,25: mất 100 nghìn đau gần gấp đôi niềm vui khi được 100 nghìn. Hàm giá trị lõm ở vùng lãi và lồi ở vùng lỗ, khiến nhà đầu tư chốt lời quá sớm nhưng giữ khoản lỗ quá lâu. Xác suất cũng bị đánh giá lệch: người ta quá coi trọng biến cố hiếm. Đây là nền tảng của tài chính hành vi.',
      example: 'Nhà đầu tư bán cổ phiếu lãi 10% nhưng giữ cổ phiếu lỗ 30% với hy vọng hòa vốn — disposition effect điển hình.',
      tags: ['Kahneman', 'loss aversion', 'tâm lý'], related: ['behavioral', 'kelly', 'emh'],
      metrics: [
        { label: 'Loss aversion λ', value: '≈ 2,25', hint: 'Lỗ đau gấp ~2,25 lần lãi' },
        { label: 'Cong lãi α', value: '≈ 0,88', hint: 'Độ lõm của hàm giá trị' },
        { label: 'Cong lỗ β', value: '≈ 0,88', hint: 'Độ lồi vùng lỗ' },
        { label: 'Điểm tham chiếu', value: 'Quan trọng', hint: 'Kết quả được đánh giá tương đối' }
      ],
      visual: {
        kind: 'bar', title: 'Giá trị thực vs cảm nhận (ví dụ)', unit: 'nghìn đồng',
        note: 'Minh hoạ loss aversion: lỗ 100 nghìn được cảm nhận tương đương lỗ 225 nghìn.',
        labels: ['Lãi 100', 'Lỗ 100', 'Lãi 200', 'Lỗ 200'],
        series: [
          { name: 'Giá trị thực', color: '#5ac8fa', values: [100, -100, 200, -200] },
          { name: 'Cảm nhận', color: '#ff5d73', values: [75, -225, 140, -400] }
        ]
      }
    },
    {
      id: 'bayes', category: 'theorems', level: 'Cơ bản', title: 'Định lý Bayes & base rate',
      subtitle: 'Xác suất thật sau khi có tin mới.',
      formula: 'P(A|B) = P(B|A) × P(A) / P(B)',
      summary: 'Bayes cập nhật xác suất tiên nghiệm bằng bằng chứng mới. Trong tài chính, nó giúp tránh bỏ qua tỷ lệ nền khi đọc tín hiệu hoặc tin tức.',
      detail: 'Sai lầm phổ biến là chỉ nhìn độ chính xác của tín hiệu mà quên tỷ lệ nền. Một xét nghiệm có độ nhạy 95% cho căn bệnh hiếm 1% vẫn có thể chỉ đúng khoảng 16% khi kết quả dương, vì dương tính giả chiếm đa số. Trong đầu tư, tín hiệu kỹ thuật hay tin tốt cũng cần được cân bằng với xác suất nền của thị trường. Bayes cũng là nền tảng của học máy và cập nhật mô hình.',
      example: 'Bệnh hiếm 1%, xét nghiệm nhạy 95% và dương tính giả 5%: xác suất thực sự mắc bệnh sau kết quả dương chỉ khoảng 16%.',
      tags: ['Bayes', 'xác suất', 'base rate'], related: ['emh', 'behavioral', 'regression'],
      metrics: [
        { label: 'Tỷ lệ nền', value: '1%', hint: 'Xác suất tiên nghiệm' },
        { label: 'Độ nhạy', value: '95%', hint: 'P(dương | bệnh)' },
        { label: 'Dương tính giả', value: '5%', hint: 'P(dương | không bệnh)' },
        { label: 'Hậu nghiệm', value: '≈ 16%', hint: 'P(bệnh | dương)' }
      ],
      visual: {
        kind: 'bar', title: 'Cập nhật xác suất sau xét nghiệm', unit: '% xác suất',
        note: 'Tỷ lệ nền thấp khiến phần lớn kết quả dương là dương tính giả.',
        labels: ['Trước xét nghiệm', 'Sau kết quả dương'],
        series: [{ name: 'Xác suất mắc bệnh', color: '#b59cff', values: [1, 16.1] }]
      }
    },
    {
      id: 'garch', category: 'analysis', level: 'Nâng cao', title: 'GARCH & volatility clustering',
      subtitle: 'Biến động có thể dự báo một phần.',
      formula: 'σ_t² = ω + α × ε_(t−1)² + β × σ_(t−1)²',
      summary: 'GARCH mô tả xu hướng biến động tụm lại: phiên biến động mạnh thường theo sau bởi phiên biến động mạnh, rồi dịu dần.',
      detail: 'Mô hình dùng phương sai có điều kiện: phương sai hôm nay phụ thuộc cú sốc hôm qua và phương sai hôm qua. Tổng α + β gần 1 cho thấy mức độ dai dẳng cao; half-life ước lượng thời gian để cú sốc biến động giảm một nửa. GARCH hữu ích cho quản trị rủi ro, định giá quyền chọn và sizing vị thế, nhưng không dự báo hướng giá. Các biến thể EGARCH/GJR-GARCH còn xét bất đối xứng giữa cú sốc tăng và giảm.',
      example: 'Với α + β = 0,95, half-life xấp xỉ ln(0,5)/ln(0,95) ≈ 13,5 phiên; biến động sau cú sốc sẽ giảm dần qua khoảng hai tuần giao dịch.',
      tags: ['GARCH', 'volatility', 'risk'], related: ['var', 'monte_carlo', 'correlation'],
      metrics: [
        { label: 'Độ dai dẳng α+β', value: '0,95', hint: 'Càng gần 1 càng dai dẳng' },
        { label: 'Half-life', value: '≈ 13,5 phiên', hint: 'ln(0,5)/ln(0,95)' },
        { label: 'Vol dài hạn', value: '18%/năm', hint: 'Giả định mô hình' },
        { label: 'Cú sốc gần nhất', value: '+2,4σ', hint: 'Ví dụ minh hoạ' }
      ],
      visual: {
        kind: 'line', title: 'Biến động tụm lại theo thời gian', unit: '%/ngày',
        note: 'Mô phỏng minh hoạ: các cụm biến động cao đi kèm nhau thay vì phân bố đều.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
        series: [{ name: 'Volatility', color: '#ff5d73', values: [1.1, 1.3, 2.8, 3.4, 2.9, 1.8, 1.2, 1.1, 2.2, 3.1, 2.4, 1.6], fill: true }]
      }
    },
    {
      id: 'fisher', category: 'formulas', level: 'Cơ bản', title: 'Phương trình Fisher',
      subtitle: 'Lãi suất danh nghĩa, lạm phát và lãi suất thực.',
      formula: '(1 + i) = (1 + r) × (1 + π) ≈ r + π',
      summary: 'Lãi suất danh nghĩa phải bù đắp cả lãi suất thực lẫn lạm phát kỳ vọng. Khi lạm phát tăng, nhà đầu tư đòi hỏi lãi suất danh nghĩa cao hơn.',
      detail: 'Phương trình Fisher giải thích vì sao lãi suất danh nghĩa và lạm phát thường đi cùng nhau. Lãi suất thực mới phản ánh sức mua tăng thêm. Nếu lãi suất danh nghĩa 8% và lạm phát 3,5%, lãi suất thực xấp xỉ 4,35%, không phải 4,5%. Trong môi trường lạm phát cao, tiền mặt và trái phiếu coupon cố định chịu thiệt; tài sản thực và chứng khoán có định giá linh hoạt có thể phòng hộ tốt hơn.',
      example: 'Gửi tiết kiệm 8%/năm khi lạm phát 3,5%: sức mua thực tăng khoảng (1,08/1,035 − 1) ≈ 4,35%/năm.',
      tags: ['Fisher', 'lạm phát', 'lãi suất thực'], related: ['time_value', 'yield_curve', 'duration'],
      metrics: [
        { label: 'Lãi suất danh nghĩa', value: '8,0%', hint: 'Lãi suất nhìn thấy' },
        { label: 'Lạm phát', value: '3,5%', hint: 'Kỳ vọng/năm' },
        { label: 'Lãi suất thực', value: '4,35%', hint: 'Sức mua tăng thêm' },
        { label: 'Chênh lệch', value: '−0,15 điểm %', hint: 'So với phép trừ đơn giản' }
      ],
      visual: {
        kind: 'bar', title: 'Phân rã lãi suất danh nghĩa', unit: '%/năm',
        note: 'Lãi suất thực được tính chính xác bằng (1+i)/(1+π) − 1.',
        labels: ['Danh nghĩa', 'Lạm phát', 'Thực'],
        series: [{ name: 'Lãi suất', color: '#f3c56b', values: [8, 3.5, 4.35] }]
      }
    },
    {
      id: 'merton', category: 'theorems', level: 'Nâng cao', title: 'Mô hình Merton về rủi ro tín dụng',
      subtitle: 'Vốn chủ như quyền chọn mua trên tài sản doanh nghiệp.',
      formula: 'PD = N(−d2); d2 = [ln(V/D) + (r − ½σ²)T] / (σ√T)',
      summary: 'Merton mô hình hoá vốn chủ là quyền chọn mua trên tài sản doanh nghiệp với giá thực hiện bằng nợ đến hạn. Khoảng cách tới vỡ nợ càng nhỏ, xác suất vỡ nợ càng cao.',
      detail: 'Mô hình cấu trúc (structural model) dùng giá trị tài sản, biến động tài sản và mức nợ để ước lượng xác suất vỡ nợ. Distance to default (DD) đo số độ lệch chuẩn tài sản còn cách ngưỡng vỡ nợ. PD tăng phi tuyến khi DD giảm, đặc biệt dưới 2. Mô hình giúp liên kết định giá quyền chọn với tín dụng và là nền tảng của KMV/Moody\'s. Hạn chế: giả định tài sản giao dịch liên tục và nợ chỉ đáo hạn một lần.',
      example: 'Doanh nghiệp có tài sản 100 tỷ, nợ 80 tỷ, biến động 25%, lãi suất 4%, kỳ hạn 1 năm cho DD khoảng 2,2 và PD lý thuyết quanh 1,4%.',
      tags: ['Merton', 'PD', 'distance to default'], related: ['credit_risk', 'black_scholes', 'credit_analyst'],
      metrics: [
        { label: 'Giá trị tài sản', value: '100 tỷ', hint: 'V' },
        { label: 'Nợ đến hạn', value: '80 tỷ', hint: 'D' },
        { label: 'Biến động tài sản', value: '25%/năm', hint: 'σ' },
        { label: 'Distance to default', value: '≈ 2,2σ', hint: 'Càng cao càng an toàn' },
        { label: 'PD 1 năm', value: '≈ 1,4%', hint: 'N(−d2)' }
      ],
      visual: {
        kind: 'line', title: 'PD tăng phi tuyến khi DD giảm', unit: '% xác suất vỡ nợ',
        note: 'Minh hoạ mô hình Merton: dưới DD 2, xác suất vỡ nợ tăng rất nhanh.',
        labels: ['3,0', '2,5', '2,0', '1,5', '1,0'],
        series: [{ name: 'PD 1 năm', color: '#ff5d73', values: [0.13, 0.62, 2.28, 6.68, 15.87], fill: true }]
      }
    },
    {
      id: 'liquidity_premium', category: 'concepts', level: 'Trung bình', title: 'Phần bù thanh khoản',
      subtitle: 'Tài sản khó bán phải có lợi suất cao hơn.',
      formula: 'E(R) = R_f + β × MRP + LP',
      summary: 'Nhà đầu tư yêu cầu phần bù cho việc nắm giữ tài sản khó bán, spread rộng hoặc thời gian thoát vị thế dài.',
      detail: 'Thanh khoản là rủi ro thực: khi cần bán gấp, chi phí giao dịch và trượt giá có thể xoá sạch lợi nhuận. Cổ phiếu vốn hoá nhỏ, trái phiếu doanh nghiệp ít giao dịch và tài sản tư nhân thường có phần bù thanh khoản cao hơn blue-chip. Phần bù này không cố định và có thể biến mất trong giai đoạn thị trường hưng phấn, rồi tăng vọt khi căng thẳng. Nhà đầu tư cá nhân nên đo quy mô vị thế so với khối lượng giao dịch trung bình.',
      example: 'Một cổ phiếu small-cap giao dịch 2 tỷ/phiên khó hấp thụ lệnh bán 20 tỷ mà không bị trượt giá vài phần trăm.',
      tags: ['thanh khoản', 'illiquidity', 'spread'], related: ['liquidity', 'var', 'correlation'],
      metrics: [
        { label: 'Blue-chip spread', value: '≈ 0,05%', hint: 'Thanh khoản cao' },
        { label: 'Small-cap spread', value: '≈ 0,50%', hint: 'Thanh khoản thấp hơn' },
        { label: 'Tài sản tư nhân', value: '≈ 2–3%/năm', hint: 'Phần bù minh hoạ' },
        { label: 'Thời gian thoát', value: '2–5 năm', hint: 'Private equity' }
      ],
      visual: {
        kind: 'bar', title: 'Chi phí thanh khoản ước tính', unit: '%/năm',
        note: 'Số liệu minh hoạ theo nhóm tài sản; spread thực tế thay đổi theo thị trường.',
        labels: ['Blue-chip', 'Mid-cap', 'Small-cap', 'Private'],
        series: [{ name: 'Phần bù', color: '#2ee6a6', values: [0.05, 0.2, 0.6, 2.5] }]
      }
    },
    {
      id: 'carry', category: 'concepts', level: 'Trung bình', title: 'Carry trade',
      subtitle: 'Vay đồng tiền lãi suất thấp, đầu tư đồng tiền lãi suất cao.',
      formula: 'Carry ≈ Lợi suất tài sản − Chi phí vay − Chi phí phòng hộ',
      summary: 'Carry kiếm chênh lệch lãi suất giữa hai đồng tiền hoặc tài sản, nhưng thường gánh rủi ro tỷ giá và thanh khoản.',
      detail: 'Chiến lược carry phổ biến ở forex, trái phiếu và hàng hoá. Lợi nhuận đến từ chênh lệch lãi suất hoặc roll yield, không phải dự báo hướng giá. Carry thường có lợi suất đều đặn nhưng phân phối lợi nhuận lệch: lãi nhỏ trong thời gian dài, lỗ lớn khi tỷ giá hoặc thanh khoản đảo chiều. Đòn bẩy làm rủi ro tăng nhanh. Cần theo dõi biến động ngầm, chênh lệch lãi suất và điều kiện thanh khoản toàn cầu.',
      example: 'Vay JPY với lãi suất 0,5% và đầu tư USD lãi suất 4,5% tạo carry danh nghĩa 4%/năm, trước khi tính biến động tỷ giá.',
      tags: ['carry', 'forex', 'roll yield'], related: ['yield_curve', 'duration', 'liquidity'],
      metrics: [
        { label: 'USD/JPY carry', value: '≈ 4,0%/năm', hint: 'Chênh lệch lãi suất' },
        { label: 'AUD/JPY carry', value: '≈ 3,2%/năm', hint: 'Minh hoạ' },
        { label: 'Biến động tỷ giá', value: '8–12%/năm', hint: 'Có thể xoá carry' },
        { label: 'Rủi ro chính', value: 'Đảo chiều đột ngột', hint: 'Risk-off' }
      ],
      visual: {
        kind: 'bar', title: 'Carry danh nghĩa theo cặp tiền', unit: '%/năm',
        note: 'Carry trước phòng hộ và trước biến động tỷ giá; không phải lợi nhuận chắc chắn.',
        labels: ['USD/JPY', 'AUD/JPY', 'EM bond', 'Gold lease'],
        series: [{ name: 'Carry', color: '#ff9f43', values: [4.0, 3.2, 2.5, 0.4] }]
      }
    },
    {
      id: 'max_drawdown', category: 'analysis', level: 'Cơ bản', title: 'Maximum Drawdown & Calmar',
      subtitle: 'Cú giảm sâu nhất từ đỉnh đến đáy.',
      formula: 'MDD = max(1 − V_t / peak V); Calmar = CAGR / |MDD|',
      summary: 'Maximum drawdown đo mức lỗ tệ nhất từ đỉnh vốn đến đáy tiếp theo. Calmar so sánh lợi nhuận năm với mức drawdown đó.',
      detail: 'Hai chiến lược có cùng lợi suất có thể có trải nghiệm rất khác nếu drawdown khác nhau. MDD quan trọng vì nó phản ánh rủi ro tâm lý và khả năng duy trì chiến lược: drawdown 50% cần lãi 100% để hòa vốn. Calmar cao cho thấy lợi nhuận tốt so với mức lỗ sâu nhất. Cần xem cả thời gian phục hồi, không chỉ độ sâu. MDD quá khứ không đảm bảo giới hạn tương lai.',
      example: 'Danh mục từ 100 lên 120 rồi giảm còn 78 có MDD = 1 − 78/120 = 35%; cần tăng 28% từ đáy để quay lại đỉnh cũ.',
      tags: ['drawdown', 'Calmar', 'rủi ro'], related: ['sharpe', 'var', 'behavioral'],
      metrics: [
        { label: 'MDD', value: '−35%', hint: 'Từ đỉnh 120 về đáy 78' },
        { label: 'CAGR', value: '9,2%/năm', hint: 'Giả định 5 năm' },
        { label: 'Calmar', value: '0,26', hint: 'CAGR / |MDD|' },
        { label: 'Thời gian phục hồi', value: '18 tháng', hint: 'Ví dụ minh hoạ' }
      ],
      visual: {
        kind: 'line', title: 'Đường vốn và drawdown', unit: 'chỉ số vốn',
        note: 'Đỉnh 120, đáy 78: MDD 35%. Đường vốn minh hoạ, không phải hiệu suất thực.',
        labels: ['T0', 'T3', 'T6', 'T9', 'T12', 'T15', 'T18', 'T21', 'T24'],
        series: [{ name: 'Giá trị danh mục', color: '#5ac8fa', values: [100, 112, 120, 108, 95, 78, 88, 101, 110], fill: true }]
      }
    },
    {
      id: 'regression', category: 'analysis', level: 'Cơ bản', title: 'Hồi quy tuyến tính & R²',
      subtitle: 'Đo mức độ một biến giải thích biến khác.',
      formula: 'y = α + βx + ε; R² = 1 − SS_res / SS_tot',
      summary: 'Hồi quy ước lượng quan hệ trung bình giữa biến phụ thuộc và biến giải thích; R² cho biết phần biến động được mô hình giải thích.',
      detail: 'Trong tài chính, hồi quy được dùng để ước lượng beta, phân tích nhân tố và kiểm định tín hiệu. Beta là độ dốc của hồi quy lợi suất cổ phiếu theo lợi suất thị trường. R² cao không chứng minh quan hệ nhân quả; nó chỉ đo mức khớp trong mẫu. Cần kiểm tra đa cộng tuyến, tự tương quan, phương sai thay đổi và dữ liệu ngoài mẫu. Hồi quy quá nhiều biến dễ overfit.',
      example: 'Hồi quy lợi suất cổ phiếu theo VN-Index cho beta 1,15 và R² 0,62: thị trường giải thích khoảng 62% biến động của cổ phiếu trong mẫu.',
      tags: ['OLS', 'beta', 'R²'], related: ['correlation', 'factor', 'quant'],
      metrics: [
        { label: 'Beta ước lượng', value: '1,15', hint: 'Độ dốc hồi quy' },
        { label: 'R²', value: '0,62', hint: '62% biến động được giải thích' },
        { label: 't-stat của beta', value: '4,2', hint: 'Ý nghĩa thống kê' },
        { label: 'Số quan sát', value: '240 tháng', hint: '20 năm dữ liệu' }
      ],
      visual: {
        kind: 'line', title: 'Lợi suất thực tế vs mô hình', unit: '%/tháng',
        note: 'Mô hình bám xu hướng nhưng vẫn có sai số; R² 0,62 không phải dự báo hoàn hảo.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'],
        series: [
          { name: 'Thực tế', color: '#f3c56b', values: [2.1, -1.2, 3.4, 0.8, -2.2, 1.6, 2.8, -0.4, 3.1, 1.2] },
          { name: 'Mô hình', color: '#5ac8fa', values: [1.8, -0.9, 3.0, 0.5, -1.8, 1.4, 2.5, -0.2, 2.8, 1.0] }
        ]
      }
    }
  ];

  LIBRARY.push.apply(LIBRARY, LIBRARY_ADDITIONS);

  /* ------------------- FINANCE LIBRARY · CÔNG THỨC DOANH NGHIỆP ------------------- */
  /* Bổ sung v1.11: các công thức đọc báo cáo tài chính, định giá và chất lượng lợi nhuận
     của một doanh nghiệp cụ thể — không dùng số liệu toàn cảnh thị trường. */
  const LIBRARY_COMPANY_ADDITIONS = [
    {
      id: 'roic', category: 'formulas', level: 'Trung bình', title: 'ROIC — Lợi suất trên vốn đầu tư',
      subtitle: 'Mỗi đồng vốn đầu tư tạo ra bao nhiêu lợi nhuận hoạt động?',
      formula: 'ROIC = NOPAT / IC; NOPAT = EBIT × (1 − t); IC = Nợ + Vốn chủ − Tiền',
      summary: 'ROIC đo lợi nhuận hoạt động sau thuế trên tổng vốn dài hạn, giúp so sánh hiệu quả sử dụng vốn giữa các doanh nghiệp có cấu trúc vốn khác nhau.',
      detail: 'NOPAT loại bỏ ảnh hưởng của đòn bẩy và thuế, còn IC chỉ tính phần vốn thực sự phục vụ hoạt động kinh doanh. ROIC cao hơn WACC nghĩa là doanh nghiệp tạo giá trị; thấp hơn WACC là đang phá huỷ giá trị. Khi đọc ROIC cần kiểm tra vốn hoá phần mềm, thuê hoạt động, tài sản không sinh lời và các khoản mục một lần.',
      example: 'EBIT 1.500 tỷ, thuế 20%, vốn đầu tư 8.000 tỷ: NOPAT = 1.200 tỷ, ROIC = 15%. Nếu WACC 10,5% thì doanh nghiệp tạo thêm 4,5 điểm % giá trị mỗi năm.',
      tags: ['ROIC', 'NOPAT', 'hiệu quả vốn'], related: ['wacc', 'eva', 'dupont'],
      metrics: [
        { label: 'NOPAT', value: '1.200 tỷ', hint: 'EBIT 1.500 × 80%' },
        { label: 'Vốn đầu tư', value: '8.000 tỷ', hint: 'Nợ + vốn chủ − tiền' },
        { label: 'ROIC', value: '15,0%', hint: 'NOPAT / IC' },
        { label: 'WACC', value: '10,5%', hint: 'Chi phí vốn' },
        { label: 'Chênh lệch', value: '+4,5 điểm %', hint: 'ROIC − WACC' }
      ],
      visual: {
        kind: 'bar', title: 'ROIC so với WACC của các doanh nghiệp (minh hoạ)', unit: '%/năm',
        note: 'Cột cao hơn WACC 10,5% là tạo giá trị; thấp hơn là phá huỷ giá trị. Số liệu minh hoạ, không phải doanh nghiệp thật.',
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'ROIC', color: '#2ee6a6', values: [18.5, 15.0, 12.4, 10.5, 7.8] }]
      }
    },
    {
      id: 'eps_dilution', category: 'formulas', level: 'Cơ bản', title: 'EPS cơ bản & EPS pha loãng',
      subtitle: 'Lợi nhuận trên mỗi cổ phiếu sau khi tính quyền chọn, trái phiếu chuyển đổi.',
      formula: 'EPS = (LN ròng − Cổ tức ưu đãi) / Số CP bình quân; EPS pha loãng = LN ròng / Số CP sau pha loãng',
      summary: 'EPS cho biết mỗi cổ phiếu được hưởng bao nhiêu lợi nhuận. EPS pha loãng tính thêm cổ phiếu tiềm năng từ quyền chọn, trái phiếu chuyển đổi và cổ phiếu ưu đãi.',
      detail: 'EPS cơ bản dùng số cổ phiếu bình quân đang lưu hành; EPS pha loãng giả định các công cụ chuyển đổi đều được thực hiện. Khoảng cách giữa hai con số cho thấy mức độ pha loãng tiềm ẩn. Nhà đầu tư nên xem cả EPS điều chỉnh, số cổ phiếu đang tăng và chất lượng lợi nhuận vì EPS có thể bị làm đẹp bằng mua lại cổ phiếu hoặc khoản mục một lần.',
      example: 'Lợi nhuận 1.150 tỷ, 359 triệu cổ phiếu bình quân: EPS cơ bản khoảng 3.200 ₫. Nếu có thêm 18 triệu cổ phiếu tiềm năng, EPS pha loãng còn khoảng 3.050 ₫.',
      tags: ['EPS', 'pha loãng', 'cổ phiếu'], related: ['pe_peg', 'buyback_yield', 'earnings_quality'],
      metrics: [
        { label: 'EPS cơ bản', value: '3.200 ₫', hint: 'Lợi nhuận / CP bình quân' },
        { label: 'EPS pha loãng', value: '3.050 ₫', hint: 'Sau quyền chọn & chuyển đổi' },
        { label: 'Mức pha loãng', value: '4,7%', hint: 'Chênh lệch hai EPS' },
        { label: 'Tỷ lệ chia cổ tức', value: '35%', hint: 'Payout ratio' }
      ],
      visual: {
        kind: 'bar', title: 'EPS cơ bản và pha loãng theo năm (minh hoạ)', unit: 'đồng/cổ phiếu',
        note: 'Khoảng cách giữa hai cột là mức pha loãng tiềm ẩn từ công cụ chuyển đổi.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [
          { name: 'EPS cơ bản', color: '#f3c56b', values: [2800, 3000, 3200, 3400] },
          { name: 'EPS pha loãng', color: '#5ac8fa', values: [2800, 2920, 3050, 3180] }
        ]
      }
    },
    {
      id: 'pe_peg', category: 'formulas', level: 'Cơ bản', title: 'P/E & PEG',
      subtitle: 'Giá trả cho một đồng lợi nhuận có tương xứng tốc độ tăng trưởng?',
      formula: 'P/E = Giá / EPS; PEG = P/E / g (%)',
      summary: 'P/E so sánh giá cổ phiếu với lợi nhuận trên mỗi cổ phiếu. PEG chia P/E cho tốc độ tăng trưởng để kiểm tra xem mức định giá có quá đắt so với tăng trưởng hay không.',
      detail: 'P/E thấp có thể là cơ hội hoặc dấu hiệu lợi nhuận suy giảm; P/E cao chưa chắc đắt nếu doanh nghiệp tăng trưởng nhanh. PEG quanh 1 thường được xem là cân bằng, dưới 1 là rẻ tương đối, trên 2 cần tăng trưởng rất mạnh để biện minh. Cần dùng EPS chuẩn hoá, loại khoản mục một lần và so sánh với chính doanh nghiệp qua các năm cùng nhóm ngành.',
      example: 'Giá 42.500 ₫, EPS 3.200 ₫ cho P/E 13,3 lần. Nếu tăng trưởng lợi nhuận kỳ vọng 12%/năm thì PEG = 13,3 / 12 ≈ 1,1.',
      tags: ['P/E', 'PEG', 'định giá'], related: ['eps_dilution', 'pb_roe', 'fundamental'],
      metrics: [
        { label: 'Giá cổ phiếu', value: '42.500 ₫', hint: 'Giả định' },
        { label: 'EPS', value: '3.200 ₫', hint: '12 tháng gần nhất' },
        { label: 'P/E', value: '13,3x', hint: 'Giá / EPS' },
        { label: 'Tăng trưởng g', value: '12%/năm', hint: 'Kỳ vọng 3–5 năm' },
        { label: 'PEG', value: '1,11', hint: 'P/E / g' }
      ],
      visual: {
        kind: 'line', title: 'P/E hợp lý khi PEG = 1', unit: 'lần',
        note: 'Với PEG = 1, P/E hợp lý xấp xỉ tốc độ tăng trưởng (%/năm). Đây là quy tắc tham khảo, không phải định giá chính xác.',
        labels: ['g 6%', 'g 9%', 'g 12%', 'g 15%', 'g 18%'],
        series: [{ name: 'P/E hợp lý', color: '#f3c56b', values: [6, 9, 12, 15, 18], fill: true }]
      }
    },
    {
      id: 'pb_roe', category: 'formulas', level: 'Trung bình', title: 'P/B & P/B hợp lý theo ROE',
      subtitle: 'Giá trên vốn chủ có xứng với khả năng sinh lời?',
      formula: 'P/B = Giá / BVPS; P/B hợp lý = (ROE − g) / (r − g)',
      summary: 'P/B so sánh giá với giá trị sổ sách của vốn chủ. P/B hợp lý phụ thuộc vào ROE, tăng trưởng và chi phí vốn chủ: ROE càng cao, P/B có thể càng cao.',
      detail: 'P/B thấp không tự động là rẻ: doanh nghiệp có thể có tài sản kém chất lượng hoặc ROE thấp. Công thức P/B hợp lý cho thấy một doanh nghiệp ROE 18%, tăng trưởng 6% và chi phí vốn chủ 12% đáng giá khoảng 2 lần sổ sách. Với ngân hàng và bảo hiểm, P/B đặc biệt hữu ích vì bảng cân đối là trung tâm hoạt động.',
      example: 'ROE 18%, g 6%, r 12%: P/B hợp lý = (18% − 6%) / (12% − 6%) = 2,0 lần. Nếu giá chỉ 1,4 lần sổ sách, thị trường đang chiết khấu kỳ vọng tăng trưởng hoặc rủi ro tài sản.',
      tags: ['P/B', 'ROE', 'giá trị sổ sách'], related: ['dupont', 'pe_peg', 'roic'],
      metrics: [
        { label: 'P/B hiện tại', value: '2,1x', hint: 'Giá / BVPS' },
        { label: 'ROE', value: '18,0%', hint: 'Lợi nhuận / vốn chủ' },
        { label: 'Chi phí vốn chủ', value: '12,0%', hint: 'r' },
        { label: 'Tăng trưởng bền vững', value: '6,0%', hint: 'g' },
        { label: 'P/B hợp lý', value: '2,0x', hint: '(ROE − g)/(r − g)' }
      ],
      visual: {
        kind: 'line', title: 'P/B hợp lý theo ROE (r = 12%, g = 6%)', unit: 'lần',
        note: 'ROE tăng làm P/B hợp lý tăng phi tuyến; dưới chi phí vốn, P/B hợp lý có thể nhỏ hơn 1.',
        labels: ['ROE 6%', 'ROE 9%', 'ROE 12%', 'ROE 18%', 'ROE 24%'],
        series: [{ name: 'P/B hợp lý', color: '#b59cff', values: [0, 0.5, 1.0, 2.0, 3.0], fill: true }]
      }
    },
    {
      id: 'ev_ebitda', category: 'formulas', level: 'Trung bình', title: 'EV/EBITDA',
      subtitle: 'Định giá toàn bộ doanh nghiệp, không chỉ vốn chủ.',
      formula: 'EV = Vốn hoá + Nợ vay − Tiền; EV/EBITDA = EV / EBITDA',
      summary: 'EV/EBITDA so sánh giá trị toàn doanh nghiệp với lợi nhuận hoạt động trước lãi vay, thuế và khấu hao, giúp so sánh các doanh nghiệp khác cấu trúc vốn.',
      detail: 'EV bao gồm cả quyền lợi của cổ đông và chủ nợ, nên phù hợp khi so sánh doanh nghiệp có đòn bẩy khác nhau. EBITDA gần với dòng tiền hoạt động nhưng bỏ qua capex và vốn lưu động, vì vậy EV/EBITDA thấp có thể do doanh nghiệp cần đầu tư lớn. Cần so sánh cùng ngành, cùng chu kỳ và kiểm tra nợ, tiền mặt, lợi ích cổ đông thiểu số.',
      example: 'Vốn hoá 16.000 tỷ, nợ 3.500 tỷ, tiền 1.000 tỷ: EV = 18.500 tỷ. EBITDA 1.850 tỷ cho EV/EBITDA = 10,0 lần, thấp hơn trung vị ngành 11,2 lần.',
      tags: ['EV', 'EBITDA', 'định giá'], related: ['pe_peg', 'net_debt_ebitda', 'dcf_gordon'],
      metrics: [
        { label: 'Vốn hoá', value: '16.000 tỷ', hint: 'Giá × số cổ phiếu' },
        { label: 'Nợ vay', value: '3.500 tỷ', hint: 'Nợ ngắn + dài hạn' },
        { label: 'Tiền & tương đương', value: '1.000 tỷ', hint: 'Trừ khỏi EV' },
        { label: 'EV', value: '18.500 tỷ', hint: 'Vốn hoá + nợ − tiền' },
        { label: 'EV/EBITDA', value: '10,0x', hint: 'EBITDA 1.850 tỷ' }
      ],
      visual: {
        kind: 'bar', title: 'EV/EBITDA so sánh cùng ngành (minh hoạ)', unit: 'lần',
        note: 'Doanh nghiệp có EV/EBITDA thấp hơn trung vị có thể rẻ tương đối, nhưng cần kiểm tra capex và chất lượng EBITDA.',
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'EV/EBITDA', color: '#5ac8fa', values: [8.4, 9.2, 10.0, 11.5, 13.8] }]
      }
    },
    {
      id: 'fcf_yield', category: 'formulas', level: 'Cơ bản', title: 'FCF yield & Earnings yield',
      subtitle: 'Lợi suất thực từ dòng tiền so với giá đang trả.',
      formula: 'FCF yield = FCF / Vốn hoá; Earnings yield = EPS / Giá = 1 / (P/E)',
      summary: 'FCF yield đo dòng tiền tự do trên mỗi đồng vốn hoá; earnings yield là nghịch đảo của P/E. Hai chỉ số giúp so sánh cổ phiếu với lãi suất và trái phiếu.',
      detail: 'FCF yield khó bị bóp méo bởi kế toán hơn lợi nhuận, nhưng có thể biến động mạnh ở doanh nghiệp đầu tư lớn. Earnings yield tiện so sánh trực tiếp với lợi suất trái phiếu: nếu earnings yield thấp hơn lãi suất phi rủi ro, nhà đầu tư đang trả giá cao cho tăng trưởng hoặc chất lượng. Nên xem cả hai cùng ROIC và triển vọng tái đầu tư.',
      example: 'FCF 1.150 tỷ, vốn hoá 21.000 tỷ: FCF yield 5,5%. EPS 3.200 ₫ trên giá 42.500 ₫ cho earnings yield 7,5%, tương ứng P/E 13,3 lần.',
      tags: ['FCF yield', 'earnings yield', 'dòng tiền'], related: ['dcf_gordon', 'pe_peg', 'buyback_yield'],
      metrics: [
        { label: 'FCF', value: '1.150 tỷ', hint: 'CFO − Capex' },
        { label: 'Vốn hoá', value: '21.000 tỷ', hint: 'Giá thị trường' },
        { label: 'FCF yield', value: '5,5%', hint: 'FCF / vốn hoá' },
        { label: 'Earnings yield', value: '7,5%', hint: 'EPS / giá' },
        { label: 'Payout', value: '30%', hint: 'Cổ tức / lợi nhuận' }
      ],
      visual: {
        kind: 'line', title: 'FCF yield và earnings yield theo năm (minh hoạ)', unit: '%/năm',
        note: 'Hai lợi suất không cần trùng nhau; khoảng cách phản ánh capex, vốn lưu động và chất lượng lợi nhuận.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [
          { name: 'FCF yield', color: '#2ee6a6', values: [3.2, 4.1, 4.8, 5.5], fill: true },
          { name: 'Earnings yield', color: '#f3c56b', values: [5.0, 5.8, 6.3, 6.8] }
        ]
      }
    },
    {
      id: 'net_debt_ebitda', category: 'formulas', level: 'Cơ bản', title: 'Nợ ròng / EBITDA',
      subtitle: 'Doanh nghiệp cần bao nhiêu năm EBITDA để trả hết nợ ròng?',
      formula: 'Net debt / EBITDA = (Nợ vay − Tiền) / EBITDA',
      summary: 'Tỷ lệ nợ ròng trên EBITDA đo đòn bẩy tài chính và khả năng trả nợ từ lợi nhuận hoạt động. Tỷ lệ càng cao, doanh nghiệp càng nhạy với lãi suất và suy giảm kinh doanh.',
      detail: 'Mức an toàn khác nhau theo ngành: doanh nghiệp hạ tầng ổn định có thể chịu 3–4 lần, trong khi doanh nghiệp chu kỳ nên giữ dưới 2 lần. EBITDA không phải dòng tiền tự do vì còn capex, thuế và vốn lưu động. Cần xem lịch đáo hạn nợ, lãi suất thả nổi và covenant. Nợ ròng âm (nhiều tiền hơn nợ) thường là điểm mạnh nhưng cũng có thể cho thấy thiếu cơ hội đầu tư.',
      example: 'Nợ vay 3.400 tỷ, tiền 1.000 tỷ, EBITDA 1.850 tỷ: nợ ròng 2.400 tỷ, tỷ lệ 1,3 lần — mức thoải mái nếu dòng tiền ổn định.',
      tags: ['nợ ròng', 'EBITDA', 'đòn bẩy'], related: ['interest_coverage', 'ev_ebitda', 'credit_risk'],
      metrics: [
        { label: 'Nợ vay', value: '3.400 tỷ', hint: 'Tổng nợ chịu lãi' },
        { label: 'Tiền', value: '1.000 tỷ', hint: 'Tiền & tương đương' },
        { label: 'Nợ ròng', value: '2.400 tỷ', hint: 'Nợ − tiền' },
        { label: 'EBITDA', value: '1.850 tỷ', hint: '12 tháng gần nhất' },
        { label: 'Nợ ròng/EBITDA', value: '1,3x', hint: 'Dưới 3x thường an toàn' }
      ],
      visual: {
        kind: 'bar', title: 'Nợ ròng/EBITDA của các doanh nghiệp (minh hoạ)', unit: 'lần',
        note: 'Mức trên 3 lần thường cần theo dõi covenant và lịch đáo hạn; ngưỡng an toàn phụ thuộc ngành.',
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'Nợ ròng/EBITDA', color: '#ff9f43', values: [0.8, 1.3, 2.1, 3.4, 4.8] }]
      }
    },
    {
      id: 'interest_coverage', category: 'formulas', level: 'Cơ bản', title: 'Hệ số thanh toán lãi vay',
      subtitle: 'Lợi nhuận hoạt động gấp bao nhiêu lần chi phí lãi?',
      formula: 'ICR = EBIT / Lãi vay; EBITDA/interest = EBITDA / Lãi vay',
      summary: 'Hệ số thanh toán lãi vay đo khả năng lấy lợi nhuận hoạt động để trả lãi. Hệ số càng thấp, rủi ro tài chính càng cao khi lãi suất tăng hoặc doanh thu giảm.',
      detail: 'ICR dưới 2 lần thường là vùng cảnh báo; dưới 1 lần nghĩa là EBIT không đủ trả lãi. EBITDA/interest rộng hơn vì cộng lại khấu hao, nhưng vẫn bỏ qua capex. Cần xem xu hướng nhiều năm, lãi suất cố định hay thả nổi và mức độ biến động của EBIT. Doanh nghiệp chu kỳ nên duy trì hệ số cao hơn doanh nghiệp phòng thủ.',
      example: 'EBIT 1.500 tỷ, lãi vay 180 tỷ: ICR = 8,3 lần. Nếu lãi vay tăng lên 750 tỷ, ICR chỉ còn 2 lần và rủi ro tài chính tăng mạnh.',
      tags: ['lãi vay', 'ICR', 'rủi ro tài chính'], related: ['net_debt_ebitda', 'credit_risk', 'wacc'],
      metrics: [
        { label: 'EBIT', value: '1.500 tỷ', hint: 'Lợi nhuận hoạt động' },
        { label: 'Lãi vay', value: '180 tỷ', hint: 'Chi phí tài chính' },
        { label: 'ICR', value: '8,3x', hint: 'EBIT / lãi vay' },
        { label: 'EBITDA/interest', value: '11,9x', hint: 'Rộng hơn nhờ khấu hao' },
        { label: 'Ngưỡng cảnh báo', value: '< 2,0x', hint: 'Tùy ngành' }
      ],
      visual: {
        kind: 'bar', title: 'Hệ số thanh toán lãi vay (minh hoạ)', unit: 'lần',
        note: 'Cột dưới 2 lần là vùng cần theo dõi; dưới 1 lần EBIT không đủ trả lãi.',
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'ICR', color: '#f3c56b', values: [14.2, 9.5, 8.3, 4.1, 1.6] }]
      }
    },
    {
      id: 'current_quick_ratio', category: 'formulas', level: 'Cơ bản', title: 'Current ratio & Quick ratio',
      subtitle: 'Tài sản ngắn hạn có đủ trả nợ ngắn hạn?',
      formula: 'Current = Tài sản ngắn hạn / Nợ ngắn hạn; Quick = (TSNH − Tồn kho) / Nợ ngắn hạn',
      summary: 'Hệ số thanh khoản đo khả năng trả nợ ngắn hạn. Quick ratio loại tồn kho vì hàng hoá có thể khó bán nhanh.',
      detail: 'Current ratio quanh 1,5–2 thường được xem là cân bằng, nhưng ngành bán lẻ có thể hoạt động với tỷ lệ thấp hơn nhờ vòng quay hàng nhanh. Quick ratio dưới 1 cho thấy doanh nghiệp phụ thuộc vào tồn kho hoặc dòng tiền hoạt động để trả nợ ngắn hạn. Cần xem chất lượng khoản phải thu, hạn mức tín dụng và tính thời vụ. Tỷ lệ quá cao có thể là dấu hiệu vốn bị ứ đọng.',
      example: 'Tài sản ngắn hạn 6.200 tỷ, tồn kho 1.800 tỷ, nợ ngắn hạn 3.100 tỷ: current ratio 2,0 lần; quick ratio 1,42 lần.',
      tags: ['thanh khoản', 'current ratio', 'quick ratio'], related: ['ccc', 'credit_risk', 'liquidity'],
      metrics: [
        { label: 'Tài sản ngắn hạn', value: '6.200 tỷ', hint: 'Tiền, phải thu, tồn kho' },
        { label: 'Tồn kho', value: '1.800 tỷ', hint: 'Loại khỏi quick ratio' },
        { label: 'Nợ ngắn hạn', value: '3.100 tỷ', hint: 'Đến hạn trong 12 tháng' },
        { label: 'Current ratio', value: '2,0x', hint: '6.200 / 3.100' },
        { label: 'Quick ratio', value: '1,42x', hint: '(6.200 − 1.800)/3.100' }
      ],
      visual: {
        kind: 'bar', title: 'Current và quick ratio của các doanh nghiệp (minh hoạ)', unit: 'lần',
        note: 'Quick ratio dưới 1 nghĩa là tài sản nhanh không đủ trả nợ ngắn hạn nếu tồn kho không bán được.',
        labels: ['A', 'B', 'C', 'D'],
        series: [
          { name: 'Current ratio', color: '#5ac8fa', values: [1.8, 2.0, 1.2, 2.6] },
          { name: 'Quick ratio', color: '#2ee6a6', values: [1.1, 1.4, 0.7, 1.9] }
        ]
      }
    },
    {
      id: 'ccc', category: 'formulas', level: 'Trung bình', title: 'Chu kỳ chuyển đổi tiền mặt (CCC)',
      subtitle: 'Doanh nghiệp giữ tiền trong hàng hoá và phải thu bao lâu?',
      formula: 'CCC = DIO + DSO − DPO; DIO = 365 / Vòng quay tồn kho',
      summary: 'CCC đo số ngày tiền bị kẹt từ lúc mua hàng đến lúc thu tiền khách. CCC ngắn giúp giảm nhu cầu vốn lưu động và rủi ro tài chính.',
      detail: 'DIO là số ngày tồn kho, DSO là số ngày phải thu, DPO là số ngày trả nhà cung cấp. Doanh nghiệp có thể rút ngắn CCC bằng bán hàng nhanh hơn, thu tiền sớm hơn hoặc kéo dài thời gian trả nhà cung cấp — nhưng kéo dài DPO quá mức có thể làm mất uy tín. CCC âm là lợi thế lớn, thường thấy ở bán lẻ và doanh nghiệp thu tiền trước.',
      example: 'DIO 62 ngày, DSO 48 ngày, DPO 55 ngày: CCC = 62 + 48 − 55 = 55 ngày. Giảm DSO 10 ngày sẽ giải phóng một phần vốn lưu động đáng kể.',
      tags: ['CCC', 'vốn lưu động', 'DIO', 'DSO'], related: ['current_quick_ratio', 'fcf_yield', 'dupont'],
      metrics: [
        { label: 'DIO', value: '62 ngày', hint: 'Số ngày tồn kho' },
        { label: 'DSO', value: '48 ngày', hint: 'Số ngày phải thu' },
        { label: 'DPO', value: '55 ngày', hint: 'Số ngày phải trả' },
        { label: 'CCC', value: '55 ngày', hint: 'DIO + DSO − DPO' },
        { label: 'Vốn lưu động', value: '1.240 tỷ', hint: 'Minh hoạ' }
      ],
      visual: {
        kind: 'bar', title: 'Các thành phần của chu kỳ tiền mặt', unit: 'ngày',
        note: 'DPO làm giảm CCC; DIO và DSO làm tăng CCC. Số ngày thấp hơn thường tốt hơn, nhưng phải giữ quan hệ nhà cung cấp.',
        labels: ['DIO', 'DSO', 'DPO', 'CCC'],
        series: [{ name: 'Số ngày', color: '#ff9f43', values: [62, 48, 55, 55] }]
      }
    },
    {
      id: 'altman_z', category: 'formulas', level: 'Trung bình', title: 'Altman Z-Score',
      subtitle: 'Chỉ số cảnh báo nguy cơ kiệt quệ tài chính.',
      formula: 'Z = 1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5',
      summary: 'Z-Score kết hợp vốn lưu động, lợi nhuận giữ lại, EBIT, giá trị vốn chủ và doanh thu để ước lượng khoảng cách tới vỡ nợ.',
      detail: 'Công thức gốc dành cho doanh nghiệp sản xuất niêm yết. Z trên 2,99 thường được xem là vùng an toàn, 1,81–2,99 là vùng xám, dưới 1,81 là nguy cơ cao. Z-Score là công cụ sàng lọc nhanh, không thay thế phân tích dòng tiền và lịch đáo hạn nợ. Cần điều chỉnh cho ngành đặc thù và so sánh với chính doanh nghiệp qua thời gian.',
      example: 'Với X1 0,20; X2 0,25; X3 0,18; X4 1,6; X5 1,1: Z ≈ 3,24 — vùng an toàn theo mô hình gốc, nhưng vẫn cần kiểm tra chất lượng tài sản.',
      tags: ['Altman', 'Z-Score', 'kiệt quệ'], related: ['credit_risk', 'interest_coverage', 'net_debt_ebitda'],
      metrics: [
        { label: 'X1', value: '0,20', hint: 'Vốn lưu động / tài sản' },
        { label: 'X2', value: '0,25', hint: 'Lợi nhuận giữ lại / tài sản' },
        { label: 'X3', value: '0,18', hint: 'EBIT / tài sản' },
        { label: 'X4', value: '1,6', hint: 'Vốn chủ / nợ' },
        { label: 'X5', value: '1,1', hint: 'Doanh thu / tài sản' },
        { label: 'Z-Score', value: '3,24', hint: 'Trên 2,99: an toàn' }
      ],
      visual: {
        kind: 'bar', title: 'Z-Score của các doanh nghiệp (minh hoạ)', unit: 'điểm',
        note: 'Trên 2,99: an toàn; 1,81–2,99: vùng xám; dưới 1,81: nguy cơ cao. Ngưỡng gốc dành cho doanh nghiệp sản xuất.',
        labels: ['A', 'B', 'C', 'D'],
        series: [{ name: 'Z-Score', color: '#b59cff', values: [4.1, 3.2, 2.4, 1.3] }]
      }
    },
    {
      id: 'sgr', category: 'formulas', level: 'Trung bình', title: 'Tăng trưởng bền vững (SGR)',
      subtitle: 'Doanh nghiệp có thể tăng trưởng bao nhanh mà không cần thêm vốn?',
      formula: 'SGR = ROE × (1 − Tỷ lệ chia cổ tức)',
      summary: 'SGR là tốc độ tăng trưởng tối đa doanh nghiệp duy trì được bằng lợi nhuận giữ lại, giữ nguyên cấu trúc vốn và tỷ lệ chia cổ tức.',
      detail: 'Nếu doanh thu tăng nhanh hơn SGR trong thời gian dài, doanh nghiệp có thể phải vay thêm hoặc phát hành cổ phiếu. Ngược lại, tăng trưởng thấp hơn SGR tạo dư địa tăng cổ tức hoặc mua lại cổ phiếu. SGR cao không luôn tốt nếu đạt được bằng đòn bẩy hoặc ROE bị thổi phồng. Cần so sánh với tăng trưởng ngành và nhu cầu tái đầu tư thực tế.',
      example: 'ROE 18%, chia cổ tức 35%: SGR = 18% × 65% = 11,7%/năm. Nếu doanh thu tăng 13,5%, doanh nghiệp có thể cần thêm vốn bên ngoài.',
      tags: ['SGR', 'tăng trưởng', 'cổ tức'], related: ['dupont', 'buyback_yield', 'roic'],
      metrics: [
        { label: 'ROE', value: '18,0%', hint: 'Lợi nhuận / vốn chủ' },
        { label: 'Tỷ lệ chia cổ tức', value: '35%', hint: 'Payout ratio' },
        { label: 'Tỷ lệ giữ lại', value: '65%', hint: '1 − payout' },
        { label: 'SGR', value: '11,7%', hint: 'ROE × tỷ lệ giữ lại' },
        { label: 'Tăng trưởng doanh thu', value: '13,5%', hint: 'Cao hơn SGR' }
      ],
      visual: {
        kind: 'line', title: 'Tăng trưởng doanh thu so với SGR (minh hoạ)', unit: '%/năm',
        note: 'Khi tăng trưởng vượt SGR kéo dài, doanh nghiệp thường phải tăng nợ hoặc phát hành thêm cổ phiếu.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [
          { name: 'Tăng trưởng doanh thu', color: '#f3c56b', values: [9.8, 12.1, 13.5, 11.2] },
          { name: 'SGR', color: '#2ee6a6', values: [10.4, 10.9, 11.7, 11.7], fill: true }
        ]
      }
    },
    {
      id: 'graham_number', category: 'formulas', level: 'Cơ bản', title: 'Graham Number',
      subtitle: 'Giá trị hợp lý tham khảo từ EPS và giá trị sổ sách.',
      formula: 'Graham Number = √(22,5 × EPS × BVPS)',
      summary: 'Graham Number kết hợp EPS và BVPS để tạo ngưỡng giá tham khảo, dựa trên giả định P/E tối đa 15 và P/B tối đa 1,5.',
      detail: 'Công thức của Benjamin Graham chỉ là bộ lọc sơ khởi: nó bỏ qua tăng trưởng, chất lượng lợi nhuận, nợ và lợi thế cạnh tranh. Vì vậy không nên dùng riêng để mua bán. Nó hữu ích khi sàng lọc doanh nghiệp có lợi nhuận và giá trị sổ sách ổn định, đặc biệt trong nhóm phòng thủ. Cần loại EPS một lần và kiểm tra BVPS có tài sản vô hình kém chất lượng.',
      example: 'EPS 3.200 ₫, BVPS 24.500 ₫: Graham Number = √(22,5 × 3.200 × 24.500) ≈ 42.000 ₫. Giá 42.500 ₫ đang gần ngưỡng này.',
      tags: ['Graham', 'giá trị', 'EPS', 'BVPS'], related: ['pe_peg', 'pb_roe', 'fundamental'],
      metrics: [
        { label: 'EPS', value: '3.200 ₫', hint: 'Lợi nhuận/CP' },
        { label: 'BVPS', value: '24.500 ₫', hint: 'Vốn chủ/CP' },
        { label: 'Graham Number', value: '42.000 ₫', hint: '√(22,5 × EPS × BVPS)' },
        { label: 'Giá hiện tại', value: '42.500 ₫', hint: 'Giả định' },
        { label: 'Chênh lệch', value: '−1,2%', hint: 'Giá so với Graham' }
      ],
      visual: {
        kind: 'bar', title: 'Giá thị trường so với Graham Number (minh hoạ)', unit: 'nghìn đồng',
        note: 'Cột giá cao hơn Graham Number không có nghĩa là bán ngay; cần xét tăng trưởng và chất lượng doanh nghiệp.',
        labels: ['A', 'B', 'C', 'D'],
        series: [
          { name: 'Giá', color: '#f3c56b', values: [42.5, 28.0, 51.0, 19.5] },
          { name: 'Graham', color: '#5ac8fa', values: [42.0, 34.0, 40.0, 24.0] }
        ]
      }
    },
    {
      id: 'eva', category: 'formulas', level: 'Nâng cao', title: 'EVA — Giá trị kinh tế tăng thêm',
      subtitle: 'Lợi nhuận sau khi trừ chi phí vốn có còn dương?',
      formula: 'EVA = NOPAT − WACC × IC; EVA spread = ROIC − WACC',
      summary: 'EVA đo lợi nhuận kinh tế sau khi trừ chi phí của toàn bộ vốn đầu tư. EVA dương nghĩa là doanh nghiệp tạo giá trị cho cổ đông sau khi tính cả chi phí cơ hội.',
      detail: 'Lợi nhuận kế toán chỉ trừ lãi vay, không trừ chi phí vốn chủ. EVA khắc phục bằng cách tính chi phí vốn trên toàn bộ IC. Doanh nghiệp có thể báo lãi nhưng EVA âm nếu ROIC thấp hơn WACC. EVA hữu ích để đánh giá tăng trưởng có tạo giá trị hay chỉ mở rộng quy mô. Cần điều chỉnh vốn hoá, thuê hoạt động và các khoản đầu tư chưa sinh lời.',
      example: 'NOPAT 1.200 tỷ, WACC 10,5%, IC 8.000 tỷ: chi phí vốn 840 tỷ, EVA = 360 tỷ. ROIC 15% cao hơn WACC 4,5 điểm % đã tạo ra mức EVA này.',
      tags: ['EVA', 'chi phí vốn', 'ROIC'], related: ['roic', 'wacc', 'mm'],
      metrics: [
        { label: 'NOPAT', value: '1.200 tỷ', hint: 'Lợi nhuận hoạt động sau thuế' },
        { label: 'WACC', value: '10,5%', hint: 'Chi phí vốn' },
        { label: 'Vốn đầu tư', value: '8.000 tỷ', hint: 'IC' },
        { label: 'Chi phí vốn', value: '840 tỷ', hint: 'WACC × IC' },
        { label: 'EVA', value: '360 tỷ', hint: 'NOPAT − chi phí vốn' }
      ],
      visual: {
        kind: 'bar', title: 'EVA theo năm (minh hoạ)', unit: 'tỷ đồng',
        note: 'EVA dương cho thấy doanh nghiệp tạo giá trị sau khi trừ chi phí vốn, không chỉ có lợi nhuận kế toán.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [{ name: 'EVA', color: '#2ee6a6', values: [180, 240, 300, 360] }]
      }
    },
    {
      id: 'operating_leverage', category: 'formulas', level: 'Trung bình', title: 'Đòn bẩy hoạt động (DOL)',
      subtitle: 'Doanh thu thay đổi 1% thì lợi nhuận hoạt động thay đổi bao nhiêu?',
      formula: 'DOL = %ΔEBIT / %ΔDoanh thu = Lợi nhuận gộp / EBIT',
      summary: 'DOL đo độ nhạy của lợi nhuận hoạt động với doanh thu. Chi phí cố định càng cao, DOL càng lớn và lợi nhuận càng biến động.',
      detail: 'Doanh nghiệp có nhiều chi phí cố định như nhà máy, phần mềm hay nhân sự chuyên môn thường có DOL cao: lợi nhuận tăng mạnh khi doanh thu vượt điểm hoà vốn nhưng giảm mạnh khi doanh thu suy giảm. DOL không phản ánh rủi ro tài chính từ nợ; cần kết hợp với đòn bẩy tài chính. DOL thay đổi theo mức doanh thu hiện tại, không cố định.',
      example: 'Lợi nhuận gộp 1.800 tỷ, EBIT 800 tỷ: DOL = 2,25. Doanh thu tăng 10% có thể làm EBIT tăng khoảng 22,5% nếu cấu trúc chi phí không đổi.',
      tags: ['DOL', 'chi phí cố định', 'EBIT'], related: ['break_even', 'dupont', 'fundamental'],
      metrics: [
        { label: 'Lợi nhuận gộp', value: '1.800 tỷ', hint: 'Doanh thu − giá vốn' },
        { label: 'EBIT', value: '800 tỷ', hint: 'Sau chi phí hoạt động' },
        { label: 'DOL', value: '2,25x', hint: 'Lợi nhuận gộp / EBIT' },
        { label: 'Chi phí cố định', value: '620 tỷ', hint: 'Minh hoạ' },
        { label: 'Doanh thu +10%', value: 'EBIT +22,5%', hint: 'Theo DOL hiện tại' }
      ],
      visual: {
        kind: 'line', title: 'Doanh thu và EBIT thay đổi cùng chiều', unit: '% thay đổi',
        note: 'Với DOL 2,25, mỗi 1% thay đổi doanh thu khuếch đại thành 2,25% thay đổi EBIT quanh mức hiện tại.',
        labels: ['−10%', '−5%', '0%', '+5%', '+10%'],
        series: [
          { name: 'Doanh thu', color: '#5ac8fa', values: [-10, -5, 0, 5, 10] },
          { name: 'EBIT', color: '#f3c56b', values: [-22.5, -11.25, 0, 11.25, 22.5] }
        ]
      }
    },
    {
      id: 'break_even', category: 'formulas', level: 'Cơ bản', title: 'Điểm hoà vốn & biên an toàn',
      subtitle: 'Cần bán bao nhiêu sản phẩm để không lỗ?',
      formula: 'Q* = Định phí / (Giá bán − Biến phí đơn vị); Biên an toàn = (Doanh thu thực − Doanh thu hoà vốn) / Doanh thu thực',
      summary: 'Điểm hoà vốn là mức sản lượng hoặc doanh thu mà lợi nhuận bằng 0. Biên an toàn cho biết doanh thu có thể giảm bao nhiêu trước khi lỗ.',
      detail: 'Công thức giả định giá bán và biến phí đơn vị không đổi trong phạm vi phù hợp. Định phí càng cao, điểm hoà vốn càng xa và DOL càng lớn. Biên an toàn thấp cho thấy doanh nghiệp ít dư địa chịu suy giảm. Cần phân tích theo từng sản phẩm hoặc nhóm sản phẩm vì cơ cấu bán hàng thay đổi làm biên góp bình quân thay đổi.',
      example: 'Định phí 480 triệu, giá bán 120 nghìn, biến phí 72 nghìn: biên góp 48 nghìn/sản phẩm, Q* = 10.000 sản phẩm. Doanh thu hoà vốn 1,2 tỷ.',
      tags: ['hoà vốn', 'biên an toàn', 'định phí'], related: ['operating_leverage', 'npv', 'fundamental'],
      metrics: [
        { label: 'Giá bán', value: '120.000 ₫', hint: 'Mỗi sản phẩm' },
        { label: 'Biến phí', value: '72.000 ₫', hint: 'Mỗi sản phẩm' },
        { label: 'Biên góp', value: '48.000 ₫', hint: 'Giá − biến phí' },
        { label: 'Định phí', value: '480 triệu', hint: 'Mỗi tháng' },
        { label: 'Sản lượng hoà vốn', value: '10.000 sp', hint: '480tr / 48k' }
      ],
      visual: {
        kind: 'line', title: 'Doanh thu và tổng chi phí theo sản lượng', unit: 'triệu đồng',
        note: 'Hai đường giao nhau tại 10.000 sản phẩm — điểm hoà vốn. Vượt mức này, mỗi sản phẩm bán thêm đóng góp 48 nghìn vào lợi nhuận.',
        labels: ['0', '4k', '8k', '10k', '12k', '16k'],
        series: [
          { name: 'Doanh thu', color: '#2ee6a6', values: [0, 480, 960, 1200, 1440, 1920] },
          { name: 'Tổng chi phí', color: '#ff5d73', values: [480, 768, 1056, 1200, 1344, 1632] }
        ]
      }
    },
    {
      id: 'buyback_yield', category: 'formulas', level: 'Trung bình', title: 'Buyback yield & pha loãng ròng',
      subtitle: 'Mua lại cổ phiếu hỗ trợ EPS đến mức nào?',
      formula: 'Buyback yield = Giá trị cổ phiếu mua lại / Vốn hoá; Pha loãng ròng = CP phát hành mới − CP mua lại',
      summary: 'Buyback yield đo tỷ lệ vốn hoá được dùng để mua lại cổ phiếu. Kết hợp với phát hành mới, nó cho biết số cổ phiếu đang tăng hay giảm.',
      detail: 'Mua lại cổ phiếu làm giảm số cổ phiếu, có thể tăng EPS ngay cả khi lợi nhuận không đổi. Tuy nhiên mua lại bằng nợ hoặc ở mức giá cao có thể phá huỷ giá trị. Cần xem nguồn tiền, giá mua lại so với giá trị nội tại và phát hành cổ phiếu cho nhân viên. Buyback yield cao bền vững là tín hiệu tích cực nếu doanh nghiệp vẫn đủ vốn đầu tư.',
      example: 'Mua lại 800 tỷ, vốn hoá 21.000 tỷ: buyback yield 3,8%. Nếu phát hành mới tương đương 0,9% cổ phiếu, số cổ phiếu ròng giảm khoảng 2,9%.',
      tags: ['buyback', 'pha loãng', 'EPS'], related: ['eps_dilution', 'fcf_yield', 'sgr'],
      metrics: [
        { label: 'Giá trị mua lại', value: '800 tỷ', hint: 'Trong 12 tháng' },
        { label: 'Vốn hoá', value: '21.000 tỷ', hint: 'Giả định' },
        { label: 'Buyback yield', value: '3,8%', hint: '800 / 21.000' },
        { label: 'Phát hành mới', value: '+0,9%', hint: 'Cổ phiếu pha loãng' },
        { label: 'Giảm ròng', value: '−2,9%', hint: 'Số cổ phiếu giảm' }
      ],
      visual: {
        kind: 'bar', title: 'Thay đổi số cổ phiếu đang lưu hành (minh hoạ)', unit: '% so với năm trước',
        note: 'Cột âm là số cổ phiếu giảm nhờ mua lại; cột dương là pha loãng từ phát hành mới.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [{ name: 'Thay đổi cổ phiếu', color: '#f3c56b', values: [0.5, -1.2, -2.4, -3.1] }]
      }
    },
    {
      id: 'piotroski', category: 'analysis', level: 'Trung bình', title: 'Piotroski F-Score',
      subtitle: 'Chín tiêu chí sàng lọc sức khoẻ tài chính doanh nghiệp.',
      formula: 'F-Score = 9 tiêu chí: sinh lời (4) + đòn bẩy/thanh khoản (3) + hiệu quả (2)',
      summary: 'F-Score chấm điểm 0–9 dựa trên báo cáo tài chính: lợi nhuận, dòng tiền, thay đổi ROA, đòn bẩy, thanh khoản, phát hành cổ phiếu, biên lợi nhuận và vòng quay tài sản.',
      detail: 'Điểm cao cho thấy nền tảng tài chính đang cải thiện; điểm thấp cảnh báo suy yếu. F-Score ban đầu được thiết kế cho cổ phiếu giá trị và doanh nghiệp sản xuất, nên không phù hợp tuyệt đối với ngân hàng, bảo hiểm hay công ty công nghệ tăng trưởng. Nên dùng như bộ lọc kết hợp với định giá và phân tích định tính.',
      example: 'Doanh nghiệp đạt 4/4 tiêu chí sinh lời, 2/3 tiêu chí đòn bẩy và 1/2 tiêu chí hiệu quả có F-Score 7/9 — nền tảng tốt nhưng vẫn còn điểm cần cải thiện.',
      tags: ['F-Score', 'Piotroski', 'sức khoẻ tài chính'], related: ['earnings_quality', 'altman_z', 'fundamental'],
      metrics: [
        { label: 'F-Score', value: '7/9', hint: 'Càng cao càng tốt' },
        { label: 'Sinh lời', value: '4/4', hint: 'ROA, CFO, ΔROA, accrual' },
        { label: 'Đòn bẩy & thanh khoản', value: '2/3', hint: 'Nợ, thanh khoản, phát hành' },
        { label: 'Hiệu quả', value: '1/2', hint: 'Biên lợi nhuận, vòng quay' }
      ],
      visual: {
        kind: 'bar', title: 'Chín tiêu chí F-Score của một doanh nghiệp', unit: 'điểm (0/1)',
        note: 'Mỗi cột đạt 1 điểm nếu tiêu chí được thoả; tổng 7/9 trong ví dụ này. Số liệu minh hoạ.',
        labels: ['ROA+', 'CFO+', 'ΔROA+', 'Accrual', 'Nợ giảm', 'Thanh khoản', 'Không phát hành', 'Biên tăng', 'Vòng quay'],
        series: [{ name: 'Điểm', color: '#2ee6a6', values: [1, 1, 1, 1, 0, 1, 1, 1, 0] }]
      }
    },
    {
      id: 'reverse_dcf', category: 'analysis', level: 'Nâng cao', title: 'Reverse DCF — tăng trưởng ngầm định',
      subtitle: 'Giá hiện tại đang giả định doanh nghiệp tăng trưởng bao nhanh?',
      formula: 'P = FCF₁ / (WACC − g*) → g* = WACC − FCF₁ / P',
      summary: 'Reverse DCF đảo ngược mô hình định giá để tìm tốc độ tăng trưởng mà thị trường đang ngầm định trong giá. Nếu g* thấp hơn kỳ vọng hợp lý, cổ phiếu có thể hấp dẫn.',
      detail: 'Thay vì tự dự báo tăng trưởng rồi ra giá, reverse DCF hỏi thị trường đang kỳ vọng gì. Công thức đơn giản với một giai đoạn và FCF ổn định; thực tế cần mô hình nhiều giai đoạn. Kết quả rất nhạy với WACC và FCF chuẩn hoá. Dùng để kiểm tra luận điểm: nếu g* đòi hỏi doanh nghiệp tăng trưởng 20%/năm trong 10 năm, mức giá có thể đã phản ánh kỳ vọng rất cao.',
      example: 'Giá 42.500 ₫, FCF/CP 2.100 ₫, WACC 11%: g* = 11% − 2.100/42.500 ≈ 6,1%. Thị trường đang ngầm định tăng trưởng khoảng 6,1%/năm.',
      tags: ['reverse DCF', 'tăng trưởng ngầm định', 'định giá'], related: ['dcf_gordon', 'wacc', 'fcf_yield'],
      metrics: [
        { label: 'Giá cổ phiếu', value: '42.500 ₫', hint: 'Giả định' },
        { label: 'FCF/CP', value: '2.100 ₫', hint: 'Chuẩn hoá' },
        { label: 'WACC', value: '11,0%', hint: 'Chi phí vốn' },
        { label: 'g* ngầm định', value: '6,1%', hint: 'WACC − FCF/P' },
        { label: 'Kỳ vọng ngành', value: '8,5%', hint: 'Tham khảo' }
      ],
      visual: {
        kind: 'bar', title: 'Tăng trưởng ngầm định so với kỳ vọng (minh hoạ)', unit: '%/năm',
        note: 'Khi cột ngầm định thấp hơn kỳ vọng hợp lý, thị trường có thể đang định giá thận trọng; ngược lại là kỳ vọng cao.',
        labels: ['A', 'B', 'C', 'D'],
        series: [
          { name: 'Ngầm định', color: '#5ac8fa', values: [6.2, 5.1, 7.4, 4.0] },
          { name: 'Kỳ vọng', color: '#f3c56b', values: [8.0, 6.8, 9.1, 5.2] }
        ]
      }
    },
    {
      id: 'earnings_quality', category: 'analysis', level: 'Trung bình', title: 'Chất lượng lợi nhuận & accruals',
      subtitle: 'Lợi nhuận kế toán có được chống đỡ bằng dòng tiền thật?',
      formula: 'Accruals = (LN ròng − CFO) / Tổng tài sản; Cash conversion = CFO / LN ròng',
      summary: 'Chất lượng lợi nhuận cao khi lợi nhuận đi kèm dòng tiền hoạt động. Accruals lớn hoặc cash conversion thấp là dấu hiệu lợi nhuận có thể không bền.',
      detail: 'Lợi nhuận kế toán chịu ảnh hưởng của ghi nhận doanh thu, khấu hao, dự phòng và các khoản dồn tích. Nếu lợi nhuận tăng nhưng CFO không tăng tương ứng, doanh nghiệp có thể đang kéo dài kỳ thu tiền hoặc đẩy hàng tồn kho. Cash conversion trên 100% thường là tích cực; accruals âm cho thấy dòng tiền vượt lợi nhuận. Cần xem nhiều năm và so sánh cùng ngành.',
      example: 'Lợi nhuận 1.150 tỷ, CFO 1.380 tỷ: cash conversion 120%, accruals âm — lợi nhuận được hỗ trợ tốt bởi tiền mặt thực thu.',
      tags: ['accruals', 'CFO', 'chất lượng lợi nhuận'], related: ['fcf_yield', 'piotroski', 'fundamental'],
      metrics: [
        { label: 'Lợi nhuận ròng', value: '1.150 tỷ', hint: 'Kế toán' },
        { label: 'CFO', value: '1.380 tỷ', hint: 'Dòng tiền hoạt động' },
        { label: 'Cash conversion', value: '120%', hint: 'CFO / lợi nhuận' },
        { label: 'Accruals', value: '−2,1%', hint: 'Âm thường tốt hơn' },
        { label: 'Trung bình ngành', value: '+0,8%', hint: 'Tham khảo' }
      ],
      visual: {
        kind: 'bar', title: 'Lợi nhuận ròng và CFO theo năm (minh hoạ)', unit: 'tỷ đồng',
        note: 'CFO cao hơn lợi nhuận ròng cho thấy lợi nhuận được chống đỡ bởi dòng tiền thực, không chỉ bút toán kế toán.',
        labels: ['2022', '2023', '2024', '2025'],
        series: [
          { name: 'Lợi nhuận ròng', color: '#f3c56b', values: [850, 980, 1100, 1150] },
          { name: 'CFO', color: '#2ee6a6', values: [900, 1050, 1200, 1380] }
        ]
      }
    }
  ];
  LIBRARY.push.apply(LIBRARY, LIBRARY_COMPANY_ADDITIONS);

  /* Số liệu và biểu đồ minh hoạ cho các mục đã có. */
  const LIBRARY_ENRICHMENT = {
    capm: {
      metrics: [
        { label: 'Beta thị trường', value: '1,0', hint: 'Chuẩn so sánh' },
        { label: 'Lãi suất phi rủi ro', value: '4,0%/năm', hint: 'R_f giả định' },
        { label: 'Phần bù thị trường', value: '6,0%/năm', hint: 'MRP giả định' },
        { label: 'Lợi suất yêu cầu β=1,2', value: '11,2%/năm', hint: '4% + 1,2 × 6%' }
      ],
      visual: {
        kind: 'bar', title: 'Lợi suất yêu cầu theo beta', unit: '%/năm',
        note: 'Với R_f = 4% và MRP = 6%, lợi suất yêu cầu tăng tuyến tính theo beta.',
        labels: ['β 0,6', 'β 0,8', 'β 1,0', 'β 1,2', 'β 1,5'],
        series: [{ name: 'E(R)', color: '#f3c56b', values: [7.6, 8.8, 10.0, 11.2, 13.0] }]
      }
    },
    mm: {
      metrics: [
        { label: 'Thuế suất', value: '20%', hint: 'T_C' },
        { label: 'Nợ', value: '100 tỷ', hint: 'D' },
        { label: 'Lá chắn thuế', value: '20 tỷ', hint: 'T_C × D' },
        { label: 'Giá trị không nợ', value: '500 tỷ', hint: 'V_U' }
      ],
      visual: {
        kind: 'bar', title: 'Giá trị doanh nghiệp theo cấu trúc vốn', unit: 'tỷ đồng',
        note: 'Lý thuyết MM có thuế: nợ tạo lá chắn thuế, trước chi phí kiệt quệ tài chính.',
        labels: ['Không nợ', 'Có nợ (lý thuyết)'],
        series: [{ name: 'Giá trị', color: '#5ac8fa', values: [500, 520] }]
      }
    },
    emh: {
      metrics: [
        { label: 'Alpha sau phí TB', value: '≈ −0,3%/năm', hint: 'Quỹ chủ động' },
        { label: 'Tỷ lệ quỹ thắng chỉ số', value: '≈ 35%', hint: 'Horizon 10 năm' },
        { label: 'Chi phí giao dịch', value: '0,1–0,3%', hint: 'Mỗi lần mua bán' },
        { label: 'Dạng hiệu quả', value: 'Yếu → mạnh', hint: 'Mức độ thông tin' }
      ],
      visual: {
        kind: 'bar', title: 'Tỷ lệ quỹ chủ động thắng chỉ số theo thời gian', unit: '% quỹ',
        note: 'Số liệu minh hoạ: thời gian càng dài, tỷ lệ thắng chỉ số càng giảm.',
        labels: ['<1 năm', '3 năm', '5 năm', '10 năm'],
        series: [{ name: 'Tỷ lệ thắng', color: '#b59cff', values: [48, 41, 36, 30] }]
      }
    },
    mpt: {
      metrics: [
        { label: 'Tương quan A–B', value: '−0,20', hint: 'Giả định' },
        { label: 'Độ lệch chuẩn A', value: '22%/năm', hint: 'Rủi ro riêng' },
        { label: 'Độ lệch chuẩn B', value: '18%/năm', hint: 'Rủi ro riêng' },
        { label: 'Danh mục 50/50', value: '14,1%/năm', hint: 'Thấp hơn từng mã' }
      ],
      visual: {
        kind: 'bar', title: 'Độ lệch chuẩn theo tỷ trọng danh mục', unit: '%/năm',
        note: 'Tương quan âm giúp giảm mạnh rủi ro danh mục so với từng tài sản riêng lẻ.',
        labels: ['100% A', '75/25', '50/50', '25/75', '100% B'],
        series: [{ name: 'Độ lệch chuẩn', color: '#2ee6a6', values: [22, 18.5, 14.1, 15.6, 18] }]
      }
    },
    black_scholes: {
      metrics: [
        { label: 'Giá tài sản S', value: '100.000 ₫', hint: 'Giả định' },
        { label: 'Giá thực hiện K', value: '100.000 ₫', hint: 'At-the-money' },
        { label: 'Thời gian T', value: '0,25 năm', hint: '3 tháng' },
        { label: 'Biến động σ', value: '30%/năm', hint: 'Giả định' },
        { label: 'Giá quyền chọn', value: '≈ 4,6k ₫', hint: 'Minh hoạ' }
      ],
      visual: {
        kind: 'line', title: 'Giá quyền chọn tăng theo biến động', unit: 'nghìn đồng',
        note: 'Vega dương: biến động kỳ vọng càng cao, quyền chọn càng đắt.',
        labels: ['20%', '25%', '30%', '35%', '40%'],
        series: [{ name: 'Giá quyền chọn', color: '#5ac8fa', values: [3.2, 3.9, 4.6, 5.3, 6.0], fill: true }]
      }
    },
    put_call_parity: {
      metrics: [
        { label: 'C', value: '5,2k ₫', hint: 'Call' },
        { label: 'P', value: '4,2k ₫', hint: 'Put' },
        { label: 'PV(K)', value: '99,0k ₫', hint: 'K = 100k, r = 4%, T = 3 tháng' },
        { label: 'S', value: '100k ₫', hint: 'Giá cổ phiếu' }
      ],
      visual: {
        kind: 'bar', title: 'Hai vế của put-call parity', unit: 'nghìn đồng',
        note: 'C + PV(K) = P + S = 104,2k ₫. Chênh lệch sẽ tạo cơ hội arbitrage.',
        labels: ['C + PV(K)', 'P + S'],
        series: [{ name: 'Giá trị', color: '#f3c56b', values: [104.2, 104.2] }]
      }
    },
    npv: {
      metrics: [
        { label: 'Vốn đầu tư', value: '1.000 triệu', hint: 'Năm 0' },
        { label: 'PV dòng tiền', value: '1.137 triệu', hint: 'r = 10%' },
        { label: 'NPV', value: '+137 triệu', hint: 'Tạo giá trị' },
        { label: 'IRR', value: '15,2%', hint: 'NPV = 0' }
      ],
      visual: {
        kind: 'bar', title: 'Dòng tiền dự án theo năm', unit: 'triệu đồng',
        note: 'Dự án cần 1.000 triệu ban đầu và tạo 300 triệu mỗi năm trong 5 năm.',
        labels: ['Năm 0', 'Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', 'Năm 5'],
        series: [{ name: 'Dòng tiền', color: '#2ee6a6', values: [-1000, 300, 300, 300, 300, 300] }]
      }
    },
    irr: {
      metrics: [
        { label: 'Chi phí vốn', value: '10%', hint: 'Tỷ lệ chiết khấu' },
        { label: 'IRR', value: '15,2%', hint: 'NPV = 0' },
        { label: 'NPV tại 10%', value: '+137 triệu', hint: 'Chấp nhận' },
        { label: 'NPV tại 20%', value: '−103 triệu', hint: 'Từ chối' }
      ],
      visual: {
        kind: 'line', title: 'NPV giảm khi tỷ lệ chiết khấu tăng', unit: 'triệu đồng',
        note: 'IRR là giao điểm NPV = 0, khoảng 15,2%.',
        labels: ['0%', '5%', '10%', '15%', '20%', '25%'],
        series: [{ name: 'NPV', color: '#f3c56b', values: [500, 300, 137, 0, -103, -185] }]
      }
    },
    wacc: {
      metrics: [
        { label: 'Vốn chủ', value: '60%', hint: 'E/V' },
        { label: 'Nợ', value: '40%', hint: 'D/V' },
        { label: 'Chi phí vốn chủ', value: '14%', hint: 'R_e' },
        { label: 'Chi phí nợ sau thuế', value: '6,4%', hint: '8% × (1 − 20%)' },
        { label: 'WACC', value: '10,96%', hint: 'Chiết khấu FCFF' }
      ],
      visual: {
        kind: 'bar', title: 'Cơ cấu vốn và chi phí', unit: '%',
        note: 'WACC = 60% × 14% + 40% × 6,4% = 10,96%.',
        labels: ['Tỷ trọng vốn chủ', 'Tỷ trọng nợ', 'WACC'],
        series: [{ name: 'Giá trị', color: '#5ac8fa', values: [60, 40, 10.96] }]
      }
    },
    dcf_gordon: {
      metrics: [
        { label: 'FCF năm sau', value: '100 tỷ', hint: 'FCF_1' },
        { label: 'Chiết khấu r', value: '12%', hint: 'WACC' },
        { label: 'Tăng trưởng g', value: '3%', hint: 'Vĩnh viễn' },
        { label: 'Giá trị cuối kỳ', value: '1.111 tỷ', hint: 'FCF_1/(r−g)' },
        { label: 'PV giá trị cuối kỳ', value: '≈ 631 tỷ', hint: 'Chiết khấu 5 năm' }
      ],
      visual: {
        kind: 'bar', title: 'Giá trị doanh nghiệp đến từ đâu?', unit: 'tỷ đồng',
        note: 'Trong DCF, giá trị cuối kỳ thường chiếm phần lớn kết quả và rất nhạy với g.',
        labels: ['PV FCF 1–5', 'PV giá trị cuối kỳ'],
        series: [{ name: 'Giá trị', color: '#f3c56b', values: [360, 631] }]
      }
    },
    dupont: {
      metrics: [
        { label: 'Biên lợi nhuận ròng', value: '10%', hint: 'Lợi nhuận / doanh thu' },
        { label: 'Vòng quay tài sản', value: '1,8 lần', hint: 'Doanh thu / tài sản' },
        { label: 'Đòn bẩy tài chính', value: '1,5x', hint: 'Tài sản / vốn chủ' },
        { label: 'ROE', value: '27%', hint: '10% × 1,8 × 1,5' }
      ],
      visual: {
        kind: 'bar', title: 'ROE qua hai năm (minh hoạ)', unit: '%',
        note: 'ROE cao có thể đến từ biên lợi nhuận, vòng quay hoặc đòn bẩy — rủi ro khác nhau.',
        labels: ['Doanh nghiệp A', 'Doanh nghiệp B', 'Doanh nghiệp C'],
        series: [
          { name: 'Năm trước', color: '#5ac8fa', values: [16, 19, 23] },
          { name: 'Năm nay', color: '#f3c56b', values: [18, 22, 27] }
        ]
      }
    },
    kelly: {
      metrics: [
        { label: 'Xác suất thắng p', value: '55%', hint: 'Giả định' },
        { label: 'Tỷ lệ thắng/thua b', value: '1:1', hint: 'Even odds' },
        { label: 'Kelly đầy đủ', value: '10% vốn', hint: 'f*' },
        { label: 'Half-Kelly', value: '5% vốn', hint: 'Thực tế thường dùng' }
      ],
      visual: {
        kind: 'line', title: 'Tăng trưởng kỳ vọng theo tỷ lệ đặt cược', unit: '% mỗi lần đặt',
        note: 'Đặt quá lớn làm tăng trưởng âm dù lợi thế dương; đỉnh ở f* = 10%.',
        labels: ['0%', '5%', '10%', '15%', '20%', '25%'],
        series: [{ name: 'Tăng trưởng', color: '#2ee6a6', values: [0, 0.25, 0.5, 0.45, 0.2, -0.1], fill: true }]
      }
    },
    sharpe: {
      metrics: [
        { label: 'Quỹ A: lợi suất', value: '12%', hint: 'Vol 10%' },
        { label: 'Quỹ A: Sharpe', value: '0,80', hint: '(12−4)/10' },
        { label: 'Quỹ B: lợi suất', value: '12%', hint: 'Vol 18%' },
        { label: 'Quỹ B: Sharpe', value: '0,44', hint: '(12−4)/18' }
      ],
      visual: {
        kind: 'bar', title: 'Sharpe ratio so sánh', unit: 'Sharpe',
        note: 'Cùng lợi suất nhưng biến động thấp hơn cho Sharpe cao hơn.',
        labels: ['Quỹ A', 'Quỹ B', 'Quỹ C'],
        series: [{ name: 'Sharpe', color: '#f3c56b', values: [0.8, 0.44, 1.1] }]
      }
    },
    technical: {
      metrics: [
        { label: 'MA20', value: '54,2k ₫', hint: 'Trung bình 20 phiên' },
        { label: 'MA50', value: '52,8k ₫', hint: 'Trung bình 50 phiên' },
        { label: 'RSI14', value: '61', hint: 'Chưa quá mua' },
        { label: 'MACD histogram', value: '+0,42', hint: 'Động lượng dương' },
        { label: 'Volume / TB', value: '1,3x', hint: 'Xác nhận xu hướng' }
      ],
      visual: {
        kind: 'line', title: 'Giá và đường trung bình', unit: 'nghìn đồng',
        note: 'Giá trên MA20 và MA50 cùng volume tăng là tín hiệu xác nhận, không phải dự báo chắc chắn.',
        labels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'],
        series: [
          { name: 'Giá', color: '#f3c56b', values: [52, 53, 52.5, 54, 53.8, 55, 56, 55.4, 56.8, 57.2, 56.5, 58] },
          { name: 'MA10', color: '#5ac8fa', values: [52, 52.4, 52.6, 53, 53.2, 53.5, 54, 54.2, 54.8, 55.2, 55.5, 56] }
        ]
      }
    },
    fundamental: {
      metrics: [
        { label: 'P/E', value: '12,4x', hint: 'Giá / EPS' },
        { label: 'P/B', value: '1,8x', hint: 'Giá / giá trị sổ' },
        { label: 'ROE', value: '18%', hint: 'Hiệu quả vốn chủ' },
        { label: 'Biên ròng', value: '12%', hint: 'Lợi nhuận / doanh thu' },
        { label: 'FCF', value: '+1.200 tỷ', hint: 'Dòng tiền tự do' }
      ],
      visual: {
        kind: 'bar', title: 'P/E so với cùng ngành', unit: 'lần',
        note: 'P/E thấp hơn ngành chưa chắc là rẻ; cần kiểm tra chất lượng lợi nhuận và tăng trưởng.',
        labels: ['Doanh nghiệp', 'Peer TB', 'Ngành'],
        series: [{ name: 'P/E', color: '#2ee6a6', values: [12.4, 15.1, 16.8] }]
      }
    },
    factor: {
      metrics: [
        { label: 'Market (MRP)', value: '6,5%/năm', hint: 'Phần bù thị trường' },
        { label: 'Value (HML)', value: '3,8%/năm', hint: 'Dài hạn' },
        { label: 'Momentum', value: '4,5%/năm', hint: '12-1 tháng' },
        { label: 'Quality', value: '3,0%/năm', hint: 'Profitability' },
        { label: 'Size (SMB)', value: '2,1%/năm', hint: 'Small cap' }
      ],
      visual: {
        kind: 'bar', title: 'Phần bù nhân tố tham khảo', unit: '%/năm',
        note: 'Các nhân tố có thể kém hiệu quả nhiều năm; số liệu chỉ mang tính minh hoạ.',
        labels: ['Market', 'Value', 'Momentum', 'Quality', 'Size'],
        series: [{ name: 'Phần bù', color: '#b59cff', values: [6.5, 3.8, 4.5, 3.0, 2.1] }]
      }
    },
    var: {
      metrics: [
        { label: 'VaR 95% / 1 ngày', value: '2,0%', hint: 'Ngưỡng lỗ' },
        { label: 'VaR 99% / 1 ngày', value: '3,1%', hint: 'Ngưỡng lỗ' },
        { label: 'CVaR 95%', value: '3,2%', hint: 'Lỗ TB phần đuôi' },
        { label: 'CVaR 99%', value: '4,8%', hint: 'Lỗ TB phần đuôi' }
      ],
      visual: {
        kind: 'bar', title: 'VaR và CVaR theo mức tin cậy', unit: '% danh mục',
        note: 'CVaR luôn lớn hơn hoặc bằng VaR vì đo mức lỗ trung bình trong phần đuôi.',
        labels: ['VaR 95', 'CVaR 95', 'VaR 99', 'CVaR 99'],
        series: [{ name: 'Tổn thất', color: '#ff5d73', values: [2.0, 3.2, 3.1, 4.8] }]
      }
    },
    monte_carlo: {
      metrics: [
        { label: 'Số đường mô phỏng', value: '10.000', hint: 'Giảm sai số' },
        { label: 'Lợi suất kỳ vọng', value: '8%/năm', hint: 'Giả định' },
        { label: 'Độ lệch chuẩn', value: '20%/năm', hint: 'Giả định' },
        { label: 'P(lỗ sau 1 năm)', value: '≈ 34%', hint: 'Từ phân phối' },
        { label: 'Khoảng 5–95%', value: '−18% đến +41%', hint: '1 năm' }
      ],
      visual: {
        kind: 'line', title: 'Các phân vị giá trị danh mục', unit: 'chỉ số 100',
        note: 'Dải kết quả rộng cho thấy đầu tư ngắn hạn có nhiều bất định; không phải dự báo.',
        labels: ['0', '3 tháng', '6 tháng', '9 tháng', '12 tháng'],
        series: [
          { name: 'Phân vị 5%', color: '#ff5d73', values: [100, 94, 91, 89, 86] },
          { name: 'Trung vị', color: '#f3c56b', values: [100, 102, 106, 110, 114] },
          { name: 'Phân vị 95%', color: '#2ee6a6', values: [100, 110, 124, 142, 160] }
        ]
      }
    },
    correlation: {
      metrics: [
        { label: 'Ngân hàng – Công nghệ', value: '0,72', hint: 'Tương quan dương mạnh' },
        { label: 'Cổ phiếu – Trái phiếu', value: '−0,18', hint: 'Đa dạng hoá tốt' },
        { label: 'Cổ phiếu – Vàng', value: '0,05', hint: 'Gần như độc lập' },
        { label: 'σ danh mục 50/50', value: '14,1%', hint: 'Thấp hơn từng tài sản' }
      ],
      visual: {
        kind: 'bar', title: 'Hệ số tương quan giữa các cặp tài sản', unit: 'ρ',
        note: 'Tương quan thay đổi theo thời gian và thường tăng trong khủng hoảng.',
        labels: ['NH–CN', 'CP–TP', 'CP–Vàng', 'CP–Dầu'],
        series: [{ name: 'Tương quan', color: '#5ac8fa', values: [0.72, -0.18, 0.05, 0.41] }]
      }
    },
    beta: {
      metrics: [
        { label: 'Beta', value: '1,30', hint: 'Độ nhạy thị trường' },
        { label: 'R²', value: '0,68', hint: 'Mức giải thích' },
        { label: 'Rủi ro hệ thống', value: '24%/năm', hint: 'Không đa dạng hoá được' },
        { label: 'Rủi ro riêng lẻ', value: '18%/năm', hint: 'Có thể giảm' }
      ],
      visual: {
        kind: 'line', title: 'Lợi suất cổ phiếu theo lợi suất thị trường', unit: '%',
        note: 'Độ dốc 1,3: thị trường tăng/giảm 1% thì cổ phiếu kỳ vọng tăng/giảm khoảng 1,3%.',
        labels: ['−6', '−4', '−2', '0', '2', '4', '6'],
        series: [
          { name: 'Thị trường', color: '#5ac8fa', values: [-6, -4, -2, 0, 2, 4, 6] },
          { name: 'Cổ phiếu beta 1,3', color: '#f3c56b', values: [-8.4, -5.4, -2.4, 0.5, 3.1, 5.6, 8.2] }
        ]
      }
    },
    alpha: {
      metrics: [
        { label: 'Lợi suất quỹ', value: '15%/năm', hint: 'R_p' },
        { label: 'Beta quỹ', value: '1,10', hint: 'β_p' },
        { label: 'CAPM kỳ vọng', value: '12%/năm', hint: 'R_f + β × MRP' },
        { label: 'Alpha thô', value: '+3%/năm', hint: 'Trước phí' },
        { label: 'Alpha sau phí 1,5%', value: '+1,5%/năm', hint: 'Sau chi phí' }
      ],
      visual: {
        kind: 'bar', title: 'Phân rã lợi suất quỹ', unit: '%/năm',
        note: 'Alpha là phần vượt trên lợi suất đã điều chỉnh rủi ro; có thể do may mắn hoặc kỹ năng.',
        labels: ['Quỹ', 'CAPM', 'Alpha'],
        series: [{ name: 'Lợi suất', color: '#f3c56b', values: [15, 12, 3] }]
      }
    },
    duration: {
      metrics: [
        { label: 'Duration', value: '7,0 năm', hint: 'Độ nhạy lãi suất' },
        { label: 'Convexity', value: '0,8', hint: 'Độ cong' },
        { label: 'Lãi suất +1%', value: '−6,2% giá', hint: 'Xấp xỉ' },
        { label: 'Lãi suất −1%', value: '+7,8% giá', hint: 'Convexity hỗ trợ' }
      ],
      visual: {
        kind: 'line', title: 'Giá trái phiếu khi lãi suất thay đổi', unit: '% thay đổi giá',
        note: 'Duration 7 năm: lãi suất tăng 1% làm giá giảm khoảng 6,2%; giảm 1% làm giá tăng khoảng 7,8%.',
        labels: ['−2%', '−1%', '0%', '+1%', '+2%'],
        series: [{ name: 'Thay đổi giá', color: '#b59cff', values: [15.2, 7.8, 0, -6.2, -11.6] }]
      }
    },
    credit_risk: {
      metrics: [
        { label: 'PD', value: '2,0%', hint: 'Xác suất vỡ nợ' },
        { label: 'LGD', value: '50%', hint: 'Tỷ lệ tổn thất khi vỡ nợ' },
        { label: 'EAD', value: '100 triệu', hint: 'Dư nợ khi vỡ nợ' },
        { label: 'Tổn thất kỳ vọng', value: '1 triệu', hint: 'PD × LGD × EAD' },
        { label: 'Credit spread', value: '180 bps', hint: 'Bù rủi ro' }
      ],
      visual: {
        kind: 'bar', title: 'Các cấu phần tổn thất tín dụng', unit: '% dư nợ',
        note: 'EL = 2% × 50% × 100 triệu = 1 triệu đồng.',
        labels: ['PD', 'LGD', 'EL'],
        series: [{ name: 'Tỷ lệ', color: '#ff5d73', values: [2, 50, 1] }]
      }
    },
    liquidity: {
      metrics: [
        { label: 'Spread blue-chip', value: '0,05%', hint: 'Thanh khoản cao' },
        { label: 'Spread small-cap', value: '0,50%', hint: 'Thanh khoản thấp' },
        { label: 'Market impact', value: '0,30%', hint: 'Lệnh lớn' },
        { label: 'Số ngày thoát vị thế', value: '2,5 ngày', hint: '10% ADV' }
      ],
      visual: {
        kind: 'bar', title: 'Chi phí giao dịch theo thanh khoản', unit: '% giá trị lệnh',
        note: 'Thanh khoản kém làm tăng spread và market impact, đặc biệt khi bán gấp.',
        labels: ['Blue-chip', 'Mid-cap', 'Small-cap', 'Private'],
        series: [{ name: 'Chi phí', color: '#2ee6a6', values: [0.05, 0.2, 0.6, 2.5] }]
      }
    },
    behavioral: {
      metrics: [
        { label: 'Loss aversion λ', value: '≈ 2,25', hint: 'Lỗ đau hơn lãi' },
        { label: 'Disposition effect', value: '1,5x', hint: 'Bán lãi sớm hơn cắt lỗ' },
        { label: 'Tự tin quá mức', value: '65%', hint: 'Người tham gia khảo sát' },
        { label: 'Herding', value: '0,60', hint: 'Tương quan hành vi đám đông' }
      ],
      visual: {
        kind: 'bar', title: 'Cảm nhận lãi và lỗ cùng độ lớn', unit: 'nghìn đồng',
        note: 'Mất 100 nghìn được cảm nhận đau tương đương mất 225 nghìn theo loss aversion.',
        labels: ['Lãi 100k', 'Lỗ 100k'],
        series: [{ name: 'Cảm nhận', color: '#ff5d73', values: [100, -225] }]
      }
    },
    time_value: {
      metrics: [
        { label: 'Vốn ban đầu', value: '100 triệu', hint: 'PV' },
        { label: 'Lãi suất', value: '8%/năm', hint: 'r' },
        { label: 'Thời gian', value: '10 năm', hint: 'n' },
        { label: 'Giá trị tương lai', value: '215,9 triệu', hint: 'FV' },
        { label: 'Lãi kép', value: '115,9 triệu', hint: 'FV − PV' }
      ],
      visual: {
        kind: 'line', title: 'Sức mạnh của lãi kép', unit: 'triệu đồng',
        note: '100 triệu ở 8%/năm thành 215,9 triệu sau 10 năm nếu lãi nhập gốc, trước thuế và lạm phát.',
        labels: ['0', '2', '4', '6', '8', '10 năm'],
        series: [{ name: 'Giá trị', color: '#2ee6a6', values: [100, 116.6, 136.0, 158.7, 185.1, 215.9], fill: true }]
      }
    },
    yield_curve: {
      metrics: [
        { label: '3 tháng', value: '5,2%', hint: 'Lợi suất TPCP' },
        { label: '2 năm', value: '4,6%', hint: 'Lợi suất TPCP' },
        { label: '10 năm', value: '4,1%', hint: 'Lợi suất TPCP' },
        { label: '30 năm', value: '4,3%', hint: 'Lợi suất TPCP' },
        { label: '10Y − 2Y', value: '−0,5 điểm %', hint: 'Đảo ngược' }
      ],
      visual: {
        kind: 'line', title: 'Đường cong lợi suất bình thường và đảo ngược', unit: '%/năm',
        note: 'Đường cong đảo ngược khi lợi suất ngắn hạn cao hơn dài hạn, thường báo hiệu suy giảm tăng trưởng.',
        labels: ['3M', '1Y', '2Y', '5Y', '10Y', '30Y'],
        series: [
          { name: 'Bình thường', color: '#2ee6a6', values: [4.2, 4.4, 4.6, 4.8, 5.0, 5.2] },
          { name: 'Đảo ngược', color: '#ff5d73', values: [5.4, 5.1, 4.7, 4.3, 4.0, 4.1] }
        ]
      }
    }
  };

  LIBRARY.forEach(entry => {
    const extra = LIBRARY_ENRICHMENT[entry.id];
    if (extra) Object.assign(entry, extra);
  });

  /* ------------------------- THƯ VIỆN BỔ SUNG v1.13 ------------------------- */
  const LIBRARY_V13_ADDITIONS = [
    {
      id: 'black_litterman', category: 'theorems', level: 'Nâng cao', title: 'Black-Litterman — trộn thị trường với quan điểm riêng',
      subtitle: 'Làm sao đưa dự báo cá nhân vào danh mục mà không phá vỡ cân bằng?',
      formula: 'E(R) = Π + τΣPᵀ(PτΣPᵀ + Ω)⁻¹(Q − PΠ)',
      summary: 'Mô hình bắt đầu từ lợi suất cân bằng của thị trường, rồi điều chỉnh theo quan điểm của bạn với trọng số tuỳ độ tin cậy.',
      detail: 'Nếu tin hoàn toàn vào thị trường, danh mục tối ưu chính là danh mục thị trường. Black-Litterman cho phép nói thêm “tôi nghĩ VNM sẽ tốt hơn” và tự động giảm mức độ thay đổi nếu quan điểm đó không chắc chắn. Cách này tránh việc một dự báo lạc quan biến toàn bộ danh mục thành một canh bạc.',
      example: 'Thị trường ngầm định cổ phiếu A sinh lời 10%/năm. Bạn dự báo 12% nhưng chỉ tin ở mức trung bình; mô hình có thể cho ra 10,7% thay vì nhảy thẳng lên 12%.',
      tags: ['danh mục', 'quan điểm', 'cân bằng'], related: ['mpt', 'capm', 'risk_parity'],
      metrics: [
        { label: 'Lợi suất cân bằng', value: '10,0%', hint: 'Π' },
        { label: 'Quan điểm cá nhân', value: '12,0%', hint: 'Q' },
        { label: 'Độ tin cậy', value: 'Trung bình', hint: 'Ω' },
        { label: 'Sau khi trộn', value: '10,7%', hint: 'E(R)' }
      ],
      visual: {
        kind: 'bar', title: 'Trộn lợi suất thị trường với quan điểm', unit: '%/năm',
        note: 'Quan điểm càng chắc chắn thì kết quả càng gần dự báo cá nhân; càng mơ hồ thì càng giữ gần mức thị trường.',
        labels: ['Thị trường', 'Quan điểm', 'Black-Litterman'],
        series: [{ name: 'Lợi suất kỳ vọng', color: '#b59cff', values: [10.0, 12.0, 10.7] }]
      }
    },
    {
      id: 'five_factor', category: 'theorems', level: 'Nâng cao', title: 'Mô hình năm nhân tố Fama-French',
      subtitle: 'Ngoài thị trường, quy mô và giá trị còn những nhân tố nào?',
      formula: 'E(R) = R_f + β_m·MRP + β_s·SMB + β_h·HML + β_r·RMW + β_c·CMA',
      summary: 'Bổ sung hai nhân tố lợi nhuận và đầu tư vào mô hình ba nhân tố quen thuộc, giúp giải thích chênh lệch lợi suất tốt hơn.',
      detail: 'SMB bắt xu hướng cổ phiếu nhỏ ăn hơn cổ phiếu lớn; HML bắt cổ phiếu giá trị ăn hơn cổ phiếu tăng trưởng. RMW nghiêng về doanh nghiệp có lợi nhuận hoạt động cao, còn CMA nghiêng về doanh nghiệp đầu tư tiết chế. Đây là công cụ để tách “ăn may” khỏi phong cách đầu tư thật sự.',
      example: 'Một quỹ nhỏ, nghiêng giá trị, lợi nhuận tốt và đầu tư ít có thể có lợi suất cao hơn thị trường mà không cần beta lớn.',
      tags: ['nhân tố', 'SMB', 'HML', 'RMW', 'CMA'], related: ['fama_french', 'factor', 'capm'],
      metrics: [
        { label: 'Phần bù thị trường', value: '5,5%/năm', hint: 'MRP' },
        { label: 'Quy mô nhỏ', value: '2,0%/năm', hint: 'SMB' },
        { label: 'Giá trị', value: '3,2%/năm', hint: 'HML' },
        { label: 'Lợi nhuận cao', value: '2,5%/năm', hint: 'RMW' },
        { label: 'Đầu tư tiết chế', value: '2,1%/năm', hint: 'CMA' }
      ],
      visual: {
        kind: 'bar', title: 'Phần bù dài hạn của từng nhân tố (minh hoạ)', unit: '%/năm',
        note: 'Số liệu minh hoạ, không phải lợi suất cam kết. Từng thời kỳ có thể đảo chiều rất mạnh.',
        labels: ['MRP', 'SMB', 'HML', 'RMW', 'CMA'],
        series: [{ name: 'Phần bù', color: '#f3c56b', values: [5.5, 2.0, 3.2, 2.5, 2.1] }]
      }
    },
    {
      id: 'sortino', category: 'formulas', level: 'Trung bình', title: 'Sortino — đo hiệu quả chỉ bằng rủi ro giảm',
      subtitle: 'Khi lợi nhuận không đối xứng, độ lệch chuẩn chưa đủ nói lên rủi ro.',
      formula: 'Sortino = (R_p − R_f) / σ_downside',
      summary: 'Sortino chỉ trừng phạt biến động âm, phù hợp với chiến lược có đuôi lợi nhuận lệch phải hoặc nhiều cú tăng mạnh.',
      detail: 'Hai chiến lược có cùng độ lệch chuẩn nhưng một bên tăng vọt thường xuyên còn bên kia hay sụt sâu sẽ được Sortino phân biệt rõ hơn Sharpe. Mẫu số chỉ tính các khoảng lợi suất dưới mục tiêu, nên cần đủ dữ liệu và thống nhất mục tiêu tính toán.',
      example: 'Lợi suất 14%, lãi phi rủi ro 4%, độ lệch âm 8%: Sortino = (14 − 4) / 8 = 1,25.',
      tags: ['rủi ro giảm', 'hiệu quả', 'downside'], related: ['sharpe', 'max_drawdown', 'calmar'],
      metrics: [
        { label: 'Lợi suất', value: '14,0%/năm', hint: 'R_p' },
        { label: 'Lãi phi rủi ro', value: '4,0%/năm', hint: 'R_f' },
        { label: 'Độ lệch âm', value: '8,0%', hint: 'σ_downside' },
        { label: 'Sortino', value: '1,25', hint: 'Càng cao càng tốt' }
      ],
      visual: {
        kind: 'bar', title: 'Sharpe và Sortino trên cùng một chiến lược', unit: 'hệ số',
        note: 'Sortino cao hơn Sharpe cho thấy phần lớn biến động là tăng, không phải giảm.',
        labels: ['Sharpe', 'Sortino'],
        series: [{ name: 'Hệ số', color: '#2ee6a6', values: [0.85, 1.25] }]
      }
    },
    {
      id: 'treynor', category: 'formulas', level: 'Trung bình', title: 'Treynor — lợi nhuận trên mỗi đơn vị beta',
      subtitle: 'Với danh mục đã đa dạng hoá, rủi ro hệ thống mới là thứ đáng quan tâm.',
      formula: 'Treynor = (R_p − R_f) / β_p',
      summary: 'Đo phần lợi nhuận vượt lãi phi rủi ro trên một đơn vị rủi ro thị trường, thay vì tổng biến động.',
      detail: 'Treynor phù hợp khi nhà đầu tư đã nắm nhiều tài sản và chỉ còn lo rủi ro không thể chia nhỏ. Nhược điểm là nó bỏ qua rủi ro riêng, nên không nên dùng một mình để đánh giá quỹ tập trung vào vài mã.',
      example: 'Lợi suất 14%, lãi phi rủi ro 4%, beta 1,1: Treynor = 10 / 1,1 ≈ 9,1%.',
      tags: ['beta', 'rủi ro hệ thống', 'hiệu quả'], related: ['sharpe', 'capm', 'information_ratio'],
      metrics: [
        { label: 'Lợi suất', value: '14,0%', hint: 'R_p' },
        { label: 'Beta', value: '1,10', hint: 'β_p' },
        { label: 'Chênh lệch', value: '10,0%', hint: 'R_p − R_f' },
        { label: 'Treynor', value: '9,1%', hint: 'Mỗi đơn vị beta' }
      ],
      visual: {
        kind: 'bar', title: 'Treynor của ba quỹ (minh hoạ)', unit: '%/đơn vị beta',
        note: 'Quỹ C tốt hơn trên mỗi đơn vị beta dù lợi suất tuyệt đối có thể thấp hơn quỹ A.',
        labels: ['Quỹ A', 'Quỹ B', 'Quỹ C'],
        series: [{ name: 'Treynor', color: '#5ac8fa', values: [8.5, 7.2, 9.1] }]
      }
    },
    {
      id: 'information_ratio', category: 'formulas', level: 'Trung bình', title: 'Information Ratio — hiệu quả của phần lệch chỉ số',
      subtitle: 'Nhà quản lý chủ động tạo thêm bao nhiêu lợi nhuận cho mỗi đơn vị sai lệch?',
      formula: 'IR = (R_p − R_b) / Tracking error',
      summary: 'So lợi nhuận vượt chỉ số với độ biến động của phần vượt đó. IR cao nghĩa là thắng chỉ số một cách ổn định.',
      detail: 'Một quỹ thắng chỉ số 3% nhưng dao động vượt chỉ số rất thất thường sẽ có IR thấp hơn quỹ thắng 2% đều đặn. Chỉ số này thường dùng để đánh giá quỹ chủ động và chiến lược alpha.',
      example: 'Lợi nhuận vượt chỉ số 3%/năm, tracking error 4%: IR = 0,75.',
      tags: ['alpha', 'tracking error', 'quỹ chủ động'], related: ['alpha', 'tracking_error', 'sharpe'],
      metrics: [
        { label: 'Lợi nhuận quỹ', value: '13,0%', hint: 'R_p' },
        { label: 'Lợi nhuận chỉ số', value: '10,0%', hint: 'R_b' },
        { label: 'Tracking error', value: '4,0%', hint: 'Độ lệch chủ động' },
        { label: 'Information ratio', value: '0,75', hint: '3% / 4%' }
      ],
      visual: {
        kind: 'bar', title: 'Information ratio của ba chiến lược', unit: 'hệ số',
        note: 'Cùng mức lợi nhuận vượt chỉ số, chiến lược ổn định hơn có IR cao hơn.',
        labels: ['Quỹ A', 'Quỹ B', 'Quỹ C'],
        series: [{ name: 'IR', color: '#b59cff', values: [0.35, 0.75, 0.2] }]
      }
    },
    {
      id: 'earnings_yield', category: 'formulas', level: 'Cơ bản', title: 'Earnings yield — nghịch đảo của P/E',
      subtitle: 'Một cổ phiếu đang mang lại bao nhiêu đồng lợi nhuận trên mỗi 100 đồng giá?',
      formula: 'Earnings yield = EPS / Giá = 1 / (P/E)',
      summary: 'E/P giúp so sánh cổ phiếu với lãi suất tiết kiệm hoặc trái phiếu trên cùng thang đo phần trăm.',
      detail: 'P/E 15 lần tương đương earnings yield 6,67%. Cách nhìn này hữu ích khi lãi suất thay đổi: nếu tiết kiệm 6% và cổ phiếu có E/P 5%, nhà đầu tư đang trả giá cao cho tăng trưởng kỳ vọng. Cần loại các khoản lợi nhuận bất thường trước khi so sánh.',
      example: 'EPS 4.000 ₫, giá 60.000 ₫: E/P = 4.000 / 60.000 = 6,67%, tương đương P/E 15 lần.',
      tags: ['P/E', 'định giá', 'lợi nhuận'], related: ['pe_peg', 'fcf_yield', 'graham_number'],
      metrics: [
        { label: 'EPS', value: '4.000 ₫', hint: 'Mỗi cổ phiếu' },
        { label: 'Giá', value: '60.000 ₫', hint: 'Thị giá' },
        { label: 'P/E', value: '15,0x', hint: 'Giá / EPS' },
        { label: 'Earnings yield', value: '6,67%', hint: 'EPS / giá' }
      ],
      visual: {
        kind: 'bar', title: 'So sánh E/P với lãi suất tham chiếu', unit: '%/năm',
        note: 'E/P không phải tiền mặt nhận được, nhưng là thước đo thô để so với lãi suất.',
        labels: ['E/P cổ phiếu', 'Lãi tiết kiệm', 'Lạm phát'],
        series: [{ name: 'Tỷ lệ', color: '#2ee6a6', values: [6.67, 5.2, 3.5] }]
      }
    },
    {
      id: 'residual_income', category: 'formulas', level: 'Nâng cao', title: 'Residual income — giá trị nằm ở phần vượt chi phí vốn',
      subtitle: 'Doanh nghiệp chỉ tạo thêm giá trị khi ROE cao hơn chi phí vốn chủ sở hữu.',
      formula: 'V_0 = B_0 + Σ (ROE_t − r) × B_(t−1) / (1 + r)^t',
      summary: 'Định giá dựa trên giá trị sổ sách cộng hiện giá của phần lợi nhuận vượt yêu cầu của cổ đông.',
      detail: 'Nếu ROE chỉ bằng chi phí vốn, doanh nghiệp đáng giá đúng bằng vốn chủ sở hữu. Phần vượt (ROE − r) nhân với vốn tạo ra thu nhập thặng dư. Mô hình phù hợp với ngân hàng, bảo hiểm và doanh nghiệp có tài sản hữu hình lớn.',
      example: 'Vốn chủ 30.000 ₫/cp, ROE 18%, chi phí vốn 12%, giữ một năm: giá trị ≈ 30.000 + (6% × 30.000) / 1,12 ≈ 31.607 ₫.',
      tags: ['ROE', 'chi phí vốn', 'định giá'], related: ['roic', 'eva', 'pb_roe'],
      metrics: [
        { label: 'Giá trị sổ sách', value: '30.000 ₫', hint: 'B_0' },
        { label: 'ROE', value: '18%', hint: 'Lợi nhuận trên vốn' },
        { label: 'Chi phí vốn', value: '12%', hint: 'r' },
        { label: 'Chênh lệch', value: '+6 điểm %', hint: 'Tạo giá trị' }
      ],
      visual: {
        kind: 'line', title: 'Giá trị hợp lý khi ROE thay đổi', unit: 'nghìn đồng/cp',
        note: 'ROE càng cao hơn chi phí vốn, phần giá trị thặng dư càng lớn.',
        labels: ['ROE 8%', 'ROE 12%', 'ROE 18%', 'ROE 24%'],
        series: [{ name: 'Giá trị', color: '#5ac8fa', values: [28.9, 30.0, 31.6, 33.2] }, { name: 'Vốn sổ sách', color: '#f3c56b', values: [30, 30, 30, 30] }]
      }
    },
    {
      id: 'tracking_error', category: 'formulas', level: 'Trung bình', title: 'Tracking error — mức lệch khỏi chỉ số',
      subtitle: 'Danh mục đang bám chỉ số hay đang đi chệch quá xa?',
      formula: 'TE = σ(R_p − R_b)',
      summary: 'Độ lệch chuẩn của chênh lệch lợi suất giữa danh mục và chỉ số tham chiếu. TE thấp nghĩa là bám sát chỉ số.',
      detail: 'Quỹ chỉ số thụ động thường có TE rất thấp; quỹ chủ động có TE cao hơn vì chấp nhận lệch để tìm alpha. Nhà đầu tư cần biết mình đang trả phí cho một chiến lược bám chỉ số hay cho một chiến lược thật sự chủ động.',
      example: 'Chênh lệch theo tháng: +0,8%; −0,5%; +1,2%; +0,3%; −0,2%; +0,9%. Độ lệch chuẩn khoảng 0,7%/tháng, quy đổi gần 2,4%/năm.',
      tags: ['chỉ số', 'chủ động', 'độ lệch'], related: ['information_ratio', 'alpha', 'beta'],
      metrics: [
        { label: 'Chênh lệch TB', value: '+0,42%/tháng', hint: 'Active return' },
        { label: 'Độ lệch chuẩn', value: '0,70%/tháng', hint: 'TE tháng' },
        { label: 'Quy đổi năm', value: '≈ 2,4%', hint: 'TE × √12' },
        { label: 'Mức bám chỉ số', value: 'Trung bình', hint: 'Chủ động vừa' }
      ],
      visual: {
        kind: 'line', title: 'Chênh lệch lợi suất quỹ và chỉ số theo tháng', unit: '%',
        note: 'Dao động càng rộng quanh 0 thì tracking error càng lớn.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
        series: [{ name: 'Chênh lệch', color: '#b59cff', values: [0.8, -0.5, 1.2, 0.3, -0.2, 0.9], fill: true }]
      }
    },
    {
      id: 'calmar', category: 'formulas', level: 'Trung bình', title: 'Calmar — lợi nhuận dài hạn trên mức sụt sâu nhất',
      subtitle: 'Một chiến lược sinh lời tốt nhưng từng mất nửa vốn thì có đáng theo?',
      formula: 'Calmar = CAGR / Max drawdown',
      summary: 'Chia lợi nhuận kép hằng năm cho mức sụt giảm lớn nhất để đo mức đau mà nhà đầu tư phải chịu.',
      detail: 'Calmar hữu ích với chiến lược dài hạn vì drawdown là thứ khiến nhiều người bỏ cuộc đúng đáy. Hạn chế là nó chỉ nhìn một cú sụt tệ nhất trong quá khứ, không nói gì về tần suất sụt hay thời gian hồi vốn.',
      example: 'CAGR 18%, mức sụt sâu nhất 25%: Calmar = 18 / 25 = 0,72.',
      tags: ['drawdown', 'CAGR', 'dài hạn'], related: ['max_drawdown', 'sortino', 'sharpe'],
      metrics: [
        { label: 'CAGR', value: '18,0%', hint: 'Lợi nhuận kép' },
        { label: 'Max drawdown', value: '25,0%', hint: 'Sụt sâu nhất' },
        { label: 'Calmar', value: '0,72', hint: 'CAGR / MDD' },
        { label: 'Thời gian hồi vốn', value: '14 tháng', hint: 'Từ đáy' }
      ],
      visual: {
        kind: 'bar', title: 'Calmar của ba chiến lược', unit: 'hệ số',
        note: 'Chiến lược C có lợi nhuận khiêm tốn nhưng drawdown nông, nên Calmar cao hơn.',
        labels: ['Chiến lược A', 'Chiến lược B', 'Chiến lược C'],
        series: [{ name: 'Calmar', color: '#2ee6a6', values: [0.72, 0.45, 1.10] }]
      }
    },
    {
      id: 'magic_formula', category: 'analysis', level: 'Trung bình', title: 'Magic Formula — lọc cổ phiếu bằng ROC và E/P',
      subtitle: 'Một cách xếp hạng đơn giản: doanh nghiệp tốt và giá còn hợp lý.',
      formula: 'Điểm = Hạng ROC + Hạng Earnings yield',
      summary: 'Xếp hạng toàn bộ cổ phiếu theo lợi nhuận trên vốn (ROC) và earnings yield, sau đó chọn các mã có tổng hạng tốt nhất.',
      detail: 'Công thức của Joel Greenblatt cố tình bỏ qua dự báo và câu chuyện, chỉ dùng hai con số. ROC cao cho thấy doanh nghiệp dùng vốn hiệu quả; E/P cao cho thấy giá chưa quá đắt. Chiến lược cần phân tán nhiều mã và định kỳ tái cân bằng vì danh sách thay đổi theo báo cáo tài chính.',
      example: 'Mã A đứng hạng 12 về ROC và hạng 40 về E/P, tổng 52. Mã B hạng 30 và 25, tổng 55. Mã A được chọn trước.',
      tags: ['ROC', 'E/P', 'lọc cổ phiếu'], related: ['roic', 'earnings_yield', 'factor'],
      metrics: [
        { label: 'ROC mã A', value: '22%', hint: 'Hạng 12' },
        { label: 'E/P mã A', value: '7,5%', hint: 'Hạng 40' },
        { label: 'Tổng hạng', value: '52', hint: 'Càng thấp càng tốt' },
        { label: 'Số mã nắm giữ', value: '20–30', hint: 'Phân tán' }
      ],
      visual: {
        kind: 'bar', title: 'Hai trụ cột của Magic Formula', unit: '%',
        note: 'ROC đo chất lượng doanh nghiệp; E/P đo mức giá phải trả. Cần cả hai cùng tốt.',
        labels: ['ROC', 'E/P'],
        series: [{ name: 'Mã A', color: '#f3c56b', values: [22, 7.5] }]
      }
    },
    {
      id: 'dual_momentum', category: 'analysis', level: 'Trung bình', title: 'Dual momentum — xu hướng tuyệt đối và tương đối',
      subtitle: 'Có nên nắm cổ phiếu lúc này, và nếu có thì chọn thị trường nào?',
      formula: 'Tuyệt đối: R_12m > lãi suất ngắn hạn; tương đối: chọn top N theo R_12m',
      summary: 'Kết hợp kiểm tra xu hướng của cả danh mục với việc chọn thị trường mạnh nhất. Nếu không thị trường nào đạt, chuyển sang tiền mặt.',
      detail: 'Momentum tuyệt đối giúp tránh giai đoạn giảm sâu; momentum tương đối giúp dồn vốn vào nơi dòng tiền đang chảy. Nhược điểm là tín hiệu mua muộn và có thể bị whipsaw khi thị trường đi ngang.',
      example: 'Cổ phiếu VN tăng 14% trong 12 tháng, lãi tiền gửi 5% → đạt momentum tuyệt đối. So với vàng 9% và Mỹ 11%, VN đứng đầu nên được chọn.',
      tags: ['momentum', 'xu hướng', 'phân bổ'], related: ['factor', 'sector_rotation', 'mean_reversion'],
      metrics: [
        { label: 'VN 12 tháng', value: '+14%', hint: 'Đạt tuyệt đối' },
        { label: 'Vàng 12 tháng', value: '+9%', hint: 'Đạt tuyệt đối' },
        { label: 'Mỹ 12 tháng', value: '+11%', hint: 'Đạt tuyệt đối' },
        { label: 'Lựa chọn', value: 'Việt Nam', hint: 'Mạnh nhất' }
      ],
      visual: {
        kind: 'line', title: 'Hiệu suất luỹ kế của ba thị trường (minh hoạ)', unit: 'điểm',
        note: 'Chiến lược chọn thị trường có momentum 12 tháng cao nhất và bỏ qua khi tất cả đều âm.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
        series: [
          { name: 'Việt Nam', color: '#2ee6a6', values: [100, 103, 101, 106, 109, 114] },
          { name: 'Mỹ', color: '#5ac8fa', values: [100, 101, 104, 103, 107, 111] },
          { name: 'Vàng', color: '#f3c56b', values: [100, 102, 101, 104, 105, 109] }
        ]
      }
    },
    {
      id: 'risk_parity', category: 'analysis', level: 'Nâng cao', title: 'Risk parity — chia rủi ro thay vì chia tiền',
      subtitle: 'Danh mục 60/40 truyền thống có thật sự cân bằng rủi ro?',
      formula: 'w_i ∝ 1 / σ_i (bản đơn giản, bỏ qua tương quan)',
      summary: 'Phân bổ vốn sao cho mỗi nhóm tài sản đóng góp rủi ro tương đương, thường khiến trái phiếu và tiền mặt chiếm tỷ trọng lớn hơn cổ phiếu.',
      detail: 'Cổ phiếu biến động mạnh hơn trái phiếu rất nhiều, nên danh mục 60/40 thực tế lấy phần lớn rủi ro từ cổ phiếu. Risk parity dùng nghịch đảo độ biến động (và ma trận tương quan ở bản đầy đủ) để cân lại. Khi lạm phát tăng, trái phiếu cũng có thể giảm nên chiến lược không miễn nhiễm.',
      example: 'Cổ phiếu σ 18%, trái phiếu σ 7%, vàng σ 12%, tiền σ 1%. Trọng số nghịch đảo xấp xỉ 9%, 24%, 14% và 53% trước khi chuẩn hoá.',
      tags: ['phân bổ', 'rủi ro', 'tương quan'], related: ['mpt', 'black_litterman', 'correlation'],
      metrics: [
        { label: 'Cổ phiếu', value: '35% vốn', hint: 'σ 18%' },
        { label: 'Trái phiếu', value: '40% vốn', hint: 'σ 7%' },
        { label: 'Vàng', value: '15% vốn', hint: 'σ 12%' },
        { label: 'Tiền mặt', value: '10% vốn', hint: 'σ 1%' }
      ],
      visual: {
        kind: 'bar', title: 'Tỷ trọng vốn và mức đóng góp rủi ro', unit: '%',
        note: 'Cổ phiếu chiếm 35% vốn nhưng đóng góp gần một nửa rủi ro danh mục.',
        labels: ['Cổ phiếu', 'Trái phiếu', 'Vàng', 'Tiền'],
        series: [
          { name: 'Tỷ trọng vốn', color: '#5ac8fa', values: [35, 40, 15, 10] },
          { name: 'Đóng góp rủi ro', color: '#f3c56b', values: [48, 22, 18, 12] }
        ]
      }
    },
    {
      id: 'sector_rotation', category: 'analysis', level: 'Trung bình', title: 'Sector rotation — dòng tiền chạy giữa các ngành',
      subtitle: 'Khi kinh tế chuyển pha, nhóm ngành nào thường dẫn dắt?',
      formula: 'RS = Lợi suất ngành / Lợi suất thị trường (3 tháng)',
      summary: 'Theo dõi sức mạnh tương đối của từng ngành để nhận ra dòng tiền đang dịch chuyển sớm hơn giá.',
      detail: 'Đầu chu kỳ tăng trưởng, tài chính và tiêu dùng không thiết yếu thường mạnh. Giữa chu kỳ, công nghiệp và vật liệu hưởng lợi. Cuối chu kỳ, năng lượng và hàng tiêu dùng thiết yếu thường trụ vững hơn. Đây là khung tham khảo, không phải lịch cố định.',
      example: 'Ngân hàng tăng 18% trong 3 tháng, VN-Index tăng 10% → RS = 1,8. Ngành này đang được dòng tiền ưu tiên.',
      tags: ['ngành', 'chu kỳ', 'dòng tiền'], related: ['dual_momentum', 'factor', 'rotation'],
      metrics: [
        { label: 'Ngân hàng RS', value: '1,18', hint: 'Dẫn dắt' },
        { label: 'Công nghệ RS', value: '1,05', hint: 'Khá' },
        { label: 'Bất động sản RS', value: '0,92', hint: 'Trung tính' },
        { label: 'Năng lượng RS', value: '0,81', hint: 'Yếu' }
      ],
      visual: {
        kind: 'bar', title: 'Sức mạnh tương đối của các ngành', unit: 'RS',
        note: 'RS trên 1 là mạnh hơn thị trường; dưới 1 là yếu hơn. Cần xem xu hướng RS qua vài tuần.',
        labels: ['Ngân hàng', 'Công nghệ', 'BĐS', 'Năng lượng'],
        series: [{ name: 'RS 3 tháng', color: '#2ee6a6', values: [1.18, 1.05, 0.92, 0.81] }]
      }
    },
    {
      id: 'mean_reversion', category: 'analysis', level: 'Trung bình', title: 'Mean reversion — giá lệch bao xa khỏi trung bình?',
      subtitle: 'Một cổ phiếu rơi quá sâu có thể bật lại, nhưng “quá sâu” là bao nhiêu?',
      formula: 'z = (Giá − MA20) / Độ lệch chuẩn 20 phiên',
      summary: 'Đo mức lệch chuẩn hoá của giá so với đường trung bình. z quá âm gợi ý bán quá đà; z quá dương gợi ý mua quá đà.',
      detail: 'Mean reversion hiệu quả trong thị trường đi ngang, nhưng nguy hiểm khi có xu hướng mạnh: giá rẻ có thể rẻ thêm rất lâu. Nên kết hợp với thanh khoản, tin tức và mức hỗ trợ thay vì mua chỉ vì z âm.',
      example: 'Giá 92, MA20 100, độ lệch chuẩn 5 → z = −1,6. Giá đang thấp hơn trung bình 1,6 độ lệch chuẩn, nhưng chưa đủ để kết luận đảo chiều.',
      tags: ['z-score', 'MA20', 'quá mua quá bán'], related: ['bollinger', 'technical', 'mean_reversion'],
      metrics: [
        { label: 'Giá hiện tại', value: '92', hint: 'P' },
        { label: 'MA20', value: '100', hint: 'Trung bình' },
        { label: 'Độ lệch chuẩn', value: '5', hint: '20 phiên' },
        { label: 'z-score', value: '−1,60', hint: 'Lệch dưới' }
      ],
      visual: {
        kind: 'line', title: 'Giá quanh đường trung bình 20 phiên', unit: 'nghìn đồng',
        note: 'Khi giá lệch quá xa đường trung bình, xác suất quay lại tăng lên — nhưng không phải quy luật chắc chắn.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
        series: [
          { name: 'Giá', color: '#5ac8fa', values: [100, 104, 108, 103, 99, 97, 101, 105] },
          { name: 'MA20', color: '#f3c56b', values: [100, 100.5, 101, 101.5, 102, 102, 102, 102] }
        ]
      }
    },
    {
      id: 'bollinger', category: 'analysis', level: 'Cơ bản', title: 'Dải Bollinger — biên độ quanh giá trung bình',
      subtitle: 'Khi dải co lại, thị trường đang nén năng lượng cho một cú bứt phá?',
      formula: 'Upper/Lower = MA20 ± 2 × Độ lệch chuẩn 20',
      summary: 'Ba đường MA20 và hai biên trên dưới cho thấy giá đang đi quá xa hay chỉ dao động bình thường.',
      detail: 'Giá chạm biên trên không tự động là tín hiệu bán; trong xu hướng mạnh, giá có thể bám biên rất lâu. Dải co hẹp (squeeze) cho thấy biến động thấp và thường đi trước một cú mở rộng. Cần đọc cùng khối lượng và xu hướng.',
      example: 'MA20 100, độ lệch chuẩn 3: biên trên 106, biên dưới 94. Giá 107 nằm ngoài biên trên, cho thấy mua quá đà ngắn hạn.',
      tags: ['Bollinger', 'biến động', 'MA20'], related: ['technical', 'atr', 'mean_reversion'],
      metrics: [
        { label: 'MA20', value: '100', hint: 'Đường giữa' },
        { label: 'Độ lệch chuẩn', value: '3', hint: '20 phiên' },
        { label: 'Biên trên', value: '106', hint: '+2σ' },
        { label: 'Biên dưới', value: '94', hint: '−2σ' }
      ],
      visual: {
        kind: 'line', title: 'Giá đi trong dải Bollinger', unit: 'nghìn đồng',
        note: 'Giá vượt biên trên cho thấy quá mua ngắn hạn, nhưng xu hướng mạnh có thể giữ giá ngoài biên nhiều phiên.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
        series: [
          { name: 'Biên trên', color: '#ff5d73', values: [104, 105, 106, 107, 106, 105] },
          { name: 'Giá', color: '#eaf2ef', values: [100, 101, 104, 107, 105, 103] },
          { name: 'Biên dưới', color: '#2ee6a6', values: [96, 95, 94, 93, 94, 95] }
        ]
      }
    },
    {
      id: 'atr', category: 'analysis', level: 'Cơ bản', title: 'ATR — biên độ thật trung bình',
      subtitle: 'Một cổ phiếu thường dao động bao nhiêu trong một phiên?',
      formula: 'TR = max(H−L, |H−C_trước|, |L−C_trước|); ATR = trung bình TR 14 phiên',
      summary: 'ATR đo biên độ dao động thực tế, không quan tâm hướng tăng hay giảm. Dùng để đặt stop-loss và tính khối lượng vị thế.',
      detail: 'Stop-loss nên đặt xa hơn ATR để tránh bị quét bởi nhiễu thông thường. ATR tăng cho thấy thị trường bất ổn; ATR giảm cho thấy biến động đang nén. ATR tính bằng giá tuyệt đối nên chỉ so sánh giữa các mã sau khi chia cho giá.',
      example: 'ATR14 = 1.200 ₫, giá 40.000 ₫ → ATR 3%. Đặt stop-loss cách 2 ATR (2.400 ₫) thay vì sát giá.',
      tags: ['ATR', 'stop-loss', 'biến động'], related: ['bollinger', 'max_drawdown', 'risk_parity'],
      metrics: [
        { label: 'ATR14', value: '1.200 ₫', hint: 'Biên độ/phiên' },
        { label: 'Giá', value: '40.000 ₫', hint: 'Tham chiếu' },
        { label: 'ATR %', value: '3,0%', hint: 'ATR / giá' },
        { label: 'Stop 2 ATR', value: '2.400 ₫', hint: 'Khoảng cách' }
      ],
      visual: {
        kind: 'bar', title: 'ATR tương đối của các nhóm tài sản', unit: '% giá/phiên',
        note: 'Cùng một số tiền, tài sản ATR cao hơn cần khối lượng nhỏ hơn để giữ rủi ro như nhau.',
        labels: ['Blue-chip', 'Mid-cap', 'Crypto', 'Small-cap'],
        series: [{ name: 'ATR %', color: '#ff9f43', values: [1.2, 2.4, 4.8, 7.5] }]
      }
    },
    {
      id: 'obv', category: 'analysis', level: 'Trung bình', title: 'OBV — dòng tiền tích luỹ theo khối lượng',
      subtitle: 'Giá tăng nhưng khối lượng có xác nhận điều đó?',
      formula: 'OBV_t = OBV_(t−1) + dấu(Close_t − Close_(t−1)) × Volume_t',
      summary: 'Cộng khối lượng vào ngày tăng, trừ khối lượng vào ngày giảm. OBV đi cùng chiều giá thường xác nhận xu hướng.',
      detail: 'Nếu giá tạo đỉnh mới nhưng OBV không tạo đỉnh mới, dòng tiền đang yếu dần. Ngược lại, OBV tăng trước giá có thể là dấu hiệu tích luỹ. OBV rất thô vì bỏ qua mức giá giao dịch, nên cần đọc cùng VWAP và khối lượng thực.',
      example: 'Giá 10 phiên tăng 6%, OBV tăng 18% cho thấy dòng tiền vào ủng hộ. Nếu OBV giảm 4% trong cùng nhịp, nên cảnh giác với cú tăng thiếu lực.',
      tags: ['OBV', 'khối lượng', 'dòng tiền'], related: ['vwap', 'technical', 'liquidity'],
      metrics: [
        { label: 'OBV 10 phiên', value: '+18%', hint: 'Tích cực' },
        { label: 'Giá 10 phiên', value: '+6%', hint: 'Xác nhận' },
        { label: 'Khối lượng TB', value: '1,4x', hint: 'So với 20 phiên' },
        { label: 'Phân kỳ', value: 'Không', hint: 'Giá và OBV cùng chiều' }
      ],
      visual: {
        kind: 'line', title: 'OBV tích luỹ theo thời gian (minh hoạ)', unit: 'chỉ số',
        note: 'OBV tăng dần trong khi giá đi ngang thường là dấu hiệu có người âm thầm gom hàng.',
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        series: [{ name: 'OBV', color: '#5ac8fa', values: [100, 108, 104, 118, 126, 122, 138], fill: true }]
      }
    },
    {
      id: 'vwap', category: 'analysis', level: 'Cơ bản', title: 'VWAP — giá trung bình theo khối lượng',
      subtitle: 'Giá hiện tại đang cao hơn hay thấp hơn mức giá đa số người đã giao dịch?',
      formula: 'VWAP = Σ(Giá × Khối lượng) / Σ Khối lượng',
      summary: 'VWAP là mức giá bình quân mà dòng tiền thực sự đã trả trong ngày hoặc trong phiên đang xét.',
      detail: 'Tổ chức thường dùng VWAP làm chuẩn thực thi: mua dưới VWAP được xem là khớp tốt trong ngày. VWAP không phải đường hỗ trợ ma thuật; nó chỉ cho biết vị thế của giá so với chi phí trung bình của dòng tiền.',
      example: 'VWAP 39.800 ₫, giá hiện tại 40.500 ₫. Người mua hôm nay đang lãi nhẹ so với chi phí trung bình của thị trường.',
      tags: ['VWAP', 'khối lượng', 'thực thi'], related: ['obv', 'liquidity', 'technical'],
      metrics: [
        { label: 'VWAP', value: '39.800 ₫', hint: 'Bình quân theo KL' },
        { label: 'Giá hiện tại', value: '40.500 ₫', hint: 'Trên VWAP' },
        { label: 'Chênh lệch', value: '+1,8%', hint: 'Giá − VWAP' },
        { label: 'Khối lượng', value: '2,1 tr', hint: 'Trong phiên' }
      ],
      visual: {
        kind: 'line', title: 'Giá và VWAP trong phiên', unit: 'nghìn đồng',
        note: 'Giá giữ trên VWAP cho thấy người mua sẵn sàng trả cao hơn chi phí trung bình của dòng tiền.',
        labels: ['9h', '10h', '11h', '13h', '14h', '14h45'],
        series: [
          { name: 'Giá', color: '#eaf2ef', values: [39.5, 39.9, 40.2, 40.0, 40.4, 40.5] },
          { name: 'VWAP', color: '#f3c56b', values: [39.5, 39.7, 39.8, 39.8, 39.8, 39.8] }
        ]
      }
    },
    {
      id: 'pead', category: 'analysis', level: 'Nâng cao', title: 'PEAD — giá còn trôi sau tin lợi nhuận',
      subtitle: 'Sau khi công bố lợi nhuận vượt dự báo, giá thường chưa dừng lại ngay.',
      formula: 'CAR = Σ lợi suất bất thường trong 20–60 phiên sau công bố',
      summary: 'Hiệu ứng post-earnings announcement drift: thị trường phản ứng chậm với tin lợi nhuận, tạo xu hướng kéo dài sau công bố.',
      detail: 'Nhà đầu tư bị neo vào kỳ vọng cũ và cần thời gian cập nhật. Cổ phiếu có bất ngờ lợi nhuận dương thường tiếp tục tăng; bất ngờ âm thường tiếp tục giảm. Hiệu ứng mạnh hơn ở cổ phiếu ít được phân tích và thanh khoản thấp, nhưng cũng dễ bị nhiễu bởi tin khác.',
      example: 'Lợi nhuận vượt dự báo 8%, cổ phiếu tăng 3% ngay hôm công bố và thêm 4,2% trong 60 phiên sau đó.',
      tags: ['lợi nhuận', 'bất ngờ', 'drift'], related: ['momentum', 'earnings_quality', 'factor'],
      metrics: [
        { label: 'Bất ngờ lợi nhuận', value: '+8%', hint: 'So dự báo' },
        { label: 'Phản ứng ngày 1', value: '+3,0%', hint: 'Công bố' },
        { label: 'Drift 60 phiên', value: '+4,2%', hint: 'Sau công bố' },
        { label: 'Tổng CAR', value: '+7,2%', hint: 'Ngày 1 + drift' }
      ],
      visual: {
        kind: 'bar', title: 'Lợi suất bất thường sau công bố lợi nhuận', unit: '%',
        note: 'Bất ngờ dương thường đi kèm drift dương; bất ngờ âm thường đi kèm drift âm.',
        labels: ['Bất ngờ +', 'Bất ngờ −'],
        series: [{ name: 'Drift 60 phiên', color: '#2ee6a6', values: [4.2, -3.1] }]
      }
    },
    {
      id: 'buffett_indicator', category: 'analysis', level: 'Cơ bản', title: 'Buffett Indicator — vốn hoá thị trường trên GDP',
      subtitle: 'Cả thị trường đang đắt hay rẻ so với nền kinh tế?',
      formula: 'Buffett Indicator = Tổng vốn hoá / GDP',
      summary: 'So tổng giá trị cổ phiếu với quy mô nền kinh tế. Tỷ lệ cao cho thấy thị trường đang định giá lạc quan.',
      detail: 'Chỉ số này thô vì lợi nhuận doanh nghiệp có thể đến từ nước ngoài và lãi suất ảnh hưởng mạnh đến mức định giá hợp lý. Dù vậy, nó hữu ích như một bức tranh tổng thể: 80–100% thường được xem là vùng trung tính ở Mỹ, trên 120% là vùng căng thẳng.',
      example: 'Tổng vốn hoá 5.400 nghìn tỷ, GDP 4.500 nghìn tỷ → 120%. Thị trường đắt hơn mức trung bình lịch sử.',
      tags: ['định giá thị trường', 'GDP', 'vốn hoá'], related: ['earnings_yield', 'shiller_pe', 'factor'],
      metrics: [
        { label: 'Vốn hoá', value: '5.400 nghìn tỷ', hint: 'Tổng thị trường' },
        { label: 'GDP', value: '4.500 nghìn tỷ', hint: 'Danh nghĩa' },
        { label: 'Tỷ lệ', value: '120%', hint: 'Vốn hoá / GDP' },
        { label: 'Vùng lịch sử', value: 'Căng thẳng', hint: 'Tham khảo' }
      ],
      visual: {
        kind: 'line', title: 'Buffett Indicator qua các năm (minh hoạ)', unit: '% GDP',
        note: 'Tỷ lệ tăng dần theo thời gian một phần vì biên lợi nhuận và lãi suất thay đổi, nên đừng dùng một ngưỡng cố định cho mọi thời kỳ.',
        labels: ['2016', '2018', '2020', '2022', '2024', '2026'],
        series: [{ name: 'Vốn hoá / GDP', color: '#ff9f43', values: [85, 98, 112, 105, 118, 120], fill: true }]
      }
    },
    {
      id: 'shiller_pe', category: 'analysis', level: 'Trung bình', title: 'CAPE — P/E điều chỉnh chu kỳ',
      subtitle: 'Lợi nhuận một năm có thể bị thổi phồng; còn trung bình 10 năm thì sao?',
      formula: 'CAPE = Giá / (Lợi nhuận bình quân 10 năm, đã điều chỉnh lạm phát)',
      summary: 'Dùng lợi nhuận bình quân 10 năm thay vì một năm để làm mượt chu kỳ kinh tế và tránh định giá quá cao khi lợi nhuận đang đỉnh.',
      detail: 'CAPE hữu ích cho dự báo lợi suất dài hạn của cả thị trường, nhưng không dùng để canh thời điểm ngắn hạn. Thị trường có thể duy trì CAPE cao nhiều năm khi lãi suất thấp. Với cổ phiếu riêng lẻ, CAPE ít hữu ích hơn vì lợi nhuận doanh nghiệp thay đổi cấu trúc.',
      example: 'Giá 100.000 ₫, EPS bình quân 10 năm đã điều chỉnh lạm phát 4.000 ₫ → CAPE 25 lần.',
      tags: ['CAPE', 'định giá', 'dài hạn'], related: ['pe_peg', 'buffett_indicator', 'earnings_yield'],
      metrics: [
        { label: 'Giá', value: '100.000 ₫', hint: 'Hiện tại' },
        { label: 'EPS bình quân 10 năm', value: '4.000 ₫', hint: 'Đã điều chỉnh' },
        { label: 'CAPE', value: '25,0x', hint: 'Giá / EPS dài hạn' },
        { label: 'P/E hiện tại', value: '18,0x', hint: 'Một năm' }
      ],
      visual: {
        kind: 'line', title: 'P/E hiện tại và CAPE qua các năm', unit: 'lần',
        note: 'CAPE mượt hơn P/E một năm, nên ít bị đánh lừa bởi giai đoạn lợi nhuận đột biến.',
        labels: ['2018', '2020', '2022', '2024', '2026'],
        series: [
          { name: 'P/E', color: '#5ac8fa', values: [17, 22, 15, 19, 18] },
          { name: 'CAPE', color: '#f3c56b', values: [24, 29, 26, 27, 25] }
        ]
      }
    },
    {
      id: 'margin_of_safety', category: 'concepts', level: 'Cơ bản', title: 'Biên an toàn — mua rẻ hơn giá trị thật',
      subtitle: 'Chênh lệch giữa giá trị bạn tin và giá bạn phải trả chính là lớp đệm rủi ro.',
      formula: 'MoS = (Giá trị nội tại − Giá thị trường) / Giá trị nội tại',
      summary: 'Biên an toàn càng lớn thì sai số trong định giá càng ít gây thiệt hại. Đây là nguyên tắc trung tâm của đầu tư giá trị.',
      detail: 'Không ai định giá đúng hoàn toàn. Nếu bạn ước giá trị 100 nhưng thực tế chỉ 80, mua ở 70 vẫn có lãi; mua ở 110 thì lỗ ngay từ đầu. Biên an toàn không thay thế cho phân tích đúng, nó chỉ bảo vệ khi phân tích sai.',
      example: 'Giá trị nội tại 100.000 ₫, giá thị trường 70.000 ₫: biên an toàn 30%. Mua ở 90.000 ₫ chỉ còn 10%.',
      tags: ['giá trị', 'rủi ro', 'định giá'], related: ['graham_number', 'dcf_gordon', 'residual_income'],
      metrics: [
        { label: 'Giá trị nội tại', value: '100.000 ₫', hint: 'Ước tính' },
        { label: 'Giá thị trường', value: '70.000 ₫', hint: 'Hiện tại' },
        { label: 'Biên an toàn', value: '30%', hint: 'MoS' },
        { label: 'Mua ở 90.000', value: '10%', hint: 'Biên mỏng' }
      ],
      visual: {
        kind: 'bar', title: 'Giá trị nội tại và giá phải trả', unit: 'nghìn đồng',
        note: 'Khoảng chênh giữa giá trị và giá mua là vùng đệm cho sai số định giá.',
        labels: ['Giá trị nội tại', 'Giá thị trường', 'Vùng an toàn'],
        series: [{ name: 'Giá trị', color: '#2ee6a6', values: [100, 70, 30] }]
      }
    },
    {
      id: 'free_float', category: 'concepts', level: 'Cơ bản', title: 'Free float — lượng cổ phiếu thật sự giao dịch được',
      subtitle: 'Thanh khoản của một cổ phiếu không chỉ phụ thuộc vào vốn hoá.',
      formula: 'Free float = Tổng cổ phiếu − Cổ phiếu bị khoá / chiến lược',
      summary: 'Tỷ lệ cổ phiếu tự do chuyển nhượng quyết định thanh khoản và mức độ dễ bị đẩy giá của một mã.',
      detail: 'Một doanh nghiệp vốn hoá lớn nhưng 90% cổ phần nằm trong tay nhà nước hoặc cổ đông chiến lược sẽ có free float nhỏ. Khi đó, một lệnh mua vừa phải cũng có thể đẩy giá rất mạnh, và lúc bán tháo cũng không có đủ người đỡ.',
      example: 'Tổng 100 triệu cổ phiếu, cổ đông lớn giữ 65 triệu, nội bộ giữ 15 triệu → free float 20% (20 triệu cổ phiếu).',
      tags: ['free float', 'thanh khoản', 'sở hữu'], related: ['liquidity', 'liquidity_premium', 'short_interest'],
      metrics: [
        { label: 'Tổng cổ phiếu', value: '100 triệu', hint: 'Niêm yết' },
        { label: 'Cổ đông lớn', value: '65 triệu', hint: 'Bị khoá' },
        { label: 'Nội bộ', value: '15 triệu', hint: 'Hạn chế' },
        { label: 'Free float', value: '20%', hint: 'Tự do giao dịch' }
      ],
      visual: {
        kind: 'bar', title: 'Cơ cấu sở hữu cổ phiếu', unit: '% tổng cổ phiếu',
        note: 'Free float thấp làm giá dễ biến động mạnh dù vốn hoá lớn.',
        labels: ['Cổ đông lớn', 'Nội bộ', 'Free float'],
        series: [{ name: 'Tỷ lệ', color: '#5ac8fa', values: [65, 15, 20] }]
      }
    },
    {
      id: 'short_interest', category: 'concepts', level: 'Trung bình', title: 'Short interest — lượng bán khống còn mở',
      subtitle: 'Bao nhiêu cổ phiếu đang bị bán khống và cần bao lâu để đóng lại?',
      formula: 'Days to cover = Cổ phiếu bán khống / Khối lượng giao dịch bình quân ngày',
      summary: 'Tỷ lệ bán khống trên free float và số ngày đóng vị thế cho biết áp lực bán khống và nguy cơ short squeeze.',
      detail: 'Short interest cao có thể là dấu hiệu nhà đầu tư nghi ngờ doanh nghiệp, nhưng cũng tạo nhiên liệu cho short squeeze nếu giá tăng. Chỉ số này chỉ có ý nghĩa khi so với free float, không phải tổng cổ phiếu. Dữ liệu thường công bố chậm vài tuần.',
      example: '12 triệu cổ phiếu bán khống, khối lượng giao dịch bình quân 3 triệu/ngày → cần 4 ngày để đóng toàn bộ.',
      tags: ['bán khống', 'short squeeze', 'free float'], related: ['free_float', 'liquidity', 'squeeze'],
      metrics: [
        { label: 'Cổ phiếu bán khống', value: '12 triệu', hint: 'Đang mở' },
        { label: 'Free float', value: '80 triệu', hint: 'Tự do' },
        { label: 'Short interest', value: '15% float', hint: 'Tỷ lệ' },
        { label: 'Days to cover', value: '4,0 ngày', hint: 'Thời gian đóng' }
      ],
      visual: {
        kind: 'bar', title: 'Mức bán khống của ba cổ phiếu', unit: '% free float',
        note: 'Tỷ lệ trên 20% free float thường được xem là cao và dễ tạo biến động mạnh khi có tin tốt.',
        labels: ['Mã A', 'Mã B', 'Mã C'],
        series: [{ name: 'Short interest', color: '#ff5d73', values: [15, 8, 22] }]
      }
    },
    {
      id: 'credit_spread', category: 'concepts', level: 'Trung bình', title: 'Credit spread — phần bù rủi ro của trái phiếu doanh nghiệp',
      subtitle: 'Nhà đầu tư đòi thêm bao nhiêu để nắm trái phiếu thay vì trái phiếu chính phủ?',
      formula: 'Credit spread = Lợi suất trái phiếu doanh nghiệp − Lợi suất trái phiếu chính phủ cùng kỳ hạn',
      summary: 'Chênh lệch lợi suất phản ánh rủi ro vỡ nợ và thanh khoản. Spread mở rộng thường báo hiệu lo ngại về nền kinh tế.',
      detail: 'Trái phiếu xếp hạng thấp có spread cao hơn. Khi thị trường căng thẳng, nhà đầu tư bán trái phiếu rủi ro và mua trái phiếu chính phủ, khiến spread mở rộng nhanh. Spread thu hẹp quá mức có thể là dấu hiệu thị trường đang xem nhẹ rủi ro.',
      example: 'Trái phiếu doanh nghiệp BBB kỳ hạn 5 năm có lợi suất 9,5%, TPCP 5 năm 6,0% → credit spread 3,5 điểm %.',
      tags: ['trái phiếu', 'rủi ro tín dụng', 'spread'], related: ['credit_risk', 'yield_curve', 'duration'],
      metrics: [
        { label: 'Lợi suất doanh nghiệp', value: '9,5%', hint: 'BBB, 5 năm' },
        { label: 'Lợi suất TPCP', value: '6,0%', hint: '5 năm' },
        { label: 'Credit spread', value: '3,5 điểm %', hint: '350 bps' },
        { label: 'Xếp hạng', value: 'BBB', hint: 'Dưới trung bình' }
      ],
      visual: {
        kind: 'line', title: 'Credit spread theo xếp hạng tín nhiệm', unit: 'điểm %',
        note: 'Xếp hạng càng thấp, phần bù rủi ro càng cao. Khi kinh tế suy yếu, toàn bộ đường cong dịch lên.',
        labels: ['AAA', 'AA', 'A', 'BBB', 'BB'],
        series: [{ name: 'Spread', color: '#ff9f43', values: [1.2, 1.6, 2.2, 3.5, 5.8] }]
      }
    },
    {
      id: 'home_bias', category: 'concepts', level: 'Cơ bản', title: 'Home bias — thiên lệch về thị trường quê nhà',
      subtitle: 'Vì sao nhà đầu tư thường giữ quá nhiều cổ phiếu trong nước?',
      formula: 'Tỷ trọng nhà = Tỷ trọng danh mục trong nước / Tỷ trọng vốn hoá toàn cầu',
      summary: 'Xu hướng ưu tiên doanh nghiệp quen thuộc khiến danh mục thiếu đa dạng và chịu rủi ro tập trung quốc gia.',
      detail: 'Nhà đầu tư cảm thấy an tâm với thương hiệu mình biết, nhưng thị trường nội địa chỉ chiếm một phần nhỏ vốn hoá toàn cầu. Hậu quả là danh mục phụ thuộc vào một nền kinh tế, một đồng tiền và một chu kỳ chính sách. Giảm home bias không có nghĩa là bỏ hết cổ phiếu trong nước.',
      example: 'Danh mục 85% cổ phiếu Việt Nam trong khi Việt Nam chỉ chiếm khoảng 1–2% vốn hoá toàn cầu cho thấy mức tập trung rất cao.',
      tags: ['đa dạng hoá', 'tâm lý', 'phân bổ'], related: ['mpt', 'behavioral', 'correlation'],
      metrics: [
        { label: 'Tỷ trọng nội địa', value: '85%', hint: 'Danh mục' },
        { label: 'Vốn hoá toàn cầu', value: '≈ 1,5%', hint: 'Việt Nam' },
        { label: 'Mức thiên lệch', value: '≈ 57x', hint: '85 / 1,5' },
        { label: 'Rủi ro chính', value: 'Tập trung quốc gia', hint: 'Một chu kỳ' }
      ],
      visual: {
        kind: 'bar', title: 'Tỷ trọng danh mục và tỷ trọng vốn hoá toàn cầu', unit: '%',
        note: 'Chênh lệch lớn giữa hai cột cho thấy mức độ tập trung vào thị trường quê nhà.',
        labels: ['Danh mục thực tế', 'Vốn hoá toàn cầu'],
        series: [{ name: 'Việt Nam', color: '#b59cff', values: [85, 1.5] }]
      }
    },
    {
      id: 'anchoring', category: 'concepts', level: 'Cơ bản', title: 'Anchoring — bám vào một mức giá vô nghĩa',
      subtitle: '“Tôi mua ở 100, phải đợi lên 100 mới bán” là một cái bẫy.',
      formula: 'Quyết định bị neo vào giá mua, giá đỉnh cũ hoặc một con số bất kỳ',
      summary: 'Con người dùng một con số đầu tiên làm mốc tham chiếu, rồi điều chỉnh quanh đó dù mốc ấy không liên quan đến giá trị hiện tại.',
      detail: 'Giá mua của bạn không ảnh hưởng đến tương lai doanh nghiệp. Nếu luận điểm đầu tư đã sai, giữ để “về bờ” chỉ làm tăng rủi ro cơ hội. Cách chống neo: viết ra giá trị hợp lý độc lập, xem lại luận điểm, và hỏi “nếu hôm nay không có vị thế này, tôi có mua lại ở giá hiện tại không?”.',
      example: 'Mua ở 100, giá xuống 70, giá trị thật chỉ còn 60. Chờ về 100 là chờ một mốc không còn cơ sở, trong khi tiền đang bị giữ ở tài sản kém.',
      tags: ['tâm lý', 'giá mua', 'kỷ luật'], related: ['behavioral', 'prospect_theory', 'margin_of_safety'],
      metrics: [
        { label: 'Giá mua', value: '100.000 ₫', hint: 'Neo ban đầu' },
        { label: 'Giá trị thật', value: '72.000 ₫', hint: 'Ước tính' },
        { label: 'Giá hiện tại', value: '65.000 ₫', hint: 'Thị trường' },
        { label: 'Khoảng cách về bờ', value: '+54%', hint: 'Cần tăng' }
      ],
      visual: {
        kind: 'bar', title: 'Ba mốc giá thường bị neo', unit: 'nghìn đồng',
        note: 'Giá mua chỉ là ký ức; giá trị doanh nghiệp và giá hiện tại mới là thứ cần so sánh.',
        labels: ['Giá mua', 'Giá trị thật', 'Giá hiện tại'],
        series: [{ name: 'Mức giá', color: '#ff5d73', values: [100, 72, 65] }]
      }
    }
  ];
  LIBRARY.push.apply(LIBRARY, LIBRARY_V13_ADDITIONS);

  /* ------------------------- FALLBACK NEWS / CALENDAR ------------------------- */
  const FALLBACK_NEWS = [
    { title: 'Chào mừng bạn đến với AURELIS Markets — phòng tập đầu tư của riêng bạn', source: 'AURELIS', time: new Date(Date.now() - 18 * 60000).toISOString(), desc: 'Vốn ảo, giá thật, kỹ năng thật. Bắt đầu với danh mục nhỏ và xây dựng kỷ luật từng ngày.', link: '#/academy', image: '' },
    { title: 'HOSE mở cửa 09:00 — phiên sáng thường quyết định tâm lý cả ngày', source: 'AURELIS Desk', time: new Date(Date.now() - 52 * 60000).toISOString(), desc: 'Nhóm cổ phiếu ngân hàng và chứng khoán thường dẫn dắt dòng tiền buổi sáng.', link: '#/markets', image: '' },
    { title: 'Bitcoin giao dịch 24/7: quản trị rủi ro quan trọng hơn dự báo giá', source: 'AURELIS Desk', time: new Date(Date.now() - 2 * 3600000).toISOString(), desc: 'Đòn bẩy cao trong crypto có thể thanh lý vị thế chỉ với vài phần trăm biến động.', link: '#/crypto', image: '' },
    { title: 'Cách AURELIS tính điểm kỹ thuật: MA, RSI, MACD và động lượng', source: 'Học viện AURELIS', time: new Date(Date.now() - 4 * 3600000).toISOString(), desc: 'Mở Phòng phân tích, chọn Technical Analysis để xem tổng hợp tín hiệu từ dữ liệu nến thật.', link: '#/analysis', image: '' },
    { title: 'Nhiệm vụ hôm nay: thử vẽ Fibonacci trên một mã bạn đang quan tâm', source: 'AURELIS Quest', time: new Date(Date.now() - 6 * 3600000).toISOString(), desc: 'Công cụ vẽ nằm trong Biểu đồ & Giao dịch. Hoàn thành để nhận Aura và XP.', link: '#/terminal', image: '' }
  ];

  const CALENDAR = [
    { offset: 0, time: '09:00', title: 'Mở cửa phiên HOSE', region: 'Việt Nam', importance: 'medium' },
    { offset: 0, time: '14:45', title: 'Đóng cửa phiên HOSE (ATC)', region: 'Việt Nam', importance: 'medium' },
    { offset: 1, time: '19:00', title: 'Dự trữ dầu thô EIA', region: 'Mỹ', importance: 'high' },
    { offset: 2, time: '19:30', title: 'Số đơn xin trợ cấp thất nghiệp', region: 'Mỹ', importance: 'medium' },
    { offset: 4, time: '20:30', title: 'Bảng lương phi nông nghiệp (NFP)', region: 'Mỹ', importance: 'high' },
    { offset: 6, time: '01:00', title: 'Công bố lãi suất Fed (dự kiến)', region: 'Mỹ', importance: 'high' },
    { offset: 8, time: '09:00', title: 'Đáo hạn hợp đồng VN30F', region: 'Việt Nam', importance: 'high' }
  ];

  /* ------------------------- SEEDED DEMO CANDLES ------------------------- */
  const TF_MS = {
    '1m': 60000, '5m': 300000, '15m': 900000, '1H': 3600000,
    '4H': 14400000, '1D': 86400000, '1W': 604800000
  };
  const TF_MINUTES = { '1m': 1, '5m': 5, '15m': 15, '1H': 60, '4H': 240, '1D': 1440, '1W': 10080 };
  const TF_VOL = { '1D': 1, '1W': 2.4 };

  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function baseVol(asset) {
    switch (asset.group) {
      case 'crypto': return 0.031;
      case 'derivatives': return asset.currency === 'PTS' ? 0.019 : 0.032;
      case 'us': return 0.017;
      case 'etf': return 0.012;
      case 'hose': return 0.013;
      case 'hnx': return 0.018;
      case 'upcom': return 0.022;
      case 'forex': return 0.0035;
      case 'commodity': return 0.014;
      case 'index': return 0.009;
      default: return 0.012;
    }
  }

  /**
   * Sinh nến demo tất định, kết thúc đúng tại asset.price.
   * Dùng khi chưa có server dữ liệu thật hoặc tài sản chỉ mô phỏng.
   */
  function generateCandles(asset, tf, count, endPrice, endTime) {
    tf = tf || '1D';
    count = count || 220;
    const end = endPrice != null ? endPrice : asset.price;
    const rand = mulberry32(hash32(asset.id + '|' + tf + '|' + new Date().toISOString().slice(0, 10)));
    const dailyVol = baseVol(asset);
    const minutes = TF_MINUTES[tf] || 1440;
    const vol = Math.max(0.0012, dailyVol * Math.sqrt(minutes / 1440));
    const drift = (rand() - 0.48) * vol * 0.11;
    const closes = new Array(count);
    let p = end;
    for (let i = count - 1; i >= 0; i--) {
      closes[i] = p;
      const shock = (rand() - 0.5) * 2 * vol + drift;
      p = Math.max(p / (1 + shock), 0.00000001);
    }
    const step = TF_MS[tf] || TF_MS['1D'];
    const now = endTime || Date.now();
    const candles = [];
    let t = now - step * (count - 1);
    for (let i = 0; i < count; i++) {
      const close = closes[i];
      const open = i === 0 ? close * (1 - vol * 0.3) : closes[i - 1];
      const hi = Math.max(open, close) * (1 + rand() * vol * 0.55);
      const lo = Math.min(open, close) * (1 - rand() * vol * 0.55);
      const vFactor = 0.35 + rand() * 1.5;
      candles.push({
        t: Math.floor(t / 1000),
        o: open, h: hi, l: lo, c: close,
        v: Math.max(1, (asset.avgVolume || 100000) * vFactor * (minutes / 1440 < 1 ? 0.1 : 1))
      });
      // Bỏ qua cuối tuần với nến ngày/tuần của thị trường chứng khoán
      let next = t + step;
      if ((tf === '1D' || tf === '1W') && !['crypto', 'forex', 'derivatives'].includes(asset.group)) {
        if (tf === '1D') {
          while (new Date(next).getDay() === 0 || new Date(next).getDay() === 6) next += step;
        }
      }
      t = next;
    }
    const last = candles[candles.length - 1];
    last.c = end;
    last.h = Math.max(last.h, end);
    last.l = Math.min(last.l, end);
    return candles;
  }

  function generateSpark(asset, points) {
    points = points || 28;
    const rand = mulberry32(hash32(asset.id + 'spark' + new Date().toISOString().slice(0, 10)));
    const vol = baseVol(asset) * 0.55;
    const out = [];
    let p = asset.prev;
    for (let i = 0; i < points - 1; i++) {
      p *= 1 + (rand() - 0.5) * 2 * vol;
      out.push(p);
    }
    out.push(asset.price);
    return out;
  }

  /* ------------------------- COMPANY ANALYSIS ------------------------- */
  const COMPANY_GROUPS = ['hose', 'upcom', 'us', 'etf'];
  const COMPANY_PEER_LIMIT = 5;
  const COMPANY_SECTOR_LABELS = {
    Technology: 'Công nghệ', 'Financial Services': 'Tài chính', Healthcare: 'Y tế',
    'Consumer Cyclical': 'Tiêu dùng chu kỳ', 'Consumer Defensive': 'Tiêu dùng phòng thủ',
    'Communication Services': 'Truyền thông', Industrials: 'Công nghiệp',
    Energy: 'Năng lượng', 'Basic Materials': 'Nguyên vật liệu', 'Real Estate': 'Bất động sản',
    Utilities: 'Tiện ích', 'S&P 500': 'Chỉ số lớn', 'Nasdaq 100': 'Công nghệ tăng trưởng',
    'Trái phiếu Mỹ': 'Trái phiếu', 'Thị trường mới nổi': 'Thị trường mới nổi',
    'Ngân hàng': 'Ngân hàng', 'Thép': 'Thép',
    'Tiêu dùng': 'Tiêu dùng', 'Bán lẻ': 'Bán lẻ',
    'Chứng khoán': 'Chứng khoán', 'Đồ uống': 'Đồ uống',
    'Điện': 'Điện', 'Hoá chất': 'Hoá chất', 'Khí đốt': 'Khí đốt',
    'Logistics': 'Logistics', 'Khu công nghiệp': 'Khu công nghiệp',
    'Nhựa': 'Nhựa', 'Vận tải biển': 'Vận tải biển', 'Xây dựng': 'Xây dựng',
    'Xi măng': 'Xi măng', 'Nông nghiệp': 'Nông nghiệp', 'Phân bón': 'Phân bón',
    'Dầu khí': 'Dầu khí', 'Thủy sản': 'Thủy sản', 'Dệt may': 'Dệt may',
    'Bảo hiểm': 'Bảo hiểm', 'Hạ tầng': 'Hạ tầng', 'Cơ khí': 'Cơ khí',
    'Cao su': 'Cao su', 'Cơ điện': 'Cơ điện', 'Vật liệu': 'Vật liệu',
    'Bán dẫn': 'Bán dẫn', 'Xe điện': 'Xe điện', 'Mạng xã hội': 'Mạng xã hội',
    'Giải trí': 'Giải trí', 'Crypto': 'Crypto', 'Thanh toán': 'Thanh toán',
    'Hàng không vũ trụ': 'Hàng không vũ trụ', 'AI / Phần mềm': 'AI / Phần mềm',
    'Gọi xe': 'Gọi xe', 'Phần mềm': 'Phần mềm', 'Thương mại điện tử': 'Thương mại điện tử',
    'Dược phẩm': 'Dược phẩm', 'Gaming': 'Gaming',
    'Máy chủ AI': 'Máy chủ AI', 'Lượng tử': 'Lượng tử', 'Fintech': 'Fintech'
  };

  const COMPANY_PEER_OVERRIDES = {
    'VNM.VN': ['MSN.VN', 'SAB.VN', 'MWG.VN', 'PNJ.VN', 'FRT.VN'],
    'VCB.VN': ['BID.VN', 'CTG.VN', 'TCB.VN', 'MBB.VN', 'ACB.VN'],
    'TCB.VN': ['VCB.VN', 'BID.VN', 'CTG.VN', 'VPB.VN', 'MBB.VN'],
    'BID.VN': ['VCB.VN', 'CTG.VN', 'TCB.VN', 'VPB.VN', 'HDB.VN'],
    'CTG.VN': ['VCB.VN', 'BID.VN', 'TCB.VN', 'MBB.VN', 'LPB.VN'],
    'VIC.VN': ['VHM.VN', 'VRE.VN', 'KDH.VN', 'NVL.VN', 'DXG.VN'],
    'VHM.VN': ['VIC.VN', 'VRE.VN', 'KDH.VN', 'NLG.VN', 'DXG.VN'],
    'HPG.VN': ['HSG.VN', 'NKG.VN', 'DGC.VN', 'GVR.VN', 'HT1.VN'],
    'FPT.VN': ['SSI.VN', 'VCI.VN', 'HCM.VN', 'MWG.VN', 'REE.VN'],
    'MWG.VN': ['PNJ.VN', 'FRT.VN', 'VRE.VN', 'MSN.VN', 'SAB.VN'],
    'SSI.VN': ['VND.VN', 'VCI.VN', 'HCM.VN', 'TCB.VN', 'MBB.VN'],
    'VND.VN': ['SSI.VN', 'VCI.VN', 'HCM.VN', 'TCB.VN', 'VPB.VN'],
    'MSN.VN': ['VNM.VN', 'SAB.VN', 'MWG.VN', 'PNJ.VN', 'FRT.VN'],
    'PNJ.VN': ['MWG.VN', 'FRT.VN', 'VRE.VN', 'MSN.VN', 'SAB.VN'],
    'GAS.VN': ['PLX.VN', 'POW.VN', 'PVD.VN', 'PVT.VN', 'BSR.VN'],
    'PLX.VN': ['GAS.VN', 'POW.VN', 'PVD.VN', 'PVT.VN', 'BSR.VN'],
    'PVD.VN': ['PVS.VN', 'BSR.VN', 'OIL.VN', 'GAS.VN', 'PLX.VN'],
    'AAPL': ['MSFT', 'GOOGL', 'NVDA', 'AMZN', 'META'],
    'MSFT': ['AAPL', 'GOOGL', 'ORCL', 'CRM', 'ADBE'],
    'NVDA': ['AMD', 'AVGO', 'QCOM', 'MU', 'ARM'],
    'GOOGL': ['META', 'MSFT', 'AAPL', 'AMZN', 'NFLX'],
    'META': ['GOOGL', 'NFLX', 'MSFT', 'AAPL', 'RBLX'],
    'AMZN': ['WMT', 'SHOP', 'GOOGL', 'MSFT', 'AAPL'],
    'TSLA': ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL'],
    'JPM': ['GS', 'BAC', 'V', 'PYPL', 'BRK-B'],
    'KO': ['PEP', 'SBUX', 'MCD', 'WMT', 'NKE'],
    'XOM': ['CAT', 'GE', 'BA', 'JPM', 'GS'],
    'V': ['PYPL', 'JPM', 'GS', 'BAC', 'BRK-B'],
    'UNH': ['LLY', 'JPM', 'GS', 'V', 'BRK-B'],
    'COIN': ['MSTR', 'HOOD', 'PYPL', 'V', 'JPM']
  };

  /* ==================== v1.12: PRIME · ĐẦU TƯ THỰC ==================== */
  /* Tài khoản PRIME tách khỏi ví giao dịch nhanh. Số liệu vẫn là mô phỏng,
     nhưng cơ chế lệnh, phí, thuế, biên giá và T+2 được nén để luyện tập. */
  const PRIME_PROFILES = [
    {
      id: 'conservative', name: 'Thận trọng', icon: '🛡️', color: '#2ee6a6',
      desc: 'Bảo toàn vốn là ưu tiên. Chỉ HOSE và ETF, hạn mức nhỏ, ít lệnh mỗi ngày.',
      minDeposit: 20000000, maxPositionPct: 15, maxOrderPct: 10, maxTurnoverX: 1.5,
      groups: ['hose', 'etf'], universe: 'HOSE · ETF'
    },
    {
      id: 'balanced', name: 'Cân bằng', icon: '⚖️', color: '#5ac8fa',
      desc: 'Kết hợp cổ phiếu Việt Nam, chứng khoán Mỹ và ETF với hạn mức vừa phải.',
      minDeposit: 50000000, maxPositionPct: 25, maxOrderPct: 18, maxTurnoverX: 2.5,
      groups: ['hose', 'hnx', 'us', 'etf'], universe: 'HOSE · HNX · US · ETF'
    },
    {
      id: 'growth', name: 'Tăng trưởng', icon: '🚀', color: '#f3c56b',
      desc: 'Mở rộng sang UPCoM và cổ phiếu tăng trưởng Mỹ. Hạn mức cao hơn, rủi ro lớn hơn.',
      minDeposit: 100000000, maxPositionPct: 40, maxOrderPct: 30, maxTurnoverX: 4,
      groups: ['hose', 'hnx', 'upcom', 'us', 'etf'], universe: 'HOSE · HNX · UPCoM · US · ETF'
    }
  ];

  const PRIME_BANDS = { hose: 0.07, hnx: 0.10, upcom: 0.15, etf: 0.10, us: 0.25 };
  const PRIME_SETTLE_LABEL = 'T+2 nén · 2 phút';

  /* ==================== v1.12: AURELIS ARCADE ==================== */
  const ARCADE_MODES = [
    {
      id: 'deal', name: 'Deal Room', tag: 'M&A', icon: '🤝', color: '#b59cff', entry: 2000000,
      tagline: 'Đàm phán, thẩm định và chốt một thương vụ mua bán doanh nghiệp.',
      desc: 'Bạn là MD của một quỹ M&A. Chọn mục tiêu, định giá, thẩm định và cấu trúc thanh toán. Thương vụ có thể bị từ chối — và bài học nằm ở đó.',
      metric: 'dealWins', reward: 'Thù lao 50.000 ₫ mỗi tỷ giá trị tạo ra · 0,25–20 triệu ₫'
    },
    {
      id: 'fund', name: 'Hedge Fund Tycoon', tag: 'Vĩ mô', icon: '📊', color: '#5ac8fa', entry: 1000000,
      tagline: 'Phân bổ vốn qua 5 chế độ thị trường và bảo vệ alpha.',
      desc: 'Quản lý quỹ 100 tỷ ₫ ảo. Mỗi vòng là một chế độ kinh tế mới; hãy chia vốn giữa cổ phiếu, trái phiếu, vàng và tiền mặt để tối đa hoá lợi nhuận có điều chỉnh rủi ro.',
      metric: 'fundBest', reward: 'Thưởng 1×–5× phí vào cửa theo lợi nhuận 5 vòng'
    },
    {
      id: 'startup', name: 'Startup Studio', tag: 'Venture', icon: '🚀', color: '#2ee6a6', entry: 1500000,
      tagline: 'Chọn startup, đi qua 6 biến cố và tìm đường exit.',
      desc: 'Bạn là GP của một quỹ venture. Mỗi quyết định về vòng gọi vốn, tăng trưởng và đốt tiền đều thay đổi tỷ lệ sở hữu và định giá cuối cùng.',
      metric: 'startupExits', reward: 'Carry = phí vào cửa × bội số exit, tối đa 8×'
    },
    {
      id: 'duel', name: 'Candle Duel', tag: 'PvP', icon: '🕯️', color: '#ff9f43', entry: 500000,
      tagline: 'Đấu 5 vòng đọc nến với bot trên dữ liệu thật.',
      desc: 'Mỗi vòng hiển thị 20 nến thật. Bạn và bot cùng đoán nến kế tiếp tăng hay giảm. Ai đúng nhiều hơn sẽ thắng — bot càng khó, thưởng càng cao.',
      metric: 'duelWins', reward: 'Thắng nhận thưởng của bot · hoà hoàn 50% phí vào cửa'
    }
  ];

  const DEAL_TARGETS = [
    {
      id: 'greenlog', name: 'GreenLog Logistics', sector: 'Logistics', icon: '🚚', color: '#2ee6a6',
      revenue: 820, margin: 14, growth: 18, askEV: 1450, debt: 120, risk: 'Thấp', fairMultiple: 9,
      synergy: 160, integration: 70, story: 'Mạng lưới kho lạnh và giao hàng nông sản phía Nam. Ban lãnh đạo muốn bán để mở rộng sang Đông Nam Á.'
    },
    {
      id: 'medcare', name: 'MedCare Clinic', sector: 'Y tế', icon: '🏥', color: '#5ac8fa',
      revenue: 540, margin: 22, growth: 12, askEV: 1350, debt: 60, risk: 'Thấp', fairMultiple: 12,
      synergy: 130, integration: 50, story: 'Chuỗi phòng khám đa khoa có thương hiệu mạnh. Giá chào bán thấp hơn định giá chuẩn ngành, nhưng cần kiểm tra nợ phải trả.'
    },
    {
      id: 'finpay', name: 'FinPay Wallet', sector: 'Fintech', icon: '💳', color: '#b59cff',
      revenue: 360, margin: 18, growth: 34, askEV: 1150, debt: 40, risk: 'Cao', fairMultiple: 15,
      synergy: 190, integration: 95, story: 'Ví điện tử tăng trưởng nhanh nhưng chi phí tuân thủ cao. Một khoản trách nhiệm pháp lý có thể chưa được ghi đủ trong hồ sơ.'
    },
    {
      id: 'urbanfit', name: 'UrbanFit Retail', sector: 'Bán lẻ', icon: '👟', color: '#ff8fb1',
      revenue: 1200, margin: 9, growth: 6, askEV: 690, debt: 180, risk: 'Trung bình', fairMultiple: 7,
      synergy: 90, integration: 40, story: 'Chuỗi thời trang thể thao có mặt bằng đẹp nhưng biên mỏng. Cơ hội nằm ở việc cắt giảm chi phí vận hành, không phải tăng trưởng.'
    },
    {
      id: 'rice', name: 'Mekong Rice Export', sector: 'Nông nghiệp', icon: '🌾', color: '#9ccc65',
      revenue: 950, margin: 12, growth: 9, askEV: 980, debt: 140, risk: 'Trung bình', fairMultiple: 8,
      synergy: 120, integration: 60, story: 'Nhà xuất khẩu gạo ổn định với hợp đồng dài hạn. Rủi ro chính là tỷ giá và thời tiết; định giá cần tính chu kỳ hàng hoá.'
    },
    {
      id: 'clouddesk', name: 'CloudDesk SaaS', sector: 'SaaS', icon: '☁️', color: '#6cb8ff',
      revenue: 280, margin: 24, growth: 30, askEV: 1300, debt: 20, risk: 'Cao', fairMultiple: 18,
      synergy: 210, integration: 85, story: 'Nền tảng quản lý công việc cho doanh nghiệp vừa. Tăng trưởng tốt nhưng phụ thuộc vào vài khách hàng lớn.'
    },
    {
      id: 'brightedu', name: 'BrightEdu Academy', sector: 'Giáo dục', icon: '🎓', color: '#ffd166',
      revenue: 460, margin: 19, growth: 14, askEV: 820, debt: 30, risk: 'Thấp', fairMultiple: 10,
      synergy: 100, integration: 35, story: 'Mạng lưới trung tâm luyện thi có thương hiệu tại 3 thành phố. Cơ hội cộng hưởng với nền tảng học trực tuyến của bạn.'
    },
    {
      id: 'volt', name: 'VoltGrid Storage', sector: 'Năng lượng', icon: '🔋', color: '#f3c56b',
      revenue: 610, margin: 16, growth: 26, askEV: 1250, debt: 210, risk: 'Cao', fairMultiple: 11,
      synergy: 175, integration: 90, story: 'Hệ thống pin lưu trữ cho các dự án điện mặt trời. Định giá hấp dẫn nhưng phụ thuộc chính sách và tiến độ giải ngân.'
    }
  ];

  const FUND_CLASSES = [
    { id: 'stocks', name: 'Cổ phiếu', icon: '📈', color: '#2ee6a6', desc: 'Tăng trưởng cao, biến động mạnh theo chu kỳ.' },
    { id: 'bonds', name: 'Trái phiếu', icon: '🏛️', color: '#5ac8fa', desc: 'Thu nhập ổn định, nhạy với lãi suất.' },
    { id: 'gold', name: 'Vàng', icon: '🪙', color: '#f3c56b', desc: 'Hàng rào lạm phát và bất ổn địa chính trị.' },
    { id: 'cash', name: 'Tiền mặt', icon: '💵', color: '#94a3b8', desc: 'Thanh khoản cao, gần như không biến động.' }
  ];

  const FUND_REGIMES = [
    { id: 'boom', name: 'Tăng trưởng mạnh', icon: '🚀', hint: 'Lợi nhuận doanh nghiệp tăng, khẩu vị rủi ro cao. Cổ phiếu thường dẫn dắt.', returns: { stocks: 12, bonds: 2, gold: -1, cash: 1 } },
    { id: 'inflation', name: 'Lạm phát cao', icon: '🔥', hint: 'Giá cả leo thang, lãi suất bị đẩy lên. Vàng và tài sản thực thường được ưa chuộng.', returns: { stocks: 3, bonds: -4, gold: 10, cash: 0 } },
    { id: 'recession', name: 'Suy thoái', icon: '🧊', hint: 'Tăng trưởng âm, nhà đầu tư tìm nơi trú ẩn. Trái phiếu chất lượng cao và tiền mặt an toàn hơn.', returns: { stocks: -12, bonds: 6, gold: 4, cash: 1 } },
    { id: 'ratecut', name: 'Lãi suất giảm', icon: '✂️', hint: 'Ngân hàng trung ương nới lỏng. Cổ phiếu tăng trưởng và trái phiếu dài hạn hưởng lợi.', returns: { stocks: 9, bonds: 5, gold: 2, cash: 0 } },
    { id: 'shock', name: 'Cú sốc thanh khoản', icon: '⚡', hint: 'Dòng vốn rút đột ngột, tương quan tăng vọt. Tiền mặt và vàng là phòng tuyến.', returns: { stocks: -18, bonds: -2, gold: 8, cash: 2 } },
    { id: 'recovery', name: 'Phục hồi', icon: '🌱', hint: 'Niềm tin quay lại sau suy thoái. Cổ phiếu chu kỳ thường bật mạnh từ đáy.', returns: { stocks: 14, bonds: 1, gold: -2, cash: 0 } }
  ];

  const STARTUP_IDEAS = [
    { id: 'eduspark', name: 'EduSpark AI', sector: 'EdTech', icon: '🧠', color: '#5ac8fa', arr: 12, growth: 0.18, burn: 1.4, cash: 9, valuation: 150, story: 'Gia sư AI cá nhân hoá cho học sinh phổ thông. Sản phẩm được giáo viên đón nhận nhưng chi phí mô hình còn cao.' },
    { id: 'medlink', name: 'MedLink Care', sector: 'HealthTech', icon: '🩺', color: '#2ee6a6', arr: 8, growth: 0.22, burn: 1.2, cash: 7, valuation: 110, story: 'Nền tảng đặt khám và theo dõi bệnh nhân sau điều trị. Thị trường lớn nhưng bán hàng cho bệnh viện rất chậm.' },
    { id: 'agrimart', name: 'AgriMart', sector: 'AgriTech', icon: '🌾', color: '#9ccc65', arr: 20, growth: 0.12, burn: 1.8, cash: 11, valuation: 160, story: 'Sàn giao dịch nông sản nối hợp tác xã với nhà máy. Biên mỏng nhưng dòng tiền ổn định.' },
    { id: 'finmate', name: 'FinMate', sector: 'Fintech', icon: '💳', color: '#b59cff', arr: 15, growth: 0.25, burn: 2.1, cash: 8, valuation: 190, story: 'Trợ lý tài chính cá nhân dùng dữ liệu giao dịch. Tăng trưởng nhanh, cạnh tranh khốc liệt và chi phí tuân thủ lớn.' },
    { id: 'carbongrid', name: 'CarbonGrid', sector: 'Climate', icon: '🌍', color: '#4dd0e1', arr: 6, growth: 0.28, burn: 1.6, cash: 6, valuation: 120, story: 'Phần mềm đo dấu chân carbon cho doanh nghiệp sản xuất. Nhu cầu tăng nhanh nhờ quy định mới.' },
    { id: 'shopstack', name: 'ShopStack', sector: 'RetailTech', icon: '🛍️', color: '#ff8fb1', arr: 30, growth: 0.09, burn: 1.1, cash: 10, valuation: 140, story: 'Công cụ quản lý cửa hàng bán lẻ nhỏ. Đã có lãi gần hoà vốn nhưng tăng trưởng chậm.' }
  ];

  const STARTUP_EVENTS = [
    {
      id: 'vc_round', title: 'Quỹ đầu tư gõ cửa', icon: '📨',
      text: 'Một quỹ VC đề nghị đầu tư 15 tỷ ₫ cho 18% cổ phần. Bạn cần tiền để mở rộng, nhưng không muốn pha loãng quá nhiều.',
      options: [
        { label: 'Nhận vòng gọi vốn', effects: { cash: 15, equity: -0.18, valuationPct: 0.25, growth: 0.03 }, outcome: 'Bạn có thêm 15 tỷ ₫ và một đối tác chiến lược, đổi lại 18% cổ phần.' },
        { label: 'Thương lượng vòng nhỏ hơn', effects: { cash: 8, equity: -0.10, valuationPct: 0.12, growth: 0.01 }, outcome: 'Bạn nhận 8 tỷ ₫ cho 10% cổ phần. Ít tiền hơn nhưng giữ được quyền kiểm soát.' },
        { label: 'Từ chối, tự lực tăng trưởng', effects: { burnPct: -0.08, growth: -0.02, valuationPct: 0.03 }, outcome: 'Bạn giữ 100% cổ phần và siết chi phí. Tăng trưởng chậm lại nhưng không bị pha loãng.' }
      ]
    },
    {
      id: 'enterprise', title: 'Hợp đồng doanh nghiệp lớn', icon: '🏢',
      text: 'Một tập đoàn đề nghị hợp đồng 3 năm nhưng muốn độc quyền ngành và giảm giá 20%.',
      options: [
        { label: 'Chấp nhận độc quyền', effects: { arrPct: 0.35, growth: 0.05, valuationPct: 0.15, burnPct: 0.1 }, outcome: 'Doanh thu tăng vọt nhưng bạn phụ thuộc vào một khách hàng và mất biên lợi nhuận.' },
        { label: 'Ký không độc quyền', effects: { arrPct: 0.18, growth: 0.02, valuationPct: 0.06 }, outcome: 'Hợp đồng nhỏ hơn nhưng bạn vẫn tự do bán cho thị trường.' },
        { label: 'Từ chối', effects: { growth: 0.01, valuationPct: 0.02 }, outcome: 'Bạn bảo vệ biên lợi nhuận và tiếp tục xây kênh bán hàng đa dạng.' }
      ]
    },
    {
      id: 'infra', title: 'Chi phí hạ tầng tăng', icon: '🧾',
      text: 'Nhà cung cấp cloud tăng giá 30%. Đội kỹ thuật đề xuất tối ưu kiến trúc nhưng cần thời gian.',
      options: [
        { label: 'Tối ưu hạ tầng', effects: { burnPct: -0.18, growth: -0.03 }, outcome: 'Đốt tiền giảm đáng kể, đổi lại lộ trình sản phẩm chậm một nhịp.' },
        { label: 'Tăng giá khách hàng', effects: { arrPct: 0.08, growth: -0.02 }, outcome: 'Doanh thu tăng nhưng một số khách nhỏ rời đi.' },
        { label: 'Chấp nhận chi phí', effects: { burnPct: 0.15, growth: 0.02 }, outcome: 'Sản phẩm tiếp tục tăng tốc, nhưng runway ngắn lại.' }
      ]
    },
    {
      id: 'key_person', title: 'Nhân sự chủ chốt nghỉ việc', icon: '🚪',
      text: 'CTO - người xây toàn bộ kiến trúc - nộp đơn nghỉ việc để lập công ty riêng.',
      options: [
        { label: 'Giữ bằng cổ phần', effects: { equity: -0.04, growth: 0.02, valuationPct: 0.03 }, outcome: 'Bạn nhượng 4% cổ phần để giữ chân CTO. Hệ thống tiếp tục ổn định.' },
        { label: 'Tuyển CTO mới', effects: { cash: -2, growth: -0.02, valuationPct: -0.03 }, outcome: 'Mất 2 tỷ ₫ tuyển dụng và thời gian chuyển giao; sản phẩm chậm lại.' },
        { label: 'Để CTO ra đi', effects: { growth: -0.05, valuationPct: -0.06, burnPct: 0.05 }, outcome: 'Bạn tiết kiệm chi phí nhưng mất kiến thức cốt lõi và phải xây lại hệ thống.' }
      ]
    },
    {
      id: 'breach', title: 'Sự cố rò rỉ dữ liệu', icon: '🔐',
      text: 'Một lỗ hổng khiến dữ liệu của 20.000 người dùng có thể đã bị lộ. Báo chí đang liên hệ.',
      options: [
        { label: 'Công bố minh bạch', effects: { cash: -3, valuationPct: -0.08, growth: 0.02 }, outcome: 'Bạn chịu chi phí khắc phục nhưng giữ được niềm tin và xử lý trước khi leo thang.' },
        { label: 'Xử lý kín đáo', effects: { cash: -1, valuationPct: -0.2, growth: -0.03 }, outcome: 'Thông tin rò rỉ ra ngoài muộn hơn khiến khủng hoảng niềm tin nặng hơn.' },
        { label: 'Đổ lỗi cho nhà cung cấp', effects: { valuationPct: -0.14, growth: -0.02 }, outcome: 'Khách hàng không hài lòng với cách phản hồi và một số hợp đồng bị đình trệ.' }
      ]
    },
    {
      id: 'rival', title: 'Đối thủ tung sản phẩm mới', icon: '⚔️',
      text: 'Một đối thủ vừa gọi được vốn và ra mắt tính năng tương tự với giá thấp hơn.',
      options: [
        { label: 'Tăng marketing', effects: { burnPct: 0.2, growth: 0.06, arrPct: 0.1 }, outcome: 'Bạn giữ được đà tăng trưởng nhưng đốt tiền nhanh hơn.' },
        { label: 'Tập trung thị trường ngách', effects: { growth: 0.03, burnPct: -0.08, valuationPct: 0.04 }, outcome: 'Bạn rời cuộc đua đốt tiền, tập trung vào nhóm khách hàng trung thành.' },
        { label: 'Giảm giá để giữ khách', effects: { arrPct: -0.08, growth: 0.01, burnPct: 0.05 }, outcome: 'Khách ở lại nhưng biên lợi nhuận mỏng đi rõ rệt.' }
      ]
    },
    {
      id: 'expansion', title: 'Cơ hội mở rộng', icon: '🌏',
      text: 'Một đối tác phân phối tại Đông Nam Á đề nghị đưa sản phẩm sang 3 thị trường mới.',
      options: [
        { label: 'Mở rộng ngay', effects: { cash: -4, burnPct: 0.18, growth: 0.08, valuationPct: 0.12 }, outcome: 'Chi phí tăng nhưng bạn có thêm động lực tăng trưởng và câu chuyện mới cho nhà đầu tư.' },
        { label: 'Thí điểm một thị trường', effects: { cash: -1.5, growth: 0.03, valuationPct: 0.04 }, outcome: 'Bạn kiểm chứng mô hình với rủi ro thấp hơn.' },
        { label: 'Tạm hoãn', effects: { growth: 0.01, valuationPct: 0.01 }, outcome: 'Bạn giữ runway và chờ thời điểm phù hợp hơn.' }
      ]
    },
    {
      id: 'pricing', title: 'Thử nghiệm giá', icon: '🏷️',
      text: 'Đội sản phẩm đề xuất tăng giá 25% cho gói cao cấp. Chưa biết phản ứng khách hàng.',
      options: [
        { label: 'Tăng giá', effects: { arrPct: 0.2, growth: -0.02, burnPct: -0.02 }, outcome: 'Doanh thu trên mỗi khách tăng, một phần khách nhạy giá rời đi.' },
        { label: 'Giữ giá, thêm tính năng', effects: { cash: -1.2, growth: 0.03, valuationPct: 0.05 }, outcome: 'Bạn đầu tư vào sản phẩm để tăng giá trị thay vì tăng giá.' },
        { label: 'Thử nghiệm A/B', effects: { cash: -0.5, arrPct: 0.08, growth: 0.01 }, outcome: 'Dữ liệu thử nghiệm giúp bạn tăng giá chọn lọc và giữ chân khách.' }
      ]
    },
    {
      id: 'bridge', title: 'Cầu nối trước khi hết tiền', icon: '🌉',
      text: 'Runway chỉ còn vài tháng. Một nhà đầu tư cũ đề nghị khoản bridge 6 tỷ ₫ với điều khoản ưu tiên thanh lý.',
      options: [
        { label: 'Nhận bridge', effects: { cash: 6, equity: -0.12, valuationPct: -0.05 }, outcome: 'Bạn có thêm thời gian, nhưng điều khoản ưu tiên khiến cổ đông thường chịu thiệt nếu exit thấp.' },
        { label: 'Cắt chi phí mạnh', effects: { burnPct: -0.28, growth: -0.05 }, outcome: 'Bạn sống sót bằng cách thu nhỏ đội ngũ; tăng trưởng chậm lại.' },
        { label: 'Bán tài sản không cốt lõi', effects: { cash: 3, burnPct: -0.05, valuationPct: -0.02 }, outcome: 'Bạn có thêm tiền mặt nhưng mất một số năng lực phụ trợ.' }
      ]
    },
    {
      id: 'acquihire', title: 'Đề nghị mua lại sớm', icon: '💼',
      text: 'Một tập đoàn muốn mua lại startup với giá 240 tỷ ₫. Đây chưa phải exit mơ ước nhưng là khoản tiền chắc chắn.',
      options: [
        { label: 'Từ chối, tiếp tục xây', effects: { growth: 0.04, valuationPct: 0.08 }, outcome: 'Bạn chọn con đường dài hạn. Đội ngũ có thêm động lực chứng minh giá trị.' },
        { label: 'Đàm phán giá cao hơn', effects: { valuationPct: 0.12, growth: -0.01, cash: -1 }, outcome: 'Quá trình đàm phán kéo dài, bạn phải dùng thêm tiền tư vấn nhưng định giá được đẩy lên.' },
        { label: 'Chấp nhận bán', effects: {}, earlyExit: 240, outcome: 'Bạn bán công ty sớm. Đây là một exit thực tế, không phải giấc mơ kỳ lân.' }
      ]
    },
    {
      id: 'talent', title: 'Cuộc chiến nhân tài', icon: '🧑‍💻',
      text: 'Một công ty lớn đang săn nhân viên của bạn với mức lương gấp đôi.',
      options: [
        { label: 'Tăng lương và ESOP', effects: { burnPct: 0.14, equity: -0.05, growth: 0.04 }, outcome: 'Bạn giữ được đội ngũ cốt lõi bằng tiền mặt và cổ phần.' },
        { label: 'Tuyển người mới thay thế', effects: { cash: -1.5, growth: -0.03, burnPct: 0.03 }, outcome: 'Chi phí tuyển dụng và đào tạo tăng, sản phẩm chậm lại.' },
        { label: 'Văn hoá thay vì tiền', effects: { growth: 0.01, valuationPct: 0.02 }, outcome: 'Một số người ở lại vì sứ mệnh, một số ra đi. Văn hoá được định hình rõ hơn.' }
      ]
    },
    {
      id: 'press', title: 'Bài báo lớn', icon: '📰',
      text: 'Một tạp chí kinh doanh muốn viết bài về startup của bạn, nhưng cần số liệu tăng trưởng chi tiết.',
      options: [
        { label: 'Chia sẻ minh bạch', effects: { arrPct: 0.12, growth: 0.03, valuationPct: 0.06 }, outcome: 'Bài báo thu hút khách hàng và nhà đầu tư. Bạn có thêm áp lực minh bạch.' },
        { label: 'Chỉ chia sẻ chọn lọc', effects: { arrPct: 0.05, growth: 0.01, valuationPct: 0.02 }, outcome: 'Bài báo ít chi tiết hơn nhưng vẫn tạo nhận diện thương hiệu.' },
        { label: 'Từ chối phỏng vấn', effects: { growth: 0.01 }, outcome: 'Bạn giữ kín số liệu nhưng bỏ lỡ một cơ hội truyền thông miễn phí.' }
      ]
    }
  ];

  const DUEL_BOTS = [
    { id: 'pixel', name: 'Pixel Pup', icon: '🐶', color: '#5ac8fa', difficulty: 'Dễ', accuracy: 0.46, style: 'random', reward: 1200000, aura: 12, xp: 24, taunt: 'Nến xanh hay đỏ? Mình đoán theo cảm hứng!' },
    { id: 'trend', name: 'Trend Fox', icon: '🦊', color: '#f3c56b', difficulty: 'Trung bình', accuracy: 0.51, style: 'momentum', reward: 1600000, aura: 16, xp: 30, taunt: 'Xu hướng là bạn của ta. Đừng chống lại nến.' },
    { id: 'contrarian', name: 'Contrarian Owl', icon: '🦉', color: '#b59cff', difficulty: 'Khó', accuracy: 0.55, style: 'contrarian', reward: 2100000, aura: 20, xp: 38, taunt: 'Đám đông luôn sai ở đúng thời điểm.' },
    { id: 'quant', name: 'Quant Bot', icon: '🤖', color: '#2ee6a6', difficulty: 'Khó', accuracy: 0.59, style: 'quant', reward: 2800000, aura: 26, xp: 48, taunt: 'Xác suất 59% đủ để tôi thắng dài hạn.' },
    { id: 'oracle', name: 'Candle Oracle', icon: '🧙', color: '#ff9f43', difficulty: 'Điên rồ', accuracy: 0.65, style: 'pattern', reward: 3800000, aura: 34, xp: 62, taunt: 'Ta đọc được bóng nến trước khi nó hình thành.' }
  ];

  /* ------------------- v1.13: XƯỞNG COIN (MEME MARKET) -------------------
     Toàn bộ coin trong mục này là dữ liệu mô phỏng trong bộ nhớ trình duyệt.
     Không có token thật, không có ví thật và không kết nối blockchain. */
  const COIN_CREATE = {
    fee: 2000000,
    liquidity: 18000000,
    supply: 1000000000,
    creatorPct: 0.05,
    curvePct: 0.85,
    minBuy: 100000,
    maxBuy: 60000000,
    tradeFee: 0.01,
    rugMinAge: 10 * 60000,
    buybackMin: 2000000,
    buybackMax: 30000000,
    buybackCooldown: 180000,
    airdropCost: 400000,
    airdropCooldown: 120000,
    airdropMinPct: 1,
    airdropMaxPct: 20,
    lockCost: 350000,
    lockDuration: 15 * 60000,
    lockCooldown: 300000
  };

  const COIN_THEMES = [
    { id: 'dog', name: 'Chó & thú cưng', icon: '🐕', color: '#f3c56b', hype: 8, vol: 1.12 },
    { id: 'cat', name: 'Mèo & thú cưng', icon: '🐈', color: '#ff9f43', hype: 7, vol: 1.08 },
    { id: 'food', name: 'Đồ ăn', icon: '🥖', color: '#ffcf6b', hype: 5, vol: 0.95 },
    { id: 'drink', name: 'Đồ uống', icon: '🧋', color: '#2ee6a6', hype: 4, vol: 0.9 },
    { id: 'tech', name: 'Robot & AI', icon: '🤖', color: '#6cb8ff', hype: 9, vol: 1.2 },
    { id: 'nature', name: 'Cây cối & thiên nhiên', icon: '🪷', color: '#88e0a8', hype: 3, vol: 0.82 },
    { id: 'ghost', name: 'Bí ẩn', icon: '👻', color: '#b59cff', hype: 8, vol: 1.25 },
    { id: 'money', name: 'Vàng & tiền tệ', icon: '🪙', color: '#f3c56b', hype: 6, vol: 1.0 },
    { id: 'sport', name: 'Thể thao', icon: '⚽', color: '#5ac8fa', hype: 6, vol: 1.05 },
    { id: 'space', name: 'Mặt trăng & vũ trụ', icon: '🚀', color: '#c9a7ff', hype: 10, vol: 1.3 }
  ];

  const COIN_NAME_PARTS = {
    pre: ['Aura', 'Mèo', 'Cá', 'Bánh', 'Trà', 'Sắt', 'Sen', 'Ma', 'Vũ trụ', 'Rocket', 'Pixel', 'Vàng', 'Bạc', 'Mặt trăng', 'Sói', 'Gấu', 'Ếch', 'Gà', 'Heo', 'Rồng'],
    core: ['Doge', 'Vàng', 'Xanh', 'Mì', 'Đá', 'Pepé', 'Hồng', '404', 'Moon', 'Cat', 'Whale', 'Frog', 'Bear', 'Bull', 'Tôm', 'Cua', 'Bò', 'Gạo', 'Mắm', 'Bơ'],
    post: ['Coin', 'DAO', 'Token', 'Club', 'Army', 'Labs', 'Fi', 'X', 'Prime', '404']
  };

  const COIN_BOT_NAMES = [
    '0xLucky', 'CáVoiNhỏ', 'MèoNgủNgày', 'BánhMìKhôngThịt', 'TràĐáKhôngĐường',
    'VíSố7', 'NgườiQuanSát', 'BotKiênNhẫn', 'CôBaBánHàng', 'AnhTàiXế',
    'ChịHàngXóm', 'SinhViênNăm3', 'KẻTrộmNến', 'NhàĐầuTưTỉnhThức', '0xSleepy'
  ];

  const COIN_STARTERS = [
    { id: 'audoge', name: 'Aura Doge', ticker: 'AUDOGE', emoji: '🐕', theme: 'dog', color: '#f3c56b', tagline: 'Chú chó vàng của cộng đồng', creator: '@lucky_pup', supply: 1000000000, reserve: 160000000, holders: 1284, hype: 74, ageH: 31, vol: 1.1, desc: 'Không có roadmap, không có whitepaper. Chỉ có một chú chó vàng và niềm tin rằng nó sẽ đi xa.' },
    { id: 'meovang', name: 'Mèo Vàng', ticker: 'MEOVANG', emoji: '🐈', theme: 'cat', color: '#ff9f43', tagline: 'Mèo ngủ thì coin tăng', creator: '@meomeo', supply: 1000000000, reserve: 95000000, holders: 842, hype: 63, ageH: 52, vol: 1.0, desc: 'Coin của hội nuôi mèo. Giá tăng khi mèo ngủ, giảm khi mèo thức dậy và làm đổ ly nước.' },
    { id: 'bluewhale', name: 'Cá Voi Xanh', ticker: 'BLUEWHALE', emoji: '🐋', theme: 'money', color: '#5ac8fa', tagline: 'Đi theo dấu chân ví lớn', creator: '@whale_watcher', supply: 1000000000, reserve: 320000000, holders: 2310, hype: 81, ageH: 76, vol: 1.2, desc: 'Mỗi lần một ví lớn mua vào, cả ao lại xôn xao. Không ai biết ví đó là ai, kể cả người tạo coin.' },
    { id: 'banhmi', name: 'Bánh Mì Coin', ticker: 'BANHMI', emoji: '🥖', theme: 'food', color: '#ffcf6b', tagline: 'Neo vào ổ bánh mì buổi sáng', creator: '@tiembanhmiba', supply: 1000000000, reserve: 42000000, holders: 517, hype: 48, ageH: 19, vol: 0.9, desc: 'Không được bảo chứng bởi bất kỳ tiệm bánh mì nào. Nhưng ai cũng thấy nó rất thơm.' },
    { id: 'tradao', name: 'Trà Đá DAO', ticker: 'TRADAO', emoji: '🧋', theme: 'drink', color: '#2ee6a6', tagline: 'Quỹ trà đá của dân văn phòng', creator: '@tradaodao', supply: 1000000000, reserve: 18000000, holders: 236, hype: 41, ageH: 9, vol: 0.86, desc: 'Mọi quyết định được bình chọn trong nhóm chat. Thanh khoản được duy trì bằng niềm tin và những ly trà đá 5 nghìn.' },
    { id: 'ironpepe', name: 'Người Sắt', ticker: 'IRONPEPE', emoji: '🤖', theme: 'tech', color: '#6cb8ff', tagline: 'Robot tự nhận là Satoshi', creator: '@iron_pepe', supply: 1000000000, reserve: 210000000, holders: 1902, hype: 77, ageH: 64, vol: 1.15, desc: 'Một con bot tự nhận là Satoshi và trả lời mọi câu hỏi bằng meme. Cộng đồng thấy vậy là đủ.' },
    { id: 'senhong', name: 'Sen Hồng', ticker: 'SENHONG', emoji: '🪷', theme: 'nature', color: '#88e0a8', tagline: 'Bình yên, nhưng không ai bán', creator: '@senhong', supply: 1000000000, reserve: 7500000, holders: 148, hype: 26, ageH: 5, vol: 0.7, desc: 'Coin dành cho người thích sự bình yên. Biến động thấp, cộng đồng nhỏ, và một niềm tin rất khó giải thích.' },
    { id: 'ghost404', name: '404 Not Found', ticker: '404', emoji: '👻', theme: 'ghost', color: '#b59cff', tagline: 'Không website, không whitepaper', creator: '@ghost', supply: 1000000000, reserve: 60000000, holders: 1004, hype: 69, ageH: 43, vol: 1.3, desc: 'Không có website, không có whitepaper. Chỉ có một ticker và một giấc mơ. Đôi khi thế là đủ.' }
  ];

  const COIN_EVENTS = [
    { kind: 'up', weight: 5, hype: 5, text: 'Một KOL 800 nghìn follower vừa nhắc tên {name}. Cộng đồng bắt đầu hỏi mua.' },
    { kind: 'up', weight: 4, hype: 3, text: 'Một ví mới mua {amount} {ticker} trong một lệnh. Niềm tin tăng thêm một chút.' },
    { kind: 'up', weight: 4, hype: 4, text: 'Ảnh meme {ticker} lan truyền trong vài nhóm chat. Không có tin gì mới, nhưng giá vẫn nhích.' },
    { kind: 'up', weight: 3, hype: 6, text: 'Có tin đồn một sàn nhỏ sẽ niêm yết {ticker}. Chưa ai xác nhận, nhưng ai cũng muốn tin.' },
    { kind: 'up', weight: 3, hype: 2, text: 'Cộng đồng lập quỹ mua {ticker}. Quỹ chưa có tiền, nhưng tinh thần rất cao.' },
    { kind: 'up', weight: 2, hype: 7, text: 'Một tài khoản lớn đổi avatar sang {emoji}. Cộng đồng coi đó là tín hiệu.' },
    { kind: 'down', weight: 5, hype: -5, text: 'Một ví lớn bán ra {amount} {ticker}. Giá trượt trong vài phút.' },
    { kind: 'down', weight: 4, hype: -4, text: 'KOL từng quảng cáo {name} vừa xóa bài. Cộng đồng bắt đầu nghi ngờ.' },
    { kind: 'down', weight: 3, hype: -5, text: 'Một nhóm chat lớn gọi {ticker} là "coin rác". Nhiều người bán theo.' },
    { kind: 'down', weight: 3, hype: -3, text: 'Ví bí ẩn chuyển một lượng lớn {ticker} vào sàn. Thị trường đoán là sắp xả.' },
    { kind: 'down', weight: 2, hype: -6, text: 'Trang web của {name} tạm sập. Chưa rõ nguyên nhân, nhưng đủ để tạo hoảng loạn.' },
    { kind: 'flat', weight: 4, hype: 0, text: 'Một nhóm 300 người hỏi nhau có nên vào {ticker} không. Chưa ai trả lời.' },
    { kind: 'flat', weight: 3, hype: 1, text: 'Creator của {name} đăng ảnh bữa trưa. Không liên quan gì tới giá, nhưng vẫn có người mua.' },
    { kind: 'flat', weight: 2, hype: -1, text: 'Volume {ticker} tăng nhẹ. Giá gần như không đổi. Thị trường đang chờ.' },
    { kind: 'up', weight: 3, hype: 5, text: 'Creator vừa mua lại và đốt một phần {ticker}. Nguồn cung giảm, cộng đồng thấy có niềm tin.' },
    { kind: 'up', weight: 3, hype: 6, text: 'Một đợt airdrop {ticker} rơi vào hàng trăm ví. Người nhận khoe lệnh, người ngoài bắt đầu FOMO.' },
    { kind: 'up', weight: 2, hype: 4, text: 'Thanh khoản {ticker} được khoá thêm vài phút. Nhiều người coi đó là cam kết, dù cam kết trong game cũng có hạn.' },
    { kind: 'up', weight: 2, hype: 3, text: 'Cộng đồng vẽ fan art cho {emoji}. Không có gì thay đổi về sản phẩm, nhưng hype vẫn tăng.' },
    { kind: 'up', weight: 2, hype: 3, text: 'Một aggregator nhỏ thêm {ticker} vào danh sách. Volume tăng nhẹ, giá nhích theo.' },
    { kind: 'down', weight: 3, hype: -4, text: 'Ví của team chuyển một lượng lớn {ticker} sang ví khác. Cộng đồng đoán là chuẩn bị xả hàng.' },
    { kind: 'down', weight: 2, hype: -5, text: 'Một dự án khác cáo buộc {name} sao chép ý tưởng. Tranh cãi nổ ra, người mua mới chững lại.' },
    { kind: 'down', weight: 2, hype: -3, text: 'Thanh khoản {ticker} mỏng đi sau một lệnh bán lớn. Người đang giữ bắt đầu lo.' },
    { kind: 'flat', weight: 3, hype: 0, text: 'Một cuộc bình chọn về việc đốt {ticker} đang diễn ra. Chưa có kết quả, giá vẫn đứng.' },
    { kind: 'flat', weight: 2, hype: 1, text: 'Số người giữ {ticker} vượt một mốc mới. Giá không đổi, nhưng cộng đồng thấy vui.' }
  ];

  const COIN_TIPS = [
    'Trong mục này, giá chạy bằng niềm tin và dòng tiền ảo. Không có token thật.',
    'Meme coin có thể tăng 10 lần rồi mất 90% trong một buổi. Đừng dùng tiền thật để học bài này.',
    'Nếu ai đó cam kết lợi nhuận cố định mỗi ngày, nhiều khả năng đó là mô hình Ponzi.',
    'Rút thanh khoản để xả hàng là hành vi lừa đảo ngoài đời. Trong game, nó chỉ là một lựa chọn xấu có hậu quả.',
    'Hype lên nhanh thì cũng xuống nhanh. Người vào sau thường là người chịu thiệt.',
    'Ví lớn mua vào chưa chắc là tin tốt. Có thể họ đang chuẩn bị xả hàng.',
    'Mua lại và đốt token chỉ đáng tin khi nguồn tiền minh bạch. Không minh bạch thì đó chỉ là một màn trình diễn.',
    'Airdrop không tạo ra giá trị mới. Nó chỉ chia lại lượng token đang có cho nhiều người hơn.',
    'Khoá thanh khoản vài phút trong game không giống lock thật ngoài đời. Luôn kiểm tra hợp đồng và ví.',
    'Đừng bao giờ chia sẻ seed phrase. Không có ngoại lệ.'
  ];


  window.AURELIS_DATA = {
    GROUPS, ASSETS, SHOP, ACHIEVEMENTS, QUESTS, LESSONS, RANKS, BOTS,
    AVATARS, CAPITAL_PRESETS, GLOSSARY, FALLBACK_NEWS, CALENDAR,
    HOSE_IDS, VN30_IDS, TF_MS, TF_MINUTES,
    SAVINGS_PRODUCTS, SAVINGS_BENCH, JOBS, JOB_FIELDS, AUCTION_TYPES, DIVIDEND_YIELD,
    FUND_CATALOG, MARKET_EVENTS,
    JOB_QUESTION_BANK,
    COIN_CREATE, COIN_THEMES, COIN_NAME_PARTS, COIN_BOT_NAMES, COIN_STARTERS, COIN_EVENTS, COIN_TIPS,
    LOAN_PRODUCTS, LIBRARY, LIBRARY_CATEGORIES,
    COMPANY_GROUPS, COMPANY_PEER_LIMIT, COMPANY_SECTOR_LABELS, COMPANY_PEER_OVERRIDES,
    PRIME_PROFILES, PRIME_BANDS, PRIME_SETTLE_LABEL,
    ARCADE_MODES, DEAL_TARGETS, FUND_CLASSES, FUND_REGIMES,
    STARTUP_IDEAS, STARTUP_EVENTS, DUEL_BOTS,
    generateCandles, generateSpark, hash32, mulberry32
  };
})();
