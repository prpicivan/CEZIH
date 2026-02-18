
/**
 * FHIR Utility for converting clinical findings to FHIR-compliant JSON
 */

export function convertToFHIR(finding: any) {
    const patient = finding.appointment.patient;
    const referral = finding.appointment.referral;

    // FHIR DiagnosticReport or Composition? 
    // For clinical findings, DiagnosticReport is a good fit.

    return {
        resourceType: "DiagnosticReport",
        id: finding.id,
        identifier: [
            {
                system: "https://cezih.hr/identifiers/findings",
                value: finding.cezihFindingId || "local-" + finding.id
            }
        ],
        status: finding.signedAt ? "final" : "preliminary",
        category: [
            {
                coding: [
                    {
                        system: "http://terminology.hl7.org/CodeSystem/v2-0074",
                        code: "GE",
                        display: "General Practice"
                    }
                ],
                text: "General Practice"
            }
        ],
        code: {
            coding: [
                {
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consultation note"
                }
            ],
            text: "Clinical Finding"
        },
        subject: {
            reference: `Patient/${patient.id}`,
            display: `${patient.firstName} ${patient.lastName} (MBO: ${patient.mbo})`
        },
        effectiveDateTime: finding.createdAt,
        issued: finding.signedAt || finding.createdAt,
        performer: [
            {
                display: "Dr. Medical System"
            }
        ],
        conclusion: `Anamnesis: ${finding.anamnesis}\n\nStatus Praesens: ${finding.statusPraesens}\n\nTherapy: ${finding.therapy}`,
        presentedForm: [
            {
                contentType: "text/plain",
                data: Buffer.from(finding.anamnesis + finding.statusPraesens + finding.therapy).toString('base64'),
                title: "Clinical Document"
            }
        ],
        // Extensions for CEZIH-specific data
        extension: [
            {
                url: "https://cezih.hr/fhir/Extension/referral-reference",
                valueString: referral ? referral.cezihReferralId || referral.id : "No Referral"
            }
        ]
    };
}
