import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles, X, Bot, Key, Eye, EyeOff } from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import { extractTransactionsFromPDF, generateDemoTransactions } from '../../utils/pdfExtractor';
import { normalizeWithAI } from '../../utils/aiNormalizer';
import type { Transaction, UploadedFile } from '../../types';

const PROCESSING_STAGES_CONFIG = [
  { label: 'Parsing PDFs', description: 'Extracting text and transaction data from uploaded statements' },
  { label: 'Normalizing Transactions', description: 'Standardizing dates, amounts, and removing duplicates' },
  { label: 'AI Categorization', description: 'Classifying each transaction by account type and category' },
  { label: 'Accrual Adjustments', description: 'Applying accounts receivable, payable, and prepaid adjustments' },
  { label: 'Computing Financials', description: 'Building P&L, Balance Sheet, and Tax Summary' },
  { label: 'Reconciliation Check', description: 'Verifying balances and flagging discrepancies' },
];

const API_KEY_STORAGE_KEY = 'fintrack_claude_api_key';

export default function UploadZone() {
  const {
    businessInfo, addFiles, uploadedFiles, updateFileStatus,
    setStep, setTransactions, setProcessing, setProcessingStages, computeFinancials,
  } = useFinancialStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileObjects, setFileObjects] = useState<Map<string, File>>(new Map());

  // API key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newMeta: UploadedFile[] = [];
    const newMap = new Map<string, File>();

    for (const f of acceptedFiles) {
      const id = crypto.randomUUID();
      newMeta.push({ id, name: f.name, size: f.size, status: 'pending' });
      newMap.set(id, f);
    }

    addFiles(newMeta);
    setFileObjects(prev => new Map([...prev, ...newMap]));
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFileObjects(prev => { const m = new Map(prev); m.delete(id); return m; });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: isAnalyzing,
  });

  const saveApiKey = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    setShowKeyInput(false);
  };

  const startProcessing = () => {
    setIsAnalyzing(true);
    setProcessing(true);
    setStep('processing');
    setProcessingStages(PROCESSING_STAGES_CONFIG.map(s => ({ ...s, progress: 0, done: false })));
  };

  const handleUseDemoData = () => {
    if (!businessInfo) return;
    startProcessing();
    const txns = generateDemoTransactions(businessInfo.taxYear, businessInfo.name);
    setTransactions(txns);
    computeFinancials();
  };

  // Extract transactions from all uploaded PDFs
  const extractAll = async (): Promise<Transaction[]> => {
    const allTransactions: Transaction[] = [];
    for (const uf of uploadedFiles) {
      const file = fileObjects.get(uf.id);
      if (!file) continue;
      updateFileStatus(uf.id, 'processing');
      try {
        const txns = await extractTransactionsFromPDF(file, businessInfo!.taxYear);
        if (txns.length > 0) {
          allTransactions.push(...txns);
          updateFileStatus(uf.id, 'done', { transactionCount: txns.length });
        } else {
          updateFileStatus(uf.id, 'error', { errorMessage: 'No transactions detected — try demo data' });
        }
      } catch (err) {
        console.error('PDF parse error:', err);
        updateFileStatus(uf.id, 'error', { errorMessage: 'Could not read PDF' });
      }
    }
    return allTransactions;
  };

  const handleAnalyzeLocally = async () => {
    if (!businessInfo || uploadedFiles.length === 0) return;
    startProcessing();

    const allTransactions = await extractAll();

    if (allTransactions.length === 0) {
      const demo = generateDemoTransactions(businessInfo.taxYear, businessInfo.name);
      setTransactions(demo);
    } else {
      setTransactions(allTransactions);
    }
    computeFinancials();
  };

  const handleAnalyzeWithAI = async () => {
    if (!businessInfo || uploadedFiles.length === 0) return;
    const key = apiKey.trim();
    if (!key) {
      setShowKeyInput(true);
      return;
    }

    startProcessing();
    setAiProgress(null);

    const allTransactions = await extractAll();

    if (allTransactions.length === 0) {
      const demo = generateDemoTransactions(businessInfo.taxYear, businessInfo.name);
      setTransactions(demo);
      computeFinancials();
      return;
    }

    try {
      const normalized = await normalizeWithAI(allTransactions, key, (done, total) => {
        setAiProgress({ done, total });
      });
      setTransactions(normalized);
    } catch (err) {
      console.error('AI normalization error:', err);
      // Fall back to locally-extracted (non-AI) transactions on error
      setTransactions(allTransactions);
    }

    setAiProgress(null);
    computeFinancials();
  };

  const canAnalyze = uploadedFiles.length > 0 && !isAnalyzing;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Upload Bank Statements</h1>
          <p className="text-slate-400">
            Upload PDF bank statements for{' '}
            <span className="text-blue-400 font-medium">{businessInfo?.name}</span> — Tax Year{' '}
            <span className="text-blue-400 font-medium">{businessInfo?.taxYear}</span>
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Upload all 12 monthly statements for complete analysis, or use demo data to explore the app.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900'}
            ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragActive ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
              <Upload className={`w-8 h-8 transition-colors ${isDragActive ? 'text-blue-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">
                {isDragActive ? 'Drop your PDFs here' : 'Drag & drop bank statements'}
              </p>
              <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>PDF format only</span>
              <span>·</span>
              <span>Multiple files supported</span>
              <span>·</span>
              <span>Up to 12 statements</span>
            </div>
          </div>
        </div>

        {/* File list */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-slate-200 text-sm flex-1 truncate">{file.name}</span>
                <span className="text-slate-500 text-xs">{(file.size / 1024).toFixed(0)} KB</span>
                {file.status === 'pending'     && <div className="w-2 h-2 rounded-full bg-slate-500" />}
                {file.status === 'processing'  && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {file.status === 'done'        && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {file.status === 'error'       && <AlertCircle className="w-4 h-4 text-red-400" />}
                {file.transactionCount !== undefined && (
                  <span className="text-emerald-400 text-xs">{file.transactionCount} txns</span>
                )}
                {file.errorMessage && (
                  <span className="text-red-400 text-xs truncate max-w-40">{file.errorMessage}</span>
                )}
                {!isAnalyzing && file.status === 'pending' && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(file.id); }}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Claude API key input (collapsible) */}
        {showKeyInput && (
          <div className="mt-4 bg-slate-800/80 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">Claude API Key</span>
              <span className="text-slate-500 text-xs ml-auto">Stored locally in your browser only</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-9"
                />
                <button
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowKeyInput(false)}
                className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Get your API key at console.anthropic.com · Used only for AI normalization
            </p>
          </div>
        )}

        {/* AI progress bar */}
        {aiProgress && (
          <div className="mt-3 bg-slate-800/60 rounded-lg px-4 py-3 border border-purple-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-purple-300 text-xs font-medium flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Claude normalizing transactions...
              </span>
              <span className="text-slate-400 text-xs">{aiProgress.done} / {aiProgress.total}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(aiProgress.done / aiProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {/* Analyze Locally */}
          <button
            onClick={handleAnalyzeLocally}
            disabled={!canAnalyze}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-all border border-slate-600 disabled:border-slate-700"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Analyze Locally ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
          </button>

          {/* Analyze using AI */}
          <button
            onClick={handleAnalyzeWithAI}
            disabled={!canAnalyze}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none border border-purple-500 disabled:border-slate-700"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Analyze using AI
          </button>

          {/* Use Demo Data */}
          <button
            onClick={handleUseDemoData}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Use Demo Data
          </button>
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-600 text-xs">
            Locally: parsed in your browser — nothing uploaded to any server
          </p>
          <button
            onClick={() => setShowKeyInput(v => !v)}
            className="flex items-center gap-1 text-slate-600 hover:text-purple-400 text-xs transition-colors"
          >
            <Key className="w-3 h-3" />
            {apiKey ? 'Change API key' : 'Set AI API key'}
          </button>
        </div>
      </div>
    </div>
  );
}
