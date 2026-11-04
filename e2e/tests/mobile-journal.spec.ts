import { devices, expect, request as apiRequest, test, Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const run = Date.now().toString(36);
const accountA = { email: `e2e-a-${run}@example.test`, password: 'test-only-password-A', name: 'E2E account A' };
const accountB = { email: `e2e-b-${run}@example.test`, password: 'test-only-password-B', name: 'E2E account B' };

// 1x1 RGBA PNG (valid chunks and CRCs), used as the fictitious plant photo.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${label}: page wider than the phone screen (${scrollWidth} > ${innerWidth})`).toBeLessThanOrEqual(innerWidth);
}

async function loginThroughUi(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForFunction(() => !!localStorage.getItem('canopyos_token'), undefined, { timeout: 30_000 });
  await page.waitForURL(/\/plants$/, { timeout: 30_000 }); // login lands on the plant journal
}

test('plant journal on a phone: login, plant, entries, photo, reload, isolation', async ({ page, browser }, testInfo) => {
  const api = await apiRequest.newContext({ baseURL: API });

  await test.step('Create two throwaway test accounts through the API', async () => {
    for (const account of [accountA, accountB]) {
      const res = await api.post('/auth/register', { data: account });
      expect(res.status(), `register ${account.email}`).toBe(201);
    }
  });

  await test.step('Login through the phone UI', async () => {
    await page.goto('/login');
    await expectNoHorizontalOverflow(page, 'login');
    await loginThroughUi(page, accountA);
  });

  let plantId = '';

  await test.step('Empty state, then create a COCO plant', async () => {
    await page.goto('/plants');
    await expect(page.getByRole('heading', { name: 'Votre journal commence ici' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'plant list (empty)');
    await page.getByRole('link', { name: '+ Ajouter' }).click();
    await expect(page.getByRole('heading', { name: 'Ajouter une plante' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'new plant form');
    await page.getByLabel('Nom de la plante').fill('Plante E2E 01');
    await page.getByLabel('Variété').fill('Variété fictive');
    await page.getByLabel('Environnement').selectOption('INDOOR');
    await page.getByLabel('Support de culture').selectOption('COCO');
    await page.getByRole('button', { name: 'Créer ma plante' }).click();
    await expect(page.getByRole('heading', { name: 'Plante E2E 01', level: 1 })).toBeVisible();
    await expect(page.getByText('Variété fictive · INDOOR · COCO')).toBeVisible();
    plantId = page.url().split('/plants/')[1];
    expect(plantId).toBeTruthy();
    await expectNoHorizontalOverflow(page, 'plant detail');
  });

  const entries = [
    { notes: 'E2E observation 1 - première feuille', ph: '6.1', ec: '1.4', temperature: '23.5', humidity: '55' },
    { notes: 'E2E observation 2 - croissance régulière', ph: '5.9', ec: '1.6', temperature: '24', humidity: '58' },
    { notes: 'E2E observation 3 - arrosage effectué', ph: '6.2', ec: '1.5', temperature: '22.8', humidity: '60' },
  ];

  await test.step('Add three journal entries with measurements', async () => {
    for (const [index, entry] of entries.entries()) {
      await page.locator('#notes').fill(entry.notes);
      await page.getByLabel('pH', { exact: true }).fill(entry.ph);
      await page.getByLabel('EC', { exact: true }).fill(entry.ec);
      await page.getByLabel('Température').fill(entry.temperature);
      await page.getByLabel('Humidité').fill(entry.humidity);
      await page.getByRole('button', { name: 'Ajouter au journal' }).click();
      await expect(page.locator('ol > li')).toHaveCount(index + 1);
      await expect(page.locator('ol > li').first()).toContainText(entry.notes);
      await expect(page.locator('ol > li').first()).toContainText(`pH : ${entry.ph}`);
    }
    // newest first
    await expect(page.locator('ol > li').nth(2)).toContainText(entries[0].notes);
  });

  await test.step('Out-of-range pH is refused and nothing is saved', async () => {
    await page.locator('#notes').fill('E2E entrée invalide');
    await page.getByLabel('pH', { exact: true }).fill('15');
    await page.getByRole('button', { name: 'Ajouter au journal' }).click();
    await expect(page.locator('ol > li')).toHaveCount(3);
    expect(await page.getByLabel('pH', { exact: true }).evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
    await page.locator('#notes').fill('');
    await page.getByLabel('pH', { exact: true }).fill('');
  });

  await test.step('Photo: a real PNG is uploaded and displayed; a text file is refused', async () => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({ name: 'feuille.png', mimeType: 'image/png', buffer: PNG });
    const gallery = page.getByAltText('Photo de culture importée');
    await expect(gallery).toHaveCount(1);
    await expect.poll(() => gallery.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);

    await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await expect(page.locator('main [role="alert"]')).toContainText('Import de la photo impossible');
    await expect(gallery).toHaveCount(1);
    await testInfo.attach('plant-detail-mobile', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });

  await test.step('Reload: session, entries, measurements and photo persist', async () => {
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/plants/${plantId}$`));
    await expect(page.getByRole('heading', { name: 'Plante E2E 01', level: 1 })).toBeVisible();
    await expect(page.locator('ol > li')).toHaveCount(3);
    for (const entry of entries) await expect(page.getByText(entry.notes)).toBeVisible();
    await expect(page.locator('ol > li').first()).toContainText(`pH : ${entries[2].ph}`);
    const gallery = page.getByAltText('Photo de culture importée');
    await expect(gallery).toHaveCount(1);
    await expect.poll(() => gallery.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  });

  await test.step('Plant list shows the plant with its variety and medium', async () => {
    await page.goto('/plants');
    const card = page.getByRole('link', { name: /Plante E2E 01/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Variété fictive');
    await expect(card).toContainText('INDOOR · COCO');
    await expectNoHorizontalOverflow(page, 'plant list');
  });

  await test.step('Account B (separate browser context) cannot see or open the plant of A', async () => {
    const context = await browser.newContext({ ...devices['Pixel 5'], baseURL: BASE });
    const pageB = await context.newPage();
    await loginThroughUi(pageB, accountB);
    await pageB.goto('/plants');
    await expect(pageB.getByRole('heading', { name: 'Votre journal commence ici' })).toBeVisible();
    await expect(pageB.getByText('Plante E2E 01')).toHaveCount(0);
    await pageB.goto(`/plants/${plantId}`);
    // two requests fail (plant, photos) and share one error state: either message is a refusal
    await expect(pageB.locator('main [role="alert"]')).toContainText(/Impossible de charger/);
    await expect(pageB.getByText('E2E observation 1')).toHaveCount(0);
    await expect(pageB.getByAltText('Photo de culture importée')).toHaveCount(0);
    await context.close();
  });

  await test.step('Direct API calls with the token of B are refused for the data of A', async () => {
    const loginA = await (await api.post('/auth/login', { data: { email: accountA.email, password: accountA.password } })).json();
    const loginB = await (await api.post('/auth/login', { data: { email: accountB.email, password: accountB.password } })).json();
    const asA = await apiRequest.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${loginA.token}` } });
    const asB = await apiRequest.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${loginB.token}` } });
    const photos = await (await asA.get(`/plants/${plantId}/photos`)).json();
    expect(photos).toHaveLength(1);

    expect((await asA.get(`/plants/${plantId}`)).status()).toBe(200);
    for (const path of [`/plants/${plantId}`, `/plants/${plantId}/logs`, `/plants/${plantId}/photos`, `/plants/${plantId}/photos/${photos[0].id}`]) {
      expect((await asB.get(path)).status(), `B GET ${path}`).toBe(404);
    }
    expect((await asB.post(`/plants/${plantId}/logs`, { data: { notes: 'intrusion' } })).status()).toBe(404);
    expect((await asA.get(`/plants/${plantId}/logs`).then(r => r.json()))).toHaveLength(3);
  });
});
