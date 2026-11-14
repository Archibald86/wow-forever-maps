// Run against a local server or a deployed site: node tests/atlas-layout.cjs URL
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const base = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ignoreHTTPSErrors: process.env.ALLOW_TEST_CERT === '1' });
  const errors = [], failed = [], metrics = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  try {
    await page.goto(base + 'atlas.html?level=42&zone=swampofsorrows_c60&only=1');
    await page.waitForFunction(() => terrain.complete && terrain.naturalWidth > 0 && !document.getElementById('zone').disabled);
    assert.equal(await page.locator('#only').isChecked(), true);
    assert.equal(await page.locator('#level').inputValue(), '42');
    const zones = await page.locator('#zone option').evaluateAll(items => items.map(x => x.value));
    assert.equal(zones.length, 37);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const zone of zones) {
        await page.selectOption('#zone', zone);
        await page.waitForFunction(id => terrain.complete && terrain.naturalWidth > 0 &&
          terrain.src.endsWith('/' + id + '.jpg'), zone);
        const geometry = await page.evaluate(() => {
          const img = document.getElementById('terrain');
          const canvas = document.getElementById('overlay');
          const a = img.getBoundingClientRect(), c = canvas.getBoundingClientRect();
          const ratio = img.naturalHeight / img.naturalWidth;
          // Compare positions at both edges and at the center of the data frame.
          const offsets = [0, .5, 1].map(f => Math.max(
            Math.abs((a.x + f*a.width) - (c.x + f*c.width)),
            Math.abs((a.y + f*a.width*ratio) - (c.y + f*c.height))));
          return { viewport:innerWidth, scroll:document.documentElement.scrollWidth,
            image:[a.width,a.height], canvas:[c.width,c.height], offsets };
        });
        assert.ok(geometry.scroll <= width, `Horizontal overflow: ${width} ${zone}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.offsets.every(x => x < 1), `Map overlay shifted: ${width} ${zone}: ${JSON.stringify(geometry)}`);
        metrics.push({ width, zone, ...geometry });
      }
    }
    await page.selectOption('#zone', 'stranglethorn_c60');
    await page.waitForFunction(() => terrain.complete && terrain.src.endsWith('/stranglethorn_c60.jpg'));
    for (const mode of ['cells','dots']) {
      await page.selectOption('#mode',mode);
      for (let mask = 0; mask < 64; mask++) {
      for (const [i,id] of ['mobs','density','ores','herbs','only','trainers'].entries()) {
        await page.locator('#'+id).setChecked(Boolean(mask & (1 << i)));
      }
      const visible = await page.evaluate(() => {
        const c=document.getElementById('overlay');
        const rgba=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        for (let i=3;i<rgba.length;i+=4) if(rgba[i]) return true;
        return false;
      });
      assert.equal(visible, Boolean(mask & 47), `Layer combination ${mode} ${mask}`);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    console.log(JSON.stringify({ result:'PASS', maps:zones.length, viewports:4,
      geometryChecks:metrics.length, layerCombinations:128, displayModes:2,
      maxAlignmentError:Math.max(...metrics.flatMap(x=>x.offsets)) }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
