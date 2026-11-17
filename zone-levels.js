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
  // Classic world map IDs: 1 = Kalimdor, 0 = Eastern Kingdoms.
  // Keep the two separate Forever islands accessible without assigning a continent.
  const continents={
    'Калимдор':new Set(['ashenvale','azshara','barrens','darkshore','desolace','durotar','dustwallowmarsh','felwood','feralas','moonglade','silithus','stonetalonmountain','tanaris','teldrassil','thousandneedles','ungorocrater','winterspring','mulgore']),
    'Восточные королевства':new Set(['blastedlands','burningsteppes','deadwindpass','dunmorogh','duskwood','easternplaguelands','elwynn','hillsbrad','hinterlands','lochmodan','searinggorge','silverpine','stranglethorn','swampofsorrows','tirisfal','westernplaguelands','westfall','wetlands','alteracmountains','badlands','redridgemountains','arathihighlands'])
  };
  function compare(a,b) {
    const left=range(a.id),right=range(b.id);
    if(!left&&right)return 1;
    if(left&&!right)return -1;
    return (left&&right?(left[0]-right[0]||left[1]-right[1]):0)||a.name.localeCompare(b.name,'ru')||a.id.localeCompare(b.id);
  }
  function groups(maps) {
    const result=Object.keys(continents).map(name=>({name,maps:[]})),other={name:'Острова Forever',maps:[]};
    for(const map of maps) {
      const key=map.id.endsWith('_c60')?map.id.slice(0,-4):map.id;
      const group=result.find(group=>continents[group.name].has(key))||other;
      group.maps.push(map);
    }
    return [...result,other].filter(group=>group.maps.length).map(group=>({...group,maps:group.maps.sort(compare)}));
  }
  const api={range,label,compare,groups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowZoneLevels=api;
})();
