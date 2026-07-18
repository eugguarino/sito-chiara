# Pubblicazione su GitHub e HostingPerTe

## 1. Prima configurazione GitHub

1. Crea un repository GitHub vuoto.
2. Collega questa cartella al repository:

```sh
git remote add origin git@github.com:TUO-UTENTE/NOME-REPO.git
git add .
git commit -m "Initial website version"
git push -u origin main
```

Se usi HTTPS al posto di SSH, sostituisci l'URL del remote con quello HTTPS mostrato da GitHub.

## 2. Secrets GitHub Actions

Nel repository GitHub vai in `Settings > Secrets and variables > Actions > New repository secret` e aggiungi:

- `FTP_SERVER`: host FTP indicato da HostingPerTe/cPanel.
- `FTP_USERNAME`: utente FTP.
- `FTP_PASSWORD`: password FTP.
- `FTP_SERVER_DIR`: cartella di destinazione, di solito `/public_html/`.

Dopo questi secrets, ogni push su `main` avvia `.github/workflows/deploy-hostingperte.yml`.

## 3. Configurazione email sul server

Il file `contact-config.php` contiene credenziali SMTP e non viene caricato su GitHub.
Sul server deve esistere accanto a `contact.php`.

Usa `contact-config.example.php` come modello e inserisci i valori reali direttamente sul server.

## 4. Dipendenze PHP

Il deploy esegue:

```sh
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
```

Questo ricrea la cartella `vendor/` durante la pubblicazione, senza versionarla su GitHub.
