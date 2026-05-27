<?php
// =============================================================================
// AURORA ERP API — Clients
//
// GET /api/clients.php                   → llista de clients
// GET /api/clients.php?codi=CLI-00001    → detall d'un client
//
// Paràmetres de llista:
//   q         — cerca per nom fiscal o comercial
//   pais      — filtra per país
//   page      — pàgina (default 1)
//   per_page  — resultats per pàgina (default 50, màx 200)
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    apiError('Mètode no permès', 405);
}

requireAuth();

$pdo = db();

// =========================================================================
// Detall d'un client
// =========================================================================
if (!empty($_GET['codi'])) {
    $codi = trim($_GET['codi']);

    $stmt = $pdo->prepare('SELECT * FROM aurora_clients WHERE codi = ? LIMIT 1');
    $stmt->execute([$codi]);
    $row = $stmt->fetch();

    if (!$row) {
        apiError('Client no trobat', 404);
    }

    // Projectes associats a aquest client
    $stmtP = $pdo->prepare(
        'SELECT codi, titol, estat, data_inici, data_entrega,
                ingres_sense_iva, benefici, facturat, arxivat
         FROM aurora_projectes
         WHERE client_codi = ?
         ORDER BY data_entrega DESC
         LIMIT 50'
    );
    $stmtP->execute([$codi]);
    $projectes = $stmtP->fetchAll();

    foreach ($projectes as &$p) {
        $p['ingres_sense_iva'] = (float)$p['ingres_sense_iva'];
        $p['benefici']         = (float)$p['benefici'];
        $p['facturat']         = (bool)$p['facturat'];
        $p['arxivat']          = (bool)$p['arxivat'];
    }
    unset($p);

    respond([
        'codi'          => $row['codi'],
        'nom_fiscal'    => $row['nom_fiscal'],
        'nom_comercial' => $row['nom_comercial'],
        'nif'           => $row['nif'],
        'pais'          => $row['pais'],
        'domicili'      => $row['domicili'],
        'telefon'       => $row['telefon'],
        'correu'        => $row['correu'],
        'web'           => $row['web'],
        'tipus_iva'     => $row['tipus_iva'],
        'retencio'      => (float)$row['retencio'],
        'data_alta'     => $row['data_alta'],
        // Contactes, tarifes especials i notes des del JSON complet
        'dades'         => json_decode($row['dades_json'], true) ?? [],
        'projectes'     => $projectes,
    ]);
}

// =========================================================================
// Llista de clients
// =========================================================================
$q       = trim($_GET['q']    ?? '');
$pais    = trim($_GET['pais'] ?? '');
$page    = max(1, (int)($_GET['page']     ?? 1));
$perPage = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
$offset  = ($page - 1) * $perPage;

$where  = ['1=1'];
$params = [];

if ($q !== '') {
    $where[]  = '(nom_fiscal LIKE ? OR nom_comercial LIKE ? OR nif LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($pais !== '') {
    $where[]  = 'pais = ?';
    $params[] = $pais;
}

$whereStr = implode(' AND ', $where);

$stmtCount = $pdo->prepare("SELECT COUNT(*) FROM aurora_clients WHERE $whereStr");
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

$sql = "
    SELECT codi, nom_fiscal, nom_comercial, nif, pais, telefon, correu, tipus_iva, data_alta
    FROM aurora_clients
    WHERE $whereStr
    ORDER BY nom_fiscal ASC
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$clients = $stmt->fetchAll();

respond([
    'data'       => $clients,
    'pagination' => [
        'total'    => $total,
        'page'     => $page,
        'per_page' => $perPage,
        'pages'    => (int)ceil($total / $perPage),
    ],
]);
