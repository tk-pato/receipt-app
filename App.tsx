import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  AlertCircle,
  Loader2,
  XCircle,
  ShieldAlert,
  Save,
  Download,
  FileCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { analyzeReceipt, analyzeReceiptVideo } from './services/geminiService';
import { generateMFCSVContent } from './csvExporter';
import { AnalysisResult, ReceiptData } from './types';
import { loadReceiptsFromDB, saveReceiptsToDB, deleteEntireDB } from './utils/db';
import { MF_ACCOUNT_ITEMS } from './constants';
import ReceiptGrid from './components/ReceiptGrid';
import IndividualReview from './components/IndividualReview';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ChatAssistant from './components/ChatAssistant';

const LAST_BUILD_DATE = "2026.02.02 01:20 (DYNAMIC ZIP NAME & SYNC)";

const sanitizeAccountTitle = (title?: string): string => {
  if (!title) return "雑費";
  const trimmed = title.trim();
  const matched = MF_ACCOUNT_ITEMS.find(item => item === trimmed);
  return matched || "雑費";
};

const normalizeImage = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error("Blob normalization failed"));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
};

const extractFrame = (file: File, time: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous"; 

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Sync Capture Timeout"));
    }, 25000);

    video.onloadedmetadata = () => {
      video.currentTime = Math.max(0, Math.min(time, video.duration));
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      // 指示通り600ms待機し、デコーダの描画を完全に安定させる
      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1280; 
          const scale = maxDim / Math.max(video.videoWidth, video.videoHeight);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error("Context failed");
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error("Frame blob failed"));
          }, 'image/jpeg', 0.9);
        } catch (err) {
          cleanup();
          reject(err);
        }
      }, 600); 
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Video decoding failed"));
    };
  });
};

