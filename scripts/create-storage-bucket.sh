#!/bin/bash

# ============================================================================
# Create Membership Documents Storage Bucket via Supabase API
# ============================================================================

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN not found in .env.local"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Create Storage Bucket via Supabase API              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Project: $PROJECT_REF"
echo "Bucket: membership-documents"
echo ""

# Create bucket via API
echo "Creating storage bucket..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/storage/buckets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "membership-documents",
    "name": "membership-documents",
    "public": true,
    "file_size_limit": 5242880,
    "allowed_mime_types": ["image/jpeg", "image/png", "application/pdf"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║  ✓ Storage Bucket Created Successfully                ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""
  echo "Bucket Details:"
  echo "$BODY" | jq '.'
  echo ""
  echo "✅ Next step: Configure RLS policies in Supabase Dashboard"
  echo "   Go to: Storage > membership-documents > Policies"
  echo ""
  echo "📖 See docs/STORAGE_BUCKET_SETUP.md for policy SQL"
  exit 0
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║  ℹ Bucket Already Exists                              ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""
  echo "The bucket 'membership-documents' already exists."
  echo "You can verify it in Supabase Dashboard > Storage"
  exit 0
else
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║  ✗ Failed to Create Bucket                            ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""
  echo "HTTP Status: $HTTP_CODE"
  echo "Error:"
  echo "$BODY" | jq '.'
  exit 1
fi
