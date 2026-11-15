/* Preference validation and level palette shared by rendering and the legend. */
(() => {
  const KEY='wow-forever-settings-v1';
  const resources=typeof module!=='undefined'&&module.exports?require('./resources.js'):window.WowResources;
  const creatureTypes=typeof module!=='undefined'&&module.exports?require('./creature-types.js'):window.WowCreatureTypes;
  const DEFAULTS={zone:'swampofsorrows_c60',level:42,caves:true,mobs:true,density:true,ores:true,herbs:false,only:false,mode:'cells',
    npcs:true,npcRole:'all',npcQuery:'',npcType:'all',areaRadius:5,mapZoom:1,npcGrouping:'auto',hideServices:false,trainers:false,focus:'balanced',resource:'all',miningSkill:300,herbalismSkill:300,skillFilter:false,unknownSkill:true,faction:'all'};
  const FLAGS=['caves','hideServices','npcs','mobs','density','ores','herbs','only','trainers','skillFilter','unknownSkill'];
  // One continuous scale for both the map and its legend, relative to the player.
  const STOPS=[[-5,[34,197,94]],[-2,[163,230,53]],[0,[250,204,21]],[2,[249,115,22]],[5,[239,68,68]]];
  const LEGEND=[[-5,'−5'],[-2,'−2'],[0,'0'],[2,'+2'],[5,'≥+5']];
  function color(delta) {
    if(Number.isFinite(delta)&&delta < -5)return '#9ca3af';
    const value=Math.max(-5,Math.min(5,Number.isFinite(delta)?delta:0));
    const upper=STOPS.findIndex(stop=>stop[0]>=value);
    const [lo,a]=STOPS[Math.max(0,upper-1)],[hi,b]=STOPS[upper];
    const fraction=hi===lo?0:(value-lo)/(hi-lo);
    return '#'+a.map((channel,i)=>Math.round(channel+(b[i]-channel)*fraction).toString(16).padStart(2,'0')).join('');
  }
  const heatGradient=()=>`linear-gradient(to right, ${STOPS.map(([delta])=>`${color(delta)} ${(delta+5)*10}%`).join(', ')})`;
  function readSaved(storage) {
    try {
      const value=JSON.parse((storage||localStorage).getItem(KEY));
      if(!value||typeof value!=='object'||Array.isArray(value))return {};
      // One-time migration: old level/type filters must not hide the new all-level view.
      return value.mobViewVersion===1?value:{...value,mobs:true,npcs:true,only:false,npcType:'all',npcRole:'all',npcQuery:'',hideServices:false};
    } catch (_) { return {}; }
  }
  function writeSaved(value,storage) {
    try { (storage||localStorage).setItem(KEY,JSON.stringify({...value,mobViewVersion:1}));return true; }
    catch (_) { return false; }
  }
  function resolve(data,query,saved,normalize) {
    const state={...DEFAULTS};
    const validZone=value=>data.maps.some(map=>map.id===value);
    if(validZone(saved.zone))state.zone=saved.zone;
    if(validZone(query.get('zone')))state.zone=query.get('zone');
    if(!validZone(state.zone))state.zone=data.maps[0].id;
    state.level=normalize(query.has('level')?query.get('level'):(saved.level??42));
    for(const key of FLAGS) {
      if(typeof saved[key]==='boolean')state[key]=saved[key];
      if(['1','true'].includes(query.get(key)))state[key]=true;
      if(['0','false'].includes(query.get(key)))state[key]=false;
    }
    if(['cells','dots'].includes(saved.mode))state.mode=saved.mode;
    if(['cells','dots'].includes(query.get('mode')))state.mode=query.get('mode');
    for(const key of ['focus','faction']) {
      const allowed=key==='focus'?resources.FOCUSES:['all','alliance','horde'];
      if(allowed.includes(saved[key]))state[key]=saved[key];
      if(allowed.includes(query.get(key)))state[key]=query.get(key);
    }
    for(const key of ['miningSkill','herbalismSkill'])state[key]=resources.normalizeSkill(query.has(key)?query.get(key):(saved[key]??300));
    const validResource=value=>value==='all'||(/^[1-9][0-9]*$/.test(String(value))&&!!data.catalog&&Object.hasOwn(data.catalog,value));
    if(validResource(saved.resource))state.resource=String(saved.resource);
    if(validResource(query.get('resource')))state.resource=String(query.get('resource'));
    for(const key of ['npcRole','npcQuery']) {
      const valid=value=>typeof value==='string'&&(key==='npcRole'?['all','quests','vendors','trainers'].includes(value):value.length<=120);
      if(valid(saved[key]))state[key]=saved[key];
      if(valid(query.get(key)))state[key]=query.get(key);
    }
    if(creatureTypes.validFilter(saved.npcType))state.npcType=saved.npcType;
    if(creatureTypes.validFilter(query.get('npcType')))state.npcType=query.get('npcType');
    for(const [key,allowed] of [['areaRadius',[2,5,10,20]],['mapZoom',[1,1.5,2,3]]]) {
      if(allowed.includes(Number(saved[key])))state[key]=Number(saved[key]);
      if(query.has(key)&&allowed.includes(Number(query.get(key))))state[key]=Number(query.get(key));
    }
    if(['auto','points'].includes(saved.npcGrouping))state.npcGrouping=saved.npcGrouping;
    if(['auto','points'].includes(query.get('npcGrouping')))state.npcGrouping=query.get('npcGrouping');
    if(['areaX','areaY'].every(key=>query.has(key)&&query.get(key).trim()!==''&&Number.isFinite(Number(query.get(key)))&&Number(query.get(key))>=0&&Number(query.get(key))<=100)) {
      state.areaX=Number(query.get('areaX'));state.areaY=Number(query.get('areaY'));
    }
    return state;
  }
  function toUrl(href,state) {
    const url=new URL(href);
    for(const key of Object.keys(DEFAULTS))url.searchParams.set(key,FLAGS.includes(key)?(state[key]?'1':'0'):String(state[key]));
    for(const key of ['areaX','areaY']) {
      if(typeof state[key]==='number'&&Number.isFinite(state[key])&&state[key]>=0&&state[key]<=100)url.searchParams.set(key,String(state[key]));
      else url.searchParams.delete(key);
    }
    return url.href;
  }
  const api={KEY,DEFAULTS,FLAGS,LEGEND,color,heatGradient,readSaved,writeSaved,resolve,toUrl};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.WowSettings=api;
})();
