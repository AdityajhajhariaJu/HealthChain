import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_css = '''
.app-shell::before,
.app-shell::after,
.app-shell-mesh {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  z-index: 0;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.95;
  filter: saturate(130%);
}

.app-shell::before {
  background: radial-gradient(circle at 30% 30%, rgba(20, 184, 166, 0.35) 0%, transparent 45%);
  animation: aurora-1 28s infinite linear;
}

.app-shell::after {
  background: radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.28) 0%, transparent 50%);
  animation: aurora-2 35s infinite linear reverse;
}

.app-shell-mesh {
  background: radial-gradient(circle at 40% 80%, rgba(14, 165, 233, 0.28) 0%, transparent 45%);
  animation: aurora-3 32s infinite linear;
}
'''

new_css = '''
.app-shell::before,
.app-shell::after,
.app-shell-mesh {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  z-index: 0;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.6;
  filter: blur(60px);
}

.app-shell::before {
  background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 45%);
  animation: aurora-1 28s infinite linear;
}

.app-shell::after {
  background: radial-gradient(circle at 70% 60%, rgba(34, 197, 94, 0.12) 0%, transparent 50%);
  animation: aurora-2 35s infinite linear reverse;
}

.app-shell-mesh {
  background: radial-gradient(circle at 40% 80%, rgba(20, 184, 166, 0.12) 0%, transparent 45%);
  animation: aurora-3 32s infinite linear;
}
'''

if old_css.strip() in css:
    css = css.replace(old_css.strip(), new_css.strip())
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS updated perfectly.")
else:
    print("Could not find the old CSS block to replace.")
