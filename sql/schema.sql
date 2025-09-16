-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS pgh_wards;
DROP TABLE IF EXISTS school_districts;
DROP TABLE IF EXISTS pgh_council;
DROP TABLE IF EXISTS county_council;
DROP TABLE IF EXISTS municipalities;

-- County Council Districts (Allegheny County)
-- Using State Plane South (EPSG:2272) as recommended
CREATE TABLE county_council (
    id SERIAL PRIMARY KEY,
    district TEXT NOT NULL,
    name TEXT,
    member TEXT,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pittsburgh City Council Districts
CREATE TABLE pgh_council (
    id SERIAL PRIMARY KEY,
    district TEXT NOT NULL,
    name TEXT,
    member TEXT,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School Districts (Allegheny County)
CREATE TABLE school_districts (
    id SERIAL PRIMARY KEY,
    lea_code TEXT,
    name TEXT NOT NULL,
    superintendent TEXT,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pittsburgh Wards (optional)
CREATE TABLE pgh_wards (
    id SERIAL PRIMARY KEY,
    ward TEXT NOT NULL,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pittsburgh Public Schools Board Districts
CREATE TABLE school_board_districts (
    id SERIAL PRIMARY KEY,
    district TEXT NOT NULL,
    board_member TEXT,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Municipalities (for guardrails/messages)
CREATE TABLE municipalities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    county TEXT,
    geom GEOMETRY(MULTIPOLYGON, 2272) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial indexes for fast point-in-polygon queries
CREATE INDEX idx_county_council_geom ON county_council USING GIST(geom);
CREATE INDEX idx_pgh_council_geom ON pgh_council USING GIST(geom);
CREATE INDEX idx_school_districts_geom ON school_districts USING GIST(geom);
CREATE INDEX idx_pgh_wards_geom ON pgh_wards USING GIST(geom);
CREATE INDEX idx_municipalities_geom ON municipalities USING GIST(geom);

-- Create regular indexes for quick lookups
CREATE INDEX idx_county_council_district ON county_council(district);
CREATE INDEX idx_pgh_council_district ON pgh_council(district);
CREATE INDEX idx_school_districts_name ON school_districts(name);
CREATE INDEX idx_pgh_wards_ward ON pgh_wards(ward);
CREATE INDEX idx_municipalities_name ON municipalities(name);