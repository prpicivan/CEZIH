
import { soap } from 'strong-soap';

// Types for SOAP Client
export interface SoapClientOptions {
    wsdlPath: string;
    endpointUrl?: string;
}

export class SoapClientWrapper {
    private client: any;
    private options: SoapClientOptions;

    constructor(options: SoapClientOptions) {
        this.options = options;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            soap.createClient(this.options.wsdlPath, {
                endpoint: this.options.endpointUrl
            }, (err: any, client: any) => {
                if (err) {
                    console.error('Error creating SOAP client:', err);
                    reject(err);
                    return;
                }
                this.client = client;
                console.log(`SOAP Client created for: ${this.options.wsdlPath}`);
                resolve();
            });
        });
    }

    async callMethod(methodName: string, args: any): Promise<any> {
        if (!this.client) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            // @ts-ignore
            if (!this.client[methodName]) {
                return reject(new Error(`Method ${methodName} not found in WSDL`));
            }

            // @ts-ignore
            this.client[methodName](args, (err: any, result: any, envelope: any, soapHeader: any) => {
                if (err) {
                    console.error(`Error calling ${methodName}:`, err);
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }
}
