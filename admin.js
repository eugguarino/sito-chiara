(() => {
  const frame = document.querySelector('#site');
  const editor = document.querySelector('#editor');
  const status = document.querySelector('#status');
  const selector = 'section,header,footer,nav,div,article,figure,figcaption,ul,ol,h1,h2,h3,h4,p,li,a,button,img,form,label,select,option,input,textarea,span,strong';
  let api, doc, selected, dirty = false, revision = 0, pending = null, timer;
  const markDirty = () => { dirty = true; revision++; status.textContent = 'Modifiche non salvate'; };
  const flush = () => { clearTimeout(timer); if (pending) { const fn = pending; pending = null; fn(); } };
  const describe = el => {
    const types = {SECTION:'Sezione', HEADER:'Intestazione', FOOTER:'Piè di pagina', ARTICLE:'Scheda', FIGURE:'Immagine con didascalia', IMG:'Immagine', BUTTON:'Pulsante', A:'Link', P:'Testo', LI:'Elemento elenco', FORM:'Modulo', H1:'Titolo', H2:'Titolo', H3:'Titolo', H4:'Titolo'};
    const label = types[el.tagName] || el.tagName.toLowerCase();
    const text = (el.getAttribute('alt') || el.querySelector('h1,h2,h3,figcaption')?.textContent || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    return `${label}${text ? ': ' + text : ''}`;
  };
  const perform = (el, type, value, name) => {
    const path = api.pathFor(el);
    if (api.record({path, type, ...(value !== undefined ? {value} : {}), ...(name ? {name} : {})})) { markDirty(); return true; }
    status.textContent = 'Operazione non valida. Controlla il valore inserito.'; return false;
  };
  const elements = () => [...doc.querySelectorAll('body > header, main, body > footer')].flatMap(root => [root, ...root.querySelectorAll(selector)]).filter(el => el.tagName !== 'MAIN' && !el.closest('.honeypot'));
  const highlight = el => {
    doc.querySelectorAll('.cms-preview-selected').forEach(node => node.classList.remove('cms-preview-selected'));
    if (el && !el.hidden) el.classList.add('cms-preview-selected');
  };
  const render = el => {
    flush();
    selected = el || null;
    highlight(selected);
    editor.replaceChildren();
    const heading = document.createElement('h2'); heading.textContent = 'Modifica elemento'; editor.append(heading);
    const help = document.createElement('p'); help.textContent = 'Clicca nell’anteprima oppure scegli un elemento dall’elenco. Le modifiche sono visibili subito e vengono pubblicate quando salvi.'; editor.append(help);
    const available = elements();
    const selectLabel = document.createElement('label'); selectLabel.textContent = 'Elemento selezionato';
    const select = document.createElement('select');
    const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Scegli un elemento'; select.append(placeholder);
    available.forEach((node, i) => {
      const option = document.createElement('option'); option.value = String(i);
      const depth = Math.max(0, Math.min(5, api.pathFor(node).length - 1));
      option.textContent = `${'— '.repeat(depth)}${describe(node)}${node.hidden ? ' (rimosso)' : ''}`;
      select.append(option);
    });
    if (selected && available.includes(selected)) select.value = String(available.indexOf(selected));
    select.addEventListener('change', () => render(select.value === '' ? null : available[Number(select.value)]));
    selectLabel.append(select); editor.append(selectLabel);
    if (!selected) return;
    const panel = document.createElement('div'); panel.className = 'card'; editor.append(panel);
    const title = document.createElement('h3'); title.textContent = describe(selected); panel.append(title);
    if (selected.hidden) { const note = document.createElement('p'); note.textContent = 'Questo elemento è stato rimosso dalla pagina. Puoi ripristinarlo.'; panel.append(note); }
    const textField = (labelText, value, onSave, live) => {
      const label = document.createElement('label'); label.textContent = labelText;
      const input = document.createElement('textarea'); input.value = value; input.rows = value.length > 90 ? 5 : 2; label.append(input); panel.append(label);
      if (live) {
        input.addEventListener('input', () => {
          clearTimeout(timer);
          const next = input.value;
          selected.textContent = next;
          markDirty();
          const target = selected;
          pending = () => onSave(target, next);
          timer = setTimeout(flush, 350);
        });
      } else {
        const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Aggiorna anteprima';
        apply.addEventListener('click', () => { flush(); if (onSave(selected, input.value)) render(selected); }); panel.append(apply);
      }
    };
    if (!selected.children.length && !['IMG','INPUT','TEXTAREA'].includes(selected.tagName)) textField('Testo', selected.textContent, (target, value) => perform(target, 'text', value), true);
    if (selected.tagName === 'IMG') {
      textField('Indirizzo immagine', selected.getAttribute('src') || '', (target, value) => perform(target, 'attribute', value, 'src'));
      textField('Descrizione immagine', selected.getAttribute('alt') || '', (target, value) => perform(target, 'attribute', value, 'alt'));
    }
    if (selected.tagName === 'A') textField('Destinazione del link', selected.getAttribute('href') || '', (target, value) => perform(target, 'attribute', value, 'href'));
    const actions = document.createElement('div'); actions.className = 'item-actions';
    const duplicate = document.createElement('button'); duplicate.type = 'button'; duplicate.textContent = 'Duplica';
    duplicate.addEventListener('click', () => { flush(); highlight(null); if (perform(selected, 'duplicate')) render(selected.nextElementSibling); });
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'secondary'; toggle.textContent = selected.hidden ? 'Ripristina' : 'Rimuovi';
    toggle.addEventListener('click', () => { flush(); if (perform(selected, selected.hidden ? 'show' : 'hide')) render(selected); });
    actions.append(duplicate, toggle); panel.append(actions);
  };
  frame.addEventListener('load', () => {
    const start = () => {
      api = frame.contentWindow.siteContentEditor; doc = frame.contentDocument;
      if (!api || api.loadFailed) { api = null; editor.textContent = 'Impossibile caricare i contenuti. Ricarica la pagina.'; return; }
      const style = doc.createElement('style'); style.textContent = '.cms-preview-selected { outline: 3px solid #215baf !important; outline-offset: 2px !important; }'; doc.head.append(style);
      doc.addEventListener('click', event => {
        const el = event.target.closest(selector);
        if (!el || !el.closest('header,main,footer')) return;
        event.preventDefault(); event.stopImmediatePropagation(); render(el);
        if (window.matchMedia('(max-width: 850px)').matches) editor.scrollIntoView({behavior: 'smooth', block: 'start'});
      }, true);
      doc.addEventListener('submit', event => event.preventDefault(), true);
      render(null);
    };
    if (frame.contentWindow.siteContentEditor?.ready) start();
    else frame.contentWindow.addEventListener('site-content-ready', start, {once: true});
  });
  document.querySelector('#save').addEventListener('click', async () => {
    if (!api) return;
    flush(); const savingRevision = revision; status.textContent = 'Salvataggio…';
    const form = new FormData(); form.set('action', 'save'); form.set('csrf', document.querySelector('#csrf').value); form.set('content', JSON.stringify(api.serialize()));
    try {
      const response = await fetch('admin.php', {method: 'POST', body: form}); const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Salvataggio non riuscito.');
      if (revision === savingRevision) { dirty = false; status.textContent = 'Modifiche salvate e pubblicate.'; }
      else status.textContent = 'Salvataggio completato. Ci sono altre modifiche da salvare.';
    } catch (error) { status.textContent = error.message || 'Errore di connessione.'; }
  });
  window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
})();
