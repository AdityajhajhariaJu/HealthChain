import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTComponents.tsx', 'utf-8');

content = content.replace(
  /export function MDTReportPanel\(\{\s*intakeData,\s*specialistTranscripts,\s*onRestart,\s*initialReport,\s*onRestartWithFeedback,\s*medicalRecords = \[\] as any\[\],\s*onCaseSaved,\s*onCorrelateInMDT,\s*\}\: any\) \{/,
  `export function MDTReportPanel({
  intakeData,
  specialistTranscripts,
  onRestart,
  initialReport,
  onRestartWithFeedback,
  medicalRecords = [] as any[],
  onCaseSaved,
  onCorrelateInMDT,
  title = 'Collaboration Case Brief',
  subtitle = 'AI-assisted synthesis of your information and specialist perspectives',
}: any) {`
);

content = content.replace(
  />\s*Collaboration Case Brief\s*<\/h2>\s*<p style=\{\{ color: '#64748B', marginTop: '12px', fontSize: isMobile \? '14px' : '16px', fontWeight: 500 \}\}>\s*AI-assisted synthesis of your information and specialist perspectives\s*<\/p>/,
  `>
            {title}
          </h2>
          <p style={{ color: '#64748B', marginTop: '12px', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
            {subtitle}
          </p>`
);

fs.writeFileSync('src/features/mdt/MDTComponents.tsx', content, 'utf-8');
