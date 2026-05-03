/**
 * 迁移：007_scheduling
 * 智能生产排程支持
 *
 * 执行方式：node src/migrations/007_scheduling.js
 */
const db = require('../db');

async function up() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── 1. production_stage 增加预估工时 ─────────────────────────────
    await client.query(`
      ALTER TABLE production_stage
        ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2) DEFAULT 4,
        ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 50;
    `);
    // 回填默认工时（基于阶段）
    const hoursMap = {
      order_confirmed: 0.5, design_confirmed: 4, material_prepared: 2,
      cutting: 3, bending: 4, welding: 6, polishing: 3,
      edge_banding: 2, drilling: 2, assembly: 8,
      countertop_production: 6, countertop_quality: 1,
      door_panel_production: 8, door_panel_quality: 1,
      quality_check: 2, packaging: 2, warehouse_out: 1,
      logistics_shipped: 0.5, installation: 8, completed: 0.5
    };
    for (const [stage, hours] of Object.entries(hoursMap)) {
      await client.query(
        `UPDATE production_stage SET estimated_hours = $1 WHERE stage = $2`,
        [hours, stage]
      );
    }
    console.log('✓ production_stage.estimated_hours');

    // ── 2. order_master 增加 priority ─────────────────────────────────
    await client.query(`
      ALTER TABLE order_master
        ADD COLUMN IF NOT EXISTS priority INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20) DEFAULT 'unscheduled';
    `);
    // 回填预估工时：默认按台面尺寸估算
    await client.query(`
      UPDATE order_master SET
        estimated_hours = 40,
        priority = 5
      WHERE estimated_hours IS NULL
    `);
    console.log('✓ order_master.priority + estimated_hours + schedule_status');

    // ── 3. production_schedule 排程表 ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_schedule (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id        UUID REFERENCES order_master(id) ON DELETE CASCADE,
        stage           VARCHAR(50) REFERENCES production_stage(stage),
        scheduled_date  DATE NOT NULL,
        estimated_hours NUMERIC(6,2),
        actual_hours    NUMERIC(6,2),
        worker_id       UUID REFERENCES employee(id),
        worker_name     VARCHAR(100),
        status          VARCHAR(20) DEFAULT 'scheduled',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, stage)
      );
      CREATE INDEX IF NOT EXISTS idx_schedule_date ON production_schedule(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_schedule_order ON production_schedule(order_id);
    `);
    console.log('✓ production_schedule');

    // ── 4. production_calendar 工作日历表 ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_calendar (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_date     DATE NOT NULL UNIQUE,
        is_workday    BOOLEAN DEFAULT TRUE,
        capacity_pct  INT DEFAULT 100,
        remark        VARCHAR(200)
      );
    `);
    console.log('✓ production_calendar');

    // 初始化：未来30天设为工作日
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = d.getDay();
      const isWorkday = dayOfWeek !== 0 && dayOfWeek !== 6;
      const dateStr = d.toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO production_calendar (work_date, is_workday, capacity_pct)
         VALUES ($1, $2, $3) ON CONFLICT (work_date) DO NOTHING`,
        [dateStr, isWorkday, isWorkday ? 100 : 0]
      );
    }
    console.log('✓ production_calendar 初始化30天');

    // ── 5. order_installation 安装记录表 ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_installation (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id         UUID REFERENCES order_master(id),
        order_no         VARCHAR(50),
        scheduled_date   DATE,
        installer_id     UUID,
        installer_name   VARCHAR(100),
        address          VARCHAR(300),
        contact_phone    VARCHAR(30),
        status           VARCHAR(20) DEFAULT 'scheduled',
        completed_at     TIMESTAMP,
        installation_result TEXT,
        remark           TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ order_installation');

    // ── 6. order_delivery 交付记录表 ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_delivery (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id         UUID REFERENCES order_master(id),
        order_no         VARCHAR(50),
        signed_by        VARCHAR(100),
        signature_url     VARCHAR(500),
        delivery_photos  JSONB,
        delivered_at     TIMESTAMP,
        remark           TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ order_delivery');

    await client.query('COMMIT');
    console.log('\n✅ 迁移 007 完成');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS order_delivery CASCADE');
    await client.query('DROP TABLE IF EXISTS order_installation CASCADE');
    await client.query('DROP TABLE IF EXISTS production_calendar CASCADE');
    await client.query('DROP TABLE IF EXISTS production_schedule CASCADE');
    await client.query(`
      ALTER TABLE order_master
        DROP COLUMN IF EXISTS priority,
        DROP COLUMN IF EXISTS estimated_hours,
        DROP COLUMN IF EXISTS schedule_status;
    `);
    await client.query(`
      ALTER TABLE production_stage
        DROP COLUMN IF EXISTS estimated_hours,
        DROP COLUMN IF EXISTS daily_capacity;
    `);
    await client.query('COMMIT');
    console.log('✅ 回滚 007 完成');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
