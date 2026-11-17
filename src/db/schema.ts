/**
 * Shared data model for the Chandler digital ecosystem.
 *
 * One PostgreSQL database serves both public sites (Visit Chandler = "visit",
 * Chandler Economic Development = "edo") plus the shared CMS/admin. Content that
 * belongs to one site carries a `site` column; truly shared records (media,
 * users, redirects, audit log) are site-aware but live in common tables.
 *
 * Every publishable record follows the same editorial workflow:
 *   draft -> in_review -> published -> archived   (scheduled via publishAt / expireAt)
 * and keeps provenance (`sourceUrl`, `sourceId`) back to the legacy system it was
 * migrated from, so nothing is "invented" — every row traces to an origin.
 */
import {
  pgTable, pgEnum, serial, integer, text, varchar, boolean, timestamp, jsonb,
  doublePrecision, uniqueIndex, index, primaryKey, date, numeric,
} from 'drizzle-orm/pg-core';

export const siteEnum = pgEnum('site', ['visit', 'edo']);
export const statusEnum = pgEnum('content_status', ['draft', 'in_review', 'published', 'archived']);
export const roleEnum = pgEnum('role', ['admin', 'editor', 'tourism_staff', 'edo_staff', 'stakeholder']);
export const listingTypeEnum = pgEnum('listing_type', [
  'hotel', 'restaurant', 'attraction', 'shopping', 'park', 'trail', 'venue', 'nightlife', 'golf',
  'arts', 'services', 'recreation', 'other',
]);
export const propertyTypeEnum = pgEnum('property_type', ['office', 'industrial', 'retail', 'commercial', 'land', 'development']);
export const submissionTypeEnum = pgEnum('submission_type', [
  'event', 'listing_update', 'partner', 'meeting_rfp', 'wedding', 'contact', 'visitor_guide',
  'investor', 'property_enquiry', 'business_enquiry', 'site_selection', 'lets_talk_business',
]);
export const submissionStatusEnum = pgEnum('submission_status', ['new', 'in_progress', 'approved', 'rejected', 'closed']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};
const workflow = {
  status: statusEnum('status').default('draft').notNull(),
  publishAt: timestamp('publish_at', { withTimezone: true }),
  expireAt: timestamp('expire_at', { withTimezone: true }),
  sourceUrl: text('source_url'),
  sourceId: varchar('source_id', { length: 255 }),
};
const seo = {
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  ogImage: text('og_image'),
  noindex: boolean('noindex').default(false).notNull(),
};

/* ───────────── Identity & access ───────────── */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  /** Which sites this user may publish to (admins: both). */
  sites: jsonb('sites').$type<('visit' | 'edo')[]>().default(['visit']).notNull(),
  organisation: text('organisation'),
  active: boolean('active').default(true).notNull(),
  failedLogins: integer('failed_logins').default(0).notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const sessions = pgTable('sessions', {
  /** SHA-256 of the opaque cookie token — raw tokens are never stored. */
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  csrfToken: varchar('csrf_token', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

/* ───────────── Media library (shared) ───────────── */
export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  site: siteEnum('site'), // null = shared across both sites
  url: text('url').notNull(), // local /images/... path or approved remote URL
  sourceUrl: text('source_url'),
  alt: text('alt').default('').notNull(),
  caption: text('caption'),
  credit: text('credit'),
  width: integer('width'),
  height: integer('height'),
  format: varchar('format', { length: 16 }),
  folder: varchar('folder', { length: 64 }),
  /** pending | approved | restricted — City must confirm reuse rights before launch. */
  permission: varchar('permission', { length: 24 }).default('pending').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  ...timestamps,
}, (t) => [uniqueIndex('media_url_uq').on(t.url), index('media_folder_idx').on(t.folder)]);

/* ───────────── Pages & navigation ───────────── */
export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  path: text('path').notNull(), // e.g. /plan-your-visit/weather/
  title: text('title').notNull(),
  template: varchar('template', { length: 48 }).default('standard').notNull(),
  section: varchar('section', { length: 64 }),
  summary: text('summary'),
  bodyHtml: text('body_html').default('').notNull(),
  heroMediaId: integer('hero_media_id').references(() => media.id),
  /** Structured blocks (cards, CTAs, embedded listing queries) migrated from the legacy page. */
  blocks: jsonb('blocks').$type<unknown[]>().default([]).notNull(),
  ...seo,
  ...workflow,
  updatedBy: integer('updated_by').references(() => users.id),
  ...timestamps,
}, (t) => [uniqueIndex('pages_site_path_uq').on(t.site, t.path), index('pages_section_idx').on(t.site, t.section)]);

/** Immutable snapshots for version history / rollback of any content type. */
export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  entity: varchar('entity', { length: 32 }).notNull(),
  entityId: integer('entity_id').notNull(),
  version: integer('version').notNull(),
  data: jsonb('data').notNull(),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('content_versions_uq').on(t.entity, t.entityId, t.version)]);

