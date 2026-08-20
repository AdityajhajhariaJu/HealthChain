import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, User, Sparkles, ArrowRight } from 'lucide-react';
import { chatWithMDTSpecialist } from '../../services/geminiService';

export function StreamingMarkdown({ text, isNew, inline = false }: { text: string, isNew: boolean, inline?: boolean }) {
  const [displayed, setDisplayed] = useState(isNew ? '' : text);
  
  useEffect(() => {
    if (!isNew) {
      setDisplayed(text);
      return;
    }
    
    let isMounted = true;
    const stream = async () => {
      let current = '';
      for (let i = 0; i < text.length; i++) {
        if (!isMounted) break;
        current += text[i];
        const delay = Math.floor(Math.random() * 20) + 10;
        await new Promise((r) => setTimeout(r, delay));
        if (isMounted) setDisplayed(current);
      }
    };
    stream();
    
    return () => { isMounted = false; };
  }, [text, isNew]);

  return <ReactMarkdown components={inline ? { p: ({node, ...props}) => <span {...props} /> } : {}}>{displayed}</ReactMarkdown>;
}

export function useSpecialistStream(specialist: any, isRunning: boolean, isPaused: boolean, startDelay: number, onComplete: (id: string, messages: any[]) => void, allSpecialists: any[] = [], intakeData: any, activeDifferentials: any[], cachedSpecialistStreams: any) {
  const cache = cachedSpecialistStreams[specialist.id] || (() => {
    try {
      const saved = sessionStorage.getItem(`hc_stream_${specialist.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  })();
  const [messages, setMessages] = useState<any[]>(cache?.messages || []);
  const [status, setStatus] = useState(cache?.status || 'idle'); // idle | thinking | questioning | done
  const [step, setStep] = useState(cache?.step || 0);

  useEffect(() => {
    cachedSpecialistStreams[specialist.id] = { messages, status, step };
    try {
      sessionStorage.setItem(`hc_stream_${specialist.id}`, JSON.stringify({ messages, status, step }));
    } catch(e) {}
  }, [messages, status, step, specialist.id, cachedSpecialistStreams]);

  const otherSpecialists = allSpecialists
    .filter((s) => s.id !== specialist.id)
    .map((s) => s.label.toLowerCase());
  let collabString = '';
  if (otherSpecialists.length === 1) {
    collabString = ` and I will be working in collaboration with the <strong>${otherSpecialists[0]}</strong>`;
  } else if (otherSpecialists.length > 1) {
    const last = otherSpecialists.pop();
    collabString = ` and I will be working in collaboration with the <strong>${otherSpecialists.join('</strong>, <strong>')}</strong>, and <strong>${last}</strong>`;
  }

  const introQuestion = JSON.stringify({
    internalThoughts: `Reviewing intake. Preparing to assess patient for ${specialist.label} specific pathways.`,
    currentHypotheses: ["Awaiting initial patient response"],
    response: `Hello, I'm the **${specialist.label}**${collabString}. What specific issues or symptoms bring you to my field today?`,
    widgetType: "none"
  });

  const introStarted = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      setMessages([]);
      setStatus('idle');
      setStep(0);
      introStarted.current = false;
      return;
    }
    
    if (status === 'idle' && step === 0 && !isPaused && !introStarted.current) {
      introStarted.current = true;
      setTimeout(() => {
        setStatus('thinking');
        setTimeout(
          () => {
            setMessages([{ role: 'ai', text: introQuestion }]);
            setStatus('questioning');
          },
          1000 + Math.random() * 800
        );
      }, startDelay);
    }
  }, [isRunning, isPaused, status, step, startDelay, introQuestion]);

  const submitAnswer = async (text) => {
    if (status !== 'questioning') return;
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setStatus('thinking');
    setStep(prev => prev + 1);

    try {
      const response = await chatWithMDTSpecialist(newMessages, specialist, allSpecialists, intakeData, activeDifferentials);
      if (response.includes('ANALYSIS_COMPLETE')) {
        setStatus('done');
        if (onComplete) onComplete(specialist.id, newMessages);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: response }]);
        setStatus('questioning');
      }
    } catch (err) {
      console.error('Failed to fetch AI response:', err);
      const errorMsg = JSON.stringify({
        response: 'Sorry, I encountered a network error. Please try again.',
        internalThoughts: 'Network error encountered.',
        currentHypotheses: []
      });
      setMessages((prev) => [...prev, { role: 'ai', text: errorMsg }]);
      setStatus('questioning');
    }
  };

  return { messages, status, submitAnswer };
}

