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
import ReceiptGrid from './components/ReceiptGrid';
import IndividualReview from './components/IndividualReview';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
// ▼▼▼ 追加 ▼▼▼
import ChatAssistant from './components/ChatAssistant';

const LAST_BUILD_DATE = "2026.01.25 15:30 (CHAT ENABLED)";

const normalizeImage = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1024; // 軽量化: 1600 -> 1024
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
        reject(new Error("Canvas error"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error("Normalization failed"));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load error")); };
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
    video.crossOrigin = "anonymous"; // iOS対策

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("抽出タイムアウト"));
    }, 20000);

    video.onloadeddata = () => {
      video.currentTime = Math.max(0, Math.min(time, video.duration));
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 600; // 軽量化: 1200 -> 600
          const scale = maxDim / Math.max(video.videoWidth, video.videoHeight);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error("Canvas error");
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error("Blob extraction failed"));
          }, 'image/jpeg', 0.8); 
        } catch (err) {
          cleanup();
          reject(err);
        }
      }, 500); 
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("動画デコードエラー"));
    };

    video.load();
  });
};

const App: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isDBReady, setIsDBReady] = useState(false);
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const analysisAborted = useRef(false);

  useEffect(() => {
    loadReceiptsFromDB().then(data => {
      setResults(data || []);
      setIsDBReady(true);
    }).catch(err => {
      console.error("DB Load Error", err);
      setIsDBReady(true);
    });
  }, []);

  useEffect(() => {
    if (isDBReady) saveReceiptsToDB(results);
  }, [results, isDBReady]);

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    setIsAnalyzing(true);
    setGlobalError(null);
    analysisAborted.current = false;

    for (const file of selectedFiles) {
      if (analysisAborted.current) break;

      const isVideo = file.name.toLowerCase().endsWith('.mp4');
      const tempId = crypto.randomUUID();
      
      setStatusMessage(isVideo ? `動画をスキャン中: ${file.name}` : `レシートを解析中: ${file.name}`);

      setResults(prev => [{
        id: tempId,
        fileName: file.name,
        data: null,
        status: 'processing'
      }, ...prev]);

      try {
        if (isVideo) {
          const videoResults = await analyzeReceiptVideo(file);
          const processedResults: AnalysisResult[] = [];
          
          for (let i = 0; i < videoResults.length; i++) {
            if (analysisAborted.current) break;
            const item = videoResults[i];
            setStatusMessage(`領収書を抽出中 (${i + 1}/${videoResults.length})...`);
            
            try {
              const frameBlob = await extractFrame(file, item.timestampSeconds);
              processedResults.push({
                id: crypto.randomUUID(),
                fileName: `${file.name} (${item.timestampSeconds.toFixed(1)}s)`,
                status: 'success',
                timestampSeconds: item.timestampSeconds,
                frameBlob: frameBlob,
                data: {
                  ...item,
                  taxRateType: '10',
                  currency: 'JPY',
                  items: [],
                  paymentMethod: item.paymentMethod || "cash",
                  peopleCount: item.peopleCount || 1,
                  taxAmount: 0,
                  remarks: item.remarks || ""
                }
              });
            } catch (err) {
              console.warn("Frame extraction failed", err);
            }
          }

          setResults(prev => {
            const filtered = prev.filter(r => r.id !== tempId);
            return [...processedResults, ...filtered];
          });
        } else {
          const blob = await normalizeImage(file);
          const data = await analyzeReceipt(new File([blob], "normalized.jpg", { type: 'image/jpeg' }));
          setResults(prev => prev.map(res => 
            res.id === tempId ? { ...res, status: 'success', data: { ...data, taxRateType: '10', paymentMethod: data.paymentMethod || 'cash' }, frameBlob: blob } : res
          ));
        }
      } catch (error: any) {
        setResults(prev => prev.map(res => 
          res.id === tempId ? { ...res, status: 'error', error: error.message } : res
        ));
        setGlobalError(`${file.name}: ${error.message}`);
      }
    }
    
    setIsAnalyzing(false);
    setStatusMessage("");
  }, []);

  const exportZip = async () => {
    const success = results.filter(r => r.status === 'success' && r.data);
    if (success.length === 0) return;

    const zip = new JSZip();
    zip.file("MFクラウド仕訳.csv", generateMFCSVContent(success.map(r => r.data!)));
    const imgFolder = zip.folder("images");
    
    success.forEach((res, i) => {
      if (res.frameBlob && imgFolder) {
        const dateStr = (res.data?.transactionDate || '00000000').replace(/-/g, '');
        const shop = (res.data?.shopName || 'unknown').replace(/[\\/:*?"<>|]/g, '').substring(0, 20);
        imgFolder.file(`${(i + 1).toString().padStart(3, '0')}_${dateStr}_${shop}.jpg`, res.frameBlob);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `MF_Cloud_Export_${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
  };

  const updateResultData = (id: string, newData: ReceiptData) => {
    setResults(prev => prev.map(res => res.id === id ? { ...res, data: newData } : res));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header lastBuild={LAST_BUILD_DATE} />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {globalError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-sm font-bold text-red-800">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-red-300 hover:text-red-500 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        )}

        {!isDBReady ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-slate-200" />
            <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Initializing Secure Storage...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-500" /> Analysis Dashboard
                </span>
                {results.length > 0 && (
                  <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-2.5 rounded-2xl border border-blue-100">
                    {results.length} Total items
                  </span>
                )}
              </div>
              <button 
                onClick={() => { if(confirm("保存されたデータをすべて削除しますか？")) deleteEntireDB().then(() => window.location.reload()); }} 
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-400 text-[10px] font-black rounded-2xl hover:text-red-600 hover:bg-red-50 border border-slate-100 active:scale-95 transition-all shadow-sm group"
              >
                <ShieldAlert className="w-4 h-4 group-hover:animate-bounce" /> SYSTEM RESET
              </button>
            </div>

            <div className="mb-12 relative">
              <FileUploader onFilesSelected={handleFilesSelected} disabled={isAnalyzing} />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-lg rounded-[3rem] flex flex-col items-center justify-center z-30 border-2 border-blue-100 shadow-2xl animate-in fade-in duration-500">
                  <div className="relative">
                    <Loader2 className="w-20 h-20 animate-spin text-blue-600" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mt-8 mb-2">Analyzing Assets</h3>
                  <p className="text-sm font-bold text-blue-500 animate-pulse">{statusMessage}</p>
                </div>
              )}
            </div>

            {results.length > 0 && (
              <div className="space-y-12">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex flex-wrap justify-between items-center bg-white p-10 md:p-14 rounded-[3.5rem] border border-slate-100 shadow-2xl gap-8">
                    <div className="flex items-center gap-8">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-blue-200 shadow-2xl">
                        <Download className="w-10 h-10 text-white" />
                      </div>
                      <div>
                         <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Export<br/>Center</h2>
                         <div className="flex items-center gap-2 mt-2">
                           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                           <p className="text-[11px] font-black text-green-600 uppercase tracking-widest">{results.filter(r => r.status === 'success').length} records ready for Money Forward</p>
                         </div>
                      </div>
                    </div>
                    <button 
                      onClick={exportZip} 
                      disabled={!results.some(r => r.status === 'success')} 
                      className="px-16 py-8 bg-slate-900 text-white font-black rounded-[2.5rem] hover:bg-black shadow-2xl active:translate-y-1 active:shadow-sm transition-all flex items-center gap-4 border-b-8 border-black group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
                      CSV & 画像一括保存 (ZIP)
                    </button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <ReceiptGrid 
                    results={results} 
                    onUpdate={updateResultData} 
                    onDelete={(id) => setResults(prev => prev.filter(r => r.id !== id))} 
                    onRetry={() => {}} 
                    onSelect={(id) => {
                      const idx = results.findIndex(r => r.id === id);
                      if (idx !== -1) setReviewingIndex(idx);
                    }} 
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {reviewingIndex !== null && results[reviewingIndex] && (
        <IndividualReview
          result={results[reviewingIndex]}
          currentIndex={reviewingIndex}
          totalCount={results.length}
          onClose={() => setReviewingIndex(null)}
          onPrev={() => setReviewingIndex(p => p !== null && p > 0 ? p - 1 : p)}
          onNext={() => setReviewingIndex(p => p !== null && p < results.length - 1 ? p + 1 : p)}
          onUpdate={updateResultData}
        />
      )}
      
      {/* ▼▼▼ 追加：AIチャットアシスタント ▼▼▼ */}
      <ChatAssistant />
    </div>
  );
};

export default App;