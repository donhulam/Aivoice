
import React, { useState } from 'react';
import { Segment, VoiceConfig, PREBUILT_VOICES, SUPPORTED_LANGUAGES } from '../types';
import { generateSegmentAudio } from '../services/geminiService';
import { base64ToUint8Array, pcmToWavBlob, concatenatePcmData } from '../utils/audioUtils';
import CustomAudioPlayer from './CustomAudioPlayer';

interface ProcessingSectionProps {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  voiceConfig: VoiceConfig;
  setVoiceConfig: React.Dispatch<React.SetStateAction<VoiceConfig>>;
  onBack: () => void;
  // Auth & Quota Props
  apiKeys: string[];
  isSystemKey: boolean;
  usageCount: number;
  maxUsage: number;
  onUsageIncrement: () => void;
  onQuotaExceeded: () => void;
}

const ProcessingSection: React.FC<ProcessingSectionProps> = ({
  segments,
  setSegments,
  voiceConfig,
  setVoiceConfig,
  onBack,
  apiKeys,
  isSystemKey,
  usageCount,
  maxUsage,
  onUsageIncrement,
  onQuotaExceeded,
}) => {
  // Replace boolean isBatchProcessing with a mode to distinguish actions
  const [processingMode, setProcessingMode] = useState<'idle' | 'batch_selected' | 'batch_all'>('idle');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Check if any segment is currently loading or batch processing is active
  const isAnyLoading = segments.some(s => s.status === 'loading') || processingMode !== 'idle' || isPreviewLoading;

  // Helper to check quota before generation
  const checkQuota = (requiredCount: number = 1): boolean => {
    if (isSystemKey && usageCount + requiredCount > maxUsage) {
      onQuotaExceeded();
      return false;
    }
    return true;
  };

  const handleGenerateSegment = async (id: string) => {
    // Prevent generation if something else is loading
    if (isAnyLoading) return;

    if (!checkQuota()) return;

    const segment = segments.find(s => s.id === id);
    if (!segment) return;

    setSegments(prev => prev.map(s => s.id === id ? { ...s, status: 'loading', errorMessage: undefined } : s));

    try {
      // Pick a key (if multiple exist, just use first one or random one for single generation)
      const currentKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
      
      const { audioData: base64Audio, translatedText } = await generateSegmentAudio(segment.text, voiceConfig, currentKey);
      
      // Successful generation: Increment usage if system key
      onUsageIncrement();

      const rawPcm = base64ToUint8Array(base64Audio);
      const wavBlob = pcmToWavBlob(rawPcm);
      const audioUrl = URL.createObjectURL(wavBlob);

      setSegments(prev => prev.map(s => s.id === id ? { 
        ...s, 
        text: translatedText, // Update with translated text
        status: 'completed', 
        audioUrl, 
        rawPcmData: rawPcm 
      } : s));
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
      setSegments(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorMessage: msg } : s));
    }
  };

  const toggleSelection = (id: string) => {
    // Only allow selection if completed
    const segment = segments.find(s => s.id === id);
    if (!segment || segment.status !== 'completed' || !segment.audioUrl) return;

    setSegments(prev => prev.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s));
  };

  const toggleSelectAll = () => {
    // Only verify "all selected" against the ones that ARE capable of being selected (completed ones)
    const completedSegments = segments.filter(s => s.status === 'completed' && s.audioUrl);
    
    if (completedSegments.length === 0) return;

    const allCompletedSelected = completedSegments.every(s => s.isSelected);

    setSegments(prev => prev.map(s => {
      // Only modify selection for completed segments
      if (s.status === 'completed' && s.audioUrl) {
        return { ...s, isSelected: !allCompletedSelected };
      }
      // Non-completed segments always remain unselected
      return { ...s, isSelected: false };
    }));
  };

  const handlePreviewVoice = async () => {
    if (isAnyLoading) return;
    if (!checkQuota()) return;
    
    setIsPreviewLoading(true);
    const previewText = "Về nhà uống thử rượu gạo nấu kỹ để cảm nhận đủ vị";
    
    try {
      const currentKey = apiKeys[0];
      const { audioData: base64Audio } = await generateSegmentAudio(previewText, voiceConfig, currentKey);
      // Successful preview: Increment usage
      onUsageIncrement();

      const rawPcm = base64ToUint8Array(base64Audio);
      const wavBlob = pcmToWavBlob(rawPcm);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Preview failed", error);
      alert("Không thể phát thử giọng nói. Vui lòng kiểm tra API Key.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const downloadPackage = async () => {
    const selectedSegments = segments.filter(s => s.isSelected);
    if (selectedSegments.length === 0) return;

    setProcessingMode('batch_selected');

    try {
      // Merge Logic (Only merges what is selected, and thanks to UI constraints, only completed items are selected)
      const buffers: Uint8Array[] = [];
      
      for (const seg of selectedSegments) {
        if (seg.rawPcmData) {
          buffers.push(seg.rawPcmData);
        }
      }

      if (buffers.length > 0) {
        const combinedPcm = concatenatePcmData(buffers);
        const wavBlob = pcmToWavBlob(combinedPcm);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-studio-merged-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error("Batch processing error:", error);
    } finally {
      setProcessingMode('idle');
    }
  };

  const downloadAllSegments = async () => {
    if (isAnyLoading) return;

    // 1. Identify segments that need generation
    const segmentsToGenerate = segments.filter(s => s.status !== 'completed' || !s.audioUrl);

    // 2. Check Quota (rough check)
    if (isSystemKey) {
        if (!checkQuota(segmentsToGenerate.length)) return;
    }

    setProcessingMode('batch_all');

    // Create a local map of current segments to update state later accurately
    let completedSegmentsMap = new Map<string, Segment>();
    segments.forEach(s => completedSegmentsMap.set(s.id, s));

    // Update UI: Mark all pending as loading
    setSegments(prev => prev.map(s => {
        if (segmentsToGenerate.find(stg => stg.id === s.id)) {
            return { ...s, status: 'loading', errorMessage: undefined };
        }
        return s;
    }));

    try {
        // PARALLEL PROCESSING LOGIC
        // We will process the segmentsToGenerate queue.
        // The concurrency limit is the number of API Keys available.
        // Each "worker" will be assigned a specific key index.
        
        const queue = [...segmentsToGenerate];
        const numWorkers = apiKeys.length;
        
        const worker = async (workerId: number) => {
            const assignedKey = apiKeys[workerId];
            
            while (queue.length > 0) {
                // Pop a segment from the queue
                const segment = queue.shift();
                if (!segment) break;

                try {
                    // Call API
                    const { audioData, translatedText } = await generateSegmentAudio(segment.text, voiceConfig, assignedKey);
                    
                    // Increment Usage (Note: React state update inside a loop might bunch up, but functionality holds)
                    onUsageIncrement();

                    const rawPcm = base64ToUint8Array(audioData);
                    const wavBlob = pcmToWavBlob(rawPcm);
                    const audioUrl = URL.createObjectURL(wavBlob);
                    
                    const updatedSegment: Segment = {
                        ...segment,
                        text: translatedText,
                        status: 'completed',
                        audioUrl,
                        rawPcmData: rawPcm,
                        errorMessage: undefined
                    };

                    completedSegmentsMap.set(segment.id, updatedSegment);
                    
                    // Update UI incrementally so user sees progress
                    setSegments(prev => prev.map(s => s.id === segment.id ? updatedSegment : s));

                } catch (error: any) {
                    const msg = error instanceof Error ? error.message : "Error";
                     const errorSegment: Segment = {
                        ...segment,
                        status: 'error',
                        errorMessage: msg
                    };
                    completedSegmentsMap.set(segment.id, errorSegment);
                    setSegments(prev => prev.map(s => s.id === segment.id ? errorSegment : s));
                }
            }
        };

        // Launch workers
        const workers = [];
        for (let i = 0; i < numWorkers; i++) {
            workers.push(worker(i));
        }
        
        // Wait for all workers to finish
        await Promise.all(workers);

        // 3. Merge All Segments (Sort by original order)
        // We iterate through the ORIGINAL segments array to maintain order
        const buffers: Uint8Array[] = [];
        let hasData = false;
        
        // We need to look up the latest version of the segment from our map
        for (const originalSeg of segments) {
            const processedSeg = completedSegmentsMap.get(originalSeg.id);
            if (processedSeg && processedSeg.rawPcmData) {
                buffers.push(processedSeg.rawPcmData);
                hasData = true;
            }
        }

        if (hasData) {
            const combinedPcm = concatenatePcmData(buffers);
            const wavBlob = pcmToWavBlob(combinedPcm);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `voice-studio-full-package-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
             alert("Không thể tạo file gộp do tất cả các đoạn đều lỗi.");
        }

    } catch (error: any) {
        console.error("Download All Error:", error);
        alert("Đã xảy ra lỗi trong quá trình tự động tạo. Vui lòng thử lại.");
    } finally {
        setProcessingMode('idle');
    }
  };

  const completedSegmentsCount = segments.filter(s => s.status === 'completed' && s.audioUrl).length;
  const selectedCount = segments.filter(s => s.isSelected).length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-24 animate-fade-in">
      
      {/* Navigation Breadcrumb */}
      <button onClick={onBack} className="mb-6 flex items-center text-slate-500 hover:text-indigo-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Quay lại soạn thảo
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Segments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Xử lý & Tạo giọng nói</h2>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                {segments.length} Đoạn
              </span>
              {isSystemKey ? (
                 <span className={`px-3 py-1 rounded-full text-sm font-medium border ${usageCount >= maxUsage ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    Dùng thử: {maxUsage - usageCount} lượt
                 </span>
              ) : (
                 <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                    Tốc độ x{apiKeys.length}
                 </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {segments.map((segment) => {
              const isCompleted = segment.status === 'completed' && !!segment.audioUrl;
              const hasError = segment.status === 'error';
              
              return (
              <div 
                key={segment.id} 
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${segment.isSelected ? 'border-indigo-200 shadow-md' : 'border-slate-100'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <input 
                      type="checkbox" 
                      checked={segment.isSelected}
                      onChange={() => toggleSelection(segment.id)}
                      disabled={!isCompleted}
                      className={`w-5 h-5 rounded border-gray-300 focus:ring-indigo-500 ${!isCompleted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-indigo-600 cursor-pointer'}`}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <textarea 
                      value={segment.text}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, text: newText } : s));
                      }}
                      className="w-full text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-auto mb-4 font-normal leading-relaxed"
                      rows={Math.max(2, Math.ceil(segment.text.length / 80))} 
                    />

                    {/* Controls */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2 flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                         {isCompleted && segment.audioUrl ? (
                            <CustomAudioPlayer src={segment.audioUrl} />
                         ) : (
                           <span className="text-sm text-slate-400 italic flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                             </div>
                             Chưa tạo âm thanh
                           </span>
                         )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                         {hasError && (
                           <div className="flex flex-col items-end mr-2">
                             <span className="text-red-500 text-sm font-medium flex items-center gap-1">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                               Lỗi
                             </span>
                             {segment.errorMessage && (
                               <span className="text-xs text-red-400 max-w-[150px] text-right truncate" title={segment.errorMessage}>
                                 {segment.errorMessage}
                               </span>
                             )}
                           </div>
                         )}
                         
                         <button
                           onClick={() => handleGenerateSegment(segment.id)}
                           disabled={isAnyLoading && segment.status !== 'loading'}
                           className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                             (isAnyLoading && segment.status !== 'loading')
                               ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                               : segment.status === 'loading' 
                                 ? 'bg-slate-100 text-slate-400 cursor-wait' 
                                 : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600'
                           }`}
                         >
                           {segment.status === 'loading' ? (
                             <>
                               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               Đang xử lý
                             </>
                           ) : (
                             <>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                               {isCompleted ? 'Tạo lại' : 'Tạo giọng nói'}
                             </>
                           )}
                         </button>

                         {isCompleted && (
                           <a
                             href={segment.audioUrl}
                             download={`segment-${segment.id}.wav`}
                             className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg hover:bg-indigo-50"
                             title="Tải xuống đoạn này"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                           </a>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Cài đặt giọng đọc</h3>
            
            <div className="space-y-6">
              
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ngôn ngữ đầu ra (Tự động dịch)</label>
                <div className="relative">
                  <select
                    value={voiceConfig.language || 'vi'}
                    onChange={(e) => setVoiceConfig({...voiceConfig, language: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none appearance-none"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
                {voiceConfig.language && voiceConfig.language !== 'vi' && (
                  <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    Văn bản sẽ được dịch tự động sang {SUPPORTED_LANGUAGES.find(l => l.code === voiceConfig.language)?.name}.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mô hình giọng</label>
                <div className="relative">
                  <select
                    value={voiceConfig.voiceName}
                    onChange={(e) => setVoiceConfig({...voiceConfig, voiceName: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none appearance-none"
                  >
                    {PREBUILT_VOICES.map(v => (
                      <option key={v.name} value={v.name}>{v.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>

                <button
                  onClick={handlePreviewVoice}
                  disabled={isAnyLoading}
                  className={`mt-3 w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${isAnyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isPreviewLoading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  )}
                  {isPreviewLoading ? 'Đang tải...' : 'Nghe thử giọng này'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hướng dẫn phong cách</label>
                <textarea
                  value={voiceConfig.styleInstruction}
                  onChange={(e) => setVoiceConfig({...voiceConfig, styleInstruction: e.target.value})}
                  placeholder="VD: Giọng bình tĩnh, trấn an phù hợp cho phim tài liệu..."
                  className="w-full p-3 h-32 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Độ sáng tạo (Temperature)</label>
                  <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{voiceConfig.temperature ?? 1.0}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={voiceConfig.temperature ?? 1.0}
                  onChange={(e) => setVoiceConfig({...voiceConfig, temperature: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Giá trị cao giúp giọng đọc biểu cảm hơn, giá trị thấp giúp giọng đọc ổn định hơn.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-4">
                  Lưu ý: Thay đổi cài đặt sẽ áp dụng cho các lần tạo tiếp theo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <input 
              type="checkbox" 
              checked={completedSegmentsCount > 0 && selectedCount === completedSegmentsCount}
              onChange={toggleSelectAll}
              disabled={completedSegmentsCount === 0}
              className={`w-5 h-5 rounded border-gray-300 focus:ring-indigo-500 ${completedSegmentsCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-indigo-600 cursor-pointer'}`}
              id="selectAllFooter"
            />
            <label htmlFor="selectAllFooter" className={`text-sm font-medium ${completedSegmentsCount === 0 ? 'text-slate-400' : 'text-slate-700'}`}>Chọn tất cả (Đã tạo)</label>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">{selectedCount} đã chọn</span>
          </div>

          <div className="flex gap-3">
            {/* New Button: Download All Segments (Auto Generate) */}
            <button 
              onClick={downloadAllSegments}
              disabled={processingMode !== 'idle' && processingMode !== 'batch_all'}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {processingMode === 'batch_all' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang tự động tạo... ({apiKeys.length} luồng)</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4 4 4-4"></path></svg>
                  <span>Tải tất cả đoạn văn (Auto)</span>
                </>
              )}
            </button>

            {/* Existing Button: Download Selected */}
            <button 
              onClick={downloadPackage}
              disabled={selectedCount === 0 || (processingMode !== 'idle' && processingMode !== 'batch_selected')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {processingMode === 'batch_selected' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Tải xuống đã chọn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingSection;
