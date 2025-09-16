<<<<<<< HEAD
# addr-district-api
API for resolving an address to council districts and representatives
=======
# Address District Lookup API

A Node.js/Express API that provides district numbers and representatives for addresses in Allegheny County, PA. The API supports lookups for:

- County Council districts
- Pittsburgh City Council districts (when applicable)
- School districts
- Pittsburgh wards (when applicable)

## Features

- **Geocoding**: Uses WPRDC Geomancer as primary geocoder with US Census Geocoder as fallback
- **PostGIS Integration**: Fast point-in-polygon queries using spatial indexes
- **ETL Pipeline**: Automated data loading from WPRDC datasets
- **Docker Support**: Ready-to-deploy container setup
- **Error Handling**: Comprehensive error handling and validation

## API Endpoints

### `GET /api/lookup?address={address}`

Lookup districts for a given address.

**Example Request:**
```
GET /api/lookup?address=123 Main St, Pittsburgh, PA
```

**Example Response:**
```json
{
  "address": "123 Main St, Pittsburgh, PA",
  "lat": 40.44,
  "lon": -79.99,
  "formatted_address": "123 Main St, Pittsburgh, PA 15222",
  "geocoding_source": "geomancer",
  "supported": true,
  "municipality": "City of Pittsburgh",
  "county": "Allegheny",
  "county_council_district": "13",
  "county_council_member": "John Doe",
  "city_council_district": "6",
  "city_council_member": "Jane Smith",
  "school_district": "Pittsburgh Public Schools",
  "school_superintendent": "Dr. Example",
  "ward": "4"
}
```

### `GET /api/stats`

Get statistics about loaded district data.

### `GET /health`

Health check endpoint.

## Quick Start

### Using Docker (Recommended)

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd addr-district-api
   cp .env.example .env
   ```

2. **Start services:**
   ```bash
   npm run docker:up
   ```

3. **Setup database and load data:**
   ```bash
   # Setup database schema
   docker-compose exec api npm run setup-db

   # Load WPRDC data (requires ogr2ogr)
   docker-compose exec api npm run etl

   # Verify data loaded correctly
   docker-compose exec api npm run verify-data
   ```

4. **Test the API:**
   ```bash
   curl "http://localhost:3000/api/lookup?address=123 Main St, Pittsburgh, PA"
   ```

### Manual Setup

1. **Prerequisites:**
   - Node.js 18+
   - PostgreSQL 15+ with PostGIS extension
   - GDAL/OGR tools for data loading

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database:**
   ```bash
   npm run setup-db
   ```

5. **Load data:**
   ```bash
   npm run etl
   ```

6. **Verify data:**
   ```bash
   npm run verify-data
   ```

7. **Start the server:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## Data Sources

All data comes from the Western Pennsylvania Regional Data Center (WPRDC):

- **County Council Districts**: Allegheny County Council district boundaries
- **City Council Districts**: Pittsburgh City Council district boundaries
- **School Districts**: Allegheny County school district boundaries
- **Wards**: Pittsburgh ward boundaries
- **Municipalities**: Allegheny County municipal boundaries

## Database Schema

The API uses PostGIS with the Pennsylvania State Plane South coordinate system (EPSG:2272) for optimal accuracy in the region.

**Tables:**
- `county_council` - County council districts with member information
- `pgh_council` - Pittsburgh city council districts with member information
- `school_districts` - School districts with superintendent information
- `pgh_wards` - Pittsburgh wards
- `municipalities` - Municipal boundaries for validation

## ETL Process

The ETL pipeline:

1. Downloads CSV/GeoJSON data from WPRDC
2. Transforms to PostGIS using ogr2ogr
3. Loads into State Plane South coordinate system
4. Creates spatial indexes for performance

**ETL Commands:**
```bash
# Download only
npm run etl:download

# Full ETL (download + load)
npm run etl

# Verify loaded data
npm run verify-data
```

## Configuration

Environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/addr_district_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=addr_district_db
DB_USER=username
DB_PASSWORD=password

# API
PORT=3000
NODE_ENV=development

# Geocoding Services
GEOMANCER_BASE_URL=https://tools.wprdc.org/geo
CENSUS_GEOCODER_URL=https://geocoding.geo.census.gov/geocoder
```

## Docker Commands

```bash
# Build and start
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Rebuild
npm run docker:build
```

## API Design

The API follows the design principles outlined in the original specification:

- **Lean and focused**: Only covers Allegheny County
- **WPRDC-native**: Uses only WPRDC data sources
- **PostGIS-optimized**: Fast spatial queries with proper indexing
- **Geocoding strategy**: Primary + fallback geocoders
- **Error handling**: Clear responses for edge cases

## Error Handling

- **Invalid address**: Returns 404 with geocoding failure message
- **Outside Allegheny County**: Returns response with `supported: false`
- **No district data**: Returns response indicating missing district information
- **Server errors**: Returns 500 with generic error message

## Performance

- Spatial indexes on all geometry columns
- Connection pooling for database
- Optimized point-in-polygon queries
- Single database function for all district lookups

## Development

```bash
# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Check data loading status
npm run verify-data
```

## Production Deployment

1. Use the provided Docker setup
2. Set appropriate environment variables
3. Ensure PostGIS database is available
4. Run ETL to load initial data
5. Set up periodic ETL runs for data updates

## License

MIT
>>>>>>> dc87f6d (MVP for deployment)
