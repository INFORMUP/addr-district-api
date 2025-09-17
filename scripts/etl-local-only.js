const fs = require('fs');
const path = require('path');

const LOCAL_DATASETS = {
  county_council: {
    localFile: 'council.geojson',
    table: 'county_council',
    description: 'Allegheny County Council Districts'
  },
  pgh_council: {
    localFile: 'council_districts_2022.geojson',
    table: 'pgh_council',
    description: 'Pittsburgh City Council Districts'
  },
  school_districts: {
    localFile: 'school_districts.geojson',
    table: 'school_districts',
    description: 'Allegheny County School Districts'
  },
  pgh_wards: {
    localFile: 'wards.geojson',
    table: 'pgh_wards',
    description: 'Pittsburgh Wards'
  },
  municipalities: {
    localFile: 'muni_boundaries.geojson',
    table: 'municipalities',
    description: 'Allegheny County Municipalities'
  },
  school_board_districts: {
    localFile: 'SchoolDistricts2022.geojson',
    table: 'school_board_districts',
    description: 'Pittsburgh School Board Districts'
  }
};

class LocalETLService {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.BATCH_SIZE = 10; // Process 10 features at a time
  }

  async loadDataToPostGIS(key, dataset) {
    const filepath = path.join(this.dataDir, dataset.localFile);

    console.log(`Loading ${dataset.description} from local file...`);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Local file ${dataset.localFile} not found in ${this.dataDir}`);
    }

    const db = require('../src/database/connection');

    try {
      // Read the GeoJSON file
      console.log(`Reading ${filepath}...`);
      const geojsonData = fs.readFileSync(filepath, 'utf8');
      const geojson = JSON.parse(geojsonData);
      const features = geojson.features;

      console.log(`Processing ${features.length} features in batches of ${this.BATCH_SIZE}...`);

      // Clear existing data
      await db.query(`DELETE FROM ${dataset.table}`);
      console.log(`Cleared existing data from ${dataset.table}`);

      // Process features in batches
      for (let i = 0; i < features.length; i += this.BATCH_SIZE) {
        const batch = features.slice(i, Math.min(i + this.BATCH_SIZE, features.length));

        // Use a transaction for each batch
        const client = await db.getClient();
        try {
          await client.query('BEGIN');

          for (const feature of batch) {
            const properties = feature.properties;
            const geometry = feature.geometry;

            let insertQuery;
            let values;

            if (dataset.table === 'county_council') {
              insertQuery = `
                INSERT INTO county_council (district, name, member, geom)
                VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 2272)))
              `;
              values = [
                properties.District || properties.district,
                properties.LABEL || properties.label || properties.name,
                `${properties.CouncilRepFirst || ''} ${properties.CouncilRepLast || ''}`.trim() || null,
                JSON.stringify(geometry)
              ];
            } else if (dataset.table === 'pgh_council') {
              insertQuery = `
                INSERT INTO pgh_council (district, name, member, geom)
                VALUES ($1, $2, $3, ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), 2272)))
              `;
              values = [
                properties.DIST_ID || properties.district || properties.DISTRICT,
                properties.DIST_NAME || properties.name || properties.NAME || `District ${properties.DIST_ID || properties.district}`,
                properties.member || properties.MEMBER || null,
                JSON.stringify(geometry)
              ];
            } else if (dataset.table === 'school_districts') {
              insertQuery = `
                INSERT INTO school_districts (lea_code, name, superintendent, geom)
                VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 2272)))
              `;
              values = [
                properties.lea_code || properties.LEA_CODE || null,
                properties.SCHOOLD || properties.name || properties.NAME || properties.school_district,
                properties.superintendent || null,
                JSON.stringify(geometry)
              ];
            } else if (dataset.table === 'pgh_wards') {
              insertQuery = `
                INSERT INTO pgh_wards (ward, geom)
                VALUES ($1, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 2272)))
              `;
              values = [
                properties.ward || properties.WARD,
                JSON.stringify(geometry)
              ];
            } else if (dataset.table === 'municipalities') {
              insertQuery = `
                INSERT INTO municipalities (name, county, geom)
                VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 2272)))
              `;
              values = [
                properties.name || properties.NAME || properties.municipality,
                'Allegheny',
                JSON.stringify(geometry)
              ];
            } else if (dataset.table === 'school_board_districts') {
              insertQuery = `
                INSERT INTO school_board_districts (district, board_member, geom)
                VALUES ($1, $2, ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 2272)))
              `;
              values = [
                properties.District || properties.district,
                properties.Dir2022 || properties.board_member || null,
                JSON.stringify(geometry)
              ];
            }

            if (insertQuery && values) {
              await client.query(insertQuery, values);
            }
          }

          await client.query('COMMIT');
          console.log(`✓ Processed batch ${Math.floor(i/this.BATCH_SIZE) + 1}/${Math.ceil(features.length/this.BATCH_SIZE)}`);

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        // Small delay between batches to prevent overwhelming the database
        if (i + this.BATCH_SIZE < features.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✓ Loaded ${dataset.description} to table ${dataset.table} (${features.length} features)`);

    } catch (error) {
      console.error(`✗ Failed to load ${dataset.description}:`, error.message);
      throw error;
    }
  }

  async runSingleDataset(key) {
    const dataset = LOCAL_DATASETS[key];
    if (!dataset) {
      throw new Error(`Dataset ${key} not found`);
    }

    console.log(`\nProcessing ${key}...`);
    await this.loadDataToPostGIS(key, dataset);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  async runFullETL() {
    console.log('Starting local-only ETL process for district data...\n');

    const datasetKeys = Object.keys(LOCAL_DATASETS);

    // Process datasets one at a time to minimize memory usage
    for (const key of datasetKeys) {
      try {
        await this.runSingleDataset(key);
        console.log(`✓ Completed ${key}\n`);

        // Small delay between datasets
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed to process ${key}:`, error.message);
        // Continue with other datasets instead of failing completely
        console.log(`Skipping ${key} and continuing...\n`);
      }
    }

    console.log('Local ETL process completed!');
  }
}

module.exports = LocalETLService;