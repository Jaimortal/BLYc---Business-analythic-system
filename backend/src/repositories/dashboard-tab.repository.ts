import { DashboardConfigModel, ICustomTab, IDashboardConfig } from './dashboard-tab.model.js';

export interface DashboardConfigRecord {
  id: string;
  userId: string;
  projectId: string;
  tabs: ICustomTab[];
  customCalculations: Array<{
    id: string;
    name: string;
    formula: string;
    targetColumn: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryConfigs = new Map<string, DashboardConfigRecord>();

export class DashboardConfigRepository {
  private static getKey(userId: string, projectId: string = 'default'): string {
    return `${userId}:${projectId}`;
  }

  static async getConfig(userId: string, projectId: string = 'default'): Promise<DashboardConfigRecord> {
    try {
      const doc = await DashboardConfigModel.findOne({ userId, projectId }).exec();
      if (doc) {
        return {
          id: doc._id.toString(),
          userId: doc.userId,
          projectId: doc.projectId,
          tabs: doc.tabs,
          customCalculations: doc.customCalculations,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        };
      }
    } catch {
      // In-memory fallback
    }

    const key = this.getKey(userId, projectId);
    const existing = inMemoryConfigs.get(key);
    if (existing) {
      return existing;
    }

    const initial: DashboardConfigRecord = {
      id: `cfg_${Date.now()}`,
      userId,
      projectId,
      tabs: [],
      customCalculations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryConfigs.set(key, initial);
    return initial;
  }

  static async saveTabs(userId: string, projectId: string = 'default', tabs: ICustomTab[]): Promise<DashboardConfigRecord> {
    const key = this.getKey(userId, projectId);

    try {
      const updated = await DashboardConfigModel.findOneAndUpdate(
        { userId, projectId },
        { tabs, updatedAt: new Date() },
        { upsert: true, new: true }
      ).exec();

      if (updated) {
        return {
          id: updated._id.toString(),
          userId: updated.userId,
          projectId: updated.projectId,
          tabs: updated.tabs,
          customCalculations: updated.customCalculations,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        };
      }
    } catch {
      // Fallback
    }

    const existing = await this.getConfig(userId, projectId);
    existing.tabs = tabs;
    existing.updatedAt = new Date();
    inMemoryConfigs.set(key, existing);
    return existing;
  }

  static async addCalculation(
    userId: string,
    projectId: string = 'default',
    calc: { id: string; name: string; formula: string; targetColumn: string }
  ): Promise<DashboardConfigRecord> {
    const key = this.getKey(userId, projectId);

    try {
      const updated = await DashboardConfigModel.findOneAndUpdate(
        { userId, projectId },
        {
          $push: { customCalculations: { ...calc, createdAt: new Date() } },
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      ).exec();

      if (updated) {
        return {
          id: updated._id.toString(),
          userId: updated.userId,
          projectId: updated.projectId,
          tabs: updated.tabs,
          customCalculations: updated.customCalculations,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        };
      }
    } catch {
      // Fallback
    }

    const existing = await this.getConfig(userId, projectId);
    existing.customCalculations.push({ ...calc, createdAt: new Date() });
    existing.updatedAt = new Date();
    inMemoryConfigs.set(key, existing);
    return existing;
  }
}
