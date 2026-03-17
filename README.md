# Smart Student Governance & Event Management System

This project extends an existing e-voting system with post-election, role-based dashboards and event management. After results are declared, winners are automatically assigned roles and granted access to the appropriate dashboards and permissions.

## Core Features

- Role-Based Access Control (RBAC)
- Admin: full access
- Chairman: overall event supervision and approvals
- Arts Secretary: manage arts events only
- Sports Secretary: manage sports events only
- Students: view events, register, and see results

- Automatic Winner Role Assignment
- Highest-voted candidate per position is assigned the corresponding role
- Role is stored in the database and linked to dashboard permissions

- Separate Functional Modules
- Arts Event Management
- Sports Event Management
- General Activities
- Event creation, edit, and delete
- Participant registration
- Chairman approval workflow

- Dashboard Features
- Event statistics
- Participant counts
- Budget tracking (optional/advanced)
- Announcement system

## Advanced Features (Main Project Level)

- Real-time updates
- Activity logs
- Notifications
- Analytics dashboard
- Secure access validation

## Technical Stack

- Frontend: React.js
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Protected routes: Role-based middleware

## Development

In the project directory, you can run:

- `npm start` to run the app in development mode
- `npm test` to run the test runner in watch mode
- `npm run build` to build the app for production
- `npm run eject` to eject Create React App (one-way)
