const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:8766/').replace(/\/?$/,'/'),browser=await chromium.launch();
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1',viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=id=>page.waitForFunction(id=>terrain.complete&&terrain.naturalWidth>0&&terrain.src.endsWith('/'+id+'.jpg')&&document.getElementById('cave-status').textContent.length>0,id);
 try {
  await page.goto(base+'atlas.html?caves=1&npcs=0&mapZoom=1&zone=elwynn_c60&mobs=0&density=0&ores=0&herbs=0&trainers=0');await ready('elwynn_c60');
  const ids=await page.locator('#zone option').evaluateAll(items=>items.map(x=>x.value));let glyphs=0;
  for(const id of ids) {
   await page.selectOption('#zone',id);await ready(id);
   const state=await page.evaluate(id=>{
    const c=document.getElementById('cave-overlay'),ctx=c.getContext('2d'),entry=WOW_CAVE_ICONS.maps[id],a=terrain.getBoundingClientRect(),b=c.getBoundingClientRect();
    const pixels=entry.icons.map(p=>{const r=Math.max(p.r,6*c.width/c.clientWidth),x=Math.round(p.x+r),y=Math.round(p.y);let red=false;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){if(x+dx<0||y+dy<0||x+dx>=c.width||y+dy>=c.height)continue;const v=ctx.getImageData(x+dx,y+dy,1,1).data;if(v[0]>220&&v[1]<90&&v[2]<90&&v[3]>150)red=true;}return red;});
    return {count:entry.icons.length,pixels,aligned:Math.max(Math.abs(a.left-b.left),Math.abs(a.top-b.top),Math.abs(a.width-b.width),Math.abs(a.height-b.height))};
   },id);
   assert(state.aligned<1,id);assert(state.pixels.every(Boolean),id+' missing red ring');glyphs+=state.count;
  }
  assert.equal(glyphs,156);await page.selectOption('#zone','elwynn_c60');await ready('elwynn_c60');
  await page.uncheck('#caves');assert.equal(await page.locator('#cave-overlay').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return p.some((v,i)=>i%4===3&&v>0);}),false);
  await page.reload();await ready('elwynn_c60');assert.equal(await page.locator('#caves').isChecked(),false);await page.check('#caves');
  await page.setViewportSize({width:320,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.selectOption('#mapZoom','3');await page.waitForFunction(()=>document.getElementById('map-area').getBoundingClientRect().width>document.getElementById('map-viewport').clientWidth*2.9);
  assert(await page.evaluate(()=>{const a=terrain.getBoundingClientRect(),c=document.getElementById('cave-overlay').getBoundingClientRect();return Math.max(Math.abs(a.left-c.left),Math.abs(a.top-c.top),Math.abs(a.width-c.width),Math.abs(a.height-c.height))<1&&document.documentElement.scrollWidth<=innerWidth;}));
  assert.deepEqual(errors,[]);console.log('PASS cave browser: 156 red rings on 42 maps, independent layer, persisted toggle, mobile and 300% zoom alignment');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
