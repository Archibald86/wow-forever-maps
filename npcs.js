/* Optional Questie NPC layer. Loading errors never disable the existing atlas. */
(() => {
  const creatureTypes=typeof module!=='undefined'&&module.exports?require('./creature-types.js'):window.WowCreatureTypes;
  function validate(data) {
    if(!data||data.schema_version!==2||!data.maps||!data.npcs||!/^\w{40}$/.test(data.commit)||!data.creature_types||data.creature_types.forever_verified!==false)throw new Error('Invalid NPC data');
    for(const npc of Object.values(data.npcs))creatureTypes.validate(npc.creature);
    for(const points of Object.values(data.maps)) {
      if(!Array.isArray(points))throw new Error('Missing NPC positions');
      for(const p of points)if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||p[0]<0||p[0]>100||p[1]<0||p[1]>100||!data.npcs[p[2]])throw new Error('Invalid NPC position');
    }
    return data;
  }
  let pending;
  function load() {
    if(window.WOW_NPCS)return Promise.resolve(validate(window.WOW_NPCS));
    if(pending)return pending;
    pending=(async()=>{
      if(location.protocol==='file:')return new Promise((resolve,reject)=>{
        const s=document.createElement('script'),timer=setTimeout(()=>finish(new Error('Timeout')),20000);
        function finish(error){clearTimeout(timer);s.remove();if(error)reject(error);else try{resolve(validate(window.WOW_NPCS));}catch(e){reject(e);}}
        s.src='npc-atlas.js?v=types1';s.onload=()=>finish();s.onerror=()=>finish(new Error('Load failed'));document.head.append(s);
      });
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try {
        const response=await fetch('npc-atlas.json?v=types1',{signal:controller.signal});
        if(!response.ok)throw new Error('Load failed');
        window.WOW_NPCS=validate(await response.json());return window.WOW_NPCS;
      }finally{clearTimeout(timer);}
    })().finally(()=>pending=undefined);
    return pending;
  }
  function matches(meta,options) {
    if(options.hideServices&&(meta.flags&(16|128|4096|8192|65536|131072|1048576|2097152|4194304)))return false;
    if(!creatureTypes.matches(meta.creature,options.npcType))return false;
    const query=(options.npcQuery||'').trim().toLocaleLowerCase('ru');
    if(/^\d+$/.test(query)&&meta.id!==Number(query))return false;
    if(query&&!/^\d+$/.test(query)&&!`${meta.id} ${meta.name} ${meta.name_en} ${meta.title||''}`.toLocaleLowerCase('ru').includes(query))return false;
    const role=options.npcRole;
    if(role==='quests'&&!meta.quest_starts.length&&!meta.quest_ends.length)return false;
    if(role==='vendors'&&!(meta.flags&128))return false;
    if(role==='trainers'&&!(meta.flags&16))return false;
    if(options.only&&!(Number.isFinite(meta.min_level)&&Number.isFinite(meta.max_level)&&meta.min_level<=options.level&&meta.max_level>=options.level-2))return false;
    return true;
  }
  const api={validate,load,matches};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowNpcs=api;
})();
