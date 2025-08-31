
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { UserRole, Service, GeneralService, SubServiceArea } from '@/lib/types';
import { GeneralServices, SubServiceAreas } from '@/lib/types';

const AppLogo = (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-5.5-4-4.5 2.5-6.5 4S2 13 2 15a7 7 0 0 0 7 7z" />
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-5.5-4-4.5 2.5-6.5 4S2 13 2 15a7 7 0 0 0 7 7z" />
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-5.5-4-4.5 2.5-6.5 4S2 13 2 15a7 7 0 0 0 7 7z" />
    </svg>
  );

const roles: UserRole[] = ["administrador", "enfermero", "tecnologo", "transcriptora"];
const modalities: Service[] = ["TAC", "RX", "ECO", "MAMO", "DENSITOMETRIA", "RMN"];


export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<UserRole>('enfermero');
  const [servicioAsignado, setServicioAsignado] = useState<Service | GeneralService>('URG');
  const [subServicioAsignado, setSubServicioAsignado] = useState<SubServiceArea>('TRIAGE');
  
  const { signup } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // In a real app, you would uncomment this to protect the route
  // useEffect(() => {
  //   if (userProfile && userProfile.rol !== 'administrador') {
  //     router.push('/');
  //   }
  // }, [userProfile, router]);

  const handleRoleChange = (value: UserRole) => {
    setRol(value);
    if (value === 'administrador') {
      setServicioAsignado('General');
      setSubServicioAsignado(undefined);
    } else if (value === 'enfermero') {
      setServicioAsignado('URG');
      setSubServicioAsignado('TRIAGE');
    } else { // tecnologo or transcriptora
      setServicioAsignado('TAC');
      setSubServicioAsignado(undefined);
    }
  }

  const handleGeneralServiceChange = (value: GeneralService) => {
    setServicioAsignado(value);
    setSubServicioAsignado(SubServiceAreas[value][0]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Contraseña Débil",
            description: "La contraseña debe tener al menos 6 caracteres.",
        });
        return;
    }

    setLoading(true);
    try {
      await signup(email, password, {
        nombre,
        rol,
        servicioAsignado,
        subServicioAsignado: rol === 'enfermero' ? subServicioAsignado : undefined,
        activo: true
      });
      toast({
        title: 'Usuario Creado',
        description: 'El nuevo usuario ha sido registrado exitosamente.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description: error.message || 'No se pudo crear el usuario. Intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
                <AppLogo className="h-14 w-14 text-primary" />
            </div>
          <CardTitle className="text-2xl">Crear Nuevo Usuario</CardTitle>
          <CardDescription>Registra un nuevo miembro del equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="John Doe"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select onValueChange={(value: UserRole) => handleRoleChange(value)} defaultValue={rol}>
                    <SelectTrigger id="rol">
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {rol === 'enfermero' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="servicio-general">Servicio General</Label>
                    <Select onValueChange={(value: GeneralService) => handleGeneralServiceChange(value)} value={servicioAsignado as GeneralService}>
                        <SelectTrigger id="servicio-general">
                            <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                            {GeneralServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sub-servicio">Área de Servicio</Label>
                    <Select onValueChange={(value: SubServiceArea) => setSubServicioAsignado(value)} value={subServicioAsignado}>
                        <SelectTrigger id="sub-servicio">
                            <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                            {servicioAsignado && SubServiceAreas[servicioAsignado as GeneralService]?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            )}

            {(rol === 'tecnologo' || rol === 'transcriptora') && (
                 <div className="space-y-2">
                    <Label htmlFor="modalidad">Modalidad Asignada</Label>
                    <Select onValueChange={(value: Service) => setServicioAsignado(value)} value={servicioAsignado as Service}>
                        <SelectTrigger id="modalidad">
                            <SelectValue placeholder="Selecciona una modalidad" />
                        </SelectTrigger>
                        <SelectContent>
                            {modalities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                Ya tienes una cuenta? <Link href="/login" className="font-semibold text-primary hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
