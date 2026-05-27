<?php
// =============================================================================
// AURORA ERP API — Autenticació
//
// POST   /api/auth.php   { username, password }  → { token, expires_at, user }
// DELETE /api/auth.php                            → { ok: true }
// GET    /api/auth.php                            → { authenticated, user }
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// --- Login ------------------------------------------------------------------
if ($method === 'POST') {
    $body     = getJsonBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password) {
        apiError('Falten credencials', 400);
    }

    $pdo  = db();
    $stmt = $pdo->prepare(
        'SELECT id, password_hash, nom, rol FROM aurora_users WHERE username = ? AND actiu = 1 LIMIT 1'
    );
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Retard deliberat per dificultar brute-force
        sleep(1);
        apiError('Credencials incorrectes', 401);
    }

    // Neteja sessions caducades d'aquest usuari
    $pdo->prepare('DELETE FROM aurora_sessions WHERE user_id = ? AND expires_at < NOW()')
        ->execute([$user['id']]);

    // Crea nova sessió
    $token     = bin2hex(random_bytes(32)); // 64 chars hex
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_TTL_HOURS * 3600);

    $pdo->prepare('INSERT INTO aurora_sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
        ->execute([$user['id'], $token, $expiresAt]);

    $pdo->prepare('UPDATE aurora_users SET last_login = NOW() WHERE id = ?')
        ->execute([$user['id']]);

    respond([
        'token'      => $token,
        'expires_at' => $expiresAt,
        'user'       => [
            'nom' => $user['nom'],
            'rol' => $user['rol'],
        ],
    ]);
}

// --- Logout -----------------------------------------------------------------
if ($method === 'DELETE') {
    $token = getBearerToken();
    if ($token) {
        db()->prepare('DELETE FROM aurora_sessions WHERE token = ?')->execute([$token]);
    }
    respond(['ok' => true]);
}

// --- Comprova sessió activa -------------------------------------------------
if ($method === 'GET') {
    $token = getBearerToken();
    if (!$token) {
        respond(['authenticated' => false]);
    }

    $stmt = db()->prepare(
        'SELECT u.nom, u.rol
         FROM aurora_sessions s
         JOIN aurora_users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.actiu = 1
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        respond(['authenticated' => false]);
    }

    respond(['authenticated' => true, 'user' => $user]);
}

apiError('Mètode no permès', 405);
