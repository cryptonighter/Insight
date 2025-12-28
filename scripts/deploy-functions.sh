#!/bin/bash

echo "Deploying Supabase Edge Functions..."

# Deploy functions (assuming user is logged in via CLI)
npx supabase functions deploy chat --no-verify-jwt
npx supabase functions deploy director --no-verify-jwt
npx supabase functions deploy generate-meditation --no-verify-jwt

echo "Deployment complete!"
echo "IMPORTANT: Make sure you have set the secrets in your Supabase Dashboard:"
echo "1. OPENROUTER_API_KEY"
echo "2. GOOGLE_API_KEY"
