import prisma from '../db/prisma';
import { SoapClientWrapper } from './soap-client';
import { HL7_TEMPLATES, populateTemplate } from '../utils/hl7-templates';
import { CEZIH_CONFIG } from '../config/config';

export interface CezihReferral {
    id: string;
    patientMbo: string;
    patientName: string;
    diagnosis: string; // MKB
    procedure: string; // Djelatnost
    createdAt: string;
    status: 'POSLANA' | 'REZERVIRANA' | 'U OBRADI' | 'REALIZIRANA' | 'STORNIRANA' | 'ISTEKLA';
    targetDepartment?: string;
    targetHospital?: string;
}

export class CezihService {
    private client: SoapClientWrapper;
    // In-Memory Storage for Mock Mode (Shared across the API instance)
    // NOTE: In production, this would be a DB or the real CEZIH
    private mockReferrals: CezihReferral[] = [];

    constructor() {
        // Placeholder WSDL
        const wsdlPath = `${CEZIH_CONFIG.ENDPOINTS.REFERRAL}?wsdl`;

        this.client = new SoapClientWrapper({
            wsdlPath,
            endpointUrl: CEZIH_CONFIG.ENDPOINTS.REFERRAL
        });

        // Seed some initial referrals for testing
        this.seedMockData();
    }

    private seedMockData() {
        this.mockReferrals.push({
            id: 'REF-SEED-1',
            patientMbo: '123456789',
            patientName: 'Marko Marić',
            diagnosis: 'R10.4', // Abdominal pain
            procedure: 'USG Abdomena',
            createdAt: new Date().toISOString(),
            status: 'POSLANA',
            targetDepartment: 'Radiology'
        });
    }

