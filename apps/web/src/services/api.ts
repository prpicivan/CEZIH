// API Service for CEZIH Healthcare System

const API_BASE = '/api';

export interface InsuranceStatus {
    valid: boolean;
    patientName?: string;
    message?: string;
}

export interface Patient {
    id: string;
    mbo: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    hasSupplemental?: boolean;
    policyStatus?: string;
    policyNumber?: string;
    validUntil?: string;
    insuranceCategory?: string;
    gender?: string;
    isVeteran?: boolean;
    weaponHolder?: boolean;
    isIsolated?: boolean;
}

export interface Referral {
    id: string;
    cezihReferralId?: string;
    patientMbo: string;
    patientName: string;
    diagnosisCode: string;
    diagnosisName?: string;
    procedureCode: string;
    procedureName?: string;
    targetDepartment: string;
    note?: string;
    type: string;
    status: string;
    createdAt: string;
    appointments?: Appointment[];
    cezihMessages?: any[];
    isTakenOver?: boolean;
}

export interface Appointment {
    id: string;
    patientId: string;
    referralId?: string;
    startTime: string;
    endTime: string;
    status: string;
    patient?: Patient;
    referral?: Referral;
    clinicalFinding?: any;
    recommendations?: any[];
    invoices?: any[];

    // Insurance Snapshot
    insuranceStatus?: string;
    insuranceCategory?: string;
    hasSupplemental?: boolean;

    skId?: string;
    skSyncedAt?: string;

    // Referral Snapshot
    referralDiagnosis?: string;
    referralProcedure?: string;
    referralType?: string;
    referralNote?: string;
}

export interface CodebookItem {
    code: string;
    name: string;
}

// Insurance
export async function checkInsurance(mbo: string): Promise<InsuranceStatus> {
    const response = await fetch(`${API_BASE}/cezih/insurance/${mbo}`);
    if (!response.ok) throw new Error('Failed to check insurance');
    return response.json();
}

// Referrals
export async function getReferralsForPatient(mbo: string, dept?: string): Promise<Referral[]> {
    const url = dept && dept !== 'ALL'
        ? `${API_BASE}/referrals/patient/${mbo}?dept=${encodeURIComponent(dept)}`
        : `${API_BASE}/referrals/patient/${mbo}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch referrals');
    return response.json();
}

export async function createReferral(data: any): Promise<{ success: boolean; id: string }> {
    const response = await fetch(`${API_BASE}/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create referral');
    return response.json();
}

// Appointments
export async function getRegistryRecords(type: string, search: string = ''): Promise<any[]> {
    const response = await fetch(`${API_BASE}/registries/${type}?search=${encodeURIComponent(search)}`);
    if (!response.ok) throw new Error(`Failed to fetch registry ${type}`);
    return response.json();
}

export async function getAppointments(): Promise<Appointment[]> {
    const response = await fetch(`${API_BASE}/appointments`);
    if (!response.ok) throw new Error('Failed to fetch appointments');
    return response.json();
}

export async function getAppointment(id: string): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments`); // For now we fetch all and find, or I should add an endpoint
    const appointments: Appointment[] = await response.json();
    const found = appointments.find(a => a.id === id);
    if (!found) throw new Error('Appointment not found');
    return found;
}

export async function createAppointment(data: any): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create appointment');
    return response.json();
}

export async function updateAppointment(id: string, data: any): Promise<Appointment> {
    const response = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update appointment');
    return response.json();
}

export async function cancelAppointment(id: string): Promise<any> {
    const response = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to cancel appointment');
    return response.json();
}

// Dashboard
export async function getDashboardData(dept?: string): Promise<Referral[]> {
    const url = (dept && dept !== 'ALL')
        ? `${API_BASE}/dashboard?dept=${encodeURIComponent(dept)}`
        : `${API_BASE}/dashboard`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return response.json();
}

export async function searchInsuranceCategories(): Promise<CodebookItem[]> {
    const response = await fetch(`${API_BASE}/codebooks/insurance-categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
}

// Codebooks
export async function searchMKB10(search: string): Promise<CodebookItem[]> {
    const response = await fetch(`${API_BASE}/codebooks/mkb10?search=${encodeURIComponent(search)}`);
    if (!response.ok) throw new Error('Failed to search MKB-10');
    return response.json();
}

export async function searchProcedures(search: string): Promise<CodebookItem[]> {
    const response = await fetch(`${API_BASE}/codebooks/procedures?search=${encodeURIComponent(search)}`);
    if (!response.ok) throw new Error('Failed to search procedures');
    return response.json();
}

