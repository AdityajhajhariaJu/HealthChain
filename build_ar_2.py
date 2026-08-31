# -*- coding: utf-8 -*-
import sys

# Modify Dietician.tsx
with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    dietician_content = f.read()

fab_code = '''
        {/* AR Lens FAB */}
        <button
          onClick={() => { triggerHapticLight(); setShowARLens(true); }}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 12px 24px rgba(16, 185, 129, 0.4)',
            border: 'none',
            color: '#FFF',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 900,
            transition: 'transform 0.2s'
          }}
        >
          <Scan size={24} />
        </button>

        {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}
      </div>
    </div>
  );
}
'''

replace_target = '''      </div>
    </div>
  );
}'''

dietician_content = dietician_content.replace(replace_target, fab_code)

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(dietician_content)

print('Done')
