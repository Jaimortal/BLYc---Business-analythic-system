import { UserModel, IUser } from './user.model.js';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  preferences: {
    theme: 'light' | 'dark';
    currency: string;
    dateFormat: string;
    numberFormat: 'standard' | 'compact';
  };
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryUsers = new Map<string, UserRecord>();

export class UserRepository {
  static async findByEmail(email: string): Promise<UserRecord | null> {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() }).exec();
      if (user) {
        return {
          id: user._id.toString(),
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      }
    } catch {
      // Fallback to in-memory store
    }

    const memoryUser = inMemoryUsers.get(email.toLowerCase());
    return memoryUser || null;
  }

  static async findById(id: string): Promise<UserRecord | null> {
    try {
      const user = await UserModel.findById(id).exec();
      if (user) {
        return {
          id: user._id.toString(),
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      }
    } catch {
      // Fallback
    }

    for (const u of inMemoryUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  static async create(data: { email: string; passwordHash: string }): Promise<UserRecord> {
    const defaultPreferences = {
      theme: 'light' as const,
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: 'standard' as const
    };

    try {
      const created = await UserModel.create({
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        preferences: defaultPreferences
      });

      return {
        id: created._id.toString(),
        email: created.email,
        passwordHash: created.passwordHash,
        role: created.role,
        preferences: created.preferences,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      };
    } catch {
      // Fallback to memory store
    }

    const newRecord: UserRecord = {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: 'user',
      preferences: defaultPreferences,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryUsers.set(newRecord.email, newRecord);
    return newRecord;
  }
}
