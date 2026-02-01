import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  CheckCircle, 
  Maximize2, 
  ImageIcon, 
  Loader2, 
  Users, 
  CreditCard, 
  Banknote,
  MessageSquare,
  Plus
} from 'lucide-react';
import { AnalysisResult, ReceiptData } from '../types';
import { MF_ACCOUNT_ITEMS, DEFAULT_MEMBERS } from '../constants';

interface ReceiptGridProps {
  results: AnalysisResult[];
  onUpdate: (id: string, data: ReceiptData) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect: (id: string) => void;
}

const ReceiptCard: React.FC<{
  result: AnalysisResult;
  onUpdate: (id: string, data: ReceiptData) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  participantPool: string[];
  setParticipantPool: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ result, onUpdate, onDelete, onSelect, participantPool, setParticipantPool }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [newMember, setNewMember] = useState("");

  useEffect(() => {
    if (result.frameBlob) {
      const url = URL.createObjectURL(result.frameBlob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [result.frameBlob, result.id]);

  if (result.status === 'processing') {
    return (
      <div className="bg-white rounded-[2.5rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center animate-pulse shadow-inner">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Analyzing Data...</p>
      </div>
    );
  }

  const data = result.data || {} as ReceiptData;
  const isMeeting = data.accountTitle === '会議費';
  const isEntertainment = data.accountTitle === '接待交際費';

  const handleChange = (field: keyof ReceiptData, value: any) => {
    onUpdate(result.id, { ...data, [field]: value });
  };

  const currentParticipants = data.participants 
    ? data.participants.split(',').map(n => n.trim()).filter(Boolean)
    : [];

  const toggleParticipant = (name: string) => {
    let newList = currentParticipants.includes(name)
      ? currentParticipants.filter(n => n !== name)
      : [...currentParticipants, name];
    onUpdate(result.id, { 
      ...data, 
      participants: newList.join(', '),
      peopleCount: Math.max(1, newList.length)
    });
  };

  const handleAddNewMember = () => {
    const name = newMember.trim();
    if (!name) return;
    
    if (!participantPool.includes(name)) {
      const newPool = [...participantPool, name];
      setParticipantPool(newPool);
      localStorage.setItem('mf_participant_pool', JSON.stringify(newPool));
    }

    if (!currentParticipants.includes(name)) {
      const newList = [...currentParticipants, name];
      onUpdate(result.id, { 
        ...data, 
        participants: newList.join(', '),
        peopleCount: Math.max(1, newList.length)
      });
    }
    setNewMember("");
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] group">
      <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100 group-hover:bg-slate-100/50 transition-colors">
        <div className="flex items-center gap-3">
          {result.status === 'success' ? (
            <div className="bg-green-100 p-1.5 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-600">!</div>
          )}
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-tight truncate max-w-[200px]">{result.fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onSelect(result.id)} className="p-2.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(result.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row h-full">
        <div 
          className="w-full sm:w-52 h-56 sm:h-auto bg-slate-950 flex-shrink-0 relative group cursor-pointer flex items-center justify-center overflow-hidden" 
          onClick={() => onSelect(result.id)}
        >
          {thumbUrl ? (
            <img src={thumbUrl} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-700" alt="Receipt Thumb" />
          ) : (
            <ImageIcon className="w-10 h-10 text-slate-800" />
          )}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <Maximize2 className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="p-8 flex-grow space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Merchant Name</label>
              <input 
                type="text" 
                value={data.shopName || ''} 
                onChange={(e) => handleChange('shopName', e.target.value)} 
                className="w-full text-lg font-black border-b-2 border-slate-50 focus:border-blue-500 outline-none pb-1 transition-all bg-transparent" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Date</label>
              <input 
                type="date" 
                value={data.transactionDate || ''} 
                onChange={(e) => handleChange('transactionDate', e.target.value)} 
                className="w-full text-sm font-bold border-b-2 border-slate-50 focus:border-blue-500 outline-none pb-1 transition-all bg-transparent" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Total Amount</label>
              <div className="flex items-center border-b-2 border-slate-50 focus-within:border-blue-500 transition-all">
                <span className="text-sm font-black text-blue-600 mr-2">¥</span>
                <input 
                  type="number" 
                  value={data.amount || 0} 
                  onChange={(e) => handleChange('amount', parseInt(e.target.value) || 0)} 
                  className="w-full text-lg font-black text-blue-600 outline-none bg-transparent" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Account Category</label>
              <select 
                value={data.accountTitle || ''} 
                onChange={(e) => handleChange('accountTitle', e.target.value)} 
                className="w-full text-[11px] font-black bg-slate-50 border-none rounded-xl px-4 py-3 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100 transition-all"
              >
                {MF_ACCOUNT_ITEMS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Payment</label>
              <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => handleChange('paymentMethod', 'cash')} 
                  className={`flex-1 py-2 flex items-center justify-center transition-all rounded-lg ${data.paymentMethod === 'cash' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Banknote className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleChange('paymentMethod', 'card')} 
                  className={`flex-1 py-2 flex items-center justify-center transition-all rounded-lg ${data.paymentMethod === 'card' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CreditCard className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            {isMeeting ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users className="w-4 h-4" /> Participants
                  </label>
                  <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg shadow-blue-100">
                    {data.peopleCount || 1} Person
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {participantPool.map(name => (
                    <button 
                      key={name} 
                      onClick={() => toggleParticipant(name)} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${currentParticipants.includes(name) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-50 text-slate-400 hover:border-blue-200'}`}
                    >
                      {name}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 ml-auto">
                    <input 
                      type="text" 
                      placeholder="+" 
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewMember()}
                      className="text-[11px] w-14 outline-none bg-transparent font-black placeholder:text-slate-300"
                    />
                    <button onClick={handleAddNewMember} className="text-blue-600 hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> {isEntertainment ? "Entertainment Purpose" : "Analysis Remarks"}
                </label>
                <input 
                  type="text" 
                  value={data.remarks || ''} 
                  onChange={(e) => handleChange('remarks', e.target.value)} 
                  placeholder={isEntertainment ? "Who and Why?" : "Optional notes..."} 
                  className="w-full text-xs font-bold border-b-2 border-slate-50 focus:border-blue-500 outline-none pb-1 transition-all bg-transparent placeholder:text-slate-200" 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiptGrid: React.FC<ReceiptGridProps> = ({ results, onUpdate, onDelete, onRetry, onSelect }) => {
  const [participantPool, setParticipantPool] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mf_participant_pool');
    setParticipantPool(saved ? JSON.parse(saved) : DEFAULT_MEMBERS);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {results.map((result) => (
        <ReceiptCard 
          key={result.id} 
          result={result} 
          onUpdate={onUpdate} 
          onDelete={onDelete} 
          onSelect={onSelect} 
          participantPool={participantPool}
          setParticipantPool={setParticipantPool}
        />
      ))}
    </div>
  );
};

export default ReceiptGrid;