
"use client"

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Search, CheckCircle, Clock, XCircle, Loader2, CalendarIcon, BookOpenCheck } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from "@/lib/utils";
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Study, GeneralService } from "@/lib/types";
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { DateRange } from "react-day-picker";


type ActiveFilters = {
    modalities: string[];
    services: string[];
    statuses: string[];
}
type StudyTableProps = {
    studies: Study[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeFilters: ActiveFilters;
    toggleFilter: (type: keyof ActiveFilters, value: string) => void;
    dateRange: DateRange | undefined;
    setDateRange: (dateRange: DateRange | undefined) => void;
};

const statusConfig = {
    'Pendiente': { icon: Clock, className: 'bg-red-600 dark:bg-red-700 border-red-600 dark:border-red-700 text-white dark:text-white', iconClassName: 'text-white dark:text-white', label: 'Pendiente' },
    'Completado': { icon: CheckCircle, className: 'bg-green-600 dark:bg-green-700 border-green-600 dark:border-green-700 text-white dark:text-white', iconClassName: 'text-white dark:text-white', label: 'Completado' },
    'Leído': { icon: BookOpenCheck, className: 'bg-blue-600 dark:bg-blue-700 border-blue-600 dark:border-blue-700 text-white dark:text-white', iconClassName: 'text-white dark:text-white', label: 'Leído' },
    'Cancelado': { icon: XCircle, className: 'bg-orange-500 dark:bg-orange-600 border-orange-500 dark:border-orange-600 text-white dark:text-white', iconClassName: 'text-white dark:text-white', label: 'Cancelado' },
};

const cancellationReasons = [
    'Creatinina elevada',
    'Sin ayuno',
    'Requiere sedación',
    'Estudio cancelado por médico',
    'Estudio mal cargado'
];

export function StudyTable({ studies, loading, searchTerm, setSearchTerm, activeFilters, toggleFilter, dateRange, setDateRange }: StudyTableProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedReason, setSelectedReason] = useState(cancellationReasons[0]);
    const [editingStudy, setEditingStudy] = useState<Study | null>(null);

    const handleQuickStatusChange = async (study: Study) => {
        if (!userProfile) return;

        const { id, status } = study;
        const { rol } = userProfile;
        const modality = study.studies[0]?.modality;
        let nextStatus: string | null = null;
        
        if (rol === 'administrador') {
            if (status === 'Pendiente') {
                nextStatus = 'Completado';
            } else if (status === 'Completado') {
                nextStatus = 'Leído';
            }
        } else if (rol === 'tecnologo' && status === 'Pendiente') {
            nextStatus = 'Completado';
        } else if (rol === 'transcriptora') {
            if (status === 'Pendiente' && modality === 'ECO') {
                nextStatus = 'Completado';
            } else if (status === 'Completado') {
                nextStatus = 'Leído';
            }
        }


        if (nextStatus) {
            handleStatusChange(id, nextStatus);
        }
    };

    const handleStatusChange = async (studyId: string, newStatus: string) => {
        setIsUpdating(studyId);
        const studyRef = doc(db, "studies", studyId);
        try {
            const updateData: any = { status: newStatus };
            if (newStatus === 'Completado' || newStatus === 'Cancelado' || newStatus === 'Leído') {
                updateData.completionDate = serverTimestamp();
            }
             if (newStatus === 'Pendiente') {
                updateData.completionDate = null;
                updateData.cancellationReason = deleteField();
            }

            await updateDoc(studyRef, updateData);

            toast({
                title: "Estudio Actualizado",
                description: `El estado del estudio se ha cambiado a ${newStatus}.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al Actualizar",
                description: "No se pudo cambiar el estado del estudio.",
            });
        } finally {
            setIsUpdating(null);
        }
    };
    
    const handleCancelStudy = async (studyId: string) => {
        setIsCancelling(true);
        const studyRef = doc(db, "studies", studyId);
        try {
            await updateDoc(studyRef, {
                status: 'Cancelado',
                cancellationReason: selectedReason,
                completionDate: serverTimestamp(),
            });
            toast({
                title: 'Estudio Cancelado',
                description: `El estudio ha sido marcado como cancelado. Motivo: ${selectedReason}`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error al Cancelar',
                description: 'No se pudo actualizar el estado del estudio.',
            });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingStudy) return;

        setIsUpdating(editingStudy.id);
        const formData = new FormData(e.currentTarget);
        const studyData = {
            patient: {
                id: formData.get('patientId') as string,
                fullName: formData.get('fullName') as string,
                birthDate: formData.get('birthDate') as string,
                sex: formData.get('sex') as string,
                entidad: formData.get('entidad') as string,
            },
            studies: [{
                cups: formData.get('cups') as string,
                nombre: formData.get('studyName') as string,
                details: formData.get('studyDetails') as string,
            }],
            diagnosis: {
                code: formData.get('cie10') as string,
                description: formData.get('diagnosisDescription') as string,
            },
            service: formData.get('service') as GeneralService,
            subService: formData.get('subService') as string,
        };

        const studyRef = doc(db, "studies", editingStudy.id);
        try {
            await updateDoc(studyRef, studyData);
            toast({
                title: "Estudio Actualizado",
                description: "Los datos del estudio se han guardado correctamente.",
            });
            setEditingStudy(null);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al Guardar",
                description: "No se pudieron guardar los cambios.",
            });
        } finally {
            setIsUpdating(null);
        }
    };


    const formatDate = (dateObj: { toDate: () => Date } | null) => {
        if (!dateObj) return 'N/A';
        try {
            return format(dateObj.toDate(), "dd MMM, HH:mm");
        } catch (error) {
            return 'Fecha inválida';
        }
    };

    const getAge = (birthDate: string | undefined) => {
        if (!birthDate) return '';
        try {
            const dob = new Date(birthDate);
            if (isNaN(dob.getTime())) return '';
            const age = differenceInYears(new Date(), dob);
            return `/ ${age} AÑOS`;
        } catch {
            return '';
        }
    };
    
    const canPerformAction = (study: Study) => {
        if (!userProfile) return { edit: false, cancel: false, changeStatus: false, quickChange: false };

        const { rol } = userProfile;
        const { status } = study;
        const modality = study.studies[0]?.modality;

        // Admin has all permissions, always.
        if (rol === 'administrador') {
            return {
                edit: true,
                cancel: true,
                changeStatus: true,
                quickChange: status === 'Pendiente' || status === 'Completado',
            };
        }
        
        let canQuickChange = false;

        if (rol === 'tecnologo') {
            if (status === 'Pendiente') {
                canQuickChange = true;
            }
        } else if (rol === 'transcriptora') {
             if ((status === 'Pendiente' && modality === 'ECO') || status === 'Completado') {
                canQuickChange = true;
            }
        }

        return {
            edit: false, // Only admin can edit
            cancel: rol === 'tecnologo' || rol === 'transcriptora',
            changeStatus: false, // Only admin can change status from menu
            quickChange: canQuickChange,
        };
    };

    return (
        <>
            <Card className="shadow-lg border-border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="p-2 text-center" style={{ width: '120px' }}>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="sm" className="font-bold h-8 w-full justify-center">
                                                Estado
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {Object.keys(statusConfig).map((status) => (
                                                <DropdownMenuCheckboxItem
                                                    key={status}
                                                    checked={activeFilters.statuses.includes(status)}
                                                    onCheckedChange={() => toggleFilter('statuses', status)}
                                                >
                                                    {status}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                                <TableHead className="text-center font-bold p-2" style={{ width: '85px' }}>Servicio</TableHead>
                                <TableHead className="align-middle p-2 min-w-[300px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar Paciente (Nombre / ID)" 
                                            className="pl-10 h-9 bg-background"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="font-bold p-2 min-w-[300px]">Estudio</TableHead>
                                <TableHead className="text-center font-bold p-2" style={{ width: '150px' }}>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="date"
                                                variant={"ghost"}
                                                size="sm"
                                                className={cn(
                                                    "w-full justify-center text-center font-bold h-8",
                                                    !dateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <span>Fecha</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="center">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange}
                                                numberOfMonths={2}
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </TableHead>
                                <TableHead className="p-2" style={{ width: '40px' }}></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center p-8">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <p>Cargando estudios...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : studies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center p-8">
                                        <p>No se encontraron solicitudes.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                studies.map((req) => {
                                    const { icon: Icon, className, iconClassName, label } = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.Pendiente;
                                    const study = req.studies[0];
                                    const age = getAge(req.patient.birthDate);
                                    const permissions = canPerformAction(req);
                                    
                                    return (
                                        <TableRow key={req.id} className="text-sm">
                                            <TableCell className="p-1 align-middle h-full">
                                                <button 
                                                    onClick={() => handleQuickStatusChange(req)}
                                                    disabled={!permissions.quickChange || !!isUpdating}
                                                    className={cn(
                                                        'w-full h-full flex flex-col items-center justify-center gap-1 p-1 rounded-md border transition-colors',
                                                        className,
                                                        permissions.quickChange && 'hover:bg-opacity-80'
                                                    )}
                                                >
                                                     {isUpdating === req.id ? <Loader2 className="h-5 w-5 animate-spin"/> : <Icon className={cn('h-5 w-5', iconClassName)} />}
                                                    <p className='text-xs font-bold'>{label.toUpperCase()}</p>
                                                </button>
                                            </TableCell>
                                            <TableCell className="p-2 align-top text-center">
                                                <div className="font-bold">{req.service}</div>
                                                <div className="text-xs text-muted-foreground">{req.subService}</div>
                                            </TableCell>
                                            <TableCell className="p-2 align-top max-w-[300px]">
                                                <div className="font-bold uppercase text-sm">{req.patient.fullName}</div>
                                                <div className="text-muted-foreground uppercase text-xs truncate">
                                                    ID: {req.patient.id} | {req.patient.entidad}
                                                </div>
                                                <div className="text-muted-foreground uppercase text-xs truncate">
                                                     {req.patient.birthDate} {age}
                                                     {req.cancellationReason && (
                                                        <span className="text-orange-500 font-semibold ml-2">
                                                            ({req.cancellationReason.toUpperCase()})
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <div className="flex items-start gap-3">
                                                    <Badge variant="outline" className="flex items-center justify-center w-12 h-10 border-2 font-semibold rounded-md text-sm">{study.modality}</Badge>
                                                    <div>
                                                        <div className="font-bold uppercase text-sm leading-tight">{study.nombre}</div>
                                                        <div className="text-muted-foreground text-xs font-medium">
                                                            <span>CUPS: {study.cups}</span>
                                                            <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">DX: {req.diagnosis.code} - {req.diagnosis.description}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2 align-top text-center text-xs space-y-1">
                                                <div className="font-medium text-red-600">{formatDate(req.requestDate)}</div>
                                                <div className="font-medium text-green-600">{formatDate(req.completionDate)}</div>
                                            </TableCell>
                                            <TableCell className="p-1 text-right align-top">
                                                <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {permissions.edit && <DropdownMenuItem onClick={() => setEditingStudy(req)}>Editar</DropdownMenuItem>}
                                                            {permissions.changeStatus && (
                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger>Cambiar estado</DropdownMenuSubTrigger>
                                                                    <DropdownMenuPortal>
                                                                    <DropdownMenuSubContent>
                                                                        {Object.keys(statusConfig).filter(s => s !== 'Cancelado').map(status => (
                                                                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(req.id, status)}>
                                                                                {status}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuSubContent>
                                                                    </DropdownMenuPortal>
                                                                </DropdownMenuSub>
                                                            )}
                                                            {permissions.cancel && (
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem
                                                                        onSelect={(e) => e.preventDefault()}
                                                                        disabled={req.status === 'Cancelado'}
                                                                        className="text-orange-600 focus:text-orange-600"
                                                                    >
                                                                        Cancelar
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Cancelar Estudio</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Selecciona un motivo para la cancelación del estudio de <span className="font-bold">{req.patient.fullName}</span>. Esta acción no se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <RadioGroup defaultValue={selectedReason} onValueChange={setSelectedReason} className="my-4">
                                                            {cancellationReasons.map(reason => (
                                                                <div key={reason} className="flex items-center space-x-2">
                                                                    <RadioGroupItem value={reason} id={`${req.id}-${reason}`} />
                                                                    <Label htmlFor={`${req.id}-${reason}`}>{reason}</Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Volver</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCancelStudy(req.id)} disabled={isCancelling}>
                                                                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Cancelación"}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <AlertDialog open={!!editingStudy} onOpenChange={(open) => { if (!open) setEditingStudy(null) }}>
                <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                    {editingStudy && (
                        <form onSubmit={handleEditSubmit}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Editar Solicitud</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Modifique los datos para la solicitud de <span className="font-bold">{editingStudy.patient.fullName}</span>.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid gap-4 py-4">
                                <h3 className="font-semibold text-sm">Datos del Paciente</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="patientId">Documento del Paciente</Label>
                                    <Input id="patientId" name="patientId" defaultValue={editingStudy.patient.id} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Nombre Completo</Label>
                                        <Input id="fullName" name="fullName" defaultValue={editingStudy.patient.fullName} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="birthDate">Fecha Nacimiento</Label>
                                        <Input id="birthDate" name="birthDate" type="date" defaultValue={editingStudy.patient.birthDate} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sex">Sexo</Label>
                                        <Input id="sex" name="sex" defaultValue={editingStudy.patient.sex || ''} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="entidad">Entidad/Aseguradora</Label>
                                        <Input id="entidad" name="entidad" defaultValue={editingStudy.patient.entidad} required />
                                    </div>
                                </div>

                                <h3 className="font-semibold text-sm pt-4">Datos del Servicio</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="service">Servicio</Label>
                                        <Input id="service" name="service" defaultValue={editingStudy.service} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subService">Sub-Servicio</Label>
                                        <Input id="subService" name="subService" defaultValue={editingStudy.subService} required />
                                    </div>
                                </div>


                                <h3 className="font-semibold text-sm pt-4">Datos del Estudio</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cups">CUPS</Label>
                                        <Input id="cups" name="cups" defaultValue={editingStudy.studies[0].cups} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="studyName">Nombre del Estudio</Label>
                                        <Input id="studyName" name="studyName" defaultValue={editingStudy.studies[0].nombre} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studyDetails">Detalles del Estudio</Label>
                                    <Input id="studyDetails" name="studyDetails" defaultValue={editingStudy.studies[0].details || ''} />
                                </div>

                                <h3 className="font-semibold text-sm pt-4">Datos del Diagnóstico</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cie10">CIE-10</Label>
                                        <Input id="cie10" name="cie10" defaultValue={editingStudy.diagnosis.code} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="diagnosisDescription">Descripción Diagnóstico</Label>
                                        <Input id="diagnosisDescription" name="diagnosisDescription" defaultValue={editingStudy.diagnosis.description} required />
                                    </div>
                                </div>
                            </div>
                            <AlertDialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingStudy(null)} disabled={!!isUpdating}>Cancelar</Button>
                                <Button type="submit" disabled={!!isUpdating}>
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Guardar Cambios
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    

    