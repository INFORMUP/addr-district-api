const db = require('../src/database/connection');

async function verifyData() {
  console.log('Verifying loaded data...\n');

  const tables = [
    'county_council',
    'pgh_council',
    'school_districts',
    'pgh_wards',
    'municipalities'
  ];

  try {
    for (const table of tables) {
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);

      if (count > 0) {
        console.log(`✓ ${table}: ${count} records`);

        const sampleResult = await db.query(`
          SELECT * FROM ${table}
          WHERE geom IS NOT NULL
          LIMIT 1
        `);

        if (sampleResult.rows.length > 0) {
          console.log(`  - Sample record has geometry: ✓`);
        } else {
          console.log(`  - Warning: No records with geometry found`);
        }
      } else {
        console.log(`✗ ${table}: No records found`);
      }
    }

    console.log('\nTesting lookup function...');

    const testLat = 40.4406;
    const testLon = -79.9959;
    console.log(`Testing with coordinates: ${testLat}, ${testLon} (Downtown Pittsburgh)`);

    const lookupResult = await db.query(
      'SELECT * FROM lookup_districts_for_point($1, $2)',
      [testLon, testLat]
    );

    if (lookupResult.rows.length > 0) {
      const result = lookupResult.rows[0];
      console.log('✓ Lookup function working');
      console.log(`  Municipality: ${result.municipality}`);
      console.log(`  County Council District: ${result.county_council_district}`);
      console.log(`  City Council District: ${result.city_council_district}`);
      console.log(`  School District: ${result.school_district}`);
      console.log(`  Ward: ${result.ward}`);
    } else {
      console.log('✗ Lookup function returned no results');
    }

    console.log('\n✓ Data verification completed');

  } catch (error) {
    console.error('Data verification failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  verifyData();
}

module.exports = { verifyData };