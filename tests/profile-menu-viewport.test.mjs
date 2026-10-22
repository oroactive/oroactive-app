import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('function positionMainUserDropdown(');
const end = app.indexOf('function closeBrandMenu(', start);
assert.ok(start > 0 && end > start, 'profile menu positioning functions must exist');

function menuContext({width = 390, height = 780, viewport, insets = {}, trigger = {right: 378, bottom: 64}} = {}) {
  class FakeNode {}
  const properties = new Map();
  const classes = new Set();
  const attributes = new Map([['aria-expanded', 'false']]);
  let measurements = 0;
  const dropdown = Object.assign(new FakeNode(), {
    hidden: true, scrollTop: 0,
    classList: {add: name => classes.add(name), remove: name => classes.delete(name)},
    style: {setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key)},
    contains: target => { assert.ok(target instanceof FakeNode, 'contains accepts DOM nodes only'); return target === dropdown || target?.insideMenu === true; }
  });
  const ctx = vm.createContext({
    Node: FakeNode, window: {innerWidth: width, innerHeight: height, visualViewport: viewport},
    safeViewportInset: side => insets[side] || 0,
    mainUserDropdown: dropdown,
    mainUserMenuButton: {getBoundingClientRect: () => { measurements++; return trigger; }, setAttribute: (key, value) => attributes.set(key, value)}
  });
  vm.runInContext(app.slice(start, end), ctx);
  return {ctx, dropdown, properties, classes, attributes, node: properties => Object.assign(new FakeNode(), properties), measurements: () => measurements,
    geometry: () => Object.fromEntries([...properties].map(([key, value]) => [key.replace('--main-user-dropdown-', ''), parseFloat(value)]))};
}

const cases = [
  {name: 'small portrait iPhone', width: 320, height: 568},
  {name: 'landscape notch and home indicator', width: 932, height: 390, insets: {left: 47, right: 47, bottom: 21}},
  {name: 'keyboard with a low trigger', width: 844, height: 390, viewport: {width: 844, height: 120, offsetLeft: 0, offsetTop: 0}, trigger: {right: 832, bottom: 200}},
  {name: 'zoomed and panned viewport', width: 390, height: 780, viewport: {width: 250, height: 180, offsetLeft: 30, offsetTop: 100}},
  {name: 'desktop', width: 1280, height: 800}
];
for (const item of cases) test(`profile dropdown stays wholly inside the ${item.name}`, () => {
  const menu = menuContext(item);
  menu.ctx.toggleMainUserMenu();
  const rect = menu.geometry();
  const visible = item.viewport || {width: item.width, height: item.height, offsetLeft: 0, offsetTop: 0};
  const insets = item.insets || {};
  assert.ok(rect.left >= visible.offsetLeft + 12 + (insets.left || 0));
  assert.ok(rect.left + rect.width <= visible.offsetLeft + visible.width - 12 - (insets.right || 0));
  assert.ok(rect.top >= visible.offsetTop + 12 + (insets.top || 0));
  assert.ok(rect.top + rect['max-height'] <= visible.offsetTop + visible.height - 12 - (insets.bottom || 0));
  assert.ok(rect.width >= 200 && rect.width <= 280, 'menu width must not inherit the short profile name');
  assert.ok(rect['max-height'] > 0);
  assert.equal(menu.dropdown.hidden, false);
  assert.equal(menu.attributes.get('aria-expanded'), 'true');
});

test('closing and reopening the profile dropdown resets positioning and expanded state', () => {
  const menu = menuContext();
  menu.ctx.toggleMainUserMenu();
  assert.ok(menu.classes.has('is-viewport-anchored'));
  menu.ctx.toggleMainUserMenu();
  assert.equal(menu.dropdown.hidden, true);
  assert.equal(menu.attributes.get('aria-expanded'), 'false');
  assert.equal(menu.classes.size, 0);
  assert.equal(menu.properties.size, 0);
  menu.ctx.toggleMainUserMenu();
  assert.equal(menu.dropdown.hidden, false);
  assert.equal(menu.properties.size, 4);
});

test('rotation repositions the open profile dropdown and preserves its scroll position', () => {
  const viewport = {width: 390, height: 780, offsetLeft: 0, offsetTop: 0};
  const menu = menuContext({viewport});
  menu.ctx.toggleMainUserMenu();
  menu.dropdown.scrollTop = 120;
  Object.assign(viewport, {width: 844, height: 390});
  menu.ctx.syncMainUserMenuPosition({type: 'resize'});
  const rect = menu.geometry();
  assert.ok(rect.top + rect['max-height'] <= 378);
  assert.equal(menu.dropdown.scrollTop, 120);
  assert.equal(menu.dropdown.hidden, false);
});

test('scrolling menu contents does not move the dropdown or interfere with reaching Logout', () => {
  const menu = menuContext();
  menu.ctx.toggleMainUserMenu();
  const measurements = menu.measurements();
  menu.dropdown.scrollTop = 80;
  menu.ctx.syncMainUserMenuPosition({type: 'scroll', target: menu.dropdown});
  menu.ctx.syncMainUserMenuPosition({type: 'scroll', target: menu.node({insideMenu: true})});
  assert.equal(menu.measurements(), measurements);
  assert.equal(menu.dropdown.scrollTop, 80);
  menu.ctx.syncMainUserMenuPosition({type: 'scroll', target: menu.node({insideMenu: false})});
  assert.equal(menu.measurements(), measurements + 1);
});

test('a Safari visualViewport scroll event can reposition the dropdown without treating its target as a DOM node', () => {
  const viewport = {width: 250, height: 180, offsetLeft: 30, offsetTop: 100};
  const menu = menuContext({viewport});
  menu.ctx.toggleMainUserMenu();
  viewport.offsetTop = 140;
  menu.ctx.syncMainUserMenuPosition({type: 'scroll', target: viewport});
  const rect = menu.geometry();
  assert.ok(rect.top >= 152);
  assert.ok(rect.top + rect['max-height'] <= 308);
});

test('a closed profile dropdown does no work during page and viewport scrolling', () => {
  const menu = menuContext();
  menu.ctx.syncMainUserMenuPosition({type: 'resize'});
  menu.ctx.syncMainUserMenuPosition({type: 'scroll', target: {}});
  assert.equal(menu.measurements(), 0);
  assert.equal(menu.properties.size, 0);
});
