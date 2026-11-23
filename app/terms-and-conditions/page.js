import LegalPage from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal";

export const metadata = legalMetadata("terms");

export default function Page() {
  return <LegalPage slug="terms" />;
}
