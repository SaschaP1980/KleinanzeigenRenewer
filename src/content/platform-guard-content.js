(() => {
  if (globalThis.__KR_PLATFORM_GUARD_CONTENT__) return;
  globalThis.__KR_PLATFORM_GUARD_CONTENT__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before platform-guard-content.js');
  const PlatformHardening = KRDeps.require('KRPlatformHardening');
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const headings = [...document.querySelectorAll('h1,h2,[role="heading"]')]
    .map(element => normalize(element.textContent || ''))
    .filter(Boolean)
    .slice(0, 12);
  const restriction = PlatformHardening?.detectAccessRestriction?.({
    url: location.href,
    title: document.title || '',
    headings
  }) || null;
  if (!restriction?.restricted) return;
  globalThis.__KR_PLATFORM_ACCESS_RESTRICTED__ = true;
  globalThis.__KR_PLATFORM_SAFETY_STOP__ = true;
  try {
    chrome.runtime.sendMessage({ type: 'PLATFORM_ACCESS_RESTRICTED', evidence: restriction }, () => void chrome.runtime.lastError);
  } catch { /* Early safety detection must not break page execution. */ }
})();
