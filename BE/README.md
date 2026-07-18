# ASAKA CRM API

Backend CRM cho quản lý sản phẩm BVTV.

## Chạy

1. Copy `.env.example` → `.env` và điền MongoDB + JWT
2. `npm install`
3. `npm run dev`

API chạy tại `http://localhost:8017/api`

## Endpoints

### Auth (public)
- `POST /api/users/register`
- `POST /api/users/login`

### Auth (JWT)
- `POST /api/users/logout`
- `GET /api/users/userAuth`

### Loại sản phẩm (JWT)
- `GET /api/product-categories`
- `POST /api/product-categories`
- `GET /api/product-categories/:id`
- `PUT /api/product-categories/:id`
- `DELETE /api/product-categories/:id`

### Sản phẩm (JWT)
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Upload ảnh (JWT)
- `POST /api/uploads/product-image` — multipart field `image`, max 5MB
- Ảnh phục vụ tại `GET /uploads/products/<filename>`

## Đã xóa

Module `transactions` (finance tracker) không liên quan CRM đã được gỡ bỏ.
