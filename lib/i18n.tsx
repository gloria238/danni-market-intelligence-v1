"use client";

// Simple i18n — no external library.
// Two dictionaries, one React context, one hook.
// Default: English. Toggle persists to localStorage.

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

/* ——— Types ——— */

export type Locale = "en" | "zh";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

/* ——— Translation dictionaries ——— */

const en: Record<string, string> = {
  // Scanner
  "scanner.title": "Today's Market Anomalies",
  "scanner.subtitle": "Cross-signal divergence scanner — automatically detected",
  "scanner.scanning": "Scanning markets for anomalies...",
  "scanner.fetching": "Fetching signals · Detecting divergences · Computing severity scores",
  "scanner.rescan": "Re-scan",
  "scanner.scanning_btn": "Scanning...",
  "scanner.signals": "signals",
  "scanner.high_unexplained": "High unexplained",
  "scanner.divergences": "Divergences",
  "scanner.ranked_by": "ranked by severity",
  "scanner.confirmed": "Confirmed Relationships",
  "scanner.not_assessable": "Not Assessable",
  "scanner.missing": "missing",
  "scanner.retry": "Retry",

  // Research Health
  "health.coverage": "Coverage",
  "health.freshness": "Freshness",
  "health.source_health": "Source Health",

  // Anomaly card
  "card.normally": "normally →",
  "card.but": "but",
  "card.deep_dive": "Deep Dive",
  "card.past_cases": "past cases",
  "card.bullish": "bullish",
  "card.avg": "avg",
  "card.resolve": "resolve",
  "card.unexplained": "unexplained",
  "card.resolve_signal": "Resolve",

  // Pattern library
  "library.title": "Divergence Library",
  "library.subtitle": "Historical signal pair outcomes — resolution rates, durations, reliability",
  "library.back": "← Back to Scanner",
  "library.timeline": "Timeline",
  "library.most_bullish": "Most Bullish Divergences",
  "library.most_bearish": "Most Bearish Divergences",
  "library.all_pairs": "All Pairs",
  "library.occurrences": "occurrences",
  "library.bullish_label": "bullish",
  "library.bearish_label": "bearish",
  "library.empty_title": "Historical database building",
  "library.empty_desc": "Signal history is recorded daily via automated scans. Check back after 7+ days of data accumulation for meaningful pair statistics.",
  "library.empty_cta": "Open Scanner",
  "library.inverse": "inverse",
  "library.direct": "direct",

  // Timeline
  "timeline.title": "Research Timeline",
  "timeline.events": "events",
  "timeline.back": "← Back to Scanner",
  "timeline.from": "From",
  "timeline.to": "To",
  "timeline.apply": "Apply",
  "timeline.quick_filter": "Quick filter",
  "timeline.clear": "clear",
  "timeline.signal": "Signal",
  "timeline.divergence": "Divergence",
  "timeline.resolution": "Resolution",
  "timeline.empty_title": "No events found",
  "timeline.empty_desc": "Try a wider date range or different signal pair filter. Timeline data accumulates as signal history grows.",

  // Deep dive
  "deepdive.back": "Back to Scanner",
  "deepdive.analyzing": "Analyzing",
  "deepdive.historical_pattern": "Historical Pattern",
  "deepdive.past_occurrences": "Past Occurrences",
  "deepdive.bullish_resolution": "Bullish Resolution",
  "deepdive.avg_btc_move": "Avg BTC Move",
  "deepdive.recent_matches": "Recent matches",
  "deepdive.evidence_analysis": "Evidence Analysis",
  "deepdive.supporting": "Supporting",
  "deepdive.contradicting": "Contradicting",

  // Nav
  "nav.timeline": "Timeline",
  "nav.library": "Library",
  "nav.research_chat": "Research Chat",
  "nav.sign_out": "Sign out",
  "nav.scanner": "Scanner",
  "nav.market_intelligence": "Market Intelligence",

  // Research
  "research.title": "Market Research",
  "research.placeholder": "Ask about market conditions, signal divergences, or macro narratives...",
  "research.sending": "Analyzing...",

  // Evidence
  "evidence.strong": "Strong",
  "evidence.moderate": "Moderate",
  "evidence.weak": "Weak",
  "evidence.top_evidence": "Top evidence",

  // Signal labels
  "signal.BTC_PRICE": "BTC Price",
  "signal.BTC_24H_CHANGE": "BTC 24h Change",
  "signal.ETH_PRICE": "ETH Price",
  "signal.GOLD_PRICE": "Gold (XAUT)",
  "signal.DXY_INDEX": "DXY",
  "signal.US10Y_YIELD": "US 10Y Yield",
  "signal.US2Y_YIELD": "US 2Y Yield",
  "signal.FED_FUNDS_RATE": "Fed Funds Rate",
  "signal.BTC_ETF_FLOW": "BTC ETF Flow",
  "signal.MARKET_NEWS": "Market News",

  // Narrative names
  "narrative.ETF_FLOW": "ETF Flows",
  "narrative.RATE_CUT_EXPECTATIONS": "Rate Cut Expectations",
  "narrative.USD_WEAKNESS": "USD Weakness",
  "narrative.MACRO_EASING": "Macro Easing",
  "narrative.INSTITUTIONAL_BUYING": "Institutional Buying",
  "narrative.REGULATORY_RELIEF": "Regulatory Relief",
  "narrative.TECHNICAL_BREAKOUT": "Technical Breakout",
  "narrative.GEOPOLITICAL_SAFE_HAVEN": "Geopolitical Safe Haven",
  "narrative.SHORT_SQUEEZE": "Short Squeeze",
  "narrative.RISK_ON_SENTIMENT": "Risk-On Sentiment",

  // Severity labels
  "severity.Critical": "Critical",
  "severity.Notable": "Notable",
  "severity.Moderate": "Moderate",
  "severity.Minor": "Minor",

  // Historical note
  "history.building": "Historical database building — {days} days recorded, need 7+ for meaningful comparison.",
  "history.no_match": "No matching pattern found in the past {days} days.",

  // Evidence explanation labels
  "explanation.etf_outflow": "ETF Outflow",
  "explanation.macro_ignored": "Macro Tailwind Ignored",
  "explanation.risk_off": "Risk-Off Rotation",
  "explanation.forced_liquidation": "Forced Liquidation",
  "explanation.regulatory": "Regulatory Overhang",
  "explanation.unexplained": "Unexplained Divergence",
};

