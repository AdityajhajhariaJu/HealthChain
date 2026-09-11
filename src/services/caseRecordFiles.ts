import { get, set } from 'idb-keyval';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';
const scope = () => getProfileKey() + ':' + (getProfileEngineState()?.activeId || 'profile_1');
const key = (caseId:string,recordId:string) => 'hc_original_record:' + scope() + ':' + caseId + ':' + recordId;

/** Originals stay on this device; the case stores metadata and extracted text only. */
export async function saveOriginalCaseFile(caseId:string,recordId:string,file:File):Promise<void>{
  if(!caseId || !recordId) throw new Error('A case and record are required.');
  await set(key(caseId,recordId),file);
}
export async function loadOriginalCaseFile(caseId:string,recordId:string):Promise<Blob|null>{
  const requestScope=scope();
  const result=await get<Blob>(key(caseId,recordId));
  return scope()===requestScope && result instanceof Blob ? result : null;
}

