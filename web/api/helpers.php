<?php
// =============================================================================
// AURORA ERP API — Funcions d'ús comú
// =============================================================================

require_once __DIR__ . '/config.php';

date_default_timezone_set(APP_TIMEZONE);

// --- Connexió PDO (singleton) ------------------------------------------------

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

// --- Respostes JSON ----------------------------------------------------------

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function apiError(string $message, int $status = 400): void {
    respond(['error' => $message], $status);
}

// --- Capçaleres CORS ---------------------------------------------------------

function corsHeaders(): void {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// --- Autenticació ------------------------------------------------------------

function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        return trim($m[1]);
    }
    return null;
}

/**
 * Valida el token de sessió web i retorna l'usuari.
 * Finalitza amb 401 si no és vàlid.
 */
function requireAuth(): array {
    $token = getBearerToken();
    if (!$token) {
        apiError('No autenticat', 401);
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.username, u.nom, u.rol
         FROM aurora_sessions s
         JOIN aurora_users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.actiu = 1
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        apiError('Sessió invàlida o caducada', 401);
    }

    return $user;
}

/**
 * Valida la clau API de sincronització (enviada des de l'app desktop).
 * Finalitza amb 401 si no és vàlida.
 */
function requireSyncKey(): void {
    $key = getBearerToken();
    if (!$key || !hash_equals(SYNC_API_KEY, $key)) {
        apiError('Clau de sincronització invàlida', 401);
    }
}

// --- Utilitats ---------------------------------------------------------------

/**
 * Llegeix el body de la petició com a JSON parsejat.
 */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        apiError('Body JSON invàlid');
    }
    return $data;
}

/**
 * Converteix un valor TypeScript boolean (true/false/1/0/null) a int per a MySQL.
 */
function boolToInt(mixed $val): int {
    return $val ? 1 : 0;
}

/**
 * Retorna una data ISO (YYYY-MM-DD) o null si el valor és buit.
 */
function safeDate(?string $val): ?string {
    if (!$val) return null;
    // Accepta 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS...'
    return substr($val, 0, 10) ?: null;
}

/**
 * Retorna un float net o 0.
 */
function safeFloat(mixed $val): float {
    return (float)($val ?? 0);
}

/**
 * Elimina camps pesants (base64 de PDFs) d'un objecte per emmagatzemar-lo
 * com a dades_json sense sobrecarregar la base de dades.
 * Manté imatgeReferencia (imatge de portada del projecte, útil per a la web).
 */
function stripHeavyFields(array $obj): array {
    // PDFs de factures
    unset($obj['documentPDF'], $obj['documentPDFName']);

    // Contingut binari de documents adjunts del projecte (manté metadades)
    if (isset($obj['documents']) && is_array($obj['documents'])) {
        $obj['documents'] = array_map(function (array $doc): array {
            unset($doc['fitxer']);
            return $doc;
        }, $obj['documents']);
    }

    // Documents adjunts de proveïdors
    if (isset($obj['documents']) && is_array($obj['documents'])) {
        $obj['documents'] = array_map(function (array $doc): array {
            unset($doc['urlFitxer']);
            return $doc;
        }, $obj['documents']);
    }

    return $obj;
}

/**
 * Insereix registres en lots per evitar timeouts en syncs grans.
 *
 * @param string   $table   Nom de la taula
 * @param string[] $cols    Columnes a inserir
 * @param array[]  $rows    Array de arrays de valors (un per fila)
 * @param int      $batch   Mida del lot (default 50)
 */
function batchInsert(string $table, array $cols, array $rows, int $batch = 50): void {
    if (empty($rows)) return;

    $pdo = db();
    $colList  = implode(', ', array_map(fn($c) => "`$c`", $cols));
    $placeholder = '(' . implode(', ', array_fill(0, count($cols), '?')) . ')';

    foreach (array_chunk($rows, $batch) as $chunk) {
        $values = implode(', ', array_fill(0, count($chunk), $placeholder));
        $flat   = array_merge(...array_map('array_values', $chunk));
        $pdo->prepare("INSERT INTO `$table` ($colList) VALUES $values")->execute($flat);
    }
}
