document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.classList.contains('contact-form')) return;
  event.preventDefault();
  const note = form.querySelector('.form-note');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent || '';
  if (note) note.textContent = '';
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Invio in corso...'; }
  try {
    const response = await fetch(form.action, {method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Non e' stato possibile inviare il messaggio.");
    form.reset();
    if (note) note.textContent = result.message || 'Messaggio inviato correttamente.';
  } catch (error) {
    if (note) note.textContent = error.message || "Errore durante l'invio. Riprova tra poco.";
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalText; }
  }
});
