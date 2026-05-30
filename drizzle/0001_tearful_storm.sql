CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('upload','edit','delete','create_vendor','create_client','create_consultant','create_subcategory') NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_subcategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `consultants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultants_id` PRIMARY KEY(`id`),
	CONSTRAINT `consultants_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `contact_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_sources_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`displayName` varchar(256) NOT NULL,
	`phoneNumbers` text,
	`emails` text,
	`regionId` int,
	`vendorId` int,
	`vendorSubcategoryId` int,
	`clientId` int,
	`clientSubcategoryId` int,
	`consultantId` int,
	`contactSourceId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` enum('international','indian_state','union_territory') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `vendor_subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_subcategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendors_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_subcategories` ADD CONSTRAINT `client_subcategories_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_vendorSubcategoryId_vendor_subcategories_id_fk` FOREIGN KEY (`vendorSubcategoryId`) REFERENCES `vendor_subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_clientSubcategoryId_client_subcategories_id_fk` FOREIGN KEY (`clientSubcategoryId`) REFERENCES `client_subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_consultantId_consultants_id_fk` FOREIGN KEY (`consultantId`) REFERENCES `consultants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_contactSourceId_contact_sources_id_fk` FOREIGN KEY (`contactSourceId`) REFERENCES `contact_sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_subcategories` ADD CONSTRAINT `vendor_subcategories_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;