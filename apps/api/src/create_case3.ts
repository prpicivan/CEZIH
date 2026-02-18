async function createCase3Referral() {
    const referralData = {
        patientMbo: '987654321', // Using a specific MBO for Case 3
        patientName: 'Stjepan Oncology',
        birthDate: '1965-05-15',
        diagnosisCode: 'C76.4',
        diagnosisName: 'Zloćudna novotvorina ruke',
        procedureCode: '100200',
        procedureName: 'Prvi pregled doktora medicine specijaliste',
        targetDepartment: 'Internal Medicine',
        note: 'Pacijent 3 iz Zapisnika (D1 Uputnica)',
        status: 'ACTIVE'
    };

    console.log('Creating HZZO Case 3 Referral (D1/Oncology)...');

    const response = await fetch('http://localhost:3009/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(referralData)
    });

    if (response.ok) {
        const result = await response.json();
        console.log('Successfully created Case 3 referral!');
        console.log('Referral ID:', result.id);
        console.log('MBO:', referralData.patientMbo);
    } else {
        const error = await response.json();
        console.error('Failed to create referral:', error);
    }
}

createCase3Referral().catch(console.error);
