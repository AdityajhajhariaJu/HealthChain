import os
import re

root_dir = 'src'

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return
    
    orig = content
    
    # 1. Fix AvaHealthBuddy and similar mobile-responsive primary panels
    pattern_mobile = re.compile(
        r"background:\s*isMobile\s*\?\s*'transparent'\s*:\s*'rgba\(255,\s*255,\s*255,\s*0\.45\)',\s*\n\s*"
        r"backdropFilter:\s*isMobile\s*\?\s*'none'\s*:\s*'blur\(\d+px\)',\s*\n\s*"
        r"WebkitBackdropFilter:\s*isMobile\s*\?\s*'none'\s*:\s*'blur\(\d+px\)',\s*\n\s*"
        r"(.*?)"
        r"border:\s*isMobile\s*\?\s*'none'\s*:\s*'1px solid rgba\(255,\s*255,\s*255,\s*0\.4\)'(.*?)"
        r"(boxShadow:\s*isMobile\s*\?\s*'none'\s*:\s*'[^']+')?",
        re.DOTALL
    )
    
    def repl_mobile(m):
        mid = m.group(1)
        end = m.group(2)
        return (
            "background: isMobile ? 'transparent' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',\n            "
            "backdropFilter: isMobile ? 'none' : 'blur(32px)',\n            "
            "WebkitBackdropFilter: isMobile ? 'none' : 'blur(32px)',\n            "
            + mid +
            "border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.8)',\n            "
            "boxShadow: isMobile ? 'none' : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'"
            + end
        )
        
    content = pattern_mobile.sub(repl_mobile, content)
    
    def style_replacer(m):
        full_style = m.group(0)
        inner = m.group(1)
        
        if 'width: \'40px\'' in inner or 'width: "64px"' in inner or 'width: \'44px\'' in inner or 'width: \'32px\'' in inner:
            return full_style
            
        has_old_gradient = 'linear-gradient(135deg, rgba(255, 255, 255, 0.45)' in inner or 'linear-gradient(135deg, rgba(255,255,255,0.45)' in inner
        has_dense_06 = 'rgba(255, 255, 255, 0.6)' in inner or 'rgba(255,255,255,0.6)' in inner
        
        if not (has_old_gradient or has_dense_06):
            return full_style
            
        if 'backdropFilter' not in inner and 'backdrop-filter' not in inner:
            return full_style
            
        if 'isMobile ?' in inner:
            return full_style
            
        inner = re.sub(r"background:\s*['\"`][^'\"`]*?rgba\(255,\s*255,\s*255,\s*0\.[456]5?\)[^'\"`]*?['\"`],?\s*", "", inner)
        inner = re.sub(r"backdropFilter:\s*['\"`]blur\(\d+px\)['\"`],?\s*", "", inner)
        inner = re.sub(r"WebkitBackdropFilter:\s*['\"`]blur\(\d+px\)['\"`],?\s*", "", inner)
        inner = re.sub(r"border:\s*['\"`][^'\"`]*?['\"`],?\s*", "", inner)
        inner = re.sub(r"boxShadow:\s*['\"`][^'\"`]*?['\"`],?\s*", "", inner)
        
        new_props = (
            "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', "
            "backdropFilter: 'blur(32px)', "
            "WebkitBackdropFilter: 'blur(32px)', "
            "border: '1px solid rgba(255, 255, 255, 0.8)', "
            "boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', "
        )
        
        return "style={{" + new_props + inner.strip() + "}}"

    content = re.sub(r"style=\{\{(.*?)\}\}", style_replacer, content, flags=re.DOTALL)
    
    if orig != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
