import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add title and subtitle props
pattern = r"export function MDTReportPanel\(\{(.*?)\}: any\) \{"
replacement = r"export function MDTReportPanel({\1, title = 'Collaboration Case Brief', subtitle = 'AI-assisted synthesis of your information and specialist perspectives'}: any) {"
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Replace the hardcoded title
pattern2 = r"<h2\s+style=\{\{[\s\S]*?\}\}\s*>\s*Collaboration Case Brief\s*<\/h2>\s*<p\s+style=\{\{[\s\S]*?\}\}>\s*AI-assisted synthesis of your information and specialist perspectives\s*<\/p>"
replacement2 = """<h2
              style={{
                margin: 0,
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-1px',
              }}
            >
              {title}
            </h2>
            <p style={{ color: '#64748B', marginTop: '12px', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
              {subtitle}
            </p>"""
content = re.sub(pattern2, replacement2, content)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
