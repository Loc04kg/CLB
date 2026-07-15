import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, 
  Filter, Calendar, DollarSign, ArrowUpRight, ArrowDownRight,
  Loader2, Trash2, FileText, PieChart as PieChartIcon, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function FinancePage({ isAdminView }: { isAdminView?: boolean }) {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'INCOME',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  useEffect(() => {
    if (selectedClubId) fetchFinanceData();
  }, [selectedClubId]);

  const fetchMyClubs = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const res = await api.get('/clubs/all?limit=100');
        const allClubs = res.data.data; // Because /clubs/all returns { data, meta }
        setMyClubs(allClubs);
        if (allClubs.length > 0) setSelectedClubId(allClubs[0].id);
      } else {
        const res = await api.get('/clubs/my-clubs');
        const managedClubs = res.data.filter((c: any) => c.memberRole === 'LEADER');
        setMyClubs(managedClubs);
        if (managedClubs.length > 0) setSelectedClubId(managedClubs[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceData = async () => {
    setLoadingFinance(true);
    try {
      const res = await api.get(`/finance/${selectedClubId}`);
      setFinanceData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.description) return alert('Vui lòng điền đầy đủ thông tin');
    setSubmitting(true);
    try {
      await api.post(`/finance/${selectedClubId}`, newTx);
      setShowAddModal(false);
      setNewTx({
        amount: '',
        type: 'INCOME',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchFinanceData();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    try {
      await api.delete(`/finance/${selectedClubId}/${id}`);
      fetchFinanceData();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="pt-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-600" /></div>;

  const chartData = financeData ? [
    { name: 'Thu', value: financeData.totalIncome, color: '#10b981' },
    { name: 'Chi', value: financeData.totalExpense, color: '#ef4444' }
  ] : [];

  return (
    <div className={isAdminView ? "pb-20 text-gray-900" : "pt-8 pb-20 bg-gray-50 min-h-screen text-gray-900"}>
      <div className={isAdminView ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Quản Lý Tài Chính</h1>
            <p className="text-gray-500 font-medium mt-1">Theo dõi dòng tiền và ngân quỹ hoạt động của câu lạc bộ.</p>
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
              className="bg-orange-600 text-white rounded-2xl px-6 py-4 font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <Plus className="w-5 h-5" /> Mới
            </button>
          </div>
        </div>

        {financeData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6"><Wallet className="w-7 h-7" /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số dư hiện tại</p>
                  <p className="text-3xl font-black text-gray-900">{financeData.balance.toLocaleString()}đ</p>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6"><TrendingUp className="w-7 h-7" /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng thu</p>
                  <p className="text-3xl font-black text-green-600">+{financeData.totalIncome.toLocaleString()}đ</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6"><TrendingDown className="w-7 h-7" /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng chi</p>
                  <p className="text-3xl font-black text-red-600">-{financeData.totalExpense.toLocaleString()}đ</p>
                </div>
              </motion.div>
            </div>

            {/* Distribution Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Phân bổ thu chi</h3>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-black text-gray-900">Lịch sử giao dịch</h3>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
              <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mô tả</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Số tiền</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingFinance ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" /></td></tr>
                ) : !financeData || financeData.transactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-gray-400 font-medium">Chưa có giao dịch nào phát sinh.</td></tr>
                ) : (
                  financeData.transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-gray-900">{new Date(tx.date).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase">{new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{tx.description}</div>
                            {tx.member && <div className="text-xs text-gray-500">Người thực hiện: {tx.member.name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`text-lg font-black ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString()}đ
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900">Ghi nhận giao dịch</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6"/></button>
              </div>

              <div className="space-y-6">
                <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                  <button onClick={() => setNewTx({...newTx, type: 'INCOME'})} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${newTx.type === 'INCOME' ? 'bg-white text-green-600 shadow-md' : 'text-gray-500'}`}>Thu vào</button>
                  <button onClick={() => setNewTx({...newTx, type: 'EXPENSE'})} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${newTx.type === 'EXPENSE' ? 'bg-white text-red-600 shadow-md' : 'text-gray-500'}`}>Chi ra</button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Số tiền (VNĐ)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="number"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 font-black text-2xl text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                      placeholder="0"
                      value={newTx.amount}
                      onChange={e => setNewTx({...newTx, amount: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Nội dung / Mô tả</label>
                  <textarea 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 resize-none"
                    rows={3}
                    placeholder="VD: Thu quỹ tháng 5, In banner sự kiện..."
                    value={newTx.description}
                    onChange={e => setNewTx({...newTx, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Ngày giao dịch</label>
                  <input 
                    type="date"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20"
                    value={newTx.date}
                    onChange={e => setNewTx({...newTx, date: e.target.value})}
                  />
                </div>

                <button 
                  onClick={handleAddTransaction}
                  disabled={submitting}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-100 disabled:bg-gray-300"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'XÁC NHẬN GIAO DỊCH'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


