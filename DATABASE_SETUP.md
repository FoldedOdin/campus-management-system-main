# TrustVote Election System - Database & Backend Setup

## Database Setup - MongoDB

### Option 1: Local MongoDB (Recommended for Development)

**Windows Users:**
1. Download MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Install and follow the installer (default: `C:\Program Files\MongoDB\Server\7.0`)
3. MongoDB will run as a Windows Service automatically

**Verify Installation:**
```bash
mongosh
# Should connect to mongodb://localhost:27017
```

### Option 2: MongoDB Atlas (Cloud - No Local Installation)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster (M0 Free Tier)
4. Get connection string: `mongodb+srv://<username>:<password>@cluster.mongodb.net/trustvote`

## Backend Setup

### Install Dependencies
```bash
cd server
npm install
```

### Create .env File
Create `server/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/trustvote
JWT_SECRET=your-super-secret-key-change-in-production
PORT=5000
NODE_ENV=development
```

### Start Backend Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

#### Candidates
- `GET /api/candidates` - List all candidates
- `POST /api/candidates` - Add candidate (admin only)
- `PUT /api/candidates/:id` - Update candidate (admin only)
- `DELETE /api/candidates/:id` - Delete candidate (admin only)

#### Votes
- `POST /api/votes` - Cast a vote
- `GET /api/votes/my-vote` - Get your vote
- `GET /api/votes/results` - Get all votes

#### Election Settings
- `GET /api/election` - Get election settings
- `PUT /api/election` - Update settings (admin only)
- `POST /api/election/start` - Start election (admin only)
- `POST /api/election/stop` - Stop election (admin only)

## Frontend Integration

Update React `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Update API calls in React (example in `src/context/AuthContext.js`):
```javascript
const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, role })
});
const data = await response.json();
```

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "role": "student|admin",
  "registrationNumber": "CS2025001",
  "department": "Computer Science",
  "year": "3rd Year",
  "phone": "+1234567890",
  "createdAt": "2025-12-05T10:00:00Z",
  "updatedAt": "2025-12-05T10:00:00Z"
}
```

### Candidates Collection
```json
{
  "_id": "ObjectId",
  "name": "Alex Johnson",
  "party": "Progressive Alliance",
  "bio": "Focus on student welfare",
  "email": "alex@example.com",
  "avatarColor": "#667eea",
  "status": "active",
  "votes": 45,
  "createdAt": "2025-12-05T10:00:00Z"
}
```

### Votes Collection
```json
{
  "_id": "ObjectId",
  "studentId": "ObjectId_of_user",
  "candidateId": "ObjectId_of_candidate",
  "timestamp": "2025-12-05T10:00:00Z",
  "voterEmail": "john@example.com"
}
```

### Election Settings Collection
```json
{
  "_id": "ObjectId",
  "title": "Student Council Election 2024",
  "startTime": "2025-12-05T10:00:00Z",
  "endTime": "2025-12-06T10:00:00Z",
  "isActive": true,
  "maxVotesPerStudent": 1,
  "createdAt": "2025-12-05T10:00:00Z"
}
```

## Next Steps

1. Install MongoDB locally or use MongoDB Atlas
2. Run `npm install` in the `server/` folder
3. Create `server/.env` with database connection string
4. Start the backend: `npm run dev`
5. Update React to call API endpoints instead of localStorage
6. Test endpoints with Postman or curl

## Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running: `mongosh` should connect
- Check `MONGODB_URI` in `.env` matches your setup

**CORS Errors:**
- Ensure React frontend runs on different port (3000) than backend (5000)
- CORS is enabled in server

**JWT Token Issues:**
- Tokens expire in 7 days
- Always send `Authorization: Bearer <token>` header with requests
