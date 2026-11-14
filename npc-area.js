/* Spatial summaries count source coordinate tuples, never simultaneous creatures. */
(() => {
 const npcApi=typeof module!=='undefined'&&module.exports?require('./npcs.js'):window.WowNpcs;
 const RADII=[2,5,10,20],ZOOMS=[1,1.5,2,3];
 function unique(points) {
  const seen=new Set();return points.filter(p=>{const key=`${p[2]}:${p[0]}:${p[1]}`;if(seen.has(key))return false;seen.add(key);return true;});
 }
 function inCircle(point,center,radius,aspect=1) {
  const dx=point[0]-center.x,dy=(point[1]-center.y)*aspect;
  return dx*dx+dy*dy<=radius*radius+1e-10;
 }
 function summarize(points,npcs,center,radius,aspect,options={}) {
  const within=unique(points).filter(p=>inCircle(p,center,radius,aspect));
  const matched=within.filter(p=>npcApi.matches(npcs[p[2]],options)),byId=new Map();
  for(const p of matched){let row=byId.get(p[2]);if(!row){row={npc:npcs[p[2]],count:0};byId.set(p[2],row);}row.count++;}
  return {total:within.length,count:matched.length,entities:byId.size,
   rows:[...byId.values()].sort((a,b)=>b.count-a.count||a.npc.name.localeCompare(b.npc.name,'ru')||a.npc.id-b.npc.id)};
 }
 function clusters(points,width,height,cellSize=44) {
  const columns=Math.max(1,Math.floor(width/cellSize)),rows=Math.max(1,Math.floor(height/cellSize)),bins=new Map();
  for(const p of unique(points)) {
   const column=Math.min(columns-1,Math.floor(p[0]*columns/100)),row=Math.min(rows-1,Math.floor(p[1]*rows/100)),key=`${column}:${row}`;
   let bin=bins.get(key);if(!bin){bin={x:(column+.5)*100/columns,y:(row+.5)*100/rows,count:0,points:[]};bins.set(key,bin);}
   bin.count++;bin.points.push(p);
  }
  return [...bins.values()].map(bin=>bin.count===1?{...bin,x:bin.points[0][0],y:bin.points[0][1]}:bin);
 }
 const api={RADII,ZOOMS,unique,inCircle,summarize,clusters};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowNpcArea=api;
})();
