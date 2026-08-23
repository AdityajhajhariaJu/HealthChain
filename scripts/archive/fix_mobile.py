import os

def fix_mdt_components():
    filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/mdt/MDTComponents.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Action buttons
    content = content.replace(
        "style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '16px', marginBottom: '32px' }}",
        "style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: '16px', marginBottom: '32px' }}"
    )
    
    # 2. mdt-report-content padding
    content = content.replace(
        "<div id=\"mdt-report-content\" style={{ padding: '0 20px 20px 20px' }}>",
        "<div id=\"mdt-report-content\" style={{ padding: isMobile ? '0' : '0 20px 20px 20px' }}>"
    )

    # 3. MDT Case Brief header
    content = content.replace(
        "              fontSize: '42px',\n              fontWeight: 900,\n              color: '#0F172A',\n              margin: 0,\n              letterSpacing: '-1px',\n            }}\n          >\n            MDT Case Brief",
        "              fontSize: isMobile ? '32px' : '42px',\n              fontWeight: 900,\n              color: '#0F172A',\n              margin: 0,\n              letterSpacing: '-1px',\n            }}\n          >\n            MDT Case Brief"
    )

    # 4. grid layout for Pathways
    content = content.replace(
        "gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',",
        "gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',"
    )

    # 5. Make action buttons full width on mobile
    content = content.replace(
        "          <button\n            onClick={onCorrelateInMDT}\n            style={{\n              padding: '12px 24px',\n              background: '#ECFDF5',\n              color: '#047857',\n              border: '1px solid #A7F3D0',\n              borderRadius: '999px',\n              fontWeight: 800,\n              cursor: 'pointer',\n              fontSize: '14px',\n            }}\n          >",
        "          <button\n            onClick={onCorrelateInMDT}\n            style={{\n              padding: '12px 24px',\n              background: '#ECFDF5',\n              color: '#047857',\n              border: '1px solid #A7F3D0',\n              borderRadius: '999px',\n              fontWeight: 800,\n              cursor: 'pointer',\n              fontSize: '14px',\n              width: isMobile ? '100%' : 'auto',\n            }}\n          >"
    )
    
    content = content.replace(
        "            padding: '12px 24px',\n            background: '#F8FAFC',\n            color: '#0F172A',\n            border: '1px solid #E2E8F0',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n          }}\n          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}\n          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}\n        >\n          Download PDF",
        "            padding: '12px 24px',\n            background: '#F8FAFC',\n            color: '#0F172A',\n            border: '1px solid #E2E8F0',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n            width: isMobile ? '100%' : 'auto',\n          }}\n          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}\n          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}\n        >\n          Download PDF"
    )

    content = content.replace(
        "            padding: '12px 24px',\n            background: '#F8FAFC',\n            color: '#0F172A',\n            border: '1px solid #E2E8F0',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n          }}\n          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}\n          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}\n        >\n          Export JSON",
        "            padding: '12px 24px',\n            background: '#F8FAFC',\n            color: '#0F172A',\n            border: '1px solid #E2E8F0',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n            width: isMobile ? '100%' : 'auto',\n          }}\n          onMouseOver={(e) => (e.currentTarget.style.background = '#F1F5F9')}\n          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}\n        >\n          Export JSON"
    )

    content = content.replace(
        "            padding: '12px 24px',\n            background: '#0F172A',\n            color: '#FFF',\n            border: 'none',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n            boxShadow: '0 4px 12px rgba(15,23,42,0.2)',\n          }}\n        >\n          Start New Case",
        "            padding: '12px 24px',\n            background: '#0F172A',\n            color: '#FFF',\n            border: 'none',\n            borderRadius: '999px',\n            fontWeight: 700,\n            cursor: 'pointer',\n            fontSize: '14px',\n            transition: 'all 0.2s',\n            boxShadow: '0 4px 12px rgba(15,23,42,0.2)',\n            width: isMobile ? '100%' : 'auto',\n          }}\n        >\n          Start New Case"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed MDTComponents.tsx')

def fix_multi_specialist():
    filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/mdt/MultiSpecialist.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Parallel Diagnostic Analysis header
    content = content.replace(
        "              fontSize: '42px',\n              fontWeight: 900,\n              color: '#0F172A',\n              margin: '0 0 16px 0',\n              letterSpacing: '-1px',\n            }}\n          >\n            Parallel Diagnostic Analysis",
        "              fontSize: isMobile ? '32px' : '42px',\n              fontWeight: 900,\n              color: '#0F172A',\n              margin: '0 0 16px 0',\n              letterSpacing: '-1px',\n            }}\n          >\n            Parallel Diagnostic Analysis"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed MultiSpecialist.tsx')

fix_mdt_components()
fix_multi_specialist()
