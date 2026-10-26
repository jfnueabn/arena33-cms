-- Arena33 CMS schema (MySQL 8 / MariaDB 10.4+)

CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site-wide key/value settings: SEO meta, brand colours, analytics ID...
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(64) PRIMARY KEY,
  setting_value TEXT        NOT NULL,
  updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per homepage section. Shared fields are columns; the
-- section-specific shape (cards, plans, FAQ items...) lives in `content` JSON.
CREATE TABLE IF NOT EXISTS sections (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(40)  NOT NULL UNIQUE,
  name        VARCHAR(80)  NOT NULL,
  eyebrow     VARCHAR(120) NOT NULL DEFAULT '',
  title       VARCHAR(255) NOT NULL DEFAULT '',
  subtitle    TEXT         NULL,
  content     JSON         NOT NULL,
  is_visible  TINYINT(1)   NOT NULL DEFAULT 1,
  is_fixed    TINYINT(1)   NOT NULL DEFAULT 0,  -- header/footer: always rendered, not reorderable
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_by  INT UNSIGNED NULL,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sections_admin FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snapshot of a section taken before each save, so edits can be undone.
CREATE TABLE IF NOT EXISTS section_revisions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(40)  NOT NULL,
  snapshot    JSON         NOT NULL,
  admin_id    INT UNSIGNED NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rev_section (section_key, created_at),
  CONSTRAINT fk_rev_section FOREIGN KEY (section_key) REFERENCES sections(section_key) ON DELETE CASCADE,
  CONSTRAINT fk_rev_admin   FOREIGN KEY (admin_id)    REFERENCES admins(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
