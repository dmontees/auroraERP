<?php
/**
 * Aurora ERP — Còpia de seguretat al núvol
 * Posa aquest fitxer a la mateixa carpeta que sync.php (l'API del web sync).
 *
 * GET  → descarrega la còpia (per a restauració)
 * POST → desa/sobreescriu la còpia (des de l'app Aurora ERP)
 *
 * Autenticació: Bearer token (la mateixa SYNC_API_KEY que usa sync.php)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Configuració ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';   // Defineix SYNC_API_KEY

// El fitxer de backup es desa fora del web root si és possible,
// o en la mateixa carpeta que aquest script si no ho és.
// Per protegir-lo, afegeix al .htaccess: <Files "aurora-backup.json"> Deny from all </Files>
$backupFile = __DIR__ . '/aurora-backup.json';
// ─────────────────────────────────────────────────────────────────────────────

// ── Autenticació ─────────────────────────────────────────────────────────────
function authenticate(): bool {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) return false;
    $token = substr($header, 7);
    return hash_equals(SYNC_API_KEY, $token);
}

if (!authenticate()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
// ─────────────────────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];

// ── POST: desa la còpia ───────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = file_get_contents('php://input');

    if (empty($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Cos de la petició buit']);
        exit;
    }

    // Validar que és JSON vàlid
    json_decode($body);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON no vàlid: ' . json_last_error_msg()]);
        exit;
    }

    // Escriu de forma atòmica (fitxer temporal + rename)
    $tmp = $backupFile . '.tmp';
    if (file_put_contents($tmp, $body, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut escriure el fitxer de backup"]);
        exit;
    }
    rename($tmp, $backupFile);

    echo json_encode([
        'ok'       => true,
        'saved_at' => date('c'),                           // ISO 8601
        'size_kb'  => round(strlen($body) / 1024, 1),
    ]);
    exit;
}

// ── GET: descarrega la còpia ──────────────────────────────────────────────────
if ($method === 'GET') {
    if (!file_exists($backupFile)) {
        http_response_code(404);
        echo json_encode(['error' => "No s'ha trobat cap còpia de seguretat al servidor"]);
        exit;
    }

    $content = file_get_contents($backupFile);
    if ($content === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut llegir el fitxer de backup"]);
        exit;
    }

    // Retornem el JSON directament (ja és JSON vàlid)
    echo $content;
    exit;
}

// ── Mètode no suportat ────────────────────────────────────────────────────────
http_response_code(405);
echo json_encode(['error' => 'Mètode no permès. Usa GET o POST.']);
