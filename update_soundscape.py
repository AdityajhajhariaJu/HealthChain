import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update import to include FOCUS_FREQUENCIES_TRACKS
content = content.replace("import { MEDITATION_TRACKS, DEEP_SLEEP_TRACKS, DEEP_FOCUS_TRACKS, HAPPY_HIGH_ENERGY_TRACKS } from '../../data/MeditationTracks';", "import { MEDITATION_TRACKS, DEEP_SLEEP_TRACKS, DEEP_FOCUS_TRACKS, HAPPY_HIGH_ENERGY_TRACKS, FOCUS_FREQUENCIES_TRACKS } from '../../data/MeditationTracks';")

# 2. Update the logic for soundscape-1 (Focus Frequencies)
old_logic = """  const isPlaylistMode = content?.id === 'm1' || content?.id === 'mood-0' || content?.id === 'mood-1' || content?.id === 'mood-2';
  const playlistTitle = content?.id === 'm1' ? 'Full Meditation Environment' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : content?.id === 'mood-1' ? 'Deep Focus Environment' : content?.id === 'mood-2' ? 'Happy High Energy Environment' : '';
  const currentPlaylist = content?.id === 'm1' ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : content?.id === 'mood-1' ? DEEP_FOCUS_TRACKS : content?.id === 'mood-2' ? HAPPY_HIGH_ENERGY_TRACKS : [];"""

new_logic = """  const isPlaylistMode = content?.id === 'm1' || content?.id === 'mood-0' || content?.id === 'mood-1' || content?.id === 'mood-2' || content?.id === 'soundscape-1';
  const playlistTitle = content?.id === 'm1' ? 'Full Meditation Environment' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : content?.id === 'mood-1' ? 'Deep Focus Environment' : content?.id === 'mood-2' ? 'Happy High Energy Environment' : content?.id === 'soundscape-1' ? 'Focus Frequencies' : '';
  const currentPlaylist = content?.id === 'm1' ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : content?.id === 'mood-1' ? DEEP_FOCUS_TRACKS : content?.id === 'mood-2' ? HAPPY_HIGH_ENERGY_TRACKS : content?.id === 'soundscape-1' ? FOCUS_FREQUENCIES_TRACKS : [];"""

content = content.replace(old_logic, new_logic)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MeditationPlayer to handle Focus Frequencies")
