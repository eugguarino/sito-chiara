<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$file = __DIR__ . '/content-data.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
if (!is_file($file)) { echo '{}'; exit; }
$content = file_get_contents($file);
$pos = strpos($content, "\n");
$data = $pos === false ? null : json_decode(base64_decode(substr($content, $pos + 1), true) ?: '', true);
echo json_encode(is_array($data) ? $data : new stdClass(), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
