import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAppointment, type Appointment } from '../services/api';
import { Printer, ArrowLeft, Building2, User, ChevronRight, CheckCircle } from 'lucide-react';

export default function InvoicePrintView() {
    const { id } = useParams<{ id: string }>();
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getAppointment(id)
                .then(setAppointment)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading Invoice...</div>;
    if (!appointment) return <div className="p-8 text-center text-red-600">Invoice not found for appointment {id}</div>;

    const invoices = appointment.invoices || [];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 print:bg-white print:py-0 print:px-0">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <Link to="/appointments" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Appointments
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-medium"
                    >
                        <Printer className="h-4 w-4" />
                        Print Invoices
                    </button>
                </div>

                {invoices.length === 0 && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                        <p className="text-slate-500">No invoices generated for this appointment.</p>
                    </div>
                )}

                {invoices.map((inv, idx) => (
                    <div key={inv.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative print:shadow-none print:border-slate-300 print:mb-8 break-inside-avoid">
                        {/* Decorative side bar */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${inv.payer === 'HZZO' ? 'bg-blue-500' : 'bg-emerald-500'}`} />

                        <div className="p-8 sm:p-12 space-y-8">
                            {/* Invoice Header */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                        <Building2 className="h-3 w-3" />
                                        Invoice {idx + 1} of {invoices.length}
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {inv.payer === 'HZZO' ? 'HZZO Official Invoice' : 'Patient Receipt & Copayment'}
                                    </h2>
                                    <p className="text-slate-400 text-sm font-medium">#{inv.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-slate-900 font-black text-2xl tracking-tighter tabular-nums">
                                        {inv.amount.toFixed(2)} <small className="text-sm font-medium text-slate-400 uppercase">EUR</small>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block ${inv.status === 'ISSUED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {inv.status}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Payer & Patient Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payer Information</h4>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="text-slate-900 font-bold text-lg">
                                                {inv.payer === 'HZZO' ? 'HZZO - Croatian Insurance Fund' : inv.payerName}
                                            </div>
                                            <div className="text-slate-500 text-sm font-medium">
                                                {inv.payer === 'HZZO' ? 'Margaretska 3, 10000 Zagreb' : `Patient MBO: ${appointment.patient?.mbo}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Information</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-slate-900 font-bold">{appointment.patient?.firstName} {appointment.patient?.lastName}</div>
                                                <div className="text-slate-500 text-xs font-medium uppercase tracking-tighter">MBO: {appointment.patient?.mbo}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Details */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Details</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start group">
                                                <div className="space-y-0.5">
                                                    <div className="text-slate-900 font-bold text-sm tracking-tight">{inv.description}</div>
                                                    <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                                                        Procedure #{appointment.referral?.procedureCode || 'G-102'}
                                                        <ChevronRight className="h-2 w-2" />
                                                        Diagnosis {appointment.referral?.diagnosisCode || 'R-10'}
                                                    </div>
                                                </div>
                                                <div className="text-slate-900 font-bold text-sm tabular-nums">{inv.amount.toFixed(2)}</div>
                                            </div>

                                            <hr className="border-slate-50 border-dashed" />

                                            <div className="flex justify-between items-center rounded-lg bg-slate-900 p-4 text-white">
                                                <div className="text-[11px] font-bold uppercase tracking-widest opacity-60">Total Amount</div>
                                                <div className="text-xl font-black tabular-nums">{inv.amount.toFixed(2)} EUR</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Notes */}
                            <div className="pt-8 flex justify-between items-end border-t border-slate-100 mt-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                                        <CheckCircle className="h-3 w-3" />
                                        Verified System Record
                                    </div>
                                    <div className="text-slate-400 text-[10px] font-medium italic">
                                        Issued on {new Date(inv.createdAt).toLocaleString('hr-HR')}
                                    </div>
                                </div>
                                <div className="h-24 w-24 bg-slate-50 rounded border border-slate-100 flex items-center justify-center border-dashed">
                                    <span className="text-[10px] text-slate-300 font-bold uppercase rotate-45 border border-slate-200 px-1">Fiscalized</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
