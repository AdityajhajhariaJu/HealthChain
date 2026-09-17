import { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { CLINICAL_ARTICLES, type MedicalArticle } from '../../data/ClinicalArticles';
import { triggerHapticLight } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

const DASHBOARD_ARTICLES = CLINICAL_ARTICLES.slice(0, 3).map((article, index) => ({
  article,
  shortTitle: ['Gut and brain health', 'Managing overthinking', 'Understanding metabolic markers'][index],
}));

export function ClinicalArticleSection() {
  const isMobile = useIsMobile();
  const [selectedArticle, setSelectedArticle] = useState<MedicalArticle | null>(null);

  return (
    <>
      <section style={{ padding: isMobile ? '8px 0 14px' : '14px 0 20px' }}>
        <div style={{ padding: '0 4px 12px' }}>
          <h2 style={{ margin: 0, color: '#0F172A', fontSize: '20px', letterSpacing: '-0.4px' }}>Articles</h2>
          <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '13px' }}>Short health explainers.</p>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {DASHBOARD_ARTICLES.map(({ article, shortTitle }) => (
            <button
              key={article.id}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setSelectedArticle(article);
              }}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: isMobile ? '72px minmax(0, 1fr) 24px' : '92px minmax(0, 1fr) 28px',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                border: '1px solid #E2E8F0',
                borderRadius: '18px',
                background: '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <img src={article.img} alt="" loading="lazy" style={{ width: '100%', height: isMobile ? 66 : 74, objectFit: 'cover', borderRadius: '12px' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: '#0D9488', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                  {article.category} · {article.readTime}
                </span>
                <strong style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#0F172A', fontSize: isMobile ? '14px' : '15px', lineHeight: 1.3 }}>
                  {shortTitle}
                </strong>
              </span>
              <ChevronRight size={18} color="#94A3B8" />
            </button>
          ))}
        </div>
      </section>

      <BottomSheetOverlay isOpen={Boolean(selectedArticle)} onClose={() => setSelectedArticle(null)} theme="light" title={selectedArticle?.title || 'Article'}>
        {selectedArticle && (
          <article style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0D9488', fontSize: '12px', fontWeight: 800 }}>
              <BookOpen size={16} /> {selectedArticle.category} · {selectedArticle.readTime}
            </div>
            <h1 style={{ margin: '12px 0 8px', color: '#0F172A', fontSize: isMobile ? '26px' : '34px', lineHeight: 1.12, letterSpacing: '-0.8px' }}>{selectedArticle.title}</h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '15px', lineHeight: 1.55 }}>{selectedArticle.subtitle}</p>

            <div style={{ marginTop: '24px', padding: '16px 18px', background: '#F0FDFA', borderRadius: '16px' }}>
              <strong style={{ color: '#115E59', fontSize: '14px' }}>Key points</strong>
              <ul style={{ margin: '10px 0 0', paddingLeft: '20px', color: '#334155', lineHeight: 1.6 }}>
                {selectedArticle.keyTakeaways.map((point) => <li key={point} style={{ marginBottom: '8px' }}>{point}</li>)}
              </ul>
            </div>

            <div style={{ marginTop: '24px' }}>
              {selectedArticle.sections.map((section) => (
                <section key={section.heading} style={{ marginBottom: '24px' }}>
                  <h2 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '19px' }}>{section.heading.replace(/^\d+\.\s*/, '')}</h2>
                  <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: 1.7 }}>{section.body}</p>
                </section>
              ))}
            </div>
          </article>
        )}
      </BottomSheetOverlay>
    </>
  );
}
