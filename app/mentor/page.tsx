import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export const dynamic = 'force-dynamic'

const MENTOR_WORKFLOWS = [
  {
    title: 'Campus Circulars & Curriculum Uploads',
    status: 'Ingestion Pipeline Next',
    description:
      'Upload JECRC E-Notices, fee circulars, timetables, Kalvium curriculum modules, assessment rubrics, project briefs, and mentorship guides tagged with cohort and effective dates.'
  },
  {
    title: 'Urgent Updates Quick-Post & Approval Queue',
    status: 'Ingestion Pipeline Next',
    description:
      'Capture unstructured WhatsApp forwards, screenshots, and Google Chat announcements with automatic expiry TTL and superseding of prior notices.'
  },
  {
    title: 'Eventum Event Manager',
    status: 'Ingestion Pipeline Next',
    description:
      'Maintain structured upcoming campus events, schedules, venues, registration deadlines, participation guidelines, and published results.'
  },
  {
    title: 'Official Portal Deep-Link Registry',
    status: 'Ingestion Pipeline Next',
    description:
      'Keep verified URLs and navigation steps current for JECRC ERP, Result, Parent, Student Support, and Kalvium Dashboard handoffs.'
  },
  {
    title: 'Unanswered Queries & Outdated Citation Flags',
    status: 'Ingestion Pipeline Next',
    description:
      'Review student questions where Sera abstained or cited documents were flagged as outdated to keep the knowledge base authoritative.'
  }
] as const

export default async function MentorPortalPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/mentor?next=%2Fmentor')
  }
  if (user.userType !== 'mentor') {
    redirect('/')
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-8 pt-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Mentor Data Portal</h1>
              <Badge variant="secondary">Mentor</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as {user.email}. Mentors curate and verify official
              Kalvium X JECRC knowledge sources for Sera.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Sera Chat</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MENTOR_WORKFLOWS.map(workflow => (
            <Card key={workflow.title}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{workflow.title}</CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    {workflow.status}
                  </Badge>
                </div>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
