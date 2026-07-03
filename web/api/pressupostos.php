<?php
// =============================================================================
// AURORA ERP API - Pressupostos
//
// GET /api/pressupostos.php                 -> llista paginada amb filtres
// GET /api/pressupostos.php?codi=PRE-00001  -> detall complet d'un pressupost
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    apiError('Metode no permes', 405);
}

requireAuth();

$pdo = db();

// =========================================================================
// Detall d'un pressupost
// =========================================================================
if (!empty($_GET['codi'])) {
    $codi = trim($_GET['codi']);

    $stmt = $pdo->prepare(
        'SELECT p.*, COALESCE(c.nom_comercial, c.nom_fiscal) AS client_nom
         FROM aurora_pressupostos p
         LEFT JOIN aurora_clients c ON c.codi = p.client_codi
         WHERE p.codi = ?
         LIMIT 1'
    );
    $stmt->execute([$codi]);
    $row = $stmt->fetch();

    if (!$row) {
        apiError('Pressupost no trobat', 404);
    }

    respond([
        'codi'              => $row['codi'],
        'estat'             => $row['estat'],
        'client_codi'       => $row['client_codi'],
        'client_nom'        => $row['client_nom'],
        'projecte_creat'    => $row['projecte_creat'],
        'projecte_vinculat' => $row['projecte_vinculat'],
        'nom_projecte'      => $row['nom_projecte'],
        'modalitat'         => $row['modalitat'],
        'data_pressupost'   => $row['data_pressupost'],
        'data_venciment'    => $row['data_venciment'],
        'data_acceptacio'   => $row['data_acceptacio'],
        'base_imposable'    => (float)$row['base_imposable'],
        'iva_percent'       => (float)$row['iva_percent'],
        'iva_import'        => (float)$row['iva_import'],
        'irpf_percent'      => (float)$row['irpf_percent'],
        'irpf_import'       => (float)$row['irpf_import'],
        'total_pressupost'  => (float)$row['total_pressupost'],
        'gastos_totals'     => (float)$row['gastos_totals'],
        'benefici'          => (float)$row['benefici'],
        'percent_benefici'  => (float)$row['percent_benefici'],
        'dades'             => json_decode($row['dades_json'], true) ?? [],
    ]);
}

// =========================================================================
// Llista de pressupostos
// =========================================================================
$estat   = trim($_GET['estat'] ?? '');
$client  = trim($_GET['client'] ?? '');
$q       = trim($_GET['q'] ?? '');
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
$offset  = ($page - 1) * $perPage;

$allowedOrderBy = ['data_pressupost','data_venciment','total_pressupost','benefici','nom_projecte','codi'];
$orderBy = in_array($_GET['order_by'] ?? '', $allowedOrderBy, true)
           ? $_GET['order_by']
           : 'data_pressupost';
$orderDir = strtoupper($_GET['order_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$where = ['1=1'];
$params = [];

if ($estat !== '') {
    $where[] = 'p.estat = ?';
    $params[] = $estat;
}
if ($client !== '') {
    $where[] = 'p.client_codi = ?';
    $params[] = $client;
}
if ($q !== '') {
    $where[] = '(p.codi LIKE ? OR p.nom_projecte LIKE ? OR c.nom_fiscal LIKE ? OR c.nom_comercial LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
}

$whereStr = implode(' AND ', $where);

$stmtCount = $pdo->prepare(
    "SELECT COUNT(*)
     FROM aurora_pressupostos p
     LEFT JOIN aurora_clients c ON c.codi = p.client_codi
     WHERE $whereStr"
);
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

$sql = "
    SELECT p.codi, p.estat, p.client_codi, p.projecte_creat, p.projecte_vinculat,
           p.nom_projecte, p.modalitat, p.data_pressupost, p.data_venciment,
           p.data_acceptacio, p.base_imposable, p.total_pressupost, p.gastos_totals,
           p.benefici, p.percent_benefici,
           COALESCE(c.nom_comercial, c.nom_fiscal) AS client_nom
    FROM aurora_pressupostos p
    LEFT JOIN aurora_clients c ON c.codi = p.client_codi
    WHERE $whereStr
    ORDER BY p.`$orderBy` $orderDir
    LIMIT $perPage OFFSET $offset
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$pressupostos = $stmt->fetchAll();

foreach ($pressupostos as &$row) {
    $row['base_imposable']   = (float)$row['base_imposable'];
    $row['total_pressupost'] = (float)$row['total_pressupost'];
    $row['gastos_totals']    = (float)$row['gastos_totals'];
    $row['benefici']         = (float)$row['benefici'];
    $row['percent_benefici'] = (float)$row['percent_benefici'];
}
unset($row);

respond([
    'data' => $pressupostos,
    'pagination' => [
        'total'    => $total,
        'page'     => $page,
        'per_page' => $perPage,
        'pages'    => (int)ceil($total / $perPage),
    ],
    'filters' => [
        'estat'     => $estat,
        'client'    => $client,
        'q'         => $q,
        'order_by'  => $orderBy,
        'order_dir' => $orderDir,
    ],
]);
