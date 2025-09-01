
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, UploadCloud, Loader2, User, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { extractOrder, ExtractOrderOutput } from '@/ai/flows/extract-order-flow';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Label } from '../ui/label';
import { useAuth } from '@/context/auth-context';
import { SubServiceAreas, GeneralService } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type UploadedFile = {
    id: string;
    file: File;
    status: 'processing' | 'success' | 'error';
    extractedData: ExtractOrderOutput | null;
    errorMessage?: string;
};

export function NewRequestCard() {
    const { userProfile } = useAuth();
    const [dragging, setDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [activeData, setActiveData] = useState<ExtractOrderOutput | null>(null);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [showAdminChoice, setShowAdminChoice] = useState(false);
    const [patientId, setPatientId] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [showMultiUploadDialog, setShowMultiUploadDialog] = useState(false);

    const [manualService, setManualService] = useState<GeneralService>('URG');
    const [manualSubService, setManualSubService] = useState(SubServiceAreas['URG'][0]);


    const { toast } = useToast();

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setIsProcessing(true);
        if (files.length === 1) {
            await processSingleFile(files[0]);
        } else {
            await processMultipleFiles(Array.from(files));
        }
        setIsProcessing(false);
    };

    const processSingleFile = async (file: File) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            toast({ variant: "destructive", title: "Archivo no válido", description: "Por favor, sube una imagen o un PDF." });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUri = e.target?.result as string;
            try {
                const result = await extractOrder({ fileDataUri: dataUri });
                setActiveData(result);

                if (userProfile?.rol === 'administrador') {
                    setShowAdminChoice(true);
                } else if (userProfile?.rol === 'enfermero') {
                    await handleCreateRequest(result);
                } else {
                     toast({ variant: "destructive", title: "Acción no permitida", description: "Tu rol no permite crear solicitudes desde archivo." });
                     resetState();
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Error de Extracción", description: "No se pudo procesar el archivo. Intenta de nuevo." });
                resetState();
            }
        };
        reader.readAsDataURL(file);
    };

    const processMultipleFiles = async (files: File[]) => {
        setShowMultiUploadDialog(true);
        const newFiles: UploadedFile[] = files.map(file => ({
            id: `${file.name}-${Date.now()}`,
            file,
            status: 'processing',
            extractedData: null,
        }));
        setUploadedFiles(newFiles);

        await Promise.all(newFiles.map(async (uploadedFile) => {
            if (!uploadedFile.file.type.startsWith('image/') && uploadedFile.file.type !== 'application/pdf') {
                updateFileStatus(uploadedFile.id, 'error', null, "Archivo no válido");
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUri = e.target?.result as string;
                try {
                    const result = await extractOrder({ fileDataUri: dataUri });
                    updateFileStatus(uploadedFile.id, 'success', result);
                } catch (error) {
                    updateFileStatus(uploadedFile.id, 'error', null, "Error de extracción");
                }
            };
            reader.readAsDataURL(uploadedFile.file);
        }));
    };
    
    const updateFileStatus = (id: string, status: 'success' | 'error', data: ExtractOrderOutput | null, message?: string) => {
        setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, status, extractedData: data, errorMessage: message } : f));
    }
    
    const removeFileFromList = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };


    const resetState = () => {
        setActiveData(null);
        setShowManualEntry(false);
        setPatientId('');
        setShowAdminChoice(false);
        setUploadedFiles([]);
        setShowMultiUploadDialog(false);
    }

    const handleCreateRequest = async (dataToSave: ExtractOrderOutput | null, isMulti = false, manualData?: {service: GeneralService, subService: string}) => {
        if (!dataToSave || !userProfile) return;
        
        if (!isMulti) {
            setIsCreating(true);
            setShowAdminChoice(false);
        }

        try {
            let service: GeneralService;
            let subService: string | undefined;

            if (manualData) { 
                service = manualData.service;
                subService = manualData.subService;
            } else if ((userProfile.rol === 'enfermero' || userProfile.rol === 'administrador') && 'servicioAsignado' in userProfile && 'subServicioAsignado' in userProfile) { 
                service = userProfile.servicioAsignado as GeneralService;
                subService = userProfile.subServicioAsignado;
            } else {
                 toast({ variant: "destructive", title: "Perfil no configurado", description: "El perfil de usuario no tiene un servicio asignado." });
                 setIsCreating(false);
                 return;
            }


            const studyData = {
                patient: { ...dataToSave.patient },
                studies: dataToSave.studies.map(s => ({ ...s })),
                diagnosis: { ...dataToSave.diagnosis },
                physician: { ...dataToSave.physician },
                order: { ...dataToSave.order },
                status: 'Pendiente',
                requestDate: serverTimestamp(),
                completionDate: null,
                service: service,
                subService: subService
            };

            const docRef = await addDoc(collection(db, "studies"), studyData);
            
             if (!isMulti) {
                toast({ title: "Solicitud Creada", description: `Solicitud para ${dataToSave.patient?.fullName} ha sido creada con el ID: ${docRef.id}.` });
                resetState();
            }

            return { success: true, patientName: dataToSave.patient?.fullName };
        } catch (error) {
            console.error("Error creating request:", error);
            if (!isMulti) {
                toast({ variant: "destructive", title: "Error al Crear Solicitud", description: "No se pudo guardar la solicitud en la base de datos." });
            }
            return { success: false, patientName: dataToSave.patient?.fullName };
        } finally {
            if (!isMulti) {
                setIsCreating(false);
            }
        }
    };
    
    const handleCreateAllRequests = async () => {
        setIsCreating(true);
        const successfulFiles = uploadedFiles.filter(f => f.status === 'success' && f.extractedData);
        let successCount = 0;
        let errorCount = 0;

        for (const file of successfulFiles) {
            const result = await handleCreateRequest(file.extractedData, true);
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        toast({
            title: "Proceso de Carga Masiva Terminado",
            description: `${successCount} solicitudes creadas exitosamente. ${errorCount > 0 ? `${errorCount} fallaron.` : ''}`
        });

        setIsCreating(false);
        resetState();
    };

    const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: ExtractOrderOutput = {
            patient: { id: formData.get('patientId') as string, fullName: formData.get('fullName') as string, birthDate: formData.get('birthDate') as string, sex: formData.get('sex') as string, entidad: formData.get('entidad') as string },
            studies: [{ cups: formData.get('cups') as string, nombre: formData.get('studyName') as string, details: formData.get('studyDetails') as string }],
            diagnosis: { code: formData.get('cie10') as string, description: formData.get('diagnosisDescription') as string },
            physician: { fullName: formData.get('physicianName') as string, registryNumber: formData.get('physicianRegistry') as string, specialty: formData.get('physicianSpecialty') as string },
            order: { date: formData.get('orderDate') as string, institutionName: formData.get('institutionName') as string, admissionNumber: formData.get('admissionNumber') as string }
        };
        await handleCreateRequest(data, false, { service: manualService, subService: manualSubService });
    };

    const handleDragEnter = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    const handleIdInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && patientId) {
            e.preventDefault();
            if (userProfile?.rol === 'administrador') {
              setShowManualEntry(true);
            } else {
              toast({ variant: "destructive", title: "Acción no permitida", description: "Solo los administradores pueden crear solicitudes manuales." });
            }
        }
    };
    
    return (
        <>
            <Card className="shadow-lg border-border xl:col-span-1 flex flex-col h-full">
                <CardHeader className="p-4">
                    <CardTitle className="font-headline font-semibold text-lg text-foreground">Nueva Solicitud</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-grow flex flex-col gap-4">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                        accept="image/*,application/pdf"
                        disabled={isProcessing || isCreating}
                        multiple
                    />
                    <label
                        htmlFor="file-upload"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center flex flex-col items-center justify-center flex-grow w-full bg-primary/10 border-primary/40 transition-colors",
                            !(isProcessing || isCreating) && "cursor-pointer hover:border-primary",
                            dragging && "border-primary bg-primary/20"
                        )}
                    >
                        <div className="flex flex-col items-center justify-center gap-2 text-primary-foreground">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm font-semibold text-foreground">Procesando...</p>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="h-8 w-8 text-primary" />
                                    <p className="text-sm font-semibold text-foreground">Cargar Orden (PDF o Foto)</p>
                                    <p className="text-xs text-muted-foreground">o arrastra y suelta aquí</p>
                                </>
                            )}
                        </div>
                    </label>
                    {userProfile?.rol === 'administrador' && (
                        <div className="relative mt-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Crear solicitud por ID de paciente"
                                className="pl-10 h-10 text-sm"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                onKeyDown={handleIdInputKeyDown}
                                disabled={isProcessing || isCreating}
                                suppressHydrationWarning
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showAdminChoice} onOpenChange={(open) => {if (!open) resetState()}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Orden Procesada Exitosamente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se ha extraído la información para <span className="font-bold">{activeData?.patient.fullName}</span>.
                            Ahora puede crear la solicitud.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="ghost" onClick={resetState} disabled={isCreating}>Cancelar</Button>
                        <Button onClick={() => handleCreateRequest(activeData)} disabled={isCreating}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Solicitud
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={showMultiUploadDialog} onOpenChange={(open) => { if (!open) resetState() }}>
                <AlertDialogContent className="max-w-2xl max-h-[90vh]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revisar Carga Múltiple</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se están procesando {uploadedFiles.length} archivos. Revisa los resultados y crea las solicitudes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="overflow-y-auto max-h-[60vh] p-1 -mx-1">
                        <ul className="space-y-2">
                            {uploadedFiles.map(f => (
                                <li key={f.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                                        {f.status === 'success' && f.extractedData && (
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold text-green-600">Éxito:</span> {f.extractedData.patient.fullName} - {f.extractedData.studies[0]?.nombre}
                                            </p>
                                        )}
                                        {f.status === 'error' && (
                                            <p className="text-xs text-destructive">{f.errorMessage}</p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        {f.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                                        {f.status !== 'processing' && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFileFromList(f.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={resetState}>Cancelar</Button>
                        <Button 
                            onClick={handleCreateAllRequests} 
                            disabled={isCreating || uploadedFiles.every(f => f.status !== 'success')}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear ({uploadedFiles.filter(f => f.status === 'success').length}) Solicitudes
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <AlertDialog open={showManualEntry} onOpenChange={(open) => { if (!open) resetState() }}>
                <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleManualSubmit}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Crear Solicitud Manual</AlertDialogTitle>
                            <AlertDialogDescription>
                                Ingrese los detalles para el paciente con ID: <span className="font-bold">{patientId}</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-4 py-4">
                             <h3 className="font-semibold text-sm">Datos del Paciente</h3>
                             <div className="space-y-2">
                                <Label htmlFor="patientId">Documento del Paciente</Label>
                                <Input id="patientId" name="patientId" defaultValue={patientId} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Nombre Completo</Label>
                                    <Input id="fullName" name="fullName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Fecha Nacimiento</Label>
                                    <Input id="birthDate" name="birthDate" type="date" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sex">Sexo</Label>
                                    <Input id="sex" name="sex" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="entidad">Entidad/Aseguradora</Label>
                                    <Input id="entidad" name="entidad" required />
                                </div>
                            </div>
                            
                            <h3 className="font-semibold text-sm pt-4">Asignación de Servicio</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manual-service">Servicio General</Label>
                                    <Select 
                                        name="manualService"
                                        value={manualService} 
                                        onValueChange={(v: GeneralService) => {
                                            setManualService(v);
                                            setManualSubService(SubServiceAreas[v][0]);
                                        }}
                                    >
                                        <SelectTrigger id="manual-service"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(SubServiceAreas).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manual-subservice">Área de Servicio</Label>
                                    <Select name="manualSubService" value={manualSubService} onValueChange={setManualSubService}>
                                        <SelectTrigger id="manual-subservice"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SubServiceAreas[manualService].map(ss => <SelectItem key={ss} value={ss}>{ss}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>


                            <h3 className="font-semibold text-sm pt-4">Datos de la Orden</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="orderDate">Fecha de la Orden</Label>
                                    <Input id="orderDate" name="orderDate" type="date" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="institutionName">Institución</Label>
                                    <Input id="institutionName" name="institutionName" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admissionNumber">Número de Admisión</Label>
                                <Input id="admissionNumber" name="admissionNumber" />
                            </div>
                            
                            <h3 className="font-semibold text-sm pt-4">Datos del Estudio</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cups">CUPS</Label>
                                    <Input id="cups" name="cups" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studyName">Nombre del Estudio</Label>
                                    <Input id="studyName" name="studyName" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studyDetails">Detalles del Estudio</Label>
                                <Input id="studyDetails" name="studyDetails" />
                            </div>

                             <h3 className="font-semibold text-sm pt-4">Datos del Diagnóstico</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cie10">CIE-10</Label>
                                    <Input id="cie10" name="cie10" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="diagnosisDescription">Descripción Diagnóstico</Label>
                                    <Input id="diagnosisDescription" name="diagnosisDescription" required />
                                </div>
                            </div>

                             <h3 className="font-semibold text-sm pt-4">Datos del Médico</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="physicianName">Nombre del Médico</Label>
                                    <Input id="physicianName" name="physicianName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="physicianRegistry">Registro Médico</Label>
                                    <Input id="physicianRegistry" name="physicianRegistry" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="physicianSpecialty">Especialidad</Label>
                                <Input id="physicianSpecialty" name="physicianSpecialty" required />
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <Button type="button" variant="outline" onClick={resetState} disabled={isCreating}>Cancelar</Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Solicitud
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
