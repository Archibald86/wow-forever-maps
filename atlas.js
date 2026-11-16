/* All enabled layers share this renderer; no global function replacement. */
(() => {
  const $ = id => document.getElementById(id);
  const zone=$('zone'), img=$('terrain'), canvas=$('overlay'), ctx=canvas.getContext('2d');
  const caveCanvas=$('cave-overlay');let caveData=null;
  try{caveData=window.WowCaves.validate(window.WOW_CAVE_ICONS);}catch(_){}
  let classicData=null;
  try{classicData=window.WowClassicSpawns.validate(window.WOW_CLASSIC_SPAWNS);}catch(_){}
  const classicMap=()=>classicData?.maps[zone.value];
  const classicView=()=>Boolean(classicMap()&&$('mode').value==='cells');
  const classicActive=()=>classicView()&&$('mobs').checked;
  const lv=$('level'), lvnum=$('levelnum'), stats=$('stats'), error=$('data-error');
  const controls=[...document.querySelectorAll('.controls input,.controls select,.resource-filters input,.resource-filters select,.npc-filters input,.npc-filters select,.area-controls select,.area-panel select')];
  if(!window.WowSettings||!window.WowResources) {
    controls.forEach(control=>control.disabled=true);error.hidden=false;stats.textContent='';
    $('share').disabled=true;$('reset-settings').disabled=true;
    $('retry').addEventListener('click',()=>location.reload());return;
  }
  let data, mapReady=false, selectedCell=null, maxDensity=50, visiblePoints=[], selectedPointKey=null;
  let selectedArea=null,visibleClusters=[],areaPanelKey=null;
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
  $('show-all-mobs').addEventListener('click',()=>{
    if(!data)return;
    $('mobs').checked=true;$('npcs').checked=true;$('only').checked=false;$('hideServices').checked=false;
    $('npcType').value='all';$('npcRole').value='all';$('npcQuery').value='';
    persist();draw();
  });
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
    const spawnMap=classicView()?classicMap():null;
    $('mode').options[0].textContent=classicMap()?'Места появления · Classic':'Тепловая карта уровней';
    $('mode').options[1].textContent=classicMap()?'Условные точки · прежняя оценка':'Условные точки';
    $('mobs').parentNode.lastChild.textContent=spawnMap?' Места появления мобов':' Уровни мобов · тепловая карта';
    $('density').parentNode.lastChild.textContent=spawnMap?' Уровни на точках':' Числа плотности';
    $('mob-level-scope').textContent=options.only?'Включён фильтр уровней −2…0.':'Показаны все уровни: уровень персонажа меняет цвет, а не видимость. Ниже более чем на 5 уровней — серый.';
    $('classic-spawn-status').textContent=spawnMap?`Classic: ${spawnMap.species} видов, ${spawnMap.points.length} возможных мест в пределах карты. Полые круги — ограниченные группы и пулы. Выборка неполная; нажмите точку или область для подробностей.`:(!classicData&&zone.value.endsWith('_c60')?'Слой появлений недоступен; показана прежняя оценка. Обновите страницу для повторной загрузки.':'');
    updateLevelLegend(spawnMap);
    const ores=WowResources.filterPoints(data,'ore',id,options),herbs=WowResources.filterPoints(data,'herbs',id,options);
    visiblePoints=[];visibleClusters=[];
    const W=img.naturalWidth,H=img.naturalHeight;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    ctx.clearRect(0,0,W,H);
    if(caveCanvas.width!==W||caveCanvas.height!==H){caveCanvas.width=W;caveCanvas.height=H;}
    const caveEntry=caveData?.maps[id];
    if(caveEntry&&caveEntry.width===W&&caveEntry.height===H){
      WowCaves.draw(caveCanvas,caveEntry,$('caves').checked);
      $('cave-status').textContent=$('caves').checked?(caveEntry.icons.length?`Значки пещер: ${caveEntry.icons.length} · обведены красным на рисунке карты.`:'На рисунке этой карты значки пещер не найдены.'):'Красные окружности пещер скрыты.';
    }else {caveCanvas.getContext('2d').clearRect(0,0,caveCanvas.width,caveCanvas.height);$('cave-status').textContent='Разметка значков пещер для этой карты недоступна.';}
    const cells=$('mode').value!=='dots';
    const labelsFit=canvas.clientWidth*.05>=24&&canvas.clientHeight*.05>=18;
    $('density-hint').textContent=spawnMap?($('density').checked?'Уровни на точках видны при масштабе от 200%. Наведите курсор или нажмите точку для диапазона уровней.':'Нажмите место появления для уровней, альтернативных видов и ограничений группы.'):$('density').checked&&!labelsFit
      ?'На узкой карте числа скрыты, чтобы не перекрывать местность. Нажмите ячейку для подробностей.'
      :'Нажмите ячейку для её уровня и индекса. С клавиатуры: стрелки — выбрать ячейку, Esc — снять выделение.';
    let matched=0,weight=0;
    for (const [i,[xp,yp,ml,n]] of (spawnMap?[]:rows).entries()) {
      const delta=ml-L;
      if(delta>=-2&&delta<=0){matched++;weight+=n;}
      if($('only').checked&&(delta < -2||delta>0))continue;
      const x=xp*W/100,y=yp*H/100;
      if($('mobs').checked&&cells) {
        ctx.save();ctx.globalAlpha=.58;ctx.fillStyle=color(delta);
        ctx.fillRect(x,y,W*.05,H*.05);ctx.restore();
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
    let spawnPoints=[];
    if(spawnMap&&$('mobs').checked) {
      spawnPoints=WowClassicSpawns.filter(spawnMap,classicData,options);
      const scale=W/canvas.clientWidth,r=2.7*scale;
      for(const p of spawnPoints) {
        const candidates=WowClassicSpawns.candidates(p,classicData,options),range=WowClassicSpawns.range(p,classicData,options);
        const x=p[1]*W/100,y=p[2]*H/100,fill=WowClassicSpawns.color((range[0]+range[1])/2,L,color);
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
        if(!p[7].length){ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#102019';ctx.lineWidth=.6*scale;ctx.stroke();}
        else {ctx.strokeStyle='#102019';ctx.lineWidth=2.7*scale;ctx.stroke();ctx.strokeStyle=fill;ctx.lineWidth=1.5*scale;ctx.stroke();}
        if($('density').checked&&Number($('mapZoom').value)>=2) {
          ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font=`bold ${9*scale}px system-ui`;ctx.strokeStyle='#101a1e';ctx.lineWidth=2.4*scale;
          const label=range[0]===range[1]?String(range[0]):`${range[0]}–${range[1]}`;ctx.strokeText(label,x,y-r);ctx.fillStyle='#fff9df';ctx.fillText(label,x,y-r);
        }
        visiblePoints.push({key:`spawn:${p[0]}`,kind:'spawn',x:p[1],y:p[2],meta:candidates[0],spawn:p,candidates,range});
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
    const npcPositions=$('npcs').checked&&npcData?WowNpcArea.unique(npcData.maps[id]||[]).filter(p=>{
      const meta=npcData.npcs[p[2]];
      if(classicActive()&&(classicData.npcs[p[2]]||(!meta.flags&&!meta.quest_starts.length&&!meta.quest_ends.length)))return false;
      return WowNpcs.matches(meta,options);
    }):[];
    const npcCount=npcPositions.length;
    for(const [xp,yp,npcId] of npcPositions)visiblePoints.push({key:`npc:${npcId}:${xp}:${yp}`,kind:'npc',x:xp,y:yp,meta:npcData.npcs[npcId]});
    const grouped=$('npcGrouping').value==='auto'&&Number($('mapZoom').value)<2;
    const bundles=grouped?WowNpcArea.clusters(npcPositions,canvas.clientWidth,canvas.clientHeight):npcPositions.map(p=>({x:p[0],y:p[1],count:1,points:[p]}));
    for(const bundle of bundles) {
      const x=bundle.x*W/100,y=bundle.y*H/100;
      if(bundle.count>1) {
        visibleClusters.push(bundle);
        const scale=W/canvas.clientWidth,radius=(bundle.count>=100?17:14)*scale;
        ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle='#124b5d';ctx.fill();ctx.strokeStyle='#9ee4e8';ctx.lineWidth=1.5*scale;ctx.stroke();
        ctx.font=`bold ${12*scale}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5cb';ctx.fillText(String(bundle.count),x,y);
      }else {
        const meta=npcData.npcs[bundle.points[0][2]];
        ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4.5,y+4);ctx.lineTo(x-4.5,y+4);ctx.closePath();
        ctx.fillStyle=meta.quest_starts.length?'#ffe185':'#77dce8';ctx.fill();ctx.strokeStyle='#0b2732';ctx.lineWidth=1;ctx.stroke();
      }
    }
    $('npc-cluster-status').textContent=$('npcs').checked&&npcData?
      (visibleClusters.length?`${visibleClusters.length} групп и ${bundles.length-visibleClusters.length} отдельных позиций. Число в группе — записи координат. При масштабе 200% и выше показаны отдельные позиции.`:`Отдельных позиций NPC: ${npcCount}.`):'';
    if($('npcs').checked&&!npcData)loadNpcs();
    $('npc-retry').hidden=!($('npcs').checked&&npcFailed);
    $('npc-status').textContent=!$('npcs').checked?'Слой NPC выключен. Координаты QuestieDB доступны отдельно от оценочной плотности.':
      npcData?`NPC: ${npcCount} из ${npcData.maps[id].length} записей координат подходят фильтрам. `+(classicActive()?'Поверх мест появлений показаны услуги и квесты; боевые виды и неизвестные служебные сущности не дублируются. ':'')+'Это справочные позиции, не число живых NPC. Совмещение в игре не проверено.':
      npcFailed?'Не удалось загрузить NPC. Остальные слои доступны; повторите загрузку.':'Загрузка координат NPC…';
    drawAreaCircle();renderAreaPanel();
    drawSelection();
    const unknown=[...WowResources.filterPoints(data,'ore',id,{...options,skillFilter:false}),...WowResources.filterPoints(data,'herbs',id,{...options,skillFilter:false})].filter(point=>data.catalog[point[2]].min_skill===null).length;
    $('filter-status').textContent=`Ресурс: ${options.resource==='all'?'все':data.catalog[options.resource].name}. `+
      (options.skillFilter?`Навыки: горное дело ${options.miningSkill}, травничество ${options.herbalismSkill}. `:'Фильтр по навыку выключен. ')+
      (unknown?`Неизвестное требование у ${unknown} записей; ${options.skillFilter&&!options.unknownSkill?'скрыты':'показаны при включённом слое'}. `:'')+
      `Учителя: ${WowResources.trainersForZone(data,id,options).length} подходят фильтрам из ${data.trainers[id].length} в источнике. Справочная выборка неполная.`;
    const mobLabel=spawnMap?`${spawnPoints.length} из ${spawnMap.points.length} возможных мест · до ${WowClassicSpawns.upperBound(spawnPoints,spawnMap)} по известным ограничениям (не текущая численность)`:
      rows.length?`${rows.length} ячеек мобов · ${matched} ячеек уровня ${Math.max(1,L-2)}–${L} (сумма индексов ${weight})`:'оценки плотности мобов нет';
    stats.textContent=`${data.maps.find(m=>m.id===id).name} · ${mobLabel} · ${resourceLabel(ores,'руды',data.ore[id].length)} · ${resourceLabel(herbs,'трав',data.herbs[id].length)}`;
    const parts=[spawnMap?`Мобы: ${spawnMap.species} видов Classic; возможные места появления`:rows.length?'Мобы: оценочные ячейки':'Мобы: оценки плотности нет'];
    for(const [key,label] of [['ore','Руда'],['herbs','Травы']]) {
      const info=data.coverage[id][key];
      parts.push(`${label}: ${info.records} ${info.status==='imported'?'исторических записей':'записей в источнике'}`);
    }
    parts.push(`NPC QuestieDB: ${data.coverage[id].npcs.records} записей координат`);
    parts.push(spawnMap?'Источник мест: CMaNGOS Classic-DB, снимок 15.11.2026; актуальность Forever не проверена':`Плотность: Mob Level Map ${data.sources.mobs.version}, база Classic Era + поправки Forever`);
    $('coverage').textContent=parts.join(' · ')+'. Совмещение координат ресурсов с картой в игре ещё не проверено.'+
      (data.maps.find(m=>m.id===id).artwork_kind==='classic_reference'?' Подложка: карта WoW Classic; изменения рельефа Forever на ней могут отсутствовать.':'');
  }
  function setZone(center=null) {
    if(!data)return;
    selectedArea=center;areaPanelKey=null;selectedCell=center?[Math.min(19,Math.floor(center.x/5)),Math.min(19,Math.floor(center.y/5))]:null;selectedPointKey=null;visiblePoints=[];visibleClusters=[];mapReady=false;caveCanvas.getContext('2d').clearRect(0,0,caveCanvas.width,caveCanvas.height);$('cave-status').textContent='';ctx.clearRect(0,0,canvas.width,canvas.height);
    $('npc-status').textContent='Загрузка карты…';renderAreaPanel();
    stats.textContent='Загрузка карты…';$('coverage').textContent='';$('map-tooltip').hidden=true;$('point-options').disabled=true;$('point-info').textContent='Загрузка карты…';$('point-source').hidden=true;
    img.alt='Карта: '+data.maps.find(map=>map.id===zone.value).name;
    img.src='maps/'+zone.value+'.jpg';
    if(img.complete&&img.naturalWidth){mapReady=true;applyZoom();draw();}
  }
  img.onload=()=>{mapReady=true;applyZoom();draw();};
  img.onerror=()=>{caveCanvas.getContext('2d').clearRect(0,0,caveCanvas.width,caveCanvas.height);$('cave-status').textContent='';$('npc-status').textContent='Карта недоступна. Выберите другую локацию или повторите загрузку.';mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);stats.textContent='Не удалось загрузить карту выбранной локации. Выберите другую локацию или повторите загрузку.';};
  function nearestCluster(clientX,clientY) {
    const rect=canvas.getBoundingClientRect();let best=null,distance=18*18;
    for(const cluster of visibleClusters) {
      const dx=rect.left+cluster.x*rect.width/100-clientX,dy=rect.top+cluster.y*rect.height/100-clientY;
      if(dx*dx+dy*dy<=distance){best=cluster;distance=dx*dx+dy*dy;}
    }
    return best;
  }
  function drawAreaCircle() {
    if(!selectedArea)return;
    const x=selectedArea.x*canvas.width/100,y=selectedArea.y*canvas.height/100,r=Number($('areaRadius').value)*canvas.width/100;
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#fff0aa13';ctx.fill();ctx.lineWidth=3*canvas.width/canvas.clientWidth;ctx.strokeStyle='#ffad42';ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();ctx.restore();
  }
  function renderAreaPanel() {
    $('area-enable-npcs').hidden=$('npcs').checked||classicActive();$('area-enable-npcs').disabled=!data;
    $('area-description').textContent=classicActive()?'Оранжевый круг — выбранная область. Одно место может допускать разные виды; строки видов не суммируются. Верхняя граница учитывает известные ограничения групп, но не показывает текущую численность.':'Оранжевый круг — выбранная область. Числа показывают записи координат в источнике. Фактическое число живых существ сейчас неизвестно. Среди NPC могут быть мирные персонажи; флаг обслуживания не определяет враждебность.';
    $('area-clear').disabled=!selectedArea;$('area-zoom').disabled=!selectedArea||!mapReady||Number($('mapZoom').value)>=3;
    if(!data||!mapReady){areaPanelKey=null;$('area-rows').replaceChildren();$('area-table-wrap').hidden=true;$('area-source').textContent='';$('area-status').textContent=data?'Ожидание карты…':'Сначала загрузите данные атласа.';return;}
    const options=currentState(),key=JSON.stringify([zone.value,selectedArea,options.mode,options.mobs,options.areaRadius,options.npcs,options.npcType,options.npcRole,options.npcQuery,options.only,options.level,options.hideServices,Boolean(npcData),npcLoading,npcFailed,mapReady]);
    if(key===areaPanelKey)return;areaPanelKey=key;
    const body=$('area-rows');body.replaceChildren();$('area-table-wrap').hidden=true;$('area-source').textContent='';
    if(!data||!mapReady){$('area-status').textContent=data?'Ожидание карты…':'Сначала загрузите данные атласа.';return;}
    if(!selectedArea){$('area-status').textContent='Нажмите на карту, чтобы выбрать область. Стрелки выбирают центр ячейки, Escape снимает выделение.';return;}
    const location=`Центр ${selectedArea.x.toFixed(2)}, ${selectedArea.y.toFixed(2)} · радиус ${options.areaRadius}% ширины карты. `;
    if(classicActive()) {
      const summary=WowClassicSpawns.summarize(classicMap(),classicData,selectedArea,options.areaRadius,img.naturalHeight/img.naturalWidth,options);
      $('area-status').textContent=location+`Возможных мест: ${summary.count} из ${summary.total}. Верхняя граница по известным ограничениям: ${summary.upper}. Это не число живых мобов.`;
      $('area-source').textContent='CMaNGOS Classic-DB · снимок 15.11.2026. Альтернативы шаблонов не удваивают число мест; ограниченные группы и пулы учитываются один раз. Границы зоны, движение и актуальность Forever требуют проверки.';
      document.querySelector('#area-table-wrap caption').textContent='Возможные места каждого вида; альтернативные виды делят места, строки не суммировать';
      for(const row of summary.rows) {
        const tr=document.createElement('tr');tr.dataset.npcId=String(row.npc.id);tr.dataset.positions=String(row.count);
        for(const text of [`${row.npc.name} · ID ${row.npc.id}`,`${row.npc.min_level}–${row.npc.max_level}`,WowCreatureTypes.label(row.npc.creature),String(row.count)]) {const td=document.createElement('td');td.textContent=text;tr.append(td);}
        body.append(tr);
      }
      $('area-table-wrap').hidden=!summary.rows.length;return;
    }
    document.querySelector('#area-table-wrap caption').textContent='Позиции по NPC ID; типы Classic предварительные';
    if(!options.npcs){$('area-status').textContent=location+'Включите NPC для подсчёта записей.';return;}
    if(!npcData){$('area-status').textContent=location+(npcFailed?'Данные NPC недоступны. Используйте повторную загрузку NPC.':'Загрузка записей NPC…');return;}
    const points=npcData.maps[zone.value]||[];
    $('area-source').textContent=`Источник координат: QuestieDB Forever, снимок ${npcData.commit.slice(0,7)}. Совмещение в игре не проверено. Типы: WoW Forever Friends / CMaNGOS Classic, предварительно. Данных о текущей враждебности нет.`;
    if(!points.length){$('area-status').textContent=location+'В источнике нет координат NPC для этой карты. Это не означает отсутствие существ в игре.';return;}
    const summary=WowNpcArea.summarize(points,npcData.npcs,selectedArea,options.areaRadius,img.naturalHeight/img.naturalWidth,options);
    $('area-status').textContent=location+`Показано ${summary.count} из ${summary.total} записей координат в круге; разных NPC ID: ${summary.entities}.`+
      (!summary.count?' Нет записей с выбранными областью и фильтрами.':'');
    for(const row of summary.rows) {
      const tr=document.createElement('tr'),name=document.createElement('td'),link=document.createElement('a'),id=document.createElement('small');
      tr.dataset.npcId=String(row.npc.id);tr.dataset.positions=String(row.count);
      link.textContent=row.npc.name;link.href=`database.html?kind=npcs&id=${row.npc.id}`;id.textContent=`ID ${row.npc.id}`;name.append(link,id);tr.append(name);
      for(const text of [`${row.npc.min_level??'?'}–${row.npc.max_level??'?'}`,WowCreatureTypes.label(row.npc.creature),String(row.count)]) {const cell=document.createElement('td');cell.textContent=text;tr.append(cell);}
      tr.children[2].title=WowCreatureTypes.description(row.npc.creature);body.append(tr);
    }
    $('area-table-wrap').hidden=!summary.rows.length;
  }
  function applyZoom(center=true) {
    const zoom=Number($('mapZoom').value)||1,viewport=$('map-viewport');
    area.style.width=zoom*100+'%';area.style.maxWidth=zoom===1?'1100px':'none';area.style.margin=zoom===1?'auto':'0';viewport.style.maxHeight=zoom>1?'75vh':'none';
    if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0;}
    if(center&&mapReady)requestAnimationFrame(()=>{
      const focus=selectedArea||{x:50,y:50};
      const rect=img.getBoundingClientRect(),frame=viewport.getBoundingClientRect();
      viewport.scrollTo({left:viewport.scrollLeft+rect.left-frame.left+focus.x*rect.width/100-viewport.clientWidth/2,
        top:viewport.scrollTop+rect.top-frame.top+focus.y*rect.height/100-viewport.clientHeight/2});
    });
  }
  $('mapZoom').addEventListener('change',()=>{applyZoom();persist();draw();});
  $('area-enable-npcs').addEventListener('click',()=>{if(!data)return;$('npcs').checked=true;persist();draw();});
  $('area-clear').addEventListener('click',()=>{selectedArea=null;selectedCell=null;selectedPointKey=null;persist();draw();});
  $('area-zoom').addEventListener('click',()=>{const next=WowNpcArea.ZOOMS.find(value=>value>Number($('mapZoom').value));if(next){$('mapZoom').value=next;applyZoom();persist();draw();}});
  function currentState() {
    return {zone:zone.value,level:WowApp.normalizeLevel(lv.value),mode:$('mode').value,areaRadius:Number($('areaRadius').value),mapZoom:Number($('mapZoom').value),npcGrouping:$('npcGrouping').value,areaX:selectedArea?.x??null,areaY:selectedArea?.y??null,npcType:$('npcType').value,npcRole:$('npcRole').value,npcQuery:$('npcQuery').value,faction:$('faction').value,...WowResources.readControls(),
      ...Object.fromEntries(WowSettings.FLAGS.map(key=>[key,$(key).checked]))};
  }
  function persist() {
    if(!data)return;
    const state=currentState();
    $('trainer-faction-field').hidden=!state.trainers;
    const {areaX,areaY,...savedState}=state;
    const saved=WowSettings.writeSaved(savedState);
    $('preference-status').textContent=saved?'Настройки сохраняются автоматически.':'Хранилище браузера недоступно. Настройки сохранены в ссылке.';
    const link=WowSettings.toUrl(location.href,state);
    $('farm-link').href=WowSettings.toUrl(new URL('index.html',location.href).href,state);
    if(!$('share-link').hidden)$('share-link').value=link;
    try { history.replaceState(null,'',link); } catch (_) { /* local-file restrictions */ }
  }
  function drawSelection() {
    renderPointPanel();
    if(classicView()) {$('cell-info').textContent=selectedArea?'Выбрана область мест появления Classic. Число мест и ограничения показаны в таблице выше.':'Выберите место появления или область. Полые круги обозначают ограниченные группы и пулы.';return;}
    if(!selectedCell){$('cell-info').textContent='Выберите ячейку на карте для подробностей.';return;}
    const [column,row]=selectedCell;
    const x=column*canvas.width*.05,y=row*canvas.height*.05;
    ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,canvas.width*.05-2,canvas.height*.05-2);
    const cell=data.mobs[zone.value].find(cell=>cell[0]===column*5&&cell[1]===row*5);
    if(!cell){$('cell-info').textContent='В выбранной ячейке нет оценки плотности мобов.';return;}
    const delta=cell[2]-Number(lv.value);
    $('cell-info').textContent=`Ячейка: уровень ${cell[2]} (${delta>0?'+':''}${delta} к персонажу), индекс плотности ${cell[3]}. Это оценка, не число живых мобов.`+
      ($('only').checked&&(delta < -2||delta>0)?' Ячейка скрыта фильтром −2…0.':'')+
      (data.mob_origins[zone.value][data.mobs[zone.value].indexOf(cell)]==='forever_override'?' Источник: поправка Forever.':' Источник: базовые данные Classic Era.')+` Версия ${data.sources.mobs.version}; уровень представительный.`;
  }
  const professions={ore:'Горное дело',herbs:'Травничество'};
  const factions={alliance:'Альянс',horde:'Орда',neutral:'Нейтральный'};
  const questIds=point=>point.kind==='spawn'?point.candidates.map(n=>n.id):[point.meta.id];
  const questSummary=point=>window.WowMobQuests?.summary(questIds(point),window.WOW_MOB_QUESTS)||'Квесты: данные недоступны';
  const questDetails=point=>window.WowMobQuests?.details(questIds(point),window.WOW_MOB_QUESTS)||'Квесты: данные недоступны';
  function pointLabel(point) {
    if(point.kind==='spawn')return point.candidates.map(n=>`${n.name} · ID ${n.id}`).join(' / ');
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
    if(point.kind==='spawn') {
      const p=point.spawn,map=classicMap(),limits=p[7].map(k=>map.constraints[k]);
      $('point-info').textContent=`${pointLabel(point)}\nУровни Classic: ${point.range[0]}–${point.range[1]} · координаты ${point.x.toFixed(2)}, ${point.y.toFixed(2)}\nМесто появления: GUID ${p[0]}.`+
        (p[3].length>1?'\nВозможные виды: '+p[3].map(id=>`${classicData.npcs[id].name} (ID ${id})`).join(' / ')+'. Это альтернативы на одном месте, не дополнительные мобы.':'')+
        (limits.length?'\n'+limits.map(c=>`Группа: ${c.total_members??c.members.length} возможных мест в источнике, не более ${c.limit} активных существ во всей группе.`+(c.kind==='nested_pool'?' Учтена вместимость дочерних пулов.':'')).join('\n'):'')+
        `\nВозрождение по базе: ${p[4]}–${p[5]} сек.`+(p[6]?' Существо перемещается; точка не описывает весь маршрут.':'')+'\nИсточник: CMaNGOS Classic-DB, 15.11.2026. Текущая доступность в Forever не проверена.';
      $('point-info').textContent+='\n'+questDetails(point)+(point.candidates.length>1?'\nКвесты посчитаны по объединению возможных видов без повторов.':'');
      $('point-source').href='sources/classic_spawns/WORLD_NOTICE.md';$('point-source').hidden=false;
      ctx.beginPath();ctx.arc(point.x*canvas.width/100,point.y*canvas.height/100,8*canvas.width/canvas.clientWidth,0,Math.PI*2);ctx.strokeStyle='#fff6cc';ctx.lineWidth=2;ctx.stroke();return;
    }
    if(point.kind==='npc') {
      const roles=[meta.flags&128?'торговец':null,meta.flags&16?'учитель':null,meta.quest_starts.length?'выдаёт квесты':null,meta.quest_ends.length?'принимает квесты':null].filter(Boolean);
      $('point-info').textContent=`${pointLabel(point)}${meta.title?' — '+meta.title:''}\nУровни: ${meta.min_level??'?'}–${meta.max_level??'?'} · ${roles.join(', ')||'NPC'}\n${WowCreatureTypes.description(meta.creature)}\nКоординаты: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}\nКвесты: начало ${meta.quest_starts.join(', ')||'нет записей'}; сдача ${meta.quest_ends.join(', ')||'нет записей'}.\nИсточник: QuestieDB Forever, снимок ${npcData.commit.slice(0,7)}. Статические данные; фазы и доступность для персонажа не проверены.`;
      $('point-info').textContent+='\n'+questDetails(point);
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
      const point=nearestPoint(event.clientX,event.clientY),cluster=nearestCluster(event.clientX,event.clientY),tooltip=$('map-tooltip');tooltip.hidden=!point&&!cluster;
      if(!point&&!cluster)return;
      tooltip.textContent=cluster?`Группа: ${cluster.count} записей координат. Нажмите для выбора области.`:pointLabel(point)+(point.kind==='spawn'?` · уровни ${point.range[0]}–${point.range[1]}`+(point.spawn[7].length?' · ограниченная группа':''):'')+(point.kind==='npc'?` · ${WowCreatureTypes.label(point.meta.creature)}${point.meta.creature.type?' (предварительно, Classic)':''}`:'')+(['trainer','npc','spawn'].includes(point.kind)?'':point.meta.min_skill===null?' · навык неизвестен':` · навык ${point.meta.min_skill}`);
      if(point&&!cluster&&['npc','spawn'].includes(point.kind))tooltip.textContent+=' · '+questSummary(point)+' (справочно)';
      tooltip.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-tooltip.offsetWidth-8))+'px';
      tooltip.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-tooltip.offsetHeight-8))+'px';
    });
  });
  area.addEventListener('pointerleave',()=>{cancelAnimationFrame(hoverFrame);$('map-tooltip').hidden=true;});
  function applyState(state) {
    zone.value=state.zone;setLevel(state.level);$('mode').value=state.mode;
    for(const key of WowSettings.FLAGS)$(key).checked=state[key];
    selectedArea=typeof state.areaX==='number'&&typeof state.areaY==='number'?{x:state.areaX,y:state.areaY}:null;
    $('areaRadius').value=state.areaRadius;$('mapZoom').value=state.mapZoom;$('npcGrouping').value=state.npcGrouping;applyZoom(false);
    WowResources.applyControls(state);$('faction').value=state.faction;$('npcType').value=state.npcType;$('npcRole').value=state.npcRole;$('npcQuery').value=state.npcQuery;
  }
  zone.addEventListener('change',()=>{selectedArea=null;persist();setZone();});
  let levelSave;
  lv.addEventListener('input',()=>{setLevel(lv.value);draw();clearTimeout(levelSave);levelSave=setTimeout(persist,150);});
  lv.addEventListener('change',()=>{clearTimeout(levelSave);persist();});
  lvnum.addEventListener('change',()=>{setLevel(lvnum.value);persist();draw();});
  for(const id of ['caves','hideServices','areaRadius','npcGrouping','npcs','npcType','npcRole','npcQuery','mobs','density','ores','herbs','only','mode','trainers','focus','resource','miningSkill','herbalismSkill','skillFilter','unknownSkill','faction'])$(id).addEventListener('change',()=>{
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
    selectedArea={x:Number((x*100).toFixed(4)),y:Number((y*100).toFixed(4))};
    selectedCell=[Math.min(19,Math.floor(x*20)),Math.min(19,Math.floor(y*20))];
    area.focus({preventScroll:true});persist();draw();
  });
  area.addEventListener('keydown',event=>{
    if(!data||!mapReady||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))return;
    event.preventDefault();
    selectedPointKey=null;
    if(event.key==='Escape'){selectedCell=null;selectedArea=null;}
    else {
      const cell=selectedCell||[10,10];
      selectedCell=[Math.max(0,Math.min(19,cell[0]+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0))),
        Math.max(0,Math.min(19,cell[1]+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))];
    }
    if(selectedCell)selectedArea={x:selectedCell[0]*5+2.5,y:selectedCell[1]*5+2.5};
    if(selectedArea&&Number($('mapZoom').value)>1)applyZoom();
    persist();draw();
  });
  let legendKey=null;
  function updateLevelLegend(map) {
    const key=map?`${map.min_level}:${map.max_level}`:'relative';if(key===legendKey)return;legendKey=key;
    $('legend').replaceChildren();$('level-heat-bar').style.background=WowSettings.heatGradient();
    const ticks=WowSettings.LEGEND;
    for(const [delta,label] of ticks) {
      const item=document.createElement('span'),dot=document.createElement('i');
      item.dataset.delta=String(delta);item.style.left=((delta+5)*10)+'%';dot.className='dot';dot.style.background=color(delta);
      item.append(dot,document.createTextNode(label));$('legend').append(item);
    }
    $('legend-description').textContent='Цвет — разница между уровнем моба и заданным уровнем персонажа: −5 — зелёный, 0 — жёлтый, +5 и выше — красный. Ниже более чем на 5 уровней — серый.'+(map?' Для диапазона уровней используется его середина.':' Для ячейки используется её представительный уровень.');
    $('level-heat-bar').setAttribute('aria-label','Разница уровней: −5 — зелёный, 0 — жёлтый, +5 и выше — красный. Ниже более чем на 5 уровней — серый.');
    $('density-scale').textContent=map?'Каждая точка — возможное место появления. Полый круг — место ограниченной группы или пула. Числа уровней появляются при увеличении от 200%. Плотность видна по расположению мест; верхняя граница не является оценкой текущего числа живых мобов.':`Цвет показывает разницу уровней: зелёный — ниже, жёлтый — на уровне персонажа, красный — выше. Числа — оценочный индекс плотности (1–${maxDensity}), не число живых мобов.`;
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
    $('show-all-mobs').disabled=true;    controls.forEach(control=>control.disabled=true);$('share').disabled=true;$('reset-settings').disabled=true;$('retry').disabled=true;
    $('point-options').disabled=true;$('map-tooltip').hidden=true;
    error.hidden=true;stats.textContent='Загрузка данных…';
    try {
      if(!window.WowApp||!window.WowSettings||!window.WowResources||!window.WowNpcArea)throw new Error('Application unavailable');
      data=await WowApp.loadData();
      zone.replaceChildren();
      for(const map of [...data.maps].sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.id.localeCompare(b.id))) {
        const option=document.createElement('option');option.value=map.id;
        option.textContent=WowZoneLevels.label(map)+(map.has_mobs||classicData?.maps[map.id]?.points.length?'':' · нет оценки плотности');
        option.title='Рекомендуемые уровни по Classic — ориентир, а не ограничение входа. В Forever сложность может отличаться.';zone.append(option);
      }
      WowResources.populateOptions(data,$('resource'));
      WowCreatureTypes.populate($('npcType'));
      applyState(WowSettings.resolve(data,new URLSearchParams(location.search),WowSettings.readSaved(),WowApp.normalizeLevel));
      if($('skillFilter').checked||$('resource').value!=='all')document.querySelector('.resource-filters').open=true;
      maxDensity=Math.max(1,...Object.values(data.mobs).flat().map(cell=>cell[3]));
      $('density-scale').textContent=`Цвет показывает разницу уровней: зелёный — ниже, жёлтый — на уровне персонажа, красный — выше. Числа — оценочный индекс плотности (1–${maxDensity}), не число живых мобов.`;
      $('show-all-mobs').disabled=false;      controls.forEach(control=>control.disabled=false);$('share').disabled=false;$('reset-settings').disabled=false;persist();setZone(selectedArea);
    } catch (_) {
      data=undefined;mapReady=false;caveCanvas.getContext('2d').clearRect(0,0,caveCanvas.width,caveCanvas.height);$('cave-status').textContent='';ctx.clearRect(0,0,canvas.width,canvas.height);
      error.hidden=false;stats.textContent='';$('coverage').textContent='';selectedArea=null;renderAreaPanel();
    } finally { $('retry').disabled=false; }
  }
  $('retry').addEventListener('click',start);
  start();
})();
