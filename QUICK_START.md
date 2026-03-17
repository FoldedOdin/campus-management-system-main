# 🚀 TrustVote Supabase Setup - Quick Start

## ✅ Current Status

Your project is ready to connect! Here's what's been set up:

```
✅ Environment Variables (.env)
   └─ REACT_APP_SUPABASE_URL configured
   └─ REACT_APP_SUPABASE_ANON_KEY configured

✅ Dependencies (package.json)
   └─ @supabase/supabase-js installed

✅ Supabase Client (src/lib/supabaseClient.js)
   └─ Connection initialized

✅ Service Layer (src/lib/supabaseService.js)
   └─ 7 service modules ready:
      ├─ announcementsService
      ├─ positionsService
      ├─ candidatesService
      ├─ votesService
      ├─ electionSettingsService
      ├─ candidateRequestsService
      └─ usersService

✅ Components Updated
   └─ StudentDashboard.js - Using Supabase services

⏳ PENDING: Database Tables
   └─ Need to create 7 tables in Supabase
```

## 🎯 Quick Setup (5 Minutes)

### 1. Login to Supabase
```
URL: https://app.supabase.com
Project: trustvote
```

### 2. Create Tables
```
Path: SQL Editor → New Query
Action: Paste schema.sql content and execute
```

### 3. Test Connection
```bash
npm start
# Open browser console (F12)
# You should see connection success message
```

## 📊 Database Schema

### Tables to Create:
1. **users** - Student/Admin profiles
2. **positions** - Election positions (President, VP, etc.)
3. **candidates** - Candidate information
4. **votes** - Vote records (immutable audit trail)
5. **announcements** - Admin notifications
6. **election_settings** - Election configuration
7. **candidate_requests** - Pending candidate applications

## 🔑 Your Supabase Credentials

**Project ID:** qxxbdtftxbctaugcxajt
**Region:** (Check in Supabase Dashboard)
**URL:** https://qxxbdtftxbctaugcxajt.supabase.co

## 📁 Files Created/Updated

```
trustvote-election/
├── schema.sql                          ← Copy to Supabase SQL Editor
├── SUPABASE_CONNECTION.md              ← Full setup guide
├── SUPABASE_SETUP.sh                   ← Setup instructions
├── .env                                ✅ Already configured
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js           ✅ Ready
│   │   ├── supabaseService.js          ✅ All services
│   │   └── testSupabaseConnection.js   ← Testing utility
│   └── pages/
│       └── StudentDashboard.js         ✅ Updated to use Supabase
└── DATABASE_SETUP.md                   ← Reference docs
```

## 🚦 Connection Status

| Component | Status |
|-----------|--------|
| API Keys in .env | ✅ Configured |
| Supabase Client | ✅ Initialized |
| Service Layer | ✅ Ready |
| StudentDashboard | ✅ Updated |
| Database Tables | ⏳ Need to create |
| RLS Policies | ⏳ Need to enable |

## ⚡ Next Actions (in order)

1. **Copy schema.sql content**
   ```bash
   cat schema.sql  # View the SQL
   ```

2. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

3. **Execute SQL Scripts**
   - SQL Editor → New Query
   - Paste schema.sql
   - Click RUN

4. **Verify Tables Created**
   ```bash
   npm start
   # Check browser console for connection test
   ```

5. **Test with Sample Data**
   - Go to Table Editor in Supabase
   - Add test data for positions, candidates, users

## 🧪 Testing Connection

After creating tables, add this to any component:

```javascript
import { testSupabaseConnection, testTablesExist } from './lib/testSupabaseConnection';

useEffect(() => {
  testSupabaseConnection().then(console.log);
  testTablesExist().then(console.log);
}, []);
```

## 📞 Troubleshooting

**Q: Tables not showing up?**
- Refresh the Supabase Dashboard
- Check SQL execution was successful
- Look for error messages in output

**Q: Connection still failing?**
- Verify .env has correct values
- Check network connection to Supabase
- Test with: `curl https://qxxbdtftxbctaugcxajt.supabase.co`

**Q: Getting permission errors?**
- RLS policies may be too restrictive
- Check if using Anon key (not Service Role key)
- Review RLS policies in schema.sql

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ Console shows "Successfully connected to Supabase!"
- ✅ All tables listed in Supabase Table Editor
- ✅ StudentDashboard loads without errors
- ✅ Can view announcements and candidates

## 📚 Resources

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/sql-editor)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🚀 Ready to Connect?

**Execute these commands:**

```bash
# 1. Start development server
npm start

# 2. Open browser and check console
# 3. Follow connection test output
```

**Then in Supabase:**

```
1. SQL Editor → New Query
2. Paste content of schema.sql
3. Click RUN
4. Wait for success ✅
```

**That's it!** 🎉
