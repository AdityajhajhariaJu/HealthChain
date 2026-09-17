import { Play } from 'lucide-react';
import type { FitnessContent } from '../../services/FitnessService';
import { triggerHapticLight } from '../../services/haptics';

const CALM_TRACKS = [
  {
    id: 'm1',
    title: 'Meditate',
    subtitle: '30 min',
    image: '/images/thumb_zen_stones_1788260013795.jpg',
    description: 'A complete guided meditation.',
    duration: 30,
    category: 'meditation',
  },
  {
    id: 'mood-0',
    title: 'Sleep',
    subtitle: '45 min',
    image: '/images/thumb_night_clouds_1788262545783.jpg',
    description: 'A quiet soundscape for bedtime.',
    duration: 45,
    category: 'mood',
  },
  {
    id: 'mood-1',
    title: 'Focus',
    subtitle: '60 min',
    image: '/images/thumb_focus_sphere_1788262954419.jpg',
    description: 'A low-distraction focus soundscape.',
    duration: 60,
    category: 'mood',
  },
  {
    id: 'soundscape-rain',
    title: 'Rain',
    subtitle: 'Ambient',
    image: '/images/thumb_rain_window_1788262571496.jpg',
    description: 'Continuous gentle rain.',
    duration: 120,
    category: 'soundscape',
  },
] as const;

export function CalmSpaceSection({
  onSelect,
  sectionRef,
}: {
  onSelect: (content: FitnessContent) => void;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section
      ref={sectionRef}
      id="calm-space"
      style={{
        margin: '0 0 16px',
        padding: '18px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 14px 32px rgba(15, 118, 110, 0.07)',
        scrollMarginTop: '24px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ margin: 0, color: '#0F172A', fontSize: '20px', letterSpacing: '-0.4px' }}>Calm Space</h2>
        <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '13px' }}>Choose a sound and begin.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
        {CALM_TRACKS.map((track) => (
          <button
            key={track.id}
            type="button"
            aria-label={`Open ${track.title}`}
            onClick={() => {
              triggerHapticLight();
              onSelect({
                id: track.id,
                category_id: track.category,
                is_active: true,
                type: track.category === 'soundscape' ? 'soundscape' : 'meditation',
                title: track.title,
                subtitle: track.subtitle,
                description: track.description,
                cover_image_url: track.image,
                audio_url: '',
                video_url: '',
                duration_minutes: track.duration,
                calories_estimate: 0,
                difficulty: 'Beginner',
                equipment: [],
                is_premium: false,
                is_featured: true,
              });
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '54px 1fr 24px',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              padding: '8px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#0F172A',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <img src={track.image} alt="" loading="lazy" style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover' }} />
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '14px' }}>{track.title}</strong>
              <span style={{ color: '#64748B', fontSize: '12px' }}>{track.subtitle}</span>
            </span>
            <Play size={15} fill="currentColor" color="#0D9488" />
          </button>
        ))}
      </div>
    </section>
  );
}
