const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8772/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=id=>page.waitForFunction(id=>terrain.complete&&terrain.naturalWidth>0&&terrain.src.endsWith('/'+id+'.jpg')&&document.getElementById('coverage').textContent.includes('Mob Level Map 1.0.7'),id);
 try{
  await page.goto(base+'atlas.html?zone=mulgore_c60&only=0&npcs=0&mobs=1&density=1&ores=0&herbs=0&trainers=0');await ready('mulgore_c60');
  const expected={alteracmountains_c60:130,arathihighlands_c60:110,badlands_c60:160,redridgemountains_c60:169,mulgore_c60:99,deadwindpass_c60:56,teldrassil_c60:76,zephrasisle:61};
  for(const [id,count]of Object.entries(expected)){
   await page.selectOption('#zone',id);await ready(id);assert.match(await page.locator('#stats').innerText(),new RegExp(count+' ячеек мобов'));
   assert(await page.evaluate(id=>{const map=WOW_DATA.maps.find(m=>m.id===id),level=WOW_DATA.mobs[id][0][2];return WowResources.rankZones({...WOW_DATA,maps:[map]},{focus:'mobs',level}).length===1},id));
  }
  await page.selectOption('#zone','barrens_c60');await ready('barrens_c60');
  const click=await page.evaluate(()=>{const r=document.getElementById('map-area').getBoundingClientRect();return{x:r.width*.575,y:r.height*.425}});
  await page.locator('#map-area').click({position:click});assert.match(await page.locator('#cell-info').innerText(),/уровень 14.*индекс плотности 1.*базовые данные Classic Era.*1.0.7/);
  await page.locator('#map-area').click({position:{x:click.x/.575*.625,y:click.y/.425*.225}});assert.match(await page.locator('#cell-info').innerText(),/индекс плотности 2.*поправка Forever.*1.0.7/);
  await page.selectOption('#zone','moonglade_c60');await ready('moonglade_c60');assert.match(await page.locator('#stats').innerText(),/оценки плотности мобов нет/);
  await page.setViewportSize({width:320,height:900});await page.selectOption('#zone','mulgore_c60');await ready('mulgore_c60');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal((await page.request.get(base+'sources/moblevels/NOTICE.md')).status(),200);assert.deepEqual(errors,[]);
  console.log('PASS density browser: 8 filled zones, recommendation eligibility, audited level correction and source label, missing-zone gap, 320px layout and attribution');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
