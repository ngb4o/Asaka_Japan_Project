/**
 * Chuẩn hóa mô tả chi tiết mọi sản phẩm thành Markdown.
 * Usage (from BE/): node scripts/format-product-descriptions.js
 */
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const FIELD_LABELS = new Set(
  [
    'Tên sản phẩm',
    'Thể tích thực',
    'Đặc trị',
    'Tính năng nổi bật',
    'Công dụng',
    'Liều lượng',
    'Cách pha',
    'Lượng nước',
    'Thời điểm phun',
    'Thời gian cách ly',
    'Cảnh báo',
    'An toàn chung',
    'Sơ cứu',
    'Nhà sản xuất',
    'Đăng ký',
    'Gia công, đóng gói',
    'Đơn vị phân phối',
    'SĐK',
    'Hạn sử dụng',
    'Phụ gia',
    'Phụ gia & dung môi',
    'Hoạt chất'
  ].map((item) => item.toLowerCase())
)

function isPlaceholderValue(value) {
  const text = String(value || '')
    .replace(/[.\s]+$/g, '')
    .trim()
    .toLowerCase()
  return /thông tin không|không nêu cụ thể|không hiển thị|không ghi cụ thể/.test(text)
}

function cleanValue(value) {
  const text = String(value || '')
    .replace(/[.\s]+$/g, '')
    .trim()
  if (!text || isPlaceholderValue(text)) return '—'
  return text
}

