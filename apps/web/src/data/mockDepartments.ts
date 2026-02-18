export interface Department {
    code: string;
    name: string;
}

export const DEPARTMENTS: Department[] = [
    { code: "IM", name: "Internal Medicine" },
    { code: "SUR", name: "General Surgery" },
    { code: "PED", name: "Pediatrics" },
    { code: "GYN", name: "Gynecology" },
    { code: "DERM", name: "Dermatology" },
    { code: "CARD", name: "Cardiology" },
    { code: "ORTH", name: "Orthopedics" },
    { code: "ENT", name: "Otorhinolaryngology (ENT)" },
    { code: "PSY", name: "Psychiatry" },
    { code: "OPH", name: "Ophthalmology" }
];
