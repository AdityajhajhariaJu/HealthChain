import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MultiSpecialist.tsx', 'utf-8');

content = content.replace(
  /createCaseDraft\(\{\s*title: intakeText,\s*intakeData: \{ chiefComplaint: intakeText \},\s*specialists: activeSelected\.map\(/,
  `createCaseDraft({
            title: intakeText,
            mode: 'multi',
            intakeData: { chiefComplaint: intakeText },
            specialists: activeSelected.map(`
);

fs.writeFileSync('src/features/mdt/MultiSpecialist.tsx', content, 'utf-8');
