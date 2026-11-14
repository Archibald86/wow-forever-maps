/* All enabled layers share this renderer; no global function replacement. */
(() => {
  const $ = id => document.getElementById(id);
  const zone=$('zone'), img=$('terrain'), canvas=$('overlay'), ctx=canvas.getContext('2d');
  const lv=$('level'), lvnum=$('levelnum'), stats=$('stats'), error=$('data-error');
  const controls=[...document.querySelectorAll('.controls input,.controls select')];
  const palette={'-4':'#00c853','-3':'#58d96d','-2':'#a5e88d','-1':'#d9ef9a','0':'#fff5a5','1':'#ffeb00','2':'#ffbc00','3':'#ff8900','4':'#ff5600'};
  let data, mapReady=false;
  const color=d=>d<=-8?'#9ca3af':d<=-5?'#28975b':d>=5?'#e82127':palette[d];
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
    canvas.width=W; canvas.height=H;
    let matched=0,weight=0;
    for (const [i,[xp,yp,ml,n]] of rows.entries()) {
      const delta=ml-L;
      if(delta>=-2&&delta<=0){matched++;weight+=n;}
      if($('only').checked&&(delta < -2||delta>0))continue;
      const x=xp*W/100,y=yp*H/100;
      if($('mobs').checked) {
        const rnd=random(i+12345);
        ctx.fillStyle=color(delta);ctx.strokeStyle='#17251b';ctx.lineWidth=.65;
        for(let j=0;j<Math.min(n,800);j++) {
          ctx.beginPath();ctx.arc(x+3+rnd()*(W*.05-6),y+3+rnd()*(H*.05-6),2.1,0,Math.PI*2);
          ctx.fill();ctx.stroke();
        }
      }
      if($('density').checked) {
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
    mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);
    stats.textContent='Загрузка карты…';$('coverage').textContent='';
    img.src='maps/'+zone.value+'.jpg';
    if(img.complete&&img.naturalWidth){mapReady=true;draw();}
  }
  img.onload=()=>{mapReady=true;draw();};
  img.onerror=()=>{mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);stats.textContent='Не удалось загрузить карту выбранной локации. Выберите другую локацию или повторите загрузку.';};
  zone.addEventListener('change',setZone);
  lv.addEventListener('input',()=>{setLevel(lv.value);draw();});
  lvnum.addEventListener('change',()=>{setLevel(lvnum.value);draw();});
  for(const id of ['mobs','density','ores','herbs','only'])$(id).addEventListener('change',draw);
  for(let delta=-4;delta<=5;delta++) {
    const item=document.createElement('span'),dot=document.createElement('i');
    dot.className='dot';dot.style.background=color(delta);
    item.append(dot,document.createTextNode((delta>0?'+':'')+delta));$('legend').append(item);
  }
  const herbLegend=document.createElement('span');herbLegend.textContent='◆ Травы';herbLegend.style.color='#6cdd8e';$('legend').append(herbLegend);
  async function start() {
    controls.forEach(control=>control.disabled=true);$('retry').disabled=true;
    error.hidden=true;stats.textContent='Загрузка данных…';
    try {
      if(!window.WowApp)throw new Error('Application unavailable');
      data=await WowApp.loadData();
      zone.replaceChildren();
      for(const map of data.maps) {
        const option=document.createElement('option');option.value=map.id;
        option.textContent=map.name+(map.has_mobs?'':' · нет данных мобов');zone.append(option);
      }
      const query=new URLSearchParams(location.search);
      zone.value=data.maps.some(m=>m.id===query.get('zone'))?query.get('zone'):'swampofsorrows_c60';
      if(!zone.value)zone.selectedIndex=0;
      setLevel(query.has('level')?query.get('level'):42);
      $('only').checked=query.get('only')==='1';
      controls.forEach(control=>control.disabled=false);setZone();
    } catch (_) {
      data=undefined;mapReady=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      error.hidden=false;stats.textContent='';$('coverage').textContent='';
    } finally { $('retry').disabled=false; }
  }
  $('retry').addEventListener('click',start);
  start();
})();
