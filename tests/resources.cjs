const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../resources.js'),{validateData}=require('../app-core.js');
const fixture={maps:[{id:'a'},{id:'b'},{id:'c'}],mobs:{a:[[0,0,40,100]],b:[[0,0,40,10]],c:[]},
  ore:{a:[[2,2,201],[3,3,202]],b:[[5,5,201]],c:[[1,1,201],[2,2,201],[3,3,219]]},
  herbs:{a:[[4,4,401]],b:[[1,1,401],[2,2,401]],c:[[1,1,401],[2,2,401],[3,3,401],[4,4,401]]},
  catalog:{201:{kind:'ore',min_skill:1},202:{kind:'ore',min_skill:65},219:{kind:'ore',min_skill:null},401:{kind:'herbs',min_skill:1}},
  trainers:{a:[{profession:'ore',faction:'alliance'},{profession:'herbs',faction:'horde'},{profession:'ore',faction:'neutral'}]}};
assert.deepEqual(R.filterPoints(fixture,'ore','a',{skillFilter:true,miningSkill:64}).map(x=>x[2]),[201]);
assert.equal(R.filterPoints(fixture,'ore','a',{skillFilter:true,miningSkill:65}).length,2);
assert.equal(R.filterPoints(fixture,'ore','c',{skillFilter:true,miningSkill:0,unknownSkill:false}).length,0);
assert.deepEqual(R.filterPoints(fixture,'ore','c',{skillFilter:true,miningSkill:0,unknownSkill:true}).map(x=>x[2]),[219]);
assert.deepEqual(R.filterPoints(fixture,'ore','a',{resource:'202'}).map(x=>x[2]),[202]);
assert.deepEqual(R.rankZones(fixture,{level:42,focus:'mobs'}).map(x=>x.map.id),['a','b']);
assert.deepEqual(R.rankZones(fixture,{level:42,focus:'ore'}).map(x=>x.map.id),['c','a','b']);
assert.equal(R.rankZones(fixture,{level:42,focus:'herbs'})[0].missingMobs,true);
assert.equal(R.rankZones(fixture,{level:42,focus:'ore',skillFilter:true,miningSkill:0,unknownSkill:false}).length,0);
assert.equal(R.trainersForZone(fixture,'a',{faction:'alliance'}).length,2);
assert.equal(R.trainersForZone(fixture,'a',{resource:'201',faction:'horde'}).length,1);
assert.equal(R.normalizeSkill(-10),0);assert.equal(R.normalizeSkill(999),400);assert.equal(R.normalizeSkill(''),300);
const real=JSON.parse(fs.readFileSync(path.join(__dirname,'../data.json'),'utf8'));
const settings=require('../settings.js'),normalize=require('../app-core.js').normalizeLevel;
const preferences=settings.resolve(real,new URLSearchParams('resource=403&miningSkill=1&herbalismSkill=15&skillFilter=1&unknownSkill=0&trainers=1&faction=horde&focus=herbs'),{},normalize);
const link=settings.toUrl('https://example.com/atlas.html',preferences);
assert.deepEqual(settings.resolve(real,new URL(link).searchParams,{},normalize),preferences);
assert.equal(Object.keys(real.catalog).length,42);assert.equal(real.catalog[208].min_skill,230);assert.equal(real.catalog[214].min_skill,245);assert.equal(real.catalog[219].min_skill,null);assert.equal(real.catalog[431].min_skill,300);
assert.equal(Object.values(real.trainers).flat().length,35);
for(const mutate of [d=>d.catalog[201].min_skill=-1,d=>delete d.catalog[201],d=>delete d.trainers.elwynn_c60,d=>d.trainers.elwynn_c60[0].x=101]){
 const copy=structuredClone(real);mutate(copy);assert.throws(()=>validateData(copy));
}
console.log('PASS: skill boundaries, unknown requirements, named resources, ranking preferences, trainer factions, and invalid metadata');
