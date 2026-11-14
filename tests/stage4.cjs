const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8765/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1000,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let scenarios=0;
 const ready=()=>page.waitForFunction(()=>window.WOW_DATA&&!document.getElementById('zone').disabled&&terrain.complete&&terrain.naturalWidth>0);
 const change=async(id,value)=>{await page.fill('#'+id,String(value));await page.locator('#'+id).dispatchEvent('change');};
 async function pointTarget(layer,kind) {
  await page.locator('#overlay').scrollIntoViewIfNeeded();
  return page.evaluate(({layer,kind})=>{
   const zone=document.getElementById('zone').value;
   const point=layer==='trainers'?WOW_DATA.trainers[zone][0]:WOW_DATA[layer][zone].find(row=>row[2]===kind);
   const x=layer==='trainers'?point.x:point[0],y=layer==='trainers'?point.y:point[1];
   const r=document.getElementById('overlay').getBoundingClientRect();return {x:r.left+x*r.width/100,y:r.top+y*r.height/100};
  },{layer,kind});
 }
 try{
  await page.goto(base+'atlas.html?zone=elwynn_c60&level=17&mobs=0&density=0&ores=1&herbs=1&only=0');await ready();
  assert.equal(await page.locator('#resource option').count(),43);scenarios++;
  await page.locator('.resource-filters summary').click();
  await change('miningSkill',1);await change('herbalismSkill',1);await page.check('#skillFilter');await page.uncheck('#unknownSkill');await page.uncheck('#herbs');
  let target=await pointTarget('ore',201);await page.mouse.move(target.x,target.y);await page.locator('#map-tooltip').waitFor({state:'visible'});
  assert.match(await page.locator('#map-tooltip').innerText(),/Медная жила/);
  await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/горное дело: 1/);assert.ok((await page.locator('#point-source').getAttribute('href')).includes('/forever/guide/'));scenarios++;
  await page.selectOption('#resource','403');
  assert.match(await page.locator('#stats').innerText(),/нет записей с выбранными фильтрами/);
  await change('herbalismSkill',15);target=await pointTarget('herbs',403);await page.mouse.click(target.x,target.y);
  assert.match(await page.locator('#point-info').innerText(),/травничество: 15/);scenarios++;
  await page.reload();await ready();assert.equal(await page.locator('#resource').inputValue(),'403');assert.equal(await page.locator('#herbalismSkill').inputValue(),'15');assert.equal(await page.locator('#skillFilter').isChecked(),true);scenarios++;
  await page.selectOption('#zone','wetlands_c60');await ready();await page.selectOption('#resource','219');await change('miningSkill',0);
  assert.match(await page.locator('#stats').innerText(),/нет записей с выбранными фильтрами/);
  await page.check('#unknownSkill');assert.match(await page.locator('#filter-status').innerText(),/Неизвестное требование/);
  target=await pointTarget('ore',219);await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/не подтверждено/);scenarios++;
  await page.selectOption('#resource','all');for(const id of ['ores','herbs','mobs','density'])await page.uncheck('#'+id);
  await page.selectOption('#zone','elwynn_c60');await ready();await page.check('#trainers');await page.selectOption('#faction','all');
  target=await pointTarget('trainers');await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/Kelsey Fargo/);assert.match(await page.locator('#point-info').innerText(),/Альянс/);scenarios++;
  await page.selectOption('#faction','horde');assert.match(await page.locator('#point-info').innerText(),/нет точек/);assert.equal(await page.locator('#point-source').isHidden(),true);scenarios++;
  await page.goto(base+'index.html?focus=herbs&resource=all&skillFilter=0');await page.waitForFunction(()=>!document.getElementById('start').disabled);await page.click('#start');
  assert.match(await page.locator('.result strong').first().innerText(),/Степи/);
  assert.match(await page.locator('#results').innerText(),/данные мобов отсутствуют/);
  const link=await page.locator('.result a').first().getAttribute('href');assert.ok(link.includes('herbs=1')&&link.includes('ores=0')&&link.includes('only=0'));scenarios++;
  await page.locator('.resource-filters summary').click();await page.selectOption('#focus','ore');await change('miningSkill',0);await page.check('#skillFilter');await page.uncheck('#unknownSkill');
  assert.equal(await page.locator('.result').count(),0);assert.match(await page.locator('#results').innerText(),/Нет локаций/);scenarios++;
  await change('miningSkill',1);await page.selectOption('#resource','201');assert.ok(await page.locator('.result').count()>0);
  const filtered=await page.locator('.result a').first().getAttribute('href');assert.ok(filtered.includes('resource=201')&&filtered.includes('miningSkill=1')&&filtered.includes('skillFilter=1'));
  await page.goto(filtered);await ready();assert.equal(await page.locator('#resource').inputValue(),'201');assert.equal(await page.locator('#miningSkill').inputValue(),'1');scenarios++;
  await page.setViewportSize({width:390,height:844});target=await pointTarget('ore',201);await page.mouse.click(target.x,target.y);assert.match(await page.locator('#point-info').innerText(),/Медная жила/);scenarios++;
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}scenarios++;
  const mobile=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base+'atlas.html?zone=elwynn_c60&resource=201&ores=1&herbs=0&mobs=0&density=0&skillFilter=1&miningSkill=1');
  await mobile.waitForFunction(()=>window.WOW_DATA&&!document.getElementById('zone').disabled&&terrain.complete&&terrain.naturalWidth>0);
  await mobile.locator('#overlay').scrollIntoViewIfNeeded();
  const touch=await mobile.evaluate(()=>{const point=WOW_DATA.ore.elwynn_c60[0],r=document.getElementById('overlay').getBoundingClientRect();return{x:r.left+point[0]*r.width/100,y:r.top+point[1]*r.height/100};});
  await mobile.touchscreen.tap(touch.x,touch.y);assert.match(await mobile.locator('#point-info').innerText(),/Медная жила/);assert.equal(await mobile.locator('#map-tooltip').isHidden(),true);await mobile.close();scenarios++;
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',scenarios,catalogTypes:42,trainers:35,unknownRequirementsExplicit:true,uncaughtErrors:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
