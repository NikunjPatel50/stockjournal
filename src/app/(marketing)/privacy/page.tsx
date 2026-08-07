import type { Metadata } from "next";
import {
  LegalDocumentPage,
  LegalSection,
} from "@/components/marketing/legal-document-page";
import { BRAND_NAME } from "@/components/brand-logo";
import { getSeoMetadata } from "@/lib/seo-pages";

const EFFECTIVE = "July 25, 2026";

export const metadata: Metadata = getSeoMetadata("privacy");

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage title="Privacy Policy" effectiveDate={EFFECTIVE}>
      <LegalSection id="overview" title="Overview">
        <p>
          {BRAND_NAME} (&quot;we,&quot; &quot;us&quot;) operates the SwingTradingLog
          swing trading journal at swingtradinglog.com. This policy explains what
          we collect when you create an account, use the app, or contact us, and
          what we do not do with your information.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account data:</strong> email
            address, password (stored securely by our auth provider), and
            optional profile details you enter in Settings.
          </li>
          <li>
            <strong className="text-foreground">Journal data:</strong> trades,
            notes, tags, goals, and preferences you save in the product. This is
            stored in your account so you can access it across sessions.
          </li>
          <li>
            <strong className="text-foreground">Feedback:</strong> messages and
            optional contact email you submit through the in-app Feedback form.
          </li>
          <li>
            <strong className="text-foreground">Usage analytics:</strong> we may
            use privacy-focused analytics (such as Microsoft Clarity) to
            understand how pages are used. These tools do not receive your trade
            journal contents.
          </li>
          <li>
            <strong className="text-foreground">Technical data:</strong> standard
            server logs (IP address, browser type, timestamps) for security and
            reliability.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, secure, and improve the journal and related features.</li>
          <li>Authenticate you and send account-related emails (verification, password reset).</li>
          <li>Respond to feedback and support requests.</li>
          <li>Monitor abuse, fraud, and outages.</li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> sell your personal
          information or trade data to third parties.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="Sharing & public links">
        <p>
          Trade sharing is <strong className="text-foreground">opt-in</strong>.
          If you generate a shareable trade card or public link, only the fields
          included in that share are visible to anyone with the link. You can
          disable sharing in Display settings.
        </p>
        <p>
          We use infrastructure providers (including InsForge for database and
          authentication, and email delivery services for transactional mail) to
          run the service. They process data on our behalf under their own terms
          and security practices.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Retention & deletion">
        <p>
          We keep your account and journal data while your account is active. You
          may request deletion of your account by contacting us; we will remove
          or anonymize personal data except where we must retain records for
          legal or security reasons.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="Your choices">
        <p>
          You can update profile and display settings in the app, export trade
          data from Settings, and toggle trade sharing. For access or deletion
          requests, use Feedback after signing in or email the address listed
          below.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          We use industry-standard measures including encrypted connections
          (HTTPS), authenticated sessions, and row-level security on backend data.
          No method of transmission or storage is 100% secure; use a strong,
          unique password for your account.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          The service is not directed at children under 13. We do not knowingly
          collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this policy from time to time. We will post the revised
          version on this page and update the effective date above.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about privacy? Submit Feedback from your account after signing
          in at{" "}
          <a
            href="/login"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            swingtradinglog.com/login
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocumentPage>
  );
}