function splitItems(value) {
  if (!String(value).includes(';')) return [value]
  return String(value)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isSectionTitle(line) {
  if (/^#{1,3}\s+/.test(line)) return true
  return /^\d+\.\s+[^:]{2,80}$/.test(line)
}

function parseLabelLine(line) {
  const match = line.match(/^([^:\n]{1,80}):\s*(.*)$/)
  if (!match) return null
  if (/^https?:/i.test(line) || line.startsWith('**')) return null
  return { label: match[1].trim(), value: match[2].trim() }
}

function formatProductDetailMarkdown(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n')
  const out = []
  let inComposition = false
  let pendingGroup = null

  const flushGroup = () => {
    pendingGroup = null
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      continue
    }

    if (
      trimmed.startsWith('## ') ||
      trimmed.startsWith('# ') ||
      trimmed.startsWith('### ') ||
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('**')
    ) {
      flushGroup()
      out.push(trimmed)
      continue
    }

    const headingText = trimmed.replace(/^#{1,3}\s+/, '')
    if (isSectionTitle(trimmed)) {
      flushGroup()
      inComposition = /thành phần/i.test(headingText)
      out.push(`## ${headingText}`)
      out.push('')
      continue
    }

    if (inComposition && trimmed.includes(';')) {
      splitItems(trimmed).forEach((item) => {
        const nested = parseLabelLine(item)
        out.push(
          nested
            ? `- **${nested.label}:** ${cleanValue(nested.value)}`
            : `- ${cleanValue(item)}`
        )
      })
      continue
    }

    const parsed = parseLabelLine(trimmed)
    if (parsed) {
      const { label } = parsed
      const value = cleanValue(parsed.value)
      const known = FIELD_LABELS.has(label.toLowerCase())
      const items = value === '—' ? [] : splitItems(parsed.value).map(cleanValue)

      if (!parsed.value && known) {
        pendingGroup = label
        out.push(`**${label}:**`)
        continue
      }

      if (pendingGroup && !known) {
        out.push(`- **${label}:** ${value}`)
        continue
      }

      flushGroup()

      if (inComposition || /thành phần/i.test(label)) {
        if (items.length > 1) {
          items.forEach((item) => {
            const nested = parseLabelLine(item)
            out.push(
              nested
                ? `- **${nested.label}:** ${cleanValue(nested.value)}`
                : `- ${item}`
            )
          })
        } else {
          out.push(`- **${label}:** ${value}`)
        }
        continue
      }

      if (items.length > 1 && (known || /đặc trị|liều lượng|cách pha/i.test(label))) {
        out.push(`**${label}:**`)
        items.forEach((item) => out.push(`- ${item}`))
        continue
      }

      out.push(`**${label}:** ${value}`)
      continue
    }

    if (pendingGroup || inComposition) {
      const items = splitItems(trimmed).map(cleanValue)
      items.forEach((item) => {
        const nested = parseLabelLine(item)
        out.push(
          nested
            ? `- **${nested.label}:** ${cleanValue(nested.value)}`
            : `- ${item}`
        )
      })
      continue
    }

    flushGroup()
    out.push(trimmed)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const ORIGINALS = {
  "6a5b05d89ae2cfb13f955e7d": "1. Thông tin chung\nTên sản phẩm: Phân bón lá vô cơ nhiều thành phần EPNON GEL HUMIC.\nThể tích thực: 1 Lít.\nĐặc trị: Giải độc, hạ phèn, ổn định pH đất.\nTính năng nổi bật: Tan hoàn toàn trong nước, dễ dàng hấp thu, kích hoạt cơ chế kháng, giúp cây phát triển khỏe mạnh, ra rễ mạnh, nảy chồi, lá xanh dày, dưỡng trái, hỗ trợ ra hoa, đậu trái, hạn chế rụng hoa và trái non.\n\n2. Thành phần\nĐạm tổng số (N): 6%\n\nLân hữu hiệu (P2O5): 6%; Kali hữu hiệu (K2O): 7%; Magie (Mg): 0.3%; Kẽm (Zn): 200 ppm; Bo (B): 900 ppm; Axit humic: 8%; pH: 12; Tỷ trọng: 1.15\n\nPhụ gia: Đặc biệt vừa đủ 1L\n\n3. Hướng dẫn sử dụng\nCông dụng: Phục hồi cây, nuôi dưỡng chồi non, hoa, dưỡng trái; kích rễ, ra rễ mạnh.\nLiều lượng:\n\nCây lâu năm (cà phê, hồ tiêu, sầu riêng, bơ, cam, quýt): 20-40 ml/cây/lần; tưới tùy theo tuổi và đường kính tán.\n\nCây ngắn ngày (lúa, hoa màu, rau củ): 2-4 lít/ha/lần.\nCách pha:\n\nCây lâu năm: Pha 20-40 ml cho bình 20 lít nước.\n\nCây ngắn ngày: Pha 1 lít cho 400-600 lít nước.\nLượng nước: Phun ướt đẫm 2 mặt lá.\nThời điểm phun: Bón định kỳ 30-40 ngày/lần (cây lâu năm) hoặc 10-20 ngày/lần (cây ngắn ngày).\nThời gian cách ly: Không yêu cầu.\n\n4. Cảnh báo & An toàn\nCảnh báo: Thông tin không ghi cụ thể trên nhãn.\nAn toàn chung: Bảo quản nơi khô ráo, thoáng mát, xa nguồn thức ăn, đồ dùng, xa tầm tay trẻ em; mang bảo hộ lao động và rửa sạch chân tay sau khi sử dụng.\nSơ cứu: Thông tin không ghi cụ thể trên nhãn.\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Công ty Cổ phần Nghiệp Nông.\nĐăng ký: Công ty Cổ phần Nghiệp Nông.\nGia công, đóng gói: Lô B218, đường số 5, KCN Thái Hòa, Ấp Tân Hòa, Xã Đức Lập, H. Đức Hòa, Tỉnh Long An.\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN.\n\n6. Thông tin kỹ thuật\nSĐK: QĐLH: 540/QĐ-BVTV-PB.\nHạn sử dụng: 36 tháng kể từ ngày sản xuất.",
  "6a5b05849ae2cfb13f955e7c": "1. Thông tin chung\nTên sản phẩm: Phân bón hỗn hợp NPK - Lân 02 chiều ASAKA - JAPAN\nThể tích thực: 500ml\nĐặc trị: Không nêu cụ thể (đây là sản phẩm phân bón/kích thích sinh trưởng)\nTính năng nổi bật: Phát triển cực mạnh ra rễ, nở bụi, cứng cây, chống đổ ngã, tăng năng suất, bảo vệ mùa màng\n\n2. Thành phần\nN: 5.5%\nP2O5: 25%\nK2O: 5%\nZn: 200 mg/l\nMn: 100 mg/l\nFe: 200 mg/l\nBo: 200 mg/l\nTỷ trọng: 1.4\n\n3. Hướng dẫn sử dụng\nCông dụng: Giúp hấp thu, lưu dẫn hai chiều, kích hoạt cơ chế kháng chủ động của cây, giải độc hữu cơ, điều hòa độ pH đất\nLiều lượng: Thông tin không hiển thị trên bao bì\nCách pha: Thông tin không hiển thị trên bao bì\nLượng nước: Thông tin không hiển thị trên bao bì\nThời điểm phun: Thông tin không hiển thị trên bao bì\nThời gian cách ly: Thông tin không hiển thị trên bao bì\n\n4. Cảnh báo & An toàn\nCảnh báo: Thông tin không hiển thị trên bao bì\nAn toàn chung: Thông tin không hiển thị trên bao bì\nSơ cứu: Thông tin không hiển thị trên bao bì\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Công ty Cổ phần Nghiệp Nông\nĐăng ký: Công ty Cổ phần Nghiệp Nông (Địa chỉ: Số 92, Đường 19E, P. An Lạc, Tp. HCM, Việt Nam)\nGia công, đóng gói: Lô B218, đường số 5, KCN Thái Hòa, Ấp Tân Hòa, Xã Đức Lập, H. Đức Hòa, Tỉnh Long An\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN\n\n6. Thông tin kỹ thuật\nSĐK: Thông tin không hiển thị trên bao bì\nHạn sử dụng: Thông tin không hiển thị trên bao bì",
  "6a5afdf39ae2cfb13f955e7a": "1. Thông tin chung\nTên sản phẩm: Thuốc trừ sâu Haihamec 3.6EC (Hiệu 3.6 - ASAKA)\nThể tích thực: 450ml\nĐặc trị: Bọ trĩ, sâu đục bẹ, sâu cuốn lá, nhện gié, sâu tơ, sâu xanh, rệp sáp, nhện đỏ\nTính năng nổi bật: Là thuốc trừ sâu phổ tác động rộng, tác dụng tiếp xúc, vị độc, xông hơi diệt trừ hữu hiệu sâu hại cây trồng\n\n2. Thành phần\nHoạt chất: Abamectin 3.6%w/w\n\nPhụ gia: Vừa đủ 100%\n\n3. Hướng dẫn sử dụng\nCông dụng: Diệt trừ hữu hiệu sâu hại trên lúa, bắp cải, dưa hấu, hồ tiêu, cam, điều\nLiều lượng: 0.15 lít/ha (cho lúa, bắp cải, dưa hấu, hồ tiêu) hoặc 0.033% (cho cam, điều)\nCách pha: Phi 7\nLượng nước: 400 - 600 lít/ha\nThời điểm phun: Phun thuốc khi sâu tuổi nhỏ\nThời gian cách ly: Không nêu cụ thể (phi 7)\n\n4. Cảnh báo & An toàn\nCảnh báo: Rất độc đối với ốc; có hại nếu nuốt phải, khi tiếp xúc với da hoặc hít phải\nAn toàn chung: Mặc đầy đủ bảo hộ khi sử dụng; tắm rửa, giặt quần áo bằng xà phòng sau khi dùng; tránh hít phải hơi thuốc; không ăn uống, hút thuốc khi dùng; bảo quản nơi khô ráo, tránh xa tầm tay trẻ em và nguồn thức ăn\nSơ cứu: Nếu dính da rửa với xà phòng; dính mắt rửa nước sạch 15 phút rồi đi bác sĩ; nếu uống phải đưa đến cơ sở y tế gần nhất kèm theo nhãn thuốc\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Shen Zhen Run Kang Bao Industry And Commerce Co., Ltd (Trung Quốc)\nĐăng ký: Công ty TNHH SX TM Hải Hằng\nGia công, đóng gói: Công ty TNHH Hóa chất phân bón BVTV Dubai\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN\n\n6. Thông tin kỹ thuật\nSĐK: 4417/CNĐKT-BVTV\nHạn sử dụng: 2 năm",
  "6a5afb429ae2cfb13f955e79": "1. Thông tin chung\nTên sản phẩm: Thuốc trừ sâu CYDIME (558) 10 EC – Hiệu F1\nThể tích thực: 480ml\nĐặc trị: Sâu đục thân, Muỗi hành, Bọ trĩ, Rầy, Tuyến trùng\nTính năng nổi bật: Thuốc trừ sâu thế hệ mới, có tác dụng nội hấp (lưu dẫn), mạnh, tác động vị độc và tiếp xúc, phổ tác động xông hơi cực mạnh.\n\n2. Thành phần\nDimethoate: 80.0g/l\n\nCypermethrin: 20.0g/l\n\nPhụ gia: Đặc biệt vừa đủ 1L\n\n3. Hướng dẫn sử dụng\nCông dụng: Hiệu lực cao với các loại sâu hại, đặc biệt là sâu đục thân kháng thuốc.\nLiều lượng: 0.75 - 0.8 lít/ha\nCách pha: Pha 40-50ml cho bình 25 lít\nLượng nước: Phun 400 - 600 lít nước/ha\nThời điểm phun: Phun thuốc 1 lần vào giai đoạn sắp trổ, mật độ ổ trứng 0.4 - 0.6 ổ/m²\nThời gian cách ly: 10 ngày\n\n4. Cảnh báo & An toàn\nCảnh báo: Rất độc đối với chuột. Có hại nếu nuốt phải, có hại khi tiếp xúc với da hoặc hít phải.\nAn toàn chung: Để xa tầm tay trẻ em, đọc kỹ nhãn thuốc trước khi dùng. Không hút thuốc, ăn hoặc uống trong khi sử dụng. Mang bảo hộ lao động phù hợp khi tiếp xúc. Rửa sạch chân tay, tắm rửa và giặt sạch đồ bảo hộ sau khi sử dụng.\nSơ cứu: Nếu thuốc dính vào mắt, rửa sạch ít nhất 15 phút. Nếu nuốt phải, đưa ngay bệnh nhân tới bệnh viện gần nhất và mang theo nhãn thuốc để bác sĩ điều trị.\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Guangxi National Science and Technology Application Research Company (Trung Quốc)\nĐăng ký: Công ty TNHH Anh Dấu Tiền Giang\nGia công, đóng gói: Công ty TNHH Hóa Chất Phân Bón, thuốc BVTV Dubai\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN\n\n6. Thông tin kỹ thuật\nSĐK: 2367/CNĐKT-BVTV\nHạn sử dụng: 2 năm",
  "6a5b07d99ae2cfb13f955e7e": "1. Thông tin chung\nTên sản phẩm: Thuốc trừ bệnh MI STOP 350SC (Hiệu ASAKA JAPAN)\nThể tích thực: 240ml\nĐặc trị: Lem lép hạt hại lúa\nTính năng nổi bật: Thuốc trừ bệnh cây trồng phổ rộng với khả năng nội hấp và lưu dẫn mạnh. Giúp hạt lúa vàng sáng chắc hạt, đảm bảo năng suất.\n\n2. Thành phần\nAzoxystrobin: 200g/l\n\nDifenoconazole: 150g/l\n\nPhụ gia: Đặc biệt vừa đủ 1L\n\n3. Hướng dẫn sử dụng\nCông dụng: Phòng và trị các loại nấm bệnh gây hại phổ biến trên lúa và cây ăn trái.\nLiều lượng: 0.25 - 0.3 lít/ha\nCách pha: Không nêu cụ thể\nLượng nước: 400 - 500 lít/ha\nThời điểm phun: Phun thuốc khi lúa chuẩn bị trổ và khi lúa trổ đều\nThời gian cách ly: 7 ngày\n\n4. Cảnh báo & An toàn\nCảnh báo: Có thể có hại nếu: nuốt phải thuốc, khi tiếp xúc với da, khi hít phải thuốc.\nAn toàn chung: Để xa tầm với của trẻ em, đọc kỹ nhãn thuốc trước khi dùng, không hút thuốc, ăn hoặc uống khi sử dụng sản phẩm, không phun thuốc ngược chiều gió. Mặc bảo hộ lao động phù hợp, rửa kỹ phần bị dính thuốc bằng nhiều nước, rửa chân tay và tắm rửa, rửa sạch trang bị bảo hộ lao động sau khi sử dụng.\nSơ cứu: Nếu dính mắt: giữ mắt mở, ngâm vào nước sạch ít nhất 15 phút. Nếu dính da: rửa sạch với nhiều nước và xà phòng. Nếu hít phải: di chuyển nạn nhân đến nơi thoáng khí, nếu thấy khó thở thì hô hấp nhân tạo và đưa đến cơ sở y tế gần nhất.\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Guangxi Hui Feng Biotechnology Co., Ltd và Jiangyin Jianglian Chemical Co., Ltd\nĐăng ký: Công ty TNHH TM Nông Phát\nGia công, đóng gói: Công ty TNHH Hóa chất Phân bón, thuốc BVTV DUBAI\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN\n\n6. Thông tin kỹ thuật\nSĐK: 4151/CNĐKT-BVTV\nHạn sử dụng: 2 năm kể từ ngày sản xuất",
  "6a5b08dc9ae2cfb13f955e7f": "1. Thông tin chung\nTên sản phẩm: Thuốc trừ bệnh Mekongvil 5SC (Hiệu HEXA-ASAKA)\nThể tích thực: 1 Lít\nĐặc trị: Khô vằn\nTính năng nổi bật: Thuốc trừ bệnh cao cấp, hiệu lực cao, phổ trừ bệnh rộng, có tính tiếp xúc, lưu dẫn và thấm sâu vào mô cây nên ít bị rửa trôi. Giúp cây khỏe, xanh lá, tăng năng suất và phẩm chất, tăng khả năng chống chịu giúp cây trồng phát triển nhanh hơn.\n\n2. Thành phần\nHexaconazole: 50g/L\n\nPhụ gia: Vừa đủ\n\n3. Hướng dẫn sử dụng\nCông dụng: Trừ bệnh khô vằn trên lúa.\nLiều lượng: 0,8 - 1,0 lít/ha.\nCách pha: Thông tin không nêu cụ thể.\nLượng nước: 400-500 lít/ha.\nThời điểm phun: Phun khi tỷ lệ bệnh khoảng 5-10%, phun khi lúa chuẩn bị trổ và khi lúa trổ đều.\nThời gian cách ly: 7 ngày.\n\n4. Cảnh báo & An toàn\nCảnh báo: Thuốc độc vừa đối với cá, có thể gây dị ứng nhẹ đối với mắt.\nAn toàn chung: Không ăn uống, hút thuốc khi pha chế phun xịt thuốc. Mặc đồ bảo hộ lao động, mang kính, găng tay khi pha chế và phun xịt thuốc, tránh để thuốc dính vào da, quần áo. Tắm giặt, thay quần áo ngay sau khi phun. Bảo quản nơi khô ráo, tránh xa nguồn thực phẩm, nguồn gây cháy, tầm tay trẻ em và nhiệt độ quá 35°C.\nSơ cứu: Nếu dính vào da, rửa kỹ phần da bị dính thuốc nhiều lần với nước sạch và xà phòng, thay quần áo sạch. Nếu dính vào mắt, giữ mắt luôn mở to dưới vòi nước sạch từ 15-20 phút, cần đi khám Bác sĩ. Nếu nuốt phải thuốc, không gây nôn, đưa ngay đến cơ sở y tế gần nhất, mang theo nhãn thuốc.\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Binapuri Sakti Sdn, Bhd (Malaysia).\nĐăng ký: Công ty TNHH P-H.\nGia công, đóng gói: Công ty TNHH Hóa Chất Phân Bón, Thuốc BVTV Dubai.\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN.\n\n6. Thông tin kỹ thuật\nSĐK: 773/CNĐKT-BVTV.\nHạn sử dụng: 2 năm.",
  "6a5b00fd9ae2cfb13f955e7b": "1. Thông tin chung\nTên sản phẩm: Thuốc trừ bệnh Bretil Super 300EC (Hiệu Til Asaka Japan)\nThể tích thực: 250 ml\nĐặc trị: Khô vằn (đốm vằn), lem lép hạt trên lúa; đốm lá, rỉ sắt trên cà phê; thán thư trên cà phê; vàng lá (rụng lá - Corynespora) trên cao su; nấm hồng trên cao su; khô vằn trên ngô; rỉ sắt trên đậu tương.\nTính năng nổi bật: Thuốc trừ bệnh.\n\n2. Thành phần\nDifenoconazole 150g/L\n\nPropiconazole 150g/L\n\nPhụ gia & dung môi: vừa đủ\n\n3. Hướng dẫn sử dụng\nCông dụng: Trừ các loại bệnh trên cây trồng như lúa, cà phê, cao su, ngô, đậu tương.\nLiều lượng: 0,25 - 0,3 L/ha (khô vằn lúa); 0,3 - 0,4 L/ha (đốm lá cà phê); 0,4 - 0,5 L/ha (rỉ sắt cà phê); 0,04 - 0,06 L/ha (thán thư cà phê); 0,1 - 0,2% (vàng lá, nấm hồng cao su); 0,25 - 0,3 L/ha (khô vằn ngô); 0,3 L/ha (rỉ sắt đậu tương).\nCách pha: Thông tin không nêu cụ thể.\nLượng nước: 320 lít/ha (lúa); 400 - 500 L/ha (đậu tương); 500 L/ha (ngô).\nThời điểm phun: Thông tin không nêu cụ thể.\nThời gian cách ly: 14 ngày.\n\n4. Cảnh báo & An toàn\nCảnh báo: Có thể có hại nếu nuốt phải, gây kích ứng mắt nghiêm trọng, rất độc đối với sinh vật thủy sinh với ảnh hưởng kéo dài.\nAn toàn chung: Để xa tầm với của trẻ em; người sử dụng cần trang bị đồ bảo hộ lao động (được minh họa bằng các biểu tượng trên nhãn).\nSơ cứu: Thông tin không nêu cụ thể.\n\n5. Nhà sản xuất & phân phối\nNhà sản xuất: Jiangyin Jianglian Chemical Co., Ltd\nĐăng ký: Công ty TNHH TM Nông Phát\nGia công, đóng gói: Công ty TNHH Hóa chất Phân bón, thuốc BVTV DUBAI\nĐơn vị phân phối: Công ty TNHH ASAKA JAPAN\n\n6. Thông tin kỹ thuật\nSĐK: 2264/CNĐKT-BVTV\nHạn sử dụng: 24 tháng kể từ ngày sản xuất"
}

function tidyShort(text, fallback) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/đảm bảo năng su$/i, 'đảm bảo năng suất.')
    .trim()
  if (cleaned.length >= 20) return cleaned.slice(0, 300)
  return String(fallback || '').slice(0, 300)
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME
  if (!uri || !dbName) {
    throw new Error('Missing MONGODB_URI or DATABASE_NAME')
  }

  const client = new MongoClient(uri)
  await client.connect()
  const col = client.db(dbName).collection('products')
  const products = await col
    .find({ _destroy: { $ne: true } })
    .project({ name: 1, description: 1, shortDescription: 1 })
    .toArray()

  let updated = 0
  for (const product of products) {
    const source = ORIGINALS[String(product._id)] || product.description || ''
    const description = formatProductDetailMarkdown(source)
    const shortDescription = tidyShort(
      product.shortDescription,
      description.replace(/\*\*|##\s+/g, '').slice(0, 180)
    )
    if (
      description === (product.description || '').trim() &&
      shortDescription === (product.shortDescription || '')
    ) {
      continue
    }
    await col.updateOne(
      { _id: new ObjectId(product._id) },
      { $set: { description, shortDescription, updatedAt: new Date() } }
    )
    updated += 1
    console.log('updated', product.name)
  }

  console.log(`done ${updated}/${products.length}`)
  await client.close()
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
