import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  Bookmark, 
  X, 
  Share2, 
  Search, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  MessageSquare, 
  Type, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { CLINICAL_ARTICLES, MedicalArticle } from '../../data/ClinicalArticles';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getItemSync, setItemSync } from '../../services/storage';

const CATEGORIES = [
  'All',
  'Brain & Mind',
  'Cardiometabolic',
  'Sleep & Circadian',
  'Gut Health',
  'Longevity',
  'Saved'
] as const;

export function ClinicalArticleSection() {
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useIsMobile();

  // Active category filter on dashboard
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Selected article for bottom sheet reader
  const [selectedArticle, setSelectedArticle] = useState<MedicalArticle | null>(null);

  // Full library explorer modal
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [libraryCategory, setLibraryCategory] = useState<string>('All');

  // Bookmarks persistence
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const stored = getItemSync('healthchain_bookmarked_articles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Read articles persistence
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = getItemSync('healthchain_read_articles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Reader state: scroll progress, font scale, audio narration
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isLargeText, setIsLargeText] = useState<boolean>(false);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const readerContentRef = useRef<HTMLDivElement>(null);

  // Audio narration cleanup
  const stopNarration = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
  };

  useEffect(() => {
    if (selectedArticle && readerContentRef.current) {
      readerContentRef.current.scrollTop = 0;
      setScrollProgress(0);
    }
    return () => {
      stopNarration();
    };
  }, [selectedArticle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArticle) {
          e.preventDefault();
          stopNarration();
          setSelectedArticle(null);
        } else if (showLibraryModal) {
          e.preventDefault();
          setShowLibraryModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticle, showLibraryModal]);

  // Toggle Audio Narration
  const toggleNarration = () => {
    if (!selectedArticle) return;
    if (isNarrating) {
      stopNarration();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      toast.info('Narration Unavailable', 'Audio synthesis is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const narrationText = `Clinical review: ${selectedArticle.title}. Written by ${selectedArticle.author}, ${selectedArticle.role}. Key Takeaways: ${selectedArticle.keyTakeaways.join('. ')}. ${selectedArticle.sections.map(s => `${s.heading}. ${s.body}`).join(' ')}`;
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
    triggerHapticLight();
    toast.info('Audio Briefing Started', 'Listening to clinical article overview.');
  };

  // Bookmark Toggle
  const toggleBookmark = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    triggerHapticLight();
    const isSaved = bookmarkedIds.includes(articleId);
    const updated = isSaved 
      ? bookmarkedIds.filter(id => id !== articleId)
      : [...bookmarkedIds, articleId];
    
    setBookmarkedIds(updated);
    setItemSync('healthchain_bookmarked_articles', JSON.stringify(updated));

    if (!isSaved) {
      toast.success('Article Saved', 'Added to your personal reading list.');
    } else {
      toast.info('Removed', 'Removed from your saved articles.');
    }
  };

  // Native Share / Clipboard Fallback
  const handleShare = async (e: React.MouseEvent, article: MedicalArticle) => {
    e.stopPropagation();
    triggerHapticLight();
    const shareData = {
      title: article.title,
      text: `${article.title} — Clinical Article by ${article.author}`,
      url: window.location.href.split('#')[0]
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${article.title}\n${article.subtitle}\nBy ${article.author}\nAvailable on HealthChain360`);
      toast.success('Summary Copied', 'Article details copied to clipboard.');
    } catch {
      toast.info('Article Shared', article.title);
    }
  };

  // Mark Article Complete (+10 Vitality Points)
  const handleFinishReading = (article: MedicalArticle) => {
    triggerHapticSuccess();
    stopNarration();
    if (!readIds.includes(article.id)) {
      const nextRead = [...readIds, article.id];
      setReadIds(nextRead);
      setItemSync('healthchain_read_articles', JSON.stringify(nextRead));
      awardPoints(10, `Read Article: ${article.title}`, 'lifestyle', `read_${article.id}`);
      toast.success('Article Completed! 📖', '+10 Vitality Points awarded for preventative health learning.');
    } else {
      toast.info('Article Finished', 'You have revisited this clinical evidence guide.');
    }
    setSelectedArticle(null);
  };

  // Cross-Tool Handoff to Ava
  const handleDiscussWithAva = (article: MedicalArticle) => {
    triggerHapticLight();
    stopNarration();
    setSelectedArticle(null);
    setShowLibraryModal(false);
    const prompt = `I just read Dr. ${article.author}'s clinical article "${article.title}" covering ${article.subtitle}. Can you analyze how its medical takeaways apply to my biomarkers, daily habits, and active health profile?`;
    navigate('/app/ava', { state: { initialPrompt: prompt } });
  };

  // Track Reader Scroll Progress
  const handleReaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const total = el.scrollHeight - el.clientHeight;
    if (total <= 0) return;
    const progress = Math.min(100, Math.max(0, Math.round((el.scrollTop / total) * 100)));
    setScrollProgress(progress);
  };

  // Filtered Articles for Dashboard Carousel
  const displayedArticles = useMemo(() => {
    if (selectedCategory === 'All') return CLINICAL_ARTICLES;
    if (selectedCategory === 'Saved') {
      return CLINICAL_ARTICLES.filter(a => bookmarkedIds.includes(a.id));
    }
    return CLINICAL_ARTICLES.filter(a => a.category === selectedCategory);
  }, [selectedCategory, bookmarkedIds]);

  // Filtered Articles for Full Library Explorer Modal
  const libraryArticles = useMemo(() => {
    return CLINICAL_ARTICLES.filter(art => {
      const matchesCat = libraryCategory === 'All' 
        ? true 
        : libraryCategory === 'Saved' 
          ? bookmarkedIds.includes(art.id) 
          : art.category === libraryCategory;
      
      const q = librarySearch.trim().toLowerCase();
      if (!q) return matchesCat;

      const matchesQuery = 
        art.title.toLowerCase().includes(q) ||
        art.subtitle.toLowerCase().includes(q) ||
        art.author.toLowerCase().includes(q) ||
        (art.tags || []).some(t => t.toLowerCase().includes(q)) ||
        art.keyTakeaways.some(k => k.toLowerCase().includes(q));

      return matchesCat && matchesQuery;
    });
  }, [libraryCategory, librarySearch, bookmarkedIds]);

  return (
    <section style={{ padding: isMobile ? '8px 0 12px' : '20px 0 20px', position: 'relative' }}>
      {/* Section Header */}
      <div style={{ 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: isMobile ? '12px' : '18px' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 800, 
              color: '#0EA5E9', 
              letterSpacing: '0.8px', 
              textTransform: 'uppercase',
              background: 'rgba(14, 165, 233, 0.1)',
              padding: '3px 8px',
              borderRadius: '8px'
            }}>
              EVIDENCE-BASED MEDICINE
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>• 10 Dossiers</span>
          </div>
          <h2 style={{ 
            fontSize: isMobile ? '22px' : '26px', 
            fontWeight: 800, 
            margin: 0, 
            color: '#0F172A', 
            letterSpacing: '-0.5px' 
          }}>
            Clinical Articles
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Preventative protocols, metabolic diagnostics & longevity neuroscience
          </p>
        </div>

        <button 
          onClick={() => {
            triggerHapticLight();
            setShowLibraryModal(true);
          }}
          style={{ 
            fontSize: '13px', 
            color: '#0EA5E9', 
            fontWeight: 700, 
            cursor: 'pointer',
            background: 'rgba(14, 165, 233, 0.08)',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)'}
        >
          View Library
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Category Filter Pills Bar */}
      <div 
        className="hide-scrollbar" 
        role="tablist"
        aria-label="Clinical Article Categories"
        style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          padding: isMobile ? '0 24px 12px' : '0 24px 16px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}
      >
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat;
          const count = cat === 'All' 
            ? CLINICAL_ARTICLES.length 
            : cat === 'Saved'
              ? bookmarkedIds.length
              : CLINICAL_ARTICLES.filter(a => a.category === cat).length;

          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                triggerHapticLight();
                setSelectedCategory(cat);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minWidth: 'max-content',
                cursor: 'pointer',
                border: isActive ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(226, 232, 240, 0.8)',
                background: isActive 
                  ? '#0F172A' 
                  : 'rgba(255, 255, 255, 0.85)',
                color: isActive ? '#FFFFFF' : '#475569',
                boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {cat === 'Saved' && <Bookmark size={13} fill={isActive ? '#F59E0B' : 'none'} color={isActive ? '#F59E0B' : '#64748B'} />}
              <span>{cat}</span>
              <span style={{ 
                fontSize: '11px', 
                opacity: 0.75,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                padding: '1px 6px',
                borderRadius: '8px',
                flexShrink: 0
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Carousel of Article Cards */}
      {displayedArticles.length === 0 ? (
        <div style={{ 
          margin: '0 24px', 
          padding: '36px 20px', 
          textAlign: 'center', 
          background: 'rgba(255,255,255,0.7)', 
          borderRadius: '24px',
          border: '1px dashed #CBD5E1'
        }}>
          <Bookmark size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#334155' }}>
            No saved articles found
          </p>
          <p style={{ margin: '4px 0 16px', fontSize: '13px', color: '#64748B' }}>
            Tap the bookmark icon on any clinical article to save it here for quick access.
          </p>
          <button
            onClick={() => setSelectedCategory('All')}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              background: '#0EA5E9',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Explore All 10 Articles
          </button>
        </div>
      ) : (
        <div 
          className="hide-scrollbar scrollable-row" 
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '18px', 
            padding: isMobile ? '0 24px 6px' : '0 24px 16px', 
            WebkitOverflowScrolling: 'touch', 
            margin: 0 
          }}
        >
          {displayedArticles.map((art) => {
            const isBookmarked = bookmarkedIds.includes(art.id);
            const isRead = readIds.includes(art.id);

            return (
              <motion.div 
                key={art.id} 
                role="button"
                tabIndex={0}
                aria-label={`Read clinical article: ${art.title}`}
                onKeyDown={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    setSelectedArticle(art);
                  }
                }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  triggerHapticLight();
                  setSelectedArticle(art);
                }} 
                style={{ 
                  width: isMobile ? '280px' : '300px', 
                  minWidth: isMobile ? '280px' : '300px', 
                  flexShrink: 0,
                  background: '#FFFFFF', 
                  borderRadius: '24px', 
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(0,0,0,0.03)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden', 
                  cursor: 'pointer', 
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  position: 'relative'
                }}
              >
                {/* Thumbnail Image Header */}
                <div style={{ position: 'relative', height: isMobile ? '150px' : '165px', width: '100%', overflow: 'hidden' }}>
                  <img 
                    loading="lazy" 
                    decoding="async" 
                    src={art.img} 
                    alt={art.title} 
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, transparent 40%, rgba(15, 23, 42, 0.6) 100%)' 
                  }} />
                  
                  {/* Category Pill */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    left: '12px', 
                    background: 'rgba(15, 23, 42, 0.75)', 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'white', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      {art.category}
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => toggleBookmark(e, art.id)}
                    aria-label="Bookmark article"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Bookmark 
                      size={16} 
                      color={isBookmarked ? '#F59E0B' : '#475569'} 
                      fill={isBookmarked ? '#F59E0B' : 'none'} 
                    />
                  </button>

                  {/* Read Time Pill */}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '12px', 
                    left: '12px', 
                    background: 'rgba(255,255,255,0.92)', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    backdropFilter: 'blur(8px)', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                  }}>
                    <BookOpen size={12} color="#0EA5E9" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>
                      {art.readTime}
                    </span>
                  </div>

                  {/* Read Status Badge */}
                  {isRead && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '12px', 
                      right: '12px', 
                      background: 'rgba(16, 185, 129, 0.95)', 
                      color: 'white',
                      padding: '4px 9px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.4px',
                      backdropFilter: 'blur(8px)'
                    }}>
                      <Check size={11} strokeWidth={3} />
                      READ
                    </div>
                  )}
                </div>

                {/* Article Card Body */}
                <div style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  flex: 1, 
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 6px', 
                      fontSize: '15px', 
                      fontWeight: 700, 
                      color: '#0F172A', 
                      lineHeight: '1.35',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {art.title}
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      color: '#64748B', 
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {art.subtitle}
                    </p>
                  </div>

                  {/* Author Credential & Action Row */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingTop: '10px',
                    borderTop: '1px solid #F1F5F9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '11px', 
                        fontWeight: 800 
                      }}>
                        {art.author.split(' ')[1]?.charAt(0) || 'D'}
                      </div>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#334155', 
                        fontWeight: 600,
                        maxWidth: '160px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {art.author}
                      </span>
                    </div>

                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      background: '#F8FAFC', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#0EA5E9'
                    }}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full Clinical Library Explorer Modal */}
      {showLibraryModal && (
        <BottomSheetOverlay 
          isOpen={showLibraryModal} 
          onClose={() => setShowLibraryModal(false)}
          theme="light"
          backgroundColor="#FFFFFF"
          noPadding={true}
          hideDefaultClose={true}
          title="Clinical Evidence Library"
        >
          <div style={{ 
            padding: isMobile ? '20px 16px 80px' : '24px 28px 80px', 
            height: '100%',
            overflowY: 'auto',
            background: '#FFFFFF',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', marginTop: '8px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                  Clinical Evidence Library
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                  10 Peer-reviewed clinical guides & preventative mechanisms
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={18} color="#94A3B8" style={{ position: 'absolute', top: '13px', left: '14px' }} />
              <input 
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search biomarkers (ApoB), topics (Sleep), or doctors..."
                aria-label="Search clinical articles, biomarkers, or topics"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0F172A'
                }}
              />
              {librarySearch && (
                <button 
                  type="button"
                  onClick={() => setLibrarySearch('')}
                  aria-label="Clear article search"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Modal Category Filter Chips */}
            <div 
              className="hide-scrollbar" 
              role="tablist"
              aria-label="Filter Library by Category"
              style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                marginBottom: '20px',
                paddingBottom: '4px' 
              }}
            >
              {CATEGORIES.map(cat => {
                const isActive = libraryCategory === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      triggerHapticLight();
                      setLibraryCategory(cat);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      minWidth: 'max-content',
                      cursor: 'pointer',
                      border: 'none',
                      background: isActive ? '#0F172A' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Articles Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
              {libraryArticles.map(art => {
                const isBookmarked = bookmarkedIds.includes(art.id);
                const isRead = readIds.includes(art.id);

                return (
                  <div
                    key={art.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Read article: ${art.title}`}
                    onClick={() => {
                      triggerHapticLight();
                      setShowLibraryModal(false);
                      setSelectedArticle(art);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerHapticLight();
                        setShowLibraryModal(false);
                        setSelectedArticle(art);
                      }
                    }}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '18px',
                      border: '1px solid #E2E8F0',
                      padding: '14px',
                      display: 'flex',
                      gap: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      position: 'relative'
                    }}
                  >
                    <img 
                      src={art.img} 
                      alt={art.title} 
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&q=80';
                      }}
                      style={{ 
                        width: '85px', 
                        height: '85px', 
                        borderRadius: '14px', 
                        objectFit: 'cover',
                        flexShrink: 0 
                      }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0EA5E9', textTransform: 'uppercase' }}>
                            {art.category}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{art.readTime}</span>
                        </div>
                        <h4 style={{ margin: '4px 0', fontSize: '14px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                          {art.title}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{art.author}</span>
                        {isRead && <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>✓ Read</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BottomSheetOverlay>
      )}

      {/* Immersive Article Reader Sheet */}
      {selectedArticle && (
        <BottomSheetOverlay 
          isOpen={!!selectedArticle} 
          onClose={() => {
            stopNarration();
            setSelectedArticle(null);
          }}
          theme="light"
          backgroundColor="#FFFFFF"
          noPadding={true}
          hideDefaultClose={true}
          title={`Clinical Article: ${selectedArticle.title}`}
        >
          {/* Top Reading Progress Bar */}
          <div style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'rgba(226, 232, 240, 0.5)',
            zIndex: 30,
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${scrollProgress}%`,
              background: 'linear-gradient(90deg, #0EA5E9 0%, #10B981 50%, #8B5CF6 100%)',
              transition: 'width 0.15s ease'
            }} />
          </div>

          <div 
            ref={readerContentRef}
            onScroll={handleReaderScroll}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: isMobile ? '36px 16px 80px' : '32px 32px 80px',
              background: '#FFFFFF',
              boxSizing: 'border-box'
            }}
          >
            {/* Quick Action Utility Bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: isMobile ? '4px' : '8px',
              marginBottom: '18px',
              paddingBottom: '12px',
              borderBottom: '1px solid #F1F5F9',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  color: '#0EA5E9', 
                  background: 'rgba(14, 165, 233, 0.1)', 
                  padding: '3px 8px', 
                  borderRadius: '8px', 
                  textTransform: 'uppercase' 
                }}>
                  {selectedArticle.category}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  {selectedArticle.readTime}
                </span>
              </div>

              {/* Utility Tools: Audio Narration, Font Size, Bookmark, Share, Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Audio Narration Button */}
                <button
                  onClick={toggleNarration}
                  title={isNarrating ? "Stop audio narration" : "Listen to audio narration"}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: isNarrating ? '#0EA5E9' : '#F1F5F9',
                    color: isNarrating ? '#FFFFFF' : '#0F172A',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isNarrating ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isNarrating ? 'Playing' : 'Listen'}</span>
                </button>

                {/* Font Size Toggle */}
                <button
                  onClick={() => {
                    triggerHapticLight();
                    setIsLargeText(!isLargeText);
                  }}
                  title="Toggle font size"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <Type size={16} />
                </button>

                {/* Bookmark Toggle */}
                <button
                  onClick={(e) => toggleBookmark(e, selectedArticle.id)}
                  title="Save article"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Bookmark 
                    size={16} 
                    color={bookmarkedIds.includes(selectedArticle.id) ? '#F59E0B' : '#475569'} 
                    fill={bookmarkedIds.includes(selectedArticle.id) ? '#F59E0B' : 'none'} 
                  />
                </button>

                {/* Share Button */}
                <button
                  onClick={(e) => handleShare(e, selectedArticle)}
                  title="Share article"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={16} />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    stopNarration();
                    setSelectedArticle(null);
                  }}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Hero Cover Banner with Medical Review Badge & Thumbnail Picture */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              height: isMobile ? '210px' : '270px', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              marginBottom: '20px',
              backgroundColor: '#0F172A',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              flexShrink: 0
            }}>
              <img 
                src={selectedArticle.img} 
                alt={selectedArticle.title}
                loading="eager"
                decoding="async" 
                onError={(e) => {
                  const fallbackMap: Record<string, string> = {
                    'Gut Health': '/images/immersive/personalized-meal.png',
                    'Brain & Mind': '/images/immersive/focus-boost.png',
                    'Cardiometabolic': '/images/immersive/doctor-biomarker.png',
                    'Sleep & Circadian': '/images/immersive/midnight-craving.png',
                    'Longevity': '/images/immersive/master-your-health.png'
                  };
                  const fallback = fallbackMap[selectedArticle.category] || '/images/immersive/doctor-biomarker.png';
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
              />
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.25) 55%, transparent 100%)' 
              }} />
              
              <div style={{ 
                position: 'absolute', 
                bottom: '14px', 
                left: '16px', 
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(15, 23, 42, 0.65)', 
                  backdropFilter: 'blur(10px)', 
                  padding: '5px 12px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <ShieldCheck size={14} color="#34D399" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    PEER-REVIEWED CLINICAL EVIDENCE
                  </span>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedArticle.categoryLabel || selectedArticle.category}
                </span>
              </div>
            </div>

            {/* Author Credential Card */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              borderRadius: '16px', 
              background: '#F8FAFC', 
              border: '1px solid #E2E8F0', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800, 
                fontSize: '16px',
                flexShrink: 0
              }}>
                {selectedArticle.author.split(' ')[1]?.charAt(0) || 'D'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedArticle.author}
                  </span>
                  <ShieldCheck size={16} color="#0EA5E9" />
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedArticle.role}
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 style={{ 
              fontSize: isLargeText ? (isMobile ? '26px' : '30px') : (isMobile ? '22px' : '26px'), 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: '0 0 8px', 
              lineHeight: 1.25, 
              letterSpacing: '-0.5px' 
            }}>
              {selectedArticle.title}
            </h2>
            <p style={{ 
              fontSize: isLargeText ? '16px' : '14px', 
              color: '#64748B', 
              margin: '0 0 20px', 
              lineHeight: 1.45, 
              fontWeight: 500 
            }}>
              {selectedArticle.subtitle}
            </p>

            {/* Tag Pills */}
            {(selectedArticle.tags || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                {(selectedArticle.tags || []).map((tag, idx) => (
                  <span 
                    key={idx}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      background: '#F1F5F9',
                      padding: '3px 10px',
                      borderRadius: '8px'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Key Clinical Takeaways Frosted Card */}
            {(selectedArticle.keyTakeaways || []).length > 0 && (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(240, 253, 250, 0.95) 100%)', 
                borderRadius: '20px', 
                padding: '18px', 
                border: '1px solid #BFDBFE', 
                marginBottom: '28px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Sparkles size={16} color="#2563EB" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    Key Clinical Takeaways
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedArticle.keyTakeaways.map((takeaway, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ 
                        width: '7px', 
                        height: '7px', 
                        borderRadius: '50%', 
                        background: '#2563EB', 
                        marginTop: '6px', 
                        flexShrink: 0 
                      }} />
                      <span style={{ 
                        fontSize: isLargeText ? '15px' : '13px', 
                        color: '#1E3A8A', 
                        lineHeight: 1.45, 
                        fontWeight: 500 
                      }}>
                        {takeaway}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Article Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '36px' }}>
              {selectedArticle.sections.map((sec, idx) => (
                <div key={idx}>
                  <h3 style={{ 
                    fontSize: isLargeText ? '20px' : '17px', 
                    fontWeight: 700, 
                    color: '#0F172A', 
                    margin: '0 0 10px', 
                    letterSpacing: '-0.3px' 
                  }}>
                    {sec.heading}
                  </h3>
                  <p style={{ 
                    fontSize: isLargeText ? '17px' : '15px', 
                    color: '#334155', 
                    lineHeight: 1.65, 
                    margin: 0 
                  }}>
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Action Footer: Discuss with Ava & Mark Finished */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <button
                onClick={() => handleDiscussWithAva(selectedArticle)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)'
                }}
              >
                <MessageSquare size={16} color="#34D399" />
                Discuss with Ava Medical Buddy
              </button>

              <button
                onClick={() => handleFinishReading(selectedArticle)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '16px',
                  background: readIds.includes(selectedArticle.id)
                    ? '#10B981'
                    : 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)'
                }}
              >
                <CheckCircle2 size={16} />
                {readIds.includes(selectedArticle.id) ? 'Finished Reading' : 'Mark Finished (+10 PTS)'}
              </button>
            </div>
          </div>
        </BottomSheetOverlay>
      )}
    </section>
  );
}
