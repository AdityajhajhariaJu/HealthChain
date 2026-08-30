import re

file_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\profile\MedicalProfile.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(pattern, start=0):
    for i in range(start, len(lines)):
        if pattern in lines[i]:
            return i
    return -1

# Insert state
use_state_insert = find_line('const isMobile = useIsMobile();')
lines.insert(use_state_insert + 1, '  const [activeTab, setActiveTab] = useState<\'overview\' | \'records\' | \'timeline\' | \'insights\'>(\'overview\');\n')

# Re-evaluate all indices after insertion
def get_idx(pattern, start=0, offset=0, reverse=False):
    if not reverse:
        for i in range(start, len(lines)):
            if pattern in lines[i]:
                return i + offset
    else:
        for i in range(start, -1, -1):
            if pattern in lines[i]:
                return i + offset
    raise Exception(f'Not found: {pattern}')

header_end = get_idx('GAMIFICATION: HEALTH SCORE')
synthesis_start = get_idx('NEW: Holistic Health Synthesis')
profile_ref_start = get_idx('ref={profileRef}') - 1
is_loading_start = get_idx('{isLoading ? (', profile_ref_start)
is_loading_end = get_idx('<>', is_loading_start) + 1

# Left column blocks
patient_id_s = get_idx('1. Patient Identity', is_loading_end)
cond_allergies_s = get_idx('Active Conditions & Allergies', patient_id_s)
smart_refill_s = get_idx('Smart Auto-Refill', cond_allergies_s)
active_cond_s = get_idx('2.5 Active Health Conditions', smart_refill_s)
vitals_s = get_idx('4. Vitals & Biomarkers Dashboard', active_cond_s)
timeline_s = get_idx('6. Medical Timeline', vitals_s)
left_col_end = get_idx('RIGHT COLUMN', timeline_s) - 1

# Timeline ends before the two </div>s that close the Left Column.
timeline_e = left_col_end - 2

# Right column blocks
care_team_s = get_idx('NEW: Care Team & Document Vault', left_col_end)
meds_s = get_idx('3. Active Medications', care_team_s)
actions_s = get_idx('5. Action Items', meds_s)

family_hist_marker = get_idx('<User size={18} color=\"#F59E0B\" /> Family History', actions_s)
family_hist_s = get_idx('<div className=\"card\"', family_hist_marker, reverse=True)
right_col_end_tag = get_idx('</>', family_hist_s) - 1

# Family history ends before the </div> that closes the Right Column.
family_hist_e = right_col_end_tag - 1

profile_ref_end = right_col_end_tag + 2

tabs_ui = '''
      {/* TABS NAVIGATION */}
      <div className="profile-tabs-nav" style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <User size={16} /> },
          { id: 'records', label: 'Records & Vitals', icon: <Activity size={16} /> },
          { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
          { id: 'insights', label: 'Insights', icon: <Sparkles size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'var(--teal)' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-main)',
              border: activeTab === tab.id ? '1px solid var(--teal)' : '1px solid var(--border)',
              fontWeight: 650,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(15, 139, 126, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
'''

overview_content = (
    '<div className={activeTab !== "overview" ? "tab-content-hidden" : ""} style={{ display: activeTab === "overview" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>\n'
    + ''.join(lines[patient_id_s:cond_allergies_s])
    + ''.join(lines[cond_allergies_s:smart_refill_s])
    + ''.join(lines[active_cond_s:vitals_s])
    + ''.join(lines[actions_s:family_hist_s])
    + '</div>\n'
)

records_content = (
    '<div className={activeTab !== "records" ? "tab-content-hidden" : ""} style={{ display: activeTab === "records" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>\n'
    + ''.join(lines[vitals_s:timeline_s])
    + ''.join(lines[smart_refill_s:active_cond_s])
    + ''.join(lines[meds_s:actions_s])
    + ''.join(lines[family_hist_s:family_hist_e+1])
    + '</div>\n'
)

timeline_content = (
    '<div className={activeTab !== "timeline" ? "tab-content-hidden" : ""} style={{ display: activeTab === "timeline" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>\n'
    + ''.join(lines[timeline_s:timeline_e+1])
    + '</div>\n'
)

insights_content = (
    '<div className={activeTab !== "insights" ? "tab-content-hidden" : ""} style={{ display: activeTab === "insights" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>\n'
    + ''.join(lines[synthesis_start:profile_ref_start])
    + ''.join(lines[care_team_s:meds_s])
    + '</div>\n'
)

loading_content = ''.join(lines[is_loading_start:is_loading_end])

new_structure = (
    tabs_ui
    + ''.join(lines[profile_ref_start:is_loading_start])
    + loading_content
    + overview_content
    + records_content
    + timeline_content
    + insights_content
    + ''.join(lines[right_col_end_tag+1:profile_ref_end+1])
)

# Replace the old structure
final_lines = lines[:synthesis_start] + [new_structure] + lines[profile_ref_end+1:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print('Success')
