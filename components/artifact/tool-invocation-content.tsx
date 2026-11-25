'use client'

import type { ToolPart } from '@/lib/types/ai'

import { SearchArtifactContent } from '@/components/artifact/search-artifact-content'

export function ToolInvocationContent({ part }: { part: ToolPart }) {
  switch (part.type) {
    case 'tool-search':
    case 'tool-searchCampusKnowledge':
    case 'tool-queryEvents':
    case 'tool-getOfficialPortalLinks':
    case 'tool-getStudentRecords':
    case 'tool-searchOfficialWeb':
      return <SearchArtifactContent tool={part as ToolPart<'search'>} />
    default:
      return <div className="p-4">Details for this tool are not available</div>
  }
}
