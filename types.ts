
export interface VoiceConfig {
  voiceName: string;
  styleInstruction: string;
  temperature: number;
  language: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'en', name: 'Tiếng Anh (English)' },
  { code: 'ja', name: 'Tiếng Nhật (Japanese)' },
  { code: 'ko', name: 'Tiếng Hàn (Korean)' },
  { code: 'zh', name: 'Tiếng Trung (Chinese)' },
  { code: 'fr', name: 'Tiếng Pháp (French)' },
  { code: 'es', name: 'Tiếng Tây Ban Nha (Spanish)' },
  { code: 'de', name: 'Tiếng Đức (German)' },
  { code: 'ru', name: 'Tiếng Nga (Russian)' },
];

export interface Segment {
  id: string;
  text: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
  audioUrl?: string;
  rawPcmData?: Uint8Array; // Store for concatenation
  isSelected: boolean;
  errorMessage?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: Date;
  previewText: string;
  fullText: string;
  segments: Segment[];
}

export const PREBUILT_VOICES = [
  // Các giọng phổ biến - Được gán tên và vai trò cụ thể
  { name: 'Puck', label: 'Phi Hùng - MC Sự kiện (Nam, Năng động)' },
  { name: 'Charon', label: 'Đức Thành - Phát thanh viên Tin tức (Nam, Uy quyền)' },
  { name: 'Fenrir', label: 'Minh Quân - Đọc truyện đêm khuya (Nam, Trầm ấm)' },
  { name: 'Aoede', label: 'Diệu Linh - Thuyết trình viên (Nữ, Tự tin)' },
  { name: 'Kore', label: 'Mai Phương - Chăm sóc khách hàng (Nữ, Bình tĩnh)' },
  { name: 'Zephyr', label: 'Thảo Vy - Kể chuyện thiếu nhi (Nữ, Nhẹ nhàng)' },
  { name: 'Leda', label: 'Lan Hương - Quảng cáo cao cấp (Nữ, Tinh tế)' },
  { name: 'Orus', label: 'Tuấn Kiệt - Diễn giả/Sales (Nam, Tự tin)' },

  // Các giọng bổ sung
  { name: 'Achernar', label: 'Thu Hà - Tư vấn tâm lý (Nữ, Nhẹ nhàng)' },
  { name: 'Achird', label: 'Hoàng Nam - Hướng dẫn viên du lịch (Nam, Thân thiện)' },
  { name: 'Algenib', label: 'Bảo Long - Phim hành động/Kịch tính (Nam, Khàn)' },
  { name: 'Algieba', label: 'Quang Minh - Review công nghệ (Nam, Mượt mà)' },
  { name: 'Alnilam', label: 'Quốc Khánh - Huấn luyện viên thể hình (Nam, Rắn rỏi)' },
  { name: 'Autonoe', label: 'Ngọc Anh - Review Ẩm thực (Nữ, Tươi sáng)' },
  { name: 'Callirrhoe', label: 'Thanh Hằng - Vlog đời sống (Nữ, Thoải mái)' },
  { name: 'Despina', label: 'Mỹ Tâm - Host Podcast (Nữ, Trôi chảy)' },
  { name: 'Enceladus', label: 'Hải Đăng - Truyện kinh dị/ASMR (Nam, Thủ thỉ)' },
  { name: 'Erinome', label: 'Cẩm Tú - Tổng đài viên (Nữ, Rõ ràng)' },
  { name: 'Gacrux', label: 'Kim Ngân - Phim tài liệu lịch sử (Nữ, Trưởng thành)' },
  { name: 'Iapetus', label: 'Anh Tuấn - Hướng dẫn kỹ thuật (Nam, Rành mạch)' },
  { name: 'Laomedeia', label: 'Bảo Ngọc - Hoạt náo viên (Nữ, Sôi nổi)' },
  { name: 'Pulcherrima', label: 'Thanh Vân - Lãnh đạo/CEO (Nữ, Quyết đoán)' },
  { name: 'Rasalgethi', label: 'GS. Hùng - Giáo sư khoa học (Nam, Thông thái)' },
  { name: 'Sadachbia', label: 'Hoàng Khôi - Bình luận viên Game (Nam, Sống động)' },
  { name: 'Sadaltager', label: 'Mạnh Cường - Chuyên gia tài chính (Nam, Am hiểu)' },
  { name: 'Schedar', label: 'Văn Ba - Thông báo công cộng (Nam, Đều đặn)' },
  { name: 'Sulafat', label: 'Tuyết Mai - Radio chữa lành (Nữ, Ấm áp)' },
  { name: 'Umbriel', label: 'Thành Đạt - Bạn tâm giao (Nam, Dễ tính)' },
  { name: 'Vindemiatrix', label: 'Thùy Dương - Hướng dẫn Thiền/Yoga (Nữ, Dịu dàng)' },
  { name: 'Zubenelgenubi', label: 'Tiến Dũng - Phỏng vấn đường phố (Nam, Đời thường)' },
];
