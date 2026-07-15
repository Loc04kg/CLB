import { Link } from 'react-router-dom';
import { Facebook, Youtube, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">H</div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-white block leading-none">HUTECH</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">Student Clubs</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Hệ thống quản lý CLB chính thức của Trường Đại học Công nghệ TP.HCM. Nơi kết nối đam mê và phát triển kỹ năng sinh viên.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 border-l-4 border-orange-600 pl-3 uppercase tracking-wider">Khám phá</h4>
            <ul className="space-y-3">
              <li><Link to="/clubs" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Danh sách Câu lạc bộ</Link></li>
              <li><Link to="/events" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Sự kiện sắp diễn ra</Link></li>
              <li><Link to="/ai-assistant" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Hỏi đáp AI Trợ lý</Link></li>
              <li><Link to="/attendance" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Điểm danh FaceID</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 border-l-4 border-orange-600 pl-3 uppercase tracking-wider">Thông tin</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <span className="text-gray-400 text-sm">475A Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="text-gray-400 text-sm">hutech@hutech.edu.vn</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="text-gray-400 text-sm">(028) 5445 7777</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 border-l-4 border-orange-600 pl-3 uppercase tracking-wider">Đăng ký mới</h4>
            <p className="text-gray-400 text-sm mb-4">Bạn muốn thành lập CLB mới? Đừng ngần ngại liên hệ Đoàn trường.</p>
            <Link to="/login" className="inline-block bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg active:scale-95">
              Tạo CLB ngay
            </Link>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          <p>© {new Date().getFullYear()} HUTECH Student Clubs. All rights reserved. Designed for Hutech Students.</p>
        </div>
      </div>
    </footer>
  );
}
