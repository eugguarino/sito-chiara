(() => {
  const frame = document.querySelector('#site');
  const editor = document.querySelector('#editor');
  const status = document.querySelector('#status');
  const labels = ['Nomi in evidenza', 'Competenze', 'Crediti e collaborazioni', 'Portfolio: personaggi', 'Portfolio: forme', 'Fasi di lavoro'];
  let api;
  let dirty = false;
  const markDirty = () => { dirty = true; status.textContent = 'Modifiche non salvate'; };
  const field = (el, index) => {
    const label = document.createElement('label');
    const title = document.createElement('span');
    title.textContent = `${el.tagName.toLowerCase()} ${index + 1}`;
    const input = document.createElement('textarea');
    input.rows = el.textContent.trim().length > 90 ? 4 : 2;
    input.value = el.textContent.trim();
    input.addEventListener('input', () => { el.textContent = input.value; markDirty(); });
    label.append(title, input);
    return label;
  };
  const render = () => {
    editor.replaceChildren();
    const globals = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Testi generali'; globals.append(summary);
    const fields = document.createElement('div'); fields.className = 'fields';
    api.globalLeaves().forEach((el, i) => fields.append(field(el, i)));
    globals.append(fields); editor.append(globals);
    api.collections.forEach((group, i) => {
      const section = document.createElement('details'); section.open = true;
      const heading = document.createElement('summary'); heading.textContent = labels[i] || `Gruppo ${i + 1}`; section.append(heading);
      [...group.children].forEach((item, index) => {
        const card = document.createElement('div'); card.className = 'card';
        const head = document.createElement('div'); head.className = 'card-head';
        const name = document.createElement('strong'); name.textContent = `Elemento ${index + 1}`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Rimuovi';
        remove.addEventListener('click', () => { item.remove(); markDirty(); render(); });
        head.append(name, remove); card.append(head);
        api.fieldsFor(item).forEach((el, n) => card.append(field(el, n)));
        section.append(card);
      });
      const addRow = document.createElement('div'); addRow.className = 'add-row';
      const label = document.createElement('label'); label.textContent = 'Elemento esistente da aggiungere ';
      const select = document.createElement('select');
      api.templates[i].forEach((template, j) => {
        const option = document.createElement('option'); option.value = j;
        option.textContent = template.textContent.trim().replace(/\s+/g, ' ').slice(0, 100) || template.querySelector('img')?.alt || `Elemento ${j + 1}`;
        select.append(option);
      });
      label.append(select);
      const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Aggiungi';
      add.addEventListener('click', () => { api.addItem(i, Number(select.value)); markDirty(); render(); });
      addRow.append(label, add); section.append(addRow); editor.append(section);
    });
  };
  frame.addEventListener('load', () => {
    const start = () => { api = frame.contentWindow.siteContentEditor; if (api && !api.loadFailed) render(); else { api = null; editor.textContent = 'Impossibile caricare i contenuti del sito. Ricarica la pagina prima di modificare.'; } };
    if (frame.contentWindow.siteContentEditor?.ready) start();
    else frame.contentWindow.addEventListener('site-content-ready', start, {once: true});
  });
  document.querySelector('#save').addEventListener('click', async () => {
    if (!api) return;
    status.textContent = 'Salvataggio…';
    const form = new FormData(); form.set('action', 'save'); form.set('csrf', document.querySelector('#csrf').value); form.set('content', JSON.stringify(api.serialize()));
    try {
      const response = await fetch('admin.php', {method: 'POST', body: form});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Salvataggio non riuscito.');
      dirty = false; status.textContent = 'Modifiche salvate.';
    } catch (error) { status.textContent = error.message || 'Errore di connessione.'; }
  });
  window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
})();
