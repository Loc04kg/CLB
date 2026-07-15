import { motion } from 'motion/react';
import { History, Award, Flag, Users, ArrowRight } from 'lucide-react';

const TIMELINE = [
  {
    year: '1995',
    title: 'Thành Lập Trường ĐH HUTECH',
    description: 'Đánh dấu sự ra đời của một trong những ngôi trường năng động nhất, nơi ươm mầm cho phong trào CLB sinh viên.',
    icon: <Flag className="w-6 h-6 text-white" />,
    color: 'bg-orange-600'
  },
  {
    year: '2005',
    title: 'Sự Hình Thành Các CLB Đầu Tiên',
    description: 'Những CLB nòng cốt như CLB Mùa Hè Xanh, CLB Tiếng Anh (H.E.C) chính thức đi vào hoạt động, tạo nền móng vững chắc.',
    icon: <Users className="w-6 h-6 text-white" />,
    color: 'bg-blue-600'
  },
  {
    year: '2015',
    title: 'Bùng Nổ Phong Trào Ngoại Khóa',
    description: 'Số lượng CLB vượt mốc 40 với đa dạng các lĩnh vực từ học thuật, văn hóa nghệ thuật đến thể thao.',
    icon: <Award className="w-6 h-6 text-white" />,
    color: 'bg-purple-600'
  },
  {
    year: '2025',
    title: 'Hệ Thống Quản Lý Thông Minh',
    description: 'Triển khai HUTECH CLB Platform tích hợp AI, đánh dấu bước chuyển mình số hóa toàn diện của hơn 60 CLB.',
    icon: <History className="w-6 h-6 text-white" />,
    color: 'bg-green-600'
  }
];

export default function TraditionPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/10 blur-[100px] -z-10 rounded-full" />
        <span className="inline-block px-4 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm rounded-full mb-4">
          Tự hào HUTECH
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-white">
          Truyền Thống & Lịch Sử
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
          Hành trình phát triển phong trào sinh viên và những giá trị cốt lõi làm nên bản sắc của Câu lạc bộ HUTECH.
        </p>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-gray-100 dark:bg-gray-800 transform md:-translate-x-1/2 rounded-full" />

        <div className="space-y-12">
          {TIMELINE.map((item, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative flex items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Year Badge Mobile */}
                <div className="absolute left-14 top-2 text-2xl font-black text-gray-200 dark:text-gray-800 md:hidden z-0">
                  {item.year}
                </div>

                {/* Timeline Node */}
                <div className={`absolute left-4 md:left-1/2 transform -translate-x-1/2 w-10 h-10 ${item.color} rounded-full flex items-center justify-center border-4 border-white dark:border-[#0a0a0a] shadow-xl z-10`}>
                  {item.icon}
                </div>

                {/* Content Card */}
                <div className={`w-full pl-16 md:pl-0 md:w-1/2 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                  <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 duration-500">
                       <span className="text-8xl font-black">{item.year.slice(-2)}</span>
                    </div>
                    
                    <span className="text-sm font-black text-orange-600 mb-2 block md:hidden">NĂM {item.year}</span>
                    <span className="hidden md:block text-2xl font-black text-gray-200 dark:text-gray-800 mb-2">{item.year}</span>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Core Values Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-32 p-8 md:p-12 bg-gray-900 dark:bg-white rounded-[3rem] text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white dark:text-gray-900 mb-4">Bạn Đã Sẵn Sàng Viết Tiếp Lịch Sử?</h2>
          <p className="text-gray-400 dark:text-gray-500 max-w-xl mx-auto mb-8">
            Gia nhập cộng đồng sinh viên HUTECH để cùng nhau tạo nên những dấu ấn mới trên hành trình đại học rực rỡ.
          </p>
          <button className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-bold transition-transform hover:scale-105 flex items-center gap-2 mx-auto">
            Khám phá CLB ngay
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
