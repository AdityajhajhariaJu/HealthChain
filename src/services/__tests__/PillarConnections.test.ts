// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const m = vi.hoisted(() => ({ owner: 'guest', disk: new Map<string, any>(), writeGate: null as null | Promise<void>, cases: new Map<string, any>() }));
vi.mock('idb-keyval', () => ({ get: async (key: string) => m.disk.get(key), keys: async () => [...m.disk.keys()], del: async (key: string) => { m.disk.delete(key); }, set: async (key: string, value: any) => { if (m.writeGate) await m.writeGate; m.disk.set(key, value instanceof Blob ? value : structuredClone(value)); } }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({data:{session:m.owner === 'guest' ? null : {user:{id:m.owner}}}}) } } }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: async () => true, getPendingObservationIds: async () => new Set() }));
vi.mock('@capacitor/core', () => ({ Capacitor: {getPlatform: () => 'web'} }));
vi.mock('../ProfileEngine', () => ({ getProfileEngineState: () => ({activeId:'profile_1'}), getProfile: () => ({medications:[]}) }));
vi.mock('../AvaConversationRepository', () => ({ avaConversationKey: () => `hc_ava_messages_${m.owner}_profile_1`, hydrateAvaMessages: async () => null, normalizeAvaMessages: (items: any) => items }));
vi.mock('../CaseEngine', () => ({ getCase: (id: string) => m.cases.get(id), appendCaseRecords: (id: string, records: any[]) => { m.cases.get(id).medicalRecords.push(...records); } }));
import { createObservation, listObservationHistory, reviseObservation, deleteObservation } from '../HealthObservationService';
import { syncHydrationDay, syncMedicationDose, hydrateDailyTrackerProjections, flushDailyTrackerLedger } from '../DailyTrackerLedger';
import { dailyEvidenceSummary, attachReviewedDailyEvidence, reviewedCaseWithCurrentSources } from '../ClinicalDailyEvidence';
import { addDurableArchiveData, restoreHealthArchive } from '../HealthArchive';
import { recordConfirmedAccountErasure, eraseOwnerHealthData } from '../AccountErasure';
import { setOwned } from '../OwnedIdb';
import { planningConstraintSnapshot } from '../../../shared/health-source-freshness';
import { sameObservationMutation } from '../../../shared/observation-sync-content';

