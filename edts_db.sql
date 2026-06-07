-- ============================================================
-- EDTS — Enterprise Document Tracking System
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
