import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    ArrowLeft, TrendingUp, Package, AlertTriangle,
    ShoppingCart, DollarSign, BarChart3, RefreshCw,
    Zap, Star, Award, Users, ChevronUp, ChevronDown,
    Layers, Activity, Target, TrendingDown,
    Download, FileText, FileSpreadsheet, Printer, ChevronDown as ChevDown,
} from 'lucide-react';
import { analyticsApi } from '../services/analyticsApi';
import {
    AnalyticsSummaryDTO, AnalyticsPeriod, ProductPerformanceDTO,
    RecommendationDTO,
} from '../types/analytics';

// ── Print stylesheet injected at runtime ────────────────────────────────────
/* Hide print-only sections on screen */
const SCREEN_STYLE = `.print-only { display: none; }`;

const PRINT_STYLE = `
@media print {
  /* Show print-only sections */
  .print-only { display: block !important; }

  /* Force white background everywhere */
  *, *::before, *::after {
    background: white !important;
    background-color: white !important;
    background-image: none !important;
    color: #111 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    box-shadow: none !important;
    text-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  /* Hide everything that is purely interactive */
  .no-print, .no-print * {
    display: none !important;
  }

  /* Page layout */
  body {
    margin: 0;
    padding: 0;
    background: white !important;
  }

  /* Main wrapper */
  .print-root {
    background: white !important;
    padding: 20px !important;
    min-height: unset !important;
  }

  /* Page title area */
  .print-title h1 {
    font-size: 22pt !important;
    color: #1e1b4b !important;
    margin: 0 0 4px !important;
  }
  .print-title p {
    color: #475569 !important;
    font-size: 10pt !important;
  }

  /* KPI cards */
  .print-kpi-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
    margin-bottom: 20px !important;
  }
  .print-kpi-grid > * {
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    padding: 12px !important;
    background: #f8fafc !important;
    page-break-inside: avoid !important;
  }

  /* Mini stats */
  .print-mini-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 20px !important;
  }
  .print-mini-grid > * {
    border: 1px solid #e2e8f0 !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    background: #f8fafc !important;
  }

  /* All cards */
  .print-card {
    border: 1px solid #e2e8f0 !important;
    border-radius: 10px !important;
    padding: 16px !important;
    margin-bottom: 16px !important;
    background: #fff !important;
    page-break-inside: avoid !important;
  }

  /* Tables */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 9pt !important;
  }
  th {
    background: #f1f5f9 !important;
    color: #374151 !important;
    border-bottom: 2px solid #e2e8f0 !important;
    padding: 6px 10px !important;
    text-align: left !important;
    font-weight: 700 !important;
    font-size: 8pt !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
  }
  td {
    border-bottom: 1px solid #f1f5f9 !important;
    padding: 6px 10px !important;
    color: #1e293b !important;
    font-size: 9pt !important;
  }
  tr:nth-child(even) td {
    background: #f8fafc !important;
  }

  /* Recharts SVG */
  .recharts-wrapper, .recharts-surface {
    background: white !important;
  }
  .recharts-cartesian-grid line {
    stroke: #e2e8f0 !important;
  }
  .recharts-text {
    fill: #374151 !important;
  }
  .recharts-legend-item-text {
    color: #374151 !important;
    fill: #374151 !important;
  }

  /* Recommendation badges */
  .rec-badge {
    border: 1px solid #cbd5e1 !important;
    border-radius: 4px !important;
    padding: 2px 6px !important;
    font-size: 8pt !important;
  }

  /* Page break hints */
  .print-break-before {
    page-break-before: always !important;
  }

  /* Collapse 2-column chart grids to single column */
  .print-two-col {
    grid-template-columns: 1fr !important;
  }

  /* Constrain recharts to page width, prevent overflow */
  .recharts-responsive-container,
  .recharts-wrapper {
    max-width: 100% !important;
    overflow: visible !important;
  }

  /* Gradient text fix */
  .gradient-text {
    -webkit-text-fill-color: #1e1b4b !important;
    color: #1e1b4b !important;
  }

  @page {
    size: A4 landscape;
    margin: 15mm 12mm;
  }
}
`;

// ── Print context: tells child chart components to use fixed pixel sizes ───────
const PrintContext = createContext(false);

