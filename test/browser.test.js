const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../server');
let server, browser, context, page, origin, errors;
before(async () => {
  server = createServer(path.join(__dirname, '../dist'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
});
afterEach(async () => { await context?.close(); assert.deepEqual(errors, [], 'No browser errors'); });
const click = id => page.locator('#' + id).click();
const navigate = name => page.locator(`nav [data-page="${name}"]`).click();
const data = () => page.evaluate(() => JSON.parse(localStorage.getItem('cabline-v1')));
async function createBooking() {
  await click('newBooking');
  await page.locator('[name=name]').fill('Test Passenger');
  await page.locator('[name=from]').fill('Union Street');
  await page.locator('[name=to]').fill('Aberdeen Airport');
  await page.locator('[name=miles]').fill('10');
  await page.getByRole('button', { name: 'Confirm booking' }).click();
}
test('all six screens render on desktop and mobile without overflow', async () => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['overview','jobs','vehicle','logs','passenger','settings']) {
      await navigate(name);
      assert.ok(await page.locator('#title').innerText());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
    }
  }
});
test('passenger can create, edit, and cancel a booking; reload retains it', async () => {
  await createBooking();
  let job = (await data()).jobs.at(-1);
  assert.equal(job.fare, 26.5);
  await navigate('passenger');
  await page.locator(`[data-job="${job.id}"]`).click();
  await click('editJob');
  await page.locator('[name=from]').fill('New pickup');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.reload();
  job = (await data()).jobs.at(-1);
  assert.equal(job.from, 'New pickup');
  await navigate('passenger');
  await page.locator(`[data-job="${job.id}"]`).click();
  await click('cancelJob');
  assert.equal((await data()).jobs.at(-1).status, 'cancelled');
});
test('busy driver cannot start a job; available driver can complete it with final fare', async () => {
  await click('busy');
  await page.locator('[data-job="1042"]').click();
  await click('startJob');
  assert.equal((await data()).jobs[0].status, 'upcoming');
  await page.locator('#modal [data-close]').click();
  await click('busy');
  await page.locator('[data-job="1042"]').click();
  await click('startJob');
  assert.equal((await data()).jobs[0].status, 'active');
  await navigate('jobs');
  await page.locator('[data-job="1042"]').click();
  await click('finishJob');
  await page.locator('[name=fare]').fill('32.50');
  await page.getByRole('button', { name: 'Save completed fare' }).click();
  const job = (await data()).jobs[0];
  assert.equal(job.status, 'completed');
  assert.equal(job.fare, 32.5);
  assert.ok(job.end);
});
test('end shift rejects decreasing mileage and exports earnings with 50/50 split', async () => {
  await click('shift');
  await page.locator('[name=mileage]').fill('1');
  assert.equal(await page.locator('[name=mileage]').evaluate(e => e.checkValidity()), false);
  await page.locator('[name=mileage]').fill('42900');
  await page.getByRole('button', { name: 'End shift', exact: true }).click();
  const state = await data();
  assert.equal(state.shift.active, false);
  assert.equal(state.logs[0].endMileage, 42900);
  const downloaded = page.waitForEvent('download');
  await click('download');
  const file = await downloaded;
  assert.match(file.suggestedFilename(), /\.xml$/);
  const stream = await file.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const xml = Buffer.concat(chunks).toString();
  assert.match(xml, /Driver earnings/);
  assert.match(xml, /42900/);
  assert.match(xml, /ss:Type="Number">13<\/Data>/);
  assert.match(xml, /ss:Type="Number">14.5<\/Data>/);
});
test('safety checks alone preserve break status and mileage; switching records previous odometer', async () => {
  await click('busy');
  await navigate('vehicle');
  await click('checks');
  for (const check of await page.locator('#startForm input[type=checkbox]').all()) await check.check();
  await page.getByRole('button', { name: 'Save checks' }).click();
  assert.equal((await data()).shift.busy, true);
  assert.equal((await data()).shift.mileage, 42816);
  await click('switch');
  await page.locator('[name=reg]').fill('AB12 XYZ');
  await page.locator('[name=mileage]').fill('1000');
  await page.locator('[name=previous]').fill('42850');
  for (const check of await page.locator('#startForm input[type=checkbox]').all()) await check.check();
  await page.getByRole('button', { name: 'Confirm & start' }).click();
  const state = await data();
  assert.equal(state.shift.reg, 'AB12 XYZ');
  assert.equal(state.shift.mileage, 1000);
  assert.equal(state.logs[0].endMileage, 42850);
});
test('fare settings persist and update booking estimates', async () => {
  await navigate('settings');
  await page.locator('[name=share]').fill('40');
  await page.locator('[name=base]').fill('5');
  await page.locator('[name=rate]').fill('3');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.reload();
  assert.equal((await data()).share, 40);
  await createBooking();
  assert.equal((await data()).jobs.at(-1).fare, 35);
});
test('defect report saves a photo and escapes entered text', async () => {
  await navigate('vehicle');
  await click('defect');
  await page.locator('[name=note]').fill('<img src=x onerror=alert(1)> tyre damage');
  await page.locator('#photo').setInputFiles({ name:'defect.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Save defect' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cabline-v1'))?.defects.length === 1);
  assert.equal((await data()).defects.length, 1);
  assert.match((await data()).defects[0].photo, /^data:image\/png;base64,/);
  assert.equal(await page.locator('img[onerror]').count(), 0);
  await page.getByText('<img src=x onerror=alert(1)> tyre damage').waitFor();
});
