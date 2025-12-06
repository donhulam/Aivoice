
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceConfig, SUPPORTED_LANGUAGES } from "../types";

export const generateSegmentAudio = async (
  text: string,
  config: VoiceConfig,
  apiKey: string
): Promise<{ audioData: string; translatedText: string }> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  let textToSpeak = text;

  // STEP 1: TRANSLATION LOGIC
  // Always check language processing. 
  // Even if target is Vietnamese, input might be English, so we ask the model to ensure it matches target language.
  if (config.language) {
    const targetLanguageName = SUPPORTED_LANGUAGES.find(l => l.code === config.language)?.name || config.language;
    
    try {
      const translationResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
            parts: [{ 
                text: `You are a professional translator. 
                Target Language: ${targetLanguageName}.
                
                Instruction:
                1. Detect the language of the provided text.
                2. If the text is already in ${targetLanguageName}, return the original text exactly as is.
                3. If the text is in a different language, translate it into natural, high-quality ${targetLanguageName}.
                4. Output ONLY the final text. Do not output any introductory notes, explanations, or quotes.
                
                Text to process:
                "${text}"` 
            }]
        }]
      });

      const translated = translationResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (translated) {
        textToSpeak = translated.trim();
        // Optional: Remove quotes if the model wrapped output in them
        textToSpeak = textToSpeak.replace(/^["']|["']$/g, '');
      } else {
        console.warn("Translation returned empty response, using original text.");
      }
    } catch (error) {
      console.error("Translation API Error:", error);
      throw new Error("Lỗi khi dịch/xử lý ngôn ngữ văn bản. Vui lòng thử lại.");
    }
  }

  // STEP 2: TTS LOGIC
  
  // Construct config object dynamically to avoid undefined values
  const generateConfig: any = {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: config.voiceName },
      },
    },
  };

  // Only add temperature if defined
  if (config.temperature !== undefined) {
    generateConfig.temperature = config.temperature;
  }

  // FIX: Do NOT use systemInstruction in config for TTS model (it causes 500 Error).
  // Instead, prepend the style instruction to the text prompt to guide the model.
  let finalPrompt = textToSpeak;
  if (config.styleInstruction && config.styleInstruction.trim() !== '') {
    // Format: "Instruction: Text"
    finalPrompt = `${config.styleInstruction}: ${textToSpeak}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: finalPrompt }] }], // Send the prompt with style instruction
      config: generateConfig,
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    // Check if valid audio was returned
    if (!base64Audio) {
      // Sometimes the model returns text refusal instead of audio
      const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = response.candidates?.[0]?.finishReason;

      console.error("TTS Failed. Finish Reason:", finishReason, "Text Response:", textResponse);

      if (finishReason === 'SAFETY') {
          throw new Error("Nội dung bị chặn bởi bộ lọc an toàn.");
      }
      if (finishReason === 'RECITATION') {
          throw new Error("Nội dung bị chặn do vi phạm bản quyền/trích dẫn.");
      }
      if (textResponse) {
          throw new Error("Mô hình trả về văn bản thay vì âm thanh (Hãy thử hướng dẫn phong cách đơn giản hơn).");
      }

      throw new Error("Không nhận được dữ liệu âm thanh từ Gemini.");
    }

    return { 
      audioData: base64Audio, 
      translatedText: textToSpeak // Return the clean text (without style instructions prefix)
    };

  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    // Enhance error message for user
    if (error.message && error.message.includes('400')) {
       throw new Error("Lỗi cấu hình (400). Vui lòng thử hướng dẫn phong cách ngắn gọn hơn.");
    }
    throw error;
  }
};
