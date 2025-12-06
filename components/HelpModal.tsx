
import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-800">Hướng dẫn sử dụng Voice Studio</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Section 1 */}
          <div className="flex gap-5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0 mt-1">1</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Soạn thảo & Dịch thuật đa ngữ</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
                <li>Nhập văn bản trực tiếp hoặc tải lên file <strong>.txt</strong>.</li>
                <li><strong>Tính năng Dịch thuật:</strong> Chọn ngôn ngữ đầu ra (VD: Tiếng Anh, Tiếng Nhật) ở cột bên phải. AI sẽ tự động dịch đoạn văn của bạn trước khi đọc.</li>
                <li>Văn bản dài sẽ được tự động chia nhỏ thành các đoạn ngắn để tối ưu hóa việc xử lý.</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="flex gap-5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0 mt-1">2</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Cấu hình Giọng đọc AI</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
                <li><strong>Chọn nhân vật:</strong> Hơn 20 giọng đọc với vai trò cụ thể (VD: <em>MC Sự kiện, Kể chuyện ma, Review công nghệ...</em>).</li>
                <li><strong>Hướng dẫn phong cách:</strong> Nhập mô tả cảm xúc (VD: <em>"Vui vẻ, hào hứng"</em> hoặc <em>"Thì thầm, bí ẩn"</em>) để AI điều chỉnh ngữ điệu.</li>
                <li><strong>Temperature:</strong> Kéo thanh trượt để tăng độ sáng tạo/biến thiên của giọng nói.</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="flex gap-5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0 mt-1">3</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Quản lý API Key & Tăng tốc độ</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
                <li><strong>Chế độ Miễn phí:</strong> Hệ thống cung cấp 10 lượt tạo mỗi 2 giờ.</li>
                <li><strong>Chế độ Chuyên nghiệp (Khuyên dùng):</strong> Nhập API Key cá nhân của bạn (từ Google AI Studio).</li>
                <li>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200 text-xs mr-1">TÍNH NĂNG MỚI</span>
                  <strong>Xử lý Song song:</strong> Bạn có thể thêm nhiều API Key cùng lúc. Hệ thống sẽ tự động phân tải và tạo giọng nói cho nhiều đoạn văn cùng lúc, giúp tăng tốc độ lên gấp nhiều lần (Tốc độ xN).
                </li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="flex gap-5">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg shrink-0 mt-1">4</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Tạo & Tải xuống (Auto)</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
                <li>Bấm <strong>"Tạo giọng nói"</strong> ở từng đoạn để nghe thử và kiểm tra.</li>
                <li>
                  Sử dụng nút <span className="font-semibold text-slate-800">"Tải tất cả đoạn văn (Auto)"</span> ở dưới cùng: Hệ thống sẽ tự động tạo âm thanh cho các đoạn còn thiếu (sử dụng toàn bộ sức mạnh API Key) và gộp chúng thành 1 file duy nhất để bạn tải về.
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Đã hiểu, bắt đầu ngay!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
