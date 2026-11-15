const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const base=(process.argv[2]||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
  const browser=await chromium.launch();
  const context=await browser.newContext({ignoreHTTPSErrors:process.env.ALLOW_TEST_CERT==='1'});
  const errors=[];let scenarios=0;
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  async function atlasReady(page) {
    await page.waitForFunction(()=>window.WOW_DATA&&!document.getElementById('zone').disabled&&terrain.complete&&terrain.naturalWidth>0);
  }
  const page=await context.newPage();
  try {
    await page.goto(base+'index.html');
    await page.waitForFunction(()=>!document.getElementById('start').disabled);
    await page.click('#start');
    for(let level=1;level<=60;level++) {
      await page.fill('#level',String(level));await page.click('#find');
      assert.ok(await page.locator('.result').count()>0);
      assert.ok(await page.locator('.result').count()<=5);scenarios++;
    }
    await page.fill('#level','42.5');await page.click('#find');
    assert.equal(await page.locator('#level').inputValue(),'43');
    const link=await page.locator('.result a').first().getAttribute('href');
    assert.ok(link.includes('level=43'));
    await page.goto(new URL(link,base).href);await atlasReady(page);
    assert.equal(await page.locator('#levelnum').inputValue(),'43');scenarios++;
    for(const [raw,expected] of [['42.5','43'],['0','1'],['100','60'],['wrong','42'],['','42']]) {
      await page.goto(base+'atlas.html?level='+raw);await atlasReady(page);
      assert.equal(await page.locator('#level').inputValue(),expected);
      assert.equal(await page.locator('#levelnum').inputValue(),expected);scenarios++;
    }
    await page.fill('#levelnum','42.5');await page.locator('#levelnum').dispatchEvent('change');
    assert.equal(await page.locator('#levelnum').inputValue(),'43');
    assert.equal(await page.locator('#level').inputValue(),'43');scenarios++;
    for(const id of ['mobs','density','ores','npcs'])await page.uncheck('#'+id);
    await page.check('#herbs');
    const pixels=()=>page.evaluate(()=>{
      const c=document.getElementById('overlay');return c.toDataURL();
    });
    const herbsOnly=await pixels();
    for(const id of ['ores','density','mobs','only']) {
      await page.check('#'+id);await page.uncheck('#'+id);
      assert.equal(await pixels(),herbsOnly,`Herbs lost after ${id}`);scenarios++;
    }
    await page.fill('#levelnum','17');await page.locator('#levelnum').dispatchEvent('change');
    assert.equal(await pixels(),herbsOnly);scenarios++;
    await page.selectOption('#zone','elwynn_c60');await atlasReady(page);
    await page.waitForFunction(()=>terrain.src.endsWith('/elwynn_c60.jpg'));
    assert.match(await page.locator('#stats').innerText(),/280 записей трав/);
    await page.selectOption('#zone','swampofsorrows_c60');await atlasReady(page);
    await page.waitForFunction(()=>terrain.src.endsWith('/swampofsorrows_c60.jpg'));
    assert.equal(await pixels(),herbsOnly);scenarios++;
    for(const [zone,ore,herbs] of [['hillsbrad_c60',141,224],['stonetalonmountain_c60',133,257],['zephrasisle',294,628]]) {
      await page.selectOption('#zone',zone);await atlasReady(page);
      assert.match(await page.locator('#stats').innerText(),new RegExp(ore+' записей руды'));
      assert.match(await page.locator('#stats').innerText(),new RegExp(herbs+' записей трав'));scenarios++;
    }
    await page.selectOption('#zone','darkspearisland');await atlasReady(page);
    assert.match(await page.locator('#stats').innerText(),/нет записей в источнике/);scenarios++;

    for(const filename of ['atlas.html','index.html'])for(const mode of ['blocked','malformed','incomplete','http500']) {
      const failing=await context.newPage();
      const pattern='**/data.json*';
      await failing.route(pattern,route=> mode==='blocked'?route.abort():route.fulfill({
        status:mode==='http500'?500:200,contentType:'application/json',
        body:mode==='malformed'?'{broken':mode==='incomplete'?'{}':'server error'
      }));
      await failing.goto(base+filename);
      await failing.locator('#data-error').waitFor({state:'visible'});
      const disabled=filename==='atlas.html'?'#zone':'#start';
      assert.equal(await failing.locator(disabled).isDisabled(),true);
      await failing.unroute(pattern);await failing.click('#retry');
      await failing.waitForFunction(()=>document.getElementById('data-error').hidden);
      if(filename==='atlas.html') {
        await atlasReady(failing);assert.equal(await failing.locator('#zone option').count(),42);
      } else await failing.waitForFunction(()=>!document.getElementById('start').disabled);
      await failing.close();scenarios++;
    }
    await page.route('**/maps/elwynn_c60.jpg',route=>route.abort());
    await page.selectOption('#zone','elwynn_c60');
    await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('Не удалось загрузить карту'));
    await page.check('#ores');
    assert.match(await page.locator('#stats').innerText(),/Не удалось загрузить карту/);
    await page.unroute('**/maps/elwynn_c60.jpg');
    await page.selectOption('#zone','swampofsorrows_c60');await atlasReady(page);scenarios++;
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',scenarios,levels:60,dataFailureAndRetryCases:8,uncaughtErrors:errors.length}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
