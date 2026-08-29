with open('src/components/ui/FeedbackWidget.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bottom: isMobile ? 80 : 32,', 'bottom: isMobile ? 110 : 32,')
content = content.replace('bottom: isMobile ? 80 : 96,', 'bottom: isMobile ? 110 : 96,')

with open('src/components/ui/FeedbackWidget.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
