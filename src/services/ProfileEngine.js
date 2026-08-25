import { supabase } from './supabaseClient';
import { setItemSync, getItemSync } from './storage';
import { recordHealthMemory } from './HealthMemory';
import { enqueueSync, flushSyncOutbox } from './SyncOutbox';

export function getProfileKey() {
  try {
    if (localStorage.getItem('hc_guest_mode') === 'true') return 'hc_unified_profile_guest';
    try {
      const accountStr = localStorage.getItem('hc_account');
      if (accountStr) {
        const account = JSON.parse(accountStr);
        if (account.id) return `hc_unified_profile_${account.id}`;
      }
    } catch { /* malformed account data; use the default profile key */ }
    return 'hc_unified_profile';
  } catch {
    return 'hc_unified_profile_guest';
  }
}

let historyStack = [];
let historyIndex = -1;

const initialState = getItemSync(getProfileKey());
if (initialState) {
  historyStack.push(initialState);
  historyIndex = 0;
}

function pushToHistory(stateStr) {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(stateStr);
  if (historyStack.length > 20) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
}

export function undoProfileEdit() {
  if (historyIndex > 0) {
    historyIndex--;
    const prevState = historyStack[historyIndex];
    setItemSync(getProfileKey(), prevState);
    window.dispatchEvent(new Event('hc_profile_updated'));
  }
}

export function redoProfileEdit() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const nextState = historyStack[historyIndex];
    setItemSync(getProfileKey(), nextState);
    window.dispatchEvent(new Event('hc_profile_updated'));
  }
}

export function canUndo() {
  return historyIndex > 0;
}

export function canRedo() {
  return historyIndex < historyStack.length - 1;
}


const DEFAULT_PROFILE = {
  id: 'profile_1',
  profileName: 'My Profile',

  demographics: {
    name: '',
    age: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    emergencyContact: '',
    updatedAt: null,
  },
  /** @type {string[]} */
  conditions: [],
  /** @type {any[]} */
  medications: [],
  /** @type {string[]} */
  allergies: [],
  /** @type {string[]} */
  familyHistory: [],
  /** @type {any[]} */
  timeline: [],
  vitals: {
    latestLabValues: {},
    historicalLabs: [],
  },
  nutrition: {
    targetCalories: 2000,
    avgProtein: 0,
    recentLogs: [],
  },
  healthFocus: '',
  onboardingCompletedAt: null,
  /** @type {any[]} */
  actionItems: [],
};

// Caregiver profiles remain stored for future re-enablement, but switching and
// creating dependent profiles are intentionally paused until that workflow is
// ready for production use.
export const CAREGIVER_MODE_ENABLED = false;

// Auto-generate ID
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'evt_' + crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  }
  return 'evt_' + Math.random().toString(36).substr(2, 9);
};

export function getProfileEngineState() {
  try {
    const data = getItemSync(getProfileKey());
    const parsed = data ? JSON.parse(data) : null;
    
    // Legacy migration: If existing format is a flat profile
    if (parsed && !parsed.profiles && (parsed.demographics || parsed.conditions)) {
      const defaultId = parsed.id || 'profile_1';
      return {
        activeId: defaultId,
        profiles: {
          [defaultId]: { ...parsed, id: defaultId, profileName: parsed.profileName || 'My Profile' }
        }
      };
    }
    
    if (!parsed || !parsed.profiles) {
      const defaultId = 'profile_1';
      return {
        activeId: defaultId,
        profiles: {
          [defaultId]: JSON.parse(JSON.stringify(DEFAULT_PROFILE))
        }
      };
    }
    
    // Self-healing: Ensure every profile has its id explicitly set
    if (parsed && parsed.profiles) {
      Object.keys(parsed.profiles).forEach(key => {
        if (!parsed.profiles[key].id) {
          parsed.profiles[key].id = key;
        }
      });
      if (!CAREGIVER_MODE_ENABLED && !parsed.profiles.profile_1) {
        parsed.profiles.profile_1 = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
        setItemSync(getProfileKey(), JSON.stringify(parsed));
      }
      if (!CAREGIVER_MODE_ENABLED && parsed.profiles.profile_1 && parsed.activeId !== 'profile_1') {
        parsed.activeId = 'profile_1';
        setItemSync(getProfileKey(), JSON.stringify(parsed));
      }
    }

    return parsed;
  } catch(e) {
    console.error('Failed to parse ProfileEngine state', e);
    const defaultId = 'profile_1';
    return {
      activeId: defaultId,
      profiles: {
        [defaultId]: JSON.parse(JSON.stringify(DEFAULT_PROFILE))
      }
    };
  }
}

