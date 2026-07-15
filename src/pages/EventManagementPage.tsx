import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Clock, Plus, Search, 
  Loader2, X, Users, Eye, Trash2, Send, 
  Save, AlertCircle, CheckCircle, Clock3, 
  XCircle, Filter, Edit3, MoreVertical, QrCode
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type EventStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function EventManagementPage() {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState<EventStatus>('APPROVED');

  // Create/Edit Event State
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    clubId: '', 
    title: '', 
    description: '', 
    location: '', 
    eventDate: '',
    image: '',
    latitude: '',
    longitude: '',
    maxCapacity: ''
  });

  // Registrations state
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [showQRForEvent, setShowQRForEvent] = useState<any>(null);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  useEffect(() => {
    if (selectedClubId) {
      fetchEvents();
    }
  }, [selectedClubId]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      const managedClubs = res.data.filter((c: any) => 
        user?.role === 'ADMIN' || c.memberRole === 'LEADER'
      );
      setMyClubs(managedClubs);
      if (managedClubs.length > 0) {
        setSelectedClubId(managedClubs[0].id);
        setNewEvent(prev => ({ ...prev, clubId: managedClubs[0].id }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await api.get(`/events/club/${selectedClubId}`);
      setEvents(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateOrUpdateEvent = async (isDraft: boolean) => {
    if (!newEvent.title?.trim() || !newEvent.clubId || !newEvent.eventDate) {
      const missing = [];
      if (!newEvent.title?.trim()) missing.push("Tên sự kiện");
      if (!newEvent.clubId) missing.push(`Lỗi CLB (Giá trị hiện tại: "${newEvent.clubId}")`);
      if (!newEvent.eventDate) missing.push("Ngày & Giờ (Lưu ý: Bạn phải chọn ĐẦY ĐỦ cả Ngày, Giờ và SA/CH (AM/PM) thì hệ thống mới nhận diện được)");
      return alert('Vui lòng nhập đầy đủ: ' + missing.join(', ') + ' | Toàn bộ dữ liệu: ' + JSON.stringify(newEvent));
    }
    setCreating(true);
    try {
      const payload = { 
        ...newEvent, 
        isDraft, 
        imageUrl: newEvent.image,
        latitude: newEvent.latitude || undefined,
        longitude: newEvent.longitude || undefined,
        maxCapacity: newEvent.maxCapacity || undefined,
      };
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
        alert(isDraft ? '💾 Đã lưu bản nháp!' : '✅ Đã gửi cập nhật! Vui lòng chờ Admin duyệt.');
      } else {
        await api.post('/events', payload);
        alert(isDraft ? '💾 Đã lưu bản nháp!' : '✅ Đã gửi yêu cầu! Vui lòng chờ Admin duyệt.');
      }
      setShowCreateEvent(false);
      setEditingEvent(null);
      setNewEvent({ clubId: selectedClubId, title: '', description: '', location: '', eventDate: '', image: '', latitude: '', longitude: '', maxCapacity: '' });
      fetchEvents();
    } catch (error: any) {
      const msg = error.response?.data?.message
        || (error.response?.status === 413 ? 'Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn' : null)
        || error.message
        || 'Lỗi khi xử lý sự kiện';
      alert(msg);
    } finally {
      setCreating(false);
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

  const handleUpdateRegistrationStatus = async (registrationId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/events/${selectedEventForRegs.id}/registrations/${registrationId}/status`, { status });
      // Update local state
      setRegistrations(prev => 
        prev.map(reg => reg.id === registrationId ? { ...reg, status } : reg)
      );
      // Optional: alert success
      // alert(status === 'APPROVED' ? 'Đã duyệt thành viên' : 'Đã từ chối thành viên');
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setNewEvent({
      clubId: event.clubId,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      image: event.imageUrl || event.image || '',
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      latitude: event.latitude?.toString() || '',
      longitude: event.longitude?.toString() || '',
      maxCapacity: event.maxCapacity?.toString() || '',
    });
    setShowCreateEvent(true);
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ GPS');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewEvent(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
      },
      () => alert('Không lấy được vị trí. Hãy cấp quyền GPS cho trình duyệt.')
    );
  };

  // Nén ảnh xuống tối đa 800px và quality 0.75 trước khi gửi server
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 800;
          let { width, height } = img;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleEventImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setNewEvent(prev => ({ ...prev, image: compressed }));
      } catch {
        // fallback: đọc thẳng nếu compress lỗi
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewEvent(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const tabs: { id: EventStatus; label: string; icon: any; color: string }[] = [
    { id: 'APPROVED', label: 'Đã duyệt', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { id: 'PENDING', label: 'Chờ duyệt', icon: Clock3, color: 'text-amber-600 bg-amber-50' },
    { id: 'DRAFT', label: 'Bản nháp', icon: Save, color: 'text-gray-600 bg-gray-50' },
    { id: 'REJECTED', label: 'Từ chối', icon: XCircle, color: 'text-red-600 bg-red-50' },
  ];

  const filteredEvents = events.filter(e => e.status === activeTab);

  if (loading) return <div className="pt-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="pt-8 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Quản Lý Sự Kiện</h1>
            <p className="text-gray-500 font-medium mt-1">Quản lý các bản nháp, theo dõi trạng thái phê duyệt và danh sách đăng ký.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <select 
              className="flex-1 md:flex-none bg-white border-none rounded-2xl px-6 py-4 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-600/20"
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
            >
              {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              onClick={() => { 
                if (!selectedClubId) {
                  return alert('Bạn chưa quản lý hoặc chưa là thành viên Ban Chủ Nhiệm của bất kỳ Câu lạc bộ nào. Vui lòng tham gia hoặc tạo CLB trước khi tạo sự kiện!');
                }
                setEditingEvent(null); 
                setNewEvent({ clubId: selectedClubId, title: '', description: '', location: '', eventDate: '', image: '', latitude: '', longitude: '', maxCapacity: '' }); 
                setShowCreateEvent(true); 
              }}
              className={`rounded-2xl px-8 py-4 font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${!selectedClubId ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
            >
              <Plus className="w-5 h-5" /> Tạo sự kiện
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === tab.id 
                ? `${tab.color} shadow-sm border-2 border-current border-opacity-10 scale-105` 
                : 'bg-white text-gray-400 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-black ${activeTab === tab.id ? 'bg-white' : 'bg-gray-100'}`}>
                {events.filter(e => e.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Events Table / Grid */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          {loadingEvents ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /></div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-32 text-center text-gray-400 font-medium">
              <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 opacity-20" />
              </div>
              Không có sự kiện nào ở trạng thái này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sự kiện</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian & Địa điểm</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Đăng ký</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                            <img src={event.imageUrl || event.image || ''} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{event.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{event.description || 'Không có mô tả'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            {new Date(event.eventDate).toLocaleDateString('vi-VN')}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {event.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {event.status === 'APPROVED' ? (
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => fetchRegistrations(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all w-full justify-center"
                            >
                              <Users className="w-4 h-4" />
                              Xem danh sách
                            </button>
                            <button 
                              onClick={() => setShowQRForEvent(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold text-xs hover:bg-purple-600 hover:text-white transition-all w-full justify-center"
                            >
                              <QrCode className="w-4 h-4" />
                              Tạo QR
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-gray-300 uppercase italic">Chưa khả dụng</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditEvent(event)}
                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          {event.status === 'DRAFT' && (
                            <button 
                              onClick={() => { setEditingEvent(event); handleCreateOrUpdateEvent(false); }}
                              className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                              title="Gửi duyệt ngay"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create/Edit Event */}
      <AnimatePresence>
        {showCreateEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateEvent(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[40px] p-10 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">{editingEvent ? 'Chỉnh sửa' : 'Tạo mới'} Sự kiện</h2>
                 <button onClick={() => setShowCreateEvent(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6" /></button>
               </div>
               
               <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Tên sự kiện</label>
                   <input type="text" placeholder="VD: Đêm nhạc hội Thanh xuân..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} />
                 </div>

                 <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mô tả sự kiện</label>
                   <textarea rows={3} placeholder="Nội dung, mục đích và quyền lợi khi tham gia..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20 resize-none" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Địa điểm</label>
                     <input type="text" placeholder="VD: Sân G, Trụ sở chính" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20" value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Ngày & Giờ</label>
                     <input type="datetime-local" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20" value={newEvent.eventDate} onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})} />
                   </div>
                 </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Ảnh sự kiện (Tải lên hoặc URL)</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                      <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {newEvent.image ? (
                          <img src={newEvent.image} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <span className="text-gray-400 text-xs">Không ảnh</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleEventImageChange}
                          className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                        />
                        <input 
                          type="text" 
                          placeholder="Hoặc dán URL ảnh..." 
                          className="w-full bg-white border-none rounded-xl px-4 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-blue-600/20" 
                          value={newEvent.image} 
                          onChange={(e) => setNewEvent({...newEvent, image: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* GPS Tọa độ */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                        <span>📍</span> Tọa độ GPS Hội trường (Geofencing)
                      </label>
                      <button
                        type="button"
                        onClick={handleGetGPS}
                        className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1"
                      >
                        🎯 Lấy vị trí hiện tại
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Vĩ độ (Latitude)</label>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="10.771234"
                          className="w-full bg-green-50 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-green-600/20 text-sm"
                          value={newEvent.latitude}
                          onChange={(e) => setNewEvent({...newEvent, latitude: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Kinh độ (Longitude)</label>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="106.657890"
                          className="w-full bg-green-50 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-green-600/20 text-sm"
                          value={newEvent.longitude}
                          onChange={(e) => setNewEvent({...newEvent, longitude: e.target.value})}
                        />
                      </div>
                    </div>

                    {newEvent.latitude && newEvent.longitude && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] text-green-600 font-bold">✅ Đã có tọa độ — sinh viên phải ở trong vòng 100m để GPS check-in</p>
                        <div className="rounded-2xl overflow-hidden border-2 border-green-600/20 w-full bg-gray-50 h-48 relative">
                          <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no"
                            src={`https://maps.google.com/maps?q=${newEvent.latitude},${newEvent.longitude}&z=17&output=embed`} 
                            title="Bản đồ sự kiện"
                            className="absolute inset-0"
                          />
                        </div>
                      </div>
                    )}
                    {!newEvent.latitude && (
                      <p className="text-[10px] text-gray-400 mt-2">⚠️ Không bắt buộc — nếu để trống, GPS check-in sẽ không kiểm tra khoảng cách</p>
                    )}
                  </div>

                  {/* Số lượng tối đa */}
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Số lượng tối đa (Tùy chọn)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="VD: 100"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20"
                      value={newEvent.maxCapacity}
                      onChange={(e) => setNewEvent({...newEvent, maxCapacity: e.target.value})}
                    />
                  </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => handleCreateOrUpdateEvent(true)} disabled={creating} className="flex-1 py-5 bg-gray-100 text-gray-900 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                       <Save className="w-4 h-4" /> <span>Lưu nháp</span>
                    </button>
                    <button onClick={() => handleCreateOrUpdateEvent(false)} disabled={creating} className="flex-1 py-5 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100">
                       {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> <span>Gửi duyệt</span></>}
                    </button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: View Registrations */}
      <AnimatePresence>
        {selectedEventForRegs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEventForRegs(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-gray-900">Danh sách Đăng ký</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1">{selectedEventForRegs.title}</p>
                 </div>
                 <button onClick={() => setSelectedEventForRegs(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6" /></button>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {loadingRegs ? (
                    <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /></div>
                  ) : registrations.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-bold">Chưa có ai đăng ký sự kiện này.</div>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map(reg => (
                        <div key={reg.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg shadow-sm border border-gray-100">
                                {reg.user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-sm">{reg.user.name}</p>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{reg.user.studentId}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4 text-right">
                              {reg.status === 'PENDING' ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleUpdateRegistrationStatus(reg.id, 'APPROVED')}
                                    className="px-3 py-1.5 bg-green-50 text-green-600 rounded-xl font-bold text-xs hover:bg-green-600 hover:text-white transition-all flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateRegistrationStatus(reg.id, 'REJECTED')}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all flex items-center gap-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                                  </button>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${reg.status === 'APPROVED' ? 'text-green-600' : 'text-red-500'}`}>
                                    {reg.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold">{new Date(reg.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                              )}
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

      {/* Modal: Show QR Code */}
      <AnimatePresence>
        {showQRForEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQRForEvent(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
               <div className="absolute top-6 right-6">
                 <button onClick={() => setShowQRForEvent(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6" /></button>
               </div>
               
               <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                 <QrCode className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">QR Điểm danh</h3>
               <p className="text-sm font-bold text-gray-500 mb-8 max-w-full truncate">{showQRForEvent.title}</p>
               
               <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 inline-block mb-6">
                 <QRCode 
                   value={JSON.stringify({ eventId: showQRForEvent.id, type: 'attendance' })} 
                   size={200}
                   level="H"
                 />
               </div>
               
               <p className="text-xs text-gray-400">Sinh viên sử dụng App HUTECH CLB <br/>để quét mã này điểm danh.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
