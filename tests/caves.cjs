const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const api=require('../caves.js'),settings=require('../settings.js'),{normalizeLevel}=require('../app-core.js'),root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'cave-icons.json'))),maps=JSON.parse(fs.readFileSync(path.join(root,'data.json'))).maps;
assert.equal(api.validate(data),data);assert.deepEqual(Object.keys(data.maps).sort(),maps.map(m=>m.id).sort());
assert.equal(Object.values(data.maps).reduce((n,m)=>n+m.icons.length,0),156);
assert.equal(Object.values(data.maps).filter(m=>m.icons.length).length,40);
for(const map of maps)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'maps',map.id+'.jpg'))).digest('hex'),data.maps[map.id].image_sha256,map.id+' annotation artwork changed');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'cave-icons.js'),'utf8'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window.WOW_CAVE_ICONS)),data);
const fixture={maps:[{id:'swampofsorrows_c60'}]},resolve=(q,saved={})=>settings.resolve(fixture,new URLSearchParams(q),saved,normalizeLevel);
assert.equal(resolve('').caves,true);assert.equal(resolve('caves=0').caves,false);assert.equal(resolve('caves=1',{caves:false}).caves,true);
for(const mutate of [d=>d.schema_version=0,d=>d.maps.elwynn_c60.icons[0].x=2000,d=>d.maps.elwynn_c60.reviewed=false,d=>d.maps.elwynn_c60.icons.push(d.maps.elwynn_c60.icons[0])]){const d=structuredClone(data);mutate(d);assert.throws(()=>api.validate(d));}
console.log('PASS cave annotations: 42 audited maps, 156 glyphs, exact artwork hashes, JS/JSON parity, bounds, duplicates and saved toggle');
