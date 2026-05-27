<?php
// =============================================================================
// AURORA ERP API — Dashboard KPIs
//
// GET /api/dashboard.php
// Authorization: Bearer <session_token>
//
// Retorna tots els KPIs per renderitzar el dashboard web:
// - Resum de projectes per estat
// - Ingressos i beneficis (any actual i total)
// - Factures pendents de cobrar
// - Despeses pendents de pagar
// - Propers rodatges (30 dies)
// - Últims projectes modificats
// - Última sincronització
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    apiError('Mètode no permès', 405);
}

requireAuth();

$pdo  = db();
$any  = (int)date('Y');
$mes  = date('Y-m');

// =========================================================================
// 1. Resum de projectes per estat (no arxivats)
// =========================================================================
$stmt = $pdo->query(
    'SELECT estat, COUNT(*) AS total,
            SUM(ingres_sense_iva) AS ingres,
            SUM(gastos_totals)    AS gastos,
            SUM(benefici)         AS benefici
     FROM aurora_projectes
     WHERE arxivat = 0
     GROUP BY estat
     ORDER BY FIELD(estat,
       "esborrany","planificat","rodatge","edicio",
       "esperant_feedback","revisio","acabat","facturat")'
);
$projectesPerEstat = $stmt->fetchAll();

// Totals globals (no arxivats, no esborrany)
$stmt = $pdo->prepare(
    'SELECT COUNT(*)                     AS total_actius,
            SUM(ingres_sense_iva)        AS ingres_total,
            SUM(gastos_totals)           AS gastos_total,
            SUM(benefici)                AS benefici_total,
            AVG(percent_benefici)        AS marge_mitja
     FROM aurora_projectes
     WHERE arxivat = 0 AND estat != "esborrany"'
);
$stmt->execute();
$totalsGlobals = $stmt->fetch();

// Totals de l'any actual
$stmt = $pdo->prepare(
    'SELECT COUNT(*)              AS total,
            SUM(ingres_sense_iva) AS ingres,
            SUM(gastos_totals)    AS gastos,
            SUM(benefici)         AS benefici
     FROM aurora_projectes
     WHERE arxivat = 0
       AND estat != "esborrany"
       AND (
         YEAR(data_inici) = ?
         OR YEAR(data_entrega) = ?
         OR YEAR(data_finalitzacio) = ?
       )'
);
$stmt->execute([$any, $any, $any]);
$totalsAny = $stmt->fetch();

// =========================================================================
// 2. Factures de venda pendents de cobrar
// =========================================================================
$stmt = $pdo->query(
    'SELECT COUNT(*)              AS total_factures,
            SUM(pendent_cobrar)   AS total_pendent,
            SUM(total_factura)    AS total_factura
     FROM aurora_factures_venda
     WHERE estat IN ("enviada","pagada-parcial","vencuda")
       AND pendent_cobrar > 0'
);
$pendentCobrar = $stmt->fetch();

// Factures vençudes (data_venciment < avui i pendent > 0)
$stmt = $pdo->query(
    'SELECT COUNT(*)            AS total,
            SUM(pendent_cobrar) AS import
     FROM aurora_factures_venda
     WHERE estat = "vencuda" AND pendent_cobrar > 0'
);
$facturesVencudes = $stmt->fetch();

// Factures enviades any actual
$stmt = $pdo->prepare(
    'SELECT COUNT(*)            AS total,
            SUM(total_factura)  AS import,
            SUM(total_pagat)    AS pagat
     FROM aurora_factures_venda
     WHERE estat != "cancelled"
       AND tipus = "normal"
       AND YEAR(data_factura) = ?'
);
$stmt->execute([$any]);
$facturesAny = $stmt->fetch();

// =========================================================================
// 3. Despeses pendents de pagar (factures compra)
// =========================================================================
$stmt = $pdo->query(
    'SELECT COUNT(*)               AS total,
            SUM(pendent_pagament)  AS import
     FROM aurora_factures_compra
     WHERE estat IN ("pendent","pagada-parcial","vencuda")
       AND pendent_pagament > 0'
);
$pendentPagar = $stmt->fetch();

