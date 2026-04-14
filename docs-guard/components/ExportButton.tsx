import React, { useState } from "react";
import { Download, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, className }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleExport = async () => {
    setStatus('loading');
    try {
      await onExport();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      className={cn(
        "group relative h-16 w-full flex items-center justify-center overflow-hidden rounded-[24px] transition-all duration-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100 shadow-2xl",
        status === 'idle' && "bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 hover:shadow-indigo-200/50",
        status === 'loading' && "bg-slate-100 cursor-wait shadow-none",
        status === 'success' && "bg-emerald-500 shadow-emerald-200/50",
        className
      )}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      {/* Content Container */}
      <div className="relative flex items-center gap-3 z-10 transition-all duration-500">
        {status === 'idle' && (
          <>
            <Download className="w-5 h-5 text-white animate-bounce-custom" />
            <span className="text-white text-sm font-black tracking-[0.1em] uppercase">
              Secure Export
            </span>
            <Sparkles className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
          </>
        )}
        
        {status === 'loading' && (
          <>
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="text-indigo-600 text-sm font-black tracking-[0.1em] uppercase">
              Processing...
            </span>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
               <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-sm font-black tracking-[0.1em] uppercase">
              Export Complete!
            </span>
          </>
        )}
      </div>
      
      {/* Animated Shine Effect */}
      <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[45deg] group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>

      {/* Success Pulse */}
      {status === 'success' && (
        <span className="absolute inset-0 bg-emerald-400 animate-ping opacity-25 pointer-events-none"></span>
      )}

      <style jsx>{`
        @keyframes bounce-custom {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.05); }
        }
        .animate-bounce-custom {
          animation: bounce-custom 2s infinite ease-in-out;
        }
        
        @keyframes zoom-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in {
            animation: zoom-in 0.3s ease-out forwards;
        }
      `}</style>
    </button>
  );
};
