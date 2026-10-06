// End-to-end: fold -> wings -> release -> event -> reveal, in local mode on a phone viewport.
// Run: npx playwright test   (or BASE_URL=https://<user>.github.io/<repo>/ npx playwright test to check Pages)
import {test,expect} from '@playwright/test';

// The load check uses the real page against BASE_URL (the deployed site, Firebase included) and
// local play otherwise. Everything that throws a plane always uses local play (`?local`), so tests
// never touch the live Firebase project's data.
const HOME=process.env.BASE_URL?'./':'./?local',LOCAL='./?local';

// Sandboxes whose browser can't verify an intercepting proxy's CA can set PW_ROUTE_EXTERNAL=1:
// external requests are then fetched by Playwright's Node side (TLS still verified there).
test.beforeEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.route(/^https:\/\//,async r=>r.fulfill({response:await r.fetch()}));});
test.afterEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.unrouteAll({behavior:'ignoreErrors'});});

function watchConsole(page){const errs=[];
  // The Firestore SDK logs a slow first connection as an error, then retries on its own; that's the
  // network, not the page. Connection itself is checked separately (the chip must not say "Local").
  page.on('console',m=>{if(m.type()==='error'&&!/Could not reach Cloud Firestore backend/.test(m.text()))errs.push(m.text());});
  page.on('pageerror',e=>errs.push(String(e)));
  page.on('requestfailed',r=>{const f=r.failure();if(!(f&&/ERR_ABORTED/.test(f.errorText)))errs.push('request failed: '+r.url()+' '+(f&&f.errorText));});
  return errs;}

// Screen point for a sheet coordinate (mm, y up) on the fold SVG.
async function sheetToClient(page,x,y){return page.evaluate(([x,y])=>{const g=document.querySelector('#foldSvg #flipG');const s=document.querySelector('#foldSvg');
  const p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(g.getScreenCTM());return[q.x,q.y];},[x,y]);}
async function drag(page,a,b){await page.mouse.move(a[0],a[1]);await page.mouse.down();
  for(let i=1;i<=8;i++)await page.mouse.move(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8);await page.mouse.up();}

test('full-screen field, every action in the bottom dock; designer is fold, wings, release',async({page})=>{
  await page.goto(LOCAL);
  // No drawing, text or trim controls anywhere.
  await expect(page.locator('#elev, #dih, [data-style], [data-gsm], #inkC, #pname, input[type=text]')).toHaveCount(0);
  await expect(page.locator('[data-stepdot]')).toHaveCount(3);
  // The field fills the screen and nothing scrolls.
  const vp=page.viewportSize();const wb=await page.locator('#worldWrap').boundingBox();
  expect(wb.width).toBe(vp.width);expect(wb.height).toBe(vp.height);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  // One centred main button at the bottom; the designer is closed.
  const fb=await page.locator('#foldBtn').boundingBox();
  expect(Math.abs(fb.x+fb.width/2-vp.width/2)).toBeLessThan(2);
  expect(fb.y+fb.height).toBeGreaterThan(vp.height-90);
  await expect(page.locator('#designer')).toBeHidden();
  // Each mode shows exactly one row of dock actions.
  const visibleMain=()=>page.locator('#dock .dockmain:visible');
  await expect(visibleMain()).toHaveText(['Fold a plane']);
  await page.locator('#foldBtn').click();
  await expect(page.locator('#designer')).toBeVisible();await expect(visibleMain()).toHaveText(['Next: wings']);
  await page.locator('#toWings').click();await expect(visibleMain()).toHaveText(['Next: release']);
  await page.locator('[data-dock="wings"] [data-goto="go"]').click();await expect(visibleMain()).toHaveText(['Release']);
  await page.locator('[data-dock="go"] .closeSheet').click();
  await expect(page.locator('#designer')).toBeHidden();await expect(visibleMain()).toHaveText(['Fold a plane']);
  await page.locator('#openBoard').click();await expect(page.locator('#board')).toBeVisible();await expect(visibleMain()).toHaveText(['Back to the field']);
});

test('page loads with no console errors',async({page})=>{
  test.setTimeout(90e3);
  const errs=watchConsole(page);await page.goto(HOME);
  // The live site loads three.js and the Firebase SDK and signs in before the chip shows points.
  // From CI runners Firestore's first connection can take well over 10 s (the SDK logs it), so be patient.
  const wait={timeout:process.env.BASE_URL?45e3:20e3};
  await expect(page.locator('#me')).toContainText('pts',wait);
  await expect(page.locator('#ticker')).not.toContainText('Loading',wait);
  if(process.env.BASE_URL)await expect(page.locator('#me')).not.toContainText('Local');
  await page.waitForTimeout(1500);
  expect(errs).toEqual([]);
});

test('full fold, wings, release, event and reveal loop works locally',async({page})=>{
  const errs=watchConsole(page);await page.goto(LOCAL);
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await expect(page.locator('#me')).toContainText('plane ready');

  // Open the designer from the dock, then fold the top-left corner to the centre line
  // (the mirror fold is added automatically).
  await page.locator('#foldBtn').click();
  // Wait for the sheet's slide-in to finish, or the drag lands where the paper is about to move from.
  await page.locator('#designer').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  await drag(page,await sheetToClient(page,105,297),await sheetToClient(page,0,192));
  await expect(page.locator('#pendingBtns')).toBeVisible();
  await page.locator('#doFold').click();
  await expect(page.locator('#foldCount')).toHaveText('1 crease so far.');
  // Music starts on the first interaction, and folding brings in the fold stage.
  await page.waitForFunction(()=>window.oneSheet.audio.debug()&&window.oneSheet.audio.debug().stage==='fold');

  await page.locator('#toWings').click();
  await expect(page.locator('#wingSpec')).toContainText('Wingspan');
  await page.locator('[data-dock="wings"] [data-goto="go"]').click();
  await expect(page.locator('#goTitle')).toHaveText('White plane');
  await page.locator('#papers button[aria-label="paper blue"]').click();
  await expect(page.locator('#goTitle')).toHaveText('Blue plane');
  await expect(page.locator('#goHint')).toContainText('saved in this browser');
  await page.locator('#release').click();

  // The event: countdown, flight, landing, then the reveal card with points.
  await expect(page.locator('#worldWrap')).toHaveClass(/event/);
  await expect(page.locator('#reveal')).toBeVisible({timeout:60e3});
  await expect(page.locator('#reveal .rv-total')).toHaveClass(/done/,{timeout:20e3});
  await expect(page.locator('#reveal .rv-total')).toContainText('points');
  await page.locator('#rvClose').click();
  await expect(page.locator('#worldWrap')).not.toHaveClass(/event/);
  await expect(page.locator('#result')).toContainText('Saved in this browser');
  await expect(page.locator('#ticker')).toContainText('Blue plane');
  await expect(page.locator('#me')).toContainText('next plane in');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('onesheet-local-v1')).planes[0]);
  expect(saved.name).toBeUndefined();expect(saved.paper).toBe('#CDE7FF');expect(saved.img).toBeUndefined();

  // Persisted locally: survives a reload, and the throw limit holds.
  await page.reload();
  await expect(page.locator('#ticker')).toContainText('Blue plane');
  await page.locator('#openBoard').click();
  await expect(page.locator('#recs')).toContainText('Blue plane');
  await page.locator('#board ~ #dock .closeSheet:visible').click();
  await page.locator('#foldBtn').click();await page.locator('#toWings').click();await page.locator('[data-dock="wings"] [data-goto="go"]').click();
  await expect(page.locator('#release')).toBeDisabled();
  expect(errs).toEqual([]);
});
