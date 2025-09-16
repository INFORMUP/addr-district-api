const db = require('../database/connection');

class DistrictLookupService {
  async lookupDistricts(lon, lat) {
    try {
      const result = await db.query(`
        SELECT
          m.name as municipality,
          cc.district as county_district,
          cc.name as county_name,
          cc.member as county_member,
          pc.district as city_district,
          pc.name as city_name,
          pc.member as city_member,
          sd.name as school_district,
          sd.lea_code as school_board_district_code,
          sbd.district as school_board_district,
          sbd.board_member as school_board_member
        FROM county_council cc
        LEFT JOIN pgh_council pc ON ST_Intersects(pc.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272))
        LEFT JOIN school_districts sd ON ST_Intersects(sd.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272))
        LEFT JOIN school_board_districts sbd ON ST_Intersects(sbd.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272))
        LEFT JOIN municipalities m ON ST_Intersects(m.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272))
        WHERE ST_Intersects(cc.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272))
        LIMIT 1
      `, [lon, lat]);

      if (result.rows.length === 0) {
        return {
          found: false,
          message: 'No districts found for this location'
        };
      }

      const row = result.rows[0];
      return {
        found: true,
        municipality: row.municipality || 'Unknown',
        county: 'Allegheny',
        county_council: {
          district: row.county_district,
          member: row.county_member
        },
        city_council: row.city_district ? {
          district: row.city_district,
          member: row.city_member
        } : null,
        school_district: {
          name: row.school_district,
          district_code: row.school_board_district_code
        },
        school_board: {
          district: row.school_board_district,
          member: row.school_board_member
        }
      };
    } catch (error) {
      console.error('District lookup error:', error);
      throw new Error('Failed to lookup districts');
    }
  }

  async isInAlleghenyCounty(lon, lat) {
    try {
      const result = await db.query(`
        SELECT EXISTS(
          SELECT 1 FROM municipalities m
          WHERE ST_Intersects(
            m.geom,
            ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2272)
          )
          AND m.county = 'Allegheny'
        ) as in_allegheny
      `, [lon, lat]);

      return result.rows[0].in_allegheny;
    } catch (error) {
      console.error('County check error:', error);
      return false;
    }
  }

  async getDistrictCounts() {
    try {
      const results = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM county_council'),
        db.query('SELECT COUNT(*) as count FROM pgh_council'),
        db.query('SELECT COUNT(*) as count FROM school_districts'),
        db.query('SELECT COUNT(*) as count FROM school_board_districts'),
        db.query('SELECT COUNT(*) as count FROM pgh_wards'),
        db.query('SELECT COUNT(*) as count FROM municipalities')
      ]);

      return {
        county_council_districts: parseInt(results[0].rows[0].count),
        city_council_districts: parseInt(results[1].rows[0].count),
        school_districts: parseInt(results[2].rows[0].count),
        school_board_districts: parseInt(results[3].rows[0].count),
        wards: parseInt(results[4].rows[0].count),
        municipalities: parseInt(results[5].rows[0].count)
      };
    } catch (error) {
      console.error('Error getting district counts:', error);
      return null;
    }
  }
}

module.exports = new DistrictLookupService();