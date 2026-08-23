with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_selection = """      const ids = (await selectMDTSpecialists(enhancedComplaint)) || [];
      const matched = ALL_SPECIALISTS.filter((s) => ids.includes(s.id));
      const finalSelection = matched.length > 0 ? matched : ALL_SPECIALISTS.slice(0, 3);"""

new_selection = """      let finalSelection;
      if (enhancedComplaint.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]')) {
        finalSelection = [
          {
            id: 'ai_followup',
            label: 'AI Specialist',
            icon: BrainCircuit,
            color: '#8B5CF6',
            description: 'Advanced Follow-up Specialist focusing on your cross-questions and new findings.',
          }
        ];
      } else {
        const ids = (await selectMDTSpecialists(enhancedComplaint)) || [];
        const matched = ALL_SPECIALISTS.filter((s) => ids.includes(s.id));
        finalSelection = matched.length > 0 ? matched : ALL_SPECIALISTS.slice(0, 3);
      }"""

content = content.replace(old_selection, new_selection)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