// Clinical Findings
export interface ClinicalFinding {
    id: string;
    appointmentId: string;
    anamnesis: string;
    statusPraesens: string;
    therapy: string;
    signedAt?: string;
    cezihFindingId?: string;
    createdAt: string;
    appointment?: Appointment;
}

export interface CreateFindingData {
    appointmentId: string;
    anamnesis: string;
    statusPraesens: string;
    therapy: string;
}

export async function createFinding(data: CreateFindingData): Promise<ClinicalFinding> {
    const response = await fetch(`${API_BASE}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create finding');
    return response.json();
}

export async function sendFindingToCezih(findingId: string): Promise<{ success: boolean; finding: ClinicalFinding; cezihId: string }> {
    const response = await fetch(`${API_BASE}/findings/${findingId}/send`, {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to send finding to CEZIH');
    return response.json();
}

export async function stornoFinding(findingId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/findings/${findingId}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to storno finding');
    return response.json();
}

export async function getFindingFHIR(findingId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/findings/${findingId}/fhir`);
    if (!response.ok) throw new Error('Failed to fetch FHIR finding');
    return response.json();
}

// Billing
export async function sendBatchInvoices(invoiceIds: string[], batchType: string = 'HZZO_F1'): Promise<{ success: boolean; batchId: string; cezihBatchId: string }> {
    const response = await fetch(`${API_BASE}/invoices/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds, batchType }),
    });
    if (!response.ok) throw new Error('Failed to send batch invoices');
    return response.json();
}

export async function getBillingStats(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/invoices/stats`);
    if (!response.ok) throw new Error('Failed to fetch billing stats');
    return response.json();
}

export async function getBillingRegistries(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/registries/billing`);
    if (!response.ok) throw new Error('Failed to fetch billing registries');
    return response.json();
}

export async function issueInvoice(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/invoices/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId }),
    });
    if (!response.ok) throw new Error('Failed to issue invoice');
    return response.json();
}

export async function issueAppointmentInvoice(appointmentId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/appointments/${appointmentId}/invoice`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to issue appointment invoice');
    return response.json();
}

// Clinical Extensions
export async function getExtendedInsurance(mbo: string): Promise<any> {
    const response = await fetch(`${API_BASE}/insurance/extended/${mbo}`);
    if (!response.ok) throw new Error('Failed to fetch extended insurance');
    return response.json();
}

export async function updatePatientInsurance(mbo: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE}/insurance/update/${mbo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update patient insurance');
    return response.json();
}

export async function stornoDocument(id: string, type: 'REFERRAL' | 'INVOICE' | 'REPORT'): Promise<any> {
    const response = await fetch(`${API_BASE}/cezih/storno/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Storno failed');
    }
    return response.json();
}

export async function searchMedication(query: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/medication/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search medication');
    return response.json();
}

// Therapy Recommendation
export async function getGuidelines(mkb: string, procedure: string): Promise<any> {
    const response = await fetch(`${API_BASE}/cezih/guidelines?mkb=${encodeURIComponent(mkb)}&procedure=${encodeURIComponent(procedure)}`);
    if (!response.ok) throw new Error('Failed to fetch guidelines');
    return response.json();
}

export async function issueRecommendation(data: any): Promise<any> {
    const response = await fetch(`${API_BASE}/medication/recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to issue recommendation');
    return response.json();
}

export async function syncAppointment(id: string): Promise<any> {
    const response = await fetch(`${API_BASE}/appointments/${id}/sync`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to sync with Central Calendar');
    return response.json();
}

export async function checkSkStatus(): Promise<any> {
    const response = await fetch(`${API_BASE}/appointments/sk/status`);
    if (!response.ok) throw new Error('Failed to check SK status');
    return response.json();
}

export async function getCezihMessages(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/cezih/messages`);
    if (!response.ok) throw new Error('Failed to fetch CEZIH messages');
    return response.json();
}

export async function createInternalReferral(data: {
    type: string;
    originalReferralId: string;
    procedureCode: string;
    procedureName: string;
    department: string;
    note?: string;
}): Promise<any> {
    const response = await fetch(`${API_BASE}/internal-referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create internal referral');
    return response.json();
}

export async function getRegistryByType(type: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/registries/${type}`);
    if (!response.ok) throw new Error(`Failed to fetch registry: ${type}`);
    return response.json();
}

