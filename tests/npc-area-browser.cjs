const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8766/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.waitForFunction(()=>window.WOW_NPCS&&terrain.naturalWidth>0&&document.getElementById('area-status').textContent.includes('Показано'));
 const count=()=>page.locator('#area-rows tr').evaluateAll(rows=>rows.reduce((sum,row)=>sum+Number(row.dataset.positions),0));
 try {
  await page.goto(base+'atlas.html?zone=elwynn_c60&npcs=1&npcQuery=6&npcRole=all&npcType=all&only=0&mobs=0&density=0&ores=0&herbs=0&areaRadius=5&areaX=48.89&areaY=36.44&mapZoom=1&hideServices=0&npcGrouping=auto');await ready();
  const oracle=await page.evaluate(()=>{const w=terrain.naturalWidth,h=terrain.naturalHeight;return WOW_NPCS.maps.elwynn_c60.filter(p=>p[2]===6&&Math.hypot((p[0]-48.89)*w/100,(p[1]-36.44)*h/100)<=w*.05+1e-7).length;});
  assert.equal(await count(),oracle);assert.equal(await page.locator('#area-rows tr').count(),1);assert.match(await page.locator('#area-rows').innerText(),/Кобольд-вредитель.*1–2.*Гуманоид/s);
  assert.match(await page.locator('.area-panel').innerText(),/Фактическое число живых существ сейчас неизвестно/);assert.match(await page.locator('#npc-cluster-status').innerText(),/групп/);
  await page.selectOption('#areaRadius','20');const larger=await count();assert(larger>=oracle);
  await page.selectOption('#mapZoom','2');await page.waitForFunction(()=>document.getElementById('map-area').getBoundingClientRect().width>document.getElementById('map-viewport').clientWidth*1.9);
  assert.equal(await count(),larger);assert.match(await page.locator('#npc-cluster-status').innerText(),/Отдельных позиций NPC: 31/);
  await page.reload();await ready();assert.equal(await page.locator('#mapZoom').inputValue(),'2');assert.equal(await page.locator('#areaRadius').inputValue(),'20');assert.equal(await count(),larger);
  await page.waitForFunction(()=>{const r=terrain.getBoundingClientRect(),v=document.getElementById('map-viewport').getBoundingClientRect(),x=r.left+r.width*.4889,y=r.top+r.height*.3644;return x>=v.left&&x<=v.right&&y>=v.top&&y<=v.bottom;});
  const geometry=await page.evaluate(()=>{const a=terrain.getBoundingClientRect(),b=document.getElementById('overlay').getBoundingClientRect();return Math.max(Math.abs(a.left-b.left),Math.abs(a.top-b.top),Math.abs(a.width-b.width),Math.abs(a.height-b.height));});assert(geometry<1);
  await page.selectOption('#npcType','Beast');assert.equal(await count(),0);await page.selectOption('#npcType','all');assert.equal(await count(),larger);
  await page.check('#only');assert.equal(await count(),0);await page.uncheck('#only');assert.equal(await count(),larger);
  await page.setViewportSize({width:320,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.click('#area-clear');assert(!new URL(page.url()).searchParams.has('areaX'));assert.equal(await page.locator('#area-rows tr').count(),0);
  await page.locator('#map-area').press('ArrowRight');await ready();assert(new URL(page.url()).searchParams.has('areaX'));await page.locator('#map-area').press('Escape');assert.equal(await page.locator('#area-rows tr').count(),0);
  await page.goto(base+'atlas.html?zone=elwynn_c60&npcs=1&npcQuery=&npcRole=all&npcType=all&only=0&areaRadius=5&areaX=50&areaY=50&mapZoom=1&hideServices=0');await ready();
  const vendor=await page.evaluate(()=>{const p=WOW_NPCS.maps.elwynn_c60.find(p=>WOW_NPCS.npcs[p[2]].flags&128);return {x:p[0],y:p[1],id:p[2]};});
  await page.goto(`${base}atlas.html?zone=elwynn_c60&npcs=1&npcQuery=${vendor.id}&npcRole=all&npcType=all&only=0&areaRadius=5&areaX=${vendor.x}&areaY=${vendor.y}&mapZoom=1&hideServices=0`);await ready();assert(await count()>0);await page.check('#hideServices');assert.equal(await count(),0);
  await page.selectOption('#zone','darkspearisland');await page.waitForFunction(()=>terrain.complete&&terrain.src.endsWith('/darkspearisland.jpg')&&document.getElementById('npc-status').textContent.includes('NPC: 0 из 0'));assert(!new URL(page.url()).searchParams.has('areaX'));await page.locator('#map-area').press('ArrowRight');await page.waitForFunction(()=>document.getElementById('area-status').textContent.includes('нет координат NPC'));assert.equal(await page.locator('#area-rows tr').count(),0);
  assert(new URL(page.url()).searchParams.has('areaX')); // arrow selects a new center for this zone
  await page.uncheck('#npcs');assert.match(await page.locator('#area-status').innerText(),/Включите NPC/);await page.click('#area-enable-npcs');assert.equal(await page.locator('#npcs').isChecked(),true);
  assert.deepEqual(errors,[]);console.log('PASS NPC area browser: independent count oracle, zoom invariance, combined filters, source labels, shared center/radius, keyboard, mobile, services and missing zone');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
