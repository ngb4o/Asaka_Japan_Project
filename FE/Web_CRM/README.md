# ASAKA CRM

Web quản trị nội bộ — quản lý loại sản phẩm và sản phẩm BVTV.

## Chạy

1. Copy `.env.example` → `.env.local`
2. Đảm bảo BE đang chạy tại `http://localhost:8017`
3. `npm install`
4. `npm run dev`

CRM chạy tại `http://localhost:3001`

## Tính năng

- Đăng ký / Đăng nhập / Đăng xuất (JWT)
- Middleware bảo vệ route dashboard
- CRUD loại sản phẩm
- CRUD sản phẩm (gắn loại, giá, hoạt chất, quy cách...)

## Cấu trúc

- `app/login`, `app/register` — Auth
- `app/dashboard` — Tổng quan
- `app/product-categories` — Quản lý loại
- `app/products` — Quản lý sản phẩm
