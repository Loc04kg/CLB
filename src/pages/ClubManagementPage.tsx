import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Shield, LayoutGrid, Plus,
  Settings, Search, MoreVertical, Loader2, Check, X, Edit, Camera, Link as LinkIcon, Trash2, Eye, UserCog, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

const CATEGORIES = ['Thể Thao', 'Nghệ Thuật', 'Xã Hội', 'Cộng Đồng'];

export default function ClubManagementPage() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'requests' | 'departments' | 'chats'>(() => {
    if (tabParam && ['settings', 'members', 'requests', 'departments', 'chats'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'settings';
  });

  useEffect(() => {
    if (tabParam && ['settings', 'members', 'requests', 'departments', 'chats'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMembers: 0, pendingMembers: 0, totalEvents: 0 });
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<any>(null);
  const [newRole, setNewRole] = useState<'LEADER' | 'MEMBER'>('MEMBER');
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  
  // Edit Club State
  const [editingClub, setEditingClub] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Club Chats States
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchClubChatRooms = async () => {
    if (!selectedClubId) return;
    try {
      const res = await api.get(`/chats/club/${selectedClubId}`);
      setChatRooms(res.data);
    } catch (error) {
      console.error("Error fetching club chat rooms:", error);
    }
  };

  const fetchClubChatHistory = async (userId: string) => {
    if (!selectedClubId) return;
    try {
      const res = await api.get(`/chats/club/${selectedClubId}/user/${userId}`);
      setChatMessages(res.data);
    } catch (error) {
      console.error("Error fetching club chat history:", error);
    }
  };

  const handleSendClubReply = async () => {
    if (!chatInput.trim() || !selectedClubId || !activeChatUserId || sendingReply) return;
    setSendingReply(true);
    try {
      const selectedClubObj = myClubs.find(c => c.id === selectedClubId);
      const res = await api.post('/chats', {
        message: chatInput.trim(),
        receiverId: activeChatUserId,
        clubId: selectedClubId,
        clubName: selectedClubObj?.name || '',
        isFromClubManager: true
      });
      setChatMessages(prev => [...prev, res.data]);
      setChatInput('');
      fetchClubChatRooms(); // refresh rooms list
    } catch (error) {
      console.error("Error sending club reply:", error);
    } finally {
      setSendingReply(false);
    }
  };

  // Poll chat rooms list
  useEffect(() => {
    if (activeTab === 'chats' && selectedClubId) {
      fetchClubChatRooms();
      const interval = setInterval(fetchClubChatRooms, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedClubId]);

  // Poll active chat history
  useEffect(() => {
    if (activeTab === 'chats' && selectedClubId && activeChatUserId) {
      fetchClubChatHistory(activeChatUserId);
      const interval = setInterval(() => fetchClubChatHistory(activeChatUserId), 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedClubId, activeChatUserId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  useEffect(() => {
    if (selectedClubId) fetchClubData();
  }, [selectedClubId]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      setMyClubs(res.data);
      if (res.data.length > 0) {
        setSelectedClubId(res.data[0].id);
        setEditingClub({ ...res.data[0] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubData = async () => {
    try {
      const [membersRes, deptsRes, pendingRes, statsRes] = await Promise.all([
        api.get(`/management/${selectedClubId}/members`),
        api.get(`/management/${selectedClubId}/departments`),
        api.get(`/clubs/${selectedClubId}/pending-members`),
        api.get(`/management/${selectedClubId}/stats`)
      ]);
      setMembers(membersRes.data);
      setDepartments(deptsRes.data);
      setPendingMembers(pendingRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMemberStatus = async (memberId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/clubs/${selectedClubId}/members/${memberId}/status`, { status });
      fetchClubData(); // refresh
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    try {
      await api.post(`/management/${selectedClubId}/departments`, { name: newDeptName });
      setNewDeptName('');
      setShowAddDept(false);
      fetchClubData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await api.post('/management/upload', { imageBase64: reader.result });
          if (type === 'logo') setEditingClub({ ...editingClub, logoUrl: res.data.url });
          else setEditingClub({ ...editingClub, coverUrl: res.data.url });
        } catch (err) {
          alert('Lỗi khi tải ảnh lên máy chủ');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateClub = async () => {
    if (!editingClub.name.trim()) return alert('Tên CLB không được để trống');
    setUpdating(true);
    try {
      const res = await api.put(`/clubs/${selectedClubId}`, editingClub);
      alert(res.data.message || 'Cập nhật thành công!');
      fetchMyClubs();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn khai trừ thành viên này khỏi CLB?')) return;
    try {
      await api.delete(`/management/${selectedClubId}/members/${memberId}`);
      fetchClubData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleMember) return;
    try {
      await api.put(`/management/${selectedClubId}/members/${editingRoleMember.id}/role`, {
        role: newRole,
        customTitle: newCustomTitle
      });
      setEditingRoleMember(null);
      fetchClubData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMemberToDept = async (userId: string) => {
    if (!selectedDept) return;
    try {
      await api.post(`/management/${selectedClubId}/departments/${selectedDept.id}/members`, { userId });
      fetchClubData();
      const updatedDept = await api.get(`/management/${selectedClubId}/departments`);
      setDepartments(updatedDept.data);
      setSelectedDept(updatedDept.data.find((d: any) => d.id === selectedDept.id));
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleRemoveMemberFromDept = async (userId: string) => {
    if (!selectedDept) return;
    try {
      await api.delete(`/management/${selectedClubId}/departments/${selectedDept.id}/members/${userId}`);
      fetchClubData();
      const updatedDept = await api.get(`/management/${selectedClubId}/departments`);
      setDepartments(updatedDept.data);
      setSelectedDept(updatedDept.data.find((d: any) => d.id === selectedDept.id));
    } catch (error) {
      console.error(error);
    }
  };

  const selectedClub = myClubs.find(c => c.id === selectedClubId);

  const filteredMembers = members.filter(m => 
    m.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.user.studentId.includes(searchTerm)
  );

  const availableMembersForDept = members.filter(m => 
    !selectedDept?.members?.find((dm: any) => dm.userId === m.userId) &&
    (m.user.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) || m.user.studentId.includes(deptSearchTerm))
  );

  if (loading) {
    return <div className="pt-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>;
  }

  if (myClubs.length === 0) {
    return (
      <div className="pt-32 text-center space-y-4 px-4">
        <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 mx-auto mb-6">
          <Shield className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Bạn chưa điều hành CLB nào</h2>
        <p className="text-gray-500 max-w-sm mx-auto">Hãy tạo CLB hoặc liên hệ Admin để được phân quyền Leader.</p>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden">
           {selectedClub?.coverUrl && (
             <div className="absolute inset-0 opacity-10">
               <img src={selectedClub.coverUrl} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-transparent" />
             </div>
           )}
           <div className="flex items-center space-x-6 relative z-10">
              <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                {selectedClub?.logoUrl ? (
                  <img src={selectedClub.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  selectedClub?.name?.charAt(0) || 'C'
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <select 
                    className="text-2xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                    value={selectedClubId}
                    onChange={(e) => {
                      setSelectedClubId(e.target.value);
                      setEditingClub({ ...myClubs.find(c => c.id === e.target.value) });
                    }}
                  >
                    {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Trạng thái: <span className={`font-bold ${selectedClub?.status === 'APPROVED' ? 'text-green-600' : 'text-orange-600'}`}>{selectedClub?.status}</span>
                </p>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-2 relative z-10">
              <button onClick={() => setActiveTab('settings')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Settings className="w-4 h-4" /> Thiết lập
              </button>
              <button onClick={() => setActiveTab('members')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'members' ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Users className="w-4 h-4" /> Thành viên
              </button>
              <button onClick={() => setActiveTab('requests')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 relative ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <UserPlus className="w-4 h-4" /> Yêu cầu
                {pendingMembers.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingMembers.length}</span>}
              </button>
              <button onClick={() => setActiveTab('departments')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'departments' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <LayoutGrid className="w-4 h-4" /> Phòng ban
              </button>
              <button onClick={() => setActiveTab('chats')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'chats' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <MessageSquare className="w-4 h-4" /> Hỏi đáp CLB
              </button>
           </div>
        </div>

        {/* Tab Nội dung */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* TAB THIẾT LẬP */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Dashboard Nội bộ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Users className="w-8 h-8" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng thành viên</p>
                      <p className="text-3xl font-black text-gray-900">{stats.totalMembers}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><UserPlus className="w-8 h-8" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang chờ duyệt</p>
                      <p className="text-3xl font-black text-gray-900">{stats.pendingMembers}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><LayoutGrid className="w-8 h-8" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sự kiện đã tổ chức</p>
                      <p className="text-3xl font-black text-gray-900">{stats.totalEvents}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Cập nhật thông tin CLB</h3>
                  {editingClub && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex gap-6">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {editingClub.logoUrl ? <img src={editingClub.logoUrl} className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-300" />}
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageChange(e, 'logo')} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo</span>
                          </div>
                          <div className="flex flex-col items-center gap-4 flex-1">
                            <div className="w-full h-24 bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {editingClub.coverUrl ? <img src={editingClub.coverUrl} className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-300" />}
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ảnh bìa</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Tên câu lạc bộ</label>
                          <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20" value={editingClub.name} onChange={(e) => setEditingClub({...editingClub, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mô tả CLB</label>
                          <textarea rows={4} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-gray-900 focus:ring-2 focus:ring-orange-600/20 resize-none" value={editingClub.description || ''} onChange={(e) => setEditingClub({...editingClub, description: e.target.value})} />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Danh mục</label>
                          <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20" value={editingClub.category || ''} onChange={(e) => setEditingClub({...editingClub, category: e.target.value})}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2"><LinkIcon className="w-3 h-3"/> Link Fanpage Facebook</label>
                          <input type="text" placeholder="https://facebook.com/..." className="w-full p-4 bg-blue-50 border-none rounded-2xl font-medium text-blue-900 focus:ring-2 focus:ring-blue-600/20" value={editingClub.facebookUrl || ''} onChange={(e) => setEditingClub({...editingClub, facebookUrl: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2"><LinkIcon className="w-3 h-3"/> Link Group Zalo</label>
                          <input type="text" placeholder="https://zalo.me/g/..." className="w-full p-4 bg-cyan-50 border-none rounded-2xl font-medium text-cyan-900 focus:ring-2 focus:ring-cyan-600/20" value={editingClub.zaloUrl || ''} onChange={(e) => setEditingClub({...editingClub, zaloUrl: e.target.value})} />
                        </div>
                        
                        <div className="pt-4">
                           <button onClick={handleUpdateClub} disabled={updating} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 disabled:bg-gray-300">
                             {updating ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}
                           </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB THÀNH VIÊN */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md">
                   <div className="p-3 text-gray-400"><Search className="w-5 h-5" /></div>
                   <input type="text" placeholder="Tìm kiếm thành viên theo tên hoặc MSSV..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="bg-gray-50 border-b border-gray-100">
                           <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thành viên</th>
                           <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chức vụ</th>
                           <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">MSSV</th>
                           <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày tham gia</th>
                           <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Thao tác</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {filteredMembers.map((member) => (
                           <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                             <td className="px-8 py-5">
                                <div className="flex items-center space-x-4">
                                   <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                                      {member.user.faceImage ? <img src={member.user.faceImage} className="w-full h-full object-cover rounded-xl" /> : member.user.name.charAt(0)}
                                   </div>
                                   <div>
                                      <div className="text-sm font-bold text-gray-900">{member.user.name}</div>
                                      <div className="text-xs text-gray-500">{member.user.email}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${member.role === 'LEADER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                     {member.role}
                                  </span>
                                  {member.customTitle && <span className="text-xs font-bold text-gray-600">{member.customTitle}</span>}
                                </div>
                             </td>
                             <td className="px-8 py-5 text-sm text-gray-600 font-bold">{member.user.studentId}</td>
                             <td className="px-8 py-5 text-sm text-gray-500 tabular-nums">
                                {new Date(member.joinDate).toLocaleDateString('vi-VN')}
                             </td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => setSelectedMemberProfile(member)} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors" title="Xem hồ sơ"><Eye className="w-4 h-4" /></button>
                                   <button onClick={() => { setEditingRoleMember(member); setNewRole(member.role); setNewCustomTitle(member.customTitle || ''); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="Chỉnh sửa chức vụ"><UserCog className="w-4 h-4" /></button>
                                   {member.userId !== user?.userId && (
                                     <button onClick={() => handleKickMember(member.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="Khai trừ"><Trash2 className="w-4 h-4" /></button>
                                   )}
                                </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              </div>
            )}

            {/* TAB YÊU CẦU */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {pendingMembers.length === 0 ? (
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-16 text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Không có yêu cầu nào</h3>
                    <p className="text-sm text-gray-500">Tất cả yêu cầu tham gia đã được xử lý.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingMembers.map((pm: any) => (
                      <div key={pm.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[24px] flex items-center justify-center font-black text-3xl mb-4">
                           {(pm.fullName || pm.user.name).charAt(0)}
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">{pm.fullName || pm.user.name}</h4>
                        <p className="text-sm text-gray-500 mb-1">{pm.studentId || pm.user.studentId}</p>
                        <p className="text-xs text-orange-600 font-bold mb-4">Lớp: {pm.className || pm.user.className || 'Chưa cập nhật'}</p>
                        
                        <button
                          onClick={() => setSelectedApp(pm)}
                          className="w-full mb-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:text-gray-250 border border-gray-200 dark:border-gray-750 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Xem chi tiết đơn
                        </button>

                        <div className="flex items-center gap-3 w-full">
                          <button onClick={() => handleMemberStatus(pm.id, 'REJECTED')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all active:scale-95">Từ chối</button>
                          <button onClick={() => handleMemberStatus(pm.id, 'APPROVED')} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all active:scale-95">Duyệt</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB PHÒNG BAN */}
            {activeTab === 'departments' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                   <button onClick={() => setShowAddDept(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95">
                      <Plus className="w-5 h-5" /><span>Thêm ban mới</span>
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {showAddDept && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[40px] border-2 border-orange-600 border-dashed flex flex-col justify-center items-center gap-4">
                         <input type="text" autoFocus placeholder="Tên ban (VD: Truyền thông)" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-center font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()} />
                         <div className="flex gap-2 w-full">
                            <button onClick={handleCreateDept} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold text-xs">Tạo ngay</button>
                            <button onClick={() => setShowAddDept(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs">Hủy</button>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {departments.map((dept) => (
                    <div key={dept.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all flex flex-col justify-between">
                       <div>
                          <div className="flex items-center justify-between mb-8">
                             <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><LayoutGrid className="w-6 h-6" /></div>
                             <div className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold">{dept.members?.length || 0} TV</div>
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 mb-6">{dept.name}</h3>
                          
                          <div className="flex -space-x-3 mb-6">
                            {dept.members?.slice(0, 5).map((m: any) => (
                              <div key={m.id} className="w-10 h-10 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-orange-600 font-bold text-xs">
                                {m.user.name.charAt(0)}
                              </div>
                            ))}
                            {dept.members?.length > 5 && (
                              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 font-bold text-xs">+{dept.members.length - 5}</div>
                            )}
                          </div>
                       </div>
                       
                       <button onClick={() => setSelectedDept(dept)} className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2">
                          Quản lý nhân sự
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB HỎI ĐÁP CLB */}
            {activeTab === 'chats' && (
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden h-[600px] flex">
                {/* Left Panel: Chat Rooms List */}
                <div className="w-1/3 border-r border-gray-100 flex flex-col h-full bg-gray-50/50">
                  <div className="p-6 border-b border-gray-100 bg-white">
                    <h3 className="font-black text-gray-900 text-lg">Tin nhắn hỏi đáp</h3>
                    <p className="text-xs text-gray-500 mt-1">Học sinh gửi câu hỏi trực tiếp đến CLB</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {chatRooms.map((room) => {
                      const isActive = activeChatUserId === room.studentId;
                      return (
                        <div
                          key={room.studentId}
                          onClick={() => {
                            setActiveChatUserId(room.studentId);
                            setChatMessages([]);
                          }}
                          className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center space-x-3 ${isActive ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-white border-gray-100 hover:border-orange-200 text-gray-700'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
                            {room.studentName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm truncate">{room.studentName}</span>
                              <span className={`text-[9px] tabular-nums ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                                {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{room.lastMessage}</p>
                          </div>
                        </div>
                      );
                    })}
                    {chatRooms.length === 0 && (
                      <div className="text-center py-20 text-gray-400">
                        <p className="text-sm font-medium">Chưa có câu hỏi nào gửi đến CLB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Chat Messages Log & Reply */}
                <div className="flex-1 flex flex-col h-full bg-white">
                  {activeChatUserId ? (
                    <>
                      {/* Active Chat Header */}
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold text-sm">
                            {chatRooms.find(r => r.studentId === activeChatUserId)?.studentName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">
                              {chatRooms.find(r => r.studentId === activeChatUserId)?.studentName || 'Sinh viên'}
                            </h4>
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mt-0.5">Đang trò chuyện</p>
                          </div>
                        </div>
                      </div>

                      {/* Messages Log */}
                      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 flex flex-col space-y-4">
                        {chatMessages.map((msg) => {
                          const isUser = msg.senderId === activeChatUserId;
                          const isClubReply = msg.isFromClubManager;

                          let bubbleStyle = "bg-white text-gray-800 border border-gray-100 rounded-bl-none";
                          let labelText = "Sinh viên";
                          let labelColor = "text-orange-600";

                          if (isClubReply) {
                            bubbleStyle = "bg-emerald-600 text-white rounded-br-none";
                            labelText = "Bạn (Ban chủ nhiệm CLB)";
                            labelColor = "text-emerald-650";
                          } else if (msg.isAI) {
                            bubbleStyle = "bg-blue-50 text-blue-900 border border-blue-100 rounded-bl-none";
                            labelText = "Trợ lý AI (Gemini)";
                            labelColor = "text-blue-500";
                          }

                          return (
                            <div key={msg.id} className={`flex ${isClubReply ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-[70%]">
                                <span className={`text-[8px] font-black uppercase tracking-widest block mb-1 ${isClubReply ? 'text-right' : ''} ${labelColor}`}>
                                  {labelText}
                                </span>
                                <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${bubbleStyle}`}>
                                  {msg.message}
                                  <div className={`text-[9px] mt-1 opacity-60 ${isClubReply ? 'text-right text-emerald-250' : 'text-gray-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input Footer */}
                      <div className="p-4 border-t border-gray-150">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời gửi đến sinh viên..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-4 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-medium transition-all"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendClubReply()}
                          />
                          <button
                            onClick={handleSendClubReply}
                            disabled={!chatInput.trim() || sendingReply}
                            className={`absolute right-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${!chatInput.trim() || sendingReply ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                          >
                            {sendingReply ? 'Đang gửi...' : 'Gửi'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
                      <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">Chọn một sinh viên từ danh sách để bắt đầu hội thoại</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* MODAL: Xem Hồ Sơ Thành Viên */}
      <AnimatePresence>
        {selectedMemberProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMemberProfile(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setSelectedMemberProfile(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
               <div className="w-32 h-32 mx-auto bg-orange-100 text-orange-600 rounded-[32px] flex items-center justify-center text-5xl font-black mb-6 overflow-hidden">
                 {selectedMemberProfile.user.faceImage ? <img src={selectedMemberProfile.user.faceImage} className="w-full h-full object-cover" /> : selectedMemberProfile.user.name.charAt(0)}
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-1">{selectedMemberProfile.user.name}</h3>
               <p className="text-sm font-bold text-gray-500 mb-6">{selectedMemberProfile.user.studentId}</p>
               
               <div className="space-y-3 text-left bg-gray-50 p-6 rounded-3xl">
                  <div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Email</span><span className="text-sm font-bold text-gray-900">{selectedMemberProfile.user.email}</span></div>
                  <div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Chức vụ</span><span className="text-sm font-bold text-orange-600">{selectedMemberProfile.customTitle || (selectedMemberProfile.role === 'LEADER' ? 'Chủ nhiệm' : 'Thành viên')}</span></div>
                  <div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ngày tham gia</span><span className="text-sm font-bold text-gray-900">{new Date(selectedMemberProfile.joinDate).toLocaleDateString('vi-VN')}</span></div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Chỉnh Sửa Chức Vụ */}
      <AnimatePresence>
        {editingRoleMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingRoleMember(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-gray-900">Chỉnh sửa chức vụ</h3>
                 <button onClick={() => setEditingRoleMember(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Phân quyền Hệ thống</label>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20" value={newRole} onChange={(e: any) => setNewRole(e.target.value)}>
                      <option value="MEMBER">Thành viên thường</option>
                      <option value="LEADER">Chủ nhiệm / Quản trị viên</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Chức danh hiển thị (Tùy chọn)</label>
                    <input type="text" placeholder="VD: Trưởng ban Truyền thông" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20" value={newCustomTitle} onChange={e => setNewCustomTitle(e.target.value)} />
                    <p className="text-xs text-gray-400 mt-2">Chức danh này sẽ được hiển thị thay vì chức danh mặc định trên hồ sơ.</p>
                 </div>
                 <button onClick={handleUpdateRole} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">Cập nhật ngay</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Quản Lý Nhân Sự Phòng Ban */}
      <AnimatePresence>
        {selectedDept && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDept(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-8 max-w-3xl w-full shadow-2xl relative flex flex-col md:flex-row gap-8 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900">{selectedDept.name}</h3>
                    <div className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-sm font-bold">{selectedDept.members?.length} Thành viên</div>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedDept.members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-gray-900 shadow-sm">{m.user.name.charAt(0)}</div>
                           <div>
                             <p className="font-bold text-gray-900 text-sm">{m.user.name}</p>
                             <p className="text-xs text-gray-500">{m.user.studentId}</p>
                           </div>
                         </div>
                         <button onClick={() => handleRemoveMemberFromDept(m.userId)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {(!selectedDept.members || selectedDept.members.length === 0) && (
                      <p className="text-center text-gray-400 text-sm py-10">Ban này chưa có thành viên nào.</p>
                    )}
                  </div>
               </div>
               
               <div className="w-px bg-gray-100 hidden md:block"></div>
               
               <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-gray-900">Thêm thành viên</h4>
                    <button onClick={() => setSelectedDept(null)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-2 rounded-2xl mb-4">
                     <div className="p-2 text-gray-400"><Search className="w-4 h-4" /></div>
                     <input type="text" placeholder="Tìm tên/MSSV..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm" value={deptSearchTerm} onChange={e => setDeptSearchTerm(e.target.value)} />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {availableMembersForDept.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl hover:border-orange-200 transition-colors">
                         <div className="flex flex-col">
                           <span className="font-bold text-gray-900 text-sm">{m.user.name}</span>
                           <span className="text-xs text-gray-500">{m.user.studentId}</span>
                         </div>
                         <button onClick={() => handleAddMemberToDept(m.userId)} className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
               </div>
               
               <button onClick={() => setSelectedDept(null)} className="hidden md:block absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Xem Chi Tiết Đơn Ứng Tuyển */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedApp(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-black text-gray-900 mb-6">Chi tiết đơn ứng tuyển</h3>

              <div className="space-y-4 bg-gray-50 p-6 rounded-3xl mb-6">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Họ và tên</span>
                  <span className="text-sm font-bold text-gray-900">{selectedApp.fullName || selectedApp.user.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">MSSV</span>
                    <span className="text-sm font-bold text-gray-900">{selectedApp.studentId || selectedApp.user.studentId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Lớp</span>
                    <span className="text-sm font-bold text-gray-900">{selectedApp.className || selectedApp.user.className || 'Chưa cập nhật'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Số điện thoại</span>
                  <span className="text-sm font-bold text-gray-900">{selectedApp.phone || selectedApp.user.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ngày sinh</span>
                    <span className="text-sm font-bold text-gray-900">
                      {selectedApp.dateOfBirth || selectedApp.user.dateOfBirth || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Địa chỉ</span>
                    <span className="text-sm font-bold text-gray-900">{selectedApp.address || selectedApp.user.address || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleMemberStatus(selectedApp.id, 'REJECTED');
                    setSelectedApp(null);
                  }}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                >
                  Từ chối
                </button>
                <button
                  onClick={() => {
                    handleMemberStatus(selectedApp.id, 'APPROVED');
                    setSelectedApp(null);
                  }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95"
                >
                  Duyệt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
