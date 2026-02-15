-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 10, 2026 at 04:01 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kbc_office`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `payroll_period_id` int(11) DEFAULT NULL,
  `date` varchar(20) DEFAULT NULL,
  `day_index` int(11) DEFAULT NULL,
  `time_in` varchar(20) DEFAULT NULL,
  `time_out` varchar(20) DEFAULT NULL,
  `working_hours` decimal(4,1) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` enum('present','absent','partial','fixed') DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `employee_id`, `payroll_period_id`, `date`, `day_index`, `time_in`, `time_out`, `working_hours`, `amount`, `status`, `is_approved`, `approved_at`, `created_at`, `updated_at`) VALUES
(73, 20, 3, '05-Feb-2026', 5, '01:19 PM', '01:19 PM', NULL, NULL, 'present', 0, NULL, '2026-02-05 05:19:44', '2026-02-05 05:19:55');

--
-- Triggers `attendance`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance_records`
--

CREATE TABLE `attendance_records` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `payroll_period_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `day_index` int(2) NOT NULL,
  `status` varchar(20) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `is_weekend` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_records`
--

INSERT INTO `attendance_records` (`id`, `employee_id`, `payroll_period_id`, `date`, `day_index`, `status`, `amount`, `is_weekend`, `created_by`, `updated_at`, `created_at`) VALUES
(175, 20, 3, '0202-02-04', 4, 'present', 0.00, 0, NULL, '2026-02-04 07:51:57', '2026-02-04 07:51:57');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department` enum('OFFICE','DRIVER','WAREHOUSE','SECURITY & CUSTODIAN','FARM') NOT NULL,
  `position` varchar(100) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `rate_type` enum('daily','fixed') NOT NULL DEFAULT 'daily',
  `daily_rate` decimal(10,2) DEFAULT NULL,
  `fixed_rate` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `employee_id`, `name`, `department`, `position`, `password`, `rate_type`, `daily_rate`, `fixed_rate`, `created_at`, `updated_at`, `is_active`) VALUES
(19, 'EMP-001', 'MJ', 'OFFICE', 'Information Technology', '$2b$10$1B4q5UxDO8e2E45n5GgVeeyKW8/8T6poSFRnHaxiV1j/ZItySEJiW', 'daily', 833.00, NULL, '2026-01-26 10:50:32', '2026-01-26 10:50:32', 1),
(20, 'EMP-002', 'Anne', 'OFFICE', 'Human Resource', '$2b$10$/4lMffOOEl4CTIDUybVOpeQADl6tpDbiJeGXek1XtKO2jRtYAv85O', 'daily', 500.00, NULL, '2026-01-27 05:14:26', '2026-01-27 05:14:26', 1),
(21, 'EMP-003', 'Lester', 'OFFICE', 'Accounting Head', '$2b$10$sl5k7mAdHZk.xTFTCL846.TflA6iAzrbL4qisAMawl4dRAlz.7/Rq', 'fixed', NULL, 10000.00, '2026-01-28 02:41:51', '2026-01-28 02:41:51', 1),
(22, 'EMP-004', 'pjtejada', 'OFFICE', 'Marketing', '$2b$10$nMmcHpr1N4JPwlIoCNWrVOoJVzCbYfTrGzapo7VQqNQRNeDV3M2O6', 'daily', 535.00, NULL, '2026-01-31 05:35:03', '2026-01-31 05:35:03', 1);

-- --------------------------------------------------------

