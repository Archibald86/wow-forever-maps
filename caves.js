/* Rings mark cave glyphs on the terrain artwork; they do not infer live entrances. */
(() => {
 function validate(data) {
  if(!data||data.schema_version!==1||!data.maps)throw new Error('Invalid cave annotations');
  for(const entry of Object.values(data.maps)) {
   if(!entry.reviewed||!Number.isInteger(entry.width)||!Number.isInteger(entry.height)||entry.width<=0||entry.height<=0||!Array.isArray(entry.icons)||!/^[a-f0-9]{64}$/.test(entry.image_sha256))throw new Error('Invalid cave map');
   const seen=new Set();
   for(const point of entry.icons) {
    if(![point.x,point.y,point.r].every(Number.isInteger)||point.x<0||point.x>=entry.width||point.y<0||point.y>=entry.height||point.r<1||point.r>30)throw new Error('Invalid cave glyph');
    const key=`${point.x}:${point.y}`;if(seen.has(key))throw new Error('Duplicate cave glyph');seen.add(key);
   }
  }
  return data;
 }
 function draw(canvas,entry,enabled) {
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!enabled)return;
  const scale=canvas.width/Math.max(canvas.clientWidth,1);
  for(const point of entry.icons) {
   ctx.beginPath();ctx.arc(point.x,point.y,Math.max(point.r,6*scale),0,Math.PI*2);
   ctx.strokeStyle='#fff3e2';ctx.lineWidth=4*scale;ctx.stroke();ctx.strokeStyle='#ff2020';ctx.lineWidth=2*scale;ctx.stroke();
  }
 }
 const api={validate,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowCaves=api;
})();
