import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

old_css = '''.app-shell::before,
.app-shell::after,
.app-shell-mesh {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  z-index: 0;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.7;
}

.app-shell::before {
  background: radial-gradient(circle at 30% 30%, rgba(20, 184, 166, 0.15) 0%, transparent 35%);
  animation: aurora-1 28s infinite linear;
}

.app-shell::after {
  background: radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.12) 0%, transparent 40%);
  animation: aurora-2 35s infinite linear reverse;
}

.app-shell-mesh {
  background: radial-gradient(circle at 40% 80%, rgba(14, 165, 233, 0.12) 0%, transparent 35%);
  animation: aurora-3 32s infinite linear;
}'''

new_css = '''.app-shell::before,
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
}'''

content = content.replace(old_css, new_css)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
