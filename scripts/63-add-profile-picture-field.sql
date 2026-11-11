-- เพิ่ม field profile_picture_url ในตาราง profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- เพิ่ม comment
COMMENT ON COLUMN profiles.profile_picture_url IS 'URL ของรูปโปรไฟล์จาก Supabase Storage';
