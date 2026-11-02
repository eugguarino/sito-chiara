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

## Pannello di gestione contenuti

Il pannello si trova all'indirizzo `/admin.php` e richiede HTTPS. Per abilitarlo, crea sul server il file `admin-config.php` partendo da `admin-config.example.php`. Genera l'hash di una password lunga e unica con il comando seguente, da terminale, e copia il risultato nel valore `password_hash`:

```sh
php -r 'echo password_hash(readline("Password: "), PASSWORD_DEFAULT), PHP_EOL;'
```

Non inserire la password in chiaro nel file. Il processo PHP deve poter scrivere nella cartella del sito per creare e aggiornare `content-data.php`. Questo file e la configurazione del pannello sono esclusi dal deploy FTP e da Git: conserva una copia di sicurezza privata di entrambi. Le modifiche sono pubblicate quando si preme «Salva modifiche»; possono essere annullate prima di salvare ricaricando la pagina. Il pannello consente di modificare i testi semplici e rimuovere o aggiungere copie degli elementi originali nei gruppi esistenti; non carica nuove immagini o documenti. Le modifiche apportate tramite il pannello restano sul server e non aggiornano i file locali o Git. Se in seguito cambia la struttura della pagina, verificare la corrispondenza dei contenuti modificati prima di pubblicare.
