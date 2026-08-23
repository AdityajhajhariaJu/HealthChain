with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_text = """                {!isUser ? (
                  <span dangerouslySetInnerHTML={{ __html: (displayText || '').replace(/\\n/g, '<br/>') }} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: highlightAnomalies(displayText) }} />
                )}"""

new_text = """                {!isUser && parsed?.internalThoughts && (
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
                        {parsed.currentHypotheses?.map((hyp: any, idx: number) => (
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

content = content.replace(old_text, new_text)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
