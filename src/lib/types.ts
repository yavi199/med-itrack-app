

export type UserRole = "administrador" | "enfermero" | "tecnologo" | "transcriptora";

export type Service = "TAC" | "RX" | "ECO" | "MAMO" | "DENSITOMETRIA" | "RMN" | "General";

// These are the main service areas, equivalent to GeneralArea
export const GeneralServices = ["URG", "HOSP", "UCI", "C.EXT"] as const;
export type GeneralService = typeof GeneralServices[number];

// These are the sub-areas for each service
export const SubServiceAreas = {
    URG: ["TRIAGE", "OBS1", "OBS2"],
    HOSP: ["HOSP 2", "HOSP 4"],
    UCI: ["UCI 2", "UCI 3", "UCI NEO"],
    "C.EXT": ["AMB"],
} as const;

export type SubServiceArea<T extends GeneralService = GeneralService> = T extends GeneralService ? typeof SubServiceAreas[T][number] : never;


export type UserProfile = {
    uid: string;
    nombre: string;
    email: string;
    rol: UserRole;
    // For technologo/transcriptora, this is a modality. For enfermero, it's a GeneralService. For admin, 'General'
    servicioAsignado: Service | GeneralService; 
    // This is only relevant for 'enfermero'
    subServicioAsignado?: SubServiceArea;
    activo: boolean;
};
    
// This is the type we will use in the UI, which is slightly different from the DB structure
export type Study = {
    id: string;
    status: string;
    service: GeneralService; // URG, HOSP, UCI, C.EXT
    subService: SubServiceArea; // TRIAGE, OBS1, etc.
    patient: {
        fullName: string;
        id: string;
        entidad: string;
        birthDate?: string;
        sex?: string;
    };
    studies: {
        nombre: string;
        cups: string;
        modality: string;
        details?: string;
    }[];
    diagnosis: {
        code: string;
        description: string;
    };
    requestDate: {
        toDate: () => Date;
    } | null;
    completionDate: {
        toDate: () => Date;
    } | null;
    cancellationReason?: string;
};
