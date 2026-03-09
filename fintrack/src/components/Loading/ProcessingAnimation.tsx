import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { ProcessingStage } from '../../types';

interface Props {
  stages: ProcessingStage[];
  onComplete: () => void;
}

const STAGE_DURATION = 2200; // ms per stage

export default function ProcessingAnimation({ stages, onComplete }: Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let stageTimeout: ReturnType<typeof setTimeout>;

    const advanceProgress = () => {
      setStageProgress(0);
      progressInterval = setInterval(() => {
        setStageProgress(p => {
          if (p >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return p + 2;
        });
      }, STAGE_DURATION / 50);

      stageTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        setCurrentStage(prev => {
          const next = prev + 1;
          if (next >= stages.length) {
            setTimeout(onComplete, 400);
            return prev;
          }
          return next;
        });
      }, STAGE_DURATION);
    };

    advanceProgress();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage, stages.length]);

  const completedCount = currentStage;
  const totalProgress = Math.round(((currentStage + stageProgress / 100) / stages.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Analyzing Your Financials</h1>
          <p className="text-slate-400 text-sm">
            AI-powered extraction • GAAP-compliant • Accrual basis
          </p>
        </div>

        {/* Overall progress */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">Overall Progress</span>
            <span className="text-blue-400 font-bold text-lg">{totalProgress}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs mt-2">
            Step {Math.min(currentStage + 1, stages.length)} of {stages.length}
          </p>
        </div>

        {/* Stage list */}
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const isDone = idx < completedCount;
            const isActive = idx === currentStage;
            const isPending = idx > currentStage;

            return (
              <div
                key={stage.label}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border transition-all duration-500
                  ${isDone ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                  ${isActive ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10' : ''}
                  ${isPending ? 'bg-white/3 border-white/8 opacity-40' : ''}
                `}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isDone ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
                      <span className="text-slate-500 text-xs font-bold">{idx + 1}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm ${isDone ? 'text-emerald-300' : isActive ? 'text-white' : 'text-slate-500'}`}>
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="text-blue-400 text-xs font-mono">{stageProgress}%</span>
                    )}
                    {isDone && (
                      <span className="text-emerald-400 text-xs">Complete</span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${isDone ? 'text-emerald-400/70' : isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                    {stage.description}
                  </p>
                  {isActive && (
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-150"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Applying GAAP accrual adjustments • Categorizing with AI confidence scoring • Building 12-month trend analysis
        </p>
      </div>
    </div>
  );
}
