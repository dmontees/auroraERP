<?php
// =============================================================================
// Aurora ERP — Configuració inicial de l'usuari administrador
//
// Puja aquest fitxer a l'arrel del domini (on és index.html)
// Accedeix a:  https://erp.tudomini.com/setup.php
// ELIMINA'L DEL SERVIDOR immediatament després de configurar la contrasenya.
// =============================================================================

// Comprova que existeix config.php a la carpeta api/
$configPath = __DIR__ . '/api/config.php';
if (!file_exists($configPath)) {
    die('<p style="font-family:sans-serif;color:red">Error: no es troba <strong>api/config.php</strong>. Crea\'l primer a partir de api/config.example.php</p>');
}

require_once $configPath;

$missatge = '';
$error    = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $nom      = trim($_POST['nom']      ?? '');
    $password = $_POST['password']      ?? '';

    if (!$username || !$nom) {
        $error = 'Omple tots els camps.';
    } elseif (strlen($password) < 8) {
        $error = 'La contrasenya ha de tenir almenys 8 caràcters.';
    } else {
        try {
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $pdo  = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER, DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $pdo->prepare(
                'INSERT INTO aurora_users (username, password_hash, nom, rol, actiu)
                 VALUES (?, ?, ?, "admin", 1)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nom = VALUES(nom)'
            )->execute([$username, $hash, $nom]);

            $missatge = "Usuari <strong>$username</strong> configurat correctament.";
        } catch (Exception $e) {
            $error = 'Error de base de dades: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <title>Aurora ERP — Configuració inicial</title>
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 420px; margin: 3rem auto; padding: 0 1rem; color: #1f2937; }
    h2   { font-size: 1.25rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: #6b7280; margin-bottom: 0.3rem; }
    input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #d1d5db; border-radius: 7px; font-size: 0.9rem; margin-bottom: 1rem; }
    button { background: #1e293b; color: #fff; border: none; border-radius: 7px; padding: 0.7rem 1.5rem; font-size: 0.95rem; cursor: pointer; width: 100%; }
    .ok   { background: #d1fae5; color: #065f46; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }
    .err  { background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }
    .warn { background: #fef3c7; color: #92400e; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 1.25rem; font-size: 0.82rem; }
  </style>
</head>
<body>
  <h2>⚙️ Aurora ERP — Configuració inicial</h2>

  <?php if ($missatge): ?>
    <div class="ok">✅ <?= $missatge ?></div>
    <div class="warn">
      ⚠️ <strong>Elimina ara setup.php del servidor</strong> per evitar accés no autoritzat.<br>
      Ja pots <a href="/">accedir a l'aplicació</a>.
    </div>
  <?php else: ?>
    <?php if ($error): ?><div class="err">❌ <?= htmlspecialchars($error) ?></div><?php endif; ?>

    <form method="POST">
      <label for="username">Nom d'usuari</label>
      <input id="username" name="username" type="text" value="admin" required>

      <label for="nom">Nom complet</label>
      <input id="nom" name="nom" type="text" value="Administrador" required>

      <label for="password">Contrasenya (mínim 8 caràcters)</label>
      <input id="password" name="password" type="password" required>

      <button type="submit">Crear usuari administrador</button>
    </form>

    <div class="warn">
      ⚠️ Elimina aquest fitxer del servidor immediatament després de crear l'usuari.
    </div>
  <?php endif; ?>
</body>
</html>
