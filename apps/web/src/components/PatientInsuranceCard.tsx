
import { User, Shield, Info, Activity, AlertTriangle } from 'lucide-react';

interface PatientInsuranceCardProps {
    patient: any;
    compact?: boolean;
}

export default function PatientInsuranceCard({ patient, compact = false }: PatientInsuranceCardProps) {
    if (!patient) return null;

    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            {/* Card Header */}
            <div className={`bg-slate-800/80 ${compact ? 'p-4' : 'p-6'} border-b border-slate-700 flex justify-between items-center`}>
                <div className="flex items-center gap-4">
                    <div className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-800`}>
                        <User className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-cyan-400`} />
                    </div>
                    <div>
                        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-white uppercase tracking-tight`}>
                            {patient.firstName} {patient.lastName}
                        </h2>
                        <p className="text-cyan-500 text-xs font-bold">MBO: {patient.mbo}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${patient.policyStatus === 'ACTIVE' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                        OSIGURANJE {patient.policyStatus}
                    </span>
                </div>
            </div>

            {/* Card Body */}
            <div className={`${compact ? 'p-4 gap-6' : 'p-8 gap-12'} grid md:grid-cols-2`}>
                {/* Left Column: Identity */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800 pb-2">
                        <Info className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Identifikacijski Podaci</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] text-slate-500 block mb-1">DATUM ROĐENJA</label>
                            <div className="text-sm font-bold text-slate-200">
                                {new Date(patient.birthDate).toLocaleDateString('hr-HR')}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] text-slate-500 block mb-1">SPOL</label>
                            <div className="text-sm font-bold text-slate-200">
                                {patient.gender || 'M'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-l-2 border-amber-500 pl-2">Statusne Oznake</div>
                        <div className="flex flex-wrap gap-3">
                            {patient.isVeteran && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all bg-blue-900/40 border-blue-600 text-blue-300">
                                    <span className="text-[10px] font-black uppercase">HB (Veteran)</span>
                                </div>
                            )}
                            {patient.weaponHolder && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all bg-red-900/40 border-red-600 text-red-300">
                                    <span className="text-[10px] font-black uppercase">VO (Oružje)</span>
                                </div>
                            )}
                            {patient.isIsolated && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all bg-amber-900/40 border-amber-600 text-amber-300">
                                    <span className="text-[10px] font-black uppercase">IC (Izolacija)</span>
                                </div>
                            )}
                            {!patient.isVeteran && !patient.weaponHolder && !patient.isIsolated && (
                                <div className="text-xs text-slate-600 italic">Nema posebnih oznaka</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Policies */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800 pb-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Osiguranje i Police (HZZO)</span>
                    </div>

                    <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                            <span>OBVEZNO (OZO)</span>
                            <span className="text-green-500">AKTIVNO</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[8px] text-slate-600 block">PERIOD DO</label>
                                <div className="text-xs text-white font-bold">31.12.2026.</div>
                            </div>
                            <div>
                                <label className="text-[8px] text-slate-600 block">KATEGORIJA</label>
                                <div className="text-xs text-white font-bold">{patient.insuranceCategory || 'AO'}</div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-xl space-y-4 transition-all ${patient.hasSupplemental ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-slate-950/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-indigo-400">DOPUNSKO (DZO)</span>
                            <span className={`text-[10px] font-black ${patient.hasSupplemental ? 'text-indigo-400' : 'text-slate-700'}`}>
                                {patient.hasSupplemental ? 'AKTIVNO' : 'NEMA'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[8px] text-slate-600 block uppercase">Broj police</label>
                                <div className="text-xs text-slate-400 italic">{patient.policyNumber || '-'}</div>
                            </div>
                            <div>
                                <label className="text-[8px] text-slate-600 block uppercase">Vrijedi do</label>
                                <div className="text-xs text-slate-400">{patient.validUntil ? new Date(patient.validUntil).toLocaleDateString('hr-HR') : '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Footer */}
            <div className="bg-slate-800/50 px-6 py-3 border-t border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                    <AlertTriangle className="h-3 w-3" />
                    ZADNJA PROVJERA: {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
}
