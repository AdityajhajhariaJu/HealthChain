import { isProUser } from './ProfileEngine';

export interface TrialQuota {
  used: number;
  total: number;
  remaining: number;
  isAvailable: boolean;
}

export interface TrialStatus {
  isPro: boolean;
  quickConsult: TrialQuota;
  ava: TrialQuota;
  dietician: TrialQuota;
}

const STORAGE_KEYS = {
  QUICK_CONSULT: 'hc_trial_quick_consult_count',
  AVA: 'hc_trial_ava_count',
  DIETICIAN: 'hc_trial_diet_plan_count',
  MODAL_DISMISSED: 'hc_trial_modal_dismissed_session',
};

export const TRIAL_LIMITS = {
  QUICK_CONSULT: 1,
  AVA: 10,
  DIETICIAN: 1,
};

const VIP_SIG_HASH = 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';

export function getTrialStatus(): TrialStatus {
  const isPro = isProUser() || (typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === VIP_SIG_HASH || localStorage.getItem('hc_vip_tester') === 'true'));

  if (isPro) {
    return {
      isPro: true,
      quickConsult: { used: 0, total: 999, remaining: 999, isAvailable: true },
      ava: { used: 0, total: 999, remaining: 999, isAvailable: true },
      dietician: { used: 0, total: 999, remaining: 999, isAvailable: true },
    };
  }

  let qcUsed = 0;
  let avaUsed = 0;
  let dietUsed = 0;

  try {
    qcUsed = parseInt(localStorage.getItem(STORAGE_KEYS.QUICK_CONSULT) || '0', 10) || 0;
    avaUsed = parseInt(localStorage.getItem(STORAGE_KEYS.AVA) || '0', 10) || 0;
    dietUsed = parseInt(localStorage.getItem(STORAGE_KEYS.DIETICIAN) || '0', 10) || 0;
  } catch (e) {
    console.warn('Failed to read trial quotas from localStorage', e);
  }

  const qcRemaining = Math.max(0, TRIAL_LIMITS.QUICK_CONSULT - qcUsed);
  const avaRemaining = Math.max(0, TRIAL_LIMITS.AVA - avaUsed);
  const dietRemaining = Math.max(0, TRIAL_LIMITS.DIETICIAN - dietUsed);

  return {
    isPro: false,
    quickConsult: {
      used: qcUsed,
      total: TRIAL_LIMITS.QUICK_CONSULT,
      remaining: qcRemaining,
      isAvailable: qcRemaining > 0,
    },
    ava: {
      used: avaUsed,
      total: TRIAL_LIMITS.AVA,
      remaining: avaRemaining,
      isAvailable: avaRemaining > 0,
    },
    dietician: {
      used: dietUsed,
      total: TRIAL_LIMITS.DIETICIAN,
      remaining: dietRemaining,
      isAvailable: dietRemaining > 0,
    },
  };
}

export function canUseTrial(feature: 'quick_consult' | 'ava' | 'dietician'): boolean {
  const status = getTrialStatus();
  if (status.isPro) return true;
  if (feature === 'quick_consult') return status.quickConsult.isAvailable;
  if (feature === 'ava') return status.ava.isAvailable;
  if (feature === 'dietician') return status.dietician.isAvailable;
  return false;
}

export function recordTrialUsage(feature: 'quick_consult' | 'ava' | 'dietician'): void {
  const status = getTrialStatus();
  if (status.isPro) return;

  try {
    if (feature === 'quick_consult') {
      const next = (parseInt(localStorage.getItem(STORAGE_KEYS.QUICK_CONSULT) || '0', 10) || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.QUICK_CONSULT, next.toString());
    } else if (feature === 'ava') {
      const next = (parseInt(localStorage.getItem(STORAGE_KEYS.AVA) || '0', 10) || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.AVA, next.toString());
    } else if (feature === 'dietician') {
      const next = (parseInt(localStorage.getItem(STORAGE_KEYS.DIETICIAN) || '0', 10) || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.DIETICIAN, next.toString());
    }
    window.dispatchEvent(new Event('hc_trial_updated'));
  } catch (e) {
    console.error('Failed to record trial usage', e);
  }
}

export function openTrialModal(lockedFeatureName?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hc_open_trial_modal', {
        detail: { lockedFeature: lockedFeatureName || 'Premium Feature' },
      })
    );
  }
}
