<?php
// =============================================================================
// AURORA ERP API — Sincronització des de l'app desktop
//
// POST /api/sync.php
// Authorization: Bearer <SYNC_API_KEY>
// Content-Type: application/json
//
// Body: el JSON complet de les dades de l'app (tal com exporta StorageManager)
// {
//   "clients": [...],
//   "proveidors": [...],
//   "projectes": [...],
//   "facturesVenda": [...],
//   "facturesCompra": [...],
//   "obligacionsFiscals": [...],
//   "parametres": { "dadesEmpresa": {...}, "serveis": [...], ... }
// }
//
// Estratègia: substitució completa (DELETE + INSERT per entitat).
// El desktop és sempre la font de veritat.
// =============================================================================

require_once __DIR__ . '/helpers.php';
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    apiError('Mètode no permès', 405);
}

requireSyncKey();

// Augmenta límits per a payloads grans
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '120');

$data = getJsonBody();
$dryRun = isset($_GET['dryRun']) && $_GET['dryRun'] === '1';
$syncMeta = isset($data['_syncMeta']) && is_array($data['_syncMeta']) ? $data['_syncMeta'] : [];
$syncIdRaw = (string)($syncMeta['syncId'] ?? uniqid('sync_', true));
$syncId = preg_replace('/[^A-Za-z0-9_.:-]/', '', $syncIdRaw);
$clientSchemaVersion = isset($syncMeta['dataSchemaVersion']) ? (int)$syncMeta['dataSchemaVersion'] : null;

$pdo = db();
$pdo->beginTransaction();

