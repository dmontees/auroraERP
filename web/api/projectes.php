<?php
// =============================================================================
// AURORA ERP API — Projectes
//
// GET /api/projectes.php                    → llista paginada amb filtres
// GET /api/projectes.php?codi=PRJ-00001     → detall complet d'un projecte
//
// Paràmetres de llista (query string):
//   estat     — filtra per estat (esborrany|planificat|rodatge|...)
//   arxivat   — 0 (default) | 1
//   client    — codi de client
//   q         — cerca de text lliure en titol
//   page      — pàgina (default 1)
//   per_page  — resultats per pàgina (default 20, màx 100)
//   order_by  — camp d'ordenació (data_entrega|data_inici|ingres_sense_iva|benefici|titol)
//   order_dir — ASC | DESC (default DESC)
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    apiError('Mètode no permès', 405);
}

requireAuth();

$pdo = db();

// =========================================================================
// Detall d'un projecte
// =========================================================================
if (!empty($_GET['codi'])) {
    $codi = trim($_GET['codi']);

    $stmt = $pdo->prepare(
        'SELECT p.*, c.nom_comercial AS client_nom, c.nom_fiscal AS client_nom_fiscal
         FROM aurora_projectes p
         LEFT JOIN aurora_clients c ON c.codi = p.client_codi
         WHERE p.codi = ?
         LIMIT 1'
    );
    $stmt->execute([$codi]);
    $row = $stmt->fetch();

    if (!$row) {
        apiError('Projecte no trobat', 404);
    }

    // Dates de rodatge i entrega de les taules auxiliars
    $stmtDR = $pdo->prepare(
        'SELECT data, hora, nota FROM aurora_projectes_dates_rodatge
         WHERE projecte_codi = ? ORDER BY data ASC, hora ASC'
    );
    $stmtDR->execute([$codi]);

    $stmtDE = $pdo->prepare(
        'SELECT data, nota, entregada FROM aurora_projectes_dates_entrega
         WHERE projecte_codi = ? ORDER BY data ASC'
    );
    $stmtDE->execute([$codi]);

    // L'objecte TypeScript complet ve del dades_json
    $dadesCompletes = json_decode($row['dades_json'], true) ?? [];

    // Diccionaris per renderitzar noms en lloc de codis a la web.
    $lookups = [
        'serveis'    => [],
        'unitats'    => [],
        'categories' => [],
        'materials'  => [],
        'grups'      => [],
        'proveidors' => [],
    ];

    $stmtParam = $pdo->query('SELECT clau, valor_json FROM aurora_parametres');
    foreach ($stmtParam->fetchAll() as $paramRow) {
        $valor = json_decode($paramRow['valor_json'], true);
        if (!is_array($valor)) continue;

        if ($paramRow['clau'] === 'serveis') {
            foreach ($valor as $item) {
                if (!empty($item['codi'])) $lookups['serveis'][$item['codi']] = $item['nom'] ?? $item['codi'];
            }
        } elseif ($paramRow['clau'] === 'unitats') {
            foreach ($valor as $item) {
                if (!empty($item['codi'])) $lookups['unitats'][$item['codi']] = $item['nom'] ?? $item['codi'];
            }
        } elseif ($paramRow['clau'] === 'categories') {
            foreach ($valor as $item) {
                if (!empty($item['codi'])) $lookups['categories'][$item['codi']] = $item['nom'] ?? $item['codi'];
            }
        } elseif ($paramRow['clau'] === 'materials') {
            foreach ($valor as $item) {
                if (!empty($item['codi'])) $lookups['materials'][$item['codi']] = $item['material'] ?? $item['nom'] ?? $item['codi'];
            }
        } elseif ($paramRow['clau'] === 'grupsMaterials') {
            foreach ($valor as $item) {
                if (!empty($item['codi'])) $lookups['grups'][$item['codi']] = $item['nom'] ?? $item['codi'];
            }
        }
    }

    $stmtProv = $pdo->query('SELECT codi, nom_fiscal, nom_comercial FROM aurora_proveidors');
    foreach ($stmtProv->fetchAll() as $prov) {
        $lookups['proveidors'][$prov['codi']] = $prov['nom_comercial'] ?: $prov['nom_fiscal'] ?: $prov['codi'];
    }

    respond([
        // Camps SQL (per filtrar / mostrar sense parsear JSON)
        'codi'             => $row['codi'],
        'titol'            => $row['titol'],
        'descripcio'       => $dadesCompletes['descripcio'] ?? null,
        'estat'            => $row['estat'],
        'client_codi'      => $row['client_codi'],
        'client_nom'       => $row['client_nom'] ?? $row['client_nom_fiscal'],
        'pressupost_codi'  => $row['pressupost_codi'],
        'factura_codi'     => $row['factura_codi'],
        'modalitat'        => $row['modalitat'],
        'servei'           => $row['servei'],
        'es_direct'        => (bool)$row['es_direct'],
        'data_inici'       => $row['data_inici'],
        'data_entrega'     => $row['data_entrega'],
        'data_finalitzacio'=> $row['data_finalitzacio'],
        'ingres_sense_iva' => (float)$row['ingres_sense_iva'],
        'iva'              => (float)$row['iva'],
        'ingres_amb_iva'   => (float)$row['ingres_amb_iva'],
        'gastos_materials' => (float)$row['gastos_materials'],
        'gastos_humans'    => (float)$row['gastos_humans'],
        'gastos_totals'    => (float)$row['gastos_totals'],
        'benefici'         => (float)$row['benefici'],
        'percent_benefici' => (float)$row['percent_benefici'],
        'facturat'         => (bool)$row['facturat'],
        'arxivat'          => (bool)$row['arxivat'],
        // Dates de les taules auxiliars (sempre actualitzades)
        'dates_rodatge'    => $stmtDR->fetchAll(),
        'dates_entrega'    => $stmtDE->fetchAll(),
        // Objecte complet (recursosHumans, materials, tasques, historial, feedback...)
        'dades'            => $dadesCompletes,
        'lookups'          => $lookups,
    ]);
}

