
import React from 'react';
import { HistoryItem } from '../types';

interface SidebarProps {
  isOpen: boolean;
  history: HistoryItem[];
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, history, onClose, onSelect }) => {
  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-slate-800">Lịch sử</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="overflow-y-auto h-full pb-20 p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>Không có dữ liệu gần đây.</p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200 group"
            >
              <h3 className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors mb-1 truncate">
                {item.title}
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                {item.timestamp.toLocaleDateString('vi-VN')} • {item.timestamp.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
              </p>
              <p className="text-sm text-gray-500 line-clamp-2">
                {item.previewText}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
