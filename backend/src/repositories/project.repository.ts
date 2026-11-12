import { ProjectModel, IProjectDocument } from './project.model.js';
import { BLYcProjectManifest } from '../validators/project.validator.js';

export interface ProjectRecord {
  id: string;
  userId: string;
  manifest: BLYcProjectManifest;
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryProjects = new Map<string, ProjectRecord>();

export class ProjectRepository {
  static async create(userId: string, manifest: BLYcProjectManifest): Promise<ProjectRecord> {
    const projectId = manifest.project.id;

    try {
      const doc = await ProjectModel.create({
        userId,
        manifest
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId,
        manifest: doc.manifest,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    } catch {
      // In-memory fallback
    }

    const record: ProjectRecord = {
      id: projectId,
      userId,
      manifest,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryProjects.set(projectId, record);
    return record;
  }

  static async findById(id: string, userId: string): Promise<ProjectRecord | null> {
    try {
      const doc = await ProjectModel.findOne({
        $or: [{ _id: id }, { 'manifest.project.id': id }],
        userId
      }).exec();

      if (doc) {
        return {
          id: doc._id.toString(),
          userId: doc.userId,
          manifest: doc.manifest,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        };
      }
    } catch {
      // fallback
    }

    const record = inMemoryProjects.get(id);
    if (record && record.userId === userId) {
      return record;
    }
    return null;
  }

  static async listByUser(userId: string): Promise<ProjectRecord[]> {
    try {
      const docs = await ProjectModel.find({ userId }).sort({ updatedAt: -1 }).exec();
      if (docs && docs.length > 0) {
        return docs.map(doc => ({
          id: doc._id.toString(),
          userId: doc.userId,
          manifest: doc.manifest,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }));
      }
    } catch {
      // fallback
    }

    const list: ProjectRecord[] = [];
    for (const record of inMemoryProjects.values()) {
      if (record.userId === userId) {
        list.push(record);
      }
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    try {
      const res = await ProjectModel.deleteOne({
        $or: [{ _id: id }, { 'manifest.project.id': id }],
        userId
      }).exec();
      if (res.deletedCount && res.deletedCount > 0) {
        return true;
      }
    } catch {
      // fallback
    }

    const record = inMemoryProjects.get(id);
    if (record && record.userId === userId) {
      inMemoryProjects.delete(id);
      return true;
    }
    return false;
  }
}
