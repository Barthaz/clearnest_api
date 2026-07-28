-- CreateTable
CREATE TABLE `facility_contracts` (
    `id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `monthly_rate_gross` DECIMAL(12, 2) NOT NULL,
    `hours_per_visit` DECIMAL(5, 2) NOT NULL,
    `start_time` VARCHAR(5) NOT NULL DEFAULT '08:00',
    `end_time` VARCHAR(5) NOT NULL,
    `cleaning_days` JSON NOT NULL,
    `visits_per_week` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `facility_contracts_facility_id_start_date_idx`(`facility_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill contracts from existing facility data
INSERT INTO `facility_contracts` (
    `id`,
    `facility_id`,
    `start_date`,
    `end_date`,
    `monthly_rate_gross`,
    `hours_per_visit`,
    `start_time`,
    `end_time`,
    `cleaning_days`,
    `visits_per_week`,
    `created_at`,
    `updated_at`
)
SELECT
    UUID(),
    f.`id`,
    DATE(COALESCE(f.`created_at`, NOW())),
    NULL,
    f.`monthly_rate_gross`,
    f.`hours_per_visit`,
    f.`start_time`,
    TIME_FORMAT(
        ADDTIME(
            STR_TO_DATE(CONCAT('1970-01-01 ', f.`start_time`), '%Y-%m-%d %H:%i'),
            SEC_TO_TIME(ROUND(f.`hours_per_visit` * 3600))
        ),
        '%H:%i'
    ),
    f.`cleaning_days`,
    f.`visits_per_week`,
    f.`created_at`,
    f.`updated_at`
FROM `facilities` f;

-- Drop contract columns from facilities
ALTER TABLE `facilities`
    DROP COLUMN `cleaning_days`,
    DROP COLUMN `visits_per_week`,
    DROP COLUMN `hours_per_visit`,
    DROP COLUMN `start_time`,
    DROP COLUMN `monthly_rate_gross`;

-- AddForeignKey
ALTER TABLE `facility_contracts` ADD CONSTRAINT `facility_contracts_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
