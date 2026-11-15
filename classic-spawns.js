/* One marker per possible spawn GUID. Bounds are not a live-population estimate. */
(() => {
  function validate(data) {
    if(!data||data.schema_version!==1||data.source?.forever_verified!==false||!data.maps||!data.npcs)throw Error('Invalid Classic spawn source');
    for(const map of Object.values(data.maps)) {
      const seen=new Set();
      if(!Array.isArray(map.points)||!map.constraints||!Number.isFinite(map.min_level)||map.max_level<=map.min_level)throw Error('Invalid Classic map');
      for(const p of map.points) {
        if(!Array.isArray(p)||p.length!==8||!Number.isInteger(p[0])||seen.has(p[0])||![p[1],p[2]].every(v=>Number.isFinite(v)&&v>=0&&v<=100)||!Array.isArray(p[3])||!p[3].length||!p[3].every(id=>data.npcs[id])||!Array.isArray(p[7])||p[7].length>1)throw Error('Invalid spawn');
        seen.add(p[0]);
        for(const key of p[7])if(!map.constraints[key]?.members.includes(p[0]))throw Error('Invalid spawn constraint');
      }
      for(const c of Object.values(map.constraints))if(!Number.isInteger(c.limit)||c.limit<1||!Array.isArray(c.members))throw Error('Invalid cap');
    }
    return data;
  }
  function candidates(point,data,options) {
    return point[3].map(id=>data.npcs[id]).filter(meta=>{
      if(options.npcType&&options.npcType!=='all'&&meta.creature.type!==options.npcType)return false;
      const q=(options.npcQuery||'').trim().toLocaleLowerCase('ru');
      if(q&&(/^\d+$/.test(q)?meta.id!==Number(q):!`${meta.id} ${meta.name} ${meta.name_en}`.toLocaleLowerCase('ru').includes(q)))return false;
      if(options.npcRole==='vendors'||options.npcRole==='trainers')return false;
      if(options.npcRole==='quests'&&!meta.quest_starts.length&&!meta.quest_ends.length)return false;
      return !options.only||(meta.min_level<=options.level&&meta.max_level>=options.level-2);
    });
  }
  function filter(map,data,options={}) {return map.points.filter(p=>candidates(p,data,options).length);}
  function range(point,data,options={}) {
    const npcs=candidates(point,data,options);
    return [Math.min(...npcs.map(n=>n.min_level)),Math.max(...npcs.map(n=>n.max_level))];
  }
  function upperBound(points,map) {
    // Builder and validator require disjoint capped memberships. With a selected
    // subset, a group cap is still an upper bound, never an expected occupancy.
    let total=0;const counts=new Map();
    for(const p of points) {
      if(!p[7].length)total++;
      else counts.set(p[7][0],(counts.get(p[7][0])||0)+1);
    }
    for(const [key,count] of counts)total+=Math.min(count,map.constraints[key].limit);
    return total;
  }
  function summarize(map,data,center,radius,aspect,options={}) {
    const within=map.points.filter(p=>Math.hypot(p[1]-center.x,(p[2]-center.y)*aspect)<=radius+1e-10);
    const points=filter({...map,points:within},data,options),byId=new Map();
    for(const p of points)for(const meta of candidates(p,data,options)) {
      const row=byId.get(meta.id)||{npc:meta,count:0};row.count++;byId.set(meta.id,row);
    }
    return {total:within.length,count:points.length,upper:upperBound(points,map),rows:[...byId.values()].sort((a,b)=>b.count-a.count||a.npc.id-b.npc.id)};
  }
  function color(level,map,palette) {return palette(-5+10*(level-map.min_level)/(map.max_level-map.min_level));}
  const api={validate,candidates,filter,range,upperBound,summarize,color};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowClassicSpawns=api;
})();
