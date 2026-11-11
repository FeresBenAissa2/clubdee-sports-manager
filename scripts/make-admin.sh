#!/bin/bash

# ===================================================================
# สคริปต์ตั้งค่า Admin Role
# ===================================================================
# วิธีใช้: ./scripts/make-admin.sh your-email@example.com
# ===================================================================

if [ -z "$1" ]; then
    echo "❌ กรุณาระบุอีเมล"
    echo ""
    echo "วิธีใช้:"
    echo "  ./scripts/make-admin.sh your-email@example.com"
    echo ""
    exit 1
fi

ADMIN_EMAIL="$1"

echo "🔧 กำลังตั้งค่า admin role สำหรับ: $ADMIN_EMAIL"
echo ""

# สร้าง SQL query
SQL_QUERY="
DO \$\$
DECLARE
    v_user_id UUID;
BEGIN
    -- หา user id
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = '$ADMIN_EMAIL';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'ไม่พบผู้ใช้ที่มีอีเมล: $ADMIN_EMAIL';
    END IF;

    -- อัพเดท profiles
    UPDATE profiles
    SET role = 'admin'
    WHERE id = v_user_id;

    -- อัพเดท user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';

    RAISE NOTICE '✅ ตั้งค่า admin role สำเร็จ!';
END \$\$;

-- แสดงผลลัพธ์
SELECT 
    'Admin User' as status,
    u.email,
    p.role as profile_role,
    ur.role as user_roles_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = '$ADMIN_EMAIL';
"

# บันทึก SQL ลงไฟล์ชั่วคราว
echo "$SQL_QUERY" > /tmp/make-admin-temp.sql

# รัน SQL ผ่าน API
./scripts/run-sql-via-api.sh /tmp/make-admin-temp.sql

# ลบไฟล์ชั่วคราว
rm /tmp/make-admin-temp.sql

echo ""
echo "✅ เสร็จสิ้น!"
echo ""
echo "ลอง login ใหม่แล้วเข้าหน้า /dashboard/admin/rate-limits"
