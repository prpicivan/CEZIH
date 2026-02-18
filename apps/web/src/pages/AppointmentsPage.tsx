import { useState, useEffect } from 'react';
import {
    getAppointments,
    createAppointment,
    updateAppointment,
    getReferralsForPatient,
    syncAppointment,
    checkSkStatus,
    getExtendedInsurance,
    issueAppointmentInvoice,
    cancelAppointment,
    type Appointment
} from '../services/api';
import { Calendar, Clock, User, FileText, Plus, Search, Send, ExternalLink, RefreshCw, CheckCircle, ShieldCheck, ShieldAlert, BadgeInfo, Receipt } from 'lucide-react';

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchMbo, setSearchMbo] = useState('');
    const [availableReferrals, setAvailableReferrals] = useState<any[]>([]);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [billingLoading, setBillingLoading] = useState<string | null>(null);

    const handleBilling = async (aptId: string) => {
        setBillingLoading(aptId);
        try {
            await issueAppointmentInvoice(aptId);
            // Open print view in new window
            window.open(`/invoices/${aptId}/print`, '_blank');
            // Refresh to show updated invoice status if needed
            const data = await getAppointments();
            setAppointments(data);
        } catch (error: any) {
            alert(error.message || 'Failed to generate billing');
        } finally {
            setBillingLoading(null);
        }
    };
    const [skStatus, setSkStatus] = useState<any>(null);
    const [newAppointment, setNewAppointment] = useState({
        patientId: '',
        referralId: '',
        startTime: '',
        endTime: '',
        patientMbo: '',
    });
    const [insuranceData, setInsuranceData] = useState<any>(null);
    const [searchingInsurance, setSearchingInsurance] = useState(false);
    const [searchDept, setSearchDept] = useState('ALL');
    const [selectedReferral, setSelectedReferral] = useState<any>(null);

    const departments = [
        { id: 'ALL', name: 'All Departments' },
        { id: 'DERM', name: 'DERM - Dermatologija i venerologija' },
        { id: 'OPH', name: 'OPH - Oftalmologija i optometrija' },
        { id: 'OPHTHAL', name: 'OPHTHAL - Oftalmologija (Alternativa)' },
        { id: 'PHYSICAL', name: 'PHYSICAL - Fizikalna medicina i rehabilitacija' },
        { id: 'ONCO', name: 'ONCO - Onkologija i radioterapija' },
        { id: 'SURG', name: 'SURG - Opća kirurgija' },
        { id: 'SUR', name: 'SUR - Kirurgija (Alternativa)' },
        { id: 'Internal Medicine', name: 'INT - Interna medicina' },
        { id: 'GYN', name: 'GYN - Ginekologija i opstetricija' },
        { id: 'PED', name: 'PED - Pedijatrija' },
        { id: 'Cardiology', name: 'CARD - Kardiologija' },
        { id: 'CARD', name: 'CARD - Kardiologija (Alternativa)' },
    ];

    // Reactive filtering: Ensure the displayed list ALWAYS respects the selected filter
    const filteredReferrals = availableReferrals.filter(ref => {
        if (searchDept === 'ALL') return true;

        // Handle variations (OPH vs OPHTHAL, CARD vs Cardiology, SUR vs SURG)
        if (searchDept === 'OPH' || searchDept === 'OPHTHAL') {
            return ref.targetDepartment === 'OPH' || ref.targetDepartment === 'OPHTHAL';
        }
        if (searchDept === 'CARD' || searchDept === 'Cardiology') {
            return ref.targetDepartment === 'CARD' || ref.targetDepartment === 'Cardiology';
        }
        if (searchDept === 'SUR' || searchDept === 'SURG') {
            return ref.targetDepartment === 'SUR' || ref.targetDepartment === 'SURG';
        }

        return ref.targetDepartment === searchDept;
    });

    useEffect(() => {
        fetchAppointments();
        checkConnectivity();
    }, []);

    const checkConnectivity = async () => {
        try {
            const status = await checkSkStatus();
            setSkStatus(status);
        } catch (error) {
            console.error('Failed to check SK status:', error);
        }
    };

    const fetchAppointments = async () => {
        try {
            const data = await getAppointments();
            setAppointments(data);
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToSk = async (id: string) => {
        setSyncingId(id);
        try {
            await syncAppointment(id);
            alert('✅ Appointment successfully synchronized with Central Calendar (SK)');
            fetchAppointments();
        } catch (error: any) {
            alert('❌ Sync failed: ' + error.message);
        } finally {
            setSyncingId(null);
        }
    };

    const handleSearchReferrals = async () => {
        if (!searchMbo || searchMbo.length !== 9) {
            alert('Please enter a valid 9-digit MBO');
            return;
        }

        // ALWAYS set the patientMbo first, before the API call
        setNewAppointment(prev => ({
            ...prev,
            patientMbo: searchMbo,
        }));

        try {
            setSearchingInsurance(true);
            setInsuranceData(null);

            // Parallel fetch for speed
            const [referrals, insurance] = await Promise.all([
                getReferralsForPatient(searchMbo, searchDept),
                getExtendedInsurance(searchMbo)
            ]);

            setAvailableReferrals(referrals);
            setInsuranceData(insurance);
        } catch (error) {
            console.error('Failed to fetch patient data:', error);
            // Don't show alert - allow walk-in appointments even if API fails
            // but log that insurance couldn't be verified
            setInsuranceData({ error: 'System offline - could not verify insurance' });
        } finally {
            setSearchingInsurance(false);
        }
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const appointmentData: any = {
                patientMbo: newAppointment.patientMbo,
                startTime: newAppointment.startTime,
                endTime: newAppointment.endTime,
            };

            // Only include referralId if one is actually selected
            if (newAppointment.referralId && newAppointment.referralId.trim() !== '') {
                appointmentData.referralId = newAppointment.referralId;
            }

            const appointment = await createAppointment(appointmentData);
            setAppointments([...appointments, appointment]);
            setShowModal(false);
            setNewAppointment({
                patientId: '',
                referralId: '',
                startTime: '',
                endTime: '',
                patientMbo: '',
            });
            setAvailableReferrals([]);
            setSearchMbo('');
            setSelectedReferral(null);
        } catch (error) {
            console.error('Failed to create appointment:', error);
            alert('Failed to create appointment');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            let updated;
            if (newStatus === 'cancelled') {
                const res = await cancelAppointment(id);
                updated = res.appointment;
            } else {
                updated = await updateAppointment(id, { status: newStatus });
            }
            setAppointments(appointments.map(apt => apt.id === id ? updated : apt));
        } catch (error: any) {
            console.error('Failed to update appointment:', error);
            alert('Failed to update: ' + error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-emerald-100 text-emerald-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const groupAppointmentsByDate = () => {
        const grouped: { [key: string]: Appointment[] } = {};
        appointments.forEach(apt => {
            const date = new Date(apt.startTime).toLocaleDateString('hr-HR');
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(apt);
        });
        return grouped;
    };

    const groupedAppointments = groupAppointmentsByDate();

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 border-b pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            Appointments Calendar
                        </h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-slate-500">Manage patient appointments and eReferrals</p>
                            {skStatus && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                                    <div className={`h-2 w-2 rounded-full ${skStatus.status === 'UP' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                        SK System: {skStatus.status}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="https://sk.cezih.hr/portal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            title="Open Central Calendar Portal (Level 1 Compliance)"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Central Calendar
                        </a>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            New Appointment
                        </button>
                    </div>
                </div>
            </header>

            {/* Appointments List */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                        Loading appointments...
                    </div>
                ) : Object.keys(groupedAppointments).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No appointments scheduled</p>
                    </div>
                ) : (
                    Object.entries(groupedAppointments).map(([date, apts]) => (
                        <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900">{date}</h3>
                            </div>
                            <div className="divide-y divide-slate-200">
                                {apts.map(apt => (
                                    <div key={apt.id} className="p-6 hover:bg-slate-50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Clock className="h-5 w-5 text-slate-400" />
                                                    <span className="font-semibold text-slate-900">
                                                        {new Date(apt.startTime).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(apt.endTime).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {apt.patient && (
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <User className="h-5 w-5 text-slate-400" />
                                                        <div>
                                                            <span className="font-medium text-slate-900">
                                                                {apt.patient.firstName} {apt.patient.lastName}
                                                            </span>
                                                            <span className="text-slate-500 ml-2">MBO: {apt.patient.mbo}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {(apt.referral || apt.referralDiagnosis) && (
                                                    <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded text-sm space-y-1">
                                                        <div className="flex items-start gap-2">
                                                            <FileText className="h-4 w-4 text-blue-500 mt-0.5" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-slate-800">
                                                                    {apt.referralType || apt.referral?.type} — {apt.referralDiagnosis || `${apt.referral?.diagnosisCode} ${apt.referral?.diagnosisName || ''}`}
                                                                </div>
                                                                <div className="text-slate-600">
                                                                    {apt.referralProcedure || `${apt.referral?.procedureCode} ${apt.referral?.procedureName || ''}`}
                                                                </div>
                                                                {(apt.referralNote || apt.referral?.note) && (
                                                                    <div className="text-xs text-slate-500 italic mt-1 bg-white p-1 rounded border border-slate-100">
                                                                        "{apt.referralNote || apt.referral?.note}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {(apt.referral?.cezihReferralId || apt.referralId) && (
                                                            <div className="text-[10px] text-slate-400 pl-6 flex items-center gap-1">
                                                                <span className="font-mono bg-slate-100 px-1 rounded">
                                                                    {apt.referral?.cezihReferralId ? `REF: ${apt.referral.cezihReferralId}` : `ID: ${apt.referralId?.substring(0, 8)}...`}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(apt.status)}`}>
                                                    {apt.status}
                                                </span>
                                                {apt.skId ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 uppercase tracking-tighter">
                                                            <CheckCircle className="h-3 w-3" />
                                                            SK Synced
                                                        </div>
                                                        {apt.skSyncedAt && (
                                                            <span className="text-[10px] text-slate-400 mt-0.5">
                                                                {new Date(apt.skSyncedAt).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSyncToSk(apt.id)}
                                                        disabled={syncingId === apt.id}
                                                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-bold bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded border border-slate-200 hover:border-blue-100 uppercase tracking-tighter transition-all"
                                                    >
                                                        <RefreshCw className={`h-3 w-3 ${syncingId === apt.id ? 'animate-spin' : ''}`} />
                                                        Sync to SK
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                value={apt.status}
                                                onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                                                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white ml-2"
                                            >
                                                <option value="scheduled">Scheduled</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                            {apt.status === 'completed' && (!apt.clinicalFinding || !apt.clinicalFinding.signedAt) && (
                                                <a
                                                    href={`/findings/new?appointmentId=${apt.id}`}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2 ml-2 transition-all shadow-sm shadow-blue-100"
                                                >
                                                    {apt.clinicalFinding ? <RefreshCw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                    {apt.clinicalFinding ? 'Edit Clinical Report' : 'Clinical Report'}
                                                </a>
                                            )}
                                            {apt.status === 'completed' && apt.clinicalFinding?.signedAt && (
                                                <div className="flex gap-2 ml-2">
                                                    <a
                                                        href={`/findings/new?appointmentId=${apt.id}`}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg flex items-center gap-2 transition-all"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        View Report
                                                    </a>
                                                    <button
                                                        onClick={() => handleBilling(apt.id)}
                                                        disabled={billingLoading === apt.id}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg flex items-center gap-2 transition-all shadow-sm shadow-emerald-100 disabled:opacity-50"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                        {billingLoading === apt.id ? '...' : 'Billing'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Appointment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900">New Appointment</h2>
                        </div>
                        <form onSubmit={handleCreateAppointment} className="p-6 space-y-6">
                            {/* Check eReferrals */}
                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Activity / Department Filter
                                    </label>
                                    <select
                                        value={searchDept}
                                        onChange={(e) => setSearchDept(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Check eReferrals (Patient MBO)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter 9-digit MBO"
                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={searchMbo}
                                            onChange={(e) => setSearchMbo(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSearchReferrals}
                                            className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                                        >
                                            {searchingInsurance ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                            Check
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Patient Verification Card */}
                            {insuranceData && !insuranceData.error && (
                                <div className={`p-4 rounded-xl border ${insuranceData.policyStatus === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {insuranceData.policyStatus === 'ACTIVE' ? (
                                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                            ) : (
                                                <ShieldAlert className="h-5 w-5 text-red-600" />
                                            )}
                                            <h3 className={`font-bold uppercase tracking-tight ${insuranceData.policyStatus === 'ACTIVE' ? 'text-emerald-800' : 'text-red-800'}`}>
                                                HZZO Verification: {insuranceData.policyStatus}
                                            </h3>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OsigInfo Real-time</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">FullName</div>
                                            <div className="font-bold text-slate-800">{insuranceData.firstName} {insuranceData.lastName}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Insurance Category</div>
                                            <div className="font-bold text-slate-800">{insuranceData.insuranceCategory || 'AO'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Supplemental Coverage</div>
                                            <div className={`font-bold ${insuranceData.hasSupplemental ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {insuranceData.hasSupplemental ? 'YES (DZO Active)' : 'NO (OZO Only)'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">MBO</div>
                                            <div className="font-mono font-bold text-blue-600">{insuranceData.mbo}</div>
                                        </div>
                                    </div>

                                    {insuranceData.policyStatus === 'INACTIVE' && (
                                        <div className="mt-4 p-3 bg-red-600 text-white rounded-lg flex items-center gap-3">
                                            <BadgeInfo className="h-6 w-6 shrink-0" />
                                            <div className="text-xs font-bold leading-tight">
                                                HARD WARNING: Patient insurance is INACTIVE. Appointment booking is BLOCKED per clinic policy.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {insuranceData?.error && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                                    <BadgeInfo className="h-5 w-5" />
                                    <div className="text-xs font-bold">{insuranceData.error}</div>
                                </div>
                            )}

                            {filteredReferrals.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Available eReferrals
                                    </label>
                                    <select
                                        value={newAppointment.referralId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setNewAppointment({ ...newAppointment, referralId: id });
                                            const ref = availableReferrals.find(r => r.id === id);
                                            setSelectedReferral(ref || null);
                                        }}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white font-medium"
                                    >
                                        <option value="">No referral (walk-in)</option>
                                        {filteredReferrals.map(ref => {
                                            const isSelectable = ref.status === 'POSLANA';
                                            return (
                                                <option
                                                    key={ref.id}
                                                    value={ref.id}
                                                    disabled={!isSelectable}
                                                    className={!isSelectable ? 'text-slate-400 italic' : 'font-bold'}
                                                >
                                                    [{ref.status}] — [{ref.diagnosisCode}] {ref.diagnosisName?.substring(0, 30)}... / [{ref.procedureCode}] {ref.procedureName?.substring(0, 30)}...
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            {/* Step 2: Detailed Referral Card */}
                            {selectedReferral && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4 shadow-sm">
                                    <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-bold text-blue-900 uppercase tracking-tight">eReferral Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest">Diagnosis (MKB-10)</label>
                                            <div className="text-sm font-bold text-slate-800">
                                                <span className="font-mono bg-blue-100 px-1 rounded mr-2">{selectedReferral.diagnosisCode}</span>
                                                {selectedReferral.diagnosisName}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest">Procedure (Blue Book)</label>
                                            <div className="text-sm font-bold text-slate-800">
                                                <span className="font-mono bg-blue-100 px-1 rounded mr-2">{selectedReferral.procedureCode}</span>
                                                {selectedReferral.procedureName}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest">Target Department</label>
                                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                {selectedReferral.targetDepartment}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest">Type / Created</label>
                                            <div className="text-sm font-bold text-slate-800">
                                                {selectedReferral.type} / {new Date(selectedReferral.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedReferral.note && (
                                        <div className="pt-2 border-t border-blue-100">
                                            <label className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest block mb-1">Clinical Note</label>
                                            <div className="text-xs text-slate-700 bg-white/50 p-2 rounded italic border border-blue-50/50">
                                                "{selectedReferral.note}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {availableReferrals.length > 0 && filteredReferrals.length === 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-bold leading-tight">
                                    ℹ️ Filter active: Found {availableReferrals.length} total referrals, but none match the selected department ({searchDept}).
                                    Click "Check" to refresh from server or change filter.
                                </div>
                            )}

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newAppointment.startTime}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newAppointment.endTime}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={!newAppointment.startTime || !newAppointment.endTime || !newAppointment.patientMbo || insuranceData?.policyStatus === 'INACTIVE'}
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Appointment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setNewAppointment({ patientId: '', referralId: '', startTime: '', endTime: '', patientMbo: '' });
                                        setAvailableReferrals([]);
                                        setSearchMbo('');
                                        setInsuranceData(null);
                                        setSelectedReferral(null);
                                    }}
                                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
