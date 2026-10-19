/**
 * Geocoding Service for PandalGo
 * Provides multi-tier geographic coordinate resolution:
 * 1. Curated Bengal & Kolkata Landmark / Neighborhood / Metro / City Dictionary (Instant, zero latency)
 * 2. MongoDB Verified Puja collection lookup
 * 3. Photon OSM Geocoder (Fast, fuzzy-tolerant, supports full West Bengal & India)
 * 4. Nominatim OpenStreetMap Geocoder (Fallback with multi-variant queries)
 */

import { Puja } from '../models/Puja.js';

// Comprehensive lookup dictionary for prominent neighborhoods, hubs, metro stations, and Bengal cities
const CURATED_LOCATIONS = {
  // Central Kolkata
  'park street': { coords: [88.3524, 22.5532], name: 'Park Street', display: 'Park Street, Central Kolkata, West Bengal' },
  'esplanade': { coords: [88.3512, 22.5645], name: 'Esplanade', display: 'Esplanade, Central Kolkata, West Bengal' },
  'dharmatala': { coords: [88.3520, 22.5638], name: 'Dharmatala', display: 'Dharmatala, Central Kolkata, West Bengal' },
  'maidan': { coords: [88.3470, 22.5510], name: 'Maidan', display: 'Maidan, Central Kolkata, West Bengal' },
  'college street': { coords: [88.3642, 22.5750], name: 'College Street', display: 'College Street, Central Kolkata, West Bengal' },
  'college square': { coords: [88.3645, 22.5745], name: 'College Square', display: 'College Square, Central Kolkata, West Bengal' },
  'sealdah': { coords: [88.3712, 22.5675], name: 'Sealdah', display: 'Sealdah Railway Station, Kolkata, West Bengal' },
  'sealdah station': { coords: [88.3712, 22.5675], name: 'Sealdah', display: 'Sealdah Railway Station, Kolkata, West Bengal' },
  'bowbazar': { coords: [88.3615, 22.5702], name: 'Bowbazar', display: 'Bowbazar, Central Kolkata, West Bengal' },
  'chandni chowk': { coords: [88.3555, 22.5670], name: 'Chandni Chowk', display: 'Chandni Chowk, Central Kolkata, West Bengal' },
  'bbd bagh': { coords: [88.3485, 22.5725], name: 'B.B.D. Bagh', display: 'B.B.D. Bagh (Dalhousie Square), Kolkata, West Bengal' },
  'dalhousie': { coords: [88.3485, 22.5725], name: 'B.B.D. Bagh', display: 'Dalhousie Square, Central Kolkata, West Bengal' },
  'mg road': { coords: [88.3610, 22.5815], name: 'Mahatma Gandhi Road', display: 'M.G. Road, Central Kolkata, West Bengal' },
  'burrabazar': { coords: [88.3530, 22.5840], name: 'Burrabazar', display: 'Burrabazar, Central Kolkata, West Bengal' },

  // South Kolkata
  'gariahat': { coords: [88.3659, 22.5186], name: 'Gariahat', display: 'Gariahat Junction, South Kolkata, West Bengal' },
  'ballygunge': { coords: [88.3659, 22.5280], name: 'Ballygunge', display: 'Ballygunge, South Kolkata, West Bengal' },
  'ballygunge phari': { coords: [88.3685, 22.5310], name: 'Ballygunge Phari', display: 'Ballygunge Phari, South Kolkata, West Bengal' },
  'golpark': { coords: [88.3638, 22.5144], name: 'Golpark', display: 'Golpark, South Kolkata, West Bengal' },
  'dhakuria': { coords: [88.3650, 22.5085], name: 'Dhakuria', display: 'Dhakuria, South Kolkata, West Bengal' },
  'jodhpur park': { coords: [88.3621, 22.5037], name: 'Jodhpur Park', display: 'Jodhpur Park, South Kolkata, West Bengal' },
  'southern avenue': { coords: [88.3565, 22.5125], name: 'Southern Avenue', display: 'Southern Avenue (Dr. Meghnad Saha Sarani), South Kolkata' },
  'lake gardens': { coords: [88.3533, 22.5081], name: 'Lake Gardens', display: 'Lake Gardens, South Kolkata, West Bengal' },
  'rabindra sarobar': { coords: [88.3510, 22.5115], name: 'Rabindra Sarobar', display: 'Rabindra Sarobar (Dhakuria Lake), South Kolkata' },
  'rashbehari': { coords: [88.3540, 22.5189], name: 'Rashbehari Avenue', display: 'Rashbehari Crossing, South Kolkata, West Bengal' },
  'deshapriya park': { coords: [88.3545, 22.5180], name: 'Deshapriya Park', display: 'Deshapriya Park, South Kolkata, West Bengal' },
  'tridhara': { coords: [88.3553, 22.5196], name: 'Tridhara Sammilani', display: 'Tridhara Sammilani, Manohar Pukur, South Kolkata' },
  'maddox square': { coords: [88.3547, 22.5263], name: 'Maddox Square', display: 'Maddox Square, Ritchie Road, South Kolkata' },
  'hazra': { coords: [88.3475, 22.5264], name: 'Hazra', display: 'Hazra Crossing, South Kolkata, West Bengal' },
  'kalighat': { coords: [88.3444, 22.5202], name: 'Kalighat', display: 'Kalighat Temple / Metro, South Kolkata, West Bengal' },
  'bhawanipur': { coords: [88.3465, 22.5350], name: 'Bhawanipur', display: 'Bhawanipur, South Kolkata, West Bengal' },
  'bhowanipore': { coords: [88.3465, 22.5350], name: 'Bhawanipur', display: 'Bhawanipur, South Kolkata, West Bengal' },
  'alipore': { coords: [88.3308, 22.5325], name: 'Alipore', display: 'Alipore, South Kolkata, West Bengal' },
  'new alipore': { coords: [88.3344, 22.5115], name: 'New Alipore', display: 'New Alipore, South Kolkata, West Bengal' },
  'chetla': { coords: [88.3372, 22.5164], name: 'Chetla', display: 'Chetla, South Kolkata, West Bengal' },
  'chetla agrani': { coords: [88.3372, 22.5164], name: 'Chetla Agrani Club', display: 'Chetla Agrani Club, South Kolkata, West Bengal' },
  'mudiali': { coords: [88.3464, 22.5101], name: 'Mudiali Club', display: 'Mudiali Club, South Kolkata, West Bengal' },
  'suruchi sangha': { coords: [88.3342, 22.5091], name: 'Suruchi Sangha', display: 'Suruchi Sangha, New Alipore, South Kolkata' },
  'tollygunge': { coords: [88.3471, 22.5015], name: 'Tollygunge', display: 'Tollygunge (Mahanayak Uttam Kumar), South Kolkata' },
  'kudghat': { coords: [88.3458, 22.4862], name: 'Kudghat', display: 'Kudghat (Netaji Metro), South Kolkata' },
  'bansdroni': { coords: [88.3525, 22.4789], name: 'Bansdroni', display: 'Bansdroni (Masterda Surya Sen), South Kolkata' },
  'naktala': { coords: [88.3624, 22.4725], name: 'Naktala', display: 'Naktala (Gitanjali Metro), South Kolkata' },
  'garia': { coords: [88.3752, 22.4645], name: 'Garia', display: 'Garia (Kavi Nazrul), South Kolkata, West Bengal' },
  'patuli': { coords: [88.3845, 22.4788], name: 'Patuli', display: 'Baishnabghata Patuli Township, South Kolkata' },
  'santoshpur': { coords: [88.3821, 22.4965], name: 'Santoshpur', display: 'Santoshpur, South Kolkata, West Bengal' },
  'jadavpur': { coords: [88.3697, 22.4988], name: 'Jadavpur', display: 'Jadavpur University 8B Bus Stand, South Kolkata' },
  'selimpur': { coords: [88.3662, 22.5041], name: 'Selimpur', display: 'Selimpur Pally, South Kolkata, West Bengal' },
  'babu bagan': { coords: [88.3658, 22.5065], name: 'Babu Bagan', display: 'Babu Bagan Club, Dhakuria, South Kolkata' },
  'kasba': { coords: [88.3845, 22.5185], name: 'Kasba', display: 'Kasba, South Kolkata, West Bengal' },
  'ruby': { coords: [88.4021, 22.5128], name: 'Ruby Hospital', display: 'Ruby General Hospital / EM Bypass, South Kolkata' },
  'acropolis': { coords: [88.3935, 22.5155], name: 'Acropolis Mall', display: 'Acropolis Mall, Kasba, South Kolkata' },
  'south city': { coords: [88.3615, 22.5005], name: 'South City Mall', display: 'South City Mall, Prince Anwar Shah Road, South Kolkata' },

  // South-West & Behala
  'behala': { coords: [88.3186, 22.4988], name: 'Behala', display: 'Behala, South West Kolkata, West Bengal' },
  'behala chowrasta': { coords: [88.3182, 22.4878], name: 'Behala Chowrasta', display: 'Behala Chowrasta, Diamond Harbour Road, Kolkata' },
  'sakherbazar': { coords: [88.3145, 22.4815], name: 'Sakherbazar', display: 'Sakherbazar, Behala, Kolkata, West Bengal' },
  'silpara': { coords: [88.3125, 22.4755], name: 'Silpara', display: 'Silpara, Behala, Kolkata, West Bengal' },
  'thakurpukur': { coords: [88.3055, 22.4685], name: 'Thakurpukur', display: 'Thakurpukur, Kolkata, West Bengal' },
  'joka': { coords: [88.3015, 22.4495], name: 'Joka', display: 'Joka (IIM Calcutta / Metro), South West Kolkata' },
  'taratala': { coords: [88.3125, 22.5145], name: 'Taratala', display: 'Taratala Junction, Kolkata, West Bengal' },
  'majerhat': { coords: [88.3245, 22.5175], name: 'Majerhat', display: 'Majerhat Bridge / Railway Station, Kolkata' },

  // North Kolkata
  'bagbazar': { coords: [88.3656, 22.6055], name: 'Bagbazar', display: 'Bagbazar Sarbojanin / Ghat, North Kolkata' },
  'shyambazar': { coords: [88.3702, 22.6019], name: 'Shyambazar', display: 'Shyambazar Five-Point Crossing, North Kolkata' },
  'sovabazar': { coords: [88.3549, 22.5975], name: 'Sovabazar', display: 'Sovabazar Rajbari / Metro, North Kolkata' },
  'kumartuli': { coords: [88.3624, 22.6012], name: 'Kumartuli', display: 'Kumartuli Idol Artisans Colony, North Kolkata' },
  'hatibagan': { coords: [88.3709, 22.5950], name: 'Hatibagan', display: 'Hatibagan Market, North Kolkata, West Bengal' },
  'girish park': { coords: [88.3602, 22.5855], name: 'Girish Park', display: 'Girish Park, North Kolkata, West Bengal' },
  'shobhabazar': { coords: [88.3549, 22.5975], name: 'Sovabazar', display: 'Sovabazar, North Kolkata, West Bengal' },
  'tala': { coords: [88.3785, 22.6085], name: 'Tala Park', display: 'Tala Barowari / Tala Tank, North Kolkata' },
  'kashi bose lane': { coords: [88.3695, 22.5910], name: 'Kashi Bose Lane', display: 'Kashi Bose Lane, North Kolkata, West Bengal' },
  'maniktala': { coords: [88.3745, 22.5845], name: 'Maniktala', display: 'Maniktala, North Kolkata, West Bengal' },

  // East Kolkata & Salt Lake / New Town
  'salt lake': { coords: [88.4124, 22.5833], name: 'Salt Lake', display: 'Salt Lake City (Bidhannagar), Kolkata, West Bengal' },
  'saltlake': { coords: [88.4124, 22.5833], name: 'Salt Lake', display: 'Salt Lake City (Bidhannagar), Kolkata, West Bengal' },
  'salt lake sector 5': { coords: [88.4291, 22.5809], name: 'Salt Lake Sector V', display: 'Sector V, Salt Lake IT Hub, Kolkata' },
  'sector 5': { coords: [88.4291, 22.5809], name: 'Sector V', display: 'Sector V IT Hub, Salt Lake, Kolkata' },
  'karunamoyee': { coords: [88.4215, 22.5875], name: 'Karunamoyee', display: 'Karunamoyee Bus Terminus / Central Park, Salt Lake' },
  'fd block': { coords: [88.4123, 22.5824], name: 'FD Block Salt Lake', display: 'FD Block Durga Puja Ground, Salt Lake, Kolkata' },
  'bj block': { coords: [88.4267, 22.5902], name: 'BJ Block Salt Lake', display: 'BJ Block Durga Puja Ground, Salt Lake, Kolkata' },
  'new town': { coords: [88.4639, 22.5938], name: 'New Town', display: 'New Town (Rajarhat), Kolkata, West Bengal' },
  'rajarhat': { coords: [88.4639, 22.5938], name: 'Rajarhat', display: 'Rajarhat New Town, Kolkata, West Bengal' },
  'eco park': { coords: [88.4682, 22.6053], name: 'Eco Park', display: 'Prakriti Tirtha (Eco Park), New Town, Kolkata' },
  'kankurgachi': { coords: [88.3905, 22.5792], name: 'Kankurgachi', display: 'Kankurgachi, East Kolkata, West Bengal' },
  'phoolbagan': { coords: [88.3885, 22.5715], name: 'Phoolbagan', display: 'Phoolbagan Metro, East Kolkata, West Bengal' },
  'beliaghata': { coords: [88.3865, 22.5665], name: 'Beliaghata', display: 'Beliaghata, East Kolkata, West Bengal' },
  'ultadanga': { coords: [88.3853, 22.5961], name: 'Ultadanga', display: 'Ultadanga (Bidhan Nagar Road), Kolkata' },
  'science city': { coords: [88.3955, 22.5405], name: 'Science City', display: 'Science City, JBS Haldane Avenue, Kolkata' },

  // North Suburbs & Airport
  'lake town': { coords: [88.4015, 22.5985], name: 'Lake Town', display: 'Lake Town (Clock Tower), North 24 Parganas, Kolkata' },
  'sreebhumi': { coords: [88.4025, 22.6003], name: 'Sreebhumi Sporting Club', display: 'Sreebhumi Sporting Club, Lake Town, Kolkata' },
  'bangur': { coords: [88.4055, 22.6025], name: 'Bangur Avenue', display: 'Bangur Avenue, VIP Road, Kolkata' },
  'dum dum': { coords: [88.3929, 22.6211], name: 'Dum Dum', display: 'Dum Dum Junction / Metro, Kolkata, West Bengal' },
  'dumdum': { coords: [88.3929, 22.6211], name: 'Dum Dum', display: 'Dum Dum Junction / Metro, Kolkata, West Bengal' },
  'dum dum park': { coords: [88.4115, 22.6085], name: 'Dum Dum Park', display: 'Dum Dum Park Tarun Sangha / Bharat Chakra, Kolkata' },
  'nagerbazar': { coords: [88.4175, 22.6245], name: 'Nagerbazar', display: 'Nagerbazar, Dum Dum, Kolkata, West Bengal' },
  'airport': { coords: [88.4467, 22.6547], name: 'Netaji Subhash Chandra Bose Airport', display: 'Kolkata International Airport (CCU), Dum Dum' },
  'kolkata airport': { coords: [88.4467, 22.6547], name: 'Kolkata Airport', display: 'Netaji Subhash Chandra Bose International Airport' },
  'birati': { coords: [88.4350, 22.6725], name: 'Birati', display: 'Birati, North 24 Parganas, West Bengal' },
  'madhyamgram': { coords: [88.4550, 22.7025], name: 'Madhyamgram', display: 'Madhyamgram, North 24 Parganas, West Bengal' },
  'barasat': { coords: [88.4826, 22.7191], name: 'Barasat', display: 'Barasat, North 24 Parganas District HQ, West Bengal' },
  'barrackpore': { coords: [88.3650, 22.7650], name: 'Barrackpore', display: 'Barrackpore, North 24 Parganas, West Bengal' },
  'sodepur': { coords: [88.3885, 22.6985], name: 'Sodepur', display: 'Sodepur, North 24 Parganas, West Bengal' },
  'agarpara': { coords: [88.3815, 22.6845], name: 'Agarpara', display: 'Agarpara, North 24 Parganas, West Bengal' },
  'belgharia': { coords: [88.3785, 22.6545], name: 'Belgharia', display: 'Belgharia, North 24 Parganas, West Bengal' },
  'dakshineswar': { coords: [88.3575, 22.6545], name: 'Dakshineswar', display: 'Dakshineswar Kali Temple / Skywalk, Kolkata' },

  // Howrah & West Bank
  'howrah': { coords: [88.3403, 22.5834], name: 'Howrah', display: 'Howrah Junction Railway Station, Howrah, West Bengal' },
  'howrah station': { coords: [88.3403, 22.5834], name: 'Howrah Railway Station', display: 'Howrah Railway Station, Howrah, West Bengal' },
  'howrah bridge': { coords: [88.3468, 22.5851], name: 'Howrah Bridge', display: 'Rabindra Setu (Howrah Bridge), Kolkata / Howrah' },
  'shibpur': { coords: [88.3182, 22.5635], name: 'Shibpur', display: 'Shibpur, Howrah, West Bengal' },
  'salkia': { coords: [88.3450, 22.6025], name: 'Salkia', display: 'Salkia, Howrah, West Bengal' },
  'belur': { coords: [88.3540, 22.6285], name: 'Belur Math', display: 'Belur Math, Howrah, West Bengal' },
  'belur math': { coords: [88.3540, 22.6285], name: 'Belur Math', display: 'Belur Math, Howrah, West Bengal' },
  'bally': { coords: [88.3425, 22.6515], name: 'Bally', display: 'Bally, Howrah, West Bengal' },
  'nabanna': { coords: [88.3145, 22.5595], name: 'Nabanna', display: 'Nabanna (State Secretariat), Mandirtala, Howrah' },

  // Hooghly & Nadia
  'uttarpara': { coords: [88.3485, 22.6745], name: 'Uttarpara', display: 'Uttarpara, Hooghly District, West Bengal' },
  'serampore': { coords: [88.3450, 22.7525], name: 'Serampore', display: 'Serampore, Hooghly District, West Bengal' },
  'chandannagar': { coords: [88.3703, 22.8639], name: 'Chandannagar', display: 'Chandannagar, Hooghly District, West Bengal' },
  'bandel': { coords: [88.3750, 22.9250], name: 'Bandel', display: 'Bandel Church / Station, Hooghly, West Bengal' },
  'chinsurah': { coords: [88.3965, 22.9015], name: 'Chinsurah', display: 'Chinsurah District HQ, Hooghly, West Bengal' },
  'kalyani': { coords: [88.4344, 22.9751], name: 'Kalyani', display: 'Kalyani ITI / Central Park, Nadia, West Bengal' },
  'ranaghat': { coords: [88.5805, 23.1785], name: 'Ranaghat', display: 'Ranaghat, Nadia District, West Bengal' },
  'krishnanagar': { coords: [88.5015, 23.4025], name: 'Krishnanagar', display: 'Krishnanagar, Nadia District HQ, West Bengal' },

  // Major West Bengal Districts & Cities
  'burdwan': { coords: [87.8631, 23.2458], name: 'Burdwan', display: 'Purba Bardhaman, West Bengal' },
  'bardhaman': { coords: [87.8631, 23.2458], name: 'Bardhaman', display: 'Purba Bardhaman, West Bengal' },
  'durgapur': { coords: [87.3119, 23.5204], name: 'Durgapur', display: 'Durgapur Steel City, Paschim Bardhaman, West Bengal' },
  'asansol': { coords: [86.9746, 23.6869], name: 'Asansol', display: 'Asansol, Paschim Bardhaman, West Bengal' },
  'siliguri': { coords: [88.4310, 26.7164], name: 'Siliguri', display: 'Siliguri, Darjeeling/Jalpaiguri, North Bengal' },
  'darjeeling': { coords: [88.2627, 27.0410], name: 'Darjeeling', display: 'Darjeeling Hill Town, West Bengal' },
  'malda': { coords: [88.1415, 25.0108], name: 'Malda', display: 'English Bazar (Malda), West Bengal' },
  'cooch behar': { coords: [89.4485, 26.3245], name: 'Cooch Behar', display: 'Cooch Behar Palace Town, North Bengal' },
  'kharagpur': { coords: [87.3215, 22.3385], name: 'Kharagpur', display: 'Kharagpur (IIT Kharagpur), Paschim Medinipur' },
  'midnapore': { coords: [87.3215, 22.4285], name: 'Midnapore', display: 'Medinipur Town, Paschim Medinipur, West Bengal' },
  'haldia': { coords: [88.0725, 22.0645], name: 'Haldia', display: 'Haldia Port City, Purba Medinipur, West Bengal' },
  'digha': { coords: [87.5145, 21.6265], name: 'Digha', display: 'Digha Coastal Beach, Purba Medinipur, West Bengal' },
  'bolpur': { coords: [87.6915, 23.6705], name: 'Bolpur Santiniketan', display: 'Bolpur (Santiniketan / Visva-Bharati), Birbhum' },
  'santiniketan': { coords: [87.6915, 23.6705], name: 'Santiniketan', display: 'Santiniketan (Visva-Bharati University), Birbhum' },
};

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Multi-tier geocoding resolution
 * Returns { coordinates: [lng, lat], locationName, displayName }
 */
