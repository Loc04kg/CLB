import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import prisma from '../lib/prisma';
import { AttendanceMethod } from '@prisma/client';

const router = Router();
const userChallenges: { [userId: string]: string } = {};

const rpName = 'HUTECH Club Management';
const rpID = 'localhost'; // In production, this should be the domain, e.g., 'hutech-clb.com'
const origin = `http://${rpID}:3000`; // Ensure this matches frontend URL exactly

// =========================================================
// REGISTRATION (Tạo vân tay/Passkey)
// =========================================================
router.get('/register/generate-options', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: user.authenticators.map((auth) => ({
        id: Buffer.from(auth.credentialID, 'base64').toString('base64url'),
        type: 'public-key',
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    userChallenges[user.id] = options.challenge;
    res.json(options);
  } catch (error) {
    console.error('generateRegistrationOptions error:', error);
    res.status(500).json({ message: 'Failed to generate registration options' });
  }
});

router.post('/register/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const expectedChallenge = userChallenges[user.id];
    if (!expectedChallenge) return res.status(400).json({ message: 'Challenge expired or not found' });

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }

    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
      const { credentialDeviceType, credentialBackedUp, credential } = registrationInfo;
      
      await prisma.authenticator.create({
        data: {
          credentialID: Buffer.from(credential.id, 'base64url').toString('base64'),
          credentialPublicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          credentialDeviceType,
          credentialBackedUp,
          userId: user.id,
          transports: req.body.response.transports?.join(',') || '',
        },
      });

      delete userChallenges[user.id];
      res.json({ verified: true });
    } else {
      res.status(400).json({ message: 'Verification failed' });
    }
  } catch (error) {
    console.error('verifyRegistration error:', error);
    res.status(500).json({ message: 'Failed to verify registration' });
  }
});

// =========================================================
// AUTHENTICATION (Điểm danh bằng vân tay)
// =========================================================
router.get('/authenticate/generate-options', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators.map(auth => ({
        id: Buffer.from(auth.credentialID, 'base64').toString('base64url'),
        type: 'public-key',
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })),
      userVerification: 'preferred',
    });

    userChallenges[user.id] = options.challenge;
    res.json(options);
  } catch (error) {
    console.error('generateAuthenticationOptions error:', error);
    res.status(500).json({ message: 'Failed to generate authentication options' });
  }
});

router.post('/authenticate/verify-checkin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { eventId, credential } = req.body; // credential is the webauthn response
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Validate Event
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    if (event.status !== 'APPROVED') return res.status(400).json({ message: 'Sự kiện chưa được duyệt' });

    // Ensure member
    const membership = await prisma.clubMember.findFirst({
      where: { clubId: event.clubId, userId, status: 'APPROVED' }
    });
    if (!membership && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn chưa là thành viên của CLB này' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { authenticators: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const expectedChallenge = userChallenges[user.id];
    if (!expectedChallenge) return res.status(400).json({ message: 'Challenge expired or not found' });

    const authenticator = user.authenticators.find(
      auth => Buffer.from(auth.credentialID, 'base64').toString('base64url') === credential.id
    );

    if (!authenticator) {
      return res.status(400).json({ message: 'Authenticator is not registered with this site' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: Buffer.from(authenticator.credentialID, 'base64').toString('base64url'),
          publicKey: new Uint8Array(Buffer.from(authenticator.credentialPublicKey)),
          counter: Number(authenticator.counter),
          transports: authenticator.transports ? (authenticator.transports.split(',') as any[]) : undefined,
        },
      });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }

    const { verified, authenticationInfo } = verification;
    if (verified && authenticationInfo) {
      // Update counter
      await prisma.authenticator.update({
        where: { credentialID: authenticator.credentialID },
        data: { counter: BigInt(authenticationInfo.newCounter) }
      });

      delete userChallenges[user.id];

      // Create attendance record
      const existing = await prisma.attendance.findFirst({ where: { eventId, userId } });
      if (existing) {
        return res.status(400).json({ message: 'Bạn đã điểm danh cho sự kiện này rồi' });
      }

      const record = await prisma.attendance.create({
        data: {
          eventId,
          userId,
          method: AttendanceMethod.FINGERPRINT,
          isValid: true,
        }
      });

      res.status(201).json({ message: 'Điểm danh vân tay thành công!', record });
    } else {
      res.status(400).json({ message: 'Xác thực vân tay thất bại' });
    }
  } catch (error) {
    console.error('verifyAuthentication error:', error);
    res.status(500).json({ message: 'Failed to verify authentication' });
  }
});

export default router;
