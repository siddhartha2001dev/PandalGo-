import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Puja } from '../src/models/Puja.js';
import { ImportJob } from '../src/models/ImportJob.js';
import { DevBotConversation } from '../src/models/DevBotConversation.js';

let server;
let baseUrl;
let adminCookie = '';
let regularUserCookie = '';
let createdPujaIds = [];
let testConversationId = null;

test.before(async () => {
  await connectDB();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Create or update admin user for tests
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  await User.findOneAndUpdate(
    { email: 'devbot_admin@pujomap.local' },
    {
      name: 'DevBot Test Admin',
      email: 'devbot_admin@pujomap.local',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
    { upsert: true, new: true }
  );

  // Create a regular user for permission tests
  const userPasswordHash = await bcrypt.hash('User@123456', 10);
  await User.findOneAndUpdate(
    { email: 'devbot_user@pujomap.local' },
    {
      name: 'DevBot Regular User',
      email: 'devbot_user@pujomap.local',
      passwordHash: userPasswordHash,
      role: 'visitor',
    },
    { upsert: true, new: true }
  );

  // Login as admin
  const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'devbot_admin@pujomap.local',
      password: 'Admin@123456',
    }),
  });
  const adminCookies = adminLoginRes.headers.get('set-cookie');
  if (adminCookies) {
    adminCookie = adminCookies.split(';')[0];
  }

  // Login as regular user
  const userLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'devbot_user@pujomap.local',
      password: 'User@123456',
    }),
  });
  const userCookies = userLoginRes.headers.get('set-cookie');
  if (userCookies) {
    regularUserCookie = userCookies.split(';')[0];
  }
});

test.after(async () => {
  // Cleanup imported pujas
  if (createdPujaIds.length > 0) {
    await Puja.deleteMany({ _id: { $in: createdPujaIds } });
  }
  // Cleanup test conversations
  await DevBotConversation.deleteMany({ sessionId: { $regex: /test/i } });
  await User.deleteMany({ email: { $in: ['devbot_admin@pujomap.local', 'devbot_user@pujomap.local'] } });
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('1. Visitor Mode: Search approved pandals by query', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dev-bot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Find pandals in Bagbazar',
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.reply, 'Reply must exist');
  assert.ok(Array.isArray(json.cards), 'Cards array must be present');
  assert.ok(json.cards.length > 0, 'Should find at least 1 pandal in Bagbazar');
  testConversationId = json.conversationId;
});

test('2. Visitor Mode: Find nearby pandals with valid GPS coordinates', async () => {
  // Coordinate near North Kolkata (Bagbazar: 22.602, 88.368)
  const res = await fetch(`${baseUrl}/api/v1/dev-bot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Find pandals near me',
      conversationId: testConversationId,
      userLocation: {
        latitude: 22.602,
        longitude: 88.368,
      },
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.cards.length > 0);
  // Verify distance is calculated and formatted
  const firstCard = json.cards[0];
  assert.ok(firstCard.distance != null, 'Distance should be computed');
  assert.ok(firstCard.distanceKm != null || firstCard.distanceMeters != null);
});

test('3. Security: Unauthenticated request to /imports/preview returns 401', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dev-bot/imports/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText: 'Test Pandal — Test Address — Test Locality',
    }),
  });

  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.success, false);
});

test('4. Security: Regular user request to /imports/preview returns 403 Forbidden', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dev-bot/imports/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: regularUserCookie,
    },
    body: JSON.stringify({
      rawText: 'Test Pandal — Test Address — Test Locality',
    }),
  });

  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.success, false);
});

test('5. Admin Mode: Parse and preview bulk pandal text with duplicate detection', async () => {
  const ts = Date.now();
  const testNameAlpha = `DevBot Test Pandal Alpha ${ts}`;
  const testNameBeta = `DevBot Test Pandal Beta ${ts}`;

  const testInput = [
    '1. Hatibagan Sarbojanin — 84/2, Aurobindo Sarani — North Kolkata', // duplicate of existing
    `2. ${testNameAlpha} — 12, Bidhan Sarani — Shyambazar, Kolkata`,
    `3. ${testNameBeta} — 45, Rashbehari Avenue — Gariahat, South Kolkata`,
  ].join('\n');

  const res = await fetch(`${baseUrl}/api/v1/dev-bot/imports/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      rawText: testInput,
      sourceType: 'pasted_text',
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const preview = json.preview || json.data;

  assert.ok(preview.jobId, 'Must return a jobId');
  assert.equal(preview.summary.totalRows, 3);
  // Hatibagan should be flagged as potential duplicate
  assert.ok(preview.summary.duplicateRows >= 1, 'Should flag Hatibagan as duplicate');

  // Verify rows structure
  const firstRow = preview.rows[0];
  assert.equal(firstRow.name, 'Hatibagan Sarbojanin');
  assert.equal(firstRow.validationStatus, 'duplicate');
  assert.ok(firstRow.duplicateMatch != null, 'Must contain duplicateMatch object');

  // Confirm import with only the non-duplicate rows (Alpha and Beta)
  const confirmRes = await fetch(`${baseUrl}/api/v1/dev-bot/imports/${preview.jobId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      selectedRowNumbers: [2, 3],
    }),
  });

  assert.equal(confirmRes.status, 200);
  const confirmJson = await confirmRes.json();
  assert.equal(confirmJson.success, true);
  assert.equal(confirmJson.importedCount, 2);

  // Verify in MongoDB database
  const importedPujas = await Puja.find({
    name: { $in: [testNameAlpha, testNameBeta] },
  });
  assert.equal(importedPujas.length, 2);
  createdPujaIds.push(...importedPujas.map((p) => p._id));
});

test('6. Conversation: Cleanup / Delete conversation', async () => {
  if (!testConversationId) return;

  const res = await fetch(`${baseUrl}/api/v1/dev-bot/conversations/${testConversationId}`, {
    method: 'DELETE',
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const found = await DevBotConversation.findById(testConversationId);
  assert.equal(found, null);
});
