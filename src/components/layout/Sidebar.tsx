import { Link, useLocation } from 'react-router-dom';
import { 
  Home, List, Users, 
  Settings, Heart, Star, Compass,
  Trophy, Palette, Globe, ShieldCheck, LayoutDashboard,
  CalendarCheck, MessageSquare, X, ClipboardCheck, Wallet, Trello, Calendar,
  BookOpen, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { user, role } = useAuth();

  const MENU_ITEMS = [
    { group: 'Chính', items: [
      { name: 'Trang Chủ', path: '/', icon: <Home className="w-5 h-5" /> },
      { name: 'Danh Sách CLB', path: '/clubs', icon: <List className="w-5 h-5" /> },
      { name: 'Sự Kiện', path: '/events', icon: <Compass className="w-5 h-5" /> },
      { name: 'Blog Tin Tức', path: '/blog', icon: <MessageSquare className="w-5 h-5 text-orange-600" />, color: 'text-orange-600' },
      { name: 'Học Viện Elite', path: '/training', icon: <BookOpen className="w-5 h-5 text-purple-600" />, color: 'text-purple-600' },
      { name: 'Truyền Thống', path: '/tradition', icon: <History className="w-5 h-5 text-green-600" />, color: 'text-green-600' },
    ]},
    { group: 'Cá nhân', items: [
      { name: 'Bảng Điều Khiển', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { name: 'CLB Của Tôi', path: '/my-clubs', icon: <Star className="w-5 h-5 text-yellow-500" />, color: 'text-yellow-500' },
      { name: 'Điểm Danh AI', path: '/attendance', icon: <CalendarCheck className="w-5 h-5 text-orange-600" />, color: 'text-orange-600' },
      { name: 'Trợ Lý AI', path: '/ai-assistant', icon: <MessageSquare className="w-5 h-5 text-blue-600" />, color: 'text-blue-600' },
      { name: 'Khuyến Nghị', path: '/recommendations', icon: <Heart className="w-5 h-5" /> },
    ]},
  ];

  if (role === 'ADMIN') {
    MENU_ITEMS.push({
      group: 'Quản trị hệ thống',
      items: [
        { name: 'Duyệt Yêu Cầu', path: '/admin/approvals', icon: <ShieldCheck className="w-5 h-5 text-red-600" />, color: 'text-red-600' },
        { name: 'Quản Lý Thành Viên', path: '/members', icon: <Users className="w-5 h-5" /> },
      ]
    });
  }

  if (role === 'LEADER') {
    MENU_ITEMS.push({
      group: 'Quản lý CLB',
      items: [
        { name: 'Điều Hành CLB', path: '/club/manage', icon: <Settings className="w-5 h-5" /> },
        { name: 'Thành Viên CLB', path: '/members', icon: <Users className="w-5 h-5" /> },
        { name: 'Quản Lý Tài Chính', path: '/club/finance', icon: <Wallet className="w-5 h-5 text-orange-500" />, color: 'text-orange-500' },
        { name: 'Quản Lý Công Việc', path: '/club/tasks', icon: <Trello className="w-5 h-5 text-purple-600" />, color: 'text-purple-600' },
        { name: 'Quản Lý Sự Kiện', path: '/club/events', icon: <Calendar className="w-5 h-5 text-blue-500" />, color: 'text-blue-500' },
        { name: 'Quản Lý Điểm Danh', path: '/club/attendance', icon: <ClipboardCheck className="w-5 h-5 text-green-600" />, color: 'text-green-600' },
      ]
    });
  }

  MENU_ITEMS.push({
    group: 'Chuyên mục', items: [
      { name: 'Thể Thao', path: '/clubs?category=Thể Thao', icon: <Trophy className="w-5 h-5 text-blue-500" />, color: 'text-blue-500' },
      { name: 'Nghệ Thuật', path: '/clubs?category=Nghệ Thuật', icon: <Palette className="w-5 h-5 text-orange-500" />, color: 'text-orange-500' },
      { name: 'Xã Hội', path: '/clubs?category=Xã Hội', icon: <Globe className="w-5 h-5 text-pink-500" />, color: 'text-pink-500' },
      { name: 'Cộng Đồng', path: '/clubs?category=Cộng Đồng', icon: <Users className="w-5 h-5 text-purple-500" />, color: 'text-purple-500' },
    ]
  });

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-8 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group" onClick={handleLinkClick}>
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
            H
          </div>
          <span className="text-sm font-black tracking-tighter leading-none text-gray-900 dark:text-white border-2 border-orange-100 dark:border-gray-800 px-2 py-1 rounded-lg">
            HUTECH CLB
          </span>
        </Link>
        <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-8 pb-10 overflow-y-auto no-scrollbar">
        {MENU_ITEMS.map((group, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                    location.pathname === item.path 
                      ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-400 shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`${item.color || 'text-gray-400'} group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      {user && (
        <div className="p-4 border-t border-gray-50 dark:border-gray-800/50">
           <Link to="/dashboard" onClick={handleLinkClick} className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                 <div className="text-xs font-bold text-gray-900 dark:text-white">{user.name}</div>
                 <div className="text-[10px] text-gray-400 font-medium italic">{role}</div>
              </div>
           </Link>
        </div>
      )}
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-[#0a0a0a] shadow-2xl z-50 flex flex-col border-r border-gray-100 dark:border-gray-900"
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
