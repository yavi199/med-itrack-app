# Med-iTrack

Esta es una aplicación de gestión de estudios médicos construida con Next.js y Firebase.

## Descripción

Med-iTrack permite al personal de una institución médica solicitar, rastrear y gestionar estudios de diagnóstico por imágenes. La aplicación utiliza IA para extraer información de órdenes médicas y agilizar el flujo de trabajo.

### Roles de Usuario

*   **Administrador:** Tiene control total sobre la aplicación, incluyendo la creación de nuevos usuarios y la gestión de todas las solicitudes.
*   **Enfermero/a:** Puede crear nuevas solicitudes de estudio para pacientes en su área de servicio asignada.
*   **Tecnólogo/a:** Puede actualizar el estado de los estudios de su modalidad a "Completado" y cancelarlos si es necesario.
*   **Transcriptora:** Puede actualizar el estado de los estudios a "Leído" y, en el caso de las ecografías (ECO), marcarlas como "Completadas".

### Características Principales

*   Creación de solicitudes a partir de la carga de archivos (PDF/imagen) con extracción de datos mediante IA.
*   Creación manual de solicitudes para administradores.
*   Generación de documentos de autorización.
*   Panel de control con filtros dinámicos por estado, modalidad y servicio.
*   Gestión de estados de estudio (Pendiente, Completado, Leído, Cancelado) con permisos por rol.
*   Autenticación de usuarios y gestión de perfiles por rol.
