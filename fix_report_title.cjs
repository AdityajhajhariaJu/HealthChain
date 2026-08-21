const fs = require('fs');
let content = fs.readFileSync('src/features/mdt/MDTComponents.tsx', 'utf-8');

// Replace function definition
content = content.replace(
  /export function MDTReportPanel\(\{\n\s*intakeData,\n\s*specialistTranscripts,\n\s*onRestart,\n\s*initialReport,\n\s*onRestartWithFeedback,\n\s*medicalRecords = \[\] as any\[\],\n\s*onCaseSaved,\n\s*onCorrelateInMDT,\n\s*\}\: any\) \{/,
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
    subtitle = 'AI-assisted synthesis of your information and specialist perspectives'
  }: any) {`
);

// Replace hardcoded title
const oldTitleBlock = `<h2
              style={{
                margin: 0,
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-1px',
              }}
            >
              Collaboration Case Brief
            </h2>
            <p style={{ color: '#64748B', marginTop: '12px', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
              AI-assisted synthesis of your information and specialist perspectives
            </p>`;

const newTitleBlock = `<h2
              style={{
                margin: 0,
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-1px',
              }}
            >
              {title}
            </h2>
            <p style={{ color: '#64748B', marginTop: '12px', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
              {subtitle}
            </p>`;

content = content.replace(oldTitleBlock, newTitleBlock);
fs.writeFileSync('src/features/mdt/MDTComponents.tsx', content, 'utf-8');
