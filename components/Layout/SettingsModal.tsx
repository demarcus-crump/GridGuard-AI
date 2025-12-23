
import React, { useState, useEffect } from 'react';
import { Button } from '../Common/Button';
import { genAiService } from '../../services/genAiService';
import { liveService } from '../../services/liveService';
import { apiService } from '../../services/apiService';
import { agentOrchestrator } from '../../services/agentOrchestrator';
import { notificationService } from '../../services/notificationService';
import { API_CONFIG } from '../../services/apiConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [gridKey, setGridKey] = useState('');
  const [ercotKey, setErcotKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [cesiumKey, setCesiumKey] = useState('');
  
  // GridStatus Test State
  const [testingGrid, setTestingGrid] = useState(false);
  const [gridTestStatus, setGridTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [gridTestMessage, setGridTestMessage] = useState('');

  // ERCOT Test State
  const [testingErcot, setTestingErcot] = useState(false);
  const [ercotStatus, setErcotStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [ercotError, setErcotError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Prioritize hardcoded keys, then local storage
      setGridKey(API_CONFIG.GRID_STATUS_KEY || localStorage.getItem('GRID_STATUS_KEY') || '');
      setErcotKey(API_CONFIG.ERCOT_API_KEY || localStorage.getItem('ERCOT_API_KEY') || '');
      setAiKey(API_CONFIG.GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || '');
      setCesiumKey(API_CONFIG.CESIUM_ION_TOKEN || localStorage.getItem('CESIUM_ION_TOKEN') || '');
      
      setErcotStatus('idle');
      setErcotError('');
      setGridTestStatus('idle');
      setGridTestMessage('');
    }
  }, [isOpen]);

  const handleTestGrid = async () => {
    if (!gridKey) return;
    setTestingGrid(true);
    setGridTestStatus('idle');
    setGridTestMessage('');
    
    const result = await apiService.verifyGridStatusKey(gridKey);
    setTestingGrid(false);
    
    if (result.success) {
        setGridTestStatus('success');
        setGridTestMessage(result.message || 'Verified');
        notificationService.success("GridStatus Verified", "Connection successful.");
    } else {
        setGridTestStatus('error');
        setGridTestMessage(result.message || 'Failed');
        notificationService.error("Connection Failed", result.message || "Invalid Key");
    }
  };

  const handleTestErcot = async () => {
      if (!ercotKey) return;
      setTestingErcot(true);
      setErcotStatus('idle');
      setErcotError('');
      
      const result = await apiService.verifyErcotKey(ercotKey);
      setTestingErcot(false);
      
      if (result.success) {
          setErcotStatus('success');
          notificationService.success("ERCOT API Verified", "Connection established via Proxy.");
      } else {
          setErcotStatus('error');
          setErcotError(result.message || "Failed");
          notificationService.error("Connection Failed", result.message || "Invalid Key");
      }
  };

  const handleSave = () => {
    // Only save to localStorage if user modified it (and it's not hardcoded)
    if (gridKey !== API_CONFIG.GRID_STATUS_KEY) localStorage.setItem('GRID_STATUS_KEY', gridKey);
    if (ercotKey !== API_CONFIG.ERCOT_API_KEY) localStorage.setItem('ERCOT_API_KEY', ercotKey);
    if (aiKey !== API_CONFIG.GOOGLE_API_KEY) localStorage.setItem('GOOGLE_API_KEY', aiKey);
    if (cesiumKey !== API_CONFIG.CESIUM_ION_TOKEN) localStorage.setItem('CESIUM_ION_TOKEN', cesiumKey);
    
    // Hot Reload Services
    genAiService.updateKey();
    liveService.updateKey();
    agentOrchestrator.updateKey();
    
    // Dispatch Global Event to force Dashboard refresh
    window.dispatchEvent(new Event('gridguard-config-updated'));
    
    notificationService.success("System Configuration Updated", "API Keys have been refreshed. Services restarting...");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-[var(--border-muted)] flex justify-between items-center bg-[var(--bg-tertiary)]">
           <h3 className="font-bold text-[var(--text-primary)]">System Configuration</h3>
           <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
           {/* GRID STATUS KEY */}
           <div className="space-y-1">
              <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">GridStatus.io API Key</label>
                  {gridTestStatus === 'success' && <span className="text-[var(--status-normal)] text-[10px] font-bold">✓ {gridTestMessage}</span>}
                  {gridTestStatus === 'error' && <span className="text-[var(--status-critical)] text-[10px] font-bold">✕ {gridTestMessage}</span>}
              </div>
              <div className="flex gap-2">
                <input 
                    type="password"
                    value={gridKey}
                    onChange={(e) => { setGridKey(e.target.value.trim()); setGridTestStatus('idle'); }}
                    disabled={!!API_CONFIG.GRID_STATUS_KEY} // Disable editing if hardcoded
                    className={`w-full bg-[var(--bg-primary)] border rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--status-info)] outline-none font-mono ${gridTestStatus === 'error' ? 'border-[var(--status-critical)]' : gridTestStatus === 'success' ? 'border-[var(--status-normal)]' : 'border-[var(--border-default)]'} ${!!API_CONFIG.GRID_STATUS_KEY ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={API_CONFIG.GRID_STATUS_KEY ? "(Key Hardcoded in Config)" : "Enter Key..."}
                />
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleTestGrid} 
                    disabled={!gridKey || testingGrid}
                    className="min-w-[80px]"
                >
                    {testingGrid ? "..." : "TEST"}
                </Button>
              </div>
           </div>
           
           {/* ERCOT KEY */}
           <div className="space-y-1">
              <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                    ERCOT Key <span className="text-[var(--text-muted)] text-[10px] ml-1">(Optional)</span>
                  </label>
                  {ercotStatus === 'success' && <span className="text-[var(--status-normal)] text-[10px] font-bold">✓ VERIFIED</span>}
                  {ercotStatus === 'error' && <span className="text-[var(--status-critical)] text-[10px] font-bold">✕ FAILED</span>}
              </div>
              
              <div className="flex gap-2">
                <input 
                    type="password"
                    value={ercotKey}
                    onChange={(e) => { setErcotKey(e.target.value.trim()); setErcotStatus('idle'); setErcotError(''); }}
                    disabled={!!API_CONFIG.ERCOT_API_KEY}
                    className={`w-full bg-[var(--bg-primary)] border rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--status-info)] outline-none font-mono ${ercotStatus === 'error' ? 'border-[var(--status-critical)]' : ercotStatus === 'success' ? 'border-[var(--status-normal)]' : 'border-[var(--border-default)]'} ${!!API_CONFIG.ERCOT_API_KEY ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={API_CONFIG.ERCOT_API_KEY ? "(Key Hardcoded in Config)" : "Ocp-Apim-Subscription-Key..."}
                />
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleTestErcot} 
                    disabled={!ercotKey || testingErcot}
                    className="min-w-[80px]"
                >
                    {testingErcot ? "..." : "TEST"}
                </Button>
              </div>
              {ercotError && (
                  <div className="mt-2 p-3 bg-[var(--status-critical-muted)] border border-[var(--status-critical)] rounded text-[10px] text-[var(--text-primary)] leading-relaxed animate-in slide-in-from-top-1">
                      <span className="font-bold text-[var(--status-critical)] block mb-1">ERR</span> 
                      {ercotError.includes("Network Blocked") ? (
                          <>
                            Browser security (CORS) blocked the request.
                          </>
                      ) : ercotError}
                  </div>
              )}
           </div>

           {/* GEMINI KEY */}
           <div className="space-y-1">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Google Gemini API Key</label>
              <input 
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value.trim())}
                disabled={!!API_CONFIG.GOOGLE_API_KEY}
                className={`w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--status-info)] outline-none font-mono ${!!API_CONFIG.GOOGLE_API_KEY ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={API_CONFIG.GOOGLE_API_KEY ? "(Key Hardcoded in Config)" : "Enter Key..."}
              />
           </div>

           {/* CESIUM KEY */}
           <div className="space-y-1">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                Cesium Ion Token <span className="text-[var(--text-muted)] text-[10px] ml-1">(For 3D Recon)</span>
              </label>
              <input 
                type="password"
                value={cesiumKey}
                onChange={(e) => setCesiumKey(e.target.value.trim())}
                disabled={!!API_CONFIG.CESIUM_ION_TOKEN}
                className={`w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--status-info)] outline-none font-mono ${!!API_CONFIG.CESIUM_ION_TOKEN ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={API_CONFIG.CESIUM_ION_TOKEN ? "(Key Hardcoded in Config)" : "Enter Ion Token..."}
              />
           </div>
           
           <div className="p-3 bg-[var(--bg-primary)] rounded border border-[var(--border-muted)]">
              <div className="text-xs text-[var(--text-muted)] mb-2">System Version: Stable</div>
              <div className="flex gap-2">
                 <span className="text-[10px] bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border-muted)]">Build: PROD</span>
                 <span className="text-[10px] bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border-muted)]">Region: US-EAST</span>
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-[var(--border-muted)] flex justify-end gap-2 bg-[var(--bg-tertiary)]">
           <Button variant="secondary" onClick={onClose}>Cancel</Button>
           <Button variant="primary" onClick={handleSave}>Save & Restart</Button>
        </div>
      </div>
    </div>
  );
};
