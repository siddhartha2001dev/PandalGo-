import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Puja } from '../src/models/Puja.js';
import { Post } from '../src/models/Post.js';
import { CrowdObservation } from '../src/models/CrowdObservation.js';
import { calculateDistanceMeters, getCrowdEstimateForPuja } from '../src/services/crowdService.js';
import { findPossibleDuplicates } from '../src/services/duplicateDetector.js';

let server;
let baseUrl;
let testPuja;
let testUser;

test.before(async () => {
  await connectDB();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Ensure an admin user exists for tests
  await User.findOneAndUpdate(
    { email: 'admin@pujomap.local' },
    {
      name: 'PujoMap Admin',
      email: 'admin@pujomap.local',
      password: '$2a$10$YourHashedPasswordHereOrSetViaBcrypt', // will test via login or create
      role: 'admin',
    },
    { upsert: true, new: true }
  );
});

test.after(async () => {
  if (testPuja) {
    await Puja.deleteOne({ _id: testPuja._id });
    await CrowdObservation.deleteMany({ pujaId: testPuja._id });
  }
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('1. Authentication: Register, Login, Duplicate Prevention, and HTTP-only Cookie', async () => {
  const uniqueEmail = `tester_${Date.now()}@pujomap.local`;

  // 1.1 Register
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Hopper',
      email: uniqueEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    }),
  });

  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  assert.equal(regData.success, true);
  assert.equal(regData.user.role, 'visitor', 'Public registration must never assign admin role');

  const setCookie = regRes.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('token='), 'HTTP-only auth cookie must be set');

  // 1.2 Duplicate account prevention
  const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Hopper Duplicate',
      email: uniqueEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    }),
  });
  assert.equal(dupRes.status, 409, 'Duplicate account registration must return 409 Conflict');

  // 1.3 Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'SecurePassword123!',
    }),
  });
  const loginData = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.equal(loginData.success, true);
  assert.ok(loginData.token, 'Token must be returned');

  // 1.4 /auth/me with Bearer token
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const meData = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meData.user.email, uniqueEmail);

  testUser = loginData.user;
});

test('2. Pandal Management: Normal users restricted to GPS present location, admins can add remote custom pins', async () => {
  // Register an admin user
  const adminEmail = `admin_tester_${Date.now()}@pujomap.local`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AdminPassword123!', salt);
  await User.create({
    name: 'Admin Tester',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });

  const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'AdminPassword123!',
    }),
  });
  const adminToken = (await adminLoginRes.json()).token;

  // Login normal user
  const userLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: 'SecurePassword123!',
    }),
  });
  const userToken = (await userLoginRes.json()).token;

  // 2.1 Normal user attempting manual remote location without GPS -> Rejected
  const invalidUserRes = await fetch(`${baseUrl}/api/v1/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      name: `Remote Fake Pandal ${Date.now()}`,
      address: 'Arbitrary Remote Location',
      locality: 'North Kolkata',
      coordinates: [88.3712, 22.6015],
      locationSource: 'manual', // Normal user tries manual pin
    }),
  });
  assert.equal(invalidUserRes.status, 403, 'Normal user with manual location must be rejected');

  // 2.2 Normal user submitting with verified GPS -> Approved and active immediately!
  const validGpsName = `Live Pandal OnSite ${Date.now()}`;
  const validUserRes = await fetch(`${baseUrl}/api/v1/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      name: validGpsName,
      address: 'Present Location Street, North Kolkata',
      locality: 'North Kolkata',
      coordinates: [88.3700, 22.5950],
      locationSource: 'gps',
      reportedGpsAccuracy: 12,
    }),
  });
  const validUserData = await validUserRes.json();
  assert.equal(validUserRes.status, 201);
  assert.equal(validUserData.puja.status, 'approved', 'GPS verified user pandal must be approved and live immediately');
  assert.equal(validUserData.isLive, true);

  testPuja = validUserData.puja;

  // 2.3 Admin can add any custom remote location
  const adminPujaName = `Admin Custom Pandal ${Date.now()}`;
  const adminRes = await fetch(`${baseUrl}/api/v1/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: adminPujaName,
      address: 'Custom Admin Placed Landmark',
      locality: 'South Kolkata',
      coordinates: [88.3500, 22.5200],
      locationSource: 'manual',
    }),
  });
  const adminData = await adminRes.json();
  assert.equal(adminRes.status, 201);
  assert.equal(adminData.puja.status, 'approved', 'Admin custom remote location must be approved immediately');
  if (adminData.puja?._id) {
    await Puja.findByIdAndDelete(adminData.puja._id);
  }
});

test('3. Public Discovery & Tracing: Discover live approved pandals by slug', async () => {
  const res = await fetch(`${baseUrl}/api/v1/pujas`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.pujas));
  assert.ok(data.pujas.length > 0);

  // Lookup by slug for tracing
  const slugRes = await fetch(`${baseUrl}/api/v1/pujas/slug/${testPuja.slug}`);
  const slugData = await slugRes.json();
  assert.equal(slugRes.status, 200);
  assert.equal(slugData.puja.slug, testPuja.slug);
  assert.ok(slugData.crowdEstimate, 'Should include on-demand crowd estimate');
});

test('4. Crowd Estimation: 100m radius check, 15m freshness, and rejection of distant coordinates', async () => {
  const [bLng, bLat] = testPuja.location.coordinates;

  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: 'SecurePassword123!',
    }),
  });
  const { token } = await loginRes.json();

  // 4.1 Coordinate rejection: Attempt report 2.8 km away
  const distantCoords = [bLng + 0.02, bLat + 0.02];
  const distantRes = await fetch(`${baseUrl}/api/v1/pujas/${testPuja._id}/crowd-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      crowdLevel: 'high',
      coordinates: distantCoords,
      estimatedWaitMinutes: 45,
    }),
  });
  assert.equal(distantRes.status, 400, 'Observation outside 100m radius must be rejected with 400 Bad Request');

  // 4.2 Valid observation: ~40 meters from pandal coordinates
  const nearCoords = [bLng + 0.0003, bLat + 0.0002];
  const validRes = await fetch(`${baseUrl}/api/v1/pujas/${testPuja._id}/crowd-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      crowdLevel: 'moderate',
      coordinates: nearCoords,
      estimatedWaitMinutes: 20,
    }),
  });
  const validData = await validRes.json();
  assert.equal(validRes.status, 201, 'Valid near observation must be accepted');
  assert.equal(validData.updatedEstimate.crowdStatus, 'moderate');
  assert.equal(validData.updatedEstimate.freshnessStatus, 'fresh');
});

test('5. Community Posts: Publishing with traceable location and live crowd details', async () => {
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: 'SecurePassword123!',
    }),
  });
  const { token } = await loginRes.json();

  const postRes = await fetch(`${baseUrl}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Amazing evening crowd at pandal',
      description: 'The light arches are fully lit and community members are celebrating.',
      locality: testPuja.locality,
      category: 'Puja Experience',
      associatedPujaId: testPuja._id,
      coordinates: testPuja.location.coordinates,
      locationSource: 'gps',
    }),
  });

  const postData = await postRes.json();
  assert.equal(postRes.status, 201);
  assert.equal(postData.success, true);
  assert.ok(postData.post._id);

  // Retrieve feed and verify crowd & coordinates are populated for others to trace
  const feedRes = await fetch(`${baseUrl}/api/v1/posts?limit=5`);
  const feedData = await feedRes.json();
  assert.equal(feedRes.status, 200);
  assert.ok(feedData.posts.length > 0);

  const foundPost = feedData.posts.find((p) => p._id === postData.post._id);
  assert.ok(foundPost);
  assert.equal(foundPost.crowdStatus, 'moderate');
  assert.ok(foundPost.pandalCoordinates || foundPost.coordinates);
});

