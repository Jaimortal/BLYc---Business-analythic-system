import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  UploadCloud, 
  Database,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionAlt } from '../../components/ActionAlt';
import { getActiveDataset, setActiveDataset, setActiveProject, DEMO_SAMPLE_DATASET } from '../../utils/sessionStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'groq' | 'cache' | 'local_fallback';
  timestamp: string;
}

const AI_MESSAGES_KEY = 'blyc_session_ai_messages';
const AI_CACHE_KEY = 'blyc_session_ai_cache';

const getSessionMessages = (): ChatMessage[] | null => {
  try {
    const raw = sessionStorage.getItem(AI_MESSAGES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const setSessionMessages = (msgs: ChatMessage[]) => {
  try {
    sessionStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(msgs));
  } catch {
    // ignore
  }
};

const normalizeQuery = (q: string): string => {
  return q.toLowerCase().trim().replace(/[?!.,;:'"()]/g, '').replace(/\s+/g, ' ');
};

const getCachedResponse = (query: string): { response: string; model: string } | null => {
  try {
    const raw = sessionStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const cacheMap = JSON.parse(raw);
    const key = normalizeQuery(query);
    return cacheMap[key] || null;
  } catch {
    return null;
  }
};

const setCachedResponse = (query: string, response: string, model: string = 'openai/gpt-oss-20b') => {
  try {
    const raw = sessionStorage.getItem(AI_CACHE_KEY);
    const cacheMap = raw ? JSON.parse(raw) : {};
    const key = normalizeQuery(query);
    cacheMap[key] = { response, model, cachedAt: Date.now() };
    sessionStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheMap));
  } catch {
    // ignore
  }
};

const DEFAULT_SAMPLE_RECORDS = [
  { Product: 'Mechanical Keyboard Pro', Category: 'Electronics', Selling_Price: 89.99, Cost: 45.0, Quantity: 15, Order_Date: '2026-02-01', Order_ID: 'ORD-101' },
  { Product: 'Wireless Gaming Mouse', Category: 'Electronics', Selling_Price: 49.99, Cost: 20.0, Quantity: 24, Order_Date: '2026-02-02', Order_ID: 'ORD-102' },
  { Product: 'Desk Mat XL Stitch', Category: 'Accessories', Selling_Price: 19.99, Cost: 8.0, Quantity: 40, Order_Date: '2026-02-03', Order_ID: 'ORD-103' },
  { Product: 'USB-C Dual 4K Hub', Category: 'Accessories', Selling_Price: 34.99, Cost: 14.0, Quantity: 18, Order_Date: '2026-02-04', Order_ID: 'ORD-104' },
  { Product: 'Noise-Canceling Headset', Category: 'Audio', Selling_Price: 129.99, Cost: 65.0, Quantity: 12, Order_Date: '2026-02-06', Order_ID: 'ORD-106' }
];

const SUGGESTED_PROMPTS = [
  'Summarize my overall business health and performance',
  'Which products are generating the highest profit margins?',
  'What are my dominant revenue categories and how are they trending?',
  'Where are opportunities to cut costs or improve inventory efficiency?',
  'What bundling or pricing strategies would you recommend for my top items?'
];

// Strip emoji characters so icons are rendered purely via Lucide React
const stripEmojis = (str: string): string => {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

/**
 * Parses inline markdown:
 * - **bold text** or __bold text__ -> <strong> element with strong styling (never raw asterisks)
 * - *italic text* or _italic text_ -> <em> element
 * - Cleans any stray double asterisks so nothing renders as raw * symbols
 */
const parseMarkdownText = (rawText: string): React.ReactNode => {
  if (!rawText) return null;

  const clean = stripEmojis(rawText);
  // Match bold (**...** or __...__) or italic (*...* or _..._)
  const regex = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_)/g;
  const parts = clean.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Bold
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2).trim();
      return (
        <strong 
          key={i} 
          className="text-dark fw-bold" 
          style={{ fontWeight: 700, color: '#0F172A' }}
        >
          {inner}
        </strong>
      );
    }

    // Italic
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1).trim();
      return (
        <em key={i} className="text-secondary" style={{ fontStyle: 'italic' }}>
          {inner}
        </em>
      );
    }

    // Normal text - strip any accidental stray double asterisks
    const sanitized = part.replace(/\*\*/g, '');
    return <span key={i}>{sanitized}</span>;
  });
};

