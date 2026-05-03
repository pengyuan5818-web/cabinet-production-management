-- Migration: 009_system_audit_fix.sql
-- Date: 2026-04-26
-- Desc: 系统审查修复（字段类型规范化、冗余路径清理）
BEGIN;

-- 1. supplier 表添加 evaluation_date 字段
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS evaluation_date DATE;

-- 2. 创建 ENUM 类型（如果不存在）
DO $$ BEGIN
    CREATE TYPE receivable_status_enum AS ENUM ('unpaid','paid','overdue','bad_debt','cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payable_status_enum AS ENUM ('unpaid','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status_enum AS ENUM ('unissued','issued','void');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fund_flow_direction_enum AS ENUM ('income','expense');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. 将字段类型改为 TEXT（兼容所有状态值）
ALTER TABLE receivable ALTER COLUMN status TYPE TEXT;
ALTER TABLE payable ALTER COLUMN status TYPE TEXT;
ALTER TABLE invoice ALTER COLUMN status TYPE TEXT;
ALTER TABLE fund_flow ALTER COLUMN flow_type TYPE TEXT;

COMMIT;
