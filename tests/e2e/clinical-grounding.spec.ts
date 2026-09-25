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
  await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
  await page.getByRole('button',{name:'Review and save to My Cases'}).click();
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
