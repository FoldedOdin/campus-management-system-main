# Execute Supabase Setup - Step-by-Step

## 🎯 Goal
Create all database tables in your Supabase project

## 📍 Your Supabase Project
- **URL:** https://app.supabase.com
- **Project:** trustvote-election
- **Database ID:** qxxbdtftxbctaugcxajt

---

## ✅ Method 1: Copy-Paste (Recommended - 2 minutes)

### Step 1️⃣: Go to Supabase Dashboard
```
URL: https://app.supabase.com
Action: Click your project from the list
```

### Step 2️⃣: Open SQL Editor
```
Left Sidebar → SQL Editor
Click: "+ New Query"
```

### Step 3️⃣: Copy SQL Schema
**From your project, view the file:**
```bash
trustvote-election/schema.sql
```

**Copy ALL content (428 lines)**

### Step 4️⃣: Paste into SQL Editor
1. In Supabase SQL Editor, clear the default content
2. Paste the schema.sql content
3. You should see complete SQL script

### Step 5️⃣: Execute
```
Click: "RUN" button (top-right)
Wait: 5-10 seconds
Look for: "✅ All tables created successfully"
```

### Step 6️⃣: Verify Tables
- Go to Table Editor (left sidebar)
- You should see 7 tables:
  - ✅ users
  - ✅ positions
  - ✅ candidates
  - ✅ votes
  - ✅ announcements
  - ✅ election_settings
  - ✅ candidate_requests

---

## ✅ Method 2: Execute Section by Section

If copy-pasting all at once fails, do this instead:

### Section 1: Create Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) CHECK (role IN ('student', 'admin', 'candidate')) DEFAULT 'student',
  student_id VARCHAR(100),
  phone VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```
✅ Run this section first

### Section 2: Create Positions Table
```sql
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
✅ Run

### Section 3: Create Candidates Table
```sql
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  party VARCHAR(255),
  manifesto TEXT,
  photo_url VARCHAR(500),
  vote_count INTEGER DEFAULT 0,
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);
```
✅ Run

### Section 4: Create Votes Table
```sql
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_student ON votes(student_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_position ON votes(position_id);
```
✅ Run

### Section 5: Create Announcements Table
```sql
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
```
✅ Run

### Section 6: Create Election Settings Table
```sql
CREATE TABLE IF NOT EXISTS election_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  allow_voting BOOLEAN DEFAULT FALSE,
  allow_candidate_requests BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
✅ Run

### Section 7: Create Candidate Requests Table
```sql
CREATE TABLE IF NOT EXISTS candidate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  party VARCHAR(255),
  manifesto TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidate_requests_position ON candidate_requests(position_id);
CREATE INDEX IF NOT EXISTS idx_candidate_requests_user ON candidate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_requests_status ON candidate_requests(status);
```
✅ Run

### Section 8: Enable RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_requests ENABLE ROW LEVEL SECURITY;
```
✅ Run

### Section 9: Create RLS Policies
```sql
CREATE POLICY "Anyone can view announcements" ON announcements
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can view approved candidates" ON candidates
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Students can view their votes" ON votes
  FOR SELECT USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can create votes" ON votes
  FOR INSERT WITH CHECK (auth.uid()::text = student_id::text);

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'admin');

CREATE POLICY "Everyone can view positions" ON positions
  FOR SELECT USING (TRUE);

CREATE POLICY "Everyone can view election settings" ON election_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can view their candidate requests" ON candidate_requests
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'admin');

CREATE POLICY "Users can create candidate requests" ON candidate_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
```
✅ Run all at once

---

## ✅ Verify Success

After all sections run successfully, check:

### In Supabase Dashboard:

1. **Table Editor**
   - Left sidebar → Table Editor
   - You should see 7 tables listed:
     - users ✅
     - positions ✅
     - candidates ✅
     - votes ✅
     - announcements ✅
     - election_settings ✅
     - candidate_requests ✅

2. **RLS Policies**
   - Select each table
   - Policies tab should show the policies we created

3. **No Errors**
   - SQL output should show: ✅ Success
   - No red error messages

---

## 🚀 Test Connection

Once tables are created:

```bash
npm start
```

Open browser console (F12) and look for:
```
✅ Successfully connected to Supabase!
📊 Database ready!
✅ All tables verified
```

---

## ❌ Troubleshooting

### Error: "Duplicate table"
**Cause:** Tables already exist  
**Solution:** This is OK! They won't be created again (IF NOT EXISTS)

### Error: "Foreign key constraint fails"
**Cause:** Tables in wrong order  
**Solution:** Execute all SQL at once (don't split by table)

### Error: "relation does not exist"
**Cause:** Previous sections failed  
**Solution:** Delete existing tables and run again

### Error: "Permission denied"
**Cause:** Wrong API key  
**Solution:** Check REACT_APP_SUPABASE_ANON_KEY in .env

### Votes are cast but admin sees 0 results
**Cause:** `votes` RLS does not allow admin read access  
**Solution:** Run `fix_votes_rls.sql` in Supabase SQL Editor, then refresh admin dashboard

### No tables appear
**Cause:** SQL didn't execute  
**Solution:** Check output for errors, try section by section

---

## ✨ Done!

After successful execution:

1. ✅ All 7 tables created
2. ✅ Foreign keys configured
3. ✅ Indexes created
4. ✅ RLS enabled
5. ✅ Policies set up
6. ✅ Ready for use!

---

## 📚 Next Steps

1. ✅ Test connection: `npm start`
2. ✅ Create test data in Supabase UI
3. ✅ Login to app and test features
4. ✅ Add announcements
5. ✅ Add positions
6. ✅ Add candidates
7. ✅ Test voting flow

---

**Total Setup Time:** ~5 minutes  
**Database Ready:** Yes ✅  
**App Status:** Ready to deploy 🚀
