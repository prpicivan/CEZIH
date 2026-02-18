async function verifyInternalReferralFlow() {
    console.log('--- Verifying Internal Referral Flow ---');

    // 1. Get an active referral to use as base
    const referralsRes = await fetch('http://localhost:3009/api/dashboard');
    const referrals = await referralsRes.json();
    const baseReferral = referrals.find((r: any) => r.status === 'ACTIVE' || r.status === 'U OBRADI');

    if (!baseReferral) {
        console.error('No active referral found to test with.');
        return;
    }

    console.log(`Using Referral: ${baseReferral.id} (Status: ${baseReferral.status})`);

    // 2. Create Internal Referral
    const irData = {
        type: 'PT',
        originalReferralId: baseReferral.id,
        procedureCode: '2050000',
        procedureName: 'Fizikalna terapija - prvi pregled',
        department: 'Physical Medicine',
        note: 'Test internal referral'
    };

    console.log('Creating Internal Referral...');
    const createRes = await fetch('http://localhost:3009/api/internal-referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(irData)
    });

    if (!createRes.ok) {
        const text = await createRes.text();
        console.error(`Failed to create internal referral! Status: ${createRes.status}`);
        console.error('Response:', text.substring(0, 500));
        return;
    }

    const internalRef = await createRes.json();
    console.log(`✅ Internal Referral Created: ${internalRef.id}`);

    // 3. Verify Original Referral Status Update
    const updatedRefRes = await fetch('http://localhost:3009/api/dashboard');
    const updatedReferrals = await updatedRefRes.json();
    const updatedRef = updatedReferrals.find((r: any) => r.id === baseReferral.id);

    if (updatedRef.status === 'U OBRADI') {
        console.log('✅ Base Referral status updated to "U OBRADI".');
    } else {
        console.warn(`⚠️ Base Referral status is ${updatedRef.status}, expected "U OBRADI".`);
    }

    // 4. Verify Automatic Appointment Creation
    const appointmentsRes = await fetch('http://localhost:3009/api/appointments');
    const appointments = await appointmentsRes.json();
    const newAppointment = appointments.find((a: any) => a.internalReferralId === internalRef.id);

    if (newAppointment) {
        console.log(`✅ Automatic Appointment Scheduled: ${newAppointment.id}`);
        console.log(`   Start Time: ${newAppointment.startTime}`);
        console.log(`   Status: ${newAppointment.status}`);
    } else {
        console.error('❌ Failed: Automatic appointment was not created.');
    }
}

verifyInternalReferralFlow().catch(console.error);
