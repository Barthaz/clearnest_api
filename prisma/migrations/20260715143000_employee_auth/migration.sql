-- Employee panel auth + migrate worker users to employees

-- Add auth fields to employees
ALTER TABLE `employees`
  ADD COLUMN `username` VARCHAR(100) NULL,
  ADD COLUMN `password_hash` VARCHAR(255) NULL,
  ADD COLUMN `panel_enabled` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `employees_username_key` ON `employees`(`username`);

-- Employee facility assignments (replaces user assignments for workers)
CREATE TABLE `employee_facility_assignments` (
  `employee_id` CHAR(36) NOT NULL,
  `facility_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`employee_id`, `facility_id`),
  CONSTRAINT `employee_facility_assignments_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `employee_facility_assignments_facility_id_fkey`
    FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing WORKER users linked to employees
UPDATE `employees` e
INNER JOIN `users` u ON u.`employee_id` = e.`id` AND u.`role` = 'WORKER'
SET
  e.`username` = u.`username`,
  e.`password_hash` = u.`password_hash`,
  e.`panel_enabled` = u.`is_active`;

INSERT INTO `employee_facility_assignments` (`employee_id`, `facility_id`)
SELECT u.`employee_id`, ufa.`facility_id`
FROM `user_facility_assignments` ufa
INNER JOIN `users` u ON u.`id` = ufa.`user_id`
WHERE u.`role` = 'WORKER' AND u.`employee_id` IS NOT NULL;

-- Remove worker users and legacy assignments
DELETE FROM `users` WHERE `role` = 'WORKER';

DROP TABLE `user_facility_assignments`;

ALTER TABLE `users` DROP FOREIGN KEY `users_employee_id_fkey`;
ALTER TABLE `users` DROP INDEX `users_employee_id_key`;
ALTER TABLE `users` DROP COLUMN `employee_id`;

ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'MANAGER') NOT NULL DEFAULT 'MANAGER';
