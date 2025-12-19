
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { Skeleton } from '../Common/Skeleton';

// --- Types ---
interface ChartData {
  time?: string;
  value?: number;
  confidenceRange?: number[]; // [low, high]
  value2?: number; // Secondary value (e.g. Day Ahead Price)
  category?: string;
  metric?: number;
  noise?: number;
  accuracy?: number;
  name?: string; // For Pie
  fill?: string; // For Pie
}

interface ChartProps {
  data: any[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  max?: number; // For Gauge
  title1?: string;
  title2?: string;
  isLoading?: boolean; // New Prop for visual stability
  isEmpty?: boolean;   // New Prop for empty states
  emptyMessage?: string; 
}

// --- Theme Hook ---
// Ensures charts adapt to Light/Dark mode automatically
const useChartTheme = () => {
  const getTheme = () => {
    const isLight = document.body.classList.contains('light-mode');
    return {
        grid: isLight ? '#E5E7EB' : '#30363D',
        text: isLight ? '#6B7280' : '#8B949E',
        tooltipBg: isLight ? '#FFFFFF' : '#161B22',
        tooltipBorder: isLight ? '#E5E7EB' : '#30363D',
        colors: {
            primary: '#58A6FF',
            warning: '#D29922',
            critical: '#DA3633',
            success: '#238636',
            area: 'rgba(88, 166, 255, 0.1)',
            areaStroke: 'rgba(88, 166, 255, 0.4)',
            fuel: {
                solar: '#E3B341',
                wind: '#2EA043',
                gas: '#A371F7',
                coal: '#8B949E',
                nuclear: '#F85149',
                hydro: '#58A6FF',
                other: '#6E7681'
            }
        }
    };
  };

  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const handleThemeChange = () => setTheme(getTheme());
    window.addEventListener('theme-change', handleThemeChange);
    // Observer for body class changes (Light/Dark mode toggle)
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
        window.removeEventListener('theme-change', handleThemeChange);
        observer.disconnect();
    };
  }, []);

  return theme;
};

// --- Helper for Loading/Empty States ---
const ChartContainer: React.FC<{ 
    children: React.ReactNode; 
    isLoading?: boolean; 
    isEmpty?: boolean; 
    emptyMessage?: string; 
    height: number;
}> = ({ children, isLoading, isEmpty, emptyMessage, height }) => {
    
    if (isLoading) {
        return (
            <div style={{ height }} className="w-full relative overflow-hidden rounded bg-[var(--bg-tertiary)]/20 p-4">
                {/* Visual Skeleton approximating a chart */}
                <div className="flex h-full items-end justify-between gap-2 opacity-50">
                    <Skeleton variant="rect" height="40%" className="flex-1" />
                    <Skeleton variant="rect" height="70%" className="flex-1" />
                    <Skeleton variant="rect" height="50%" className="flex-1" />
                    <Skeleton variant="rect" height="80%" className="flex-1" />
                    <Skeleton variant="rect" height="60%" className="flex-1" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-default)] animate-pulse shadow-sm">
                        ANALYZING TELEMETRY...
                    </span>
                </div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div style={{ height }} className="w-full flex flex-col items-center justify-center border border-dashed border-[var(--border-muted)] rounded bg-[var(--bg-tertiary)]/10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)] mb-3 opacity-40"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                <span className="text-xs text-[var(--text-muted)] font-mono">{emptyMessage || 'NO SIGNAL ACQUIRED'}</span>
            </div>
        );
    }

    return <div style={{ height }} className="w-full animate-in fade-in duration-500">{children}</div>;
};

// --- Exported Components ---

export const ForecastChart: React.FC<ChartProps> = ({ data, height = 200, isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();
  
  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUncertainty" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={THEME.colors.primary} stopOpacity={0.2} />
              <stop offset="95%" stopColor={THEME.colors.primary} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke={THEME.text} 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            stroke={THEME.text} 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, borderRadius: '4px', color: THEME.text }}
            itemStyle={{ color: THEME.text }}
            labelStyle={{ color: THEME.text, marginBottom: '4px', fontSize: '10px' }}
          />
          <Area 
            type="monotone" 
            dataKey="confidenceRange" 
            stroke="none"
            fill="url(#colorUncertainty)" 
            name="Uncertainty"
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={THEME.colors.primary} 
            strokeWidth={2}
            dot={false}
            name="Predicted Load"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {/* Capacity Line */}
          <ReferenceLine y={80000} label={{ value: 'Max Capacity', fill: THEME.colors.critical, fontSize: 9, position: 'insideTopRight' }} stroke={THEME.colors.critical} strokeDasharray="3 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const PriceTrendChart: React.FC<ChartProps> = ({ data, height = 200, isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();

  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="time" stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, color: THEME.text, fontSize: '12px' }}
            labelStyle={{ color: THEME.text }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Line 
            type="stepAfter" 
            dataKey="value2" 
            stroke={THEME.colors.warning} 
            strokeDasharray="5 5" 
            dot={false} 
            strokeWidth={1.5} 
            name="Day-Ahead" 
          />
          <Line 
            type="stepAfter" 
            dataKey="value" 
            stroke={THEME.colors.primary} 
            dot={false} 
            strokeWidth={2} 
            name="Real-Time" 
          />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }}/>
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const ReservesGauge: React.FC<ChartProps & { label?: string }> = ({ data, height = 180, max = 10000, label, isLoading }) => {
    const THEME = useChartTheme();
    
    // Custom Loading for Gauge
    if (isLoading) {
        return (
            <div style={{ height }} className="flex flex-col items-center justify-center gap-3">
                <Skeleton variant="circle" width={90} height={90} />
                <Skeleton variant="text" width={60} />
            </div>
        );
    }

    const value = data[0]?.value || 0;
    const remaining = Math.max(0, max - value);
    
    let color = THEME.colors.success;
    if (value < 3000) color = THEME.colors.warning;
    if (value < 1500) color = THEME.colors.critical;
    
    const pieData = [
        { name: 'Reserves', value: value, fill: color },
        { name: 'Capacity', value: remaining, fill: 'var(--bg-tertiary)' }
    ];

    const cx = "50%";
    const cy = "70%";
    const iR = 60;
    const oR = 80;

    return (
        <div className="relative flex flex-col items-center justify-center animate-in zoom-in duration-300" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        dataKey="value"
                        startAngle={180}
                        endAngle={0}
                        data={pieData}
                        cx={cx}
                        cy={cy}
                        innerRadius={iR}
                        outerRadius={oR}
                        stroke="none"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-4 flex flex-col items-center">
                <span className="text-2xl font-mono font-bold transition-colors duration-300" style={{ color }}>{value.toLocaleString()}</span>
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest">{label || 'MW RESERVES'}</span>
            </div>
        </div>
    );
};

