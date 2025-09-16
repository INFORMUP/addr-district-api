#!/usr/bin/env node

// Production database initialization script
// Run this after creating RDS instance to set up schema and load data

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

async function initializeDatabase() {
    console.log('🗄️  Initializing production database...');

    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false // Required for RDS
        }
    });

    try {
        // Connect to database
        console.log('📡 Connecting to RDS...');
        await client.connect();
        console.log('✅ Connected to database');

        // Read and execute schema
        console.log('📋 Creating database schema...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
        await client.query(schemaSQL);
        console.log('✅ Schema created');

        // Check if data exists
        const result = await client.query('SELECT COUNT(*) FROM municipalities');
        const recordCount = parseInt(result.rows[0].count);

        if (recordCount === 0) {
            console.log('📥 Database is empty, loading data...');
            console.log('⚠️  This may take 5-10 minutes...');

            // Run ETL script
            const ETLService = require('../scripts/etl');
            const etl = new ETLService();
            await etl.runFullETL();

            console.log('✅ Data loaded successfully');
        } else {
            console.log(`✅ Database already has ${recordCount} municipality records`);
        }

        // Verify installation
        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM county_council) as county_districts,
                (SELECT COUNT(*) FROM pgh_council) as city_districts,
                (SELECT COUNT(*) FROM school_districts) as school_districts,
                (SELECT COUNT(*) FROM school_board_districts) as school_board_districts,
                (SELECT COUNT(*) FROM municipalities) as municipalities
        `);

        console.log('\n📊 Database Statistics:');
        console.log(`  County Council Districts: ${stats.rows[0].county_districts}`);
        console.log(`  City Council Districts: ${stats.rows[0].city_districts}`);
        console.log(`  School Districts: ${stats.rows[0].school_districts}`);
        console.log(`  School Board Districts: ${stats.rows[0].school_board_districts}`);
        console.log(`  Municipalities: ${stats.rows[0].municipalities}`);

        console.log('\n🎉 Production database initialized successfully!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('\n✅ Initialization complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;