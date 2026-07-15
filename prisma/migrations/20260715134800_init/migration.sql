-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'WORKER') NOT NULL DEFAULT 'WORKER',
    `employee_id` CHAR(36) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_employee_id_key`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_facility_assignments` (
    `user_id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,

    PRIMARY KEY (`user_id`, `facility_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facilities` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `area_m2` DECIMAL(10, 2) NOT NULL,
    `cleaning_days` JSON NOT NULL,
    `visits_per_week` INTEGER NOT NULL,
    `hours_per_visit` DECIMAL(5, 2) NOT NULL,
    `start_time` VARCHAR(5) NOT NULL DEFAULT '08:00',
    `monthly_rate_gross` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `hourly_rate_gross` DECIMAL(10, 2) NOT NULL,
    `employment_form` ENUM('zlecenie', 'etat') NOT NULL DEFAULT 'zlecenie',
    `ulga_mlodych` BOOLEAN NOT NULL DEFAULT false,
    `student` BOOLEAN NOT NULL DEFAULT false,
    `inny_tytul` BOOLEAN NOT NULL DEFAULT false,
    `dobrowolne_chorobowe` BOOLEAN NOT NULL DEFAULT false,
    `fp_exempt` BOOLEAN NOT NULL DEFAULT false,
    `kup_podwyzszone` BOOLEAN NOT NULL DEFAULT false,
    `pit2` BOOLEAN NOT NULL DEFAULT true,
    `wymiar_etatu` DECIMAL(4, 2) NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NULL,
    `shift_date` DATE NOT NULL,
    `hours` DECIMAL(5, 2) NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `status` ENUM('scheduled', 'unassigned', 'saved') NOT NULL DEFAULT 'unassigned',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shifts_shift_date_idx`(`shift_date`),
    INDEX `shifts_employee_id_shift_date_idx`(`employee_id`, `shift_date`),
    UNIQUE INDEX `shifts_facility_id_shift_date_key`(`facility_id`, `shift_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_holidays` (
    `holiday_date` DATE NOT NULL,
    `name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`holiday_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facility_skip_days` (
    `skip_date` DATE NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facility_skip_days_skip_date_facility_id_idx`(`skip_date`, `facility_id`),
    PRIMARY KEY (`skip_date`, `facility_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `vat_status` ENUM('active', 'exempt') NOT NULL DEFAULT 'exempt',
    `vat_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.23,
    `zus_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 1519.19,
    `zus_type` ENUM('preferencyjny', 'standardowy', 'maly') NOT NULL DEFAULT 'standardowy',
    `health_contribution_mode` ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
    `health_contribution_manual_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 432.54,
    `health_rate_override_enabled` BOOLEAN NOT NULL DEFAULT false,
    `health_rate_override` DECIMAL(5, 4) NOT NULL DEFAULT 0.09,
    `tax_form` ENUM('ryczalt', 'skala', 'liniowy') NOT NULL DEFAULT 'ryczalt',
    `ryczalt_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.085,
    `additional_costs` DECIMAL(10, 2) NOT NULL DEFAULT 500,
    `vat_exemption_threshold` DECIMAL(12, 2) NOT NULL DEFAULT 200000,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_facility_assignments` ADD CONSTRAINT `user_facility_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_facility_assignments` ADD CONSTRAINT `user_facility_assignments_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facility_skip_days` ADD CONSTRAINT `facility_skip_days_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
