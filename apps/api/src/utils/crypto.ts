import * as forge from 'node-forge';
import * as crypto from 'crypto';
import * as fs from 'fs';

export class FiscalizationCrypto {
    private privateKey: forge.pki.PrivateKey;
    private certificate: forge.pki.Certificate;

    constructor(p12Path: string, password: string) {
        const p12Buffer = fs.readFileSync(p12Path);
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

        // Get private key
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

        if (!keyBag) {
            throw new Error('Private key not found in P12 file');
        }
        this.privateKey = keyBag.key as forge.pki.PrivateKey;

        // Get certificate
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag]?.[0];

        if (!certBag) {
            throw new Error('Certificate not found in P12 file');
        }
        this.certificate = certBag.cert as forge.pki.Certificate;
    }

    /*
     * Generates ZKI (Zaštitni Kod Izdavatelja)
     * ZKI = MD5(RSA-SHA1-Signature(ConcatenatedInvoiceData))
     */
    public generateZKI(
        oib: string,
        date: string, // dd.mm.yyyy hh:mm:ss
        invoiceNumber: string,
        businessSpace: string,
        paymentDevice: string,
        totalAmount: number
    ): string {
        // Format amount to 2 decimal places string like "123.45"
        // Note: PHP number_format(val, 2, '.', '') ensures no thousands separator and dot for decimal
        const amountStr = totalAmount.toFixed(2).replace(',', '.'); // Ensure dot. toFixed usually returns dot.

        const dataToSign = `${oib}${date}${invoiceNumber}${businessSpace}${paymentDevice}${amountStr}`;

        // Sign with RSA-SHA1 using forge
        const md = forge.md.sha1.create();
        md.update(dataToSign);
        const signature = (this.privateKey as any).sign(md);

        // Calculate MD5 of the signature
        const md5 = forge.md.md5.create();
        md5.update(signature);
        return md5.digest().toHex();
    }

    public getCertificatePem(): string {
        return forge.pki.certificateToPem(this.certificate);
    }

    public getPrivateKeyPem(): string {
        return forge.pki.privateKeyToPem(this.privateKey);
    }

    public getCertificateIssuerStub(): { C: string, O: string, CN: string } {
        const issuer = this.certificate.issuer.attributes.reduce((acc: any, attr: any) => {
            acc[attr.shortName] = attr.value;
            return acc;
        }, {});
        return {
            C: issuer.C || '',
            O: issuer.O || '',
            CN: issuer.CN || ''
        }
    }

    public getCertificateSerial(): string {
        // Forge stores serial as hex string (sometimes with leading 00s which is fine)
        // Check if it's already hex or bytes. Forge usually hex for serialNumber property on cert object.
        // Assuming hex.
        const hex = this.certificate.serialNumber;
        return BigInt('0x' + hex).toString();
    }
}
