import re

with open('src/components/ui/CompilingAnimation.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export function CompilingAnimation({ isDark = false }: { isDark?: boolean }) {", "export function CompilingAnimation({ isDark = false, isMobile = false }: { isDark?: boolean; isMobile?: boolean }) {")

# Replace the outer padding
content = content.replace("padding: '40px 20px',", "padding: isMobile ? '20px 10px' : '40px 20px',")
content = content.replace("minHeight: '500px',", "minHeight: isMobile ? '400px' : '500px',")

# Replace icon and header
content = content.replace("width: '80px',\n          height: '80px',", "width: isMobile ? '50px' : '80px',\n          height: isMobile ? '50px' : '80px',")
content = content.replace("<Brain size={40} color=\"#FFF\" />", "<Brain size={isMobile ? 24 : 40} color=\"#FFF\" />")
content = content.replace("fontSize: '24px',", "fontSize: isMobile ? '18px' : '24px',")

# Replace gap
content = content.replace("gap: '12px'", "gap: isMobile ? '8px' : '12px'")

# Replace card padding and fonts
content = content.replace("padding: '12px 16px',", "padding: isMobile ? '8px 12px' : '12px 16px',")
content = content.replace("gap: '16px',", "gap: isMobile ? '10px' : '16px',")

content = content.replace("fontSize: '15px',", "fontSize: isMobile ? '13px' : '15px',")
content = content.replace("fontSize: '13px',", "fontSize: isMobile ? '11px' : '13px',")
content = content.replace("width: 28, height: 28", "width: isMobile ? 24 : 28, height: isMobile ? 24 : 28")

with open('src/components/ui/CompilingAnimation.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
