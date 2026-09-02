import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update import to include DEEP_SLEEP_TRACKS
content = content.replace("import { MEDITATION_TRACKS } from '../../data/MeditationTracks';", "import { MEDITATION_TRACKS, DEEP_SLEEP_TRACKS } from '../../data/MeditationTracks';")

# 2. Extract common playlist variables
state_vars_old = """  const [showPlaylist, setShowPlaylist] = useState(content?.id === 'm1');
  
  const currentTrack = content?.id === 'm1' ? MEDITATION_TRACKS[activeTrackIndex] : null;"""

state_vars_new = """  const isPlaylistMode = content?.id === 'm1' || content?.id === 'mood-0';
  const playlistTitle = content?.id === 'm1' ? 'Full Meditation Environment' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : '';
  const currentPlaylist = content?.id === 'm1' ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : [];

  const [showPlaylist, setShowPlaylist] = useState(isPlaylistMode);
  
  const currentTrack = isPlaylistMode ? currentPlaylist[activeTrackIndex] : null;"""

content = content.replace("  const [showPlaylist, setShowPlaylist] = useState(content?.id === 'm1');\n  \n  const currentTrack = content?.id === 'm1' ? MEDITATION_TRACKS[activeTrackIndex] : null;", state_vars_new)

# 3. Replace all instances of `content?.id === 'm1'` with `isPlaylistMode` (except inside the state initialization which is gone)
content = content.replace("content?.id === 'm1'", "isPlaylistMode")

# 4. Fix track length references inside the Prev/Next buttons
content = content.replace("MEDITATION_TRACKS.length", "currentPlaylist.length")

# 5. Fix the drawer title and list
drawer_header_old = """<h4 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: 600 }}>Full Meditation Environment</h4>"""
drawer_header_new = """<h4 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: 600 }}>{playlistTitle}</h4>"""
content = content.replace(drawer_header_old, drawer_header_new)

drawer_list_old = """                      {MEDITATION_TRACKS.map((track, idx) => ("""
drawer_list_new = """                      {currentPlaylist.map((track, idx) => ("""
content = content.replace(drawer_list_old, drawer_list_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MeditationPlayer to handle Deep Sleep")