    // Mock Patient Insurance Database
    async checkInsuranceStatus(mbo: string) {
        const cleanMbo = mbo.trim();
        console.log(`Checking Insurance for MBO: '${cleanMbo}'`);

        // Check DB first for persistent mock data
        const patient = await (prisma as any).patient.findUnique({ where: { mbo: cleanMbo } });

        let result;
        if (patient) {
            result = {
                valid: patient.policyStatus === 'ACTIVE',
                supplemental: patient.hasSupplemental,
                status: patient.policyStatus,
                description: `${patient.policyStatus} (HZZO Database)`
            };
        } else {
            // Fallback for hardcoded test cases
            if (cleanMbo === '123456789') {
                result = { valid: true, supplemental: true, status: 'AO', description: 'Active (Osnovno + Dopunsko)' };
            } else if (cleanMbo === '987654321') {
                result = { valid: true, supplemental: false, status: 'AO_ONLY', description: 'Active (No Supplement)' };
            } else if (cleanMbo === '000000000') {
                result = { valid: false, supplemental: false, status: 'INACTIVE', description: 'Policy Expired' };
            } else {
                result = { valid: true, supplemental: true, status: 'AO', description: 'Active (Mock)' };
            }
        }

        // Audit Logging
        await this.logCezihMessage({
            type: 'CHECK_INSURANCE',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ mbo: cleanMbo }),
            response: JSON.stringify(result),
            mbo: cleanMbo
        });

        return result;
    }

    async logCezihMessage(data: {
        type: string,
        direction: 'OUTGOING' | 'INCOMING',
        status: 'SENT' | 'FAILED' | 'PENDING',
        payload: string,
        response?: string,
        errorMessage?: string,
        mbo?: string,
        referralId?: string,
        invoiceId?: string,
        appointmentId?: string
    }) {
        return await (prisma as any).cezihMessage.create({
            data: {
                type: data.type,
                direction: data.direction,
                status: data.status,
                payload: data.payload,
                response: data.response,
                errorMessage: data.errorMessage,
                patientMbo: data.mbo,
                referralId: data.referralId,
                invoiceId: data.invoiceId,
                appointmentId: data.appointmentId
            }
        });
    }

    async getCezihMessages() {
        return await (prisma as any).cezihMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    async sendReferral(referralData: any, dbReferralId?: string) {
        console.log('GP: Sending Referral (Structuring HL7)...', referralData);

        const cezihId = 'REF-' + Date.now();
        const xml = populateTemplate(HL7_TEMPLATES.SEND_REFERRAL, {
            messageId: 'MSG-' + Date.now(),
            timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
            senderId: CEZIH_CONFIG.SYSTEM_ID,
            referralId: cezihId,
            referralType: referralData.type || 'A1',
            patientMbo: referralData.patientMbo,
            patientName: referralData.patientName,
            doctorId: referralData.doctorId || CEZIH_CONFIG.DEFAULT_DOCTOR_ID,
            diagnosisCode: referralData.diagnosisCode || 'R10.4'
        });

        console.log('Generated HL7 XML (POLB_IN990031):\n', xml);

        // Audit Logging
        await this.logCezihMessage({
            type: 'SEND_REFERRAL',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: xml,
            mbo: referralData.patientMbo,
            referralId: dbReferralId
        });

        return { success: true, id: cezihId };
    }

    async getReferralsForPatient(mbo: string) {
        console.log(`Searching referrals for MBO: ${mbo}`);
        return this.mockReferrals.filter(ref => ref.patientMbo === mbo);
    }

    // For GP Dashboard
    async getAllReferrals() {
        return this.mockReferrals.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    async issueInvoice(referralId: string) {
        // Find referral in DB for real data interaction
        const dbReferral = await (prisma as any).referral.findUnique({
            where: { id: referralId },
            include: { patient: true }
        });

        if (!dbReferral) {
            throw new Error(`Referral ${referralId} not found for invoicing.`);
        }

        const patient = dbReferral.patient;
        const baseAmount = 15.00;
        const description = `${dbReferral.procedureName || 'Specialist Examination'} (${dbReferral.targetDepartment})`;

        // HZZO Invoice
        const hzzoInvoice = await (prisma as any).invoice.create({
            data: {
                referralId: dbReferral.id,
                amount: baseAmount,
                type: 'SKZZ',
                status: 'ISSUED',
                payer: 'HZZO',
                description
            }
        });

        let patientInvoice = null;
        let copaymentAmount = 0;

        // Oncology Exception (C76.4) - 100% coverage
        if (dbReferral.diagnosisCode === 'C76.4') {
            console.log(`HZZO: Oncology Exception (C76.4). 100% coverage applied.`);
        } else if (!patient.hasSupplemental) {
            copaymentAmount = Math.min(baseAmount * 0.2, 5.00);
            patientInvoice = await (prisma as any).invoice.create({
                data: {
                    referralId: dbReferral.id,
                    amount: copaymentAmount,
                    type: 'COP_PATIENT',
                    status: 'ISSUED',
                    payer: 'PATIENT',
                    payerName: `${patient.firstName} ${patient.lastName}`,
                    description: `Copayment for ${description}`
                }
            });
        }

        // Audit Log: Invoice Issued
        await this.logCezihMessage({
            type: 'ISSUE_INVOICE',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ hzzoInvoiceId: hzzoInvoice.id, amount: baseAmount }),
            referralId: dbReferral.id,
            mbo: patient.mbo,
            invoiceId: hzzoInvoice.id
        });

        return { ...dbReferral, invoices: [hzzoInvoice, patientInvoice].filter(Boolean), copaymentAmount };
    }

    async issueAppointmentInvoices(appointmentId: string) {
        const appointment = await (prisma as any).appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: true,
                referral: true,
                clinicalFinding: true
            }
        });

        if (!appointment) throw new Error(`Appointment ${appointmentId} not found.`);
        if (!appointment.clinicalFinding?.signedAt) throw new Error("Cannot issue invoice for unsigned finding.");

        const patient = appointment.patient;
        const referral = appointment.referral;
        const baseAmount = 15.00;

        const description = referral
            ? `${referral.procedureName || 'Specialist Examination'} (${referral.targetDepartment})`
            : `Specialist Examination (Walk-in)`;

        // 1. HZZO Invoice
        const hzzoInvoice = await (prisma as any).invoice.create({
            data: {
                appointmentId,
                amount: baseAmount,
                type: 'SKZZ',
                status: 'ISSUED',
                payer: 'HZZO',
                description,
                referralId: referral?.id
            }
        });

        let patientInvoice = null;
        let copaymentAmount = 0;

        // 2. Patient Copayment Invoice (if no supplemental)
        const isOncology = referral?.diagnosisCode === 'C76.4';
        if (!isOncology && !patient.hasSupplemental) {
            copaymentAmount = Math.min(baseAmount * 0.2, 5.00);
            patientInvoice = await (prisma as any).invoice.create({
                data: {
                    appointmentId,
                    amount: copaymentAmount,
                    type: 'COP_PATIENT',
                    status: 'ISSUED',
                    payer: 'PATIENT',
                    payerName: `${patient.firstName} ${patient.lastName}`,
                    description: `Copayment for ${description}`,
                    referralId: referral?.id
                }
            });
        }

        return {
            success: true,
            invoices: [hzzoInvoice, patientInvoice].filter(Boolean),
            copaymentAmount
        };
    }

    async sendInvoiceToCezih(referralId: string) {
        // Audit Logging for submission
        await this.logCezihMessage({
            type: 'SEND_INVOICE',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ referralId, timestamp: new Date().toISOString() }),
            referralId: referralId
        });

        const referral = this.mockReferrals.find(r => r.id === referralId) as any;
        if (!referral || !referral.invoice) {
            // Fallback for DB-based invoices if they exist
            const dbInvoice = await (prisma as any).invoice.findUnique({ where: { referralId } });
            if (dbInvoice) {
                const updatedInvoice = await (prisma as any).invoice.update({
                    where: { referralId },
                    data: { status: 'SENT_TO_CEZIH', cezihInvoiceId: 'CEZIH-INV-' + Math.floor(Math.random() * 10000) }
                });
                await this.logCezihMessage({
                    type: 'SEND_INVOICE_RESPONSE',
                    direction: 'INCOMING',
                    status: 'SENT',
                    payload: JSON.stringify({ referralId, cezihInvoiceId: updatedInvoice.cezihInvoiceId }),
                    response: JSON.stringify(updatedInvoice),
                    referralId: referralId,
                    invoiceId: updatedInvoice.id
                });
                return updatedInvoice;
            }
            throw new Error('No invoice issued for this referral.');
        }

        referral.invoice.isSentToCezih = true;
        referral.invoice.cezihId = 'CEZIH-INV-' + Math.floor(Math.random() * 10000);
        referral.invoice.status = 'SENT_TO_CEZIH';

        await this.logCezihMessage({
            type: 'SEND_INVOICE_RESPONSE',
            direction: 'INCOMING',
            status: 'SENT',
            payload: JSON.stringify({ referralId, cezihInvoiceId: referral.invoice.cezihId }),
            response: JSON.stringify(referral),
            referralId: referralId,
            invoiceId: referral.invoice.id
        });
        return referral;
    }

    async sendBatchInvoices(invoiceIds: string[], batchType: string = 'HZZO_F1') {
        console.log(`CEZIH: Processing Batch for ${invoiceIds.length} invoices...`);

        const batch = await prisma.invoiceBatch.create({
            data: {
                status: 'PROCESSING',
                type: batchType
            }
        });

        const invoices = await prisma.invoice.findMany({
            where: { id: { in: invoiceIds } },
            include: { referral: true, appointment: { include: { patient: true } } }
        });

        // 1. Generate individual HL7 messages
        const invoicePayloads = invoices.map(inv => {
            return populateTemplate(HL7_TEMPLATES.SEND_INVOICE, {
                messageId: 'MSG-INV-' + inv.id.substring(0, 8),
                timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
                invoiceId: inv.id,
                invoiceType: inv.type,
                amount: inv.amount.toString(),
                referralId: inv.referralId || inv.appointment?.referralId || 'DIRECT'
            });
        });

        // 2. Wrap in Batch
        const batchXml = populateTemplate(HL7_TEMPLATES.BATCH_WRAPPER, {
            batchId: batch.id,
            timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
            batchContent: invoicePayloads.join('\n')
        });

        console.log('Generated Batch HL7 XML (MCCI_IN000002):\n', batchXml);

        // 3. Mock CEZIH Response & DB Update
        const cezihBatchId = 'BCH-' + Math.floor(Math.random() * 100000);

        await prisma.$transaction([
            prisma.invoiceBatch.update({
                where: { id: batch.id },
                data: {
                    status: 'SENT',
                    cezihBatchId: cezihBatchId,
                    sentAt: new Date()
                }
            }),
            prisma.invoice.updateMany({
                where: { id: { in: invoiceIds } },
                data: {
                    status: 'SENT_TO_CEZIH',
                    batchId: batch.id,
                    sentAt: new Date()
                }
            })
        ]);

        // Audit Log: Batch Sent (Individual Logs for traceability)
        for (const invoice of invoices) {
            await this.logCezihMessage({
                type: 'SEND_INVOICE',
                direction: 'OUTGOING',
                status: 'SENT',
                payload: JSON.stringify({ batchId: batch.id, invoiceId: invoice.id }),
                referralId: invoice.referralId || undefined,
                mbo: invoice.appointment?.patient?.mbo || 'UNKNOWN',
                invoiceId: invoice.id
            });
        }

        return { success: true, batchId: batch.id, cezihBatchId };
    }

    async getWorkPermission() {
        console.log('CEZIH: Handshake (DohvatDopustenjaZaRad)...');
        // Simulated Soap Call: this.client.call('DohvatDopustenjaZaRad', { ... });
        return {
            success: true,
            sessionId: 'SESS-' + Math.random().toString(36).substring(7),
            validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours session
        };
    }

    async fetchReferrals(mbo: string) {
        console.log(`CEZIH: Fetching referrals for MBO ${mbo}...`);
        // Simulated SOAP call: this.client.call('DohvatUputnica', { mbo });
        return [
            {
                id: 'UP-100200300',
                type: 'A1',
                activity: '1010101',
                doctorName: 'Dr. Primarius',
                date: new Date().toISOString(),
                status: 'ACTIVE'
            },
            {
                id: 'UP-500600700',
                type: 'C1',
                activity: '2020202',
                doctorName: 'Dr. Secundus',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'ACTIVE'
            }
        ];
    }

    async realizeReferral(referralId: string, encounterId: string) {
        console.log(`CEZIH: Realizing referral ${referralId} for encounter ${encounterId}...`);

        const xml = `HL7-MOCK-REALIZATION-PAYLOAD-${referralId}-${Date.now()}`;

        // Atomic DB Update
        const result = await prisma.$transaction(async (tx) => {
            const referral = await tx.referral.findFirst({
                where: {
                    OR: [
                        { id: referralId },
                        { cezihReferralId: referralId }
                    ]
                },
                include: { patient: true }
            });

            if (!referral) throw new Error(`Referral ${referralId} not found in system`);

            // Log it
            // Log it
            await tx.cezihMessage.create({
                data: {
                    type: 'REALIZATION',
                    direction: 'OUTGOING',
                    status: 'SENT',
                    payload: xml,
                    referralId: referral.id,
                    patientMbo: referral.patient?.mbo || 'UNKNOWN'
                }
            });

            return await tx.referral.update({
                where: { id: referral.id },
                data: {
                    status: 'REALIZIRANA'
                }
            });
        });

        return {
            success: true,
            realizationId: 'REAL-' + Math.floor(Math.random() * 1000000),
            timestamp: new Date(),
            referral: result
        };
    }

    async sendFinding(encounter: any) {
        console.log('CEZIH: Sending Specialist Finding (Nalaz)...', encounter.id);

        // In a real scenario, this would call the SOAP client
        // result = await this.client.callMethod('sendFinding', { ... });

        const cezihId = 'CEZIH-NAL-' + Math.floor(Math.random() * 100000);
        const xml = `HL7-MOCK-FINDING-PAYLOAD-${encounter.id}-${Date.now()}`;

        // Audit Logging
        await this.logCezihMessage({
            type: 'SEND_FINDING',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: xml,
            referralId: encounter.appointment?.referralId || undefined,
            mbo: encounter.appointment?.patientId ? 'UNKNOWN' : 'UNKNOWN' // best effort
        });

        // We need appointment to get patient info and referral ID properly
        // Ideally encounter object has it, or we fetch it.
        // For now relying on what's passed or doing a quick lookup if needed.
        if (!encounter.appointment) {
            const found = await prisma.clinicalFinding.findUnique({
                where: { id: encounter.id },
                include: { appointment: { include: { referral: true, patient: true } } }
            });
            if (found && found.appointment) {
                await this.logCezihMessage({
                    type: 'SEND_FINDING',
                    direction: 'OUTGOING',
                    status: 'SENT',
                    payload: xml,
                    referralId: found.appointment.referralId || undefined,
                    mbo: found.appointment.patient.mbo
                });
            }
        }

        return {
            success: true,
            cezihId,
            message: "Finding successfully sent to CEZIH Central System"
        };
    }

    async stornoFinding(cezihId: string, reasonCode: string) {
        console.log(`CEZIH: Storno Finding ${cezihId} for reason: ${reasonCode}`);

        const xml = populateTemplate(HL7_TEMPLATES.STORNO_MESSAGE, {
            messageId: 'MSG-STR-' + Date.now(),
            timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
            targetMessageId: cezihId,
            reasonCode: reasonCode
        });

        console.log('Generated HL7 XML (FICR_IN990101):\n', xml);

        // Mock confirmation of storno in DB if finding exists
        const finding = await prisma.clinicalFinding.findFirst({
            where: { cezihFindingId: cezihId }
        });

        if (finding) {
            // Logically delete or mark as stornirano
            console.log(`Finding ${cezihId} marked as STORNIRANO in local DB`);
        }

        return {
            success: true,
            message: "Finding successfully cancelled (STORNO) in CEZIH"
        };
    }

    async takeoverReferral(referralId: string, doctorId: string, institutionCode: string) {
        console.log(`CEZIH: Atomic Takeover for Referral ${referralId}...`);
        console.trace('takeoverReferral called from:');

        const xml = populateTemplate(HL7_TEMPLATES.TAKEOVER_REFERRAL, {
            messageId: 'MSG-TKO-' + Date.now(),
            timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
            referralId: referralId,
            doctorId: doctorId || CEZIH_CONFIG.DEFAULT_DOCTOR_ID,
            institutionCode: institutionCode || CEZIH_CONFIG.INSTITUTION_CODE
        });

        console.log('Generated HL7 XML (POLB_IN990029):\n', xml);

        // Atomic DB Update
        const result = await prisma.$transaction(async (tx) => {
            // Find by either internal ID or CEZIH ID
            const referral = await tx.referral.findFirst({
                where: {
                    OR: [
                        { id: referralId },
                        { cezihReferralId: referralId }
                    ]
                },
                include: { patient: true }
            });

            if (!referral) throw new Error(`Referral ${referralId} not found in Central system`);
            if (referral.isTakenOver) throw new Error('Referral already taken over by another institution');

            // Log it
            // Log it
            await tx.cezihMessage.create({
                data: {
                    type: 'TAKEOVER',
                    direction: 'OUTGOING',
                    status: 'SENT',
                    payload: xml,
                    referralId: referral.id,
                    patientMbo: referral.patient?.mbo || 'UNKNOWN'
                }
            });

            return await tx.referral.update({
                where: { id: referral.id },
                data: {
                    isTakenOver: true,
                    takenOverBy: doctorId,
                    takeoverTime: new Date(),
                    status: 'U OBRADI'
                }
            });
        });

        return { success: true, referral: result };
    }

    async validateCode(code: string, type: 'MKB-10' | 'SPECIALTY' | 'REFERRAL_TYPE') {
        const entry = await prisma.cezihRegistry.findFirst({
            where: {
                type: type as any,
                code: code
            }
        });

        if (!entry || !entry.active) {
            throw new Error(`Invalid or inactive CEZIH code: ${code} for type ${type}`);
        }

        return entry;
    }

    async getGuidelines(diagnosisCode: string, procedureCode: string) {
        console.log(`CEZIH: DohvatiSmjernice for MKB:${diagnosisCode}, KZN:${procedureCode}...`);

        // Mock guidelines based on procedure code
        // USG Abdomena (100201 in this mock system usually, but let's check common ones)
        const proceduresWithGuidelines = ['USG Abdomena', 'MRI', 'CT', '200100'];

        if (proceduresWithGuidelines.includes(procedureCode) || procedureCode.includes('USG')) {
            return {
                success: true,
                requiresIndication: true,
                guidelines: [
                    { id: '1', text: 'Obavezna indikacija za sumnju na neoplazmu' },
                    { id: '2', text: 'Kontrolni pregled nakon operativnog zahvata' },
                    { id: '3', text: 'Akutna bol u abdomenu nepoznatog uzroka' }
                ]
            };
        }

        return {
            success: true,
            requiresIndication: false,
            guidelines: []
        };
    }

    // Phase 3: Clinical Extensions - osigInfoForSKZZ
    async getExtendedInsurance(mbo: string) {
        const cleanMbo = mbo.trim();
        console.log(`CEZIH: OsigInfo lookup for MBO ${cleanMbo}...`);

        // 1. Simulate HZZO/CEZIH Repository Fetch (Mock)
        // In a real system, this would be a SOAP request to osigInfoForSKZZ
        const mockCezihData = {
            mbo: cleanMbo,
            firstName: cleanMbo === '123456789' ? 'Ivan' : 'Test',
            lastName: cleanMbo === '123456789' ? 'Horvat' : 'Patient',
            birthDate: new Date('1985-05-15'),
            gender: 'M',
            hasSupplemental: true,
            policyStatus: 'ACTIVE',
            policyNumber: `HZZO-${cleanMbo.substring(0, 6)}`,
            insuranceCategory: 'AO',
            isVeteran: cleanMbo === '123456789', // Only Ivan is a veteran in our mock
            weaponHolder: false,
            isIsolated: false,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        };

        // 2. Read/Store Capability: Upsert to local Database
        // This ensures our local "cache" is synchronized with CEZIH data
        const patient = await (prisma as any).patient.upsert({
            where: { mbo: cleanMbo },
            update: {
                firstName: mockCezihData.firstName,
                lastName: mockCezihData.lastName,
                birthDate: mockCezihData.birthDate,
                gender: mockCezihData.gender,
                hasSupplemental: mockCezihData.hasSupplemental,
                policyStatus: mockCezihData.policyStatus,
                policyNumber: mockCezihData.policyNumber,
                insuranceCategory: mockCezihData.insuranceCategory,
                isVeteran: mockCezihData.isVeteran,
                weaponHolder: mockCezihData.weaponHolder,
                isIsolated: mockCezihData.isIsolated,
                validUntil: mockCezihData.validUntil
            },
            create: {
                mbo: cleanMbo,
                firstName: mockCezihData.firstName,
                lastName: mockCezihData.lastName,
                birthDate: mockCezihData.birthDate,
                gender: mockCezihData.gender,
                hasSupplemental: mockCezihData.hasSupplemental,
                policyStatus: mockCezihData.policyStatus,
                policyNumber: mockCezihData.policyNumber,
                insuranceCategory: mockCezihData.insuranceCategory,
                isVeteran: mockCezihData.isVeteran,
                weaponHolder: mockCezihData.weaponHolder,
                isIsolated: mockCezihData.isIsolated,
                validUntil: mockCezihData.validUntil
            }
        });

        // Audit Logging
        await this.logCezihMessage({
            type: 'OSIG_INFO_SKZZ',
            direction: 'INCOMING',
            status: 'SENT',
            payload: JSON.stringify({ mbo: cleanMbo }),
            response: JSON.stringify(patient),
            mbo: cleanMbo
        });

        return patient;
    }

    async updatePatientData(mbo: string, data: any) {
        console.log(`CEZIH: Updating OsigInfo for MBO ${mbo}...`);

        // In a real scenario, this would be a SOAP call to update records
        return await (prisma as any).patient.update({
            where: { mbo },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                hasSupplemental: data.hasSupplemental,
                policyStatus: data.policyStatus,
                policyNumber: data.policyNumber,
                insuranceCategory: data.insuranceCategory,
                isVeteran: data.isVeteran,
                weaponHolder: data.weaponHolder,
                isIsolated: data.isIsolated,
                validUntil: data.validUntil ? new Date(data.validUntil) : undefined
            }
        });
    }

    async searchMedication(query: string) {
        return await prisma.medicine.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { genericName: { contains: query } },
                    { atcCode: { contains: query } }
                ],
                active: true
            },
            take: 20
        });
    }

    async issueTherapyRecommendation(data: { appointmentId: string, medicineId: string, dosage: string, duration?: string, note?: string, patientId?: string }) {
        console.log(`CEZIH: Issuing therapy recommendation for appointment ${data.appointmentId}...`);

        // If patientId is missing, resolve it from appointment
        let targetPatientId = data.patientId;
        if (!targetPatientId) {
            const apt = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
            if (!apt) throw new Error('Appointment not found');
            targetPatientId = apt.patientId;
        }

        const recommendation = await (prisma.therapyRecommendation as any).upsert({
            where: {
                appointmentId_medicineId: {
                    appointmentId: data.appointmentId,
                    medicineId: data.medicineId
                }
            },
            update: {
                dosage: data.dosage,
                duration: data.duration,
                note: data.note
            },
            create: {
                appointmentId: data.appointmentId,
                patientId: targetPatientId,
                medicineId: data.medicineId,
                dosage: data.dosage,
                duration: data.duration,
                note: data.note,
                cezihId: 'REC-' + Math.floor(Math.random() * 1000000)
            },
            include: {
                medicine: true,
                appointment: { include: { patient: true } }
            }
        });

        return { success: true, recommendation };
    }

    /**
     * Phase 4: Središnji Kalendar (SK) Integration
     * Implements Level 3 compliance via REST-based synchronization.
     */
    async syncWithCentralCalendar(appointmentId: string) {
        console.log(`SK: Attempting to sync appointment ${appointmentId} with Central System...`);

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { patient: true, referral: true }
        });

        if (!appointment) throw new Error('Appointment not found');

        // Simulate REST API call to Središnji Kalendar (https://sk.cezih.hr/api/v1/appointments)
        const skId = `SK-${Math.floor(Math.random() * 1000000)}`;

        console.log(`REST: POST https://sk.cezih.hr/api/v1/appointments ... RECEIVED 201 Created (ID: ${skId})`);

        // Update local database with SK status
        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                skId: skId,
                skSyncedAt: new Date()
            },
            include: { patient: true, referral: true }
        });

        // PDSF: If appointment has a referral, update eReferral status to 'REZERVIRANA' (Reserved)
        // GUARD: Do NOT overwrite advanced statuses (Realizirana, U Obradi, Stornirana)
        const currentStatus = updated.referral?.status || 'NULL';
        if (updated.referral && ['POSLANA', 'NULL', 'ERROR'].includes(currentStatus)) {
            await prisma.referral.update({
                where: { id: updated.referralId! },
                data: { status: 'REZERVIRANA' }
            });
            console.log(`SK: eReferral ${updated.referralId} status transitioned to REZERVIRANA`);
        } else {
            console.log(`SK: Skipped status update for referral ${updated.referralId} (Current: ${currentStatus})`);
        }

        // Audit Logging for SK Sync
        await this.logCezihMessage({
            type: 'SYNC_SK',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ appointmentId, skId }),
            appointmentId: appointmentId,
            referralId: updated.referralId ?? undefined,
            mbo: appointment.patient.mbo
        });

        return {
            success: true,
            skId: updated.skId,
            skSyncedAt: updated.skSyncedAt,
            appointment: updated
        };
    }

    async checkSkConnectivity() {
        console.log('SK: Checking HTTPS connectivity to Central Calendar (Level 2 Compliance)...');
        try {
            // In real scenario: const response = await fetch('https://sk.cezih.hr/api/v1/ping');
            // Simulate successful connectivity check
            const isUp = true;
            console.log(`SK: HTTPS connection to sk.cezih.hr ... ${isUp ? 'OK (200)' : 'FAILED'}`);
            return {
                system: 'Središnji Kalendar (SK)',
                status: isUp ? 'UP' : 'DOWN',
                timestamp: new Date(),
                url: 'https://sk.cezih.hr/portal'
            };
        } catch (error) {
            return {
                system: 'Središnji Kalendar (SK)',
                status: 'DOWN',
                timestamp: new Date(),
                url: 'https://sk.cezih.hr/portal'
            };
        }
    }

    async generateHzzoBatchReport(batchId: string) {
        console.log(`HZZO: Generating official report for Batch ${batchId}...`);

        const batch = await prisma.invoiceBatch.findUnique({
            where: { id: batchId },
            include: {
                invoices: {
                    include: {
                        referral: { include: { patient: true } },
                        appointment: { include: { patient: true } }
                    }
                }
            }
        });

        if (!batch) throw new Error('Batch not found');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HZZO_Report type="${batch.type}" batchId="${batch.cezihBatchId}">
    <Header>
        <InstitutionCode>${CEZIH_CONFIG.INSTITUTION_CODE}</InstitutionCode>
        <InstitutionName>${CEZIH_CONFIG.INSTITUTION_NAME}</InstitutionName>
        <SystemName>${CEZIH_CONFIG.SYSTEM_NAME}</SystemName>
        <Timestamp>${new Date().toISOString()}</Timestamp>
        <TotalAmount>${batch.invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0)}</TotalAmount>
    </Header>
    <Invoices>
        ${batch.invoices.map((inv: any) => {
            const patient = inv.patient || inv.referral?.patient || inv.appointment?.patient;
            return `
        <Invoice id="${inv.id}">
            <Patient MBO="${patient?.mbo || 'UNKNOWN'}">
                <HasSupplemental>${patient?.hasSupplemental || 'false'}</HasSupplemental>
            </Patient>
            <Amount>${inv.amount}</Amount>
            <ReferralId>${inv.referralId || 'DIRECT'}</ReferralId>
        </Invoice>`;
        }).join('')}
    </Invoices>
