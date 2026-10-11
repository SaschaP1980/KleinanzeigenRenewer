const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

assert.match(html, /id="appNoticeTime"/);
assert.match(html, /id="appNoticeDismiss"[^>]*aria-label="Meldung ausblenden"/);
assert.match(css, /\.message-timestamp/);
assert.match(css, /\.message-dismiss/);

assert.match(app, /DISMISSED_UI_MESSAGES_KEY\s*=\s*['"]dismissedUiMessagesV1['"]/);
assert.match(app, /function bulkStatusMessageId\s*\(/);
assert.match(app, /function messageTimestampText\s*\(/);
assert.match(app, /async function dismissUiMessage\s*\(/);
assert.match(app, /isUiMessageDismissed\('bulkRunStatus'/);
assert.match(app, /className = cardAction\.mode === 'minimize' \? 'message-minimize' : 'message-dismiss'/);
assert.match(app, /messageTimestampText\(bulkStatusTimestamp\(state\)\)/);
assert.match(app, /appNoticeTime\.textContent = messageTimestampText\(currentAppNotice\.createdAt\)/);

// Dismissal is display-only: the bulk card close path persists only a UI message id.
const start = app.indexOf("dismiss.addEventListener('click'");
assert.ok(start >= 0, 'bulk dismiss listener missing');
const snippet = app.slice(start, start + 900);
assert.match(snippet, /dismissUiMessage\('bulkRunStatus'/);
assert.doesNotMatch(snippet, /BULK_FAIL_RUN|BULK_FINISH_RUN|STOP|CANCEL|DELETE_/);

console.log('PASS v1.15.4 timestamped dismissible activity-message UI contract');
