# Hướng dẫn Test API trên Postman

## Base URL
```
http://localhost:8017/v1
```
*(Thay đổi port nếu khác trong .env)*

---

## Bước 1: Đăng ký User mới

### Request
- **Method:** `POST`
- **URL:** `http://localhost:8017/v1/users/register`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (raw JSON):**
  ```json
  {
    "email": "test@example.com",
    "username": "testuser",
    "password": "12345678"
  }
  ```

### Response thành công (201):
```json
{
  "message": "Register successfully!",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "test@example.com",
      "username": "testuser",
      "avatar": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Lưu ý:** Copy `token` từ response để dùng cho các request sau!

---

## Bước 2: Đăng nhập (nếu đã có user)

### Request
- **Method:** `POST`
- **URL:** `http://localhost:8017/v1/users/login`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (raw JSON):**
  ```json
  {
    "email": "test@example.com",
    "password": "12345678"
  }
  ```

### Response thành công (200):
```json
{
  "message": "Login successfully!",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "test@example.com",
      "username": "testuser",
      "avatar": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Bước 3: Test Transaction APIs

**QUAN TRỌNG:** Tất cả Transaction APIs đều cần JWT token!

### Cách thêm JWT Token vào Postman:

1. **Cách 1: Thêm vào Headers**
   - Tab **Headers**
   - Key: `Authorization`
   - Value: `Bearer <token>` (có dấu cách sau Bearer)
   - Ví dụ: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

2. **Cách 2: Dùng Postman Environment Variables (Khuyên dùng)**
   - Tạo Environment mới: Click **Environments** → **+**
   - Tên: `Local Dev`
   - Thêm variable:
     - Variable: `token`
     - Initial Value: (để trống)
     - Current Value: (paste token sau khi login)
   - Trong request, dùng: `Bearer {{token}}`

---

## 3.1. Tạo Transaction mới (Expense)

### Request
- **Method:** `POST`
- **URL:** `http://localhost:8017/v1/transactions`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Body (raw JSON):**
  ```json
  {
    "type": "expense",
    "amount": 50000,
    "category": "Food",
    "note": "Ăn trưa tại nhà hàng",
    "date": "2024-01-15T10:30:00Z"
  }
  ```

### Response thành công (201):
```json
{
  "message": "Transaction created successfully!",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "type": "expense",
    "amount": 50000,
    "category": "Food",
    "note": "Ăn trưa tại nhà hàng",
    "date": "2024-01-15T10:30:00.000Z",
    "walletId": null,
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": null,
    "_destroy": false
  }
}
```

### Các category phổ biến cho Expense:
- `Food`, `Daily`, `Traffic`, `Social`, `Housing`, `Gift`, `Phone`, `Clothes`, `Relax`, `Beauty`, `Health`, `Tax`

---

## 3.2. Tạo Transaction mới (Income)

### Request
- **Method:** `POST`
- **URL:** `http://localhost:8017/v1/transactions`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Body (raw JSON):**
  ```json
  {
    "type": "income",
    "amount": 10000000,
    "category": "Salary",
    "note": "Lương tháng 1",
    "date": "2024-01-01T00:00:00Z"
  }
  ```

### Các category phổ biến cho Income:
- `Bonus`, `Salary`, `Investment`, `Part time`, `Freelance`

---

## 3.3. Lấy danh sách Transactions

### Request cơ bản
- **Method:** `GET`
- **URL:** `http://localhost:8017/v1/transactions`
- **Headers:**
  ```
  Authorization: Bearer <token>
  ```

### Request với filter
- **Method:** `GET`
- **URL:** `http://localhost:8017/v1/transactions?type=expense&category=Food&limit=10&skip=0`
- **Query Params:**
  - `type`: `expense` | `income` | `transfer`
  - `category`: Tên category
  - `dateFrom`: `2024-01-01T00:00:00Z` (ISO string)
  - `dateTo`: `2024-01-31T23:59:59Z` (ISO string)
  - `limit`: Số records mỗi page (mặc định 50, max 100)
  - `skip`: Số records bỏ qua (cho pagination)

### Response thành công (200):
```json
{
  "message": "Get transactions successfully!",
  "data": {
    "transactions": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "type": "expense",
        "amount": 50000,
        "category": "Food",
        "note": "Ăn trưa tại nhà hàng",
        "date": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

---

## 3.4. Lấy chi tiết Transaction

### Request
- **Method:** `GET`
- **URL:** `http://localhost:8017/v1/transactions/:id`
- **Headers:**
  ```
  Authorization: Bearer <token>
  ```
