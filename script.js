const form = document.querySelector("#contactForm");
const note = document.querySelector("#formNote");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  note.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Invio in corso...";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Non e' stato possibile inviare il messaggio.");
    }

    form.reset();
    note.textContent = result.message || "Messaggio inviato correttamente.";
  } catch (error) {
    note.textContent = error.message || "Errore durante l'invio. Riprova tra poco.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});
