import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences {
  theme: 'light' | 'dark';
  currency: string;
  dateFormat: string;
  numberFormat: 'standard' | 'compact';
}

export interface IUser extends Document {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      currency: { type: String, default: 'USD' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      numberFormat: { type: String, enum: ['standard', 'compact'], default: 'standard' }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
