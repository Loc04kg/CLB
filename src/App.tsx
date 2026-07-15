import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ClubsPage from './pages/ClubsPage';
import ClubDetailPage from './pages/ClubDetailPage';
import EventsPage from './pages/EventsPage';
import AttendancePage from './pages/AttendancePage';
import AIAssistantPage from './pages/AIAssistantPage';
import AdminPage from './pages/AdminPage';
import ClubManagementPage from './pages/ClubManagementPage';
import CreateClubPage from './pages/CreateClubPage';
import AttendanceManagementPage from './pages/AttendanceManagementPage';
import MembersPage from './pages/MembersPage';
import MyClubsPage from './pages/MyClubsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import FinancePage from './pages/FinancePage';
import TaskBoardPage from './pages/TaskBoardPage';
import EventManagementPage from './pages/EventManagementPage';
import BlogPage from './pages/BlogPage';
import AttendanceKioskPage from './pages/AttendanceKioskPage';
import TrainingPage from './pages/TrainingPage';
import TraditionPage from './pages/TraditionPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ChatWidget from './components/ChatWidget';
import ProtectedRoute from './components/layout/ProtectedRoute';

function AppContent() {
  const location = useLocation();
  const { role, loading } = useAuth();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin');
  const isHomePage = location.pathname === '/';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Wait for auth state before rendering
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-x-hidden transition-colors">
      {/* Only show nav for non-auth, non-admin pages */}
      {!isAuthPage && !isAdminPage && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      {!isAuthPage && !isAdminPage && <TopBar onMenuClick={() => setIsSidebarOpen(true)} />}
      
      <main className={!isAuthPage && !isAdminPage && !isHomePage ? 'pt-20' : ''}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Admin routes - completely separate UI */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPage /></ProtectedRoute>} />
          
          {/* Student/Leader routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute><ClubsPage /></ProtectedRoute>} />
          <Route path="/clubs/create" element={<ProtectedRoute><CreateClubPage /></ProtectedRoute>} />
          <Route path="/clubs/:id" element={<ProtectedRoute><ClubDetailPage /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
          <Route path="/club/manage" element={<ProtectedRoute><ClubManagementPage /></ProtectedRoute>} />
          <Route path="/club/attendance" element={<ProtectedRoute><AttendanceManagementPage /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/my-clubs" element={<ProtectedRoute><MyClubsPage /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
          <Route path="/club/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
          <Route path="/club/tasks" element={<ProtectedRoute><TaskBoardPage /></ProtectedRoute>} />
          <Route path="/club/events" element={<ProtectedRoute><EventManagementPage /></ProtectedRoute>} />
          <Route path="/blog" element={<ProtectedRoute><BlogPage /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
          <Route path="/tradition" element={<ProtectedRoute><TraditionPage /></ProtectedRoute>} />
          <Route path="/attendance/kiosk" element={<ProtectedRoute><AttendanceKioskPage /></ProtectedRoute>} />
        </Routes>
      </main>

      {!isAuthPage && <ChatWidget />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
