'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

import {
  crawlOfficialUrlAction,
  flagDocumentCitationAction,
  type MentorPortalOverview,
  resolveUnansweredQueryAction,
  reviewUrgentUpdateAction,
  saveCampusEventAction,
  saveOfficialPortalAction,
  seedOfficialPortalsAction,
  submitUrgentUpdateAction,
  updateCampusEventStatusAction,
  uploadKnowledgeDocumentAction
} from '@/lib/actions/mentor'
import type { College } from '@/lib/colleges/registry'
import {
  CAMPUS_EVENT_STATUSES,
  type CampusEventStatus,
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_PRIORITIES,
  KNOWLEDGE_SOURCE_LABELS,
  KNOWLEDGE_SOURCE_SYSTEMS,
  type KnowledgeAuthority,
  type KnowledgeDomain,
  type KnowledgePriority,
  type KnowledgeSourceSystem
} from '@/lib/db/schema'
import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type TabKey = 'documents' | 'urgent' | 'events' | 'portals' | 'gaps'

interface MentorPortalClientProps {
  initialData: MentorPortalOverview
  /** The college this mentor manages; every record is saved under it. */
  college: College
  /** Issuing authorities a mentor may pick: their college, partners, joint. */
  authorities: { value: string; label: string }[]
  /** Official web domains the crawler accepts for this college. */
  officialDomains: string[]
}

