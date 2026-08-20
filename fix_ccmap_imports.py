with open('src/components/ui/CaseConnectionMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_imports = "import { GitMerge, AlertCircle, HelpCircle, Activity, HeartPulse, Sparkles, AlertTriangle } from 'lucide-react';"
new_imports = "import { GitMerge, AlertCircle, HelpCircle, Activity, HeartPulse, Sparkles, AlertTriangle, Stethoscope, Users } from 'lucide-react';"

content = content.replace(old_imports, new_imports)

with open('src/components/ui/CaseConnectionMap.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
