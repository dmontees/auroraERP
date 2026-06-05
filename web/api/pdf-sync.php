<?php
/**
 * Aurora ERP - delta sync de documents.
 *
 * GET    /api/pdf-sync.php                   -> manifest
 * GET    /api/pdf-sync.php?key=proj/X/uuid   -> document base64
 * POST   /api/pdf-sync.php                   -> puja/actualitza document
 * DELETE /api/pdf-sync.php?key=proj/X/uuid   -> esborra document
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdfsDir = __DIR__ . '/pdfs';
$manifestFile = $pdfsDir . '/manifest.json';

function pdfSyncBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function pdfSyncRequireSyncKey(): void {
    $token = pdfSyncBearerToken();
    if (!$token || !hash_equals(SYNC_API_KEY, $token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function pdfSyncValidateKey(string $key): bool {
    return (bool) preg_match('/^(proj|fc|prov)\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)?$/', $key);
}

function pdfSyncKeyToPath(string $pdfsDir, string $key): string {
    return $pdfsDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $key) . '.bin';
}

function pdfSyncReadManifest(string $file): array {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    if (!$content) return [];
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

function pdfSyncSaveManifest(string $file, array $manifest): void {
    file_put_contents($file, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

pdfSyncRequireSyncKey();

if (!is_dir($pdfsDir) && !mkdir($pdfsDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['error' => "No s'ha pogut crear el directori de documents"], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$key = isset($_GET['key']) ? trim($_GET['key']) : '';

if ($method === 'GET') {
    if ($key === '') {
        echo json_encode(pdfSyncReadManifest($manifestFile), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!pdfSyncValidateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no valida'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $filePath = pdfSyncKeyToPath($pdfsDir, $key);
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => "Document no trobat: $key"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $manifest = pdfSyncReadManifest($manifestFile);
    $name = $manifest[$key]['name'] ?? basename($key);
    $binary = file_get_contents($filePath);
    if ($binary === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut llegir el document"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'key' => $key,
        'name' => $name,
        'data' => base64_encode($binary),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || empty($body['key']) || empty($body['data']) || empty($body['hash'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Falten camps obligatoris: key, data, hash'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $key = trim((string) $body['key']);
    $name = trim((string) ($body['name'] ?? basename($key)));
    $hash = trim((string) $body['hash']);
    $data = (string) $body['data'];

    if (!pdfSyncValidateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no valida'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (strpos($data, ',') !== false) {
        $data = substr($data, strpos($data, ',') + 1);
    }

    $binary = base64_decode($data, true);
    if ($binary === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Base64 no valid'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $filePath = pdfSyncKeyToPath($pdfsDir, $key);
    $dir = dirname($filePath);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut crear el directori del document"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $tmp = $filePath . '.tmp';
    if (file_put_contents($tmp, $binary, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut escriure el fitxer"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!rename($tmp, $filePath)) {
        @unlink($tmp);
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut finalitzar l'escriptura del fitxer"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $manifest = pdfSyncReadManifest($manifestFile);
    $manifest[$key] = [
        'hash' => $hash,
        'name' => $name,
        'size_kb' => round(strlen($binary) / 1024, 1),
        'updated_at' => date('c'),
    ];
    pdfSyncSaveManifest($manifestFile, $manifest);

    echo json_encode(['ok' => true, 'key' => $key, 'size_kb' => round(strlen($binary) / 1024, 1)], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'DELETE') {
    if ($key === '' || !pdfSyncValidateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no valida o absent'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $filePath = pdfSyncKeyToPath($pdfsDir, $key);
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $manifest = pdfSyncReadManifest($manifestFile);
    unset($manifest[$key]);
    pdfSyncSaveManifest($manifestFile, $manifest);

    echo json_encode(['ok' => true, 'deleted' => $key], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metode no permes'], JSON_UNESCAPED_UNICODE);