function formatTimestamp(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function MentorPortalClient({
  initialData,
  college: collegeConfig,
  authorities,
  officialDomains
}: MentorPortalClientProps) {
  const college = collegeConfig.slug
  const eventsLabel = collegeConfig.eventsLabel || 'Campus events'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabKey>('documents')

  // Tab 1: Document upload & crawl state
  const [docTitle, setDocTitle] = useState('')
  const [docDomain, setDocDomain] = useState<KnowledgeDomain>('examinations')
  const [docSourceSystem, setDocSourceSystem] =
    useState<KnowledgeSourceSystem>('official_notice')
  const [docAuthority, setDocAuthority] = useState<KnowledgeAuthority>(college)
  const [docPriority, setDocPriority] = useState<KnowledgePriority>('standard')
  const [docProgram, setDocProgram] = useState('')
  const [docSemester, setDocSemester] = useState('')
  const [docSquad, setDocSquad] = useState('')
  const [docResidency, setDocResidency] = useState('')
  const [docEffectiveDate, setDocEffectiveDate] = useState('')
  const [docExpiresAt, setDocExpiresAt] = useState('')
  const [docSupersedesTopic, setDocSupersedesTopic] = useState('')
  const [docSourceUrl, setDocSourceUrl] = useState('')
  const [docContent, setDocContent] = useState('')

  const [crawlUrl, setCrawlUrl] = useState('')
  const [crawlDomain, setCrawlDomain] = useState<KnowledgeDomain>('admissions')
  const [crawlTitle, setCrawlTitle] = useState('')

  // Tab 2: Urgent update quick-post state
  const [urgentText, setUrgentText] = useState('')
  const [urgentChannel, setUrgentChannel] = useState<
    'whatsapp_forward' | 'gchat'
  >('whatsapp_forward')
  const [urgentSenderRole, setUrgentSenderRole] = useState<
    'mentor' | 'student_cr' | 'official_space'
  >('mentor')
  const [urgentThreadContext, setUrgentThreadContext] = useState('')

  // Tab 3: campus event state
  const [eventTitle, setEventTitle] = useState('')
  const [eventOrganizer, setEventOrganizer] = useState(collegeConfig.shortName)
  const [eventAuthority, setEventAuthority] =
    useState<KnowledgeAuthority>(college)
  const [eventCategory, setEventCategory] = useState('Hackathon')
  const [eventStartAt, setEventStartAt] = useState('')
  const [eventEndAt, setEventEndAt] = useState('')
  const [eventVenue, setEventVenue] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventRegUrl, setEventRegUrl] = useState('')
  const [eventRegDeadline, setEventRegDeadline] = useState('')
  const [eventEligibility, setEventEligibility] = useState('')
  const [eventGuidelines, setEventGuidelines] = useState('')
  const [eventStatus, setEventStatus] = useState<CampusEventStatus>('upcoming')

  // Tab 4: Official Portal state
  const [portalKey, setPortalKey] = useState('')
  const [portalName, setPortalName] = useState('')
  const [portalAuthority, setPortalAuthority] =
    useState<KnowledgeAuthority>(college)
  const [portalUrl, setPortalUrl] = useState('')
  const [portalRequiresLogin, setPortalRequiresLogin] = useState(true)
  const [portalCapabilities, setPortalCapabilities] = useState('')
  const [portalSteps, setPortalSteps] = useState('')
  const [portalContact, setPortalContact] = useState('')

  const openGapCount = initialData.unansweredQueries.filter(
    q => q.status === 'open'
  ).length

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    {
      key: 'documents',
      label: 'Campus Circulars & Guides',
      count: initialData.documents.length
    },
    {
      key: 'urgent',
      label: 'Urgent Updates & Queue',
      count: initialData.pendingDocuments.length
    },
    {
      key: 'events',
      label: eventsLabel,
      count: initialData.events.length
    },
    {
      key: 'portals',
      label: 'Official Portals',
      count: initialData.portals.length
    },
    {
      key: 'gaps',
      label: 'Unanswered & Flags',
      count: openGapCount
    }
  ]

  const refreshData = () => {
    router.refresh()
  }

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await uploadKnowledgeDocumentAction({
        title: docTitle,
        content: docContent,
        domain: docDomain,
        sourceSystem: docSourceSystem,
        authority: docAuthority,
        priority: docPriority,
        program: docProgram || null,
        semester: docSemester || null,
        squad: docSquad || null,
        residency: docResidency || null,
        effectiveDate: docEffectiveDate || null,
        expiresAt: docExpiresAt || null,
        supersedesTopic: docSupersedesTopic || null,
        sourceUrl: docSourceUrl || null
      })

      if (!res.success) {
        toast.error(res.error ?? 'Failed to upload document')
        return
      }

      if (res.deduplicated) {
        toast.info('Identical document already active in Knowledge Base.')
      } else {
        toast.success(
          `Ingested ${res.chunkCount} chunks${res.supersededCount ? ` (superseded ${res.supersededCount} prior notice)` : ''}.`
        )
        setDocTitle('')
        setDocContent('')
        setDocSupersedesTopic('')
      }
      refreshData()
    })
  }

  const handleCrawlOfficialUrl = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await crawlOfficialUrlAction({
        url: crawlUrl,
        domain: crawlDomain,
        title: crawlTitle || undefined
      })

      if (!res.success) {
        toast.error(res.error ?? 'Official crawl failed')
        return
      }

      toast.success(
        res.deduplicated
          ? 'Page already indexed with identical content.'
          : `Crawled and indexed ${res.chunkCount} chunks.`
      )
      setCrawlUrl('')
      setCrawlTitle('')
      refreshData()
    })
  }

  const handleSubmitUrgentUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await submitUrgentUpdateAction({
        rawText: urgentText,
        channel: urgentChannel,
        senderRole: urgentSenderRole,
        threadContext: urgentThreadContext || undefined
      })

      if (!res.success) {
        toast.error(res.error ?? 'Urgent update submission failed')
        return
      }

      if (res.status === 'discarded') {
        toast.warning(
          `Discarded: ${res.discardReason ?? 'Noise or PII detected'}`
        )
      } else if (res.status === 'deduplicated') {
        toast.info('Duplicate urgent update already captured.')
      } else if (res.status === 'pending_review') {
        toast.success('Queued for 1-tap Mentor approval.')
      } else {
        toast.success(
          `Urgent update published (${res.chunkCount} chunks${res.supersededCount ? `, superseded ${res.supersededCount}` : ''}).`
        )
      }
      setUrgentText('')
      setUrgentThreadContext('')
      refreshData()
    })
  }

  const handleReviewDocument = (
    documentId: string,
    decision: 'approve' | 'archive' | 'supersede'
  ) => {
    startTransition(async () => {
      const res = await reviewUrgentUpdateAction({ documentId, decision })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to update status')
        return
      }
      toast.success(`Document marked as ${res.document?.status}.`)
      refreshData()
    })
  }

  const handleFlagCitation = (documentId: string) => {
    startTransition(async () => {
      const res = await flagDocumentCitationAction({
        documentId,
        reason: 'Flagged by mentor for review / potential outdated details'
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to flag document')
        return
      }
      toast.success('Added citation review flag to Unanswered & Flags queue.')
      refreshData()
    })
  }

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveCampusEventAction({
        title: eventTitle,
        organizer: eventOrganizer,
        authority: eventAuthority,
        category: eventCategory || null,
        startAt: eventStartAt,
        endAt: eventEndAt || null,
        venue: eventVenue || null,
        campusLocation: eventLocation || null,
        registrationUrl: eventRegUrl || null,
        registrationDeadline: eventRegDeadline || null,
        eligibility: eventEligibility || null,
        guidelines: eventGuidelines || null,
        status: eventStatus
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to save event')
        return
      }
      toast.success(`Saved event "${res.event?.title}".`)
      setEventTitle('')
      setEventVenue('')
      setEventRegUrl('')
      setEventGuidelines('')
      refreshData()
    })
  }

  const handleEventStatusChange = (
    eventId: string,
    status: CampusEventStatus
  ) => {
    startTransition(async () => {
      const res = await updateCampusEventStatusAction({ eventId, status })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to update event status')
        return
      }
      toast.success(`Event status updated to ${status}.`)
      refreshData()
    })
  }

  const handleSavePortal = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveOfficialPortalAction({
        portalKey,
        name: portalName,
        authority: portalAuthority,
        url: portalUrl,
        requiresLogin: portalRequiresLogin,
        capabilities: portalCapabilities,
        navigationSteps: portalSteps,
        supportContact: portalContact || null
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to save portal')
        return
      }
      toast.success(`Saved verified portal "${res.portal?.name}".`)
      refreshData()
    })
  }

  const handleSeedPortals = () => {
    startTransition(async () => {
      const res = await seedOfficialPortalsAction()
      if (!res.success) {
        toast.error(res.error ?? 'Failed to seed portals')
        return
      }
      toast.success(
        `Seeded ${res.portals?.length ?? 6} default official portals.`
      )
      refreshData()
    })
  }

  const handleResolveQuery = (id: string, status: 'resolved' | 'dismissed') => {
    startTransition(async () => {
      const res = await resolveUnansweredQueryAction({ id, status })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to update query log')
        return
      }
      toast.success(`Marked entry as ${status}.`)
      refreshData()
    })
  }

  return (
    <div className="space-y-6">
      {!initialData.dbReady && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Database Migration Required
            </CardTitle>
            <CardDescription>
              Run database migrations (`0023_add_rag_pipelines.sql`) with
              `pgvector` enabled to persist Knowledge Base documents, campus
              records, and gap logs. Static default portals are displayed below.
              {initialData.dbError ? ` (${initialData.dbError})` : ''}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            type="button"
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className="gap-2"
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <Badge
                variant={activeTab === tab.key ? 'secondary' : 'outline'}
                className="px-1.5 py-0 text-xs"
              >
                {tab.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Upload Campus Circular / Curriculum Guide
                </CardTitle>
                <CardDescription>
                  Preserves Markdown fee tables and timetables intact, generates
                  768-dim Gemini embeddings, and indexes into Postgres hybrid
                  RAG.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="doc-title">Document Title</Label>
                      <Input
                        id="doc-title"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        placeholder={`e.g. ${collegeConfig.shortName} End-Term Examination Form Circular (Nov 2026)`}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Domain</Label>
                      <Select
                        value={docDomain}
                        onValueChange={v => setDocDomain(v as KnowledgeDomain)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWLEDGE_DOMAINS.map(d => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Source System</Label>
                      <Select
                        value={docSourceSystem}
                        onValueChange={v =>
                          setDocSourceSystem(v as KnowledgeSourceSystem)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWLEDGE_SOURCE_SYSTEMS.map(s => (
                            <SelectItem key={s} value={s}>
                              {KNOWLEDGE_SOURCE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Authority</Label>
                      <Select
                        value={docAuthority}
                        onValueChange={v =>
                          setDocAuthority(v as KnowledgeAuthority)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {authorities.map(a => (
                            <SelectItem key={a.value} value={a.value}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select
                        value={docPriority}
                        onValueChange={v =>
                          setDocPriority(v as KnowledgePriority)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWLEDGE_PRIORITIES.map(p => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-program">Program</Label>
                      <Input
                        id="doc-program"
                        value={docProgram}
                        onChange={e => setDocProgram(e.target.value)}
                        placeholder="B.Tech CSE"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-semester">Semester</Label>
                      <Input
                        id="doc-semester"
                        value={docSemester}
                        onChange={e => setDocSemester(e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    {collegeConfig.squadLabel && (
                      <div className="space-y-1.5">
                        <Label htmlFor="doc-squad">
                          {collegeConfig.squadLabel}
                        </Label>
                        <Input
                          id="doc-squad"
                          value={docSquad}
                          onChange={e => setDocSquad(e.target.value)}
                          placeholder={`${collegeConfig.squadLabel} 42`}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-residency">
                        {collegeConfig.residencyLabel || 'Residency'}
                      </Label>
                      <Input
                        id="doc-residency"
                        value={docResidency}
                        onChange={e => setDocResidency(e.target.value)}
                        placeholder="hosteller"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-effective">Effective Date</Label>
                      <Input
                        id="doc-effective"
                        type="datetime-local"
                        value={docEffectiveDate}
                        onChange={e => setDocEffectiveDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-expires">Expires At (Optional)</Label>
                      <Input
                        id="doc-expires"
                        type="datetime-local"
                        value={docExpiresAt}
                        onChange={e => setDocExpiresAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="doc-supersedes">Supersedes Topic</Label>
                      <Input
                        id="doc-supersedes"
                        value={docSupersedesTopic}
                        onChange={e => setDocSupersedesTopic(e.target.value)}
                        placeholder="Optional prior circular title"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="doc-url">Source URL (Optional)</Label>
                    <Input
                      id="doc-url"
                      value={docSourceUrl}
                      onChange={e => setDocSourceUrl(e.target.value)}
                      placeholder={`${collegeConfig.website}/...`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="doc-content">
                      Markdown Content (Tables & Headings Preserved)
                    </Label>
                    <Textarea
                      id="doc-content"
                      rows={7}
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      placeholder="Paste circular text, Markdown fee table, or programme guide..."
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Ingesting...' : 'Ingest into Knowledge Base'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Crawl Official Web Page
                </CardTitle>
                <CardDescription>
                  Allowlisted strictly to{' '}
                  {officialDomains.map(domain => `\`${domain}\``).join(', ')}.
                  Extracts tables and headings directly into the KB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCrawlOfficialUrl} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="crawl-url">Official URL</Label>
                    <Input
                      id="crawl-url"
                      type="url"
                      value={crawlUrl}
                      onChange={e => setCrawlUrl(e.target.value)}
                      placeholder={`${collegeConfig.website}/admissions`}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Domain</Label>
                    <Select
                      value={crawlDomain}
                      onValueChange={v => setCrawlDomain(v as KnowledgeDomain)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KNOWLEDGE_DOMAINS.map(d => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="crawl-title">
                      Title Override (Optional)
                    </Label>
                    <Input
                      id="crawl-title"
                      value={crawlTitle}
                      onChange={e => setCrawlTitle(e.target.value)}
                      placeholder={`${collegeConfig.shortName} Admissions 2026`}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isPending}
                  >
                    {isPending ? 'Crawling...' : 'Fetch & Index Page'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Indexed Knowledge Documents ({initialData.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialData.documents.length === 0 ? (
                <p className="text-sm text-(--md-sys-color-on-surface-variant)">
                  No documents ingested yet. Upload a circular or crawl an
                  official page above.
                </p>
              ) : (
                initialData.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm">{doc.title}</span>
                        <Badge variant="outline">{doc.authority}</Badge>
                        <Badge variant="outline">{doc.domain}</Badge>
                        <Badge variant="secondary">{doc.sourceSystem}</Badge>
                        <Badge
                          variant={
                            doc.status === 'active' ? 'default' : 'outline'
                          }
                        >
                          {doc.status}
                        </Badge>
                        {doc.priority === 'urgent' && (
                          <Badge variant="destructive">urgent</Badge>
                        )}
                      </div>
                      <p className="text-xs text-(--md-sys-color-on-surface-variant) line-clamp-2">
                        {doc.content}
                      </p>
                      <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                        Effective: {formatTimestamp(doc.effectiveDate)}
                        {doc.expiresAt
                          ? ` · Expires: ${formatTimestamp(doc.expiresAt)}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {doc.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() =>
                              handleReviewDocument(doc.id, 'supersede')
                            }
                          >
                            Supersede
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleFlagCitation(doc.id)}
                          >
                            Flag Outdated
                          </Button>
                        </>
                      )}
                      {doc.status !== 'archived' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() =>
                            handleReviewDocument(doc.id, 'archive')
                          }
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'urgent' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Urgent Updates Quick-Post Inbox
              </CardTitle>
              <CardDescription>
                Paste a WhatsApp forward or Google Chat notice. Gemini 3.1
                Flash-Lite deduplicates, filters noise/PII, tags cohort & TTL,
                and enforces the sender trust gate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitUrgentUpdate} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select
                      value={urgentChannel}
                      onValueChange={v =>
                        setUrgentChannel(v as 'whatsapp_forward' | 'gchat')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp_forward">
                          WhatsApp Forward
                        </SelectItem>
                        <SelectItem value="gchat">Google Chat Space</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sender Role (Trust Gate)</Label>
                    <Select
                      value={urgentSenderRole}
                      onValueChange={v =>
                        setUrgentSenderRole(
                          v as 'mentor' | 'student_cr' | 'official_space'
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mentor">
                          Mentor (Auto-Publish)
                        </SelectItem>
                        <SelectItem value="official_space">
                          Official Broadcast Space (Auto-Publish)
                        </SelectItem>
                        <SelectItem value="student_cr">
                          Student CR Forward (Pending Queue)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="urgent-thread">
                    Thread / Parent Context (Optional)
                  </Label>
                  <Input
                    id="urgent-thread"
                    value={urgentThreadContext}
                    onChange={e => setUrgentThreadContext(e.target.value)}
                    placeholder="e.g. DSA session room update"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="urgent-text">Forwarded Message</Label>
                  <Textarea
                    id="urgent-text"
                    rows={5}
                    value={urgentText}
                    onChange={e => setUrgentText(e.target.value)}
                    placeholder="e.g. Today's 2 PM Data Structures session moved from Room B-104 to Lab 3."
                    required
                  />
                </div>

                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Processing...' : 'Normalize & Submit Update'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                1-Tap Mentor Approval Queue (
                {initialData.pendingDocuments.length})
              </CardTitle>
              <CardDescription>
                Student CR forwards wait here until a mentor approves them in 1
                tap, blocking unverified rumors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialData.pendingDocuments.length === 0 ? (
                <p className="text-sm text-(--md-sys-color-on-surface-variant)">
                  No pending updates awaiting approval.
                </p>
              ) : (
                initialData.pendingDocuments.map(doc => (
                  <div key={doc.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{doc.title}</span>
                      <Badge variant="outline">{doc.channel}</Badge>
                      <Badge variant="secondary">{doc.domain}</Badge>
                      <Badge variant="outline">{doc.authority}</Badge>
                    </div>
                    <p className="text-xs text-(--md-sys-color-on-surface-variant) whitespace-pre-wrap">
                      {doc.content}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReviewDocument(doc.id, 'approve')}
                      >
                        1-Tap Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleReviewDocument(doc.id, 'archive')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Campus Event</CardTitle>
              <CardDescription>
                Stored in structured `campus_events`. Registration links
                automatically stop surfacing once `registrationDeadline` passes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input
                    id="event-title"
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder={`${collegeConfig.shortName} Buildathon 2026`}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-organizer">Organizer</Label>
                    <Input
                      id="event-organizer"
                      value={eventOrganizer}
                      onChange={e => setEventOrganizer(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Authority</Label>
                    <Select
                      value={eventAuthority}
                      onValueChange={v =>
                        setEventAuthority(v as KnowledgeAuthority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {authorities.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-category">Category</Label>
                    <Input
                      id="event-category"
                      value={eventCategory}
                      onChange={e => setEventCategory(e.target.value)}
                      placeholder="Hackathon / Cultural / Tech"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={eventStatus}
                      onValueChange={v =>
                        setEventStatus(v as CampusEventStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPUS_EVENT_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-start">Starts At</Label>
                    <Input
                      id="event-start"
                      type="datetime-local"
                      value={eventStartAt}
                      onChange={e => setEventStartAt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-end">Ends At (Optional)</Label>
                    <Input
                      id="event-end"
                      type="datetime-local"
                      value={eventEndAt}
                      onChange={e => setEventEndAt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-venue">Venue</Label>
                    <Input
                      id="event-venue"
                      value={eventVenue}
                      onChange={e => setEventVenue(e.target.value)}
                      placeholder="Main Auditorium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-location">Campus Location</Label>
                    <Input
                      id="event-location"
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                      placeholder="Main campus, Block A"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-reg-url">Registration URL</Label>
                    <Input
                      id="event-reg-url"
                      type="url"
                      value={eventRegUrl}
                      onChange={e => setEventRegUrl(e.target.value)}
                      placeholder={`${collegeConfig.website}/events/register`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-reg-deadline">
                      Registration Deadline
                    </Label>
                    <Input
                      id="event-reg-deadline"
                      type="datetime-local"
                      value={eventRegDeadline}
                      onChange={e => setEventRegDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-eligibility">Eligibility</Label>
                  <Input
                    id="event-eligibility"
                    value={eventEligibility}
                    onChange={e => setEventEligibility(e.target.value)}
                    placeholder="All Sem 1-4 students"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-guidelines">
                    Participation Guidelines
                  </Label>
                  <Textarea
                    id="event-guidelines"
                    rows={3}
                    value={eventGuidelines}
                    onChange={e => setEventGuidelines(e.target.value)}
                    placeholder="Team size 2-4, bring student ID, attendance waiver applicable..."
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Publish Campus Event'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {eventsLabel} ({initialData.events.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialData.events.length === 0 ? (
                <p className="text-sm text-(--md-sys-color-on-surface-variant)">
                  No structured events published yet.
                </p>
              ) : (
                initialData.events.map(event => (
                  <div
                    key={event.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm">
                          {event.title}
                        </span>
                        <Badge variant="outline">{event.status}</Badge>
                        {event.category && (
                          <Badge variant="secondary">{event.category}</Badge>
                        )}
                      </div>
                      <Select
                        value={event.status}
                        onValueChange={v =>
                          handleEventStatusChange(
                            event.id,
                            v as CampusEventStatus
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPUS_EVENT_STATUSES.map(s => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                      {event.organizer} · Starts:{' '}
                      {formatTimestamp(event.startAt)}
                      {event.venue ? ` · Venue: ${event.venue}` : ''}
                    </p>
                    {event.registrationDeadline && (
                      <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                        Reg Deadline:{' '}
                        {formatTimestamp(event.registrationDeadline)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'portals' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    Official Portal Registry
                  </CardTitle>
                  <CardDescription>
                    Deterministic Tier 3 handoff links for personal student
                    records.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSeedPortals}
                >
                  Seed 6 Default Portals
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePortal} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="portal-key">Portal Key</Label>
                    <Input
                      id="portal-key"
                      value={portalKey}
                      onChange={e => setPortalKey(e.target.value)}
                      placeholder={`${college}_erp`}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Authority</Label>
                    <Select
                      value={portalAuthority}
                      onValueChange={v =>
                        setPortalAuthority(v as KnowledgeAuthority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {authorities.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal-name">Display Name</Label>
                  <Input
                    id="portal-name"
                    value={portalName}
                    onChange={e => setPortalName(e.target.value)}
                    placeholder={`${collegeConfig.shortName} ERP Portal`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal-url">Verified URL</Label>
                  <Input
                    id="portal-url"
                    type="url"
                    value={portalUrl}
                    onChange={e => setPortalUrl(e.target.value)}
                    placeholder={`${collegeConfig.website}/...`}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="portal-login"
                    checked={portalRequiresLogin}
                    onCheckedChange={checked =>
                      setPortalRequiresLogin(checked === true)
                    }
                  />
                  <Label htmlFor="portal-login">
                    Requires student login (Tier 3 handoff)
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal-cap">Capabilities</Label>
                  <Textarea
                    id="portal-cap"
                    rows={2}
                    value={portalCapabilities}
                    onChange={e => setPortalCapabilities(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal-steps">Navigation Steps</Label>
                  <Textarea
                    id="portal-steps"
                    rows={3}
                    value={portalSteps}
                    onChange={e => setPortalSteps(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal-contact">Support Contact</Label>
                  <Input
                    id="portal-contact"
                    value={portalContact}
                    onChange={e => setPortalContact(e.target.value)}
                    placeholder={`${collegeConfig.shortName} Registrar Office`}
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save Official Portal'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Registered Portals ({initialData.portals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialData.portals.map(portal => (
                <div
                  key={portal.id}
                  className="space-y-1.5 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-sm">{portal.name}</span>
                      <Badge variant="outline">{portal.authority}</Badge>
                      <Badge variant="secondary">{portal.portalKey}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPortalKey(portal.portalKey)
                        setPortalName(portal.name)
                        setPortalAuthority(portal.authority)
                        setPortalUrl(portal.url)
                        setPortalRequiresLogin(portal.requiresLogin !== 0)
                        setPortalCapabilities(portal.capabilities)
                        setPortalSteps(portal.navigationSteps)
                        setPortalContact(portal.supportContact ?? '')
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-xs text-(--md-sys-color-on-surface-variant) break-all">
                    {portal.url}
                  </p>
                  <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                    {portal.capabilities}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'gaps' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Unanswered Queries & Outdated Citation Flags (
              {initialData.unansweredQueries.length})
            </CardTitle>
            <CardDescription>
              Logged automatically when SERA abstains due to missing/conflicting
              campus data or when a document citation is flagged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.unansweredQueries.length === 0 ? (
              <p className="text-sm text-(--md-sys-color-on-surface-variant)">
                No unanswered queries or citation flags logged yet.
              </p>
            ) : (
              initialData.unansweredQueries.map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between',
                    entry.status !== 'open' && 'opacity-70'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-sm">{entry.query}</span>
                      <Badge variant="outline">{entry.kind}</Badge>
                      <Badge variant="secondary">{entry.domain}</Badge>
                      <Badge
                        variant={
                          entry.status === 'open' ? 'destructive' : 'outline'
                        }
                      >
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                      Reason: {entry.reason}
                    </p>
                    <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                      Logged: {formatTimestamp(entry.createdAt)}
                      {entry.cohort ? ` · Cohort: ${entry.cohort}` : ''}
                    </p>
                  </div>
                  {entry.status === 'open' && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleResolveQuery(entry.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          handleResolveQuery(entry.id, 'dismissed')
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
