import { motion } from 'motion/react';
import { Heart, Sparkles, Zap, ArrowRight, Star, Compass, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { getClubRecommendations } from '../services/gemini';

export default function RecommendationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfileInfo, setNeedsProfileInfo] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      const userProfile = user as any;
      if (!userProfile.major || !userProfile.interests) {
        setNeedsProfileInfo(true);
        setIsLoading(false);
        return;
      }

      const cacheKey = `ai_recommendations_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setRecommendations(JSON.parse(cached));
        setIsLoading(false);
        return;
      }

      try {
        const { data: clubs } = await api.get('/clubs');
        const aiResult = await getClubRecommendations(userProfile, clubs.data || clubs);
        
        if (aiResult.recommendations && aiResult.recommendations.length > 0) {
          // Map images from clubs
          const recsWithImages = aiResult.recommendations.map((rec: any) => {
            const club = (clubs.data || clubs).find((c: any) => c.id === rec.clubId);
            return {
              id: rec.clubId,
              name: rec.clubName,
              match: rec.suitabilityScore + '%',
              reason: rec.matchReason,
              img: club?.coverUrl || club?.logoUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop'
            };
          });
          setRecommendations(recsWithImages);
          localStorage.setItem(cacheKey, JSON.stringify(recsWithImages));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  if (!user) {
    return (
      <div className="pt-32 text-center space-y-4 px-4">
        <h2 className="text-2xl font-bold">Vui lòng đăng nhập để xem gợi ý</h2>
      </div>
    );
  }
  return (
    <div className="pt-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">
        <div className="bg-gray-900 rounded-[48px] p-12 text-white relative overflow-hidden">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                 <Sparkles className="w-4 h-4" />
                 AI Recommendations
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight italic">
                Khám phá Câu lạc bộ <br /> dành riêng cho bạn.
              </h1>
              <p className="text-gray-400 text-lg font-medium max-w-xl">
                Thuật toán của chúng tôi phân tích hành động và sở thích của bạn để đề xuất cộng đồng phù hợp nhất.
              </p>
           </div>
           <div className="absolute -top-10 -right-10 w-80 h-80 bg-orange-600/20 rounded-full blur-[100px]"></div>
           <div className="absolute -bottom-10 left-1/4 w-60 h-60 bg-blue-600/10 rounded-full blur-[100px]"></div>
        </div>

        {needsProfileInfo ? (
          <div className="bg-white rounded-[40px] p-12 text-center border border-orange-100 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thiếu thông tin hồ sơ</h2>
            <p className="text-gray-500">Hệ thống AI cần biết thêm về chuyên ngành và sở thích của bạn để đưa ra những gợi ý chính xác nhất.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              Cập nhật hồ sơ ngay
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold">Hệ thống đang phân tích hồ sơ của bạn...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
             {recommendations.map((item, i) => (
               <motion.div 
                 key={i}
                 whileHover={{ y: -10 }}
                 className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm group"
               >
                  <div className="relative h-48">
                     <img src={item.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                     <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                        <div className="flex items-center gap-2">
                           <Zap className="w-3 h-3 text-orange-600" />
                           <span className="text-[10px] font-black text-gray-900">{item.match} Match</span>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 space-y-4">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 line-clamp-3">{item.reason}</div>
                     <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">{item.name}</h3>
                     <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <Link to={`/clubs/${item.id}`} className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 hover:text-orange-600 transition-all">
                          Xem chi tiết <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                     </div>
                  </div>
               </motion.div>
             ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold">
            Hệ thống đang phân tích để đưa ra đề xuất cho bạn. Xin vui lòng quay lại sau!
          </div>
        )}

        <div className="bg-orange-50 rounded-[40px] p-10 border border-orange-100 flex flex-col md:flex-row items-center gap-8">
           <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-orange-200/50">
              <Compass className="w-10 h-10 text-orange-600" />
           </div>
           <div className="flex-1 space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Vẫn chưa tìm thấy đam mê?</h2>
              <p className="text-sm text-gray-500 font-medium italic">Thử trải nghiệm công cụ tìm kiếm thông minh của chúng tôi để mở rộng chân trời mới.</p>
           </div>
           <button className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold border border-orange-200 hover:bg-orange-600 hover:text-white hover:border-transparent transition-all shadow-sm">
              Xem tất cả danh mục
           </button>
        </div>
      </div>
    </div>
  );
}
