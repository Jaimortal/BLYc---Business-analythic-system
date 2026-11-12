import { BLYcProjectSchema, BLYcProjectManifest } from './validators/project.validator.js';
import { ProjectRepository } from './repositories/project.repository.js';

async function runProjectTests() {
  console.log('--- Starting BLYc Phase 8 JSON Project System Tests ---');

  const sampleValidManifest: BLYcProjectManifest = {
    format: 'BLYc',
    schema_version: '1.0.0',
    project: {
      id: 'proj_test_001',
      name: 'Spring Electronics Sales 2026',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    dataset: {
      metadata: { source: 'Excel Upload', rows: 2, columns: 3 },
      columns: [
        { name: 'Product', data_type: 'string', semantic_role: 'product' },
        { name: 'Price', data_type: 'numeric', semantic_role: 'price' },
        { name: 'Quantity', data_type: 'numeric', semantic_role: 'quantity' }
      ],
      records: [
        { Product: 'Mechanical Keyboard', Price: 89.99, Quantity: 15 },
        { Product: 'Gaming Mouse', Price: 49.99, Quantity: 24 }
      ]
    },
    data_quality: {
      issues: [],
      normalization_rules: [],
      cleaning_history: []
    },
    analytics: {
      metrics: { total_revenue: 2549.61 },
      trends: {},
      comparisons: {}
    },
    calculations: [
      {
        id: 'calc_001',
        name: 'Gross_Revenue',
        formula: '[Price] * [Quantity]',
        created_at: new Date().toISOString()
      }
    ],
    dashboard: {
      tabs: [
        {
          id: 'tab_overview',
          title: 'Executive Overview',
          widgets: [
            { id: 'w_1', type: 'metric', title: 'Total Revenue' }
          ]
        }
      ]
    },
    ai_context: {
      business_type: 'Retail E-commerce',
      column_mappings: { Price: 'price', Quantity: 'quantity' },
      analysis_preferences: {}
    }
  };

  // Test 1: Validate compliant project manifest
  console.log('\n[Test 1] Validating fully-compliant BLYc project schema...');
  const validResult = BLYcProjectSchema.safeParse(sampleValidManifest);
  if (!validResult.success) {
    throw new Error(`Valid schema was unexpectedly rejected: ${JSON.stringify(validResult.error)}`);
  }
  console.log('✅ Compliant BLYc project manifest successfully validated.');

  // Test 2: Reject non-compliant schemas (wrong format, missing fields, invalid semver)
  console.log('\n[Test 2] Testing schema rejection on invalid payloads...');
  
  // Case 2a: Invalid format name
  const invalidFormat = { ...sampleValidManifest, format: 'INVALID_FORMAT' };
  const res2a = BLYcProjectSchema.safeParse(invalidFormat);
  if (res2a.success) throw new Error('Schema with invalid format should have been rejected.');

  // Case 2b: Invalid semver
  const invalidSemver = { ...sampleValidManifest, schema_version: 'v1-beta' };
  const res2b = BLYcProjectSchema.safeParse(invalidSemver);
  if (res2b.success) throw new Error('Schema with invalid semver should have been rejected.');

  // Case 2c: Empty dataset records
  const emptyDataset = { ...sampleValidManifest, dataset: { ...sampleValidManifest.dataset, records: [] } };
  const res2c = BLYcProjectSchema.safeParse(emptyDataset);
  if (res2c.success) throw new Error('Schema with empty dataset records should have been rejected.');

  console.log('✅ All invalid project payloads properly rejected.');

  // Test 3: Project Repository CRUD & Multi-Tenant Isolation
  console.log('\n[Test 3] Testing Project Repository CRUD and Tenant Isolation...');
  const userA = 'user_alpha_123';
  const userB = 'user_bravo_456';

  // Create project for User A
  const created = await ProjectRepository.create(userA, sampleValidManifest);
  if (!created || created.manifest.project.name !== 'Spring Electronics Sales 2026') {
    throw new Error('Failed to create project in repository.');
  }

  // User A can access
  const retrievedByA = await ProjectRepository.findById(sampleValidManifest.project.id, userA);
  if (!retrievedByA) {
    throw new Error('User A could not retrieve own project.');
  }

  // User B CANNOT access User A's project
  const retrievedByB = await ProjectRepository.findById(sampleValidManifest.project.id, userB);
  if (retrievedByB !== null) {
    throw new Error('Tenant isolation breach: User B accessed User A project!');
  }

  // User B cannot delete User A's project
  const deleteByB = await ProjectRepository.delete(sampleValidManifest.project.id, userB);
  if (deleteByB) {
    throw new Error('Tenant isolation breach: User B was able to delete User A project!');
  }

  // User A can list and delete own project
  const userAList = await ProjectRepository.listByUser(userA);
  if (userAList.length !== 1) {
    throw new Error(`Expected 1 project for User A, found ${userAList.length}`);
  }

  const deleteByA = await ProjectRepository.delete(sampleValidManifest.project.id, userA);
  if (!deleteByA) {
    throw new Error('User A failed to delete own project.');
  }

  const afterDeleteList = await ProjectRepository.listByUser(userA);
  if (afterDeleteList.length !== 0) {
    throw new Error('Project remained after deletion.');
  }

  console.log('✅ Project Repository CRUD and Tenant Isolation verified.');
  console.log('\n🎉 ALL PHASE 8 PROJECT SYSTEM TESTS PASSED CLEANLY!\n');
}

runProjectTests().catch((err) => {
  console.error('❌ Project test failed:', err);
  process.exit(1);
});
