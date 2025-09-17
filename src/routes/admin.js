const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../database/connection');

const router = express.Router();

// Initialize database schema and load data
router.post('/init-db', async (req, res) => {
  try {
    console.log('Starting database initialization...');

    // 1. Create tables from schema
    const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database schema...');
    try {
      await db.query(schema);
      console.log('✓ Schema created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Schema already exists, skipping creation');
      } else {
        throw error;
      }
    }

    // 2. Check if data already exists
    const existingData = await db.query('SELECT COUNT(*) FROM municipalities');
    const recordCount = parseInt(existingData.rows[0].count);

    if (recordCount > 0) {
      return res.json({
        success: true,
        message: `Database already initialized with ${recordCount} municipality records`,
        skipped: true
      });
    }

    // 3. Load boundary data using optimized ETL service
    console.log('Loading boundary data with optimized ETL...');
    const OptimizedETLService = require('../../scripts/etl-optimized');
    const etl = new OptimizedETLService();

    // Run the ETL process
    await etl.runFullETL();

    // 4. Verify data was loaded
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM county_council) as county_districts,
        (SELECT COUNT(*) FROM pgh_council) as city_districts,
        (SELECT COUNT(*) FROM school_districts) as school_districts,
        (SELECT COUNT(*) FROM school_board_districts) as school_board_districts,
        (SELECT COUNT(*) FROM municipalities) as municipalities,
        (SELECT COUNT(*) FROM pgh_wards) as wards
    `);

    const counts = stats.rows[0];

    console.log('✓ Database initialization completed successfully');

    res.json({
      success: true,
      message: 'Database initialized successfully',
      data_loaded: {
        county_council_districts: parseInt(counts.county_districts),
        city_council_districts: parseInt(counts.city_districts),
        school_districts: parseInt(counts.school_districts),
        school_board_districts: parseInt(counts.school_board_districts),
        municipalities: parseInt(counts.municipalities),
        wards: parseInt(counts.wards)
      }
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      message: error.message
    });
  }
});

// Initialize single dataset
router.post('/init-dataset/:dataset', async (req, res) => {
  try {
    const dataset = req.params.dataset;
    console.log(`Starting initialization of dataset: ${dataset}`);

    // 1. Create tables from schema if needed
    const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Ensuring database schema exists...');
    try {
      await db.query(schema);
      console.log('✓ Schema ready');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Schema already exists');
      } else {
        throw error;
      }
    }

    // 2. Initialize single dataset with optimized ETL service
    console.log(`Loading ${dataset} data with optimized ETL...`);
    const OptimizedETLService = require('../../scripts/etl-optimized');
    const etl = new OptimizedETLService();

    // Run single dataset
    await etl.runSingleDataset(dataset);

    // 3. Verify data was loaded
    const stats = await db.query(`SELECT COUNT(*) as count FROM ${dataset}`);
    const count = parseInt(stats.rows[0].count);

    console.log(`✓ Dataset ${dataset} initialization completed successfully`);

    res.json({
      success: true,
      message: `Dataset ${dataset} initialized successfully`,
      records_loaded: count
    });

  } catch (error) {
    console.error(`Dataset ${req.params.dataset} initialization failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Dataset initialization failed',
      message: error.message,
      dataset: req.params.dataset
    });
  }
});