// ── Design tokens ──────────────────────────────────────────────────────────────
const CHART_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
const PRIORITY_META: Record<string, { color: string; bg: string; label: string }> = {
    CRITICAL: { color: '#f43f5e', bg: 'rgba(244,63,94,0.15)', label: 'CRITICAL' },
    HIGH: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'HIGH' },
    MEDIUM: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', label: 'MEDIUM' },
    LOW: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'LOW' },
};
const CATEGORY_META: Record<string, { label: string }> = {
    REORDER: { label: 'Reorder' },
    OVERSTOCK: { label: 'Overstock' },
    PRICING: { label: 'Pricing' },
    RETURN_ANOMALY: { label: 'Returns' },
    PERFORMANCE: { label: 'Performance' },
    SLOW_MOVER: { label: 'Slow Mover' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const fmtRupee = (n: number) => `₹${fmt(n)}`;
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString().split('T')[0];

type Tab = 'revenue' | 'categories' | 'products' | 'operations' | 'recommendations';

// ── CSV Export helpers ─────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: (string | number)[][], headers: string[]) {
    const escape = (v: string | number) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportTabCSV(tab: Tab, data: AnalyticsSummaryDTO, from: string, to: string) {
    const dateRange = `${from}_to_${to}`;
    switch (tab) {
        case 'revenue': {
            const headers = ['Date', 'Revenue (₹)', 'Purchases (₹)', 'Units Sold', 'Units Purchased'];
            const rows = (data.revenueTimeSeries || []).map(r => [
                r.label, r.revenue, r.purchases, r.unitsSold, r.unitsPurchased
            ]);
            downloadCSV(`revenue_${dateRange}.csv`, rows, headers);
            break;
        }
        case 'categories': {
            const headers = ['Category', 'Revenue (₹)', 'Revenue Share (%)', 'Units Sold', 'Transactions', 'Low Stock', 'Out of Stock'];
            const rows = (data.categoryBreakdown || []).map(c => [
                c.categoryName, c.revenue, c.revenueShare?.toFixed(2), c.unitsSold, c.transactionCount, c.lowStockCount, c.outOfStockCount
            ]);
            downloadCSV(`categories_${dateRange}.csv`, rows, headers);
            break;
        }
        case 'products': {
            const headers = ['#', 'Product Name', 'SKU', 'Category', 'Units Sold', 'Revenue (₹)', 'Cost Price (₹)', 'Selling Price (₹)', 'Profit Margin (%)', 'Current Stock', 'Reorder Level', 'Low Stock', 'Out of Stock'];
            const top = (data.topSellingProducts || []).map((p, i) => [
                i + 1, p.productName, p.productSku, p.categoryName, p.unitsSold, p.revenue,
                p.costPrice, p.sellingPrice, p.profitMargin?.toFixed(2), p.currentStock, p.reorderLevel, p.isLowStock ? 'Yes' : 'No', p.isOutOfStock ? 'Yes' : 'No'
            ]);
            downloadCSV(`products_${dateRange}.csv`, top, headers);
            break;
        }
        case 'operations': {
            const headers = ['#', 'Name', 'Username', 'Role', 'Transactions', 'Units Sold', 'Sale Value (₹)'];
            const rows = (data.employeePerformance || []).map((e, i) => [
                i + 1, e.fullName || e.username, e.username, e.role, e.transactionCount, e.unitsSold, e.totalSaleValue
            ]);
            downloadCSV(`employee_performance_${dateRange}.csv`, rows, headers);
            break;
        }
        default:
            break;
    }
}

function exportAllCSV(data: AnalyticsSummaryDTO, from: string, to: string) {
    const dateRange = `${from}_to_${to}`;
    // KPI summary
    downloadCSV(`summary_kpis_${dateRange}.csv`,
        [[
            data.totalRevenue, data.totalUnitsSold, data.totalInventoryValue,
            data.grossProfit, data.grossProfitMarginPct?.toFixed(2), data.activeAlertCount,
            data.returnRate?.toFixed(2), data.averageOrderValue, data.totalTransactions,
            data.totalUnitsPurchased, data.lowStockCount, data.outOfStockCount, data.totalDamagedUnits
        ]],
        ['Total Revenue', 'Units Sold', 'Inventory Value', 'Gross Profit', 'Profit Margin %',
         'Active Alerts', 'Return Rate %', 'Avg Order Value', 'Transactions',
         'Units Purchased', 'Low Stock', 'Out of Stock', 'Damaged Units']
    );
    setTimeout(() => exportTabCSV('revenue', data, from, to), 300);
    setTimeout(() => exportTabCSV('categories', data, from, to), 600);
    setTimeout(() => exportTabCSV('products', data, from, to), 900);
    setTimeout(() => exportTabCSV('operations', data, from, to), 1200);
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(120,100,255,0.3)', borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <p style={{ color: '#a78bfa', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color || '#e2e8f0', fontSize: 13, margin: '2px 0' }}>
                    <span style={{ opacity: 0.7 }}>{p.name}: </span><strong>{typeof p.value === 'number' && p.value > 999 ? fmtRupee(p.value) : p.value}</strong>
                </p>
            ))}
        </div>
    );
};

