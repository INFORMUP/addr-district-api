const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocoding');
const districtLookupService = require('../services/districtLookup');
const memberLookupService = require('../services/memberLookup');

router.get('/lookup', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Address parameter is required',
        example: '/api/lookup?address=123 Main St, Pittsburgh, PA'
      });
    }

    const geocodeResult = await geocodingService.geocodeAddress(address);
    if (!geocodeResult) {
      return res.status(404).json({
        error: 'Unable to geocode address',
        address: address,
        message: 'Address could not be found or geocoded'
      });
    }

    const isInAllegheny = await districtLookupService.isInAlleghenyCounty(
      geocodeResult.lon,
      geocodeResult.lat
    );

    if (!isInAllegheny) {
      return res.json({
        address: address,
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        formatted_address: geocodeResult.formatted_address,
        geocoding_source: geocodeResult.source,
        supported: false,
        message: 'Address is outside Allegheny County. This API currently only supports Allegheny County addresses.',
        county: null,
        districts: null
      });
    }

    const districtResult = await districtLookupService.lookupDistricts(
      geocodeResult.lon,
      geocodeResult.lat
    );

    if (!districtResult.found) {
      return res.json({
        address: address,
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        formatted_address: geocodeResult.formatted_address,
        geocoding_source: geocodeResult.source,
        supported: true,
        message: 'Address is in Allegheny County but no district information was found',
        county: 'Allegheny',
        districts: null
      });
    }

    const regionData = geocodingService.extractRegionData(geocodeResult.regions || {});

    // Get member names from lookup service
    const cityCouncilMember = districtResult.city_council?.district
      ? memberLookupService.getCityCouncilMember(districtResult.city_council.district)
      : null;

    // For school board, use temporary approximation based on city council district
    const approximateSchoolBoardDistrict = districtResult.city_council?.district
      ? memberLookupService.getSchoolBoardDistrictFromCityCouncil(districtResult.city_council.district)
      : null;

    const schoolBoardMember = approximateSchoolBoardDistrict
      ? memberLookupService.getSchoolBoardMemberByApproximateDistrict(approximateSchoolBoardDistrict)
      : null;

    const response = {
      address: address,
      lat: geocodeResult.lat,
      lon: geocodeResult.lon,
      formatted_address: geocodeResult.formatted_address,
      geocoding_source: geocodeResult.source,
      supported: true,
      municipality: districtResult.municipality,
      county: districtResult.county,
      county_council_district: districtResult.county_council.district,
      county_council_member: districtResult.county_council.member,
      city_council_district: districtResult.city_council?.district || null,
      city_council_member: cityCouncilMember,
      school_district: districtResult.school_district.name,
      school_board_district: districtResult.school_board?.district || null,
      school_board_member: districtResult.school_board?.member || null
    };

    if (regionData.city_council_district && !response.city_council_district) {
      response.city_council_district = regionData.city_council_district;
    }

    res.json(response);

  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while processing the request'
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const counts = await districtLookupService.getDistrictCounts();
    res.json({
      message: 'District data statistics',
      data_loaded: counts !== null,
      district_counts: counts
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Unable to retrieve statistics'
    });
  }
});

module.exports = router;