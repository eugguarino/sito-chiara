<?php
declare(strict_types=1);
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'self'");
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$https && !$local) { http_response_code(403); exit('Il pannello richiede una connessione HTTPS.'); }
session_set_cookie_params(['httponly' => true, 'secure' => $https, 'samesite' => 'Strict']);
session_start();
$config = is_file(__DIR__ . '/admin-config.php') ? require __DIR__ . '/admin-config.php' : [];
$hash = is_array($config) ? ($config['password_hash'] ?? '') : '';
if (!is_string($hash) || !password_get_info($hash)['algo']) { http_response_code(503); exit('Pannello non configurato. Segui le istruzioni in DEPLOYMENT.md.'); }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$csrf = $_SESSION['csrf'];
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) { http_response_code(403); exit('Richiesta non valida.'); }
    $action = $_POST['action'] ?? '';
    if ($action === 'login') {
        $rateFile = sys_get_temp_dir() . '/chiara-admin-' . hash('sha256', __DIR__ . ($_SERVER['REMOTE_ADDR'] ?? ''));
        $rate = fopen($rateFile, 'c+');
        if (!$rate || !flock($rate, LOCK_EX)) { http_response_code(503); exit('Accesso temporaneamente non disponibile.'); }
        $attempts = json_decode(stream_get_contents($rate), true) ?: [];
        $attempts = array_values(array_filter($attempts, fn($t) => is_int($t) && $t > time() - 900));
        if (count($attempts) >= 5) $error = 'Troppi tentativi. Riprova tra 15 minuti.';
        elseif (password_verify((string) ($_POST['password'] ?? ''), $hash)) {
            $attempts = []; session_regenerate_id(true); $_SESSION['authenticated'] = true; $_SESSION['csrf'] = bin2hex(random_bytes(32));
        } else { $attempts[] = time(); $error = 'Password non corretta.'; }
        ftruncate($rate, 0); rewind($rate); fwrite($rate, json_encode($attempts)); flock($rate, LOCK_UN); fclose($rate);
        if (!$error) { header('Location: admin.php'); exit; }
    } elseif ($action === 'logout') { session_destroy(); header('Location: admin.php'); exit; }
    elseif ($action === 'save' && !empty($_SESSION['authenticated'])) {
        header('Content-Type: application/json; charset=utf-8');
        $raw = (string) ($_POST['content'] ?? '');
        $data = json_decode($raw, true);
        if (strlen($raw) > 500000 || !is_array($data) || !isset($data['texts'], $data['collections']) || !is_array($data['texts']) || !is_array($data['collections'])) { http_response_code(400); exit('{"error":"Dati non validi."}'); }
        $file = __DIR__ . '/content-data.php';
        $payload = "<?php http_response_code(404); exit; ?>\n" . base64_encode(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
        if (file_put_contents($file, $payload, LOCK_EX) === false) { http_response_code(500); exit('{"error":"Impossibile salvare: verifica i permessi di scrittura sul server."}'); }
        echo '{"ok":true}'; exit;
    }
}
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
?>
<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gestione contenuti</title><link rel="stylesheet" href="admin.css?v=3"></head><body>
<header><h1>Gestione contenuti</h1><?php if (!empty($_SESSION['authenticated'])): ?><form method="post"><input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="logout"><button>Esci</button></form><?php endif; ?></header>
<main><?php if (empty($_SESSION['authenticated'])): ?><form method="post" class="login"><h2>Accedi</h2><input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="login"><label>Password <input type="password" name="password" required autocomplete="current-password"></label><button>Accedi</button><p role="alert"><?= e($error) ?></p></form>
<?php else: ?><p>Modifica i testi e gestisci gli elementi esistenti. Le modifiche saranno visibili sul sito dopo il salvataggio.</p><div class="toolbar"><button id="save" type="button">Salva modifiche</button><a href="index.html" target="_blank" rel="noopener">Apri il sito</a><span id="status" role="status" aria-live="polite"></span></div><input id="csrf" type="hidden" value="<?= e($csrf) ?>"><div class="workspace"><section class="preview-area" aria-label="Anteprima del sito"><h2>Anteprima del sito</h2><p>Seleziona un elemento nell’anteprima per modificarlo.</p><iframe id="site" src="index.html" title="Anteprima del sito modificabile"></iframe></section><aside id="editor" aria-label="Modifica elemento"><p>Caricamento contenuti…</p></aside></div><script src="admin.js?v=3"></script><?php endif; ?></main></body></html>
