const fs = require('fs');
const path = require('path');
const db = require('../src/database/connection');

async function setupDatabase() {
  console.log('Setting up database schema...');

  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '..', 'sql', 'schema.sql'),
      'utf8'
    );

    console.log('Creating tables and indexes...');
    await db.query(schemaSQL);
    console.log('✓ Schema created successfully');

    const functionsSQL = fs.readFileSync(
      path.join(__dirname, '..', 'sql', 'functions.sql'),
      'utf8'
    );

    console.log('Creating functions...');
    await db.query(functionsSQL);
    console.log('✓ Functions created successfully');

    console.log('\nDatabase setup completed!');
    console.log('Next step: Run ETL to load data with: npm run etl');

  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };