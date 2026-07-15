import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Users, Calendar, CheckCircle, Clock, Plus, BarChart3, 
  Settings, LogOut, ArrowUpRight, TrendingUp, ShieldAlert, MapPin,
  Camera, User as UserIcon, Edit2, Smartphone, Club, Fingerprint
} from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import React, { useState } from 'react';
import api from '../lib/api';
import { uploadFile } from '../lib/upload';

export default function DashboardPage() {
  const { user, role, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dashboardData, setDashboardData] = useState<{stats: any[], chartData: any[]} | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    major: (user as any)?.major || '',
    interests: (user as any)?.interests || '',
    skills: (user as any)?.skills || '',
    bio: (user as any)?.bio || '',
    phone: (user as any)?.phone || '',
    address: (user as any)?.address || '',
    className: (user as any)?.className || '',
    dateOfBirth: (user as any)?.dateOfBirth || ''
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/users/${user?.id}`, profileForm);
      alert('Cập nhật hồ sơ thành công!');
      setIsProfileModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật hồ sơ');
    }
  };

  React.useEffect(() => {
    if (user) {
      api.get('/stats').then(res => setDashboardData(res.data)).catch(console.error);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="pt-32 text-center space-y-4 px-4">
        <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 mx-auto mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Oops! Bạn chưa đăng nhập</h2>
        <p className="text-gray-500 max-w-sm mx-auto">Vui lòng đăng nhập bằng tài khoản HUTECH để truy cập bảng điều khiển cá nhân.</p>
        <button 
          onClick={() => window.location.href = '/login'} 
          className="mt-4 px-8 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileUrl = await uploadFile(file);
      await api.put(`/users/${user.id}`, { faceImage: fileUrl });
      window.location.reload(); 
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Lỗi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const registerFingerprint = async () => {
    try {
      const optsRes = await api.get('/webauthn/register/generate-options');
      const authResp = await startRegistration({ optionsJSON: optsRes.data });
      const verifyRes = await api.post('/webauthn/register/verify', authResp);
      if (verifyRes.data?.verified) {
        alert('Đăng ký vân tay / FaceID (thiết bị) thành công!');
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        alert('Đã hủy thao tác.');
      } else {
        alert('Lỗi đăng ký vân tay: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div className="pt-8 pb-20 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Card */}
        <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-3xl -z-0"></div>
          
          <div className="relative z-10 shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative group bg-gray-100">
              {(user as any).faceImage ? (
                <img src={(user as any).faceImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <UserIcon className="w-16 h-16" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
              </label>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 rounded-[40px] flex items-center justify-center z-20">
                <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-full flex items-center justify-center text-white shadow-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4 relative z-10">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{user.name}</h1>
                <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{role}</span>
              </div>
              <p className="text-gray-500 font-medium">{user.email} • MSSV: {(user as any).studentId}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 text-xs font-bold text-gray-600">
                <MapPin className="w-4 h-4 text-orange-600" />
                Cơ sở E3, Quận 9
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-2xl border border-orange-100 text-xs font-bold hover:bg-orange-100 transition-colors">
                <Edit2 className="w-4 h-4" />
                Chỉnh sửa hồ sơ
              </button>
              <button 
                onClick={registerFingerprint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-xs font-bold hover:bg-blue-100 transition-colors">
                <Fingerprint className="w-4 h-4" />
                Đăng ký Vân tay
              </button>
            </div>
          </div>

          <div className="relative z-10">
             <button 
              onClick={logout}
              className="p-4 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-3xl transition-all border border-gray-100"
             >
                <LogOut className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {(dashboardData?.stats || []).map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' :
                'bg-purple-50 text-purple-600'
              }`}>
                {stat.color === 'blue' ? <Club className="w-6 h-6" /> :
                 stat.color === 'orange' ? <Calendar className="w-6 h-6" /> :
                 stat.color === 'green' ? <Users className="w-6 h-6" /> :
                 <BarChart3 className="w-6 h-6" />}
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hoạt động tham gia</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Thống kê trong 6 tháng qua</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  <button className="px-4 py-2 bg-white text-gray-900 text-[10px] font-black rounded-xl shadow-sm border border-gray-100">HÀNG THÁNG</button>
                  <button className="px-4 py-2 text-gray-400 text-[10px] font-black rounded-xl">HÀNG TUẦN</button>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData?.chartData || []}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '15px 25px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#f97316" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="bg-gray-900 p-8 rounded-[40px] text-white flex flex-col justify-between group cursor-pointer hover:bg-orange-600 transition-all">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-white group-hover:text-orange-600 transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Đề xuất CLB mới</h4>
                    <p className="text-gray-400 text-sm group-hover:text-white/80 transition-colors">Bạn muốn thành lập một cộng đồng mới?</p>
                  </div>
               </div>
               
               <div className="bg-white p-8 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col justify-between group cursor-pointer hover:border-orange-600 hover:bg-orange-50/30 transition-all">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-orange-600 group-hover:text-white transition-all text-gray-400">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Tải App Mobile</h4>
                    <p className="text-gray-500 text-sm group-hover:text-orange-900/60 transition-colors">Theo dõi hoạt động mọi lúc mọi nơi.</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Sidebar: Timeline */}
          <div className="space-y-10">
            <div className="bg-white p-8 md:p-10 rounded-[40px] border border-gray-100 shadow-sm h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Thông báo</h3>
                <span className="w-2 h-2 bg-orange-600 rounded-full animate-ping"></span>
              </div>
              
              <div className="space-y-10 relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-50"></div>
                
                {[
                  { title: 'Điểm danh thành công', time: '10 phút trước', desc: 'Sự kiện "H-Tech Workshop"', color: 'green' },
                  { title: 'Sự kiện sắp diễn ra', time: '2 giờ tới', desc: 'Họp ban chủ nhiệm CLB P-Art', color: 'orange' },
                  { title: 'CLB mới được phê duyệt', time: 'Hôm qua', desc: 'CLB Guitar đã chính thức hoạt động', color: 'blue' },
                  { title: 'Nhắc nhở cập nhật FaceID', time: '2 ngày trước', desc: 'Vui lòng cập nhật ảnh chân dung mới', color: 'purple' },
                ].map((item, i) => (
                  <div key={i} className="relative pl-10 group">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125 ${
                      item.color === 'green' ? 'bg-green-500' :
                      item.color === 'orange' ? 'bg-orange-500' :
                      item.color === 'blue' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}></div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-gray-900">{item.title}</h4>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-12 py-5 bg-gray-950 text-white rounded-[32px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all group">
                Xem tất cả hoạt động
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Chỉnh sửa hồ sơ</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chuyên ngành</label>
                <input 
                  type="text" 
                  value={profileForm.major} 
                  onChange={e => setProfileForm({...profileForm, major: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Ví dụ: Công nghệ thông tin"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Lớp</label>
                <input 
                  type="text" 
                  value={profileForm.className} 
                  onChange={e => setProfileForm({...profileForm, className: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Ví dụ: 20DTHB1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                  <input 
                    type="text" 
                    value={profileForm.phone} 
                    onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    placeholder="Ví dụ: 0901234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ngày sinh</label>
                  <input 
                    type="date" 
                    value={profileForm.dateOfBirth} 
                    onChange={e => setProfileForm({...profileForm, dateOfBirth: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ</label>
                <input 
                  type="text" 
                  value={profileForm.address} 
                  onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Ví dụ: Quận 9, TP.HCM"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sở thích</label>
                <input 
                  type="text" 
                  value={profileForm.interests} 
                  onChange={e => setProfileForm({...profileForm, interests: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Cách nhau bởi dấu phẩy"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Kỹ năng</label>
                <input 
                  type="text" 
                  value={profileForm.skills} 
                  onChange={e => setProfileForm({...profileForm, skills: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Cách nhau bởi dấu phẩy"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Giới thiệu bản thân</label>
                <textarea 
                  value={profileForm.bio} 
                  onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl h-24"
                  placeholder="Viết một chút về bạn..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-3 text-white font-bold bg-orange-600 rounded-xl">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
