import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Building2, 
  Image as ImageIcon, 
  Type, 
  FileText, 
  Layout, 
  Send, 
  ArrowLeft,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import api from '../lib/api';

export default function CreateClubPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Học thuật',
    logoUrl: ''
  });

  const categories = ['Học thuật', 'Thể thao', 'Nghệ thuật', 'Tình nguyện', 'Kỹ năng', 'Khác'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/clubs', formData);
      setSuccess(true);
      setTimeout(() => navigate('/clubs'), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-green-100 border border-green-50"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Đã gửi yêu cầu!</h1>
          <p className="text-gray-500 mb-8 font-medium">Yêu cầu thành lập câu lạc bộ <span className="text-gray-900 font-bold">"{formData.name}"</span> đã được gửi tới Ban quản trị. Vui lòng chờ phê duyệt.</p>
          <button 
            onClick={() => navigate('/clubs')}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all"
          >
            Quay lại trang danh sách
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black text-[10px] uppercase tracking-widest mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </button>

        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-900 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-3 text-orange-400">
                <Building2 className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Thành lập mới</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">Đăng ký Câu lạc bộ</h1>
              <p className="text-gray-400 font-medium max-w-md">Hãy chia sẻ ý tưởng của bạn và kết nối những sinh viên có cùng đam mê tại HUTECH.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tên CLB */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Type className="w-3 h-3" /> Tên câu lạc bộ
                </label>
                <input 
                  required
                  type="text"
                  placeholder="VD: CLB Tin học HUTECH"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-gray-900 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Danh mục */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Layout className="w-3 h-3" /> Danh mục
                </label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-gray-900 outline-none appearance-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Logo URL */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <ImageIcon className="w-3 h-3" /> URL Logo CLB (Nếu có)
              </label>
              <input 
                type="url"
                placeholder="https://example.com/logo.png"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-gray-900 outline-none"
                value={formData.logoUrl}
                onChange={e => setFormData({...formData, logoUrl: e.target.value})}
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <FileText className="w-3 h-3" /> Mô tả & Mục tiêu hoạt động
              </label>
              <textarea 
                required
                rows={5}
                placeholder="Mô tả ngắn gọn về CLB, sứ mệnh và các hoạt động dự kiến..."
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-gray-900 outline-none resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] hover:bg-orange-700 hover:shadow-2xl hover:shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Đang xử lý...' : 'Gửi yêu cầu thành lập'}
              </button>
              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">
                * Bằng việc gửi yêu cầu, bạn cam kết tuân thủ các quy định của nhà trường.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
