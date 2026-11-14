/* All enabled layers share this renderer; no global function replacement. */
(() => {
  const $ = id => document.getElementById(id);
  const zone=$('zone'), img=$('terrain'), canvas=$('overlay'), ctx=canvas.getContext('2d');
  const lv=$('level'), lvnum=$('levelnum'), stats=$('stats'), error=$('data-error');
  const controls=[...document.querySelectorAll('.controls input,.controls select')];
  if(!window.WowSettings) {
    controls.forEach(control=>control.disabled=true);error.hidden=false;stats.textContent='';
    $('share').disabled=true;$('reset-settings').disabled=true;
    $('retry').addEventListener('click',()=>location.reload());return;
  }
  let data, mapReady=false, selectedCell=null, maxDensity=50;
  const color=d=>WowSettings.color(d);
  const area=$('map-area');
  function random(seed) {
    let value=(seed*1664525+1013904223)>>>0;
    return ()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
  }
  function setLevel(value) {
    const level=WowApp.normalizeLevel(value);
    lv.value=level; lvnum.value=level;
  }
  function resourceLabel(points, noun) {
    return points.length ? `${points.length} записей ${noun}` : `${noun}: нет записей в источнике`;
  }
  function draw() {
    if (!data || !mapReady) return;
    const id=zone.value,L=WowApp.normalizeLevel(lv.value),rows=data.mobs[id],ores=data.ore[id],herbs=data.herbs[id];
    const W=img.naturalWidth,H=img.naturalHeight;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    ctx.clearRect(0,0,W,H);
    const cells=$('mode').value==='cells';
    const labelsFit=canvas.clientWidth*.05>=24&&canvas.clientHeight*.05>=18;
    $('density-hint').textContent=$('density').checked&&!labelsFit
      ?'На узкой карте числа скрыты, чтобы не перекрывать местность. Нажмите ячейку для подробностей.'
      :'Нажмите ячейку для её уровня и индекса. С клавиатуры: стрелки — выбрать ячейку, Esc — снять выделение.';
    let matched=0,weight=0;
    for (const [i,[xp,yp,ml,n]] of rows.entries()) {
      const delta=ml-L;
      if(delta>=-2&&delta<=0){matched++;weight+=n;}
      if($('only').checked&&(delta < -2||delta>0))continue;
      const x=xp*W/100,y=yp*H/100;
      if($('mobs').checked&&cells) {
        ctx.save();ctx.globalAlpha=.12+.48*Math.min(n/maxDensity,1);ctx.fillStyle=color(delta);
        ctx.fillRect(x+1,y+1,W*.05-2,H*.05-2);ctx.restore();
        ctx.strokeStyle='#10191b88';ctx.lineWidth=.7;ctx.strokeRect(x+1,y+1,W*.05-2,H*.05-2);
      }
      if($('mobs').checked&&!cells) {
        const rnd=random(i+12345);
        ctx.fillStyle=color(delta);ctx.strokeStyle='#17251b';ctx.lineWidth=.65;
        for(let j=0;j<Math.min(n,800);j++) {
          ctx.beginPath();ctx.arc(x+3+rnd()*(W*.05-6),y+3+rnd()*(H*.05-6),2.1,0,Math.PI*2);
          ctx.fill();ctx.stroke();
        }
      }
      if($('density').checked&&labelsFit) {
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 15px system-ui';
        ctx.lineWidth=3.2;ctx.strokeStyle='#15191e';ctx.strokeText(String(n),x+W*.025,y+H*.025);
        ctx.fillStyle='white';ctx.fillText(String(n),x+W*.025,y+H*.025);
      }
    }
    if($('ores').checked)for(const [xp,yp,type] of ores) {
      ctx.beginPath();ctx.arc(xp*W/100,yp*H/100,4.5,0,Math.PI*2);
      ctx.fillStyle=type===201?'#82d9ff':'#ffc06b';ctx.fill();
      ctx.lineWidth=1.8;ctx.strokeStyle='#1b252c';ctx.stroke();
    }
    if($('herbs').checked)for(const [xp,yp] of herbs) {
      const x=xp*W/100,y=yp*H/100;
      ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+4,y);ctx.lineTo(x,y+4);ctx.lineTo(x-4,y);ctx.closePath();
      ctx.fillStyle='#6cdd8e';ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle='#092416';ctx.stroke();
    }
    drawSelection();
    const mobLabel=rows.length?`${rows.length} ячеек мобов · ${matched} ячеек уровня ${Math.max(1,L-2)}–${L} (сумма индексов ${weight})`:'данные мобов не подключены';
    stats.textContent=`${data.maps.find(m=>m.id===id).name} · ${mobLabel} · ${resourceLabel(ores,'руды')} · ${resourceLabel(herbs,'трав')}`;
    const parts=[rows.length?'Мобы: оценочные ячейки':'Мобы: данных нет'];
    for(const [key,label] of [['ore','Руда'],['herbs','Травы']]) {
      const info=data.coverage[id][key];
      parts.push(`${label}: ${info.records} ${info.status==='imported'?'исторических записей':'записей в источнике'}`);
    }
    $('coverage').textContent=parts.join(' · ')+'. Совмещение координат ресурсов с картой в игре ещё не проверено.';
  }
  function setZone() {
    if(!data)return;
    selectedCell=null;mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);
    stats.textContent='Загрузка карты…';$('coverage').textContent='';
    img.alt='Карта: '+data.maps.find(map=>map.id===zone.value).name;
    img.src='maps/'+zone.value+'.jpg';
    if(img.complete&&img.naturalWidth){mapReady=true;draw();}
  }
  img.onload=()=>{mapReady=true;draw();};
  img.onerror=()=>{mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);stats.textContent='Не удалось загрузить карту выбранной локации. Выберите другую локацию или повторите загрузку.';};
  function currentState() {
    return {zone:zone.value,level:WowApp.normalizeLevel(lv.value),mode:$('mode').value,
      ...Object.fromEntries(WowSettings.FLAGS.map(key=>[key,$(key).checked]))};
  }
  function persist() {
    if(!data)return;
    const state=currentState();
    const saved=WowSettings.writeSaved(state);
    $('preference-status').textContent=saved?'Настройки сохраняются автоматически.':'Хранилище браузера недоступно. Настройки сохранены в ссылке.';
    const link=WowSettings.toUrl(location.href,state);
    if(!$('share-link').hidden)$('share-link').value=link;
    try { history.replaceState(null,'',link); } catch (_) { /* local-file restrictions */ }
  }
  function drawSelection() {
    if(!selectedCell){$('cell-info').textContent='Выберите ячейку на карте для подробностей.';return;}
    const [column,row]=selectedCell;
    const x=column*canvas.width*.05,y=row*canvas.height*.05;
    ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,canvas.width*.05-2,canvas.height*.05-2);
    const cell=data.mobs[zone.value].find(cell=>cell[0]===column*5&&cell[1]===row*5);
    if(!cell){$('cell-info').textContent='В выбранной ячейке нет данных мобов.';return;}
    const delta=cell[2]-Number(lv.value);
    $('cell-info').textContent=`Ячейка: уровень ${cell[2]} (${delta>0?'+':''}${delta} к персонажу), индекс плотности ${cell[3]}. Это оценка, не число живых мобов.`+
      ($('only').checked&&(delta < -2||delta>0)?' Ячейка скрыта фильтром −2…0.':'');
  }
  function applyState(state) {
    zone.value=state.zone;setLevel(state.level);$('mode').value=state.mode;
    for(const key of WowSettings.FLAGS)$(key).checked=state[key];
  }
  zone.addEventListener('change',()=>{persist();setZone();});
  let levelSave;
  lv.addEventListener('input',()=>{setLevel(lv.value);draw();clearTimeout(levelSave);levelSave=setTimeout(persist,150);});
  lv.addEventListener('change',()=>{clearTimeout(levelSave);persist();});
  lvnum.addEventListener('change',()=>{setLevel(lvnum.value);persist();draw();});
  for(const id of ['mobs','density','ores','herbs','only','mode'])$(id).addEventListener('change',()=>{persist();draw();});
  area.addEventListener('click',event=>{
    if(!data||!mapReady)return;
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
    if(x<0||x>1||y<0||y>1)return;
    selectedCell=[Math.min(19,Math.floor(x*20)),Math.min(19,Math.floor(y*20))];
    area.focus({preventScroll:true});draw();
  });
  area.addEventListener('keydown',event=>{
    if(!data||!mapReady||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Escape')selectedCell=null;
    else {
      const cell=selectedCell||[10,10];
      selectedCell=[Math.max(0,Math.min(19,cell[0]+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0))),
        Math.max(0,Math.min(19,cell[1]+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))];
    }
    draw();
  });
  for(const [delta,label] of WowSettings.LEGEND) {
    const item=document.createElement('span'),dot=document.createElement('i');
    item.dataset.delta=String(delta);dot.className='dot';dot.style.background=color(delta);
    item.append(dot,document.createTextNode(label));$('legend').append(item);
  }
  for(const [symbol,label,colorValue] of [['●','Медь','#82d9ff'],['●','Другая руда','#ffc06b'],['◆','Травы','#6cdd8e']]) {
    const item=document.createElement('span'),symbolElement=document.createElement('b');
    symbolElement.textContent=symbol;symbolElement.style.color=colorValue;item.append(symbolElement,document.createTextNode(label));$('resource-legend').append(item);
  }
  $('reset-settings').addEventListener('click',()=>{applyState(WowSettings.resolve(data,new URLSearchParams(),{},WowApp.normalizeLevel));persist();setZone();});
  $('share').addEventListener('click',async()=>{
    persist();const url=WowSettings.toUrl(location.href,currentState());
    try {await navigator.clipboard.writeText(url);$('share-status').textContent='Ссылка скопирована.';}
    catch (_) {$('share-link').hidden=false;$('share-link').value=url;$('share-link').select();$('share-status').textContent='Ссылка выделена — скопируйте её.';}
  });
  new ResizeObserver(()=>{if(mapReady)draw();}).observe(area);
  async function start() {
    controls.forEach(control=>control.disabled=true);$('share').disabled=true;$('reset-settings').disabled=true;$('retry').disabled=true;
    error.hidden=true;stats.textContent='Загрузка данных…';
    try {
      if(!window.WowApp||!window.WowSettings)throw new Error('Application unavailable');
      data=await WowApp.loadData();
      zone.replaceChildren();
      for(const map of data.maps) {
        const option=document.createElement('option');option.value=map.id;
        option.textContent=map.name+(map.has_mobs?'':' · нет данных мобов');zone.append(option);
      }
      applyState(WowSettings.resolve(data,new URLSearchParams(location.search),WowSettings.readSaved(),WowApp.normalizeLevel));
      maxDensity=Math.max(1,...Object.values(data.mobs).flat().map(cell=>cell[3]));
      $('density-scale').textContent=`В режиме ячеек насыщенность показывает индекс плотности (от 1 до ${maxDensity}), а не число живых мобов.`;
      controls.forEach(control=>control.disabled=false);$('share').disabled=false;$('reset-settings').disabled=false;persist();setZone();
    } catch (_) {
      data=undefined;mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      error.hidden=false;stats.textContent='';$('coverage').textContent='';
    } finally { $('retry').disabled=false; }
  }
  $('retry').addEventListener('click',start);
  start();
})();
