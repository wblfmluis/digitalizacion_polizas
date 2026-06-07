**Reseña Del Sistema**

**Digitalización de Pólizas** es un sistema desarrollado para gestionar, procesar y resguardar pólizas contables digitalizadas. Su objetivo principal es facilitar la carga, organización, consulta y control de pólizas a partir de archivos Excel y documentos PDF, integrando la información contable con evidencia documental almacenada de forma estructurada.

El sistema permite crear matrices de importación a partir de archivos Excel, identificar sus encabezados y configurar la relación entre columnas del archivo y campos internos del sistema. Con esta configuración, procesa automáticamente las filas del Excel para generar registros de pólizas con datos como número, tipo, fecha, concepto, descripción, cuenta contable, referencia, cargos, abonos, nomenclatura e identificadores únicos.

Además, permite asociar archivos PDF a las pólizas correspondientes mediante reglas de nomenclatura, almacenar dichos documentos en Appwrite Storage y conservar metadatos relevantes como nombre del archivo, tipo MIME, tamaño, número de páginas, estado de procesamiento y archivo optimizado. El sistema contempla la carga de archivos grandes mediante subida por partes y cuenta con una cola de procesamiento basada en Redis/BullMQ para optimización posterior de PDFs.

La plataforma incluye autenticación propia mediante JWT en cookie HTTP-only, administración de usuarios, asignación de roles y control de permisos. Los roles contemplados son administrador, operador y consulta, lo que permite restringir funciones como carga, procesamiento, consulta, modificación y eliminación de información.

También administra catálogos base como ejercicios fiscales, entidades, tipos de acción y campos del sistema. Registra eventos de operación para auditoría, incluyendo consultas, descargas, cargas y acciones relacionadas con pólizas, permitiendo dar trazabilidad al uso del sistema.

Entre sus funciones principales se encuentran:

- Registro y administración de usuarios con roles.
- Inicio y cierre de sesión seguro.
- Administración de catálogos operativos.
- Carga de matrices Excel.
- Lectura de encabezados de archivos Excel.
- Configuración de mapeo entre Excel y base de datos.
- Procesamiento masivo de pólizas.
- Consulta paginada y filtrada de pólizas.
- Estadísticas de pólizas por ejercicio, matriz y fechas.
- Carga y asociación de PDFs a pólizas.
- Almacenamiento externo de documentos mediante Appwrite.
- Descarga masiva de archivos en formato ZIP.
- Registro de bitácora de eventos.
- Optimización asincrónica de archivos PDF.

Técnicamente, el sistema está construido con NestJS y TypeScript, utiliza MySQL como base de datos mediante Drizzle ORM, Appwrite como servicio de almacenamiento documental, Redis/BullMQ para tareas en cola, y librerías especializadas para lectura de Excel, manejo de PDFs, compresión ZIP y seguridad de contraseñas.

En conjunto, este software constituye una solución para digitalizar, centralizar y controlar pólizas contables, reduciendo el manejo manual de archivos, mejorando la trazabilidad documental y facilitando la consulta estructurada de información financiera asociada a documentos comprobatorios.