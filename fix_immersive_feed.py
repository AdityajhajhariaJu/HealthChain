import re

filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ImmersiveFeatureFeed.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_return_block = '''  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Discover Insights</h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Personalized AI-driven health discoveries.</p>
      </div>
      
      <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(card.route)}
            style={{
              flexShrink: 0,
              position: 'relative',
              width: '160px',
              height: '220px',
              borderRadius: '20px',
              overflow: 'hidden',
              cursor: 'pointer',
              backgroundColor: '#0F172A',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <img 
              src={card.image} 
              alt={card.title}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                zIndex: 0
              }}
            />
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                zIndex: 1
              }}
            />

            <div style={{ position: 'relative', zIndex: 2, padding: '16px' }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', lineHeight: '1.2' }}>
                {card.title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '0 0 12px 0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {card.subtitle}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '99px', color: '#FFFFFF', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', gap: '4px' }}>
                <Sparkles size={12} />
                <span>Explore</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
'''

content = re.sub(
    r'  if \(cards\.length === 0\) return null;.*',
    new_return_block,
    content,
    flags=re.DOTALL
)

content = content.replace('setCards(feed.slice(0, 3));', 'setCards(feed);')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replaced ImmersiveFeatureFeed layout with a carousel.')
