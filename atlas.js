/* All enabled layers share this renderer; no global function replacement. */
(() => {
  const $ = id => document.getElementById(id);
  const zone=$('zone'), img=$('terrain'), canvas=$('overlay'), ctx=canvas.getContext('2d');
  const lv=$('level'), lvnum=$('levelnum'), stats=$('stats'), error=$('data-error');
  const controls=[...document.querySelectorAll('.controls input,.controls select,.resource-filters input,.resource-filters select,.npc-filters input,.npc-filters select')];
  if(!window.WowSettings||!window.WowResources) {
    controls.forEach(control=>control.disabled=true);error.hidden=false;stats.textContent='';
    $('share').disabled=true;$('reset-settings').disabled=true;
    $('retry').addEventListener('click',()=>location.reload());return;
  }
  let data, mapReady=false, selectedCell=null, maxDensity=50, visiblePoints=[], selectedPointKey=null;
  let npcData=null,npcLoading=false,npcFailed=false;
  async function loadNpcs() {
    if(npcLoading||npcData||npcFailed||!$('npcs').checked)return;
    npcLoading=true;$('npc-status').textContent='Загрузка координат NPC…';
    try {
      if(!window.WowNpcs)throw new Error('NPC module missing');
      npcData=await WowNpcs.load();
    }catch(_){npcFailed=true;}
    finally{npcLoading=false;draw();}
  }
  $('npc-retry').addEventListener('click',()=>{npcFailed=false;loadNpcs();});
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
  function resourceLabel(points, noun, total=points.length) {
    if(!points.length&&total)return `${noun}: нет записей с выбранными фильтрами (в источнике ${total})`;
    if(points.length&&points.length!==total)return `${points.length} из ${total} записей ${noun}`;
    return points.length ? `${points.length} записей ${noun}` : `${noun}: нет записей в источнике`;
  }
  function draw() {
    if (!data || !mapReady) return;
    const id=zone.value,L=WowApp.normalizeLevel(lv.value),rows=data.mobs[id],options=currentState();
    const ores=WowResources.filterPoints(data,'ore',id,options),herbs=WowResources.filterPoints(data,'herbs',id,options);
    visiblePoints=[];
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
      visiblePoints.push({key:`ore:${xp}:${yp}:${type}`,kind:'ore',x:xp,y:yp,meta:data.catalog[type]});
      ctx.beginPath();ctx.arc(xp*W/100,yp*H/100,4.5,0,Math.PI*2);
      ctx.fillStyle=type===201?'#82d9ff':'#ffc06b';ctx.fill();
      ctx.lineWidth=1.8;ctx.strokeStyle='#1b252c';ctx.stroke();
    }
    if($('herbs').checked)for(const [xp,yp,type] of herbs) {
      visiblePoints.push({key:`herbs:${xp}:${yp}:${type}`,kind:'herbs',x:xp,y:yp,meta:data.catalog[type]});
      const x=xp*W/100,y=yp*H/100;
      ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+4,y);ctx.lineTo(x,y+4);ctx.lineTo(x-4,y);ctx.closePath();
      ctx.fillStyle='#6cdd8e';ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle='#092416';ctx.stroke();
    }
    if($('trainers').checked)for(const trainer of WowResources.trainersForZone(data,id,options)) {
      const x=trainer.x*W/100,y=trainer.y*H/100;
      ctx.fillStyle='#d1a6ff';ctx.strokeStyle='#28183c';ctx.lineWidth=1.5;
      ctx.fillRect(x-5,y-5,10,10);ctx.strokeRect(x-5,y-5,10,10);
      visiblePoints.push({key:'trainer:'+trainer.id,kind:'trainer',x:trainer.x,y:trainer.y,meta:trainer});
    }
    let npcCount=0;
    if($('npcs').checked&&npcData)for(const [xp,yp,npcId] of npcData.maps[id]||[]) {
      const meta=npcData.npcs[npcId];
      if(!WowNpcs.matches(meta,options))continue;
      npcCount++;
      const x=xp*W/100,y=yp*H/100;
      ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4.5,y+4);ctx.lineTo(x-4.5,y+4);ctx.closePath();
      ctx.fillStyle=meta.quest_starts.length?'#ffe185':'#77dce8';ctx.fill();ctx.strokeStyle='#0b2732';ctx.lineWidth=1;ctx.stroke();
      visiblePoints.push({key:`npc:${npcId}:${xp}:${yp}`,kind:'npc',x:xp,y:yp,meta});
    }
    if($('npcs').checked&&!npcData)loadNpcs();
    $('npc-retry').hidden=!($('npcs').checked&&npcFailed);
    $('npc-status').textContent=!$('npcs').checked?'Слой NPC выключен. Координаты QuestieDB доступны отдельно от оценочной плотности.':
      npcData?`NPC: ${npcCount} из ${npcData.maps[id].length} записей координат подходят фильтрам. Это справочные позиции, не число живых NPC. Совмещение в игре не проверено.`:
      npcFailed?'Не удалось загрузить NPC. Остальные слои доступны; повторите загрузку.':'Загрузка координат NPC…';
    drawSelection();
    const unknown=[...WowResources.filterPoints(data,'ore',id,{...options,skillFilter:false}),...WowResources.filterPoints(data,'herbs',id,{...options,skillFilter:false})].filter(point=>data.catalog[point[2]].min_skill===null).length;
    $('filter-status').textContent=`Ресурс: ${options.resource==='all'?'все':data.catalog[options.resource].name}. `+
      (options.skillFilter?`Навыки: горное дело ${options.miningSkill}, травничество ${options.herbalismSkill}. `:'Фильтр по навыку выключен. ')+
      (unknown?`Неизвестное требование у ${unknown} записей; ${options.skillFilter&&!options.unknownSkill?'скрыты':'показаны при включённом слое'}. `:'')+
      `Учителя: ${WowResources.trainersForZone(data,id,options).length} подходят фильтрам из ${data.trainers[id].length} в источнике. Справочная выборка неполная.`;
    const mobLabel=rows.length?`${rows.length} ячеек мобов · ${matched} ячеек уровня ${Math.max(1,L-2)}–${L} (сумма индексов ${weight})`:'оценки плотности мобов нет';
    stats.textContent=`${data.maps.find(m=>m.id===id).name} · ${mobLabel} · ${resourceLabel(ores,'руды',data.ore[id].length)} · ${resourceLabel(herbs,'трав',data.herbs[id].length)}`;
    const parts=[rows.length?'Мобы: оценочные ячейки':'Мобы: оценки плотности нет'];
    for(const [key,label] of [['ore','Руда'],['herbs','Травы']]) {
      const info=data.coverage[id][key];
      parts.push(`${label}: ${info.records} ${info.status==='imported'?'исторических записей':'записей в источнике'}`);
    }
    parts.push(`NPC QuestieDB: ${data.coverage[id].npcs.records} записей координат`);
    $('coverage').textContent=parts.join(' · ')+'. Совмещение координат ресурсов с картой в игре ещё не проверено.';
  }
  function setZone() {
    if(!data)return;
    selectedCell=null;selectedPointKey=null;visiblePoints=[];mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);
    $('npc-status').textContent='Загрузка карты…';
    stats.textContent='Загрузка карты…';$('coverage').textContent='';$('map-tooltip').hidden=true;$('point-options').disabled=true;$('point-info').textContent='Загрузка карты…';$('point-source').hidden=true;
    img.alt='Карта: '+data.maps.find(map=>map.id===zone.value).name;
    img.src='maps/'+zone.value+'.jpg';
    if(img.complete&&img.naturalWidth){mapReady=true;draw();}
  }
  img.onload=()=>{mapReady=true;draw();};
  img.onerror=()=>{mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);stats.textContent='Не удалось загрузить карту выбранной локации. Выберите другую локацию или повторите загрузку.';};
  function currentState() {
    return {zone:zone.value,level:WowApp.normalizeLevel(lv.value),mode:$('mode').value,npcRole:$('npcRole').value,npcQuery:$('npcQuery').value,faction:$('faction').value,...WowResources.readControls(),
      ...Object.fromEntries(WowSettings.FLAGS.map(key=>[key,$(key).checked]))};
  }
  function persist() {
    if(!data)return;
    const state=currentState();
    $('trainer-faction-field').hidden=!state.trainers;
    const saved=WowSettings.writeSaved(state);
    $('preference-status').textContent=saved?'Настройки сохраняются автоматически.':'Хранилище браузера недоступно. Настройки сохранены в ссылке.';
    const link=WowSettings.toUrl(location.href,state);
    $('farm-link').href=WowSettings.toUrl(new URL('index.html',location.href).href,state);
    if(!$('share-link').hidden)$('share-link').value=link;
    try { history.replaceState(null,'',link); } catch (_) { /* local-file restrictions */ }
  }
  function drawSelection() {
    renderPointPanel();
    if(!selectedCell){$('cell-info').textContent='Выберите ячейку на карте для подробностей.';return;}
    const [column,row]=selectedCell;
    const x=column*canvas.width*.05,y=row*canvas.height*.05;
    ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,canvas.width*.05-2,canvas.height*.05-2);
    const cell=data.mobs[zone.value].find(cell=>cell[0]===column*5&&cell[1]===row*5);
    if(!cell){$('cell-info').textContent='В выбранной ячейке нет оценки плотности мобов.';return;}
    const delta=cell[2]-Number(lv.value);
    $('cell-info').textContent=`Ячейка: уровень ${cell[2]} (${delta>0?'+':''}${delta} к персонажу), индекс плотности ${cell[3]}. Это оценка, не число живых мобов.`+
      ($('only').checked&&(delta < -2||delta>0)?' Ячейка скрыта фильтром −2…0.':'');
  }
  const professions={ore:'Горное дело',herbs:'Травничество'};
  const factions={alliance:'Альянс',horde:'Орда',neutral:'Нейтральный'};
  function pointLabel(point) {
    if(point.kind==='npc')return `${point.meta.name} · ID ${point.meta.id}`;
    return point.kind==='trainer'?`${point.meta.name} — учитель ${professions[point.meta.profession].toLowerCase()}`:point.meta.name;
  }
  function nearestPoint(clientX,clientY) {
    const rect=canvas.getBoundingClientRect();let best=null,distance=14*14;
    for(const point of visiblePoints) {
      const dx=rect.left+point.x*rect.width/100-clientX,dy=rect.top+point.y*rect.height/100-clientY;
      if(dx*dx+dy*dy<=distance){best=point;distance=dx*dx+dy*dy;}
    }
    return best;
  }
  function renderPointPanel() {
    const select=$('point-options');select.replaceChildren();
    const points=selectedCell?visiblePoints.filter(point=>Math.min(19,Math.floor(point.x/5))===selectedCell[0]&&Math.min(19,Math.floor(point.y/5))===selectedCell[1]):[];
    const selected=visiblePoints.find(point=>point.key===selectedPointKey);
    if(selected&&!points.includes(selected))points.unshift(selected);
    for(const point of points) {
      const option=document.createElement('option');option.value=point.key;
      option.textContent=`${pointLabel(point)} · ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`;select.append(option);
    }
    select.disabled=!points.length;
    if(!points.length){const option=document.createElement('option');option.textContent='Нет включённых точек в этой ячейке';select.append(option);}
    let point=points.find(point=>point.key===selectedPointKey);
    if(!point&&points.length){point=points[0];selectedPointKey=point.key;}
    if(!point){selectedPointKey=null;$('point-info').textContent=selectedCell?'В этой ячейке нет точек с выбранными фильтрами.':'Нажмите точку NPC, ресурса или учителя для подробностей.';$('point-source').hidden=true;return;}
    select.value=point.key;
    const meta=point.meta;
    if(point.kind==='npc') {
      const roles=[meta.flags&128?'торговец':null,meta.flags&16?'учитель':null,meta.quest_starts.length?'выдаёт квесты':null,meta.quest_ends.length?'принимает квесты':null].filter(Boolean);
      $('point-info').textContent=`${pointLabel(point)}${meta.title?' — '+meta.title:''}\nУровни: ${meta.min_level??'?'}–${meta.max_level??'?'} · ${roles.join(', ')||'NPC'}\nКоординаты: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}\nКвесты: начало ${meta.quest_starts.join(', ')||'нет записей'}; сдача ${meta.quest_ends.join(', ')||'нет записей'}.\nИсточник: QuestieDB Forever, снимок ${npcData.commit.slice(0,7)}. Статические данные; фазы и доступность для персонажа не проверены.`;
      $('point-source').href=`database.html?kind=npcs&id=${meta.id}`;$('point-source').hidden=false;
      ctx.beginPath();ctx.arc(point.x*canvas.width/100,point.y*canvas.height/100,8,0,Math.PI*2);ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.stroke();return;
    }
    const skill=point.kind==='trainer'?`${professions[meta.profession]} · ${factions[meta.faction]} · ${meta.ranks==='apprentice'?'только начальный ранг':'ранги по требованиям персонажа'}`:
      (meta.min_skill===null?'Требование навыка не подтверждено.':`Требуется ${professions[point.kind].toLowerCase()}: ${meta.min_skill} (по справочнику Forever).`);
    $('point-info').textContent=`${pointLabel(point)}\nКоординаты: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}\n${skill}\n`+
      (point.kind==='trainer'?'Источник позиции: справочник WoWhead Forever.':'Источник позиции: GatherMate2_Data, историческая запись.')+
      `\nСправочник обновлён ${meta.source_updated}; сведения сверены ${meta.checked_on}. Совмещение в игре не проверено.`;
    $('point-source').href=meta.source_url;$('point-source').hidden=false;
    ctx.beginPath();ctx.arc(point.x*canvas.width/100,point.y*canvas.height/100,8,0,Math.PI*2);ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.stroke();
  }
  $('point-options').addEventListener('change',()=>{selectedPointKey=$('point-options').value;draw();});
  let hoverFrame;
  area.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!mapReady)return;
    cancelAnimationFrame(hoverFrame);
    hoverFrame=requestAnimationFrame(()=>{
      const point=nearestPoint(event.clientX,event.clientY),tooltip=$('map-tooltip');tooltip.hidden=!point;
      if(!point)return;
      tooltip.textContent=pointLabel(point)+(['trainer','npc'].includes(point.kind)?'':point.meta.min_skill===null?' · навык неизвестен':` · навык ${point.meta.min_skill}`);
      tooltip.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-290))+'px';
      tooltip.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-85))+'px';
    });
  });
  area.addEventListener('pointerleave',()=>{cancelAnimationFrame(hoverFrame);$('map-tooltip').hidden=true;});
  function applyState(state) {
    zone.value=state.zone;setLevel(state.level);$('mode').value=state.mode;
    for(const key of WowSettings.FLAGS)$(key).checked=state[key];
    WowResources.applyControls(state);$('faction').value=state.faction;$('npcRole').value=state.npcRole;$('npcQuery').value=state.npcQuery;
  }
  zone.addEventListener('change',()=>{persist();setZone();});
  let levelSave;
  lv.addEventListener('input',()=>{setLevel(lv.value);draw();clearTimeout(levelSave);levelSave=setTimeout(persist,150);});
  lv.addEventListener('change',()=>{clearTimeout(levelSave);persist();});
  lvnum.addEventListener('change',()=>{setLevel(lvnum.value);persist();draw();});
  for(const id of ['npcs','npcRole','npcQuery','mobs','density','ores','herbs','only','mode','trainers','focus','resource','miningSkill','herbalismSkill','skillFilter','unknownSkill','faction'])$(id).addEventListener('change',()=>{
    $('miningSkill').value=WowResources.normalizeSkill($('miningSkill').value);$('herbalismSkill').value=WowResources.normalizeSkill($('herbalismSkill').value);
    if(id==='resource'&&data.catalog[$('resource').value])$(data.catalog[$('resource').value].kind==='ore'?'ores':'herbs').checked=true;
    if(id==='focus'&&['ore','herbs'].includes($('focus').value))$($('focus').value==='ore'?'ores':'herbs').checked=true;
    persist();draw();});
  $('npcQuery').addEventListener('input',()=>{persist();draw();});
  area.addEventListener('click',event=>{
    if(!data||!mapReady)return;
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
    if(x<0||x>1||y<0||y>1)return;
    const point=nearestPoint(event.clientX,event.clientY);
    selectedPointKey=point?.key||null;
    selectedCell=[Math.min(19,Math.floor(x*20)),Math.min(19,Math.floor(y*20))];
    area.focus({preventScroll:true});draw();
  });
  area.addEventListener('keydown',event=>{
    if(!data||!mapReady||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))return;
    event.preventDefault();
    selectedPointKey=null;
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
  for(const [symbol,label,colorValue] of [['▲','NPC QuestieDB','#77dce8'],['●','Медь','#82d9ff'],['●','Другая руда','#ffc06b'],['◆','Травы','#6cdd8e'],['■','Учителя','#d1a6ff']]) {
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
    $('point-options').disabled=true;$('map-tooltip').hidden=true;
    error.hidden=true;stats.textContent='Загрузка данных…';
    try {
      if(!window.WowApp||!window.WowSettings||!window.WowResources)throw new Error('Application unavailable');
      data=await WowApp.loadData();
      zone.replaceChildren();
      for(const map of data.maps) {
        const option=document.createElement('option');option.value=map.id;
        option.textContent=map.name+(map.has_mobs?'':' · нет оценки плотности');zone.append(option);
      }
      WowResources.populateOptions(data,$('resource'));
      applyState(WowSettings.resolve(data,new URLSearchParams(location.search),WowSettings.readSaved(),WowApp.normalizeLevel));
      if($('skillFilter').checked||$('resource').value!=='all')document.querySelector('.resource-filters').open=true;
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
