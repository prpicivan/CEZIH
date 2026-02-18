
import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, FileText, Search, X, Receipt, Send, CheckSquare, Square, Pill, Info, ShieldCheck, Download, AlertTriangle, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { getDashboardData, getFindingFHIR, sendBatchInvoices, getExtendedInsurance, searchMedication, issueRecommendation, issueInvoice, checkSkStatus, getCezihMessages, updatePatientInsurance, stornoDocument, searchInsuranceCategories } from '../services/api';
import { StatusTimeline } from '../components/StatusTimeline';

interface CezihLog {
    id: string;
    createdAt: string;
    type: string;
    status: string;
    patientMbo?: string;
    referralId?: string;
    invoiceId?: string;
    doctorName?: string;
    deptCode?: string;
    payload: string;
    response?: string;
    errorMessage?: string;
}

export default function CezihDashboard() {
    const [logs, setLogs] = useState<CezihLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedFhir, setSelectedFhir] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'referrals' | 'billing' | 'medication' | 'audit'>('referrals');
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [isEditingPatient, setIsEditingPatient] = useState(false);
    const [editFormData, setEditFormData] = useState<any>({});
    const [auditMessages, setAuditMessages] = useState<any[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [medicationSearch, setMedicationSearch] = useState('');
    const [medResults, setMedResults] = useState<any[]>([]);
    const [prescribingMed, setPrescribingMed] = useState<any>(null);
    const [prescribingPatient, setPrescribingPatient] = useState<any>(null);
    const [recommendationData, setRecommendationData] = useState({ dosage: '', duration: '', note: '' });
    const [skStatus, setSkStatus] = useState<any>(null);
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [insuranceCategories, setInsuranceCategories] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    useEffect(() => {
        fetchLogs();
        fetchSkStatus();
        loadCategories();
        const interval = setInterval(() => {
            fetchLogs();
            fetchSkStatus();
        }, 5000); // Live refresh
        return () => clearInterval(interval);
    }, [selectedDept]);

    const loadCategories = async () => {
        try {
            const cats = await searchInsuranceCategories();
            setInsuranceCategories(cats);
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const fetchSkStatus = async () => {
        try {
            const data = await checkSkStatus();
            setSkStatus(data);
        } catch (e) {
            console.error('Failed to fetch SK status', e);
        }
    };

    const fetchLogs = async () => {
        try {
            const data = await getDashboardData(selectedDept);
            setLogs(data as any);

            const messages = await getCezihMessages();
            setAuditMessages(messages);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePatient = async () => {
        setActionLoading(true);
        try {
            await updatePatientInsurance(selectedPatient.mbo, editFormData);
            setSelectedPatient({ ...selectedPatient, ...editFormData });
            setIsEditingPatient(false);
            fetchLogs();
            alert('✅ Patient data updated successfully');
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStorno = async (id: string, type: 'REFERRAL' | 'INVOICE' | 'REPORT') => {
        if (!confirm(`Are you sure you want to STORNO (cancel) this ${type.toLowerCase()}? This action is compliant with CEZIH 01_13 specification.`)) return;

        setActionLoading(true);
        try {
            await stornoDocument(id, type);
            alert('✅ Document stornirano uspješno.');
            fetchLogs();
        } catch (e: any) {
            alert('Storno Failed: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'U OBRADI':
                return <span className="px-2 py-1 rounded bg-amber-900 text-amber-400 text-xs font-bold border border-amber-800 tracking-tighter uppercase">U OBRADI</span>;
            case 'REZERVIRANA':
                return <span className="px-2 py-1 rounded bg-orange-900 text-orange-400 text-xs font-bold border border-orange-800 tracking-tighter uppercase">REZERVIRANA</span>;
            case 'REALIZIRANA':
                return <span className="px-2 py-1 rounded bg-emerald-900 text-emerald-400 text-xs font-bold border border-emerald-800 tracking-tighter uppercase">REALIZIRANA</span>;
            case 'POSLANA':
                return <span className="px-2 py-1 rounded bg-blue-900 text-blue-400 text-xs font-bold border border-blue-800 tracking-tighter uppercase">POSLANA</span>;
            case 'STORNIRANA':
                return <span className="px-2 py-1 rounded bg-gray-800 text-gray-500 text-xs font-bold border border-gray-700 tracking-tighter uppercase">STORNIRANA</span>;
            case 'ISTEKLA':
                return <span className="px-2 py-1 rounded bg-red-900 text-red-500 text-xs font-bold border border-red-800 tracking-tighter uppercase">ISTEKLA</span>;
            case 'STORNO_FAILED':
                return <span className="px-2 py-1 rounded bg-red-900/50 text-red-400 text-xs font-bold border border-red-900 tracking-tighter uppercase flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    STORNO FAILED
                </span>;
            case 'ERROR':
            case 'REJECTED':
            case 'FAILED':
                return <span className="px-2 py-1 rounded bg-red-900 text-red-400 text-xs font-bold border border-red-800 tracking-tighter group flex items-center gap-1 uppercase">
                    <AlertTriangle className="h-3 w-3" />
                    REJECTED
                </span>;
            default:
                return <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700 tracking-tighter uppercase">{status}</span>;
        }
    };

    const filteredLogs = logs.filter(l =>
        l.referralId?.includes(filter) ||
        l.patientMbo?.includes(filter) ||
        l.type.includes(filter)
    );

    const filteredBillingLogs = logs.flatMap(r => (r as any).invoices?.map((inv: any) => ({
        ...r,
        invoice: inv,
        id: inv.id // Use invoice ID as key for billing rows
    })) || []).filter((l: any) =>
        l.invoice?.id?.includes(filter) ||
        l.patientMbo?.includes(filter)
    );

    const handleShowFhir = async (referral: any) => {
        const appointmentWithFinding = referral.appointments?.find((a: any) => a.clinicalFinding);
        if (!appointmentWithFinding?.clinicalFinding?.id) return;

        setPreviewLoading(true);
        try {
            const fhirData = await getFindingFHIR(appointmentWithFinding.clinicalFinding.id);
            setSelectedFhir(fhirData);
        } catch (error) {
            console.error('Failed to load FHIR-compliant JSON', error);
            alert('Failed to load FHIR-compliant JSON');
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-900 min-h-screen text-slate-200 font-mono">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Activity className="h-6 w-6 text-green-500" />
                        <h1 className="text-xl font-bold text-white tracking-wide">CEZIH Central Dashboard (Admin)</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {skStatus && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded border border-slate-700">
                                <div className={`h-2 w-2 rounded-full ${skStatus.status === 'UP' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-tighter ${skStatus.status === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                                    SK System: {skStatus.status}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-green-500 font-bold">Live Connection</span>
                        </div>
                    </div>
                </div>

                {/* Tabs & Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex border-b border-slate-800">
                        <button
                            onClick={() => setActiveTab('referrals')}
                            className={`px-6 py-2 text-sm font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'referrals' ? 'border-green-500 text-green-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                REFERRALS
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`px-6 py-2 text-sm font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'billing' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                BILLING & HZZO
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('medication')}
                            className={`px-6 py-2 text-sm font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'medication' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Pill className="h-4 w-4" />
                                MEDICATION
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-6 py-2 text-sm font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'audit' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                AUDIT LOG
                            </div>
                        </button>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'referrals' ? 'Referral ID, MBO' : activeTab === 'billing' ? 'Invoice ID, MBO' : 'Medicine, ATC Code'}...`}
                                value={activeTab === 'medication' ? medicationSearch : filter}
                                onChange={(e) => {
                                    if (activeTab === 'medication') {
                                        setMedicationSearch(e.target.value);
                                        // Auto-search for medication
                                        if (e.target.value.length > 2) {
                                            searchMedication(e.target.value).then(setMedResults);
                                        }
                                    } else {
                                        setFilter(e.target.value);
                                    }
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded pl-10 p-2 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>

                        {activeTab === 'referrals' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Djelatnost:</span>
                                <select
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs font-bold text-cyan-400 focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer"
                                >
                                    <option value="ALL">ALL DEPTS</option>
                                    <option value="GEN">GENERAL</option>
                                    <option value="Radiology">RADIOLOGY</option>
                                    <option value="2050000">FIZIKALNA MEDICINA</option>
                                </select>
                            </div>
                        )}

                        {activeTab === 'billing' && selectedInvoices.length > 0 && (
                            <button
                                onClick={async () => {
                                    setActionLoading(true);
                                    try {
                                        await sendBatchInvoices(selectedInvoices);
                                        setSelectedInvoices([]);
                                        fetchLogs();
                                        alert('Batch invoice sent successfully');
                                    } catch (err: any) {
                                        alert(err.message);
                                    } finally {
                                        setActionLoading(false);
                                    }
                                }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                {actionLoading ? 'Processing...' : `Send Batch (${selectedInvoices.length})`}
                            </button>
                        )}
                        {activeTab === 'medication' && (
                            <div className="flex bg-purple-900 bg-opacity-30 border border-purple-800 rounded px-3 py-1 items-center gap-2">
                                <Pill className="h-4 w-4 text-purple-400" />
                                <span className="text-xs text-purple-300 font-bold uppercase tracking-widest">G_Export Registry Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-700">
                            {activeTab === 'audit' ? (
                                <tr>
                                    <th className="p-4">TIME</th>
                                    <th className="p-4">TYPE</th>
                                    <th className="p-4">DIRECTION</th>
                                    <th className="p-4">STATUS</th>
                                    <th className="p-4">PATIENT MBO</th>
                                    <th className="p-4">DETAILS</th>
                                </tr>
                            ) : (
                                <tr>
                                    {activeTab === 'billing' && <th className="p-4 w-10"></th>}
                                    <th className="p-4">TIME</th>
                                    {activeTab === 'referrals' && <th className="p-4 w-10"></th>}
                                    <th className="p-4">{activeTab === 'referrals' ? 'REFERRAL ID' : activeTab === 'billing' ? 'INVOICE ID' : 'MEDICINE'}</th>
                                    <th className="p-4">PATIENT MBO</th>
                                    {activeTab === 'referrals' ? (
                                        <>
                                            <th className="p-4">DIAGNOSIS (MKB-10)</th>
                                            <th className="p-4">PROCEDURE</th>
                                            <th className="p-4">DEPT</th>
                                        </>
                                    ) : activeTab === 'billing' ? (
                                        <>
                                            <th className="p-4 text-right">AMOUNT</th>
                                            <th className="p-4">BATCH ID</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-4">ATC CODE</th>
                                            <th className="p-4">MANUFACTURER</th>
                                        </>
                                    )}
                                    <th className="p-4 text-center">ISSUED (INTERNAL)</th>
                                    <th className="p-4 text-center">SENT HZZO (EXTERNAL)</th>
                                    <th className="p-4">ACTION</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading && (activeTab === 'audit' ? auditMessages : activeTab === 'billing' ? filteredBillingLogs : filteredLogs).length === 0 ? (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-500">Loading stream...</td></tr>
                            ) : (activeTab === 'medication' ? medResults : activeTab === 'audit' ? auditMessages : activeTab === 'billing' ? filteredBillingLogs : filteredLogs).length === 0 ? (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-500">No data found.</td></tr>
                            ) : (
                                (activeTab === 'medication' ? medResults : activeTab === 'audit' ? auditMessages : activeTab === 'billing' ? filteredBillingLogs : filteredLogs).map(log => {
                                    if (activeTab === 'audit') {
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                                                <td className="p-4 font-mono text-slate-400 text-xs">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td className="p-4 font-bold text-amber-400 capitalize">
                                                    {log.type.replace(/_/g, ' ')}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.direction === 'OUTGOING' ? 'bg-blue-900 text-blue-400 border-blue-800' : 'bg-purple-900 text-purple-400 border-purple-800'}`}>
                                                        {log.direction}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                                <td className="p-4 text-slate-300">
                                                    {log.patientMbo || '-'}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => setSelectedMessage(log)}
                                                        className="text-amber-500 hover:text-amber-400 text-xs font-bold uppercase underline"
                                                    >
                                                        View Payload
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const invoice = (log as any).invoice;
                                    const isSelected = selectedInvoices.includes(invoice?.id);
                                    const isMed = activeTab === 'medication';

                                    const isExpanded = expandedRows.includes(log.id);

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr className={`hover:bg-slate-750 transition-colors ${isSelected ? 'bg-slate-700' : ''} ${isExpanded ? 'bg-slate-800/50' : ''}`}>
                                                {activeTab === 'billing' && (
                                                    <td className="p-4">
                                                        {invoice && invoice.status === 'ISSUED' ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedInvoices(prev =>
                                                                        prev.includes(invoice.id)
                                                                            ? prev.filter(id => id !== invoice.id)
                                                                            : [...prev, invoice.id]
                                                                    );
                                                                }}
                                                                className="text-slate-400 hover:text-white"
                                                            >
                                                                {isSelected ? <CheckSquare className="h-5 w-5 text-blue-500" /> : <Square className="h-5 w-5" />}
                                                            </button>
                                                        ) : (
                                                            <div className="w-5 h-5"></div>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="p-4 font-mono text-slate-400 text-xs text-nowrap">
                                                    {isMed ? 'MED-REG' : new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                {activeTab === 'referrals' && (
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => toggleRow(log.id)}
                                                            className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                    </td>
                                                )}
                                                <td className={`p-4 font-bold ${activeTab === 'referrals' ? 'text-cyan-400' : activeTab === 'billing' ? 'text-blue-400' : 'text-purple-400'}`}>
                                                    {activeTab === 'referrals'
                                                        ? ((log as any).cezihReferralId || log.id.substring(0, 8))
                                                        : activeTab === 'billing'
                                                            ? (invoice?.id.substring(0, 8) || '-')
                                                            : ((log as any).name || '-')}
                                                    {activeTab === 'referrals' && (log as any).appointments?.some((a: any) => a.skId) && (
                                                        <div className="inline-flex ml-2 items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-900 border border-cyan-800 text-[10px] text-cyan-400 font-bold uppercase tracking-tighter">
                                                            <CheckCircle className="h-2.5 w-2.5" />
                                                            SK
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-300">
                                                    {isMed ? '*' : (log.patientMbo || '-')}
                                                </td>
                                                {activeTab === 'referrals' ? (
                                                    <>
                                                        <td className="p-4">
                                                            <div className="font-mono text-sm text-cyan-400">{(log as any).diagnosisCode || '-'}</div>
                                                            <div className="text-xs text-slate-500">{(log as any).diagnosisName || ''}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-mono text-sm text-blue-400">{(log as any).procedureCode || '-'}</div>
                                                            <div className="text-xs text-slate-500">{(log as any).procedureName || ''}</div>
                                                        </td>
                                                        <td className="p-4 text-slate-400">{(log as any).targetDepartment || 'GEN'}</td>
                                                    </>
                                                ) : activeTab === 'billing' ? (
                                                    <>
                                                        <td className="p-4 text-right font-mono text-emerald-400">
                                                            {invoice ? `${invoice.amount.toFixed(2)} EUR` : '-'}
                                                        </td>
                                                        <td className="p-4 font-mono text-xs text-slate-500">
                                                            {invoice?.batchId?.substring(0, 8) || '-'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-4 text-slate-300">{(log as any).atcCode || '-'}</td>
                                                        <td className="p-4 text-slate-500 text-xs">{(log as any).manufacturer || '-'}</td>
                                                    </>
                                                )}
                                                {activeTab === 'billing' ? (
                                                    <>
                                                        <td className="p-4 text-center">
                                                            {invoice?.status === 'ISSUED' || invoice?.status === 'SENT_TO_CEZIH' ? (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        <span>ISSUED</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                                                        {(log as any).cezihMessages?.find((m: any) => m.type === 'ISSUE_INVOICE')?.createdAt
                                                                            ? new Date((log as any).cezihMessages?.find((m: any) => m.type === 'ISSUE_INVOICE')?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                            : '-'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-1 text-slate-500 text-xs uppercase">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>PENDING</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {invoice?.status === 'SENT_TO_CEZIH' ? (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex items-center gap-1 text-blue-400 font-bold text-xs uppercase bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800">
                                                                        <Send className="h-3 w-3" />
                                                                        <span>SENT</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                                                        {invoice.batchId ? '#' + invoice.batchId.substring(0, 8) : '-'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                                                                    Waiting Batch
                                                                </div>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="p-4">
                                                        {getStatusBadge(log.status)}
                                                    </td>
                                                )}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {!isMed && (
                                                            <button
                                                                onClick={async () => {
                                                                    const details = await getExtendedInsurance(log.patientMbo || '');
                                                                    setSelectedPatient(details);
                                                                }}
                                                                className="text-slate-500 hover:text-cyan-400 transition-colors"
                                                                title="Extended Patient Info (OsigInfo)"
                                                            >
                                                                <Info className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {activeTab === 'referrals' ? (
                                                            <div className="flex gap-2">
                                                                {(log as any).appointments?.find((apt: any) => apt.clinicalFinding) ? (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleShowFhir(log)}
                                                                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                                                            title="View FHIR JSON Preview"
                                                                        >
                                                                            <FileText className="h-4 w-4" />
                                                                            <span className="text-xs">FHIR</span>
                                                                        </button>
                                                                        <a
                                                                            href={`/api/findings/${(log as any).appointments?.find((a: any) => a.clinicalFinding)?.clinicalFinding.id}/print`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                                                                            title="Print official finding"
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                            <span className="text-xs">PRINT</span>
                                                                        </a>
                                                                        {(log as any).appointments?.find((a: any) => a.clinicalFinding)?.clinicalFinding.signedAt ? (
                                                                            <button
                                                                                onClick={() => handleStorno((log as any).appointments?.find((a: any) => a.clinicalFinding)?.clinicalFinding.id, 'REPORT')}
                                                                                className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors"
                                                                                title="STORNO REPORT (Compliance 01_13)"
                                                                            >
                                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                                                <span className="text-[10px] font-bold">STORNO</span>
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-500 font-bold italic line-through">STORNIRANO</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-600">-</span>
                                                                )}
                                                                {log.status !== 'STORNIRANA' && log.status !== 'CANCELLED' && !(log as any).appointments?.some((a: any) => a.clinicalFinding) && (
                                                                    <button
                                                                        onClick={() => handleStorno(log.id, 'REFERRAL')}
                                                                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors"
                                                                        title="STORNO (Compliance 01_13)"
                                                                    >
                                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                                        <span className="text-[10px] font-bold">
                                                                            {log.status === 'STORNO_FAILED' ? 'RETRY CANCEL' : 'CANCEL REF'}
                                                                        </span>
                                                                    </button>
                                                                )}
                                                                {invoice ? (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-[10px] font-bold uppercase tracking-wider">
                                                                        <div className={`h-1.5 w-1.5 rounded-full ${invoice.status === 'ISSUED' ? 'bg-blue-400' : 'bg-green-400'}`} />
                                                                        <span className="text-slate-400">{invoice.status}</span>
                                                                    </div>
                                                                ) : (log as any).appointments?.some((a: any) => a.clinicalFinding) ? (
                                                                    <button
                                                                        className="text-emerald-500 hover:text-emerald-400 text-xs font-bold uppercase border border-emerald-800 px-2 py-0.5 rounded transition-colors"
                                                                        onClick={async () => {
                                                                            setActionLoading(true);
                                                                            try {
                                                                                await issueInvoice(log.id);
                                                                                alert('✅ Invoice ISSUED successfully');
                                                                                fetchLogs();
                                                                            } catch (e: any) {
                                                                                alert('Error: ' + e.message);
                                                                            } finally {
                                                                                setActionLoading(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {actionLoading ? '...' : 'ISSUE INV'}
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-[9px] text-slate-600 font-bold uppercase italic tracking-tighter">Wait for Finding</div>
                                                                )}
                                                            </div>
                                                        ) : activeTab === 'billing' ? (
                                                            <div className="flex gap-2 items-center">
                                                                {invoice?.cezihInvoiceId ? (
                                                                    <div className="flex items-center gap-2 text-green-400">
                                                                        <CheckCircle className="h-4 w-4" />
                                                                        <span className="text-xs">Registered</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-600">-</span>
                                                                )}
                                                                {invoice?.batchId && (
                                                                    <div className="flex items-center gap-1">
                                                                        <a
                                                                            href={`/api/invoices/batch/${invoice.batchId}/report`}
                                                                            className="p-1 hover:bg-slate-700 rounded text-amber-400"
                                                                            title="Download HZZO XML Report"
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                        </a>
                                                                        {invoice.status !== 'STORNIRANA' && invoice.status !== 'CANCELLED' && (
                                                                            <button
                                                                                onClick={() => handleStorno(invoice.id, 'INVOICE')}
                                                                                className={`p-1 hover:bg-slate-700 rounded ${invoice.status === 'STORNO_FAILED' ? 'text-amber-500 animate-pulse' : 'text-red-500'}`}
                                                                                title={invoice.status === 'STORNO_FAILED' ? 'RETRY STORNO Invoice' : 'STORNO Invoice'}
                                                                            >
                                                                                <AlertTriangle className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-bold"
                                                                onClick={() => setPrescribingMed(log)}
                                                            >
                                                                PRESCRIBE
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {
                                                isExpanded && activeTab === 'referrals' && (
                                                    <tr className="bg-slate-900/50 border-b border-slate-700/50">
                                                        <td colSpan={11} className="p-6">
                                                            <div className="grid grid-cols-12 gap-8">
                                                                <div className="col-span-4 border-r border-slate-800 pr-8">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Referral Lifecycle (CEZIH)</div>
                                                                    <StatusTimeline
                                                                        currentStatus={log.status}
                                                                        history={auditMessages
                                                                            .filter(m => m.referralId === log.id || m.referralId === (log as any).cezihReferralId)
                                                                            .map(m => {
                                                                                let statusMap = m.status;
                                                                                if (m.type === 'CHECK_INSURANCE') statusMap = 'INSURANCE_CHECK';
                                                                                else if (m.type === 'SEND_REFERRAL') statusMap = 'POSLANA';
                                                                                else if (m.type === 'OSIG_INFO_SKZZ') statusMap = 'OSIG_INFO';
                                                                                else if (m.type === 'SYNC_SK') statusMap = 'REZERVIRANA';
                                                                                else if (m.type === 'TAKEOVER') statusMap = 'U OBRADI';
                                                                                else if (m.type === 'SEND_FINDING') statusMap = 'NALAZ_POSLAN';
                                                                                else if (m.type === 'ISSUE_INVOICE') statusMap = 'RACUN_IZDAN';
                                                                                else if (m.type === 'SEND_INVOICE') statusMap = 'RACUN_POSLAN';
                                                                                else if (m.type === 'REALIZATION') statusMap = 'REALIZIRANA';

                                                                                return {
                                                                                    status: statusMap,
                                                                                    timestamp: m.createdAt,
                                                                                    payload: m.payload
                                                                                };
                                                                            })
                                                                        }
                                                                        onViewPayload={(payload, label) => {
                                                                            setSelectedMessage({
                                                                                type: label,
                                                                                payload: payload,
                                                                                direction: 'OUTGOING',
                                                                                id: 'TIMELINE-' + Date.now(),
                                                                                status: 'SENT'
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="col-span-8">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Recent Audit Logs</div>
                                                                    <div className="space-y-2 max-h-[200px] overflow-auto pr-2">
                                                                        {auditMessages
                                                                            .filter(m => m.referralId === log.id || m.referralId === (log as any).cezihReferralId)
                                                                            .map(m => (
                                                                                <div key={m.id} className="text-[10px] p-2 bg-slate-850 rounded border border-slate-700/50 flex justify-between items-center">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="text-slate-500">{new Date(m.createdAt).toLocaleTimeString()}</span>
                                                                                        <span className="text-amber-500 font-bold uppercase">{m.type}</span>
                                                                                        <span className={`px-1.5 py-0.5 rounded border ${m.direction === 'OUTGOING' ? 'text-blue-400 border-blue-900 bg-blue-900/20' : 'text-purple-400 border-purple-900 bg-purple-900/20'}`}>
                                                                                            {m.direction}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className={`font-bold ${m.status === 'SENT' ? 'text-green-500' : 'text-red-500'}`}>{m.status}</span>
                                                                                </div>
                                                                            ))}
                                                                        {auditMessages.filter(m => m.referralId === log.id || m.referralId === (log as any).cezihReferralId).length === 0 && (
                                                                            <div className="text-[10px] text-slate-600 italic">No audit history found for this referral.</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FHIR JSON Preview Modal */}
            {
                selectedFhir && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-400" />
                                    <h3 className="text-lg font-bold text-white">FHIR JSON Preview (DiagnosticReport)</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedFhir(null)}
                                    className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6 overflow-auto flex-1 bg-[#0d1117]">
                                <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap">
                                    {JSON.stringify(selectedFhir, null, 2)}
                                </pre>
                            </div>
                            <div className="p-4 border-t border-slate-700 bg-slate-850 flex justify-end">
                                <button
                                    onClick={() => setSelectedFhir(null)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                previewLoading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-xl flex items-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="text-white font-medium">Generating FHIR-compliant JSON...</span>
                        </div>
                    </div>
                )
            }
            {/* Extended Info Modal */}
            {
                selectedPatient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg flex flex-col shadow-2xl font-mono">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center text-white">
                                <h3 className="text-lg font-bold">OSIGINFO (HZZO)</h3>
                                <div className="flex gap-2">
                                    {!isEditingPatient && (
                                        <button
                                            onClick={() => {
                                                setIsEditingPatient(true);
                                                setEditFormData(selectedPatient);
                                            }}
                                            className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded font-bold"
                                        >
                                            EDIT
                                        </button>
                                    )}
                                    <button onClick={() => { setSelectedPatient(null); setIsEditingPatient(false); }}><X className="h-6 w-6 text-slate-400 hover:text-white" /></button>
                                </div>
                            </div>
                            <div className="p-6 space-y-3 text-sm max-h-[70vh] overflow-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase">First Name</label>
                                        {isEditingPatient ? (
                                            <input
                                                value={editFormData.firstName}
                                                onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                                            />
                                        ) : (
                                            <div className="text-white font-bold">{selectedPatient.firstName}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase">Last Name</label>
                                        {isEditingPatient ? (
                                            <input
                                                value={editFormData.lastName}
                                                onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                                            />
                                        ) : (
                                            <div className="text-white font-bold">{selectedPatient.lastName}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase">Birth Date / Gender</label>
                                        <div className="text-white font-mono">
                                            {new Date(selectedPatient.birthDate).toLocaleDateString()} / {isEditingPatient ? (
                                                <select
                                                    value={editFormData.gender}
                                                    onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                                                    className="bg-slate-800 border border-slate-700 rounded text-xs px-1"
                                                >
                                                    <option value="M">M</option>
                                                    <option value="F">F</option>
                                                </select>
                                            ) : selectedPatient.gender}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase text-right block">MBO</label>
                                        <div className="text-cyan-400 font-bold text-right">{selectedPatient.mbo}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 py-2">
                                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-l-2 border-amber-500 pl-2">Insurance Policies (OZO/DZO)</div>

                                    <div className="grid grid-cols-2 gap-4 bg-slate-850 p-2 rounded border border-slate-800">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block">POLICY STATUS</label>
                                            {isEditingPatient ? (
                                                <select
                                                    value={editFormData.policyStatus}
                                                    onChange={e => setEditFormData({ ...editFormData, policyStatus: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-1 mt-1"
                                                >
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            ) : (
                                                <span className={`font-bold ${selectedPatient.policyStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>{selectedPatient.policyStatus}</span>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block">CATEGORY</label>
                                            {isEditingPatient ? (
                                                <input
                                                    value={editFormData.insuranceCategory}
                                                    onChange={e => setEditFormData({ ...editFormData, insuranceCategory: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-1 mt-1 text-white"
                                                />
                                            ) : (
                                                <span className="text-white font-bold">
                                                    {selectedPatient.insuranceCategory || 'AO'}
                                                    {insuranceCategories.find(c => c.code === (selectedPatient.insuranceCategory || 'AO')) &&
                                                        ` (${insuranceCategories.find(c => c.code === (selectedPatient.insuranceCategory || 'AO')).name})`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={isEditingPatient ? editFormData.isVeteran : selectedPatient.isVeteran} onChange={e => setEditFormData({ ...editFormData, isVeteran: e.target.checked })} disabled={!isEditingPatient} className="accent-cyan-500" />
                                            <span className="text-[9px] text-slate-400 font-bold">BRANITELJ (HB)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={isEditingPatient ? editFormData.weaponHolder : selectedPatient.weaponHolder} onChange={e => setEditFormData({ ...editFormData, weaponHolder: e.target.checked })} disabled={!isEditingPatient} className="accent-cyan-500" />
                                            <span className="text-[9px] text-slate-400 font-bold">ORUŽJE (VO)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={isEditingPatient ? editFormData.isIsolated : selectedPatient.isIsolated} onChange={e => setEditFormData({ ...editFormData, isIsolated: e.target.checked })} disabled={!isEditingPatient} className="accent-cyan-500" />
                                            <span className="text-[9px] text-slate-400 font-bold">IZOLACIJA (IC)</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-850 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] text-slate-500">SUPPLEMENTAL (DZO)</label>
                                            {isEditingPatient ? (
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.hasSupplemental}
                                                    onChange={e => setEditFormData({ ...editFormData, hasSupplemental: e.target.checked })}
                                                />
                                            ) : (
                                                <span className={selectedPatient.hasSupplemental ? 'text-green-400 font-bold' : 'text-slate-500'}>
                                                    {selectedPatient.hasSupplemental ? 'YES' : 'NO'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <label className="text-[8px] text-slate-600 block">POLICY #</label>
                                                {isEditingPatient ? (
                                                    <input
                                                        value={editFormData.policyNumber}
                                                        onChange={e => setEditFormData({ ...editFormData, policyNumber: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300">{selectedPatient.policyNumber || '-'}</span>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-slate-600 block">VALID UNTIL (PERIOD DO)</label>
                                                {isEditingPatient ? (
                                                    <input
                                                        type="date"
                                                        value={editFormData.validUntil?.split('T')[0]}
                                                        onChange={e => setEditFormData({ ...editFormData, validUntil: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-0.5 text-white"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300">{new Date(selectedPatient.validUntil).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 py-2">
                                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest border-l-2 border-amber-500 pl-2">Special Flags</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className={`p-2 rounded border ${selectedPatient.isVeteran ? 'bg-blue-900/30 border-blue-800' : 'bg-slate-850 border-slate-800'}`}>
                                            <div className="text-[8px] text-slate-500 font-bold">VETERAN (HB)</div>
                                            {isEditingPatient ? (
                                                <input type="checkbox" checked={editFormData.isVeteran} onChange={e => setEditFormData({ ...editFormData, isVeteran: e.target.checked })} />
                                            ) : (
                                                <div className={`text-xs ${selectedPatient.isVeteran ? 'text-blue-400 font-bold' : 'text-slate-600'}`}>{selectedPatient.isVeteran ? 'YES' : 'NO'}</div>
                                            )}
                                        </div>
                                        <div className={`p-2 rounded border ${selectedPatient.weaponHolder ? 'bg-red-900/30 border-red-800' : 'bg-slate-850 border-slate-800'}`}>
                                            <div className="text-[8px] text-slate-500 font-bold">WEAPON (VO)</div>
                                            {isEditingPatient ? (
                                                <input type="checkbox" checked={editFormData.weaponHolder} onChange={e => setEditFormData({ ...editFormData, weaponHolder: e.target.checked })} />
                                            ) : (
                                                <div className={`text-xs ${selectedPatient.weaponHolder ? 'text-red-400 font-bold' : 'text-slate-600'}`}>{selectedPatient.weaponHolder ? 'YES' : 'NO'}</div>
                                            )}
                                        </div>
                                        <div className={`p-2 rounded border ${selectedPatient.isIsolated ? 'bg-amber-900/30 border-amber-800' : 'bg-slate-850 border-slate-800'}`}>
                                            <div className="text-[8px] text-slate-500 font-bold">ISOLATION (IC)</div>
                                            {isEditingPatient ? (
                                                <input type="checkbox" checked={editFormData.isIsolated} onChange={e => setEditFormData({ ...editFormData, isIsolated: e.target.checked })} />
                                            ) : (
                                                <div className={`text-xs ${selectedPatient.isIsolated ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>{selectedPatient.isIsolated ? 'YES' : 'NO'}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-850 flex justify-end gap-3 rounded-b-xl border-t border-slate-800">
                                {isEditingPatient ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditingPatient(false)}
                                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            onClick={handleSavePatient}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold border border-green-700"
                                        >
                                            {actionLoading ? 'SAVING...' : 'SAVE CHANGES'}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => setSelectedPatient(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors text-xs font-bold uppercase tracking-widest border border-slate-700">CLOSE</button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Prescription Modal */}
            {
                prescribingMed && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm shadow-2xl">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg flex flex-col font-mono">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2">
                                    <Pill className="h-5 w-5 text-purple-400" />
                                    <h3 className="text-lg font-bold uppercase tracking-wider">Prescribe Medication</h3>
                                </div>
                                <button onClick={() => setPrescribingMed(null)}><X className="h-6 w-6 text-slate-400 hover:text-white" /></button>
                            </div>
                            <div className="p-6 space-y-4 text-sm">
                                <div className="bg-slate-850 p-3 rounded border border-slate-700 mb-4">
                                    <div className="text-xs text-slate-500 uppercase mb-1">Drug Details</div>
                                    <div className="text-white font-bold">{prescribingMed.name}</div>
                                    <div className="text-purple-400 text-xs">{prescribingMed.atcCode} - {prescribingMed.manufacturer}</div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase mb-1">Target Patient (MBO)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Patient MBO..."
                                            value={prescribingPatient}
                                            onChange={(e) => setPrescribingPatient(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                        <p className="text-[10px] text-slate-600 mt-1 italic">* Select from recent referrals dashboard to auto-populate</p>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase mb-1">Dosage</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1-0-1"
                                            value={recommendationData.dosage}
                                            onChange={(e) => setRecommendationData({ ...recommendationData, dosage: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase mb-1">Duration / Note</label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. 7 days, after meal..."
                                            value={recommendationData.note}
                                            onChange={(e) => setRecommendationData({ ...recommendationData, note: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-850 flex justify-end gap-3 rounded-b-xl border-t border-slate-800">
                                <button onClick={() => setPrescribingMed(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">CANCEL</button>
                                <button
                                    onClick={async () => {
                                        setActionLoading(true);
                                        try {
                                            // Mocking appointment link for now if not available
                                            await issueRecommendation({
                                                appointmentId: 'LATEST', // Backend handles logic for latest appointment for patient
                                                patientMbo: prescribingPatient,
                                                medicineId: prescribingMed.id,
                                                ...recommendationData
                                            });
                                            alert('✅ Recommendations sent to G_export Central');
                                            setPrescribingMed(null);
                                        } catch (e: any) {
                                            alert('Error: ' + e.message);
                                        } finally {
                                            setActionLoading(false);
                                        }
                                    }}
                                    disabled={!prescribingPatient || !recommendationData.dosage || actionLoading}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-xs font-bold uppercase tracking-widest shadow-lg disabled:opacity-50"
                                >
                                    {actionLoading ? 'SENDING...' : 'SIGN & ISSUE'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Raw Message Modal */}
            {
                selectedMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                        CEZIH PAYLOAD: {selectedMessage.type}
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><X className="h-6 w-6 text-slate-400 hover:text-white" /></button>
                            </div>
                            <div className="p-0 overflow-hidden flex-1 grid grid-cols-2 min-h-0">
                                <div className="flex flex-col border-r border-slate-800 min-h-0">
                                    <div className="p-2 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800">Request Payload</div>
                                    <div className="p-4 overflow-y-auto flex-1 bg-[#0d1117] custom-scrollbar">
                                        <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">{selectedMessage.payload}</pre>
                                    </div>
                                </div>
                                <div className="flex flex-col min-h-0">
                                    <div className="p-2 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800">Response / Error</div>
                                    <div className="p-4 overflow-y-auto flex-1 bg-[#161b22] custom-scrollbar">
                                        <pre className="text-xs font-mono text-cyan-400 whitespace-pre-wrap break-all">{selectedMessage.response || selectedMessage.errorMessage || '(Pending or Local Simulation)'}</pre>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-700 bg-slate-850 flex justify-end gap-3">
                                <div className="flex-1 flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                                    <div>ID: {selectedMessage.id}</div>
                                    <div>DIR: {selectedMessage.direction}</div>
                                </div>
                                <button onClick={() => setSelectedMessage(null)} className="px-6 py-2 bg-slate-800 text-white rounded font-bold text-xs uppercase border border-slate-700">CLOSE</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
