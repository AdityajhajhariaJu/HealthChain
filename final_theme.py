import re

trophy = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/TrophyCabinet.tsx'
progress = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ProgressGallery.tsx'

with open(trophy, 'r', encoding='utf-8') as f:
    tc = f.read()

tc = tc.replace("backgroundColor: '#0F172A'", "backgroundColor: '#FBF9F6'")
tc = tc.replace("background: `linear-gradient(135deg, #1E293B 0%, #0F172A 100%)`", "background: `linear-gradient(135deg, #FFFFFF 0%, #FBF9F6 100%)`")
tc = tc.replace("'white'", "'#0F172A'")
tc = tc.replace("'#FFFFFF'", "'#0F172A'")
tc = tc.replace("color: '#94A3B8'", "color: '#64748B'")
tc = tc.replace("color: 'rgba(255, 255, 255, 0.7)'", "color: '#64748B'")
tc = tc.replace("color: 'rgba(255,255,255,0.7)'", "color: '#64748B'")
tc = tc.replace("rgba(255, 255, 255, 0.1)", "rgba(0,0,0,0.05)")
tc = tc.replace("rgba(255,255,255,0.1)", "rgba(0,0,0,0.05)")
tc = tc.replace("rgba(255, 255, 255, 0.15)", "rgba(255,255,255,0.8)")
tc = tc.replace("rgba(255,255,255,0.05)", "rgba(0,0,0,0.02)")
tc = tc.replace("border: '1px solid #334155'", "border: '1px solid #E2E8F0'")
tc = tc.replace("#1E293B", "#FFFFFF")

with open(trophy, 'w', encoding='utf-8') as f:
    f.write(tc)

with open(progress, 'r', encoding='utf-8') as f:
    pg = f.read()

pg = pg.replace("backgroundColor: '#F8FAFC'", "backgroundColor: '#FBF9F6'")
pg = pg.replace("background: '#0F172A'", "background: '#FFFFFF'")

radar_part = pg.find('Tab 2: Balance Radar')
if radar_part != -1:
    before = pg[:radar_part]
    after = pg[radar_part:]
    after = after.replace("color: 'white'", "color: '#0F172A'")
    after = after.replace("color: '#94A3B8'", "color: '#64748B'")
    after = after.replace("rgba(255, 255, 255, 0.1)", "rgba(0,0,0,0.05)")
    after = after.replace("rgba(255,255,255,0.1)", "rgba(0,0,0,0.05)")
    pg = before + after

with open(progress, 'w', encoding='utf-8') as f:
    f.write(pg)

print('Updated theme selectively')
