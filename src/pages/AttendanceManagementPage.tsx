import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Camera, CheckCircle, Clock, MapPin, UserCheck, Image as ImageIcon, Download, FileSpreadsheet, CheckSquare, Search, Plus, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function AttendanceManagementPage() {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);

  // Manual Checkin State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submittingManual, setSubmittingManual] = useState(false);

  // GPS Map Modal State
  const [mapRecord, setMapRecord] = useState<any>(null);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      // API trả về field `memberRole` — chỉ lấy CLB mà user là LEADER hoặc là ADMIN
      const managedClubs = res.data.filter((c: any) => 
        user?.role === 'ADMIN' || c.memberRole === 'LEADER'
      );
      setMyClubs(managedClubs);
      if (managedClubs.length > 0) {
        setSelectedClubId(managedClubs[0].id);
        if (managedClubs[0].events?.length > 0) {
          setSelectedEventId(managedClubs[0].events[0].id);
        }
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách CLB:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClubId) fetchClubMembers();
  }, [selectedClubId]);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendances();
    } else {
      setAttendances([]);
    }
  }, [selectedEventId]);

  const fetchClubMembers = async () => {
    try {
      const res = await api.get(`/management/${selectedClubId}/members`);
      setClubMembers(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  const fetchAttendances = async () => {
    setLoadingAttendances(true);
    try {
      const res = await api.get(`/attendance/event/${selectedEventId}`);
      setAttendances(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách điểm danh:", error);
    } finally {
      setLoadingAttendances(false);
    }
  };

  const handleClubChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clubId = e.target.value;
    setSelectedClubId(clubId);
    const club = myClubs.find(c => c.id === clubId);
    if (club?.events?.length > 0) {
      setSelectedEventId(club.events[0].id);
    } else {
      setSelectedEventId('');
    }
  };

  const handleExportExcel = () => {
    if (attendances.length === 0) return alert('Khong co du lieu de xuat!');
    const dataToExport = attendances.map((record, index) => {
      const checkin = new Date(record.checkinTime);
      const checkout = record.checkoutTime ? new Date(record.checkoutTime) : null;
      const minutes = checkout ? Math.round((checkout.getTime() - checkin.getTime()) / 60000) : null;
      return {
        'STT': index + 1,
        'MSSV': record.user.studentId,
        'Ho va Ten': record.user.name,
        'Thoi gian Check-in': checkin.toLocaleString('vi-VN'),
        'Thoi gian Check-out': checkout ? checkout.toLocaleString('vi-VN') : 'Chua check-out',
        'Thoi gian co mat (phut)': minutes ?? 'N/A',
        'Phuong thuc': record.method === 'FACEID' ? 'AI FaceID' : 'Thu cong',
        'GPS': (record.latitude && record.longitude) ? `${record.latitude},${record.longitude}` : 'Khong co',
        'Trang thai AI': record.isValid ? 'Hop le' : (record.method === 'FACEID' ? 'Khong xac dinh' : 'N/A')
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DiemDanh');
    XLSX.writeFile(workbook, `DiemDanh_${selectedEventId}.xlsx`);
  };

  const handleManualCheckin = async () => {
    if (selectedUserIds.length === 0) return alert('Vui lòng chọn ít nhất 1 thành viên');
    setSubmittingManual(true);
    try {
      await api.post(`/attendance/event/${selectedEventId}/manual-checkin`, { userIds: selectedUserIds });
      alert('Điểm danh thủ công thành công!');
      setShowManualModal(false);
      setSelectedUserIds([]);
      fetchAttendances();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi điểm danh');
    } finally {
      setSubmittingManual(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const selectedClub = myClubs.find(c => c.id === selectedClubId);
  const clubEvents = selectedClub?.events || [];
  
  // Lọc ra các thành viên chưa điểm danh
  const unCheckedMembers = clubMembers.filter(m => !attendances.some(a => a.userId === m.userId));
  const filteredUncheckedMembers = unCheckedMembers.filter(m => 
    m.user.name.toLowerCase().includes(manualSearch.toLowerCase()) || 
    m.user.studentId.includes(manualSearch)
  );

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quan Ly Diem Danh</h1>
          <p className="text-gray-500 font-medium mt-1">Xem danh sach sinh vien da diem danh qua he thong AI va Thu cong.</p>
        </div>
        <a href="/attendance/kiosk" target="_blank"
          className="flex items-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
          <Camera className="w-5 h-5" /> Mo Kiosk FaceID
        </a>
      </div>

      {myClubs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-2xl">
          Bạn không quản lý câu lạc bộ nào hoặc chưa được cấp quyền Chủ nhiệm.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Câu lạc bộ</label>
              <select 
                value={selectedClubId}
                onChange={handleClubChange}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20"
              >
                {myClubs.map(club => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sự kiện</label>
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20"
                disabled={clubEvents.length === 0}
              >
                {clubEvents.length === 0 && <option value="">Không có sự kiện nào</option>}
                {clubEvents.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <button 
                 onClick={() => setShowManualModal(true)}
                 disabled={!selectedEventId}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-gray-200 disabled:bg-gray-300 disabled:shadow-none"
               >
                 <CheckSquare className="w-5 h-5" /> <span>Điểm danh tay</span>
               </button>
               <button 
                 onClick={handleExportExcel}
                 disabled={!selectedEventId || attendances.length === 0}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-green-50 text-green-700 rounded-2xl font-bold text-sm hover:bg-green-600 hover:text-white transition-all disabled:bg-gray-100 disabled:text-gray-400"
               >
                 <FileSpreadsheet className="w-5 h-5" /> <span>Xuất Excel</span>
               </button>
            </div>
          </div>

          {selectedEventId && attendances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Da diem danh', value: attendances.length, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Tong thanh vien', value: clubMembers.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Ti le diem danh', value: clubMembers.length > 0 ? `${Math.round(attendances.length / clubMembers.length * 100)}%` : 'N/A', color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Da checkout', value: attendances.filter((a: any) => a.checkoutTime).length, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-2xl p-5 border border-white`}>
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {selectedEventId && (
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Danh sach da diem danh</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1">Tong cong: <span className="text-green-600">{attendances.length}</span> / {clubMembers.length} thanh vien</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-gray-100">
                    <tr>
                      <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">STT</th>
                      <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinh Vien</th>
                      <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in</th>
                      <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-out / Thoi gian</th>
                      <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phuong thuc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingAttendances ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500 font-bold"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Đang tải danh sách...</td>
                      </tr>
                    ) : attendances.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-500">Chưa có ai điểm danh cho sự kiện này.</td>
                      </tr>
                    ) : (
                      attendances.map((record, index) => (
                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-5 px-8 text-sm font-bold text-gray-400">{index + 1}</td>
                          <td className="py-5 px-8">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">{record.user.name.charAt(0)}</div>
                                <div>
                                   <div className="font-bold text-gray-900">{record.user.name}</div>
                                   <div className="text-xs text-gray-500">{record.user.studentId}</div>
                                </div>
                             </div>
                          </td>
                          <td className="py-5 px-8">
                            <div className="flex flex-col">
                               <span className="text-sm font-bold text-gray-900">{new Date(record.checkinTime).toLocaleTimeString('vi-VN')}</span>
                               <span className="text-xs font-medium text-gray-500">{new Date(record.checkinTime).toLocaleDateString('vi-VN')}</span>
                               {record.latitude && (
                                 <button onClick={() => setMapRecord(record)} className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1 hover:bg-green-50 w-max px-2 py-1 rounded-lg transition-all border border-green-200">
                                   📍 Xem bản đồ
                                 </button>
                               )}
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            <div className="flex flex-col gap-1">
                              {record.checkoutTime ? (
                                <>
                                  <span className="text-sm font-bold text-purple-600">{new Date(record.checkoutTime).toLocaleTimeString('vi-VN')}</span>
                                  <span className="text-xs text-gray-500">
                                    {Math.round((new Date(record.checkoutTime).getTime() - new Date(record.checkinTime).getTime()) / 60000)} phut
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Chua checkout</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            {record.method === 'FACEID' ? (
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-100 shadow-sm bg-gray-50 flex items-center justify-center">
                                  {record.snapshotImage ? (
                                    <img 
                                      src={record.snapshotImage.startsWith('data:') ? record.snapshotImage : `data:image/jpeg;base64,${record.snapshotImage}`}
                                      alt="FaceID Snapshot" 
                                      className="w-full h-full object-cover"
                                      onError={(e: any) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<div style="font-size:24px">📷</div>'; }}
                                    />
                                  ) : (
                                    <Camera className="w-6 h-6 text-gray-300" />
                                  )}
                                </div>
                                <div>
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Camera className="w-3 h-3"/> AI FaceID</span>
                                  {record.isValid && <span className="text-[10px] font-bold text-green-600 mt-1 block">✓ Hợp lệ</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckSquare className="w-3 h-3"/> Thủ công</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL ĐIỂM DANH THỦ CÔNG */}
      <AnimatePresence>
        {showManualModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowManualModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6 shrink-0">
                 <div>
                   <h3 className="text-2xl font-black text-gray-900">Điểm danh thủ công</h3>
                   <p className="text-sm font-medium text-gray-500 mt-1">Chọn các sinh viên tham gia nhưng AI không nhận diện được.</p>
                 </div>
                 <button onClick={() => setShowManualModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="flex items-center bg-gray-50 p-2 rounded-2xl mb-4 shrink-0">
                  <div className="p-3 text-gray-400"><Search className="w-5 h-5" /></div>
                  <input type="text" placeholder="Tìm tên hoặc MSSV..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold" value={manualSearch} onChange={e => setManualSearch(e.target.value)} />
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-0 mb-6">
                 {filteredUncheckedMembers.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 font-medium">Không tìm thấy sinh viên nào hoặc tất cả đã điểm danh.</div>
                 ) : (
                    filteredUncheckedMembers.map(m => (
                      <div 
                        key={m.userId} 
                        onClick={() => toggleUserSelection(m.userId)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedUserIds.includes(m.userId) ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${selectedUserIds.includes(m.userId) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                             {m.user.name.charAt(0)}
                           </div>
                           <div>
                             <p className="font-bold text-gray-900 text-sm">{m.user.name}</p>
                             <p className="text-xs text-gray-500">{m.user.studentId}</p>
                           </div>
                         </div>
                         <div className={`w-6 h-6 rounded-md flex items-center justify-center ${selectedUserIds.includes(m.userId) ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>
                            {selectedUserIds.includes(m.userId) && <CheckCircle className="w-4 h-4" />}
                         </div>
                      </div>
                    ))
                 )}
               </div>
               
               <div className="pt-4 border-t border-gray-100 shrink-0">
                  <button 
                    onClick={handleManualCheckin}
                    disabled={selectedUserIds.length === 0 || submittingManual}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 disabled:bg-gray-300 flex justify-center items-center gap-2 shadow-lg shadow-orange-200"
                  >
                    {submittingManual ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckSquare className="w-5 h-5" /> Xác nhận điểm danh ({selectedUserIds.length})</>}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL XEM BẢN ĐỒ GPS CHỐNG GIAN LẬN */}
      <AnimatePresence>
        {mapRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMapRecord(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-2xl font-black text-gray-900">Vị trí check-in</h3>
                   <p className="text-sm font-medium text-gray-500 mt-1">
                     {mapRecord.user.name} - {mapRecord.user.studentId}
                   </p>
                 </div>
                 <button onClick={() => setMapRecord(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="rounded-2xl overflow-hidden border-2 border-green-600/20 w-full bg-gray-50 h-64 relative mb-4">
                 <iframe 
                   width="100%" 
                   height="100%" 
                   frameBorder="0" 
                   scrolling="no"
                   src={`https://maps.google.com/maps?q=${mapRecord.latitude},${mapRecord.longitude}&z=17&output=embed`} 
                   title="Bản đồ vị trí sinh viên"
                   className="absolute inset-0"
                 />
               </div>
               
               <div className="bg-blue-50 p-4 rounded-2xl">
                 <p className="text-xs text-blue-700 font-bold mb-1">Toạ độ lưu trữ:</p>
                 <p className="text-sm text-blue-900 font-black">{mapRecord.latitude}, {mapRecord.longitude}</p>
                 <p className="text-[10px] text-blue-500 mt-2">
                   Dữ liệu được thu thập qua GPS của thiết bị lúc {new Date(mapRecord.checkinTime).toLocaleTimeString('vi-VN')}
                 </p>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
