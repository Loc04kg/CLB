import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, MapPin, Clock, ArrowRight, Bookmark, Search, 
  Loader2, Plus, X, CheckCircle, Edit, Users, Eye, 
  Trash2, Send, Save, AlertCircle, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function EventsPage() {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  
  const [myClubs, setMyClubs] = useState<any[]>([]);

  // Registrations state
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    fetchEvents();
    if (role === 'LEADER' || role === 'ADMIN') {
      fetchMyClubs();
    }
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (error) {
      console.error("Fetch events error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/events/my-clubs');
      setMyClubs(res.data);
      if (res.data.length > 0) {
        // Fetch drafts for each club
        const allDrafts: any[] = [];
        for (const club of res.data) {
          const draftRes = await api.get(`/events/drafts/${club.id}`);
          allDrafts.push(...draftRes.data);
        }
        setDrafts(allDrafts);
      }
    } catch (error) {
      console.error("Fetch my clubs/drafts error:", error);
    }
  };

  const handleRegister = async (eventId: string) => {
    setRegisteringId(eventId);
    try {
      const res = await api.post(`/events/${eventId}/register`);
      alert(res.data.message || '🎉 Đăng ký sự kiện thành công!');
    } catch (error: any) {
      alert(error.response?.data?.message || "Không thể đăng ký sự kiện");
    } finally {
      setRegisteringId(null);
    }
  };



  const fetchRegistrations = async (event: any) => {
    setSelectedEventForRegs(event);
    setLoadingRegs(true);
    try {
      const res = await api.get(`/events/${event.id}/registrations`);
      setRegistrations(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRegs(false);
    }
  };



  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-8 pb-20 bg-gray-50 dark:bg-black min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic">SỰ KIỆN <span className="text-blue-600 dark:text-blue-500 not-italic">HUTECH</span></h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg font-medium text-lg leading-relaxed">Khám phá và tham gia các hoạt động ngoại khóa để bùng nổ nhiệt huyết sinh viên.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            {(role === 'LEADER' || role === 'ADMIN') && (
              <Link 
                to="/club/events"
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Settings className="w-5 h-5" />
                <span>Quản lý sự kiện</span>
              </Link>
            )}
            <div className="relative group w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Tìm sự kiện..."
                className="block w-full pl-14 pr-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-blue-600/5 dark:focus:ring-blue-500/10 shadow-sm transition-all font-bold text-sm dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>



        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /></div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold">Không có sự kiện nào công khai.</div>
          ) : (
            filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                layout
                className="bg-white dark:bg-gray-900 rounded-[40px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full group hover:shadow-2xl hover:shadow-blue-600/5 dark:hover:shadow-blue-500/10 transition-all duration-500"
              >
                <div className="h-60 overflow-hidden relative">
                  <img src={event.imageUrl || event.image || ''} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm text-gray-900 dark:text-white text-[10px] uppercase font-black rounded-xl shadow-lg border border-white dark:border-gray-800">Sự kiện Sắp tới</span>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{event.club?.name}</span>
                    <div className="flex gap-2">
                       {(role === 'ADMIN' || (role === 'LEADER' && myClubs.some(c => c.id === event.clubId))) && (
                         <button onClick={() => fetchRegistrations(event)} className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Xem danh sách đăng ký"><Users className="w-4 h-4"/></button>
                       )}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">{event.title}</h3>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400"><Calendar className="w-4 h-4 text-blue-600 dark:text-blue-500" /> {new Date(event.eventDate).toLocaleDateString('vi-VN')}</div>
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400"><Clock className="w-4 h-4 text-blue-600 dark:text-blue-500" /> {new Date(event.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400"><MapPin className="w-4 h-4 text-blue-600 dark:text-blue-500" /> <span className="truncate">{event.location}</span></div>
                  </div>

                  <div className="mt-auto">
                    {user ? (
                      <button 
                        onClick={() => handleRegister(event.id)}
                        disabled={registeringId === event.id}
                        className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100 disabled:bg-gray-300"
                      >
                        {registeringId === event.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'ĐĂNG KÝ THAM GIA'}
                      </button>
                    ) : (
                      <a href="/login" className="block text-center w-full py-5 bg-gray-100 text-gray-500 rounded-[24px] font-black text-xs uppercase tracking-widest">Đăng nhập để đăng ký</a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal: View Registrations */}
      <AnimatePresence>
        {selectedEventForRegs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEventForRegs(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-gray-900 rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Danh sách Đăng ký</h3>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{selectedEventForRegs.title}</p>
                 </div>
                 <button onClick={() => setSelectedEventForRegs(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"><X className="w-6 h-6" /></button>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {loadingRegs ? (
                    <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /></div>
                  ) : registrations.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 dark:text-gray-500 font-bold">Chưa có ai đăng ký sự kiện này.</div>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map(reg => (
                        <div key={reg.id} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-3xl">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-500 font-black text-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                {reg.user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 dark:text-white text-sm">{reg.user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{reg.user.studentId}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${reg.status === 'PENDING' ? 'text-amber-500' : 'text-green-600 dark:text-green-500'}`}>
                                {reg.status === 'PENDING' ? 'Chờ duyệt' : 'Đã duyệt'}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{new Date(reg.createdAt).toLocaleDateString('vi-VN')}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
