import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, ShieldCheck, Star, MoreVertical, LayoutGrid, Plus, Loader2, X, Fingerprint, Calendar, CheckCircle2, UserCheck, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function MembersPage() {
  const { user, role } = useAuth();
  const [term, setTerm] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'DEPARTMENTS' | 'APPROVALS'>('MEMBERS');
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  
  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Member Management Modals State
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  // Form Fields State
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'MEMBER' | 'LEADER'>('MEMBER');

  const handleOpenAddMember = () => {
    setMemberEmail('');
    setMemberRole('MEMBER');
    setShowAddMember(true);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail) return alert('Vui lòng nhập Email.');
    try {
      await api.post(`/management/${selectedClubId}/members`, {
        email: memberEmail,
        role: memberRole
      });
      alert('Thêm thành viên thành công!');
      setShowAddMember(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể thêm thành viên.');
    }
  };

  const handleOpenEditMember = (member: any) => {
    setSelectedMember(member);
    setMemberRole(member.role);
    setShowEditMember(true);
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/management/${selectedClubId}/members/${selectedMember.id}/role`, {
        role: memberRole
      });
      alert('Cập nhật vai trò thành công!');
      setShowEditMember(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật vai trò.');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi câu lạc bộ không?')) return;
    try {
      await api.delete(`/management/${selectedClubId}/members/${memberId}`);
      alert('Xóa thành viên thành công!');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể xóa thành viên.');
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (selectedClubId) fetchData();
  }, [selectedClubId]);

  const loadClubs = async () => {
    try {
      const endpoint = role === 'ADMIN' ? '/clubs/all' : '/clubs/my-clubs';
      const res = await api.get(endpoint);
      setMyClubs(res.data);
      if (res.data.length > 0) {
        setSelectedClubId(res.data[0].id);
      }
    } catch (error) {
      console.error('Load clubs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!selectedClubId) return;
    try {
      const [membersRes, deptsRes] = await Promise.all([
        api.get(`/management/${selectedClubId}/members`),
        api.get(`/management/${selectedClubId}/departments`)
      ]);
      setMembers(membersRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error("Fetch management data error:", error);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName) return;
    try {
      await api.post(`/management/${selectedClubId}/departments`, { name: newDeptName });
      setNewDeptName('');
      setShowAddDept(false);
      fetchData();
    } catch (error) {
      console.error("Create dept error:", error);
    }
  };

  const handleMemberStatus = async (memberId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/clubs/${selectedClubId}/members/${memberId}/status`, { status });
      fetchData();
    } catch (error) {
      console.error("Update member status error:", error);
    }
  };

  const handleViewProfile = async (userId: string) => {
    setSelectedProfile({ loading: true });
    try {
      const res = await api.get(`/management/${selectedClubId}/users/${userId}/profile`);
      setSelectedProfile(res.data);
    } catch (error) {
      console.error("Fetch profile error:", error);
      setSelectedProfile(null);
    }
  };

  const approvedMembers = members.filter(m => m.status === 'APPROVED');
  const pendingMembers = members.filter(m => m.status === 'PENDING');

  return (
    <div className="pt-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quản lý thành viên</h1>
              <p className="text-sm text-gray-500 font-medium">Điều hành nhân sự và các phòng ban trong câu lạc bộ của bạn.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {myClubs.length > 0 && (
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl font-bold text-sm text-gray-900 focus:ring-2 focus:ring-orange-600/20 focus:outline-none"
                >
                  {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
                <button 
                 onClick={() => setActiveTab('MEMBERS')}
                 className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'MEMBERS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                   THÀNH VIÊN
                </button>
                <button 
                 onClick={() => setActiveTab('DEPARTMENTS')}
                 className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'DEPARTMENTS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                   PHÒNG BAN
                </button>
                <button 
                 onClick={() => setActiveTab('APPROVALS')}
                 className={`relative px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'APPROVALS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                   CHỜ DUYỆT
                   {pendingMembers.length > 0 && (
                     <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center animate-pulse">
                       {pendingMembers.length}
                     </span>
                   )}
                </button>
              </div>
            </div>
        </div>

        {/* Members Tab */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="relative flex-1">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                 <input 
                    type="text" 
                    placeholder="Tìm kiếm thành viên..." 
                    className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[20px] focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 outline-none shadow-sm transition-all text-sm font-medium"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                 />
              </div>
              <button
                onClick={handleOpenAddMember}
                className="px-6 py-4 bg-orange-600 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-100 flex items-center gap-2 justify-center"
              >
                <Plus className="w-4 h-4" />
                Thêm thành viên
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
            ) : (
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-50">
                           <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Thành viên</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">MSSV</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Vai trò</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Ngày tham gia</th>
                           <th className="px-8 py-5 text-right">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {approvedMembers.filter(m => m.user.name.toLowerCase().includes(term.toLowerCase())).map((member) => (
                           <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200">
                                       {member.user.name.charAt(0)}
                                    </div>
                                    <div>
                                       <div className="text-sm font-bold text-gray-900">{member.user.name}</div>
                                       <div className="text-[10px] text-gray-400 font-medium">{member.user.email}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <span className="text-xs font-bold text-gray-600">{member.user.studentId}</span>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-2">
                                    {member.role === 'LEADER' ? (
                                      <ShieldCheck className="w-4 h-4 text-orange-600" />
                                    ) : (
                                      <Star className="w-4 h-4 text-blue-500" />
                                    )}
                                    <span className={`text-xs font-bold ${member.role === 'LEADER' ? 'text-orange-600' : 'text-blue-500'}`}>{member.role}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <span className="text-xs text-gray-500 font-medium italic">
                                   {new Date(member.joinDate).toLocaleDateString()}
                                 </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                       onClick={() => handleViewProfile(member.user.id)} 
                                       className="px-4 py-2 bg-gray-100 text-gray-900 font-bold text-xs rounded-xl shadow-sm hover:bg-gray-200 active:scale-95 transition-all"
                                    >
                                       Xem hồ sơ
                                    </button>
                                    <button 
                                       onClick={() => handleOpenEditMember(member)} 
                                       className="p-2 bg-orange-50 text-orange-600 font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600 hover:text-white active:scale-95 transition-all"
                                       title="Sửa vai trò"
                                    >
                                       <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                       onClick={() => handleDeleteMember(member.id)} 
                                       className="p-2 bg-red-50 text-red-600 font-bold text-xs rounded-xl shadow-sm hover:bg-red-600 hover:text-white active:scale-95 transition-all"
                                       title="Xóa thành viên"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                        {approvedMembers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-8 py-10 text-center text-gray-400 font-medium">Chưa có thành viên nào</td>
                          </tr>
                        )}
                     </tbody>
                  </table>
                  </div>
              </div>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'APPROVALS' && (
          <div className="space-y-6">
             <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                       <tr className="bg-gray-50/50 border-b border-gray-50">
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Sinh viên</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">MSSV</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Ngày yêu cầu</th>
                          <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Hành động</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {pendingMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                                      {member.user.name.charAt(0)}
                                   </div>
                                   <div>
                                      <div className="text-sm font-bold text-gray-900">{member.user.name}</div>
                                      <div className="text-[10px] text-gray-400 font-medium">{member.user.email}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <span className="text-xs font-bold text-gray-600">{member.user.studentId}</span>
                             </td>
                             <td className="px-8 py-5">
                                <span className="text-xs text-gray-500 font-medium italic">
                                  {new Date(member.joinDate).toLocaleDateString()}
                                </span>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleMemberStatus(member.id, 'APPROVED')} className="px-4 py-2 bg-green-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-green-600 active:scale-95 transition-all">Duyệt</button>
                                  <button onClick={() => handleMemberStatus(member.id, 'REJECTED')} className="px-4 py-2 bg-gray-100 text-red-500 font-bold text-xs rounded-xl shadow-sm hover:bg-gray-200 active:scale-95 transition-all">Từ chối</button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {pendingMembers.length === 0 && (
                         <tr>
                           <td colSpan={4} className="px-8 py-10 text-center text-gray-400 font-medium">Không có yêu cầu tham gia nào đang chờ</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
                 </div>
              </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'DEPARTMENTS' && (
          <div className="space-y-6">
            <div className="flex justify-end">
               <button 
                onClick={() => setShowAddDept(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95"
               >
                  <Plus className="w-5 h-5" />
                  <span>Thêm ban mới</span>
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <AnimatePresence>
                  {showAddDept && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="bg-white p-8 rounded-[32px] border-2 border-orange-600 border-dashed flex flex-col justify-center items-center gap-4"
                    >
                       <input 
                        type="text" 
                        autoFocus
                        placeholder="Tên ban (VD: Truyền thông)" 
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-center font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()}
                       />
                       <div className="flex gap-2 w-full">
                          <button onClick={handleCreateDept} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold text-xs">Tạo ngay</button>
                          <button onClick={() => setShowAddDept(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs">Hủy</button>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>

               {departments.map((dept) => (
                 <div key={dept.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group">
                    <div className="flex items-center justify-between mb-8">
                       <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                          <LayoutGrid className="w-6 h-6" />
                       </div>
                       <button className="text-gray-300 hover:text-gray-900 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{dept.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{dept.members?.length || 0} thành viên</p>
                    
                    <button className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                       Chi tiết ban
                    </button>
                 </div>
               ))}
            </div>
          </div>
        )}

      </div>

      {/* Member Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {selectedProfile.loading ? (
                <div className="p-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-4" />
                  <p className="text-gray-500 font-medium">Đang tải hồ sơ...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row h-full">
                  {/* Left Sidebar: Profile & Face */}
                  <div className="md:w-1/3 bg-gray-50 p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-[32px] bg-orange-100 text-orange-600 flex items-center justify-center text-4xl font-black mb-4 shadow-inner">
                      {selectedProfile.name?.charAt(0)}
                    </div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{selectedProfile.name}</h2>
                    <p className="text-xs font-bold text-gray-500 mb-6">{selectedProfile.studentId}</p>

                    <div className="w-full p-4 bg-white rounded-3xl border border-gray-100 shadow-sm text-left space-y-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Email</div>
                        <div className="text-xs font-bold text-gray-900 truncate">{selectedProfile.email}</div>
                      </div>
                      <div className="pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> FaceID</div>
                          {selectedProfile.faceImage ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-md">Đã đăng ký</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase rounded-md">Chưa ĐK</span>
                          )}
                        </div>
                        {selectedProfile.faceImage && (
                          <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-200">
                            <img src={selectedProfile.faceImage} alt="Face" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Content: Attendance History */}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-orange-600" />
                        Lịch sử điểm danh
                      </h3>
                      <button onClick={() => setSelectedProfile(null)} className="p-2 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-4">
                      {selectedProfile.attendances?.length > 0 ? (
                        selectedProfile.attendances.map((att: any) => (
                          <div key={att.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-orange-200 transition-colors">
                            <div className="flex items-center gap-4">
                              {att.snapshotImage ? (
                                <img src={att.snapshotImage} alt="Snapshot" className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm">
                                  <UserCheck className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-gray-900 mb-1">{att.event?.title || 'Sự kiện không xác định'}</div>
                                <div className="text-xs text-gray-500 font-medium">
                                  {new Date(att.checkinTime).toLocaleString('vi-VN')}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1 text-green-600 mb-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Thành công</span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                {att.method === 'FACEID' ? 'Khuôn mặt' : 'Thủ công'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                          <Calendar className="w-10 h-10 text-gray-300 mb-3" />
                          <p className="text-sm font-bold text-gray-500 mb-1">Chưa có lịch sử</p>
                          <p className="text-xs text-gray-400">Sinh viên này chưa tham gia điểm danh sự kiện nào.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddMember(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">Thêm thành viên</h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email Sinh Viên</label>
                  <input 
                    required
                    type="email" 
                    placeholder="email@hutech.edu.vn"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-medium transition-all"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Vai Trò</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-bold transition-all"
                    value={memberRole}
                    onChange={(e: any) => setMemberRole(e.target.value)}
                  >
                    <option value="MEMBER">Thành viên (MEMBER)</option>
                    <option value="LEADER">Ban cán sự (LEADER)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 active:scale-95"
                >
                  Xác nhận thêm
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {showEditMember && selectedMember && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditMember(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">Sửa vai trò</h3>
                <button onClick={() => setShowEditMember(false)} className="p-2 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <div className="text-xs font-bold text-gray-900">{selectedMember.user?.name}</div>
                <div className="text-[10px] text-gray-500 font-medium">{selectedMember.user?.email}</div>
              </div>

              <form onSubmit={handleEditMemberSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Vai Trò mới</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-bold transition-all"
                    value={memberRole}
                    onChange={(e: any) => setMemberRole(e.target.value)}
                  >
                    <option value="MEMBER">Thành viên (MEMBER)</option>
                    <option value="LEADER">Ban cán sự (LEADER)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 active:scale-95"
                >
                  Lưu thay đổi
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
