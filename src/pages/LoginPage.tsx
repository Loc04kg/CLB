import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, ArrowRight, ShieldAlert, 
  Lock, Mail, ChevronRight, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithEmail(formData.email, formData.password);
      if ((result as any)?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Email hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/5 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[160px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-orange-600 rounded-[28px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-orange-200 mb-6"
          >
            <ShieldCheck className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Mừng bạn quay lại</h1>
          <p className="text-gray-500 font-medium">Đăng nhập để tiếp tục khám phá cộng đồng HUTECH.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-2xl shadow-gray-200 border border-gray-100 space-y-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                <ShieldAlert className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  required
                  type="email" 
                  placeholder="ten.sv@hutech.edu.vn"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm font-medium transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs font-bold text-orange-600 hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm font-medium transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:bg-gray-400"
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>


          <p className="text-center text-sm text-gray-500 font-medium">
            Chưa có tài khoản? <Link to="/register" className="text-orange-600 font-bold hover:underline">Đăng ký thành viên</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

