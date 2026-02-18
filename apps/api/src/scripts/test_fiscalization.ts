
import dotenv from 'dotenv';
import path from 'path';
import { FiscalizationService } from '../services/fiscalization.service';

// Load env from apps/api context
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Dotenv error:', result.error);
}

async function test() {
    console.log('Testing Fiscalization Service...');
    try {
        // Fallback to hardcoded password for testing if env fails
        let password = process.env.FISCALIZATION_CERT_PASS || 'password';
        console.log(`Password length: ${password.length}`);

        // Trim just in case
        password = password.trim();

        const service = new FiscalizationService(
            path.join(process.cwd(), 'certs', '62615118085.F1.1.p12'),
            password,
            true
        );

        const response = await service.echo('Test connectivity');
        console.log('Echo Success!', response);

        console.log('Testing F1 Invoice Fiscalization...');

        // Create dummy invoice
        const now = new Date();
        const formatDate = (date: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        const invoice = {
            Oib: '62615118085', // Matches the cert
            USustPdv: true,
            DatVrijeme: formatDate(now),
            OznSlijed: 'P' as const,
            BrRac: {
                BrOznRac: '123',
                OznPosPr: '1',
                OznNapUr: '1'
            },
            Pdv: [{
                Stopa: '25.00',
                Osnovica: '100.00',
                Iznos: '25.00'
            }],
            IznosUkupno: '125.00',
            NacinPlac: 'G' as const,
            OibOper: '62615118085', // Matches the cert (must be valid OIB)
            ZastKod: '', // Will be calculated
            NakDost: false
        };

        const f1Response = await service.fiscalizeInvoiceF1(invoice);
        console.log('F1 Fiscalization Success!');
        console.log('JIR:', f1Response.Jir);
        console.log('UUID:', f1Response.Uuid);
        console.log('DateTime:', f1Response.DatVrijeme);

    } catch (error: any) {
        console.error('Error:', error);
        if (error.message && error.message.includes('MAC verify failure')) {
            console.error('⚠️  MAC verify failure: The password for the P12 certificate is likely incorrect.');
            console.error('Please check apps/api/.env and update FISKALIZATION_CERT_PASS.');
        }
    }
}

test();
