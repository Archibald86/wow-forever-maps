const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const base=(process.argv[2]||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
  const browser=await chromium.launch();
  const options={ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1'};
  const context=await browser.newContext(options),page=await context.newPage();
  const errors=[];let scenarios=0;
  page.on('pageerror',error=>errors.push(error.message));
  async function ready(p=page) {
    await p.waitForFunction(()=>window.WOW_DATA&&!document.getElementById('zone').disabled&&terrain.complete&&terrain.naturalWidth>0);
  }
  async function state(p=page) {
    return p.evaluate(()=>({zone:document.getElementById('zone').value,level:document.getElementById('levelnum').value,
      mode:document.getElementById('mode').value,...Object.fromEntries(['mobs','density','ores','herbs','only'].map(k=>[k,document.getElementById(k).checked]))}));
  }
  try {
    await page.goto(base+'atlas.html');await ready();
    assert.equal((await state()).mode,'cells');scenarios++;
    await page.selectOption('#zone','elwynn_c60');await ready();
    await page.fill('#levelnum','17');await page.locator('#levelnum').dispatchEvent('change');
    await page.selectOption('#mode','dots');
    for(const id of ['mobs','density','ores'])await page.uncheck('#'+id);
    for(const id of ['herbs','only'])await page.check('#'+id);
    const expected=await state();
    await page.reload();await ready();assert.deepEqual(await state(),expected);scenarios++;
    await page.goto(base+'atlas.html');await ready();assert.deepEqual(await state(),expected);scenarios++;
    const explicit='zone=hillsbrad_c60&level=42.5&mode=cells&mobs=1&density=1&ores=1&herbs=0&only=0';
    await page.goto(base+'atlas.html?'+explicit);await ready();
    const overridden=await state();assert.equal(overridden.level,'43');assert.equal(overridden.zone,'hillsbrad_c60');assert.equal(overridden.ores,true);assert.equal(overridden.herbs,false);assert.equal(overridden.mode,'cells');scenarios++;
    const share=page.url();
    const freshContext=await browser.newContext(options),fresh=await freshContext.newPage();
    await fresh.goto(share);await ready(fresh);assert.deepEqual(await state(fresh),overridden);await freshContext.close();scenarios++;
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
    await page.click('#share');await page.locator('#share-link').waitFor({state:'visible'});
    assert.equal(await page.locator('#share-link').inputValue(),page.url());
    await page.check('#herbs');assert.equal(await page.locator('#share-link').inputValue(),page.url());scenarios++;
    await page.click('#reset-settings');await ready();
    assert.deepEqual(await state(),{zone:'swampofsorrows_c60',level:'42',mode:'cells',mobs:true,density:true,ores:true,herbs:false,only:false});scenarios++;
    assert.equal(await page.locator('#legend [data-delta]').count(),12);
    const legend=await page.locator('#legend').innerText();assert.ok(legend.includes('≤−8')&&legend.includes('−7…−5')&&legend.includes('≥+5'));
    assert.equal(await page.locator('#resource-legend span').count(),5);
    assert.match(await page.locator('#resource-legend').innerText(),/NPC QuestieDB/);scenarios++;
    await page.uncheck('#density');await page.uncheck('#ores');
    const cells=await page.locator('#overlay').evaluate(c=>c.toDataURL());
    await page.selectOption('#mode','dots');
    const dots=await page.locator('#overlay').evaluate(c=>c.toDataURL());assert.notEqual(cells,dots);scenarios++;
    await page.selectOption('#mode','cells');await page.check('#density');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.getElementById('density-hint').textContent.includes('На узкой карте'));
    await page.locator('#overlay').scrollIntoViewIfNeeded();
    const target=await page.evaluate(()=>{
      const [x,y,level,density]=WOW_DATA.mobs[document.getElementById('zone').value][0];
      const r=document.getElementById('overlay').getBoundingClientRect();
      return {x:r.x+(x+2.5)*r.width/100,y:r.y+(y+2.5)*r.height/100,level,density};
    });
    await page.mouse.click(target.x,target.y);
    assert.match(await page.locator('#cell-info').innerText(),new RegExp('уровень '+target.level));
    assert.match(await page.locator('#cell-info').innerText(),new RegExp('индекс плотности '+target.density));scenarios++;
    await page.locator('#map-area').press('Escape');assert.match(await page.locator('#cell-info').innerText(),/Выберите ячейку/);
    await page.locator('#map-area').press('ArrowRight');assert.doesNotMatch(await page.locator('#cell-info').innerText(),/Выберите ячейку/);scenarios++;
    await page.fill('#levelnum','31');await page.locator('#levelnum').dispatchEvent('change');
    await page.goto(base+'index.html');await page.waitForFunction(()=>!document.getElementById('start').disabled);
    assert.equal(await page.locator('#level').inputValue(),'31');
    await page.click('#start');
    await page.fill('#level','27');await page.locator('#level').dispatchEvent('change');await page.reload();
    await page.waitForFunction(()=>!document.getElementById('start').disabled);assert.equal(await page.locator('#level').inputValue(),'27');
    await page.goto(base+'atlas.html');await ready();assert.equal((await state()).level,'27');scenarios++;
    await page.evaluate(()=>localStorage.setItem('wow-forever-settings-v1','{broken'));
    await page.goto(base+'atlas.html');await ready();assert.equal((await state()).level,'42');assert.equal((await state()).mode,'cells');scenarios++;
    const blocked=await browser.newContext(options);
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}}));
    const p=await blocked.newPage();p.on('pageerror',error=>errors.push(error.message));
    await p.goto(base+'atlas.html?zone=elwynn_c60&level=17&herbs=1');await ready(p);
    assert.match(await p.locator('#preference-status').innerText(),/недоступно/);
    const before=await state(p);await p.reload();await ready(p);assert.deepEqual(await state(p),before);await blocked.close();scenarios++;
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',scenarios,persistence:true,urlSharing:true,legendRanges:12,mobileSelection:true,blockedStorage:true,uncaughtErrors:0}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
