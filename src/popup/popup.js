const popupVersion = document.querySelector('#popupVersion');
const openAppButton = document.querySelector('#openAppButton');
const launcherStatus = document.querySelector('#launcherStatus');

if (popupVersion) { const manifest = chrome.runtime.getManifest(); popupVersion.textContent = `v${manifest.version_name || manifest.version}`; }

function runtimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (!response?.ok) return reject(new Error(response?.error || 'Unbekannter Fehler'));
      resolve(response.result);
    });
  });
}

openAppButton.addEventListener('click', async () => {
  openAppButton.disabled = true;
  launcherStatus.textContent = 'Manager wird geöffnet …';
  try {
    await runtimeMessage({ type: 'OPEN_APP_WINDOW' });
    launcherStatus.textContent = 'Manager geöffnet.';
    window.close();
  } catch (error) {
    launcherStatus.textContent = `Manager konnte nicht geöffnet werden: ${error.message}`;
    openAppButton.disabled = false;
  }
});
