import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Users, Star, Award, PlayCircle, Clock, ChevronRight } from 'lucide-react';

const COURSES = [
  {
    id: 1,
    title: 'Kỹ Năng Lãnh Đạo Kỷ Nguyên Số',
    instructor: 'Th.S Võ Hoàng Khang',
    duration: '4 Tuần',
    students: 128,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    category: 'Lãnh đạo',
    progress: 0,
  },
  {
    id: 2,
    title: 'Nghệ Thuật Đàm Phán & Thuyết Phục',
    instructor: 'TS. Nguyễn Văn A',
    duration: '3 Tuần',
    students: 256,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    category: 'Kỹ năng mềm',
    progress: 45,
  },
  {
    id: 3,
    title: 'Tư Duy Hệ Thống Cho Quản Lý CLB',
    instructor: 'Th.S Trần Thị B',
    duration: '5 Tuần',
    students: 89,
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800',
    category: 'Quản lý',
    progress: 100,
  }
];

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'completed'>('all');

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent blur-3xl -z-10 rounded-full" />
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-white flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-orange-600" />
          Học Viện Elite
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-lg">
          Nền tảng đào tạo kỹ năng chuyên sâu dành cho Ban Chủ nhiệm và thành viên nòng cốt của các Câu lạc bộ tại HUTECH.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Khóa học đề xuất' },
          { id: 'ongoing', label: 'Đang học (1)' },
          { id: 'completed', label: 'Đã hoàn thành (1)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-[#111] rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 group hover:border-orange-500/50 transition-colors"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={course.image} 
                alt={course.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-900 dark:text-white">
                  {course.category}
                </span>
              </div>
              <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white line-clamp-2">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{course.students}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
              </div>

              {/* Progress or Start Action */}
              {course.progress > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-orange-600">Tiến độ</span>
                    <span className="text-gray-900 dark:text-white">{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${course.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full ${course.progress === 100 ? 'bg-green-500' : 'bg-orange-600'}`}
                    />
                  </div>
                  {course.progress === 100 && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm font-bold text-green-600 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl">
                      <Award className="w-4 h-4" />
                      Đã nhận chứng chỉ
                    </div>
                  )}
                </div>
              ) : (
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-colors group/btn">
                  <span className="font-bold text-sm text-gray-900 dark:text-white group-hover/btn:text-orange-600 transition-colors">Bắt đầu học ngay</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-orange-600 transition-colors group-hover/btn:translate-x-1" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
