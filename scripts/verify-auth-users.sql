-- Check auth.users for demo accounts
SELECT id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email LIKE 'demo.%@clubdee.com';
