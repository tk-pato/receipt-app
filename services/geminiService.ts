import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";
import { MF_ACCOUNT_ITEMS } from "../constants";

/**
 * 解析用フレーム抽出 (18:15 最適化モデル)
 * 動画全体を網羅するように 20 枚を等間隔で抽出
 */
const extractFramesForAnalysis = async (videoFile: File, maxFrames: number = 20, minInterval: number = 0.6): Promise<{data: string, timestamp: number}[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const frames: {data: string, timestamp: number}[] = [];
    
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      // 20枚で動画全体を均等スキャン
      const interval = Math.max(minInterval, duration / (maxFrames + 1));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const maxDim = 1024; 
      const scale = maxDim / Math.max(video.videoWidth, video.videoHeight);
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      let currentTime = interval / 2;

      const seekAndCapture = async () => {
        if (currentTime < duration && frames.length < maxFrames) {
          video.currentTime = currentTime;
          const captureTime = currentTime;
          
          await new Promise<void>(r => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              setTimeout(r, 400); 
            };
            video.addEventListener('seeked', onSeeked);
          });

          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push({
              data: canvas.toDataURL('image/jpeg', 0.7).split(',')[1],
              timestamp: captureTime
            });
          }
          currentTime += interval;
          await seekAndCapture();
        } else {
          URL.revokeObjectURL(url);
          canvas.width = 0;
          canvas.height = 0;
          video.remove();
          resolve(frames);
        }
      };
      await seekAndCapture();
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video load error"));
    };
  });
};

const fileToBase64 = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    shopName: { type: Type.STRING },
    transactionDate: { type: Type.STRING, description: "YYYY-MM-DD" },
    amount: { type: Type.NUMBER },
    taxAmount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    invoiceId: { type: Type.STRING, description: "T+13 digits" },
    accountTitle: { type: Type.STRING, description: `勘定科目: ${MF_ACCOUNT_ITEMS.join(", ")}` },
    paymentMethod: { type: Type.STRING },
    remarks: { type: Type.STRING },
  },
  required: ["shopName", "transactionDate", "amount", "accountTitle"],
};

const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzeReceipt = async (file: File): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const base64Data = await fileToBase64(file);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { 
      parts: [
        { text: "領収書解析。勘定科目は必ずリストから選択してください。" }, 
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
      ] 
    },
    config: { temperature: 0.1, responseMimeType: "application/json", responseSchema: receiptSchema },
  });
  return JSON.parse(response.text || '{}') as ReceiptData;
};

export const analyzeReceiptVideo = async (videoFile: File): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const frames = await extractFramesForAnalysis(videoFile, 20, 0.6);
  
  const parts: any[] = [
    { text: `【18:15 最適化命令：全件特定・重複排除】
1. 動画内に映っている「全ての異なる領収書」を1枚も漏らさず特定してください。
2. ゆっくり撮影されているため同じ領収書が複数回映りますが、同一の領収書は必ず1つのデータに集約し、重複させないでください。
3. 同一の領収書については、提示されたフレームの中から「最も文字が鮮明でピントが合っている瞬間」の時間（Timestamp）を timestampSeconds に記録してください。
4. 勘定科目はリストから厳密に選択: ${MF_ACCOUNT_ITEMS.join(", ")}` }
  ];
  
  frames.forEach((frame) => { 
    parts.push({ text: `[Timestamp: ${frame.timestamp.toFixed(2)}s]` }); 
    parts.push({ inlineData: { data: frame.data, mimeType: "image/jpeg" } }); 
  });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: { 
      temperature: 0.1, 
      responseMimeType: "application/json", 
      responseSchema: { 
        type: Type.ARRAY, 
        items: { 
          type: Type.OBJECT, 
          properties: { ...receiptSchema.properties, timestampSeconds: { type: Type.NUMBER } },
          required: ["shopName", "amount", "timestampSeconds", "accountTitle"]
        } 
      } 
    },
  });
  
  return JSON.parse(response.text || '[]');
};

export const consultAccountant = async (msg: string, hist: any[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const contents = [
    ...hist.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: msg }] }
  ];
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { systemInstruction: "経理のプロとして、 Money Forward Cloud への入力に関する相談に答えてください。" }
  });
  return response.text || "";
};