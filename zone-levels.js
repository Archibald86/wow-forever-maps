/* Suggested Classic zone bands; not entry restrictions or mob min/max levels.
 * Community reference: https://eu.forums.blizzard.com/en/wow/t/wow-classic-zones-by-level/117607
 * Forever-only zones have no verified recommendation in this reference.
 */
(() => {
  const ranges={
    ashenvale:[18,30],azshara:[45,55],barrens:[10,25],blastedlands:[45,55],
    burningsteppes:[50,58],darkshore:[10,20],deadwindpass:[55,60],desolace:[30,40],
    dunmorogh:[1,10],durotar:[1,10],duskwood:[18,30],dustwallowmarsh:[35,45],
    easternplaguelands:[53,60],elwynn:[1,10],felwood:[48,55],feralas:[40,50],
    hillsbrad:[20,30],hinterlands:[40,50],lochmodan:[10,20],moonglade:[55,60],
    searinggorge:[45,50],silithus:[55,60],silverpine:[10,20],stonetalonmountain:[15,27],
    stranglethorn:[30,45],swampofsorrows:[35,45],tanaris:[40,50],teldrassil:[1,10],
    thousandneedles:[25,35],tirisfal:[1,10],ungorocrater:[48,55],westernplaguelands:[51,58],
    westfall:[10,20],wetlands:[20,30],winterspring:[53,60],alteracmountains:[30,40],
    badlands:[35,45],redridgemountains:[15,27],mulgore:[1,10],arathihighlands:[30,40]
  };
  function range(id) {return id.endsWith('_c60')?ranges[id.slice(0,-4)]:undefined;}
  function label(map) {
    const levels=range(map.id);
    return `${map.name} (${levels?levels.join('–'):'уровни уточняются'})`;
  }
  const api={range,label};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowZoneLevels=api;
})();
