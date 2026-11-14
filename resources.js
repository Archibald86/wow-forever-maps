/* Skill filters use sourced requirements; unknown requirements remain explicit. */
(() => {
  const FOCUSES=['balanced','mobs','ore','herbs'];
  function normalizeSkill(value) {
    const number=String(value??'').trim()===''?NaN:Number(value);
    return Number.isFinite(number)?Math.max(0,Math.min(400,Math.round(number))):300;
  }
  function filterPoints(data,layer,zone,options={}) {
    return (data[layer][zone]||[]).filter(point=>{
      if(options.resource&&options.resource!=='all'&&String(point[2])!==String(options.resource))return false;
      if(!options.skillFilter)return true;
      const info=data.catalog[point[2]];
      if(info.min_skill===null)return options.unknownSkill!==false;
      return info.min_skill<=normalizeSkill(layer==='ore'?options.miningSkill:options.herbalismSkill);
    });
  }
  function trainersForZone(data,zone,options={}) {
    const kind=options.resource&&options.resource!=='all'?data.catalog[options.resource]?.kind:null;
    return (data.trainers[zone]||[]).filter(trainer=>(!kind||trainer.profession===kind)&&
      (!options.faction||options.faction==='all'||trainer.faction==='neutral'||trainer.faction===options.faction));
  }
  function rankZones(data,options={}) {
    const level=options.level||42,focus=FOCUSES.includes(options.focus)?options.focus:'balanced',picks=[];
    for(const map of data.maps) {
      const matches=data.mobs[map.id].filter(row=>row[2]>=level-2&&row[2]<=level);
      const ores=filterPoints(data,'ore',map.id,options),herbs=filterPoints(data,'herbs',map.id,options);
      if(['balanced','mobs'].includes(focus)&&!matches.length)continue;
      if(focus==='ore'&&!ores.length||focus==='herbs'&&!herbs.length)continue;
      const density=matches.reduce((sum,row)=>sum+row[3],0);
      const near=points=>points.filter(point=>matches.some(row=>Math.abs(point[0]-(row[0]+2.5))<=7.5&&Math.abs(point[1]-(row[1]+2.5))<=7.5)).length;
      picks.push({map,density,cells:matches.length,oreTotal:ores.length,herbTotal:herbs.length,
        nearbyOre:near(ores),nearbyHerbs:near(herbs),missingMobs:!data.mobs[map.id].length,
        unknown:(focus==='ore'?ores:focus==='herbs'?herbs:[...ores,...herbs]).filter(point=>data.catalog[point[2]].min_skill===null).length});
    }
    picks.sort((a,b)=>{
      if(focus==='ore')return b.oreTotal-a.oreTotal||b.density-a.density||a.map.id.localeCompare(b.map.id);
      if(focus==='herbs')return b.herbTotal-a.herbTotal||b.density-a.density||a.map.id.localeCompare(b.map.id);
      return b.density-a.density||(focus==='balanced'?(b.nearbyOre+b.nearbyHerbs)-(a.nearbyOre+a.nearbyHerbs):0)||a.map.id.localeCompare(b.map.id);
    });
    return picks.slice(0,5);
  }
  function populateOptions(data,select) {
    select.replaceChildren();
    const all=document.createElement('option');all.value='all';all.textContent='Все ресурсы';select.append(all);
    for(const [kind,label]of [['ore','Руда'],['herbs','Травы']]) {
      const group=document.createElement('optgroup');group.label=label;
      for(const info of Object.values(data.catalog).filter(info=>info.kind===kind).sort((a,b)=>a.name.localeCompare(b.name,'ru'))) {
        const option=document.createElement('option');option.value=info.id;option.textContent=info.name;group.append(option);
      }
      select.append(group);
    }
  }
  function readControls() {
    return {focus:document.getElementById('focus').value,resource:document.getElementById('resource').value,
      miningSkill:normalizeSkill(document.getElementById('miningSkill').value),herbalismSkill:normalizeSkill(document.getElementById('herbalismSkill').value),
      skillFilter:document.getElementById('skillFilter').checked,unknownSkill:document.getElementById('unknownSkill').checked};
  }
  function applyControls(state) {
    for(const id of ['focus','resource','miningSkill','herbalismSkill'])document.getElementById(id).value=state[id];
    for(const id of ['skillFilter','unknownSkill'])document.getElementById(id).checked=state[id];
  }
  const api={FOCUSES,normalizeSkill,filterPoints,trainersForZone,rankZones,populateOptions,readControls,applyControls};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowResources=api;
})();
