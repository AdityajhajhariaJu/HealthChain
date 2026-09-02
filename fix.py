import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_vars = """  const isPlaylistMode = isPlaylistMode || content?.id === 'mood-0';
  const playlistTitle = isPlaylistMode ? 'Full Meditation Environment' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : '';
  const currentPlaylist = isPlaylistMode ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : [];"""

good_vars = """  const isPlaylistMode = content?.id === 'm1' || content?.id === 'mood-0';
  const playlistTitle = content?.id === 'm1' ? 'Full Meditation Environment' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : '';
  const currentPlaylist = content?.id === 'm1' ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : [];"""

content = content.replace(bad_vars, good_vars)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed variable definitions")
