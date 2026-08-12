import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Send, Sparkles, Paperclip, X, File as FileIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { chatWithTherapyGemini } from '../../services/geminiService';
import { addEvent } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

const SUGGESTIONS = [
  "What does my latest eGFR mean?",
  "Are there any side effects to my new meds?",
  "I have a headache, is it related to my condition?",
  "Can we review my health plan?",
];

const AVA_VAULT_KEY = 'hc_ava_vault';

const INITIAL_MSG = {
  role: 'model',
  content:
    "Hi there. I'm Ava, your Medical Chief of Staff. I have access to your complete health record, lab results, and active medications. How are you feeling today?",
};

function getSavedMessages() {
  try {
    const saved = localStorage.getItem(AVA_VAULT_KEY);
    return saved ? JSON.parse(saved) : [INITIAL_MSG];
  } catch {
    return [INITIAL_MSG];
  }
}

export default function TalkBuddy() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(getSavedMessages());
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(AVA_VAULT_KEY, JSON.stringify(messages));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        // Splice oldest 20% of messages if quota exceeded, keep initial message
        const keepCount = Math.floor(messages.length * 0.8);
        const newMsgs = [messages[0], ...messages.slice(messages.length - keepCount)];
        try {
          localStorage.setItem(AVA_VAULT_KEY, JSON.stringify(newMsgs));
        } catch (e2) {
          console.error('Storage full, unable to save chat:', e2);
        }
      }
    }
  }, [messages]);

  // Theme colors - Soothing Purple
  const theme = {
    primary: '#8B5CF6', // Violet 500
    light: '#F5F3FF', // Violet 50
    text: '#4C1D95', // Violet 900
    bg: '#F8FAFC', // Keep it neutral/clean slate
  };

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const chatMutation = useMutation({
    mutationFn: (newMessages: any[]) => chatWithTherapyGemini(newMessages),
    onMutate: () => setIsTyping(true),
    // We handle setIsTyping manually in onSuccess to transition from thinking to typing
    onSuccess: async (response: any, newMessages: any[]) => {
      setIsTyping(false); // Stop 'thinking' animation
      setIsStreaming(true);
      setMessages([...newMessages, { role: 'model', content: '' }]); // Initialize empty message for streaming
      
      let currentContent = '';
      for (let i = 0; i < response.length; i++) {
        if (!isMounted.current) break;
        currentContent += response[i];
        
        // Random typing speed between 10ms and 30ms for realism
        const delay = Math.floor(Math.random() * 20) + 10;
        await new Promise((r) => setTimeout(r, delay));
        
        if (!isMounted.current) break;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', content: currentContent };
          return updated;
        });
      }
      if (isMounted.current) setIsStreaming(false);

      addEvent('mental_health', 'health_buddy', 'Ava Health Buddy Session', {
        lastMessage: response,
        messageCount: newMessages.length + 1,
      });
    },
    onError: () => {
      setIsTyping(false);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, I am having trouble connecting right now.' },
      ]);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setAttachments(prev => [...prev, { name: file.name, data: base64Data }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || isTyping || isStreaming) return;

    let finalContent = text.trim();
    if (attachments.length > 0) {
      const attachStr = attachments.map(a => `[Attached Document: ${a.name}]`).join('\\n');
      finalContent = finalContent ? `${finalContent}\\n\\n${attachStr}` : attachStr;
    }

    const newMessages = [...messages, { role: 'user', content: finalContent, attachments: attachments.map(a => a.name) }];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);

    chatMutation.mutate(newMessages);
  };

  return (
    <div
      style={{
        padding: isMobile ? '0' : '0 24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      {/* Outer White Card Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: isMobile ? 'none' : '900px',
          background: '#F8F5FF',
          borderRadius: isMobile ? '0' : '32px',
          boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0,0,0,0.04)',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '16px 20px' : '20px 32px',
            background: '#F5F3FF',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              marginRight: '16px',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: theme.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
            }}
          >
            <Heart size={20} color={theme.primary} />
          </div>

          <div>
            <h1
              style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Ava Pro <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Plus</span>
            </h1>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: theme.primary,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              MEDICAL CHIEF OF STAFF
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '20px 8px' : '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  {msg.role === 'model' && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: theme.light,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    >
                      <Heart size={16} color={theme.primary} />
                    </div>
                  )}

                  <div
                    style={{
                      background: msg.role === 'user' ? theme.primary : '#FFFFFF',
                      color: msg.role === 'user' ? '#FFFFFF' : '#334155',
                      padding: isMobile ? '12px 16px' : '16px 20px',
                      borderRadius:
                        msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                      maxWidth: '85%',
                    }}
                  >
                    {msg.content || (
                       <span style={{ opacity: 0.5 }}>...</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '12px' }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: theme.light,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} color={theme.primary} />
                </div>
                <div
                  style={{
                    background: '#FFFFFF',
                    padding: isMobile ? '12px 16px' : '16px',
                    borderRadius: '20px 20px 20px 4px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                    }}
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.15 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                      opacity: 0.7,
                    }}
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                      opacity: 0.4,
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Suggestions - Only show after initial message if user hasn't typed yet */}
            {messages.length === 1 && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingLeft: '44px',
                  marginTop: '-8px',
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${theme.light}`,
                      color: theme.primary,
                      padding: '8px 12px',
                      borderRadius: '99px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = theme.light;
                      e.currentTarget.style.borderColor = theme.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = theme.light;
                    }}
                  >
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: isMobile ? '16px' : '24px 32px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '1px solid #E2E8F0',
            marginBottom: isMobile ? '12px' : '0',
          }}
        >
          {attachments.length > 0 && (
            <div style={{ width: '100%', maxWidth: '720px', display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {attachments.map((att, idx) => (
                <div key={idx} style={{
                  background: '#F1F5F9',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '13px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #E2E8F0'
                }}>
                  <FileIcon size={14} color="#64748b" />
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  <button aria-label="Remove attachment" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94A3B8', marginLeft: '4px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            style={{
              width: '100%',
              maxWidth: '720px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
            />
            <button
              aria-label="Add attachment"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                left: '12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'transparent',
                color: '#64748B',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share what's on your mind..."
              style={{
                width: '100%',
                padding: '18px 24px 18px 56px',
                borderRadius: '99px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                color: '#0F172A',
                paddingRight: '60px',
              }}
              onFocus={(e) => (e.target.style.borderColor = theme.primary)}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
            <button
              aria-label="Send message"
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isTyping || isStreaming}
              style={{
                position: 'absolute',
                right: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: theme.primary,
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (!input.trim() && attachments.length === 0) || isTyping || isStreaming ? 'not-allowed' : 'pointer',
                opacity: (!input.trim() && attachments.length === 0) || isTyping || isStreaming ? 0.5 : 1,
                transition: 'opacity 0.2s, transform 0.1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      </div>{' '}
      {/* Close Outer White Card Container */}
      {/* Close Outer White Card Container */}
      {/* Footer - Hide on mobile */}
      {!isMobile && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          <div
            style={{
              color: '#0F172A',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            © 2026 POWERED BY HEALTHCHAIN
          </div>
          <div>AI COMPANION • FOR SEVERE CRISES, PLEASE CONTACT A PROFESSIONAL HELPLINE</div>
        </div>
      )}
    </div>
  );
}
