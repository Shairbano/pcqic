require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const connectDB     = require('./config/db');
const authRoutes    = require('./routes/auth');
const groupRoutes   = require('./routes/groups');
const projectRoutes = require('./routes/project.js');
const taskRoutes    = require('./routes/tasks');
const adminRoutes   = require('./routes/admin');
const notifRoutes   = require('./routes/notifications');
const publicRoutes  = require('./routes/public');
const guideRoutes   = require('./routes/guide');
const { verifyUser } = require('./middleware/authMiddleware');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorLogger');
const { getMyTasks } = require('./controllers/taskController');

const app = express();
app.set('trust proxy', true); // so req.ip is the real client IP behind a proxy/load balancer, for accurate log entries

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.send('Backend is running'));

app.use('/api/public', publicRoutes);

// ── Auth ──────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Notifications ─────────────────────────────
app.use('/api/notifications', notifRoutes);

// ── My Tasks (cross-project) ──────────────────
app.get('/api/my-tasks', verifyUser, getMyTasks);

// ── Groups ────────────────────────────────────
app.use('/api/group', groupRoutes);

// ── Projects (nested under groups) ───────────
// mergeParams in projects router captures :groupId
app.use('/api/group/:groupId/projects', projectRoutes);

// ── Tasks (nested under projects) ────────────
app.use('/api/group/:groupId/projects/:projectId/tasks', taskRoutes);

// ── Admin ─────────────────────────────────────
app.use('/api/admin', adminRoutes);

// ── Guide & Help ──────────────────────────────
app.use('/api/guides', guideRoutes);

// ── Technical Log safety net ──────────────────
// Must be registered AFTER all routes above.
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Connect DB & Start ────────────────────────
connectDB();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));