export default function AnalyticsDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<AnalyticsSummaryDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [recFilter, setRecFilter] = useState<string>('ALL');
    const [dismissed, setDismissed] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem('dismissed_recs') || '[]')); } catch { return new Set(); }
    });
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = () => {
        setExportOpen(false);
        setIsPrinting(true);
        // Wait for React to re-render charts with fixed dimensions, then print
        setTimeout(() => {
            window.print();
        }, 500);
    };

    // Filters
    const [from, setFrom] = useState(daysAgo(30));
    const [to, setTo] = useState(today());
    const [period, setPeriod] = useState<AnalyticsPeriod>('DAILY');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await analyticsApi.getSummary(from, to, period);
            setData(res.data);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to load analytics data.');
        } finally { setLoading(false); }
    }, [from, to, period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Close export dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset isPrinting after print dialog closes
    useEffect(() => {
        const reset = () => setIsPrinting(false);
        window.addEventListener('afterprint', reset);
        return () => window.removeEventListener('afterprint', reset);
    }, []);

    const dismissRec = (id: string) => {
        const next = new Set(dismissed); next.add(id);
        setDismissed(next);
        localStorage.setItem('dismissed_recs', JSON.stringify([...next]));
    };

    const visibleRecs = useMemo(() => {
        if (!data?.recommendations) return [];
        return data.recommendations
            .filter(r => !dismissed.has(r.id))
            .filter(r => recFilter === 'ALL' || r.priority === recFilter);
    }, [data?.recommendations, dismissed, recFilter]);

    // ── Skeleton ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={styles.page}>
            <div style={{ textAlign: 'center', paddingTop: 120 }}>
                <div style={styles.spinner} />
                <p style={{ color: '#7c3aed', marginTop: 20, fontSize: 15, letterSpacing: 2 }}>LOADING ANALYTICS</p>
            </div>
        </div>
    );

    return (
        <div style={styles.page} className="print-root">
            {/* Inject print styles */}
            <style dangerouslySetInnerHTML={{ __html: SCREEN_STYLE }} />
            <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />
            {/* Background decoration – hidden in print */}
            <div style={styles.bgDots} className="no-print" />

            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
                    <div className="print-title">
                        <button onClick={() => navigate('/dashboard')} style={styles.backBtn} className="no-print">
                            <ArrowLeft size={14} /> Back
                        </button>
                        <h1 style={styles.pageTitle}>
                            <span className="gradient-text" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Analytics
                            </span>{' '}Dashboard
                        </h1>
                        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                            Intelligent insights · Real-time data · Smart recommendations
                        </p>
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Period toggle */}
                        <div style={styles.segmentGroup}>
                            {(['DAILY', 'WEEKLY', 'MONTHLY'] as AnalyticsPeriod[]).map(p => (
                                <button key={p} onClick={() => setPeriod(p)} style={{ ...styles.segmentBtn, ...(period === p ? styles.segmentActive : {}) }}>
                                    {p[0] + p.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                        {/* Date range */}
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.dateInput} />
                        <span style={{ color: '#475569', fontSize: 12 }}>to</span>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.dateInput} />
                        {/* Quick presets */}
                        <div style={styles.segmentGroup}>
                            {[['7D', 7], ['30D', 30], ['90D', 90]].map(([label, days]) => (
                                <button key={label} onClick={() => { setFrom(daysAgo(days as number)); setTo(today()); }} style={styles.segmentBtn}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchData} style={styles.iconBtn} title="Refresh">
                            <RefreshCw size={15} />
                        </button>

                        {/* Export dropdown */}
                        {data && (
                            <div ref={exportRef} style={{ position: 'relative' }}>
                                <button
                                    id="analytics-export-btn"
                                    onClick={() => setExportOpen((o: boolean) => !o)}
                                    style={styles.exportBtn}
                                    title="Export data"
                                >
                                    <Download size={14} />
                                    Export
                                    <ChevDown size={12} style={{ transition: 'transform .2s', transform: exportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                </button>
                                {exportOpen && (
                                    <div style={styles.exportMenu}>
                                        <p style={styles.exportMenuTitle}>Export Options</p>

                                        <button
                                            id="export-current-csv"
                                            style={styles.exportMenuItem}
                                            onClick={() => { exportTabCSV(activeTab, data, from, to); setExportOpen(false); }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <FileSpreadsheet size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, margin: 0 }}>Current Tab (CSV)</p>
                                                <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>Export visible tab data</p>
                                            </div>
                                        </button>

                                        <button
                                            id="export-all-csv"
                                            style={styles.exportMenuItem}
                                            onClick={() => { exportAllCSV(data, from, to); setExportOpen(false); }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <FileText size={15} style={{ color: '#06b6d4', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, margin: 0 }}>Full Report (CSV)</p>
                                                <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>KPIs + Revenue + Categories + Products + Employees</p>
                                            </div>
                                        </button>

                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0' }} />

                                        <button
                                            id="export-print-pdf"
                                            style={styles.exportMenuItem}
                                            onClick={handlePrint}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <Printer size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, margin: 0 }}>Print / Save as PDF</p>
                                                <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>Use browser print dialog</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {data && (
                    <PrintContext.Provider value={isPrinting}>
                    <>
                        {/* ── KPI Strip ── */}
                        <div className="print-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 32 }}>
                            <KpiCard label="Total Revenue" value={fmtRupee(data.totalRevenue)} growth={data.revenueGrowthPct} icon={<DollarSign size={20} />} color="#7c3aed" />
                            <KpiCard label="Units Sold" value={fmt(data.totalUnitsSold)} icon={<ShoppingCart size={20} />} color="#06b6d4" />
                            <KpiCard label="Inventory Value" value={fmtRupee(data.totalInventoryValue)} icon={<Package size={20} />} color="#10b981" />
                            <KpiCard label="Gross Profit" value={fmtRupee(data.grossProfit)} sub={`${data.grossProfitMarginPct?.toFixed(1)}% margin`} icon={<TrendingUp size={20} />} color="#f59e0b" />
                            <KpiCard label="Active Alerts" value={String(data.activeAlertCount)} icon={<AlertTriangle size={20} />} color="#f43f5e" alert />
                            <KpiCard label="Return Rate" value={`${data.returnRate?.toFixed(1)}%`} icon={<Activity size={20} />} color="#8b5cf6" />
                        </div>

                        {/* ── Secondary stats row ── */}
                        <div className="print-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 32 }}>
                            {[
                                { label: 'Avg Order Value', value: fmtRupee(data.averageOrderValue) },
                                { label: 'Transactions', value: fmt(data.totalTransactions) },
                                { label: 'Units Purchased', value: fmt(data.totalUnitsPurchased) },
                                { label: 'Low Stock Items', value: String(data.lowStockCount) },
                                { label: 'Out of Stock', value: String(data.outOfStockCount) },
                                { label: 'Damaged Units', value: String(data.totalDamagedUnits) },
                                { label: 'Recommendations', value: String(visibleRecs.length) },
                            ].map(s => (
                                <div key={s.label} style={styles.miniStat}>
                                    <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{s.label}</p>
                                    <p style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Tabs ── */}
                        <div className="no-print" style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                            {([
                                ['revenue', 'Revenue Trends'],
                                ['categories', 'Categories'],
                                ['products', 'Products'],
                                ['operations', 'Operations'],
                                ['recommendations', `Recommendations${visibleRecs.length ? ` (${visibleRecs.length})` : ''}`],
                            ] as [Tab, string][]).map(([id, label]) => (
                                <button key={id} onClick={() => setActiveTab(id)} style={{ ...styles.tabBtn, ...(activeTab === id ? styles.tabActive : {}) }}>
                                    {id === 'revenue' && <TrendingUp size={14} />}
                                    {id === 'categories' && <Layers size={14} />}
                                    {id === 'products' && <Package size={14} />}
                                    {id === 'operations' && <Activity size={14} />}
                                    {id === 'recommendations' && <Zap size={14} />}
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ── Tab Content – screen: show active tab only; print: show all ── */}
                        {/* Screen view – single active tab */}
                        <div className="no-print" style={styles.card}>
                            {activeTab === 'revenue' && <RevenueTab data={data} />}
                            {activeTab === 'categories' && <CategoriesTab data={data} />}
                            {activeTab === 'products' && <ProductsTab data={data} />}
                            {activeTab === 'operations' && <OperationsTab data={data} />}
                            {activeTab === 'recommendations' && (
                                <RecommendationsTab recs={visibleRecs} recFilter={recFilter} setRecFilter={setRecFilter} onDismiss={dismissRec} navigate={navigate} />
                            )}
                        </div>
                        {/* Print view – all sections rendered */}
                        <div className="print-only">
                            <div className="print-card"><RevenueTab data={data} /></div>
                            <div className="print-card print-break-before"><CategoriesTab data={data} /></div>
                            <div className="print-card"><ProductsTab data={data} /></div>
                            <div className="print-card print-break-before"><OperationsTab data={data} /></div>
                            <div className="print-card">
                                <RecommendationsTab recs={visibleRecs} recFilter={recFilter} setRecFilter={setRecFilter} onDismiss={dismissRec} navigate={navigate} />
                            </div>
                        </div>
                    </>
                    </PrintContext.Provider>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// KPI Card
// ══════════════════════════════════════════════════════
function KpiCard({ label, value, growth, sub, icon, color, alert }: {
    label: string; value: string; growth?: number; sub?: string;
    icon: React.ReactNode; color: string; alert?: boolean;
}) {
    const isPos = growth !== undefined && growth >= 0;
    return (
        <div style={{ ...styles.kpiCard, ...(alert && Number(value) > 0 ? { borderColor: 'rgba(244,63,94,0.3)' } : {}) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, boxShadow: `0 0 16px ${color}33` }}>
                    {icon}
                </div>
                {growth !== undefined && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: isPos ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: 2, background: isPos ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', padding: '2px 7px', borderRadius: 20 }}>
                        {isPos ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{Math.abs(growth).toFixed(1)}%
                    </span>
                )}
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginTop: 14, letterSpacing: '-0.03em', textShadow: `0 0 20px ${color}55` }}>{value}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</p>
            {sub && <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</p>}
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Revenue Tab
// ══════════════════════════════════════════════════════
function RevenueTab({ data }: { data: AnalyticsSummaryDTO }) {
    const ts = data.revenueTimeSeries || [];
    const typeData = Object.entries(data.transactionTypeCounts || {}).map(([name, value]) => ({ name, value }));
    const isPrinting = useContext(PrintContext);
    const W = isPrinting ? 700 : '100%';
    const Wh = isPrinting ? 700 : '100%'; // full-width in print since 2-col collapses
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Area chart - Revenue vs Purchases */}
            <div>
                <h3 style={styles.chartTitle}><TrendingUp size={16} style={{ color: '#7c3aed' }} /> Revenue vs Purchase Cost</h3>
                <ResponsiveContainer width={W} height={isPrinting ? 300 : 280}>
                    <AreaChart data={ts} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradPur" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gradRev)" dot={false} />
                        <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#06b6d4" strokeWidth={2} fill="url(#gradPur)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="print-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Units bar chart */}
                <div>
                    <h3 style={styles.chartTitle}><BarChart3 size={16} style={{ color: '#06b6d4' }} /> Units Sold vs Purchased</h3>
                    <ResponsiveContainer width={Wh} height={isPrinting ? 240 : 220}>
                        <BarChart data={ts} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                            <Bar dataKey="unitsSold" name="Units Sold" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="unitsPurchased" name="Units Purchased" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Transaction type pie */}
                <div>
                    <h3 style={styles.chartTitle}><Activity size={16} style={{ color: '#f59e0b' }} /> Transaction Breakdown</h3>
                    {typeData.length > 0 ? (
                        <ResponsiveContainer width={Wh} height={isPrinting ? 240 : 220}>
                            <PieChart>
                                <Pie data={typeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={3} animationDuration={800}>
                                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart text="No transaction data for this period" />
                    )}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Categories Tab
// ══════════════════════════════════════════════════════
function CategoriesTab({ data }: { data: AnalyticsSummaryDTO }) {
    const cats = data.categoryBreakdown || [];
    const radarData = cats.slice(0, 6).map(c => ({
        category: c.categoryName.length > 10 ? c.categoryName.slice(0, 10) + '…' : c.categoryName,
        Revenue: c.revenue,
        Units: c.unitsSold * 100,
    }));
    const isPrinting = useContext(PrintContext);
    const Wh = isPrinting ? 700 : '100%'; // full-width in print since 2-col collapses
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="print-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Horizontal bar chart */}
                <div>
                    <h3 style={styles.chartTitle}><BarChart3 size={16} style={{ color: '#7c3aed' }} /> Revenue by Category</h3>
                    {cats.length > 0 ? (
                        <ResponsiveContainer width={Wh} height={isPrinting ? 300 : 280}>
                            <BarChart data={cats} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <YAxis type="category" dataKey="categoryName" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[0, 6, 6, 0]}>
                                    {cats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart text="No category data" />}
                </div>

                {/* Radar chart */}
                <div>
                    <h3 style={styles.chartTitle}><Target size={16} style={{ color: '#06b6d4' }} /> Category Radar</h3>
                    {radarData.length > 0 ? (
                        <ResponsiveContainer width={Wh} height={isPrinting ? 300 : 280}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Radar name="Revenue" dataKey="Revenue" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                                <Radar name="Units×100" dataKey="Units" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart text="Need multiple categories for radar" />}
                </div>
            </div>

            {/* Category table */}
            {cats.length > 0 && (
                <div>
                    <h3 style={styles.chartTitle}><Layers size={16} style={{ color: '#f59e0b' }} /> Category Details</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                    {['Category', 'Revenue', 'Share', 'Units Sold', 'Transactions'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cats.map((c, i) => (
                                    <tr key={c.categoryName} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.07)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px 14px', color: '#f1f5f9', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                                            {c.categoryName}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#a78bfa', fontWeight: 700 }}>{fmtRupee(c.revenue)}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                                                    <div style={{ height: '100%', width: `${Math.min(c.revenueShare, 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 3 }} />
                                                </div>
                                                <span style={{ color: '#94a3b8', fontSize: 12, minWidth: 36 }}>{c.revenueShare?.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{fmt(c.unitsSold)}</td>
                                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{fmt(c.transactionCount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Products Tab
// ══════════════════════════════════════════════════════
function ProductsTab({ data }: { data: AnalyticsSummaryDTO }) {
    const top = data.topSellingProducts || [];
    const bottom = data.bottomSellingProducts || [];
    const atRisk = data.atRiskProducts || [];
    const [subTab, setSubTab] = useState<'top' | 'slow' | 'risk'>('top');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                {([
                    ['top', 'Top Sellers'],
                    ['slow', 'Slow Movers'],
                    ['risk', 'At Risk'],
                ] as ['top' | 'slow' | 'risk', string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setSubTab(id)} style={{ ...styles.subTabBtn, ...(subTab === id ? styles.subTabActive : {}), display: 'flex', alignItems: 'center', gap: 6 }}>
                        {id === 'top' && <Star size={13} />}
                        {id === 'slow' && <TrendingDown size={13} />}
                        {id === 'risk' && <AlertTriangle size={13} />}
                        {label}
                    </button>
                ))}
            </div>

            {subTab === 'top' && (
                <ProductRanking products={top} title="Top Selling Products" emptyText="No sales data for this period" accentColor="#7c3aed" />
            )}
            {subTab === 'slow' && (
                <ProductRanking products={bottom} title="Slow Moving Products" emptyText="No slow movers found" accentColor="#f59e0b" showAlert />
            )}
            {subTab === 'risk' && (
                <ProductRanking products={atRisk} title="At-Risk Products (Low/Overstock)" emptyText="No at-risk products" accentColor="#f43f5e" showStock />
            )}
        </div>
    );
}

function ProductRanking({ products, title, emptyText, accentColor, showAlert, showStock }: {
    products: ProductPerformanceDTO[]; title: string; emptyText: string;
    accentColor: string; showAlert?: boolean; showStock?: boolean;
}) {
    const maxUnits = Math.max(...products.map(p => p.unitsSold || 0), 1);
    return (
        <div>
            <h3 style={{ ...styles.chartTitle, marginBottom: 20 }}><Star size={16} style={{ color: accentColor }} /> {title}</h3>
            {products.length === 0 ? <EmptyChart text={emptyText} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {products.map((p, i) => (
                        <div key={p.productId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', transition: 'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#475569', minWidth: 26 }}>#{i + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.productName}</p>
                                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{p.categoryName} · {p.productSku}</p>
                                {!showStock && (
                                    <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                        <div style={{ height: '100%', width: `${((p.unitsSold || 0) / maxUnits) * 100}%`, background: accentColor, borderRadius: 2, transition: 'width .6s' }} />
                                    </div>
                                )}
                            </div>
                            {showStock ? (
                                <div style={{ textAlign: 'right', minWidth: 90 }}>
                                    <p style={{ color: p.isOutOfStock ? '#f43f5e' : p.isLowStock ? '#f59e0b' : '#10b981', fontWeight: 700, fontSize: 15 }}>{p.currentStock}</p>
                                    <p style={{ color: '#64748b', fontSize: 11 }}>/ {p.reorderLevel} min</p>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'right', minWidth: 90 }}>
                                    <p style={{ color: accentColor, fontWeight: 700, fontSize: 15 }}>{p.unitsSold} units</p>
                                    <p style={{ color: '#64748b', fontSize: 11 }}>{fmtRupee(p.revenue)}</p>
                                </div>
                            )}
                            {p.profitMargin !== undefined && (
                                <div style={{ textAlign: 'right', minWidth: 60 }}>
                                    <p style={{ fontSize: 12, color: p.profitMargin > 20 ? '#10b981' : p.profitMargin > 10 ? '#f59e0b' : '#f43f5e', fontWeight: 600 }}>
                                        {p.profitMargin?.toFixed(1)}%
                                    </p>
                                    <p style={{ color: '#475569', fontSize: 10 }}>margin</p>
                                </div>
                            )}
                            {(showAlert && p.isLowStock) && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontWeight: 700 }}>LOW</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Operations Tab
// ══════════════════════════════════════════════════════
function OperationsTab({ data }: { data: AnalyticsSummaryDTO }) {
    const emps = data.employeePerformance || [];
    const maxSale = Math.max(...emps.map(e => e.totalSaleValue || 0), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
                <h3 style={styles.chartTitle}><Users size={16} style={{ color: '#06b6d4' }} /> Employee Performance</h3>
                {emps.length === 0 ? <EmptyChart text="No employee data for this period" /> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                    {['#', 'Employee', 'Role', 'Transactions', 'Units Sold', 'Sale Value', 'Performance'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {emps.map((e, i) => (
                                    <tr key={e.userId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                        onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(6,182,212,0.05)')}
                                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>#{i + 1}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${CHART_COLORS[i % CHART_COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700, fontSize: 13 }}>
                                                    {(e.fullName || e.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ color: '#f1f5f9', fontWeight: 600 }}>{e.fullName || e.username}</p>
                                                    <p style={{ color: '#64748b', fontSize: 11 }}>@{e.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>{e.role}</span></td>
                                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{e.transactionCount}</td>
                                        <td style={{ padding: '12px 14px', color: '#06b6d4', fontWeight: 600 }}>{e.unitsSold}</td>
                                        <td style={{ padding: '12px 14px', color: '#7c3aed', fontWeight: 700 }}>{fmtRupee(e.totalSaleValue)}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                <div style={{ height: '100%', width: `${(e.totalSaleValue / maxSale) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 3 }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stock health quick summary */}
            <div>
                <h3 style={styles.chartTitle}><Package size={16} style={{ color: '#10b981' }} /> Stock Health</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {[
                        { label: 'Total Products', value: data.totalProducts, color: '#7c3aed' },
                        { label: 'Low Stock', value: data.lowStockCount, color: '#f59e0b' },
                        { label: 'Out of Stock', value: data.outOfStockCount, color: '#f43f5e' },
                        { label: 'Damaged Units', value: data.totalDamagedUnits, color: '#ef4444' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '16px 20px', background: `${s.color}11`, border: `1px solid ${s.color}33`, borderRadius: 14 }}>
                            <p style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</p>
                            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Recommendations Tab
// ══════════════════════════════════════════════════════
function RecommendationsTab({ recs, recFilter, setRecFilter, onDismiss, navigate }: {
    recs: RecommendationDTO[]; recFilter: string;
    setRecFilter: (f: string) => void;
    onDismiss: (id: string) => void;
    navigate: ReturnType<typeof useNavigate>;
}) {
    // Map recommendation category → action route
    const handleAction = (rec: RecommendationDTO) => {
        switch (rec.category) {
            case 'REORDER':
                // Go to Stock In page — manager/admin can place reorder
                navigate('/stock/in', { state: { productHint: rec.affectedEntity } });
                break;
            case 'OVERSTOCK':
                // Go to products page so they can edit or adjust stock
                navigate('/products', { state: { search: rec.affectedEntity } });
                break;
            case 'PRICING':
                // Go to products — they can edit selling/cost price there
                navigate('/products', { state: { search: rec.affectedEntity } });
                break;
            case 'SLOW_MOVER':
                // Go to products page — view stock levels and decide action
                navigate('/products', { state: { search: rec.affectedEntity } });
                break;
            case 'RETURN_ANOMALY':
                navigate('/admin/returns');
                break;
            case 'PERFORMANCE':
                navigate('/products', { state: { search: rec.affectedEntity } });
                break;
            default:
                navigate('/products');
        }
    };

    // Friendlier action labels per category
    const getActionLabel = (rec: RecommendationDTO): string => {
        switch (rec.category) {
            case 'REORDER': return 'Stock In →';
            case 'OVERSTOCK': return 'Adjust Stock →';
            case 'PRICING': return 'Edit Price →';
            case 'SLOW_MOVER': return 'View Product →';
            case 'RETURN_ANOMALY': return 'View Returns →';
            case 'PERFORMANCE': return 'View Product →';
            default: return 'Take Action →';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ ...styles.chartTitle, margin: 0 }}><Zap size={16} style={{ color: '#f59e0b' }} /> Intelligent Recommendations</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                        <button key={f} onClick={() => setRecFilter(f)} style={{
                            padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                            borderColor: recFilter === f ? (PRIORITY_META[f]?.color || '#7c3aed') : 'rgba(255,255,255,0.1)',
                            background: recFilter === f ? (PRIORITY_META[f]?.bg || 'rgba(124,58,237,0.2)') : 'transparent',
                            color: recFilter === f ? (PRIORITY_META[f]?.color || '#a78bfa') : '#64748b',
                        }}>
                            {f === 'ALL' ? 'All' : PRIORITY_META[f]?.label}
                        </button>
                    ))}
                </div>
            </div>

            {recs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                    <Award size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>All clear! No recommendations</p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>Your inventory is in great shape.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {recs.map(rec => {
                        const pm = PRIORITY_META[rec.priority] || PRIORITY_META.LOW;
                        const cm = CATEGORY_META[rec.category] || { icon: '📋', label: rec.category };
                        return (
                            <div key={rec.id} style={{ padding: '18px 20px', background: pm.bg, border: `1px solid ${pm.color}30`, borderRadius: 16, position: 'relative', transition: 'all .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = `${pm.color}70`)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = `${pm.color}30`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: pm.color, padding: '3px 10px', borderRadius: 6, background: `${pm.color}20`, border: `1px solid ${pm.color}40`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                {pm.label}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#94a3b8', padding: '3px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, letterSpacing: '0.03em' }}>
                                                {cm.label}
                                            </span>
                                            {rec.potentialImpact > 0 && (
                                                <span style={{ fontSize: 11, color: '#10b981', padding: '3px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 20, fontWeight: 600 }}>
                                                    Impact: {fmtRupee(rec.potentialImpact)}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{rec.title}</p>
                                        <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{rec.description}</p>
                                        {rec.metric && <p style={{ color: '#64748b', fontSize: 12, marginTop: 8, fontFamily: 'monospace' }}>{rec.metric}</p>}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                                        <button
                                            onClick={() => handleAction(rec)}
                                            style={{ ...styles.actionBtn, background: pm.color, whiteSpace: 'nowrap', fontSize: 12 }}
                                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                            {getActionLabel(rec)}
                                        </button>
                                        <button onClick={() => onDismiss(rec.id)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 8, transition: 'color .15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                                            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Empty chart placeholder ────────────────────────────────────────────────────
function EmptyChart({ text }: { text: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#475569' }}>
            <BarChart3 size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
            <p style={{ fontSize: 13 }}>{text}</p>
        </div>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        background: '#0a0e1a',
        fontFamily: '"Inter", -apple-system, sans-serif',
        position: 'relative',
        overflowX: 'hidden',
    },
    bgDots: {
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.06) 0%, transparent 60%)',
    },
    backBtn: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
        fontSize: 13, marginBottom: 10, padding: '4px 0', transition: 'color .15s',
    },
    pageTitle: {
        fontSize: 32, fontWeight: 800, color: '#f1f5f9',
        letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
    },
    segmentGroup: {
        display: 'flex', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', padding: 3, gap: 2,
    },
    segmentBtn: {
        padding: '5px 12px', background: 'transparent', border: 'none',
        color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 7, transition: 'all .15s',
    },
    segmentActive: {
        background: 'rgba(124,58,237,0.3)', color: '#a78bfa',
    },
    dateInput: {
        padding: '6px 12px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, color: '#94a3b8', fontSize: 12, cursor: 'pointer',
    },
    iconBtn: {
        width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
    },
    kpiCard: {
        background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 22px', transition: 'all .2s',
    },
    miniStat: {
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: '12px 16px',
    },
    tabBtn: {
        padding: '9px 16px', border: 'none', background: 'transparent',
        color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all .15s',
    },
    tabActive: {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.15))',
        color: '#a78bfa',
        boxShadow: '0 0 20px rgba(124,58,237,0.2)',
    },
    card: {
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 28px',
    },
    chartTitle: {
        color: '#94a3b8', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginTop: 0,
    },
    subTabBtn: {
        padding: '7px 16px', border: '1px solid rgba(255,255,255,0.08)',
        background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12,
        fontWeight: 600, borderRadius: 20, transition: 'all .15s',
    },
    subTabActive: {
        background: 'rgba(124,58,237,0.2)', borderColor: 'rgba(124,58,237,0.4)', color: '#a78bfa',
    },
    actionBtn: {
        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
        border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 700,
        fontSize: 13, transition: 'opacity .15s',
    },
    spinner: {
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed',
        animation: 'spin 0.8s linear infinite', margin: '0 auto',
    },
    exportBtn: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: 10, background: 'rgba(124,58,237,0.15)',
        color: '#a78bfa', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        transition: 'all .15s', whiteSpace: 'nowrap' as const,
    },
    exportMenu: {
        position: 'absolute' as const, top: 'calc(100% + 8px)', right: 0,
        background: 'rgba(12,16,30,0.98)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16,
        padding: '10px 8px', minWidth: 290,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
        zIndex: 9999,
    },
    exportMenuTitle: {
        color: '#475569', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase' as const, padding: '4px 10px 8px', margin: 0,
    },
    exportMenuItem: {
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px', border: 'none',
        background: 'transparent', cursor: 'pointer', borderRadius: 10,
        textAlign: 'left' as const, transition: 'background .15s',
    },
};
