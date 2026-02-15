import { getAccessTokenPayload } from "@/lib/access-token"
import LandingContent from "@/components/LandingContent"

export default async function HomePage() {
  const tokenPayload = await getAccessTokenPayload()

  const primaryLink = tokenPayload
    ? { href: "/admin", label: "Dashboard" }
    : { href: "/login", label: "Admin Login" }

  const heroLink = tokenPayload
    ? { href: "/admin", label: "Dashboard" }
    : { href: "/login", label: "Get Started" }

  return <LandingContent primaryLink={primaryLink} heroLink={heroLink} />
}
