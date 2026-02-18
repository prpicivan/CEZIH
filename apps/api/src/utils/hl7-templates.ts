
/**
 * HL7 V3 XML Templates for CEZIH Compliance
 * Based on Specifikacija sučelja v1.x and HL7 standards.
 */

export const HL7_TEMPLATES = {
    // POLB_IN990031: Sending eReferral (PZZ -> CEZIH)
    SEND_REFERRAL: `
<POLB_IN990031 xmlns="urn:hl7-org:v3">
    <id extension="{{messageId}}" root="2.16.840.1.113883.2.7.1.1"/>
    <creationTime value="{{timestamp}}"/>
    <interactionId extension="POLB_IN990031" root="2.16.840.1.113883.1.6"/>
    <processingCode code="P"/>
    <processingModeCode code="T"/>
    <acceptAckCode code="AL"/>
    <receiver typeCode="RCV">
        <device classCode="DEV" determinerCode="INSTANCE">
            <id extension="CEZIH" root="2.16.840.1.113883.2.7.2.1"/>
        </device>
    </receiver>
    <sender typeCode="SND">
        <device classCode="DEV" determinerCode="INSTANCE">
            <id extension="{{senderId}}" root="2.16.840.1.113883.2.7.2.1"/>
        </device>
    </sender>
    <controlActProcess classCode="ACTN" moodCode="EVN">
        <subject typeCode="SUBJ">
            <referral classCode="PCPR" moodCode="INT">
                <id extension="{{referralId}}" root="2.16.840.1.113883.2.7.3.1"/>
                <code code="{{referralType}}" codeSystem="2.16.840.1.113883.2.7.3.2"/>
                <statusCode code="active"/>
                <effectiveTime>
                    <low value="{{timestamp}}"/>
                </effectiveTime>
                <recordTarget typeCode="RCT">
                    <patient classCode="PAT">
                        <id extension="{{patientMbo}}" root="2.16.840.1.113883.2.7.4.1"/>
                        <patientPerson>
                            <name>{{patientName}}</name>
                        </patientPerson>
                    </patient>
                </recordTarget>
                <author typeCode="AUT">
                    <assignedEntity>
                        <id extension="{{doctorId}}" root="2.16.840.1.113883.2.7.5.1"/>
                    </assignedEntity>
                </author>
                <reason>
                    <observation classCode="OBS" moodCode="EVN">
                        <code code="DX" codeSystem="2.16.840.1.113883.2.7.6.1"/>
                        <value code="{{diagnosisCode}}" codeSystem="2.16.840.1.113883.6.3"/>
                    </observation>
                </reason>
            </referral>
        </subject>
    </controlActProcess>
</POLB_IN990031>
`.trim(),

    // POLB_IN990029: Takeover Request (SKZZ -> CEZIH)
    TAKEOVER_REFERRAL: `
<POLB_IN990029 xmlns="urn:hl7-org:v3">
    <id extension="{{messageId}}" root="2.16.840.1.113883.2.7.1.1"/>
    <creationTime value="{{timestamp}}"/>
    <interactionId extension="POLB_IN990029" root="2.16.840.1.113883.1.6"/>
    <controlActProcess classCode="ACTN" moodCode="EVN">
        <subject typeCode="SUBJ">
            <takeoverRequest classCode="ACT" moodCode="RQO">
                <id extension="{{referralId}}" root="2.16.840.1.113883.2.7.3.1"/>
                <performer typeCode="PRF">
                    <assignedEntity>
                        <id extension="{{doctorId}}" root="2.16.840.1.113883.2.7.5.1"/>
                        <representedOrganization>
                            <id extension="{{institutionCode}}" root="2.16.840.1.113883.2.7.5.2"/>
                        </representedOrganization>
                    </assignedEntity>
                </performer>
            </takeoverRequest>
        </subject>
    </controlActProcess>
</POLB_IN990029>
`.trim(),

    // FICR_IN990030: Storno Mechanism Request
    STORNO_MESSAGE: `
<FICR_IN990030 xmlns="urn:hl7-org:v3">
    <id extension="{{messageId}}" root="2.16.840.1.113883.2.7.1.1"/>
    <creationTime value="{{timestamp}}"/>
    <interactionId extension="FICR_IN990030" root="2.16.840.1.113883.1.6"/>
    <controlActProcess classCode="ACTN" moodCode="EVN">
        <subject typeCode="SUBJ">
            <stornoRequest classCode="ACT" moodCode="RQO">
                <targetMessageId extension="{{targetMessageId}}" root="2.16.840.1.113883.2.7.1.1"/>
                <reasonCode code="{{reasonCode}}" codeSystem="2.16.840.1.113883.2.7.7.1"/>
            </stornoRequest>
        </subject>
    </controlActProcess>
</FICR_IN990030>
`.trim(),

    // POFM_IN...: HZZO Financial Interaction (SKZZ Invoice)
    SEND_INVOICE: `
<POFM_IN990001 xmlns="urn:hl7-org:v3">
    <id extension="{{messageId}}" root="2.16.840.1.113883.2.7.1.1"/>
    <creationTime value="{{timestamp}}"/>
    <interactionId extension="POFM_IN990001" root="2.16.840.1.113883.1.6"/>
    <controlActProcess classCode="ACTN" moodCode="EVN">
        <subject typeCode="SUBJ">
            <invoice classCode="INVOICE" moodCode="EVN">
                <id extension="{{invoiceId}}" root="2.16.840.1.113883.2.7.8.1"/>
                <code code="{{invoiceType}}" codeSystem="2.16.840.1.113883.2.7.8.2"/>
                <totalAmt value="{{amount}}" currency="EUR"/>
                <pertinentInformation typeCode="PERT">
                    <referral classCode="PCPR" moodCode="INT">
                        <id extension="{{referralId}}" root="2.16.840.1.113883.2.7.3.1"/>
                    </referral>
                </pertinentInformation>
            </invoice>
        </subject>
    </controlActProcess>
</POFM_IN990001>
`.trim(),

    // MCCI_IN...: Batch Wrapper for multiple interactions
    BATCH_WRAPPER: `
<MCCI_IN000002 xmlns="urn:hl7-org:v3">
    <id extension="{{batchId}}" root="2.16.840.1.113883.2.7.1.1"/>
    <creationTime value="{{timestamp}}"/>
    <interactionId extension="MCCI_IN000002" root="2.16.840.1.113883.1.6"/>
    <content>
        {{batchContent}}
    </content>
</MCCI_IN000002>
`.trim()
};

/**
 * Helper to populate templates
 */
export function populateTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        // Use a simple split/join for replacement to avoid regex escaping issues with special characters
        result = result.split(`{{${key}}}`).join(value);
        result = result.split(`{{ ${key} }}`).join(value);
    }
    return result;
}
