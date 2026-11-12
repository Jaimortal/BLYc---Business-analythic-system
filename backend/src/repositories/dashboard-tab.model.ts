import mongoose, { Document, Schema } from 'mongoose';

export interface ITabWidget {
  id: string;
  type: 'metric' | 'bar_chart' | 'line_chart' | 'table';
  title: string;
  column?: string;
  formula?: string;
  config?: Record<string, any>;
}

export interface ICustomTab {
  id: string;
  name: string;
  description?: string;
  widgets: ITabWidget[];
}

export interface IDashboardConfig extends Document {
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

const WidgetSchema = new Schema<ITabWidget>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['metric', 'bar_chart', 'line_chart', 'table'], required: true },
    title: { type: String, required: true },
    column: { type: String },
    formula: { type: String },
    config: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const CustomTabSchema = new Schema<ICustomTab>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    widgets: { type: [WidgetSchema], default: [] }
  },
  { _id: false }
);

const DashboardConfigSchema = new Schema<IDashboardConfig>(
  {
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, default: 'default', index: true },
    tabs: { type: [CustomTabSchema], default: [] },
    customCalculations: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          formula: { type: String, required: true },
          targetColumn: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const DashboardConfigModel =
  mongoose.models.DashboardConfig ||
  mongoose.model<IDashboardConfig>('DashboardConfig', DashboardConfigSchema);
