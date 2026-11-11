# 🚀 Database Migration Guide for New Supabase Project

## ลำดับการรัน SQL (ต้องรันผ่าน Supabase Dashboard เท่านั้น!)

### ⚠️ สำคัญมาก!
- **ห้ามรันผ่าน command line** (จะเจอ permission denied error)
- **ต้องรันผ่าน Supabase Dashboard → SQL Editor เท่านั้น**
- รันทีละไฟล์ตามลำดับ

---

## 📝 ขั้นตอนที่ 1: สร้าง Schema, Tables, และ Indexes

**ไฟล์**: `01-schema-only.sql`

**วิธีรัน**:
1. เปิด Supabase Dashboard: https://supabase.com/dashboard
2. เลือกโปรเจคของคุณ
3. ไปที่ **SQL Editor** (เมนูด้านซ้าย)
4. คลิก **New Query**
5. Copy เนื้อหาทั้งหมดจาก `01-schema-only.sql`
6. Paste ลงใน SQL Editor
7. คลิก **Run** หรือกด `Cmd + Enter`

**สิ่งที่จะถูกสร้าง**:
- ✅ 4 Enum types
- ✅ 11 Tables
- ✅ 23 Indexes
- ✅ Triggers สำหรับ updated_at

**ผลลัพธ์ที่คาดหวัง**:
```
Success. No rows returned
```

---

## 📝 ขั้นตอนที่ 2: สร้าง Auth Functions และ RLS Policies

**ไฟล์**: `02-auth-functions-and-rls.sql`

**วิธีรัน**:
1. ใน Supabase Dashboard → SQL Editor
2. คลิก **New Query** อีกครั้ง
3. Copy เนื้อหาทั้งหมดจาก `02-auth-functions-and-rls.sql`
4. Paste ลงใน SQL Editor
5. คลิก **Run** หรือกด `Cmd + Enter`

**สิ่งที่จะถูกสร้าง**:
- ✅ 7 Helper functions ใน auth schema
- ✅ Enable RLS บนทุก table
- ✅ RLS policies ทั้งหมด (40+ policies)

**ผลลัพธ์ที่คาดหวัง**:
```
Success. No rows returned
```

---

## 📝 ขั้นตอนที่ 3: สร้าง Test Users (Optional)

**ไฟล์**: `create-simple-test-users.sql`

**วิธีรัน**:
1. ใน Supabase Dashboard → SQL Editor
2. คลิก **New Query**
3. Copy เนื้อหาทั้งหมดจาก `create-simple-test-users.sql`
4. Paste ลงใน SQL Editor
5. คลิก **Run**

**Users ที่จะถูกสร้าง**:
- ✅ admin@test.com (Admin) - password: `password123`
- ✅ coach@test.com (Coach) - password: `password123`
- ✅ athlete@test.com (Athlete) - password: `password123`

---

## 📝 ขั้นตอนที่ 4: ตรวจสอบ Schema (Optional)

**ไฟล์**: `check-schema.sql`

**วิธีรัน**:
1. ใน Supabase Dashboard → SQL Editor
2. คลิก **New Query**
3. Copy เนื้อหาจาก `check-schema.sql`
4. Paste และ Run

**จะแสดง**:
- จำนวน tables
- จำนวน functions
- จำนวน RLS policies

---

## ✅ สรุปลำดับ

```
1. 01-schema-only.sql              ← รันก่อน (บังคับ)
2. 02-auth-functions-and-rls.sql   ← รันต่อ (บังคับ)
3. create-simple-test-users.sql    ← รันถ้าต้องการ test users
4. check-schema.sql                ← รันเพื่อตรวจสอบ
```

---

## ❓ Troubleshooting

### Error: "permission denied for schema auth"
- **สาเหตุ**: รันผ่าน command line
- **วิธีแก้**: รันผ่าน Supabase Dashboard เท่านั้น

### Error: "relation already exists"
- **สาเหตุ**: Table หรือ function มีอยู่แล้ว
- **วิธีแก้**: Skip ไฟล์นั้น หรือ drop table ก่อน (ระวัง: จะลบข้อมูล)

### Error: "function does not exist"
- **สาเหตุ**: ยังไม่ได้รัน `02-auth-functions-and-rls.sql`
- **วิธีแก้**: รัน `02-auth-functions-and-rls.sql` ก่อน

---

## 🎯 หลังจากรัน Migration เสร็จ

คุณสามารถ:
1. ✅ Login ด้วย test users
2. ✅ ทดสอบ authentication
3. ✅ ทดสอบ RLS policies
4. ✅ เริ่มพัฒนา features ต่อได้เลย

---

## 📚 ไฟล์อ้างอิง

- `combined-migration.sql` - ไฟล์เดิม (ใช้ไม่ได้กับ command line)
- `01-schema-only.sql` - Schema และ tables (ใหม่)
- `02-auth-functions-and-rls.sql` - Auth functions และ RLS (ใหม่)
- `create-simple-test-users.sql` - Test users
- `check-schema.sql` - ตรวจสอบ schema
