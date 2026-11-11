-- Create push_subscriptions table for storing web push notification subscriptions
-- Migration: 106-create-push-subscriptions-table.sql

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only manage their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can view their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own push subscriptions"
      ON push_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can insert their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can insert their own push subscriptions"
      ON push_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can update their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own push subscriptions"
      ON push_subscriptions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can delete their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete their own push subscriptions"
      ON push_subscriptions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Admins can view all subscriptions (for sending notifications)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Admins can view all push subscriptions'
  ) THEN
    CREATE POLICY "Admins can view all push subscriptions"
      ON push_subscriptions FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for users';
