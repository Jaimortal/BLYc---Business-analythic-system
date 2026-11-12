import { GroqAIService, GROQ_FIXED_MODEL, BusinessAnalyticsContext } from './ai/groq.service.js';

async function runAITests() {
  console.log('--- Starting BLYc Phase 9 AI Business Assistant Tests ---');

  // Test 1: Model Lock Verification
  console.log('\n[Test 1] Verifying strict model ID lock to openai/gpt-oss-20b...');
  if (GROQ_FIXED_MODEL !== 'openai/gpt-oss-20b') {
    throw new Error(`CRITICAL: Model ID must be strictly 'openai/gpt-oss-20b', found: ${GROQ_FIXED_MODEL}`);
  }
  console.log(`✅ Model strictly locked to: ${GROQ_FIXED_MODEL}`);

  // Test 2: Deterministic Context Formatter
  console.log('\n[Test 2] Testing deterministic context formatting...');
  const sampleContext: BusinessAnalyticsContext = {
    business_type: 'Boutique Coffee Roaster',
    business_metrics: {
      total_revenue: 14500.50,
      total_orders: 280,
      total_quantity_sold: 520,
      average_order_value: 51.79,
      total_profit: 6200.00,
      profit_margin_percent: 42.76,
      top_products: [
        { product: 'Ethiopian Yirgacheffe 1kg', revenue: 6500.00, category: 'Single Origin' },
        { product: 'Cold Brew Blend 500g', revenue: 4200.00, category: 'Blends' }
      ],
      lowest_products: [
        { product: 'Paper Filters 100pk', revenue: 350.00, category: 'Accessories' }
      ],
      revenue_by_category: [
        { category: 'Single Origin', revenue: 8500.00, percentage: 58.6 },
        { category: 'Blends', revenue: 5650.50, percentage: 39.0 }
      ]
    },
    time_series: {
      period: 'daily',
      points: [
        { date: '2026-03-01', revenue: 2100.00, orders: 40 },
        { date: '2026-03-02', revenue: 2450.00, orders: 48 }
      ]
    }
  };

  const formatted = GroqAIService.formatAnalyticsContext(sampleContext);
  if (!formatted.includes('VERIFIED BUSINESS ANALYTICS')) {
    throw new Error('Context missing authoritative header');
  }
  if (!formatted.includes('$14,500.5') || !formatted.includes('Ethiopian Yirgacheffe')) {
    throw new Error('Context missing verified revenue or product citation');
  }
  if (!formatted.includes('42.76%')) {
    throw new Error('Context missing verified profit margin percentage');
  }
  console.log('✅ Deterministic context properly constructed with verified numbers.');

  // Test 3: AI Assistant Call & Fallback Handling
  console.log('\n[Test 3] Testing AI Assistant inference and graceful offline fallback...');
  const result = await GroqAIService.askAssistant(
    'What should I do to increase my profitability?',
    sampleContext,
    []
  );

  if (!result.response || !result.response.trim()) {
    throw new Error('AI Assistant returned empty response');
  }
  if (result.model !== 'openai/gpt-oss-20b') {
    throw new Error(`Model mismatch in response: ${result.model}`);
  }
  if (!result.response.includes('14,500.5') && !result.response.includes('Ethiopian Yirgacheffe') && !result.response.includes('AOV')) {
    throw new Error('Assistant response failed to cite verified business metrics.');
  }

  console.log(`✅ Assistant response generated using model: ${result.model} (source: ${result.source})`);
  console.log('\n🎉 ALL PHASE 9 AI ASSISTANT TESTS PASSED CLEANLY!\n');
}

runAITests().catch((err) => {
  console.error('❌ AI Assistant test failed:', err);
  process.exit(1);
});
