import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('hc_guest_mode','true');
    localStorage.setItem('hc_onboarded','true');
    localStorage.setItem('hc_cookies_accepted','declined');
  });
  await page.route(/https:\/\//,r=>r.abort());
  await page.route('**/api/**',r=>r.abort());
});

async function seed(page:any) {
  await page.goto('/app/my-cases',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading', { name: 'My Cases' })).toBeVisible();
  return page.evaluate(async()=>{
    const engine=await import('/src/services/CaseEngine.ts');
    const fixture=await import('/src/services/testFixtures/groundedFixtures.ts');
    const c=engine.createCaseDraft({title:'Grounding regression case',intakeData:{chiefComplaint:'Knee discomfort'},medicalRecords:[]});
    engine.saveReviewSnapshot({caseId:c.id,type:'jarvis',report:fixture.groundedReview(),specialists:['Clinical Data Engine']});
    return c.id;
  });
}

async function advanceToStep(page:any, step: 4 | 5 | 6) {
  await page.getByRole('button', { name: 'Next: Timeline (Step 2)' }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  if (step >= 5) await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  if (step >= 6) await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
}

test('saved review has one reasoning view and one perspective view',async({page})=>{
  const id=await seed(page);
  await page.goto('/app/consult?caseId='+id);
  await expect(page.getByRole('heading',{name:'Your record review is ready'})).toBeVisible();
  await page.getByText('Review reasoning',{exact:true}).click();
  await expect(page.getByText('Clinical reasoning and follow-up',{exact:true})).toHaveCount(1);
  await page.getByText(/Perspectives \(\d+\)/).click();
  await expect(page.getByText('Clinical perspectives',{exact:true})).toHaveCount(1);
  await expect(page.getByText('Save clarification',{exact:true})).toBeVisible();
  await expect(page.getByText('Recorded Measurement: Postural Tachycardia Delta (+34 bpm)',{exact:true})).toHaveCount(0);
});

test('clarification survives reload and remains a report, not a resolved conclusion',async({page})=>{
  const id=await seed(page);
  await page.goto('/app/consult?caseId='+id);
  await page.getByText('Review reasoning',{exact:true}).click();
  const input=page.locator('form textarea').first();
  await input.fill('I do not know the exact activity timing');
  await page.getByText('Save clarification',{exact:true}).click();
  await expect(page.getByText('Clarification saved',{exact:true})).toBeVisible();
  await page.reload();
  const report=await page.evaluate(async(id)=>{
    const engine=await import('/src/services/CaseEngine.ts');
    return engine.getCase(id)?.reviews[0].report;
  },id);
  expect(report.documentedFacts.some((f:any)=>f.fact==='I do not know the exact activity timing')).toBe(true);
  expect(report.selectiveUpdate.resolvedQuestions).toEqual([]);
});

test('invalid engine case cannot silently use another case',async({page})=>{
  await seed(page);
  await page.goto('/app/consult?caseId=missing&review=new');
  await advanceToStep(page, 4);
  await page.getByRole('textbox',{name:'Clinical timeline and symptom notes'}).fill('A new concern');
  await page.getByRole('textbox',{name:'Clinical timeline and symptom notes'}).blur();
  for (const name of ['Next: Add Evidence (Step 5)', 'Next: Scope & Run (Step 6)', 'Review and save to My Cases']) {
    await page.getByRole('button', { name }).focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Case unavailable',{exact:true})).toBeVisible();
});

test('mobile saved review stays within viewport',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  const id=await seed(page);
  await page.goto('/app/consult?caseId='+id);
  await expect(page.getByRole('heading',{name:'Your record review is ready'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('mobile-review.png'),fullPage:true});
});

test('current chest pressure and breathlessness shows emergency guidance before sign-in or a review call',async({page})=>{
  await page.goto('/app/consult?review=new',{waitUntil:'domcontentloaded'});
  await advanceToStep(page,4);
  await page.getByRole('textbox',{name:'Clinical timeline and symptom notes'}).fill('I have chest pressure and breathlessness right now, starting 20 minutes ago. My ECG six months ago was normal.');
  const alert = page.locator('[data-urgency="urgent_emergency_care"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Do not wait for an AI reply');
});

test('an older saved interpretation requires refresh and cannot reopen as a current verdict',async({page})=>{
  const id = await seed(page);
  await page.evaluate(async id => {
    const engine = await import('/src/services/CaseEngine.ts');
    engine.saveReviewSnapshot({caseId:id,type:'jarvis',report:{groundingVersion:1,executiveSummary:'You have confirmed coeliac disease.',primaryHypothesis:'Confirmed coeliac disease'},specialists:[]});
  },id);
  await page.goto('/app/consult?caseId='+id);
  await expect(page.getByText('An earlier review predates the current evidence checks. Run a fresh review from your original records before relying on its interpretation.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your record review is ready'})).toHaveCount(0);
  await expect(page.getByText('You have confirmed coeliac disease.',{exact:true})).toHaveCount(0);
});
