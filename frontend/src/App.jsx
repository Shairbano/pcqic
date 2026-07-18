import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout           from './components/Layout';
import Home             from './pages/Home';
import PublicGroups     from './pages/PublicGroups';
import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import ChangePassword   from './pages/ChangePassword';
import ProjectPage      from './pages/ProjectPage';
import TaskPage         from './pages/TaskPage';
import Groups           from './pages/Groups';
import RoleBasedRoutes  from './utils/RoleBasedRoutes';
import PrivateRoutes    from './utils/privateRoutes';
import AuthContext      from './context/authContext';

const Unauthorized = () => (
  <div className="min-h-screen bg-[var(--pms-bg-void)] text-white flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-5xl font-extrabold text-red-400 mb-4">403</h1>
      <p className="text-gray-400">You don&apos;t have permission to view this page.</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthContext>
      <BrowserRouter>
        <Routes>
          {/* Public — has Navbar + Footer */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="groups" element={<PublicGroups />} />
          </Route>

          {/* Force password change on first login */}
          <Route
            path="/change-password"
            element={<PrivateRoutes><ChangePassword /></PrivateRoutes>}
          />

          {/* Admin dashboard */}
          <Route
            path="/admin-dashboard"
            element={<RoleBasedRoutes requiredRole={['admin']}><Dashboard /></RoleBasedRoutes>}
          />

          {/* User dashboard */}
          <Route
            path="/user-dashboard"
            element={<RoleBasedRoutes requiredRole={['employee']}><Dashboard /></RoleBasedRoutes>}
          />
          <Route
            path="/user-dashboard/groups/:groupId"
            element={<RoleBasedRoutes requiredRole={['employee']}><Dashboard /></RoleBasedRoutes>}
          />

          {/* Group detail — works for both admin and employee */}
          <Route
            path="/groups/:id"
            element={<PrivateRoutes><Groups /></PrivateRoutes>}
          />

          {/* Project detail */}
          <Route
            path="/groups/:groupId/projects/:projectId"
            element={<PrivateRoutes><ProjectPage /></PrivateRoutes>}
          />

          {/* Task detail */}
          <Route
            path="/groups/:groupId/projects/:projectId/tasks/:taskId"
            element={<PrivateRoutes><TaskPage /></PrivateRoutes>}
          />
        </Routes>
      </BrowserRouter>
    </AuthContext>
  );
}

export default App;