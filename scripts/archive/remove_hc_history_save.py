import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the legacy hc_history write logic
old_save_logic = """
      const stored = localStorage.getItem('hc_history');
      let historyArray = stored ? JSON.parse(stored) : [];
      const newHistoryItem = {
        id: 'mdt-' + Date.now(),
        title: intakeData?.chiefComplaint || 'Advanced Collaborative Consultation',
        date: new Date().toLocaleDateString(),
        type: 'mdt',
        report: data,
      };
      historyArray.unshift(newHistoryItem);
      try { localStorage.setItem('hc_history', JSON.stringify(historyArray)); } catch(e) {}
      window.dispatchEvent(new Event('hc_history_updated'));
"""

content = content.replace(old_save_logic, "\n")

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
