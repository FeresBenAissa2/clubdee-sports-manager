-- Check all constraints on training_sessions including coach_id
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'training_sessions'::regclass;
