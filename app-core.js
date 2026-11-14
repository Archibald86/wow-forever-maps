/* Shared data loading and integer-level rules for both pages. */
(() => {
  function normalizeLevel(value) {
    const number = String(value ?? '').trim() === '' ? NaN : Number(value);
    return Number.isFinite(number) ? Math.min(60, Math.max(1, Math.round(number))) : 42;
  }

  function validateData(data) {
    if (!data || data.schema_version !== 2 || !Array.isArray(data.maps) || !data.maps.length) {
      throw new Error('Unsupported atlas data');
    }
    const ids = new Set();
    for (const map of data.maps) {
      if (!map || !/^[a-z0-9_]+$/.test(map.id) || ids.has(map.id) ||
          typeof map.name !== 'string' || !map.name.trim()) throw new Error('Invalid map');
      ids.add(map.id);
      for (const [layer, size] of [['mobs',4],['ore',3],['herbs',3]]) {
        const rows = data[layer]?.[map.id];
        if (!Array.isArray(rows)) throw new Error('Missing layer '+layer);
        for (const row of rows) {
          if (!Array.isArray(row) || row.length !== size ||
              row.some(value => typeof value !== 'number' || !Number.isFinite(value)) ||
              row[0] < 0 || row[0] > 100 || row[1] < 0 || row[1] > 100 ||
              !Number.isInteger(row[2]) || row[2] < 1 ||
              (layer === 'mobs' && (!Number.isInteger(row[3]) || row[3] < 0))) {
            throw new Error('Invalid '+layer+' record');
          }
        }
        const info = data.coverage?.[map.id]?.[layer];
        const count = layer === 'mobs' ? info?.cells : info?.records;
        const allowed = layer === 'mobs' ? ['available','missing'] : ['imported','no_source_records'];
        if (!info || count !== rows.length || !allowed.includes(info.status) ||
            (rows.length === 0) !== (info.status === (layer === 'mobs' ? 'missing' : 'no_source_records'))) {
          throw new Error('Invalid coverage '+layer);
        }
      }
      if (map.ore_count !== data.ore[map.id].length || map.herb_count !== data.herbs[map.id].length) {
        throw new Error('Resource count mismatch');
      }
    }
    return data;
  }

  let pending;
  function loadData() {
    try { return Promise.resolve(validateData(window.WOW_DATA)); } catch (_) { /* load or retry */ }
    if (pending) return pending;
    if (location.protocol !== 'file:') {
      pending = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch('data.json?v=3.3', { signal:controller.signal, cache:'no-cache' });
          if (!response.ok) throw new Error('Data request failed');
          const data = validateData(await response.json());
          window.WOW_DATA = data;
          return data;
        } finally { clearTimeout(timeout); }
      })().finally(() => { pending = undefined; });
      return pending;
    }
    // Preserve direct file:// opening without depending on fetch permissions.
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let timer;
      function finish(error) {
        clearTimeout(timer);
        script.remove();
        if (error) reject(error);
        else {
          try { resolve(validateData(window.WOW_DATA)); } catch (error) { reject(error); }
        }
      }
      script.onload = () => finish();
      script.onerror = () => finish(new Error('Data request failed'));
      script.src = 'data.js?v=3.3';
      timer = setTimeout(() => finish(new Error('Data request timed out')), 15000);
      document.head.append(script);
    }).finally(() => { pending = undefined; });
    return pending;
  }

  const api = { normalizeLevel, validateData, loadData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.WowApp = api;
})();