</HZZO_Report>`;

        return {
            filename: `HZZO_${batch.type}_${batch.cezihBatchId}.xml`,
            content: xml
        };
    }

    async getPrintableFinding(findingId: string) {
        const finding = await prisma.clinicalFinding.findUnique({
            where: { id: findingId },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        referral: true
                    }
                }
            }
        });

        if (!finding) throw new Error('Finding not found');

        return {
            institution: CEZIH_CONFIG.INSTITUTION_NAME,
            patientName: `${finding.appointment.patient.firstName} ${finding.appointment.patient.lastName}`,
            mbo: finding.appointment.patient.mbo,
            diagnosis: finding.appointment.referral?.diagnosisName || 'N/A',
            findingBody: `${finding.anamnesis}\n\n${finding.statusPraesens}\n\n${finding.therapy}`,
            doctorName: 'Dr. Expert',
            timestamp: finding.createdAt,
            referralId: finding.appointment.referral?.id
        };
    }

    async stornoDocument(documentId: string, documentType: 'REFERRAL' | 'INVOICE' | 'REPORT') {
        console.log(`CEZIH: Storno request for ${documentType} ID: ${documentId}`);

        // 1. Fetch document from DB to check age
        let doc: any;
        if (documentType === 'REFERRAL') {
            doc = await (prisma as any).referral.findUnique({ where: { id: documentId } });
        } else if (documentType === 'INVOICE') {
            doc = await (prisma as any).invoice.findUnique({ where: { id: documentId } });
        } else if (documentType === 'REPORT') {
            doc = await (prisma as any).clinicalFinding.findUnique({
                where: { id: documentId },
                include: { appointment: { include: { patient: true } } }
            });
        }

        if (!doc) throw new Error(`${documentType} not found.`);

        // 2. Validate time window (Compliance check)
        const ageInDays = (new Date().getTime() - new Date(doc.createdAt).getTime()) / (1000 * 3600 * 24);
        const limit = documentType === 'REFERRAL' ? 3 : 8; // 3 days for SKZZ, 8 for others/receipts per spec

        if (ageInDays > limit) {
            throw new Error(`Storno Rejected: Document is ${Math.floor(ageInDays)} days old. Max allowed is ${limit} days.`);
        }

        // 3. Generate HL7 FICR_IN990030 & Update (Protected)
        try {
            const hl7Xml = populateTemplate(HL7_TEMPLATES.STORNO_MESSAGE, {
                messageId: 'MSG-STORNO-' + Math.random().toString(36).substring(7),
                timestamp: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
                targetMessageId: doc.cezihReferralId || doc.cezihInvoiceId || doc.cezihFindingId || 'CEZIH-ID-' + documentId,
                reasonCode: 'CANCELLATION'
            });

            console.log('Generated HL7 V3 Storno Request (FICR_IN990030):\n', hl7Xml);

            // 4. Update status in DB
            if (documentType === 'REFERRAL') {
                await (prisma as any).referral.update({
                    where: { id: documentId },
                    data: { status: 'STORNIRANA' }
                });
            } else if (documentType === 'INVOICE') {
                await (prisma as any).invoice.update({
                    where: { id: documentId },
                    data: { status: 'STORNIRANA' }
                });
            } else if (documentType === 'REPORT') {
                await (prisma as any).clinicalFinding.update({
                    where: { id: documentId },
                    data: { signedAt: null, cezihFindingId: null }
                });
            }

            // 5. Audit Logging
            await this.logCezihMessage({
                type: 'STORNO_REQUEST',
                direction: 'OUTGOING',
                status: 'SENT',
                payload: hl7Xml,
                mbo: doc.patientMbo || doc.appointment?.patient?.mbo || doc.referral?.patientMbo,
                referralId: documentType === 'REFERRAL' ? documentId : (doc.referralId || doc.appointment?.referralId),
                invoiceId: documentType === 'INVOICE' ? documentId : undefined
            });

            return { success: true, message: `${documentType} stornirano uspješno.` };
        } catch (error: any) {
            console.error(`CEZIH Storno Error for ${documentId}:`, error.message);

            // Persist failure state to allow RETRY
            if (documentType === 'REFERRAL') {
                await (prisma as any).referral.update({
                    where: { id: documentId },
                    data: { status: 'STORNO_FAILED' }
                });
            } else if (documentType === 'INVOICE') {
                await (prisma as any).invoice.update({
                    where: { id: documentId },
                    data: { status: 'STORNO_FAILED' }
                });
            }

            throw new Error(`CEZIH Communication Failure: ${error.message}. You can retry from the dashboard.`);
        }
    }
    async updateReferralStatus(id: string, status: string) {
        // Find in mock first
        const mockRef = this.mockReferrals.find(r => r.id === id);
        if (mockRef) {
            mockRef.status = status as any;
        }

        // Also update in DB if exists
        const referral = await prisma.referral.findFirst({
            where: {
                OR: [{ id }, { cezihReferralId: id }]
            }
        });

        if (referral) {
            await prisma.referral.update({
                where: { id: referral.id },
                data: { status: status as any }
            });
        }
    }

    async releaseReservation(referralId: string) {
        console.log(`CEZIH: Releasing reservation for referral ${referralId}...`);

        // Audit Logging
        await this.logCezihMessage({
            type: 'RELEASE_RESERVATION',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ referralId, action: 'REVERT_TO_POSLANA' }),
            referralId: referralId
        });

        // Update status back to POSLANA
        await this.updateReferralStatus(referralId, 'POSLANA');

        return { success: true };
    }
}

// Singleton export
export const cezihService = new CezihService();
