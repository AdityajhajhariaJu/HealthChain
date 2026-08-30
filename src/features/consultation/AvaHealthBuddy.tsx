import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Send, Sparkles, Paperclip, X, File as FileIcon, Activity, Play } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { chatWithTherapyGemini, analyzeLabReport, extractClinicalMemory } from '../../services/geminiService';
import { addEvent } from '../../services/ProfileEngine';
import { recordHealthMemory } from '../../services/HealthMemory';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import { useToast } from '../../components/ui/ToastProvider';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';

const SUGGESTIONS = [
  "I'm looking for mental peace and a calm space to de-stress.",
  "Are there any side effects to my new meds?",
  "I have a headache, is it related to my condition?",
  "Can we review my health plan?",
];

const CASE_RECHECK_SUGGESTIONS = [
  "Re-evaluate: What other alternative conditions could explain this?",
  "Could any of my active medications be causing or worsening this?",
  "Help me prepare the most important questions for my doctor.",
  "What specific blood tests or imaging would confirm or rule this out?",
  "Can you explain the underlying biological mechanism in simple terms?"
];

import { getProfileEngineState, getProfileKey, getProfile, updateProfileFeatureData } from '../../services/ProfileEngine';
import { GlassBoxExplanation } from '../../components/ui/GlassBoxExplanation';

const getAvaVaultKey = () => {
  const state = getProfileEngineState();
  return getProfileKey().replace('hc_unified_profile', 'hc_ava_vault') + '_' + (state?.activeId || 'profile_1');
};

const INITIAL_MSG = {
  role: 'model',
  content:
    "Hi there. I'm Ava, your Medical Chief of Staff. I have access to your complete health record, lab results, and active medications. How are you feeling today?",
};

function getSavedMessages() {
  const profile = getProfile();
  if (profile && profile.avaData) return profile.avaData;
  try {
    const saved = localStorage.getItem(getAvaVaultKey());
    return saved ? JSON.parse(saved) : [INITIAL_MSG];
  } catch {
    return [INITIAL_MSG];
  }
}

const TypewriterText = ({ content, onComplete, messagesEndRef }: any) => {
  const [displayed, setDisplayed] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let current = '';
    const type = async () => {
      const chunkSize = 3;
      for (let i = 0; i < content.length; i += chunkSize) {
        if (!isMounted.current) break;
        current += content.substring(i, i + chunkSize);
        setDisplayed(current);
        
        // Auto-scroll logic if user is at the bottom
        if (messagesEndRef?.current) {
          const container = messagesEndRef.current.parentElement?.parentElement;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {
              requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
              });
            }
          }
        }
        await new Promise(r => setTimeout(r, 10));
      }
      if (isMounted.current) {
        setDisplayed(content);
        onComplete();
      }
    };
    type();
    return () => { isMounted.current = false; };
  }, [content, messagesEndRef]);

  return <span>{displayed}</span>;
};

