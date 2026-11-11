# 🔐 ข้อมูลผู้ใช้ทดสอบ (Test Users)

## วิธีการสร้างผู้ใช้ทดสอบ

### ขั้นตอนที่ 1: รัน SQL Script

เปิด **Supabase Dashboard** → **SQL Editor** แล้ว copy เนื้อหาจากไฟล์:
```
scripts/create-test-users.sql
```

หรือใช้คำสั่ง:
```bash
cd sports-club-management
./scripts/exec-sql-psql.sh scripts/create-test-users.sql
```

### ขั้นตอนที่ 2: ทดสอบเข้าสู่ระบบ

---

## 👤 ข้อมูลผู้ใช้ทดสอบ

### 1. 👨‍💼 Admin (ผู้ดูแลระบบ)
```
Email:    admin@test.com
Password: Admin123!
Role:     admin
```

**สิทธิ์การเข้าถึง:**
- ✅ จัดการผู้ใช้ทั้งหมด (สร้าง, แก้ไข, ลบ)
- ✅ จัดการสโมสร
- ✅ มอบหมายโค้ชให้นักกีฬา
- ✅ ดู Audit Logs
- ✅ ดูรายงานทั้งหมด
- ✅ ตั้งค่าระบบ

**หน้าที่เข้าถึงได้:**
- `/dashboard/admin` - หน้าแดชบอร์ดผู้ดูแล
- `/dashboard/admin/settings` - การตั้งค่า
- `/dashboard/admin/audit` - บันทึกการตรวจสอบ
- `/dashboard/admin/reports` - รายงาน

---

### 2. 🏃‍♂️ Coach (โค้ช)
```
Email:    coach@test.com
Password: Coach123!
Role:     coach
```

**สิทธิ์การเข้าถึง:**
- ✅ ดูข้อมูลนักกีฬาที่ดูแล
- ✅ แก้ไขข้อมูลนักกีฬาที่ดูแล
- ✅ บันทึกผลการฝึกซ้อม
- ✅ ดูรายงานนักกีฬา
- ❌ ไม่สามารถลบผู้ใช้
- ❌ ไม่สามารถเข้าถึงหน้า Admin

**หน้าที่เข้าถึงได้:**
- `/dashboard/coach` - หน้าแดชบอร์ดโค้ช
- `/dashboard/coach/athletes` - รายชื่อนักกีฬา
- `/dashboard/coach/training` - การฝึกซ้อม

---

### 3. 🏅 Athlete (นักกีฬา)
```
Email:    athlete@test.com
Password: Athlete123!
Role:     athlete
```

**สิทธิ์การเข้าถึง:**
- ✅ ดูข้อมูลส่วนตัว
- ✅ แก้ไขข้อมูลส่วนตัว (ยกเว้นข้อมูลสำคัญ)
- ✅ ดูผลการฝึกซ้อม
- ✅ ดูตารางการฝึก
- ❌ ไม่สามารถดูข้อมูลนักกีฬาคนอื่น
- ❌ ไม่สามารถเข้าถึงหน้า Admin/Coach

**หน้าที่เข้าถึงได้:**
- `/dashboard/athlete` - หน้าแดชบอร์ดนักกีฬา
- `/dashboard/athlete/profile` - โปรไฟล์
- `/dashboard/athlete/profile/edit` - แก้ไขโปรไฟล์
- `/dashboard/athlete/training` - ตารางฝึกซ้อม

---

## 🧪 การทดสอบ

### ทดสอบการเข้าสู่ระบบ

1. เปิดเว็บไซต์: `http://localhost:3000/login`
2. ใส่ Email และ Password จากข้อมูลด้านบน
3. กดปุ่ม "เข้าสู่ระบบ"
4. ระบบจะ redirect ไปยังหน้าที่เหมาะสมตาม role

### ทดสอบสิทธิ์การเข้าถึง

**ทดสอบ Admin:**
```
1. Login ด้วย admin@test.com
2. ลองเข้า /dashboard/admin ✅ ควรเข้าได้
3. ลองเข้า /dashboard/coach ❌ ควรถูก redirect
4. ลองเข้า /dashboard/athlete ❌ ควรถูก redirect
```

**ทดสอบ Coach:**
```
1. Login ด้วย coach@test.com
2. ลองเข้า /dashboard/coach ✅ ควรเข้าได้
3. ลองเข้า /dashboard/admin ❌ ควรถูก redirect
4. ลองเข้า /dashboard/athlete ❌ ควรถูก redirect
```

**ทดสอบ Athlete:**
```
1. Login ด้วย athlete@test.com
2. ลองเข้า /dashboard/athlete ✅ ควรเข้าได้
3. ลองเข้า /dashboard/admin ❌ ควรถูก redirect
4. ลองเข้า /dashboard/coach ❌ ควรถูก redirect
```

---

## 🔄 รีเซ็ตรหัสผ่าน

หากต้องการรีเซ็ตรหัสผ่าน ให้รัน script `create-test-users.sql` อีกครั้ง
Script จะอัพเดทรหัสผ่านให้เป็นค่าเริ่มต้น

---

## ⚠️ คำเตือน

- **ห้ามใช้ข้อมูลเหล่านี้ใน Production**
- ข้อมูลเหล่านี้ใช้สำหรับการทดสอบเท่านั้น
- ควรลบผู้ใช้ทดสอบออกก่อน deploy ไป Production

---

## 📝 หมายเหตุ

- รหัสผ่านทั้งหมดใช้รูปแบบ: `[Role]123!`
- Email ทั้งหมดใช้รูปแบบ: `[role]@test.com`
- ผู้ใช้ทั้งหมดได้รับการยืนยันอีเมลแล้ว (email_confirmed_at)
- สามารถเข้าสู่ระบบได้ทันที

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Login Page](http://localhost:3000/login)
- [Register Page](http://localhost:3000/register)
