import { z } from 'zod';

export const ColumnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  data_type: z.string(),
  semantic_role: z.string().optional()
});

export const ProjectMetadataSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required'),
  created_at: z.string(),
  updated_at: z.string()
});

export const DatasetSchema = z.object({
  metadata: z.record(z.any()).optional().default({}),
  columns: z.array(ColumnSchema).min(1, 'Dataset must have at least one column'),
  records: z.array(z.record(z.any())).min(1, 'Dataset must contain at least one record')
});

export const DataQualitySchema = z.object({
  issues: z.array(z.any()).optional().default([]),
  normalization_rules: z.array(z.any()).optional().default([]),
  cleaning_history: z.array(z.any()).optional().default([])
}).optional().default({});

export const AnalyticsSchema = z.object({
  metrics: z.record(z.any()).optional().default({}),
  trends: z.record(z.any()).optional().default({}),
  comparisons: z.record(z.any()).optional().default({})
}).optional().default({});

export const CalculationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string(),
  created_at: z.string().optional()
});

export const TabWidgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  config: z.record(z.any()).optional()
});

export const DashboardTabSchema = z.object({
  id: z.string(),
  title: z.string(),
  widgets: z.array(TabWidgetSchema).optional().default([])
});

export const DashboardConfigSchema = z.object({
  tabs: z.array(DashboardTabSchema).default([])
});

export const AIContextSchema = z.object({
  business_type: z.string().nullable().optional(),
  column_mappings: z.record(z.string()).optional().default({}),
  analysis_preferences: z.record(z.any()).optional().default({})
}).optional().default({});

export const BLYcProjectSchema = z.object({
  format: z.literal('BLYc', {
    errorMap: () => ({ message: "Invalid format header. Must be 'BLYc'." })
  }),
  schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, {
    message: "Invalid schema version format. Must follow semver, e.g. '1.0.0'."
  }),
  project: ProjectMetadataSchema,
  dataset: DatasetSchema,
  data_quality: DataQualitySchema,
  analytics: AnalyticsSchema,
  calculations: z.array(CalculationItemSchema).optional().default([]),
  dashboard: DashboardConfigSchema,
  ai_context: AIContextSchema
});

export type BLYcProjectManifest = z.infer<typeof BLYcProjectSchema>;
