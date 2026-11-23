import LegalPage from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal";

export const metadata = legalMetadata("privacy");

export default function Page() {
  return <LegalPage slug="privacy" />;
}
