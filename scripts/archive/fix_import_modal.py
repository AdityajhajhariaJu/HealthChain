import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update useEffect for historyCases to use getCases()
new_use_effect = """
  useEffect(() => {
    try {
      // Migrate to using the central CaseEngine for case history instead of legacy hc_history
      const cases = getCases().filter((c: any) => c.reviews && c.reviews.length > 0);
      
      // Also merge legacy hc_history if any, just in case
      const stored = localStorage.getItem('hc_history');
      let legacyCases = [];
      if (stored) {
         legacyCases = JSON.parse(stored);
      }
      
      // Merge, giving preference to CaseEngine cases
      setHistoryCases([...cases, ...legacyCases.filter((lc: any) => !cases.some((c: any) => c.id === lc.id))]);
    } catch (e) {}
  }, []);
"""
old_use_effect_pattern = r'useEffect\(\(\) => \{\s*try \{\s*const stored = localStorage\.getItem\(\'hc_history\'\);\s*if \(stored\) setHistoryCases\(JSON\.parse\(stored\)\);\s*\} catch \(e\) \{\}\s*\}, \[\]\);'
content = re.sub(old_use_effect_pattern, new_use_effect.strip(), content)


# 2. Update handleImportCase to support pastCase.currentSummary
new_handle_import = """
  const handleImportCase = (pastCase: any) => {
    const report = pastCase.report || pastCase.currentSummary;
    const prevSummary = report?.executiveSummary || pastCase.title || '';
    const prevFindings = report?.keyFindings || '';
    const prevPathways = (report?.topDiagnoses || [])
      .map((d: any) => `- ${d.condition} (Confidence: ${d.probability}%)\\n  Supporting Evidence: ${(d.supportingEvidence || []).join(', ')}`)
      .join('\\n');
"""
old_handle_import_pattern = r'const handleImportCase = \(pastCase: any\) => \{\s*const prevSummary = pastCase\.report\?\.executiveSummary \|\| pastCase\.title \|\| \'\';\s*const prevFindings = pastCase\.report\?\.keyFindings \|\| \'\';\s*const prevPathways = \(pastCase\.report\?\.topDiagnoses \|\| \[\]\)\s*\.map\(\(d: any\) => `- \$\{d\.condition\} \(Confidence: \$\{d\.probability\}%\)\\n  Supporting Evidence: \$\{\(d\.supportingEvidence \|\| \[\]\)\.join\(\', \'\}\)`\)\s*\.join\(\'\\n\'\);'
content = re.sub(r'const handleImportCase = \(pastCase: any\) => \{[\s\S]*?\.join\(\'\\n\'\);', new_handle_import.strip(), content)

# 3. Add formatTitle helper
format_title_fn = """
  const formatTitle = (title: string) => {
    if (!title) return 'Untitled Case';
    if (title.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]')) {
      return 'Follow-up Consultation';
    }
    return title;
  };

  const handleImportCase"""
content = content.replace("  const handleImportCase", format_title_fn)


# 4. Update the modal render to use formatTitle and truncate CSS, and support CaseEngine dates/types
old_modal_title = r'<h4 style=\{\{ margin: \'0 0 6px 0\', fontSize: \'15px\', fontWeight: 700, color: \'#0F172A\' \}\}>\{hc\.title \|\| \'Untitled Case\'\}</h4>'
new_modal_title = r'<h4 style={{ margin: \'0 0 6px 0\', fontSize: \'15px\', fontWeight: 700, color: \'#0F172A\', display: \'-webkit-box\', WebkitLineClamp: 2, WebkitBoxOrient: \'vertical\', overflow: \'hidden\' }}>{formatTitle(hc.title)}</h4>'
content = re.sub(old_modal_title, new_modal_title, content)

old_modal_type = r'\{hc\.type\.toUpperCase\(\)\}'
new_modal_type = r'{(hc.type || hc.mode || \'Case\').toUpperCase()}'
content = re.sub(old_modal_type, new_modal_type, content)

old_modal_date = r'\{hc\.date\}'
new_modal_date = r'{hc.date || (hc.updatedAt ? new Date(hc.updatedAt).toLocaleDateString() : \'\')}'
content = re.sub(old_modal_date, new_modal_date, content)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
