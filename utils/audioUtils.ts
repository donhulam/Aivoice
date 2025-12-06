// Decodes Base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert raw PCM data (Float32 or Int16) to a WAV file Blob URL
// Gemini typically returns raw PCM. We'll assume 24kHz for the TTS model based on docs, 
// or we can detect. usually 24000Hz, 1 channel.
export function pcmToWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16; 
  // The data from Gemini is often little-endian 16-bit PCM in the byte stream
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + pcmData.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcmData.length, true);

  return new Blob([view, pcmData], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Concatenate multiple PCM Uint8Arrays
export function concatenatePcmData(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

// Basic text splitter logic
export function splitTextIntoSegments(text: string, maxWords: number = 100): string[] {
  // Split by sentence endings primarily
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const segments: string[] = [];
  let currentSegment = "";

  for (const sentence of sentences) {
    const wordCount = (currentSegment + sentence).split(/\s+/).length;
    if (wordCount > maxWords && currentSegment.trim().length > 0) {
      segments.push(currentSegment.trim());
      currentSegment = sentence;
    } else {
      currentSegment += sentence;
    }
  }
  if (currentSegment.trim().length > 0) {
    segments.push(currentSegment.trim());
  }
  
  return segments;
}