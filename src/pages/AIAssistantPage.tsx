import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Plus, Info, MessageSquare, ShieldAlert, Building2, ChevronRight, Hash } from 'lucide-react';
import { generateAIResponse } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: Date;
  isFromAdmin?: boolean;
  isAI?: boolean;
}

export default function AIAssistantPage() {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      parts: [{ text: 'Chào bạn! Tôi là Trợ lý AI của HUTECH Student Clubs. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi về các CLB, cách tham gia hoặc gợi ý sự kiện nhé! Admin cũng có thể đọc tin nhắn này và phản hồi trực tiếp cho bạn.' }],
      timestamp: new Date(),
      isAI: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Custom Chat Modes
  const [chatMode, setChatMode] = useState<'START' | 'AI' | 'CLUB_SELECT' | 'CLUB_CHAT'>('START');
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCurrentChat = async () => {
    if (chatMode === 'START' || chatMode === 'CLUB_SELECT') return;

    const url = chatMode === 'CLUB_CHAT' && selectedClub ? `/chats?clubId=${selectedClub.id}` : '/chats?clubId=admin_ai';
    
    try {
      const res = await api.get(url);
      if (res.data) {
        const mapped = res.data.map((m: any) => ({
          id: m.id,
          role: (m.isFromAdmin || m.isAI || m.isFromClubManager) ? 'model' : 'user',
          parts: [{ text: m.message }],
          timestamp: new Date(m.createdAt),
          isFromAdmin: m.isFromAdmin,
          isAI: m.isAI
        }));
        
        if (chatMode === 'CLUB_CHAT') {
          setMessages([
            {
              id: 'club-welcome',
              role: 'model',
              parts: [{ text: `Bạn đã kết nối với Ban chủ nhiệm ${selectedClub?.name}. Hãy gửi tin nhắn hỗ trợ, Admin CLB sẽ nhận được thông báo và phản hồi bạn.` }],
              timestamp: new Date(),
              isAI: false
            },
            ...mapped
          ]);
        } else {
          setMessages([
            {
              id: '1',
              role: 'model',
              parts: [{ text: 'Chào bạn! Tôi là Trợ lý AI của HUTECH Student Clubs. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi về các CLB, cách tham gia hoặc gợi ý sự kiện nhé! Admin cũng có thể đọc tin nhắn này và phản hồi trực tiếp cho bạn.' }],
              timestamp: new Date(res.data[0]?.createdAt || Date.now()),
              isAI: true
            },
            ...mapped
          ]);
        }
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs');
      setClubs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    fetchCurrentChat();
    const interval = setInterval(fetchCurrentChat, 4000);
    return () => clearInterval(interval);
  }, [chatMode, selectedClub]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userTextInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // 1. Save student message to DB
      const payload: any = { message: userTextInput };
      if (chatMode === 'CLUB_CHAT' && selectedClub) {
        payload.clubId = selectedClub.id;
        payload.clubName = selectedClub.name;
      }
      const userMsgRes = await api.post('/chats', payload);
      const savedUserMsg = userMsgRes.data;

      const userMessage: Message = {
        id: savedUserMsg.id,
        role: 'user',
        parts: [{ text: userTextInput }],
        timestamp: new Date(savedUserMsg.createdAt),
      };
      
      setMessages(prev => [...prev, userMessage]);

      // If chatting with club, skip AI response
      if (chatMode === 'CLUB_CHAT') {
        setIsLoading(false);
        return;
      }

      // 2. Build history for Gemini
      const history = messages
        .filter(m => m.id !== '1' && m.id !== 'club-welcome') // skip system messages
        .map(m => ({
          role: m.role,
          parts: m.parts
        }));

      // 3. Generate AI response
      const aiResponse = await generateAIResponse(userTextInput, history, role || 'STUDENT', user, clubs);

      // 4. Save AI Response to database
      const aiMsgRes = await api.post('/chats', { message: aiResponse, isAI: true });
      const savedAiMsg = aiMsgRes.data;

      const modelMessage: Message = {
        id: savedAiMsg.id,
        role: 'model',
        parts: [{ text: aiResponse }],
        timestamp: new Date(savedAiMsg.createdAt),
        isAI: true
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-8 pb-20 bg-gray-50 min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 sm:px-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden relative group">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-sans tracking-tight">Hỗ Trợ Trực Tuyến & AI</h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">AI & Ban Quản Trị Online</span>
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-2 text-orange-700 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Chat sẽ được lưu lại</span>
          </div>
        </div>

        {/* Context Switcher Banner */}
        {chatMode !== 'START' && (
          <div className="bg-white rounded-3xl border border-orange-100 px-6 py-4 flex items-center justify-between text-sm font-bold mb-6 shadow-sm">
            <span className="text-orange-800 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {chatMode === 'AI' ? 'Đang trò chuyện với Trợ lý AI' : chatMode === 'CLUB_SELECT' ? 'Đang chọn CLB hỗ trợ' : `Đang kết nối với: ${selectedClub?.name}`}
            </span>
            <button onClick={() => {
              setChatMode('START');
              setSelectedClub(null);
              setSelectedCategory(null);
            }} className="text-orange-600 hover:text-orange-700 px-4 py-2 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
              Đổi phương thức hỗ trợ
            </button>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-gray-100 p-6 sm:p-8 overflow-y-auto mb-6 min-h-[400px] flex flex-col space-y-6 max-h-[60vh]">
          {chatMode === 'START' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center">
                <Bot className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Xin chào! Bạn cần hỗ trợ gì?</h3>
                <p className="text-sm text-gray-500 font-medium">Bạn có thể chọn nhận tư vấn tự động từ AI, hoặc gửi tin nhắn trực tiếp đến Ban chủ nhiệm một Câu lạc bộ cụ thể.</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button onClick={() => setChatMode('AI')} className="w-full flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-colors font-bold text-lg">
                  <span className="flex items-center gap-3"><Bot className="w-6 h-6"/> Chat với Trợ lý AI</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => setChatMode('CLUB_SELECT')} className="w-full flex items-center justify-between p-5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-2xl transition-colors font-bold text-lg">
                  <span className="flex items-center gap-3"><Building2 className="w-6 h-6"/> Liên hệ Câu lạc bộ</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {chatMode === 'CLUB_SELECT' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col space-y-6 pt-4 max-w-2xl mx-auto w-full">
              {!selectedCategory ? (
                <>
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Chọn lĩnh vực Câu lạc bộ</h3>
                    <p className="text-sm text-gray-500 font-medium">Lựa chọn lĩnh vực bạn đang quan tâm để tìm Câu lạc bộ hỗ trợ.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['Thể Thao', 'Nghệ Thuật', 'Xã Hội', 'Cộng Đồng'].map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className="p-8 bg-white border border-gray-100 rounded-[32px] hover:border-orange-400 hover:shadow-xl hover:shadow-orange-100 transition-all flex flex-col items-center gap-4 group cursor-pointer">
                        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          <Hash className="w-8 h-8" />
                        </div>
                        <span className="text-lg font-bold text-gray-900">{cat}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedCategory(null)} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">Quay lại</button>
                      <h3 className="text-xl font-black text-gray-900">CLB Lĩnh vực {selectedCategory}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clubs.filter(c => c.category === selectedCategory).map(club => (
                      <button key={club.id} onClick={() => {
                        setSelectedClub(club);
                        setChatMode('CLUB_CHAT');
                      }} className="p-6 bg-white border border-gray-100 rounded-[32px] flex items-center gap-4 hover:border-orange-500 hover:shadow-xl transition-all text-left group">
                        <div className="w-16 h-16 rounded-[20px] bg-orange-100 text-orange-600 flex items-center justify-center font-black text-2xl shrink-0 overflow-hidden">
                          {club.logoUrl ? <img src={club.logoUrl} className="w-full h-full object-cover" /> : club.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">{club.name}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1">{club.description}</p>
                        </div>
                      </button>
                    ))}
                    {clubs.filter(c => c.category === selectedCategory).length === 0 && (
                      <div className="col-span-full py-10 text-center bg-gray-50 rounded-[32px]">
                        <p className="text-gray-500 font-bold">Chưa có CLB nào trong lĩnh vực này.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {(chatMode === 'AI' || chatMode === 'CLUB_CHAT') && (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isAdmin = msg.isFromAdmin || (!isUser && chatMode === 'CLUB_CHAT' && msg.id !== 'club-welcome');
                const isAI = msg.isAI || (!isUser && !isAdmin);

              let senderIcon = <Bot className="w-4 h-4" />;
              let senderLabel = "Trợ lý AI";
              let bubbleStyle = "bg-blue-50 text-blue-900 border border-blue-100 rounded-bl-none";
              let iconBg = "bg-blue-100 text-blue-600";

              if (isUser) {
                senderIcon = <User className="w-4 h-4" />;
                senderLabel = "Bạn";
                bubbleStyle = "bg-orange-600 text-white rounded-br-none";
                iconBg = "bg-orange-100 text-orange-600";
              } else if (isAdmin) {
                senderIcon = <ShieldAlert className="w-4 h-4" />;
                senderLabel = "Ban Quản Trị";
                bubbleStyle = "bg-purple-600 text-white rounded-bl-none";
                iconBg = "bg-purple-100 text-purple-600";
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-3 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${iconBg}`} title={senderLabel}>
                      {senderIcon}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isUser ? 'text-right text-orange-500' : isAdmin ? 'text-purple-600' : 'text-blue-500'}`}>
                        {senderLabel}
                      </span>
                      <div className={`px-5 py-3.5 rounded-[24px] text-sm leading-relaxed shadow-sm ${bubbleStyle}`}>
                        {msg.parts[0].text}
                        <div className={`text-[10px] mt-1.5 opacity-60 ${isUser ? 'text-right text-orange-200' : isAdmin ? 'text-purple-200' : 'text-blue-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          )}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
               <div className="bg-gray-50 px-5 py-4 rounded-[24px] rounded-bl-none border border-gray-100 flex items-center space-x-2">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center space-x-2 text-gray-400">
            <Plus className="w-6 h-6 hover:text-orange-600 cursor-pointer transition-colors" />
            <MessageSquare className="w-5 h-5" />
          </div>
          <input
            type="text"
            disabled={isLoading || chatMode === 'CLUB_SELECT'}
            placeholder={chatMode === 'CLUB_CHAT' ? `Gửi yêu cầu hỗ trợ đến ${selectedClub?.name}...` : chatMode === 'AI' ? "Nhập câu hỏi cho Trợ lý AI tại đây..." : "Nhập câu hỏi cho Trợ lý AI tại đây..."}
            className="w-full bg-white border border-gray-100 rounded-[32px] pl-4 sm:pl-16 pr-16 py-5 shadow-xl shadow-gray-200/50 focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600 text-gray-900 text-sm transition-all font-medium"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (chatMode === 'START') setChatMode('AI');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || chatMode === 'CLUB_SELECT'}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${isLoading || !input.trim() || chatMode === 'CLUB_SELECT' ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Powered by Gemini & HUTECH Student Union</p>
      </div>
    </div>
  );
}
