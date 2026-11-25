import { createId } from '@paralleldrive/cuid2'
import { InferSelectModel, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  vector
} from 'drizzle-orm/pg-core'

// Constants
const ID_LENGTH = 191
const USER_ID_LENGTH = 255
const VARCHAR_LENGTH = 256
const FILENAME_LENGTH = 1024

// Postgres tsvector type (no built-in drizzle type)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  }
})

// ID generation function
export const generateId = () => createId()

export const SPACE_COLORS = [
  'black',
  'green',
  'blue',
  'purple',
  'yellow',
  'pink',
  'red',
  'orange'
] as const

export type SpaceColor = (typeof SPACE_COLORS)[number]

// Spaces table
export const spaces = pgTable(
  'spaces',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    color: varchar('color', { length: 16, enum: SPACE_COLORS }).notNull(),
    name: text('name').notNull().default(''),
    about: text('about').notNull().default(''),
    style: text('style').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  table => [
    uniqueIndex('spaces_user_id_color_idx').on(table.userId, table.color),

    pgPolicy('users_manage_own_spaces', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type Space = InferSelectModel<typeof spaces>

// Chats table
export const chats = pgTable(
  'chats',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    title: text('title').notNull(),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    visibility: varchar('visibility', {
      length: VARCHAR_LENGTH,
      enum: ['public', 'private']
    })
      .notNull()
      .default('private'),
    spaceId: varchar('space_id', { length: ID_LENGTH }).references(
      () => spaces.id,
      { onDelete: 'set null' }
    )
  },
  table => [
    // Indexes
    index('chats_user_id_idx').on(table.userId),
    index('chats_space_id_idx').on(table.spaceId),
    index('chats_user_id_created_at_idx').on(
      table.userId,
      table.createdAt.desc()
    ),
    index('chats_created_at_idx').on(table.createdAt.desc()),
    // Composite index for RLS subqueries in messages and parts tables
    index('chats_id_user_id_idx').on(table.id, table.userId),

    // RLS Policies
    pgPolicy('users_manage_own_chats', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('public_chats_readable', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`visibility = 'public'`
    })
  ]
).enableRLS()

export type Chat = InferSelectModel<typeof chats>

// Messages table (simplified)
export const messages = pgTable(
  'messages',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    chatId: varchar('chat_id', { length: ID_LENGTH })
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: VARCHAR_LENGTH }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    metadata: jsonb('metadata').$type<Record<string, any>>()
  },
  table => [
    index('messages_chat_id_idx').on(table.chatId),
    index('messages_chat_id_created_at_idx').on(table.chatId, table.createdAt),

    // RLS Policies - allow access to messages if user owns the chat
    pgPolicy('users_manage_chat_messages', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`EXISTS (
        SELECT 1 FROM ${chats}
        WHERE ${chats}.id = chat_id
        AND ${chats}.user_id = current_setting('app.current_user_id', true)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${chats}
        WHERE ${chats}.id = chat_id
        AND ${chats}.user_id = current_setting('app.current_user_id', true)
      )`
    }),
    pgPolicy('public_chat_messages_readable', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`EXISTS (
        SELECT 1 FROM ${chats}
        WHERE ${chats}.id = chat_id
        AND ${chats}.visibility = 'public'
      )`
    })
  ]
).enableRLS()

export type Message = InferSelectModel<typeof messages>

