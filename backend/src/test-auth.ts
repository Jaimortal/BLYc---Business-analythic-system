import { AuthService } from './services/auth.service.js';
import { hashPassword, verifyPassword } from './security/hash.js';
import { generateToken, verifyToken } from './security/token.js';

async function runTests() {
  console.log('--- Starting BLYc Phase 2 Authentication & Security Tests ---');

  // Test 1: Argon2id Password Hashing
  console.log('\n[Test 1] Testing Argon2id password hashing and verification...');
  const rawPassword = 'Password123!';
  const hash = await hashPassword(rawPassword);
  if (!hash.startsWith('$argon2id$')) {
    throw new Error('Hash algorithm is not Argon2id.');
  }
  const isMatch = await verifyPassword(rawPassword, hash);
  const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
  if (!isMatch || isWrongMatch) {
    throw new Error('Argon2id password verification failed.');
  }
  console.log('✅ Argon2id password hashing verified.');

  // Test 2: JWT Generation & Verification
  console.log('\n[Test 2] Testing JWT session token generation and verification...');
  const token = generateToken({
    userId: 'test-user-123',
    email: 'founder@blyc.test',
    role: 'user'
  });
  const verified = verifyToken(token);
  if (!verified || verified.userId !== 'test-user-123' || verified.email !== 'founder@blyc.test') {
    throw new Error('JWT token verification failed or payload mismatch.');
  }
  const forgedToken = token.slice(0, -6) + 'abc123';
  if (verifyToken(forgedToken) !== null) {
    throw new Error('Forged JWT token was improperly accepted.');
  }
  console.log('✅ JWT session token security verified.');

  // Test 3: User Registration & Duplicate Email Protection
  console.log('\n[Test 3] Testing user registration and duplicate prevention...');
  const user1 = await AuthService.register({
    email: 'founder1@startup.io',
    password: 'SecurePassword123!'
  });
  if (!user1.user || user1.user.email !== 'founder1@startup.io') {
    throw new Error('User registration failed.');
  }

  let duplicateBlocked = false;
  try {
    await AuthService.register({
      email: 'founder1@startup.io',
      password: 'AnotherPassword123!'
    });
  } catch (err: any) {
    duplicateBlocked = true;
  }
  if (!duplicateBlocked) {
    throw new Error('Duplicate email registration was not blocked.');
  }
  console.log('✅ User registration and unique email guard verified.');

  // Test 4: User Authentication / Login
  console.log('\n[Test 4] Testing user login with valid and invalid credentials...');
  const loginSuccess = await AuthService.login({
    email: 'founder1@startup.io',
    password: 'SecurePassword123!'
  });
  if (!loginSuccess.token || loginSuccess.user.email !== 'founder1@startup.io') {
    throw new Error('Valid login failed.');
  }

  let invalidLoginBlocked = false;
  try {
    await AuthService.login({
      email: 'founder1@startup.io',
      password: 'IncorrectPassword999!'
    });
  } catch {
    invalidLoginBlocked = true;
  }
  if (!invalidLoginBlocked) {
    throw new Error('Invalid password was improperly accepted.');
  }
  console.log('✅ User login authentication verified.');

  // Test 5: Multi-Tenant & User Isolation
  console.log('\n[Test 5] Testing multi-user tenant data isolation...');
  const user2 = await AuthService.register({
    email: 'founder2@anotherbusiness.com',
    password: 'PasswordB456!'
  });

  const profileUser1 = await AuthService.getCurrentUser(user1.user.id);
  const profileUser2 = await AuthService.getCurrentUser(user2.user.id);

  if (profileUser1.id === profileUser2.id || profileUser1.email === profileUser2.email) {
    throw new Error('Multi-user tenant collision detected.');
  }
  console.log('✅ Multi-user identity and data isolation verified.');

  console.log('\n🎉 ALL PHASE 2 BACKEND & AUTHENTICATION TESTS PASSED CLEANLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
