
import { cezihService } from './services/cezih.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixReferral() {
    const id = '769d2997-5ea9-474b-b741-a8e87121c27f';
    console.log(`Attempting to fix status for referral ${id}...`);

    try {
        const result = await cezihService.takeoverReferral(id, 'DR-FIX', 'ORG-FIX');
        console.log('✔ Status updated successfully:', result.referral.status);
    } catch (error) {
        console.error('✖ Failed to update status:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixReferral();
