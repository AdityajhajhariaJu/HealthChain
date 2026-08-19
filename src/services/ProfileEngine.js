import { supabase } from './supabaseClient';
import { setItemSync, getItemSync } from './storage';
import { recordHealthMemory } from './HealthMemory';

export function getProfileKey() {
  try {
    if (localStorage.getItem('hc_guest_mode') === 'true') return 'hc_unified_profile_guest';
    try {
      const accountStr = localStorage.getItem('hc_account');
      if (accountStr) {
        const account = JSON.parse(accountStr);
        if (account.id) return `hc_unified_profile_${account.id}`;
      }
    } catch(e) {}
    return 'hc_unified_profile';
  } catch (e) {
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
  conditions: [],
  medications: [],
  allergies: [],
  familyHistory: [],
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
  actionItems: [],
};

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
  const state = getProfileEngineState();
  if (Object.keys(state.profiles).length >= 3) {
    alert("Maximum of 3 profiles allowed (Caregiver Mode Limit).");
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
      profile = {
        ...base,
        ...parsed,
        demographics: { ...base.demographics, ...(parsed.demographics || {}) },
        vitals: { ...base.vitals, ...(parsed.vitals || {}) },
        nutrition: { ...base.nutrition, ...(parsed.nutrition || {}) },
        conditions: parsed.conditions || base.conditions,
        allergies: parsed.allergies || base.allergies,
        medications: parsed.medications || base.medications,
        timeline: parsed.timeline || base.timeline,
        actionItems: parsed.actionItems || base.actionItems,
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

    return profile;
  } catch (e) {
    console.error('Failed to parse unified profile', e);
    return { ...DEFAULT_PROFILE };
  }
}

async function saveProfile(profile) {
  try {
    const state = getProfileEngineState();
    
    // Simple Conflict Resolution: Check if the state in localStorage has a newer updatedAt
    const currentState = getProfileEngineState();
    const currentProfile = currentState.profiles[currentState.activeId];
    if (currentProfile && currentProfile.demographics?.updatedAt && profile.demographics?.updatedAt) {
      if (new Date(currentProfile.demographics.updatedAt).getTime() > new Date(profile.demographics.updatedAt).getTime()) {
        const proceed = window.confirm("Conflict detected: This profile was modified in another tab or device. Overwrite?");
        if (!proceed) return;
      }
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

    // Asynchronously sync to secure cloud backend if configured
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // ONLY sync the primary profile to the cloud to prevent caregiver profiles from overwriting the main account
      if (state.activeId === 'profile_1') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from('profiles')
            .upsert({ 
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
            
          if (error) {
            console.error('Supabase sync failed:', error);
            window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error }));
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to save unified profile', e);
    alert('Storage Full: Unable to save profile changes. Please clear browser storage or delete older data.');
    window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: e }));
  }
}

export function updateDemographics(data) {
  const profile = getProfile();
  profile.demographics = { ...profile.demographics, ...data, updatedAt: new Date().toISOString() };
  saveProfile(profile);
}

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
  const profile = getProfile();
  if (!profile.conditions.includes(condition)) {
    profile.conditions.push(condition);
    addEvent('system', source, `Condition Added: ${condition}`, { condition }, false, profile);
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

export function addEvent(type, source, title, data = {}, significant = true, existingProfile = null) {
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
    id: generateId(),
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

export async function syncProfileFromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
       const state = getProfileEngineState();
       const localProfile = state.profiles[state.activeId];
       
       // Conflict resolution: Don't overwrite local if local is newer (e.g., offline edits)
       if (localProfile?.demographics?.updatedAt && data.updated_at) {
         if (new Date(localProfile.demographics.updatedAt).getTime() > new Date(data.updated_at).getTime()) {
           console.log('Local profile is newer than remote. Pushing local changes to cloud.');
           saveProfile(localProfile);
           return;
         }
       }
       
       state.profiles[state.activeId] = {
          ...localProfile,
          profileName: data.full_name || 'My Profile',
          isPro: data.is_pro || false,
          proExpiresAt: data.pro_expires_at || null,
          demographics: data.demographics || {},
          onboardingCompletedAt: data.demographics?.onboardingCompletedAt || null,
          conditions: data.conditions || [],
          medications: data.medications || [],
          allergies: data.allergies || [],
          familyHistory: data.family_history || [],
          timeline: data.timeline || [],
          vitals: data.vitals || { latestLabValues: {}, historicalLabs: [] },
          nutrition: data.nutrition || { targetCalories: 2000, avgProtein: 0, recentLogs: [] },
          healthFocus: data.health_focus || ''
       };
       setItemSync(getProfileKey(), JSON.stringify(state));
       window.dispatchEvent(new Event('hc_profile_updated'));
       console.log('Profile synced successfully from Supabase');
    }
  } catch (err) {
    console.error('Failed to sync profile from Supabase:', err);
  }
}

export function isProUser() { 
  const state = getProfileEngineState(); 
  const profile = state.profiles[state.activeId]; 
  if (!profile || !profile.isPro) return false; 
  if (!profile.proExpiresAt) return true; 
  return new Date(profile.proExpiresAt) > new Date(); 
}

export async function verifyProStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { data } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', session.user.id).single();
    if (data?.is_pro) {
      if (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date()) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return isProUser();
  }
}


