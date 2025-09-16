const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const WPRDC_DATASETS = {
  county_council: {
    url: 'https://data.wprdc.org/dataset/73eb573e-cc12-4f29-8e69-17f7975c89cb/resource/501b2f84-ac1c-40a3-8099-e4e431f993df/download/council.geojson',
    format: 'geojson',
    table: 'county_council',
    description: 'Allegheny County Council Districts'
  },
  pgh_council: {
    url: 'https://data.wprdc.org/dataset/8249c8b6-37c6-4849-abe7-c9abbcdf6197/resource/eb8d8237-16d5-4b19-ab71-ed89343aa448/download/council_districts_2022.geojson',
    format: 'geojson',
    table: 'pgh_council',
    description: 'Pittsburgh City Council Districts'
  },
  school_districts: {
    url: 'https://data.wprdc.org/dataset/e41c0a67-837f-460c-94a9-6650b74f10da/resource/fd4d0f47-5a05-4716-861e-b0b328effe8b/download/school_districts.geojson',
    format: 'geojson',
    table: 'school_districts',
    description: 'Allegheny County School Districts'
  },
  pgh_wards: {
    url: 'https://data.wprdc.org/dataset/766bbec2-e744-408e-9c8c-a58b662b6007/resource/2312299d-d632-4921-9c8a-6cbfb529522d/download/wards.geojson',
    format: 'geojson',
    table: 'pgh_wards',
    description: 'Pittsburgh Wards'
  },
  municipalities: {
    url: 'https://data.wprdc.org/dataset/2fa577d6-1a6b-46a8-8165-27fecac1dee5/resource/b0cb0249-d1ba-45b7-9918-dc86fa8af04c/download/muni_boundaries.geojson',
    format: 'geojson',
    table: 'municipalities',
    description: 'Allegheny County Municipalities'
  },
  school_board_districts: {
    url: 'local',
    format: 'geojson',
    table: 'school_board_districts',
    description: 'Pittsburgh School Board Districts',
    localFile: 'SchoolDistricts2022.geojson'
  }
};

class ETLService {
  constructor() {
    this.downloadDir = path.join(__dirname, '..', 'data');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async downloadDataset(key, dataset) {
    const filename = `${key}.${dataset.format}`;
    const filepath = path.join(this.downloadDir, filename);

    console.log(`Downloading ${dataset.description}...`);

    // Handle local files
    if (dataset.url === 'local' && dataset.localFile) {
      const localFilePath = path.join(this.downloadDir, dataset.localFile);
      if (fs.existsSync(localFilePath)) {
        console.log(`✓ Using local file ${dataset.localFile}`);
        return localFilePath;
      } else {
        throw new Error(`Local file ${dataset.localFile} not found in ${this.downloadDir}`);
      }
    }

    try {
      const response = await axios({
        method: 'GET',
        url: dataset.url,
        responseType: 'stream',
        timeout: 30000
      });

      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✓ Downloaded ${filename}`);
          resolve(filepath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`✗ Failed to download ${filename}:`, error.message);
      throw error;
    }
  }

  async loadDataToPostGIS(key, dataset, filepath) {
    console.log(`Loading ${dataset.description} to PostGIS...`);

    const db = require('../src/database/connection');
    const fs = require('fs');

    try {
      // Read the GeoJSON file
      const geojsonData = fs.readFileSync(filepath, 'utf8');
      const geojson = JSON.parse(geojsonData);

      // Clear existing data
      await db.query(`DELETE FROM ${dataset.table}`);

      // Process each feature
      for (const feature of geojson.features) {
        const properties = feature.properties;
        const geometry = feature.geometry;

        // Geometry will be passed directly as GeoJSON to PostGIS

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
          // Pittsburgh council data has incorrect SRID metadata - it's actually WGS84
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
          await db.query(insertQuery, values);
        }
      }

      console.log(`✓ Loaded ${dataset.description} to table ${dataset.table} (${geojson.features.length} features)`);
    } catch (error) {
      console.error(`✗ Failed to load ${dataset.description}:`, error.message);
      throw error;
    }
  }

  geometryToWKT(geometry) {
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates.map(ring =>
        '(' + ring.map(coord => `${coord[0]} ${coord[1]}`).join(',') + ')'
      ).join(',');
      // Convert Polygon to MultiPolygon for consistency
      return `MULTIPOLYGON(((${rings})))`;
    } else if (geometry.type === 'MultiPolygon') {
      const polygons = geometry.coordinates.map(polygon =>
        '(' + polygon.map(ring =>
          '(' + ring.map(coord => `${coord[0]} ${coord[1]}`).join(',') + ')'
        ).join(',') + ')'
      ).join(',');
      return `MULTIPOLYGON(${polygons})`;
    }
    // For other geometry types, you might need to add more cases
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }

  async runFullETL() {
    console.log('Starting ETL process for WPRDC district data...\n');

    for (const [key, dataset] of Object.entries(WPRDC_DATASETS)) {
      try {
        const filepath = await this.downloadDataset(key, dataset);
        await this.loadDataToPostGIS(key, dataset, filepath);
        console.log('');
      } catch (error) {
        console.error(`Failed to process ${key}:`, error.message);
        process.exit(1);
      }
    }

    console.log('ETL process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data loaded correctly with: npm run verify-data');
    console.log('2. Start the API server with: npm start');
  }

  async downloadAll() {
    console.log('Downloading all WPRDC datasets...\n');

    for (const [key, dataset] of Object.entries(WPRDC_DATASETS)) {
      try {
        await this.downloadDataset(key, dataset);
      } catch (error) {
        console.error(`Failed to download ${key}:`, error.message);
      }
    }

    console.log('\nDownload process completed!');
  }
}

const etl = new ETLService();

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'download':
      etl.downloadAll();
      break;
    case 'full':
    default:
      etl.runFullETL();
      break;
  }
}

module.exports = ETLService;