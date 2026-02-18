import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Clear existing data in correct order
    await prisma.therapyRecommendation.deleteMany({});
    await prisma.clinicalFinding.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.referral.deleteMany({});
    await prisma.invoiceBatch.deleteMany({});
    await prisma.medicine.deleteMany({});
    await prisma.cezihRegistry.deleteMany({});
    await prisma.patient.deleteMany({});

    // 2. Create Billing Registries
    await prisma.cezihRegistry.createMany({
        data: [
            { type: 'INVOICE_TYPE', code: 'SKZZ', name: 'Specijalističko-konzilijarna zdravstvena zaštita' },
            { type: 'INVOICE_TYPE', code: 'DZZ', name: 'Djelatnost na primarnoj razini' },
            { type: 'ERROR_CODE', code: 'ERR-001', name: 'MBO neispravan' },
            { type: 'ERROR_CODE', code: 'ERR-002', name: 'Uputnica nije pronađena' },
            { type: 'ERROR_CODE', code: 'ERR-003', name: 'Osiguranik nije aktivan' },
        ]
    });

    // 3. Create Medicines (G_export)
    await prisma.medicine.createMany({
        data: [
            { atcCode: 'N02BE01', name: 'LUPOCET 500mg tablete', manufacturer: 'Belupo' },
            { atcCode: 'N02BE02', name: 'LEKADOL 500mg tablete', manufacturer: 'Sandoz' },
            { atcCode: 'C09AA05', name: 'RAMIPRIL 5mg tablete', manufacturer: 'JGL' },
            { atcCode: 'A10BA02', name: 'METFORMIN 850mg tablete', manufacturer: 'PLIVA' },
            { atcCode: 'J01CA04', name: 'AMOKSICILIN 500mg kapsule', manufacturer: 'PLIVA' },
        ]
    });

    // 4. Create test patient
    const patient = await prisma.patient.create({
        data: {
            mbo: '123456789',
            firstName: 'Marko',
            lastName: 'Marić',
            birthDate: new Date('1990-02-09'),
            hasSupplemental: true,
            policyStatus: 'ACTIVE',
            insuranceCategory: 'AO'
        },
    });

    console.log('✅ Created patient:', patient.firstName, patient.lastName);

    // 5. Create test referral
    const referral = await prisma.referral.create({
        data: {
            patientId: patient.id,
            patientMbo: patient.mbo,
            patientName: `${patient.firstName} ${patient.lastName}`,
            diagnosisCode: 'R10.4',
            diagnosisName: 'Other abdominal pain',
            procedureCode: '100201',
            procedureName: 'Ponovni pregled specijaliste',
            targetDepartment: 'Internal Medicine',
            status: 'SENT',
            note: 'Test referral for abdominal pain',
        },
    });

    console.log('✅ Created referral:', referral.id);

    // 6. Create test appointment
    const appointment = await prisma.appointment.create({
        data: {
            patientId: patient.id,
            referralId: referral.id,
            startTime: new Date('2026-02-12T13:00:00'),
            endTime: new Date('2026-02-12T13:30:00'),
            status: 'scheduled',
        },
    });

    console.log('✅ Created appointment:', appointment.id);

    // Create second patient and referral WITHOUT invoice
    const patient2 = await prisma.patient.upsert({
        where: { mbo: '987654321' },
        update: {},
        create: {
            mbo: '987654321',
            firstName: 'Ana',
            lastName: 'Marić',
            birthDate: new Date('1992-05-15'),
            hasSupplemental: false,
            policyStatus: 'ACTIVE',
            insuranceCategory: 'AO',
        },
    });

    const referral2 = await prisma.referral.create({
        data: {
            patientId: patient2.id,
            patientMbo: '987654321',
            patientName: 'Ana Marić',
            diagnosisCode: 'I10',
            diagnosisName: 'Essential (primary) hypertension',
            procedureCode: '100201',
            procedureName: 'Ponovni pregled specijaliste',
            targetDepartment: 'Cardiology',
            note: 'Follow-up for hypertension',
            status: 'SENT',
        },
    });

    await prisma.appointment.create({
        data: {
            patientId: patient2.id,
            referralId: referral2.id,
            startTime: new Date('2026-02-13T10:00:00'),
            endTime: new Date('2026-02-13T10:30:00'),
            status: 'scheduled',
        },
    });

    console.log('✅ Created second patient and referral (no invoice)');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
