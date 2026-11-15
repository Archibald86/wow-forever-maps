const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {normalizeLevel,validateData}=require('../app-core.js');
for(const [value,expected]of [[42.5,43],[42.4,42],[0,1],[-20,1],[999,60],['',42],[' ',42],['wrong',42],[Infinity,42],[null,42]]) {
  assert.equal(normalizeLevel(value),expected,String(value));
}
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data.json'),'utf8'));
assert.equal(validateData(data),data);
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data.js'),'utf8'),context);
assert.deepEqual(JSON.parse(JSON.stringify(context.window.WOW_DATA)),data);
for(const mutate of [
  d=>d.mob_origins.ashenvale_c60.pop(), d=>d.mob_origins.ashenvale_c60[0]='verified_live',
  d=>delete d.maps, d=>d.maps.push(d.maps[0]),d=>delete d.herbs,
  d=>delete d.mobs.darkspearisland,d=>d.ore.ashenvale_c60[0][1]=101,
  d=>d.herbs.ashenvale_c60[0][0]='10',d=>d.maps[0].herb_count++,
  d=>d.coverage.ashenvale_c60.herbs.status='missing',d=>d.schema_version=1
]) { const copy=structuredClone(data);mutate(copy);assert.throws(()=>validateData(copy)); }
console.log('PASS: level normalization, JSON/JS parity, and invalid-data rejection');
