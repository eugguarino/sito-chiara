(() => {
  const selectors = '.trust-list, .service-grid, .credit-grid, .gallery, .steps';
  const textSelector = 'h1,h2,h3,h4,p,li,a,span,figcaption,button,option,label';
  const collections = [...document.querySelectorAll(selectors)];
  const templates = collections.map(group => [...group.children].map(el => el.cloneNode(true)));
  const leaves = root => [...root.querySelectorAll(textSelector)].filter(el => {
    if (el.children.length || el.closest('script,style')) return false;
    if (!el.textContent.trim() && !el.hasAttribute('data-cms-text')) return false;
    el.setAttribute('data-cms-text', '');
    return true;
  });
  const globalLeaves = () => leaves(document.body).filter(el => !el.closest(selectors));
  const setTexts = (elements, values) => {
    if (!Array.isArray(values)) return;
    elements.forEach((el, i) => { if (typeof values[i] === 'string') el.textContent = values[i]; });
  };
  const addItem = (groupIndex, source, texts) => {
    const template = templates[groupIndex]?.[source];
    if (!template) return;
    const item = template.cloneNode(true);
    item.dataset.cmsSource = source;
    // A list item can itself contain the only text.
    const fields = item.matches(textSelector) && !item.children.length ? [item] : leaves(item);
    setTexts(fields, texts);
    collections[groupIndex].appendChild(item);
    return item;
  };
  const fieldsFor = item => item.matches(textSelector) && !item.children.length ? [item] : leaves(item);
  const apply = data => {
    if (!data || typeof data !== 'object') return;
    if (Array.isArray(data.collections)) collections.forEach((group, i) => {
      if (!Array.isArray(data.collections[i])) return;
      group.replaceChildren();
      data.collections[i].forEach(item => { if (item && Number.isInteger(item.source)) addItem(i, item.source, item.texts); });
    });
    setTexts(globalLeaves(), data.texts);
  };
  collections.forEach((group, i) => [...group.children].forEach((el, j) => { el.dataset.cmsSource = j; }));
  let baseline;
  const operations = [];
  const snapshot = () => ({
    texts: globalLeaves().map(el => el.textContent.trim()),
    collections: collections.map(group => [...group.children].map(item => ({
      source: Number(item.dataset.cmsSource), texts: fieldsFor(item).map(el => el.textContent.trim())
    })))
  });
  // Paths refer to the DOM resulting from the preceding operations, in order.
  const pathFor = el => {
    const path = [];
    while (el && el !== document.body) {
      const parent = el.parentElement;
      if (!parent) return null;
      path.unshift([...parent.children].indexOf(el));
      el = parent;
    }
    return el === document.body ? path : null;
  };
  const resolve = path => {
    if (!Array.isArray(path) || path.length > 40) return null;
    return path.reduce((el, n) => el && Number.isInteger(n) && n >= 0 ? el.children[n] : null, document.body);
  };
  const validUrl = value => {
    try { const url = new URL(value, document.baseURI); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol); }
    catch { return false; }
  };
  const perform = op => {
    const el = resolve(op.path);
    if (!el || !el.closest('header,main,footer')) return false;
    if (op.type === 'hide') el.hidden = true;
    else if (op.type === 'show') el.hidden = false;
    else if (op.type === 'text' && !el.children.length && typeof op.value === 'string') el.textContent = op.value;
    else if (op.type === 'attribute' && typeof op.value === 'string' &&
      ((op.name === 'alt' && el.tagName === 'IMG') ||
       (op.name === 'src' && el.tagName === 'IMG' && validUrl(op.value)) ||
       (op.name === 'href' && el.tagName === 'A' && validUrl(op.value)))) el.setAttribute(op.name, op.value);
    else if (op.type === 'duplicate') {
      const copy = el.cloneNode(true);
      copy.hidden = false;
      // Duplicate IDs would break links and form labels; remap internal references.
      const idMap = new Map();
      [copy, ...copy.querySelectorAll('[id]')].forEach(node => {
        if (!node.id) return;
        const old = node.id;
        const next = `${old}-copia-${operations.length}`;
        node.id = next; idMap.set(old, next);
      });
      [copy, ...copy.querySelectorAll('*')].forEach(node => {
        ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(attr => {
          if (node.hasAttribute(attr)) node.setAttribute(attr, node.getAttribute(attr).split(/\s+/).map(id => idMap.get(id) || id).join(' '));
        });
        const href = node.getAttribute('href');
        if (href && href.startsWith('#') && idMap.has(href.slice(1))) node.setAttribute('href', `#${idMap.get(href.slice(1))}`);
      });
      el.after(copy);
    } else return false;
    return true;
  };
  const record = op => { if (!perform(op)) return false; operations.push(op); return true; };
  window.siteContentEditor = { pathFor, record,
    serialize: () => ({...baseline, operations})
  };
  fetch('content.php', {cache: 'no-store'}).then(response => { if (!response.ok) throw new Error('Caricamento non riuscito'); return response.json(); })
    .then(data => {
      apply(data);
      baseline = snapshot();
      if (Array.isArray(data.operations)) data.operations.forEach(record);
    }).catch(() => { window.siteContentEditor.loadFailed = true; }).finally(() => { window.siteContentEditor.ready = true; window.dispatchEvent(new Event('site-content-ready')); });
})();
