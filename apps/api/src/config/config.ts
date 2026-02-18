export const CEZIH_CONFIG = {
    // Unique name of the system as registered in CEZIH
    SYSTEM_NAME: process.env.CEZIH_SYSTEM_NAME || 'WBS rješenja platforma',

    // Unique ID of the system (assigned by HZZO)
    SYSTEM_ID: process.env.CEZIH_SYSTEM_ID || 'WBS-PLAT-01',

    // Official Institution Name
    INSTITUTION_NAME: process.env.CEZIH_INSTITUTION_NAME || 'WBS test',

    // Official Institution Code (HZZO KOD_USTANOVE)
    INSTITUTION_CODE: process.env.CEZIH_INSTITUTION_CODE || '12345678',

    // Default Doctor ID (SIFRA_LIJECNIKA)
    DEFAULT_DOCTOR_ID: process.env.CEZIH_DOCTOR_ID || 'DR-WBS-01',

    // CEZIH Endpoints
    ENDPOINTS: {
        REFERRAL: process.env.CEZIH_REFERRAL_URL || 'https://test.cezih.hr/wsc/services/eUputnica',
        INSurance: process.env.CEZIH_INSURANCE_URL || 'https://test.cezih.hr/wsc/services/OsigInfo'
    }
};
