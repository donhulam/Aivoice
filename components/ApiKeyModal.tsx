
import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSetUserKeys: (keys: string[]) => void;
  onUseSystemKey: () => void;
  systemUsageCount: number;
  systemUsageStartTime: number;
  maxSystemUsage: number;
  usageWindowMs: number;
  canClose: boolean;
  onClose: () => void;
  existingKeys?: string[];
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onSetUserKeys,
  canClose,
  onClose,
  existingKeys = []
}) => {
  const [inputKey, setInputKey] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKeys(existingKeys);
    }
  }, [isOpen, existingKeys]);

  if (!isOpen) return null;

  const handleAddKey = () => {
    const cleanKey = inputKey.trim();
    if (!cleanKey) return;
    
    if (keys.includes(cleanKey)) {
      setError('Key này đã được thêm vào danh sách.');
      return;
    }

    setKeys([...keys, cleanKey]);
    setInputKey('');
    setError('');
  };

  const handleRemoveKey = (indexToRemove: number) => {
    setKeys(keys.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveUserKeys = () => {
    // Allow saving if there are keys in the list, OR if the input box has a key (add it automatically)
    let finalKeys = [...keys];
    if (inputKey.trim() && !keys.includes(inputKey.trim())) {
      finalKeys.push(inputKey.trim());
    }

    if (finalKeys.length === 0) {
      setError('Vui lòng nhập ít nhất 1 API Key.');
      return;
    }
    
    setError('');
    onSetUserKeys(finalKeys);
  };

  const maskKey = (key: string) => {
    if (key.length < 10) return '******';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        onClick={() => canClose && onClose()}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cấu hình quyền truy cập</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý nhiều API Keys để tăng tốc độ</p>
          
          {canClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
            <div className="space-y-4">
              
              {/* List of added keys */}
              {keys.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {keys.map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                      <span className="font-mono text-slate-600">{maskKey(k)}</span>
                      <button 
                        onClick={() => handleRemoveKey(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Xóa Key này"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new key input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                    placeholder="Thêm AIzaSy..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all text-sm"
                  />
                </div>
                <button 
                  onClick={handleAddKey}
                  disabled={!inputKey.trim()}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  Thêm
                </button>
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}
              
              <div className="text-xs text-slate-400">
                <p>Mẹo: Thêm nhiều API Key để tăng tốc độ tạo giọng nói (xử lý song song).</p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  Lấy Key tại đây
                </a>.
              </div>

              <button
                onClick={handleSaveUserKeys}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 mt-2"
              >
                Lưu & Sử dụng ({keys.length + (inputKey.trim() && !keys.includes(inputKey.trim()) ? 1 : 0)} Keys)
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
