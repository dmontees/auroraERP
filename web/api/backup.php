<?php
/**
 * Aurora ERP - copia de seguretat al nuvol.
 *
 * GET  /api/backup.php -> descarrega la copia
 * POST /api/backup.php -> desa/sobreescriu la copia
 *
 * Autenticacio: Bearer token, la mateixa SYNC_API_KEY que sync.php.
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$backupDir = __DIR__ . '/backups';
$backupFile = $backupDir . '/aurora-backup.json';

function backupBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function backupRequireSyncKey(): void {
    $token = backupBearerToken();
    if (!$token || !hash_equals(SYNC_API_KEY, $token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

backupRequireSyncKey();

if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['error' => "No s'ha pogut crear el directori de backups"], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === false || $body === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Cos de la peticio buit'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON no valid: ' . json_last_error_msg()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $tmp = $backupFile . '.tmp';
    if (file_put_contents($tmp, $body, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut escriure el fitxer de backup"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!rename($tmp, $backupFile)) {
        @unlink($tmp);
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut finalitzar el backup"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'saved_at' => date('c'),
        'size_kb' => round(strlen($body) / 1024, 1),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'GET') {
    if (!file_exists($backupFile)) {
        http_response_code(404);
        echo json_encode(['error' => "No s'ha trobat cap copia de seguretat al servidor"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $content = file_get_contents($backupFile);
    if ($content === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut llegir el fitxer de backup"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo $content;
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metode no permes'], JSON_UNESCAPED_UNICODE);

