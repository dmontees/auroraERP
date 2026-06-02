<?php
// Diagnòstic temporal — ELIMINA AQUEST FITXER DESPRÉS D'USAR-LO
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$result = [];

// 1. Versió PHP
$result['php_version'] = PHP_VERSION;

// 2. Límits rellevants
$result['post_max_size']   = ini_get('post_max_size');
$result['memory_limit']    = ini_get('memory_limit');
$result['max_exec_time']   = ini_get('max_execution_time');

// 3. Existeix config.php?
$result['config_exists'] = file_exists(__DIR__ . '/config.php');

// 4. Connexió a la base de dades
if ($result['config_exists']) {
    require_once __DIR__ . '/config.php';
    $result['db_host'] = DB_HOST;
    $result['db_name'] = DB_NAME;
    $result['db_user'] = DB_USER;
    // No mostrem la contrasenya
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $result['db_connection'] = 'OK';
        // Comprova que les taules existeixen
        $stmt = $pdo->query("SHOW TABLES LIKE 'aurora_%'");
        $result['tables'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        $result['db_connection'] = 'ERROR: ' . $e->getMessage();
    }
} else {
    $result['db_connection'] = 'No es pot comprovar (config.php no trobat)';
}

// 5. Extensió JSON
$result['json_extension'] = extension_loaded('json') ? 'OK' : 'MISSING';

// 6. Ruta real del fitxer
$result['api_path'] = __DIR__;

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
