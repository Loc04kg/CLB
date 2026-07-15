import { Search, User, Bell, Command, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/api';
import GlobalSearch from './GlobalSearch';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/users/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 8000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', clickOutside);
    return () => document.removeEventListener('click', clickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/users/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const isHomePage = location.pathname === '/';

  const getNotificationLink = (title: string, message: string, role?: string): string => {
    const lowerTitle = title.toLowerCase();
    const lowerMsg = message.toLowerCase();

    // 1. Password Reset Request (Admin only)
    if (lowerTitle.includes('mật khẩu') || lowerTitle.includes('reset')) {
      if (role === 'ADMIN') return '/admin?tab=resets';
      return '/forgot-password';
    }

    // 2. Chat / Support Messages
    if (
      lowerTitle.includes('hỏi đáp') ||
      lowerTitle.includes('tin nhắn') ||
      lowerMsg.includes('hỏi đáp') ||
      lowerMsg.includes('tin nhắn') ||
      lowerMsg.includes('hỗ trợ')
    ) {
      if (role === 'ADMIN') return '/admin?tab=chats';
      if (role === 'LEADER') return '/club/manage?tab=chats';
      return '/ai-assistant';
    }

    // 3. Leadership Transfers
    if (lowerTitle.includes('chuyển quyền') || lowerMsg.includes('chuyển quyền')) {
      if (role === 'ADMIN') return '/admin?tab=transfers';
      return '/club/manage';
    }

    // 4. Club Approvals & Creation
    if (
      lowerTitle.includes('câu lạc bộ') ||
      lowerTitle.includes('clb') ||
      lowerMsg.includes('câu lạc bộ') ||
      lowerMsg.includes('clb')
    ) {
      if (role === 'ADMIN') return '/admin?tab=clubs';
      return '/my-clubs';
    }

    // 5. Events
    if (
      lowerTitle.includes('sự kiện') ||
      lowerTitle.includes('sk') ||
      lowerMsg.includes('sự kiện') ||
      lowerMsg.includes('sk')
    ) {
      if (lowerTitle.includes('yêu cầu') || lowerMsg.includes('chờ phê duyệt')) {
        if (role === 'ADMIN') return '/admin?tab=events';
        return '/club/events';
      }
      return '/events';
    }

    // Default fallback
    return '/dashboard';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 h-20 z-30 px-6 flex items-center justify-between transition-all duration-300 ${isHomePage
        ? (isScrolled ? 'bg-white dark:bg-gray-900 shadow-lg border-b border-gray-100 dark:border-gray-800' : 'bg-transparent border-none')
        : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800'
        }`}>
        <div className="flex items-center">
        {/* Hamburger Menu - Image 2 Style */}
        <button
          onClick={onMenuClick}
          className={`p-2.5 mr-4 rounded-xl transition-all active:scale-95 ${isHomePage && !isScrolled ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links - Center */}
      <nav className="hidden lg:flex items-center gap-10 flex-1 justify-center">
        {[
          { name: 'TRANG CHỦ', path: '/' },
          { name: 'DANH SÁCH CLB', path: '/clubs' },
          { name: 'SỰ KIỆN', path: '/events' },
          { name: 'ĐÀO TẠO', path: 'https://www.hutech.edu.vn/e-hutech/dao-tao' },
          { name: 'BLOG', path: '/blog' }
        ].map(link => (
          <Link
            key={link.name}
            to={link.path}
            className={`text-xs font-black tracking-[0.2em] hover:text-orange-600 dark:hover:text-orange-500 transition-colors ${isHomePage && !isScrolled ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {/* Right side Actions */}
      <div className="flex items-center space-x-4 sm:space-x-8">
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`p-2.5 rounded-xl transition-all group ${isHomePage && !isScrolled ? 'text-white hover:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-xl transition-all ${isHomePage && !isScrolled ? 'text-white hover:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative notification-bell-container flex items-center">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 rounded-xl transition-all group ${isHomePage && !isScrolled ? 'text-white hover:bg-white/10' : 'text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-gray-800'
              }`}
          >
            <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-black bg-red-500 text-white rounded-full ring-2 ring-white animate-pulse min-w-[16px] h-[16px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 top-full w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-150 rounded-3xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                  <span className="font-black text-gray-900 dark:text-white text-sm">Thông Báo</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={async () => {
                          await handleMarkAsRead(n.id);
                          setShowNotifications(false);
                          const targetLink = getNotificationLink(n.title, n.message, user?.role);
                          navigate(targetLink);
                        }}
                        className={`p-4 hover:bg-gray-50/50 transition-colors cursor-pointer flex items-start space-x-3 ${!n.isRead ? 'bg-orange-50/25' : ''}`}
                      >
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.isRead ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className={`text-xs font-bold ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</h4>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed break-words">{n.message}</p>
                          <span className="text-[9px] text-gray-400 mt-1.5 block">
                            {new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-bounce" />
                      <p className="text-xs font-medium">Chưa có thông báo nào</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user ? (
          <div className="flex items-center gap-4 pl-4 border-l border-gray-100 dark:border-gray-800">
            <div className="text-right hidden sm:block">
              <div className={`text-sm font-black leading-none mb-1 ${isHomePage && !isScrolled ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>{user.name}</div>
              <div className={`text-[10px] font-bold tracking-widest uppercase ${isHomePage && !isScrolled ? 'text-white/70' : 'text-gray-400'
                }`}>{user.studentId}</div>
            </div>
            <Link to="/dashboard" className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-gray-50 dark:border-gray-800 shadow-sm bg-orange-50 dark:bg-gray-800 flex items-center justify-center group hover:border-orange-200 transition-all">
              {user.faceImage ? (
                <img src={user.faceImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Avatar" />
              ) : (
                <User className="w-6 h-6 text-orange-600 dark:text-orange-500" />
              )}
            </Link>
          </div>
        ) : (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link to="/login" className={`text-xs font-black px-2 sm:px-4 transition-colors block ${isHomePage && !isScrolled ? 'text-white hover:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}>
              Đăng Nhập
            </Link>
            <Link to="/register" className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-lg active:scale-95 group ${isHomePage && !isScrolled ? 'bg-white text-gray-900 hover:bg-orange-600 hover:text-white' : 'bg-gray-900 dark:bg-orange-600 text-white hover:bg-orange-600 dark:hover:bg-orange-700'
              }`}>
              <User className="w-4 h-4 hidden sm:block group-hover:scale-110 transition-transform" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-center">Đăng Ký</span>
            </Link>
          </div>
        )}
      </div>
      </header>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
