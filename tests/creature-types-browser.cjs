const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8766/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pins=()=>page.waitForFunction(()=>window.WOW_NPCS&&document.getElementById('npc-status').textContent.includes('подходят'));
 const ready=()=>page.waitForFunction(()=>document.getElementById('db-status').textContent.startsWith('Найдено'));
 try {
  await page.goto(base+'atlas.html?zone=elwynn_c60&npcs=1&npcQuery=6&npcRole=all&npcType=Humanoid&only=0&mobs=0&density=0&ores=0&herbs=0');await pins();
  assert.equal(await page.locator('#npcType option').count(),11);assert.match(await page.locator('#npc-status').innerText(),/NPC: 31 из/);
  await page.locator('#overlay').scrollIntoViewIfNeeded();const target=await page.evaluate(()=>{const [x,y]=WOW_NPCS.maps.elwynn_c60.find(p=>p[2]===6),r=document.getElementById('overlay').getBoundingClientRect();return {x:r.left+x*r.width/100,y:r.top+y*r.height/100};});
  await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/Тип: Гуманоид.*предварительно, Classic.*Forever не подтверждено/);
  await page.selectOption('#npcType','Beast');assert.match(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  await page.fill('#npcQuery','30');assert.doesNotMatch(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  await page.reload();await pins();assert.equal(await page.locator('#npcType').inputValue(),'Beast');assert.equal(await page.locator('#npcQuery').inputValue(),'30');
  await page.goto(base+'atlas.html?zone=zephrasisle&npcs=1&npcQuery=251451&npcRole=all&npcType=unknown&only=0');await pins();assert.doesNotMatch(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  await page.goto(base+'database.html?kind=npcs&id=6&npcType=Humanoid');await ready();assert.equal(await page.locator('.db-card').count(),1);assert.match(await page.locator('.creature-type').innerText(),/Тип: Гуманоид.*Classic/);
  await page.selectOption('#dbCreatureType','Beast');assert.equal(await page.locator('.db-card').count(),0);
  await page.fill('#query','');await page.locator('#database-search button[type=submit]').click();assert.match(await page.locator('#db-status').innerText(),/Найдено 845 /);
  await page.selectOption('#dbCreatureType','unknown');assert.match((await page.locator('#db-status').innerText()).replace(/[\s\u00a0\u202f]/g,''),/Найдено8418из/);
  await page.reload();await ready();assert.equal(await page.locator('#dbCreatureType').inputValue(),'unknown');
  await page.selectOption('#kind','items');await ready();assert.equal(await page.locator('#db-type-field').isVisible(),false);
  await page.goto(base+'database.html?kind=npcs&id=10776');await ready();assert.match(await page.locator('.creature-type').innerText(),/Имя отличается.*Finkle Einhorn/);
  await page.goto(base+'database.html?kind=npcs&id=30');await ready();assert.match(await page.locator('.creature-type').innerText(),/Тип: Зверь.*Семейство.*Spider/);
  const url=await page.locator('.db-links a').first().getAttribute('href');assert.equal(new URL(url).searchParams.get('npcType'),'all');
  await page.setViewportSize({width:320,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(url);await pins();assert.equal(await page.locator('#npcType').inputValue(),'all');assert.doesNotMatch(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS creature type browser: combined filters, source/unknown/name-change labels, URL restoration, catalog totals, map links and 320px layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
