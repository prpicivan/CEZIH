import { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    User,
    CheckCircle,
    UserCheck,
    FileText,
    X,
    Euro,
    MoreVertical,
    ChevronDown
} from 'lucide-react';
import {
    getAppointments,
    createAppointment,
    getReferralsForPatient,
    syncAppointment,
    cancelAppointment,
    getExtendedInsurance,
    issueAppointmentInvoice,
    updateAppointment,
    type Appointment,
    type Referral
} from '../services/api';
import PatientInsuranceCard from '../components/PatientInsuranceCard';
import { useNavigate } from 'react-router-dom';

const BUSINESS_HOURS_START = 7;
const BUSINESS_HOURS_END = 21;

export default function CalendarPage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking Wizard State
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1); // 1: MBO, 2: Referral, 3: Confirm
    const [visitType, setVisitType] = useState<'HZZO' | 'PRIVATNO'>('HZZO');
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingMbo, setBookingMbo] = useState('');
    const [patientContext, setPatientContext] = useState<any>(null);
    const [availableReferrals, setAvailableReferrals] = useState<Referral[]>([]);
    const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
    const [wizardLoading, setWizardLoading] = useState(false);


    // Filter State
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'SCHEDULED' | 'CONFIRMED' | 'ARRIVED' | 'REALIZED' | 'INVOICED'>('ALL');
    const [filterType, setFilterType] = useState<'ALL' | 'HZZO' | 'PRIVATE'>('ALL');

    const getAppointmentStatus = (apt: Appointment) => {
        if (apt.status === 'cancelled') return 'CANCELLED';
        if (apt.invoices && apt.invoices.length > 0) return 'INVOICED';
        if (apt.clinicalFinding?.signedAt) return 'REALIZED';
        if (apt.referral?.isTakenOver) return 'ARRIVED';
        if (apt.skId) return 'CONFIRMED';
        return 'SCHEDULED';
    };

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const data = await getAppointments();
            // Filter for selected date
            const daysAppointments = data.filter(apt => {
                const aptDate = new Date(apt.startTime);
                return aptDate.toDateString() === selectedDate.toDateString();
            });
            setAppointments(daysAppointments);
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAppointments = appointments.filter(apt => {
        // 1. Visit Type Filter
        if (filterType === 'HZZO' && !apt.referral) return false;
        if (filterType === 'PRIVATE' && apt.referral) return false;

        // 2. Status Filter
        if (filterStatus === 'ALL') return true;
        const status = getAppointmentStatus(apt);
        return status === filterStatus;
    });

    const handleSlotClick = (hour: number, minute: number) => {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} `;
        setSelectedSlot(timeString);

        // Reset Wizard
        setWizardStep(1);
        setBookingMbo('');
        setVisitType('HZZO'); // Default
        setPatientContext(null);
        setAvailableReferrals([]);
        setSelectedReferral(null);
        setShowWizard(true);
    };

    const handleMboSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingMbo || bookingMbo.length !== 9) {
            alert('Please enter a valid 9-digit MBO');
            return;
        }

        setWizardLoading(true);
        try {
            // Check Patient/Insurance first and show Card
            const insurance = await getExtendedInsurance(bookingMbo);
            setPatientContext(insurance);
            setWizardStep(1.5); // Go to Verification Step
        } catch (error: any) {
            alert('Error fetching patient data: ' + error.message);
        } finally {
            setWizardLoading(false);
        }
    };

    const handleVerificationContinue = async () => {
        setWizardLoading(true);
        try {
            if (visitType === 'HZZO') {
                // Fetch Referrals only for HZZO
                const referrals = await getReferralsForPatient(bookingMbo);
                setAvailableReferrals(referrals);
                setWizardStep(2); // Go to Referral Selection
            } else {
                // Private: Skip Referral Selection
                setAvailableReferrals([]);
                setSelectedReferral(null);
                setWizardStep(3); // Go directly to Confirm
            }
        } catch (error: any) {
            alert('Error fetching referrals: ' + error.message);
        } finally {
            setWizardLoading(false);
        }
    };


    const handleBookingConfirm = async () => {
        if (!selectedSlot || !patientContext) return;
        // For HZZO, referral is required. For Private, it is not.
        if (visitType === 'HZZO' && !selectedReferral) return;

        setWizardLoading(true);
        try {
            // Construct start/end times
            const [hours, minutes] = selectedSlot.split(':').map(Number);
            const startTime = new Date(selectedDate);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = new Date(startTime);
            endTime.setMinutes(startTime.getMinutes() + 15); // Default 15 min slot

            // Create Appointment
            await createAppointment({
                patientMbo: patientContext.mbo,
                referralId: selectedReferral?.id, // Optional now
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            });

            // Close & Refresh
            setShowWizard(false);
            fetchAppointments();
        } catch (error: any) {
            alert('Booking failed: ' + error.message);
        } finally {
            setWizardLoading(false);
        }
    };

    // Business Logic Actions
    const handleStatusAction = async (apt: Appointment, action: 'CONFIRM' | 'ARRIVE' | 'REPORT' | 'INVOICE' | 'CANCEL') => {
        if (!confirm(`Are you sure you want to trigger action: ${action}?`)) return;

        try {
            switch (action) {
                case 'CONFIRM':
                    await syncAppointment(apt.id);
                    break;
                case 'ARRIVE':
                    // Mark appointment as completed to trigger backend takeoverReferral
                    await updateAppointment(apt.id, { status: 'completed' });
                    break;
                case 'REPORT':
                    navigate(`/findings/new?appointmentId=${apt.id}&source=calendar`);
                    return; // Navigates away
                case 'INVOICE':
                    await issueAppointmentInvoice(apt.id);
                    break;
                case 'CANCEL':
                    await cancelAppointment(apt.id);
                    break;
            }
            fetchAppointments();
        } catch (error: any) {
            alert(`Action ${action} failed: ` + error.message);
        }
    };

    // Helper: State Machine for Actions
    const getAvailableActions = (apt: Appointment) => {
        const actions: { label: string; action: 'CONFIRM' | 'ARRIVE' | 'REPORT' | 'INVOICE' | 'CANCEL'; icon: any; color: string }[] = [];

        // 1. Scheduled (Local only)
        if (!apt.skId && apt.status !== 'cancelled') {
            actions.push({ label: 'Confirm (Sync)', action: 'CONFIRM', icon: CheckCircle, color: 'text-blue-600' });
            actions.push({ label: 'Cancel', action: 'CANCEL', icon: X, color: 'text-red-600' });
        }

        // 2. Confirmed (Synced, not Arrived)
        else if (apt.skId && !apt.referral?.isTakenOver && apt.status !== 'cancelled') {
            actions.push({ label: 'Mark Arrived', action: 'ARRIVE', icon: UserCheck, color: 'text-emerald-600' });
            actions.push({ label: 'Cancel', action: 'CANCEL', icon: X, color: 'text-red-600' });
        }

        // 3. Arrived (Taken Over, No Report)
        else if (apt.referral?.isTakenOver && !apt.clinicalFinding?.signedAt && apt.status !== 'cancelled') {
            actions.push({ label: 'Write Report', action: 'REPORT', icon: FileText, color: 'text-blue-600' });
            actions.push({ label: 'Cancel', action: 'CANCEL', icon: X, color: 'text-red-600' });
        }

        // 4. Realized (Report Signed, Not Invoiced)
        else if (apt.clinicalFinding?.signedAt && (!apt.invoices || apt.invoices.length === 0)) {
            actions.push({ label: 'Issue Invoice', action: 'INVOICE', icon: Euro, color: 'text-purple-600' });
            // User explicitly requested NO CANCEL here
        }

        return actions;
    };

    const getBlockColor = (apt: Appointment) => {
        if (apt.status === 'cancelled') return 'bg-slate-100 border-slate-300 opacity-60';
        if (apt.invoices && apt.invoices.length > 0) return 'bg-green-800 text-white border-green-900'; // Invoiced
        if (apt.clinicalFinding?.signedAt) return 'bg-teal-100 border-teal-600 text-teal-900'; // Realized
        // Check for "Arrived/TakenOver" - backend might track this on referral
        if (apt.referral?.isTakenOver) return 'bg-emerald-100 border-emerald-600 text-emerald-900'; // Arrived
        if (apt.status === 'confirmed' || apt.skId) return 'bg-purple-100 border-purple-600 text-purple-900'; // Confirmed
        return 'bg-blue-100 border-blue-500 text-blue-900'; // Scheduled
    };

    const renderTimeSlots = () => {
        const slots = [];
        for (let i = BUSINESS_HOURS_START; i < BUSINESS_HOURS_END; i++) {
            for (let j = 0; j < 60; j += 15) {
                const timeStr = `${i.toString().padStart(2, '0')}:${j.toString().padStart(2, '0')} `;

                // Find appointments sharing this slot
                const slotApts = filteredAppointments.filter(apt => {
                    const aptStart = new Date(apt.startTime);
                    // Check if appointment starts within this 15-minute slot
                    return aptStart.getHours() === i &&
                        aptStart.getMinutes() >= j &&
                        aptStart.getMinutes() < j + 15;
                });

                slots.push(
                    <div key={`${i}-${j}`} className="flex border-b border-slate-300 min-h-[80px] group relative hover:bg-slate-50/50 transition-colors">
                        {/* Time Label */}
                        <div className="w-20 py-2 pr-4 text-right text-sm font-black text-slate-900 border-r-2 border-slate-300 bg-slate-100/50">
                            {j === 0 ? `${i}:00` : ''}
                        </div>

                        {/* Appointment Area */}
                        <div className="flex-1 relative p-1">
                            {/* Empty Slot Clicker */}
                            {slotApts.length === 0 && (
                                <button
                                    onClick={() => handleSlotClick(i, j)}
                                    className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center bg-blue-50/80 text-blue-700 font-bold transition-all border-2 border-dashed border-blue-300 m-1 rounded-lg"
                                >
                                    <Plus className="h-5 w-5" /> Book {timeStr}
                                </button>
                            )}

                            {/* Render Appointments */}
                            {slotApts.map(apt => {
                                const availableActions = getAvailableActions(apt);
                                return (
                                    <div
                                        key={apt.id}
                                        className={`absolute inset-x-1 top-1 bottom-1 rounded border shadow-sm p-2 text-xs overflow-hidden cursor-pointer hover:shadow-md transition-all group/apt ${getBlockColor(apt)} z-10 hover:z-20 hover:min-h-[120px]`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <div className="flex h-full gap-2">
                                            {/* LEFT COLUMN: Patient Info & Details (60%) */}
                                            <div className="w-[60%] flex flex-col justify-between h-full min-w-0 pr-1">
                                                {/* Header */}
                                                <div>
                                                    <div className="font-bold text-sm leading-tight mb-1 truncate">
                                                        {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        <span className="mx-1">•</span>
                                                        {apt.patient?.lastName} {apt.patient?.firstName}
                                                    </div>

                                                    {/* Badges: Visit Type + Ref Type */}
                                                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                                                        {apt.referral ? (
                                                            <>
                                                                <span className="px-1 rounded font-bold text-white text-[10px] bg-blue-600">
                                                                    HZZO
                                                                </span>
                                                                <span className={`px - 1 rounded font - bold text - white text - [10px] ${(apt.referralType || apt.referral?.type) === 'A1' ? 'bg-red-500' :
                                                                    (apt.referralType || apt.referral?.type) === 'C1' ? 'bg-blue-500' :
                                                                        (apt.referralType || apt.referral?.type) === 'D1' ? 'bg-purple-500' : 'bg-slate-500'
                                                                    } `}>
                                                                    {apt.referralType || apt.referral?.type || 'N/A'}
                                                                </span>
                                                                <span className="font-mono text-[10px] opacity-70 truncate max-w-[60px]">
                                                                    #{apt.referral?.cezihReferralId?.slice(-4) || 'LOC'}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="px-1.5 rounded font-bold text-black text-[10px] bg-amber-400 border border-amber-500/20">
                                                                PRIVATNO
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Clinical Info */}
                                                <div className="flex flex-col gap-0.5 opacity-90 min-w-0">
                                                    {/* Department */}
                                                    <div className="text-[10px] font-semibold opacity-80 truncate uppercase">
                                                        {(() => {
                                                            const dept = apt.referral?.targetDepartment || '';
                                                            const map: Record<string, string> = {
                                                                'PED': 'Pediátrija',
                                                                'SK': 'Školska medicina',
                                                                'OBITELJSKA': 'Obiteljska medicina',
                                                                'INTERNA': 'Interna medicina',
                                                                'FIZIKALNA': 'Fizikalna medicina',
                                                                'NEURO': 'Neurologija',
                                                                'PSIHIJATRIJA': 'Psihijatrija',
                                                                'KIRURGIJA': 'Kirurgija'
                                                            };
                                                            return map[dept] || dept || 'Opća praksa';
                                                        })()}
                                                    </div>

                                                    {/* MKB */}
                                                    <div className="font-semibold truncate text-[11px]" title={apt.referralDiagnosis || apt.referral?.diagnosisName}>
                                                        {(() => {
                                                            const code = apt.referral?.diagnosisCode || '';
                                                            const name = apt.referralDiagnosis || apt.referral?.diagnosisName || 'No Context';
                                                            if (name.startsWith(code)) return name;
                                                            return <><span className="font-bold opacity-70 mr-1">{code}:</span>{name}</>;
                                                        })()}
                                                    </div>

                                                    {/* Procedure */}
                                                    <div className="text-[10px] truncate opacity-80" title={apt.referralProcedure || apt.referral?.procedureName}>
                                                        {(() => {
                                                            const code = apt.referral?.procedureCode || '';
                                                            const name = apt.referralProcedure || apt.referral?.procedureName || 'Consultation';
                                                            if (name.startsWith(code)) return name;
                                                            return <><span className="font-bold opacity-70 mr-1">{code}:</span>{name}</>;
                                                        })()}
                                                    </div>

                                                    {/* Note */}
                                                    {(apt.referralNote || apt.referral?.note) && (
                                                        <div className="mt-0.5 pt-0.5 border-t border-black/10 text-[10px] italic truncate">
                                                            "{apt.referralNote || apt.referral?.note}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: Lifecycle (40%) */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center px-1 border-l border-black/5 pl-2 relative">
                                                {/* Action Dropdown (Absolute top-right relative to this column) */}
                                                <div className="absolute top-0 right-0 z-50">
                                                    {availableActions.length > 0 && (
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const menu = document.getElementById(`menu - ${apt.id} `);
                                                                    if (menu) menu.classList.toggle('hidden');
                                                                }}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>
                                                            {/* Dropdown Menu */}
                                                            <div
                                                                id={`menu - ${apt.id} `}
                                                                className="hidden absolute right-0 mt-1 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                                                                onMouseLeave={() => {
                                                                    const menu = document.getElementById(`menu - ${apt.id} `);
                                                                    if (menu) menu.classList.add('hidden');
                                                                }}
                                                            >
                                                                <div className="py-1">
                                                                    {availableActions.map((action) => (
                                                                        <button
                                                                            key={action.action}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleStatusAction(apt, action.action);
                                                                                const menu = document.getElementById(`menu - ${apt.id} `);
                                                                                if (menu) menu.classList.add('hidden');
                                                                            }}
                                                                            className={`flex w - full items - center px - 4 py - 2 text - sm hover: bg - slate - 50 ${action.color} `}
                                                                        >
                                                                            <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                                                            {action.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Lifecycle Content */}
                                                <div className="w-full mt-4"> {/* mt-4 to clear action button */}
                                                    {(() => {
                                                        const steps = [
                                                            { label: 'Naručen', active: true },
                                                            { label: 'Potvrđen', active: !!apt.skId },
                                                            { label: 'Stigao', active: !!apt.referral?.isTakenOver },
                                                            { label: 'Obrađen', active: !!apt.clinicalFinding?.signedAt },
                                                            { label: 'Naplaćen', active: (apt.invoices?.length || 0) > 0 }
                                                        ];

                                                        let currentIndex = steps.map(s => s.active).lastIndexOf(true);

                                                        return (
                                                            <div className="flex flex-col gap-1 w-full">
                                                                {/* Bars */}
                                                                <div className="flex gap-1 h-1.5 w-full"> {/* Slightly taller bars */}
                                                                    {steps.map((_, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`flex - 1 rounded - full bg - current opacity - ${idx <= currentIndex ? '100' : '20'} ${idx === currentIndex ? 'animate-pulse' : ''} `}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                {/* Labels */}
                                                                <div className="flex justify-between text-[8px] font-medium opacity-80 select-none w-full">
                                                                    {steps.map((step, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`flex - 1 text - center ${idx <= currentIndex ? 'opacity-100 font-bold' : 'opacity-50'} `}
                                                                        >
                                                                            {step.label}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
        }
        return slots;
    };

    // Calculate Funnel Metrics
    const metrics = {
        total: appointments.length,
        confirmed: appointments.filter(a => a.skId).length,
        arrived: appointments.filter(a => a.referral?.isTakenOver).length,
        realized: appointments.filter(a => a.clinicalFinding?.signedAt).length,
        invoiced: appointments.filter(a => a.invoices && a.invoices.length > 0).length
    };

    return (
        <div className="bg-white min-h-screen h-screen flex flex-col overflow-hidden">
            {/* Header / Date Control (Fixed Height) */}
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white z-20 shrink-0 h-[80px]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 hover:bg-slate-100 rounded-lg border-2 border-transparent hover:border-slate-300 transition-colors">
                        <ChevronLeft className="h-6 w-6 text-slate-900" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-black">
                            {selectedDate.toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-widest">Day View • Cabinet 1</div>
                    </div>
                    <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 hover:bg-slate-100 rounded-lg border-2 border-transparent hover:border-slate-300 transition-colors">
                        <ChevronRight className="h-6 w-6 text-slate-900" />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-200 rounded-lg border-2 border-slate-300 bg-white"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* Main Layout: Fixed Sidebar + Scrollable Calendar */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Funnel Analytics */}
                <div className="w-[280px] bg-slate-50 border-r-2 border-slate-300 overflow-y-auto p-4 flex flex-col gap-6 shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
                    <div className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2 border-b-2 border-slate-200 pb-2">Daily Funnel</div>

                    {/* Funnel Steps */}
                    {/* Funnel Steps */}
                    <div className="flex flex-col gap-0 pb-12">
                        {/* 1. Total / Scheduled */}
                        <div className="z-10 bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-slate-600 uppercase">Booked</span>
                                <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded text-[10px] font-bold">100%</span>
                            </div>
                            <div className="text-3xl font-black text-black">{metrics.total}</div>
                            <div className="text-xs text-slate-500 font-bold mt-1">Appointments</div>
                        </div>

                        {/* Connector */}
                        <div className="flex flex-col items-center -my-2 z-0 relative">
                            <div className="w-1 h-4 bg-slate-300"></div>
                            <ChevronDown className="w-5 h-5 text-slate-400 bg-slate-50" />
                        </div>

                        {/* 2. Confirmed */}
                        <div className="z-10 bg-white border-l-[6px] border-blue-600 border-y-2 border-r-2 border-slate-300 rounded-xl p-4 shadow-sm relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-blue-800 uppercase">Confirmed</span>
                                <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                                    {metrics.total ? Math.round((metrics.confirmed / metrics.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="text-3xl font-black text-black">{metrics.confirmed}</div>
                            <div className="text-xs text-slate-500 font-bold mt-1">Sync w/ CEZIH</div>
                        </div>

                        {/* Connector */}
                        <div className="flex flex-col items-center -my-3 z-0 relative h-8 justify-center">
                            <div className="absolute inset-y-0 w-0.5 bg-slate-200"></div>
                            <div className="relative z-10 bg-slate-50 p-0.5 rounded-full border border-slate-200">
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                            </div>
                        </div>

                        {/* 3. Arrived */}
                        <div className="z-10 bg-white border-l-[6px] border-emerald-600 border-y-2 border-r-2 border-slate-300 rounded-xl p-4 shadow-sm relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-emerald-800 uppercase">Arrived</span>
                                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                                    {metrics.total ? Math.round((metrics.arrived / metrics.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="text-3xl font-black text-black">{metrics.arrived}</div>
                            <div className="text-xs text-slate-500 font-bold mt-1">In Waiting Room</div>
                        </div>

                        {/* Connector */}
                        <div className="flex flex-col items-center -my-3 z-0 relative h-8 justify-center">
                            <div className="absolute inset-y-0 w-0.5 bg-slate-200"></div>
                            <div className="relative z-10 bg-slate-50 p-0.5 rounded-full border border-slate-200">
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                            </div>
                        </div>

                        {/* 4. Realized */}
                        <div className="z-10 bg-white border-l-[6px] border-purple-600 border-y-2 border-r-2 border-slate-300 rounded-xl p-4 shadow-sm relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-purple-800 uppercase">Realized</span>
                                <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">
                                    {metrics.total ? Math.round((metrics.realized / metrics.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="text-3xl font-black text-black">{metrics.realized}</div>
                            <div className="text-xs text-slate-500 font-bold mt-1">Report Signed</div>
                        </div>

                        {/* Connector */}
                        <div className="flex flex-col items-center -my-3 z-0 relative h-8 justify-center">
                            <div className="absolute inset-y-0 w-0.5 bg-slate-200"></div>
                            <div className="relative z-10 bg-slate-50 p-0.5 rounded-full border border-slate-200">
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                            </div>
                        </div>

                        {/* 5. Invoiced */}
                        <div className="z-10 bg-slate-900 text-white rounded-xl p-4 shadow-xl border-4 border-slate-800 relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-white/90 uppercase">Invoiced</span>
                                <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/10">
                                    {metrics.total ? Math.round((metrics.invoiced / metrics.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black">{metrics.invoiced}</span>
                                <span className="text-sm font-bold opacity-80">inv.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content: Filter Bar + Calendar Grid */}
                <div className="flex-1 overflow-y-auto relative bg-white">
                    {/* Filters Header (Sticky) */}
                    <div className="sticky top-0 z-30 shadow-md">
                        {/* 1. Appointment Type Filters */}
                        <div className="bg-white border-b-2 border-slate-300 px-6 py-3 flex gap-3 z-40 relative">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all border-2 ${filterType === 'ALL'
                                    ? 'bg-slate-900 border-black text-white shadow-lg'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                                    }`}
                            >
                                SVI TERMINI
                            </button>
                            <div className="w-px h-8 bg-slate-300 mx-2 self-center"></div>
                            <button
                                onClick={() => setFilterType('HZZO')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all border-2 ${filterType === 'HZZO'
                                    ? 'bg-blue-600 border-blue-800 text-white shadow-lg'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${filterType === 'HZZO' ? 'bg-white' : 'bg-blue-500'}`} />
                                HZZO
                            </button>
                            <button
                                onClick={() => setFilterType('PRIVATE')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all border-2 ${filterType === 'PRIVATE'
                                    ? 'bg-amber-400 border-amber-600 text-black shadow-lg'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${filterType === 'PRIVATE' ? 'bg-black' : 'bg-amber-400'}`} />
                                PRIVATNI
                            </button>
                        </div>

                        {/* 2. Status Filters */}
                        <div className="border-b-2 border-slate-300 px-6 py-2 flex gap-2 overflow-x-auto bg-slate-100 scrollbar-hide">
                            {(['ALL', 'SCHEDULED', 'CONFIRMED', 'ARRIVED', 'REALIZED', 'INVOICED'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-2 whitespace-nowrap ${filterStatus === status
                                        ? 'bg-blue-700 border-blue-900 text-white shadow-md transform scale-105'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400 hover:text-black'
                                        }`}
                                >
                                    {status === 'ALL' ? 'SVI STATUSI' :
                                        status === 'SCHEDULED' ? 'NARUČENI' :
                                            status === 'CONFIRMED' ? 'POTVRĐENI' :
                                                status === 'ARRIVED' ? 'STIGLI' :
                                                    status === 'REALIZED' ? 'OBRAĐENI' :
                                                        'NAPLAĆENI'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="max-w-5xl mx-auto border-x-2 border-slate-300 min-h-[calc(100vh-120px)] pb-20 bg-white shadow-sm">
                        {loading ? (
                            <div className="p-12 text-center text-slate-800 font-medium">Loading schedule...</div>
                        ) : (
                            renderTimeSlots()
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Wizard Modal */}
            {showWizard && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">New Booking @ {selectedSlot}</h3>
                            <button onClick={() => setShowWizard(false)} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="p-6">
                            {/* Step 1: MBO & Visit Type */}
                            {wizardStep === 1 && (
                                <form onSubmit={handleMboSubmit} className="space-y-6">
                                    {/* Visit Type Selection (Cards) */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Appointment Type</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setVisitType('HZZO')}
                                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${visitType === 'HZZO'
                                                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full ${visitType === 'HZZO' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="font-bold">HZZO Referral</div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setVisitType('PRIVATNO')}
                                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${visitType === 'PRIVATNO'
                                                    ? 'border-amber-500 bg-amber-50/50 text-amber-700 shadow-sm'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full ${visitType === 'PRIVATNO' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                    <Euro className="h-6 w-6" />
                                                </div>
                                                <div className="font-bold">Private / Self-Pay</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* MBO Input */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Identification</label>
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={bookingMbo}
                                                onChange={(e) => setBookingMbo(e.target.value)}
                                                placeholder="Enter 9-digit MBO..."
                                                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-mono focus:border-blue-500 outline-none transition-colors placeholder:text-slate-300"
                                            />
                                            <button
                                                type="submit"
                                                disabled={wizardLoading}
                                                className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-lg shadow-slate-200"
                                            >
                                                {wizardLoading ? 'Checking...' : 'Check'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info Alert */}
                                    <div className={`p-4 rounded-xl text-xs flex gap-3 items-start border ${visitType === 'HZZO'
                                        ? 'bg-blue-50 border-blue-100 text-blue-700'
                                        : 'bg-amber-50 border-amber-100 text-amber-800'
                                        }`}>
                                        <div className={`mt-0.5 p-1 rounded-full ${visitType === 'HZZO' ? 'bg-blue-200 text-blue-700' : 'bg-amber-200 text-amber-800'}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div className="leading-relaxed">
                                            {visitType === 'HZZO'
                                                ? <><span className="font-bold block mb-1">Referral Required</span>System will fetch and validate active eReferrals from CEZIH. You must select a valid referral to proceed.</>
                                                : <><span className="font-bold block mb-1">Direct Booking</span>No referral needed. An invoice will be generated directly for the patient. Please verify payment method at arrival.</>
                                            }
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Step 1.5: Insurance Verification */}
                            {wizardStep === 1.5 && patientContext && (
                                <div className="space-y-4">
                                    <PatientInsuranceCard patient={patientContext} compact={true} />

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setWizardStep(1)}
                                            className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleVerificationContinue}
                                            disabled={wizardLoading}
                                            className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-bold hover:bg-cyan-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-cyan-200"
                                        >
                                            {wizardLoading ? 'Loading...' : 'Confirm Identity & Continue'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Referral Selection (HZZO Only) */}
                            {wizardStep === 2 && patientContext && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                        <User className="h-8 w-8 text-slate-400 p-1.5 bg-white rounded-full border" />
                                        <div>
                                            <div className="font-bold text-slate-800">{patientContext.firstName} {patientContext.lastName}</div>
                                            <div className="text-xs text-slate-500 bg-white px-1 rounded inline-block border">MBO: {patientContext.mbo}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {availableReferrals.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 italic">No active referrals found.</div>
                                        ) : (
                                            availableReferrals.map(ref => {
                                                const isValid = ref.status === 'POSLANA';
                                                return (
                                                    <div
                                                        key={ref.id}
                                                        onClick={() => isValid && setSelectedReferral(ref)}
                                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedReferral?.id === ref.id
                                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                            : isValid
                                                                ? 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'
                                                                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed grayscale'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-sm text-slate-800">{ref.diagnosisName}</div>
                                                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {ref.status}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">{ref.procedureName}</div>
                                                        <div className="text-[10px] font-mono text-slate-400 mt-1">Ref ID: {ref.cezihReferralId || 'LOCAL'}</div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => setWizardStep(1)} className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Back</button>
                                        <button
                                            onClick={handleBookingConfirm}
                                            disabled={!selectedReferral || wizardLoading}
                                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                                        >
                                            {wizardLoading ? 'Booking...' : 'Confirm HZZO Booking'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Private Booking Confirmation */}
                            {wizardStep === 3 && patientContext && (
                                <div className="space-y-6 text-center">
                                    <div className="flex flex-col items-center gap-2 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 mb-2">
                                            <User className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">{patientContext.firstName} {patientContext.lastName}</h3>
                                        <div className="text-sm text-slate-500 font-mono bg-white px-2 py-1 rounded border">MBO: {patientContext.mbo}</div>

                                        <div className="mt-4 flex gap-2">
                                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                                                PRIVATE VISIT
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => setWizardStep(1)} className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Back</button>
                                        <button
                                            onClick={handleBookingConfirm}
                                            disabled={wizardLoading}
                                            className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                                        >
                                            {wizardLoading ? 'Booking...' : 'Confirm Private Booking'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
