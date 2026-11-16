/* Counts describe source records, not the character's active quest log. */
(() => {
  function quests(ids, data) {
    const kill=new Set(),loot=new Set();
    for(const id of ids) {
      const row=data?.npcs?.[id];
      for(const q of row?.[0]||[])kill.add(q);
      for(const q of row?.[1]||[])loot.add(q);
    }
    for(const q of kill)loot.delete(q);
    return {kill:[...kill].sort((a,b)=>a-b),loot:[...loot].sort((a,b)=>a-b)};
  }
  function summary(ids, data) {
    if(!data)return 'Квесты: данные недоступны';
    const q=quests(ids,data);
    return `Квесты: ${q.kill.length+q.loot.length} · на убийство: ${q.kill.length} · на добычу: ${q.loot.length}`;
  }
  function details(ids, data) {
    if(!data)return summary(ids,data);
    const q=quests(ids,data);
    return summary(ids,data)+`\nНа убийство (Classic), ID: ${q.kill.join(', ')||'не найдено'}.`+
      `\nНа добычу предметов (Questie Forever), ID: ${q.loot.join(', ')||'не найдено'}.`+
      '\nСправочные связи: фракция, класс, цепочки и журнал квестов персонажа не проверены. Ноль означает отсутствие записей в источниках. Добыча может иметь другие источники.';
  }
  const api={quests,summary,details};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.WowMobQuests=api;
})();
