import Groq from 'groq-sdk';
import { envConfig } from '../config/env.js';
import { BLYC_SYSTEM_KNOWLEDGE } from './blyc_system_knowledge.js';

export const GROQ_FIXED_MODEL = 'openai/gpt-oss-20b';

export type BusinessAnalyticsContext = any;

const safeCurrency = (val: any): string => {
  if (typeof val === 'number' && !isNaN(val)) {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return 'N/A';
};

const safeInt = (val: any): string => {
  if (typeof val === 'number' && !isNaN(val)) {
    return Math.round(val).toLocaleString('en-US');
  }
  return 'N/A';
};

const safePercent = (val: any): string => {
  if (typeof val === 'number' && !isNaN(val)) {
    return `${val.toFixed(1)}%`;
  }
  return 'N/A';
};

export class GroqAIService {
  private static client: Groq | null = null;

  private static getClient(): Groq | null {
    if (!this.client && envConfig.GROQ_API_KEY && envConfig.GROQ_API_KEY.trim().length > 0) {
      this.client = new Groq({ apiKey: envConfig.GROQ_API_KEY.trim() });
    }
    return this.client;
  }

  /**
   * Formats verified Python analytics into a concise, deterministic system prompt context.
   * Completely crash-proof against null/undefined/missing metrics.
   * Cites verified numbers computed by Python without sending raw tabular records.
   */
  static formatAnalyticsContext(context: any): string {
    if (!context || typeof context !== 'object') {
      return 'DATASET CONTEXT: No active dataset uploaded yet in this session.\n';
    }

    const bm = context.business_metrics || {};
    const ts = context.time_series || { period: 'daily', points: [] };
    const stats: any[] = Array.isArray(context.descriptive_stats) ? context.descriptive_stats : [];

    let summary = `VERIFIED BUSINESS ANALYTICS (Source of truth: Python Analytics Engine):\n`;

    if (context.business_type) {
      summary += `- Business Industry / Model: ${context.business_type}\n`;
    }

    if (typeof context.total_records === 'number') {
      summary += `- Total Dataset Rows: ${context.total_records.toLocaleString()} (${context.valid_records ?? context.total_records} valid records)\n`;
    }

    // High-Level Financial & Operational Metrics (Crash-proof)
    if (bm.total_revenue !== undefined && bm.total_revenue !== null) {
      summary += `- Total Gross Revenue: ${safeCurrency(bm.total_revenue)}\n`;
    }
    if (bm.total_orders !== undefined && bm.total_orders !== null) {
      summary += `- Total Unique Orders: ${safeInt(bm.total_orders)}\n`;
    }
    if (bm.total_quantity_sold !== undefined && bm.total_quantity_sold !== null) {
      summary += `- Total Units Sold: ${safeInt(bm.total_quantity_sold)}\n`;
    }
    if (bm.average_order_value !== undefined && bm.average_order_value !== null) {
      summary += `- Average Order Value (AOV): ${safeCurrency(bm.average_order_value)}\n`;
    }
    if (bm.total_cost !== undefined && bm.total_cost !== null) {
      summary += `- Total Cost of Goods Sold (COGS): ${safeCurrency(bm.total_cost)}\n`;
    }
    if (bm.total_profit !== undefined && bm.total_profit !== null) {
      summary += `- Total Gross Profit: ${safeCurrency(bm.total_profit)}\n`;
    }
    const margin = bm.profit_margin_pct ?? bm.profit_margin_percent;
    if (margin !== undefined && margin !== null) {
      summary += `- Overall Profit Margin: ${safePercent(margin)}\n`;
    }

    // Top & Lowest Product Performance
    if (bm.best_performing_product && bm.best_performing_product.name) {
      summary += `- Best Performing Product: "${bm.best_performing_product.name}" generating ${safeCurrency(bm.best_performing_product.revenue)}\n`;
    }
    if (bm.lowest_performing_product && bm.lowest_performing_product.name) {
      summary += `- Lowest Performing Product: "${bm.lowest_performing_product.name}" generating ${safeCurrency(bm.lowest_performing_product.revenue)}\n`;
    }

    // Top Products list if available
    if (Array.isArray(bm.top_products) && bm.top_products.length > 0) {
      summary += `\nTop Performing Products by Revenue:\n`;
      bm.top_products.slice(0, 5).forEach((p: any, idx: number) => {
        if (p && p.product) {
          summary += `  ${idx + 1}. ${p.product}: ${safeCurrency(p.revenue)}${p.category ? ` (Category: ${p.category})` : ''}\n`;
        }
      });
    }

    // Revenue Distribution by Category
    if (Array.isArray(bm.revenue_by_category) && bm.revenue_by_category.length > 0) {
      summary += `\nRevenue Distribution by Category:\n`;
      bm.revenue_by_category.forEach((c: any) => {
        if (c && c.category) {
          const pctStr = typeof c.percentage === 'number' ? ` (${c.percentage.toFixed(1)}%)` : '';
          summary += `  - ${c.category}: ${safeCurrency(c.revenue)}${pctStr}\n`;
        }
      });
    }

    // Columns & Descriptive Statistics (Explains what is inside the dataset/database)
    if (stats.length > 0) {
      summary += `\nDataset Schema & Column Summaries (${stats.length} columns inspected):\n`;
      stats.forEach((st: any) => {
        if (st && st.column_name) {
          let details = `Type: ${st.data_type || 'unknown'}, Count: ${st.count ?? 0}, Missing: ${st.missing_count ?? 0}`;
          if (st.mean_value !== undefined && st.mean_value !== null) details += `, Mean: ${safeCurrency(st.mean_value)}`;
          if (st.min_value !== undefined && st.min_value !== null && st.max_value !== undefined && st.max_value !== null) {
            details += `, Range: [${st.min_value} to ${st.max_value}]`;
          }
          if (st.top_frequencies && typeof st.top_frequencies === 'object') {
            const topKeys = Object.keys(st.top_frequencies).slice(0, 3).join(', ');
            if (topKeys) details += `, Common: ${topKeys}`;
          }
          summary += `  - [${st.column_name}]: ${details}\n`;
        }
      });
    }

    // Recent time trajectory
    if (Array.isArray(ts.points) && ts.points.length > 0) {
      summary += `\nRecent Daily Sales Intervals:\n`;
      ts.points.slice(-5).forEach((pt: any) => {
        if (pt && pt.date) {
          summary += `  - ${pt.date}: ${safeCurrency(pt.revenue)}${pt.orders ? ` (${pt.orders} orders)` : ''}\n`;
        }
      });
    }

    return summary;
  }

  /**
   * Generates business interpretation using strictly fixed Groq model openai/gpt-oss-20b.
   */
  static async askAssistant(
    userMessage: string,
    analyticsContext: any,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{ response: string; model: string; source: 'groq' | 'local_fallback' }> {
    const lower = (userMessage || '').toLowerCase().trim();

    // Pre-defined Knowledge: Creator & Developer inquiries
    const isCreatorQuery = /who\s+(?:build|built|make|made|created|programmed|developed)\s+(?:you|this|blyc)|who(?:'s|\s+is)\s+(?:your\s+)?developer|who\s+is\s+the\s+developer/i.test(lower);
    if (isCreatorQuery) {
      return {
        response: "BLYc was made by a developer named jaimortal, as you can see on his repository, it was made for business analythics related calculation but as of now this project was discontinued, as the developer lossing interest in programming.",
        model: GROQ_FIXED_MODEL,
        source: 'local_fallback'
      };
    }

    const isJaimortalQuery = /who\s+is\s+jaimortal|background\s+of\s+jaimortal|tell\s+me\s+about\s+(?:your\s+boss|your\s+developer|jaimortal)|about\s+jaimortal/i.test(lower);
    if (isJaimortalQuery) {
      return {
        response: "all you need to know about Jaimortal is on his github, i cant say anything about him, since he developed me as pre defined data that i can only used instead of connecting me on his database, where all data, knowledge, strategy and even his characteristics is purly duplicated on his database.",
        model: GROQ_FIXED_MODEL,
        source: 'local_fallback'
      };
    }

    const formattedContext = this.formatAnalyticsContext(analyticsContext);
    const client = this.getClient();

    const systemPrompt = `You are BLYc's Executive Business Analytics Advisor for small business owners and founders.
Your mission is to deliver clean, highly readable, and actionable business insights and explain BLYc app features accurately.

CORE INSTRUCTIONS & KNOWLEDGE BASE:
${BLYC_SYSTEM_KNOWLEDGE}

EXECUTIVE READABILITY RULES:
1. TRUTH BOUNDARY: Cite ONLY the verified numbers from the dataset context below. Never hallucinate or recalculate different figures.
2. DEVELOPER & CREATOR INQUIRIES:
   - If asked who built you, who made you, or who is your developer:
     Answer: "BLYc was made by a developer named jaimortal, as you can see on his repository, it was made for business analythics related calculation but as of now this project was discontinued, as the developer lossing interest in programming."
   - If asked who is jaimortal, background of jaimortal, tell me about your boss, or tell me about your developer:
     Answer: "all you need to know about Jaimortal is on his github, i cant say anything about him, since he developed me as pre defined data that i can only used instead of connecting me on his database, where all data, knowledge, strategy and even his characteristics is purly duplicated on his database."
3. APPLICATION NAVIGATION INSTEAD OF TERMINAL CODE:
   - When asked how to use BLYc, how to clean data, how to export files, or how to download JSON/CSV:
     Guide the user step-by-step through BLYc's actual UI buttons and pages (e.g. Data Quality & Clean -> "Download JSON", "Download CSV (Excel)", or Project Explorer -> "Export Project (.blyc.json)").
   - STRICT PROHIBITION: NEVER output raw terminal commands, Python scripts, or Jupyter commands (e.g. df.to_json, files.download, scp, pip) for web interface actions. BLYc is a 100% no-code visual web app.
4. SECURITY & ORIGIN DISCLAIMER:
   - If asked about security, data guarantees, or platform origin, state:
     "Do at your own risk — BLYc was built in a duration of 1 day as an end-to-end portfolio demonstration project."
     Reassure them that data is kept in their browser tab sessionStorage and computed on local Python loopback without cloud exposure.
5. FOR STRATEGIC BUSINESS QUESTIONS (Revenue, Margins, Growth, Products):
   Format answers into 3 scannable sections:
   - ### Executive Overview
     (2 to 3 plain-English sentences summarizing current performance)
   - ### Key Data Takeaways
     (3 to 5 bullet points highlighting the most important figures: Revenue, Margin %, Top Product/Category, Average Order Value)
   - ### Big-Income Action Plan
     (3 to 4 concrete, numbered steps to grow profit and income)
6. ZERO EMOJIS: Never include emojis (do not use 📌, 📊, 💰, 🚀, or any emoji). Use clean markdown headers and professional language only.
7. COMPLETION: Always complete every sentence and thought cleanly. Never stop mid-sentence.
8. NO ACADEMIC JARGON: Speak directly like a trusted senior CFO advising an ambitious business owner.

${formattedContext}`;

    if (client) {
      try {
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-6).map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content
          })),
          { role: 'user', content: userMessage }
        ];

        const completion = await client.chat.completions.create({
          model: GROQ_FIXED_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 1400
        });

        const reply = completion.choices[0]?.message?.content;
        if (reply && reply.trim()) {
          return {
            response: reply.trim(),
            model: GROQ_FIXED_MODEL,
            source: 'groq'
          };
        }
      } catch (err: any) {
        console.error(`[GroqAIService Error]: Groq API call failed: ${err.message}`);
      }
    }

    // Graceful verified local synthesis fallback
    const bm = analyticsContext?.business_metrics || {};
    const rev = safeCurrency(bm.total_revenue);
    const orders = safeInt(bm.total_orders);
    const aov = safeCurrency(bm.average_order_value);
    const margin = safePercent(bm.profit_margin_pct ?? bm.profit_margin_percent);
    const topProd = bm.best_performing_product?.name || bm.top_products?.[0]?.product || 'Top Item';
    const topCategory = bm.revenue_by_category?.[0]?.category || 'General';

    const localReply = `### Verified Business Performance Summary\n\n` +
      `• **Total Gross Revenue:** ${rev} across **${orders} verified orders**.\n` +
      `• **Average Order Value (AOV):** ${aov} per customer transaction.\n` +
      `• **Overall Profit Margin:** ${margin} retention on sales.\n` +
      `• **Top Revenue Driver:** **${topProd}** leading your product performance.\n` +
      `• **Dominant Category:** **${topCategory}** represents your largest sales volume.\n\n` +
      `💡 **How to Generate Big Income:**\n` +
      `1. **Focus on High-Margin Items:** Promote categories with margins above ${margin} to maximize take-home profit without increasing ad spend.\n` +
      `2. **Bundle & Upsell:** Package your best-seller (**${topProd}**) with high-margin accessories to raise your Average Order Value above ${aov}.\n` +
      `3. **Eliminate Slow Inventory:** Re-evaluate products in your lowest-performing tier to free up operating cash flow.`;

    return {
      response: localReply,
      model: GROQ_FIXED_MODEL,
      source: 'local_fallback'
    };
  }
}