test('6. Automated OpenCV Crowd Vision Detection: POST /api/v1/crowd/auto-detect estimates crowd density', async () => {
  // Test auto-detect using a sample photo URL
  const testSampleUrl = 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80';

  const visionRes = await fetch(`${baseUrl}/api/v1/crowd/auto-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: testSampleUrl,
      pujaId: testPuja._id,
    }),
  });

  const visionData = await visionRes.json();
  assert.equal(visionRes.status, 200);
  assert.equal(visionData.success, true);
  assert.ok(visionData.analysis);
  assert.ok(typeof visionData.analysis.estimatedHeadCount === 'number');
  assert.ok(['low', 'moderate', 'high'].includes(visionData.analysis.crowdLevel));
  assert.ok(visionData.updatedEstimate);
});

test('7. Automatic Location Image Finding & Detection: POST /api/v1/crowd/auto-detect-location', async () => {
  const autoLocationRes = await fetch(`${baseUrl}/api/v1/crowd/auto-detect-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pujaId: testPuja._id,
      coordinates: testPuja.location.coordinates,
      locationName: testPuja.name,
      locality: testPuja.locality,
    }),
  });

  const autoLocationData = await autoLocationRes.json();
  assert.equal(autoLocationRes.status, 200);
  assert.equal(autoLocationData.success, true);
  assert.ok(autoLocationData.image?.url);
  assert.ok(autoLocationData.image?.source);
  assert.ok(autoLocationData.analysis);
  assert.ok(typeof autoLocationData.analysis.estimatedHeadCount === 'number');
  assert.ok(['low', 'moderate', 'high'].includes(autoLocationData.analysis.crowdLevel));
  assert.ok(autoLocationData.updatedEstimate);
});

test('8. Search Suggestions: GET /api/v1/pujas/search-suggestions returns matching pandals and crowd status', async () => {
  const suggestRes = await fetch(`${baseUrl}/api/v1/pujas/search-suggestions?q=${encodeURIComponent(testPuja.name.slice(0, 5))}`);
  const suggestData = await suggestRes.json();

  assert.equal(suggestRes.status, 200);
  assert.equal(suggestData.success, true);
  assert.ok(Array.isArray(suggestData.pujas));
  assert.ok(Array.isArray(suggestData.localities));
  const found = suggestData.pujas.find((p) => p._id === testPuja._id);
  assert.ok(found);
  assert.ok(found.crowdEstimate);
});

test('9. Arbitrary Location Search: GET /api/v1/pujas/geocode-location resolves address and nearby pandal crowd', async () => {
  const geocodeRes = await fetch(`${baseUrl}/api/v1/pujas/geocode-location?q=Gariahat`);
  const geocodeData = await geocodeRes.json();

  assert.equal(geocodeRes.status, 200);
  assert.equal(geocodeData.success, true);
  assert.ok(geocodeData.coordinates && geocodeData.coordinates.length === 2);
  assert.ok(Array.isArray(geocodeData.nearbyPujas));
});
