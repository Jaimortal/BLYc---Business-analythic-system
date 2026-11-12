import mongoose, { Document, Schema } from 'mongoose';
import { BLYcProjectManifest } from '../validators/project.validator.js';

export interface IProjectDocument extends Document {
  id: string;
  userId: string;
  manifest: BLYcProjectManifest;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    userId: { type: String, required: true, index: true },
    manifest: { type: Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true
  }
);

export const ProjectModel =
  mongoose.models.Project || mongoose.model<IProjectDocument>('Project', ProjectSchema);
