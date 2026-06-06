import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { Sidebar } from './components/Sidebar.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';

// Pages
import { Login } from './pages/Login.js';
import { Signup } from './pages/Signup.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { Dashboard } from './pages/Dashboard.js';
import { Employees } from './pages/Employees.js';
import { Projects } from './pages/Projects.js';
import { Attendance } from './pages/Attendance.js';
import { Performance } from './pages/Performance.js';
import { Leaves } from './pages/Leaves.js';
import { Reports } from './pages/Reports.js';
import { AuditLogs } from './pages/AuditLogs.js';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-slate-900 text-slate-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
};

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { loadProfile } = useAuthStore();

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthLayout>
            <Signup />
          </AuthLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPassword />
          </AuthLayout>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedLayout>
            <Employees />
          </ProtectedLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedLayout>
            <Projects />
          </ProtectedLayout>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedLayout>
            <Attendance />
          </ProtectedLayout>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedLayout>
            <Performance />
          </ProtectedLayout>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedLayout>
            <Leaves />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <Reports />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout>
            <AuditLogs />
          </ProtectedLayout>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