export function SpecialistPanel({ specialist, isRunning, isPaused, index, onComplete, allSpecialists, intakeData, activeDifferentials, cachedSpecialistStreams }) {
  const startDelay = index * 400;
  const { messages, status, submitAnswer } = useSpecialistStream(
    specialist,
    isRunning,
    isPaused,
    startDelay,
    onComplete,
    allSpecialists,
    intakeData,
    activeDifferentials,
    cachedSpecialistStreams
  );
  const containerRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const [input, setInput] = useState('');
  const Icon = specialist.icon;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Scroll on message change
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });

    // Scroll continuously as streaming text expands
    const observer = new MutationObserver(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    });
    
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    
    return () => observer.disconnect();
  }, [messages.length]);

  useEffect(() => {
    if (status === 'questioning' && inputRef.current) {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current.focus();
      }
    }
  }, [status]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || status !== 'questioning' || isPaused) return;
    submitAnswer(input);
    setInput('');
  };

  const questionCount = messages.filter((m) => m.role === 'ai').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 80 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border:
          status === 'done' ? `2px solid ${specialist.color}` : '1px solid rgba(255,255,255,0.5)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: specialist.bg,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#FFF',
            border: `1px solid ${specialist.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Icon size={16} color={specialist.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
            {specialist.label}
          </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: specialist.color, fontWeight: 700 }}>
                {status === 'idle' && <span style={{ color: '#94A3B8' }}>Initializing...</span>}
                {status === 'thinking' && 'Analyzing...'}
                {status === 'questioning' && `Question ${Math.min(questionCount, 8)} of 8`}
                {status === 'done' && 'Assessment complete'}
              </div>
              {(status === 'questioning' || status === 'thinking' || status === 'done') && (
                <div style={{ flex: 1, maxWidth: '100px', height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: specialist.color, 
                    width: status === 'done' ? '100%' : `${Math.min((questionCount / 8) * 100, 100)}%`,
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              )}
            </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(248,250,252,0.5)',
        }}
      >
        {status === 'idle' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: 0.6,
            }}
          >
            <Sparkles size={32} color={specialist.color} />
            <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>
              Initializing AI Agent...
            </span>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg: any, i: number) => {
            const isUser = msg.role === 'user';
            let parsed: any = null;
            let displayText = msg.text;
            let internalThoughts = null;

            if (!isUser) {
              try {
                let jsonText = msg.text;
                const match = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
                if (match && match[1]) {
                  jsonText = match[1].trim();
                }
                parsed = JSON.parse(jsonText);
                displayText = parsed?.response || parsed?.text || parsed?.message || parsed?.answer || parsed?.professionalAdvice || msg.text;
                internalThoughts = parsed?.internalThoughts;
              } catch {
                displayText = msg.text;
              }
            }

            return (
              <motion.div
                key={`msg-${i}-${msg.role}-${displayText?.length || 0}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  alignSelf: 'stretch', 
                  maxWidth: '100%',
                  marginLeft: isUser ? '32px' : '0px',
                  marginBottom: isUser ? '24px' : '12px'
                }}
              >
                {!isUser && internalThoughts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginBottom: '16px',
                      padding: '12px 18px',
                      background: `linear-gradient(90deg, ${specialist.color}15 0%, ${specialist.color}05 100%)`,
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${specialist.color}25`,
                      fontSize: '13px',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <motion.div
                       animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
                       transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                       style={{
                         width: '8px',
                         height: '8px',
                         borderRadius: '50%',
                         background: specialist.color,
                         boxShadow: `0 0 10px ${specialist.color}`,
                         flexShrink: 0
                       }}
                    />
                    <div style={{ lineHeight: 1.5, letterSpacing: '0.2px', fontStyle: 'italic' }}>
                      <span style={{ fontWeight: 600, color: specialist.color, marginRight: '6px' }}>Clinical Analysis:</span>
                      <StreamingMarkdown text={internalThoughts} isNew={i === messages.length - 1} inline />
                    </div>
                  </motion.div>
                )}
                {!isUser ? (
                  <div
                    style={{
                      padding: '20px 24px',
                      borderRadius: 'var(--radius-lg)',
                      background: '#FFFFFF',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${specialist.color}, ${specialist.color}40)` }} />
                    
                    <div style={{ fontSize: '11px', fontWeight: 800, color: specialist.color, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BrainCircuit size={14} /> ACTIVE INQUIRY
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#1E293B', fontWeight: 400 }}>
                      <StreamingMarkdown text={displayText} isNew={i === messages.length - 1} />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(248, 250, 252, 0.7)',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={12} /> PATIENT RESPONSE
                    </div>
                    <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', fontWeight: 500 }}>
                      <ReactMarkdown>{displayText}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {status === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ alignSelf: 'flex-start' }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
                background: '#FFF',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d }}
                  style={{
                    display: 'block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: specialist.color,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {status === 'questioning' && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSend}
            style={{
              padding: '16px',
              background: '#FFF',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              ref={inputRef}
              autoFocus
              disabled={isPaused}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer..."
              aria-label="Your answer"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '999px',
                border: '1px solid #E2E8F0',
                fontSize: '15px',
                outline: 'none',
                background: '#F8FAFC',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = specialist.color)}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
            <button
              type="submit"
              disabled={!input.trim() || isPaused}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: input.trim() ? specialist.color : '#E2E8F0',
                color: '#FFF',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? `0 4px 12px ${specialist.color}40` : 'none',
              }}
            >
              <ArrowRight size={20} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SpecialistPill({ specialist, isSelected, onToggle, isMobile }) {
  const Icon = specialist.icon;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onToggle(specialist.id)}
      style={{
        background: isSelected ? specialist.color : '#FFFFFF',
        border: isSelected ? `1px solid ${specialist.color}` : '1px solid #E2E8F0',
        borderRadius: '999px',
        padding: isMobile ? '8px 10px 8px 6px' : '8px 16px 8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 4px 12px ${specialist.color}40` : '0 2px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: isSelected ? '#FFFFFF' : specialist.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={14} color={isSelected ? specialist.color : '#64748B'} />
      </div>
      <div style={{ 
        fontSize: isMobile ? '12px' : '13px', 
        fontWeight: 600, 
        color: isSelected ? '#FFFFFF' : '#475569',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {specialist.label}
      </div>
    </motion.button>
  );
}

