with open('src/features/dashboard/MyCases.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_dash = """                          <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {primary?.condition ? `Leading pathway: ${primary.condition}` : 'Awaiting evidence synthesis'}
                          </p>"""

new_dash = """                          <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {primary?.condition 
                              ? <>Leading pathway: <strong>{primary.condition}</strong> {primary.definition && <span style={{ opacity: 0.8 }}>— {primary.definition}</span>}</>
                              : 'Awaiting evidence synthesis'}
                          </p>"""

content = content.replace(old_dash, new_dash)

with open('src/features/dashboard/MyCases.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
