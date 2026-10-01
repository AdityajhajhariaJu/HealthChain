import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {localStorage.setItem('hc_guest_mode','true');localStorage.setItem('hc_onboarded','true');localStorage.setItem('hc_product_tour_seen','true');localStorage.setItem('hc_cookies_accepted','declined');});
  await page.route(/https:\/\//,route=>route.abort());
});
test('actual UI archive includes readable active case, hydration and original bytes; logout preserves originals', async ({page}) => {
  await page.goto('/app/my-cases?new=true');
  await page.getByLabel('Case title',{exact:true}).fill('SYNTHETIC_PILLAR_CASE');
  await page.getByLabel('What would you like help with?',{exact:true}).fill('Synthetic regression, not a health record.');
  await page.getByRole('button',{name:'Save case draft',exact:true}).click();
  await expect(page).toHaveURL(/\/app\/cases\//); const caseId=new URL(page.url()).pathname.split('/').pop()!;
  const key=await page.evaluate(async id=>{const files=await import('/src/services/caseRecordFiles.ts');try { await files.saveOriginalCaseFile(id,'r',new File(['SYNTHETIC_ORIGINAL_BYTES'],'synthetic.pdf',{type:'application/pdf'})); } catch (err:any) { throw new Error(JSON.stringify({message:err.message,original:err.originalError?.name,detail:err.originalError?.message})); }return files.key(id,'r');},caseId);
  await page.goto('/app/today'); await page.getByRole('button',{name:'Quick log 250ml water'}).click();
  await page.evaluate(async()=>{await (await import('/src/services/DailyTrackerLedger.ts')).flushDailyTrackerLedger();});
  await page.goto('/app/settings'); const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const download=await downloadPromise; const archive=JSON.parse(await readFile((await download.path())!,'utf8'));
  expect(archive.format).toBe('healthchain-user-data-v3'); expect(archive.localStorage.hc_active_case_guest_profile_1).toBe(caseId);expect(Buffer.from(archive.originals[key].data,'base64').toString()).toBe('SYNTHETIC_ORIGINAL_BYTES');
  expect(Object.keys(archive.localStorage).some(k=>k.startsWith('healthchain_hydration_data_'))).toBe(true);
  expect(await page.evaluate(async data=>{return (await import('/src/services/HealthArchive.ts')).validateHealthArchive(data,[]).skipped;},archive)).toBe(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('hc_logout')));await expect(page).toHaveURL('/');
  expect(await page.evaluate(async key=>{const idb=await import('/node_modules/.vite/deps/idb-keyval.js');const files=await import('/src/services/caseRecordFiles.ts');return files.originalBlobFromStored(await idb.get(key))!.text();},key)).toBe('SYNTHETIC_ORIGINAL_BYTES');
});
test('expired session cannot claim account deletion or clear any device record',async({page})=>{
  let calls=0;await page.route('**/api/delete-account',route=>{calls++;return route.fulfill({json:{success:true}});});
  await page.goto('/app/today'); await page.evaluate(async()=>{const {supabase}=await import('/src/services/supabaseClient.ts');supabase.auth.getSession=async()=>({data:{session:{user:{id:'synthetic-expired'},access_token:'synthetic-token'}},error:null}); localStorage.removeItem('hc_guest_mode');localStorage.setItem('hc_account',JSON.stringify({id:'synthetic-expired'}));localStorage.setItem('hc_case_prep_draft_synthetic-expired_profile_1','{"preserve":true}');});
  await page.getByRole('link',{name:'Settings',exact:true}).click(); await expect(page.getByRole('button',{name:'Delete Account',exact:true})).toBeVisible(); await page.evaluate(async()=>{const {supabase}=await import('/src/services/supabaseClient.ts');supabase.auth.getSession=async()=>({data:{session:null},error:null});});
  await page.getByRole('button',{name:'Delete Account',exact:true}).click();await page.getByLabel('Type DELETE to confirm account deletion').fill('DELETE');await page.getByRole('button',{name:'Delete Permanently',exact:true}).click();
  await expect(page.getByText('Sign in again before deleting your account. No deletion has been performed.',{exact:true})).toBeVisible();expect(calls).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('hc_case_prep_draft_synthetic-expired_profile_1'))).toBe('{"preserve":true}');
});
test('confirmed settings deletion erases only the requested owner in localStorage and IndexedDB',async({page})=>{
  await page.route('**/api/delete-account',route=>route.fulfill({json:{success:true}})); await page.goto('/app/today');
  await page.evaluate(async()=>{const {supabase}=await import('/src/services/supabaseClient.ts');supabase.auth.getSession=async()=>({data:{session:{user:{id:'synthetic-delete-A'},access_token:'synthetic-token'}},error:null});supabase.auth.signOut=async()=>({error:null});localStorage.removeItem('hc_guest_mode');localStorage.setItem('hc_account',JSON.stringify({id:'synthetic-delete-A'}));localStorage.setItem('hc_unified_profile_synthetic-delete-A','{}');localStorage.setItem('hc_unified_profile_synthetic-delete-B','SYNTHETIC_KEEP');const idb=await import('/node_modules/.vite/deps/idb-keyval.js');await idb.set('hc_observations_v1:synthetic-delete-A:profile_1',['ERASE']);await idb.set('hc_original_record:hc_unified_profile_synthetic-delete-B:profile_1:c:r','KEEP');});
  await page.getByRole('link',{name:'Settings',exact:true}).click(); await page.getByRole('button',{name:'Delete Account',exact:true}).click();await page.getByLabel('Type DELETE to confirm account deletion').fill('DELETE');await page.getByRole('button',{name:'Delete Permanently',exact:true}).click();await expect(page).toHaveURL('/');
  expect(await page.evaluate(async()=>{const idb=await import('/node_modules/.vite/deps/idb-keyval.js');return {a:await idb.get('hc_observations_v1:synthetic-delete-A:profile_1')||null,b:localStorage.getItem('hc_unified_profile_synthetic-delete-B'),file:await idb.get('hc_original_record:hc_unified_profile_synthetic-delete-B:profile_1:c:r')};})).toEqual({a:null,b:'SYNTHETIC_KEEP',file:'KEEP'});
});
test('clinical inspector shows actual provisional page and fills the viewport',async({page})=>{
  await page.goto('/app/my-cases');const id=await page.evaluate(async()=>{const cases=await import('/src/services/CaseEngine.ts');const c=cases.createCaseDraft({title:'SYNTHETIC_PROVENANCE'});cases.appendCaseRecords(c.id,[{id:'r',filename:'synthetic.pdf',source:'patient_upload',type:'lab_report',findings:'Synthetic finding',extractionStatus:'provisional',passages:[{page:7,text:'Synthetic page seven'}]}]);return c.id;});await page.goto('/app/cases/'+id+'?tab=records');
  const badge=page.getByRole('button',{name:/Clinical category: Extracted Finding/});await expect(badge).toContainText('Provisional');await badge.click();
  const inspector=page.getByRole('dialog',{name:'Clinical Information Category: Extracted Finding'});await expect(inspector).toBeVisible();await expect(inspector).toContainText('7');
  const layout=await inspector.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};});expect(layout.x).toBe(0);expect(layout.y).toBe(0);expect(layout.width).toBe(layout.viewportWidth);expect(layout.height).toBe(layout.viewportHeight);await page.keyboard.press('Escape');await expect(inspector).not.toBeVisible();
});
