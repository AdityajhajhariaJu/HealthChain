with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_debate = """  if (isDebating || !conferenceData) {
    const s1 = selectedSpecialists[0];
    const s2 = selectedSpecialists[1] || s1;
    const debateMessages = [
      { id: 1, sender: s1, text: `I've analyzed the case context and preliminary findings. The structural anomalies seem pronounced.`, time: 500 },
      { id: 2, sender: s2, text: `Agreed. However, we must correlate this with the biochemical markers to rule out systemic issues.`, time: 2300 },
      { id: 3, sender: s1, text: `That's a valid point. I'll integrate those variables into my differential model.`, time: 4100 },
      { id: 4, sender: s2, text: `Perfect. I'm finalizing the joint action plan now.`, time: 5900 },
      { id: 5, sender: null, text: `Generating Board Consensus...`, time: 7700 }
    ];"""

new_debate = """  if (isDebating || !conferenceData) {
    const s1 = selectedSpecialists[0];
    const s2 = selectedSpecialists[1] || s1;
    
    const debateMessages = selectedSpecialists.length === 1 ? [
      { id: 1, sender: s1, text: `I'm analyzing the updated case context and new findings.`, time: 500 },
      { id: 2, sender: s1, text: `Correlating your previous records with the new inputs...`, time: 2300 },
      { id: 3, sender: s1, text: `Synthesizing the final diagnostic impression and action plan.`, time: 4100 },
      { id: 4, sender: null, text: `Generating Follow-up Report...`, time: 5900 }
    ] : [
      { id: 1, sender: s1, text: `I've analyzed the case context and preliminary findings. The structural anomalies seem pronounced.`, time: 500 },
      { id: 2, sender: s2, text: `Agreed. However, we must correlate this with the biochemical markers to rule out systemic issues.`, time: 2300 },
      { id: 3, sender: s1, text: `That's a valid point. I'll integrate those variables into my differential model.`, time: 4100 },
      { id: 4, sender: s2, text: `Perfect. I'm finalizing the joint action plan now.`, time: 5900 },
      { id: 5, sender: null, text: `Generating Board Consensus...`, time: 7700 }
    ];"""

content = content.replace(old_debate, new_debate)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
