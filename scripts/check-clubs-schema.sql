-- Check clubs table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clubs'
ORDER BY ordinal_position;