// =========================================================================
// Llista de projectes
// =========================================================================

// --- Paràmetres de filtre ---
$estat    = trim($_GET['estat']    ?? '');
$arxivat  = isset($_GET['arxivat']) ? (int)$_GET['arxivat'] : 0;
$client   = trim($_GET['client']   ?? '');
$modalitat = trim($_GET['modalitat'] ?? '');
$servei   = trim($_GET['servei']   ?? '');
$direct   = isset($_GET['direct']) ? (int)$_GET['direct'] : 0;
$desde    = safeDate($_GET['desde'] ?? null);
$fins     = safeDate($_GET['fins']  ?? null);
$q        = trim($_GET['q']        ?? '');
$page     = max(1, (int)($_GET['page']     ?? 1));
$perPage  = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
$offset   = ($page - 1) * $perPage;

$allowedOrderBy = ['data_entrega','data_inici','ingres_sense_iva','benefici','titol','percent_benefici'];
$orderBy  = in_array($_GET['order_by'] ?? '', $allowedOrderBy)
            ? $_GET['order_by']
            : 'data_entrega';
$orderDir = strtoupper($_GET['order_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

// --- Construcció de la query dinàmica ---
$where  = ['1=1'];
$params = [];

$where[]  = 'p.arxivat = ?';
$params[] = $arxivat;

if ($estat !== '') {
    $where[]  = 'p.estat = ?';
    $params[] = $estat;
}
if ($client !== '') {
    $where[]  = 'p.client_codi = ?';
    $params[] = $client;
}
if ($modalitat !== '') {
    $where[]  = 'p.modalitat = ?';
    $params[] = $modalitat;
}
if ($servei !== '') {
    $where[]  = 'p.servei = ?';
    $params[] = $servei;
}
if ($direct === 1) {
    $where[] = 'p.es_direct = 1';
}
if ($desde) {
    $where[] = 'COALESCE(p.data_inici, p.data_entrega, p.data_finalitzacio) >= ?';
    $params[] = $desde;
}
if ($fins) {
    $where[] = 'COALESCE(p.data_inici, p.data_entrega, p.data_finalitzacio) <= ?';
    $params[] = $fins;
}
if ($q !== '') {
    $where[]  = '(p.titol LIKE ? OR p.codi LIKE ? OR c.nom_fiscal LIKE ? OR c.nom_comercial LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
}

$whereStr = implode(' AND ', $where);

// --- Total de registres (per a la paginació) ---
$stmtCount = $pdo->prepare(
    "SELECT COUNT(*)
     FROM aurora_projectes p
     LEFT JOIN aurora_clients c ON c.codi = p.client_codi
     WHERE $whereStr"
);
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

// --- Resultats paginats ---
$sql = "
    SELECT p.codi, p.titol, p.estat, p.es_direct,
           p.pressupost_codi, p.factura_codi, p.modalitat, p.servei,
           p.data_inici, p.data_entrega, p.data_finalitzacio,
           p.ingres_sense_iva, p.gastos_totals, p.benefici, p.percent_benefici,
           p.facturat, p.arxivat,
           p.client_codi,
           COALESCE(c.nom_comercial, c.nom_fiscal) AS client_nom
    FROM aurora_projectes p
    LEFT JOIN aurora_clients c ON c.codi = p.client_codi
    WHERE $whereStr
    ORDER BY p.`$orderBy` $orderDir
    LIMIT $perPage OFFSET $offset
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$projectes = $stmt->fetchAll();

// Cast de tipus numèrics i booleans
foreach ($projectes as &$row) {
    $row['ingres_sense_iva'] = (float)$row['ingres_sense_iva'];
    $row['gastos_totals']    = (float)$row['gastos_totals'];
    $row['benefici']         = (float)$row['benefici'];
    $row['percent_benefici'] = (float)$row['percent_benefici'];
    $row['facturat']         = (bool)$row['facturat'];
    $row['arxivat']          = (bool)$row['arxivat'];
    $row['es_direct']        = (bool)$row['es_direct'];
}
unset($row);

respond([
    'data'       => $projectes,
    'pagination' => [
        'total'    => $total,
        'page'     => $page,
        'per_page' => $perPage,
        'pages'    => (int)ceil($total / $perPage),
    ],
    'filters' => [
        'estat'    => $estat,
        'arxivat'  => $arxivat,
        'client'   => $client,
        'modalitat'=> $modalitat,
        'servei'   => $servei,
        'direct'   => $direct,
        'desde'    => $desde,
        'fins'     => $fins,
        'q'        => $q,
        'order_by' => $orderBy,
        'order_dir'=> $orderDir,
    ],
]);
