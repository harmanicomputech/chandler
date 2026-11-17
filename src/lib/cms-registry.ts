import { schema } from '@/db';

/**
 * CMS content-type registry. One declarative definition per content type drives the admin list view,
 * the edit form, validation, versioning, publishing workflow and permissions. Adding a field here is all
 * an editor-facing change needs.
 */
export type FieldType = 'text' | 'textarea' | 'richtext' | 'select' | 'number' | 'date' | 'datetime' | 'boolean' | 'media' | 'tags' | 'json' | 'url' | 'email';
export type Field = { name: string; label: string; type: FieldType; required?: boolean; options?: readonly string[]; help?: string; group?: 'main' | 'side' | 'seo' };
export type ContentType = {
  key: string; label: string; plural: string; site: 'visit' | 'edo' | 'both'; table: any; titleField: string; listColumns: string[];
  fields: Field[]; workflow: boolean; publicUrl?: (row: any) => string | null; permission: 'content.edit' | 'properties.edit';
};

const seo: Field[] = [
  { name: 'seoTitle', label: 'SEO title', type: 'text', group: 'seo', help: '50–60 characters recommended' },
  { name: 'seoDescription', label: 'Meta description', type: 'textarea', group: 'seo', help: '150–160 characters recommended' },
  { name: 'canonicalUrl', label: 'Canonical URL', type: 'text', group: 'seo' },
  { name: 'ogImage', label: 'Social share image URL', type: 'text', group: 'seo' },
];
const schedule: Field[] = [
  { name: 'publishAt', label: 'Publish at (scheduled)', type: 'datetime', group: 'side', help: 'Leave blank to publish immediately when status is Published' },
  { name: 'expireAt', label: 'Expire at', type: 'datetime', group: 'side', help: 'Content automatically stops displaying after this time' },
];

