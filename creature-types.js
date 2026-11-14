/* Creature type is independent of family, rank and service role. */
(() => {
 const TYPES={Humanoid:'Гуманоид',Beast:'Зверь',Undead:'Нежить',Demon:'Демон',Elemental:'Элементаль',Dragonkin:'Дракон',Giant:'Великан',Mechanical:'Механизм',Critter:'Мелкое животное'};
 const SOURCE_URL='https://www.wowforeverfriends.org/library/sources/';
 const validFilter=value=>value==='all'||value==='unknown'||Object.hasOwn(TYPES,value);
 function matches(creature,value='all') {
  return value==='all'||(value==='unknown'?creature?.type==null:creature?.type===value);
 }
 function validate(creature) {
  if(!creature||!['classic_reference','unknown'].includes(creature.status)||
    !(creature.type===null||Object.hasOwn(TYPES,creature.type))||
    (creature.type===null)!==(creature.status==='unknown')||
    ![null,'classic_reference'].includes(creature.source)||
    (creature.type!==null&&creature.source!=='classic_reference')||
    !(creature.family===null||typeof creature.family==='string')||typeof creature.name_changed!=='boolean')throw new Error('Invalid creature type');
  return creature;
 }
 function label(creature) {return creature?.type?TYPES[creature.type]||'Неизвестно':'Неизвестно';}
 function description(creature) {
  if(!creature?.type)return creature?.source==='classic_reference'?'Тип: неизвестно — в справочнике Classic тип не определён.':'Тип: неизвестно — записи в источнике нет.';
  return `Тип: ${label(creature)} · предварительно, Classic. В Forever не подтверждено.`+
   (creature.family?` Семейство (Classic): ${creature.family}.`:'')+
   (creature.name_changed?` Имя отличается от источника (${creature.source_name}); требуется сверка.`:'');
 }
 function populate(select) {
  select.replaceChildren();
  for(const [value,text] of [['all','Все типы'],...Object.entries(TYPES),['unknown','Неизвестно']]) {
   const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
  }
 }
 const api={TYPES,SOURCE_URL,validFilter,matches,validate,label,description,populate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowCreatureTypes=api;
})();
