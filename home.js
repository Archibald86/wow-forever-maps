(() => {
  const $=id=>document.getElementById(id),search=$('search'),level=$('level'),results=$('results');
  const fields=[...document.querySelectorAll('.resource-filters input,.resource-filters select')];
  let data;
  function recommend() {
    if(!data)return;
    const L=WowApp.normalizeLevel(level.value);level.value=L;
    const options={...WowResources.readControls(),level:L};WowResources.applyControls(options);
    const saved={...WowSettings.readSaved(),...options};WowSettings.writeSaved(saved);
    try {
      const url=new URL(location.href);
      for(const [key,value]of Object.entries(options))url.searchParams.set(key,typeof value==='boolean'?(value?'1':'0'):String(value));
      history.replaceState(null,'',url.href);
    }catch(_){}
    const picks=WowResources.rankZones(data,options);results.replaceChildren();
    for(const [i,pick]of picks.entries()) {
      const item=document.createElement('article');item.className='result';
      const rank=document.createElement('div');rank.className='rank';rank.textContent=i+1;
      const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=pick.map.name;
      small.textContent=`${pick.cells} подходящих ячеек · индекс плотности ${pick.density.toLocaleString('ru-RU')} · руда ${pick.oreTotal} (рядом ${pick.nearbyOre}) · травы ${pick.herbTotal} (рядом ${pick.nearbyHerbs})`+
        (pick.missingMobs?' · данные мобов отсутствуют':'')+(pick.unknown&&options.skillFilter&&options.unknownSkill?` · неизвестный навык у ${pick.unknown} записей`:'');
      info.append(strong,small);
      const state={...WowSettings.resolve(data,new URLSearchParams(),saved,WowApp.normalizeLevel),zone:pick.map.id,level:L,only:!['ore','herbs'].includes(options.focus)};
      if(options.focus==='ore'){state.ores=true;state.herbs=false;}
      if(options.focus==='herbs'){state.herbs=true;state.ores=false;}
      const link=document.createElement('a');link.href=WowSettings.toUrl(new URL('atlas.html',location.href).href,state);link.textContent='Посмотреть карту';
      item.append(rank,info,link);results.append(item);
    }
    $('filter-status').textContent=options.focus==='ore'?'Сортировка по числу подходящих записей руды в локации.':
      options.focus==='herbs'?'Сортировка по числу подходящих записей трав в локации.':
      options.focus==='mobs'?'Сортировка по сумме индексов подходящих ячеек мобов.':'Сначала плотность мобов, затем число подходящих ресурсов рядом с ячейками.';
    $('filter-status').textContent+=' Это исторические записи, не оценка дохода, скорости сбора или безопасности маршрута.';
    if(!picks.length)results.textContent='Нет локаций с выбранными фильтрами. Измените ресурс, навык или цель.';
  }
  $('start').onclick=()=>{search.classList.add('visible');search.scrollIntoView({behavior:'smooth',block:'start'});recommend();};
  $('find').onclick=recommend;
  level.addEventListener('keydown',event=>{if(event.key==='Enter')recommend();});
  level.addEventListener('change',()=>{if(window.WowApp){level.value=WowApp.normalizeLevel(level.value);WowSettings.writeSaved({...WowSettings.readSaved(),level:Number(level.value)});try{const url=new URL(location.href);url.searchParams.set('level',level.value);history.replaceState(null,'',url.href);}catch(_){}}});
  fields.forEach(field=>field.addEventListener('change',()=>{if(search.classList.contains('visible'))recommend();}));
  async function start() {
    $('start').disabled=true;$('find').disabled=true;$('retry').disabled=true;fields.forEach(field=>field.disabled=true);$('data-error').hidden=true;
    try {
      if(!window.WowApp||!window.WowSettings||!window.WowResources)throw new Error('Application unavailable');
      data=await WowApp.loadData();WowResources.populateOptions(data,$('resource'));
      const state=WowSettings.resolve(data,new URLSearchParams(location.search),WowSettings.readSaved(),WowApp.normalizeLevel);
      level.value=state.level;WowResources.applyControls(state);
      if(state.skillFilter||state.resource!=='all')document.querySelector('.resource-filters').open=true;
      $('ore-total').textContent=Object.values(data.ore).reduce((sum,rows)=>sum+rows.length,0).toLocaleString('ru-RU');
      $('herb-total').textContent=Object.values(data.herbs).reduce((sum,rows)=>sum+rows.length,0).toLocaleString('ru-RU');
      $('start').disabled=false;$('find').disabled=false;fields.forEach(field=>field.disabled=false);
      if(search.classList.contains('visible'))recommend();
    }catch(_){data=undefined;$('data-error').hidden=false;results.replaceChildren();}
    finally{$('retry').disabled=false;}
  }
  $('retry').addEventListener('click',start);start();
})();
