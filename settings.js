/* Preference validation and level palette shared by rendering and the legend. */
(() => {
  const KEY='wow-forever-settings-v1';
  const DEFAULTS={zone:'swampofsorrows_c60',level:42,mobs:true,density:true,ores:true,herbs:false,only:false,mode:'cells'};
  const FLAGS=['mobs','density','ores','herbs','only'];
  const PALETTE={'-4':'#00c853','-3':'#58d96d','-2':'#a5e88d','-1':'#d9ef9a','0':'#fff5a5','1':'#ffeb00','2':'#ffbc00','3':'#ff8900','4':'#ff5600'};
  const LEGEND=[[-8,'≤−8'],[-6,'−7…−5'],[-4,'−4'],[-3,'−3'],[-2,'−2'],[-1,'−1'],[0,'0'],[1,'+1'],[2,'+2'],[3,'+3'],[4,'+4'],[5,'≥+5']];
  const color=delta=>delta<=-8?'#9ca3af':delta<=-5?'#28975b':delta>=5?'#e82127':PALETTE[delta];
  function readSaved(storage) {
    try {
      const value=JSON.parse((storage||localStorage).getItem(KEY));
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    } catch (_) { return {}; }
  }
  function writeSaved(value,storage) {
    try { (storage||localStorage).setItem(KEY,JSON.stringify(value));return true; }
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
    return state;
  }
  function toUrl(href,state) {
    const url=new URL(href);
    for(const key of Object.keys(DEFAULTS))url.searchParams.set(key,FLAGS.includes(key)?(state[key]?'1':'0'):String(state[key]));
    return url.href;
  }
  const api={KEY,DEFAULTS,FLAGS,LEGEND,color,readSaved,writeSaved,resolve,toUrl};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.WowSettings=api;
})();
