import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const requiredFiles = ["src/background/services/diagnostic-export-service.js", "src/shared/runtime-deps.js", "src/background/repositories/profile-repository.js", "src/background/repositories/inventory-repository.js", "src/background/repositories/inventory-image-store.js", "src/background/services/trash-service.js", "src/background/lib/bulk-run-guard.js", "src/background/services/tab-load-coordinator.js", "src/background/services/tab-registry.js", "src/shared/managed-navigation.js", "src/content/form-extractor.js", "src/content/image-extractor.js", "src/content/template-category-flow.js", "src/content/template-form-fields.js", "src/content/template-image-upload.js", "src/content/template-verification.js", "src/content/template-publish-flow.js", "src/content/template-filler.js", "src/background/background.js", "src/content/content.js", "popup.html", "popup.css", "src/popup/popup.js", "app.html", "app.css", "src/app/diagnostic-zip.js", "src/app/inventory-view.js", "src/app/inventory-export.js", "src/app/inventory-import.js", "src/app/account-gate.js", "src/app/app-activity-center.js", "src/app/actions-diagnostics-controller.js", "src/app/control-accordion-controller.js", "src/app/diagnostics-controls-controller.js", "src/app/renewal-settings-controller.js", "src/app/app-layout-controller.js", "src/app/tab-page-inspection-controller.js", "src/app/shared-ui-helpers.js", "src/app/renewal-dialog-controller.js", "src/app/inventory-capture-controller.js", "src/background/repositories/renewal-state-repository.js", "src/background/services/template-fill-service.js", "src/background/services/archive-insertion-service.js", "src/background/services/remote-delete-replacement-service.js", "src/app/app.js", "src/content/inventory-runner.js", "src/shared/my-ads-readiness.js", "README.md", "APP_ID.txt", "icons/taskbar-16.png", "icons/taskbar-32.png", "icons/taskbar-48.png", "icons/app-icon-128.png", "icons/favicon.ico"];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Fehlende Datei: ${file}`);
}

assert.equal(manifest.manifest_version, 3);
assert.ok(["1.17.4","1.17.5","1.17.6","1.17.7","1.17.8","1.17.9","1.17.10","1.18.0","1.18.1","1.18.2","1.18.3","1.18.4","1.19.0","1.19.1","1.19.2","1.19.3","1.19.4","1.19.5","1.19.6","1.19.7","1.19.8","1.20.0","1.20.1",'1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
assert.ok(manifest.key, "Fester Manifest-Schlüssel fehlt");
assert.deepEqual(manifest.permissions.sort(), ["activeTab", "storage", "unlimitedStorage", "scripting"].sort());
assert.ok(manifest.host_permissions.includes("https://www.kleinanzeigen.de/*"));
assert.ok(manifest.host_permissions.includes("https://img.kleinanzeigen.de/*"));

const publicKey = Buffer.from(manifest.key, "base64");
const digest = crypto.createHash("sha256").update(publicKey).digest("hex");
const extensionId = digest.slice(0, 32).split("").map(char => String.fromCharCode(97 + Number.parseInt(char, 16))).join("");
assert.equal(digest, "70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3");
assert.equal(extensionId, "hafahjhhgiipdegfkgacchmnacgblnah");

const background = ["src/background/repositories/profile-repository.js", "src/background/repositories/inventory-repository.js", "src/background/repositories/inventory-image-store.js", "src/background/services/trash-service.js", "src/background/background.js"].map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const content = fs.readFileSync(path.join(root, "src/content/content.js"), "utf8");
assert.match(background, /indexedDB\.open/);
assert.match(background, /image\/jpeg/);
assert.match(background, /SHA-256/);
assert.match(background, /INVENTORY_SAVED/);
assert.match(content, /Anzeige bearbeiten/i);
assert.match(content, /application\/ld\+json/);
assert.doesNotMatch(background + content, /password\s*[:=]/i);

console.log(JSON.stringify({
  status: "PASS",
  version: manifest.version,
  extensionId,
  manifestKeySha256: digest,
  checkedFiles: requiredFiles.length + 1
}, null, 2));
