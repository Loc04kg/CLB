import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Users, Star, Loader2, Plus, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Tất cả', 'Thể Thao', 'Nghệ Thuật', 'Xã Hội', 'Cộng Đồng'];

export default function ClubsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const initialCategory = searchParams.get('category') || 'Tất cả';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTargetClub, setJoinTargetClub] = useState<{ id: string; name: string } | null>(null);
  const [appForm, setAppForm] = useState({
    fullName: '', studentId: '', className: '', address: '', phone: '', dateOfBirth: ''
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClub, setNewClub] = useState({ name: '', description: '', category: 'Cộng Đồng', logoUrl: '' });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewClub({ ...newClub, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs');
      setClubs(res.data);
    } catch (error) {
      console.error("Fetch clubs error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showJoinModal && user) {
      setAppForm({
        fullName: user.name || '',
        studentId: (user as any).studentId || '',
        className: (user as any).className || '',
        address: (user as any).address || '',
        phone: (user as any).phone || '',
        dateOfBirth: (user as any).dateOfBirth || ''
      });
    }
  }, [showJoinModal, user]);

  const handleJoin = (club: { id: string; name: string }) => {
    if (!user) return navigate('/login');
    setJoinTargetClub(club);
    setShowJoinModal(true);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTargetClub) return;
    if (!appForm.fullName.trim() || !appForm.studentId.trim() || !appForm.className.trim() || !appForm.phone.trim()) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setJoining(true);
    try {
      await api.post(`/clubs/${joinTargetClub.id}/join`, appForm);
      alert('📨 Đã gửi đơn ứng tuyển! Chờ chủ nhiệm CLB duyệt.');
      setShowJoinModal(false);
      setJoinTargetClub(null);
      fetchClubs();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể tham gia CLB');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateClub = async () => {
    if (!newClub.name.trim()) return alert('Vui lòng nhập tên CLB');
    setCreating(true);
    try {
      await api.post('/clubs', newClub);
      alert('✅ Đã gửi yêu cầu tạo CLB! Vui lòng chờ Admin duyệt.');
      setShowCreateForm(false);
      setNewClub({ name: '', description: '', category: 'Cộng Đồng', logoUrl: '' });
    } catch (error: any) {
      alert(error.response?.data?.message || "Không thể tạo CLB");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
    else setActiveCategory('Tất cả');
  }, [searchParams]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'Tất cả') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      setSearchParams(newParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  const filteredClubs = Array.isArray(clubs) ? clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Tất cả' || club.category === activeCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  return (
    <div className="pb-20 bg-gray-50 dark:bg-black min-h-screen pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Cộng đồng <span className="text-orange-600">CLB</span></h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg">Khám phá và tham gia vào hàng chục câu lạc bộ đa dạng, phát triển bản thân và xây dựng mối quan hệ.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {user && (
              <button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Tạo CLB mới</span>
              </button>
            )}
            <div className="relative group flex-1 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-orange-600 transition-colors">
                <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm CLB..."
                className="block w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 dark:text-white shadow-sm transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Create Club Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateForm(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-gray-900">Đề xuất CLB mới</h2>
                  <button onClick={() => setShowCreateForm(false)} className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="w-32 h-32 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group/img relative">
                      {newClub.logoUrl ? (
                        <img src={newClub.logoUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <Plus className="w-8 h-8 text-gray-300" />
                      )}
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tải lên Logo CLB</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Tên câu lạc bộ *</label>
                    <input 
                      type="text"
                      placeholder="VD: CLB Cờ Vua HUTECH"
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                      value={newClub.name}
                      onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mô tả CLB</label>
                    <textarea 
                      placeholder="Mục đích và hoạt động chính..."
                      rows={3}
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl text-gray-900 focus:ring-2 focus:ring-orange-600/20 resize-none"
                      value={newClub.description}
                      onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Danh mục</label>
                    <select 
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 appearance-none"
                      value={newClub.category}
                      onChange={(e) => setNewClub({...newClub, category: e.target.value})}
                    >
                      {CATEGORIES.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                    <p className="text-xs text-orange-700 font-medium">⚠️ Sau khi gửi, yêu cầu sẽ được Admin trường xem xét và duyệt. Trạng thái mặc định là <strong>PENDING</strong>.</p>
                  </div>
                  
                  <button 
                    onClick={handleCreateClub}
                    disabled={creating}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100 disabled:bg-gray-300"
                  >
                    {creating ? 'Đang gửi...' : 'GỬI YÊU CẦU TẠO CLB'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${activeCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-orange-900/20' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 border border-gray-100 dark:border-gray-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Clubs Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold">Đang tải danh sách CLB...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredClubs.map((club) => (
                <motion.div
                  key={club.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -8 }}
                  className="bg-white dark:bg-gray-900 rounded-[40px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:shadow-gray-200 dark:hover:shadow-orange-900/10 transition-all group flex flex-col h-full"
                >
                  <div className="relative h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={club.logoUrl || ''} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-sm">{club.category || 'Cộng đồng'}</div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors mb-3 leading-tight">{club.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{club.description}</p>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span>{club._count?.members || 0} thành viên</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span>4.8</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => navigate(`/clubs/${club.id}`)}
                        className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        Chi tiết
                      </button>
                      <button 
                        onClick={() => handleJoin({ id: club.id, name: club.name })}
                        className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all group/btn flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Tham gia
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Recruitment Form Modal */}
      <AnimatePresence>
        {showJoinModal && joinTargetClub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Đơn ứng tuyển câu lạc bộ</h3>
                  <p className="text-xs text-orange-600 font-bold mt-1">Điền đầy đủ thông tin để ứng tuyển vào {joinTargetClub.name}</p>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    type="text" required
                    value={appForm.fullName}
                    onChange={e => setAppForm({ ...appForm, fullName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">MSSV *</label>
                    <input
                      type="text" required
                      value={appForm.studentId}
                      onChange={e => setAppForm({ ...appForm, studentId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="2011060000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lớp *</label>
                    <input
                      type="text" required
                      value={appForm.className}
                      onChange={e => setAppForm({ ...appForm, className: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="20DTHB1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <input
                    type="text" required
                    value={appForm.phone}
                    onChange={e => setAppForm({ ...appForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    placeholder="0901234567"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={appForm.dateOfBirth}
                      onChange={e => setAppForm({ ...appForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Địa chỉ</label>
                    <input
                      type="text"
                      value={appForm.address}
                      onChange={e => setAppForm({ ...appForm, address: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="Quận 9, TP.HCM"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-xs uppercase tracking-widest"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={joining}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Nộp đơn ứng tuyển
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