export const HistoricalComparisonChart: React.FC<ChartProps> = ({ data, height = 300, title1 = "Actual Load", title2 = "Demand (Est.)", isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();

  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="time" stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
          <Tooltip 
            contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, color: THEME.text, fontSize: '12px' }}
            labelStyle={{ color: THEME.text }}
          />
          <Line type="monotone" dataKey="value" stroke={THEME.colors.critical} dot={false} strokeWidth={2} name={title1} />
          <Line type="monotone" dataKey="value2" stroke={THEME.colors.success} dot={false} strokeWidth={2} name={title2} strokeDasharray="5 5" />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }}/>
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const AccuracyChart: React.FC<ChartProps> = ({ data, height = 200, isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();

  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="time" stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis stroke={THEME.text} fontSize={10} tickLine={false} axisLine={false} unit="%" domain={[80, 100]} />
          <Tooltip cursor={{fill: 'var(--bg-hover)'}} contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, color: THEME.text }} labelStyle={{ color: THEME.text }} />
          <Bar dataKey="value" fill={THEME.colors.primary} radius={[2, 2, 0, 0]} name="Accuracy" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const FairnessBarChart: React.FC<ChartProps> = ({ data, height = 250, isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();

  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} horizontal={false} />
          <XAxis type="number" stroke={THEME.text} fontSize={10} unit=" min" />
          <YAxis dataKey="category" type="category" stroke={THEME.text} fontSize={10} width={100} tick={{fontSize: 10}} />
          <Tooltip 
            cursor={{fill: 'var(--bg-hover)'}} 
            contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, color: THEME.text }}
            labelStyle={{ color: THEME.text }}
          />
          <ReferenceLine x={45} stroke={THEME.colors.success} strokeDasharray="3 3" label={{ value: 'SLA (<45m)', fill: THEME.colors.success, fontSize: 9 }} />
          <Bar dataKey="value" fill={THEME.colors.primary} radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value > 55 ? THEME.colors.critical : THEME.colors.primary} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const RobustnessScatterChart: React.FC<ChartProps> = ({ data, height = 250, isLoading, isEmpty, emptyMessage }) => {
    const THEME = useChartTheme();

    return (
      <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} />
            <XAxis type="number" dataKey="noise" name="Noise" unit="%" stroke={THEME.text} fontSize={10} label={{ value: 'Signal Noise', position: 'insideBottom', offset: -5, fontSize: 10, fill: THEME.text }} />
            <YAxis type="number" dataKey="accuracy" name="Accuracy" unit="%" stroke={THEME.text} fontSize={10} domain={[60, 100]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, color: THEME.text }} labelStyle={{ color: THEME.text }} />
            <ReferenceLine y={85} stroke={THEME.colors.warning} strokeDasharray="3 3" label={{ value: 'Reliability Floor', fill: THEME.colors.warning, fontSize: 9 }} />
            <Scatter name="Tests" data={data} fill={THEME.colors.primary} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

export const FuelMixDonut: React.FC<ChartProps> = ({ data, height = 180, isLoading, isEmpty, emptyMessage }) => {
  const THEME = useChartTheme();

  return (
    <ChartContainer isLoading={isLoading} isEmpty={isEmpty || (!data || data.length === 0)} emptyMessage={emptyMessage} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, bottom: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => {
               // Robust color mapping
               const key = (entry.name || '').toLowerCase();
               let color = entry.fill || THEME.colors.fuel.other;
               if (!entry.fill) {
                   if (key.includes('solar')) color = THEME.colors.fuel.solar;
                   else if (key.includes('wind')) color = THEME.colors.fuel.wind;
                   else if (key.includes('nuclear')) color = THEME.colors.fuel.nuclear;
                   else if (key.includes('hydro')) color = THEME.colors.fuel.hydro;
                   else if (key.includes('coal')) color = THEME.colors.fuel.coal;
                   else if (key.includes('gas')) color = THEME.colors.fuel.gas;
               }
               return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: THEME.tooltipBg, borderColor: THEME.tooltipBorder, borderRadius: '4px', fontSize: '12px', color: THEME.text }}
             itemStyle={{ color: THEME.text }}
             formatter={(value: number) => [`${(value/1000).toFixed(1)}k MW`, 'Output']}
          />
          <Legend 
             layout="vertical" 
             verticalAlign="middle" 
             align="right"
             iconSize={8}
             wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
