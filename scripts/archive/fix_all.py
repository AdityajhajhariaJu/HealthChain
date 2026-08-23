import re

# 1. Update geminiService.ts
with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_prompt = "select the 3 to 5 most appropriate medical specialists to form a Collaborative Board."
new_prompt = "select the 2 to 4 most highly relevant medical specialists to form a Collaborative Board. Be extremely precise and strict; do not select a specialist unless there is a strong, direct clinical reason based on the specific complaint."
content = content.replace(old_prompt, new_prompt)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update MDTComponents.tsx
with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    mdt_content = f.read()

# Import RichReportTemplate and StreamingMarkdown
import_block = """import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { RichReportTemplate } from '../../components/ui/RichReportTemplate';

export function StreamingMarkdown({ text, isNew, inline = false }: { text: string, isNew: boolean, inline?: boolean }) {
  const [displayed, setDisplayed] = useState(isNew ? '' : text);
  
  useEffect(() => {
    if (!isNew) {
      setDisplayed(text);
      return;
    }
    
    let isMounted = true;
    const stream = async () => {
      let current = '';
      for (let i = 0; i < text.length; i++) {
        if (!isMounted) break;
        current += text[i];
        const delay = Math.floor(Math.random() * 15) + 5;
        await new Promise((r) => setTimeout(r, delay));
        if (isMounted) setDisplayed(current);
      }
    };
    stream();
    return () => { isMounted = false; };
  }, [text, isNew]);

  return <span dangerouslySetInnerHTML={{ __html: displayed.replace(/\\n/g, '<br/>') }} style={{ display: inline ? 'inline' : 'block' }} />;
}
"""
mdt_content = mdt_content.replace("import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';", import_block)


# Remove the sticky header block
# Start from {/* Live Notepad Sidebar/Header Block */}
old_header_regex = r"\{\/\* Live Notepad Sidebar\/Header Block \*\/\}.*?\{\/\* Chat Feed \*\/\}"
mdt_content = re.sub(old_header_regex, "{/* Chat Feed */}", mdt_content, flags=re.DOTALL)

# Insert the thoughts into the chat bubble
old_display_text = """const displayText = isUser ? msg.text : parsed?.response;
            const isLatestAndAI = i === messages.length - 1 && !isUser && status === 'questioning';"""

new_display_text = """const displayText = isUser ? msg.text : parsed?.response;
            const isLatestAndAI = i === messages.length - 1 && !isUser && status === 'questioning';"""

# Inside the chat bubble, replacing the AI message rendering
old_ai_message = """                {!isUser ? (
                  <span dangerouslySetInnerHTML={{ __html: (displayText || '').replace(/\\n/g, '<br/>') }} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: highlightAnomalies(displayText) }} />
                )}"""

new_ai_message = """                {!isUser && parsed?.internalThoughts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginBottom: '16px',
                      padding: '12px 18px',
                      background: `linear-gradient(90deg, ${specialist.color}15 0%, ${specialist.color}05 100%)`,
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${specialist.color}25`,
                      fontSize: '13px',
                      color: '#334155',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ lineHeight: 1.5, letterSpacing: '0.2px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: specialist.color,
                          boxShadow: `0 0 10px ${specialist.color}`,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontWeight: 600, color: specialist.color }}>Background Thought:</span>
                      <StreamingMarkdown text={parsed.internalThoughts} isNew={i === messages.length - 1} inline />
                    </div>
                    {parsed.currentHypotheses && parsed.currentHypotheses.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {parsed.currentHypotheses?.map((hyp, idx) => (
                          <span key={idx} style={{ padding: '4px 8px', background: `${specialist.color}15`, color: specialist.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: `1px solid ${specialist.color}30` }}>
                            {typeof hyp === 'string' ? hyp : hyp.condition}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {!isUser ? (
                  <StreamingMarkdown text={displayText || ''} isNew={i === messages.length - 1} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: highlightAnomalies(displayText) }} />
                )}"""
mdt_content = mdt_content.replace(old_ai_message, new_ai_message)

# Replace Executive Summary with RichReportTemplate in MDTReportPanel
old_exec_summary = """        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
            Executive Summary
          </h3>
          <p style={{ color: '#334155', lineHeight: 1.7, fontSize: isMobile ? '15px' : '17px' }}>
            {report.executiveSummary}
          </p>
        </div>"""

new_exec_summary = """        <div style={{ marginBottom: '32px' }}>
          <RichReportTemplate report={report} isMobile={isMobile} />
        </div>"""
mdt_content = mdt_content.replace(old_exec_summary, new_exec_summary)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(mdt_content)
