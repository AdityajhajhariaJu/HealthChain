import sys
import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Meditation Hub hero cards
content = re.sub(
    r"onClick=\{\(\) => triggerHapticLight\(\)\} (getFallbackImage)",
    r"onClick={() => { triggerHapticLight(); setActiveMeditation({ id: `med-hero-${item.id}`, category_id: 'meditation', is_active: true, type: 'meditation', title: item.title, subtitle: item.title === 'Full Meditation Environment' ? 'Immersive audio-visual journey' : 'Shift your perspective', description: item.title === 'Full Meditation Environment' ? 'Our most complete meditation experience. Enter a fully immersive environment designed to detach you from your surroundings and center your awareness.' : 'A different kind of meditation. Uses subtle disruptions and shifts in audio to train your ability to refocus when distracted.', cover_image_url: item.cover_image_url, audio_url: '', video_url: '', duration_minutes: 30, calories_estimate: 0, difficulty: 'Intermediate' }); }} \1",
    content
)

# 2. Update Audio by Mood
content = re.sub(
    r"<div key=\{i\} onClick=\{\(\) => triggerHapticLight\(\)\} className=\"active-scale scroll-snap-item\"",
    r"""<div key={i} onClick={() => {
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
                  }} className="active-scale scroll-snap-item\"""",
    content
)

# 3. Update Soundscapes
content = re.sub(
    r"onClick=\{\(\) => triggerHapticLight\(\)\}\s*>",
    r"""onClick={() => {
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
                    }}
                  >""",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated CaseDashboard with content wiring.')
