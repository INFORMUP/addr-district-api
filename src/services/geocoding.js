const axios = require('axios');

class GeocodingService {
  constructor() {
    this.geomancerBaseUrl = process.env.GEOMANCER_BASE_URL || 'https://tools.wprdc.org/geo';
    this.censusGeocoderUrl = process.env.CENSUS_GEOCODER_URL || 'https://geocoding.geo.census.gov/geocoder';
  }

  async geocodeAddress(address) {
    try {
      const result = await this.geocodeWithGeomancer(address);
      if (result) {
        return result;
      }
      console.log('Geomancer failed, trying Census geocoder as fallback');
      return await this.geocodeWithCensus(address);
    } catch (error) {
      console.error('Geocoding failed:', error.message);
      throw new Error('Failed to geocode address');
    }
  }

  async geocodeWithGeomancer(address) {
    try {
      const response = await axios.get(`${this.geomancerBaseUrl}/geocode`, {
        params: { addr: address },
        timeout: 5000
      });

      if (response.data && response.data.status === 'OK' && response.data.data) {
        const data = response.data.data;
        return {
          lat: data.lat,
          lon: data.lon,
          source: 'geomancer',
          confidence: data.score || null,
          regions: data.regions || {},
          formatted_address: data.formatted_address || address
        };
      }
      return null;
    } catch (error) {
      console.error('Geomancer geocoding error:', error.message);
      return null;
    }
  }

  async geocodeWithCensus(address) {
    try {
      const response = await axios.get(`${this.censusGeocoderUrl}/locations/onelineaddress`, {
        params: {
          address: address,
          benchmark: 'Public_AR_Current',
          format: 'json'
        },
        timeout: 10000
      });

      if (response.data &&
          response.data.result &&
          response.data.result.addressMatches &&
          response.data.result.addressMatches.length > 0) {

        const match = response.data.result.addressMatches[0];
        return {
          lat: parseFloat(match.coordinates.y),
          lon: parseFloat(match.coordinates.x),
          source: 'census',
          confidence: match.tigerLine ? match.tigerLine.tigerLineId : null,
          regions: {},
          formatted_address: match.matchedAddress || address
        };
      }
      return null;
    } catch (error) {
      console.error('Census geocoding error:', error.message);
      return null;
    }
  }

  extractRegionData(regions) {
    const extracted = {};

    if (regions.pittsburgh_city_council) {
      extracted.city_council_district = regions.pittsburgh_city_council;
    }

    if (regions.pittsburgh_ward) {
      extracted.ward = regions.pittsburgh_ward;
    }

    return extracted;
  }
}

module.exports = new GeocodingService();