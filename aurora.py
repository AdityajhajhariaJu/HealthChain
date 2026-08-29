import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the static background gradients with the new animated Aurora Mesh
old_bg = '''.app-shell {
  display: flex;
  height: 100vh; height: 100dvh;
  background: #FAFAFA;
  background-image: 
    radial-gradient(circle at 0% 0%, rgba(240, 253, 244, 0.8) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(233, 213, 255, 0.6) 0%, transparent 50%),
    radial-gradient(circle at 100% 0%, rgba(204, 251, 241, 0.6) 0%, transparent 50%);
}'''

new_bg = '''@keyframes aurora-1 {
  0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
  33% { transform: translate(5%, 8%) rotate(120deg) scale(1.1); }
  66% { transform: translate(-5%, 5%) rotate(240deg) scale(0.9); }
  100% { transform: translate(0%, 0%) rotate(360deg) scale(1); }
}

@keyframes aurora-2 {
  0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
  33% { transform: translate(-8%, -5%) rotate(120deg) scale(1.15); }
  66% { transform: translate(5%, -8%) rotate(240deg) scale(0.85); }
  100% { transform: translate(0%, 0%) rotate(360deg) scale(1); }
}

@keyframes aurora-3 {
  0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
  33% { transform: translate(8%, -8%) rotate(120deg) scale(0.9); }
  66% { transform: translate(-5%, 8%) rotate(240deg) scale(1.1); }
  100% { transform: translate(0%, 0%) rotate(360deg) scale(1); }
}

.app-shell {
  display: flex;
  height: 100vh; height: 100dvh;
  background-color: #F8FAFC;
  position: relative;
  overflow: hidden;
}

.app-shell::before,
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
}

/* Ensure children sit above the absolute background */
.app-shell > * {
  z-index: 1;
}
'''

content = content.replace(old_bg, new_bg)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
