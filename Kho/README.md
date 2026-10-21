# Kho

Một trang quản lý sản phẩm trong kho: ảnh, tên, số lượng và số cột.

Tách khỏi CRM. API theo cùng kiểu Express + MongoDB, giao diện Next.js.

## Chạy

```bash
cd Kho
npm install
npm install --prefix BE
npm install --prefix FE
cp BE/.env.example BE/.env
npm run dev
```

- Giao diện: http://localhost:3002
- API: http://localhost:8018/api/v1/items

`BE/.env` cần `MONGODB_URI`. Database mặc định là `kho`, không dùng chung dữ liệu CRM.