- **Ví dụ:** `http://localhost:8017/v1/transactions/65a1b2c3d4e5f6g7h8i9j0k2`

### Response thành công (200):
```json
{
  "message": "Get transaction details successfully!",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "type": "expense",
    "amount": 50000,
    "category": "Food",
    "note": "Ăn trưa tại nhà hàng",
    "date": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 3.5. Cập nhật Transaction

### Request
- **Method:** `PUT`
- **URL:** `http://localhost:8017/v1/transactions/:id`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Body (raw JSON):** (chỉ gửi các field muốn cập nhật)
  ```json
  {
    "amount": 60000,
    "note": "Ăn trưa + nước"
  }
  ```

### Response thành công (200):
```json
{
  "message": "Transaction updated successfully!",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "amount": 60000,
    "note": "Ăn trưa + nước",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

## 3.6. Xóa Transaction (Soft Delete)

### Request
- **Method:** `DELETE`
- **URL:** `http://localhost:8017/v1/transactions/:id`
- **Headers:**
  ```
  Authorization: Bearer <token>
  ```

### Response thành công (200):
```json
{
  "message": "Transaction deleted successfully!"
}
```

---

## 3.7. Lấy thống kê Transactions

### Request
- **Method:** `GET`
- **URL:** `http://localhost:8017/v1/transactions/statistics?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z`
- **Headers:**
  ```
  Authorization: Bearer <token>
  ```
- **Query Params:**
  - `dateFrom`: Ngày bắt đầu (ISO string)
  - `dateTo`: Ngày kết thúc (ISO string)
  - Nếu không có: Mặc định lấy thống kê trong tháng hiện tại

### Response thành công (200):
```json
{
  "message": "Get statistics successfully!",
  "data": {
    "totalExpense": 500000,
    "totalIncome": 10000000,
    "balance": 9500000,
    "byCategory": [
      {
        "_id": {
          "type": "expense",
          "category": "Food"
        },
        "total": 200000,
        "count": 10
      },
      {
        "_id": {
          "type": "income",
          "category": "Salary"
        },
        "total": 10000000,
        "count": 1
      }
    ],
    "dateFrom": "2024-01-01T00:00:00.000Z",
    "dateTo": "2024-01-31T23:59:59.000Z"
  }
}
```

---

## Tips & Tricks

### 1. Tự động lưu token sau khi login:
- Trong Postman, vào tab **Tests** của request Login
- Thêm script:
  ```javascript
  if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.data.token);
  }
  ```

### 2. Tạo Collection trong Postman:
- Tạo folder: `Auth` (Register, Login)
- Tạo folder: `Transactions` (CRUD operations)
- Dễ quản lý và test

### 3. Test Error Cases:
- Thiếu token → 401 Unauthorized
- Token hết hạn → 401 Unauthorized
- Validation error → 422 Unprocessable Entity
- Không tìm thấy → 404 Not Found
- Không có quyền → 403 Forbidden

### 4. Test với Postman Collection:
- Export collection để chia sẻ với team
- Import collection để test nhanh

---

## Các lỗi thường gặp

### 401 Unauthorized
- **Nguyên nhân:** Thiếu token hoặc token không hợp lệ
- **Giải pháp:** Login lại để lấy token mới

### 422 Unprocessable Entity
- **Nguyên nhân:** Dữ liệu validation không đúng
- **Giải pháp:** Kiểm tra:
  - `type` phải là: `expense`, `income`, hoặc `transfer`
  - `amount` phải > 0
  - `category` phải có ít nhất 2 ký tự

### 404 Not Found
- **Nguyên nhân:** Transaction không tồn tại hoặc không thuộc về user
- **Giải pháp:** Kiểm tra ID và đảm bảo user có quyền truy cập

---

## Ví dụ Test Flow hoàn chỉnh

1. **Register** → Lấy token
2. **Create Expense** → Tạo chi tiêu
3. **Create Income** → Tạo thu nhập
4. **Get List** → Xem danh sách
5. **Get Statistics** → Xem thống kê
6. **Update** → Sửa transaction
7. **Delete** → Xóa transaction

---

Chúc bạn test thành công! 🚀

