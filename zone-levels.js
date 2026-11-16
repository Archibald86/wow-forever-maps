/* Zone bands from Leatrix Maps 1.60.31, Interface 16001 (Forever).
 * Source: Leatrix_Maps/Leatrix_Maps.lua, ShowZoneLevels mapTable.
 * See ZONE_LEVELS.md for archive provenance. Not entry restrictions or mob levels.
 */
(() => {
  const ranges={
    ashenvale:[18,30],azshara:[45,55],barrens:[10,25],blastedlands:[45,55],
    burningsteppes:[50,58],darkshore:[10,20],deadwindpass:[55,60],desolace:[30,40],
    dunmorogh:[1,10],durotar:[1,10],duskwood:[18,30],dustwallowmarsh:[35,45],
    easternplaguelands:[53,60],elwynn:[1,10],felwood:[48,55],feralas:[40,50],
    hillsbrad:[20,30],hinterlands:[40,50],lochmodan:[10,20],
    searinggorge:[43,50],silithus:[55,60],silverpine:[10,20],stonetalonmountain:[15,27],
    stranglethorn:[30,45],swampofsorrows:[35,45],tanaris:[40,50],teldrassil:[1,10],
    thousandneedles:[25,35],tirisfal:[1,10],ungorocrater:[48,55],westernplaguelands:[51,58],
    westfall:[10,20],wetlands:[20,30],winterspring:[55,60],alteracmountains:[30,40],
    badlands:[35,45],redridgemountains:[15,25],mulgore:[1,10],arathihighlands:[30,40],
    zephrasisle:[1,12]
  };
  function range(id) {return ranges[id.endsWith('_c60')?id.slice(0,-4):id];}
  function label(map) {
    const levels=range(map.id);
    return `${map.name} (${levels?levels.join('–'):'уровни уточняются'})`;
  }
  const api={range,label};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowZoneLevels=api;
})();
