import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the Dashboard Tabs
tabs_pattern = r'\{\s*/\*\s*Dashboard Tabs\s*\*/\s*\}.*?</div>\s*</div>'
content = re.sub(tabs_pattern, '', content, flags=re.DOTALL)

# 2. Remove the "Next: Board consensus" button block
# It looks like:
# {dashboardTab === 'specialists' && (
#    <button
#      onClick={() => { ... setDashboardTab('mdt'); }} ... > ... Next: Board consensus ... </button>
# )}
next_btn_pattern = r'\{dashboardTab === \'specialists\' && \(\s*<button[^>]*?setDashboardTab\(\'mdt\'\)[^>]*?>.*?Next: Board consensus.*?</button>\s*\)\}'
content = re.sub(next_btn_pattern, '', content, flags=re.DOTALL)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
