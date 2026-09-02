import sys
import re

dashboard_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

dashboard_content = dashboard_content.replace("{ title: 'Happy High Energy', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' }", "{ title: 'Morning Energy', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' }")

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(dashboard_content)
    
player_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\MeditationPlayer.tsx'
with open(player_path, 'r', encoding='utf-8') as f:
    player_content = f.read()

player_content = player_content.replace("'Happy High Energy Environment'", "'Morning Energy Environment'")

with open(player_path, 'w', encoding='utf-8') as f:
    f.write(player_content)
    
print("Renamed Happy High Energy to Morning Energy")
