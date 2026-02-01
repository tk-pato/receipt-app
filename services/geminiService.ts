import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";

// ▼▼▼ APIキー設定（確実に動作させるためハードコードに戻す） ▼▼▼
const API_KEY = "AIzaSyBbgOEFVXtitNuyMdEU_jlSj2TddDD5Mcs"; 
const MODEL_NAME = "gemini-3-flash-preview";

/**
 * 動画からフレームを抽出する（軽量化版）
 * iPhone/Safariでのメモリクラッシュを防ぐため、解像度と品質を調整
 */
const extractFramesFromVideo = async (videoFile: File, intervalSeconds: number = 1.5): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    
    // iOS/Safariでのデコード安定性のための設定
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    
    const frames: string[] = [];
    
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // 【メモリ対策】最大サイズを800pxに制限（iPhoneクラッシュ回避の重要設定）
      const maxDim = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      const scale = maxDim / Math.max(width, height);
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);

      let currentTime = 0;
      
      const captureFrame = () => {
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // 【メモリ対策】JPEG品質を0.6に設定
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
        frames.push(dataUrl.split(',')[1]);
      };

      const seekNext = async () => {
        // 【変更】間隔を狭めたため、最大枚数を30→45に緩和（45秒まで対応）
        if (currentTime < duration && frames.length < 45) { 
          video.currentTime = currentTime;
          // seek完了待ち
          await new Promise<void>(r => { 
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              r();
            };
            video.addEventListener('seeked', onSeeked);
            // タイムアウト対策
            setTimeout(r, 500);
          });
          
          captureFrame();
          currentTime += intervalSeconds;
          seekNext();
        } else {
          URL.revokeObjectURL(url);
          video.remove();
          resolve(frames);
        }
      };
      seekNext();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画の読み込みに失敗しました。フォーマットを確認してください。"));
    };
  });
};

const fileToBase64 = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ACCOUNT_DETERMINATION_LOGIC = `
勘定科目は以下のルールで厳密に判定してください：
1. 店名がレストラン、居酒屋、カフェ、飲食店等の場合：
   - 会議の内容であれば「会議費」
   - 接待であれば「接待交際費」
   - 基本的には「接待交際費」を優先してください。
2. 贈答品、花、ゴルフ場、チケット等の場合：
   - 「接待交際費」
3. 文房具、10万円未満の備品、日用品の場合：
   - 「備品・消耗品費」
4. 電車、バス、タクシー、宿泊の場合：
   - 「旅費交通費」
`;

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    shopName: { type: Type.STRING },
    transactionDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
    amount: { type: Type.NUMBER },
    taxAmount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    invoiceId: { type: Type.STRING, description: "T+13 digits registration number if exists" },
    peopleCount: { type: Type.NUMBER },
    participants: { type: Type.STRING },
    accountTitle: { type: Type.STRING },
    paymentMethod: { type: Type.STRING },
    memo: { type: Type.STRING },
  },
  required: ["shopName", "transactionDate", "amount", "taxAmount", "currency", "accountTitle"],
};

export const analyzeReceipt = async (file: File): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const base64Data = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { text: `レシート画像を解析し、正確な会計データを抽出してください。特に「登録番号(T+13桁)」の読み取りを最優先とします。${ACCOUNT_DETERMINATION_LOGIC}` },
        { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }
      ]
    },
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("AIからの応答が空です");
  return JSON.parse(text) as ReceiptData;
};

export const analyzeReceiptVideo = async (videoFile: File): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // 【変更】1.5秒間隔だと取りこぼしがあるため、1.0秒間隔に短縮
  const INTERVAL_SEC = 1.0;
  
  // クライアント側でフレームを抽出（軽量化処理済み）
  const frames = await extractFramesFromVideo(videoFile, INTERVAL_SEC);
  
  if (frames.length === 0) {
    throw new Error("動画からフレームを抽出できませんでした。");
  }

  // 画像とタイムスタンプ情報を交互に配置してプロンプトを構築
  const contentParts: any[] = [
    { text: `これらの画像は動画から${INTERVAL_SEC}秒間隔で抽出されたフレームです。各画像の直前に「Time: X.Xs」としてタイムスタンプが示されています。
このタイムスタンプ情報を厳密に使用して、各領収書が映っている正確な timestampSeconds を特定してください。
画像とデータの整合性を最優先してください。誤った画像に関連付けないように注意してください。
同じ領収書が複数フレームにまたがって映っている場合は、最も鮮明なフレームの情報を統合してください。
${ACCOUNT_DETERMINATION_LOGIC}` }
  ];

  frames.forEach((base64, index) => {
    const time = (index * INTERVAL_SEC).toFixed(1);
    contentParts.push({ text: `[Time: ${time}s]` });
    contentParts.push({ inlineData: { data: base64, mimeType: "image/jpeg" } });
  });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: contentParts
    },
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            transactionDate: { type: Type.STRING },
            shopName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            accountTitle: { type: Type.STRING },
            timestampSeconds: { type: Type.NUMBER },
            peopleCount: { type: Type.NUMBER },
            participants: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            invoiceId: { type: Type.STRING },
            remarks: { type: Type.STRING }
          },
          required: ["shopName", "amount", "timestampSeconds", "accountTitle"]
        }
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("動画の解析に失敗しました。");
  return JSON.parse(text);
};

// ▼▼▼ 追加：経理相談チャット機能 ▼▼▼
export const consultAccountant = async (message: string, history: {role: string, text: string}[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemPrompt = `
あなたは日本の税務・会計に詳しいベテラン経理担当者です。
ユーザー（事業主や従業員）からの「この出費の勘定科目は何？」という相談に対して、親身にアドバイスしてください。

ルール：
1. 結論（推奨する勘定科目）を先に述べる。
2. なぜその科目なのか理由を短く説明する。
3. 判断に迷う場合は「誰と行きましたか？」「事業に関連しますか？」など質問を返す。
4. 口調は丁寧だが、堅苦しくなりすぎないように。「〜ですね」「〜で大丈夫ですよ」など。
5. MFクラウド（マネーフォワード）の一般的な勘定科目に準拠する。
`;

  // 履歴を含めてリクエストを構築
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: "承知いたしました。経理担当としてサポートします。何でも聞いてください。" }] },
    ...history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: { temperature: 0.7 }
    });
    return response.text || "すみません、うまく答えられませんでした。もう一度お願いします。";
  } catch (e) {
    console.error(e);
    return "エラーが発生しました。時間を置いて再度お試しください。";
  }
};