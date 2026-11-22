# AURELIS MARKETS

Phòng tập đầu tư đa thị trường: **giá thị trường thật, vốn hoàn toàn ảo**. Giao diện tiếng Việt, không cần build, không cần đăng nhập.

## Chạy ứng dụng

```bash
npm start
```

Mở [http://localhost:3000](http://localhost:3000).

Yêu cầu Node.js 18 trở lên. Server chỉ dùng thư viện chuẩn, không có dependency.

Nếu mở trực tiếp `index.html` bằng `file://`, ứng dụng vẫn chạy nhưng chỉ có thể lấy crypto trực tiếp từ Binance; các thị trường còn lại tự chuyển sang dữ liệu mô phỏng có dán nhãn.

## Nguồn dữ liệu

| Nguồn | Dữ liệu |
| --- | --- |
| Yahoo Finance | HOSE, cổ phiếu Mỹ, ETF/quỹ, forex, hàng hoá, chỉ số, tỷ giá USD/VND |
| Yahoo Finance (fundamentals) | Báo cáo tài chính, hồ sơ doanh nghiệp, chỉ số định giá, đồng thuận chuyên gia và dữ liệu quỹ qua quoteSummary |
| Yahoo Finance (vĩ mô) | TPCP Mỹ 13 tuần/5 năm/10 năm, VIX, vàng tương lai, EUR/USD, GBP/USD, USD/JPY, AUD/USD — neo lãi suất ngân hàng mô phỏng |
| Binance Spot | Giá, nến, độ sâu thị trường crypto |
| Binance Futures | Funding, mark price, long/short ratio |
| CafeF, VnExpress | Tin thị trường qua RSS |
| AURELIS Data | HNX, UPCoM và một số chỉ số/phái sinh VN được mô phỏng, có nhãn |

Giá có thể chậm khoảng 15 phút. Đây không phải lời khuyên đầu tư và không kết nối tài khoản môi giới thật.

## Tính năng chính

- **Đa thị trường:** 234 tài sản gồm HOSE, HNX, UPCoM, cổ phiếu Mỹ, ETF/quỹ chỉ số, crypto, forex, hàng hoá, chỉ số và hợp đồng phái sinh. Danh mục v1.6 bổ sung 100 mã live đã kiểm tra với Yahoo Finance/Binance: 24 HOSE, 27 cổ phiếu Mỹ, 24 crypto, 5 forex, 7 hàng hoá, 8 ETF và 5 chỉ số. Cổ phiếu và ETF có logo công ty thật (FMP, fallback CompaniesMarketCap) và tự chuyển về monogram khi ảnh không tải được.
- **Việc làm & Thu nhập:** **61 nghề thuộc 23 lĩnh vực** từ shipper, barista, thực tập phân tích đến chuyên viên phân tích cổ phiếu, quản lý danh mục, cố vấn tài sản, quant và chuyên gia vĩ mô. v1.9 bổ sung 6 nghề tài chính chuyên sâu; **v1.12 bổ sung 40 nghề mới** trải rộng y tế, pháp lý, M&A, thuế, dữ liệu, quant, vĩ mô, tín dụng, rủi ro, khách sạn, du lịch, nông nghiệp, năng lượng, cơ khí, truyền thông và giáo dục. Mỗi ca có mini-game canh nhịp, xử lý tình huống, **tính toán nhanh** hoặc **ghi nhớ quy trình** — v1.12 thêm hai dạng mini-game mới với câu hỏi số học tài chính và chuỗi biểu tượng nghiệp vụ. Ca tốn năng lượng, có cooldown, XP nghề, chuỗi ngày và nâng cấp mua bằng tiền mặt. Trả lời đúng toàn bộ ca hỏi đáp được **ca hoàn hảo**: +25% lương và +15% XP. Lương là tiền ảo và cộng thẳng vào số dư để đầu tư. **v1.10 bổ sung 13 lĩnh vực nghề:** mỗi ca cộng XP vào lĩnh vực tương ứng, lĩnh vực lên tối đa 10 bậc và mỗi bậc cộng **+3% lương** (tối đa +27%). **v1.12 thêm thanh lọc việc làm:** tìm kiếm không dấu, lọc theo lĩnh vực, cấp nghề và loại mini-game, đếm kết quả và trạng thái rỗng. **v1.13 mở rộng ngân hàng câu hỏi:** thêm 162 câu (24 câu chung + 6 câu cho mỗi lĩnh vực), mỗi ca trộn câu riêng của nghề với câu theo lĩnh vực và một phần câu chung nên 61 nghề không còn lặp lại vài câu cũ.
- **PRIME · Đầu tư thực mô phỏng:** tài khoản đầu tư riêng với vốn ảo nhưng cơ chế của thị trường thật — 3 hồ sơ rủi ro (Thận trọng, Cân bằng, Tăng trưởng), nạp/rút vốn, **lệnh MP/LO/STOP**, biên giá theo sàn (HOSE ±7%, HNX ±10%, UPCoM ±15%, ETF ±10%, Mỹ ±25%), lô chẵn, phí môi giới 0,10–0,15%, thuế bán 0,01–0,10%, trượt giá khi khớp MP và **quyết toán T+2 nén còn 2 phút** (có dán nhãn). Hạn mức theo mandate: lệnh tối đa % NAV, tỷ trọng mã tối đa, luân chuyển trong ngày; theo dõi NAV, alpha so với VN30, lãi thực hiện, danh mục, lệnh mở, khoản chờ quyết toán và lịch sử khớp lệnh (gồm cả lệnh bị từ chối). Tất cả là mô phỏng, không kết nối tài khoản môi giới thật.
- **AURELIS Arcade:** 4 lối chơi chiến lược, mỗi lượt có phí vào cửa, thời gian hồi và thưởng tiền ảo — **Deal Room** (định giá M&A, chọn gói thẩm định, trả giá và tối đa hoá biên an toàn), **Hedge Fund Tycoon** (5 vòng phân bổ cổ phiếu/trái phiếu/vàng/tiền mặt qua các chế độ kinh tế), **Startup Studio** (6 biến cố, quản trị runway, pha loãng và tìm exit) và **Candle Duel** (5 vòng đọc nến thật với 5 bot từ dễ đến điên rồ). Có KPI riêng, lịch sử, kỷ lục, chuỗi thắng và thành tựu.
- **Xưởng Coin (v1.13):** sân chơi meme coin mô phỏng bằng tiền ảo, không token thật và không gọi blockchain. Bạn bỏ 2 triệu phí và 18 triệu thanh khoản để tạo coin, nhận 5% nguồn cung, 85% còn lại nằm trên bonding curve. Giá do pool quyết định: mua làm giá tăng, bán làm giá giảm, càng mua nhiều càng trượt giá. Có 8 coin khởi đầu, 10 chủ đề, bot giao dịch, hype cộng đồng, 24 mẫu tin chợ, phí giao dịch 1% và 0,3% cho creator. Creator có thể chạy bài, **mua lại & đốt token**, **airdrop cho người giữ**, **khoá thanh khoản** hoặc rút thanh khoản — kèm cooldown và cảnh báo rõ rằng rug pull ngoài đời là hành vi lừa đảo. Bảng **danh mục coin** theo dõi giá vốn, lãi/lỗ chưa thực hiện và tỷ trọng từng coin. Toàn bộ chỉ để hiểu vì sao phần lớn meme coin vô danh sẽ về 0.
- **Tín dụng & Vay vốn:** 4 gói vay mô phỏng — vay nhanh 6 giờ (0,10%/giờ, tối đa 50 triệu), 24 giờ (0,07%/giờ, tối đa 100 triệu), 7 ngày (0,80%/ngày, tối đa 200 triệu) và 30 ngày (0,35%/ngày, tối đa 400 triệu). Lãi đơn tính trên dư nợ gốc theo giờ; trả một phần hoặc tất toán trước hạn bất kỳ lúc nào, thanh toán phân bổ lãi phạt → lãi → gốc. Quá hạn chuyển sang lãi phạt cao hơn và cộng dồn theo giờ. Điểm tín dụng 300–850 tăng khi trả đúng hạn, giảm khi quá hạn/nợ xấu/áp lực dư nợ; hạn mức = tài sản ròng × hệ số theo điểm, tối đa 1 tỷ. Tài sản ròng trừ đi tổng dư nợ vay. Toàn bộ là mô phỏng trong vốn ảo.
- **Thư viện tài chính:** 57 mục kiến thức chia 4 nhóm — định lý, công thức, phân tích và khái niệm. v1.10 bổ sung 10 mục mới (Fama-French, Prospect Theory, Bayes, GARCH, Fisher, Merton, phần bù thanh khoản, carry trade, maximum drawdown/Calmar, hồi quy & R²). **v1.11 bổ sung 20 công thức phân tích doanh nghiệp:** ROIC, EPS cơ bản & pha loãng, P/E & PEG, P/B theo ROE, EV/EBITDA, FCF yield & earnings yield, nợ ròng/EBITDA, hệ số thanh toán lãi vay, current/quick ratio, chu kỳ chuyển đổi tiền mặt, Altman Z-Score, tăng trưởng bền vững SGR, Graham Number, EVA, đòn bẩy hoạt động DOL, điểm hoà vốn & biên an toàn, buyback yield, Piotroski F-Score, reverse DCF và chất lượng lợi nhuận/accruals. Mỗi mục gồm công thức/mô hình, tóm tắt, giải thích, ví dụ, thẻ tag và liên kết tới nghề nghiệp/khoản vay/ngân hàng liên quan; toàn bộ 57 mục có **số liệu định lượng và biểu đồ SVG minh hoạ** ngay trong thẻ và cửa sổ chi tiết. **v1.11 thêm nút phóng to biểu đồ** cho cả thư viện lẫn trang doanh nghiệp, mở overlay toàn màn hình với chú thích và legend dễ đọc. Có tìm kiếm không dấu (bao gồm cả số liệu), lọc theo nhóm và cấp độ (Cơ bản/Trung bình/Nâng cao), đánh dấu đã đọc, lưu mục yêu thích, mở mục ngẫu nhiên và tra cứu trực tiếp từ command palette (Ctrl K).
- **Quỹ mở AURELIS (v1.14):** 6 quỹ mô phỏng với NAV cập nhật trực tiếp từ rổ tài sản tham chiếu — Việt Nam Tăng Trưởng (AVG), Cổ Tức (ADI), Công Nghệ (ATE), Crypto (ACR), Đa Tài Sản (AMA) và Phòng Thủ (APF). Mỗi quỹ có tỷ trọng rổ riêng, NAV khởi điểm 10.000 ₫, biểu đồ NAV, phí mua 0,45%/bán 0,35%, số chứng chỉ và giá vốn riêng. Giá trị quỹ cộng vào tổng tài sản, PnL và phân bổ danh mục. Toàn bộ là mô phỏng, không có chứng chỉ quỹ thật.
- **Cổ tức thực tế (v1.14):** mỗi 7 phút là một quý mô phỏng. Cổ phiếu đang nắm trả cổ tức theo tỷ suất thật của từng mã (ví dụ VNM 4,6%/năm), chia bốn quý và cộng tiền mặt hoặc tự động tái đầu tư khi bật DRIP. Có đếm ngược kỳ tới, ước tính kỳ tới, lịch sử từng kỳ và tổng thu nhập thụ động. Đây là cổ tức mô phỏng, không phải quyền lợi cổ đông thật.
- **Sự kiện thị trường trực tiếp (v1.14):** 19 sự kiện mô phỏng xuất hiện mỗi 1–2 phút — lãi suất, dầu, vàng, crypto, ngân hàng, bất động sản, công nghệ… Mỗi sự kiện tác động ngay vào nhóm tài sản liên quan và tạo lực trôi ngắn hạn, hiển thị bằng banner trực tiếp trên tổng quan, terminal, thị trường và trung tâm thông báo. Giao dịch trong lúc sự kiện diễn ra được ghi nhận cho thành tựu riêng. Tất cả là kịch bản mô phỏng.
- **Quản lý tài sản cá nhân:** trắc nghiệm hồ sơ rủi ro (thận trọng, cân bằng, tăng trưởng, mạnh bạo), phân bổ mục tiêu theo 7 nhóm tài sản và chỉnh tay, đo độ lệch/drift, điểm sức khoẻ danh mục, thu nhập thụ động ước tính, kế hoạch DCA tuần/tháng cho cổ phiếu, ETF, crypto, vàng tích lũy và tiền gửi linh hoạt, mục tiêu tài chính có tiến độ và góp vốn, tái cân bằng một chạm (bán phần vượt, nạp tiết kiệm/vàng, mua phần thiếu), nhật ký hoạt động và gợi ý từ coach.
- **Đấu giá cổ phần:** 4 kiểu đấu giá — Anh (tăng dần), Hà Lan (giảm dần), kín (một lần) và flash (siêu tốc, chống bắn tỉa). Lot được tạo từ tài sản live với giá khởi điểm dưới thị giá, bot AI đặt giá, escrow hoàn tự động khi bị vượt, người thắng nhận cổ phần trực tiếp vào danh mục.
- **Biểu đồ:** nến/line, MA, EMA, Bollinger, RSI, MACD, volume, zoom/pan, crosshair và bộ công cụ vẽ trendline, Fibonacci, vùng giá, bút vẽ; lưu bản vẽ theo từng mã. Nến cuối tự đồng bộ giá live và tự mở nến mới khi sang kỳ, kể cả sau khi reload.
- **Giao dịch:** spot, phái sinh long/short, đòn bẩy, ký quỹ, lệnh thị trường/giới hạn, cảnh báo giá, nhật ký lệnh.
- **Danh mục:** giá vốn, PnL, phân bổ, đường cong tài sản, xuất CSV.
- **Ngân hàng & Tích lũy:** tiết kiệm VND linh hoạt và 7/14/30/90/180 ngày, tiết kiệm USD 30/90 ngày, EUR/JPY 30 ngày, tích lũy vàng theo gam. Lãi suất sản phẩm được neo theo TPCP Mỹ, VIX và tỷ giá thật; giá vàng quy đổi từ hợp đồng tương lai và USD/VND. Có tự động tái tục, tất toán trước hạn, thang kỳ hạn, quy đổi tiền tệ, mô phỏng lãi kép, lập mục tiêu và so sánh sản phẩm. Toàn bộ là mô phỏng trong vốn ảo, không phải sản phẩm huy động thật.
- **Trò chơi hoá:** XP, cấp độ, 8 danh hiệu, Aura, **71 thành tựu** (v1.12 thêm 16 thành tựu PRIME/Arcade, v1.13 thêm 16 thành tựu Xưởng Coin, v1.14 thêm 10 thành tựu quỹ/cổ tức/sự kiện), nhiệm vụ ngày (gồm cả ca làm và đấu giá), thử thách tuần, mùa giải, rương ngày.
- **AURA Detective:** ba vụ án biểu đồ mỗi ngày từ nến thật, che phần tương lai để người chơi phán đoán hướng giá; hai manh mối đánh đổi phần thưởng, chuỗi đúng, thưởng hồ sơ và phòng luyện tập không giới hạn.
- **AURA Survival:** ba kịch bản tình huống có nhánh, chấm điểm kỷ luật và rủi ro.
- **AURA Academy:** bài học ngắn, quiz, từ điển thuật ngữ, chứng chỉ.
- **Cửa hàng:** 51 vật phẩm gồm danh hiệu, khung avatar, theme, hiệu ứng, pet và perk; có thể bán lại 60% giá gốc. v1.13 thêm 14 món (danh hiệu creator/airdrop, khung coin/toxic/void, theme Matcha/Obsidian, mưa cánh hoa, mưa xu, cú mèo, cáo, thẻ giảm phí Xưởng Coin và bộ đàm creator).
- **Phong cách chơi:** Nhà đầu tư bền vững, Trader linh hoạt, Nhà phân tích — mỗi phong cách có quà khởi đầu riêng.
- **Phòng phân tích:** 14 công cụ — tín hiệu kỹ thuật, **đọc biểu đồ** (cấu trúc, vùng giá, mẫu nến, kế hoạch stop/target), **máy tính giao dịch** (vị thế theo rủi ro, kỳ vọng, Kelly, hồi vốn sau drawdown, CAGR, lãi kép), backtest, screener, tương quan, Fibonacci, quản trị rủi ro, mục tiêu tài sản, seasonality, volatility, Monte Carlo, pivot points và nhật ký giao dịch.
- **Phân tích doanh nghiệp:** báo cáo riêng cho cổ phiếu HOSE/UPCoM, cổ phiếu Mỹ và ETF/quỹ chỉ số. Sáu biểu đồ phân tích hiển thị đồng thời — xu hướng giá + MA50/MA200, doanh thu & lợi nhuận, biên lợi nhuận, dòng tiền CFO/FCF/Capex, bảng cân đối và EPS thực tế so với dự báo. Kèm báo cáo tài chính năm/quý (kết quả kinh doanh, bảng cân đối, lưu chuyển tiền tệ), 8 KPI, scorecard 6 nhóm tiêu chí, định giá DCF có bảng độ nhạy, đồng thuận chuyên gia và giá mục tiêu, bản đồ/ bảng so sánh cùng ngành, hồ sơ doanh nghiệp và ban điều hành. **Tự động cập nhật liên tục:** giá, % thay đổi và khối lượng được vá mỗi 30 giây từ bảng giá chung; báo cáo tài chính, KPI và đồng thuận chuyên gia được làm mới mỗi 5 phút (cache server 10 phút, cache phản hồi 5 phút), có công tắc bật/tắt và mốc thời gian cập nhật trên hero. **v1.10 bổ sung tin tức liên quan:** cuối trang có khu tin tức riêng cho mã đang phân tích, lấy từ Google News RSS theo tên + mã, dự phòng bằng feed CafeF/VnExpress lọc theo tên/mã doanh nghiệp; client tự làm mới mỗi 60 giây khi bật chế độ Tự động và có nút làm mới thủ công. **v1.11 siết phạm vi tin tức:** chỉ giữ bài khớp trực tiếp tên/mã doanh nghiệp, không còn chèn tin toàn cảnh thị trường; khi không có bài phù hợp, hệ thống hiển thị tin mô phỏng riêng cho mã đó và dán nhãn rõ ràng. ETF/quỹ dùng KPI, scorecard và định giá NAV/P-E riêng thay vì DCF/báo cáo doanh nghiệp. Mã thiếu dữ liệu Yahoo được dán nhãn báo cáo mô phỏng; crypto/forex/hàng hoá/chỉ số chuyển sang phân tích thị trường thay vì tạo báo cáo doanh nghiệp giả.

## Cấu trúc

```
aurelis-markets/
├─ index.html            # vỏ ứng dụng, icon sprite, điều hướng
├─ css/styles.css        # design system, theme, responsive
├─ css/v114.css          # lớp giao diện v1.14: quỹ, cổ tức, sự kiện, polish
├─ js/data.js            # tài sản, quỹ mở, sự kiện thị trường, sản phẩm tích lũy, gói vay, việc làm, ngân hàng câu hỏi, thư viện, đấu giá, shop, thành tựu, bài học, bot, PRIME, Arcade, Xưởng Coin
├─ js/api.js             # lớp kết nối live / binance / demo, lãi suất vĩ mô
├─ js/chart.js           # engine canvas + công cụ vẽ + chỉ báo
├─ js/app.js             # state, routing, giao dịch, quỹ mở, cổ tức, sự kiện, ngân hàng, tín dụng, thư viện, quản lý tài sản, việc làm, đấu giá, phân tích doanh nghiệp, PRIME, Arcade, Xưởng Coin, trò chơi
└─ server.js             # static server + proxy API (quotes, charts, company fundamentals)
```

## API nội bộ

- `GET /api/status`
- `GET /api/quotes?yahoo=...&crypto=...&fresh=1`
- `GET /api/chart?source=yahoo|binance&symbol=...&tf=1m|5m|15m|1H|4H|1D|1W&fresh=1`
- `GET /api/company?symbol=VNM.VN&peers=MSN.VN,SAB.VN&fresh=1`
- `GET /api/company-news?symbol=VCB.VN&name=Vietcombank&sector=Ngân%20hàng&group=hose`
- `GET /api/news`
- `GET /api/derivs`
- `GET /api/depth?symbol=BTCUSDT`

`/api/company` cache phía server 10 phút và cache phản hồi 5 phút cho mỗi mã; client cũng cache 5 phút. Trang Phân tích doanh nghiệp tự vá giá mỗi 30 giây, tự làm mới tin tức mỗi 60 giây và tự làm mới báo cáo mỗi 5 phút khi bật chế độ tự động. `/api/company-news` cache server 45 giây, cache client 55 giây; nguồn chính là Google News RSS, dự phòng bằng feed CafeF/VnExpress nhưng chỉ trả về bài khớp tên/mã doanh nghiệp — không trộn tin toàn cảnh thị trường.

Phiên bản hiện tại: **1.14.0** — Quỹ mở AURELIS với 6 quỹ NAV trực tiếp, cổ tức mô phỏng theo quý và DRIP, cùng 19 sự kiện thị trường trực tiếp tác động giá và tạo lực trôi ngắn hạn; 71 thành tựu; 51 vật phẩm cửa hàng; hồ sơ có ảnh bìa, màu nhấn, khẩu hiệu và thành tựu ghim; biểu đồ vẽ mượt hơn nhờ gộp khung hình và cache chỉ báo; phòng phân tích có 14 công cụ. Các tính năng v1.12/v1.13 vẫn giữ nguyên: PRIME với MP/LO/STOP, biên giá, phí/thuế và T+2 nén; AURELIS Arcade 4 lối chơi; Xưởng Coin với bonding curve; 61 nghề / 23 lĩnh vực; ngân hàng câu hỏi việc làm 162 câu.

Mọi dữ liệu tài khoản, giao dịch và vật phẩm được lưu trong `localStorage` của trình duyệt. Không có máy chủ tài khoản, không có tiền thật.
