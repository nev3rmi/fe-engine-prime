import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard as this is a dashboard application
  redirect('/dashboard')
}
