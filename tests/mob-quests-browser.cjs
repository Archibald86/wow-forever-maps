const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage(),errors=[];const base=(process.argv[2]||'http://127.0.0.1:8794/').replace(/\/?$/,'/');page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'atlas.html?zone=elwynn_c60&mode=cells&only=0&mobs=1&npcs=0&ores=0&herbs=0&density=0&caves=0&trainers=0&npcQuery=6&npcType=all&npcRole=all&mapZoom=1');
await page.waitForFunction(()=>window.WowMobQuests&&terrain.complete&&terrain.naturalWidth&&!document.getElementById('zone').disabled);
for(const width of [1440,320]){await page.setViewportSize({width,height:1000});
await page.locator('#overlay').scrollIntoViewIfNeeded();
const p=await page.evaluate(()=>{const p=WOW_CLASSIC_SPAWNS.maps.elwynn_c60.points.find(p=>p[3].includes(6)),r=overlay.getBoundingClientRect();return{x:r.left+p[1]*r.width/100,y:r.top+p[2]*r.height/100}});
await page.mouse.move(p.x,p.y);await page.waitForTimeout(150);assert.match(await page.locator('#map-tooltip').textContent(),/Квесты: 3 · на убийство: 1 · на добычу: 2/);
await page.mouse.click(p.x,p.y);assert.match(await page.locator('#point-info').textContent(),/На убийство \(Classic\), ID: 7/);
assert(await page.locator('#map-tooltip').evaluate(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight}));}
assert.deepEqual(errors,[]);console.log('PASS hover counts, click details, mobile tooltip bounds, no browser errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
