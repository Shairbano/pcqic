# QSphere – Quantum Community Pakistan Platform

QSphere is a full-stack MERN (MongoDB, Express.js, React, Node.js) platform developed for **Quantum Community Pakistan** to efficiently manage employees, research groups, projects, and collaborative task workflows.

The system provides secure role-based access control, complete project lifecycle management, audit logging, notification services, and administrative tools for managing organizational activities.

---

## Table of Contents

- Features
- Technology Stack
- System Architecture
- Project Structure
- Installation
- Environment Variables
- Running the Project
- User Roles
- Project Workflow
- API Overview
- Security Features
- Future Improvements
- License

---

## Features

### Authentication & Security

- JWT Authentication
- Password hashing using bcrypt
- Forced password change on first login
- One-time credential visibility
- Role-Based Access Control (RBAC)
- Protected Routes
- Token verification middleware

---

### User Management

- Create users
- Activate / deactivate users
- Archive users
- Restore archived users
- Permanent deletion
- Automatic Employee ID generation
- Lock / Unlock user accounts

---

### Group Management

- Create groups
- Archive groups
- Restore archived groups
- Delete groups
- Join requests
- Group invitations
- Member management
- Group Head assignment
- Member locking
- Leave group functionality

---

### Project Management

- Create projects
- Edit projects
- Archive projects
- Restore archived projects
- Delete projects
- Accessibility Levels
  - Public
  - Private
  - Internal

#### Workflow Stages

- Pending
- Initiated
- In Design
- Progress
- Finalization
- Acceptance
- Completed

#### Project Controls

- Pause project
- Resume project
- Admin approval
- File Versioning

---

### Task Management

- Create tasks
- Assign multiple employees
- Task forwarding
- Leave task
- Update progress
- Completion percentage
- Task comments
- Weighted project progress calculation

---

### Notifications

- Join Request notifications
- Invitation notifications
- Approval notifications
- Project updates
- Task updates
- Contact Admin messages

---

### Dashboard

#### Admin Dashboard

- User statistics
- Group statistics
- Project statistics
- Task statistics
- Pending approvals
- Recent activity
- Reports

#### Employee Dashboard

- My Tasks
- My Projects
- My Groups
- Notifications
- Profile Management

---

### Logging

#### Management Log

Tracks:

- User actions
- Group actions
- Project actions
- Task actions

#### Technical Log

Tracks:

- Server errors
- API errors
- Exception logs
- Stack traces

---

### Archive System

Soft Delete, Restore, Permanent Delete — supported for:

- Users
- Groups
- Projects
- Tasks

---

## Technology Stack

### Frontend Stack

- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- Lucide React

### Backend Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Nodemailer

---

## System Architecture

```text
Browser
   │
   ▼
React + Vite Frontend
   │
Axios API Calls
   │
   ▼
Express REST API
   │
Authentication Middleware
   │
Controllers
   │
Business Logic
   │
Mongoose
   │
MongoDB
```

---

## Project Structure

```text
pcqic
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── hooks
│   │   ├── pages
│   │   ├── services
│   │   ├── utils
│   │   └── App.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── uploads
│   ├── utils
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Shairbano/pcqic.git
cd pcqic
```

### Install Backend

```bash
cd backend
npm install
```

### Install Frontend

```bash
cd ../frontend
npm install
```

---

## Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

> **Note:** Never commit your real `.env` file to GitHub. Keep it private by listing it in `.gitignore`.

---

## Running the Project

### Start Backend

```bash
cd backend
npm start
```

### Start Frontend

```bash
cd frontend
npm run dev
```

---

## User Roles

### Admin Role

- Manage users
- Approve projects
- Manage groups
- View reports
- Archive records
- Restore records

### Employee Role

- Join groups
- Work on projects
- Complete tasks
- Update profile

---

## API Overview

Example endpoints:

```text
POST   /api/auth/login
POST   /api/auth/register
GET    /api/groups
POST   /api/projects
PUT    /api/tasks/:id
DELETE /api/users/:id
```

---

## Security Features

- JWT Authentication
- Password Encryption
- Protected API Routes
- Role-Based Authorization
- Input Validation
- Audit Logging
- Secure Password Reset
- Environment Variables
- First Login Password Change

---

## Future Improvements

- Real-time Chat
- Video Meetings
- Calendar Integration
- Mobile Application
- AI Project Assistant
- Email Notifications
- Analytics Dashboard

---

## License

This project is developed for **Quantum Community Pakistan**.

Copyright © 2026.—