// Parts table
export const parts = pgTable(
  'parts',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    messageId: varchar('message_id', { length: ID_LENGTH })
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    type: varchar('type', { length: VARCHAR_LENGTH }).notNull(),

    // Text parts
    text_text: text('text_text'),

    // Reasoning parts
    reasoning_text: text('reasoning_text'),

    // File parts
    file_mediaType: varchar('file_media_type', { length: VARCHAR_LENGTH }),
    file_filename: varchar('file_filename', { length: FILENAME_LENGTH }),
    file_url: text('file_url'),
    file_key: text('file_key'),

    // Source URL parts
    source_url_sourceId: varchar('source_url_source_id', {
      length: VARCHAR_LENGTH
    }),
    source_url_url: text('source_url_url'),
    source_url_title: text('source_url_title'),

    // Source document parts
    source_document_sourceId: varchar('source_document_source_id', {
      length: VARCHAR_LENGTH
    }),
    source_document_mediaType: varchar('source_document_media_type', {
      length: VARCHAR_LENGTH
    }),
    source_document_title: text('source_document_title'),
    source_document_filename: varchar('source_document_filename', {
      length: FILENAME_LENGTH
    }),
    source_document_url: text('source_document_url'),
    source_document_snippet: text('source_document_snippet'),

    // Tool parts (generic)
    tool_toolCallId: varchar('tool_tool_call_id', { length: VARCHAR_LENGTH }),
    tool_state: varchar('tool_state', { length: VARCHAR_LENGTH }),
    tool_errorText: text('tool_error_text'),

    // Tool-specific columns (all Sera tools)
    tool_search_input: json('tool_search_input').$type<any>(),
    tool_search_output: json('tool_search_output').$type<any>(),
    tool_fetch_input: json('tool_fetch_input').$type<any>(),
    tool_fetch_output: json('tool_fetch_output').$type<any>(),
    tool_question_input: json('tool_question_input').$type<any>(),
    tool_question_output: json('tool_question_output').$type<any>(),

    // Todo tool columns
    tool_todoWrite_input: json('tool_todoWrite_input').$type<any>(),
    tool_todoWrite_output: json('tool_todoWrite_output').$type<any>(),
    tool_todoRead_input: json('tool_todoRead_input').$type<any>(),
    tool_todoRead_output: json('tool_todoRead_output').$type<any>(),

    // Dynamic tools (includes MCP and other runtime-defined tools)
    tool_dynamic_input: json('tool_dynamic_input').$type<any>(),
    tool_dynamic_output: json('tool_dynamic_output').$type<any>(),
    tool_dynamic_name: varchar('tool_dynamic_name', { length: VARCHAR_LENGTH }),
    tool_dynamic_type: varchar('tool_dynamic_type', { length: VARCHAR_LENGTH }),

    // Data parts (generic support)
    data_prefix: varchar('data_prefix', { length: VARCHAR_LENGTH }),
    data_content: json('data_content').$type<any>(),
    data_id: varchar('data_id', { length: VARCHAR_LENGTH }),

    // Provider metadata
    providerMetadata: json('provider_metadata').$type<Record<string, any>>(),

    // Full-text search columns (maintained by Postgres, used by history
    // search). Input is capped at 100k characters: Postgres errors on any
    // tsvector over 1MB ("string is too long for tsvector"), which would
    // otherwise abort migration 0020 on existing rows and fail inserts of
    // oversized parts. Worst-case vector size at this cap is ~220KB.
    search: tsvector('search').generatedAlwaysAs(
      sql`to_tsvector('simple', left(coalesce(text_text, ''), 100000))`
    ),
    searchReasoning: tsvector('search_reasoning').generatedAlwaysAs(
      sql`to_tsvector('simple', left(coalesce(reasoning_text, ''), 100000))`
    ),

    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  table => [
    // Indexes
    index('parts_message_id_idx').on(table.messageId),
    index('parts_message_id_order_idx').on(table.messageId, table.order),
    index('parts_search_idx').using('gin', table.search),
    index('parts_search_reasoning_idx').using('gin', table.searchReasoning),

    // Constraints
    check('text_text_required', sql`(type != 'text' OR text_text IS NOT NULL)`),
    check(
      'reasoning_text_required',
      sql`(type != 'reasoning' OR reasoning_text IS NOT NULL)`
    ),
    check(
      'file_fields_required',
      sql`(type != 'file' OR (file_media_type IS NOT NULL AND file_filename IS NOT NULL AND (file_key IS NOT NULL OR file_url IS NOT NULL)))`
    ),
    check(
      'tool_state_valid',
      sql`(tool_state IS NULL OR tool_state IN ('input-streaming', 'input-available', 'output-available', 'output-error'))`
    ),
    check(
      'tool_fields_required',
      sql`(type NOT LIKE 'tool-%' OR (tool_tool_call_id IS NOT NULL AND tool_state IS NOT NULL))`
    ),

    // RLS Policies - allow access to parts if user owns the related chat
    pgPolicy('users_manage_message_parts', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`EXISTS (
        SELECT 1 FROM ${messages}
        INNER JOIN ${chats} ON ${chats}.id = ${messages}.chat_id
        WHERE ${messages}.id = message_id
        AND ${chats}.user_id = current_setting('app.current_user_id', true)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${messages}
        INNER JOIN ${chats} ON ${chats}.id = ${messages}.chat_id
        WHERE ${messages}.id = message_id
        AND ${chats}.user_id = current_setting('app.current_user_id', true)
      )`
    }),
    pgPolicy('public_chat_parts_readable', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`EXISTS (
        SELECT 1 FROM ${messages}
        INNER JOIN ${chats} ON ${chats}.id = ${messages}.chat_id
        WHERE ${messages}.id = message_id
        AND ${chats}.visibility = 'public'
      )`
    })
  ]
).enableRLS()

