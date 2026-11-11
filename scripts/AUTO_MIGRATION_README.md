# 🚀 Auto Migration Scripts

## ปัญหาที่แก้ไข

เดิม: รัน SQL ผ่าน `psql` ไม่ได้เพราะ **permission denied for schema auth**

ใหม่: ใช้ **Supabase Management API** ที่มี permission เหมือน Dashboard

---

## 📋 วิธีใช้งาน

### ขั้นตอนที่ 1: ตั้งค่า Access Token

1. ไปที่ https://supabase.com/dashboard/account/tokens
2. คลิก **Generate New Token**
3. ตั้งชื่อ เช่น "Migration Script"
4. Copy token ที่ได้
5. เพิ่มใน `.env.local`:

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### ขั้นตอนที่ 2: รัน Auto Migration

```bash
cd sports-club-management
./scripts/auto-migrate.sh
```

Script นี้จะรัน:
1. ✅ `01-schema-only.sql` - สร้าง tables, indexes
2. ✅ `02-auth-functions-and-rls.sql` - สร้าง auth functions และ RLS
3. ✅ `create-simple-test-users.sql` - สร้าง test users (ถ้าต้องการ)

---

### หรือรันทีละไฟล์

```bash
cd sports-club-management

# รันไฟล์ที่ 1
./scripts/run-sql-via-api.sh scripts/01-schema-only.sql

# รันไฟล์ที่ 2
./scripts/run-sql-via-api.sh scripts/02-auth-functions-and-rls.sql

# รันไฟล์ที่ 3 (optional)
./scripts/run-sql-via-api.sh scripts/create-simple-test-users.sql
```

---

## ⚙️ Requirements

- `curl` - มีอยู่แล้วใน macOS
- `jq` - ติดตั้งด้วย: `brew install jq`

---

## 🔧 Troubleshooting

### Error: "jq is not installed"
```bash
brew install jq
```

### Error: "Access token required"
- ตรวจสอบว่าได้เพิ่ม `SUPABASE_ACCESS_TOKEN` ใน `.env.local` แล้ว
- หรือ script จะถามให้ใส่ตอนรัน

### Error: HTTP 401 Unauthorized
- Access token หมดอายุหรือไม่ถูกต้อง
- สร้าง token ใหม่ที่ https://supabase.com/dashboard/account/tokens

### Error: HTTP 403 Forbidden
- Token ไม่มีสิทธิ์เข้าถึงโปรเจคนี้
- ตรวจสอบว่าใช้ token ของ account ที่ถูกต้อง

---

## 🎯 ข้อดี

✅ **ไม่ต้อง copy-paste** ใน Dashboard อีกต่อไป
✅ **รันอัตโนมัติ** ได้ทั้งหมด
✅ **ไม่มี permission error** เพราะใช้ Management API
✅ **รันได้หลายครั้ง** (idempotent)

---

## 📚 API Reference

Script ใช้ Supabase Management API:
- Endpoint: `POST /v1/projects/{ref}/database/query`
- Docs: https://supabase.com/docs/reference/api/introduction

---

## 🔐 Security Note

**อย่า commit** `SUPABASE_ACCESS_TOKEN` ลง git!

ไฟล์ `.env.local` อยู่ใน `.gitignore` แล้ว ✅
