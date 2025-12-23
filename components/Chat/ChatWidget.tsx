
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../Common/Button';
import { genAiService } from '../../services/genAiService';
import { liveService } from '../../services/liveService';
import { auditService } from '../../services/auditService';
import { notificationService } from '../../services/notificationService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageUrl?: string;
  approvalRequest?: {
    toolName: string;
    args: any;
    status: 'pending' | 'approved' | 'rejected';
  };
  groundingChunks?: any[]; // For Map/Search citations
  isGuardrail?: boolean; // New Flag for Safety Violations
  confidence?: number; // New: 0-100
  reasoning?: string;  // New: Chain of Thought
  feedback?: 'positive' | 'negative' | 'flagged'; // RLHF State
}

// 1x1 Pixel Red Dot (Placeholder) -> Replaced with a tiny thermal-like pattern for demo
const DEMO_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALklEQVRYR+3QQREAAAzCsOFf2Wvw2ADXQTOzdu58BwQIECBAgAABAgQIECBAgMABH3gC26w2uH4AAAAASUVORK5CYII=";
const STORAGE_KEY = 'GRIDGUARD_CHAT_HISTORY_V1';

// SUGGESTION CHIPS (HCI: Recognition over Recall)
const QUICK_ACTIONS = [
  { label: "Status Report", prompt: "What is the current grid status?" },
  { label: "Check Load", prompt: "Current load vs forecast?" },
  { label: "Simulate Crisis", prompt: "Simulate a 10% sudden drop in wind generation." },
  { label: "Analyze Map", prompt: "Check the map for thermal anomalies." }
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isAiConnected, setIsAiConnected] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);

  // Size State (Resizable)
  const [size, setSize] = useState({ width: 380, height: 550 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          // Default Welcome
          setMessages([{
            id: '1',
            role: 'system',
            content: 'GRIDGUARD AI ASSISTANT ONLINE. INITIALIZED.',
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (e) {
        setMessages([{ id: '1', role: 'system', content: 'GRIDGUARD AI ASSISTANT ONLINE.', timestamp: new Date().toLocaleTimeString() }]);
      }
    } else {
      setMessages([{ id: '1', role: 'system', content: 'GRIDGUARD AI ASSISTANT ONLINE.', timestamp: new Date().toLocaleTimeString() }]);
    }
  }, []);

  // Persist History on Change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); // Keep last 50 messages
    }
  }, [messages]);

  useEffect(() => {
    const initAI = async () => {
      if (genAiService.isAvailable) {
        await genAiService.initSession();
        setIsAiConnected(true);
        // Only add connection message if it's a fresh session or empty
        if (messages.length <= 1) {
          setMessages(prev => [...prev, {
            id: 'ai-ready',
            role: 'system',
            content: 'UPLINK ESTABLISHED: Gemini 3 Pro connected via Secure Gateway.',
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: 'ai-offline',
          role: 'system',
          content: 'SYSTEM OFFLINE: API Connection Required. Please configure keys in Login.',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };
    initAI();

    liveService.setStatusCallback((active) => {
      setIsVoiceActive(active);
      if (active) {
        setMessages(prev => [...prev, {
          id: `voice-${Date.now()}`,
          role: 'system',
          content: 'VOICE CHANNEL OPEN: Listening...',
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `voice-end-${Date.now()}`,
          role: 'system',
          content: 'VOICE CHANNEL CLOSED.',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    });

    liveService.setTranscriptionCallback((text, isUser) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === (isUser ? 'user' : 'assistant') && Date.now() - parseInt(lastMsg.id.split('-')[1] || '0') < 2000) {
          return [...prev, {
            id: `trans-${Date.now()}`,
            role: isUser ? 'user' : 'assistant',
            content: text,
            timestamp: new Date().toLocaleTimeString()
          }];
        }
        return [...prev, {
          id: `trans-${Date.now()}`,
          role: isUser ? 'user' : 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString()
        }];
      });
    });

    return () => {
      liveService.stop();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized && isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Global Mouse Events for Dragging and Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
          x: initialPosRef.current.x + dx,
          y: initialPosRef.current.y + dy
        });
      }
      if (isResizing) {
        // Since anchor is Bottom-Right (CSS: bottom-6 right-6)
        // Moving mouse LEFT (negative delta) means INCREASING width
        // Moving mouse UP (negative delta) means INCREASING height
        const dx = resizeStartRef.current.x - e.clientX;
        const dy = resizeStartRef.current.y - e.clientY;

        setSize({
          width: Math.max(300, Math.min(800, resizeStartRef.current.w + dx)),
          height: Math.max(400, Math.min(window.innerHeight - 40, resizeStartRef.current.h + dy))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    // Don't drag if we clicked the resize handle
    if ((e.target as HTMLElement).closest('.resize-handle')) return;

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadDemoImage = () => {
    setSelectedImage(DEMO_IMAGE_BASE64);
    setInputValue("Analyze this thermal imagery for anomalies.");
  };

  const toggleVoice = async () => {
    if (isVoiceActive) {
      liveService.stop();
    } else {
      try {
        await liveService.start();
      } catch (e) {
        console.error("Failed to start voice", e);
      }
    }
  };

  // --- RLHF FEEDBACK LOGIC ---
  const handleFeedback = (msgId: string, type: 'positive' | 'negative' | 'flagged') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));

    // Log to Immutable Audit Ledger
    auditService.log({
      operatorId: "USR-DEMO",
      eventType: "AI_RECOMMENDATION",
      resource: "LLM_RESPONSE",
      details: `User marked response ${msgId} as ${type.toUpperCase()}`
    });

    if (type === 'flagged') {
      notificationService.error("Incident Reported", "Response flagged for Safety/Bias review. Logged to NERC Compliance Audit.");
    } else {
      notificationService.info("Feedback Recorded", "Model fine-tuning parameters updated.");
    }
  };

  const handleChipClick = (prompt: string) => {
    setInputValue(prompt);
    // Optional: Auto-send or just fill
    // handleSend(); 
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && !selectedImage) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString(),
      imageUrl: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      if (isAiConnected) {
        if (userMsg.imageUrl) {
          const base64Data = userMsg.imageUrl.split(',')[1];
          const mimeType = userMsg.imageUrl.split(';')[0].split(':')[1];
          const responseText = await genAiService.sendMultimodalMessage(userMsg.content || "Analyze this image.", base64Data, mimeType);
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else {
          const lowerContent = userMsg.content.toLowerCase();

          if (lowerContent.match(/where|location|map|address|navigate|distance|nearby/)) {
            const result = await genAiService.askSpatialQuestion(userMsg.content);
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: result.text,
              timestamp: new Date().toLocaleTimeString(),
              groundingChunks: result.chunks
            }]);
          }
          else if (lowerContent.match(/search|news|latest|update on|google/)) {
            const result = await genAiService.askWithSearch(userMsg.content);
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: result.text,
              timestamp: new Date().toLocaleTimeString(),
              groundingChunks: result.chunks
            }]);
          }
          else if (lowerContent.includes('status') || lowerContent.includes('metrics')) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setMessages(prev => [...prev, {
              id: `hitl-${Date.now()}`,
              role: 'assistant',
              content: "I can retrieve the system metrics for you. Please confirm access to the real-time data grid.",
              timestamp: new Date().toLocaleTimeString(),
              approvalRequest: {
                toolName: "get_system_metrics",
                args: { zone: "ALL" },
                status: 'pending'
              }
            }]);
          } else {
            const finalPrompt = showReasoning
              ? `${userMsg.content} (Explicitly separate your Chain of Thought REASONING from your FINAL RESPONSE)`
              : userMsg.content;
            const responseText = await genAiService.sendMessage(finalPrompt);

            // Check for Guardrail Intervention Signal
            const isGuardrail = responseText.startsWith("GUARDRAIL_INTERVENTION:");
            let cleanText = isGuardrail ? responseText.replace("GUARDRAIL_INTERVENTION:", "").trim() : responseText;

            // PARSE CONFIDENCE SCORE
            let confidence = 0;
            const confMatch = cleanText.match(/CONFIDENCE_SCORE:\s*(\d+)%?/i);
            if (confMatch) {
              confidence = parseInt(confMatch[1]);
              cleanText = cleanText.replace(confMatch[0], "").trim();
            }

            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: cleanText,
              timestamp: new Date().toLocaleTimeString(),
              isGuardrail: isGuardrail,
              confidence: confidence > 0 ? confidence : undefined
            }]);
          }
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: "ERROR: AI System Offline. Configure API Key in Login.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'ERROR: Processing Failed.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApproval = async (msgId: string, approved: boolean, toolName: string, args: any) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId && m.approvalRequest
        ? { ...m, approvalRequest: { ...m.approvalRequest, status: approved ? 'approved' : 'rejected' } }
        : m
    ));

    auditService.log({
      operatorId: "USR-DEMO",
      eventType: approved ? "OPERATOR_APPROVAL" : "OPERATOR_OVERRIDE",
      resource: toolName,
      details: JSON.stringify(args)
    });

    if (approved) {
      setIsTyping(true);
      try {
        const result = await genAiService.executeTool(toolName, args);
        setMessages(prev => [...prev, {
          id: `res-${Date.now()}`,
          role: 'assistant',
          content: result,
          timestamp: new Date().toLocaleTimeString()
        }]);
        auditService.log({
          operatorId: "SYS-AI",
          eventType: "AI_ACTUATION",
          resource: toolName,
          details: "Success"
        });
      } catch (e) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: 'EXECUTION ERROR: Tool call failed.',
          timestamp: new Date().toLocaleTimeString()
        }]);
      } finally {
        setIsTyping(false);
      }
    } else {
      setMessages(prev => [...prev, {
        id: `rej-${Date.now()}`,
        role: 'system',
        content: 'ACTION ABORTED BY OPERATOR.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); setPosition({ x: 0, y: 0 }); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--status-info)] hover:bg-[var(--status-info-emphasis)] text-[var(--text-inverse)] rounded-full shadow-[0_0_15px_var(--status-info-muted)] flex items-center justify-center transition-colors duration-200 z-50 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]"
        aria-label="Open AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
    );
  }

  // MINIMIZED STATE (HUD)
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 w-[250px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-t-lg shadow-2xl z-50 animate-in slide-in-from-bottom-2"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div
          onMouseDown={handleDragStart}
          className={`h-10 bg-[var(--bg-tertiary)] border-b border-[var(--border-muted)] flex items-center justify-between px-3 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className={`w-2 h-2 rounded-full ${isAiConnected ? 'bg-[var(--status-normal)]' : 'bg-[var(--status-warning)]'}`}></div>
            <span className="font-semibold text-xs text-[var(--text-primary)]">AI ACTIVE</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1" title="Expand">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
            <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{
        width: size.width,
        height: size.height,
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      role="dialog"
      aria-label="AI Assistant Chat"
    >
      <div
        onMouseDown={handleDragStart}
        className={`h-12 bg-[var(--bg-tertiary)] border-b border-[var(--border-muted)] flex items-center justify-between px-4 select-none relative ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`}
      >
        {/* RESIZE HANDLE (Top-Left Corner) */}
        <div
          className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize resize-handle flex items-start justify-start p-1 hover:text-[var(--status-info)] text-[var(--border-default)] transition-colors z-50"
          onMouseDown={handleResizeStart}
          title="Resize"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6 L6 18 L18 6 Z" /></svg>
        </div>

        <div className="flex items-center gap-2 pointer-events-none pl-2">
          <div className={`w-2 h-2 rounded-full ${isAiConnected ? 'bg-[var(--status-normal)] animate-pulse' : 'bg-[var(--status-warning)]'}`}></div>
          <span className="font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wide">
            Command Interface
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors mr-2 ${showReasoning ? 'bg-[var(--status-info-muted)] border-[var(--status-info)] text-[var(--status-info)]' : 'border-[var(--border-default)] text-[var(--text-secondary)]'}`}
            title="Toggle Explanation Mode"
          >
            EXPLAIN
          </button>
          <button onClick={() => setIsMinimized(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-primary)]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded px-3 py-2 text-sm group relative ${msg.role === 'user'
              ? 'bg-[var(--status-info)] text-[var(--text-inverse)]'
              : msg.role === 'system'
                ? 'bg-transparent text-[var(--text-muted)] font-mono text-xs border border-[var(--border-default)] w-full text-center'
                : msg.isGuardrail // Custom Style for Safety Blocks
                  ? 'bg-[var(--status-critical-muted)] border border-[var(--status-critical)] text-[var(--status-critical)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)]'
              }`}>

              {/* GUARDRAIL ALERT HEADER */}
              {msg.isGuardrail && (
                <div className="flex items-center gap-2 mb-2 border-b border-[var(--status-critical)] pb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  <span className="text-xs font-bold uppercase tracking-wider">Safety Protocol Engaged</span>
                </div>
              )}

              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded mb-2 border border-white/20" />
              )}
              {msg.content}

              {/* GOOGLE GROUNDING SOURCES */}
              {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-muted)] space-y-1">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    Verified Sources
                  </div>
                  {msg.groundingChunks.map((chunk, idx) => {
                    if (chunk.web?.uri) {
                      return (
                        <a key={`web-${idx}`} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-[var(--text-link)] hover:underline truncate">
                          {chunk.web.title || chunk.web.uri}
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* CONFIDENCE & TRANSPARENCY BLOCK (PILLAR A) */}
              {!msg.isGuardrail && msg.role === 'assistant' && msg.confidence !== undefined && (
                <div className="mt-2 pt-2 border-t border-[var(--border-muted)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5" title="Model Confidence Score">
                    <div className={`w-2 h-2 rounded-full ${msg.confidence > 80 ? 'bg-[var(--status-normal)]' : msg.confidence > 50 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-critical)]'}`}></div>
                    <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)]">{msg.confidence}% CONFIDENCE</span>
                  </div>
                  {msg.content.includes('[REDACTED') && (
                    <span className="text-[10px] font-mono text-[var(--status-info)] flex items-center gap-1" title="Pillar D: Fairness">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                      SANITIZED
                    </span>
                  )}
                </div>
              )}

              {/* FEEDBACK LOOP (RLHF) - Visible on hover or if already clicked */}
              {!msg.isGuardrail && msg.role === 'assistant' && !msg.approvalRequest && (
                <div className={`absolute -bottom-6 right-0 flex gap-1 transition-opacity duration-200 ${msg.feedback ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button
                    onClick={() => handleFeedback(msg.id, 'positive')}
                    className={`p-1 rounded hover:bg-[var(--bg-tertiary)] ${msg.feedback === 'positive' ? 'text-[var(--status-normal)]' : 'text-[var(--text-muted)]'}`}
                    title="Helpful (Reinforce)"
                    disabled={!!msg.feedback}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'negative')}
                    className={`p-1 rounded hover:bg-[var(--bg-tertiary)] ${msg.feedback === 'negative' ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)]'}`}
                    title="Unhelpful (Correction Needed)"
                    disabled={!!msg.feedback}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'flagged')}
                    className={`p-1 rounded hover:bg-[var(--bg-tertiary)] ${msg.feedback === 'flagged' ? 'text-[var(--status-critical)]' : 'text-[var(--text-muted)]'}`}
                    title="Flag Incident (Safety/Bias/Hallucination)"
                    disabled={!!msg.feedback}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                  </button>
                </div>
              )}

              {/* HITL APPROVAL CARD */}
              {msg.approvalRequest && (
                <div className="mt-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[var(--text-secondary)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                    PROPOSED ACTION
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mb-1">
                    EXECUTE: {msg.approvalRequest.toolName}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mb-3">
                    ARGS: {JSON.stringify(msg.approvalRequest.args)}
                  </div>

                  {msg.approvalRequest.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproval(msg.id, true, msg.approvalRequest!.toolName, msg.approvalRequest!.args)}
                        className="flex-1 bg-[var(--status-normal)] hover:bg-[var(--status-normal-emphasis)] text-white text-xs py-1 rounded transition-colors"
                      >
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleApproval(msg.id, false, msg.approvalRequest!.toolName, msg.approvalRequest!.args)}
                        className="flex-1 bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs py-1 rounded transition-colors border border-[var(--border-default)]"
                      >
                        REJECT
                      </button>
                    </div>
                  ) : (
                    <div className={`text-xs font-bold text-center py-1 border rounded ${msg.approvalRequest.status === 'approved'
                      ? 'border-[var(--status-normal)] text-[var(--status-normal)]'
                      : 'border-[var(--status-critical)] text-[var(--status-critical)]'
                      }`}>
                      {msg.approvalRequest.status === 'approved' ? 'ACTION AUTHORIZED' : 'ACTION REJECTED'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 ml-2 py-2">
            <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK ACTION CHIPS (AMBIGUITY HANDLING) */}
      <div className="px-3 pb-2 pt-2 bg-[var(--bg-secondary)] border-t border-[var(--border-default)] flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => handleChipClick(action.prompt)}
            className="px-3 py-1 rounded-full border border-[var(--border-muted)] bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--status-info)] transition-colors flex items-center gap-1"
          >
            {action.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-[var(--bg-secondary)]">
        {selectedImage && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--bg-tertiary)] rounded border border-[var(--border-muted)]">
            <img src={selectedImage} alt="Preview" className="h-10 w-10 object-cover rounded" />
            <span className="text-xs text-[var(--text-muted)] flex-1 truncate">Image Attached</span>
            <button type="button" onClick={() => setSelectedImage(null)} className="text-[var(--text-secondary)] hover:text-[var(--status-critical)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Voice Button */}
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-2 rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)] ${isVoiceActive
              ? 'bg-[var(--status-critical)] text-white animate-pulse'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Command"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]"
            title="Upload Image for Analysis"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>

          {/* DEMO: Test Asset Button (New) */}
          <button
            type="button"
            onClick={loadDemoImage}
            className="text-[var(--status-warning)] hover:text-[var(--status-warning-emphasis)] p-2 rounded hover:bg-[var(--bg-hover)] transition-colors text-[10px] font-mono border border-transparent hover:border-[var(--status-warning-muted)]"
            title="Load Simulated Incident Image"
          >
            SIM
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isVoiceActive ? "Channel Open..." : "Input directive or query..."}
            disabled={isVoiceActive}
            className={`flex-1 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm rounded px-3 py-2 focus:outline-none focus:border-[var(--border-emphasis)] focus:ring-1 focus:ring-[var(--border-emphasis)] font-mono ${isVoiceActive ? 'opacity-50 cursor-not-allowed' : ''}`}
          />

          <button
            type="submit"
            disabled={(!inputValue.trim() && !selectedImage) || isTyping || isVoiceActive}
            className="text-[var(--text-link)] hover:text-[var(--text-primary)] disabled:opacity-50 p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </form>
    </div>
  );
};
