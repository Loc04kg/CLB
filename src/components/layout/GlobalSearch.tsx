import { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface SearchItem {
  id: string;
  name: string;
  imageUrl?: string;
  type: 'CLUB' | 'EVENT';
  subtitle?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allData, setAllData] = useState<{ clubs: any[], events: any[] }>({ clubs: [], events: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchAllData();
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [clubsRes, eventsRes] = await Promise.all([
        api.get('/clubs'),
        api.get('/events')
      ]);
      setAllData({
        clubs: clubsRes.data,
        events: eventsRes.data
      });
    } catch (error) {
      console.error("Error fetching search data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    
    const matchedClubs = allData.clubs
      .filter(c => c.name.toLowerCase().includes(searchTerm) || c.category?.toLowerCase().includes(searchTerm))
      .map(c => ({
        id: c.id,
        name: c.name,
        imageUrl: c.logoUrl,
        type: 'CLUB' as const,
        subtitle: c.category
      }));

    const matchedEvents = allData.events
      .filter(e => e.title.toLowerCase().includes(searchTerm))
      .map(e => ({
        id: e.id,
        name: e.title,
        imageUrl: e.imageUrl,
        type: 'EVENT' as const,
        subtitle: new Date(e.eventDate).toLocaleDateString('vi-VN')
      }));

    setResults([...matchedClubs, ...matchedEvents]);
  }, [query, allData]);

  const handleResultClick = (item: SearchItem) => {
    onClose();
    if (item.type === 'CLUB') {
      navigate(`/clubs/${item.id}`);
    } else {
      navigate(`/events/${item.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl rounded-3xl z-[101] overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="relative border-b border-gray-100 dark:border-gray-800">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-14 pr-12 py-5 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 text-lg font-medium"
                placeholder="Tìm kiếm CLB hoặc sự kiện..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-6 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {isLoading && !allData.clubs.length && !allData.events.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Đang tải dữ liệu...</p>
                </div>
              ) : query && results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-10 w-10 mx-auto text-gray-300 mb-4" />
                  <p className="text-sm font-medium">Không tìm thấy kết quả nào cho "{query}"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleResultClick(item)}
                      className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl cursor-pointer transition-all group"
                    >
                      {/* Image / Icon */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : item.type === 'CLUB' ? (
                          <Users className="w-6 h-6 text-gray-400" />
                        ) : (
                          <Calendar className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            item.type === 'CLUB' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                            {item.type === 'CLUB' ? 'CLB' : 'Sự Kiện'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-500">
              <span>Mẹo: Tìm kiếm theo tên hoặc danh mục</span>
              <div className="flex gap-2">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans text-[10px] font-bold shadow-sm">ESC</kbd>
                <span>để đóng</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
