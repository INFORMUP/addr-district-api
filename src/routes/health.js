const express = require('express');
const router = express.Router();
const db = require('../database/connection');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as timestamp');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      database_time: result.rows[0].timestamp
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;