
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { genAiService } from '../services/genAiService';

interface ScenarioState {
  temp: string;
  wind: string;
  solar: string;
  load: string;
  growth: string;
  ev: string;
  gen: string;
  reserves: string;
  outages: string;
}

const INITIAL_STATE: ScenarioState = {
  temp: "75°F",
  wind: "12 mph",
  solar: "800 W/m²",
  load: "45k MW",
  growth: "2.1%",
  ev: "1.5%",
  gen: "50k MW",
  reserves: "15%",
  outages: "None"
};

// --- Helper Hook for Streaming Text ---
const useTypewriter = (text: string | null, speed: number = 5) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return displayedText;
};

// --- Parser Component for Military Markdown ---
const ReportRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2 font-mono text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // Handle BLUF (Bottom Line Up Front)
        if (line.includes('BLUF:')) {
          const content = line.replace('BLUF:', '').trim();
          return (
            <div key={idx} className="bg-[var(--bg-tertiary)] border-l-4 border-[var(--status-info)] p-3 my-4 rounded-r">
              <span className="font-bold text-[var(--status-info)]">BLUF: </span>
              <span className="text-[var(--text-primary)]">{content}</span>
            </div>
          );
        }

        // Handle Headers (##)
        if (line.startsWith('##')) {
          return (
            <h3 key={idx} className="text-[var(--text-link)] font-bold text-base mt-6 mb-2 border-b border-[var(--border-muted)] pb-1 uppercase tracking-wider">
              {line.replace(/#/g, '').trim()}
            </h3>
          );
        }
        
        // Handle Bullet Points
        if (line.trim().startsWith('-')) {
            const content = line.trim().substring(1).trim();
            // Simple Bold Parser: **text** -> <strong>text</strong>
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={idx} className="flex gap-2 ml-2">
                    <span className="text-[var(--status-normal)]">➤</span>
                    <span>
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="text-[var(--text-primary)] bg-[var(--bg-active)] px-1 rounded">{part.slice(2, -2)}</strong>;
                            }
                            return <span key={i} className="text-[var(--text-secondary)]">{part}</span>;
                        })}
                    </span>
                </div>
            );
        }

        // Standard Text (with Bold support)
        if (line.trim().length > 0) {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={idx} className="text-[var(--text-secondary)]">
                    {parts.map((part, i) => {
                         if (part.startsWith('**') && part.endsWith('**')) {
                             return <strong key={i} className="text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
                         }
                         return part;
                    })}
                </div>
            );
        }

        return <div key={idx} className="h-2"></div>;
      })}
    </div>
  );
};

