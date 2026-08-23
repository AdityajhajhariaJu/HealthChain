import fs from 'fs';

let content = fs.readFileSync('src/components/ui/RichReportTemplate.tsx', 'utf-8');

const newFields = `
        {report.scientificLiteratureContext && (
          <div style={{ background: '#F5F3FF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #DDD6FE' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#5B21B6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#7C3AED" /> Scientific Literature Context
            </h3>
            <p style={{ margin: 0, color: '#5B21B6', fontSize: '14.5px', lineHeight: 1.6 }}>
              {report.scientificLiteratureContext}
            </p>
          </div>
        )}

        {report.alternativeOrRarePossibilities && (
          <div style={{ background: '#FFFBEB', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #FDE68A' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#92400E', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#D97706" /> Alternative & Rare Possibilities
            </h3>
            <p style={{ margin: 0, color: '#92400E', fontSize: '14.5px', lineHeight: 1.6 }}>
              {report.alternativeOrRarePossibilities}
            </p>
          </div>
        )}
`;

// Insert the new fields just before report.nextSteps
content = content.replace(
  /\{report\.nextSteps && \(/,
  newFields + '\n        {report.nextSteps && ('
);

fs.writeFileSync('src/components/ui/RichReportTemplate.tsx', content, 'utf-8');
