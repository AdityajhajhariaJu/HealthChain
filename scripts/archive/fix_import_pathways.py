with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import = """  const handleImportCase = (pastCase: any) => {
    const prevSummary = pastCase.report?.executiveSummary || pastCase.title || '';
    const prevFindings = pastCase.report?.keyFindings || '';
    setComplaint(`[FOLLOW-UP FROM PREVIOUS EVALUATION]
Previous Summary: ${prevSummary}
${prevFindings ? `Previous Findings: ${prevFindings}\\n` : ''}
New Information / Changes in Symptoms since last evaluation:
- `);
    setShowImportModal(false);
  };"""

new_import = """  const handleImportCase = (pastCase: any) => {
    const prevSummary = pastCase.report?.executiveSummary || pastCase.title || '';
    const prevFindings = pastCase.report?.keyFindings || '';
    const prevPathways = (pastCase.report?.topDiagnoses || [])
      .map((d: any) => `- ${d.condition} (Confidence: ${d.probability}%)\\n  Supporting Evidence: ${(d.supportingEvidence || []).join(', ')}`)
      .join('\\n');
      
    setComplaint(`[FOLLOW-UP FROM PREVIOUS EVALUATION]
Previous Summary: ${prevSummary}
${prevFindings ? `Previous Findings: ${prevFindings}\\n` : ''}
${prevPathways ? `Previous Pathways Investigated:\\n${prevPathways}\\n` : ''}
New Information / Changes in Symptoms since last evaluation:
- `);
    setShowImportModal(false);
  };"""

content = content.replace(old_import, new_import)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
