# Thư mục ảnh website

Bỏ ảnh vào đúng thư mục bên dưới. **Giữ đúng tên file** để web tự nhận.

Định dạng khuyến nghị: `.jpg` / `.webp` / `.png`

---

## `backgrounds/` — Ảnh nền section

| Tên file | Vị trí trên web | Gợi ý kích thước |
|----------|-----------------|------------------|
| `hero.jpg` | Banner trang chủ (Hero) | 1920×1080 trở lên |
| `about.jpg` | Phần Giới thiệu | 1200×1500 |
| `dealer-cta.jpg` | Banner "Trở thành đại lý" | 1920×800 |

---

## `products/categories/` — Danh mục sản phẩm

| Tên file | Danh mục |
|----------|----------|
| `insecticides.jpg` | Thuốc trừ sâu |
| `fungicides.jpg` | Thuốc trừ nấm |
| `herbicides.jpg` | Thuốc trừ cỏ |
| `foliar.jpg` | Phân bón lá |
| `pgr.jpg` | Chất điều hòa sinh trưởng |

---

## `products/featured/` — Sản phẩm nổi bật

| Tên file | Sản phẩm |
|----------|----------|
| `product-1.jpg` | Sản phẩm 1 |
| `product-2.jpg` | Sản phẩm 2 |
| `product-3.jpg` | Sản phẩm 3 |
| `product-4.jpg` | Sản phẩm 4 |

---

## `gallery/` — Thư viện hình ảnh

| Tên file | Nội dung |
|----------|----------|
| `factory.jpg` | Nhà máy |
| `warehouse.jpg` | Kho bãi |
| `lab.jpg` | Nghiên cứu / Lab |
| `field.jpg` | Ruộng đồng |
| `seminar.jpg` | Hội thảo |
| `event.jpg` | Sự kiện |
| `team.jpg` | Đội ngũ |
| `coffee.jpg` | Canh tác / Cây trồng |

---

## `news/` — Tin tức

| Tên file | Bài viết |
|----------|----------|
| `news-1.jpg` | Tin 1 |
| `news-2.jpg` | Tin 2 |
| `news-3.jpg` | Tin 3 |

---

## `testimonials/` — Ảnh đại lý / khách hàng

| Tên file | Người |
|----------|-------|
| `customer-1.jpg` | Đại lý / khách hàng 1 |
| `customer-2.jpg` | Đại lý / khách hàng 2 |
| `customer-3.jpg` | Đại lý / khách hàng 3 |

Gợi ý: ảnh chân dung vuông, tối thiểu 200×200px (nên dùng 400×400).

---

## `brand/` — Logo thương hiệu

| Tên file | Mục đích |
|----------|----------|
| `logo.png` | Logo chính (header/footer) |
| `logo-white.png` | Logo trên nền tối (tuỳ chọn) |
| `favicon.ico` | Icon trình duyệt (tuỳ chọn) |

---

## `social/` — Icon mạng xã hội

| Tên file | Vị trí |
|----------|--------|
| `facebook.png` | Footer + FAB mobile |
| `zalo.png` | Footer + FAB mobile |

Gợi ý: PNG trong suốt, vuông 128×128 hoặc 256×256. Nút đã có nền trắng hình tròn.

---

## `certifications/` — Chứng nhận (tuỳ chọn)

Ví dụ: `iso-9001.png`, `iso-14001.png`

## `partners/` — Logo đối tác (tuỳ chọn)

Ví dụ: `partner-1.png`, `partner-2.png`

---

## Lưu ý

1. Đặt đúng **tên file** như bảng trên (hoặc đổi tên trong `lib/images.ts`).
2. Sau khi bỏ ảnh vào, **refresh trang** (`localhost:3000`) để xem.
3. Ảnh trong `public/` được phục vụ tại đường dẫn `/images/...`
   - Ví dụ: `public/images/backgrounds/hero.jpg` → `/images/backgrounds/hero.jpg`
