import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../security/hash.js';
import { generateToken } from '../security/token.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await UserRepository.create({
      email: input.email,
      passwordHash
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      },
      token
    };
  }

  static async login(input: LoginInput) {
    const user = await UserRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      },
      token
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      preferences: user.preferences
    };
  }
}
