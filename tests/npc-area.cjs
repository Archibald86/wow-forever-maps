const assert=require('node:assert/strict'),api=require('../npc-area.js'),settings=require('../settings.js'),{normalizeLevel}=require('../app-core.js');
const npc=(id,flags=0)=>({id,name:'NPC '+id,name_en:'NPC '+id,flags,min_level:5,max_level:7,quest_starts:[],quest_ends:[],creature:{type:'Humanoid'}});
const npcs={1:npc(1),2:npc(2,128),3:npc(3,2)};
const points=[[50,50,1],[50,50,1],[55,50,1],[50,52.5,2],[50,53,1],[50,50,3]];
const summary=api.summarize(points,npcs,{x:50,y:50},5,2);
assert.equal(summary.total,4);assert.equal(summary.count,4);assert.equal(summary.entities,3);assert.equal(summary.rows[0].count,2);
const hidden=api.summarize(points,npcs,{x:50,y:50},5,2,{hideServices:true});assert.equal(hidden.count,3);assert(hidden.rows.some(row=>row.npc.id===3));
assert.equal(api.summarize(points,npcs,{x:50,y:50},5,2,{npcQuery:'1'}).count,2);
assert.equal(api.summarize(points,npcs,{x:50,y:50},5,2,{npcType:'Beast'}).count,0);
assert.equal(api.summarize(points,npcs,{x:50,y:50},5,2,{only:true,level:10}).count,0);
assert(api.inCircle([0,0,1],{x:0,y:0},5,2));assert(!api.inCircle([0,3,1],{x:0,y:0},5,2));
const cloud=[[10,10,1],[10,10,1],[10.5,10.5,1],[10,10,2],[90,90,3]];
for(const width of [320,1000,2000]) {
 const groups=api.clusters(cloud,width,width/2);assert.equal(groups.reduce((sum,g)=>sum+g.count,0),4);
 assert.deepEqual(groups.flatMap(g=>g.points).sort(),api.unique(cloud).sort());
}
const data={maps:[{id:'swampofsorrows_c60'},{id:'elwynn_c60'}]},resolve=(q,saved={})=>settings.resolve(data,new URLSearchParams(q),saved,normalizeLevel);
const chosen=resolve('zone=elwynn_c60&areaX=0&areaY=100&areaRadius=10&mapZoom=2&hideServices=1&npcGrouping=points');
assert.equal(chosen.areaX,0);assert.equal(chosen.areaY,100);assert.equal(chosen.hideServices,true);
assert.deepEqual(resolve(new URL(settings.toUrl('https://test/atlas.html',chosen)).search),chosen);
assert.equal(resolve('',chosen).areaX,undefined); // center is URL-only, never stale saved coordinates
for(const q of ['areaX=50','areaX=&areaY=50','areaX=NaN&areaY=50','areaX=101&areaY=20'])assert.equal(resolve(q).areaX,undefined);
assert.equal(resolve('areaRadius=999&mapZoom=-3&npcGrouping=invalid').areaRadius,5);
assert.equal(resolve('areaRadius=999&mapZoom=-3&npcGrouping=invalid').mapZoom,1);
console.log('PASS NPC area: non-square geometry, boundaries, exact tuple dedupe, distinct IDs, service/level/type filters, cluster totals and scoped URL state');
