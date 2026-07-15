import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Calendar, Loader2, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function MyClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchMyClubs();
  }, [user]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      setClubs(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-8 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">CLB <span className="text-orange-600">của tôi</span></h1>
          <p className="text-gray-500 max-w-lg">Các câu lạc bộ bạn đã tham gia và được duyệt. Chọn CLB để xem chi tiết và sự kiện.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 mx-auto">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bạn chưa tham gia CLB nào</h2>
            <p className="text-gray-500 max-w-sm mx-auto">Hãy khám phá danh sách CLB và gửi yêu cầu tham gia.</p>
            <Link to="/clubs" className="inline-flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">
              Khám phá CLB
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {clubs.map((club) => (
              <motion.div 
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={club.logoUrl || ''} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-6 left-6">
                    <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {club.memberRole || 'MEMBER'}
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{club.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{club.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-bold">
                    <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{club._count?.members || 0} TV</span></div>
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /><span>{club.events?.length || 0} sự kiện</span></div>
                  </div>
                  
                  {/* Events preview */}
                  {club.events && club.events.length > 0 && (
                    <div className="border-t border-gray-50 pt-4 space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sự kiện sắp tới</h4>
                      {club.events.slice(0, 2).map((ev: any) => (
                        <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{ev.title}</div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ev.eventDate).toLocaleDateString('vi-VN')}
                              {ev.location && <><MapPin className="w-3 h-3 ml-1" />{ev.location}</>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link 
                    to="/attendance" 
                    className="block w-full text-center py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all"
                  >
                    Điểm danh CLB này
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
