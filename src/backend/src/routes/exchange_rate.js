/**
 * 汇率管理 API
 * POST /api/exchange-rates/convert  — 金额币种换算
 * GET  /api/exchange-rates/          — 获取所有可用货币
 * GET  /api/exchange-rates/:currency — 获取指定货币汇率
 * PUT  /api/exchange-rates/:currency — 更新汇率
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有汇率
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT currency, currency_name, symbol, rate_to_cny, is_active, updated_at
       FROM exchange_rates ORDER BY rate_to_cny ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// 获取指定货币汇率
router.get('/:currency', async (req, res, next) => {
  try {
    const { currency } = req.params;
    const result = await db.query(
      `SELECT currency, currency_name, symbol, rate_to_cny, is_active, updated_at
       FROM exchange_rates WHERE currency = $1`,
      [currency.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '货币不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// 更新汇率
router.put('/:currency', async (req, res, next) => {
  try {
    const { currency } = req.params;
    const { rate_to_cny, is_active } = req.body;
    if (rate_to_cny === undefined || is_active === undefined) {
      return res.status(400).json({ success: false, message: 'rate_to_cny 和 is_active 必填' });
    }
    const result = await db.query(
      `UPDATE exchange_rates
       SET rate_to_cny = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP
       WHERE currency = $3
       RETURNING currency, currency_name, symbol, rate_to_cny, is_active, updated_at`,
      [rate_to_cny, is_active, currency.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '货币不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// 金额换算（通用接口，供其他模块调用）
// POST /api/exchange-rates/convert
// body: { amount, from_currency, to_currency }
router.post('/convert', async (req, res, next) => {
  try {
    const { amount, from_currency, to_currency } = req.body;
    if (amount === undefined || !from_currency || !to_currency) {
      return res.status(400).json({ success: false, message: 'amount、from_currency、to_currency 必填' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ success: false, message: 'amount 必须是数字' });
    }
    if (from_currency === to_currency) {
      return res.json({ success: true, original: numAmount, converted: numAmount, rate: 1, from_currency, to_currency });
    }
    // 查 from_currency 汇率
    const fromRow = await db.query(
      `SELECT rate_to_cny FROM exchange_rates WHERE currency = $1 AND is_active = TRUE`,
      [from_currency.toUpperCase()]
    );
    const toRow = await db.query(
      `SELECT rate_to_cny FROM exchange_rates WHERE currency = $1 AND is_active = TRUE`,
      [to_currency.toUpperCase()]
    );
    if (fromRow.rows.length === 0) {
      return res.status(404).json({ success: false, message: `货币 ${from_currency} 不存在或已禁用` });
    }
    if (toRow.rows.length === 0) {
      return res.status(404).json({ success: false, message: `货币 ${to_currency} 不存在或已禁用` });
    }
    const fromRate = parseFloat(fromRow.rows[0].rate_to_cny);
    const toRate = parseFloat(toRow.rows[0].rate_to_cny);
    // 折算：先转CNY，再转目标货币
    const inCNY = numAmount * fromRate;
    const converted = inCNY / toRate;
    const rate = fromRate / toRate;
    res.json({
      success: true,
      original: numAmount,
      converted: Math.round(converted * 100) / 100,
      rate: Math.round(rate * 1000000) / 1000000,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
