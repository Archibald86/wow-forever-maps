const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8766/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let npcRequests=0;
 page.on('request',r=>{if(r.url().includes('npc-atlas.json'))npcRequests++;});
 const ready=()=>page.waitForFunction(()=>window.WOW_DATA&&!document.getElementById('zone').disabled&&terrain.naturalWidth>0);
 const pins=()=>page.waitForFunction(()=>document.getElementById('npc-status').textContent.includes('подходят'));
 try {
  await page.goto(base+'atlas.html?zone=elwynn_c60&npcs=0&mobs=0&density=0&ores=0&herbs=0&only=0');await ready();assert.equal(npcRequests,0);
  await page.check('#npcs');await pins();assert.equal(npcRequests,1);
  await page.fill('#npcQuery','6');await page.waitForFunction(()=>document.getElementById('npc-status').textContent.includes('NPC: 31 из'));
  await page.locator('#overlay').scrollIntoViewIfNeeded();
  const target=await page.evaluate(()=>{const [x,y]=WOW_NPCS.maps.elwynn_c60.find(p=>p[2]===6),r=document.getElementById('overlay').getBoundingClientRect();return {x:r.left+x*r.width/100,y:r.top+y*r.height/100};});
  await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/Кобольд-вредитель.*ID 6/);assert.equal(await page.locator('#point-source').getAttribute('href'),'database.html?kind=npcs&id=6');
  await page.reload();await ready();await pins();assert.equal(await page.locator('#npcQuery').inputValue(),'6');
  await page.fill('#npcQuery','');await page.selectOption('#npcRole','quests');await page.selectOption('#zone','zephrasisle');await pins();assert.doesNotMatch(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  await page.selectOption('#zone','darkspearisland');await pins();assert.match(await page.locator('#npc-status').innerText(),/NPC: 0 из 0/);
  for(const [kind,id,expected]of [['npcs',6,'Кобольд'],['quests',7,'кобольдов'],['items',25,'меч'],['objects',31,'статуя']]) {
   await page.goto(`${base}database.html?kind=${kind}&id=${id}`);await page.waitForFunction(()=>document.getElementById('db-status').textContent.startsWith('Найдено'));
   assert.equal(await page.locator('.db-card').count(),1);assert.match((await page.locator('.db-card').innerText()).toLowerCase(),new RegExp(expected.toLowerCase()));
   if(kind==='npcs')assert.ok(await page.locator('.db-links a').count());
  }
  await page.setViewportSize({width:320,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.route('**/npc-atlas.json*',route=>route.abort());
  await page.goto(base+'atlas.html?zone=teldrassil_c60&npcs=1&npcRole=all&npcQuery=&only=0');await ready();
  await page.locator('#npc-retry').waitFor({state:'visible'});assert.equal(await page.locator('#data-error').isVisible(),false);
  await page.unroute('**/npc-atlas.json*');await page.click('#npc-retry');await pins();assert.doesNotMatch(await page.locator('#npc-status').innerText(),/NPC: 0 из/);
  await page.setViewportSize({width:390,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS Questie browser: lazy load, exact ID, point details, URL restoration, missing-zone coverage, all catalogs, mobile and failed-load retry');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
