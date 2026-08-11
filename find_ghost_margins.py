import os
import re

def find_ghost_margins(directory):
    pattern = re.compile(r'<(div|motion\.div)[^>]*style=\{\{[^}]*(margin|padding)[^}]*\}\}[^>]*>\s*\{[^}]+\?.*:.*\}', re.DOTALL)
    pattern_and = re.compile(r'<(div|motion\.div)[^>]*style=\{\{[^}]*(margin|padding)[^}]*\}\}[^>]*>\s*\{[^}]+\&\&', re.DOTALL)
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    matches = pattern.finditer(content)
                    for match in matches:
                        print(f"Potential ghost margin (ternary) in {filepath}:")
                        print(match.group(0)[:200] + "...\n")
                        
                    matches_and = pattern_and.finditer(content)
                    for match in matches_and:
                        print(f"Potential ghost margin (&&) in {filepath}:")
                        print(match.group(0)[:200] + "...\n")

find_ghost_margins('src')
