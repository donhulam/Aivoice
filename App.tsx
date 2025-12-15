
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import InputSection from './components/InputSection';
import ProcessingSection from './components/ProcessingSection';
import Sidebar from './components/Sidebar';
import HelpModal from './components/HelpModal';
import ApiKeyModal from './components/ApiKeyModal';
import { splitTextIntoSegments } from './utils/audioUtils';
import { HistoryItem, Segment, VoiceConfig, PREBUILT_VOICES } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'processing'>('home');
  const [inputText, setInputText] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voiceName: PREBUILT_VOICES[0].name,
    styleInstruction: '',
    temperature: 1.0,
    language: 'vi',
  });
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Auth / API Key State (Changed from single string to string[])
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [isSystemKey, setIsSystemKey] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(true);
  const [systemUsageCount, setSystemUsageCount] = useState<number>(0);
  const [systemUsageStartTime, setSystemUsageStartTime] = useState<number>(0);
  
  const MAX_FREE_USAGE = 10;
  const USAGE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const SYSTEM_KEY_ENV = process.env.API_KEY || ''; 

  // Check and Reset Quota Logic
  const checkAndResetSystemUsage = (currentCount: number, startTime: number) => {
    const now = Date.now();
    // If start time is 0 (first use ever) or time passed > 2 hours
    if (startTime === 0 || (now - startTime > USAGE_WINDOW_MS)) {
      // Reset quota
      setSystemUsageCount(0);
      setSystemUsageStartTime(0); // Will be set to 'now' on next actual usage
      localStorage.setItem('voice_studio_usage_count', '0');
      localStorage.setItem('voice_studio_usage_start_time', '0');
      return { count: 0, startTime: 0 };
    }
    return { count: currentCount, startTime };
  };

  // Load initial state from LocalStorage
  useEffect(() => {
    const storedUserKeysJson = localStorage.getItem('voice_studio_user_keys');
    const storedUserKeyLegacy = localStorage.getItem('voice_studio_user_key'); // Backup for migration
    
    const storedUsageCount = parseInt(localStorage.getItem('voice_studio_usage_count') || '0', 10);
    const storedStartTime = parseInt(localStorage.getItem('voice_studio_usage_start_time') || '0', 10);

    // Run check immediately on load
    const { count, startTime } = checkAndResetSystemUsage(storedUsageCount, storedStartTime);
    
    setSystemUsageCount(count);
    setSystemUsageStartTime(startTime);

    if (storedUserKeysJson) {
      try {
        const parsedKeys = JSON.parse(storedUserKeysJson);
        if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
          setApiKeys(parsedKeys);
          setIsSystemKey(false);
          setShowApiKeyModal(false);
        } else {
          setShowApiKeyModal(true);
        }
      } catch (e) {
        setShowApiKeyModal(true);
      }
    } else if (storedUserKeyLegacy) {
      // Migration: Convert single key to array
      const newKeys = [storedUserKeyLegacy];
      localStorage.setItem('voice_studio_user_keys', JSON.stringify(newKeys));
      localStorage.removeItem('voice_studio_user_key'); // Clean up old key
      
      setApiKeys(newKeys);
      setIsSystemKey(false);
      setShowApiKeyModal(false);
    } else {
      // No user key found, show modal to choose
      setShowApiKeyModal(true);
    }
  }, []);

  // Handler: User enters their own keys
  const handleSetUserKeys = (keys: string[]) => {
    localStorage.setItem('voice_studio_user_keys', JSON.stringify(keys));
    setApiKeys(keys);
    setIsSystemKey(false);
    setShowApiKeyModal(false);
  };

  // Handler: User chooses system key
  const handleUseSystemKey = () => {
    // Re-check quota before allowing
    const { count } = checkAndResetSystemUsage(systemUsageCount, systemUsageStartTime);

    if (count >= MAX_FREE_USAGE) {
      // Logic handled in Modal (button disabled), but double check here
      alert("Bạn đã hết lượt dùng thử trong khung giờ này. Vui lòng quay lại sau hoặc nhập Key cá nhân.");
      return;
    }

    setApiKeys([SYSTEM_KEY_ENV]);
    setIsSystemKey(true);
    setShowApiKeyModal(false);
  };

  // Handler: Increment usage (called by ProcessingSection)
  const handleIncrementUsage = () => {
    if (isSystemKey) {
      const now = Date.now();
      let newStartTime = systemUsageStartTime;
      
      // If this is the first usage of the window (or reset happened), set start time
      if (newStartTime === 0 || (now - newStartTime > USAGE_WINDOW_MS)) {
        newStartTime = now;
        setSystemUsageStartTime(now);
        localStorage.setItem('voice_studio_usage_start_time', now.toString());
      }

      const newCount = systemUsageCount + 1;
      setSystemUsageCount(newCount);
      localStorage.setItem('voice_studio_usage_count', newCount.toString());
    }
  };

  // Handler: Quota exceeded during runtime
  const handleQuotaExceeded = () => {
    // Force a re-check in case time passed
    checkAndResetSystemUsage(systemUsageCount, systemUsageStartTime);
    setShowApiKeyModal(true);
  };

  // Handler: Reset/Change Key
  const handleChangeKey = () => {
    // Force a re-check to ensure modal shows accurate remaining time
    checkAndResetSystemUsage(systemUsageCount, systemUsageStartTime);
    setShowApiKeyModal(true);
  };

  // Automatically update history when segments change (e.g., audio generated, text edited)
  useEffect(() => {
    if (currentHistoryId && segments.length > 0) {
      setHistory(prevHistory => 
        prevHistory.map(item => 
          item.id === currentHistoryId 
            ? { 
                ...item, 
                segments: segments, 
                fullText: segments.map(s => s.text).join(' ') 
              } 
            : item
        )
      );
    }
  }, [segments, currentHistoryId]);

  const handleConvert = () => {
    if (!inputText.trim()) return;

    // Check if we are updating an existing session
    if (currentHistoryId) {
      const existingItem = history.find(item => item.id === currentHistoryId);
      
      // Optimization: If text hasn't changed, don't reset segments to preserve audio
      if (existingItem && existingItem.fullText === inputText) {
         setView('processing');
         return;
      }

      // If text changed, we need to re-segment
      const rawSegments = splitTextIntoSegments(inputText);
      const newSegments: Segment[] = rawSegments.map((text, idx) => ({
        id: `seg-${Date.now()}-${idx}`,
        text,
        status: 'idle',
        isSelected: false, // Default unselected
      }));

      setSegments(newSegments);

      // Update existing history item
      setHistory(prev => prev.map(item => {
        if (item.id === currentHistoryId) {
           return {
             ...item,
             timestamp: new Date(),
             previewText: inputText.substring(0, 60) + (inputText.length > 60 ? '...' : ''),
             fullText: inputText,
             segments: newSegments
           };
        }
        return item;
      }));

      setView('processing');

    } else {
      // New Session Logic
      const rawSegments = splitTextIntoSegments(inputText);
      const newSegments: Segment[] = rawSegments.map((text, idx) => ({
        id: `seg-${Date.now()}-${idx}`,
        text,
        status: 'idle',
        isSelected: false, // Default unselected
      }));

      setSegments(newSegments);
      
      const newId = Date.now().toString();
      const newItem: HistoryItem = {
        id: newId,
        title: `Dự án ${history.length + 1}`,
        timestamp: new Date(),
        previewText: inputText.substring(0, 60) + (inputText.length > 60 ? '...' : ''),
        fullText: inputText,
        segments: newSegments,
      };
      
      setHistory(prev => [newItem, ...prev]);
      setCurrentHistoryId(newId);
      
      setView('processing');
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputText(item.fullText);
    
    if (item.segments && item.segments.length > 0) {
      // Restore segments (including audio data) from history
      setSegments(item.segments);
    } else {
      // Fallback for backward compatibility or if segments missing
      const rawSegments = splitTextIntoSegments(item.fullText);
      const newSegments: Segment[] = rawSegments.map((text, idx) => ({
        id: `seg-${Date.now()}-${idx}`,
        text,
        status: 'idle',
        isSelected: false, // Default unselected
      }));
      setSegments(newSegments);
    }
    
    setCurrentHistoryId(item.id);
    setView('processing');
    setIsSidebarOpen(false);
  };

  const handleHome = () => {
    setInputText('');
    setSegments([]);
    setCurrentHistoryId(null);
    setView('home');
  };

  const handleBackToEditor = () => {
    // Sync input text with current segments to preserve edits made in processing view
    if (segments.length > 0) {
      setInputText(segments.map(s => s.text).join(' ')); 
    }
    setView('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleHome}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Voice Studio</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-600 items-center">
              <button onClick={handleHome} className="hover:text-indigo-600 transition-colors">Trang chủ</button>
              <button onClick={() => setIsHelpOpen(true)} className="hover:text-indigo-600 transition-colors">Trợ giúp</button>
              
              <div className="h-4 w-px bg-slate-200 mx-1"></div>
              
              <button 
                onClick={handleChangeKey}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  apiKeys.length === 0 
                    ? 'bg-red-50 text-red-600 border border-red-100' 
                    : isSystemKey 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}
              >
                {apiKeys.length === 0 ? (
                  <span>Chưa có Key</span>
                ) : isSystemKey ? (
                  <span>Dùng thử: {MAX_FREE_USAGE - systemUsageCount} lượt</span>
                ) : (
                  <span>Key Cá nhân ({apiKeys.length})</span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </nav>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path></svg>
              {history.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 relative z-10">
        {view === 'home' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-4 max-w-2xl px-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Chuyển văn bản thành <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Giọng nói sống động</span>
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed">
                Tạo giọng đọc chuyên nghiệp cho video, podcast và thuyết trình.
              </p>
            </div>
            <InputSection 
              text={inputText} 
              setText={setInputText} 
              onConvert={handleConvert} 
            />
          </div>
        ) : (
          <ProcessingSection 
            segments={segments}
            setSegments={setSegments}
            voiceConfig={voiceConfig}
            setVoiceConfig={setVoiceConfig}
            onBack={handleBackToEditor}
            apiKeys={apiKeys}
            isSystemKey={isSystemKey}
            usageCount={systemUsageCount}
            maxUsage={MAX_FREE_USAGE}
            onUsageIncrement={handleIncrementUsage}
            onQuotaExceeded={handleQuotaExceeded}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white">
        <p>&copy; {new Date().getFullYear()} Voice Studio. Phát triển: Đỗ Lâm</p>
      </footer>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        history={history} 
        onClose={() => setIsSidebarOpen(false)} 
        onSelect={loadHistoryItem}
      />

      {/* Modals */}
      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />

      <ApiKeyModal 
        isOpen={showApiKeyModal}
        onSetUserKeys={handleSetUserKeys}
        onUseSystemKey={handleUseSystemKey}
        systemUsageCount={systemUsageCount}
        systemUsageStartTime={systemUsageStartTime}
        maxSystemUsage={MAX_FREE_USAGE}
        usageWindowMs={USAGE_WINDOW_MS}
        canClose={apiKeys.length > 0} 
        existingKeys={!isSystemKey ? apiKeys : []}
        onClose={() => setShowApiKeyModal(false)}
      />
    </div>
  );
};

export default App;
