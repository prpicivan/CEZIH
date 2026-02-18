
export interface TaxType {
    Stopa: string; // Rate (e.g. "25.00")
    Osnovica: string; // Base amount
    Iznos: string; // Tax amount
}

export interface InvoiceNumberType {
    BrOznRac: string; // Invoice Number
    OznPosPr: string; // Business Space Label
    OznNapUr: string; // Payment Device Label
}

export interface InvoiceType {
    Oib: string;
    USustPdv: boolean;
    DatVrijeme: string; // dd.mm.yyyyThh:mm:ss
    OznSlijed: 'N' | 'P'; // N (Naplatni uređaj) or P (Poslovni prostor)
    BrRac: InvoiceNumberType;
    Pdv?: TaxType[];
    Pnp?: TaxType[]; // Porez na potrosnju
    OstaliPor?: TaxType[];
    IznosOslobPdv?: string;
    IznosMarza?: string;
    IznosNePodlOpor?: string;
    Naknade?: TaxType[]; // Fees
    IznosUkupno: string;
    NacinPlac: 'G' | 'K' | 'C' | 'T' | 'O';
    OibOper: string;
    ZastKod: string; // ZKI
    NakDost: boolean;
    ParagonBrRac?: string;
    SpecNamj?: string;
}

export interface HeaderType {
    IdPoruke: string; // UUID
    DatumVrijeme: string; // dd.mm.yyyyThh:mm:ss
}

export interface InvoiceRequest {
    Zaglavlje: HeaderType;
    Racun: InvoiceType;
}

export interface FiscalizationResponse {
    Jir?: string;
    Uuid?: string;
    DatVrijeme?: string;
    Greske?: { SifraGreske: string; PorukaGreske: string }[];
}
