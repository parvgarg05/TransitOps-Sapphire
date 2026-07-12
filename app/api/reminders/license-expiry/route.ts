/**
 * License Expiry Reminder API - POST /api/reminders/license-expiry
 *
 * Computes the set of drivers whose license is within the reminder window
 * (30 days) — including licenses that are soon-to-expire as well as licenses
 * that recently expired but are still within the window — and "sends" a mock
 * email to the Safety Officer for each one.
 *
 * Requirement 13 (bonus): Email reminders for expiring driver licenses.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isLicenseExpired, isLicenseSoonToExpire } from "@/domain/license";
import { startOfDay, addDays } from "@/domain/types";
import { sendEmail } from "@/lib/mailer";

// Reminder window in days (matches isLicenseSoonToExpire's 30-day horizon).
const REMINDER_WINDOW_DAYS = 30;

// Recipient for license expiry reminders.
const SAFETY_OFFICER_EMAIL = "safetyofficer@transitops.com";

interface ReminderDriver {
  name: string;
  licenseNumber: string;
  licenseExpiryDate: string; // ISO date string
  daysUntilExpiry: number; // negative when already expired
}

/**
 * Whole-day difference between the license expiry date and today.
 * Positive when the license expires in the future, negative when expired.
 */
function daysUntilExpiry(licenseExpiryDate: Date, today: Date): number {
  const expiryStart = startOfDay(licenseExpiryDate).getTime();
  const todayStart = startOfDay(today).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((expiryStart - todayStart) / msPerDay);
}

/**
 * Determines whether a recently-expired license is still within the reminder
 * window (expired no more than REMINDER_WINDOW_DAYS ago).
 */
function isRecentlyExpiredWithinWindow(
  licenseExpiryDate: Date,
  today: Date
): boolean {
  if (!isLicenseExpired(licenseExpiryDate, today)) {
    return false;
  }
  const earliest = addDays(startOfDay(today), -REMINDER_WINDOW_DAYS);
  return startOfDay(licenseExpiryDate) >= earliest;
}

/**
 * POST /api/reminders/license-expiry
 *
 * @returns 200 OK with { sent, drivers }
 */
export async function POST() {
  try {
    const today = new Date();

    const allDrivers = await prisma.driver.findMany({
      orderBy: { licenseExpiryDate: "asc" },
    });

    // Drivers within the reminder window: soon-to-expire OR recently expired.
    const dueDrivers = allDrivers.filter((driver) => {
      const expiry = new Date(driver.licenseExpiryDate);
      return (
        isLicenseSoonToExpire(expiry, today) ||
        isRecentlyExpiredWithinWindow(expiry, today)
      );
    });

    // Empty case: nothing to send.
    if (dueDrivers.length === 0) {
      return NextResponse.json({ sent: 0, drivers: [] }, { status: 200 });
    }

    const reminderDrivers: ReminderDriver[] = [];

    for (const driver of dueDrivers) {
      const expiry = new Date(driver.licenseExpiryDate);
      const remaining = daysUntilExpiry(expiry, today);
      const expiryIso = expiry.toISOString();

      const status =
        remaining < 0
          ? `expired ${Math.abs(remaining)} day(s) ago`
          : remaining === 0
          ? "expires today"
          : `expires in ${remaining} day(s)`;

      await sendEmail({
        to: SAFETY_OFFICER_EMAIL,
        subject: `License expiry reminder: ${driver.name}`,
        body: [
          `Driver: ${driver.name}`,
          `License Number: ${driver.licenseNumber}`,
          `License Expiry Date: ${expiryIso}`,
          `Status: ${status}`,
        ].join("\n"),
      });

      reminderDrivers.push({
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: expiryIso,
        daysUntilExpiry: remaining,
      });
    }

    return NextResponse.json(
      { sent: reminderDrivers.length, drivers: reminderDrivers },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send license expiry reminders" },
      { status: 500 }
    );
  }
}