--
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `employee_name` varchar(100) NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL,
  `allowances` decimal(10,2) DEFAULT 0.00,
  `deductions` decimal(10,2) DEFAULT 0.00,
  `net_salary` decimal(10,2) NOT NULL,
  `month_year` date NOT NULL,
  `status` enum('pending','processed','paid') DEFAULT 'pending',
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_periods`
--

CREATE TABLE `payroll_periods` (
  `id` int(11) NOT NULL,
  `year` int(4) NOT NULL,
  `month` varchar(20) NOT NULL,
  `start_day` int(2) NOT NULL,
  `end_day` int(2) NOT NULL,
  `period_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll_periods`
--

INSERT INTO `payroll_periods` (`id`, `year`, `month`, `start_day`, `end_day`, `period_name`, `created_at`) VALUES
(1, 2026, 'January', 1, 15, 'January 1-15', '2026-01-22 08:14:35'),
(2, 2026, 'January', 16, 31, 'January 16-31', '2026-01-22 08:14:35'),
(3, 2026, 'February', 1, 15, 'February 1-15', '2026-01-22 08:14:35'),
(4, 2026, 'February', 16, 29, 'February 16-29', '2026-01-22 08:14:35'),
(5, 2026, 'March', 1, 15, 'March 1-15', '2026-01-22 08:14:35'),
(6, 2026, 'March', 16, 31, 'March 16-31', '2026-01-22 08:14:35'),
(7, 2026, 'April', 1, 15, 'April 1-15', '2026-01-22 08:14:35'),
(8, 2026, 'April', 16, 30, 'April 16-30', '2026-01-22 08:14:35'),
(9, 2026, 'May', 1, 15, 'May 1-15', '2026-01-22 08:14:35'),
(10, 2026, 'May', 16, 31, 'May 16-31', '2026-01-22 08:14:35'),
(11, 2026, 'June', 1, 15, 'June 1-15', '2026-01-22 08:14:35'),
(12, 2026, 'June', 16, 30, 'June 16-30', '2026-01-22 08:14:35'),
(13, 2026, 'July', 1, 15, 'July 1-15', '2026-01-22 08:14:35'),
(14, 2026, 'July', 16, 31, 'July 16-31', '2026-01-22 08:14:35'),
(15, 2026, 'August', 1, 15, 'August 1-15', '2026-01-22 08:14:35'),
(16, 2026, 'August', 16, 31, 'August 16-31', '2026-01-22 08:14:35'),
(17, 2026, 'September', 1, 15, 'September 1-15', '2026-01-22 08:14:35'),
(18, 2026, 'September', 16, 30, 'September 16-30', '2026-01-22 08:14:35'),
(19, 2026, 'October', 1, 15, 'October 1-15', '2026-01-22 08:14:35'),
(20, 2026, 'October', 16, 31, 'October 16-31', '2026-01-22 08:14:35'),
(21, 2026, 'November', 1, 15, 'November 1-15', '2026-01-22 08:14:35'),
(22, 2026, 'November', 16, 30, 'November 16-30', '2026-01-22 08:14:35'),
(23, 2026, 'December', 1, 15, 'December 1-15', '2026-01-22 08:14:35'),
(24, 2026, 'December', 16, 31, 'December 16-31', '2026-01-22 08:14:35');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_summary`
--

CREATE TABLE `payroll_summary` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `payroll_period_id` int(11) DEFAULT NULL,
  `day_index` int(11) DEFAULT NULL,
  `date` varchar(10) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` enum('present','absent','partial','fixed','no_out','no_in') DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `petty_cash`
--

CREATE TABLE `petty_cash` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `date` date NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `timesheets`
--

CREATE TABLE `timesheets` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `employee_name` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `hours_worked` decimal(4,2) NOT NULL,
  `overtime_hours` decimal(4,2) DEFAULT 0.00,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','payroll','pettycash') DEFAULT 'payroll',
  `full_name` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `full_name`, `department`, `created_at`, `updated_at`, `is_active`) VALUES
(1, 'admin', 'admin@kbc-office.com', 'admin123', 'admin', 'Administrator', 'Management', '2026-01-21 03:54:54', '2026-01-21 03:54:54', 1),
(2, 'payroll', 'payroll@kbc-office.com', 'payroll123', 'payroll', 'Payroll Manager', 'Finance', '2026-01-21 03:54:54', '2026-01-21 04:47:50', 0),
(3, 'pettycash', 'pettycash@kbc-office.com', 'petty123', 'pettycash', 'Petty Cash Handler', 'Finance', '2026-01-21 03:54:54', '2026-01-21 04:47:53', 0),
(4, 'anne', 'anne44@payroll.com', 'anne123', 'payroll', 'Rechelle Anne Padua', 'Accounting', '2026-01-21 04:44:48', '2026-01-21 04:44:48', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`employee_id`,`payroll_period_id`,`date`),
  ADD KEY `payroll_period_id` (`payroll_period_id`);

--
-- Indexes for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`employee_id`,`payroll_period_id`,`date`),
  ADD KEY `fk_attendance_period` (`payroll_period_id`),
  ADD KEY `fk_attendance_employee` (`employee_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`);

--
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`id`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `idx_month_year` (`month_year`);

--
-- Indexes for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_period` (`year`,`month`,`start_day`,`end_day`);

--
-- Indexes for table `payroll_summary`
--
ALTER TABLE `payroll_summary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_payroll_day` (`employee_id`,`payroll_period_id`,`day_index`),
  ADD KEY `payroll_period_id` (`payroll_period_id`);

--
-- Indexes for table `petty_cash`
--
ALTER TABLE `petty_cash`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_employee_date` (`employee_id`,`date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `attendance_records`
--
ALTER TABLE `attendance_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=177;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `payroll_summary`
--
ALTER TABLE `payroll_summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `petty_cash`
--
ALTER TABLE `petty_cash`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timesheets`
--
ALTER TABLE `timesheets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`);

--
-- Constraints for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_attendance_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `payroll_summary`
--
ALTER TABLE `payroll_summary`
  ADD CONSTRAINT `payroll_summary_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  ADD CONSTRAINT `payroll_summary_ibfk_2` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`);

--
-- Constraints for table `petty_cash`
--
ALTER TABLE `petty_cash`
  ADD CONSTRAINT `petty_cash_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD CONSTRAINT `timesheets_ibfk_1` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
