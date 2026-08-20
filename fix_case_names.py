import re

with open('src/services/CaseEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update saveReviewSnapshot to smartly rename cases based on primary condition
old_save_logic = """  const snapshot: ReviewSnapshot = {
    id: id(),
    type,
    createdAt: now,
    parentReviewId,
    basedOn: { evidenceIds: basedOnEvidenceIds, reviewIds: basedOnReviewIds },
    specialists,
    transcripts,
    report,
    readiness,
  };"""

new_save_logic = """  let updatedTitle = existing.title;
  const primaryCondition = report?.topDiagnoses?.[0]?.condition;
  if (primaryCondition) {
    if (existing.title.startsWith('Quick Consult:') || existing.title.endsWith('...')) {
      updatedTitle = `${primaryCondition} Investigation`;
    }
  }

  const snapshot: ReviewSnapshot = {
    id: id(),
    type,
    createdAt: now,
    parentReviewId,
    basedOn: { evidenceIds: basedOnEvidenceIds, reviewIds: basedOnReviewIds },
    specialists,
    transcripts,
    report,
    readiness,
  };"""

content = content.replace(old_save_logic, new_save_logic)

# Also ensure the updated case item includes the new title
old_updated_case = """  const updated: CaseItem = {
    ...existing,
    reviews: [...(existing.reviews || []), snapshot],
    currentSummary: report,
    updatedAt: now,
    currentStage: type === 'mdt' ? 'mdt_complete' : 'parallel_complete',
    events: [
      { id: id(), date: now, label: type === 'mdt' ? 'MDT Board Synthesis' : 'Specialist Review', note: `A new ${type === 'mdt' ? 'collaborative' : 'parallel'} report was finalized.` },
      ...(existing.events || [])
    ].slice(0, 100),
  };"""

new_updated_case = """  const updated: CaseItem = {
    ...existing,
    title: updatedTitle,
    reviews: [...(existing.reviews || []), snapshot],
    currentSummary: report,
    updatedAt: now,
    currentStage: type === 'mdt' ? 'mdt_complete' : 'parallel_complete',
    events: [
      { id: id(), date: now, label: type === 'mdt' ? 'MDT Board Synthesis' : 'Specialist Review', note: `A new ${type === 'mdt' ? 'collaborative' : 'parallel'} report was finalized.` },
      ...(existing.events || [])
    ].slice(0, 100),
  };"""

content = content.replace(old_updated_case, new_updated_case)

with open('src/services/CaseEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)
