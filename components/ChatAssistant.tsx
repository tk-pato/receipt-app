import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { consultAccountant } from '../services/geminiService';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'こんにちは！経理AIアシスタントです。仕訳のご相談などお気軽にどうぞ。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));

    try {
      const response = await consultAccountant(userMsg, history);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'すみません、エラーが発生しました。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center ${
          isOpen ? 'bg-slate-800 rotate-90' : 'bg-slate-900 backdrop-blur-md'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-8 h-8 text-white" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-400 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] md:w-96 h-[60vh] max-h-[600px] glass-modal rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 origin-bottom-right">
          <div className="bg-slate-900/90 backdrop-blur-xl p-5 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl border border-white/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">Concierge AI</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Digital Assistant</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/20 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm backdrop-blur-md
                  ${msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-br-none' 
                    : 'bg-white/80 text-slate-700 rounded-bl-none border border-white/50'}
                `}>
                  {msg.role === 'ai' && <Sparkles className="w-3 h-3 text-slate-400 mb-1 inline mr-1" />}
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/60 p-3 rounded-2xl rounded-bl-none border border-white/50 flex items-center gap-2 backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  <span className="text-[10px] text-slate-400 font-black uppercase">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white/60 border-t border-white/30 backdrop-blur-xl">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 bg-white/80 rounded-[1.5rem] p-1.5 pl-4 transition-all focus-within:ring-2 focus-within:ring-slate-200"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-slate-900 text-white rounded-full hover:bg-black disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;