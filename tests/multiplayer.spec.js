// Two browsers on the Firebase emulators: one throws, the other sees it arrive live.
// Run via: npm run test:emulator   (starts the emulators, then this)
import {test,expect} from '@playwright/test';

test.skip(!process.env.FIRESTORE_EMULATOR_HOST,'needs the Firebase emulators (npm run test:emulator)');
test.beforeEach(async({page})=>{if(process.env.PW_ROUTE_EXTERNAL)await page.route(/^https:\/\//,async r=>r.fulfill({response:await r.fetch()}));});

async function open(browser,playwright){const ctx=await browser.newContext({...playwright.devices['Pixel 5']});const page=await ctx.newPage();
  if(process.env.PW_ROUTE_EXTERNAL)await page.route(/^https:\/\//,async r=>r.fulfill({response:await r.fetch()}));
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto('./?emulator');await expect(page.locator('#me')).toContainText('pts',{timeout:20e3});await expect(page.locator('#me')).not.toContainText('Local');
  return{page,errs};}

test('a throw by one player appears live for another',async({browser,playwright})=>{
  test.setTimeout(120e3);
  const A=await open(browser,playwright),B=await open(browser,playwright);
  const toRelease=async P=>{await P.locator('#foldBtn').click();await P.locator('#toWings').click();await P.locator('[data-dock="wings"] [data-goto="go"]').click();};
  await toRelease(A.page);await A.page.locator('#papers button[aria-label="paper green"]').click();
  await A.page.locator('#release').click();

  // B: the live toast (shown for 12 s) names A's plane as soon as it's saved.
  await expect(B.page.locator('#toast')).toContainText('just threw',{timeout:20e3});
  await expect(B.page.locator('#toast')).toContainText('Green plane');

  // A: the flight plays, it's saved to the shared field, and the next plane is rate-limited.
  // (Checked straight away: on a quiet field the limit is only a minute.)
  await expect(A.page.locator('#reveal')).toBeVisible({timeout:60e3});
  await expect(A.page.locator('#result')).toContainText('Saved to the field',{timeout:20e3});
  await A.page.locator('#rvClose').click();await toRelease(A.page);
  await expect(A.page.locator('#release')).toBeDisabled();

  // B: the ticker and leaderboard show A's plane under A's generated pilot name; a reload keeps it.
  await expect(B.page.locator('#ticker')).toContainText('Green plane');
  const name=(await B.page.locator('#pilots tr td').first().textContent()).trim();
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  await B.page.reload();await expect(B.page.locator('#ticker')).toContainText('Green plane',{timeout:20e3});

  // A reload keeps the same anonymous pilot: the same points come back.
  const pts=(await A.page.locator('#me').textContent()).trim().split(' · ')[0];
  expect(pts).toMatch(/^[1-9]\d* pts$/);
  await A.page.reload();
  await expect(A.page.locator('#me')).toHaveText(new RegExp('^'+pts+' · '),{timeout:20e3});
  expect(A.errs).toEqual([]);expect(B.errs).toEqual([]);
});