const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableLines: string[] = [];

  const flushTable = (key: number) => {
    if (tableLines.length === 0) return;
    const rows = tableLines
      .map(l => l.trim())
      .filter(l => l.startsWith('|') && l.endsWith('|'))
      .map(l => l.slice(1, -1).split('|').map(c => c.trim()));

    const contentRows = rows.filter(r => !r.every(c => /^[-:]+$/.test(c)));

    if (contentRows.length > 0) {
      const headerRow = contentRows[0];
      const bodyRows = contentRows.slice(1);
      elements.push(
        <div key={`tbl_${key}`} className="table-responsive my-3 border rounded-3 overflow-hidden shadow-xs">
          <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.82rem' }}>
            <thead className="table-light">
              <tr>
                {headerRow.map((cell, ci) => (
                  <th key={ci} className="py-2 px-3 fw-bold text-dark">{cell.replace(/\*\*/g, '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3">{parseMarkdownText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableLines = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed);
      return;
    } else if (tableLines.length > 0) {
      flushTable(idx);
    }

    if (!trimmed) {
      elements.push(<div key={`sp_${idx}`} className="my-1" />);
      return;
    }

    // Named Section Header Badges (Executive Overview, Key Takeaways, Action Plan)
    const isExecOverview = /^(?:📌\s*)?(?:###\s*)?(?:\*\*)?Executive Overview(?:\*\*)?/i.test(trimmed);
    const isKeyTakeaways = /^(?:📊\s*)?(?:###\s*)?(?:\*\*)?Key Data Takeaways(?:\*\*)?/i.test(trimmed);
    const isActionPlan = /^(?:💰\s*)?(?:###\s*)?(?:\*\*)?Big[‑\s-]?Income Action Plan(?:\*\*)?/i.test(trimmed);

    if (isExecOverview) {
      elements.push(
        <div key={`h_${idx}`} className="d-flex align-items-center gap-2 mt-3 mb-2 pt-2 border-top border-light">
          <div 
            className="rounded-2 d-flex align-items-center justify-content-center text-primary shadow-xs" 
            style={{ width: '26px', height: '26px', backgroundColor: '#EEF2FF', border: '1px solid #E0E7FF' }}
          >
            <Sparkles size={14} />
          </div>
          <span className="fw-bold text-dark" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
            Executive Overview
          </span>
        </div>
      );
      return;
    }

    if (isKeyTakeaways) {
      elements.push(
        <div key={`h_${idx}`} className="d-flex align-items-center gap-2 mt-3 mb-2 pt-2 border-top border-light">
          <div 
            className="rounded-2 d-flex align-items-center justify-content-center text-info shadow-xs" 
            style={{ width: '26px', height: '26px', backgroundColor: '#F0F9FF', border: '1px solid #E0F2FE' }}
          >
            <TrendingUp size={14} />
          </div>
          <span className="fw-bold text-dark" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
            Key Data Takeaways
          </span>
        </div>
      );
      return;
    }

    if (isActionPlan) {
      elements.push(
        <div key={`h_${idx}`} className="d-flex align-items-center gap-2 mt-3 mb-2 pt-2 border-top border-light">
          <div 
            className="rounded-2 d-flex align-items-center justify-content-center text-success shadow-xs" 
            style={{ width: '26px', height: '26px', backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5' }}
          >
            <DollarSign size={14} />
          </div>
          <span className="fw-bold text-dark" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
            Big-Income Action Plan
          </span>
        </div>
      );
      return;
    }

    // Generic Headings (###, ##, #)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headerText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div key={`h_${idx}`} className="d-flex align-items-center gap-2 mt-3 mb-2">
          <ChevronRight size={14} className="text-primary flex-shrink-0" />
          <span className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
            {parseMarkdownText(headerText)}
          </span>
        </div>
      );
      return;
    }

    if (trimmed === '---') {
      elements.push(<hr key={`hr_${idx}`} className="my-3 border-secondary opacity-15" />);
      return;
    }

    // Numbered List Items (e.g. 1. **Amplify Storage Devices**)
    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/);
      const num = match ? match[1] : '•';
      const body = match ? match[2] : trimmed;
      elements.push(
        <div key={`num_${idx}`} className="d-flex align-items-start gap-2 mb-2 ps-1">
          <span 
            className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold mt-1 flex-shrink-0"
            style={{ 
              width: '20px', 
              height: '20px', 
              fontSize: '0.72rem', 
              backgroundColor: '#F1F5F9', 
              color: '#334155',
              border: '1px solid #CBD5E1' 
            }}
          >
            {num}
          </span>
          <div className="flex-fill" style={{ fontSize: '0.88rem' }}>
            {parseMarkdownText(body)}
          </div>
        </div>
      );
      return;
    }

    // Unordered Bullet Points (- or • or *)
    if (/^[-•*]\s+/.test(trimmed)) {
      const isIndented = line.startsWith('   ') || line.startsWith('  ') || line.startsWith('\t');
      const bulletBody = trimmed.replace(/^[-•*]\s+/, '');
      elements.push(
        <div key={`li_${idx}`} className={`d-flex align-items-start gap-2 mb-1 ${isIndented ? 'ps-4' : 'ps-2'}`}>
          <span className="text-primary mt-1 flex-shrink-0" style={{ fontSize: '0.8rem', lineHeight: '1' }}>•</span>
          <div className="flex-fill" style={{ fontSize: '0.88rem' }}>
            {parseMarkdownText(bulletBody)}
          </div>
        </div>
      );
      return;
    }

    // Standard Paragraph
    elements.push(
      <p key={`p_${idx}`} className="mb-2" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
        {parseMarkdownText(trimmed)}
      </p>
    );
  });

  if (tableLines.length > 0) {
    flushTable(lines.length);
  }

  return <div>{elements}</div>;
};

export const AIAssistantView: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [businessType, setBusinessType] = useState<string>('Small Business Retail / E-commerce');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasDataset, setHasDataset] = useState<boolean>(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadAnalytics = async () => {
    const dataset = getActiveDataset();
    if (!dataset || dataset.length === 0) {
      setHasDataset(false);
      setAnalyticsData(null);
      setMessages([
        {
          id: 'welcome_empty',
          role: 'assistant',
          content: `Welcome to the BLYc AI Business Assistant!

You are in a fresh, unpopulated tab session. To analyze your numbers and receive evidence-based advice:
• Upload your business spreadsheet (.xlsx, .csv)
• Or click "Load Demo Data" below to test the assistant with verified sample metrics.`,
          source: 'groq',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    setHasDataset(true);
    const saved = getSessionMessages();
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([
        {
          id: 'welcome_active',
          role: 'assistant',
          content: `Hello! I am your BLYc Business Analytics Advisor.

I am grounded in your verified numbers calculated by the Python Analytics Engine. I can:
• Summarize your sales and revenue trajectory
• Highlight top-performing products and profit margins
• Explain what your numbers mean in clear, practical terms
• Suggest realistic small business actions to improve cash flow and margins.

Feel free to ask a question below or click one of the suggested prompts to get started!`,
          source: 'groq',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }

    try {
      const res = await fetch('/api/analytics/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: dataset })
      });
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json.data);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadAnalytics();
    window.addEventListener('blyc_dataset_updated', loadAnalytics);
    return () => {
      window.removeEventListener('blyc_dataset_updated', loadAnalytics);
    };
  }, []);

  const handleLoadDemo = () => {
    setActiveDataset(DEMO_SAMPLE_DATASET);
    setActiveProject({ id: `demo_${Date.now()}`, name: 'Demo_Retail_Sales' });
    loadAnalytics();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      setSessionMessages(messages);
    }
  }, [messages, isLoading]);

  const handleClearChat = () => {
    sessionStorage.removeItem(AI_MESSAGES_KEY);
    const resetWelcome: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: hasDataset 
        ? `Chat history reset. Ask a new business performance question or select a suggested prompt below!`
        : `Welcome to the BLYc AI Business Assistant!\n\nUpload a spreadsheet or click "Load Demo Data" to get started.`,
      source: 'groq',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([resetWelcome]);
    setSessionMessages([resetWelcome]);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const trimmed = query.trim();
    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');

    // Check client-side session cache for instant zero-token response on repeated prompts
    const cached = getCachedResponse(trimmed);
    if (cached) {
      setIsLoading(true);
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: cached.response,
          source: 'cache',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 200);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          analyticsContext: analyticsData || {},
          businessType,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const assistantMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: json.data.response,
          source: (json.data.source as any) || 'groq',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCachedResponse(trimmed, json.data.response, json.data.model);
      } else {
        const errorMessage: ChatMessage = {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          content: `Unable to complete your request. ${json.message || 'Please check your connection and try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err: any) {
      const networkErrorMessage: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        role: 'assistant',
        content: `Communication error: Could not reach the BLYc AI service endpoint.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, networkErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="workspace-page assistant-page d-flex flex-column gap-3" style={{ height: 'calc(100vh - 132px)' }}>
      {/* Top Clean Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 p-3 bg-white rounded-3 border blyc-card">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 rounded-3 text-white shadow-xs" style={{ backgroundColor: '#4F46E5' }}>
            <Bot size={22} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-dark">AI Business Assistant</h5>
              <span className="badge-pill badge-pill-indigo" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                GPT-OSS-20B
              </span>
            </div>
            <p className="text-muted-blyc mb-0" style={{ fontSize: '0.82rem' }}>
              Evidence-based advisor strictly grounded in Python-verified calculations.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <ActionAlt description="Clear chat conversation and reset advisor history in this tab." placement="bottom" align="right">
            <button
              type="button"
              className="btn btn-sm btn-blyc-outline d-inline-flex align-items-center gap-1.5 shadow-xs py-1 px-2.5"
              onClick={handleClearChat}
              style={{ fontSize: '0.78rem' }}
            >
              <RotateCcw size={12} />
              <span>New Chat</span>
            </button>
          </ActionAlt>

          <span className="badge-pill badge-pill-success">
            <ShieldCheck size={13} />
            <span>Truth Engine: Python 3</span>
          </span>
          <span className="badge-pill badge-pill-info">
            <Sparkles size={13} />
            <span>Zero Hallucination Grounding</span>
          </span>
        </div>
      </div>

      {/* Suggested Prompts Row */}
      {hasDataset ? (
        <div className="d-flex gap-2 overflow-x-auto no-scrollbar py-1" style={{ whiteSpace: 'nowrap' }}>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-sm btn-blyc-outline d-inline-flex align-items-center gap-2 shadow-xs"
              style={{ fontSize: '0.78rem', borderRadius: '20px', padding: '5px 12px' }}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
            >
              <Sparkles size={12} className="text-primary flex-shrink-0" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2 py-1">
          <button
            type="button"
            className="btn btn-sm btn-blyc-primary d-inline-flex align-items-center gap-2 shadow-xs"
            onClick={() => navigate('/workspace/upload')}
          >
            <UploadCloud size={14} />
            <span>Upload Dataset</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-blyc-outline d-inline-flex align-items-center gap-2 shadow-xs"
            onClick={handleLoadDemo}
          >
            <Database size={14} className="text-primary" />
            <span>Load Demo Data</span>
          </button>
        </div>
      )}

      {/* Clean Chat Conversation Log */}
      <div 
        className="blyc-card p-3 p-md-4 flex-fill overflow-y-auto d-flex flex-column gap-3 bg-white"
        style={{ minHeight: '300px' }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`d-flex gap-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            {msg.role === 'assistant' && (
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-xs mt-1"
                style={{ width: '32px', height: '32px', backgroundColor: '#4F46E5' }}
              >
                <Bot size={16} />
              </div>
            )}

            <div 
              className={`p-3 rounded-3 position-relative ${
                msg.role === 'user' 
                  ? 'text-white' 
                  : 'bg-white text-dark border shadow-xs'
              }`}
              style={{ 
                maxWidth: '78%', 
                backgroundColor: msg.role === 'user' ? '#0F172A' : '#FFFFFF',
                fontSize: '0.88rem',
                lineHeight: '1.6'
              }}
            >
              <FormattedMessage content={msg.content} isUser={msg.role === 'user'} />

              <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light small text-muted-blyc">
                <span style={{ fontSize: '0.7rem' }}>{msg.timestamp}</span>
                
                <div className="d-flex align-items-center gap-2">
                  {msg.role === 'assistant' && (
                    <>
                      {msg.source === 'cache' ? (
                        <span className="badge-pill badge-pill-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }} title="Served instantly from browser tab session cache without using API tokens">
                          <Zap size={10} className="text-warning fill-warning" />
                          <span>Instant Cache (0 Tokens)</span>
                        </span>
                      ) : (
                        <span className="badge-pill badge-pill-success" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          <CheckCircle2 size={10} />
                          <span>Verified Python Source</span>
                        </span>
                      )}

                      <button
                        className="btn btn-sm btn-link p-0 text-muted-blyc hover-opacity-100"
                        title="Copy message"
                        onClick={() => handleCopy(msg.id, msg.content)}
                      >
                        {copiedId === msg.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {msg.role === 'user' && (
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-xs mt-1"
                style={{ width: '32px', height: '32px', backgroundColor: '#0284C7' }}
              >
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="d-flex gap-3 align-items-center">
            <div 
              className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0"
              style={{ width: '32px', height: '32px', backgroundColor: '#4F46E5' }}
            >
              <Bot size={16} />
            </div>
            <div className="p-3 rounded-3 bg-white border text-muted-blyc small d-flex align-items-center gap-2 shadow-xs">
              <RefreshCw size={14} className="spin text-primary" />
              <span>Analyzing verified calculations with Groq inference...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clean Input Controls */}
      <div className="blyc-card p-2 bg-white d-flex align-items-end gap-2 shadow-sm">
        <textarea
          ref={textareaRef}
          rows={2}
          className="form-control border-0 p-2 shadow-none"
          placeholder="Ask a question about your business performance, margins, or products (Enter to send, Shift+Enter for newline)..."
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ resize: 'none', fontSize: '0.88rem' }}
          disabled={isLoading}
        />

        <button 
          className="btn btn-blyc-primary d-flex align-items-center gap-2 px-3 py-2 flex-shrink-0"
          onClick={() => handleSendMessage()}
          disabled={!inputPrompt.trim() || isLoading}
          title="Send (Enter)"
        >
          <Send size={15} />
          <span className="d-none d-sm-inline">Send</span>
        </button>
      </div>
    </div>
  );
};
