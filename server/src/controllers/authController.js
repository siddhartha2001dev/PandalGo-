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

function generateRefreshToken(user) {
  const jti = crypto.randomUUID();
  return {
    token: jwt.sign({ id: user._id, type: 'refresh' }, env.JWT_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      jwtid: jti,
      algorithm: 'HS256',
    }),
    jti,
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

async function createRefreshSession(user, token, jti, req) {
  const decoded = jwt.decode(token);
  return RefreshSession.create({
    userId: user._id,
    jti,
    tokenHash: hashToken(token),
    expiresAt: new Date(decoded.exp * 1000),
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
  });
}

async function issueTokenPair(res, user, req) {
  const refresh = generateRefreshToken(user);
  await createRefreshSession(user, refresh.token, refresh.jti, req);
  res.cookie(ACCESS_COOKIE, generateAccessToken(user), cookieOptions(false, req));
  res.cookie(REFRESH_COOKIE, refresh.token, cookieOptions(true, req));
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
    await issueTokenPair(res, user, req);
    return res.status(201).json({ success: true, message: 'Account registered successfully. Welcome to PujoMap!', user: publicUser(user) });
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
    await issueTokenPair(res, user, req);
    return res.json({ success: true, message: 'Logged in successfully.', user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh session not found. Please log in again.' });

    const decoded = jwt.verify(refreshToken, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh' || !decoded.jti) return res.status(401).json({ success: false, message: 'Invalid refresh session.' });

    const session = await RefreshSession.findOne({
      jti: decoded.jti,
      tokenHash: hashToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return res.status(401).json({ success: false, message: 'Refresh session expired or revoked. Please log in again.' });

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ success: false, message: 'User account not found or has been deactivated.' });

    const nextRefresh = generateRefreshToken(user);
    session.revokedAt = new Date();
    session.replacedByJti = nextRefresh.jti;
    await session.save();
    await createRefreshSession(user, nextRefresh.token, nextRefresh.jti, req);

    res.cookie(ACCESS_COOKIE, generateAccessToken(user), cookieOptions(false, req));
    res.cookie(REFRESH_COOKIE, nextRefresh.token, cookieOptions(true, req));
    return res.json({ success: true });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh session expired. Please log in again.' });
    }
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
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

export async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}
