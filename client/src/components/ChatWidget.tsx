import { useState, useRef, useEffect } from 'react';
import api from '../lib/axios';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface ChatWidgetProps {
  analysisId?: string;
}

export default function ChatWidget({ analysisId }: ChatWidgetProps) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    { role: 'ai', text: 'Merhaba! Web erişilebilirliği hakkında sorularınızı yanıtlamaya hazırım. 🤖' },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/api/ai/chat', {
        message: text,
        ...(analysisId ? { analysisId } : {}),
      });
      setMessages((prev) => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat panel */}
      {open && (
        <div className="w-[320px] h-[440px] bg-[#0d0d18] border border-[#1e1e2e] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(0,212,255,0.08), 0 20px 60px rgba(0,0,0,0.6)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] bg-[#12121a]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00d4ff]/20 border border-[#00d4ff]/30 flex items-center justify-center text-sm">
                🤖
              </div>
              <div>
                <div className="text-white text-xs font-semibold">AccessiScan AI</div>
                {analysisId && (
                  <div className="text-[#00d4ff] text-[10px]">Analiz bağlamı aktif</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#00d4ff] text-[#0a0a0f] font-medium rounded-br-sm'
                      : 'bg-[#1e1e2e] text-gray-300 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1e1e2e] text-gray-400 text-xs px-3 py-2 rounded-xl rounded-bl-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#1e1e2e] bg-[#12121a]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Bir şey sorun..."
                className="flex-1 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#00d4ff]/40 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-[#00d4ff] text-[#0a0a0f] flex items-center justify-center hover:bg-[#00bce0] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12 7H2M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-2xl bg-[#00d4ff] text-[#0a0a0f] flex items-center justify-center shadow-lg hover:bg-[#00bce0] transition-all active:scale-95"
        style={{ boxShadow: '0 0 24px rgba(0,212,255,0.4)' }}
        aria-label="AI Asistan"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.04 2 11c0 2.39.94 4.56 2.46 6.17L3 21l4.17-1.29A10.02 10.02 0 0012 20c5.52 0 10-4.04 10-9S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M8 11h.01M12 11h.01M16 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </div>
  );
}
