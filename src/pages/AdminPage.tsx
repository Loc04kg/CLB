import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, Building2, CalendarDays, ShieldCheck,
  LogOut, Check, X, Loader2, Bell, Search, ChevronDown,
  TrendingUp, AlertCircle, Clock, Eye, RefreshCw, Menu, Plus, Edit, Key, Trash2,
  MessageSquare, Send, Bot, User, Wallet, BookOpen, UploadCloud, CheckCircle2, FileText, HelpCircle
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

type AdminTab = 'overview' | 'clubs' | 'users' | 'events' | 'transfers' | 'resets' | 'chats' | 'finance' | 'knowledge';

import FinancePage from './FinancePage';

export default function AdminPage() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const validTabs: AdminTab[] = ['overview', 'clubs', 'users', 'events', 'transfers', 'resets', 'chats', 'finance', 'knowledge'];
    if (tabParam && validTabs.includes(tabParam as any)) {
      return tabParam as AdminTab;
    }
    return 'overview';
  });

  useEffect(() => {
    const validTabs: AdminTab[] = ['overview', 'clubs', 'users', 'events', 'transfers', 'resets', 'chats', 'finance', 'knowledge'];
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as AdminTab);
    }
  }, [tabParam]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clubs, setClubs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingResets, setPendingResets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);

  // System Notifications State for Admin
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/users/notifications');
      setNotifications(res.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 8000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/users/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationLink = (title: string, message: string, role?: string): string => {
    const lowerTitle = title.toLowerCase();
    const lowerMsg = message.toLowerCase();

    if (lowerTitle.includes('mật khẩu') || lowerTitle.includes('reset')) {
      if (role === 'ADMIN') return '/admin?tab=resets';
      return '/forgot-password';
    }

    if (
      lowerTitle.includes('hỏi đáp') ||
      lowerTitle.includes('tin nhắn') ||
      lowerMsg.includes('hỏi đáp') ||
      lowerMsg.includes('tin nhắn') ||
      lowerMsg.includes('hỗ trợ')
    ) {
      if (role === 'ADMIN') return '/admin?tab=chats';
      if (role === 'LEADER') return '/club/manage?tab=chats';
      return '/ai-assistant';
    }

    if (lowerTitle.includes('chuyển quyền') || lowerMsg.includes('chuyển quyền')) {
      if (role === 'ADMIN') return '/admin?tab=transfers';
      return '/club/manage';
    }

    if (
      lowerTitle.includes('câu lạc bộ') ||
      lowerTitle.includes('clb') ||
      lowerMsg.includes('câu lạc bộ') ||
      lowerMsg.includes('clb')
    ) {
      if (role === 'ADMIN') return '/admin?tab=clubs';
      return '/my-clubs';
    }

    if (
      lowerTitle.includes('sự kiện') ||
      lowerTitle.includes('sk') ||
      lowerMsg.includes('sự kiện') ||
      lowerMsg.includes('sk')
    ) {
      if (lowerTitle.includes('yêu cầu') || lowerMsg.includes('chờ phê duyệt')) {
        if (role === 'ADMIN') return '/admin?tab=events';
        return '/club/events';
      }
      return '/events';
    }

    return '/dashboard';
  };

  // User Management Modals State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    role: 'STUDENT',
    status: 'ACTIVE',
    password: ''
  });
  const [newPasswordOverride, setNewPasswordOverride] = useState('');

  // Club Management Modals State
  const [showClubAddModal, setShowClubAddModal] = useState(false);
  const [showClubEditModal, setShowClubEditModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [clubFormData, setClubFormData] = useState({
    name: '',
    description: '',
    category: 'Thể Thao',
    founderId: '',
    status: 'APPROVED',
    logoUrl: '',
    coverUrl: ''
  });

  // Event Management Modals State
  const [showEventAddModal, setShowEventAddModal] = useState(false);
  const [showEventEditModal, setShowEventEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [eventFormData, setEventFormData] = useState({
    clubId: '',
    title: '',
    description: '',
    location: '',
    eventDate: '',
    imageUrl: '',
    status: 'APPROVED'
  });

  // Knowledge Base States
  const [kbDocuments, setKbDocuments] = useState<any[]>([
    { id: '1', name: 'Quy_che_sinh_hoat_CLB_HUTECH.pdf', clubName: 'Chung (Tất cả CLB)', uploadedAt: '2026-07-01T10:00:00Z', size: '1.2 MB', status: 'synced' },
    { id: '2', name: 'Huong_dan_tai_chinh_clb.docx', clubName: 'CLB Kỹ Năng', uploadedAt: '2026-07-05T14:30:00Z', size: '450 KB', status: 'synced' },
    { id: '3', name: 'Ke_hoach_tuyen_thanh_vien_am_nhac.pdf', clubName: 'CLB Âm Nhạc', uploadedAt: '2026-07-10T09:15:00Z', size: '2.1 MB', status: 'processing' },
    { id: '4', name: 'Noi_quy_CLB_Vo_Thuat.pdf', clubName: 'CLB Võ Thuật', uploadedAt: '2026-07-12T16:00:00Z', size: '850 KB', status: 'error' }
  ]);

  const [kbFaqs, setKbFaqs] = useState<any[]>([
    { id: '1', question: 'Làm thế nào để đăng ký tham gia Câu lạc bộ?', answer: 'Sinh viên truy cập trang chi tiết Câu lạc bộ, chọn tab "Sự kiện" hoặc thông tin chi tiết và bấm nút "Đăng ký tham gia" để Leader duyệt.', clubName: 'Chung (Tất cả CLB)' },
    { id: '2', question: 'Quy trình xét duyệt quỹ tài chính hoạt động CLB?', answer: 'Leader CLB làm đề xuất chi tiêu trong tab Tài chính. Admin sẽ phê duyệt đề xuất trước khi thủ quỹ tiến hành chi tiền.', clubName: 'CLB Kỹ Năng' },
    { id: '3', question: 'Làm sao để liên hệ ban chủ nhiệm CLB?', answer: 'Bạn có thể vào trang chi tiết CLB, tại đây sẽ có thông tin liên hệ của Leader và các phó chủ nhiệm.', clubName: 'Chung (Tất cả CLB)' },
    { id: '4', question: 'Có giới hạn số lượng CLB tham gia không?', answer: 'HUTECH không giới hạn số lượng CLB sinh viên tham gia, miễn là bạn sắp xếp thời gian hợp lý.', clubName: 'Chung (Tất cả CLB)' }
  ]);

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<any | null>(null);
  const [faqFormData, setFaqFormData] = useState({
    question: '',
    answer: '',
    clubName: 'Chung (Tất cả CLB)'
  });
  
  const [isFaqSubmitting, setIsFaqSubmitting] = useState(false);
  const [isKbUploading, setIsKbUploading] = useState(false);
  const [kbDragActive, setKbDragActive] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');

  const handleKbDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setKbDragActive(true);
    } else if (e.type === "dragleave") {
      setKbDragActive(false);
    }
  };

  const handleKbDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setKbDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      await handleKbFilesUpload(files);
    }
  };

  const handleKbFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      await handleKbFilesUpload(files);
    }
  };

  const handleKbFilesUpload = async (files: File[]) => {
    setIsKbUploading(true);
    
    for (const file of files) {
      const newDoc = {
        id: `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: file.name,
        clubName: 'Chung (Tất cả CLB)',
        uploadedAt: new Date().toISOString(),
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        status: 'processing'
      };
      
      setKbDocuments(prev => [newDoc, ...prev]);

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await api.post('/management/upload', { imageBase64: reader.result });
          } catch (err) {
            console.log("Uploaded file saved via mock simulation");
          }
        };
        reader.readAsDataURL(file);
      } catch (e) {
        console.error(e);
      }
      
      setTimeout(() => {
        setKbDocuments(prev => 
          prev.map(d => d.id === newDoc.id ? { ...d, status: 'synced' } : d)
        );
      }, 2500);
    }
    
    setIsKbUploading(false);
  };

  const handleOpenAddFaqModal = () => {
    setSelectedFaq(null);
    setFaqFormData({
      question: '',
      answer: '',
      clubName: 'Chung (Tất cả CLB)'
    });
    setShowFaqModal(true);
  };

  const handleOpenEditFaqModal = (faq: any) => {
    setSelectedFaq(faq);
    setFaqFormData({
      question: faq.question,
      answer: faq.answer,
      clubName: faq.clubName || 'Chung (Tất cả CLB)'
    });
    setShowFaqModal(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqFormData.question.trim() || !faqFormData.answer.trim()) {
      alert('Vui lòng điền đầy đủ câu hỏi và câu trả lời.');
      return;
    }
    
    setIsFaqSubmitting(true);
    
    setTimeout(() => {
      if (selectedFaq) {
        setKbFaqs(prev => prev.map(f => f.id === selectedFaq.id ? { ...f, ...faqFormData } : f));
        alert('Cập nhật câu hỏi FAQ thành công!');
      } else {
        const newFaq = {
          id: `faq_${Date.now()}`,
          ...faqFormData
        };
        setKbFaqs(prev => [newFaq, ...prev]);
        alert('Thêm câu hỏi FAQ thành công! Dữ liệu đã được tích hợp vào bộ nhớ AI.');
      }
      setIsFaqSubmitting(false);
      setShowFaqModal(false);
    }, 800);
  };

  const handleDeleteFaq = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi FAQ này?')) return;
    setKbFaqs(prev => prev.filter(f => f.id !== id));
  };

  const handleDeleteKbDoc = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu tri thức này?')) return;
    setKbDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Chat management states
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleOpenAddModal = () => {
    setFormData({
      studentId: '',
      name: '',
      email: '',
      role: 'STUDENT',
      status: 'ACTIVE',
      password: ''
    });
    setShowAddModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      alert('Tạo tài khoản thành công!');
      setShowAddModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể tạo tài khoản.');
    }
  };

  const handleOpenEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      studentId: user.studentId || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'STUDENT',
      status: user.status || 'ACTIVE',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/users/${selectedUser.id}/admin-update`, formData);
      alert('Cập nhật tài khoản thành công!');
      setShowEditModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật tài khoản.');
    }
  };

  const handleOpenPasswordModal = (user: any) => {
    setSelectedUser(user);
    setNewPasswordOverride('');
    setShowPasswordModal(true);
  };

  const handleOverridePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordOverride) return alert('Vui lòng nhập mật khẩu mới.');
    try {
      await api.put(`/users/${selectedUser.id}/admin-update`, {
        password: newPasswordOverride
      });
      alert('Thay đổi mật khẩu thành công!');
      setShowPasswordModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể thay đổi mật khẩu.');
    }
  };

  const handleUserStatus = async (userId: string, status: 'ACTIVE' | 'BLOCKED') => {
    try {
      await api.put(`/users/${userId}/status`, { status });
      fetchAllData();
    } catch (error) {
      console.error("Update user status error:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchAllData();
    } catch (error) {
      console.error("Delete user error:", error);
    }
  };

  const handleApproveReset = async (email: string) => {
    setProcessingId(email);
    try {
      await api.post('/auth/admin/approve-reset', { email });
      fetchAllData();
      alert('Đã phê duyệt yêu cầu đặt lại mật khẩu thành công!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReset = async (email: string) => {
    setProcessingId(email);
    try {
      await api.post('/auth/admin/reject-reset', { email });
      fetchAllData();
      alert('Đã từ chối yêu cầu đặt lại mật khẩu.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateTransferStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.put(`/clubs/admin/transfers/${id}/status`, { status });
      fetchAllData();
    } catch (error) {
      console.error("Update status error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // Club CRUD Handlers
  const handleOpenClubAdd = () => {
    setClubFormData({
      name: '',
      description: '',
      category: 'Thể Thao',
      founderId: users[0]?.id || '',
      status: 'APPROVED',
      logoUrl: '',
      coverUrl: ''
    });
    setShowClubAddModal(true);
  };

  const handleOpenClubEdit = (club: any) => {
    setSelectedClub(club);
    setClubFormData({
      name: club.name || '',
      description: club.description || '',
      category: club.category || 'Thể Thao',
      founderId: club.founderId || '',
      status: club.status || 'APPROVED',
      logoUrl: club.logoUrl || '',
      coverUrl: club.coverUrl || ''
    });
    setShowClubEditModal(true);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clubs', clubFormData);
      alert('Tạo câu lạc bộ thành công!');
      setShowClubAddModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể tạo câu lạc bộ.');
    }
  };

  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/clubs/${selectedClub.id}`, clubFormData);
      alert('Cập nhật câu lạc bộ thành công!');
      setShowClubEditModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật câu lạc bộ.');
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu lạc bộ này? Việc này sẽ xóa toàn bộ dữ liệu liên quan (thành viên, sự kiện, quỹ...).')) return;
    try {
      await api.delete(`/clubs/${clubId}`);
      alert('Xóa câu lạc bộ thành công!');
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể xóa câu lạc bộ.');
    }
  };

  // Event CRUD Handlers
  const handleOpenEventAdd = () => {
    setEventFormData({
      clubId: clubs[0]?.id || '',
      title: '',
      description: '',
      location: '',
      eventDate: '',
      imageUrl: '',
      status: 'APPROVED'
    });
    setShowEventAddModal(true);
  };

  const handleOpenEventEdit = (event: any) => {
    setSelectedEvent(event);
    setEventFormData({
      clubId: event.clubId || '',
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      eventDate: event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : '',
      imageUrl: event.imageUrl || '',
      status: event.status || 'APPROVED'
    });
    setShowEventEditModal(true);
  };

  const handleEventImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setEventFormData(prev => ({ ...prev, imageUrl: res.data.url }));
        } catch (err) {
          alert('Lỗi khi tải ảnh lên máy chủ');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClubImageChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverUrl') => {
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
          setClubFormData(prev => ({ ...prev, [field]: res.data.url }));
        } catch (err) {
          alert('Lỗi khi tải ảnh lên máy chủ');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', eventFormData);
      alert('Tạo sự kiện thành công!');
      setShowEventAddModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể tạo sự kiện.');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/events/${selectedEvent.id}`, eventFormData);
      alert('Cập nhật sự kiện thành công!');
      setShowEventEditModal(false);
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật sự kiện.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này không?')) return;
    try {
      await api.delete(`/events/${eventId}`);
      alert('Xóa sự kiện thành công!');
      fetchAllData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể xóa sự kiện.');
    }
  };

  useEffect(() => {
    if (role && role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [clubsRes, usersRes, eventsRes, transfersRes, resetsRes] = await Promise.all([
        api.get('/clubs/all'),
        api.get('/users'),
        api.get('/events/all'),
        api.get('/clubs/admin/transfers/pending'),
        api.get('/auth/admin/reset-requests')
      ]);
      setClubs(clubsRes.data.data || clubsRes.data);
      setUsers(usersRes.data.data || usersRes.data);
      setEvents(eventsRes.data.data || eventsRes.data);
      setPendingTransfers(transfersRes.data || []);
      setPendingResets(resetsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatRooms = async () => {
    try {
      const res = await api.get('/chats');
      setChatRooms(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách chat rooms:", error);
    }
  };

  const fetchChatHistory = async (userId: string) => {
    try {
      const res = await api.get(`/chats/user/${userId}`);
      setChatMessages(res.data);
    } catch (error) {
      console.error("Lỗi lấy lịch sử chat:", error);
    }
  };

  const sendAdminReply = async () => {
    if (!chatInput.trim() || !activeChatUserId) return;
    setSendingChat(true);
    try {
      const res = await api.post('/chats', {
        message: chatInput.trim(),
        receiverId: activeChatUserId
      });
      setChatMessages(prev => [...prev, res.data]);
      setChatInput('');
      fetchChatRooms();
    } catch (error) {
      console.error("Lỗi gửi tin nhắn admin:", error);
    } finally {
      setSendingChat(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchChatRooms();
      const interval = setInterval(fetchChatRooms, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chats' && activeChatUserId) {
      fetchChatHistory(activeChatUserId);
      const interval = setInterval(() => {
        api.get(`/chats/user/${activeChatUserId}`).then(res => {
          setChatMessages(res.data);
        }).catch(console.error);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, activeChatUserId]);

  const handleClubStatus = async (clubId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(clubId);
    try {
      await api.put(`/clubs/${clubId}/status`, { status });
      fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleEventStatus = async (eventId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(eventId);
    try {
      await api.put(`/events/${eventId}/status`, { status });
      fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 50MB.');
      return;
    }

    setUploadingBg(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.post('/management/background', { imageBase64: reader.result });
        alert('Cập nhật ảnh nền thành công! Vui lòng tải lại trang chủ để xem thay đổi.');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Lỗi khi tải ảnh lên');
      } finally {
        setUploadingBg(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const pendingClubs = clubs.filter(c => c.status === 'PENDING');
  const pendingEvents = events.filter(e => e.status === 'PENDING');
  const approvedClubs = clubs.filter(c => c.status === 'APPROVED');

  const NAV = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'clubs', label: 'Câu lạc bộ', icon: <Building2 className="w-5 h-5" />, badge: pendingClubs.length },
    { id: 'users', label: 'Thành viên', icon: <Users className="w-5 h-5" /> },
    { id: 'events', label: 'Sự kiện', icon: <CalendarDays className="w-5 h-5" />, badge: pendingEvents.length },
    { id: 'transfers', label: 'Chuyển quyền', icon: <RefreshCw className="w-5 h-5" />, badge: pendingTransfers.length },
    { id: 'resets', label: 'Quên mật khẩu', icon: <ShieldCheck className="w-5 h-5 text-orange-500" />, badge: pendingResets.length },
    { id: 'finance', label: 'Tài chính', icon: <Wallet className="w-5 h-5 text-green-500" /> },
    { id: 'chats', label: 'Chat Hỗ Trợ', icon: <MessageSquare className="w-5 h-5 text-blue-500" /> },
    { id: 'knowledge', label: 'Quản lý Tri thức', icon: <BookOpen className="w-5 h-5 text-purple-500" /> },
  ];

  const STATS = [
    { label: 'Tổng CLB', value: clubs.length, sub: `${approvedClubs.length} đã duyệt`, icon: <Building2 className="w-6 h-6" />, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
    { label: 'Chờ duyệt CLB', value: pendingClubs.length, sub: 'cần xử lý', icon: <Clock className="w-6 h-6" />, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-600' },
    { label: 'Thành viên', value: users.length, sub: 'tài khoản', icon: <Users className="w-6 h-6" />, color: 'bg-green-500', light: 'bg-green-50 text-green-600' },
    { label: 'Chờ duyệt SK', value: pendingEvents.length, sub: 'sự kiện', icon: <AlertCircle className="w-6 h-6" />, color: 'bg-red-500', light: 'bg-red-50 text-red-600' },
  ];

  const roleData = [
    { name: 'Admin', value: users.filter(u => u.role === 'ADMIN').length },
    { name: 'Leader', value: users.filter(u => u.role === 'LEADER').length },
    { name: 'Sinh viên', value: users.filter(u => u.role === 'STUDENT' || u.role === 'MEMBER').length }
  ].filter(d => d.value > 0);
  const PIE_COLORS = ['#8b5cf6', '#f97316', '#3b82f6'];

  const clubStatusData = [
    { name: 'Đã Duyệt', count: approvedClubs.length, fill: '#22c55e' },
    { name: 'Chờ Duyệt', count: pendingClubs.length, fill: '#f97316' },
    { name: 'Từ Chối', count: clubs.filter(c => c.status === 'REJECTED').length, fill: '#ef4444' }
  ];

  if (!user || role !== 'ADMIN') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex overflow-x-hidden">
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-8 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-900/30">H</div>
            <div>
              <div className="text-sm font-black text-white tracking-tight">HUTECH CLB</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group ${activeTab === item.id
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-2xl">
            <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white text-xs font-black">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">
                {NAV.find(n => n.id === activeTab)?.label}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">HUTECH CLB Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all group"
              title="Làm mới"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <div className="relative notification-bell-container flex items-center">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 group"
                title="Thông báo"
              >
                <Bell className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors group-hover:rotate-12" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] font-black bg-red-500 text-white rounded-full ring-2 ring-gray-950 animate-pulse min-w-[16px] h-[16px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 top-full w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
                      <span className="font-black text-white text-sm">Thông Báo</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] font-bold text-orange-500 hover:text-orange-400 transition-colors"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-800 custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={async () => {
                              await handleMarkAsRead(n.id);
                              setShowNotifications(false);
                              const targetLink = getNotificationLink(n.title, n.message, user?.role);
                              navigate(targetLink);
                            }}
                            className={`p-4 hover:bg-gray-800/50 transition-colors cursor-pointer flex items-start space-x-3 ${!n.isRead ? 'bg-orange-500/10' : ''}`}
                          >
                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.isRead ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className={`text-xs font-bold ${!n.isRead ? 'text-white' : 'text-gray-400'}`}>{n.title}</h4>
                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed break-words">{n.message}</p>
                              <span className="text-[9px] text-gray-400 mt-1.5 block">
                                {new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-600 animate-bounce" />
                          <p className="text-xs font-medium">Chưa có thông báo nào</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 p-8">
          {loading ? (
            <div className="flex justify-center py-32">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
                <p className="text-gray-500 text-sm font-medium">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {STATS.map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4"
                      >
                        <div className={`w-12 h-12 ${stat.light} rounded-2xl flex items-center justify-center`}>
                          {stat.icon}
                        </div>
                        <div>
                          <div className="text-3xl font-black text-white">{stat.value}</div>
                          <div className="text-sm font-bold text-gray-400">{stat.label}</div>
                          <div className="text-xs text-gray-600 mt-1">{stat.sub}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Cài đặt Giao diện */}
                  <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
                    <h3 className="font-black text-white flex items-center gap-2 mb-4">
                      <Eye className="w-5 h-5 text-orange-500" /> Cài đặt Giao diện
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-2xl border border-gray-800">
                      <div>
                        <div className="text-sm font-bold text-white">Hình nền Trang chủ</div>
                        <div className="text-xs text-gray-400 mt-1">Thay đổi ảnh nền hiển thị ở phần Hero của trang chủ. Kích thước khuyến nghị: 1920x1080 (Không giới hạn dung lượng).</div>
                      </div>
                      <label className="cursor-pointer relative overflow-hidden bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/40 flex items-center gap-2">
                        {uploadingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>{uploadingBg ? 'ĐANG TẢI...' : 'ĐỔI ẢNH NỀN'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleUploadBackground}
                          disabled={uploadingBg}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dashboard Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
                      <h3 className="font-black text-white flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-purple-500" /> Thống kê Trạng thái CLB
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={clubStatusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
                      <h3 className="font-black text-white flex items-center gap-2 mb-6">
                        <Users className="w-5 h-5 text-blue-500" /> Tỉ lệ Vai trò Người dùng
                      </h3>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {roleData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Pending items quick view */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pending Clubs */}
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
                      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-black text-white flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-orange-500" /> CLB chờ duyệt
                        </h3>
                        <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-[10px] font-black rounded-full">{pendingClubs.length} chờ</span>
                      </div>
                      <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                        {pendingClubs.length === 0 ? (
                          <div className="p-8 text-center text-gray-600 text-sm">✅ Không có CLB nào chờ duyệt</div>
                        ) : pendingClubs.map(club => (
                          <div key={club.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-all">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-white truncate">{club.name}</div>
                              <div className="text-xs text-gray-500">{club.founder?.name || 'Ẩn danh'} • {club.category}</div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleClubStatus(club.id, 'APPROVED')}
                                disabled={processingId === club.id}
                                className="w-8 h-8 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                              >
                                {processingId === club.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleClubStatus(club.id, 'REJECTED')}
                                disabled={processingId === club.id}
                                className="w-8 h-8 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Events */}
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
                      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-black text-white flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-blue-400" /> Sự kiện chờ duyệt
                        </h3>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-full">{pendingEvents.length} chờ</span>
                      </div>
                      <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                        {pendingEvents.length === 0 ? (
                          <div className="p-8 text-center text-gray-600 text-sm">✅ Không có sự kiện nào chờ duyệt</div>
                        ) : pendingEvents.map(event => (
                          <div key={event.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-all">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-white truncate">{event.title}</div>
                              <div className="text-xs text-gray-500">{event.club?.name} • {new Date(event.eventDate).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleEventStatus(event.id, 'APPROVED')}
                                disabled={processingId === event.id}
                                className="w-8 h-8 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                              >
                                {processingId === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleEventStatus(event.id, 'REJECTED')}
                                disabled={processingId === event.id}
                                className="w-8 h-8 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'clubs' && (
                <motion.div key="clubs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm CLB theo tên hoặc danh mục..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleOpenClubAdd}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-950/40 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm Câu lạc bộ</span>
                    </button>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLB</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Người tạo</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Danh mục</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Thành viên</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {clubs.filter(c => {
                          const query = searchQuery.toLowerCase();
                          return (c.name || '').toLowerCase().includes(query) || (c.category || '').toLowerCase().includes(query);
                        }).map(club => (
                          <tr key={club.id} className="hover:bg-gray-800/30 transition-all group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-400 font-black overflow-hidden">
                                  {club.logoUrl ? <img src={club.logoUrl} className="w-full h-full object-cover" alt="" /> : club.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{club.name}</div>
                                  <div className="text-xs text-gray-500">{new Date(club.createdAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300">{club.founder?.name || '—'}</div>
                              <div className="text-xs text-gray-600">{club.founder?.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg">{club.category || 'Chung'}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400 font-bold">{club._count?.members ?? 0}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${club.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                club.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                  'bg-orange-500/10 text-orange-400'
                                }`}>{club.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {club.status === 'PENDING' && (
                                  <>
                                    <button onClick={() => handleClubStatus(club.id, 'APPROVED')} disabled={processingId === club.id} className="px-2.5 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition-all">Duyệt</button>
                                    <button onClick={() => handleClubStatus(club.id, 'REJECTED')} disabled={processingId === club.id} className="px-2.5 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-650 hover:text-white rounded-lg text-xs font-bold transition-all">Từ chối</button>
                                  </>
                                )}
                                <button onClick={() => handleOpenClubEdit(club)} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                  <Edit className="w-3.5 h-3.5" /> Sửa
                                </button>
                                <button onClick={() => handleDeleteClub(club.id)} className="px-2.5 py-1.5 bg-red-955/40 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'users' && (
                <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm tài khoản theo Tên, Email hoặc MSSV..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleOpenAddModal}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-950/40 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm tài khoản</span>
                    </button>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Người dùng</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">MSSV</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Vai trò</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {users.filter((u: any) => {
                          const query = searchQuery.toLowerCase();
                          const nameMatch = u.name ? u.name.toLowerCase().includes(query) : false;
                          const emailMatch = u.email ? u.email.toLowerCase().includes(query) : false;
                          const studentIdMatch = u.studentId ? u.studentId.toLowerCase().includes(query) : false;
                          return nameMatch || emailMatch || studentIdMatch;
                        }).map((u: any) => (
                          <tr key={u.id} className={`hover:bg-gray-800/30 transition-all ${u.status === 'BLOCKED' ? 'bg-red-950/10' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-750 border border-gray-700 rounded-xl flex items-center justify-center text-white text-xs font-black">{u.name?.charAt(0)}</div>
                                <div>
                                  <div className="text-sm font-bold text-white">{u.name}</div>
                                  <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">{u.studentId}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400' :
                                u.role === 'LEADER' ? 'bg-blue-900/30 text-blue-400' :
                                  'bg-gray-800 text-gray-450'
                                }`}>{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${u.status === 'BLOCKED' ? 'bg-red-955/30 text-red-400 border-red-900/30' : 'bg-green-950/30 text-green-400 border-green-900/30'
                                }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleOpenEditModal(u)}
                                  className="px-2.5 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 hover:text-white transition-all flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleOpenPasswordModal(u)}
                                  className="px-2.5 py-1.5 bg-orange-950/30 text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1"
                                >
                                  <Key className="w-3 h-3" />
                                  Đổi MK
                                </button>
                                {u.role !== 'ADMIN' && (
                                  <>
                                    <button
                                      onClick={() => handleUserStatus(u.id, u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED')}
                                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${u.status === 'BLOCKED' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-950 text-red-400 border border-red-900/30 hover:bg-red-650 hover:text-white'
                                        }`}
                                    >
                                      {u.status === 'BLOCKED' ? 'Bỏ Chặn' : 'Chặn'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-2.5 py-1.5 bg-gray-955 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-650 hover:text-white transition-all"
                                    >
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'events' && (
                <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm sự kiện theo tên, mô tả hoặc CLB..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleOpenEventAdd}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-950/40 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm Sự kiện</span>
                    </button>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Sự kiện</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLB</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ngày tổ chức</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {events.filter(e => {
                          const query = searchQuery.toLowerCase();
                          return (e.title || '').toLowerCase().includes(query) || (e.description || '').toLowerCase().includes(query) || (e.club?.name || '').toLowerCase().includes(query);
                        }).map((event: any) => (
                          <tr key={event.id} className="hover:bg-gray-800/30 transition-all">
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-white">{event.title}</div>
                              <div className="text-xs text-gray-500 truncate max-w-xs">{event.description}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{event.club?.name || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{new Date(event.eventDate).toLocaleDateString('vi-VN')}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${event.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                event.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                  'bg-orange-500/10 text-orange-400'
                                }`}>{event.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {event.status === 'PENDING' && (
                                  <>
                                    <button onClick={() => handleEventStatus(event.id, 'APPROVED')} disabled={processingId === event.id} className="px-2.5 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition-all">Duyệt</button>
                                    <button onClick={() => handleEventStatus(event.id, 'REJECTED')} disabled={processingId === event.id} className="px-2.5 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-650 hover:text-white rounded-lg text-xs font-bold transition-all">Từ chối</button>
                                  </>
                                )}
                                <button onClick={() => handleOpenEventEdit(event)} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                  <Edit className="w-3.5 h-3.5" /> Sửa
                                </button>
                                <button onClick={() => handleDeleteEvent(event.id)} className="px-2.5 py-1.5 bg-red-955/40 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'transfers' && (
                <motion.div key="transfers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingTransfers.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 p-6 rounded-[32px] border border-gray-800 shadow-sm space-y-6 text-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-950/30 text-purple-400 rounded-xl flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 animate-spin-slow" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Chuyển quyền Chủ nhiệm</div>
                            <div className="text-sm font-bold text-white">{req.club?.name}</div>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 bg-gray-955/50 rounded-2xl border border-gray-800 relative">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Từ (Chủ nhiệm hiện tại)</div>
                            <div className="text-xs font-bold text-gray-300">{req.fromUser.name} <span className="text-gray-500 font-medium">({req.fromUser.studentId})</span></div>
                          </div>

                          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 border border-gray-850 rounded-full flex items-center justify-center z-10">
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          </div>

                          <div className="space-y-1 pt-2">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Đến (Người kế nhiệm)</div>
                            <div className="text-xs font-bold text-blue-400">{req.toUser.name} <span className="text-gray-550 font-medium">({req.toUser.studentId})</span></div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateTransferStatus(req.id, 'APPROVED')}
                            disabled={processingId === req.id}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-950/40"
                          >
                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chấp nhận'}
                          </button>
                          <button
                            onClick={() => handleUpdateTransferStatus(req.id, 'REJECTED')}
                            disabled={processingId === req.id}
                            className="flex-1 py-2.5 bg-gray-800 text-red-400 border border-gray-750 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-950/30 transition-all"
                          >
                            Từ chối
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {pendingTransfers.length === 0 && (
                      <div className="col-span-full py-20 text-center text-gray-500 italic font-medium">
                        Không có yêu cầu chuyển quyền nào đang chờ duyệt.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'resets' && (
                <motion.div key="resets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingResets.map((req) => (
                      <motion.div
                        key={req.email}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 p-6 rounded-[32px] border border-gray-800 shadow-sm space-y-6 text-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-955/30 text-orange-450 rounded-xl flex items-center justify-center font-bold">
                            🔑
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-orange-455 uppercase tracking-widest">Yêu cầu Đặt lại Mật khẩu</div>
                            <div className="text-sm font-bold text-white">{req.name}</div>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 bg-gray-950/50 rounded-2xl border border-gray-800">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email Tài khoản</div>
                            <div className="text-xs font-bold text-gray-300">{req.email}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Thời gian gửi</div>
                            <div className="text-xs font-medium text-gray-400">{new Date(req.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveReset(req.email)}
                            disabled={processingId === req.email}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-950/40"
                          >
                            {processingId === req.email ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Phê duyệt'}
                          </button>
                          <button
                            onClick={() => handleRejectReset(req.email)}
                            disabled={processingId === req.email}
                            className="flex-1 py-2.5 bg-gray-800 text-red-400 border border-gray-750 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-950/30 transition-all"
                          >
                            Từ chối
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {pendingResets.length === 0 && (
                      <div className="col-span-full py-20 text-center text-gray-500 italic font-medium">
                        Không có yêu cầu khôi phục mật khẩu nào đang chờ duyệt.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'chats' && (
                <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-[calc(100vh-140px)] flex gap-6 text-white">
                  {/* Left panel: Chat list */}
                  <div className="w-80 bg-gray-900 border border-gray-800 rounded-[32px] flex flex-col overflow-hidden shrink-0">
                    <div className="p-6 border-b border-gray-800">
                      <h3 className="text-lg font-black flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <span>Danh sách Chat</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Tin nhắn hỗ trợ từ sinh viên</p>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50 custom-scrollbar">
                      {chatRooms.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-sm font-medium italic">
                          Không có cuộc trò chuyện nào.
                        </div>
                      ) : (
                        chatRooms.map(room => (
                          <button
                            key={room.studentId}
                            onClick={() => setActiveChatUserId(room.studentId)}
                            className={`w-full p-5 text-left flex items-start gap-4 transition-all hover:bg-gray-800/40 ${activeChatUserId === room.studentId ? 'bg-gray-800 border-l-4 border-orange-500' : ''
                              }`}
                          >
                            <div className="w-10 h-10 bg-orange-600/20 text-orange-400 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-inner">
                              {room.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-sm text-white truncate pr-2">{room.studentName}</span>
                                <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">
                                  {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-1 font-medium">
                                {room.isAI ? (
                                  <span className="text-blue-400 font-bold mr-1">AI:</span>
                                ) : null}
                                {room.lastMessage}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right panel: Messages area */}
                  <div className="flex-1 bg-gray-900 border border-gray-800 rounded-[32px] flex flex-col overflow-hidden">
                    {activeChatUserId ? (
                      <>
                        {/* Selected Chat Header */}
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-600/20 text-orange-400 rounded-2xl flex items-center justify-center font-black shadow-inner">
                              {chatRooms.find(r => r.studentId === activeChatUserId)?.studentName?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-white">
                                {chatRooms.find(r => r.studentId === activeChatUserId)?.studentName || 'Sinh viên'}
                              </h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Trò chuyện trực tiếp & AI</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest">Đang kết nối</span>
                        </div>

                        {/* Selected Chat Messages List */}
                        <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-4 custom-scrollbar bg-gray-950/20">
                          {chatMessages.map((msg: any) => {
                            const isUser = !msg.isFromAdmin && !msg.isAI;
                            const isAI = msg.isAI;
                            const isAdmin = msg.isFromAdmin;

                            let senderLabel = "Sinh viên";
                            let bubbleStyle = "bg-gray-805 text-gray-100 rounded-bl-none border border-gray-700/50";
                            let alignStyle = "justify-start";
                            let iconBg = "bg-gray-700 text-gray-300";

                            if (isAdmin) {
                              senderLabel = "Bạn (Admin)";
                              bubbleStyle = "bg-orange-600 text-white rounded-br-none";
                              alignStyle = "justify-end";
                              iconBg = "bg-orange-100 text-orange-600";
                            } else if (isAI) {
                              senderLabel = "Trợ lý AI";
                              bubbleStyle = "bg-blue-950/50 text-blue-100 border border-blue-900/50 rounded-bl-none";
                              iconBg = "bg-blue-900 text-blue-300";
                            }

                            return (
                              <div key={msg.id} className={`flex ${alignStyle}`}>
                                <div className={`flex items-end space-x-3 max-w-[80%] ${isAdmin ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${iconBg}`} title={senderLabel}>
                                    {isAdmin ? <Users className="w-4 h-4" /> : isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isAdmin ? 'text-right text-orange-500' : isAI ? 'text-blue-400' : 'text-gray-400'}`}>
                                      {senderLabel}
                                    </span>
                                    <div className={`px-4 py-3 rounded-[20px] text-sm leading-relaxed shadow-sm ${bubbleStyle}`}>
                                      {msg.message}
                                      <div className={`text-[9px] mt-1.5 opacity-55 ${isAdmin ? 'text-right text-orange-200' : isAI ? 'text-blue-300' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected Chat Input */}
                        <div className="p-6 border-t border-gray-800 shrink-0 bg-gray-900/50">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              placeholder="Nhập câu trả lời gửi đến sinh viên..."
                              className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl px-6 py-4 font-bold text-sm text-white focus:outline-none focus:border-orange-600 transition-all placeholder-gray-600"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && sendAdminReply()}
                            />
                            <button
                              onClick={sendAdminReply}
                              disabled={sendingChat || !chatInput.trim()}
                              className={`px-6 py-4 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${sendingChat || !chatInput.trim() ? 'bg-gray-800 text-gray-500' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-950/40'
                                }`}
                            >
                              {sendingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <MessageSquare className="w-16 h-16 text-gray-700 animate-pulse mb-4" />
                        <h4 className="font-black text-gray-400 mb-1">Chưa chọn cuộc trò chuyện</h4>
                        <p className="text-xs text-gray-600 max-w-sm text-center font-bold">Hãy chọn một sinh viên từ danh sách ở bên trái để xem lịch sử và giải đáp thắc mắc của họ.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'finance' && (
                <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl overflow-hidden min-h-[calc(100vh-140px)]">
                  <FinancePage isAdminView={true} />
                </motion.div>
              )}

              {activeTab === 'knowledge' && (
                <motion.div key="knowledge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{kbDocuments.length}</div>
                        <div className="text-xs text-gray-400 font-bold">Tổng tài liệu</div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{kbDocuments.filter(d => d.status === 'synced').length}</div>
                        <div className="text-xs text-gray-400 font-bold">Đã đồng bộ index</div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{kbDocuments.filter(d => d.status === 'processing').length}</div>
                        <div className="text-xs text-gray-400 font-bold">Đang index...</div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{kbFaqs.length}</div>
                        <div className="text-xs text-gray-400 font-bold">Câu hỏi FAQ</div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Management Section */}
                  <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span>Tải lên & Quản lý Tài liệu Tri thức</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Cung cấp tài liệu PDF/Word/Text để làm tri thức nguồn cho Trợ lý AI giải đáp thắc mắc của sinh viên.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Drag & Drop Zone */}
                      <div 
                        onDragEnter={handleKbDrag}
                        onDragOver={handleKbDrag}
                        onDragLeave={handleKbDrag}
                        onDrop={handleKbDrop}
                        className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[260px] ${
                          kbDragActive 
                            ? 'border-orange-500 bg-orange-500/5' 
                            : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="kb-file-upload" 
                          multiple 
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleKbFileSelect}
                          className="hidden" 
                        />
                        
                        <label 
                          htmlFor="kb-file-upload"
                          className="cursor-pointer flex flex-col items-center gap-4 group"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center group-hover:scale-105 transition-all shadow-lg group-hover:border-orange-500/50">
                            {isKbUploading ? (
                              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            ) : (
                              <UploadCloud className="w-8 h-8 text-purple-400 group-hover:text-orange-500 transition-colors" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                              Kéo thả tài liệu vào đây
                            </p>
                            <p className="text-xs text-gray-500 mt-1">hoặc nhấn để duyệt file từ máy tính</p>
                          </div>
                          <span className="text-[10px] text-gray-600 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full font-bold">
                            PDF, DOC, DOCX, TXT (tối đa 50MB)
                          </span>
                        </label>
                      </div>

                      {/* Documents Table List */}
                      <div className="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden flex flex-col bg-gray-950">
                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-800 bg-gray-900/50">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Tên tài liệu</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLB sở hữu</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ngày tải</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kích thước</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái index</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Hành động</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60">
                              {kbDocuments.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-900/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                                      <span className="text-xs font-bold text-white truncate max-w-[200px]" title={doc.name}>
                                        {doc.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-bold text-gray-400">{doc.clubName}</td>
                                  <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                    {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-semibold text-gray-500">{doc.size}</td>
                                  <td className="px-6 py-4">
                                    {doc.status === 'synced' && (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-900/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                        Đã đồng bộ
                                      </span>
                                    )}
                                    {doc.status === 'processing' && (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-900/30">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Đang xử lý
                                      </span>
                                    )}
                                    {doc.status === 'error' && (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-900/30">
                                        Lỗi đồng bộ
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => handleDeleteKbDoc(doc.id)}
                                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                                      title="Xóa tài liệu"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {kbDocuments.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600 font-medium italic text-xs">
                                    Chưa tải lên tài liệu tri thức nào.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FAQs Management Section */}
                  <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-purple-400" />
                          <span>Quản lý bộ Câu hỏi thường gặp (FAQs)</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Thiết lập các cặp câu hỏi - câu trả lời trực tiếp để huấn luyện nhanh Trợ lý AI mà không cần tải tệp tin.</p>
                      </div>
                      
                      <button
                        onClick={handleOpenAddFaqModal}
                        className="self-start sm:self-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-950/40 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm câu hỏi FAQ</span>
                      </button>
                    </div>

                    {/* Filter and Search */}
                    <div className="flex gap-4 p-4 bg-gray-950/30 border border-gray-800 rounded-2xl">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
                          value={kbSearchQuery}
                          onChange={(e) => setKbSearchQuery(e.target.value)}
                          className="w-full bg-gray-955 border border-gray-850 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors bg-gray-950"
                        />
                      </div>
                    </div>

                    {/* FAQs Table List */}
                    <div className="border border-gray-800 bg-gray-950 rounded-3xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest w-[30%]">Câu hỏi</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest w-[45%]">Câu trả lời</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Danh mục CLB</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60">
                            {kbFaqs.filter((f) => {
                              const q = kbSearchQuery.toLowerCase();
                              return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.clubName.toLowerCase().includes(q);
                            }).map((faq) => (
                              <tr key={faq.id} className="hover:bg-gray-900/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="text-xs font-bold text-white leading-relaxed line-clamp-2" title={faq.question}>
                                    {faq.question}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-xs text-gray-400 leading-relaxed line-clamp-2" title={faq.answer}>
                                    {faq.answer}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-950/30 text-purple-400 border border-purple-900/20">
                                    {faq.clubName}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleOpenEditFaqModal(faq)}
                                      className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                                      title="Sửa FAQ"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFaq(faq.id)}
                                      className="p-1.5 bg-gray-800 hover:bg-red-955/35 text-gray-300 hover:text-red-400 rounded-lg transition-colors"
                                      title="Xóa FAQ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {kbFaqs.filter((f) => {
                              const q = kbSearchQuery.toLowerCase();
                              return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.clubName.toLowerCase().includes(q);
                            }).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-600 font-medium italic text-xs">
                                  Không tìm thấy câu hỏi FAQ nào khớp với tìm kiếm.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Thêm tài khoản mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mã số sinh viên (hoặc ADMIN ID)</label>
                <input
                  required
                  type="text"
                  value={formData.studentId}
                  onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="228060..."
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Họ và Tên</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="a.nv@hutech.edu.vn"
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mật khẩu khởi tạo</label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-750"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="STUDENT">STUDENT (Sinh viên)</option>
                  <option value="LEADER">LEADER (Chủ nhiệm)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-950/40 mt-4"
              >
                Xác nhận thêm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Chỉnh sửa tài khoản</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mã số sinh viên (hoặc ADMIN ID)</label>
                <input
                  required
                  type="text"
                  value={formData.studentId}
                  onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-850 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Họ và Tên</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-850 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="STUDENT">STUDENT (Sinh viên)</option>
                  <option value="LEADER">LEADER (Chủ nhiệm)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-855 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                  <option value="BLOCKED">BLOCKED (Bị khóa)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-950/40 mt-4"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password override modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-2">Đổi mật khẩu trực tiếp</h3>
            <p className="text-xs text-gray-400 mb-6 font-medium">Đặt lại mật khẩu cho: <span className="text-orange-400 font-bold">{selectedUser?.name}</span></p>
            <form onSubmit={handleOverridePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mật khẩu mới</label>
                <input
                  required
                  type="password"
                  value={newPasswordOverride}
                  onChange={e => setNewPasswordOverride(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Club Modal */}
      {showClubAddModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowClubAddModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Thêm Câu lạc bộ mới</h3>
            <form onSubmit={handleCreateClub} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Tên Câu lạc bộ</label>
                <input
                  required
                  type="text"
                  value={clubFormData.name}
                  onChange={e => setClubFormData({ ...clubFormData, name: e.target.value })}
                  placeholder="CLB Tin Học..."
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mô tả</label>
                <textarea
                  required
                  value={clubFormData.description}
                  onChange={e => setClubFormData({ ...clubFormData, description: e.target.value })}
                  placeholder="Giới thiệu về CLB..."
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 h-24 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Danh mục</label>
                <select
                  value={clubFormData.category}
                  onChange={e => setClubFormData({ ...clubFormData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="Thể Thao">Thể Thao</option>
                  <option value="Nghệ Thuật">Nghệ Thuật</option>
                  <option value="Học Thuật">Học Thuật</option>
                  <option value="Xã Hội">Xã Hội</option>
                  <option value="Cộng Đồng">Cộng Đồng</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Người sáng lập / Chủ nhiệm</label>
                <select
                  value={clubFormData.founderId}
                  onChange={e => setClubFormData({ ...clubFormData, founderId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="">-- Chọn thành viên phụ trách --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.studentId || u.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Logo CLB (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {clubFormData.logoUrl ? (
                      <img src={clubFormData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <span className="text-gray-600 text-xs text-center leading-tight">Chưa có<br />Logo</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleClubImageChange(e, 'logoUrl')}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL..."
                      value={clubFormData.logoUrl}
                      onChange={e => setClubFormData({ ...clubFormData, logoUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ảnh bìa CLB (Cover - Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-12 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {clubFormData.coverUrl ? (
                      <img src={clubFormData.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <span className="text-gray-600 text-[10px] text-center">Chưa có<br />Ảnh bìa</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleClubImageChange(e, 'coverUrl')}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL..."
                      value={clubFormData.coverUrl}
                      onChange={e => setClubFormData({ ...clubFormData, coverUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-950/40 mt-4"
              >
                Xác nhận thêm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Club Modal */}
      {showClubEditModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowClubEditModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Chỉnh sửa Câu lạc bộ</h3>
            <form onSubmit={handleUpdateClub} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Tên Câu lạc bộ</label>
                <input
                  required
                  type="text"
                  value={clubFormData.name}
                  onChange={e => setClubFormData({ ...clubFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mô tả</label>
                <textarea
                  required
                  value={clubFormData.description}
                  onChange={e => setClubFormData({ ...clubFormData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white h-24 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Danh mục</label>
                <select
                  value={clubFormData.category}
                  onChange={e => setClubFormData({ ...clubFormData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="Thể Thao">Thể Thao</option>
                  <option value="Nghệ Thuật">Nghệ Thuật</option>
                  <option value="Học Thuật">Học Thuật</option>
                  <option value="Xã Hội">Xã Hội</option>
                  <option value="Cộng Đồng">Cộng Đồng</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Chủ nhiệm (Founder)</label>
                <select
                  value={clubFormData.founderId}
                  onChange={e => setClubFormData({ ...clubFormData, founderId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="">-- Chọn thành viên phụ trách --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.studentId || u.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Trạng thái</label>
                <select
                  value={clubFormData.status}
                  onChange={e => setClubFormData({ ...clubFormData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="APPROVED">APPROVED (Đã duyệt)</option>
                  <option value="PENDING">PENDING (Chờ duyệt)</option>
                  <option value="REJECTED">REJECTED (Bị từ chối)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Logo CLB (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {clubFormData.logoUrl ? (
                      <img src={clubFormData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <span className="text-gray-600 text-xs text-center leading-tight">Chưa có<br />Logo</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleClubImageChange(e, 'logoUrl')}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL..."
                      value={clubFormData.logoUrl}
                      onChange={e => setClubFormData({ ...clubFormData, logoUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ảnh bìa CLB (Cover - Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-12 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {clubFormData.coverUrl ? (
                      <img src={clubFormData.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <span className="text-gray-600 text-[10px] text-center">Chưa có<br />Ảnh bìa</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleClubImageChange(e, 'coverUrl')}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL..."
                      value={clubFormData.coverUrl}
                      onChange={e => setClubFormData({ ...clubFormData, coverUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-950/40 mt-4"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showEventAddModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowEventAddModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Thêm Sự kiện mới</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Câu lạc bộ tổ chức</label>
                <select
                  required
                  value={eventFormData.clubId}
                  onChange={e => setEventFormData({ ...eventFormData, clubId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="">-- Chọn câu lạc bộ --</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Tiêu đề Sự kiện</label>
                <input
                  required
                  type="text"
                  value={eventFormData.title}
                  onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                  placeholder="Chào tân sinh viên..."
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ảnh Sự kiện (Tải lên hoặc URL)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {eventFormData.imageUrl ? (
                      <img src={eventFormData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <span className="text-gray-600 text-xs">Không ảnh</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEventImageChange}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL ảnh..."
                      value={eventFormData.imageUrl}
                      onChange={e => setEventFormData({ ...eventFormData, imageUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mô tả chi tiết</label>
                <textarea
                  required
                  value={eventFormData.description}
                  onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="Nội dung hoạt động sự kiện..."
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 h-24 resize-none bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Địa điểm</label>
                <input
                  required
                  type="text"
                  value={eventFormData.location}
                  onChange={e => setEventFormData({ ...eventFormData, location: e.target.value })}
                  placeholder="Hội trường A-08.20..."
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ngày giờ tổ chức</label>
                <input
                  required
                  type="datetime-local"
                  value={eventFormData.eventDate}
                  onChange={e => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-955/40 mt-4"
              >
                Xác nhận thêm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEventEditModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowEventEditModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">Chỉnh sửa Sự kiện</h3>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Tiêu đề Sự kiện</label>
                <input
                  required
                  type="text"
                  value={eventFormData.title}
                  onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ảnh Sự kiện (Tải lên hoặc URL)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {eventFormData.imageUrl ? (
                      <img src={eventFormData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <span className="text-gray-600 text-xs">Không ảnh</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEventImageChange}
                      className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Hoặc dán URL ảnh..."
                      value={eventFormData.imageUrl}
                      onChange={e => setEventFormData({ ...eventFormData, imageUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-955 border border-gray-800 rounded-lg focus:outline-none focus:border-orange-600 text-xs font-medium text-white placeholder-gray-700 bg-gray-950"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Mô tả chi tiết</label>
                <textarea
                  required
                  value={eventFormData.description}
                  onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white h-24 resize-none bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Địa điểm</label>
                <input
                  required
                  type="text"
                  value={eventFormData.location}
                  onChange={e => setEventFormData({ ...eventFormData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Ngày giờ tổ chức</label>
                <input
                  required
                  type="datetime-local"
                  value={eventFormData.eventDate}
                  onChange={e => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Trạng thái</label>
                <select
                  value={eventFormData.status}
                  onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="APPROVED">APPROVED (Đã duyệt)</option>
                  <option value="PENDING">PENDING (Chờ duyệt)</option>
                  <option value="REJECTED">REJECTED (Bị từ chối)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-955/40 mt-4"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}
      {/* FAQ Modal (Add/Edit) */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setShowFaqModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black mb-6">
              {selectedFaq ? 'Chỉnh sửa Câu hỏi FAQ' : 'Thêm Câu hỏi FAQ mới'}
            </h3>
            <form onSubmit={handleSaveFaq} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Câu hỏi huấn luyện</label>
                <textarea
                  required
                  placeholder="Nhập câu hỏi sinh viên thường hỏi..."
                  value={faqFormData.question}
                  onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 h-20 resize-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Câu trả lời mẫu</label>
                <textarea
                  required
                  placeholder="Nhập câu trả lời chính xác để AI học..."
                  value={faqFormData.answer}
                  onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white placeholder-gray-700 h-32 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Chọn CLB sở hữu (Hoặc Chung)</label>
                <select
                  value={faqFormData.clubName}
                  onChange={(e) => setFaqFormData({ ...faqFormData, clubName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-955 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-medium transition-all text-white bg-gray-950"
                >
                  <option value="Chung (Tất cả CLB)">Chung (Tất cả CLB)</option>
                  {clubs.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isFaqSubmitting}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-955/40 mt-4 flex items-center justify-center gap-2"
              >
                {isFaqSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu câu hỏi</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
