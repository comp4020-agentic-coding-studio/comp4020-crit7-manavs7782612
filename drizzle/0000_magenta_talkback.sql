CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`permit_type_id` integer NOT NULL,
	`applicant_name` text NOT NULL,
	`applicant_email` text NOT NULL,
	`applicant_id` text NOT NULL,
	`eligibility_confirmed` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `applications_permit_type_idx` ON `applications` (`permit_type_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`method` text DEFAULT 'mock-card' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_application_idx` ON `payments` (`application_id`);--> statement-breakpoint
CREATE TABLE `permit_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`audience` text NOT NULL,
	`description` text NOT NULL,
	`eligibility_criteria` text NOT NULL,
	`required_documents` text NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permit_types_slug_idx` ON `permit_types` (`slug`);