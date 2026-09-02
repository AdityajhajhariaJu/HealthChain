import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for MEDITATION_TRACKS
if "MEDITATION_TRACKS" not in content:
    content = content.replace("import Confetti from 'react-confetti';", "import Confetti from 'react-confetti';\nimport { MEDITATION_TRACKS } from '../../data/MeditationTracks';")

# Add state for current track
if "activeTrackIndex" not in content:
    state_injection = """  const [showControls, setShowControls] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  const currentTrack = content?.id === 'm1' ? MEDITATION_TRACKS[activeTrackIndex] : null;

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio play error:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeTrackIndex, content]);
"""
    content = content.replace("  const [showControls, setShowControls] = useState(true);", state_injection)

# Add audio element and playlist button
playlist_btn = """                    {/* Content Info */}
                    {content?.id === 'm1' && currentTrack && (
                      <audio 
                        ref={audioRef} 
                        src={currentTrack.audioUrl} 
                        loop 
                        autoPlay={isPlaying}
                      />
                    )}"""
content = content.replace("{/* Content Info */}", playlist_btn)

# Replace title and description with track info if m1
title_repl = """                      <h3 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "white", letterSpacing: "-0.5px" }}>
                        {content?.id === 'm1' && currentTrack ? currentTrack.title : content.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                        {content?.id === 'm1' && currentTrack ? currentTrack.subtitle : content.description}
                      </p>"""
import re
content = re.sub(r'<h3.*?>\s*\{content\.title\}\s*</h3>\s*\{content\.description && \(\s*<p.*?>\s*\{content\.description\}\s*</p>\s*\)\}', title_repl, content, flags=re.DOTALL)

# Update background image for m1
bg_repl = """                <img 
                  src={content?.id === 'm1' && currentTrack ? currentTrack.cover : (content.cover_image_url || "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80")} 
                  alt="Ambient" """
content = re.sub(r'<img\s+src=\{content\.cover_image_url \|\| "https://images\.unsplash\.com/[^"]+"\}\s+alt="Ambient"', bg_repl, content, flags=re.DOTALL)


# Add playlist drawer
playlist_drawer = """
              {/* Playlist Drawer */}
              <AnimatePresence>
                {content?.id === 'm1' && showPlaylist && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", zIndex: 30, display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.1)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <h4 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: 600 }}>Full Meditation Environment</h4>
                      <button onClick={() => setShowPlaylist(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: "8px" }}>Close</button>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
                      {MEDITATION_TRACKS.map((track, idx) => (
                        <div 
                          key={track.id} 
                          onClick={() => { setActiveTrackIndex(idx); setIsPlaying(true); }}
                          style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", opacity: activeTrackIndex === idx ? 1 : 0.6 }}
                        >
                          <img src={track.cover} alt={track.title} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: activeTrackIndex === idx ? "#38BDF8" : "white", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{track.title}</div>
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{track.subtitle}</div>
                          </div>
                          {activeTrackIndex === idx && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38BDF8" }} />}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
"""

# Insert playlist drawer before the closing tags
content = content.replace("            </>\n          )}\n        </motion.div>", playlist_drawer + "\n            </>\n          )}\n        </motion.div>")

# Add a button to open playlist
open_playlist_btn = """                      </button>
                      
                      {content?.id === 'm1' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setShowPlaylist(true); }}
                          style={{ position: 'absolute', right: '0', background: "rgba(255,255,255,0.15)", backdropFilter: 'blur(10px)', border: "1px solid rgba(255,255,255,0.2)", borderRadius: '12px', padding: '8px 12px', display: "flex", alignItems: "center", gap: '6px', color: 'white', fontSize: '12px', fontWeight: 600 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                          Tracks
                        </button>
                      )}
                    </div>"""
content = content.replace("                      </button>\n                    </div>", open_playlist_btn)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MeditationPlayer with playlist logic")
