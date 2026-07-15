import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Users, Calendar, Info,
  ArrowLeft, Loader2, CheckCircle2,
  Share2, Shield, Layout, MessageSquare,
  ThumbsUp, Trash2, Send, MapPin, Clock, Pin, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function ClubDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // New States for Blog posts & Events
  const [activeTab, setActiveTab] = useState<'about' | 'blog' | 'events'>('about');
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<Record<string, boolean>>({});
  const [activeReactionIndex, setActiveReactionIndex] = useState<Record<string, number>>({});
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [appForm, setAppForm] = useState({
    fullName: '',
    studentId: '',
    className: '',
    address: '',
    phone: '',
    dateOfBirth: ''
  });

  useEffect(() => {
    if (showJoinModal && user) {
      setAppForm({
        fullName: user.name || '',
        studentId: user.studentId || '',
        className: user.className || '',
        address: user.address || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || ''
      });
    }
  }, [showJoinModal, user]);

  // Mobile / Touch gesture refs
  const touchTimeout = useRef<any>(null);
  const isLongPress = useRef<boolean>(false);
  const pickerTimeouts = useRef<Record<string, any>>({});

  useEffect(() => {
    fetchClubDetail();
  }, [id]);

  const fetchClubDetail = async () => {
    try {
      const res = await api.get(`/clubs`);
      const found = res.data.find((c: any) => c.id === id);
      if (found) {
        setClub(found);
        // Check if already a member
        const myClubs = await api.get('/clubs/my-clubs');
        if (myClubs.data.some((c: any) => c.id === id)) {
          setJoined(true);
        }
      }

      // Fetch posts of this club
      const postsRes = await api.get(`/posts/club/${id}`);
      setPosts(postsRes.data);

      // Fetch approved events of this club
      const eventsRes = await api.get('/events');
      const clubEvents = eventsRes.data.filter((e: any) => e.clubId === id);
      setEvents(clubEvents);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return navigate('/login');
    setShowJoinModal(true);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appForm.fullName.trim() || !appForm.studentId.trim() || !appForm.className.trim() || !appForm.phone.trim()) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setJoining(true);
    try {
      await api.post(`/clubs/${id}/join`, appForm);
      alert('Đã gửi yêu cầu tham gia! Chờ chủ nhiệm duyệt.');
      setShowJoinModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tham gia');
    } finally {
      setJoining(false);
    }
  };

  const handleTogglePin = async (postId: string) => {
    try {
      await api.put(`/posts/${postId}/pin`);
      // Refresh posts
      const postsRes = await api.get(`/posts/club/${id}`);
      setPosts(postsRes.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thay đổi trạng thái ghim.');
    }
  };

  // Reactions & Comments interactions
  const handleReact = async (postId: string, type: 'LIKE' | 'HEART' | 'HAHA') => {
    try {
      await api.post(`/posts/${postId}/react`, { type });
      setShowReactionPicker(prev => ({ ...prev, [postId]: false }));
      // Refresh posts
      const postsRes = await api.get(`/posts/club/${id}`);
      setPosts(postsRes.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi bày tỏ cảm xúc.');
    }
  };

  const getUserActiveReaction = (reactions: any[]) => {
    if (!reactions || !user) return null;
    const found = reactions.find(r => r.userId === user.id);
    return found ? found.type : null;
  };

  // Desktop Hover Debounce for Reactions
  const handleMouseEnter = (postId: string) => {
    if (pickerTimeouts.current[postId]) {
      clearTimeout(pickerTimeouts.current[postId]);
    }
    setShowReactionPicker(prev => ({ ...prev, [postId]: true }));
  };

  const handleMouseLeave = (postId: string) => {
    pickerTimeouts.current[postId] = setTimeout(() => {
      setShowReactionPicker(prev => ({ ...prev, [postId]: false }));
    }, 450);
  };

  // Mobile Touch Gestures for Reactions
  const handleTouchStart = (postId: string, currentReaction: string | null) => {
    isLongPress.current = false;
    touchTimeout.current = setTimeout(() => {
      isLongPress.current = true;
      setShowReactionPicker(prev => ({ ...prev, [postId]: true }));
      setActiveReactionIndex(prev => ({ ...prev, [postId]: 0 }));
    }, 350);
  };

  const handleTouchMove = (e: React.TouchEvent, postId: string) => {
    if (!showReactionPicker[postId]) return;
    const touch = e.touches[0];
    const element = document.getElementById(`reaction-picker-${postId}`);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    const itemWidth = rect.width / 3;
    let index = Math.floor(relativeX / itemWidth);
    if (index < 0) index = 0;
    if (index > 2) index = 2;

    setActiveReactionIndex(prev => ({ ...prev, [postId]: index }));
  };

  const handleTouchEnd = (postId: string) => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }

    if (showReactionPicker[postId]) {
      const index = activeReactionIndex[postId] ?? 0;
      const types: ('LIKE' | 'HEART' | 'HAHA')[] = ['LIKE', 'HEART', 'HAHA'];
      handleReact(postId, types[index]);
      setShowReactionPicker(prev => ({ ...prev, [postId]: false }));
      setActiveReactionIndex(prev => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content || !content.trim()) return;
    try {
      await api.post(`/posts/${postId}/comments`, { content });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      // Refresh posts
      const postsRes = await api.get(`/posts/club/${id}`);
      setPosts(postsRes.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi bình luận.');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      // Refresh posts
      const postsRes = await api.get(`/posts/club/${id}`);
      setPosts(postsRes.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa bình luận.');
    }
  };

  const canModifyComment = (post: any, comment: any) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (comment.userId === user.id) return true;
    if (user.role === 'LEADER' && post.clubId === id) return true;
    return false;
  };

  // Event Registration Interaction
  const handleRegisterEvent = async (eventId: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Không tìm thấy câu lạc bộ</h2>
          <button onClick={() => navigate('/clubs')} className="px-6 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl font-bold">Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Hero Header */}
      <div className="relative h-[400px] bg-gray-900 overflow-hidden">
        {/* Background Pattern/Blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-gray-950 z-10"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full -mr-40 -mt-40"></div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-8 left-4 p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row items-end gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-32 h-32 md:w-44 md:h-44 bg-white rounded-[40px] shadow-2xl flex items-center justify-center p-2 border-4 border-gray-900 overflow-hidden shrink-0"
            >
              {club.logoUrl ? (
                <img src={club.logoUrl} className="w-full h-full object-cover rounded-[32px]" alt={club.name} />
              ) : (
                <Building2 className="w-20 h-20 text-orange-600" />
              )}
            </motion.div>

            <div className="flex-1 space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                  {club.category || 'Học thuật'}
                </span>
                {joined && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-500/30">
                    ĐÃ THAM GIA
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">{club.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span>{club._count?.members || 0} Thành viên</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Thành lập: {new Date(club.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {!joined ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 md:flex-none px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Tham gia ngay
                </button>
              ) : (
                <button className="flex-1 md:flex-none px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2">
                  Vào phòng sinh hoạt
                </button>
              )}
              <button className="p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info Sidebar */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Info className="w-5 h-5 text-orange-600" />
                Giới thiệu câu lạc bộ
              </h2>
              <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium space-y-4 text-sm">
                {club.description ? club.description.split('\n').map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                )) : 'Không có mô tả chi tiết cho câu lạc bộ này.'}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Layout className="w-5 h-5 text-blue-600" />
                Các hoạt động tiêu biểu
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {['Tổ chức sự kiện học thuật', 'Giao lưu cộng đồng', 'Workshop kỹ năng', 'Các giải đấu thể thao'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-955 rounded-xl border border-gray-100 dark:border-gray-800">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-bold text-xs text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-black text-gray-900 dark:text-white mb-4">Ban điều hành</h3>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center font-black text-lg">
                  {club.founder?.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <div className="text-xs font-black text-gray-900 dark:text-white">{club.founder?.name || 'Đang cập nhật'}</div>
                  <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Chủ nhiệm CLB</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">Trạng thái duyệt</span>
                  <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-[9px] font-black rounded-md uppercase tracking-widest border border-green-250 dark:border-green-800">Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">ID CLB</span>
                  <span className="text-gray-900 dark:text-white font-mono text-[9px] font-bold uppercase">{id?.split('-')[0]}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-600 to-orange-500 p-6 rounded-[32px] text-white shadow-xl shadow-orange-900/20">
              <h3 className="text-base font-black mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Nội quy CLB
              </h3>
              <p className="text-orange-100 text-xs font-medium mb-4">Mọi thành viên tham gia cần tuân thủ các quy định chung của nhà trường và CLB.</p>
              <button className="w-full py-2.5 bg-white text-orange-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 transition-all">
                Xem chi tiết nội quy
              </button>
            </div>
          </div>

          {/* Right Column: Wall Feed */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Upcoming Events Section */}
            {events.length > 0 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-550 dark:text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Sự kiện CLB sắp diễn ra ({events.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <motion.div
                      key={event.id}
                      layout
                      className="bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full group hover:shadow-xl transition-all"
                    >
                      <div className="h-44 overflow-hidden relative">
                        <img src={event.imageUrl || event.image || ''} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm text-gray-900 dark:text-white text-[9px] uppercase font-black rounded-lg shadow-sm border border-white dark:border-gray-800">Sự kiện Sắp tới</span>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 block">{club.name}</span>
                          <h3 className="text-base font-black text-gray-900 dark:text-white mb-4 line-clamp-2 leading-snug">{event.title}</h3>
                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400"><Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> {new Date(event.eventDate).toLocaleDateString('vi-VN')}</div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400"><Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> {new Date(event.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> <span className="truncate">{event.location}</span></div>
                          </div>
                        </div>
                        <div>
                          {user ? (
                            <button
                              onClick={() => handleRegisterEvent(event.id)}
                              disabled={registeringId === event.id}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:bg-gray-300"
                            >
                              {registeringId === event.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'ĐĂNG KÝ THAM GIA'}
                            </button>
                          ) : (
                            <a href="/login" className="block text-center w-full py-3 bg-gray-150 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest">Đăng nhập để đăng ký</a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Posts Feed Section */}
            <div className="space-y-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-550 dark:text-gray-400 flex items-center gap-2">
                <Layout className="w-4 h-4 text-orange-500" />
                Bài viết & Tin tức ({posts.length})
              </h2>
              {posts.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-12 text-center text-gray-400 font-bold shadow-sm">
                  Câu lạc bộ chưa có tin tức hoặc bài viết nào.
                </div>
              ) : (
                posts.map(post => (
                  <motion.article
                    layout
                    key={post.id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-gray-100/50 dark:hover:shadow-gray-900/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Post Meta */}
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl flex items-center justify-center overflow-hidden">
                            {club.logoUrl ? (
                              <img src={club.logoUrl} className="w-full h-full object-cover" alt="Club Logo" />
                            ) : (
                              <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                              <span>{club.name}</span>
                              {post.isPinned && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900/30">
                                  <Pin className="w-2.5 h-2.5 fill-current" />
                                  <span>Ghim</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Pinned toggle action for admin/leader */}
                        {user && (user.role === 'ADMIN' || (user.role === 'LEADER' && club.founderId === user.id)) && (
                          <button
                            onClick={() => handleTogglePin(post.id)}
                            className={`p-2 rounded-xl transition-all border shrink-0 ${
                              post.isPinned
                                ? 'bg-orange-600/10 text-orange-600 border-orange-600/20 hover:bg-orange-600/20'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-200 border-transparent hover:border-gray-700'
                            }`}
                            title={post.isPinned ? "Bỏ ghim" : "Ghim bài viết"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-current' : ''}`} />
                          </button>
                        )}
                      </div>

                      {/* Title & Body */}
                      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 leading-snug">{post.title}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mb-4 font-medium">
                        {post.content}
                      </p>

                      {/* Reactions Stats */}
                      {post.reactions && post.reactions.length > 0 && (
                        <div className="flex items-center gap-3 mt-4 text-xs text-gray-500 font-medium bg-gray-50 dark:bg-gray-955 px-4 py-2 rounded-2xl w-fit border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center -space-x-1">
                            {post.reactions.some((r: any) => r.type === 'LIKE') && (
                              <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] ring-2 ring-white dark:ring-gray-900">👍</span>
                            )}
                            {post.reactions.some((r: any) => r.type === 'HEART') && (
                              <span className="w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-[10px] ring-2 ring-white dark:ring-gray-900">❤️</span>
                            )}
                            {post.reactions.some((r: any) => r.type === 'HAHA') && (
                              <span className="w-5 h-5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center text-[10px] ring-2 ring-white dark:ring-gray-900">😆</span>
                            )}
                          </div>
                          <span>
                            {post.reactions.length} lượt bày tỏ cảm xúc
                          </span>
                        </div>
                      )}

                      {/* Actions Row */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-150 dark:border-gray-800 relative">
                        {/* Reaction button with hover picker & touch gestures */}
                        <div
                          className="relative"
                          onMouseEnter={() => handleMouseEnter(post.id)}
                          onMouseLeave={() => handleMouseLeave(post.id)}
                        >
                          <button
                            onTouchStart={() => handleTouchStart(post.id, getUserActiveReaction(post.reactions))}
                            onTouchMove={(e) => handleTouchMove(e, post.id)}
                            onTouchEnd={() => handleTouchEnd(post.id)}
                            onClick={() => {
                              if (!isLongPress.current) {
                                const active = getUserActiveReaction(post.reactions);
                                if (active) {
                                  handleReact(post.id, active);
                                } else {
                                  handleReact(post.id, 'LIKE');
                                }
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider select-none touch-none ${getUserActiveReaction(post.reactions)
                              ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30'
                              : 'text-gray-500 hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                          >
                            {getUserActiveReaction(post.reactions) === 'LIKE' && <span>👍 Thích</span>}
                            {getUserActiveReaction(post.reactions) === 'HEART' && <span>❤️ Yêu thích</span>}
                            {getUserActiveReaction(post.reactions) === 'HAHA' && <span>😆 Haha</span>}
                            {!getUserActiveReaction(post.reactions) && (
                              <>
                                <ThumbsUp className="w-4 h-4" />
                                <span>Thích</span>
                              </>
                            )}
                          </button>

                          {/* Reaction Picker Popover */}
                          {showReactionPicker[post.id] && (
                            <div
                              id={`reaction-picker-${post.id}`}
                              onMouseEnter={() => handleMouseEnter(post.id)}
                              onMouseLeave={() => handleMouseLeave(post.id)}
                              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-955 border border-gray-150 dark:border-gray-800 rounded-2xl p-2 shadow-2xl flex items-center gap-3 z-30 animate-slideUp"
                            >
                              <button
                                onClick={() => handleReact(post.id, 'LIKE')}
                                className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${activeReactionIndex[post.id] === 0 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
                                  }`}
                                title="Thích"
                              >
                                👍
                              </button>
                              <button
                                onClick={() => handleReact(post.id, 'HEART')}
                                className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${activeReactionIndex[post.id] === 1 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
                                  }`}
                                title="Yêu thích"
                              >
                                ❤️
                              </button>
                              <button
                                onClick={() => handleReact(post.id, 'HAHA')}
                                className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${activeReactionIndex[post.id] === 2 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
                                  }`}
                                title="Haha"
                              >
                                😆
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setExpandedPostComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${expandedPostComments[post.id]
                            ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30'
                            : 'text-gray-500 hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Bình luận ({post.comments?.length || 0})</span>
                        </button>
                      </div>

                      {/* Comments section */}
                      {expandedPostComments[post.id] && (
                        <div className="mt-4 space-y-4">
                          {/* Comment List */}
                          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {post.comments && post.comments.length > 0 ? (
                              post.comments.map((comment: any) => (
                                <div key={comment.id} className="bg-gray-50 dark:bg-gray-955 p-3 rounded-2xl flex items-start justify-between gap-3 group">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-gray-900 dark:text-white">{comment.user?.name}</span>
                                      {comment.user?.role === 'ADMIN' && (
                                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-955 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase">Admin</span>
                                      )}
                                      {comment.user?.role === 'LEADER' && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-955 text-blue-600 dark:text-blue-400 rounded text-[9px] font-black uppercase">Trưởng CLB</span>
                                      )}
                                      <span className="text-[9px] text-gray-400 font-medium">
                                        {new Date(comment.createdAt).toLocaleDateString('vi-VN')} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed break-words">{comment.content}</p>
                                  </div>

                                  {canModifyComment(post, comment) && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/30 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                      title="Xóa bình luận"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-medium py-2">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                            )}
                          </div>

                          {/* Comment Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Viết bình luận..."
                              value={commentInputs[post.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-xs font-medium dark:text-white"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl active:scale-95 transition-all shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-150 dark:border-gray-800 pt-4 mt-4 flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>Học viện HUTECH</span>
                      <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">Tin tức CLB</span>
                    </div>
                  </motion.article>
                ))
              )}
          </div>
      {/* Recruitment Form Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[32px] p-8 shadow-2xl overflow-hidden z-10 animate-fadeIn"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Đơn ứng tuyển câu lạc bộ</h3>
                  <p className="text-xs text-orange-600 dark:text-orange-505 font-bold mt-1">
                    Điền đầy đủ thông tin để ứng tuyển vào {club.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={appForm.fullName}
                    onChange={e => setAppForm({ ...appForm, fullName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mã số sinh viên *</label>
                    <input
                      type="text"
                      required
                      value={appForm.studentId}
                      onChange={e => setAppForm({ ...appForm, studentId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="e.g. 2011060000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lớp *</label>
                    <input
                      type="text"
                      required
                      value={appForm.className}
                      onChange={e => setAppForm({ ...appForm, className: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="e.g. 20DTHB1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={appForm.phone}
                    onChange={e => setAppForm({ ...appForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    placeholder="e.g. 0901234567"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={appForm.dateOfBirth}
                      onChange={e => setAppForm({ ...appForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Địa chỉ</label>
                    <input
                      type="text"
                      value={appForm.address}
                      onChange={e => setAppForm({ ...appForm, address: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl focus:outline-none focus:border-orange-600 text-sm font-semibold dark:text-white"
                      placeholder="Quận 9, TP.HCM"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 bg-gray-55 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-250 font-bold rounded-xl transition-all text-xs uppercase tracking-widest border border-gray-200 dark:border-gray-700"
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
      </div>
    </div>
  </div>
  );
}

function UserPlus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
