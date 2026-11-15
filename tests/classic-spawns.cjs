const assert=require('node:assert/strict'),api=require('../classic-spawns.js'),data=api.validate(require('../classic-spawn-data.json')),map=data.maps.elwynn_c60;
assert.equal(map.points.length,1161);assert.equal(new Set(map.points.map(p=>p[0])).size,1161);
const hogger=api.filter(map,data,{npcQuery:'448'});assert.equal(hogger.length,6);assert.equal(api.upperBound(hogger,map),1);
const murlocs=api.filter(map,data,{npcQuery:'46'});assert.equal(murlocs.length,103);assert(murlocs.every(p=>p[3].includes(732)));
assert(api.upperBound(map.points,map)<map.points.length);assert(!data.npcs['271929']);
const bandits=api.filter(map,data,{npcQuery:'116'});assert.equal(bandits.length,57);assert(bandits.some(p=>p[1]===29.19&&p[2]===58.33));
assert.equal(api.filter(map,data,{level:60,only:true}).length,0);assert.equal(api.filter(map,data,{level:1,only:false}).length,1161);
assert.equal(api.filter(map,data,{level:60,only:false}).length,1161);
assert.equal(api.filter(map,data,{npcRole:'vendors'}).length,0);
const center={x:26,y:90};const s=api.summarize(map,data,center,20,668/1024,{npcQuery:'448'});assert.equal(s.count,6);assert.equal(s.upper,1);
const broken=structuredClone(data);broken.maps.elwynn_c60.points.push(broken.maps.elwynn_c60.points[0]);assert.throws(()=>api.validate(broken));
console.log('PASS Classic spawns: unique GUIDs, Hogger cap, alternative species, uncovered bandits, level filters and area bounds');

const palette=require('../settings.js').color;assert.equal(api.color(1,6,palette),'#22c55e');assert.equal(api.color(1,7,palette),'#9ca3af');assert.equal(api.color(6,6,palette),'#facc15');assert.equal(api.color(11,6,palette),'#ef4444');

assert.equal(Object.keys(data.maps).length,40);assert(!data.maps.zephrasisle);assert(!data.maps.darkspearisland);
const point=(id,keys)=>[id,0,0,[6],0,0,0,keys];
const crossed={constraints:{a:{limit:1},b:{limit:1}}};assert.equal(api.upperBound([point(1,['a']),point(2,['a','b']),point(3,['b'])],crossed),2);
const nested={constraints:{parent:{limit:2},child:{limit:1}}};assert.equal(api.upperBound([point(1,['parent','child']),point(2,['parent','child']),point(3,['parent']),point(4,['parent'])],nested),2);
for(const [id,m] of Object.entries(data.maps)){assert(m.points.length>0,id);assert(api.upperBound(m.points,m)<=m.points.length,id)}
console.log('PASS all 40 Classic maps and conservative nested/crossed group caps');

assert(data.npcs['3129'],'Kul Tiras Marines are Classic kill targets despite one-faction hostility');assert(data.npcs['2266'],'Hillsbrad Farmers are Classic kill targets');assert(!data.npcs['6172'],'Resurrection targets must not become combat mobs');
