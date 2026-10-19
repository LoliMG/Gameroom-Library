-- ====================================================================
-- DATABASE SCHEMA: bookroom.sqlite
-- ====================================================================

-- -----------------------------------------------------
-- Table: books (Rows: 180)
-- -----------------------------------------------------
CREATE TABLE books (
  isbn TEXT PRIMARY KEY,
  title TEXT,
  author TEXT,
  publisher TEXT,
  pages INTEGER,
  saga TEXT,
  saga_index INTEGER,
  format TEXT DEFAULT 'book'
);

-- -----------------------------------------------------
-- Table: book_state (Rows: 180)
-- -----------------------------------------------------
CREATE TABLE book_state (
  isbn TEXT PRIMARY KEY REFERENCES books(isbn) ON DELETE CASCADE,
  reading_status TEXT NOT NULL DEFAULT 'unread' CHECK (reading_status IN ('finished', 'reading', 'unread')),
  flipped INTEGER NOT NULL DEFAULT 0 CHECK (flipped IN (0, 1)),
  -- Sitio en la estantería (pared, módulo, balda y centro X); NULL = colocación por defecto
  wall TEXT,
  module INTEGER,
  shelf INTEGER,
  x REAL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
