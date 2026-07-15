import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Trash2, Edit, Calendar, 
  Building2, X, Loader2, AlertCircle, FileText,
  MessageSquare, Send, ThumbsUp, Pin
} from 'lucide-react';

export default function BlogPage() {
  const { user, role } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Comments states
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Reactions states
  const [showReactionPicker, setShowReactionPicker] = useState<Record<string, boolean>>({});
  const [activeReactionIndex, setActiveReactionIndex] = useState<Record<string, number>>({});

  // Touch / Mobile gesture refs
  const touchTimeout = useRef<any>(null);
  const isLongPress = useRef<boolean>(false);
  const pickerTimeouts = useRef<Record<string, any>>({});
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    clubId: '',
    title: '',
    content: ''
  });

  const isAuthorizedToPost = role === 'ADMIN' || role === 'LEADER';

  useEffect(() => {
    fetchPosts();
    if (isAuthorizedToPost) {
      fetchMyOrAllClubs();
    }
  }, [role]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (error) {
      console.error("Fetch posts error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrAllClubs = async () => {
    try {
      if (role === 'ADMIN') {
        const res = await api.get('/clubs/all');
        setMyClubs(res.data.filter((c: any) => c.status === 'APPROVED'));
      } else if (role === 'LEADER') {
        const res = await api.get('/clubs/my-clubs');
        setMyClubs(res.data.filter((c: any) => c.status === 'APPROVED'));
      }
    } catch (error) {
      console.error("Fetch clubs error:", error);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      clubId: myClubs[0]?.id || '',
      title: '',
      content: ''
    });
    setShowAddModal(true);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clubId || !formData.title.trim() || !formData.content.trim()) {
      return alert('Vui lòng điền đầy đủ các trường thông tin.');
    }
    setSubmitting(true);
    try {
      await api.post('/posts', formData);
      alert('Đăng tin thành công!');
      setShowAddModal(false);
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi đăng tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (post: any) => {
    setSelectedPost(post);
    setFormData({
      clubId: post.clubId,
      title: post.title,
      content: post.content
    });
    setShowEditModal(true);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      return alert('Tiêu đề và nội dung bài viết không được để trống.');
    }
    setSubmitting(true);
    try {
      await api.put(`/posts/${selectedPost.id}`, {
        title: formData.title,
        content: formData.content
      });
      alert('Cập nhật bài viết thành công!');
      setShowEditModal(false);
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    try {
      await api.delete(`/posts/${id}`);
      alert('Xóa bài viết thành công.');
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa bài viết.');
    }
  };

  const handleTogglePin = async (postId: string) => {
    try {
      await api.put(`/posts/${postId}/pin`);
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thay đổi trạng thái ghim.');
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      await api.post(`/posts/${postId}/comments`, { content });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thêm bình luận.');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      fetchPosts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa bình luận.');
    }
  };

  const handleReact = async (postId: string, type: 'LIKE' | 'HEART' | 'HAHA') => {
    try {
      await api.post(`/posts/${postId}/react`, { type });
      setShowReactionPicker(prev => ({ ...prev, [postId]: false }));
      fetchPosts();
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
    }, 450); // 450ms delay to let the user move their mouse up
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

  // Safe checks to avoid null matches and check permissions
  const canModifyPost = (post: any) => {
    if (role === 'ADMIN') return true;
    if (role === 'LEADER') {
      return myClubs.some((c: any) => c.id === post.clubId);
    }
    return false;
  };

  const canModifyComment = (post: any, comment: any) => {
    if (role === 'ADMIN') return true;
    if (user?.id === comment.userId) return true;
    if (role === 'LEADER') {
      return myClubs.some((c: any) => c.id === post.clubId);
    }
    return false;
  };

  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    const titleMatch = post.title ? post.title.toLowerCase().includes(query) : false;
    const contentMatch = post.content ? post.content.toLowerCase().includes(query) : false;
    const clubMatch = post.club?.name ? post.club.name.toLowerCase().includes(query) : false;
    return titleMatch || contentMatch || clubMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Blog Sự Kiện</h1>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tin tức, hoạt động và sự kiện mới nhất từ các câu lạc bộ HUTECH.</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm tin tức, CLB..." 
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/10 text-sm font-medium transition-all dark:text-white"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {isAuthorizedToPost && myClubs.length > 0 && (
              <button 
                onClick={handleOpenAddModal}
                className="px-5 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-200"
              >
                <Plus className="w-4 h-4" />
                <span>Đăng tin</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500">Đang tải tin tức...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[40px] p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-[30px] flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Chưa có tin tức nào</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
              {searchQuery 
                ? "Không tìm thấy bài viết nào khớp với từ khóa tìm kiếm của bạn." 
                : "Hệ thống chưa ghi nhận bài đăng tin tức hoặc sự kiện nào. Hãy quay lại sau!"}
            </p>
            {isAuthorizedToPost && myClubs.length > 0 && !searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="px-6 py-3.5 bg-gray-900 dark:bg-gray-800 hover:bg-orange-600 dark:hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Trở thành người đăng tin đầu tiên
              </button>
            )}
          </div>
        ) : (
          /* Post Feed Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredPosts.map(post => (
              <motion.article 
                layout
                key={post.id} 
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 shadow-sm hover:shadow-xl hover:shadow-gray-100/50 dark:hover:shadow-gray-900/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Post Meta */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl flex items-center justify-center overflow-hidden">
                        {post.club?.logoUrl ? (
                          <img src={post.club.logoUrl} className="w-full h-full object-cover" alt="Club Logo" />
                        ) : (
                          <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                          <span>{post.club?.name}</span>
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

                    {canModifyPost(post) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePin(post.id)}
                          className={`p-2 rounded-xl transition-all border shrink-0 ${
                            post.isPinned
                              ? 'bg-orange-600/10 text-orange-600 border-orange-600/20 hover:bg-orange-600/20'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-250 border-transparent hover:border-gray-700'
                          }`}
                          title={post.isPinned ? "Bỏ ghim" : "Ghim bài viết"}
                        >
                          <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(post)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                          title="Sửa bài viết"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Body */}
                  <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 leading-snug">{post.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mb-4 font-medium">
                    {post.content}
                  </p>

                  {/* Reactions Stats */}
                  {post.reactions && post.reactions.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 text-xs text-gray-500 font-medium bg-gray-50 dark:bg-gray-950 px-4 py-2 rounded-2xl w-fit">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider select-none touch-none ${
                          getUserActiveReaction(post.reactions)
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
                          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-2 shadow-2xl flex items-center gap-3 z-30 animate-slideUp"
                        >
                          <button
                            onClick={() => handleReact(post.id, 'LIKE')}
                            className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${
                              activeReactionIndex[post.id] === 0 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
                            }`}
                            title="Thích"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleReact(post.id, 'HEART')}
                            className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${
                              activeReactionIndex[post.id] === 1 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
                            }`}
                            title="Yêu thích"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleReact(post.id, 'HAHA')}
                            className={`hover:scale-130 transition-all text-lg px-2 py-1 rounded-xl ${
                              activeReactionIndex[post.id] === 2 ? 'bg-orange-50 dark:bg-orange-950 scale-125' : ''
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${
                        expandedPostComments[post.id]
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
                            <div key={comment.id} className="bg-gray-50 dark:bg-gray-950 p-3 rounded-2xl flex items-start justify-between gap-3 group">
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
                  <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">Tin tức sự kiện</span>
                </div>
              </motion.article>
            ))}
          </div>
        )}

      </div>

      {/* CREATE POST MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Đăng tin tức mới</h3>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 block">Đăng với tư cách CLB</label>
                  <select 
                    value={formData.clubId}
                    onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 text-sm font-bold text-gray-900 dark:text-white"
                  >
                    {myClubs.map((club: any) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 block">Tiêu đề bài viết</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Thông báo lịch sinh hoạt câu lạc bộ tuần này..."
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 text-sm font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 block">Nội dung tin tức</label>
                  <textarea 
                    required
                    rows={6}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Nhập nội dung bài viết chi tiết..."
                    className="w-full p-4 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 text-sm font-medium text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-100/50 mt-4 disabled:bg-gray-300"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'XÁC NHẬN ĐĂNG BÀI'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT POST MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowEditModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                  <Edit className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Sửa bài viết</h3>
              </div>

              <form onSubmit={handleUpdatePost} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 block">Tiêu đề bài viết</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 text-sm font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 block">Nội dung tin tức</label>
                  <textarea 
                    required
                    rows={6}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-[#0a0a0a] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 text-sm font-medium text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-100/50 mt-4 disabled:bg-gray-300"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'LƯU THAY ĐỔI'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
