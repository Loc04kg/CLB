import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, ChevronRight, Globe, Users, Zap, MapPin, Calendar, Clock, ArrowRight, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const CATEGORIES = [
  'Tất cả', 'Thể Thao', 'Nghệ Thuật', 'Xã Hội', 'Cộng Đồng'
];

export default function HomePage() {
  const [bgError, setBgError] = useState(false);
  const [bgSrc, setBgSrc] = useState(`/background.gif?v=${Date.now()}`);
  const navigate = useNavigate();

  // States for dynamic data
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clubsRes, eventsRes, postsRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/events'),
          api.get('/posts')
        ]);
        
        // Lấy tối đa 6 CLB mới nhất
        setClubs((clubsRes.data || []).slice(0, 6));
        
        // Lọc sự kiện sắp tới (chưa diễn ra) và lấy 4 sự kiện
        const upcomingEvents = (eventsRes.data || []).filter((e: any) => new Date(e.eventDate) > new Date());
        setEvents(upcomingEvents.slice(0, 4));

        // Lấy 3 bài viết mới nhất
        setPosts((postsRes.data || []).slice(0, 3));
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  return (
    <div className="bg-[#F8FAFC] dark:bg-black min-h-screen relative">

      {/* 1. HERO TRADITION SECTION (Image 1 Style) */}
      <section className="relative h-[80vh] min-h-[600px] flex flex-col justify-center overflow-hidden">
        {/* Background Image with Parallax-like effect */}
        <div className={`absolute inset-0 ${bgError ? 'bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-500' : 'bg-[#F8FAFC] dark:bg-black'}`}>
          {!bgError && (
            <>
              <img
                src={bgSrc}
                className="w-full h-full object-cover absolute inset-0"
                alt="Hero Background"
                onError={() => {
                  if (bgSrc.includes('.gif')) {
                    setBgSrc(`/background.jpg?v=${Date.now()}`);
                  } else if (bgSrc.includes('.jpg')) {
                    setBgSrc(`/background.png?v=${Date.now()}`);
                  } else {
                    setBgError(true);
                  }
                }}
              />
              {/* Lớp phủ tối cho toàn ảnh để dễ đọc chữ */}
              <div className="absolute inset-0 bg-black/40"></div>
              {/* Lớp làm mờ dần ở dưới cùng để nối liền với section Câu lạc bộ. Dịch xuống 2px để che khe hở sub-pixel của trình duyệt */}
              <div className="absolute -bottom-[2px] left-0 right-0 h-48 bg-gradient-to-t from-white dark:from-black to-transparent pointer-events-none"></div>
            </>
          )}
        </div>



        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 w-full pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-6xl sm:text-7xl md:text-[130px] font-black text-white leading-[0.85] drop-shadow-2xl select-none uppercase tracking-tighter">
              CLB <br />
              <span className="text-orange-600 drop-shadow-none">HUTECH</span>
            </h1>

            <div className="max-w-2xl space-y-6">
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed drop-shadow-lg">
                Hệ sinh thái đa dạng với hàng chục Câu lạc bộ, Đội, Nhóm. Nơi đánh thức đam mê, phát triển kỹ năng và kiến tạo những kỷ niệm khó quên thời sinh viên HUTECH.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <button className="w-full sm:w-auto px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all active:scale-95 flex justify-center items-center gap-3">
                  Khám phá ngay <ArrowRight className="w-5 h-5" />
                </button>
                <button className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all text-center">
                  Xem Video
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>



      {/* 2. CLUBS SECTION */}
      <section className="py-24 bg-white dark:bg-black relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Câu lạc bộ <span className="text-orange-600">Nổi bật</span></h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-xl">Khám phá các câu lạc bộ hoạt động năng nổ nhất và tìm kiếm đam mê của bạn.</p>
            </div>
            <Link to="/clubs" className="inline-flex items-center gap-2 font-bold text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors bg-orange-50 dark:bg-orange-950/30 px-6 py-3 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40">
              Xem tất cả <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
              <p className="font-bold">Đang tải danh sách CLB...</p>
            </div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 font-bold">Chưa có Câu lạc bộ nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {clubs.map((club, index) => (
                <motion.div
                  key={club.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => navigate(`/clubs/${club.id}`)}
                  className="bg-white dark:bg-gray-900 rounded-[40px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:shadow-orange-900/10 dark:hover:shadow-orange-900/20 transition-all group flex flex-col cursor-pointer"
                >
                  <div className="relative h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {club.logoUrl ? (
                      <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold">Chưa có Logo</div>
                    )}
                    <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-sm">{club.category || 'Cộng đồng'}</div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors mb-3 leading-tight">{club.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{club.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. EVENTS SECTION */}
      <section className="py-24 bg-gray-50 dark:bg-[#0a0a0a] relative border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Sự kiện <span className="text-purple-600 dark:text-purple-500">Sắp tới</span></h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-xl">Đừng bỏ lỡ các hoạt động hấp dẫn sắp diễn ra từ các Câu lạc bộ.</p>
            </div>
            <Link to="/events" className="inline-flex items-center gap-2 font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-950/30 px-6 py-3 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40">
              Tất cả sự kiện <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 font-bold">Chưa có Sự kiện nào sắp diễn ra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-gray-900 rounded-[40px] p-4 sm:p-6 flex flex-col sm:flex-row gap-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-purple-900/10 transition-shadow group"
                >
                  <div className="w-full sm:w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-[32px] overflow-hidden shrink-0 relative">
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">Không ảnh</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center flex-1 py-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest">{event.club?.name || 'Sự kiện'}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{event.title}</h3>
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span>{new Date(event.eventDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <MapPin className="w-4 h-4 text-purple-500" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. BLOGS/POSTS SECTION */}
      <section className="py-24 bg-white dark:bg-black relative border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Góc <span className="text-blue-600 dark:text-blue-500">Tin tức & Blog</span></h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-xl">Cập nhật những câu chuyện, bài viết và thông báo mới nhất từ các CLB.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 font-bold">Chưa có bài viết nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 dark:bg-[#0a0a0a] rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-100 dark:hover:border-blue-900/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                      {post.club?.logoUrl ? <img src={post.club.logoUrl} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">{post.club?.name || 'Hệ thống'}</div>
                      <div className="text-[10px] font-bold text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{post.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-6">
                    {post.content}
                  </p>
                  <button className="text-blue-600 dark:text-blue-500 font-bold text-sm hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-2">
                    Đọc tiếp <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>


    </div>
  );
}
