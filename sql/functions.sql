-- Function to lookup all districts for a given point
CREATE OR REPLACE FUNCTION lookup_districts_for_point(
    input_lon DECIMAL,
    input_lat DECIMAL
) RETURNS TABLE (
    municipality TEXT,
    county_council_district TEXT,
    county_council_member TEXT,
    city_council_district TEXT,
    city_council_member TEXT,
    school_district TEXT,
    school_superintendent TEXT,
    ward TEXT
) AS $$
DECLARE
    point_geom GEOMETRY;
    municipality_name TEXT;
BEGIN
    -- Transform the input point from WGS84 to State Plane South
    point_geom := ST_Transform(ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326), 2272);

    -- Get municipality first
    SELECT m.name INTO municipality_name
    FROM municipalities m
    WHERE ST_Intersects(m.geom, point_geom)
    LIMIT 1;

    -- Return all district information
    RETURN QUERY
    WITH district_lookups AS (
        -- County Council
        SELECT
            municipality_name as municipality,
            cc.district as county_council_district,
            cc.member as county_council_member
        FROM county_council cc
        WHERE ST_Intersects(cc.geom, point_geom)
        LIMIT 1
    ),
    city_council_lookup AS (
        -- City Council (only if in Pittsburgh)
        SELECT
            pc.district as city_council_district,
            pc.member as city_council_member
        FROM pgh_council pc
        WHERE ST_Intersects(pc.geom, point_geom)
          AND municipality_name = 'City of Pittsburgh'
        LIMIT 1
    ),
    school_lookup AS (
        -- School District
        SELECT
            sd.name as school_district,
            sd.superintendent as school_superintendent
        FROM school_districts sd
        WHERE ST_Intersects(sd.geom, point_geom)
        LIMIT 1
    ),
    ward_lookup AS (
        -- Ward (only if in Pittsburgh)
        SELECT
            pw.ward as ward
        FROM pgh_wards pw
        WHERE ST_Intersects(pw.geom, point_geom)
          AND municipality_name = 'City of Pittsburgh'
        LIMIT 1
    )
    SELECT
        COALESCE(dl.municipality, 'Unknown') as municipality,
        dl.county_council_district,
        dl.county_council_member,
        ccl.city_council_district,
        ccl.city_council_member,
        sl.school_district,
        sl.school_superintendent,
        wl.ward
    FROM district_lookups dl
    LEFT JOIN city_council_lookup ccl ON true
    LEFT JOIN school_lookup sl ON true
    LEFT JOIN ward_lookup wl ON true;
END;
$$ LANGUAGE plpgsql;