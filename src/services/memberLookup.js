// Member lookup service with current representative information
// Data sources: Pittsburgh.gov, Ballotpedia, WESA (as of September 2025)

class MemberLookupService {
  constructor() {
    // Pittsburgh City Council Members (current as of 2025)
    this.cityCouncilMembers = {
      '1': 'Bobby Wilson',
      '2': 'Theresa Kail-Smith',
      '3': 'Bob Charland',
      '4': 'Anthony Coghill',
      '5': 'Barbara Warwick',
      '6': 'Daniel Lavelle',
      '7': 'Deb Gross',
      '8': 'Erika Strassburger',
      '9': 'Khari Mosley'
    };

    // Pittsburgh Public Schools Board Members (current as of 2025)
    // Note: Elections in November 2025 may change some positions
    this.schoolBoardMembers = {
      '1': 'Sylvia C. Wilson', // May change after Nov 2025 election (Tawana Cook Purnell won primary)
      '2': 'Devon Taliaferro',
      '3': 'Sala Udin', // May change after Nov 2025 election (Erikka Grayson won primary)
      '4': 'Yael Silk',
      '5': 'Tracey Reed', // Running for re-election
      '6': 'Emma Yourd',
      '7': null, // May change after Nov 2025 election (Eva Diodati won primary)
      '8': 'Dwayne Barker',
      '9': 'Gene Walker' // Running for re-election
    };

    // Note: District numbers for school board correspond to Pittsburgh Public Schools districts
    // which may not align 1:1 with city council districts
  }

  getCityCouncilMember(district) {
    if (!district) return null;
    return this.cityCouncilMembers[district.toString()] || null;
  }

  getSchoolBoardMember(schoolDistrictName) {
    // For Pittsburgh Public Schools, we need to determine the board district
    // This is complex as school board districts don't map directly to geographic areas
    // For now, return null as we'd need address-to-school-board-district mapping

    if (schoolDistrictName === 'City of Pittsburgh') {
      // Pittsburgh Public Schools has 9 board districts but they don't map to city council districts
      // We would need additional geographic data to determine which school board district
      // a specific address falls into
      return null;
    }

    return null;
  }

  // NOTE: School board districts don't map to city council districts
  // This method should not be used as it produces incorrect results
  getSchoolBoardDistrictFromCityCouncil(cityCouncilDistrict) {
    // School board districts have completely different boundaries than city council districts
    // For example: 5440 Aylesboro Ave is in City Council District 8 but School Board District 4
    // Without proper boundary data, we cannot determine school board district from city council district
    return null;
  }

  getSchoolBoardMemberByApproximateDistrict(schoolBoardDistrict) {
    if (!schoolBoardDistrict) return null;
    return this.schoolBoardMembers[schoolBoardDistrict.toString()] || null;
  }

  // For future enhancement: add method to determine school board district from coordinates
  getSchoolBoardMemberByDistrict(boardDistrict) {
    if (!boardDistrict) return null;
    return this.schoolBoardMembers[boardDistrict.toString()] || null;
  }

  // Get all current members for reference
  getAllCityCouncilMembers() {
    return { ...this.cityCouncilMembers };
  }

  getAllSchoolBoardMembers() {
    return { ...this.schoolBoardMembers };
  }
}

module.exports = new MemberLookupService();