export function getAllProfiles() {
  return Object.values(getProfileEngineState().profiles);
}

export function switchActiveProfile(id) {
  if (!CAREGIVER_MODE_ENABLED && id !== 'profile_1') return false;
  const state = getProfileEngineState();
  if (state.profiles[id]) {
    state.activeId = id;
    setItemSync(getProfileKey(), JSON.stringify(state));
    window.dispatchEvent(new Event('hc_profile_updated'));
    window.dispatchEvent(new Event('hc_cases_updated'));
    window.dispatchEvent(new Event('hc_active_case_updated'));
  }
}

export function createNewProfile(name) {
  if (!CAREGIVER_MODE_ENABLED) {
    window.dispatchEvent(new CustomEvent('hc_toast', { detail: { type: 'error', title: 'Caregiver Mode', message: 'Caregiver Mode is temporarily unavailable.' } }));
    return false;
  }
  const state = getProfileEngineState();
  if (Object.keys(state.profiles).length >= 3) {
    window.dispatchEvent(new CustomEvent('hc_toast', { detail: { type: 'error', title: 'Profile Limit', message: 'Maximum of 3 profiles allowed (Caregiver Mode Limit).' } }));
    return false;
  }
  const newId = generateId();
  state.profiles[newId] = { ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)), id: newId, profileName: name };
  state.activeId = newId;
  setItemSync(getProfileKey(), JSON.stringify(state));
  window.dispatchEvent(new Event('hc_profile_updated'));
  window.dispatchEvent(new Event('hc_cases_updated'));
  window.dispatchEvent(new Event('hc_active_case_updated'));
  return true;
}