export const CONTENT_TYPES: Record<string, ContentType> = {
  pages: {
    key: 'pages', label: 'Page', plural: 'Pages', site: 'both', table: schema.pages, titleField: 'title', listColumns: ['title', 'path', 'site', 'template', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => (r.site === 'edo' ? `/edo${r.path}` : r.path),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true }, { name: 'path', label: 'URL path', type: 'text', required: true, help: 'Starts and ends with "/". Changing it creates a 301 redirect from the old path.' },
      { name: 'site', label: 'Website', type: 'select', options: ['visit', 'edo'], required: true, group: 'side' },
      { name: 'template', label: 'Template', type: 'select', options: ['standard', 'directory', 'form', 'offer', 'events', 'blog-index', 'weather', 'sitemap', 'media-item', 'media-gallery', 'home', 'edo-home', 'industry', 'district'], group: 'side' },
      { name: 'summary', label: 'Summary / intro', type: 'textarea' }, { name: 'bodyHtml', label: 'Body', type: 'richtext' },
      { name: 'heroMediaId', label: 'Hero image', type: 'media', group: 'side' }, { name: 'blocks', label: 'Content blocks (advanced)', type: 'json', help: 'Tiles, directory filters, embeds, forms. Validated JSON.' },
      ...schedule, ...seo, { name: 'noindex', label: 'Hide from search engines', type: 'boolean', group: 'seo' },
    ],
  },
  listings: {
    key: 'listings', label: 'Listing', plural: 'Listings (hotels, restaurants, attractions…)', site: 'visit', table: schema.listings, titleField: 'name', listColumns: ['name', 'type', 'subcategory', 'region', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => `/listing/${r.slug}/${r.id}/`,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true }, { name: 'slug', label: 'URL slug', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: schema.listingTypeEnum.enumValues, required: true, group: 'side' },
      { name: 'category', label: 'Category', type: 'text', group: 'side' }, { name: 'subcategory', label: 'Sub-category', type: 'text', group: 'side' }, { name: 'region', label: 'Area / region', type: 'text', group: 'side' },
      { name: 'descriptionHtml', label: 'Description', type: 'richtext' },
      { name: 'address', label: 'Street address', type: 'text' }, { name: 'city', label: 'City', type: 'text' }, { name: 'zip', label: 'ZIP', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number' }, { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'phone', label: 'Phone', type: 'text' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'website', label: 'Website', type: 'url' }, { name: 'bookingUrl', label: 'Booking URL', type: 'url' },
      { name: 'hours', label: 'Hours (as supplied by business)', type: 'textarea' }, { name: 'amenities', label: 'Amenities', type: 'tags' }, { name: 'tags', label: 'Tags', type: 'tags' },
      { name: 'primaryMediaId', label: 'Primary image', type: 'media', group: 'side' }, { name: 'ownerUserId', label: 'Stakeholder owner (user ID)', type: 'number', group: 'side', help: 'Lets a partner account propose updates (moderated).' },
      ...schedule, ...seo,
    ],
  },
  events: {
    key: 'events', label: 'Event', plural: 'Events', site: 'both', table: schema.events, titleField: 'title', listColumns: ['title', 'startDate', 'endDate', 'site', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => (r.site === 'visit' ? `/event/${r.slug}/${r.id}/` : null),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true }, { name: 'slug', label: 'URL slug', type: 'text', required: true },
      { name: 'site', label: 'Website', type: 'select', options: ['visit', 'edo'], group: 'side' },
      { name: 'startDate', label: 'Start date', type: 'date', group: 'side' }, { name: 'endDate', label: 'End date', type: 'date', group: 'side' },
      { name: 'timesText', label: 'Times', type: 'text' }, { name: 'recurrenceText', label: 'Recurrence', type: 'text' }, { name: 'categories', label: 'Categories', type: 'tags' },
      { name: 'descriptionHtml', label: 'Description', type: 'richtext' }, { name: 'locationName', label: 'Venue', type: 'text' }, { name: 'address', label: 'Address', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number' }, { name: 'longitude', label: 'Longitude', type: 'number' }, { name: 'admission', label: 'Admission', type: 'text' },
      { name: 'website', label: 'Website', type: 'url' }, { name: 'hostName', label: 'Host / organizer', type: 'text' }, { name: 'contactEmail', label: 'Contact email', type: 'email' },
      { name: 'primaryMediaId', label: 'Image', type: 'media', group: 'side' }, ...schedule, ...seo,
    ],
  },
  articles: {
    key: 'articles', label: 'Article', plural: 'Articles & news', site: 'both', table: schema.articles, titleField: 'title', listColumns: ['title', 'site', 'publishedOn', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => (r.site === 'visit' ? `/blog/post/${r.slug}/` : `/edo/news/${r.slug}/`),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true }, { name: 'slug', label: 'URL slug', type: 'text', required: true }, { name: 'site', label: 'Website', type: 'select', options: ['visit', 'edo'], group: 'side' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea' }, { name: 'bodyHtml', label: 'Body', type: 'richtext' }, { name: 'author', label: 'Author', type: 'text', group: 'side' },
      { name: 'categories', label: 'Categories', type: 'tags', group: 'side' }, { name: 'publishedOn', label: 'Published on', type: 'date', group: 'side' }, { name: 'heroMediaId', label: 'Hero image', type: 'media', group: 'side' }, ...schedule, ...seo,
    ],
  },
  properties: {
    key: 'properties', label: 'Property', plural: 'Properties', site: 'edo', table: schema.properties, titleField: 'name', listColumns: ['name', 'type', 'availableSqft', 'availability', 'isFixture', 'status'], workflow: true, permission: 'properties.edit',
    publicUrl: (r) => `/edo/properties/${r.slug}/`,
    fields: [
      { name: 'name', label: 'Property name', type: 'text', required: true }, { name: 'slug', label: 'URL slug', type: 'text', required: true },
      { name: 'type', label: 'Property type', type: 'select', options: schema.propertyTypeEnum.enumValues, required: true, group: 'side' },
      { name: 'availability', label: 'Availability', type: 'select', options: ['available', 'under_contract', 'leased', 'sold', 'off_market'], group: 'side' },
      { name: 'address', label: 'Address', type: 'text' }, { name: 'latitude', label: 'Latitude', type: 'number' }, { name: 'longitude', label: 'Longitude', type: 'number' }, { name: 'districtId', label: 'District ID', type: 'number', group: 'side' },
      { name: 'availableSqft', label: 'Available area (SF)', type: 'number' }, { name: 'totalSqft', label: 'Total area (SF)', type: 'number' }, { name: 'acreage', label: 'Acreage', type: 'number' },
      { name: 'zoning', label: 'Zoning', type: 'text' }, { name: 'zoningVerified', label: 'Zoning verified with Development Services', type: 'boolean' },
      { name: 'description', label: 'Description', type: 'textarea' }, { name: 'documents', label: 'Documents [{label,url}]', type: 'json' },
      { name: 'contactName', label: 'Contact name', type: 'text' }, { name: 'contactEmail', label: 'Contact email', type: 'email' }, { name: 'contactPhone', label: 'Contact phone', type: 'text' },
      { name: 'primaryMediaId', label: 'Image', type: 'media', group: 'side' }, { name: 'isFixture', label: 'Demonstration fixture (not a real listing)', type: 'boolean', group: 'side' },
    ],
  },
  districts: {
    key: 'districts', label: 'Business district', plural: 'Business districts', site: 'edo', table: schema.districts, titleField: 'name', listColumns: ['name', 'slug', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => `/edo/employment-and-business-districts/${r.slug}/`,
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'slug', label: 'Slug', type: 'text', required: true }, { name: 'summary', label: 'Summary', type: 'textarea' }, { name: 'bodyHtml', label: 'Body', type: 'richtext' }, { name: 'latitude', label: 'Latitude', type: 'number' }, { name: 'longitude', label: 'Longitude', type: 'number' }, { name: 'heroMediaId', label: 'Image', type: 'media', group: 'side' }],
  },
  industries: {
    key: 'industries', label: 'Industry', plural: 'Industries', site: 'edo', table: schema.industries, titleField: 'name', listColumns: ['name', 'slug', 'status', 'updatedAt'], workflow: true, permission: 'content.edit',
    publicUrl: (r) => `/edo/key-industries-and-employers/${r.slug}/`,
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'slug', label: 'Slug', type: 'text', required: true }, { name: 'summary', label: 'Summary', type: 'textarea' }, { name: 'bodyHtml', label: 'Body', type: 'richtext' }, { name: 'employers', label: 'Notable employers', type: 'tags' }, { name: 'heroMediaId', label: 'Image', type: 'media', group: 'side' }],
  },
  reports: {
    key: 'reports', label: 'Report', plural: 'Reports & downloads', site: 'edo', table: schema.reports, titleField: 'title', listColumns: ['title', 'category', 'publishedOn', 'status'], workflow: true, permission: 'content.edit',
    fields: [{ name: 'title', label: 'Title', type: 'text', required: true }, { name: 'summary', label: 'Summary', type: 'textarea' }, { name: 'fileUrl', label: 'File URL', type: 'url', required: true }, { name: 'category', label: 'Category', type: 'text' }, { name: 'publishedOn', label: 'Published on', type: 'date' }],
  },
  indicators: {
    key: 'indicators', label: 'Economic indicator', plural: 'Economic data', site: 'edo', table: schema.economicIndicators, titleField: 'label', listColumns: ['label', 'value', 'category', 'asOf', 'updatedAt'], workflow: false, permission: 'content.edit',
    fields: [{ name: 'key', label: 'Key', type: 'text', required: true }, { name: 'label', label: 'Label', type: 'text', required: true }, { name: 'value', label: 'Display value', type: 'text', required: true }, { name: 'numericValue', label: 'Numeric value', type: 'number' }, { name: 'unit', label: 'Unit', type: 'text' }, { name: 'category', label: 'Category', type: 'text' },
      { name: 'sourceName', label: 'Source name', type: 'text', required: true, help: 'Every published figure must cite a source.' }, { name: 'sourceUrl', label: 'Source URL', type: 'url', required: true }, { name: 'asOf', label: 'As of', type: 'text' }],
  },
};