const MessageRenderer = ({ content }: { content: string }) => {
  if (content.includes('[WIDGET:WORKOUT]')) {
    const parts = content.split('[WIDGET:WORKOUT]');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {parts[0] && <span>{parts[0]}</span>}
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: '16px', padding: '16px', color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
            <Activity size={18} />
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>GENERATED WORKOUT</span>
          </div>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>30-Min Mobility Flow</h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8' }}>Perfect for your back pain recovery.</p>
          <button onClick={() => triggerHapticLight()} style={{ marginTop: '8px', background: '#10B981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            <Play size={16} /> Start Routine
          </button>
        </div>
        {parts[1] && <span>{parts[1]}</span>}
      </div>
    );
  }
  return <span>{content}</span>;
};

export default function AvaHealthBuddy() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const navigate = useNavigate();
  const sessionId = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.background = 'url(/ava-floral-bg.jpg) center/cover no-repeat';
        main.style.overflow = 'hidden';
      
    }
    return () => {
      if (main) {
        main.style.background = '';
          main.style.overflow = '';
        
      }
    };
  }, []);
  const [messages, setMessages] = useState(getSavedMessages());
  const [input, setInput] = useState(() => { try { return sessionStorage.getItem('hc_ava_draft') || ''; } catch { return ''; } });
  useEffect(() => { try { if (input.trim()) sessionStorage.setItem('hc_ava_draft', input); else sessionStorage.removeItem('hc_ava_draft'); } catch(e){} }, [input]);
  const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importedCase, setImportedCase] = useState<any>(() => {
    try {
      const stored = sessionStorage.getItem('hc_imported_case_brief');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const initializedImportRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const caseId = params.get('importCase');
    if (caseId && !initializedImportRef.current) {
      initializedImportRef.current = true;
      try {
        const stored = sessionStorage.getItem('hc_imported_case_brief');
        const parsed = stored ? JSON.parse(stored) : null;
        if (parsed) {
          setImportedCase(parsed);
          const caseGreeting = `I have imported and reviewed your **${parsed.title}** (${parsed.type || 'Consultation'}).\n\nI've loaded your primary differential considerations (**${parsed.topConditions || 'findings'}**) and clinical notes.\n\nI'm ready to help you re-evaluate alternative hypotheses, cross-correlate with your medications, or prepare what to ask your doctor. What would you like to explore?`;
          
          setMessages((prev: any[]) => {
            if (prev.length <= 1) {
              return [{ role: 'model', content: caseGreeting, isStreaming: true }];
            } else {
              return [...prev, { role: 'model', content: caseGreeting, isStreaming: true }];
            }
          });
          setIsStreaming(true);
        }
      } catch (e) {
        console.error('Error importing case into Ava:', e);
      }
    }
  }, [location.search]);

  const currentProfileId = useRef(getProfileEngineState()?.activeId);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const state = getProfileEngineState();
      if (state?.activeId !== currentProfileId.current) {
        currentProfileId.current = state?.activeId;
        setMessages(getSavedMessages());
      }
    };
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleProfileUpdate);
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const sanitized = messages.map(m => { const { isStreaming, ...rest } = m; return rest; });
      updateProfileFeatureData('avaData', sanitized);
      localStorage.setItem(getAvaVaultKey(), JSON.stringify(sanitized));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        const keepCount = Math.floor(messages.length * 0.8);
        const newMsgs = [messages[0], ...messages.slice(messages.length - keepCount)];
        const sanitized = newMsgs.map(m => { const { isStreaming, ...rest } = m; return rest; });
        try {
          updateProfileFeatureData('avaData', sanitized);
          localStorage.setItem(getAvaVaultKey(), JSON.stringify(sanitized));
        } catch (e2) {}
      }
    }
  }, [messages]);

  // Theme colors - Serene Spa Teal
  const theme = {
    primary: '#F43F5E', // Rose 500 - Calm & Peaceful
    light: '#FFE4E6', // Rose 50
    text: '#115E59', // Teal 800
    bg: '#F8FAFC', // Slate 50
  };

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safe auto-scroll when user sends a new message or Ava starts typing
  useEffect(() => {
    if (messagesEndRef.current && chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 250;
      
      if (isNearBottom || isTyping) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
  }, [messages.length, isTyping]); // Only run on length change or typing status change

  const chatMutation = useMutation({
    mutationFn: (newMessages: any[]) => chatWithTherapyGemini(newMessages),
    onMutate: () => setIsTyping(true),
    // We handle setIsTyping manually in onSuccess to transition from thinking to typing
    onSuccess: async (response: any, newMessages: any[]) => {
        setIsTyping(false);
        setIsStreaming(true);
        const finalMessages = [...newMessages, { role: 'model', content: response, isStreaming: true }];
        
        if (finalMessages.length >= 10) {
          extractClinicalMemory(finalMessages).then((facts) => {
            if (facts && facts.length > 0) {
              facts.forEach((fact: string) => {
                recordHealthMemory({
                  kind: 'health_buddy',
                  source: 'health_buddy',
                  title: fact,
                  occurredAt: new Date().toISOString(),
                  payload: { extractedFact: fact },
                  dedupeKey: fact.toLowerCase().substring(0, 50)
                });
              });
            }
          });
          const keptMessages = [finalMessages[0], ...finalMessages.slice(-6)];
          setMessages(keptMessages);
        } else {
          setMessages(finalMessages);
        }

        addEvent('mental_health', 'health_buddy', 'Ava Health Buddy Session', {
            lastMessage: response,
            messageCount: newMessages.length + 1,
        }, false, null as any, sessionId as any);
        recordTrialUsage('ava');
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

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum file size is 3MB.");
      return;
    }
    if (file.size === 0) {
      toast.error("Invalid File", "The uploaded file is empty (0 bytes).");
      return;
    }
    if (file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      toast.error("Format Not Supported", "HEIC/HEIF images from Apple devices are not supported. Please export as JPG.");
      return;
    }

    
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File Too Large", "Please select an image or document under 4MB. Large camera photos should be compressed.");
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      toast.error("Upload Error", "Failed to read the file. Please try another.");
    };
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const cleanBase64 = base64Data?.split(',')[1] || '';
      const attachmentItem: { name: string; data: string; findings?: string } = { name: file.name, data: base64Data };

      // Pre-extract document findings so Ava understands exact lab values
      try {
        const profile = getProfile() || {};
        const parsed = await analyzeLabReport(cleanBase64, file.type, profile);
        if (parsed?.keyFindings) {
          attachmentItem.findings = `Test: ${parsed.testName || 'Lab/Image Report'} | Key Findings: ${parsed.keyFindings}${parsed.interpretation ? ' | Interpretation: ' + parsed.interpretation : ''}`;
        }
      } catch (e) {
        console.error('Error pre-analyzing file in Ava:', e);
      }

      setAttachments(prev => [...prev, attachmentItem]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text: string) => {
    if (!(await getActiveSession())) {
      const errorCount = messages.filter((m: any) => m.role === 'model' && m.content && m.content.includes("trouble connecting")).length;
      const userMessageCount = messages.filter((m: any) => m.role === 'user').length - errorCount;
        if (userMessageCount >= 5) {
          window.dispatchEvent(new CustomEvent('hc_require_auth', { 
            detail: { 
            title: 'Guest Limit Reached', 
            message: 'You have reached the guest limit of 5 messages. Please log in or sign up to continue chatting with Ava.' 
            } 
          }));
          return;
        }
    }

    if (!canUseTrial('ava')) {
      openTrialModal('Ava Health Buddy (10 Free Trial Replies)');
      return;
    }

    if ((!text.trim() && attachments.length === 0) || isTyping || isStreaming) return;

    let finalContent = text.trim();
    if (attachments.length > 0) {
      const attachStr = attachments.map((a: any) => {
        return a.findings
          ? `[Attached Document: ${a.name}\n${a.findings}]`
          : `[Attached Document: ${a.name}]`;
      }).join('\n\n');
      finalContent = finalContent ? `${finalContent}\n\n${attachStr}` : attachStr;
    }

    const newMessages = [...messages, { role: 'user', content: finalContent, attachments: attachments.map((a: any) => a.name) }];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);

    chatMutation.mutate(newMessages);
  };

  return (
    <div
      style={{
        padding: isMobile ? '0' : '0 24px',
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
      }}
    >
      
      {/* Outer White Card Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          maxHeight: '100%',
          background: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.45)',
          backdropFilter: isMobile ? 'none' : 'blur(32px)', 
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(32px)',
          borderRadius: isMobile ? '0' : '32px',
          margin: '0',
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(244, 63, 94, 0.08)',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        {/* Header */}
        {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? 'calc(var(--safe-area-top, 44px) + 16px) 20px 16px 20px' : '20px 32px',
            background: 'rgba(255, 241, 242, 0.65)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
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
              Ava Pro <span style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Plus</span>
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

        )}

        {/* Chat Area */}
        <div
          ref={chatContainerRef}
            onScroll={(e) => window.dispatchEvent(new CustomEvent('hc_scroll_intent', { detail: { scrollTop: e.currentTarget.scrollTop } }))}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: isMobile ? '20px 16px' : '32px',
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
              gap: '16px',
            }}
          >
            {importedCase && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                  border: '1.5px solid #99F6E4',
                  borderRadius: 20,
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  marginBottom: 8,
                  boxShadow: '0 4px 16px rgba(13,148,136,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0D9488', color: '#FFF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: 0.6 }}>Connected Case In Session</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(13,148,136,0.15)', color: '#0F766E', padding: '1px 7px', borderRadius: 999 }}>{importedCase.type || 'Consultation'}</span>
                    </div>
                    <strong style={{ fontSize: 14.5, color: '#115E59', display: 'block', lineHeight: 1.3 }}>{importedCase.title}</strong>
                    {importedCase.topConditions && (
                      <span style={{ fontSize: 12, color: '#0F766E', display: 'block', marginTop: 2 }}>
                        Differentials: {importedCase.topConditions}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {importedCase.caseId && (
                    <button
                      onClick={() => navigate(`/app/cases/${importedCase.caseId}`)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #99F6E4',
                        color: '#0F766E',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      View Case File
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setImportedCase(null);
                      try { sessionStorage.removeItem('hc_imported_case_brief'); } catch(e){}
                    }}
                    aria-label="Close imported case context"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0D9488',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}

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
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: msg.role === 'user' ? 'none' : 'blur(16px)', WebkitBackdropFilter: msg.role === 'user' ? 'none' : 'blur(16px)',
                      color: msg.role === 'user' ? '#FFFFFF' : '#334155',
                      padding: isMobile ? '10px 14px' : '12px 18px',
                      borderRadius:
                        msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      fontSize: '16px',
                      lineHeight: 1.45,
                      boxShadow: msg.role === 'user' ? '0 12px 32px rgba(244, 63, 94, 0.35)' : '0 16px 40px rgba(244, 63, 94, 0.1)',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.8)',
                      maxWidth: '80%',
                    }}
                  >
                    {msg.isStreaming ? (
                      <TypewriterText 
                        content={msg.content} 
                        messagesEndRef={messagesEndRef}
                        onComplete={() => {
                          setIsStreaming(false);
                          setMessages(prev => {
                            const updated = [...prev];
                            const idx = updated.findIndex(m => m === msg);
                            if (idx !== -1) {
                              updated[idx] = { ...msg, isStreaming: false };
                            }
                            return updated;
                          });
                        }} 
                      />
                    ) : (
                      msg.content ? <><MessageRenderer content={msg.content} />{msg.role === 'model' && msg.content.length > 50 && <GlassBoxExplanation />}</> : <span style={{ opacity: 0.5 }}>...</span>
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
                    background: 'transparent',
                    padding: isMobile ? '12px 16px' : '16px',
                    borderRadius: '20px 20px 20px 4px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
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

            <div ref={messagesEndRef} style={{ height: 1 }} />

            {/* Suggestions - Show after initial/imported message if user hasn't typed yet */}
            {messages.length <= 2 && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  paddingLeft: isMobile ? '0' : '44px',
                  marginTop: '-4px',
                }}
              >
                {(importedCase ? CASE_RECHECK_SUGGESTIONS : SUGGESTIONS).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${importedCase ? '#99F6E4' : theme.light}`,
                      color: importedCase ? '#0D9488' : theme.primary,
                      padding: '8px 14px',
                      borderRadius: '99px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(139,92,246,0.06)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = importedCase ? '#CCFBF1' : theme.light;
                      e.currentTarget.style.borderColor = importedCase ? '#0D9488' : theme.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = importedCase ? '#99F6E4' : theme.light;
                    }}
                  >
                    <Sparkles size={12} />
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
            padding: isMobile ? '12px 14px calc(16px + env(safe-area-inset-bottom, 16px)) 14px' : '24px 32px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.4)',
            marginTop: 'auto',
            width: '100%',
            flexShrink: 0,
            marginBottom: '0',
          }}
        >
          {attachments.length > 0 && (
            <div style={{ width: '100%', maxWidth: '720px', display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {attachments.map((att, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '6px 12px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  color: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.05)'
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
                padding: isMobile ? '12px 46px 12px 44px' : '16px 56px 16px 52px',
                borderRadius: '99px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                fontSize: '16px',
                outline: 'none',
                boxShadow: '0 8px 32px rgba(244, 63, 94, 0.12)',
                color: '#1E293B',
                paddingRight: '60px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); e.target.style.borderColor = theme.primary; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.25)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)'; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.12)'; }}
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