export async function resolveLocationCoordinates(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return null;
  const queryStr = rawQuery.trim();
  const lowerQuery = queryStr.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Tier 1: Check curated local dictionary for direct match or substring match
  if (CURATED_LOCATIONS[lowerQuery]) {
    const loc = CURATED_LOCATIONS[lowerQuery];
    return {
      coordinates: loc.coords,
      locationName: loc.name,
      displayName: loc.display,
      source: 'curated-exact',
    };
  }

  for (const [key, loc] of Object.entries(CURATED_LOCATIONS)) {
    if (lowerQuery === key || lowerQuery.startsWith(key + ' ') || lowerQuery.endsWith(' ' + key)) {
      return {
        coordinates: loc.coords,
        locationName: loc.name,
        displayName: loc.display,
        source: 'curated-fuzzy',
      };
    }
  }

  // Tier 2: Search MongoDB approved pujas for matching pandal name, club name, or locality
  try {
    const pujaMatch = await Puja.findOne({
      status: 'approved',
      $or: [
        { name: new RegExp(queryStr, 'i') },
        { slug: new RegExp(queryStr.toLowerCase().replace(/\s+/g, '-'), 'i') },
        { locality: new RegExp(`^${queryStr}$`, 'i') },
      ],
    }).select('name locality location');

    if (pujaMatch?.location?.coordinates?.length === 2) {
      return {
        coordinates: [pujaMatch.location.coordinates[0], pujaMatch.location.coordinates[1]],
        locationName: pujaMatch.name,
        displayName: `${pujaMatch.name}, ${pujaMatch.locality}, Kolkata, West Bengal`,
        source: 'database-puja',
      };
    }
  } catch (err) {
    console.warn('[GeocodingService] DB lookup skipped:', err.message);
  }

  // Tier 3: Photon Geocoder (Fast OSM Elasticsearch, excellent for Indian places/neighborhoods)
  const photonQueries = [
    `${queryStr}, West Bengal, India`,
    `${queryStr}, Kolkata, India`,
    `${queryStr}, India`,
    queryStr,
  ];

  for (const q of photonQueries) {
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetchWithTimeout(photonUrl, {
        headers: { 'User-Agent': 'PandalGoFestive/2.0 (contact@pandalgo.com)' },
      }, 3000);

      if (res.ok) {
        const data = await res.json();
        const feat = data?.features?.[0];
        if (feat?.geometry?.coordinates?.length === 2) {
          const [lng, lat] = feat.geometry.coordinates;
          const name = feat.properties?.name || queryStr;
          const displayParts = [
            feat.properties?.name,
            feat.properties?.city || feat.properties?.district,
            feat.properties?.state || 'West Bengal',
            feat.properties?.country || 'India',
          ].filter(Boolean);

          return {
            coordinates: [parseFloat(lng), parseFloat(lat)],
            locationName: name,
            displayName: displayParts.join(', ') || queryStr,
            source: 'photon',
          };
        }
      }
    } catch {
      // Try next variant
    }
  }

  // Tier 4: Nominatim OpenStreetMap Geocoder (with smart region fallback)
  const nominatimQueries = [
    /kolkata|calcutta|bengal|howrah|kalyani|darjeeling/i.test(queryStr)
      ? queryStr
      : `${queryStr}, Kolkata, West Bengal`,
    `${queryStr}, West Bengal, India`,
    queryStr,
  ];

  for (const q of nominatimQueries) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=1&accept-language=en`;
      const res = await fetchWithTimeout(nominatimUrl, {
        headers: {
          'User-Agent': 'PandalGoFestive/2.0 (contact@pandalgo.com)',
          'Accept-Language': 'en',
        },
      }, 3500);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
            locationName: data[0].name || queryStr,
            displayName: data[0].display_name || queryStr,
            source: 'nominatim',
          };
        }
      }
    } catch {
      // Try next variant
    }
  }

  return null;
}
