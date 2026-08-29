import re

with open('src/features/consultation/QuickConsult.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'JarvisCoreOrange' not in content:
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { JarvisCoreOrange } from '../../components/ui/JarvisCoreIconOrange';")

# 2. Add animation container inside the hero card
old_hero = '''            style={{
              background: '#FFFFFF',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>'''

new_hero = '''            style={{
              background: '#FFFFFF',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              right: isMobile ? '-30px' : '0px',
              transform: 'translateY(-50%)',
              zIndex: 0,
              pointerEvents: 'none',
              opacity: isMobile ? 0.3 : 0.8,
            }}>
              <JarvisCoreOrange size={isMobile ? 180 : 250} />
            </div>
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div style={{ maxWidth: isMobile ? '100%' : '65%' }}>'''

content = content.replace(old_hero, new_hero)

with open('src/features/consultation/QuickConsult.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected JarvisCoreOrange into Quick Consult")
