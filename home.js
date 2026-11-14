(() => {
  const $=id=>document.getElementById(id),search=$('search'),level=$('level'),results=$('results');
  let data;
  function recommend() {
    if(!data)return;
    const L=WowApp.normalizeLevel(level.value);level.value=L;
    const picks=[];
    for(const map of data.maps) {
      const rows=data.mobs[map.id],ores=data.ore[map.id];
      const matches=rows.filter(row=>row[2]>=L-2&&row[2]<=L);
      if(!matches.length)continue;
      const density=matches.reduce((sum,row)=>sum+row[3],0);
      const nearby=ores.filter(ore=>matches.some(row=>Math.abs(ore[0]-(row[0]+2.5))<=7.5&&Math.abs(ore[1]-(row[1]+2.5))<=7.5)).length;
      picks.push({map,density,nearby,cells:matches.length,oreTotal:ores.length});
    }
    picks.sort((a,b)=>b.density-a.density||b.nearby-a.nearby);results.replaceChildren();
    for(const [i,pick] of picks.slice(0,5).entries()) {
      const item=document.createElement('article');item.className='result';
      const rank=document.createElement('div');rank.className='rank';rank.textContent=i+1;
      const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=pick.map.name;
      small.textContent=`${pick.cells} подходящих ячеек · индекс плотности ${pick.density.toLocaleString('ru-RU')} · рудных точек рядом ${pick.nearby} (в локации ${pick.oreTotal})`;
      info.append(strong,small);
      const link=document.createElement('a');link.href=`atlas.html?zone=${encodeURIComponent(pick.map.id)}&level=${L}&only=1`;link.textContent='Посмотреть карту';
      item.append(rank,info,link);results.append(item);
    }
    if(!picks.length)results.textContent='В базе нет подходящих ячеек для этого уровня.';
  }
  $('start').onclick=()=>{search.classList.add('visible');search.scrollIntoView({behavior:'smooth',block:'start'});recommend();};
  $('find').onclick=recommend;
  level.addEventListener('keydown',event=>{if(event.key==='Enter')recommend();});
  level.addEventListener('change',()=>{if(window.WowApp)level.value=WowApp.normalizeLevel(level.value);});
  async function start() {
    $('start').disabled=true;$('find').disabled=true;$('retry').disabled=true;
    $('data-error').hidden=true;
    try {
      if(!window.WowApp)throw new Error('Application unavailable');
      data=await WowApp.loadData();
      $('ore-total').textContent=Object.values(data.ore).reduce((sum,rows)=>sum+rows.length,0).toLocaleString('ru-RU');
      $('herb-total').textContent=Object.values(data.herbs).reduce((sum,rows)=>sum+rows.length,0).toLocaleString('ru-RU');
      $('start').disabled=false;$('find').disabled=false;
      if(search.classList.contains('visible'))recommend();
    } catch (_) { data=undefined;$('data-error').hidden=false;results.replaceChildren(); }
    finally { $('retry').disabled=false; }
  }
  $('retry').addEventListener('click',start);start();
})();
