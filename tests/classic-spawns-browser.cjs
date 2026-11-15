const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8780/').replace(/\/?$/,'/'),browser=await chromium.launch(),page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.waitForFunction(()=>terrain.complete&&terrain.naturalWidth>0&&document.getElementById('stats').textContent.includes('1161'));
 try {
  await page.goto(base+'atlas.html?zone=elwynn_c60&level=6&only=0&mode=cells&mobs=1&npcs=0&ores=0&herbs=0&trainers=0&density=0&caves=0&npcQuery=&npcType=all&npcRole=all');await ready();
  assert.equal(await page.locator('#mode option:checked').innerText(),'Места появления · Classic');
  const pixels=()=>page.locator('#overlay').evaluate(c=>c.toDataURL());const initial=await pixels();
  for(const level of ['1','60']){await page.fill('#levelnum',level);await page.locator('#levelnum').dispatchEvent('change');assert.notEqual(await pixels(),initial)}
  await page.fill('#npcQuery','299');
  for(const [level,expected] of [[1,[250,204,21]],[6,[34,197,94]],[7,[156,163,175]]]) {
   if(level===6)await page.locator('#level').evaluate(el=>{el.value='6';el.dispatchEvent(new Event('input',{bubbles:true}))});
   else {await page.fill('#levelnum',String(level));await page.locator('#levelnum').dispatchEvent('change');}
   const pixel=await page.evaluate(()=>{const p=WOW_CLASSIC_SPAWNS.maps.elwynn_c60.points.find(p=>p[3].includes(299)),c=overlay;return [...c.getContext('2d').getImageData(Math.round(p[1]*c.width/100),Math.round(p[2]*c.height/100),1,1).data]});
   assert(pixel[3]>240);assert(pixel.slice(0,3).every((v,i)=>Math.abs(v-expected[i])<=2),JSON.stringify({level,pixel,expected}));
   assert.match(await page.locator('#stats').innerText(),/29 из 1161/);
  }
  await page.fill('#npcQuery','');
  const banditPixel=await page.evaluate(()=>{const c=document.getElementById('overlay');return c.getContext('2d').getImageData(Math.round(29.19*c.width/100),Math.round(58.33*c.height/100),1,1).data[3]});assert(banditPixel>0);
  await page.fill('#npcQuery','448');assert.match(await page.locator('#stats').innerText(),/6 из 1161 возможных мест · до 1/);
  await page.goto(base+'atlas.html?zone=elwynn_c60&level=6&only=0&mode=cells&mobs=1&npcs=0&ores=0&herbs=0&density=0&npcQuery=448&npcType=all&npcRole=all&areaX=26&areaY=90&areaRadius=20');await ready();
  assert.match(await page.locator('#area-status').innerText(),/Возможных мест: 6.*ограничениям: 1/);assert.equal(await page.locator('#area-rows tr').count(),1);
  await page.locator('#map-viewport').scrollIntoViewIfNeeded();
  const target=await page.evaluate(()=>{const p=WOW_CLASSIC_SPAWNS.maps.elwynn_c60.points.find(p=>p[3].includes(448)),r=overlay.getBoundingClientRect();return {x:r.left+p[1]*r.width/100,y:r.top+p[2]*r.height/100}});await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/6 возможных мест в источнике, не более 1/);
  await page.fill('#npcQuery','46');
  await page.locator('#map-viewport').scrollIntoViewIfNeeded();
  const targetM=await page.evaluate(()=>{const p=WOW_CLASSIC_SPAWNS.maps.elwynn_c60.points.find(p=>p[3].includes(46)),r=overlay.getBoundingClientRect();return {x:r.left+p[1]*r.width/100,y:r.top+p[2]*r.height/100}});await page.mouse.click(targetM.x,targetM.y);assert.match(await page.locator('#point-info').innerText(),/ID 732/);assert.match(await page.locator('#point-info').innerText(),/альтернативы/);
  await page.fill('#npcQuery','');await page.check('#only');await page.fill('#levelnum','60');await page.locator('#levelnum').dispatchEvent('change');assert.match(await page.locator('#stats').innerText(),/0 из 1161/);await page.click('#show-all-mobs');assert(!await page.locator('#only').isChecked());assert.match(await page.locator('#stats').innerText(),/1161 из 1161/);await page.waitForFunction(()=>window.WOW_NPCS);
  assert(await page.locator('#npc-status').innerText().then(t=>t.includes('услуги и квесты')));
  await page.selectOption('#zone','durotar_c60');await page.waitForFunction(()=>terrain.src.endsWith('/durotar_c60.jpg')&&terrain.complete);assert.equal(await page.locator('#mode option:checked').innerText(),'Места появления · Classic');assert.equal(await page.locator('#legend [data-delta="-2"]').count(),1);
  await page.selectOption('#zone','elwynn_c60');await ready();await page.uncheck('#npcs');await page.fill('#levelnum','6');await page.locator('#levelnum').dispatchEvent('change');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  if(process.env.CLASSIC_SCREENSHOT)await page.locator('#map-viewport').screenshot({path:process.env.CLASSIC_SCREENSHOT});
  const failing=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1'});await failing.route('**/classic-spawn-data.js*',r=>r.abort());await failing.goto(base+'atlas.html?zone=elwynn_c60');await failing.waitForFunction(()=>document.getElementById('classic-spawn-status').textContent.includes('прежняя оценка'));assert(await failing.locator('#data-error').isHidden());await failing.close();
  assert.deepEqual(errors,[]);console.log('PASS Classic browser: markers, relative level colours and strict grey threshold, uncovered locations, filtered group caps, alternatives, show-all, zone fallback, 4 viewport widths and optional-source failure');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
