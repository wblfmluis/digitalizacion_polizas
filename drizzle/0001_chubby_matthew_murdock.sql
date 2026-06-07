CREATE TABLE `usuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(150) NOT NULL,
	`email` varchar(150) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`status` tinyint DEFAULT 1,
	`last_login_at` datetime,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `usuario_id` PRIMARY KEY(`id`),
	CONSTRAINT `usuario_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `rol` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clave` varchar(50) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`status` tinyint DEFAULT 1,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`created_by` varchar(50),
	`updated_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` varchar(50),
	`deleted_at` datetime,
	`deleted_by` varchar(50),
	CONSTRAINT `rol_id` PRIMARY KEY(`id`),
	CONSTRAINT `rol_clave_unique` UNIQUE(`clave`)
);
--> statement-breakpoint
CREATE TABLE `usuario_rol` (
	`idusuario` int NOT NULL,
	`idrol` int NOT NULL,
	`created_at` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `usuario_rol_pk` PRIMARY KEY(`idusuario`,`idrol`)
);
--> statement-breakpoint
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_idusuario_usuario_id_fk` FOREIGN KEY (`idusuario`) REFERENCES `usuario`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_idrol_rol_id_fk` FOREIGN KEY (`idrol`) REFERENCES `rol`(`id`) ON DELETE no action ON UPDATE no action;
