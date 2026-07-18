<?php

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Metodo non consentito.']);
    exit;
}

function loadPhpMailer(): bool
{
    $autoloadCandidates = [
        __DIR__ . '/vendor/autoload.php',
        __DIR__ . '/../vendor/autoload.php',
        __DIR__ . '/../../vendor/autoload.php',
        dirname(__DIR__) . '/vendor/autoload.php',
    ];

    foreach (array_unique($autoloadCandidates) as $file) {
        if (is_file($file)) {
            require_once $file;

            if (class_exists('\\PHPMailer\\PHPMailer\\PHPMailer')) {
                return true;
            }
        }
    }

    $manualCandidates = [
        __DIR__ . '/PHPMailer/src',
        __DIR__ . '/phpmailer/src',
        __DIR__ . '/../PHPMailer/src',
        __DIR__ . '/../phpmailer/src',
        __DIR__ . '/../../PHPMailer/src',
        __DIR__ . '/../../phpmailer/src',
    ];

    foreach (array_unique($manualCandidates) as $dir) {
        $exceptionFile = $dir . '/Exception.php';
        $phpMailerFile = $dir . '/PHPMailer.php';
        $smtpFile = $dir . '/SMTP.php';

        if (is_file($exceptionFile) && is_file($phpMailerFile) && is_file($smtpFile)) {
            require_once $exceptionFile;
            require_once $phpMailerFile;
            require_once $smtpFile;

            if (class_exists('\\PHPMailer\\PHPMailer\\PHPMailer')) {
                return true;
            }
        }
    }

    return false;
}

if (!loadPhpMailer()) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'PHPMailer non e\' installato o non e\' raggiungibile. Carica vendor/autoload.php oppure la cartella PHPMailer/src sul server.',
    ]);
    exit;
}

$configFile = __DIR__ . '/contact-config.php';

if (!is_file($configFile)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Configurazione email mancante. Crea contact-config.php sul server.',
    ]);
    exit;
}

$mailConfig = require $configFile;

$smtpHost = (string) ($mailConfig['smtp_host'] ?? '');
$smtpUsername = (string) ($mailConfig['smtp_username'] ?? '');
$smtpPassword = (string) ($mailConfig['smtp_password'] ?? '');
$fromEmail = (string) ($mailConfig['from_email'] ?? '');
$fromName = (string) ($mailConfig['from_name'] ?? 'Sito Chiara Guarino');
$toEmail = (string) ($mailConfig['to_email'] ?? '');
$toName = (string) ($mailConfig['to_name'] ?? 'Chiara Guarino');

if ($smtpHost === '' || $smtpUsername === '' || $smtpPassword === '' || $fromEmail === '' || $toEmail === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Configurazione email incompleta.',
    ]);
    exit;
}

function field(string $name): string
{
    return trim((string) ($_POST[$name] ?? ''));
}

if (field('website') !== '') {
    echo json_encode(['ok' => true, 'message' => 'Messaggio inviato correttamente.']);
    exit;
}

$name = field('name');
$email = field('email');
$project = field('project');
$budget = field('budget');
$message = field('message');

if ($name === '' || $email === '' || $project === '' || $message === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Compila tutti i campi obbligatori.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Inserisci un indirizzo email valido.']);
    exit;
}

$safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeProject = htmlspecialchars($project, ENT_QUOTES, 'UTF-8');
$safeBudget = htmlspecialchars($budget, ENT_QUOTES, 'UTF-8');
$safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

$plainBody = implode("\n", [
    "Nuova richiesta dal sito Chiara Guarino",
    "",
    "Nome: {$name}",
    "Email: {$email}",
    "Tipo di collaborazione: {$project}",
    "Budget indicativo: {$budget}",
    "",
    "Messaggio:",
    $message,
]);

$htmlBody = <<<HTML
<h2>Nuova richiesta dal sito Chiara Guarino</h2>
<p><strong>Nome:</strong> {$safeName}</p>
<p><strong>Email:</strong> {$safeEmail}</p>
<p><strong>Tipo di collaborazione:</strong> {$safeProject}</p>
<p><strong>Budget indicativo:</strong> {$safeBudget}</p>
<p><strong>Messaggio:</strong><br>{$safeMessage}</p>
HTML;

$mail = new PHPMailer(true);

try {
    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = $smtpHost;
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUsername;
    $mail->Password = $smtpPassword;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;

    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress($toEmail, $toName);
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = "Richiesta collaborazione - {$project}";
    $mail->Body = $htmlBody;
    $mail->AltBody = $plainBody;

    $mail->send();

    echo json_encode(['ok' => true, 'message' => 'Messaggio inviato correttamente.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => "Errore invio email: {$mail->ErrorInfo}",
    ]);
}
