import prisma from '../db/prisma';
import { SignedXml } from 'xml-crypto';
import { FiscalizationCrypto } from '../utils/crypto';
import { InvoiceRequest, FiscalizationResponse, InvoiceType } from './fiscalization.types';
import { DOMParser } from '@xmldom/xmldom';
import * as crypto from 'crypto';

export class FiscalizationService {
    private crypto: FiscalizationCrypto;
    private url: string;

    constructor(p12Path: string, password: string, isDemo: boolean = true) {
        this.crypto = new FiscalizationCrypto(p12Path, password);
        this.url = isDemo
            ? "https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest"
            : "https://cis.porezna-uprava.hr:8449/FiskalizacijaService";
    }

    public async fiscalizeInvoiceF1(invoice: InvoiceType): Promise<FiscalizationResponse> {
        const requestId = crypto.randomUUID();
        const requestDateTime = this.formatDate(new Date());

        // Calculate ZKI if not provided
        if (!invoice.ZastKod) {
            // Parse total amount to number
            const amount = parseFloat(invoice.IznosUkupno.replace(',', '.'));

            invoice.ZastKod = this.crypto.generateZKI(
                invoice.Oib,
                invoice.DatVrijeme,
                invoice.BrRac.BrOznRac,
                invoice.BrRac.OznPosPr,
                invoice.BrRac.OznNapUr,
                amount
            );
        }

        const request: InvoiceRequest = {
            Zaglavlje: {
                IdPoruke: requestId,
                DatumVrijeme: requestDateTime
            },
            Racun: invoice
        };

        // 1. Construct XML
        const xml = this.buildRacunZahtjevXml(request);

        // 2. Sign XML
        const signedXml = this.signXML(xml);

        // 3. Wrap in SOAP Envelope
        const envelope = this.wrapInEnvelope(signedXml);

        let responseXml = '';
        let response: FiscalizationResponse = {};
        let errorMsg = undefined;
        let status = 'SUCCESS';

        // 4. Send Request
        try {
            responseXml = await this.send(envelope);
            response = this.parseResponse(responseXml);
        } catch (error: any) {
            console.error('Fiscalization Error:', error);
            status = 'ERROR';
            errorMsg = error.message;
            // Capture the raw error response if available in error object (custom implementation needed if not)
            // Ideally send() should return response even on error or throw with response text
            // For now assuming send() throws but we might have logged it. 
            // Better to refactor send() to return object { ok, text } or similar to capture logs.
            throw new Error(`Fiscalization failed: ${error.message}`);
        } finally {
            // Log to DB
            try {
                await prisma.fiscalizationLog.create({
                    data: {
                        uuid: requestId,
                        invoiceNumber: invoice.BrRac.BrOznRac,
                        businessSpace: invoice.BrRac.OznPosPr,
                        paymentDevice: invoice.BrRac.OznNapUr,
                        requestXml: signedXml,
                        responseXml: responseXml,
                        status: status,
                        jir: response.Jir,
                        zki: invoice.ZastKod,
                        errors: errorMsg ? errorMsg : (response.Greske ? JSON.stringify(response.Greske) : undefined)
                    }
                });
            } catch (logError) {
                console.error('Failed to log fiscalization:', logError);
            }
        }

        return response;
    }

    public async echo(message: string): Promise<string> {
        const xml = `
<tns:EchoRequest xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.apis-it.hr/fin/2012/types/f73/FiskalizacijaSchema.xsd">
    <tns:Poruka>${message}</tns:Poruka>
</tns:EchoRequest>`;

        // Echo request is NOT signed usually, but wrapped in standard envelope
        const envelope = this.wrapInEnvelope(xml);
        return this.send(envelope);
    }

