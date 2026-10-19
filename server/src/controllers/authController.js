import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { env } from '../config/env.js';

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
  );
}

function generateRefreshToken(user, familyId = crypto.randomUUID()) {
  const jti = crypto.randomUUID();
  return {
    token: jwt.sign({ id: user._id, type: 'refresh' }, env.JWT_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      jwtid: jti,
      algorithm: 'HS256',
    }),
    jti,
    familyId,
  };
}

function cookieOptions(refresh = false, req = null) {
  const isHttpsRequest = req?.secure || req?.get?.('x-forwarded-proto') === 'https';
  const isProduction = env.NODE_ENV === 'production' || isHttpsRequest;
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: (refresh ? env.REFRESH_TOKEN_DAYS : 1) * 24 * 60 * 60 * 1000,
    path: refresh ? '/api/v1/auth' : '/',
  };
}

function getDeviceContext(req) {
  return {
    deviceId: (req.get('x-device-id') || '').slice(0, 160),
    deviceName: (req.get('x-device-name') || '').slice(0, 120),
    platform: (req.get('sec-ch-ua-platform') || '').slice(0, 80),
  };
}

async function createRefreshSession(user, token, jti, familyId, req) {
  const decoded = jwt.decode(token);
  const device = getDeviceContext(req);
  return RefreshSession.create({
    userId: user._id,
    jti,
    familyId,
    tokenHash: hashToken(token),
    expiresAt: new Date(decoded.exp * 1000),
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
    ...device,
  });
}

async function issueTokenPair(res, user, req) {
  const refresh = generateRefreshToken(user);
  const accessToken = generateAccessToken(user);
  await createRefreshSession(user, refresh.token, refresh.jti, refresh.familyId, req);
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(false, req));
  res.cookie(REFRESH_COOKIE, refresh.token, cookieOptions(true, req));
  return { accessToken, refreshToken: refresh.token };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists. Please log in instead.' });
    }
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'visitor' });
    const tokens = await issueTokenPair(res, user, req);
    return res.status(201).json({ success: true, message: 'Account registered successfully. Welcome to PujoMap!', user: publicUser(user), ...tokens });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
    }
    const tokens = await issueTokenPair(res, user, req);
    return res.json({ success: true, message: 'Logged in successfully.', user: publicUser(user), ...tokens });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh session not found. Please log in again.' });

    const decoded = jwt.verify(refreshToken, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh' || !decoded.jti) return res.status(401).json({ success: false, message: 'Invalid refresh session.' });

    const session = await RefreshSession.findOne({
      jti: decoded.jti,
      tokenHash: hashToken(refreshToken),
    });
    if (!session || session.expiresAt <= new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh session expired. Please log in again.' });
    }
    if (session.revokedAt) {
      await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { revokedAt: new Date() });
      return res.status(401).json({ success: false, message: 'Refresh token reuse detected. This device session has been revoked.' });
    }

    const device = getDeviceContext(req);
    if (session.deviceId && device.deviceId && session.deviceId !== device.deviceId) {
      await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { revokedAt: new Date() });
      return res.status(401).json({ success: false, message: 'Device verification failed. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ success: false, message: 'User account not found or has been deactivated.' });

    const familyId = session.familyId || crypto.randomUUID();
    const nextRefresh = generateRefreshToken(user, familyId);
    session.revokedAt = new Date();
    session.replacedByJti = nextRefresh.jti;
    session.lastSeenAt = new Date();
    session.familyId = familyId;
    await session.save();
    await createRefreshSession(user, nextRefresh.token, nextRefresh.jti, nextRefresh.familyId, req);

    const accessToken = generateAccessToken(user);
    res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(false, req));
    res.cookie(REFRESH_COOKIE, nextRefresh.token, cookieOptions(true, req));
    return res.json({ success: true, accessToken, refreshToken: nextRefresh.token });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh session expired. Please log in again.' });
    }
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const decoded = refreshToken ? jwt.decode(refreshToken) : null;
    if (decoded?.jti) {
      await RefreshSession.findOneAndUpdate(
        { jti: decoded.jti, tokenHash: hashToken(refreshToken), revokedAt: null },
        { revokedAt: new Date() }
      );
    }
    res.clearCookie(ACCESS_COOKIE, cookieOptions(false, req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions(true, req));
    res.clearCookie('token', cookieOptions(false, req));
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

export async function listSessions(req, res, next) {
  try {
    const sessions = await RefreshSession.find({ userId: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastSeenAt: -1 })
      .select('_id deviceId deviceName platform userAgent ipAddress createdAt lastSeenAt expiresAt');
    return res.json({ success: true, sessions });
  } catch (err) {
    return next(err);
  }
}

export async function revokeSession(req, res, next) {
  try {
    const session = await RefreshSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, revokedAt: null },
      { revokedAt: new Date() },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Active device session not found.' });
    return res.json({ success: true, message: 'Device session revoked.' });
  } catch (err) {
    return next(err);
  }
}

export async function revokeAllSessions(req, res, next) {
  try {
    await RefreshSession.updateMany({ userId: req.user._id, revokedAt: null }, { revokedAt: new Date() });
    return res.json({ success: true, message: 'All device sessions revoked. Please log in again on this device.' });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}
