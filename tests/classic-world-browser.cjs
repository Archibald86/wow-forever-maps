const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8780/').replace(/\/?$/,'/'),browser=await chromium.launch(),page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(base+'atlas.html?zone=elwynn_c60&mode=cells&only=0&mobs=1&npcs=0&ores=0&herbs=0&density=0&caves=0&trainers=0&npcQuery=&npcType=all&npcRole=all&mapZoom=1');
  await page.waitForFunction(()=>window.WOW_CLASSIC_SPAWNS&&terrain.complete&&terrain.naturalWidth>0&&!document.getElementById('zone').disabled);
  const zones=await page.evaluate(()=>Object.keys(WOW_CLASSIC_SPAWNS.maps));assert.equal(zones.length,40);
  let checked=0;
  for(const zone of zones) {
   await page.fill('#npcQuery','');await page.selectOption('#zone',zone);await page.waitForFunction(id=>terrain.complete&&terrain.src.endsWith('/'+id+'.jpg'),zone);
   assert.equal(await page.locator('#mode option:checked').innerText(),'Места появления · Classic');
   const total=await page.evaluate(id=>WOW_CLASSIC_SPAWNS.maps[id].points.length,zone);
   for(const level of ['1','60']) {await page.fill('#levelnum',level);await page.locator('#levelnum').dispatchEvent('change');assert((await page.locator('#stats').innerText()).includes(`${total} из ${total} возможных мест`),zone)}
   const sample=await page.evaluate(id=>{const m=WOW_CLASSIC_SPAWNS.maps[id],w=terrain.naturalWidth,h=terrain.naturalHeight;const p=m.points.find(p=>!p[7].length&&p[1]>1&&p[1]<99&&p[2]>1&&p[2]<99&&m.points.every(q=>q===p||!q[3].includes(p[3][0])||Math.hypot((q[1]-p[1])*w/100,(q[2]-p[2])*h/100)>10))||m.points.find(p=>!p[7].length)||m.points[0];return {guid:p[0],npc:p[3][0]}},zone);
   await page.fill('#npcQuery',String(sample.npc));
   // Check actual renderer output, including all eight Classic creature types.
   const result=await page.evaluate(({zone,sample})=>{const d=WOW_CLASSIC_SPAWNS,p=d.maps[zone].points.find(p=>p[0]===sample.guid),n=d.npcs[sample.npc],c=overlay;const ctx=c.getContext('2d'),x=Math.round(p[1]*c.width/100),y=Math.round(p[2]*c.height/100),rgba=[...ctx.getImageData(x,y,1,1).data];return {rgba,colour:WowSettings.color((n.min_level+n.max_level)/2-60),capped:p[7].length>0}}, {zone,sample});
   if(!result.capped){const expected=result.colour.slice(1).match(/../g).map(v=>parseInt(v,16));assert(result.rgba[3]>0,zone);assert(result.rgba.slice(0,3).every((v,i)=>Math.abs(v-expected[i])<=3),JSON.stringify({zone,...result}))}
   await page.setViewportSize({width:320,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),zone);await page.setViewportSize({width:1440,height:1100});checked++;
  }
  for(const zone of ['darkspearisland','zephrasisle']){await page.selectOption('#zone',zone);await page.waitForFunction(id=>terrain.complete&&terrain.src.endsWith('/'+id+'.jpg'),zone);assert.equal(await page.locator('#mode option:checked').innerText(),'Тепловая карта уровней')}
  assert.deepEqual(errors,[]);console.log('PASS Classic world browser:',checked,'maps, all-level visibility at 1/60, real marker colours, 320px layouts and 2 modern-zone fallbacks');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
