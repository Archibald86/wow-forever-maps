const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8774/').replace(/\/?$/,'/'),browser=await chromium.launch(),page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1200,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('legacy-seeded')){localStorage.setItem('wow-forever-settings-v1',JSON.stringify({zone:'durotar_c60',level:10,only:true,npcs:false,mobs:false,npcType:'Undead',npcRole:'vendors',npcQuery:'6',hideServices:true}));sessionStorage.setItem('legacy-seeded','1')}});
  await page.goto(base+'atlas.html');await page.waitForFunction(()=>window.WOW_NPCS&&document.getElementById('npc-status').textContent.includes('подходят'));
  assert.equal(await page.locator('#zone').inputValue(),'durotar_c60');assert.equal(await page.locator('#levelnum').inputValue(),'10');assert(!await page.locator('#only').isChecked());assert(await page.locator('#npcs').isChecked());assert(await page.locator('#mobs').isChecked());
  const count=()=>page.locator('#npc-status').innerText();const initial=await count();const matches=initial.match(/NPC: (\d+) из (\d+)/);assert(matches&&Number(matches[1])>100&&matches[1]===matches[2]);
  for(const level of ['1','60']){await page.fill('#levelnum',level);await page.locator('#levelnum').dispatchEvent('change');assert.equal(await count(),initial)}
  await page.check('#only');await page.selectOption('#npcType','Beast');await page.fill('#npcQuery','6');await page.check('#hideServices');await page.click('#show-all-mobs');
  assert(!await page.locator('#only').isChecked());assert.equal(await page.locator('#npcType').inputValue(),'all');assert.equal(await page.locator('#npcRole').inputValue(),'all');assert.equal(await page.locator('#npcQuery').inputValue(),'');assert(!await page.locator('#hideServices').isChecked());assert.equal(await count(),initial);
  await page.reload();await page.waitForFunction(()=>window.WOW_NPCS&&document.getElementById('npc-status').textContent.includes('подходят'));assert.equal(await count(),initial);
  await page.setViewportSize({width:320,height:950});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'index.html?focus=mobs');await page.waitForFunction(()=>!document.getElementById('start').disabled);await page.click('#start');await page.waitForFunction(()=>document.querySelector('.result a'));
  for(const href of await page.locator('.result a').evaluateAll(a=>a.map(el=>el.href)))assert.equal(new URL(href).searchParams.get('only'),'0');assert.deepEqual(errors,[]);
  console.log('PASS all mob levels: legacy filter migration, full NPC counts at levels 1 and 60, show-all reset, persistence, 320px layout and unrestricted recommendation links');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
