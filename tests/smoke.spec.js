// End-to-end: fold -> wings -> trim -> release -> event -> reveal, in local mode on a phone viewport.
// Run: npx playwright test   (or BASE_URL=https://<user>.github.io/<repo>/ npx playwright test to check Pages)
import {test,expect} from '@playwright/test';

// Sandboxes whose browser can't verify an intercepting proxy's CA can set PW_ROUTE_EXTERNAL=1:
// external requests are then fetched by Playwright's Node side (TLS still verified there).
test.beforeEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.route(/^https:\/\//,async r=>r.fulfill({response:await r.fetch()}));});
test.afterEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.unrouteAll({behavior:'ignoreErrors'});});

function watchConsole(page){const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  page.on('pageerror',e=>errs.push(String(e)));
  page.on('requestfailed',r=>{const f=r.failure();if(!(f&&/ERR_ABORTED/.test(f.errorText)))errs.push('request failed: '+r.url()+' '+(f&&f.errorText));});
  return errs;}

// Screen point for a sheet coordinate (mm, y up) on the fold SVG.
async function sheetToClient(page,x,y){return page.evaluate(([x,y])=>{const g=document.querySelector('#foldSvg #flipG');const s=document.querySelector('#foldSvg');
  const p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(g.getScreenCTM());return[q.x,q.y];},[x,y]);}
async function drag(page,a,b){await page.mouse.move(a[0],a[1]);await page.mouse.down();
  for(let i=1;i<=8;i++)await page.mouse.move(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8);await page.mouse.up();}

test('no drawing tools or text inputs on the page',async({page})=>{
  await page.goto('./');
  await expect(page.locator('[data-tab]')).toHaveCount(4);
  await expect(page.locator('[data-tab="draw"], #inkC, [data-panel="draw"], #pname, input[type=text]')).toHaveCount(0);
});

test('page loads with no console errors',async({page})=>{
  const errs=watchConsole(page);await page.goto('./');
  await expect(page.locator('#me')).toContainText('pts');
  await expect(page.locator('#ticker')).not.toContainText('Loading');
  await page.waitForTimeout(1500);
  expect(errs).toEqual([]);
});

test('full fold, trim, release, event and reveal loop works locally',async({page})=>{
  const errs=watchConsole(page);await page.goto('./');
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await expect(page.locator('#me')).toContainText('plane ready');

  // Fold the top-left corner to the centre line; the mirror fold is added automatically.
  await page.locator('#foldSvg').scrollIntoViewIfNeeded();
  await drag(page,await sheetToClient(page,105,297),await sheetToClient(page,0,192));
  await expect(page.locator('#pendingBtns')).toBeVisible();
  await page.locator('#doFold').click();
  await expect(page.locator('#foldCount')).toHaveText('1 crease so far.');

  await page.locator('[data-tab="wings"]').click();
  await expect(page.locator('#wingSpec')).toContainText('Wingspan');
  await page.locator('[data-tab="trim"]').click();
  await page.locator('#papers button[aria-label="paper blue"]').click();

  await page.locator('[data-tab="go"]').click();
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

  // Persisted locally: survives a reload, and the hourly limit holds.
  await page.reload();
  await expect(page.locator('#ticker')).toContainText('Blue plane');
  await expect(page.locator('#recs')).toContainText('Blue plane');
  await page.locator('[data-tab="go"]').click();
  await expect(page.locator('#release')).toBeDisabled();
  expect(errs).toEqual([]);
});
