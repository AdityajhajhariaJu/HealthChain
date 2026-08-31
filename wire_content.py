import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper to find and replace block
def replace_block(text, search_str, replace_str):
    if search_str not in text:
        print(f'Warning: Could not find "{search_str}"')
    return text.replace(search_str, replace_str)

# 1. Update Audio by Mood
audio_mood_search = """                ].map((item, i) => (
                  <div key={i} onClick={() => triggerHapticLight()} className="active-scale scroll-snap-item" style={{ flexShrink: 0, position: 'relative', width: '220px', height: '120px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>"""
audio_mood_replace = """                ].map((item, i) => (
                  <div key={i} onClick={() => {
                    triggerHapticLight();
                    setActiveMeditation({
                      id: `mood-${i}`,
                      category_id: 'mood',
                      is_active: true,
                      type: 'meditation',
                      title: item.title,
                      subtitle: item.title === 'Deep Sleep' ? 'Drift into restorative slumber' : 
                                item.title === 'Deep Focus' ? 'Binaural beats for intense concentration' :
                                item.title === 'Pure Relax' ? 'Unwind your nervous system' :
                                'Start your day with clarity',
                      description: item.title === 'Deep Sleep' ? 'A guided progression into delta-wave sleep. This track uses binaural rhythms to slow your heart rate and quiet mental chatter, ensuring you wake up fully recovered.' : 
                                   item.title === 'Deep Focus' ? 'Designed for deep work. Isochronic tones stimulate gamma brainwaves, helping you achieve flow state faster and maintain it longer without burnout.' :
                                   item.title === 'Pure Relax' ? 'A quick reset for your nervous system. Combines gentle breathwork cues with ambient swells to lower cortisol and release physical tension.' :
                                   'An energizing morning protocol. Uses upbeat frequencies and positive visualization to prime your mind and body for peak performance today.',
                      cover_image_url: item.img,
                      audio_url: '',
                      video_url: '',
                      duration_minutes: item.title === 'Deep Sleep' ? 45 : item.title === 'Deep Focus' ? 60 : item.title === 'Pure Relax' ? 15 : 10,
                      calories_estimate: 0,
                      difficulty: 'Beginner'
                    });
                  }} className="active-scale scroll-snap-item" style={{ flexShrink: 0, position: 'relative', width: '220px', height: '120px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>"""

content = replace_block(content, audio_mood_search, audio_mood_replace)

# 2. Update Soundscapes
soundscapes_search = """                    onClick={() => triggerHapticLight()}"""
soundscapes_replace = """                    onClick={() => {
                      triggerHapticLight();
                      setActiveMeditation({
                        id: `soundscape-${i}`,
                        category_id: 'soundscape',
                        is_active: true,
                        type: 'soundscape',
                        title: type.name,
                        subtitle: type.name === 'Rain Sounds' ? 'Continuous gentle downpour' : 
                                  type.name === 'Focus Frequencies' ? '432Hz ambient hum' :
                                  'Immersive woodland ecosystem',
                        description: type.name === 'Rain Sounds' ? 'A continuous, looping recording of gentle rain falling on leaves. Perfect for masking background noise and creating a cozy, isolated environment for reading or sleeping.' : 
                                     type.name === 'Focus Frequencies' ? 'A continuous 432Hz frequency hum mixed with subtle brown noise. Scientifically engineered to block out distractions and narrow your attentional focus.' :
                                     'A spatial audio recording of a temperate forest. Features gentle wind, distant birdsong, and rustling leaves to create a calming, natural atmosphere anywhere you are.',
                        cover_image_url: type.img,
                        audio_url: '',
                        video_url: '',
                        duration_minutes: 120,
                        calories_estimate: 0,
                        difficulty: 'Beginner'
                      });
                    }}"""

content = replace_block(content, soundscapes_search, soundscapes_replace)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated CaseDashboard with content wiring.')
