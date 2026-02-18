import React from 'react';
import { Calendar, Activity, Lock, XCircle, FileText, Send, ShieldCheck, Info } from 'lucide-react';

export interface StatusStep {
    name: string;
    code: string;
    timestamp?: string;
    isCompleted: boolean;
    isActive: boolean;
    isError?: boolean;
    payload?: string;
}

interface StatusTimelineProps {
    currentStatus: string;
    history?: { status: string; timestamp: string; payload?: string }[];
    onViewPayload?: (payload: string, label: string) => void;
}

const STATUS_CONFIG = [
    { id: 'INSURANCE_CHECK', label: 'PROVJERA POLICE', code: '05', Icon: ShieldCheck, color: 'text-purple-500', bgColor: 'bg-purple-500' },
    { id: 'POSLANA', label: 'UPUTNICA POSLANA', code: '10', Icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-500' },
    // { id: 'OSIG_INFO', label: 'PODACI OZO/DZO', code: '15', Icon: UserCog, color: 'text-cyan-500', bgColor: 'bg-cyan-500' }, // Removed per user request
    { id: 'REZERVIRANA', label: 'REZERVIRANA (SK)', code: '20', Icon: Calendar, color: 'text-orange-500', bgColor: 'bg-orange-500' },
    { id: 'U OBRADI', label: 'U OBRADI (PREUZETO)', code: '70', Icon: Activity, color: 'text-amber-500', bgColor: 'bg-amber-500' },
    { id: 'NALAZ_POSLAN', label: 'NALAZ POSLAN', code: '80', Icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-500' },
    // { id: 'RACUN_IZDAN', label: 'RAČUN IZDAN', code: '90', Icon: Receipt, color: 'text-pink-500', bgColor: 'bg-pink-500' }, // Removed per user request
    // { id: 'RACUN_POSLAN', label: 'RAČUN POSLAN (HZZO)', code: '95', Icon: Mail, color: 'text-rose-500', bgColor: 'bg-rose-500' }, // Removed per user request
    { id: 'REALIZIRANA', label: 'REALIZIRANA', code: '99', Icon: Lock, color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus, history = [], onViewPayload }) => {

    const steps = STATUS_CONFIG.map((config, index) => {
        const historicalEntry = history.find(h => h.status === config.id);
        const isActive = currentStatus === config.id;

        // logic to determine if a step is "completed" based on linear flow or history check (more robust)
        // If we have history for it, it's completed.
        // OR if currentStatus index is higher
        const currentIndex = STATUS_CONFIG.findIndex(s => s.id === currentStatus);
        const hasHistory = !!historicalEntry;
        const isCompleted = hasHistory || (index <= currentIndex && currentIndex !== -1);

        // Special handling for Cancelled
        if (currentStatus === 'STORNIRANA') {
            // If stornirana, only keep completed what was actually done
            // logic left as is for now
        }

        return {
            ...config,
            timestamp: historicalEntry?.timestamp,
            payload: historicalEntry?.payload,
            isActive: isActive || (config.id === 'REALIZIRANA' && currentStatus === 'REALIZIRANA'), // Keep lock green
            isCompleted
        };
    });

    return (
        <div className="flex flex-col space-y-0 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-700"></div>

            {steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-4 pb-6 group last:pb-0">
                    <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${step.isActive
                        ? `bg-gray-900 border-current ${step.color} shadow-[0_0_10px_rgba(var(--color-rgb),0.5)] scale-110`
                        : step.isCompleted
                            ? `${step.bgColor} border-transparent text-white`
                            : 'bg-gray-800 border-gray-600 text-gray-500'
                        }`}>
                        <step.Icon size={14} />
                    </div>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <div className={`text-[11px] font-bold tracking-tight uppercase ${step.isActive ? step.color : step.isCompleted ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                {step.label}
                                {step.isActive && currentStatus !== 'REALIZIRANA' && (
                                    <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>
                                )}
                            </div>

                            {step.payload && onViewPayload && (
                                <button
                                    onClick={() => onViewPayload(step.payload!, step.label)}
                                    className="opacity-70 group-hover:opacity-100 p-0.5 hover:bg-slate-700 rounded text-blue-400 transition-all"
                                    title="Inspect HL7/FHIR Payload"
                                >
                                    <Info size={14} />
                                </button>
                            )}
                        </div>

                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                            {step.timestamp ? new Date(step.timestamp).toLocaleString('hr-HR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : step.isActive ? 'Active State' : '-'}
                        </div>
                    </div>
                </div>
            ))}

            {currentStatus === 'STORNIRANA' && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center space-x-3 relative z-10">
                    <XCircle className="text-red-500 flex-shrink-0" size={20} />
                    <div>
                        <div className="text-xs text-red-200 font-bold uppercase">Uputnica Stornirana</div>
                        <div className="text-[10px] text-red-300/70">Processed by CEZIH Cancellation Service</div>
                    </div>
                </div>
            )}
        </div>
    );
};
