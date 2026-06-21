-- ============================================================
-- DTS —  Document Tracking System
-- Database Schema
-- Run this in phpMyAdmin or any MySQL client
-- ============================================================

CREATE DATABASE IF NOT EXISTS edts_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edts_db;

-- ─────────────────────────────────────────
-- Table 1: users
-- ─────────────────────────────────────────
CREATE TABLE users (
    id            INT UNSIGNED          NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)          NOT NULL,
    email         VARCHAR(150)          NOT NULL UNIQUE,
    password_hash VARCHAR(255)          NOT NULL,
    role          ENUM('Admin','Staff') NOT NULL DEFAULT 'Staff',
    department    VARCHAR(100)          NOT NULL,
    created_at    DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- Table 2: documents
-- ─────────────────────────────────────────
CREATE TABLE documents (
    id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    tracking_code         VARCHAR(20)   NOT NULL UNIQUE,
    title                 VARCHAR(200)  NOT NULL,
    description           TEXT,
    type                  VARCHAR(100)  NOT NULL,
    status                ENUM('Created','In Transit','Received','Completed')
                                        NOT NULL DEFAULT 'Created',
    current_location_dept VARCHAR(100)  NOT NULL,
    created_by            INT UNSIGNED  NOT NULL,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_doc_creator FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- Table 3: document_logs (immutable audit trail)
-- ─────────────────────────────────────────
CREATE TABLE document_logs (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    document_id          INT UNSIGNED NOT NULL,
    action_taken         VARCHAR(255) NOT NULL,
    from_department      VARCHAR(100) NULL,
    to_department        VARCHAR(100) NULL,
    performed_by_user_id INT UNSIGNED NOT NULL,
    timestamp            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_log_document FOREIGN KEY (document_id)
        REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (performed_by_user_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Add super_admin role to users table
ALTER TABLE users 
MODIFY COLUMN role ENUM('Super Admin', 'Admin', 'Staff') NOT NULL DEFAULT 'Staff';

-- Add is_active column for account management
ALTER TABLE users
ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER department;

-- Password is: superadmin123 (bcrypt hash)
INSERT INTO users (full_name, email, password_hash, role, department, is_active)
VALUES (
  'Super Administrator',
  'superadmin@gmail.com',
  '$2b$12$GX6S3sMqMrzgHlAVKSvFdO9tvSCCJnCqauLDiRBBbHMUbPMkZJbLi',
  'Super Admin',
  'Administration',
  1
);

UPDATE users 
SET 
  email = 'superadmin@gmail.com',
  password_hash = '$2b$12$8.nBqWieZuMwrom4fYN37OpB4BSEqNotr7UCQP/7Yrf7dKNV4Krxq',
  role = 'Super Admin',
  is_active = 1
WHERE id = 1;

UPDATE users 
SET department = 'System Administrator'
WHERE role = 'Super Admin';

-- Departments table (managed by Super Admin)
CREATE TABLE departments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Seed default departments
INSERT INTO departments (name) VALUES
  ('Registrar'),
  ('Finance'),
  ('HR'),
  ('IT'),
  ('Academic Affairs'),
  ('Student Affairs'),
  ('Research'),
  ('Procurement'),
  ('Administration'),
  ('System Administrator');

  -- System activity logs table
CREATE TABLE system_logs (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NULL,
  action      VARCHAR(100)  NOT NULL,
  description TEXT          NOT NULL,
  ip_address  VARCHAR(45)   NULL,
  status      ENUM('success','warning','error') NOT NULL DEFAULT 'success',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_syslog_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Archive support for departments
ALTER TABLE departments
ADD COLUMN is_archived TINYINT(1)   NOT NULL DEFAULT 0 AFTER name,
ADD COLUMN archived_at DATETIME     NULL,
ADD COLUMN archived_by INT UNSIGNED NULL,
ADD CONSTRAINT fk_dept_archived_by FOREIGN KEY (archived_by)
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE users
MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER is_active;

-- Explicitly approve your Super Admin if they are already in the DB
UPDATE users 
SET approval_status = 'approved', is_active = 1 
WHERE role = 'Super Admin';

-- Optional: If you want existing Staff/Admins to remain active during this migration
UPDATE users 
SET approval_status = 'approved' 
WHERE is_active = 1;
  
CREATE TABLE document_attachments (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  document_id INT UNSIGNED  NOT NULL,
  file_name   VARCHAR(255)  NOT NULL,
  file_path   VARCHAR(500)  NOT NULL,
  file_type   VARCHAR(100)  NOT NULL,
  file_size   INT UNSIGNED  NOT NULL,
  uploaded_by INT UNSIGNED  NOT NULL,
  uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_attach_document FOREIGN KEY (document_id)
    REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attach_user FOREIGN KEY (uploaded_by)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Add fields to documents table
ALTER TABLE documents
ADD COLUMN due_date       DATE         NULL              AFTER description,
ADD COLUMN urgency        ENUM('Normal','Urgent','Highly Urgent') NOT NULL DEFAULT 'Normal' AFTER due_date,
ADD COLUMN dest_department VARCHAR(100) NULL             AFTER urgency,
ADD COLUMN document_kind  VARCHAR(100) NOT NULL DEFAULT 'General' AFTER type;

-- Add remarks + specific user to document_logs
ALTER TABLE document_logs
ADD COLUMN remarks    TEXT         NULL AFTER to_department,
ADD COLUMN to_user_id INT UNSIGNED NULL AFTER remarks,
ADD CONSTRAINT fk_log_to_user FOREIGN KEY (to_user_id)
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Multi-department recipients table
CREATE TABLE document_recipients (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id  INT UNSIGNED NOT NULL,
  department   VARCHAR(100) NOT NULL,
  user_id      INT UNSIGNED NULL,
  status       ENUM('Pending','Received','Rejected') NOT NULL DEFAULT 'Pending',
  remarks      TEXT         NULL,
  notified_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME     NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_recv_doc  FOREIGN KEY (document_id)
    REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_recv_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_types (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME NULL DEFAULT NULL,
    archived_by INT NULL DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Optional: Insert default document types
INSERT INTO document_types (name) VALUES 
('Memorandum'), 
('Letter'), 
('Resolution'), 
('Special Order');
