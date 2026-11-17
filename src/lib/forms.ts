import { z } from 'zod';

/**
 * Declarative registry of every public form on both platforms. The same spec drives:
 *  - client rendering (labels, input types, required markers, help text),
 *  - server validation (zod schema built from the spec),
 *  - storage (submissions table, typed by `type`) and admin display.
 * Fields mirror the legacy forms captured in the audit (see WEBSITE_INVENTORY.md §Forms).
 */
export type Field = {
  name: string; label: string; type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'time';
  required?: boolean; options?: string[]; help?: string; width?: 'full' | 'half'; max?: number; autoComplete?: string;
};
export type FormSpec = {
  type: 'event' | 'listing_update' | 'partner' | 'meeting_rfp' | 'wedding' | 'contact' | 'visitor_guide' | 'investor' | 'property_enquiry' | 'business_enquiry' | 'site_selection' | 'lets_talk_business';
  site: 'visit' | 'edo'; title: string; intro?: string; submitLabel: string; success: string; fields: Field[];
};

const contactBlock: Field[] = [
  { name: 'firstName', label: 'First name', type: 'text', required: true, width: 'half', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', type: 'text', required: true, width: 'half', autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', required: true, width: 'half', autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', width: 'half', autoComplete: 'tel' },
];

export const FORMS: Record<string, FormSpec> = {
  contact: {
    type: 'contact', site: 'visit', title: 'Contact Visit Chandler', submitLabel: 'Send message',
    success: 'Thanks — your message has been sent to the Visit Chandler team. We aim to reply within two business days.',
    fields: [...contactBlock, { name: 'topic', label: 'Topic', type: 'select', options: ['General question', 'Visitor information', 'Media enquiry', 'Partnership', 'Website feedback'], required: true, width: 'full' },
      { name: 'message', label: 'Message', type: 'textarea', required: true, max: 4000, width: 'full' }],
  },
  'submit-event': {
    type: 'event', site: 'visit', title: 'Submit your event', submitLabel: 'Submit event for review',
    intro: 'Events in Chandler can be submitted for free. Every submission is reviewed by the tourism team before it is published to the calendar.',
    success: 'Thank you! Your event has been received and will be reviewed by our team before it appears on the calendar.',
    fields: [
      { name: 'eventTitle', label: 'Event name', type: 'text', required: true, width: 'full' },
      { name: 'startDate', label: 'Start date', type: 'date', required: true, width: 'half' },
      { name: 'endDate', label: 'End date', type: 'date', width: 'half' },
      { name: 'times', label: 'Times', type: 'text', help: 'e.g. Fri 4–9 PM, Sat 7 AM–9 PM', width: 'half' },
      { name: 'admission', label: 'Admission', type: 'text', help: 'e.g. Free, $10–$20', width: 'half' },
      { name: 'venue', label: 'Venue / location name', type: 'text', required: true, width: 'half' },
      { name: 'address', label: 'Street address', type: 'text', required: true, width: 'half' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: ['Arts & Culture', 'Festivals', 'Family Friendly', 'Food & Drink', 'Music & Concerts', 'Sports & Recreation', 'Holiday', 'Community', 'Business & Networking'], width: 'half' },
      { name: 'website', label: 'Event website', type: 'url', width: 'half' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, max: 3000, width: 'full' },
      { name: 'organiser', label: 'Organizer / host', type: 'text', required: true, width: 'half' },
      ...contactBlock.slice(2),
    ],
  },
  'meeting-rfp': {
    type: 'meeting_rfp', site: 'visit', title: 'Submit a meeting RFP', submitLabel: 'Send RFP',
    intro: 'Tell us about your meeting and the Visit Chandler sales team will circulate your request to suitable hotels and venues.',
    success: 'Your RFP has been received. A member of the Visit Chandler sales team will be in touch shortly.',
    fields: [...contactBlock, { name: 'organisation', label: 'Organization', type: 'text', required: true, width: 'half' },
      { name: 'meetingName', label: 'Meeting / event name', type: 'text', required: true, width: 'half' },
      { name: 'arrival', label: 'Preferred arrival', type: 'date', required: true, width: 'half' },
      { name: 'departure', label: 'Preferred departure', type: 'date', required: true, width: 'half' },
      { name: 'attendees', label: 'Estimated attendees', type: 'number', required: true, width: 'half' },
      { name: 'peakRooms', label: 'Peak room nights', type: 'number', width: 'half' },
      { name: 'largestSpace', label: 'Largest meeting space needed (sq ft)', type: 'number', width: 'half' },
      { name: 'flexibleDates', label: 'Dates are flexible', type: 'checkbox', width: 'half' },
      { name: 'details', label: 'Additional requirements', type: 'textarea', max: 4000, width: 'full' }],
  },
  wedding: {
    type: 'wedding', site: 'visit', title: 'Plan your Chandler wedding', submitLabel: 'Send enquiry',
    success: 'Congratulations! Your wedding enquiry has been sent — our team will share venue and hotel options with you.',
    fields: [...contactBlock, { name: 'weddingDate', label: 'Wedding date', type: 'date', width: 'half' },
      { name: 'guests', label: 'Estimated guests', type: 'number', width: 'half' },
      { name: 'needs', label: 'I need help with', type: 'select', options: ['Ceremony & reception venue', 'Room blocks', 'Rehearsal dinner', 'Pre- / post-wedding activities', 'All of the above'], width: 'full' },
      { name: 'message', label: 'Tell us about your plans', type: 'textarea', max: 3000, width: 'full' }],
  },
  partner: {
    type: 'partner', site: 'visit', title: 'Partner with Visit Chandler', submitLabel: 'Submit listing request',
    intro: 'Chandler hospitality, dining, attraction and retail businesses can request a free listing. Submissions are moderated before publication.',
    success: 'Thank you. Your listing request is in the moderation queue; the tourism team will contact you before anything is published.',
    fields: [...contactBlock, { name: 'businessName', label: 'Business name', type: 'text', required: true, width: 'half' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: ['Hotel', 'Restaurant', 'Attraction', 'Shopping', 'Recreation', 'Venue', 'Services'], width: 'half' },
      { name: 'address', label: 'Business address', type: 'text', required: true, width: 'full' },
      { name: 'website', label: 'Website', type: 'url', width: 'half' },
      { name: 'businessPhone', label: 'Business phone', type: 'tel', width: 'half' },
      { name: 'description', label: 'Short description', type: 'textarea', required: true, max: 1500, width: 'full' }],
  },
  'visitor-guide': {
    type: 'visitor_guide', site: 'visit', title: 'Request a printed Visitors Guide', submitLabel: 'Request my guide',
    success: 'Your Visitors Guide request has been received and will be mailed to the address provided.',
    fields: [...contactBlock, { name: 'address1', label: 'Mailing address', type: 'text', required: true, width: 'full', autoComplete: 'address-line1' },
      { name: 'city', label: 'City', type: 'text', required: true, width: 'half', autoComplete: 'address-level2' },
      { name: 'state', label: 'State / province', type: 'text', required: true, width: 'half', autoComplete: 'address-level1' },
      { name: 'zip', label: 'ZIP / postal code', type: 'text', required: true, width: 'half', autoComplete: 'postal-code' },
      { name: 'country', label: 'Country', type: 'text', required: true, width: 'half', autoComplete: 'country-name' },
      { name: 'travelMonth', label: 'When are you planning to visit?', type: 'text', width: 'full' },
      { name: 'optIn', label: 'Send me the Visit Chandler e-newsletter', type: 'checkbox', width: 'full' }],
  },
  /* ───────────── Economic Development ───────────── */
  'initiate-a-project': {
    type: 'site_selection', site: 'edo', title: 'Initiate a project', submitLabel: 'Start my project',
    intro: 'Launching, relocating or expanding? Share a few details and the Economic Development team will respond confidentially.',
    success: 'Thank you. Your project has been logged and assigned to the Economic Development team, who will contact you confidentially.',
    fields: [...contactBlock, { name: 'company', label: 'Company', type: 'text', required: true, width: 'half' },
      { name: 'title', label: 'Job title', type: 'text', width: 'half' },
      { name: 'projectType', label: 'Project type', type: 'select', required: true, options: ['New location / relocation', 'Expansion', 'New investment', 'Site selection consultant', 'Startup', 'Other'], width: 'half' },
      { name: 'industry', label: 'Industry', type: 'select', options: ['Advanced Manufacturing', 'Advanced Business Services', 'Aviation & Aerospace', 'Automotive Technology', 'Healthcare', 'Software Development', 'Corporate / Regional HQ', 'Applied Research', 'Other'], width: 'half' },
      { name: 'spaceType', label: 'Space needed', type: 'select', options: ['Office', 'Industrial', 'Flex', 'Retail', 'Land', 'Not sure yet'], width: 'half' },
      { name: 'sqft', label: 'Approximate square feet', type: 'number', width: 'half' },
      { name: 'jobs', label: 'New jobs anticipated', type: 'number', width: 'half' },
      { name: 'timeline', label: 'Timeline', type: 'select', options: ['0–6 months', '6–12 months', '12–24 months', '24+ months'], width: 'half' },
      { name: 'details', label: 'Project details', type: 'textarea', max: 4000, width: 'full' }],
  },
  'lets-talk-business': {
    type: 'lets_talk_business', site: 'edo', title: "Let's Talk Business", submitLabel: 'Request a conversation',
    intro: "Chandler companies can request a one-on-one conversation with the City's Economic Development team.",
    success: 'Thanks — a member of the Economic Development team will reach out to schedule your conversation.',
    fields: [...contactBlock, { name: 'company', label: 'Company', type: 'text', required: true, width: 'half' },
      { name: 'employees', label: 'Number of employees', type: 'number', width: 'half' },
      { name: 'topic', label: 'What would you like to discuss?', type: 'select', options: ['Expansion', 'Workforce & hiring', 'Permits & development', 'Incentives & funding', 'Export assistance', 'Other'], width: 'full' },
      { name: 'message', label: 'Details', type: 'textarea', max: 3000, width: 'full' }],
  },
  'property-enquiry': {
    type: 'property_enquiry', site: 'edo', title: 'Ask about this property', submitLabel: 'Send enquiry',
    success: 'Your property enquiry has been sent to the Economic Development team.',
    fields: [...contactBlock, { name: 'company', label: 'Company', type: 'text', width: 'half' },
      { name: 'role', label: 'I am a', type: 'select', options: ['Business owner / occupier', 'Broker', 'Site selector', 'Developer / investor', 'Other'], width: 'half' },
      { name: 'message', label: 'Message', type: 'textarea', required: true, max: 3000, width: 'full' }],
  },
  'investor-enquiry': {
    type: 'investor', site: 'edo', title: 'Investor & business enquiry', submitLabel: 'Send enquiry',
    success: 'Thank you. Your enquiry has been routed to the appropriate Economic Development team member.',
    fields: [...contactBlock, { name: 'company', label: 'Company', type: 'text', required: true, width: 'half' },
      { name: 'enquiryType', label: 'Enquiry type', type: 'select', required: true, options: ['Site selection', 'Available properties', 'Business relocation', 'Business expansion', 'New investment', 'Economic development assistance', 'Data / research request'], width: 'half' },
      { name: 'message', label: 'How can we help?', type: 'textarea', required: true, max: 4000, width: 'full' }],
  },
};

export function schemaFor(spec: FormSpec) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of spec.fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case 'email': s = z.string().trim().email('Enter a valid email address').max(255); break;
      case 'url': s = z.string().trim().url('Enter a full web address including https://').max(500); break;
      case 'number': s = z.coerce.number({ message: 'Enter a number' }).int().min(0).max(10_000_000); break;
      case 'date': s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'); break;
      case 'checkbox': s = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()); break;
      case 'select': s = z.enum(f.options as [string, ...string[]], { message: 'Choose an option' }); break;
      case 'tel': s = z.string().trim().regex(/^[0-9+().\-\s]{7,24}$/, 'Enter a valid phone number'); break;
      default: s = z.string().trim().min(1, 'This field is required').max(f.max ?? 300);
    }
    if (!f.required) s = z.preprocess((v) => (v === '' || v == null ? undefined : v), s.optional());
    else if (f.type === 'checkbox') s = s.refine((v) => v === true, 'Required');
    shape[f.name] = s;
  }
  return z.object(shape);
}
