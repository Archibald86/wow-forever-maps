const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8773/').replace(/\/?$/,'/'),browser=await chromium.launch(),page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1200,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'atlas.html?zone=durotar_c60&level=6&mode=legacy&mobs=1&density=0&only=0&npcs=0&ores=0&herbs=0&trainers=0&caves=0');
  await page.waitForFunction(()=>window.WOW_DATA&&terrain.complete&&terrain.naturalWidth>0&&document.getElementById('stats').textContent.includes('Дуротар'));
  const pixels=await page.evaluate(()=>{
   const c=document.getElementById('overlay'),ctx=c.getContext('2d');
   return WOW_DATA.mobs.durotar_c60.map(([x,y,level,density])=>{const p=ctx.getImageData(Math.floor((x+2.5)*c.width/100),Math.floor((y+2.5)*c.height/100),1,1).data;return{level,density,rgba:[...p],color:WowSettings.color(level-6)}});
  });
  assert(pixels.length>20);for(const p of pixels){const expected=p.color.slice(1).match(/../g).map(v=>parseInt(v,16));assert(p.rgba.slice(0,3).every((v,i)=>Math.abs(v-expected[i])<=2),JSON.stringify(p));assert(Math.abs(p.rgba[3]-148)<=1,JSON.stringify(p));}
  assert(new Set(pixels.map(p=>p.density)).size>3);assert(new Set(pixels.map(p=>p.color)).size>3);
  assert.equal(await page.locator('#legend [data-delta]').count(),5);assert.equal(await page.locator('#legend [data-delta="-2"]').evaluate(el=>el.style.left),'30%');assert.equal(await page.locator('#legend [data-delta="2"]').evaluate(el=>el.style.left),'70%');assert.match(await page.locator('#level-heat-bar').getAttribute('style'),/linear-gradient/);
  const before=await page.locator('#overlay').evaluate(c=>c.toDataURL());await page.fill('#levelnum','15');await page.locator('#levelnum').dispatchEvent('change');assert.notEqual(await page.locator('#overlay').evaluate(c=>c.toDataURL()),before);
  await page.selectOption('#mode','dots');await page.selectOption('#mode','legacy');await page.reload();await page.waitForFunction(()=>terrain.complete&&terrain.naturalWidth>0&&document.getElementById('levelnum').value==='15');assert.equal(await page.locator('#mode').inputValue(),'legacy');
  await page.setViewportSize({width:320,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  if(process.env.HEATMAP_SCREENSHOT){await page.locator('#map-viewport').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.HEATMAP_SCREENSHOT,fullPage:true});}
  console.log('PASS heatmap: real canvas colors, density-independent opacity, changing character level, gradient legend, saved mode and mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