try {
    $stats = [];

    // =========================================================================
    // CLIENTS
    // =========================================================================
    if (isset($data['clients']) && is_array($data['clients'])) {
        $pdo->exec('DELETE FROM aurora_clients');
        $cols = ['codi','nom_fiscal','nom_comercial','nif','pais','domicili',
                 'telefon','correu','web','tipus_iva','retencio','data_alta','dades_json'];
        $rows = [];
        foreach ($data['clients'] as $c) {
            if (empty($c['codi'])) continue;
            $rows[] = [
                $c['codi'],
                $c['nomFiscal']      ?? '',
                $c['nomComercial']   ?? null,
                $c['nif']            ?? null,
                safeEnum($c['pais']     ?? null, ['Espanya','UE-VIES','Estranger-exportació','Altres'], 'Espanya'),
                $c['domicili']       ?? null,
                $c['telefon']        ?? null,
                $c['correuElectronic'] ?? null,
                $c['web']            ?? null,
                safeEnum($c['tipusIVA'] ?? null, ['Normal','Exempt','Reduit','Superreduit'], 'Normal'),
                safeFloat($c['retencio'] ?? 0),
                safeDate($c['dataAlta'] ?? null),
                json_encode(stripHeavyFields($c), JSON_UNESCAPED_UNICODE),
            ];
        }
        batchInsert('aurora_clients', $cols, $rows);
        $stats['clients'] = count($rows);
    }

    // =========================================================================
    // PROVEÏDORS
    // =========================================================================
    if (isset($data['proveidors']) && is_array($data['proveidors'])) {
        $pdo->exec('DELETE FROM aurora_proveidors');
        $cols = ['codi','nom_fiscal','nom_comercial','nif','tipus','tipus_iva',
                 'retencio','telefon','correu','categories_json','actiu','dades_json'];
        $rows = [];
        foreach ($data['proveidors'] as $p) {
            if (empty($p['codi'])) continue;
            $stripped = stripHeavyFields($p);
            // Elimina imatge perfil del dades_json (pot ser base64 gran)
            unset($stripped['imatgePerfil']);
            $rows[] = [
                $p['codi'],
                $p['nomFiscal']     ?? '',
                $p['nomComercial']  ?? null,
                $p['nif']           ?? null,
                safeEnum($p['tipus']    ?? null, ['Proveïdor','Acreedor','Treballador'], 'Proveïdor'),
                safeEnum($p['tipusIVA'] ?? null, ['Normal','Exempt','Reduit','Superreduit'], 'Normal'),
                safeFloat($p['retencio'] ?? 0),
                $p['telefon']       ?? null,
                $p['correuElectronic'] ?? null,
                json_encode($p['categories'] ?? [], JSON_UNESCAPED_UNICODE),
                boolToInt($p['actiu'] ?? true),
                json_encode($stripped, JSON_UNESCAPED_UNICODE),
            ];
        }
        batchInsert('aurora_proveidors', $cols, $rows);
        $stats['proveidors'] = count($rows);
    }

    // =========================================================================
    // PROJECTES
    // =========================================================================
    if (isset($data['projectes']) && is_array($data['projectes'])) {
        // Les taules filles s'esborren per CASCADE
        $pdo->exec('DELETE FROM aurora_projectes');

        $cols = ['codi','titol','client_codi','pressupost_codi','factura_codi',
                 'modalitat','servei','es_direct','estat',
                 'data_inici','data_entrega','data_finalitzacio',
                 'ingres_sense_iva','iva','ingres_amb_iva',
                 'gastos_materials','gastos_humans','gastos_totals',
                 'benefici','percent_benefici',
                 'facturat','arxivat','dades_json'];

        $rowsP  = [];
        $rowsDR = []; // dates_rodatge
        $rowsDE = []; // dates_entrega

        foreach ($data['projectes'] as $p) {
            if (empty($p['codi'])) continue;

            // Data d'inici: camp legacy o primer element de datesRodatge
            $dataInici = safeDate($p['dataInici'] ?? null);
            if (!$dataInici && !empty($p['datesRodatge'])) {
                $dataInici = safeDate($p['datesRodatge'][0]['data'] ?? null);
            }

            // Data d'entrega: camp legacy o primer element de datesEntrega
            $dataEntrega = safeDate($p['dataEntrega'] ?? null);
            if (!$dataEntrega && !empty($p['datesEntrega'])) {
                $dataEntrega = safeDate($p['datesEntrega'][0]['data'] ?? null);
            }

            $stripped = stripHeavyFields($p);

            $rowsP[] = [
                $p['codi'],
                $p['titol']           ?? '',
                $p['client']          ?? null,
                $p['pressupost']      ?? null,
                $p['factura']         ?? null,
                $p['modalitat']       ?? null,
                $p['servei']          ?? null,
                boolToInt($p['esDirect'] ?? false),
                safeEnum($p['estat'] ?? null, ['esborrany','planificat','rodatge','edicio','esperant_feedback','revisio','acabat','facturat'], 'esborrany'),
                $dataInici,
                $dataEntrega,
                safeDate($p['dataFinalitzacio'] ?? null),
                safeFloat($p['ingresSenseIVA']    ?? 0),
                safeFloat($p['iva']               ?? 0),
                safeFloat($p['ingresAmbIVA']      ?? 0),
                safeFloat($p['gastosMaterials']   ?? 0),
                safeFloat($p['gastosHumans']      ?? 0),
                safeFloat($p['gastosTotals']      ?? 0),
                safeFloat($p['benefici']          ?? 0),
                safeFloat($p['percentBenefici']   ?? 0),
                boolToInt($p['facturat']  ?? false),
                boolToInt($p['arxivat']   ?? false),
                json_encode($stripped, JSON_UNESCAPED_UNICODE),
            ];

            // Dates de rodatge (taula auxiliar per a queries de dashboard)
            foreach ($p['datesRodatge'] ?? [] as $dr) {
                $d = safeDate($dr['data'] ?? null);
                if (!$d) continue;
                $rowsDR[] = [
                    $p['codi'],
                    $dr['id']   ?? uniqid(),
                    $d,
                    $dr['hora'] ?? null,
                    $dr['nota'] ?? null,
                ];
            }

            // Dates d'entrega
            foreach ($p['datesEntrega'] ?? [] as $de) {
                $d = safeDate($de['data'] ?? null);
                if (!$d) continue;
                $rowsDE[] = [
                    $p['codi'],
                    $de['id']       ?? uniqid(),
                    $d,
                    $de['nota']     ?? null,
                    boolToInt($de['entregada'] ?? false),
                ];
            }
        }

        batchInsert('aurora_projectes', $cols, $rowsP);

        if ($rowsDR) {
            batchInsert(
                'aurora_projectes_dates_rodatge',
                ['projecte_codi','data_id','data','hora','nota'],
                $rowsDR
            );
        }
        if ($rowsDE) {
            batchInsert(
                'aurora_projectes_dates_entrega',
                ['projecte_codi','data_id','data','nota','entregada'],
                $rowsDE
            );
        }

        $stats['projectes'] = count($rowsP);
    }

    // =========================================================================
    // FACTURES DE VENDA
    // =========================================================================
    if (isset($data['facturesVenda']) && is_array($data['facturesVenda'])) {
        $pdo->exec('DELETE FROM aurora_factures_venda');
        $cols = ['codi','tipus','factura_rectificada','client_codi','projecte_codi',
                 'estat','data_factura','data_venciment','data_enviada',
                 'iva_percent','irpf_percent',
                 'base_imposable','iva_import','irpf_import','total_factura',
                 'total_pagat','pendent_cobrar','dades_json'];
        $rows = [];
        foreach ($data['facturesVenda'] as $f) {
            if (empty($f['codi'])) continue;
            $stripped = $f;
            unset($stripped['documentPDF'], $stripped['documentPDFName']);
            $rows[] = [
                $f['codi'],
                safeEnum($f['tipus'] ?? null, ['normal','rectificativa'], 'normal'),
                $f['facturaRectificada'] ?? null,
                $f['client']             ?? null,
                $f['projecte']           ?? null,
                safeEnum($f['estat'] ?? null, ['borrador','enviada','pagada-parcial','pagada','vencuda','cancelled'], 'borrador'),
                safeDate($f['dataFactura']   ?? null),
                safeDate($f['dataVenciment'] ?? null),
                safeDate($f['dataEnviada']   ?? null),
                safeFloat($f['ivaPercent']   ?? 21),
                safeFloat($f['irpfPercent']  ?? 0),
                safeFloat($f['baseImposable']  ?? 0),
                safeFloat($f['ivaImport']      ?? 0),
                safeFloat($f['irpfImport']     ?? 0),
                safeFloat($f['totalFactura']   ?? 0),
                safeFloat($f['totalPagat']     ?? 0),
                safeFloat($f['pendentCobrar']  ?? 0),
                json_encode($stripped, JSON_UNESCAPED_UNICODE),
            ];
        }
        batchInsert('aurora_factures_venda', $cols, $rows);
        $stats['factures_venda'] = count($rows);
    }

    // =========================================================================
    // FACTURES DE COMPRA + GASTOS GENERALS
    // Tots dos tipus van a la mateixa taula aurora_factures_compra
    // =========================================================================
    if (isset($data['facturesCompra']) && is_array($data['facturesCompra'])) {
        $pdo->exec('DELETE FROM aurora_factures_compra');
        $cols = ['codi','tipus','proveidor_codi','num_factura_prov','concepte',
                 'estat','data_gasto','data_venciment',
                 'base_imposable','iva_percent','iva_import',
                 'irpf_percent','irpf_import',
                 'total_gasto','total_pagat','pendent_pagament',
                 'es_despesa_general','dades_json'];
        $rows = [];
        foreach ($data['facturesCompra'] as $f) {
            if (empty($f['codi'])) continue;
            // Exclou obligacions fiscals (van a la seva pròpia taula)
            if (($f['tipus'] ?? '') === 'obligacio-fiscal') continue;
            $stripped = $f;
            unset($stripped['documentPDF'], $stripped['documentPDFName']);
            $rows[] = [
                $f['codi'],
                safeEnum($f['tipus'] ?? null, ['factura-compra','gasto-general'], 'factura-compra'),
                $f['proveidor']           ?? null,
                $f['numFacturaProveidor'] ?? null,
                $f['concepte']            ?? null,
                safeEnum($f['estat'] ?? null, ['pendent','pagada-parcial','pagada','vencuda'], 'pendent'),
                safeDate($f['dataGasto']     ?? null),
                safeDate($f['dataVenciment'] ?? null),
                safeFloat($f['baseImposable']   ?? 0),
                safeFloat($f['ivaPercent']      ?? 21),
                safeFloat($f['ivaImport']       ?? 0),
                safeFloat($f['irpfPercent']     ?? 0),
                safeFloat($f['irpfImport']      ?? 0),
                safeFloat($f['totalGasto']      ?? 0),
                safeFloat($f['totalPagat']      ?? 0),
                safeFloat($f['pendentPagament'] ?? 0),
                boolToInt($f['esDepesaGeneral'] ?? $f['esDesepsaGeneral'] ?? false),
                json_encode($stripped, JSON_UNESCAPED_UNICODE),
            ];
        }
        batchInsert('aurora_factures_compra', $cols, $rows);
        $stats['factures_compra'] = count($rows);
    }

    // =========================================================================
    // OBLIGACIONS FISCALS
    // =========================================================================
    if (isset($data['obligacionsFiscals']) && is_array($data['obligacionsFiscals'])) {
        $pdo->exec('DELETE FROM aurora_obligacions_fiscals');
        $cols = ['codi','subtipus','periode','concepte','estat',
                 'data_gasto','total_gasto','total_pagat','pendent_pagament','dades_json'];
        $rows = [];
        foreach ($data['obligacionsFiscals'] as $o) {
            if (empty($o['codi'])) continue;
            $rows[] = [
                $o['codi'],
                safeEnum($o['subtipus'] ?? null, ['cuota-autonomo','regularitzacio-ss','irpf-trimestral','irpf-anual','iva-trimestral','nomina-treballador'], 'cuota-autonomo'),
                $o['periode']    ?? null,
                $o['concepte']   ?? null,
                safeEnum($o['estat'] ?? null, ['pendent','pagada-parcial','pagada','vencuda'], 'pendent'),
                safeDate($o['dataGasto'] ?? null),
                safeFloat($o['totalGasto']      ?? 0),
                safeFloat($o['totalPagat']      ?? 0),
                safeFloat($o['pendentPagament'] ?? 0),
                json_encode($o, JSON_UNESCAPED_UNICODE),
            ];
        }
        batchInsert('aurora_obligacions_fiscals', $cols, $rows);
        $stats['obligacions_fiscals'] = count($rows);
    }

    // =========================================================================
    // PARÀMETRES
    // =========================================================================
    if (isset($data['parametres']) && is_array($data['parametres'])) {
        foreach ($data['parametres'] as $clau => $valor) {
            $pdo->prepare(
                'INSERT INTO aurora_parametres (clau, valor_json)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE valor_json = VALUES(valor_json), updated_at = NOW()'
            )->execute([$clau, json_encode($valor, JSON_UNESCAPED_UNICODE)]);
        }
        $stats['parametres'] = count($data['parametres']);
    }

    // =========================================================================
    // Actualitza el log de sincronització
    // =========================================================================
    $now = date('Y-m-d H:i:s');
    if (!$dryRun) {
        $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        foreach ($stats as $entitat => $total) {
            $pdo->prepare(
                'INSERT INTO aurora_sync_log (entitat, total_registres, synced_at, synced_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE total_registres = VALUES(total_registres),
                 synced_at = VALUES(synced_at), synced_by = VALUES(synced_by)'
            )->execute([$entitat, $total, $now, $ip]);
        }
    }

    if ($dryRun) {
        $pdo->rollBack();
    } else {
        $pdo->commit();
    }

    respond([
        'ok'             => true,
        'dry_run'        => $dryRun,
        'sync_id'        => $syncId,
        'schema_version' => $clientSchemaVersion,
        'synced_at'      => $now,
        'stats'          => $stats,
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Aurora sync error: ' . $e->getMessage());
    apiError('Error intern durant la sincronització. Comprova els logs del servidor.', 500);
}
