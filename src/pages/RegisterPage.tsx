import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowRight, UserPlus, Users, ShieldAlert, CheckCircle, Mail, Lock, User as UserIcon, GraduationCap, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

const ROLES = [
  { id: 'STUDENT', title: "Sinh Viên", desc: "Tham gia CLB & điểm danh", icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'LEADER', title: "Chủ Nhiệm", desc: "Quản lý CLB & sự kiện", icon: <Users className="w-5 h-5" /> },
];

export default function RegisterPage() {
  const { login, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Mật khẩu nhập lại không khớp.');
    }

    setIsLoading(true);
    try {
      const result = await signUpWithEmail(formData.email, formData.password, formData.name, formData.studentId, selectedRole);
      if ((result as any)?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200 border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Side: Branding/Utility */}
          <div className="md:w-5/12 bg-gray-900 p-10 md:p-14 text-white flex flex-col justify-between">
            <div className="space-y-8">
              <Link to="/" className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                <UserPlus className="w-6 h-6" />
              </Link>
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight leading-tight">Gia nhập đại gia đình HUTECH</h2>
                <p className="text-gray-400 text-sm font-medium">Bắt đầu hành trình khám phá và phát triển bản thân cùng hàng chục CLB sôi nổi.</p>
              </div>
            </div>

            <div className="space-y-6">

              <p className="text-xs text-gray-500 text-center">Đã có tài khoản? <Link to="/login" className="text-orange-500 font-bold hover:underline">Đăng nhập</Link></p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 p-10 md:p-14">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900">Chọn vai trò của bạn</h3>
                    <p className="text-sm text-gray-500">Vai trò này sẽ quyết định quyền hạn của bạn trong hệ thống.</p>
                  </div>

                  <div className="space-y-3">
                    {ROLES.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id as UserRole)}
                        className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center gap-4 group ${selectedRole === role.id ? 'border-orange-600 bg-orange-50/30' : 'border-gray-50 hover:border-gray-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedRole === role.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                          {role.icon}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900">{role.title}</div>
                          <div className="text-[10px] text-gray-500 font-medium">{role.desc}</div>
                        </div>
                        {selectedRole === role.id && <CheckCircle className="w-5 h-5 text-orange-600 ml-auto" />}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl active:scale-95 mt-8"
                  >
                    Tiếp theo <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <button onClick={() => setStep(1)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors mb-4">
                    <ChevronLeft className="w-4 h-4" /> Quay lại
                  </button>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900">Thông tin cá nhân</h3>
                    <p className="text-sm text-gray-500">Hoàn tất đăng ký cho <span className="font-bold text-orange-600">{ROLES.find(r => r.id === selectedRole)?.title}</span></p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                        <ShieldAlert className="w-4 h-4" /> {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Họ và tên</label>
                        <div className="relative group">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                          <input 
                            required
                            type="text" 
                            placeholder="Nguyễn Văn A"
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm font-medium transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mã số SV</label>
                        <div className="relative group">
                          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                          <input 
                            required
                            type="text" 
                            placeholder="218060..."
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm font-medium transition-all"
                            value={formData.studentId}
                            onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email HUTECH</label>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mật khẩu</label>
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

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nhập lại mật khẩu</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                        <input 
                          required
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="••••••••"
                          className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm font-medium transition-all"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
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
                      {isLoading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