// =========================================================================
// 4. Propers rodatges (30 dies)
// =========================================================================
$stmt = $pdo->query(
    'SELECT dr.data, dr.hora, dr.nota,
            p.codi  AS projecte_codi,
            p.titol AS projecte_titol,
            p.estat AS projecte_estat,
            p.client_codi,
            c.nom_comercial AS client_nom
     FROM aurora_projectes_dates_rodatge dr
     JOIN aurora_projectes p ON p.codi = dr.projecte_codi
     LEFT JOIN aurora_clients c ON c.codi = p.client_codi
     WHERE dr.data >= CURDATE()
       AND dr.data <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND p.arxivat = 0
     ORDER BY dr.data ASC, dr.hora ASC
     LIMIT 10'
);
$propersRodatges = $stmt->fetchAll();

// =========================================================================
// 5. Últimes entregues pendents (30 dies)
// =========================================================================
$stmt = $pdo->query(
    'SELECT de.data, de.nota, de.entregada,
            p.codi  AS projecte_codi,
            p.titol AS projecte_titol,
            p.estat AS projecte_estat,
            c.nom_comercial AS client_nom
     FROM aurora_projectes_dates_entrega de
     JOIN aurora_projectes p ON p.codi = de.projecte_codi
     LEFT JOIN aurora_clients c ON c.codi = p.client_codi
     WHERE de.data >= CURDATE()
       AND de.data <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND de.entregada = 0
       AND p.arxivat = 0
     ORDER BY de.data ASC
     LIMIT 10'
);
$propersEntregues = $stmt->fetchAll();

// =========================================================================
// 6. Últims projectes actius (per data_entrega o data_inici)
// =========================================================================
$stmt = $pdo->query(
    'SELECT p.codi, p.titol, p.estat, p.ingres_sense_iva, p.benefici,
            p.percent_benefici, p.data_inici, p.data_entrega, p.facturat,
            c.nom_comercial AS client_nom, c.codi AS client_codi
     FROM aurora_projectes p
     LEFT JOIN aurora_clients c ON c.codi = p.client_codi
     WHERE p.arxivat = 0 AND p.estat != "esborrany"
     ORDER BY COALESCE(p.data_entrega, p.data_inici) DESC
     LIMIT 8'
);
$darrerProjectes = $stmt->fetchAll();

// Cast numèrics
foreach ($darrerProjectes as &$row) {
    $row['ingres_sense_iva']  = (float)$row['ingres_sense_iva'];
    $row['benefici']          = (float)$row['benefici'];
    $row['percent_benefici']  = (float)$row['percent_benefici'];
    $row['facturat']          = (bool)$row['facturat'];
}
unset($row);

// =========================================================================
// 7. Última sincronització
// =========================================================================
$stmt = $pdo->query(
    'SELECT entitat, total_registres, synced_at
     FROM aurora_sync_log
     ORDER BY synced_at DESC
     LIMIT 1'
);
$ultimaSync = $stmt->fetch() ?: null;

// =========================================================================
// Resposta
// =========================================================================
respond([
    'projectes' => [
        'per_estat'      => $projectesPerEstat,
        'totals_globals' => [
            'total_actius'  => (int)$totalsGlobals['total_actius'],
            'ingres_total'  => (float)$totalsGlobals['ingres_total'],
            'gastos_total'  => (float)$totalsGlobals['gastos_total'],
            'benefici_total'=> (float)$totalsGlobals['benefici_total'],
            'marge_mitja'   => (float)$totalsGlobals['marge_mitja'],
        ],
        'any_actual' => [
            'any'     => $any,
            'total'   => (int)$totalsAny['total'],
            'ingres'  => (float)$totalsAny['ingres'],
            'gastos'  => (float)$totalsAny['gastos'],
            'benefici'=> (float)$totalsAny['benefici'],
        ],
    ],
    'factures_venda' => [
        'pendent_cobrar'  => [
            'total_factures' => (int)$pendentCobrar['total_factures'],
            'import'         => (float)$pendentCobrar['total_pendent'],
        ],
        'vencudes' => [
            'total'  => (int)$facturesVencudes['total'],
            'import' => (float)$facturesVencudes['import'],
        ],
        'any_actual' => [
            'any'    => $any,
            'total'  => (int)$facturesAny['total'],
            'import' => (float)$facturesAny['import'],
            'pagat'  => (float)$facturesAny['pagat'],
        ],
    ],
    'factures_compra' => [
        'pendent_pagar' => [
            'total'  => (int)$pendentPagar['total'],
            'import' => (float)$pendentPagar['import'],
        ],
    ],
    'agenda' => [
        'propers_rodatges' => $propersRodatges,
        'propers_entregues'=> $propersEntregues,
    ],
    'darrers_projectes' => $darrerProjectes,
    'ultima_sync'       => $ultimaSync,
    'generated_at'      => date('Y-m-d H:i:s'),
]);