const ComputingVisual: React.FC = () => {
    const [lines, setLines] = useState<string[]>([]);
    
    useEffect(() => {
        const logs = [
            "INITIALIZING_PHYSICS_ENGINE...",
            "LOADING_MESH_TOPOLOGY [20,000 NODES]",
            "RUNNING_MONTE_CARLO_SIMULATION (N=5000)...",
            "SOLVING_AC_POWER_FLOW_EQUATIONS...",
            "CONVERGENCE_CHECK: PASS",
            "OPTIMIZING_UNIT_COMMITMENT...",
            "APPLYING_WEATHER_DERATING_FACTORS...",
            "GENERATING_STRATEGIC_RESPONSE..."
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < logs.length) {
                setLines(prev => [...prev, logs[i]]);
                i++;
            }
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full bg-black font-mono text-xs p-4 overflow-hidden flex flex-col justify-center items-center relative">
            <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmhmb2FvbzF6bmhmb2FvbzF6bmhmb2FvbzF6bmhmb2FvbzF6bmhmb2FvbzF6/3o7TKSjRrfIPjeiVyM/giphy.gif')] opacity-5 bg-cover pointer-events-none"></div>
            <div className="z-10 w-full max-w-md space-y-2">
                {lines.map((line, idx) => (
                    <div key={idx} className="text-[var(--status-info)] animate-in fade-in slide-in-from-left-4">
                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {line}
                    </div>
                ))}
                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-[var(--status-info)] animate-[progress_2.5s_ease-in-out_infinite]" style={{width: '100%'}}></div>
                </div>
            </div>
        </div>
    );
};

export const Scenarios: React.FC = () => {
  const [inputs, setInputs] = useState<ScenarioState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [rawResult, setRawResult] = useState<string | null>(null);
  
  // Use the hook for the typewriter effect
  const displayedResult = useTypewriter(rawResult, 5); 

  const cycleValue = (key: keyof ScenarioState, current: string) => {
    // Simple 3-state cycle for input selection
    let next = current;
    
    if (key === 'temp') {
      if (current === "75°F") next = "95°F";
      else if (current === "95°F") next = "110°F";
      else next = "75°F";
    }
    if (key === 'load') {
      if (current === "45k MW") next = "65k MW";
      else if (current === "65k MW") next = "82k MW";
      else next = "45k MW";
    }
    if (key === 'reserves') {
      if (current === "15%") next = "5%";
      else if (current === "5%") next = "1%";
      else next = "15%";
    }
    // Default fallback for others
    if (next === current && current.includes("None")) next = "Major";
    else if (next === current && current === "Major") next = "None";

    setInputs(prev => ({ ...prev, [key]: next }));
  };

  const getStatusColor = (val: string) => {
    if (val === "110°F" || val === "82k MW" || val === "1%" || val === "Major") return "text-[var(--status-critical)]";
    if (val === "95°F" || val === "65k MW" || val === "5%") return "text-[var(--status-warning)]";
    return "text-[var(--text-primary)]";
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRawResult(null);
    
    // Direct AI Call - No fake physics delays
    const aiOutput = await genAiService.simulateScenario(inputs);
    
    setIsRunning(false);
    setRawResult(aiOutput);
  };

  return (
    <div className="space-y-6">
      {/* HEADER: Scenario Simulator [New] [Load] [Save] */}
      <header className="flex justify-between items-center mb-2">
         <h2 className="text-2xl font-bold text-[var(--text-primary)]">Scenario Simulator</h2>
         <div className="flex gap-2">
            <Button variant="secondary" size="sm">New</Button>
            <Button variant="secondary" size="sm">Load</Button>
            <Button variant="secondary" size="sm">Save</Button>
         </div>
      </header>

      {/* SCENARIO BUILDER CARD */}
      <Card title="Scenario Builder">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* WEATHER COLUMN */}
           <div className="p-4 border border-[var(--border-default)] rounded bg-[var(--bg-tertiary)] flex flex-col">
             <h4 className="font-semibold mb-2 text-[var(--text-primary)]">WEATHER</h4>
             <div className="space-y-2 mb-4 flex-1">
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Temp:</span> <span className={`font-mono transition-colors ${getStatusColor(inputs.temp)}`}>{inputs.temp}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Wind:</span> <span className="font-mono text-[var(--text-primary)]">{inputs.wind}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Solar:</span> <span className="font-mono text-[var(--text-primary)]">{inputs.solar}</span></div>
             </div>
             <Button variant="secondary" size="sm" className="w-full" onClick={() => cycleValue('temp', inputs.temp)}>Adjust Temp</Button>
           </div>
           
           {/* DEMAND COLUMN */}
           <div className="p-4 border border-[var(--border-default)] rounded bg-[var(--bg-tertiary)] flex flex-col">
             <h4 className="font-semibold mb-2 text-[var(--text-primary)]">DEMAND</h4>
             <div className="space-y-2 mb-4 flex-1">
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Load:</span> <span className={`font-mono transition-colors ${getStatusColor(inputs.load)}`}>{inputs.load}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Growth:</span> <span className="font-mono text-[var(--text-primary)]">{inputs.growth}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>EVs:</span> <span className="font-mono text-[var(--text-primary)]">{inputs.ev}</span></div>
             </div>
             <Button variant="secondary" size="sm" className="w-full" onClick={() => cycleValue('load', inputs.load)}>Adjust Load</Button>
           </div>

           {/* SUPPLY COLUMN */}
           <div className="p-4 border border-[var(--border-default)] rounded bg-[var(--bg-tertiary)] flex flex-col">
             <h4 className="font-semibold mb-2 text-[var(--text-primary)]">SUPPLY</h4>
             <div className="space-y-2 mb-4 flex-1">
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Gen:</span> <span className="font-mono text-[var(--text-primary)]">{inputs.gen}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Reserve:</span> <span className={`font-mono transition-colors ${getStatusColor(inputs.reserves)}`}>{inputs.reserves}</span></div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Outages:</span> <span className={`font-mono transition-colors ${getStatusColor(inputs.outages)}`}>{inputs.outages}</span></div>
             </div>
             <Button variant="secondary" size="sm" className="w-full" onClick={() => cycleValue('reserves', inputs.reserves)}>Adjust Reserve</Button>
           </div>
        </div>
        
        <div className="mt-6 flex justify-end pt-4 border-t border-[var(--border-muted)]">
           <Button 
             variant="primary" 
             className="w-48"
             onClick={handleRun}
             disabled={isRunning}
           >
             {isRunning ? (
               <span className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                 CALCULATING...
               </span>
             ) : (
               "RUN AI SIMULATION"
             )}
           </Button>
        </div>
      </Card>

      {/* RESULTS CARD */}
      <Card 
        title="Simulation Results" 
        className="min-h-[400px]" 
        isEmpty={!rawResult && !isRunning} 
        emptyMessage="Configure scenario parameters above and click Run to see AI prediction"
        isLoading={false} // Manually handling loading state via visual
      >
        <div className="h-full w-full">
          {isRunning ? (
             <ComputingVisual />
          ) : rawResult ? (
            <div className="animate-in fade-in duration-500">
               <ReportRenderer text={displayedResult} />
            </div>
          ) : null}
        </div>
      </Card>
      
      {/* PRESETS */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Preset Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-[var(--bg-secondary)] p-4 border border-[var(--border-default)] rounded flex flex-col items-center justify-center text-center opacity-70">
              <span className="font-semibold text-[var(--text-primary)] mb-2">Winter Storm</span>
              <span className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Locked
              </span>
              <Button variant="ghost" size="sm" disabled>Connect API</Button>
           </div>
           <div className="bg-[var(--bg-secondary)] p-4 border border-[var(--border-default)] rounded flex flex-col items-center justify-center text-center opacity-70">
              <span className="font-semibold text-[var(--text-primary)] mb-2">Summer Peak Heat</span>
              <span className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Locked
              </span>
              <Button variant="ghost" size="sm" disabled>Connect API</Button>
           </div>
           <div className="bg-[var(--bg-secondary)] p-4 border border-[var(--border-default)] rounded flex flex-col items-center justify-center text-center opacity-70">
              <span className="font-semibold text-[var(--text-primary)] mb-2">Renewable Surge</span>
              <span className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Locked
              </span>
              <Button variant="ghost" size="sm" disabled>Connect API</Button>
           </div>
        </div>
      </div>
    </div>
  );
};
