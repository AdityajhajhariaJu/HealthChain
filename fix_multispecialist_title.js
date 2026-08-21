import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MultiSpecialist.tsx', 'utf-8');

content = content.replace(
  /<MDTReportPanel\s*intakeData=\{\{\s*chiefComplaint:\s*caseTitle\s*\|\|\s*symptomInput\s*\|\|\s*'Custom Multi-Specialist Intake',\s*\}\}\s*conferenceData=\{\{\}\}\s*finalAnswers=\{\{\}\}\s*medicalRecords=\{medicalRecords\}\s*initialReport=\{finalReport\}/,
  `<MDTReportPanel
              title="Quick Consult Case Brief"
              subtitle="AI-assisted synthesis of multi-specialist perspectives"
              intakeData={{
                chiefComplaint: caseTitle || symptomInput || 'Custom Multi-Specialist Intake',
              }}
              conferenceData={{}}
              finalAnswers={{}}
              medicalRecords={medicalRecords}
              initialReport={finalReport}`
);

fs.writeFileSync('src/features/mdt/MultiSpecialist.tsx', content, 'utf-8');