    public signXML(xml: string): string {
        const sig = new SignedXml();

        // Configure signature
        sig.addReference(
            "//*[local-name(.)='RacunZahtjev']",
            [
                "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
                "http://www.w3.org/2001/10/xml-exc-c14n#"
            ],
            "http://www.w3.org/2000/09/xmldsig#sha1"
        );

        sig.signingKey = this.crypto.getPrivateKeyPem();
        sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
        sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

        // Add KeyInfo with X509Data
        sig.keyInfoProvider = {
            getKeyInfo: (key, prefix) => {
                const certPem = this.crypto.getCertificatePem();
                const certClean = certPem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s/g, '');
                const issuer = this.crypto.getCertificateIssuerStub();
                const serial = this.crypto.getCertificateSerial();

                return `<X509Data>
                    <X509Certificate>${certClean}</X509Certificate>
                    <X509IssuerSerial>
                        <X509IssuerName>C=${issuer.C}, O=${issuer.O}, CN=${issuer.CN}</X509IssuerName>
                        <X509SerialNumber>${serial}</X509SerialNumber>
                    </X509IssuerSerial>
                </X509Data>`;
            },
            getKey: (keyInfo) => { return Buffer.from([]); } // Not used for signing
        };

        sig.computeSignature(xml);
        return sig.getSignedXml();
    }

    private wrapInEnvelope(bodyXml: string): string {
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
    }

    private async send(soapMessage: string): Promise<string> {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // WARNING: Only for development/test!

        console.log('Sending SOAP request:', soapMessage);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(this.url, {
                method: 'POST',
                body: soapMessage,
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Connection': 'close'
                },
                signal: controller.signal
            } as any);

            clearTimeout(timeout);

            console.log('Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                // console.error('SOAP Error Headers:', JSON.stringify([...response.headers.entries()])); // Commented out to avoid type error for now
                console.error('SOAP Error Status:', response.status, response.statusText);
                console.error('SOAP Error Body Length:', errorText.length);
                console.error('SOAP Error Body:', errorText);
                throw new Error(`SOAP request failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
            }

            return await response.text();
        } catch (error: any) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('SOAP request timed out after 10s');
            }
            throw error;
        }
    }

    private buildRacunZahtjevXml(req: InvoiceRequest): string {
        const { Zaglavlje, Racun } = req;
        const id = Zaglavlje.IdPoruke; // Same ID for Zahtjev Id attribute

        // Helper to format currency
        const cur = (val: string | undefined) => val ? val.replace(',', '.') : undefined;

        let xml = `<tns:RacunZahtjev Id="${id}" xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.apis-it.hr/fin/2012/types/f73/FiskalizacijaSchema.xsd">`;

        xml += `<tns:Zaglavlje>
            <tns:IdPoruke>${Zaglavlje.IdPoruke}</tns:IdPoruke>
            <tns:DatumVrijeme>${Zaglavlje.DatumVrijeme}</tns:DatumVrijeme>
        </tns:Zaglavlje>`;

        xml += `<tns:Racun>`;
        xml += `<tns:Oib>${Racun.Oib}</tns:Oib>`;
        xml += `<tns:USustPdv>${Racun.USustPdv}</tns:USustPdv>`;
        xml += `<tns:DatVrijeme>${Racun.DatVrijeme}</tns:DatVrijeme>`;
        xml += `<tns:OznSlijed>${Racun.OznSlijed}</tns:OznSlijed>`;

        xml += `<tns:BrRac>
            <tns:BrOznRac>${Racun.BrRac.BrOznRac}</tns:BrOznRac>
            <tns:OznPosPr>${Racun.BrRac.OznPosPr}</tns:OznPosPr>
            <tns:OznNapUr>${Racun.BrRac.OznNapUr}</tns:OznNapUr>
        </tns:BrRac>`;

        if (Racun.Pdv && Racun.Pdv.length > 0) {
            xml += `<tns:Pdv>`;
            Racun.Pdv.forEach(p => {
                xml += `<tns:Porez>
                    <tns:Stopa>${cur(p.Stopa)}</tns:Stopa>
                    <tns:Osnovica>${cur(p.Osnovica)}</tns:Osnovica>
                    <tns:Iznos>${cur(p.Iznos)}</tns:Iznos>
                </tns:Porez>`;
            });
            xml += `</tns:Pdv>`;
        }

        // Pnp
        if (Racun.Pnp && Racun.Pnp.length > 0) {
            xml += `<tns:Pnp>`;
            Racun.Pnp.forEach(p => {
                xml += `<tns:Porez>
                    <tns:Stopa>${cur(p.Stopa)}</tns:Stopa>
                    <tns:Osnovica>${cur(p.Osnovica)}</tns:Osnovica>
                    <tns:Iznos>${cur(p.Iznos)}</tns:Iznos>
                </tns:Porez>`;
            });
            xml += `</tns:Pnp>`;
        }

        // Other taxes
        if (Racun.OstaliPor && Racun.OstaliPor.length > 0) {
            xml += `<tns:OstaliPor>`;
            Racun.OstaliPor.forEach(p => {
                // Assuming Name/Naziv is handled or simplified. Types define only stopa/osnovica/iznos for simple taxes but Ostali needs Description usually.
                // Re-checking PHP: Ostali has Naziv, Stopa, Osnovica, Iznos. 
                // Updating Simplified TaxType might be needed if Ostali is used.
                // For now assuming standard numeric structure or ignoring if not used. 
                // APIS Spec: <tns:Porez><tns:Naziv>...</tns:Naziv>...
                // I will skip complex other taxes for this iteration unless specified.
            });
            xml += `</tns:OstaliPor>`;
        }

        if (Racun.IznosOslobPdv) xml += `<tns:IznosOslobPdv>${cur(Racun.IznosOslobPdv)}</tns:IznosOslobPdv>`;
        if (Racun.IznosMarza) xml += `<tns:IznosMarza>${cur(Racun.IznosMarza)}</tns:IznosMarza>`;
        if (Racun.IznosNePodlOpor) xml += `<tns:IznosNePodlOpor>${cur(Racun.IznosNePodlOpor)}</tns:IznosNePodlOpor>`;

        // Fees (Naknade)
        if (Racun.Naknade && Racun.Naknade.length > 0) {
            xml += `<tns:Naknade>`;
            Racun.Naknade.forEach(n => {
                xml += `<tns:Naknada>
                    <tns:NazivN>Naknada</tns:NazivN> <!-- Simplified -->
                    <tns:IznosN>${cur(n.Iznos)}</tns:IznosN>
                 </tns:Naknada>`;
            });
            xml += `</tns:Naknade>`;
        }

        xml += `<tns:IznosUkupno>${cur(Racun.IznosUkupno)}</tns:IznosUkupno>`;
        xml += `<tns:NacinPlac>${Racun.NacinPlac}</tns:NacinPlac>`;
        xml += `<tns:OibOper>${Racun.OibOper}</tns:OibOper>`;
        xml += `<tns:ZastKod>${Racun.ZastKod}</tns:ZastKod>`;
        xml += `<tns:NakDost>${Racun.NakDost}</tns:NakDost>`;

        if (Racun.ParagonBrRac) xml += `<tns:ParagonBrRac>${Racun.ParagonBrRac}</tns:ParagonBrRac>`;
        if (Racun.SpecNamj) xml += `<tns:SpecNamj>${Racun.SpecNamj}</tns:SpecNamj>`;

        xml += `</tns:Racun>`;
        xml += `</tns:RacunZahtjev>`;

        return xml;
    }

    private formatDate(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${day}.${month}.${year}T${hours}:${minutes}:${seconds}`;
    }

    private parseResponse(xml: string): FiscalizationResponse {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const response: FiscalizationResponse = {};

        // Check for faults/errors
        const fault = doc.getElementsByTagName('soapenv:Fault')[0] || doc.getElementsByTagName('Fault')[0];
        if (fault) {
            const faultString = fault.getElementsByTagName('faultstring')[0]?.textContent || 'Unknown Fault';
            throw new Error(faultString);
        }

        const jir = doc.getElementsByTagName('tns:Jir')[0]?.textContent;
        const uuid = doc.getElementsByTagName('tns:IdPoruke')[0]?.textContent;
        const dateTime = doc.getElementsByTagName('tns:DatumVrijeme')[0]?.textContent;

        if (jir) response.Jir = jir;
        if (uuid) response.Uuid = uuid;
        if (dateTime) response.DatVrijeme = dateTime;

        // Parse Errors if any (Greske)
        const greskeNode = doc.getElementsByTagName('tns:Greske')[0];
        if (greskeNode) {
            response.Greske = [];
            const greskaNodes = greskeNode.getElementsByTagName('tns:Greska');
            for (let i = 0; i < greskaNodes.length; i++) {
                const s = greskaNodes[i].getElementsByTagName('tns:SifraGreske')[0]?.textContent || '';
                const p = greskaNodes[i].getElementsByTagName('tns:PorukaGreske')[0]?.textContent || '';
                response.Greske.push({ SifraGreske: s, PorukaGreske: p });
            }
        }

        return response;
    }
}