const zh: Record<string, string> = {
  "scanner.title": "今日市场异常",
  "scanner.subtitle": "跨信号分歧扫描器 — 自动检测",
  "scanner.scanning": "正在扫描市场异常...",
  "scanner.fetching": "获取信号 · 检测分歧 · 计算严重度评分",
  "scanner.rescan": "重新扫描",
  "scanner.scanning_btn": "扫描中...",
  "scanner.signals": "信号",
  "scanner.high_unexplained": "高未解释比例",
  "scanner.divergences": "分歧",
  "scanner.ranked_by": "按严重度排序",
  "scanner.confirmed": "已确认关系",
  "scanner.not_assessable": "不可评估",
  "scanner.missing": "缺失",
  "scanner.retry": "重试",

  "health.coverage": "覆盖率",
  "health.freshness": "新鲜度",
  "health.source_health": "数据源健康",

  "card.normally": "通常 →",
  "card.but": "但",
  "card.deep_dive": "深度分析",
  "card.past_cases": "历史案例",
  "card.bullish": "看涨",
  "card.avg": "平均",
  "card.resolve": "解析",
  "card.unexplained": "未解释",
  "card.resolve_signal": "解析信号",

  "library.title": "分歧数据库",
  "library.subtitle": "历史信号对结果 — 解析率、持续时长、可靠性",
  "library.back": "← 返回扫描器",
  "library.timeline": "时间轴",
  "library.most_bullish": "最看涨分歧",
  "library.most_bearish": "最看跌分歧",
  "library.all_pairs": "全部信号对",
  "library.occurrences": "次出现",
  "library.bullish_label": "看涨",
  "library.bearish_label": "看跌",
  "library.empty_title": "历史数据库构建中",
  "library.empty_desc": "信号历史通过每日自动扫描记录。积累 7 天以上数据后可查看有意义的统计。",
  "library.empty_cta": "打开扫描器",
  "library.inverse": "反向",
  "library.direct": "同向",

  "timeline.title": "研究时间轴",
  "timeline.events": "事件",
  "timeline.back": "← 返回扫描器",
  "timeline.from": "从",
  "timeline.to": "至",
  "timeline.apply": "应用",
  "timeline.quick_filter": "快速筛选",
  "timeline.clear": "清除",
  "timeline.signal": "信号",
  "timeline.divergence": "分歧",
  "timeline.resolution": "解析",
  "timeline.empty_title": "暂无事件",
  "timeline.empty_desc": "尝试更宽的日期范围或不同的信号对筛选。时间轴数据随信号历史积累而增长。",

  "deepdive.back": "返回扫描器",
  "deepdive.analyzing": "分析中",
  "deepdive.historical_pattern": "历史模式",
  "deepdive.past_occurrences": "历史出现次数",
  "deepdive.bullish_resolution": "看涨解析率",
  "deepdive.avg_btc_move": "平均 BTC 变动",
  "deepdive.recent_matches": "最近匹配",
  "deepdive.evidence_analysis": "证据分析",
  "deepdive.supporting": "支持",
  "deepdive.contradicting": "反驳",

  "nav.timeline": "时间轴",
  "nav.library": "数据库",
  "nav.research_chat": "研究对话",
  "nav.sign_out": "退出",
  "nav.scanner": "扫描仪",
  "nav.market_intelligence": "市场情报",

  "research.title": "市场研究",
  "research.placeholder": "询问市场状况、信号分歧或宏观叙事...",
  "research.sending": "分析中...",

  "evidence.strong": "强",
  "evidence.moderate": "中等",
  "evidence.weak": "弱",
  "evidence.top_evidence": "主证据",

  // Signal labels
  "signal.BTC_PRICE": "BTC 价格",
  "signal.BTC_24H_CHANGE": "BTC 24时涨跌",
  "signal.ETH_PRICE": "ETH 价格",
  "signal.GOLD_PRICE": "黄金 (XAUT)",
  "signal.DXY_INDEX": "美元指数",
  "signal.US10Y_YIELD": "美国10年期国债",
  "signal.US2Y_YIELD": "美国2年期国债",
  "signal.FED_FUNDS_RATE": "联邦基金利率",
  "signal.BTC_ETF_FLOW": "BTC ETF 资金流",
  "signal.MARKET_NEWS": "市场新闻",

  // Narrative names
  "narrative.ETF_FLOW": "ETF 资金流",
  "narrative.RATE_CUT_EXPECTATIONS": "降息预期",
  "narrative.USD_WEAKNESS": "美元走弱",
  "narrative.MACRO_EASING": "宏观宽松",
  "narrative.INSTITUTIONAL_BUYING": "机构买入",
  "narrative.REGULATORY_RELIEF": "监管放松",
  "narrative.TECHNICAL_BREAKOUT": "技术突破",
  "narrative.GEOPOLITICAL_SAFE_HAVEN": "地缘避险",
  "narrative.SHORT_SQUEEZE": "空头挤压",
  "narrative.RISK_ON_SENTIMENT": "风险偏好",

  // Severity labels
  "severity.Critical": "危急",
  "severity.Notable": "显著",
  "severity.Moderate": "中等",
  "severity.Minor": "轻微",

  // Historical note
  "history.building": "历史数据库构建中 — 已记录 {days} 天，需 7 天以上才能进行有意义的比较。",
  "history.no_match": "过去 {days} 天内未找到匹配模式。",

  // Evidence explanation labels
  "explanation.etf_outflow": "ETF 资金流出",
  "explanation.macro_ignored": "宏观利好被忽视",
  "explanation.risk_off": "避险轮动",
  "explanation.forced_liquidation": "强制清算",
  "explanation.regulatory": "监管压力",
  "explanation.unexplained": "未解释分歧",
};

const dictionaries: Record<Locale, Record<string, string>> = { en, zh };

/* ——— Context ——— */

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("danni-locale") as Locale | null;
    if (stored === "en" || stored === "zh") setLocaleState(stored);
    setMounted(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("danni-locale", l);
  };

  const t = (key: string): string => {
    return dictionaries[locale][key] ?? dictionaries["en"][key] ?? key;
  };

  // Prevent hydration mismatch — render nothing until client-side
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  // During SSR or if provider hasn't mounted yet, return English default.
  // The provider is client-only (waits for mounted + localStorage),
  // so during build/SSR we render everything in English to avoid hydration mismatch.
  if (!ctx) {
    return {
      locale: "en",
      setLocale: () => {},
      t: (key: string) => en[key] ?? key,
    };
  }
  return ctx;
}