const App: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isDBReady, setIsDBReady] = useState(false);
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastSourceFileName, setLastSourceFileName] = useState<string>("");
  const analysisAborted = useRef(false);

  useEffect(() => {
    loadReceiptsFromDB().then(data => {
      setResults(data || []);
      setIsDBReady(true);
    }).catch(() => {
      setIsDBReady(true);
    });
  }, []);

  useEffect(() => {
    if (isDBReady) saveReceiptsToDB(results);
  }, [results, isDBReady]);

  const handleSystemReset = async () => {
    if (!confirm("全てのデータを削除しますか？")) return;
    try {
      setIsDBReady(false);
      setResults([]);
      await deleteEntireDB();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    setIsAnalyzing(true);
    setGlobalError(null);
    analysisAborted.current = false;

    for (const file of selectedFiles) {
      if (analysisAborted.current) break;
      setLastSourceFileName(file.name);
      const isVideo = file.name.toLowerCase().endsWith('.mp4');
      
      setStatusMessage(isVideo ? `AIが全領収書を特定中（重複排除）...` : `領収書を解析中...`);
      
      try {
        if (isVideo) {
          // 1. AI解析（18:15 仕様の de-duplication 命令含む）
          const videoResults = await analyzeReceiptVideo(file);
          const totalFound = videoResults.length;
          
          if (totalFound === 0) continue;

          // 2. 逐次同期抽出（カウンター復元）
          let currentCount = 1;
          for (const item of videoResults) {
            if (analysisAborted.current) break;
            
            // カウンター表示の更新
            setStatusMessage(`抽出中: ${currentCount} / ${totalFound} 件目 [${item.shopName || '不明'}]`);
            
            try {
              // 600ms待機付きの抽出
              const frameBlob = await extractFrame(file, item.timestampSeconds);
              
              const newResult: AnalysisResult = {
                id: crypto.randomUUID(),
                fileName: `${file.name} (${item.timestampSeconds.toFixed(1)}s)`,
                status: 'success',
                timestampSeconds: item.timestampSeconds,
                frameBlob: frameBlob,
                data: {
                  ...item,
                  accountTitle: sanitizeAccountTitle(item.accountTitle),
                  taxRateType: item.taxRateType || '10',
                  currency: 'JPY',
                  items: [],
                  paymentMethod: item.paymentMethod || "cash",
                  peopleCount: item.peopleCount || 1,
                  taxAmount: 0,
                  remarks: item.remarks || "",
                  isQualifiedInvoice: item.isQualifiedInvoice ?? !!(item.invoiceId && /^T\d{13}$/.test(item.invoiceId))
                }
              };
              
              setResults(prev => [newResult, ...prev]);
              currentCount++;
            } catch (err) {
              console.error("Frame extraction error:", err);
              continue; 
            }
          }
        } else {
          const tempId = crypto.randomUUID();
          setResults(prev => [{ id: tempId, fileName: file.name, data: null, status: 'processing' }, ...prev]);
          const blob = await normalizeImage(file);
          const data = await analyzeReceipt(new File([blob], "receipt.jpg", { type: 'image/jpeg' }));
          setResults(prev => prev.map(res => 
            res.id === tempId ? { 
              ...res, 
              status: 'success', 
              data: {
                ...data,
                accountTitle: sanitizeAccountTitle(data.accountTitle),
                taxRateType: data.taxRateType || '10',
                paymentMethod: data.paymentMethod || 'cash',
                isQualifiedInvoice: data.isQualifiedInvoice ?? !!(data.invoiceId && /^T\d{13}$/.test(data.invoiceId))
              },
              frameBlob: blob 
            } : res
          ));
        }
      } catch (error: any) {
        setGlobalError(`${file.name}: 解析エラーが発生しました。`);
      }
    }
    setIsAnalyzing(false);
    setStatusMessage("");
  }, []);

  const exportZip = async () => {
    const success = results.filter(r => r.status === 'success' && r.data);
    if (success.length === 0) return;

    const zip = new JSZip();
    zip.file("MF_Import.csv", generateMFCSVContent(success.map(r => r.data!)));
    const imgFolder = zip.folder("images");
    success.forEach((res, i) => {
      if (res.frameBlob && imgFolder) {
        const dStr = (res.data?.transactionDate || '00000000').replace(/-/g, '');
        const shop = (res.data?.shopName || 'shop').substring(0, 10);
        imgFolder.file(`${(i + 1).toString().padStart(3, '0')}_${dStr}_${shop}.jpg`, res.frameBlob);
      }
    });

    // ZIPファイル名を入力ファイル名に合わせる（拡張子除去）
    const baseName = lastSourceFileName ? lastSourceFileName.split('.')[0] : `Receipts_${new Date().getTime()}`;
    const zipName = `${baseName}_Export.zip`;

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = zipName;
    link.click();
  };

  const updateResultData = (id: string, newData: ReceiptData) => {
    setResults(prev => prev.map(res => res.id === id ? { ...res, data: newData } : res));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/20 pb-20 font-sans selection:bg-slate-200 selection:text-slate-900">
      <Header lastBuild={LAST_BUILD_DATE} />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {globalError && (
          <div className="mb-6 glass-card bg-red-50/40 border-l-4 border-red-400 p-5 rounded-r-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-sm font-semibold text-red-800">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-red-300 hover:text-red-500"><XCircle className="w-6 h-6" /></button>
          </div>
        )}
        {!isDBReady ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Initializing Terminal...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div className="flex items-center gap-3">
                <span className="glass-card text-[11px] font-black text-slate-500 uppercase tracking-widest px-5 py-2.5 rounded-2xl flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-600" /> Accounting Hub
                </span>
                {results.length > 0 && <span className="text-[11px] font-black text-slate-700 bg-slate-200/50 px-4 py-2 rounded-xl backdrop-blur-sm">{results.length} items</span>}
              </div>
              <button onClick={handleSystemReset} className="glass-card text-[10px] font-black text-slate-400 hover:text-red-600 flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95">
                <ShieldAlert className="w-4 h-4" /> EMERGENCY RESET
              </button>
            </div>
            <div className="mb-12 relative">
              <FileUploader onFilesSelected={handleFilesSelected} disabled={isAnalyzing} />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-[3.5rem] flex flex-col items-center justify-center z-30 border border-white/50 shadow-2xl animate-in fade-in">
                  <Loader2 className="w-20 h-20 animate-spin text-slate-800" />
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mt-8 mb-2">Analyzing Data</h3>
                  <p className="text-sm font-bold text-slate-500 animate-pulse">{statusMessage}</p>
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="space-y-12">
                <div className="glass-card p-10 md:p-14 rounded-[3.5rem] flex flex-wrap justify-between items-center gap-8 group border border-white/60 shadow-2xl">
                  <div className="flex items-center gap-8">
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl group-hover:scale-105 transition-transform"><Download className="w-10 h-10 text-white" /></div>
                    <div>
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Archive<br/>Export</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Ready to zip: {results.filter(r => r.status === 'success').length} items</p>
                    </div>
                  </div>
                  <button onClick={exportZip} disabled={!results.some(r => r.status === 'success')} className="px-16 py-8 bg-slate-900 text-white font-black rounded-[2.5rem] hover:bg-black shadow-2xl active:translate-y-1 transition-all flex items-center gap-4 group disabled:opacity-50 border-b-4 border-slate-700">
                    <Save className="w-6 h-6" /> Download ZIP Archive
                  </button>
                </div>
                <ReceiptGrid results={results} onUpdate={updateResultData} onDelete={(id) => setResults(prev => prev.filter(r => r.id !== id))} onRetry={() => {}} onSelect={(id) => { const idx = results.findIndex(r => r.id === id); if (idx !== -1) setReviewingIndex(idx); }} />
              </div>
            )}
          </>
        )}
      </main>
      {reviewingIndex !== null && results[reviewingIndex] && (
        <IndividualReview result={results[reviewingIndex]} currentIndex={reviewingIndex} totalCount={results.length} onClose={() => setReviewingIndex(null)} onPrev={() => setReviewingIndex(p => p !== null && p > 0 ? p - 1 : p)} onNext={() => setReviewingIndex(p => p !== null && p < results.length - 1 ? p + 1 : p)} onUpdate={updateResultData} />
      )}
      <ChatAssistant />
    </div>
  );
};

export default App;