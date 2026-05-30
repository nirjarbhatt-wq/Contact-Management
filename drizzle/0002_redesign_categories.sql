CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('vendor','client','consultant') NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subcategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `client_subcategories`;--> statement-breakpoint
DROP TABLE `clients`;--> statement-breakpoint
DROP TABLE `consultants`;--> statement-breakpoint
DROP TABLE `vendor_subcategories`;--> statement-breakpoint
DROP TABLE `vendors`;--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_vendorId_vendors_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_vendorSubcategoryId_vendor_subcategories_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_clientId_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_clientSubcategoryId_client_subcategories_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_consultantId_consultants_id_fk`;
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('upload','edit','delete','create_subcategory','delete_subcategory') NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `vendorCategoryId` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `clientCategoryId` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `consultantCategoryId` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `consultantSubcategoryId` int;--> statement-breakpoint
ALTER TABLE `subcategories` ADD CONSTRAINT `subcategories_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_vendorCategoryId_categories_id_fk` FOREIGN KEY (`vendorCategoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_vendorSubcategoryId_subcategories_id_fk` FOREIGN KEY (`vendorSubcategoryId`) REFERENCES `subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_clientCategoryId_categories_id_fk` FOREIGN KEY (`clientCategoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_clientSubcategoryId_subcategories_id_fk` FOREIGN KEY (`clientSubcategoryId`) REFERENCES `subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_consultantCategoryId_categories_id_fk` FOREIGN KEY (`consultantCategoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_consultantSubcategoryId_subcategories_id_fk` FOREIGN KEY (`consultantSubcategoryId`) REFERENCES `subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `vendorId`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `clientId`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `consultantId`;