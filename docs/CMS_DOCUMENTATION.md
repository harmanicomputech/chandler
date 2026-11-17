# CMS Documentation (technical)

The CMS lives at `/admin` and manages both websites from one database.

## Content model registry
`src/lib/cms-registry.ts` declares every content type (pages, listings, events, articles, properties, districts, industries, reports, economic indicators): fields, field types, list columns, workflow, public URL builder and required permission. The list screen, edit form, validation/coercion, versioning and permissions are all generic and driven by this registry — adding a field to a type is a one-line change (plus a migration if it is a new column).

Field types: `text, textarea, richtext (sanitised), select, number, date, datetime (America/Phoenix), boolean, media (picker), tags, json (validated), url, email`.

## Workflow
`draft → in_review → published → archived`, plus `publish_at` (scheduled) and `expire_at` (auto-unpublish). Public queries only return records that are `published` **and** inside their window (`live()` in `src/lib/content.ts`).
* Users without `content.publish` (tourism/EDO staff) who press *Publish* are routed to `in_review`; editors/admins see them on the dashboard "Pending approval" list.
* Every update stores the previous row in `content_versions` (with author and optional change note). *Restore* brings a version back **as a draft**.
* Changing a page path automatically creates a 301 from the old path.
* Every save triggers on-demand revalidation so the public sites update immediately.

## Roles & permissions
| Permission | admin | editor | tourism_staff | edo_staff | stakeholder |
|---|---|---|---|---|---|
| content.edit | ✓ | ✓ | ✓ | ✓ | |
| content.publish | ✓ | ✓ | | | |
| content.delete | ✓ | | | | |
| properties.edit | ✓ | ✓ | | ✓ | |
| media.manage | ✓ | ✓ | ✓ | ✓ | |
| nav.manage / redirects.manage | ✓ | ✓ | | | |
| submissions.view / manage | ✓ | ✓ | ✓ | ✓ | |
| users.manage / settings.manage / audit.view | ✓ | | | | |
| stakeholder.propose | | | | | ✓ |

Non-admin roles are additionally scoped to their assigned site(s) (`users.sites`).

## Stakeholder (partner) workflow
1. Admin links a listing to a partner account (`owner_user_id`).
2. Partner signs in → **Partner portal** shows only their listings; they propose changes to description, contact details, hours, booking URL.
3. Proposal becomes a `listing_update` submission; nothing changes publicly.
4. Staff review in **Submissions** → *Approve & apply* (a version snapshot is saved first) or reject with a note.

Public submissions (events, partner listing requests) can be converted into **draft** records with one click; they still require an editor to publish.

## Media
Uploads are validated (type, ≤15 MB), re-encoded with sharp (EXIF/GPS stripped, max 2400 px), stored under `public/uploads/YYYY/MM/` (use object storage + CDN in production — see DEPLOYMENT_GUIDE). Alt text is mandatory. Each asset carries a **rights status** (`pending / approved / restricted`) and credit; migrated photography is `pending` until the City confirms reuse rights (IMAGE_PERMISSIONS.csv); files whose names mark them *do not share* were never migrated.

## Navigation, redirects, settings
* Navigation editor per site/menu (main, utility, footer, legal; EDO main) with ordering, nesting and visibility.
* Redirect register with loop/self prevention, hit counts and CSV export; consulted by every unknown public path before 404.
* Settings: per-site JSON settings, integration enable/disable and health, environment-variable presence (never values).

## Audit & analytics
`audit_logs` records sign-ins (and failures), every content create/update/delete/restore, media, navigation, redirect, user, setting and moderation action with user, IP and detail. The Analytics screen reports first-party recorded events only (no estimates).
