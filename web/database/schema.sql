-- =============================================================================
-- AURORA ERP — Esquema MySQL per a la versió web (lectura)
-- Compatible amb MySQL 5.7+ / MariaDB 10.3+
-- Raiola Networks Hosting SSD
--
-- Estratègia: columnes principals per a filtres/queries SQL + dades_json
-- amb l'objecte complet serialitzat per a renderització a la web.
-- El desktop és sempre la font de veritat. La web és de només lectura.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- AUTENTICACIÓ WEB
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(100) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,           -- bcrypt hash
  nom             VARCHAR(200),
  email           VARCHAR(200),
  rol             ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
  actiu           TINYINT(1) NOT NULL DEFAULT 1,
  last_login      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_actiu (actiu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions PHP: token llarg de 64 chars hex
CREATE TABLE IF NOT EXISTS aurora_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  token           CHAR(64) NOT NULL UNIQUE,        -- sha256 hex
  expires_at      DATETIME NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES aurora_users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CONTROL DE SINCRONITZACIÓ
-- =============================================================================

-- Una fila per entitat sincronitzada, registra quan es va fer l'última sync
CREATE TABLE IF NOT EXISTS aurora_sync_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  entitat         VARCHAR(50) NOT NULL UNIQUE,     -- 'projectes', 'clients', etc.
  total_registres INT NOT NULL DEFAULT 0,
  synced_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  synced_by       VARCHAR(100),                    -- IP o identificador de l'app desktop
  INDEX idx_entitat (entitat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CLIENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_clients (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codi            VARCHAR(20) NOT NULL UNIQUE,     -- CLI-00001
  nom_fiscal      VARCHAR(300) NOT NULL,
  nom_comercial   VARCHAR(300),
  nif             VARCHAR(20),
  pais            ENUM('Espanya','UE-VIES','Estranger-exportació','Altres') DEFAULT 'Espanya',
  domicili        TEXT,
  telefon         VARCHAR(50),
  correu          VARCHAR(200),
  web             VARCHAR(300),
  tipus_iva       ENUM('Normal','Exempt','Reduit','Superreduit') DEFAULT 'Normal',
  retencio        DECIMAL(5,2) DEFAULT 0.00,
  data_alta       DATE,
  -- Objecte complet per renderitzar detalls (contactes, tarifes especials, notes)
  dades_json      LONGTEXT NOT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nom_fiscal (nom_fiscal(100)),
  INDEX idx_nom_comercial (nom_comercial(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- PROVEÏDORS
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_proveidors (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codi            VARCHAR(20) NOT NULL UNIQUE,     -- PRV-00001
  nom_fiscal      VARCHAR(300) NOT NULL,
  nom_comercial   VARCHAR(300),
  nif             VARCHAR(20),
  tipus           ENUM('Proveïdor','Acreedor','Treballador') DEFAULT 'Proveïdor',
  tipus_iva       ENUM('Normal','Exempt','Reduit','Superreduit') DEFAULT 'Normal',
  retencio        DECIMAL(5,2) DEFAULT 0.00,
  telefon         VARCHAR(50),
  correu          VARCHAR(200),
  -- Categories com a text JSON array: ["AUDIO","DRONE"]
  categories_json TEXT,
  actiu           TINYINT(1) DEFAULT 1,
  -- Objecte complet (tarifes especials, documents, imatge perfil, notes)
  dades_json      LONGTEXT NOT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nom (nom_fiscal(100)),
  INDEX idx_tipus (tipus),
  INDEX idx_actiu (actiu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- PROJECTES
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_projectes (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codi                VARCHAR(20) NOT NULL UNIQUE,  -- PRJ-00001
  titol               VARCHAR(500) NOT NULL,
  client_codi         VARCHAR(20),                  -- Ref aurora_clients.codi
  pressupost_codi     VARCHAR(20),
  factura_codi        VARCHAR(20),
  modalitat           VARCHAR(100),
  servei              VARCHAR(100),
  es_direct           TINYINT(1) DEFAULT 0,

  -- Estat: màquina d'estats de la TypeScript app
  estat               ENUM(
                        'esborrany',
                        'planificat',
                        'rodatge',
                        'edicio',
                        'esperant_feedback',
                        'revisio',
                        'acabat',
                        'facturat'
                      ) NOT NULL DEFAULT 'esborrany',

  -- Dates principals (les primeres de datesRodatge/datesEntrega o les legacy)
  data_inici          DATE,
  data_entrega        DATE,
  data_finalitzacio   DATE,

  -- Financers — camps indexats per al dashboard
  ingres_sense_iva    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  iva                 DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ingres_amb_iva      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gastos_materials    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gastos_humans       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gastos_totals       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  benefici            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  percent_benefici    DECIMAL(8,2)  NOT NULL DEFAULT 0.00,

  -- Control
  facturat            TINYINT(1) NOT NULL DEFAULT 0,
  arxivat             TINYINT(1) NOT NULL DEFAULT 0,

  -- Objecte complet TypeScript serialitzat:
  -- inclou recursosHumans, materials, tasques, datesRodatge, datesEntrega,
  -- historial, feedback, documents (sense PDFs pesants), avisFacturacio
  -- Nota: imatgeReferencia (base64) s'inclou aquí, pot ser gran
  dades_json          LONGTEXT NOT NULL,

  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_estat (estat),
  INDEX idx_client (client_codi),
  INDEX idx_facturat (facturat),
  INDEX idx_arxivat (arxivat),
  INDEX idx_data_inici (data_inici),
  INDEX idx_data_entrega (data_entrega),
  INDEX idx_ingres (ingres_sense_iva),
  INDEX idx_benefici (benefici)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Taula auxiliar per a les dates de rodatge (per al dashboard "propers rodatges")
-- Permet consultes eficients sense parsear JSON
CREATE TABLE IF NOT EXISTS aurora_projectes_dates_rodatge (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  projecte_codi   VARCHAR(20) NOT NULL,
  data_id         VARCHAR(50) NOT NULL,             -- id intern de DataRodatge
  data            DATE NOT NULL,
  hora            VARCHAR(10),
  nota            TEXT,
  FOREIGN KEY (projecte_codi) REFERENCES aurora_projectes(codi) ON DELETE CASCADE,
  INDEX idx_projecte (projecte_codi),
  INDEX idx_data (data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Taula auxiliar per a les dates d'entrega
CREATE TABLE IF NOT EXISTS aurora_projectes_dates_entrega (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  projecte_codi   VARCHAR(20) NOT NULL,
  data_id         VARCHAR(50) NOT NULL,
  data            DATE NOT NULL,
  nota            TEXT,
  entregada       TINYINT(1) DEFAULT 0,
  FOREIGN KEY (projecte_codi) REFERENCES aurora_projectes(codi) ON DELETE CASCADE,
  INDEX idx_projecte (projecte_codi),
  INDEX idx_data (data),
  INDEX idx_entregada (entregada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- FACTURES DE VENDA
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_factures_venda (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codi                VARCHAR(20) NOT NULL UNIQUE,  -- FAV-00001
  tipus               ENUM('normal','rectificativa') NOT NULL DEFAULT 'normal',
  factura_rectificada VARCHAR(20),                  -- Ref si és rectificativa
  client_codi         VARCHAR(20),
  projecte_codi       VARCHAR(20),
  estat               ENUM(
                        'borrador',
                        'enviada',
                        'pagada-parcial',
                        'pagada',
                        'vencuda',
                        'cancelled'
                      ) NOT NULL DEFAULT 'borrador',
  data_factura        DATE,
  data_venciment      DATE,
  data_enviada        DATE,
  iva_percent         DECIMAL(5,2) DEFAULT 21.00,
  irpf_percent        DECIMAL(5,2) DEFAULT 0.00,
  base_imposable      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  iva_import          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  irpf_import         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_factura       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pagat         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pendent_cobrar      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  -- Objecte complet (tasques, pagaments, plantilles text, accions)
  -- Exclou documentPDF (base64 pot ser enorme) — no es mostra a la web
  dades_json          LONGTEXT NOT NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estat (estat),
  INDEX idx_client (client_codi),
  INDEX idx_projecte (projecte_codi),
  INDEX idx_data_factura (data_factura),
  INDEX idx_data_venciment (data_venciment),
  INDEX idx_pendent (pendent_cobrar),
  INDEX idx_tipus (tipus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- FACTURES DE COMPRA
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_factures_compra (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codi                VARCHAR(20) NOT NULL UNIQUE,  -- FAC-00001 / DG-00001
  tipus               ENUM('factura-compra','gasto-general') NOT NULL,
  proveidor_codi      VARCHAR(20),                  -- Null per a gastos generals
  num_factura_prov    VARCHAR(100),
  concepte            VARCHAR(500),
  estat               ENUM('pendent','pagada-parcial','pagada','vencuda') NOT NULL DEFAULT 'pendent',
  data_gasto          DATE,
  data_venciment      DATE,
  base_imposable      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  iva_percent         DECIMAL(5,2)  DEFAULT 21.00,
  iva_import          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  irpf_percent        DECIMAL(5,2)  DEFAULT 0.00,
  irpf_import         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_gasto         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pagat         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pendent_pagament    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  es_despesa_general  TINYINT(1) DEFAULT 0,
  -- Objecte complet (pagaments, projectes vinculats, notes)
  -- Exclou documentPDF (base64)
  dades_json          LONGTEXT NOT NULL,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estat (estat),
  INDEX idx_tipus (tipus),
  INDEX idx_proveidor (proveidor_codi),
  INDEX idx_data_gasto (data_gasto),
  INDEX idx_pendent (pendent_pagament)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- OBLIGACIONS FISCALS (separades de factures_compra)
-- =============================================================================

CREATE TABLE IF NOT EXISTS aurora_obligacions_fiscals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codi            VARCHAR(20) NOT NULL UNIQUE,      -- OF-00001
  subtipus        ENUM(
                    'cuota-autonomo',
                    'regularitzacio-ss',
                    'irpf-trimestral',
                    'irpf-anual',
                    'iva-trimestral',
                    'nomina-treballador'
                  ) NOT NULL,
  periode         VARCHAR(10),                      -- 'YYYY-MM' o 'YYYY-QN'
  concepte        VARCHAR(500),
  estat           ENUM('pendent','pagada-parcial','pagada','vencuda') NOT NULL DEFAULT 'pendent',
  data_gasto      DATE,
  total_gasto     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pagat     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pendent_pagament DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  dades_json      LONGTEXT NOT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subtipus (subtipus),
  INDEX idx_estat (estat),
  INDEX idx_periode (periode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- PARÀMETRES DEL SISTEMA
-- =============================================================================

-- Una sola fila amb la configuració completa (serveis, unitats, empresa, etc.)
CREATE TABLE IF NOT EXISTS aurora_parametres (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  clau            VARCHAR(50) NOT NULL UNIQUE,      -- 'dadesEmpresa', 'serveis', etc.
  valor_json      LONGTEXT NOT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VISTES per al DASHBOARD (faciliten les queries PHP)
-- =============================================================================

-- KPI: Resum financer de projectes no arxivats
CREATE OR REPLACE VIEW aurora_v_dashboard_projectes AS
SELECT
  estat,
  COUNT(*)                        AS total,
  SUM(ingres_sense_iva)           AS total_ingres,
  SUM(gastos_totals)              AS total_gastos,
  SUM(benefici)                   AS total_benefici,
  AVG(percent_benefici)           AS avg_marge
FROM aurora_projectes
WHERE arxivat = 0
GROUP BY estat;

-- KPI: Factures de venda pendents de cobrar
CREATE OR REPLACE VIEW aurora_v_factures_pendent_cobrar AS
SELECT
  codi,
  client_codi,
  estat,
  data_factura,
  data_venciment,
  total_factura,
  pendent_cobrar
FROM aurora_factures_venda
WHERE estat IN ('enviada', 'pagada-parcial', 'vencuda')
  AND pendent_cobrar > 0
ORDER BY data_venciment ASC;

-- KPI: Rodatges propers (30 dies)
CREATE OR REPLACE VIEW aurora_v_propers_rodatges AS
SELECT
  dr.data,
  dr.hora,
  dr.nota,
  p.codi        AS projecte_codi,
  p.titol       AS projecte_titol,
  p.estat       AS projecte_estat,
  p.client_codi
FROM aurora_projectes_dates_rodatge dr
JOIN aurora_projectes p ON p.codi = dr.projecte_codi
WHERE dr.data >= CURDATE()
  AND dr.data <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  AND p.arxivat = 0
ORDER BY dr.data ASC, dr.hora ASC;

-- =============================================================================
-- DADES INICIALS: usuari admin per defecte
-- La contrasenya s'ha de canviar des del panell web en el primer accés
-- Hash bcrypt de 'aurora2024' — CANVIAR IMMEDIATAMENT
-- =============================================================================

INSERT IGNORE INTO aurora_users (username, password_hash, nom, rol)
VALUES ('admin', '$2y$12$placeholderHashCanviarAviatXXXXXXXXXXXXXXXXXXXXXXXX', 'Administrador', 'admin');

INSERT IGNORE INTO aurora_sync_log (entitat, total_registres, synced_at)
VALUES
  ('clients',             0, NOW()),
  ('proveidors',          0, NOW()),
  ('projectes',           0, NOW()),
  ('factures_venda',      0, NOW()),
  ('factures_compra',     0, NOW()),
  ('obligacions_fiscals', 0, NOW()),
  ('parametres',          0, NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- FI DE L'ESQUEMA
-- =============================================================================
