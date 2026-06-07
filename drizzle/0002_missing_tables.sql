CREATE TABLE `archivo_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(150),
	`mimetype` varchar(50),
	`size` int,
	`bucket_id` varchar(100),
	`file_id` varchar(100) NOT NULL,
	`paginas` int,
	`file_state` varchar(20),
	`optimizedSize` bigint,
	`durationMs` int,
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `archivo_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `c_campos_sistema` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre_comun` varchar(100),
	`nombre_bd` varchar(100),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `c_campos_sistema_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `c_ejercicio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ejercicio` year,
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `c_ejercicio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `c_tipo_accion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accion` varchar(100),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `c_tipo_accion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entidad` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(150),
	`rfc` varchar(15),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `entidad_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matriz` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idejercicio` int,
	`nombre` varchar(100),
	`conf_db_to_xls` json,
	`conf_xls_to_db` json,
	`excel_headers` json,
	`bucket_id` varchar(100),
	`file_id` varchar(100),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `matriz_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poliza` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idejercicio` int,
	`identidad` int,
	`idmatriz` int,
	`idproveedor` int,
	`idarchivo_metadata` int,
	`uuid` varchar(36),
	`numero` varchar(150),
	`tipo` varchar(2),
	`fecha` date,
	`concepto` varchar(500),
	`descripcion` text,
	`cuenta_contable` varchar(100),
	`referencia` varchar(100),
	`cargo` decimal(18,2) NOT NULL,
	`abono` decimal(18,2) NOT NULL,
	`nomenclatura` varchar(500),
	`identificador` varchar(20),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `poliza_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `log_eventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idc_tipo_accion` int,
	`idpoliza` int,
	`filtros` json,
	`usuario` varchar(150),
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `log_eventos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `matriz` ADD CONSTRAINT `matriz_idejercicio_c_ejercicio_id_fk` FOREIGN KEY (`idejercicio`) REFERENCES `c_ejercicio`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `poliza` ADD CONSTRAINT `poliza_idejercicio_c_ejercicio_id_fk` FOREIGN KEY (`idejercicio`) REFERENCES `c_ejercicio`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `poliza` ADD CONSTRAINT `poliza_identidad_entidad_id_fk` FOREIGN KEY (`identidad`) REFERENCES `entidad`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `poliza` ADD CONSTRAINT `poliza_idmatriz_matriz_id_fk` FOREIGN KEY (`idmatriz`) REFERENCES `matriz`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `poliza` ADD CONSTRAINT `poliza_idarchivo_metadata_archivo_metadata_id_fk` FOREIGN KEY (`idarchivo_metadata`) REFERENCES `archivo_metadata`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `log_eventos` ADD CONSTRAINT `log_eventos_idc_tipo_accion_c_tipo_accion_id_fk` FOREIGN KEY (`idc_tipo_accion`) REFERENCES `c_tipo_accion`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `log_eventos` ADD CONSTRAINT `log_eventos_idpoliza_poliza_id_fk` FOREIGN KEY (`idpoliza`) REFERENCES `poliza`(`id`) ON DELETE no action ON UPDATE no action;
