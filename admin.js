(() => {
  const frame = document.querySelector('#site');
  const editor = document.querySelector('#editor');
  const status = document.querySelector('#status');
  let api, doc, dirty = false;
  const selector = 'section,header,footer,nav,div,article,figure,figcaption,ul,ol,h1,h2,h3,h4,p,li,a,button,img,form,label,select,option,input,textarea,span,strong';
  const markDirty = () => { dirty = true; status.textContent = 'Modifiche non salvate'; };
  const describe = el => {
    const types = {SECTION:'Sezione', HEADER:'Intestazione', FOOTER:'Piè di pagina', ARTICLE:'Scheda', FIGURE:'Immagine con didascalia', IMG:'Immagine', BUTTON:'Pulsante', A:'Link', P:'Testo', LI:'Elemento elenco', FORM:'Modulo', H1:'Titolo', H2:'Titolo', H3:'Titolo', H4:'Titolo'};
    const label = types[el.tagName] || el.tagName.toLowerCase();
    const text = (el.getAttribute('alt') || el.querySelector('h1,h2,h3,figcaption')?.textContent || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    return `${label}${text ? ': ' + text : ''}`;
  };
  const perform = (el, type, value, name) => {
    const path = api.pathFor(el);
    if (api.record({path, type, ...(value !== undefined ? {value} : {}), ...(name ? {name} : {})})) { markDirty(); return true; }
    status.textContent = 'Operazione non valida. Controlla il valore inserito.'; return false;
  };
  const render = selected => {
    editor.replaceChildren();
    const help = document.createElement('p'); help.textContent = 'Seleziona un elemento per modificarlo, duplicarlo o nasconderlo. Puoi ripristinare un elemento nascosto.'; editor.append(help);
    const elements = [...doc.querySelectorAll('body > header, main, body > footer')].flatMap(root => [root, ...root.querySelectorAll(selector)]).filter(el => el.tagName !== 'MAIN' && !el.closest('.honeypot'));
    const selectLabel = document.createElement('label'); selectLabel.textContent = 'Scegli un elemento';
    const select = document.createElement('select');
    elements.forEach((el, i) => {
      const option = document.createElement('option'); option.value = i;
      const depth = Math.max(0, Math.min(6, api.pathFor(el).length - 1));
      option.textContent = `${'— '.repeat(depth)}${describe(el)}${el.hidden ? ' (nascosto)' : ''}`;
      select.append(option);
    });
    if (selected && elements.includes(selected)) select.value = String(elements.indexOf(selected));
    selectLabel.append(select); editor.append(selectLabel);
    const panel = document.createElement('div'); panel.className = 'card'; editor.append(panel);
    const display = () => {
      panel.replaceChildren();
      const el = elements[Number(select.value)]; if (!el) return;
      const heading = document.createElement('h2'); heading.textContent = describe(el); panel.append(heading);
      const textField = (labelText, value, onSave) => {
        const label = document.createElement('label'); label.textContent = labelText;
        const input = document.createElement('textarea'); input.value = value; input.rows = value.length > 90 ? 4 : 2; label.append(input);
        const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Applica modifica';
        save.addEventListener('click', () => { if (onSave(input.value)) render(el); });
        panel.append(label, save);
      };
      if (!el.children.length && !['IMG','INPUT','TEXTAREA'].includes(el.tagName)) textField('Testo', el.textContent, value => perform(el, 'text', value));
      if (el.tagName === 'IMG') {
        textField('Indirizzo immagine', el.getAttribute('src') || '', value => perform(el, 'attribute', value, 'src'));
        textField('Descrizione immagine', el.getAttribute('alt') || '', value => perform(el, 'attribute', value, 'alt'));
      }
      if (el.tagName === 'A') textField('Destinazione del link', el.getAttribute('href') || '', value => perform(el, 'attribute', value, 'href'));
      const actions = document.createElement('div'); actions.className = 'item-actions';
      const duplicate = document.createElement('button'); duplicate.type = 'button'; duplicate.textContent = 'Aggiungi una copia';
      duplicate.addEventListener('click', () => { if (perform(el, 'duplicate')) render(el.nextElementSibling); });
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = el.hidden ? 'Ripristina' : 'Rimuovi';
      toggle.addEventListener('click', () => { if (perform(el, el.hidden ? 'show' : 'hide')) render(el); });
      actions.append(duplicate, toggle); panel.append(actions);
    };
    select.addEventListener('change', display); display();
  };
  frame.addEventListener('load', () => {
    const start = () => { api = frame.contentWindow.siteContentEditor; doc = frame.contentDocument; if (api && !api.loadFailed) render(); else { api = null; editor.textContent = 'Impossibile caricare i contenuti. Ricarica la pagina.'; } };
    if (frame.contentWindow.siteContentEditor?.ready) start();
    else frame.contentWindow.addEventListener('site-content-ready', start, {once: true});
  });
  document.querySelector('#save').addEventListener('click', async () => {
    if (!api) return;
    status.textContent = 'Salvataggio…';
    const form = new FormData(); form.set('action', 'save'); form.set('csrf', document.querySelector('#csrf').value); form.set('content', JSON.stringify(api.serialize()));
    try {
      const response = await fetch('admin.php', {method: 'POST', body: form}); const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Salvataggio non riuscito.');
      dirty = false; status.textContent = 'Modifiche salvate.';
    } catch (error) { status.textContent = error.message || 'Errore di connessione.'; }
  });
  window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
})();
