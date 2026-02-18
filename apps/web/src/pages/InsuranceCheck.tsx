
import { useState } from 'react';
import { Search, Shield, User, Activity, AlertTriangle, Save, CheckCircle, Info } from 'lucide-react';
import { getExtendedInsurance, updatePatientInsurance, searchInsuranceCategories } from '../services/api';

export default function InsuranceCheck() {
    const [mbo, setMbo] = useState('');
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!mbo) return;
        setLoading(true);
        try {
            const data = await getExtendedInsurance(mbo);
            setPatient(data);
            setFormData(data);
            setIsEditing(false);
        } catch (err: any) {
            alert('Greška pri dohvaćanju: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setActionLoading(true);
        try {
            // Simulated sync with CEZIH + Local DB update
            await updatePatientInsurance(patient.mbo, formData);
            setPatient(formData);
            setIsEditing(false);
            alert('✅ Podaci uspješno usklađeni s HZZO-om (osigInfo update)');
        } catch (err: any) {
            alert('Greška pri spremanju: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-3">
                        <Shield className="h-8 w-8 text-cyan-500" />
                        <h1 className="text-3xl font-bold tracking-tighter text-white">HZZO INSURANCE VERIFICATION</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Standalone SKZZ Compliance Terminal v2.1</p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Pretraži MBO (npr. 123456789)..."
                        value={mbo}
                        onChange={(e) => setMbo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-2xl"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-3 top-2.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Dohvaćam...' : 'VERIFICIRAJ'}
                    </button>
                </form>

                {patient ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                            {/* Card Header */}
                            <div className="bg-slate-800/80 p-6 border-b border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-800">
                                        <User className="h-6 w-6 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        value={formData.firstName}
                                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-cyan-500"
                                                    />
                                                    <input
                                                        value={formData.lastName}
                                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-cyan-500"
                                                    />
                                                </div>
                                            ) : (
                                                `${patient.firstName} ${patient.lastName}`
                                            )}
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
                            <div className="p-8 grid md:grid-cols-2 gap-12">
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
                                                {isEditing ? (
                                                    <select
                                                        value={formData.gender}
                                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                        className="bg-slate-950 border border-slate-700 rounded text-xs px-1"
                                                    >
                                                        <option value="M">M</option>
                                                        <option value="F">F</option>
                                                    </select>
                                                ) : (patient.gender || 'M')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-l-2 border-amber-500 pl-2">Statusne Oznake</div>
                                        <div className="flex flex-wrap gap-3">
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${formData.isVeteran ? 'bg-blue-900/40 border-blue-600 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isVeteran}
                                                    onChange={e => setFormData({ ...formData, isVeteran: e.target.checked })}
                                                    disabled={!isEditing}
                                                    className="accent-blue-500 h-4 w-4"
                                                />
                                                <span className="text-[10px] font-black uppercase">HB (Veteran)</span>
                                            </div>
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${formData.weaponHolder ? 'bg-red-900/40 border-red-600 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.weaponHolder}
                                                    onChange={e => setFormData({ ...formData, weaponHolder: e.target.checked })}
                                                    disabled={!isEditing}
                                                    className="accent-red-500 h-4 w-4"
                                                />
                                                <span className="text-[10px] font-black uppercase">VO (Oružje)</span>
                                            </div>
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${formData.isIsolated ? 'bg-amber-900/40 border-amber-600 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isIsolated}
                                                    onChange={e => setFormData({ ...formData, isIsolated: e.target.checked })}
                                                    disabled={!isEditing}
                                                    className="accent-amber-500 h-4 w-4"
                                                />
                                                <span className="text-[10px] font-black uppercase">IC (Izolacija)</span>
                                            </div>
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
                                                {isEditing ? (
                                                    <input
                                                        value={formData.insuranceCategory}
                                                        onChange={e => setFormData({ ...formData, insuranceCategory: e.target.value })}
                                                        className="bg-slate-800 border border-slate-700 rounded text-[10px] px-1 w-full text-white"
                                                    />
                                                ) : (
                                                    <div className="text-xs text-white font-bold">{patient.insuranceCategory || 'AO'}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-4 border rounded-xl space-y-4 transition-all ${formData.hasSupplemental ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-slate-950/50 border-slate-800'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-indigo-400">DOPUNSKO (DZO)</span>
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={formData.hasSupplemental}
                                                    onChange={e => setFormData({ ...formData, hasSupplemental: e.target.checked })}
                                                    className="accent-indigo-500"
                                                />
                                            ) : (
                                                <span className={`text-[10px] font-black ${patient.hasSupplemental ? 'text-indigo-400' : 'text-slate-700'}`}>
                                                    {patient.hasSupplemental ? 'AKTIVNO' : 'NEMA'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] text-slate-600 block uppercase">Broj police</label>
                                                {isEditing ? (
                                                    <input
                                                        value={formData.policyNumber}
                                                        onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
                                                        className="bg-slate-800 border border-slate-700 rounded text-[10px] px-1 w-full text-white"
                                                    />
                                                ) : (
                                                    <div className="text-xs text-slate-400 italic">{patient.policyNumber || '-'}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-slate-600 block uppercase">Vrijedi do</label>
                                                <div className="text-xs text-slate-400">{new Date(patient.validUntil).toLocaleDateString('hr-HR')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Actions */}
                            <div className="bg-slate-800/50 p-6 border-t border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                                    <AlertTriangle className="h-3 w-3" />
                                    ZADNJA PROVJERA: {new Date().toLocaleString()}
                                </div>
                                <div className="flex gap-3">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => { setIsEditing(false); setFormData(patient); }}
                                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                            >
                                                ODUSTANI
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={actionLoading}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-xs font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                            >
                                                <Save className="h-4 w-4" />
                                                {actionLoading ? 'SPREMAM...' : 'SPREMI PROMJENE'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-xs font-black transition-all"
                                        >
                                            <Activity className="h-4 w-4" />
                                            UREDI PODATKE
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4">
                        <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center">
                            <Activity className="h-10 w-10 text-slate-800" />
                        </div>
                        <p className="text-sm">Unesite MBO pacijenta za provjeru statusa osiguranja</p>
                    </div>
                )}
            </div>
        </div>
    );
}
