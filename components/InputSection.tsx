
import React, { useRef, useState } from 'react';

interface InputSectionProps {
  text: string;
  setText: (text: string) => void;
  onConvert: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({ text, setText, onConvert }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
    };
    // Simple support for text files. For PDF/Docx, you'd need a parser library (e.g. pdf.js), avoiding here for simplicity.
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        
        {/* Main Input */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán văn bản của bạn vào đây để chuyển đổi thành giọng nói sống động..."
            className="w-full h-64 p-6 text-lg text-slate-700 placeholder-slate-300 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-0 transition-all resize-none outline-none"
          />
          
          <div className="absolute bottom-4 right-4 text-xs text-slate-400 pointer-events-none">
            {text.length} ký tự
          </div>
        </div>

        {/* File Import & Actions */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div 
            className={`flex-1 w-full md:w-auto border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".txt" 
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-2 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span className="font-medium">Tải lên file .txt</span>
            </div>
            <span className="text-xs text-slate-400 mt-1">hoặc kéo & thả</span>
          </div>

          <button
            onClick={onConvert}
            disabled={!text.trim()}
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            <span>Chuyển đổi sang giọng nói</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
