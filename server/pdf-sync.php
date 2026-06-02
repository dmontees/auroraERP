<?php
/**
 * Aurora ERP — Delta sync de documents (PDFs, imatges, adjunts)
 * Posa aquest fitxer a la mateixa carpeta que sync.php.
 * Crea una subcarpeta "pdfs/" al costat d'aquest fitxer.
 *
 * GET  /pdf-sync.php                   → manifest (índex de tots els documents)
 * GET  /pdf-sync.php?key=proj/X/uuid   → descarrega un document concret (base64 JSON)
 * POST /pdf-sync.php                   → puja/actualitza un document
 * DELETE /pdf-sync.php?key=proj/X/uuid → esborra un document
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config.php'; // defineix SYNC_API_KEY

$PDFS_DIR     = __DIR__ . '/pdfs';
$MANIFEST_FILE = $PDFS_DIR . '/manifest.json';

// ── Autenticació ──────────────────────────────────────────────────────────────
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!str_starts_with($auth, 'Bearer ') || !hash_equals(SYNC_API_KEY, substr($auth, 7))) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ── Crear directori si no existeix ───────────────────────────────────────────
if (!is_dir($PDFS_DIR)) {
    mkdir($PDFS_DIR, 0755, true);
}

// ── Validació de clau ─────────────────────────────────────────────────────────
// Format permès: "proj/{CODI}/{ID}" | "fc/{CODI}" | "prov/{CODI}/{ID}"
// Caràcters permesos: alfanumèric, guió, guió baix, barra (màx 3 segments)
function validateKey(string $key): bool {
    return (bool) preg_match('/^[a-z]+\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/', $key);
}

function keyToPath(string $pdfsDir, string $key): string {
    // Substitueix barres per separadors de directori, afegeix extensió .bin
    $safe = str_replace('/', DIRECTORY_SEPARATOR, $key);
    return $pdfsDir . DIRECTORY_SEPARATOR . $safe . '.bin';
}

// ── Llegir i desar manifest ───────────────────────────────────────────────────
function readManifest(string $file): array {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return $content ? (json_decode($content, true) ?? []) : [];
}

function saveManifest(string $file, array $manifest): void {
    file_put_contents($file, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];
$key    = isset($_GET['key']) ? trim($_GET['key']) : '';

// ── GET: manifest o document concret ─────────────────────────────────────────
if ($method === 'GET') {
    if ($key === '') {
        // Retorna el manifest complet
        echo json_encode(readManifest($MANIFEST_FILE));
        exit;
    }

    if (!validateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no vàlida']);
        exit;
    }

    $filePath = keyToPath($PDFS_DIR, $key);
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => "Document no trobat: $key"]);
        exit;
    }

    $manifest = readManifest($MANIFEST_FILE);
    $name = $manifest[$key]['name'] ?? basename($key);

    // Retorna el contingut com a base64 en JSON (el client l'espera en aquest format)
    $binary = file_get_contents($filePath);
    echo json_encode([
        'key'  => $key,
        'name' => $name,
        'data' => base64_encode($binary),
    ]);
    exit;
}

// ── POST: pujar/actualitzar document ─────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!$body || empty($body['key']) || empty($body['data']) || empty($body['hash'])) {
        http_response_code(400);
        echo json_encode(['error' => "Falten camps obligatoris: key, data, hash"]);
        exit;
    }

    $key  = trim($body['key']);
    $name = trim($body['name'] ?? basename($key));
    $hash = trim($body['hash']);
    $data = $body['data']; // base64

    if (!validateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no vàlida']);
        exit;
    }

    // Descodificar base64 (eliminar prefix data:... si n'hi ha)
    if (str_contains($data, ',')) {
        $data = substr($data, strpos($data, ',') + 1);
    }
    $binary = base64_decode($data, true);
    if ($binary === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Base64 no vàlid']);
        exit;
    }

    // Crear subdirectoris si cal
    $filePath = keyToPath($PDFS_DIR, $key);
    $dir = dirname($filePath);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // Escriptura atòmica
    $tmp = $filePath . '.tmp';
    if (file_put_contents($tmp, $binary, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => "No s'ha pogut escriure el fitxer"]);
        exit;
    }
    rename($tmp, $filePath);

    // Actualitzar manifest
    $manifest = readManifest($MANIFEST_FILE);
    $manifest[$key] = [
        'hash'       => $hash,
        'name'       => $name,
        'size_kb'    => round(strlen($binary) / 1024, 1),
        'updated_at' => date('c'),
    ];
    saveManifest($MANIFEST_FILE, $manifest);

    echo json_encode(['ok' => true, 'key' => $key, 'size_kb' => round(strlen($binary) / 1024, 1)]);
    exit;
}

// ── DELETE: esborrar document ─────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$key || !validateKey($key)) {
        http_response_code(400);
        echo json_encode(['error' => 'Clau no vàlida o absent']);
        exit;
    }

    $filePath = keyToPath($PDFS_DIR, $key);
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $manifest = readManifest($MANIFEST_FILE);
    unset($manifest[$key]);
    saveManifest($MANIFEST_FILE, $manifest);

    echo json_encode(['ok' => true, 'deleted' => $key]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Mètode no permès']);