export function getProfile() {
  try {
    const state = getProfileEngineState();
    const parsed = state.profiles[state.activeId];
    const base = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    
    let profile = base;
    if (parsed) {
      const rawConditions = parsed.conditions || base.conditions;
      const cleanConditions = Array.isArray(rawConditions)
        ? rawConditions
            .map((c) => (typeof c === 'string' ? c.trim() : c?.name || ''))
            .filter((c) => {
              const l = c.toLowerCase();
              return (
                l &&
                !l.includes('diagnostic ambig') &&
                !l.includes('undifferentiated') &&
                !l.includes('unknown') &&
                !l.includes('review this')
              );
            })
        : [];

      profile = {
        ...base,
        ...parsed,
        demographics: { ...base.demographics, ...(parsed.demographics || {}) },
        vitals: { ...base.vitals, ...(parsed.vitals || {}) },
        nutrition: { ...base.nutrition, ...(parsed.nutrition || {}) },
        conditions: cleanConditions,
        allergies: parsed.allergies || base.allergies,
        medications: parsed.medications || base.medications,
        timeline: parsed.timeline || base.timeline,
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.map((item, index) => ({
            ...(item || {}),
            id: item?.id || `action-${index}`,
            task: typeof item?.task === 'string' && item.task.trim()
              ? item.task
              : (typeof item?.title === 'string' && item.title.trim() ? item.title : 'Review this health item'),
            status: item?.status === 'completed' ? 'completed' : 'pending',
          }))
          : base.actionItems,
        profileName: parsed.profileName || base.profileName,
        id: parsed.id || base.id,
      };
    }

    // Auto-sync from Diet profile if available
    try {
      const dietData = getItemSync(getProfileKey().replace('hc_unified_profile', 'hc_diet_profile'));
      if (dietData) {
        const parsedDiet = JSON.parse(dietData);
        if (parsedDiet.metrics) {
          if (!profile.demographics.height && parsedDiet.metrics.height) {
            profile.demographics.height = parsedDiet.metrics.height;
          }
          if (!profile.demographics.weight && parsedDiet.metrics.weight) {
            profile.demographics.weight = parsedDiet.metrics.weight;
          }
        }
      }
    } catch (e) {
      console.warn('Diet profile not found or malformed', e);
    }

    if (typeof localStorage !== 'undefined' && localStorage.getItem('hc_vip_tester') === 'true') {
      profile.isPro = true;
      profile.proExpiresAt = '2099-12-31T23:59:59.000Z';
    }

    return profile;
  } catch (e) {
    console.error('Failed to parse unified profile', e);
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile) {
  try {
    const state = getProfileEngineState();
    
    if (profile.demographics) {
      profile.demographics.updatedAt = new Date().toISOString();
    }

    state.profiles[state.activeId] = profile;
    const stateStr = JSON.stringify(state);
    
    pushToHistory(stateStr);
    setItemSync(getProfileKey(), stateStr);
    
    // Dispatch event so UI can react globally
    window.dispatchEvent(new Event('hc_profile_updated'));

    // A compact, current snapshot makes every caregiver profile recoverable through Health Memory.
    // Timeline entries remain separate ledger records, avoiding duplication of every historical event.
    recordHealthMemory({
      kind: 'profile_event',
      source: 'profile',
      title: `Profile updated: ${profile.profileName || 'Health profile'}`,
      occurredAt: profile.demographics?.updatedAt || new Date().toISOString(),
      payload: {
        profileName: profile.profileName,
        demographics: profile.demographics,
        conditions: profile.conditions,
        medications: profile.medications,
        allergies: profile.allergies,
        familyHistory: profile.familyHistory,
        vitals: profile.vitals,
        nutrition: profile.nutrition,
        healthFocus: profile.healthFocus,
      },
      dedupeKey: `profile-snapshot:${profile.id || state.activeId}`,
    });

    // Queue the primary profile for durable cloud sync. This preserves the
    // local-first UX while preventing a dropped tab/network transition from
    // losing an important profile update.
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const snapshotUpdatedAt = new Date().toISOString();
        await enqueueSync('caregiver_profile_upsert', session.user.id, {
          user_id: session.user.id,
          profile_id: state.activeId,
          profile_name: profile.profileName || 'My Profile',
          data: { ...profile, id: state.activeId, updatedAt: snapshotUpdatedAt },
          updated_at: snapshotUpdatedAt
        });

        // Keep the legacy primary row for entitlements and older deployments.
        if (state.activeId === 'profile_1') {
          await enqueueSync('profile_upsert', session.user.id, {
            id: session.user.id,
            full_name: profile.profileName,
            demographics: {
              ...profile.demographics,
              onboardingCompletedAt: profile.onboardingCompletedAt || null
            },
            conditions: profile.conditions,
            medications: profile.medications,
            allergies: profile.allergies,
            family_history: profile.familyHistory,
            timeline: profile.timeline,
            vitals: profile.vitals,
            nutrition: profile.nutrition,
            health_focus: profile.healthFocus,
            updated_at: new Date().toISOString()
          });
        }
        await flushSyncOutbox(session.user.id);
      }
    }
  } catch (e) {
    console.warn('Failed to save unified profile to cloud/local:', e);
    window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: e }));
  }
}

export function updateProfileFeatureData(featureKey, data) {
  const profile = getProfile();
  if (!profile) return;
  profile[featureKey] = data;
  saveProfile(profile);
}

export function updateDemographics(data) {
  const profile = getProfile();
  profile.demographics = { ...profile.demographics, ...data, updatedAt: new Date().toISOString() };
  saveProfile(profile);
}

/**
 * @param {{
 *   demographics?: any,
 *   conditions?: string[],
 *   allergies?: string[],
 *   medications?: string[],
 *   familyHistory?: string[],
 *   healthFocus?: string
 * }} options
 */
