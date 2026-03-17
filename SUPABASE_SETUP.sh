#!/bin/bash
# Supabase Database Setup Script for TrustVote

echo "================================"
echo "TrustVote Supabase Setup Guide"
echo "================================"
echo ""

echo "✅ Your Supabase Credentials:"
echo "URL: https://qxxbdtftxbctaugcxajt.supabase.co"
echo ""

echo "📋 STEP 1: Access Your Supabase Dashboard"
echo "- Go to: https://app.supabase.com"
echo "- Login with your account"
echo "- Select your project: 'trustvote' or similar"
echo ""

echo "📋 STEP 2: Run SQL Scripts"
echo "- In Supabase dashboard, click 'SQL Editor' on the left sidebar"
echo "- Click '+ New Query' button"
echo "- Copy the SQL scripts from DATABASE_SETUP.md"
echo "- Paste and execute each script"
echo ""

echo "📋 STEP 3: Enable Row Level Security (RLS)"
echo "- Go to 'Authentication' > 'Policies' in Supabase"
echo "- Run the RLS policy scripts from DATABASE_SETUP.md"
echo ""

echo "📋 STEP 4: Test the Connection"
echo "- npm install (to ensure dependencies are installed)"
echo "- npm start (to start the development server)"
echo ""

echo "================================"
echo "Next Steps:"
echo "================================"
echo ""
echo "1. Open DATABASE_SETUP.md in your project"
echo "2. Copy all SQL scripts"
echo "3. Execute them in Supabase SQL Editor"
echo "4. Verify tables are created"
echo "5. Run: npm install @supabase/supabase-js"
echo "6. Start the app: npm start"
echo ""
echo "✅ Setup Complete!"
