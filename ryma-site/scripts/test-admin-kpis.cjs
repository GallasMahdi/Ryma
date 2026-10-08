// Reproduces the redacted-response -> owner-unlocked render that crashed in the browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminKpiCards.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
const mod = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(require, mod, mod.exports);
const stats = { total: 12, confirmed: 8, pending: 2, completed: 2 };
const render = (nextStats, unlocked) => renderToStaticMarkup(React.createElement(mod.exports.AdminKpiCards, {
  stats: nextStats, lang: 'en', isAnalyticsUnlocked: unlocked,
}));

test('owner unlock safely renders cached redacted revenue while the refresh is pending', () => {
  assert.match(render(stats, false), /•••• €/);
  const unlocked = render(stats, true);
  assert.match(unlocked, /—/);
  assert.doesNotMatch(unlocked, /NaN|undefined|0 €/);
});

test('refreshed revenue displays real zero and nonzero amounts', () => {
  for (const revenue of [0, 125.5]) {
    const html = render({ ...stats, revenue }, true);
    assert.match(html, new RegExp(revenue.toLocaleString('pt-PT') + ' €'));
    assert.doesNotMatch(html, /—|••••/);
  }
});

test('locking owner access hides a cached revenue value immediately', () => {
  const html = render({ ...stats, revenue: 125.5 }, false);
  assert.match(html, /•••• €/);
  assert.doesNotMatch(html, /125,5/);
});