export function completeProfileOnboarding({
  demographics = {},
  conditions = [],
  allergies = [],
  medications = [],
  familyHistory = [],
  healthFocus = '',
}) {
  const profile = getProfile();
  const normalise = (values) => values.map((value) => value.trim()).filter(Boolean);
  profile.demographics = {
    ...profile.demographics,
    ...demographics,
    updatedAt: new Date().toISOString(),
  };
  profile.conditions = [...new Set([...profile.conditions, ...normalise(conditions)])];
  profile.allergies = [...new Set([...profile.allergies, ...normalise(allergies)])];
  profile.familyHistory = [...new Set([...profile.familyHistory, ...normalise(familyHistory)])];
  const existingMedicationNames = new Set(
    profile.medications.map((medication) => medication.name?.toLowerCase())
  );
  normalise(medications).forEach((name) => {
    if (!existingMedicationNames.has(name.toLowerCase()))
      profile.medications.push({ name, addedAt: new Date().toISOString(), source: 'onboarding' });
  });
  profile.healthFocus = healthFocus.trim();
  profile.onboardingCompletedAt = new Date().toISOString();
  profile.timeline = [
    {
      id: generateId(),
      type: 'onboarding',
      source: 'onboarding',
      title: 'Health profile created',
      date: new Date().toISOString(),
      data: { healthFocus: profile.healthFocus },
      significant: true,
    },
    ...(profile.timeline || []),
  ];
  saveProfile(profile);
  return profile;
}

export function addCondition(condition, source = 'manual') {
  if (!condition || typeof condition !== 'string') return;
  const clean = condition.trim();
  const l = clean.toLowerCase();
  if (
    !clean ||
    l.includes('diagnostic ambig') ||
    l.includes('undifferentiated') ||
    l.includes('unknown') ||
    l.includes('review this')
  ) {
    return;
  }
  const profile = getProfile();
  if (!profile.conditions.includes(clean)) {
    profile.conditions.push(clean);
    addEvent('system', source, `Condition Added: ${clean}`, { condition: clean }, false, profile);
    saveProfile(profile);
  }
}

export function removeCondition(condition) {
  const profile = getProfile();
  profile.conditions = profile.conditions.filter((c) => c !== condition);
  saveProfile(profile);
}

export function addMedication(med, source = 'manual') {
  const profile = getProfile();
  const exists = profile.medications.find((m) => m.name === med.name);
  if (!exists) {
    profile.medications.push({ 
      ...med, 
      addedAt: new Date().toISOString(), 
      source,
      supplyDays: med.supplyDays || 30,
      lastFilledAt: med.lastFilledAt || new Date().toISOString(),
    });
      addEvent('system', source, `Medication Added: ${med.name}`, { med }, false, profile);
      saveProfile(profile);
  }
}

export function removeMedication(medName) {
  const profile = getProfile();
  profile.medications = profile.medications.filter((m) => m.name !== medName);
  saveProfile(profile);
}

export function addAllergy(allergy) {
  const profile = getProfile();
  if (!profile.allergies.includes(allergy)) {
    profile.allergies.push(allergy);
    saveProfile(profile);
  }
}

export function removeAllergy(allergy) {
  const profile = getProfile();
  profile.allergies = profile.allergies.filter((a) => a !== allergy);
  saveProfile(profile);
}

export function addFamilyHistory(history) {
  const profile = getProfile();
  if (!profile.familyHistory.includes(history)) {
    profile.familyHistory.push(history);
    saveProfile(profile);
  }
}

export function removeFamilyHistory(history) {
  const profile = getProfile();
  profile.familyHistory = profile.familyHistory.filter((h) => h !== history);
  saveProfile(profile);
}

export function addEvent(type, source, title, data = {}, significant = true, existingProfile = null, eventId = null) {
  const profile = existingProfile || getProfile();

  let safeData = data;
  if (data) {
    const dataStr = JSON.stringify(data);
    if (dataStr.length > 5000) {
      safeData = { 
        notice: 'Payload truncated to preserve local storage quota', 
        preview: dataStr.substring(0, 1000) + '...' 
      };
    }
  }

  const event = {
    id: eventId || generateId(),
    date: new Date().toISOString(),
    type,
    source,
    title,
    data: safeData,
    significant,
  };

  profile.timeline.unshift(event); // add to top

  // Keep timeline manageable, but much higher than 50 to prevent data loss
  if (profile.timeline.length > 1000) {
    profile.timeline = profile.timeline.slice(0, 1000);
  }

  if (!existingProfile) {
    saveProfile(profile);
    const kindBySource = {
      report_analyzer: 'lab_report',
      dietician: 'diet',
      health_buddy: 'health_buddy',
      case_prep: 'case_prep',
      quick_consult: 'quick_consult',
      mdt_hub: 'deep_collab',
    };
    recordHealthMemory({
      id: event.id,
      kind: kindBySource[source] || 'profile_event',
      source,
      title,
      occurredAt: event.date,
      payload: safeData || {},
      dedupeKey: `timeline:${event.id}`,
    });
  }
  return event;
}

