with open('src/services/CaseEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_interface = """export interface Differential {
  id: string;
  condition: string;
  probability: number;
  trend: 'up' | 'down' | 'stable';
  supportingEvidence: string[];
  refutingEvidence: string[];
  nextBestTests: string[];
}"""

new_interface = """export interface Differential {
  id: string;
  condition: string;
  definition?: string;
  probability: number;
  trend: 'up' | 'down' | 'stable';
  supportingEvidence: string[];
  refutingEvidence: string[];
  nextBestTests: string[];
}"""

content = content.replace(old_interface, new_interface)

with open('src/services/CaseEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)
