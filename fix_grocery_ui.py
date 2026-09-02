import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_grocery_buttons = """              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={copyGroceryListText}"""

new_grocery_buttons = """              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleGenerateGrocery}
                  disabled={isGeneratingGrocery}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    flex: isMobile ? 1 : 'unset',
                    justifyContent: 'center',
                    opacity: isGeneratingGrocery ? 0.7 : 1
                  }}
                >
                  {isGeneratingGrocery ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {isGeneratingGrocery ? 'Generating...' : 'Auto-Generate'}
                </button>
                <button
                  onClick={copyGroceryListText}"""

content = content.replace(old_grocery_buttons, new_grocery_buttons)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Auto-Generate button")
