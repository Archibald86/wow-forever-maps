(() => {
 const $=id=>document.getElementById(id),types=['npcs','quests','items','objects'],labels={npcs:'NPC',quests:'квестов',items:'предметов',objects:'объектов'};
 const params=new URLSearchParams(location.search),cache=new Map();
 let manifest,atlas,rows=[],filtered=[],page=0,request=0,loadedKind=null;
 WowCreatureTypes.populate($('dbCreatureType'));
 $('dbCreatureType').value=WowCreatureTypes.validFilter(params.get('npcType'))?params.get('npcType'):'all';
 $('kind').value=types.includes(params.get('kind'))?params.get('kind'):'npcs';
 $('query').value=(params.get('id')||params.get('q')||'').slice(0,120);
 const seq=value=>Object.values(value||{});
 async function get(path) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const r=await fetch(path,{signal:controller.signal});if(!r.ok)throw new Error('Request failed');return await r.json();}finally{clearTimeout(timer);}
 }
 function element(tag,text,className) {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function link(text,href) {const a=element('a',text);a.href=href;return a;}
 function relation(container,label,kind,ids) {
  const values=[...new Set(ids)].filter(id=>Number.isInteger(id)&&id>0);if(!values.length)return;
  const line=element('p',label+': ');
  for(const id of values.slice(0,30)){line.append(link(String(id),`database.html?kind=${kind}&id=${id}`),document.createTextNode(' '));}
  if(values.length>30)line.append(document.createTextNode(`… ещё ${values.length-30}; все ID доступны в полях записи.`));container.append(line);
 }
 function mapLinks(card,row,kind) {
  const f=row.fields,spawns=f.spawns||{},links=element('p',undefined,'db-links');
  for(const map of atlas.maps) {
   const area=atlas.coverage[map.id].npcs.area_id;
   if(!Object.hasOwn(spawns,String(area)))continue;
   const url=new URL('atlas.html',location.href);url.searchParams.set('zone',map.id);
   if(kind==='npcs'){url.searchParams.set('npcs','1');url.searchParams.set('npcQuery',String(row.id));url.searchParams.set('npcRole','all');url.searchParams.set('npcType','all');url.searchParams.set('only','0');url.searchParams.set('mobs','0');url.searchParams.set('density','0');}
   links.append(link(kind==='npcs'?`NPC на карте: ${map.name}`:`Карта зоны: ${map.name}`,url.href));
  }
  if(links.childNodes.length)card.append(links);
  else if(kind==='npcs'||kind==='objects')card.append(element('p','Нет координат на доступных картах атласа. Это не означает отсутствие в игре.','muted'));
 }
 function render() {
  const kind=$('kind').value;const container=$('db-results');container.replaceChildren();
  for(const row of filtered.slice(page*40,(page+1)*40)) {
   const card=element('article',undefined,'db-card'),f=row.fields;
   card.append(element('h2',row.name),element('p',`ID ${row.id} · ${row.name_en}`,'muted'));
   if(kind==='npcs') {
    card.append(element('p',`Уровни: ${f.minLevel??'?'}–${f.maxLevel??'?'}${f.subName?' · '+f.subName:''}`));
    card.append(element('p',WowCreatureTypes.description(row.creature),'creature-type'));
    relation(card,'Выдаёт квесты','quests',seq(f.questStarts));relation(card,'Принимает квесты','quests',seq(f.questEnds));mapLinks(card,row,kind);
   } else if(kind==='quests') {
    card.append(element('p',`Уровень квеста: ${f.questLevel??'?'} · Минимальный уровень: ${f.requiredLevel??'?'}`));
    for(const text of row.objectives_text||seq(f.objectivesText))if(typeof text==='string')card.append(element('p',text));
    for(const [field,label]of [['startedBy','Начало'],['finishedBy','Сдача']]) {
     relation(card,label+' у NPC','npcs',seq(f[field]?.['1']));relation(card,label+' у объектов','objects',seq(f[field]?.['2']));relation(card,label+' предметом','items',seq(f[field]?.['3']));
    }
    relation(card,'Предыдущие квесты','quests',[...seq(f.preQuestSingle),...seq(f.preQuestGroup)]);
    relation(card,'Следующий квест','quests',[f.nextQuestInChain]);
   } else if(kind==='items') {
    card.append(element('p',`Уровень предмета: ${f.itemLevel??'?'} · Требуемый уровень: ${f.requiredLevel??'?'}`));
    relation(card,'Добыча у NPC (вероятность неизвестна)','npcs',seq(f.npcDrops));relation(card,'Из объектов','objects',seq(f.objectDrops));relation(card,'Торговцы','npcs',seq(f.vendors));relation(card,'Начинает квест','quests',[f.startQuest]);relation(card,'Связанные квесты','quests',seq(f.relatedQuests));
   } else {relation(card,'Выдаёт квесты','quests',seq(f.questStarts));relation(card,'Принимает квесты','quests',seq(f.questEnds));mapLinks(card,row,kind);}
   const details=element('details'),summary=element('summary','Все поля записи источника');details.append(summary);
   details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('pre'))details.append(element('pre',JSON.stringify(f,null,2)));});card.append(details);container.append(card);
  }
  const pages=Math.max(1,Math.ceil(filtered.length/40));
  $('previous').disabled=page===0;$('next').disabled=page+1>=pages;
  $('page-label').textContent=`${page+1} / ${pages}`;
  $('db-status').textContent=`Найдено ${filtered.length.toLocaleString('ru-RU')} из ${rows.length.toLocaleString('ru-RU')} ${labels[kind]}.`;
  if(!filtered.length)container.append(element('p','Записей не найдено. Попробуйте имя на другом языке или точный ID.'));
 }
 function search() {
  const q=$('query').value.trim().toLocaleLowerCase('ru');
  if(loadedKind!==$('kind').value)return;
  filtered=rows.filter(row=>($('kind').value!=='npcs'||WowCreatureTypes.matches(row.creature,$('dbCreatureType').value))&&(!q||(/^\d+$/.test(q)?row.id===Number(q):`${row.name} ${row.name_en}`.toLocaleLowerCase('ru').includes(q))));
  page=0;render();
  const url=new URL(location.href);url.search='';url.searchParams.set('kind',$('kind').value);if(q)url.searchParams.set(/^\d+$/.test(q)?'id':'q',$('query').value.trim());if($('kind').value==='npcs')url.searchParams.set('npcType',$('dbCreatureType').value);history.replaceState(null,'',url.href);
 }
 async function load() {
  const token=++request,kind=$('kind').value;
  $('db-type-field').hidden=kind!=='npcs';$('db-type-note').hidden=kind!=='npcs';$('dbCreatureType').disabled=true;
  $('db-error').hidden=true;$('db-results').replaceChildren();$('db-status').textContent='Загрузка раздела…';$('previous').disabled=true;$('next').disabled=true;
  try {
   const [m,a,section]=await Promise.all([manifest||get('database/manifest.json?v=classic5'),atlas||get('data.json?v=density2'),cache.get(kind)||get(`database/${kind}.json?v=types1`)]);
   if(token!==request)return;
   if(section.schema_version!==1||section.kind!==kind||!Array.isArray(section.rows)||section.commit!==m.commit||section.rows.length!==m.counts[kind])throw new Error('Invalid database');
   if(kind==='npcs')for(const row of section.rows)WowCreatureTypes.validate(row.creature);
   manifest=m;atlas=a;cache.set(kind,section);rows=section.rows;loadedKind=kind;$('dbCreatureType').disabled=false;
   $('db-source').textContent=`QuestieDB Forever · снимок ${m.commit.slice(0,7)} · ${Object.entries(m.counts).map(([k,n])=>n.toLocaleString('ru-RU')+' '+labels[k]).join(' · ')}`;
   $('db-download').href=`database/${kind}.json`;
   if(kind==='npcs')$('db-type-note').textContent=`Типы: ${m.creature_types.known.toLocaleString('ru-RU')} предварительных значений Classic, ${m.creature_types.unknown.toLocaleString('ru-RU')} неизвестных. В Forever не подтверждены. Семейство, ранг и роль NPC хранятся отдельно.`;search();
  }catch(_){if(token!==request)return;rows=[];$('db-error').hidden=false;$('db-status').textContent='Раздел недоступен. Повторите загрузку.';}
 }
 $('database-search').addEventListener('submit',e=>{e.preventDefault();if(loadedKind===$('kind').value&&cache.has($('kind').value))search();else load();});
 $('dbCreatureType').addEventListener('change',search);
 $('kind').addEventListener('change',load);$('db-retry').addEventListener('click',load);
 $('previous').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});load();
})();
