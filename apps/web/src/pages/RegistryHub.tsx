import { useState, useEffect } from 'react';
import {
    Search,
    BookOpen,
    Pill,
    Stethoscope,
    ShieldCheck,
    AlertTriangle,
    FileText,
    Database,
    RefreshCw,
    CheckCircle2,
    Lock
} from 'lucide-react';
import { searchMKB10, searchMedication, getRegistryRecords } from '../services/api';

const REGISTRY_CATEGORIES = [
    { id: 'clinical', name: 'Clinical Registries', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'pharmacy', name: 'Pharmacy (G_export)', icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'billing', name: 'Billing & Exemptions', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'technical', name: 'Technical & Error Codes', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const REGISTRIES = [
    { id: 'mkb10', name: 'MKB-10 Diagnoses', cat: 'clinical', description: 'International Classification of Diseases', count: '39,000+', verified: true },
    { id: 'activities', name: 'Djelatnosti u ZZ', cat: 'clinical', description: 'HZZO Medical Activities/Departments', count: '315', verified: true },
    { id: 'notices', name: 'Pisma zdravstvu', cat: 'clinical', description: 'Official HZZO communications', count: '45', verified: true },
    { id: 'meds', name: 'Lista lijekova (G_export)', cat: 'pharmacy', description: 'Dual list (Basic/Supplemental) with Generics', count: '8,500+', verified: true },
    { id: 'ins_cat', name: 'Kategorija osiguranika', cat: 'billing', description: 'Insurance class mapping', count: '12', verified: true },
    { id: 'exemption_diag', name: 'Dijagnoze (100% Coverage)', cat: 'billing', description: 'Diagnoses exempt from copayment', count: '2,350+', verified: true },
    { id: 'exemption_codes', name: 'Šifre oslobađanja', cat: 'billing', description: 'Reasons for cost exemption', count: '24', verified: true },
    { id: 'invoice_types', name: 'Vrste računa', cat: 'billing', description: 'HZZO Billing form types (F1, F2...)', count: '8', verified: true },
    { id: 'inv_status', name: 'Statusi računa', cat: 'billing', description: 'Lifecycle of billing messages', count: '6', verified: true },
    { id: 'err_weight', name: 'Težina grešaka', cat: 'technical', description: 'Error severity classification', count: '3', verified: true },
    { id: 'soap_err', name: 'Greške web servisa', cat: 'technical', description: 'Technical SOAP/REST fault codes', count: '200+', verified: true },
];

export default function RegistryHub() {
    const [selectedCat, setSelectedCat] = useState('clinical');
    const [selectedReg, setSelectedReg] = useState('mkb10');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState(new Date().toLocaleString());

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                // Map Reg ID to API Type
                const typeMap: { [key: string]: string } = {
                    mkb10: 'mkb10',
                    meds: 'meds',
                    activities: 'ACTIVITY',
                    notices: 'NOTICES',
                    ins_cat: 'INS_CAT',
                    exemption_diag: 'EXEMPT_DIAG',
                    exemption_codes: 'EXEMPT_CODE',
                    invoice_types: 'INV_TYPE',
                    inv_status: 'INV_STATUS',
                    err_weight: 'ERR_WEIGHT',
                    soap_err: 'SOAP_ERR'
                };

                const data = await getRegistryRecords(typeMap[selectedReg] || selectedReg, searchQuery);
                setResults(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedReg]);

    const activeRegistries = REGISTRIES.filter(r => r.cat === selectedCat);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Database className="h-6 w-6 text-emerald-600" />
                        Registry Hub
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">HZZO Unified Codebooks</p>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-8">
                    {REGISTRY_CATEGORIES.map(cat => (
                        <div key={cat.id}>
                            <h2 className={`px-2 mb-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 ${cat.color}`}>
                                <cat.icon className="h-3 w-3" />
                                {cat.name}
                            </h2>
                            <div className="space-y-1">
                                {REGISTRIES.filter(r => r.cat === cat.id).map(reg => (
                                    <button
                                        key={reg.id}
                                        onClick={() => {
                                            setSelectedCat(cat.id);
                                            setSelectedReg(reg.id);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedReg === reg.id
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span className="truncate">{reg.name}</span>
                                        {reg.verified && (
                                            <CheckCircle2 className={`h-3 w-3 ${selectedReg === reg.id ? 'text-emerald-400' : 'text-emerald-500 opacity-0 group-hover:opacity-100'}`} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-2">
                        <span>System Status</span>
                        <span className="text-emerald-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Connected
                        </span>
                    </div>
                    <button
                        onClick={() => setLastSync(new Date().toLocaleString())}
                        className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Force HZZO Sync
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-xl">
                            {(() => {
                                const Icon = REGISTRY_CATEGORIES.find(c => c.id === selectedCat)?.icon || BookOpen;
                                return <Icon className="h-6 w-6 text-slate-600" />;
                            })()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                {REGISTRIES.find(r => r.id === selectedReg)?.name}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {REGISTRIES.find(r => r.id === selectedReg)?.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Last Synchronized</p>
                            <p className="text-sm font-bold text-slate-700">{lastSync}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-wider">HZZO Verified</span>
                        </div>
                    </div>
                </header>

                {/* Search & List */}
                <div className="flex-1 overflow-hidden flex flex-col p-8 gap-6">
                    {/* Search Bar */}
                    <div className="relative group max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                        <input
                            type="text"
                            placeholder={`Search ${REGISTRIES.find(r => r.id === selectedReg)?.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-900 font-medium"
                        />
                    </div>

                    {/* Table */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-32">Code</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Name / Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-40 text-right">Properties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic">
                                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-20 text-slate-900" />
                                                Loading HZZO Registry records...
                                            </td>
                                        </tr>
                                    ) : results.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center">
                                                <BookOpen className="h-8 w-8 mx-auto mb-4 text-slate-300" />
                                                <p className="text-slate-500 font-medium">No records found matching your search.</p>
                                                <p className="text-xs text-slate-400 mt-1 italic">Type something to search the local database.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        results.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                        {item.code || item.atcCode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">
                                                        {item.name}
                                                    </p>
                                                    {item.genericName && (
                                                        <p className="text-xs text-slate-500 mt-0.5 italic">
                                                            {item.genericName}
                                                        </p>
                                                    )}
                                                    {item.description && selectedReg === 'exemption_diag' && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-[10px] bg-purple-100 text-purple-700 font-black px-1.5 py-0.5 rounded uppercase">
                                                                Exemption Reason: Code {item.description}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.description && selectedReg !== 'exemption_diag' && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col gap-1 items-end">
                                                        {item.isSupplemental !== undefined && (
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${item.isSupplemental
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}>
                                                                {item.isSupplemental ? 'Supplemental List' : 'Basic List'}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {item.id?.substring(0, 8)}...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <footer className="h-10 bg-slate-900 flex items-center justify-between px-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                    <div className="flex items-center gap-4">
                        <span>Database: SQLITE-LOCAL</span>
                        <div className="h-3 w-px bg-slate-800" />
                        <span>Records: {REGISTRIES.find(r => r.id === selectedReg)?.count}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            <span>Read Only Mode (Production Sync)</span>
                        </div>
                        <div className="h-3 w-px bg-slate-800" />
                        <span className="text-slate-400">Ver. 2024.12.0</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
