import { CollegeLoginPage } from '@/components/college/college-login-page'

// Capabilities and login domains depend on runtime env.
export const dynamic = 'force-dynamic'

export default async function CollegeStudentLoginPage(props: {
  params: Promise<{ college: string }>
  searchParams: Promise<{ next?: string; error?: string; college?: string }>
}) {
  const { college } = await props.params
  return (
    <CollegeLoginPage
      college={college}
      mode="student"
      searchParams={await props.searchParams}
    />
  )
}