export const navItems = pgTable('nav_items', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  menu: varchar('menu', { length: 24 }).notNull(), // main | utility | footer
  parentId: integer('parent_id'),
  label: text('label').notNull(),
  href: text('href').notNull(),
  sort: integer('sort').default(0).notNull(),
  visible: boolean('visible').default(true).notNull(),
}, (t) => [index('nav_site_menu_idx').on(t.site, t.menu)]);

/* ───────────── Tourism directory ───────────── */
export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  type: listingTypeEnum('type').notNull(),
  category: text('category'), // legacy CRM category e.g. "Dining"
  subcategory: text('subcategory'), // e.g. "Mexican"
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  descriptionHtml: text('description_html').default('').notNull(),
  address: text('address'),
  city: text('city'),
  state: varchar('state', { length: 8 }).default('AZ'),
  zip: varchar('zip', { length: 12 }),
  region: text('region'), // e.g. "Downtown Chandler"
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  bookingUrl: text('booking_url'),
  social: jsonb('social').$type<{ service: string; url: string }[]>().default([]).notNull(),
  amenities: jsonb('amenities').$type<string[]>().default([]).notNull(),
  hours: text('hours'),
  primaryMediaId: integer('primary_media_id').references(() => media.id),
  ownerUserId: integer('owner_user_id').references(() => users.id), // stakeholder who may propose edits
  ...seo,
  ...workflow,
  ...timestamps,
}, (t) => [
  uniqueIndex('listings_source_uq').on(t.sourceId),
  index('listings_type_idx').on(t.type, t.status),
  index('listings_geo_idx').on(t.latitude, t.longitude),
]);

export const listingMedia = pgTable('listing_media', {
  listingId: integer('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  sort: integer('sort').default(0).notNull(),
}, (t) => [primaryKey({ columns: [t.listingId, t.mediaId] })]);

/** Events serve both sites (tourism festivals, EDO business events). */
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').default('visit').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  descriptionHtml: text('description_html').default('').notNull(),
  categories: jsonb('categories').$type<string[]>().default([]).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  timesText: text('times_text'),
  recurrenceText: text('recurrence_text'),
  locationName: text('location_name'),
  address: text('address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  admission: text('admission'),
  website: text('website'),
  hostName: text('host_name'),
  contactEmail: text('contact_email'),
  listingId: integer('listing_id').references(() => listings.id),
  primaryMediaId: integer('primary_media_id').references(() => media.id),
  ...seo,
  ...workflow,
  ...timestamps,
}, (t) => [uniqueIndex('events_source_uq').on(t.site, t.sourceId), index('events_dates_idx').on(t.startDate, t.endDate)]);

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').default('visit').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  bodyHtml: text('body_html').default('').notNull(),
  author: text('author'),
  categories: jsonb('categories').$type<string[]>().default([]).notNull(),
  publishedOn: date('published_on'),
  heroMediaId: integer('hero_media_id').references(() => media.id),
  ...seo,
  ...workflow,
  ...timestamps,
}, (t) => [uniqueIndex('articles_site_slug_uq').on(t.site, t.slug)]);

/* ───────────── Economic development ───────────── */
export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  summary: text('summary'),
  bodyHtml: text('body_html').default('').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  heroMediaId: integer('hero_media_id').references(() => media.id),
  ...workflow,
  ...timestamps,
}, (t) => [uniqueIndex('districts_slug_uq').on(t.slug)]);

export const industries = pgTable('industries', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  summary: text('summary'),
  bodyHtml: text('body_html').default('').notNull(),
  employers: jsonb('employers').$type<string[]>().default([]).notNull(),
  heroMediaId: integer('hero_media_id').references(() => media.id),
  ...workflow,
  ...timestamps,
}, (t) => [uniqueIndex('industries_slug_uq').on(t.slug)]);

export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  type: propertyTypeEnum('type').notNull(),
  address: text('address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  districtId: integer('district_id').references(() => districts.id),
  availableSqft: integer('available_sqft'),
  totalSqft: integer('total_sqft'),
  acreage: numeric('acreage', { precision: 10, scale: 2 }),
  zoning: text('zoning'),
  zoningVerified: boolean('zoning_verified').default(false).notNull(),
  availability: varchar('availability', { length: 24 }).default('available').notNull(),
  description: text('description'),
  documents: jsonb('documents').$type<{ label: string; url: string }[]>().default([]).notNull(),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  primaryMediaId: integer('primary_media_id').references(() => media.id),
  /** true = clearly-labelled development fixture, never presented as a real listing. */
  isFixture: boolean('is_fixture').default(false).notNull(),
  ...workflow,
  ...timestamps,
}, (t) => [uniqueIndex('properties_slug_uq').on(t.slug), index('properties_type_idx').on(t.type, t.status)]);

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  fileUrl: text('file_url').notNull(),
  category: text('category'),
  publishedOn: date('published_on'),
  ...workflow,
  ...timestamps,
});

