(() => {
  'use strict';

  if (globalThis.KRDeps) {
    if (typeof module !== 'undefined' && module?.exports) module.exports = globalThis.KRDeps;
    return;
  }

  const dependencies = new Map();

  function normalizeName(name) {
    const value = String(name || '').trim();
    if (!/^KR[A-Za-z0-9_]+$/.test(value)) throw new Error(`Invalid dependency name: ${value || '<empty>'}`);
    return value;
  }

  function register(name, value) {
    const key = normalizeName(name);
    if (value === undefined || value === null) throw new Error(`Cannot register empty dependency: ${key}`);
    if (dependencies.has(key)) {
      const existing = dependencies.get(key);
      if (existing !== value) throw new Error(`Duplicate dependency: ${key}`);
      return existing;
    }
    dependencies.set(key, value);
    return value;
  }

  function resolve(name) {
    const key = normalizeName(name);
    return dependencies.has(key) ? dependencies.get(key) : null;
  }

  function requireDependency(name) {
    const key = normalizeName(name);
    const value = resolve(key);
    if (value === null) throw new Error(`Missing dependency: ${key}. Check script/import order.`);
    return value;
  }

  function optional(name) {
    return resolve(name);
  }

  function has(name) {
    return resolve(name) !== null;
  }

  function names() {
    return [...dependencies.keys()].sort();
  }

  const api = Object.freeze({ register, require: requireDependency, optional, has, names });
  globalThis.KRDeps = api;
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