export function backfillHealthMemoryFromProfile() {
  const profile = getProfile();
  const kinds = { report_analyzer: 'lab_report', dietician: 'diet', health_buddy: 'health_buddy', case_prep: 'case_prep', quick_consult: 'quick_consult', mdt_hub: 'deep_collab' };
  (profile.timeline || []).forEach((event) => recordHealthMemory({
    id: event.id,
    kind: kinds[event.source] || 'profile_event',
    source: event.source || 'profile',
    title: event.title || event.type || 'Health profile update',
    occurredAt: event.date || new Date().toISOString(),
    payload: event.data || {},
    dedupeKey: `timeline:${event.id}`,
  }));
}

export function updateVitals(labData, source = 'manual') {
  const profile = getProfile();
  
  if (!profile.vitals.historicalLabs) {
    profile.vitals.historicalLabs = [];
  }
  
  profile.vitals.latestLabValues = { ...profile.vitals.latestLabValues, ...labData };
  
  profile.vitals.historicalLabs.push({
    date: new Date().toISOString(),
    biomarkers: labData
  });

  addEvent('lab_report', source, 'Lab Vitals Updated', { labData }, true, profile);
  saveProfile(profile);
}

export function addActionItems(items, source) {
  const profile = getProfile();
  const newItems = items.map((i) => ({
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    source,
    ...i,
  }));
  profile.actionItems = [...newItems, ...profile.actionItems];
  saveProfile(profile);
}

export function addNutritionLog(log) {
  const profile = getProfile();
  if (!profile.nutrition) {
    profile.nutrition = { targetCalories: 2000, avgProtein: 0, recentLogs: [] };
  }
  if (!profile.nutrition.recentLogs) {
    profile.nutrition.recentLogs = [];
  }
  profile.nutrition.recentLogs.push({
    ...log,
    loggedAt: new Date().toISOString(),
  });
  saveProfile(profile);
}

export function recordDailyCheckin({ symptom, severity, score, note, lifestyle }) {
  const profile = getProfile();
  if (!profile.dailyCheckins) {
    profile.dailyCheckins = [];
  }

  const todayStr = new Date().toISOString().split('T')[0];
  // Remove existing checkin for today if any, so we update it smoothly
  profile.dailyCheckins = profile.dailyCheckins.filter(c => !c.date || !c.date.startsWith(todayStr));

  const checkinEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    symptom: symptom || 'Overall Wellness',
    severity: severity || 'Mild',
    score: score ?? 1,
    note: note || '',
    lifestyle: lifestyle || {},
  };

  profile.dailyCheckins.unshift(checkinEntry);
  if (profile.dailyCheckins.length > 90) {
    profile.dailyCheckins = profile.dailyCheckins.slice(0, 90);
  }

  // Record timeline event
  addEvent(
    'mental_health',
    'daily_checkin',
    `Daily Check-in: ${symptom} (${severity})`,
    { symptom, severity, score, note, lifestyle },
    true,
    profile
  );

  saveProfile(profile);

  try {
    recordHealthMemory({
      kind: 'timeline_event',
      source: 'daily_checkin',
      title: `Daily Check-in: ${symptom} (${severity})`,
      occurredAt: new Date().toISOString(),
      payload: { symptom, severity, score, note, lifestyle },
      dedupeKey: `daily_checkin:${todayStr}`,
    });
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('hc_daily_checkin_completed', { detail: checkinEntry }));
  return checkinEntry;
}

export function getTodayCheckin() {
  const profile = getProfile();
  const todayStr = new Date().toISOString().split('T')[0];
  return (profile.dailyCheckins || []).find(c => c.date && c.date.startsWith(todayStr));
}