// Check database status
router.get('/db-status', async (req, res) => {
  try {
    // Check if tables exist and have data
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM county_council) as county_districts,
        (SELECT COUNT(*) FROM pgh_council) as city_districts,
        (SELECT COUNT(*) FROM school_districts) as school_districts,
        (SELECT COUNT(*) FROM school_board_districts) as school_board_districts,
        (SELECT COUNT(*) FROM municipalities) as municipalities,
        (SELECT COUNT(*) FROM pgh_wards) as wards
    `);

    const counts = stats.rows[0];
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + parseInt(count), 0);

    res.json({
      initialized: totalRecords > 0,
      data_counts: {
        county_council_districts: parseInt(counts.county_districts),
        city_council_districts: parseInt(counts.city_districts),
        school_districts: parseInt(counts.school_districts),
        school_board_districts: parseInt(counts.school_board_districts),
        municipalities: parseInt(counts.municipalities),
        wards: parseInt(counts.wards)
      },
      total_records: totalRecords
    });

  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({
      initialized: false,
      error: 'Failed to check database status',
      message: error.message
    });
  }
});

// Test endpoint to just download a dataset
router.get('/test-download/:dataset', async (req, res) => {
  try {
    const dataset = req.params.dataset;
    console.log(`Testing download of dataset: ${dataset}`);

    const OptimizedETLService = require('../../scripts/etl-optimized');
    const etl = new OptimizedETLService();

    const WPRDC_DATASETS = {
      county_council: {
        url: 'https://data.wprdc.org/dataset/73eb573e-cc12-4f29-8e69-17f7975c89cb/resource/501b2f84-ac1c-40a3-8099-e4e431f993df/download/council.geojson',
        format: 'geojson',
        table: 'county_council',
        description: 'Allegheny County Council Districts'
      },
      municipalities: {
        url: 'https://data.wprdc.org/dataset/2fa577d6-1a6b-46a8-8165-27fecac1dee5/resource/b0cb0249-d1ba-45b7-9918-dc86fa8af04c/download/muni_boundaries.geojson',
        format: 'geojson',
        table: 'municipalities',
        description: 'Allegheny County Municipalities'
      }
    };

    if (!WPRDC_DATASETS[dataset]) {
      return res.status(400).json({ error: 'Dataset not found' });
    }

    // Just try downloading
    const filepath = await etl.downloadDataset(dataset, WPRDC_DATASETS[dataset]);

    console.log(`✓ Downloaded ${dataset} successfully to ${filepath}`);

    res.json({
      success: true,
      message: `Successfully downloaded ${dataset}`,
      filepath: filepath
    });

  } catch (error) {
    console.error(`Download test failed for ${req.params.dataset}:`, error);
    res.status(500).json({
      success: false,
      error: 'Download test failed',
      message: error.message,
      dataset: req.params.dataset
    });
  }
});

// Initialize database using local data files only (no downloads)
router.post('/init-db-local', async (req, res) => {
  try {
    console.log('Starting local database initialization...');

    // 1. Create tables from schema if needed
    const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database schema...');
    try {
      await db.query(schema);
      console.log('✓ Schema created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Schema already exists, skipping creation');
      } else {
        throw error;
      }
    }

    // 2. Check if data already exists
    const existingData = await db.query('SELECT COUNT(*) FROM municipalities');
    const recordCount = parseInt(existingData.rows[0].count);

    if (recordCount > 0) {
      return res.json({
        success: true,
        message: `Database already initialized with ${recordCount} municipality records`,
        skipped: true
      });
    }

    // 3. Load boundary data using local-only ETL service
    console.log('Loading boundary data from local files...');
    const LocalETLService = require('../../scripts/etl-local-only');
    const etl = new LocalETLService();

    // Run the local ETL process
    await etl.runFullETL();

    // 4. Verify data was loaded
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM county_council) as county_districts,
        (SELECT COUNT(*) FROM pgh_council) as city_districts,
        (SELECT COUNT(*) FROM school_districts) as school_districts,
        (SELECT COUNT(*) FROM school_board_districts) as school_board_districts,
        (SELECT COUNT(*) FROM municipalities) as municipalities,
        (SELECT COUNT(*) FROM pgh_wards) as wards
    `);

    const counts = stats.rows[0];

    console.log('✓ Local database initialization completed successfully');

    res.json({
      success: true,
      message: 'Database initialized successfully using local data',
      data_loaded: {
        county_council_districts: parseInt(counts.county_districts),
        city_council_districts: parseInt(counts.city_districts),
        school_districts: parseInt(counts.school_districts),
        school_board_districts: parseInt(counts.school_board_districts),
        municipalities: parseInt(counts.municipalities),
        wards: parseInt(counts.wards)
      }
    });

  } catch (error) {
    console.error('Local database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Local database initialization failed',
      message: error.message
    });
  }
});

module.exports = router;