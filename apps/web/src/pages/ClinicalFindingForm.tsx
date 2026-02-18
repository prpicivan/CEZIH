import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Send, X, Pill, Plus, Trash2, Search, Info, AlertCircle, Activity } from 'lucide-react';
import {
    createFinding,
    sendFindingToCezih,
    type Appointment,
    getAppointments,
    searchMedication,
    issueRecommendation,
    createInternalReferral
} from '../services/api';
import { StatusTimeline } from '../components/StatusTimeline';

const PROCEDURES = [
    { code: '2050000', name: 'Fizikalna terapija - prvi pregled', dept: 'Physical Medicine' },
    { code: '2050001', name: 'Fizikalna terapija - vježbe', dept: 'Physical Medicine' },
    { code: '100201', name: 'Kontrolni pregled specijaliste', dept: 'Specialist' },
];

export default function ClinicalFindingForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const source = searchParams.get('source');

    const handleBack = () => {
        if (source === 'calendar') {
            navigate('/calendar');
        } else {
            navigate('/appointments');
        }
    };

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        anamnesis: '',
        statusPraesens: '',
        therapy: ''
    });

    // Medication State
    const [prescribedMedications, setPrescribedMedications] = useState<any[]>([]);
    const [medSearch, setMedSearch] = useState('');
    const [medResults, setMedResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Internal Referrals State
    const [internalReferrals, setInternalReferrals] = useState<any[]>([]);
    const [newIR, setNewIR] = useState({
        type: 'PT',
        procedureCode: '',
        procedureName: '',
        department: '',
        note: ''
    });

    useEffect(() => {
        if (!appointmentId) {
            handleBack();
            return;
        }

        // Fetch appointment details
        getAppointments().then(appointments => {
            const apt = appointments.find(a => a.id === appointmentId);
            if (!apt) {
                alert('Appointment not found');
                handleBack();
                return;
            }
            setAppointment(apt);

            // If finding exists, populate form and it will be read-only
            if (apt.clinicalFinding) {
                setFormData({
                    anamnesis: apt.clinicalFinding.anamnesis || '',
                    statusPraesens: apt.clinicalFinding.statusPraesens || '',
                    therapy: apt.clinicalFinding.therapy || ''
                });

                // Populate medications from recommendations
                if (apt.recommendations) {
                    const meds = apt.recommendations.map((r: any) => ({
                        id: r.medicineId,
                        name: r.medicine.name,
                        atcCode: r.medicine.atcCode,
                        manufacturer: r.medicine.manufacturer,
                        dosage: r.dosage,
                        note: r.note
                    }));
                    setPrescribedMedications(meds);
                }
            }

            setLoading(false);
        }).catch(err => {
            console.error('Failed to load appointment:', err);
            alert('Failed to load appointment');
            handleBack();
        });
    }, [appointmentId, navigate]);

    useEffect(() => {
        if (medSearch.length > 2) {
            setSearching(true);
            searchMedication(medSearch).then(results => {
                setMedResults(results);
                setSearching(false);
            });
        } else {
            setMedResults([]);
        }
    }, [medSearch]);

    const handleAddMedication = (med: any) => {
        if (prescribedMedications.some(m => m.id === med.id)) return;
        setPrescribedMedications([...prescribedMedications, { ...med, dosage: '', note: '' }]);
        setMedSearch('');
        setMedResults([]);
    };

    const handleRemoveMedication = (id: string) => {
        setPrescribedMedications(prescribedMedications.filter(m => m.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!appointmentId || !appointment) return;

        setSubmitting(true);
        try {
            // 1. Create clinical finding
            const finding = await createFinding({
                appointmentId,
                ...formData
            });

            // 2. Issue medication recommendations
            for (const med of prescribedMedications) {
                await issueRecommendation({
                    appointmentId,
                    patientId: appointment.patientId,
                    medicineId: med.id,
                    dosage: med.dosage,
                    note: med.note
                });
            }

            // 3. Create internal referrals
            for (const ir of internalReferrals) {
                await createInternalReferral({
                    ...ir,
                    originalReferralId: appointment.referralId || ''
                });
            }

            // 4. Send finding to CEZIH
            await sendFindingToCezih(finding.id);

            alert('✅ Clinical finding & prescriptions created and sent successfully!');
            handleBack();
        } catch (error: any) {
            console.error('Failed to create finding:', error);
            alert('❌ Failed to create finding: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!appointment) return null;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <header className="mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Clinical Documentation</h1>
                            <p className="text-slate-500">
                                {appointment.clinicalFinding?.signedAt ? 'View signed clinical record' : 'Document patient encounter and prescribe therapy'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {appointment.clinicalFinding?.signedAt && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold uppercase">
                                <Info className="h-4 w-4" />
                                Locked (Signed & Sent)
                            </div>
                        )}
                        {appointment.clinicalFinding && !appointment.clinicalFinding.signedAt && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold uppercase">
                                <Info className="h-4 w-4" />
                                Storno (Editable Correction)
                            </div>
                        )}
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium transition-colors"
                        >
                            <X className="h-5 w-5" />
                            {appointment.clinicalFinding?.signedAt ? 'Close' : 'Cancel'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Compliance Alert Box */}
            {appointment.referral?.type === 'A1' && (
                <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 leading-tight">Compliance Rule: A1 Consultative Referral</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Osnovom <strong>A1</strong> vrste uputnice nije moguće izdati internu uputnicu za daljnje obrade niti izdati preporuku o kontrolnim pregledima/terapiji.
                            Pacijent se mora vratiti izabranom doktoru za daljnji plan liječenja.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Context Area */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Patient Card */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2">
                            <h2 className="text-white font-bold text-xs uppercase tracking-widest">Patient Context</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase">Name</label>
                                <div className="text-slate-800 font-bold">{appointment.patient?.firstName} {appointment.patient?.lastName}</div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase">MBO (Individual ID)</label>
                                <div className="text-blue-600 font-mono font-bold tracking-tighter">{appointment.patient?.mbo}</div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase">Insurance Info</label>
                                <div className="flex items-center gap-2">
                                    <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Active</span>
                                    <span className="text-slate-600 text-xs">HZZO Category: AO</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Referral Details Card */}
                    {appointment.referral && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
                                <Info className="h-3 w-3 text-slate-400" />
                                <h2 className="text-white font-bold text-xs uppercase tracking-widest">Referral Info</h2>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Diagnosis (MKB-10)</label>
                                    <div className="text-slate-800 font-medium text-sm leading-tight">
                                        <span className="text-blue-600 font-bold">{appointment.referral.diagnosisCode}</span> - {appointment.referral.diagnosisName || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Procedure</label>
                                    <div className="text-slate-800 text-sm leading-tight">
                                        <span className="font-bold text-slate-600">{appointment.referral.procedureCode}</span> - {appointment.referral.procedureName || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Target Department</label>
                                    <div className="text-slate-600 text-sm italic">{appointment.referral.targetDepartment}</div>
                                </div>
                                {appointment.referral.note && (
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 italic text-xs text-slate-500">
                                        "{appointment.referral.note}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 1: CEZIH Lifecycle Card */}
                    {appointment.referral && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                                <Activity className="h-3 w-3 text-blue-400" />
                                <h2 className="text-white font-bold text-xs uppercase tracking-widest">eReferral Lifecycle</h2>
                            </div>
                            <div className="p-6">
                                <StatusTimeline
                                    currentStatus={appointment.referral.status}
                                    history={(appointment.referral as any).cezihMessages?.map((m: any) => {
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
                                    }) || []}
                                />
                            </div>
                            <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
                                <span>SYSTEM STATUS</span>
                                <span className="text-blue-400 font-bold">{appointment.referral.status}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Form Area */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                                    Anamnesis
                                </label>
                                <textarea
                                    value={formData.anamnesis}
                                    onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 min-h-[140px] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="Patient history, symptoms, complaints..."
                                    required
                                    disabled={!!appointment.clinicalFinding?.signedAt}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Status Praesens (Current Status)
                                </label>
                                <textarea
                                    value={formData.statusPraesens}
                                    onChange={(e) => setFormData({ ...formData, statusPraesens: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 min-h-[140px] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="Physical examination findings, vital signs..."
                                    required
                                    disabled={!!appointment.clinicalFinding?.signedAt}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Pill className="h-5 w-5 text-purple-600" />
                                    Medication & Therapy (G_export)
                                </h3>

                                {/* Medication Search */}
                                <div className="relative mb-6">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={medSearch}
                                        onChange={(e) => setMedSearch(e.target.value)}
                                        disabled={!!appointment.clinicalFinding?.signedAt}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder={appointment.clinicalFinding?.signedAt || appointment.referral?.type === 'A1' ? "Therapy is locked/restricted" : "Search for medication by name or ATC code..."}
                                    />

                                    {/* A1 Inline Block */}
                                    {appointment.referral?.type === 'A1' && (
                                        <div className="mt-2 text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <X className="h-3 w-3" /> Restrictions apply: Read-only therapy allowed
                                        </div>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {medResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {medResults.map(med => (
                                                <button
                                                    key={med.id}
                                                    type="button"
                                                    onClick={() => handleAddMedication(med)}
                                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800">{med.name}</div>
                                                        <div className="text-xs text-slate-500 uppercase">{med.atcCode} • {med.manufacturer}</div>
                                                    </div>
                                                    <Plus className="h-5 w-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {medSearch.length > 2 && medResults.length === 0 && !searching && (
                                        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-sm shadow-xl">
                                            No medications found matching "{medSearch}"
                                        </div>
                                    )}
                                </div>

                                {/* Prescribed Medications List */}
                                <div className="space-y-4">
                                    {prescribedMedications.map(med => (
                                        <div key={med.id} className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-bold text-slate-800">{med.name}</div>
                                                    <div className="text-xs text-purple-600 font-mono font-bold uppercase">{med.atcCode}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMedication(med.id)}
                                                    disabled={!!appointment.clinicalFinding?.signedAt}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-0"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">Dosage</label>
                                                    <input
                                                        type="text"
                                                        value={med.dosage}
                                                        disabled={!!appointment.clinicalFinding?.signedAt}
                                                        onChange={(e) => {
                                                            const newList = prescribedMedications.map(m =>
                                                                m.id === med.id ? { ...m, dosage: e.target.value } : m
                                                            );
                                                            setPrescribedMedications(newList);
                                                        }}
                                                        placeholder="e.g. 1-0-1 (morning-afternoon-night)"
                                                        className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none disabled:bg-purple-100/50 disabled:text-slate-600"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">Notes / Duration</label>
                                                    <input
                                                        type="text"
                                                        value={med.note}
                                                        disabled={!!appointment.clinicalFinding?.signedAt}
                                                        onChange={(e) => {
                                                            const newList = prescribedMedications.map(m =>
                                                                m.id === med.id ? { ...m, note: e.target.value } : m
                                                            );
                                                            setPrescribedMedications(newList);
                                                        }}
                                                        placeholder="e.g. 7 days, after meal..."
                                                        className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none disabled:bg-purple-100/50 disabled:text-slate-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {prescribedMedications.length === 0 && (
                                        <div className="border-2 border-dashed border-slate-100 rounded-xl py-8 text-center text-slate-400">
                                            <Pill className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No medications prescribed yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Internal Referrals Section */}
                            {!appointment.clinicalFinding?.signedAt && (
                                <div className="pt-6 border-t border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-emerald-600" />
                                        Plan liječenja (Internal Referrals)
                                    </h3>

                                    <div className={`space-y-4 ${appointment.referral?.type === 'A1' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                        {internalReferrals.map((ref, idx) => (
                                            <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                                                            {ref.type === 'PT' ? 'Physical Therapy' : 'Control Exam'}
                                                        </span>
                                                        <span className="font-bold text-slate-800">{ref.procedureName}</span>
                                                    </div>
                                                    <div className="text-xs text-emerald-700 font-medium mt-1">
                                                        Dept: {ref.department} • Code: {ref.procedureCode}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setInternalReferrals(internalReferrals.filter((_, i) => i !== idx))}
                                                    className="p-1 text-emerald-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="col-span-1">
                                                <select
                                                    value={newIR.type}
                                                    onChange={(e) => setNewIR({ ...newIR, type: e.target.value })}
                                                    disabled={appointment.referral?.type === 'A1'}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none disabled:bg-slate-100"
                                                >
                                                    <option value="PT">Fizikalna terapija</option>
                                                    <option value="CTRL">Kontrolni pregled</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1">
                                                <select
                                                    value={newIR.procedureCode}
                                                    disabled={appointment.referral?.type === 'A1'}
                                                    onChange={(e) => {
                                                        const p = PROCEDURES.find(x => x.code === e.target.value);
                                                        setNewIR({ ...newIR, procedureCode: e.target.value, procedureName: p?.name || '', department: p?.dept || '' });
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none disabled:bg-slate-100"
                                                >
                                                    <option value="">Select Procedure...</option>
                                                    {PROCEDURES.map(p => (
                                                        <option key={p.code} value={p.code}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="lg:col-span-1">
                                                <input
                                                    type="text"
                                                    placeholder="Note (optional)"
                                                    value={newIR.note}
                                                    disabled={appointment.referral?.type === 'A1'}
                                                    onChange={(e) => setNewIR({ ...newIR, note: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none disabled:bg-slate-100"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={appointment.referral?.type === 'A1'}
                                                onClick={() => {
                                                    if (!newIR.procedureCode) return;
                                                    setInternalReferrals([...internalReferrals, newIR]);
                                                    setNewIR({ type: 'PT', procedureCode: '', procedureName: '', department: '', note: '' });
                                                }}
                                                className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="h-4 w-4" /> Add Order
                                            </button>
                                            {appointment.referral?.type === 'A1' && (
                                                <div className="col-span-full mt-2 text-center text-xs font-bold text-amber-600 uppercase flex items-center justify-center gap-2">
                                                    <AlertCircle className="h-4 w-4" /> INTERNAL REFERRALS BLOCKED FOR A1 TYPE
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!appointment.clinicalFinding?.signedAt && (
                                <div className="pt-6 border-t border-slate-100 flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1 active:translate-y-0"
                                    >
                                        <Send className="h-5 w-5" />
                                        {submitting ? 'Signing & Sending...' : 'Sign & Submit to CEZIH Central'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-6 py-4 border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Discard
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