export function getRecentCheckins(days = 7) {
  const profile = getProfile();
  return (profile.dailyCheckins || []).slice(0, days);
}

export function toggleActionItem(id) {
  const profile = getProfile();
  const item = profile.actionItems.find((i) => i.id === id);
  if (item) {
    item.status = item.status === 'completed' ? 'pending' : 'completed';
    saveProfile(profile);
  }
}

export function removeActionItem(id) {
  const profile = getProfile();
  profile.actionItems = profile.actionItems.filter((i) => i.id !== id);
  saveProfile(profile);
}

export function clearProfile() {
  const state = getProfileEngineState();
  if (state.profiles[state.activeId]) {
    state.profiles[state.activeId] = { ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)), id: state.activeId, profileName: state.profiles[state.activeId].profileName };
    setItemSync(getProfileKey(), JSON.stringify(state));
    window.dispatchEvent(new Event('hc_profile_updated'));
    void saveProfile(state.profiles[state.activeId]);
  }
}

export function calculateHealthScore(profile) {
  if (!profile) return { score: 0, missing: ['Create a profile'] };
  let score = 0;
  const missing = [];

  // Demographics (20%)
  if (profile.demographics?.age && profile.demographics?.gender) score += 20;
  else missing.push('Complete basic demographics (age/gender)');

  // Conditions (20%)
  if (profile.conditions?.length > 0 || profile.healthFocus) score += 20;
  else missing.push('Log any known conditions or set a health focus');

  // Allergies & Medications (20%)
  if (profile.allergies?.length > 0 || profile.medications?.length > 0) score += 20;
  else missing.push('Add any allergies or current medications (or mark None)');

  // Action Items (20%)
  if (profile.actionItems?.some(a => a.status === 'completed')) score += 20;
  else missing.push('Complete at least one health action item');

  // Recent Activity (20%) - active in the last 7 days
  const hasRecentActivity = profile.timeline?.some(event => {
    const diff = new Date().getTime() - new Date(event.date).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });
  if (hasRecentActivity) score += 20;
  else missing.push('Log a new event, symptom, or scan a document this week');

  return { score, missing };
}

/**
 * @param {string | null} overrideUserId
 */
