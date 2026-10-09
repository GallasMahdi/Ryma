// Exercise rendered status controls and their click sequence without a live database.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const React = require('react'), { JSDOM } = require('jsdom'), ts = require('typescript');
const dom = new JSDOM('<!doctype html><main id="app"></main>', { url: 'http://fixture.invalid/' });
Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = require('react-dom/client');
const rootPath = path.resolve(__dirname, '..'), cache = new Map(), noop = () => {};
const empty = () => null;
const motionElement = React.forwardRef(({ children, initial, animate, exit, transition, layout, ...props }, ref) => React.createElement('div', { ...props, ref }, children));
function load(id, parent = rootPath) {
  if (id === '@tabler/icons-react') return new Proxy({}, { get: () => empty });
  if (id === 'next/dynamic') return () => empty;
  if (id === 'framer-motion') return { motion: { div: motionElement }, AnimatePresence: ({ children }) => children };
  if (id === '@/components/ServiceCatalogProvider') return { useServiceLabels: () => ({ getServiceName: () => 'Fixture treatment', getServicePrice: () => 35 }) };
  if (id === './ResponsiveModal') return { ResponsiveModal: ({ isOpen, children }) => isOpen ? React.createElement('section', { role: 'dialog' }, children) : null };
  if (id === './AgendaContent') return { AgendaContent: ({ loading, children }) => loading ? null : children };
  for (const name of ['TeamDayAgenda', 'AdminDateJumpPicker', 'FilterSheet', 'RescheduleAppointment']) {
    if (id === './' + name) return { [name]: empty };
  }
  if (!id.startsWith('@/') && !id.startsWith('.')) return require(id);
  const base = id.startsWith('@/') ? path.join(rootPath, 'src', id.slice(2)) : path.resolve(parent, id);
  const file = ['.tsx', '.ts', ''].map(ext => base + ext).find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  assert(file, id);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(child => load(child, path.dirname(file)), mod, mod.exports);
  return mod.exports;
}
const { AppointmentsTab } = load('@/components/admin/AppointmentsTab');
const { DayAgendaView } = load('@/components/admin/DayAgendaView');
const { AppointmentDetailModal } = load('@/components/admin/AppointmentDetailModal');
const { formatLocalDate } = load('@/types/admin');
const date = formatLocalDate(new Date());
const fixture = { id: 'status-fixture', patientName: 'Status workflow [TEST]', phone: '+351969990097', service: 'fixture', date, startTime: '09:00', practitionerId: 'fixture', practitionerName: 'Fixture practitioner', durationMinutes: 20, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const button = name => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent.trim()) === name);
const settleQuery = async () => { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 170)); }); };

for (const view of ['day', 'cards', 'table', 'grouped', 'detail']) {
  test(`${view}: confirm then complete never offers confirmation again, including after reopening`, async () => {
    let root = createRoot(document.getElementById('app')), appointment = { ...fixture, status: 'PENDING' };
    const transitions = [];
    const updateStatus = (id, status) => {
      assert.equal(id, appointment.id);
      transitions.push(status);
      appointment = { ...appointment, status, version: appointment.version + 1 };
      render();
    };
    const shared = { lang: 'fr', updateStatus, softDeleteAppointment: noop, openPatientNote: noop, setConfirmDialog: noop };
    function render() {
      const list = [appointment];
      const element = view === 'detail'
        ? React.createElement(AppointmentDetailModal, { ...shared, isOpen: true, onClose: noop, appointment })
        : view === 'day'
          ? React.createElement(DayAgendaView, { ...shared, selectedDate: date, loading: false, onDateChange: noop, appointments: list })
          : React.createElement(AppointmentsTab, { ...shared, searchQuery: '', setSearchQuery: noop, filter: 'all', setFilter: noop, appointmentsError: null, loadingAppointments: false, total: 1, onQueryChange: noop, appointments: list, filteredAppointments: list });
      root.render(element);
    }
    async function selectView() {
      const label = { day: 'Liste', cards: 'Cartes', table: 'Tableau', grouped: 'Par Date' }[view];
      if (label) {
        const control = button(label); assert(control, label);
        await React.act(async () => control.click());
        await settleQuery();
      }
    }
    const complete = view === 'detail' ? 'Terminer la Séance' : 'Terminer';
    const assertFinished = () => { assert(!button('Confirmer')); assert(!button(complete)); assert(document.body.textContent.includes('Terminé')); };
    try {
      await React.act(async () => render()); await selectView();
      assert(button('Confirmer')); assert(!button(complete));
      await React.act(async () => button('Confirmer').click());
      assert(!button('Confirmer')); assert(button(complete));
      await React.act(async () => button(complete).click());
      assert.deepEqual(transitions, ['CONFIRMED', 'COMPLETED']);
      assertFinished();
      await React.act(async () => root.unmount());
      root = createRoot(document.getElementById('app'));
      await React.act(async () => render()); await selectView();
      assertFinished();
      for (const status of ['CANCELLED', 'NO_SHOW']) {
        appointment = { ...appointment, status };
        await React.act(async () => render());
        assert(!button('Confirmer'), status); assert(!button(complete), status);
      }
    } finally { await React.act(async () => root.unmount()); }
  });
}
test.after(() => dom.window.close());
