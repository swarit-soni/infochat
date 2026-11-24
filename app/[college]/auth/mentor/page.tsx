import { CollegeMentorLoginPage } from '@/components/college/college-login-page'

// Capabilities and mentor domains depend on runtime env.
export const dynamic = 'force-dynamic'

export default async function CollegeMentorLogin(props: {
  params: Promise<{ college: string }>
  searchParams: Promise<{ next?: string; error?: string; college?: string }>
}) {
  const { college } = await props.params
  return (
    <CollegeMentorLoginPage
      college={college}
      searchParams={await props.searchParams}
    />
  )
}
