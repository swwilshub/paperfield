// End-to-end: fold -> wings -> trim -> draw -> release -> event -> reveal, in local mode on a phone viewport.
// Run: npx playwright test   (or BASE_URL=https://<user>.github.io/<repo>/ npx playwright test to check Pages)
import {test,expect} from '@playwright/test';

// Sandboxes whose browser can't verify an intercepting proxy's CA can set PW_ROUTE_EXTERNAL=1:
// external requests are then fetched by Playwright's Node side (TLS still verified there).
test.beforeEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.route(/^https:\/\//,async r=>r.fulfill({response:await r.fetch()}));});

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

test('page loads with no console errors',async({page})=>{
  const errs=watchConsole(page);await page.goto('./');
  await expect(page.locator('#me')).toContainText('pts');
  await expect(page.locator('#ticker')).not.toContainText('Loading');
  await page.waitForTimeout(1500);
  expect(errs).toEqual([]);
});

test('full fold, draw, release, event and reveal loop works locally',async({page})=>{
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
  await page.locator('#pname').fill('Smoke Lark');

  await page.locator('[data-tab="draw"]').click();
  const box=await page.locator('#inkC').boundingBox();
  await drag(page,[box.x+box.width*0.3,box.y+box.height*0.6],[box.x+box.width*0.7,box.y+box.height*0.7]);

  await page.locator('[data-tab="go"]').click();
  await expect(page.locator('#goTitle')).toHaveText('Smoke Lark');
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
  await expect(page.locator('#ticker')).toContainText('Smoke Lark');
  await expect(page.locator('#me')).toContainText('next plane in');

  // Persisted locally: survives a reload, and the hourly limit holds.
  await page.reload();
  await expect(page.locator('#ticker')).toContainText('Smoke Lark');
  await expect(page.locator('#recs')).toContainText('Smoke Lark');
  await page.locator('[data-tab="go"]').click();
  await expect(page.locator('#release')).toBeDisabled();
  expect(errs).toEqual([]);
});