beforeEach(async () => { await flushDailyTrackerLedger().catch(() => {}); m.disk.clear(); m.cases.clear(); m.writeGate = null; m.owner='guest'; localStorage.clear(); localStorage.setItem('hc_guest_mode','true'); vi.stubGlobal('crypto',webcrypto); window.dispatchEvent(new Event('hc_logout')); });
const water = () => ({date:'2026-10-01',targetMl:2000,currentMl:375,reminderIntervalHours:2,remindersEnabled:false,logs:[{id:'drink-1',amountMl:375,type:'water' as const,timestamp:'09:00',occurredAt:'2026-10-01T03:30:00.000Z'}]});
describe('pillar records across trackers, clinical review and archives', () => {
  it('preserves 375 ml, exact occurrence time and correction through the canonical ledger', async () => {
    await syncHydrationDay(water()); await syncHydrationDay(water());
    const history = await listObservationHistory(); expect(history).toHaveLength(1); expect(history[0]).toMatchObject({timePrecision:'exact',occurredAt:water().logs[0].occurredAt,payload:{amountMl:375}});
    await hydrateDailyTrackerProjections();
    const key='healthchain_hydration_data_2026-10-01:hc_unified_profile_guest:profile_1';
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({currentMl:375});
    await deleteObservation(history[0].id,history[0].revision); await syncHydrationDay(water(),true); await hydrateDailyTrackerProjections();
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({currentMl:0,logs:[]});
  });
  it('does not infer ingestion or let an old completion flag undo a correction', async () => {
    const item={id:'med-1',name:'Synthetic medicine',dosage:'recorded dose',time:'08:00',enabled:true};
    await syncMedicationDose(item,'2026-10-01','taken',null,true);
    await syncMedicationDose(item,'2026-10-01','unknown');
    await syncMedicationDose(item,'2026-10-01','taken',null,true);
    const history=await listObservationHistory(); expect(history).toHaveLength(1); expect(history[0]).toMatchObject({timePrecision:'date_only',occurredAt:null,payload:{status:'unknown'}});
    expect(dailyEvidenceSummary(history,'2026-10-01').hydration.loggedMl).toBeNull();
    expect(dailyEvidenceSummary(history,'2026-10-01').doses[0].payload).toMatchObject({status:'unknown'});
  });
  it('excludes edited and deleted daily facts from an earlier reviewed case selection', async () => {
    await syncHydrationDay(water()); const [source]=await listObservationHistory();
    m.cases.set('case-1',{id:'case-1',updatedAt:'fixed',medicalRecords:[]});
    await attachReviewedDailyEvidence('case-1',[{id:source.id,revision:source.revision}]);
    expect((await reviewedCaseWithCurrentSources('case-1')).medicalRecords[0].evidenceManifest!.sources).toHaveLength(1);
    await reviseObservation(source.id,source.revision,{...source,payload:{...source.payload,amountMl:250} as any});
    const changed=(await reviewedCaseWithCurrentSources('case-1')).medicalRecords[0]; expect(changed.evidenceManifest!.sources).toEqual([]); expect(changed.findings).toContain('changed');
    const [current]=await listObservationHistory(); await deleteObservation(current.id,current.revision);
    expect((await reviewedCaseWithCurrentSources('case-1')).medicalRecords[0].findings).toContain('deleted');
  });
  it('round trips original bytes, daily settings and observation history, and refuses tampered originals atomically', async () => {
    await syncHydrationDay(water()); const local: Record<string,string>={};
    const original='hc_original_record:hc_unified_profile_guest:profile_1:case-1:record-1';
    m.disk.set(original,new Blob([new Uint8Array([0,10,250])],{type:'application/pdf'}));
    localStorage.setItem('hc_daily_checkin_reminder_time:hc_unified_profile_guest:profile_1','09:15');
    const data=await addDurableArchiveData(local); const archive={format:'healthchain-user-data-v3',localStorage:local,...data};
    m.disk.clear(); localStorage.removeItem('hc_daily_checkin_reminder_time:hc_unified_profile_guest:profile_1');
    await restoreHealthArchive(archive,[]);
    expect(await listObservationHistory()).toHaveLength(1); expect(localStorage.getItem('hc_daily_checkin_reminder_time:hc_unified_profile_guest:profile_1')).toBe('09:15');
    const restored=m.disk.get(original); const read=new FileReader(); const bytes=await new Promise<ArrayBuffer>(resolve=>{read.onload=()=>resolve(read.result as ArrayBuffer);read.readAsArrayBuffer(restored);}); expect([...new Uint8Array(bytes)]).toEqual([0,10,250]);
    const broken=structuredClone(archive); broken.originals[original].data=btoa('bad'); localStorage.setItem('hc_daily_checkin_reminder_time:hc_unified_profile_guest:profile_1','10:30');
    await expect(restoreHealthArchive(broken,[])).rejects.toThrow('integrity'); expect(localStorage.getItem('hc_daily_checkin_reminder_time:hc_unified_profile_guest:profile_1')).toBe('10:30');
  });
  it('waits for an in-flight owner write, erases only that owner and blocks resurrection', async () => {
    const owner='erasure-only-owner'; m.owner=owner; localStorage.removeItem('hc_guest_mode'); localStorage.setItem('hc_account',JSON.stringify({id:owner}));
    const owned=`hc_original_record:hc_unified_profile_${owner}:profile_1:c:r`, foreign='hc_original_record:hc_unified_profile_other-owner:profile_1:c:r';
    m.disk.set(foreign,'keep'); localStorage.setItem('hc_unified_profile_other-owner','keep');
    let release!: () => void; m.writeGate=new Promise(resolve=>{release=resolve;}); const write=setOwned(owned,'pending');
    await recordConfirmedAccountErasure(owner); const erasure=eraseOwnerHealthData(owner); release(); await write; await erasure; m.writeGate=null;
    await setOwned(owned,'late'); expect(m.disk.has(owned)).toBe(false); expect(m.disk.get(foreign)).toBe('keep'); expect(localStorage.getItem('hc_unified_profile_other-owner')).toBe('keep'); expect(localStorage.getItem('hc_erasure_pending_owners')).toBe('[]');
  });
  it('detects changed planning constraints and same-revision provenance edits', () => {
    expect(planningConstraintSnapshot({allergies:['peanut']},{countryCode:'IN'})).not.toBe(planningConstraintSnapshot({allergies:[]},{countryCode:'IN'}));
    const row={id:'r',revision:2,user_id:'a',profile_id:'profile_1',payload:{kind:'hydration',amountMl:375},record_references:[],source:'today'};
    expect(sameObservationMutation(row,{...row,payload:{amountMl:375,kind:'hydration'}})).toBe(true);
    expect(sameObservationMutation(row,{...row,record_references:[{kind:'case',id:'other'}]})).toBe(false); expect(sameObservationMutation(row,{...row,source:'legacy'})).toBe(false);
  });
});
