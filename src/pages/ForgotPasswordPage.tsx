import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Key, ArrowRight, ShieldAlert, CheckCircle, ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email Input, 2: Wait Approval, 3: Reset Passwords
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    if (step === 2) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/auth/check-reset-status?email=${encodeURIComponent(email)}`);
          if (res.data.status === 'APPROVED') {
            clearInterval(pollingRef.current);
            setStep(3);
          } else if (res.data.status === 'REJECTED') {
            clearInterval(pollingRef.current);
            setError('Yêu cầu đặt lại mật khẩu của bạn đã bị Admin từ chối.');
            setStep(1);
          }
        } catch (err) {
          console.error("Error checking reset status:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [step, email]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccess(res.data.message);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu nhập lại không khớp.');
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password-approved', {
        email,
        newPassword
      });
      alert(res.data.message || 'Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại.');
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
            <Key className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Đặt lại mật khẩu</h1>
          <p className="text-gray-500 font-medium">Lấy lại quyền truy cập vào tài khoản HUTECH của bạn.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-2xl shadow-gray-200 border border-gray-100 space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <form onSubmit={handleSendRequest} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                      <ShieldAlert className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email tài khoản</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                      <input 
                        required
                        type="email" 
                        placeholder="ten.sv@hutech.edu.vn"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-medium transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:bg-gray-400"
                  >
                    {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu khôi phục'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6 py-6"
              >
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-600 animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900">Đang chờ Admin duyệt</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Yêu cầu khôi phục mật khẩu cho email <span className="font-bold text-orange-600">{email}</span> đã được gửi. Vui lòng đợi Admin phê duyệt.
                  </p>
                </div>
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-left text-xs text-orange-800 space-y-1.5">
                  <div className="font-bold">⚠️ Hướng dẫn cho bạn:</div>
                  <div>• Hãy liên hệ với Admin hoặc duyệt trực tiếp trên bảng điều khiển Admin để tiếp tục.</div>
                  <div>• Trang này sẽ tự động chuyển sang biểu mẫu nhập mật khẩu mới ngay khi được phê duyệt.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Quay lại để sửa Email
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 text-xs font-bold mb-4">
                  <CheckCircle className="w-4 h-4" /> Yêu cầu đã được Admin phê duyệt!
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                      <ShieldAlert className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mật khẩu mới</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                      <input 
                        required
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-medium transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nhập lại mật khẩu mới</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                      <input 
                        required
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-sm font-medium transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 active:scale-95 disabled:bg-gray-400"
                  >
                    {isLoading ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-gray-500 font-medium mt-6">
            Quay lại trang <Link to="/login" className="text-orange-600 font-bold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
