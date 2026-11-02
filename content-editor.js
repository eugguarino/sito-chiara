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
  window.siteContentEditor = {
    collections, templates, globalLeaves, fieldsFor, addItem,
    serialize: () => ({
      texts: globalLeaves().map(el => el.textContent.trim()),
      collections: collections.map(group => [...group.children].map(item => ({
        source: Number(item.dataset.cmsSource), texts: fieldsFor(item).map(el => el.textContent.trim())
      })))
    })
  };
  fetch('content.php', {cache: 'no-store'}).then(response => { if (!response.ok) throw new Error('Caricamento non riuscito'); return response.json(); })
    .then(apply).catch(() => { window.siteContentEditor.loadFailed = true; }).finally(() => { window.siteContentEditor.ready = true; window.dispatchEvent(new Event('site-content-ready')); });
})();
