import { Router } from 'express';
import prisma from '../db/prisma';
import path from 'path';
import { FiscalizationService } from '../services/fiscalization.service';
import { InvoiceType } from '../services/fiscalization.types';

const router = Router();

// POST /api/fiscalization/test/f1
router.post('/test/f1', async (req, res) => {
    // 1. Dev Only Check
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test endpoint not available in production' });
    }

    try {
        console.log('Starting F1 Test Fiscalization...');

        // 2. Instantiate Service
        // Use logic similar to test_fiscalization.ts
        const certPath = process.env.FISKALIZATION_CERT_PATH
            ? path.resolve(process.env.FISKALIZATION_CERT_PATH)
            : path.join(process.cwd(), 'certs', '62615118085.F1.1.p12');

        const password = process.env.FISKALIZATION_CERT_PASS || 'password'; // Fallback for dev

        const service = new FiscalizationService(certPath, password, true); // true for Demo/Test env

        // 3. Create Dummy Invoice
        const now = new Date();
        const formatDate = (date: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        const invoiceId = `1${Date.now().toString().slice(-5)}`; // Numeric ID

        const invoice: InvoiceType = {
            Oib: '62615118085', // Matches the cert
            USustPdv: true,
            DatVrijeme: formatDate(now),
            OznSlijed: 'P',
            BrRac: {
                BrOznRac: invoiceId,
                OznPosPr: '1',
                OznNapUr: '1'
            },
            Pdv: [{
                Stopa: '25.00',
                Osnovica: '100.00',
                Iznos: '25.00'
            }],
            IznosUkupno: '125.00',
            NacinPlac: 'G', // Gotovina
            OibOper: '62615118085', // Matches cert
            ZastKod: '', // Calculated by service
            NakDost: false
        };

        // 4. Send Request
        // The service automatically logs to DB now
        const response = await service.fiscalizeInvoiceF1(invoice);

        res.json({
            success: true,
            message: 'Fiscalization Test Completed',
            jir: response.Jir,
            uuid: response.Uuid,
            invoiceId: invoiceId
        });

    } catch (error: any) {
        console.error('Test Fiscalization Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Fiscalization failed'
        });
    }
});

// GET /api/fiscalization/logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await prisma.fiscalizationLog.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Limit to last 100 entries for now
        });
        res.json(logs);
    } catch (error) {
        console.error('Failed to fetch fiscalization logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export const fiscalizationRouter = router;
