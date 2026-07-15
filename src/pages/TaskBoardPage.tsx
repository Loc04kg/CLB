import { useState, useEffect } from 'react';
import { 
  Trello, Plus, Calendar, User as UserIcon, CheckCircle2, 
  Clock, MoreHorizontal, Loader2, X, AlertCircle, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export default function TaskBoardPage() {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // New task modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    deadline: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  useEffect(() => {
    if (selectedClubId) {
      fetchTasks();
      fetchMembers();
    }
  }, [selectedClubId]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      const managedClubs = res.data.filter((c: any) => 
        user?.role === 'ADMIN' || c.memberRole === 'LEADER'
      );
      setMyClubs(managedClubs);
      if (managedClubs.length > 0) setSelectedClubId(managedClubs[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get(`/tasks/${selectedClubId}`);
      setTasks(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/management/${selectedClubId}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title) return alert('Vui lòng nhập tiêu đề công việc');
    setSubmitting(true);
    try {
      await api.post(`/tasks/${selectedClubId}`, newTask);
      setShowAddModal(false);
      setNewTask({ title: '', description: '', assigneeId: '', deadline: '' });
      fetchTasks();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.put(`/tasks/${selectedClubId}/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Xóa công việc này?')) return;
    try {
      await api.delete(`/tasks/${selectedClubId}/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="pt-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-600" /></div>;

  const columns: { title: string; status: TaskStatus; color: string; icon: any }[] = [
    { title: 'Cần làm', status: 'TODO', color: 'bg-gray-100 text-gray-600', icon: Clock },
    { title: 'Đang làm', status: 'IN_PROGRESS', color: 'bg-blue-50 text-blue-600', icon: AlertCircle },
    { title: 'Hoàn thành', status: 'DONE', color: 'bg-green-50 text-green-600', icon: CheckCircle2 }
  ];

  return (
    <div className="pt-8 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Quản Lý Công Việc</h1>
            <p className="text-gray-500 font-medium mt-1">Phân công và theo dõi tiến độ thực hiện các nhiệm vụ của CLB.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <select 
              className="flex-1 md:flex-none bg-white border-none rounded-2xl px-6 py-4 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-600/20"
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
            >
              {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gray-900 text-white rounded-2xl px-6 py-4 font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl active:scale-95"
            >
              <Plus className="w-5 h-5" /> Giao việc
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {columns.map((column) => (
            <div key={column.status} className="flex flex-col gap-6">
              <div className={`flex items-center justify-between p-6 rounded-3xl ${column.color} shadow-sm border border-current border-opacity-10`}>
                <div className="flex items-center gap-3">
                  <column.icon className="w-5 h-5" />
                  <h3 className="font-black text-sm uppercase tracking-widest">{column.title}</h3>
                </div>
                <span className="px-3 py-1 bg-white bg-opacity-50 rounded-lg text-[10px] font-black">
                  {tasks.filter(t => t.status === column.status).length}
                </span>
              </div>

              <div className="flex flex-col gap-4 min-h-[500px]">
                <AnimatePresence>
                  {tasks.filter(t => t.status === column.status).map((task) => (
                    <motion.div 
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">{task.title}</h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-300 hover:text-red-600 rounded-xl hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-500 mb-6 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          {task.assignee ? (
                            <div className="flex items-center gap-2" title={`Đã giao cho: ${task.assignee.name}`}>
                              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 overflow-hidden font-bold text-xs">
                                {task.assignee.faceImage ? <img src={task.assignee.faceImage} className="w-full h-full object-cover" /> : task.assignee.name.charAt(0)}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200">
                              <UserIcon className="w-4 h-4" />
                            </div>
                          )}
                          {task.deadline && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.deadline).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                           {column.status !== 'TODO' && (
                             <button onClick={() => handleUpdateStatus(task.id, column.status === 'DONE' ? 'IN_PROGRESS' : 'TODO')} className="p-2 text-gray-400 hover:text-gray-900 rounded-xl bg-gray-50 transition-all">←</button>
                           )}
                           {column.status !== 'DONE' && (
                             <button onClick={() => handleUpdateStatus(task.id, column.status === 'TODO' ? 'IN_PROGRESS' : 'DONE')} className="p-2 text-gray-400 hover:text-gray-900 rounded-xl bg-gray-50 transition-all">→</button>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {tasks.filter(t => t.status === column.status).length === 0 && !loadingTasks && (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[40px] p-10 text-gray-300">
                    <Trello className="w-10 h-10 mb-4 opacity-20" />
                    <p className="text-sm font-bold opacity-40">Trống</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Giao việc mới</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6"/></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Tên công việc / Task Title</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                    placeholder="VD: Thiết kế Poster sự kiện..."
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mô tả chi tiết</label>
                  <textarea 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 resize-none"
                    rows={4}
                    placeholder="Các yêu cầu cụ thể cho công việc này..."
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Người thực hiện</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                      value={newTask.assigneeId}
                      onChange={e => setNewTask({...newTask, assigneeId: e.target.value})}
                    >
                      <option value="">Chưa gán</option>
                      {members.map((m: any) => (
                        <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Hạn chót / Deadline</label>
                    <input 
                      type="date"
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                      value={newTask.deadline}
                      onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCreateTask}
                  disabled={submitting}
                  className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 disabled:bg-gray-300"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'GIAO VIỆC NGAY'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


