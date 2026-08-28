import cron from 'node-cron';
import { query } from '../db.js';

export async function checkBillingReminders() {
  console.log('[Billing Reminder] Starting billing reminder checks...');
  try {
    // Query active organizations that have term_expires_at set
    const orgsRes = await query(
      `SELECT id, name, term_expires_at, creator_email 
       FROM organizations 
       WHERE subscription_status = 'active' AND term_expires_at IS NOT NULL`
    );

    const now = new Date();
    const results = [];

    for (const org of orgsRes.rows) {
      const expiresAt = new Date(org.term_expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();
      // Calculate days remaining. Math.ceil is used so that any time inside the 7th, 3rd, or 1st day 
      // before expiration triggers the corresponding reminder.
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        const reminderType = `${diffDays}day`;

        // Check if reminder was already sent
        const alreadySent = await query(
          'SELECT 1 FROM billing_reminders_sent WHERE organization_id = $1 AND reminder_type = $2',
          [org.id, reminderType]
        );

        if (alreadySent.rows.length === 0) {
          // Record the reminder as sent
          await query(
            'INSERT INTO billing_reminders_sent (organization_id, reminder_type) VALUES ($1, $2)',
            [org.id, reminderType]
          );

          console.log(
            `[Billing Reminder] Triggered ${reminderType} reminder for organization "${org.name}" (ID: ${org.id}, Creator: ${org.creator_email || 'N/A'}). Expiry: ${org.term_expires_at}`
          );

          results.push({
            organizationId: org.id,
            name: org.name,
            email: org.creator_email,
            reminderType,
            expiresAt: org.term_expires_at,
            status: 'logged'
          });
        } else {
          console.log(
            `[Billing Reminder] Skip sending ${reminderType} reminder for organization "${org.name}" (already logged)`
          );
        }
      }
    }
    
    console.log(`[Billing Reminder] Check complete. Triggered ${results.length} new reminder(s).`);
    return results;
  } catch (err) {
    console.error('[Billing Reminder] Error running billing reminders:', err);
    throw err;
  }
}

export function startBillingReminderCron() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    checkBillingReminders().catch(err => {
      console.error('[Billing Scheduler] Cron execution failed:', err);
    });
  });
  console.log('[Billing Scheduler] Daily reminder cron registered (0 0 * * *).');
}
