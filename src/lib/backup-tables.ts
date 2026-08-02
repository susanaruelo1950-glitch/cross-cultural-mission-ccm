/**
 * Shared, client-safe backup metadata.
 * Ordered so a restore can insert parents before children (FK-safe).
 */
export const BACKUP_TABLES = [
  "regions",
  "provinces",
  "phases",
  "areas",
  "profiles",
  "user_roles",
  "coordinator_assignments",
  "missionary_area_map",
  "missionary_extras",
  "missionary_photos",
  "ministry_updates",
  "thank_you_letters",
  "support_receipts",
  "prayer_requests_db",
  "prayer_events",
  "announcements",
  "partners",
  "scriptures",
  "documents",
  "content_versions",
  "activity_log",
  "backup_settings",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Storage buckets holding uploaded photos, letters, receipts and documents. */
export const BACKUP_BUCKETS = [
  "missionary-photos",
  "ministry-updates",
  "thank-you-letters",
  "support-receipts",
  "partner-logos",
  "documents",
] as const;

export type BackupBucket = (typeof BACKUP_BUCKETS)[number];

/** Primary key column per table (used by restore upserts). */
export const TABLE_PK: Record<string, string> = {
  missionary_area_map: "missionary_id",
  missionary_photos: "missionary_id",
  backup_settings: "id",
};

/** Largest single media file we push back through a restore call. */
export const MAX_RESTORE_FILE_BYTES = 8 * 1024 * 1024;
