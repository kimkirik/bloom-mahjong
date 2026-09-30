CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`stage` integer NOT NULL,
	`matched` integer NOT NULL,
	`elapsed` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scores_ranking` ON `scores` (`score`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`seed` integer NOT NULL,
	`created_at` integer NOT NULL
);
