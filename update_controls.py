import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Open playlist by default for m1
content = content.replace("const [showPlaylist, setShowPlaylist] = useState(false);", "const [showPlaylist, setShowPlaylist] = useState(content?.id === 'm1');")

# 2. Close playlist on track select
content = content.replace("onClick={() => { setActiveTrackIndex(idx); setIsPlaying(true); }}", "onClick={() => { setActiveTrackIndex(idx); setIsPlaying(true); setShowPlaylist(false); }}")

# 3. Calm animation instead of breathwork phase for m1
old_animation = """                <motion.div
                  animate={{ scale: phase === "Inhale" || phase === "Hold" ? 2.5 : 1 }}
                  transition={{ 
                    duration: phase === "Inhale" ? pattern.inhale : phase === "Exhale" ? pattern.exhale : 2, 
                    ease: "easeInOut" 
                  }}"""

new_animation = """                <motion.div
                  animate={{ scale: content?.id === 'm1' ? (isPlaying ? [1, 1.2, 1] : 1) : (phase === "Inhale" || phase === "Hold" ? 2.5 : 1) }}
                  transition={{ 
                    duration: content?.id === 'm1' ? 8 : (phase === "Inhale" ? pattern.inhale : phase === "Exhale" ? pattern.exhale : 2), 
                    ease: "easeInOut",
                    repeat: content?.id === 'm1' && isPlaying ? Infinity : 0
                  }}"""
content = content.replace(old_animation, new_animation)

# 4. Replace 15s skip with Prev/Next track for m1
# We need to find the controls container.
controls_regex = r'<div style=\{\{ display: "flex", justifyContent: "center", alignItems: "center", gap: "32px", marginBottom: "32px" \}\}>.*?</button>\s*</div>'

new_controls = """<div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "32px", marginBottom: "32px", position: "relative" }}>
                      {/* Previous Track / Rewind */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerHapticLight(); 
                          if (content?.id === 'm1') {
                            setActiveTrackIndex(prev => prev > 0 ? prev - 1 : MEDITATION_TRACKS.length - 1);
                          } else {
                            setTimeRemaining(prev => Math.min(totalDuration, prev + 15)); 
                          }
                        }}
                        style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        {content?.id === 'm1' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path><text x="12" y="15" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.8)" strokeWidth="0">15</text></svg>
                        )}
                      </button>
                      
                      {/* Play / Pause */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setIsPlaying(!isPlaying); }}
                        style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        {isPlaying ? <Pause size={28} fill="#000" color="#000" /> : <Play size={28} fill="#000" color="#000" style={{ marginLeft: "3px" }} />}
                      </button>

                      {/* Next Track / Forward */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerHapticLight(); 
                          if (content?.id === 'm1') {
                            setActiveTrackIndex(prev => prev < MEDITATION_TRACKS.length - 1 ? prev + 1 : 0);
                          } else {
                            setTimeRemaining(prev => Math.max(0, prev - 15)); 
                          }
                        }}
                        style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        {content?.id === 'm1' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path><text x="12" y="15" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.8)" strokeWidth="0">15</text></svg>
                        )}
                      </button>
                      
                      {/* Tracks Button (Only for m1) */}
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

content = re.sub(controls_regex, new_controls, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated player controls and animation")