export type Part = InferSelectModel<typeof parts>
export type NewPart = typeof parts.$inferInsert

// Notes table
export const notes = pgTable(
  'notes',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    chatId: varchar('chat_id', { length: ID_LENGTH }).references(
      () => chats.id,
      { onDelete: 'set null' }
    ),
    sourceMessageId: varchar('source_message_id', {
      length: ID_LENGTH
    }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  table => [
    index('notes_user_id_idx').on(table.userId),
    index('notes_user_id_updated_at_idx').on(
      table.userId,
      table.updatedAt.desc()
    ),
    index('notes_chat_id_idx').on(table.chatId),
    index('notes_source_message_id_idx').on(table.sourceMessageId),

    pgPolicy('users_manage_own_notes', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type Note = InferSelectModel<typeof notes>
export type NewNote = typeof notes.$inferInsert

// Library files table
export const libraryFiles = pgTable(
  'files',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    chatId: varchar('chat_id', { length: ID_LENGTH }).references(
      () => chats.id,
      { onDelete: 'set null' }
    ),
    filename: text('filename').notNull(),
    objectKey: text('object_key').notNull(),
    mediaType: varchar('media_type', { length: VARCHAR_LENGTH }).notNull(),
    size: integer('size'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  table => [
    index('files_user_id_idx').on(table.userId),
    index('files_user_id_updated_at_idx').on(
      table.userId,
      table.updatedAt.desc()
    ),
    index('files_chat_id_idx').on(table.chatId),
    index('files_media_type_idx').on(table.mediaType),
    index('files_object_key_idx').on(table.objectKey),

    pgPolicy('users_manage_own_files', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type LibraryFile = InferSelectModel<typeof libraryFiles>
export type NewLibraryFile = typeof libraryFiles.$inferInsert

// Feedback table
export const feedback = pgTable(
  'feedback',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }),
    sentiment: varchar('sentiment', {
      length: VARCHAR_LENGTH,
      enum: ['positive', 'neutral', 'negative']
    }).notNull(),
    message: text('message').notNull(),
    pageUrl: text('page_url').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  table => [
    // Indexes
    index('feedback_user_id_idx').on(table.userId),
    index('feedback_created_at_idx').on(table.createdAt),

    // RLS Policies - Allow reads (for INSERT ... RETURNING and app visibility)
    pgPolicy('feedback_select_policy', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),

    // RLS Policy - Allow anyone to insert feedback
    pgPolicy('anyone_can_insert_feedback', {
      for: 'insert',
      to: 'public',
      withCheck: sql`true`
    }),

    // Allow users to remove the account link from their own feedback.
    pgPolicy('users_anonymize_own_feedback', {
      as: 'permissive',
      for: 'update',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id IS NULL`
    })
  ]
).enableRLS()

export type Feedback = InferSelectModel<typeof feedback>

// Usage grants are the durable authority for allowances. Redis remains the
// runtime authority for spend and remaining usage.
export const usageGrants = pgTable(
  'usage_grants',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    idempotencyKey: varchar('idempotency_key', {
      length: VARCHAR_LENGTH
    }).notNull(),
    kind: varchar('kind', {
      length: VARCHAR_LENGTH,
      enum: ['period', 'adjustment']
    }).notNull(),
    amount: integer('amount').notNull(),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  table => [
    uniqueIndex('usage_grants_user_idempotency_idx').on(
      table.userId,
      table.idempotencyKey
    ),
    index('usage_grants_user_expires_idx').on(table.userId, table.expiresAt),
    pgPolicy('users_read_own_usage_grants', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('users_insert_own_usage_grants', {
      as: 'permissive',
      for: 'insert',
      to: 'public',
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type UsageGrant = InferSelectModel<typeof usageGrants>

// Usage events are best-effort analytics. They must never be used to rebuild
// balances or decide whether a request is allowed.
export const usageEvents = pgTable(
  'usage_events',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar('user_id', { length: USER_ID_LENGTH }).notNull(),
    eventType: varchar('event_type', {
      length: VARCHAR_LENGTH,
      enum: ['spend', 'refund', 'limit_reached']
    }).notNull(),
    amount: integer('amount').notNull(),
    mode: varchar('mode', {
      length: VARCHAR_LENGTH,
      enum: ['quick', 'adaptive']
    }),
    attemptId: varchar('attempt_id', { length: ID_LENGTH }).notNull(),
    messageId: varchar('message_id', { length: ID_LENGTH }),
    remaining: integer('remaining'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  table => [
    uniqueIndex('usage_events_user_type_attempt_idx').on(
      table.userId,
      table.eventType,
      table.attemptId
    ),
    index('usage_events_user_created_idx').on(table.userId, table.createdAt),
    pgPolicy('users_read_own_usage_events', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('users_insert_own_usage_events', {
      as: 'permissive',
      for: 'insert',
      to: 'public',
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type UsageEvent = InferSelectModel<typeof usageEvents>

export const additionalUsageInterest = pgTable(
  'additional_usage_interest',
  {
    userId: varchar('user_id', { length: USER_ID_LENGTH }).primaryKey(),
    count: integer('count').notNull().default(1),
    firstClickedAt: timestamp('first_clicked_at').notNull().defaultNow(),
    lastClickedAt: timestamp('last_clicked_at').notNull().defaultNow()
  },
  () => [
    pgPolicy('users_write_own_additional_usage_interest', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`user_id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`user_id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type AdditionalUsageInterest = InferSelectModel<
  typeof additionalUsageInterest
>

export const USER_TYPES = ['mentor', 'student'] as const

export type UserType = (typeof USER_TYPES)[number]

export const userTypeEnum = pgEnum('user_type', ['mentor', 'student'])

// User profiles table (maps Supabase Auth users to Mentor/Student types)
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: varchar('id', { length: USER_ID_LENGTH }).primaryKey(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    userType: userTypeEnum('user_type').notNull(),
    // The college the account belongs to: verified from a college email
    // domain, or self-reported by a student at onboarding. Null means not
    // enrolled anywhere (e.g. exploring admissions). See lib/colleges.
    college: varchar('college', { length: 32 }),
    // Partner campus for colleges with several (a partner college's slug,
    // 'none' for a campus not on Sera, null when not answered yet).
    campus: varchar('campus', { length: 32 }),
    // When the student answered the enrolled-college question (or the college
    // was set from a verified college email). Null: not asked yet.
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('user_profiles_user_type_idx').on(table.userType),
    index('user_profiles_college_idx').on(table.college),
    pgPolicy('users_read_own_profile', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('users_insert_own_profile', {
      as: 'permissive',
      for: 'insert',
      to: 'public',
      withCheck: sql`id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('users_update_own_profile', {
      as: 'permissive',
      for: 'update',
      to: 'public',
      using: sql`id = (select current_setting('app.current_user_id', true))`,
      withCheck: sql`id = (select current_setting('app.current_user_id', true))`
    }),
    pgPolicy('users_delete_own_profile', {
      as: 'permissive',
      for: 'delete',
      to: 'public',
      using: sql`id = (select current_setting('app.current_user_id', true))`
    })
  ]
).enableRLS()

export type UserProfile = InferSelectModel<typeof userProfiles>
export type NewUserProfile = typeof userProfiles.$inferInsert

// ---------------------------------------------------------------------------
// Colleges (tenants), managed by platform admins at /admin/colleges
// ---------------------------------------------------------------------------

/** Writes come only from the platform-admin server actions. */
const platformWriteCondition = sql`(select current_setting('app.platform_write', true)) = 'true'`

const textArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`)

export const colleges = pgTable(
  'colleges',
  {
    slug: varchar('slug', { length: 32 }).primaryKey(),
    name: text('name').notNull(),
    shortName: text('short_name').notNull(),
    location: text('location').notNull().default(''),
    website: text('website').notNull().default(''),
    officialWebDomains: textArray('official_web_domains'),
    partnerColleges: textArray('partner_colleges'),
    mentorDomains: textArray('mentor_domains'),
    studentDomains: textArray('student_domains'),
    mentorRequiresAllowlist: boolean('mentor_requires_allowlist')
      .notNull()
      .default(false),
    aliases: textArray('aliases'),
    squadLabel: text('squad_label'),
    residencyLabel: text('residency_label'),
    eventsLabel: text('events_label').notNull().default('Events'),
    gchatSpaces: textArray('gchat_spaces'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    updatedBy: varchar('updated_by', { length: USER_ID_LENGTH }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  () => [
    pgPolicy('colleges_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('colleges_platform_write', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: platformWriteCondition,
      withCheck: platformWriteCondition
    })
  ]
).enableRLS()

export type CollegeRow = InferSelectModel<typeof colleges>
export type NewCollegeRow = typeof colleges.$inferInsert

/**
 * Mentors of colleges whose mentors and students share an email domain.
 * Private: never readable through the public API.
 */
export const collegeMentorAllowlist = pgTable(
  'college_mentor_allowlist',
  {
    college: varchar('college', { length: 32 })
      .notNull()
      .references(() => colleges.slug, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    primaryKey({ columns: [table.college, table.email] }),
    index('college_mentor_allowlist_email_idx').on(table.email),
    pgPolicy('college_mentor_allowlist_platform_access', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`(select current_setting('app.platform_write', true)) = 'true' OR (select current_setting('app.college_directory_read', true)) = 'true'`,
      withCheck: platformWriteCondition
    })
  ]
).enableRLS()

// ---------------------------------------------------------------------------
// SERA RAG & Campus Knowledge Base Tables
// ---------------------------------------------------------------------------

export const KNOWLEDGE_DOMAINS = [
  'admissions',
  'fees',
  'examinations',
  'timetables',
  'activities',
  'academics',
  'general'
] as const
export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number]

/**
 * Where a document came from. Generic across colleges: the issuing college is
 * the document's `authority`, so labels read e.g. "JECRC notice".
 */
export const KNOWLEDGE_SOURCE_SYSTEMS = [
  'official_notice',
  'official_guide',
  'portal_guide',
  'official_website',
  'official_document',
  'campus_events',
  'whatsapp_forward',
  'gchat_space'
] as const
export type KnowledgeSourceSystem = (typeof KNOWLEDGE_SOURCE_SYSTEMS)[number]

export const KNOWLEDGE_SOURCE_LABELS: Readonly<
  Record<KnowledgeSourceSystem, string>
> = {
  official_notice: 'Official notice',
  official_guide: 'Official guide',
  portal_guide: 'Portal guide',
  official_website: 'Official website',
  official_document: 'Official document',
  campus_events: 'Campus events',
  whatsapp_forward: 'WhatsApp forward',
  gchat_space: 'Google Chat space'
}

/**
 * Source systems written before they became college-agnostic, mapped to their
 * generic equivalent. Rows may still carry these until they are rewritten.
 */
export const LEGACY_SOURCE_SYSTEMS: Readonly<
  Record<string, KnowledgeSourceSystem>
> = {
  jecrc_enotice: 'official_notice',
  bkbirla_notice: 'official_notice',
  kalvium_guide: 'official_guide',
  jecrc_portal_guide: 'portal_guide',
  jecrc_web: 'official_website',
  kalvium_web: 'official_website',
  bkbirla_web: 'official_website',
  eventum: 'campus_events'
}

/** Normalise a stored source system (generic or legacy) to a generic one. */
export function toSourceSystem(value: string): KnowledgeSourceSystem {
  if ((KNOWLEDGE_SOURCE_SYSTEMS as readonly string[]).includes(value)) {
    return value as KnowledgeSourceSystem
  }
  return LEGACY_SOURCE_SYSTEMS[value] ?? 'official_document'
}

/** Issuing authority of a document: a college slug, or `joint` for co-issued. */
export type KnowledgeAuthority = string
export const JOINT_AUTHORITY = 'joint'

export const KNOWLEDGE_PRIORITIES = ['standard', 'urgent'] as const
export type KnowledgePriority = (typeof KNOWLEDGE_PRIORITIES)[number]

export const KNOWLEDGE_STATUSES = [
  'active',
  'pending_review',
  'superseded',
  'archived'
] as const
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]

export const KNOWLEDGE_CHANNELS = [
  'mentor_upload',
  'gchat',
  'whatsapp_forward',
  'web_crawl'
] as const
export type KnowledgeChannel = (typeof KNOWLEDGE_CHANNELS)[number]

export const KNOWLEDGE_SENDER_ROLES = [
  'mentor',
  'student_cr',
  'official_space',
  'system'
] as const
export type KnowledgeSenderRole = (typeof KNOWLEDGE_SENDER_ROLES)[number]

export const CAMPUS_EVENT_STATUSES = [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled'
] as const
export type CampusEventStatus = (typeof CAMPUS_EVENT_STATUSES)[number]

export const UNANSWERED_QUERY_KINDS = ['abstention', 'citation_flag'] as const
export type UnansweredQueryKind = (typeof UNANSWERED_QUERY_KINDS)[number]

export const UNANSWERED_QUERY_STATUSES = [
  'open',
  'resolved',
  'dismissed'
] as const
export type UnansweredQueryStatus = (typeof UNANSWERED_QUERY_STATUSES)[number]

export const EMBEDDING_DIMENSIONS = 768

const mentorOrSystemWriteCondition = sql`(select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (
  SELECT 1 FROM ${userProfiles}
  WHERE ${userProfiles}.id = (select current_setting('app.current_user_id', true))
  AND ${userProfiles}.user_type = 'mentor'
)`

/**
 * Mentors may only manage rows of their own college (tenant isolation);
 * system writes (ingestion pipelines) may write any college.
 */
function collegeMentorOrSystemWriteCondition(collegeColumn: AnyPgColumn) {
  return sql`(select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (
  SELECT 1 FROM ${userProfiles}
  WHERE ${userProfiles}.id = (select current_setting('app.current_user_id', true))
  AND ${userProfiles}.user_type = 'mentor'
  AND ${userProfiles}.college = ${collegeColumn}
)`
}

// Every insert sets the college explicitly. (The database still has a
// 'kalvium' default from 0024 until 0025's follow-up drops it.)
const collegeColumn = () => varchar('college', { length: 32 }).notNull()

// Knowledge documents (official notices, guides, web crawls, and urgent updates)
export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    // Owning college (tenant). Users read their college's documents plus
    // those of its partner colleges.
    college: collegeColumn(),
    title: text('title').notNull(),
    domain: varchar('domain', {
      length: 64,
      enum: KNOWLEDGE_DOMAINS
    })
      .notNull()
      .default('general'),
    sourceSystem: varchar('source_system', {
      length: 64,
      enum: KNOWLEDGE_SOURCE_SYSTEMS
    }).notNull(),
    authority: varchar('authority', {
      length: 32
    })
      .notNull()
      .default('joint'),
    program: varchar('program', { length: 128 }),
    semester: varchar('semester', { length: 64 }),
    squad: varchar('squad', { length: 128 }),
    residency: varchar('residency', { length: 64 }),
    priority: varchar('priority', {
      length: 32,
      enum: KNOWLEDGE_PRIORITIES
    })
      .notNull()
      .default('standard'),
    status: varchar('status', {
      length: 32,
      enum: KNOWLEDGE_STATUSES
    })
      .notNull()
      .default('active'),
    effectiveDate: timestamp('effective_date', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    supersedesId: varchar('supersedes_id', { length: ID_LENGTH }),
    supersedesTopic: text('supersedes_topic'),
    actionRequired: text('action_required'),
    sourceUrl: text('source_url'),
    content: text('content').notNull(),
    contentHash: varchar('content_hash', { length: 128 }).notNull(),
    channel: varchar('channel', {
      length: 64,
      enum: KNOWLEDGE_CHANNELS
    })
      .notNull()
      .default('mentor_upload'),
    senderRole: varchar('sender_role', {
      length: 64,
      enum: KNOWLEDGE_SENDER_ROLES
    })
      .notNull()
      .default('mentor'),
    uploadedBy: varchar('uploaded_by', { length: USER_ID_LENGTH }),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('knowledge_documents_status_priority_expires_idx').on(
      table.status,
      table.priority,
      table.expiresAt
    ),
    index('knowledge_documents_domain_authority_status_idx').on(
      table.domain,
      table.authority,
      table.status
    ),
    index('knowledge_documents_content_hash_idx').on(table.contentHash),
    index('knowledge_documents_supersedes_id_idx').on(table.supersedesId),
    index('knowledge_documents_effective_date_idx').on(table.effectiveDate),
    index('knowledge_documents_college_status_idx').on(
      table.college,
      table.status
    ),
    pgPolicy('knowledge_documents_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('knowledge_documents_mentor_manage', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: collegeMentorOrSystemWriteCondition(table.college),
      withCheck: collegeMentorOrSystemWriteCondition(table.college)
    })
  ]
).enableRLS()

export type KnowledgeDocument = InferSelectModel<typeof knowledgeDocuments>
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert

// Knowledge chunks (hybrid pgvector + tsvector retrieval units)
export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    documentId: varchar('document_id', { length: ID_LENGTH })
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    heading: text('heading'),
    content: text('content').notNull(),
    containsTable: integer('contains_table').notNull().default(0),
    tokenCount: integer('token_count').notNull().default(0),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('english', left(coalesce(heading, '') || ' ' || coalesce(content, ''), 100000))`
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('knowledge_chunks_document_id_idx').on(table.documentId),
    index('knowledge_chunks_document_chunk_idx').on(
      table.documentId,
      table.chunkIndex
    ),
    index('knowledge_chunks_search_vector_idx').using(
      'gin',
      table.searchVector
    ),
    pgPolicy('knowledge_chunks_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('knowledge_chunks_mentor_manage', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: mentorOrSystemWriteCondition,
      withCheck: mentorOrSystemWriteCondition
    })
  ]
).enableRLS()

export type KnowledgeChunk = InferSelectModel<typeof knowledgeChunks>
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert

// Structured Eventum campus events
export const campusEvents = pgTable(
  'campus_events',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    college: collegeColumn(),
    title: text('title').notNull(),
    organizer: text('organizer').notNull(),
    authority: varchar('authority', {
      length: 32
    })
      .notNull()
      .default('joint'),
    category: varchar('category', { length: 64 }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    venue: text('venue'),
    campusLocation: text('campus_location'),
    onlineUrl: text('online_url'),
    registrationUrl: text('registration_url'),
    registrationDeadline: timestamp('registration_deadline', {
      withTimezone: true
    }),
    eligibility: text('eligibility'),
    guidelines: text('guidelines'),
    resultsSummary: text('results_summary'),
    resultsUrl: text('results_url'),
    sourceUrl: text('source_url'),
    status: varchar('status', {
      length: 32,
      enum: CAMPUS_EVENT_STATUSES
    })
      .notNull()
      .default('upcoming'),
    uploadedBy: varchar('uploaded_by', { length: USER_ID_LENGTH }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('campus_events_status_start_idx').on(table.status, table.startAt),
    index('campus_events_registration_deadline_idx').on(
      table.registrationDeadline
    ),
    index('campus_events_college_start_idx').on(table.college, table.startAt),
    pgPolicy('campus_events_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('campus_events_mentor_manage', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: collegeMentorOrSystemWriteCondition(table.college),
      withCheck: collegeMentorOrSystemWriteCondition(table.college)
    })
  ]
).enableRLS()

export type CampusEvent = InferSelectModel<typeof campusEvents>
export type NewCampusEvent = typeof campusEvents.$inferInsert

// Deterministic verified official portal deep-link registry (Tier 3 handoffs)
export const officialPortals = pgTable(
  'official_portals',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    college: collegeColumn(),
    portalKey: varchar('portal_key', { length: 64 }).notNull(),
    name: text('name').notNull(),
    authority: varchar('authority', {
      length: 32
    }).notNull(),
    url: text('url').notNull(),
    requiresLogin: integer('requires_login').notNull().default(1),
    capabilities: text('capabilities').notNull(),
    navigationSteps: text('navigation_steps').notNull(),
    supportContact: text('support_contact'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: varchar('updated_by', { length: USER_ID_LENGTH }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('official_portals_authority_idx').on(table.authority),
    uniqueIndex('official_portals_college_portal_key_idx').on(
      table.college,
      table.portalKey
    ),
    pgPolicy('official_portals_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('official_portals_mentor_manage', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: collegeMentorOrSystemWriteCondition(table.college),
      withCheck: collegeMentorOrSystemWriteCondition(table.college)
    })
  ]
).enableRLS()

export type OfficialPortal = InferSelectModel<typeof officialPortals>
export type NewOfficialPortal = typeof officialPortals.$inferInsert

// Abstention gap logging & outdated citation flags for weekly mentor review
export const unansweredQueries = pgTable(
  'unanswered_queries',
  {
    id: varchar('id', { length: ID_LENGTH })
      .primaryKey()
      .$defaultFn(() => generateId()),
    college: collegeColumn(),
    userId: varchar('user_id', { length: USER_ID_LENGTH }),
    chatId: varchar('chat_id', { length: ID_LENGTH }),
    query: text('query').notNull(),
    domain: varchar('domain', {
      length: 64,
      enum: KNOWLEDGE_DOMAINS
    })
      .notNull()
      .default('general'),
    cohort: text('cohort'),
    reason: text('reason').notNull(),
    flaggedDocumentId: varchar('flagged_document_id', {
      length: ID_LENGTH
    }).references(() => knowledgeDocuments.id, { onDelete: 'set null' }),
    kind: varchar('kind', {
      length: 32,
      enum: UNANSWERED_QUERY_KINDS
    })
      .notNull()
      .default('abstention'),
    status: varchar('status', {
      length: 32,
      enum: UNANSWERED_QUERY_STATUSES
    })
      .notNull()
      .default('open'),
    resolvedBy: varchar('resolved_by', { length: USER_ID_LENGTH }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  table => [
    index('unanswered_queries_status_created_idx').on(
      table.status,
      table.createdAt
    ),
    index('unanswered_queries_domain_idx').on(table.domain),
    index('unanswered_queries_college_status_idx').on(
      table.college,
      table.status
    ),
    index('unanswered_queries_flagged_document_idx').on(
      table.flaggedDocumentId
    ),
    pgPolicy('unanswered_queries_public_select', {
      as: 'permissive',
      for: 'select',
      to: 'public',
      using: sql`true`
    }),
    pgPolicy('unanswered_queries_public_insert', {
      as: 'permissive',
      for: 'insert',
      to: 'public',
      withCheck: sql`true`
    }),
    pgPolicy('unanswered_queries_mentor_manage', {
      as: 'permissive',
      for: 'update',
      to: 'public',
      using: collegeMentorOrSystemWriteCondition(table.college),
      withCheck: collegeMentorOrSystemWriteCondition(table.college)
    }),
    pgPolicy('unanswered_queries_mentor_delete', {
      as: 'permissive',
      for: 'delete',
      to: 'public',
      using: collegeMentorOrSystemWriteCondition(table.college)
    })
  ]
).enableRLS()

export type UnansweredQuery = InferSelectModel<typeof unansweredQueries>
export type NewUnansweredQuery = typeof unansweredQueries.$inferInsert

// Better Auth tables (user, session, account, verification, invitations)
// are defined in lib/auth/better-auth/schema.ts and re-exported here so the
// canonical schema module — and drizzle-kit generation anchored on it —
// covers every table in the database.
export * from '../auth/better-auth/schema'
