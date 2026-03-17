# Supabase Connection Checklist ✅

## Your Supabase Project Details
- **Project URL:** https://qxxbdtftxbctaugcxajt.supabase.co
- **Status:** ✅ Credentials already configured in `.env`

## Step-by-Step Setup Guide

### Step 1: Install Dependencies ✅
```bash
npm install
```
Supabase JS library is already in package.json: `@supabase/supabase-js@^2.27.0`

### Step 2: Create Database Tables 📊

**Option A: Using SQL Editor (Recommended)**
1. Go to https://app.supabase.com
2. Select your project "trustvote"
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy all SQL from `schema.sql` in this project
6. Paste and click **RUN**
7. Wait for success message ✅

**Option B: Execute Individual SQL Scripts**
See `schema.sql` for the complete schema with all 7 tables:
- users
- positions
- candidates
- votes
- announcements
- election_settings
- candidate_requests

### Step 3: Verify Tables Created ✅
```bash
npm start
```
Open your browser console (F12) and check for connection test output.

### Step 4: Test Connection 🧪

Add this to your `src/index.js` or any page temporarily:

```javascript
import { testSupabaseConnection, testTablesExist } from './lib/testSupabaseConnection';

// Call in useEffect
useEffect(() => {
  testSupabaseConnection().then(result => {
    console.log(result);
  });
  
  testTablesExist().then(tables => {
    console.log('Tables:', tables);
  });
}, []);
```

### Step 5: Configure Environment Variables ✅
Your `.env` file already has:
```env
REACT_APP_SUPABASE_URL=https://qxxbdtftxbctaugcxajt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT:** Keep these keys private! Never commit `.env` to git.

## Database Tables Overview

| Table | Purpose | Status |
|-------|---------|--------|
| users | Store user profiles (students, admins) | ✅ Ready |
| positions | Election positions (e.g., President) | ✅ Ready |
| candidates | Candidate profiles | ✅ Ready |
| votes | Vote records (one per student per position) | ✅ Ready |
| announcements | Admin announcements | ✅ Ready |
| election_settings | Election configuration | ✅ Ready |
| candidate_requests | Pending candidate requests | ✅ Ready |

## Row Level Security (RLS) 🔒

All tables have RLS enabled with policies:
- Students can only view their own votes
- Approved candidates are public
- Everyone can view announcements and positions
- Admin has full access

## API Services Ready ✅

All Supabase services are configured in `src/lib/supabaseService.js`:
- `announcementsService`
- `positionsService`
- `candidatesService`
- `votesService`
- `electionSettingsService`
- `candidateRequestsService`
- `usersService`

## Troubleshooting

### Error: "Supabase environment variables are not set"
- Check that `.env` file exists in the root directory
- Verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set
- Restart the development server: `npm start`

### Error: "Relations not found"
- The tables haven't been created yet
- Execute the SQL scripts in Supabase SQL Editor
- Wait a few seconds and refresh

### Error: "Permission denied"
- Check RLS policies are properly configured
- Verify you're using the correct Anon key (not the service role key)

### Connection works but no data appears
- Tables might be empty (expected on first setup)
- Try creating test data in Supabase UI
- Check that StudentDashboard is using the correct service methods

## Next Steps

1. ✅ Execute `schema.sql` in Supabase SQL Editor
2. ✅ Test connection with `npm start`
3. ✅ Create sample data in Supabase UI
4. ✅ Test StudentDashboard page
5. ✅ Create election settings and positions
6. ✅ Add test candidates
7. ✅ Test voting functionality

## Support Links

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Library](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor](https://app.supabase.com)

---

**Status:** 🚀 Ready to connect!
