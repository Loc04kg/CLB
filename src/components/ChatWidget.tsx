import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, MessageSquare, ShieldAlert, X, LogIn } from 'lucide-react';
import { generateAIResponse } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Hash } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: Date;
  isFromAdmin?: boolean;
  isAI?: boolean;
}
export default function ChatWidget() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
    if (!user) return;
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
    if (isOpen && user) {
      fetchClubs();
      // Only set to AI mode if it's the first open and they haven't chosen anything yet?
      // Actually we start at 'START'. Let them choose.
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchCurrentChat();
      const interval = setInterval(fetchCurrentChat, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user, chatMode, selectedClub]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

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
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-[360px] sm:w-[400px] h-[550px] bg-white rounded-[32px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden mb-4 mr-0 select-none"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-5 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="w-5 h-5 animate-pulse text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Hỗ Trợ & Trợ Lý AI</h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></div>
                    <span className="text-[10px] text-white/90 font-medium">BQT & AI đang trực tuyến</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Context Switcher Banner */}
            {user && chatMode !== 'START' && (
              <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between text-[10px] font-bold">
                <span className="text-orange-800">
                  {chatMode === 'AI' ? 'Đang trò chuyện với Trợ lý AI' : chatMode === 'CLUB_SELECT' ? 'Chọn CLB hỗ trợ' : `Đang kết nối: ${selectedClub?.name}`}
                </span>
                <button onClick={() => {
                  setChatMode('START');
                  setSelectedClub(null);
                  setSelectedCategory(null);
                }} className="text-orange-600 hover:underline">Thay đổi</button>
              </div>
            )}

            {/* Chat Content Body */}
            <div className="flex-1 p-5 overflow-y-auto bg-gray-50 flex flex-col space-y-4 max-h-[400px]">
              {!user ? (
                /* Unauthenticated View */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shadow-inner">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-base mb-2">Đăng nhập để bắt đầu</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                      Bạn cần đăng nhập tài khoản HUTECH để có thể lưu cuộc trò chuyện và gửi câu hỏi trực tiếp đến Ban Quản Trị hoặc Trợ lý AI.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-orange-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Đăng nhập ngay
                  </Link>
                </div>
              ) : (
                /* Chat Messages List */
                <>
                  {chatMode === 'START' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col space-y-3 pt-4 px-2">
                       <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
                         <p className="text-sm text-gray-800 font-medium mb-4 leading-relaxed">Chào bạn! Bạn cần hỗ trợ từ Trợ lý AI tự động, hay muốn kết nối trực tiếp với Ban chủ nhiệm của một Câu lạc bộ cụ thể?</p>
                         <div className="space-y-2">
                           <button onClick={() => setChatMode('AI')} className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors font-bold text-sm">
                             <span className="flex items-center gap-2"><Bot className="w-4 h-4"/> Trò chuyện với Trợ lý AI</span>
                             <ChevronRight className="w-4 h-4" />
                           </button>
                           <button onClick={() => setChatMode('CLUB_SELECT')} className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl transition-colors font-bold text-sm">
                             <span className="flex items-center gap-2"><Building2 className="w-4 h-4"/> Liên hệ Ban chủ nhiệm CLB</span>
                             <ChevronRight className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                    </motion.div>
                  )}

                  {chatMode === 'CLUB_SELECT' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col space-y-4 pt-2">
                       {!selectedCategory ? (
                         <>
                           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mt-2">Chọn lĩnh vực CLB</p>
                           <div className="grid grid-cols-2 gap-2">
                             {['Thể Thao', 'Nghệ Thuật', 'Xã Hội', 'Cộng Đồng'].map(cat => (
                               <button key={cat} onClick={() => setSelectedCategory(cat)} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-300 hover:shadow-md transition-all flex flex-col items-center gap-2">
                                 <Hash className="w-5 h-5 text-orange-500" />
                                 <span className="text-xs font-bold text-gray-700">{cat}</span>
                               </button>
                             ))}
                           </div>
                         </>
                       ) : (
                         <>
                           <div className="flex items-center gap-2">
                             <button onClick={() => setSelectedCategory(null)} className="text-xs font-bold text-gray-400 hover:text-orange-600">Quay lại</button>
                             <span className="text-xs text-gray-300">|</span>
                             <span className="text-xs font-bold text-gray-600">{selectedCategory}</span>
                           </div>
                           <div className="space-y-2">
                             {clubs.filter(c => c.category === selectedCategory).map(club => (
                               <button key={club.id} onClick={() => {
                                 setSelectedClub(club);
                                 setChatMode('CLUB_CHAT');
                               }} className="w-full p-3 bg-white border border-gray-100 rounded-xl flex items-center gap-3 hover:border-orange-500 hover:shadow-sm transition-all text-left">
                                 <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                                   {club.logoUrl ? <img src={club.logoUrl} className="w-full h-full object-cover rounded-lg" /> : club.name.charAt(0)}
                                 </div>
                                 <span className="text-sm font-bold text-gray-800 line-clamp-1">{club.name}</span>
                               </button>
                             ))}
                             {clubs.filter(c => c.category === selectedCategory).length === 0 && (
                               <p className="text-center text-xs text-gray-400 py-4">Chưa có CLB nào trong lĩnh vực này.</p>
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

                      let senderIcon = <Bot className="w-3.5 h-3.5" />;
                      let senderLabel = "Trợ lý AI";
                      let bubbleStyle = "bg-blue-50 text-blue-900 border border-blue-100 rounded-bl-none";
                      let iconBg = "bg-blue-100 text-blue-600";

                      if (isUser) {
                        senderIcon = <User className="w-3.5 h-3.5" />;
                        senderLabel = "Bạn";
                        bubbleStyle = "bg-orange-600 text-white rounded-br-none";
                        iconBg = "bg-orange-100 text-orange-600";
                      } else if (isAdmin) {
                        senderIcon = <ShieldAlert className="w-3.5 h-3.5" />;
                        senderLabel = "Ban Quản Trị";
                        bubbleStyle = "bg-purple-650 text-white rounded-bl-none";
                        iconBg = "bg-purple-100 text-purple-600";
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-end space-x-2 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${iconBg}`} title={senderLabel}>
                              {senderIcon}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isUser ? 'text-right text-orange-500' : isAdmin ? 'text-purple-600' : 'text-blue-500'}`}>
                                {senderLabel}
                              </span>
                              <div className={`px-4 py-2.5 rounded-[20px] text-xs leading-relaxed shadow-sm ${bubbleStyle}`}>
                                {msg.parts[0].text}
                                <div className={`text-[9px] mt-1 opacity-60 ${isUser ? 'text-right text-orange-200' : isAdmin ? 'text-purple-200' : 'text-blue-400'}`}>
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
                      <div className="bg-gray-200/50 px-4 py-3 rounded-[20px] rounded-bl-none border border-gray-200 flex items-center space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Footer */}
            {user && (
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isLoading || chatMode === 'CLUB_SELECT'}
                    placeholder={chatMode === 'CLUB_CHAT' ? `Gửi tin nhắn đến ${selectedClub?.name}...` : chatMode === 'AI' ? "Nhập câu hỏi cho Trợ lý AI..." : "Nhập câu hỏi cho Trợ lý AI..."}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-gray-900 text-xs font-medium transition-all"
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
                    className={`absolute right-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isLoading || !input.trim() || chatMode === 'CLUB_SELECT' ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1, rotate: isOpen ? -90 : 12 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-500/40 hover:shadow-orange-600/50 cursor-pointer transition-all border border-orange-400/20 group"
      >
        <div className="absolute inset-0 rounded-full bg-orange-600 animate-ping opacity-25"></div>
        {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}

        {/* Tooltip (only when closed) */}
        {!isOpen && (
          <span className="absolute right-20 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-lg shadow-black/20 uppercase tracking-widest border border-gray-800">
            Hỗ Trợ & Trợ lý AI
          </span>
        )}
      </motion.button>
    </div>
  );
}