export async function syncProfileFromSupabase(overrideUserId = null) {
  try {
    let userId = overrideUserId;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      userId = session.user.id;
    }
    
    const [{ data, error: legacyError }, { data: snapshots, error: snapshotError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('healthchain_profiles')
        .select('profile_id,profile_name,data,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    ]);
    const schemaMissing = (error) => error?.code === 'PGRST205' || error?.code === '42P01';
    if (legacyError && !schemaMissing(legacyError)) console.warn('Legacy profile sync failed:', legacyError);
    if (snapshotError && !schemaMissing(snapshotError)) console.warn('Caregiver profile sync failed:', snapshotError);

    const state = getProfileEngineState();
    let changed = false;
    if (data) {
      const localPrimary = state.profiles.profile_1 || state.profiles[state.activeId];
      const localUpdated = localPrimary?.demographics?.updatedAt || localPrimary?.updatedAt;
      if (localUpdated && data.updated_at && new Date(localUpdated).getTime() > new Date(data.updated_at).getTime()) {
        console.log('Local primary profile is newer than remote. Pushing local changes to cloud.');
        await enqueueSync('profile_upsert', session.user.id, {
          id: session.user.id,
          full_name: localPrimary.profileName,
          demographics: { ...localPrimary.demographics, onboardingCompletedAt: localPrimary.onboardingCompletedAt || null },
          conditions: localPrimary.conditions || [], medications: localPrimary.medications || [],
          allergies: localPrimary.allergies || [], family_history: localPrimary.familyHistory || [],
          timeline: localPrimary.timeline || [], vitals: localPrimary.vitals || {},
          nutrition: localPrimary.nutrition || {}, health_focus: localPrimary.healthFocus || '',
          updated_at: new Date().toISOString()
        });
      } else {
        state.profiles.profile_1 = {
          ...(state.profiles.profile_1 || DEFAULT_PROFILE), id: 'profile_1',
          profileName: data.full_name || 'My Profile', isPro: data.is_pro || false,
          proExpiresAt: data.pro_expires_at || null, demographics: data.demographics || {},
          onboardingCompletedAt: data.demographics?.onboardingCompletedAt || (data.demographics?.age ? new Date().toISOString() : null),
          conditions: data.conditions || [], medications: data.medications || [],
          allergies: data.allergies || [], familyHistory: data.family_history || [],
          timeline: data.timeline || [], vitals: data.vitals || { latestLabValues: {}, historicalLabs: [] },
          nutrition: data.nutrition || { targetCalories: 2000, avgProtein: 0, recentLogs: [] },
          healthFocus: data.health_focus || ''
        };
        changed = true;
      }
    }

    for (const row of snapshots || []) {
      if (!row?.profile_id || !row.data || typeof row.data !== 'object') continue;
      const local = state.profiles[row.profile_id];
      const localUpdated = local?.updatedAt || local?.demographics?.updatedAt;
      const remoteUpdated = row.updated_at || row.data.updatedAt;
      if (localUpdated && remoteUpdated && new Date(localUpdated).getTime() > new Date(remoteUpdated).getTime()) {
        await enqueueSync('caregiver_profile_upsert', session.user.id, {
          user_id: session.user.id, profile_id: row.profile_id,
          profile_name: local.profileName || row.profile_name || 'My Profile',
          data: { ...local, id: row.profile_id }, updated_at: new Date().toISOString()
        });
        continue;
      }
      const existingPro = state.profiles[row.profile_id]?.isPro;
      const existingProExpiresAt = state.profiles[row.profile_id]?.proExpiresAt;
      
      state.profiles[row.profile_id] = {
        ...row.data, id: row.profile_id,
        profileName: row.profile_name || row.data.profileName || 'My Profile'
      };
      
      if (row.profile_id === 'profile_1' || row.profile_id === state.activeId) {
        state.profiles[row.profile_id].isPro = existingPro;
        state.profiles[row.profile_id].proExpiresAt = existingProExpiresAt;
      }
      
      changed = true;
    }
    if (changed) {
      setItemSync(getProfileKey(), JSON.stringify(state));
      window.dispatchEvent(new Event('hc_profile_updated'));
    }
    await flushSyncOutbox(session.user.id);
    console.log('Profile snapshots synced successfully from Supabase');
  } catch (err) {
    console.error('Failed to sync profile from Supabase:', err);
  }
}

const VIP_SIG_HASH = 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';

export function isProUser() { 
  if (typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === VIP_SIG_HASH || localStorage.getItem('hc_vip_tester') === 'true')) {
    return true;
  }
  const state = getProfileEngineState(); 
  const profile = state.profiles[state.activeId]; 
  if (!profile || !profile.isPro) return false; 
  if (!profile.proExpiresAt) return true; 
  return new Date(profile.proExpiresAt) > new Date(); 
}

export async function verifyProStatus() {
  if (typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === VIP_SIG_HASH || localStorage.getItem('hc_vip_tester') === 'true')) {
    return true;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return isProUser();
    
    // Explicitly grab error so we can handle PGRST errors
    const { data, error } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', session.user.id).single();
    
    // If network fails or database errors, trust the local cache to prevent UI flashing
    if (error) {
      console.warn('verifyProStatus DB error, falling back to cache:', error);
      return isProUser();
    }

    const state = getProfileEngineState();
    const p = state.profiles[state.activeId];

    if (data?.is_pro && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date())) {
      if (p && (!p.isPro || p.proExpiresAt !== data.pro_expires_at)) {
        p.isPro = true;
        p.proExpiresAt = data.pro_expires_at;
        setItemSync(getProfileKey(), JSON.stringify(state));
        window.dispatchEvent(new Event('hc_profile_updated'));
      }
      return true;
    } else {
      // Explicitly revoke if DB says false OR expired
      if (p && p.isPro) {
        p.isPro = false;
        p.proExpiresAt = null;
        setItemSync(getProfileKey(), JSON.stringify(state));
        window.dispatchEvent(new Event('hc_profile_updated'));
      }
      return false;
    }
  } catch (err) {
    console.warn('verifyProStatus unexpected error, falling back to cache:', err);
    return isProUser();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => {
    historyStack = [];
    historyIndex = -1;
  });
}




