
import { useState } from 'react';
import DiagnosisPicker from '../components/DiagnosisPicker';
import ProcedurePicker from '../components/ProcedurePicker';
import { DEPARTMENTS } from '../data/mockDepartments';
import { AlertCircle, Activity, CheckCircle2, Info } from 'lucide-react';
import { checkInsurance as checkInsuranceAPI, createReferral, getGuidelines } from '../services/api';
import { useEffect } from 'react';

export default function GPPortal() {
    const [formData, setFormData] = useState({
        patientMbo: '123456789',
        birthDate: '',
        patientName: 'Marko Marić', // Added name for easier testing
        targetDepartment: '',
        diagnosisCode: '',
        diagnosisName: '',
        procedureCode: '',
        procedureName: '',
        note: '',
        type: 'A1'
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [insuranceStatus, setInsuranceStatus] = useState<any>(null);
    const [guidelinesData, setGuidelinesData] = useState<any>(null);
    const [selectedIndication, setSelectedIndication] = useState<string>('');

    useEffect(() => {
        const fetchGuidelines = async () => {
            if (formData.diagnosisCode && formData.procedureCode) {
                try {
                    const data = await getGuidelines(formData.diagnosisCode, formData.procedureCode);
                    setGuidelinesData(data);
                    setSelectedIndication(''); // Reset on change
                } catch (e) {
                    console.error('Failed to fetch guidelines:', e);
                }
            } else {
                setGuidelinesData(null);
            }
        };

        fetchGuidelines();
    }, [formData.diagnosisCode, formData.procedureCode]);

    const checkInsurance = async () => {
        if (formData.patientMbo.length !== 9) return;
        try {
            const data = await checkInsuranceAPI(formData.patientMbo);
            setInsuranceStatus(data);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to check insurance: ${e.message}`);
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        // MBO Validation: Must be exactly 9 digits
        if (!/^\d{9}$/.test(formData.patientMbo)) {
            newErrors.patientMbo = 'MBO must be exactly 9 digits';
        }

        // Department Validation: Required
        if (!formData.targetDepartment) {
            newErrors.targetDepartment = 'Target department is required';
        }

        // CEZIH PDSF Scenario 3: Hard Block if insurance is not valid
        if (!insuranceStatus || !insuranceStatus.valid) {
            newErrors.insurance = 'CEZIH: Valid health insurance is mandatory for e-Referral submission';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await createReferral(formData);
            setResult(data);
        } catch (error: any) {
            console.error('Error sending referral:', error);
            setResult({ error: error.message || 'Failed to connect to server' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="h-8 w-8 text-emerald-600" />
                    GP Portal (e-Uputnice)
                </h1>
                <p className="text-slate-500">Ordinacija opće medicine Dr. Test (External Sender)</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Insurance Status Display */}
                    {insuranceStatus && (
                        <div className={`p-4 rounded-lg border flex items-center gap-4 ${insuranceStatus.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800 animate-bounce'
                            }`}>
                            <span className="text-2xl">{insuranceStatus.valid ? '✅' : '🚨'}</span>
                            <div className="flex-1">
                                <div className="font-bold flex items-center gap-2">
                                    Health Insurance: {insuranceStatus.status}
                                    {insuranceStatus.valid ? (
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-full uppercase">PDSF Verified</span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 bg-red-600 text-white rounded-full uppercase">Compliance Block</span>
                                    )}
                                </div>
                                {insuranceStatus.valid ? (
                                    <div className="text-sm opacity-90">
                                        Supplemental: {insuranceStatus.supplemental ? 'YES (Covered)' : 'NO (Copay Required - Participacija applies)'}
                                    </div>
                                ) : (
                                    <div className="text-sm opacity-90 font-bold">
                                        CRITICAL: This patient does NOT have active health insurance. CEZIH will reject this referral.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient MBO */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Patient MBO (9 digits)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="patientMbo"
                                    value={formData.patientMbo}
                                    onChange={handleChange}
                                    className={`block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border ${errors.patientMbo ? 'border-red-500' : ''}`}
                                    placeholder="e.g. 123456789"
                                    maxLength={9}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={checkInsurance}
                                    disabled={formData.patientMbo.length !== 9}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium text-sm"
                                >
                                    Check
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Try: 123456789 (Valid), 987654321 (Expired)</p>
                            {errors.patientMbo && <p className="text-red-500 text-xs mt-1">{errors.patientMbo}</p>}
                        </div>

                        {/* Patient Name (Mock for easier testing) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
                            <input
                                type="text"
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleChange}
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                                required
                            />
                        </div>

                        {/* Referral Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Referral Type (Uputna Kategorija)</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white font-bold"
                                required
                            >
                                <option value="A1">A1 - Konzultativni pregled (Consultative)</option>
                                <option value="D1">D1 - Specijalistička obrada (Full Treatment)</option>
                                <option value="C1">C1 - Bolničko liječenje (Hospitalization)</option>
                            </select>
                        </div>

                        {/* Birth Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Birth Date</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={`block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border ${errors.birthDate ? 'border-red-500' : ''}`}
                            />
                            {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
                        </div>

                        {/* Local Department Routing */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Department</label>
                            <select
                                name="targetDepartment"
                                value={formData.targetDepartment}
                                onChange={handleChange}
                                className={`block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border ${errors.targetDepartment ? 'border-red-500' : ''} bg-white`}
                                required
                            >
                                <option value="">Select Department...</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept.code} value={dept.code}>{dept.name}</option>
                                ))}
                            </select>
                            {errors.targetDepartment && <p className="text-red-500 text-xs mt-1">{errors.targetDepartment}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Diagnosis Picker */}
                        <div>
                            <DiagnosisPicker
                                value={formData.diagnosisCode}
                                onChange={(code) => setFormData(prev => ({ ...prev, diagnosisCode: code }))}
                                onSelect={(diagnosis) => setFormData(prev => ({
                                    ...prev,
                                    diagnosisCode: diagnosis.code,
                                    diagnosisName: diagnosis.name
                                }))}
                            />
                        </div>

                        {/* Procedure Picker */}
                        <div>
                            <ProcedurePicker
                                value={formData.procedureCode}
                                onChange={(code) => setFormData(prev => ({ ...prev, procedureCode: code }))}
                                onSelect={(procedure) => setFormData(prev => ({
                                    ...prev,
                                    procedureCode: procedure.code,
                                    procedureName: procedure.name
                                }))}
                            />
                        </div>
                    </div>

                    {/* A1 Restricted Info Box */}
                    {formData.type === 'A1' && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800">SCOPE LIMITATION: A1 Referral</h4>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        Osnovom <strong>A1</strong> vrste uputnice nije moguće izdati internu uputnicu za daljnje obrade, naručiti i izdati preporuku o kontrolnim pregledima niti izdati mišljenje o radnoj sposobnosti.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
                        <textarea
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            rows={3}
                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                            placeholder="Additional clinical findings..."
                        />
                    </div>

                    {/* ordering control / eNaručivanje */}
                    {guidelinesData && (
                        <div className={`p-4 rounded-xl border-2 ${guidelinesData.requiresIndication && !selectedIndication ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                {guidelinesData.requiresIndication ? (
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                ) : (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                )}
                                <h3 className="font-bold text-slate-900">
                                    CEZIH Ordering Control (eNaručivanje)
                                </h3>
                            </div>

                            {guidelinesData.requiresIndication ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-700 font-medium">
                                        This procedure requires a specific clinical indication (Smjernica):
                                    </p>
                                    <div className="grid gap-2">
                                        {guidelinesData.guidelines.map((g: any) => (
                                            <label
                                                key={g.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedIndication === g.id
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                    : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="indication"
                                                    value={g.id}
                                                    checked={selectedIndication === g.id}
                                                    onChange={() => setSelectedIndication(g.id)}
                                                    className="sr-only"
                                                />
                                                <div className={`mt-1 h-3 w-3 rounded-full border ${selectedIndication === g.id ? 'bg-white border-white' : 'bg-slate-100 border-slate-300'}`} />
                                                <span className="text-sm font-medium">{g.text}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.indication && (
                                        <p className="text-red-500 text-xs font-bold animate-pulse">
                                            ⚠️ {errors.indication}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-700">
                                    No restricted indications required for this procedure. You may proceed.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-4">
                        {errors.insurance && (
                            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 text-red-800 text-sm font-bold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                {errors.insurance}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || (insuranceStatus && !insuranceStatus.valid)}
                            className={`w-full md:w-auto px-8 py-3 font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${insuranceStatus && !insuranceStatus.valid ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    Sending to CEZIH...
                                </span>
                            ) : (
                                'Send e-Referral'
                            )}
                        </button>
                    </div>
                </form>

                {/* Result Display */}
                {result && (
                    <div className={`p-4 rounded-lg mt-6 border ${result.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                        <h3 className="font-bold flex items-center gap-2">
                            {result.error ? '❌ Error' : '✅ Success'}
                        </h3>
                        {result.success && (
                            <div className="mt-2">
                                <p>Referral ID: <span className="font-mono font-bold text-blue-600">{result.cezihId}</span></p>
                                <p className="text-sm mt-1">Stored in Central Repository.</p>
                            </div>
                        )}
                        {result.error && <p className="mt-1">{result.error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