/** Every number shown on the EDO data portal must cite a source and an as-of date. */
export const economicIndicators = pgTable('economic_indicators', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 64 }).notNull(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  numericValue: doublePrecision('numeric_value'),
  unit: text('unit'),
  category: text('category'),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  asOf: text('as_of'),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('econ_ind_key_uq').on(t.key)]);

export const staffProfiles = pgTable('staff_profiles', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').default('edo').notNull(),
  name: text('name').notNull(),
  title: text('title'),
  email: text('email'),
  phone: text('phone'),
  focus: text('focus'),
  sort: integer('sort').default(0).notNull(),
  sourceUrl: text('source_url'),
  ...timestamps,
});

/* ───────────── Submissions, enquiries & stakeholder workflow ───────────── */
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  type: submissionTypeEnum('type').notNull(),
  status: submissionStatusEnum('status').default('new').notNull(),
  name: text('name'),
  email: text('email'),
  organisation: text('organisation'),
  subject: text('subject'),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  /** Optional target record (e.g. property enquired about, listing being updated). */
  entity: varchar('entity', { length: 32 }),
  entityId: integer('entity_id'),
  submittedBy: integer('submitted_by').references(() => users.id),
  assignedTo: integer('assigned_to').references(() => users.id),
  notes: jsonb('notes').$type<{ at: string; by: string; text: string }[]>().default([]).notNull(),
  crmSyncStatus: varchar('crm_sync_status', { length: 24 }).default('pending').notNull(),
  ip: text('ip'),
  ...timestamps,
}, (t) => [index('submissions_type_status_idx').on(t.site, t.type, t.status)]);

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: text('first_name'),
  interests: jsonb('interests').$type<string[]>().default([]).notNull(),
  consentAt: timestamp('consent_at', { withTimezone: true }).defaultNow().notNull(),
  syncStatus: varchar('sync_status', { length: 24 }).default('pending').notNull(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('newsletter_site_email_uq').on(t.site, t.email)]);

/* ───────────── Visitor tools ───────────── */
export const itineraries = pgTable('itineraries', {
  id: serial('id').primaryKey(),
  shareToken: varchar('share_token', { length: 24 }).notNull(),
  editToken: varchar('edit_token', { length: 64 }).notNull(), // hashed; owner edits without an account
  title: text('title').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  interests: jsonb('interests').$type<string[]>().default([]).notNull(),
  /** [{ day: 1, items: [{ kind: 'listing'|'event', id, note }] }] */
  days: jsonb('days').$type<{ day: number; items: { kind: 'listing' | 'event'; id: number; note?: string }[] }[]>().default([]).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('itineraries_share_uq').on(t.shareToken)]);

export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').default('visit').notNull(),
  shareToken: varchar('share_token', { length: 24 }).notNull(),
  title: text('title').notNull(),
  items: jsonb('items').$type<{ kind: string; id: number }[]>().default([]).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('collections_share_uq').on(t.shareToken)]);

/* ───────────── Platform ───────────── */
export const redirects = pgTable('redirects', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').default(301).notNull(),
  hits: integer('hits').default(0).notNull(),
  note: text('note'),
  ...timestamps,
}, (t) => [uniqueIndex('redirects_site_from_uq').on(t.site, t.fromPath)]);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 48 }).notNull(),
  entity: varchar('entity', { length: 32 }),
  entityId: integer('entity_id'),
  site: siteEnum('site'),
  detail: jsonb('detail').$type<Record<string, unknown>>().default({}).notNull(),
  ip: text('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('audit_created_idx').on(t.createdAt), index('audit_entity_idx').on(t.entity, t.entityId)]);

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  site: siteEnum('site').notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  path: text('path'),
  entity: varchar('entity', { length: 32 }),
  entityId: integer('entity_id'),
  props: jsonb('props').$type<Record<string, unknown>>().default({}).notNull(),
  sessionHash: varchar('session_hash', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('analytics_name_idx').on(t.site, t.name, t.createdAt)]);

export const integrations = pgTable('integrations', {
  key: varchar('key', { length: 48 }).primaryKey(),
  label: text('label').notNull(),
  site: siteEnum('site'),
  enabled: boolean('enabled').default(false).notNull(),
  /** Non-secret configuration only. Secrets live in environment variables. */
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  lastStatus: varchar('last_status', { length: 24 }).default('unknown').notNull(),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastError: text('last_error'),
  ...timestamps,
});

export const settings = pgTable('settings', {
  site: siteEnum('site').notNull(),
  key: varchar('key', { length: 64 }).notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.site, t.key] })]);

/** Simple fixed-window rate limiter backing store (works across server instances). */
export const rateLimits = pgTable('rate_limits', {
  key: varchar('key', { length: 128 }).primaryKey(),
  count: integer('count').default(0).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
});

/** Server-side cache for third-party API responses (weather etc). */
export const apiCache = pgTable('api_cache', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: jsonb('value').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
