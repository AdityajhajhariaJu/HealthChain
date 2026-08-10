$content = Get-Content src\features\profile\MedicalProfile.tsx
$content = $content -replace "fontSize: '28px',", "fontSize: isMobile ? '24px' : '28px',"
$content = $content -replace "<strong style=\{\{ fontSize: '24px' \}\}>", "<strong style={{ fontSize: isMobile ? '20px' : '24px' }}>"
$content = $content -replace "<span style=\{\{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' \}\}>", "<span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#F8FAFC' }}>"
$content = $content -replace "<div style=\{\{ fontSize: '48px', fontWeight: 800, color: 'var\(--teal\)', lineHeight: 1 \}\}>", "<div style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>"
$content | Set-Content src\features\profile\MedicalProfile.tsx
