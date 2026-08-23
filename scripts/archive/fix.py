import os
filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/mdt/MDTComponents.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace("export function MDTReportPanel({\n  intakeData,\n  specialistTranscripts,\n  onRestart,\n  initialReport,\n  onRestartWithFeedback,\n}: any) {\n  const [reportData", "export function MDTReportPanel({\n  intakeData,\n  specialistTranscripts,\n  onRestart,\n  initialReport,\n  onRestartWithFeedback,\n}: any) {\n  const isMobile = useIsMobile();\n  const [reportData")

if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed MDTReportPanel")
else:
    print("Could not find exact string to replace in MDTReportPanel")
