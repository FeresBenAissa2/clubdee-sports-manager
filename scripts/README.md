# Database Scripts

สคริปต์สำหรับจัดการฐานข้อมูล Supabase

## การตั้งค่าเริ่มต้น

### 1. ติดตั้ง Supabase CLI (ถ้ายังไม่มี)

```bash
brew install supabase/tap/supabase
```

### 2. เชื่อมต่อกับ Supabase Project

```bash
npm run db:link
# หรือ
supabase link --project-ref your-project-ref
```

คุณสามารถหา project-ref ได้จาก Supabase Dashboard URL:
`https://supabase.com/dashboard/project/[your-project-ref]`

### 3. ตั้งค่า Environment Variables

ตรวจสอบว่าไฟล์ `.env.local` มีค่าเหล่านี้:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## การใช้งาน

### วิธีที่ 1: Push Migrations (แนะนำ)

Push migrations ทั้งหมดไปยัง remote database:

```bash
npm run db:push
```

สคริปต์นี้จะ:
- ตรวจสอบ migrations ทั้งหมดใน `supabase/migrations/`
- Push เฉพาะ migrations ที่ยังไม่ได้รันไปยัง remote database
- แสดงสถานะการ push

### วิธีที่ 2: Execute SQL File โดยตรง

รัน SQL file เดี่ยวไปยัง remote database:

```bash
npm run db:exec supabase/migrations/20240101000000_initial_schema.sql
```

หรือ:

```bash
./scripts/exec-sql.sh supabase/migrations/20240101000000_initial_schema.sql
```

### คำสั่งอื่นๆ

```bash
# ตรวจสอบสถานะ local Supabase
npm run db:status

# Reset local database
npm run db:reset

# เชื่อมต่อกับ project
npm run db:link
```

## Workflow แนะนำ

### สำหรับ Development

1. สร้าง migration ใหม่:
```bash
supabase migration new your_migration_name
```

2. เขียน SQL ในไฟล์ที่สร้างขึ้น

3. ทดสอบใน local:
```bash
supabase db reset
```

4. Push ไปยัง remote:
```bash
npm run db:push
```

### สำหรับ Production

1. ตรวจสอบ migrations ทั้งหมดใน `supabase/migrations/`
2. Push ไปยัง production:
```bash
npm run db:push
```

## ตัวอย่างการใช้งาน

### Push migrations ทั้งหมด

```bash
npm run db:push
```

Output:
```
=== Supabase Migration Push ===
Current migrations:
20240101000000_initial_schema.sql
20240101000001_rls_helper_functions.sql
20240101000002_rls_policies.sql

Pushing migrations to remote database...
✓ All migrations pushed successfully!
```

### Execute SQL file เดี่ยว

```bash
npm run db:exec supabase/migrations/20240101000000_initial_schema.sql
```

Output:
```
=== Executing SQL on Supabase ===
File: supabase/migrations/20240101000000_initial_schema.sql
Project: abcdefghijk
Executing SQL...
✓ SQL executed successfully!
```

## Troubleshooting

### Error: Not linked to any Supabase project

```bash
supabase link --project-ref your-project-ref
```

### Error: Missing Supabase credentials

ตรวจสอบว่าไฟล์ `.env.local` มีค่าที่ถูกต้อง

### Error: Permission denied

```bash
chmod +x scripts/*.sh
```

## หมายเหตุ

- สคริปต์เหล่านี้ใช้ Supabase CLI ในการจัดการ database
- Migrations จะถูกเก็บใน `supabase/migrations/`
- การ push migrations จะรันเฉพาะ migrations ที่ยังไม่ได้รัน
- สามารถดู migration history ได้ใน Supabase Dashboard > Database > Migrations
