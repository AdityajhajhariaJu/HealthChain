import re

with open('src/services/CaseEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace `getCases()`
# Find the start of getCases and the end of it.
get_cases_start = content.find('export function getCases(): CaseItem[] {')
# find the next export function
get_cases_end = content.find('\nexport async function save(', get_cases_start)
if get_cases_end == -1:
    get_cases_end = content.find('\nlet syncTimeout', get_cases_start)

replacement_get_cases = """export function getCases(): CaseItem[] {
  return cachedCases || [];
}
"""

content = content[:get_cases_start] + replacement_get_cases + content[get_cases_end:]

# 2. Replace `save()`
save_start = content.find('async function save(cases: CaseItem[]) {')
save_end = content.find('export function getActiveCaseId(): string | null {', save_start)

replacement_save = """async function save(cases: CaseItem[]) {
  const safeCases = JSON.parse(JSON.stringify(cases));
  
  // Find changed cases by checking updatedAt or lengths
  const changedCases = safeCases.filter((c: any) => {
    if (!cachedCases) return true;
    const old = cachedCases.find(o => o.id === c.id);
    return !old || old.updatedAt !== c.updatedAt || old.events?.length !== c.events?.length;
  });
  
  cachedCases = safeCases;
  window.dispatchEvent(new Event('hc_cases_updated'));

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const currentProfileId = getActiveProfileId();
    // Write only changed cases
    for (const c of (changedCases.length > 0 ? changedCases : safeCases)) {
       const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
       if (!isUUID) continue;
       
       supabase.from('cases').upsert({
          id: c.id,
          user_id: session.user.id,
          title: c.title,
          status: c.status,
          specialty: c.currentStage,
          data: { ...c, __profileId: currentProfileId },
          updated_at: new Date(c.updatedAt || new Date()).toISOString()
       }).then(({error}) => {
          if (error) console.error("Failed to upsert case", error);
       });
    }
    // ensure no big blob in localStorage
    removeItemSync(getCasesKey());
  } else {
    // Guest - cap at 3 cases
    const capped = safeCases.slice(0, 3);
    setItemSync(getCasesKey(), JSON.stringify(capped));
  }
}

"""

content = content[:save_start] + replacement_save + content[save_end:]

# 3. Replace syncCasesFromSupabase with initCaseEngine
sync_start = content.find('export async function syncCasesFromSupabase() {')
sync_end = content.find('\nexport function updateCaseConnectionMap', sync_start)

replacement_sync = """export async function initCaseEngine() {
  const { data: { session } } = await supabase.auth.getSession();
  const key = getCasesKey();
  const currentProfileId = getActiveProfileId();
  
  if (session?.user) {
    // Migration: upload existing local cases
    const localRaw = getItemSync(key);
    if (localRaw) {
      try {
        const localCases = JSON.parse(localRaw);
        if (Array.isArray(localCases) && localCases.length > 0) {
          for (const c of localCases) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
            if (!isUUID) continue;
            await supabase.from('cases').upsert({
              id: c.id,
              user_id: session.user.id,
              title: c.title,
              status: c.status,
              specialty: c.currentStage,
              data: { ...c, __profileId: currentProfileId },
              updated_at: new Date(c.updatedAt || new Date()).toISOString()
            });
          }
        }
      } catch (e) {
        console.error('Migration failed', e);
      }
      removeItemSync(key);
    }
    
    // Fetch from Supabase
    const { data, error } = await supabase
       .from('cases')
       .select('data')
       .eq('user_id', session.user.id)
       .order('updated_at', { ascending: false });
       
    if (!error && data) {
       // Filter by profile
       cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
    } else {
       cachedCases = [];
    }
  } else {
    // Guest
    const localRaw = getItemSync(key);
    try {
      cachedCases = JSON.parse(localRaw || '[]');
    } catch {
      cachedCases = [];
    }
  }
  
  window.dispatchEvent(new Event('hc_cases_updated'));
}

export async function fetchCaseFromCloud(caseId: string): Promise<CaseItem | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase.from('cases').select('data').eq('id', caseId).eq('user_id', session.user.id).single();
  if (error || !data) return null;
  return data.data as CaseItem;
}
"""

content = content[:sync_start] + replacement_sync + content[sync_end:]

# Also initialize cachedCases to [] instead of null
content = content.replace('let cachedCases: CaseItem[] | null = null;', 'let cachedCases: CaseItem[] | null = [];')

with open('src/services/CaseEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)
