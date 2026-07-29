import type { Metadata } from "next";
import {
  LegalDocumentPage,
  LegalSection,
} from "@/components/marketing/legal-document-page";
import { BRAND_NAME } from "@/components/brand-logo";
import { buildPageMetadata } from "@/lib/site";

const EFFECTIVE = "July 25, 2026";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: `Terms for using the ${BRAND_NAME} swing trading journal and related services.`,
  path: "/terms",
});

export default function TermsOfServicePage() {
  return (
    <LegalDocumentPage title="Terms of Service" effectiveDate={EFFECTIVE}>
      <LegalSection id="agreement" title="Agreement">
        <p>
          By accessing or using {BRAND_NAME} (&quot;the Service&quot;), you agree
          to these Terms of Service. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection id="service" title="The service">
        <p>
          {BRAND_NAME} is a swing trading journal and analytics tool provided
          during beta at no charge unless we announce otherwise. Features may
          change, be added, or be removed as we improve the product.
        </p>
        <p>
          The Service is for <strong className="text-foreground">record-keeping
          and education</strong>. It is not a broker, investment adviser, or
          tax preparer. We do not execute trades or provide personalized
          investment advice.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate registration information and keep your credentials secure.</li>
          <li>You are responsible for activity under your account.</li>
          <li>You must be old enough to form a binding contract in your jurisdiction.</li>
          <li>One person per account unless we explicitly allow team features.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="Your content">
        <p>
          You retain ownership of trade logs, notes, and other content you enter.
          You grant us a limited license to host, process, and display that
          content solely to operate the Service (including optional public share
          links you create).
        </p>
        <p>
          You agree not to upload unlawful content, malware, or material that
          infringes others&apos; rights.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Probe, scan, or test the vulnerability of the Service without permission.</li>
          <li>Scrape or overload our systems in a way that harms other users.</li>
          <li>Misrepresent shared trade cards or impersonate others.</li>
          <li>Use the Service for any illegal purpose.</li>
        </ul>
      </LegalSection>

      <LegalSection id="beta" title="Beta disclaimer">
        <p>
          The Service is offered <strong className="text-foreground">as is</strong> during
          beta. We strive for reliability but do not guarantee uninterrupted or
          error-free operation. Back up important data using export tools in
          Settings.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {BRAND_NAME} and its operators
          are not liable for indirect, incidental, special, consequential, or
          punitive damages, or for trading losses, lost profits, or lost data
          arising from your use of the Service.
        </p>
        <p>
          Our total liability for any claim related to the Service is limited to
          the greater of (a) amounts you paid us in the twelve months before the
          claim or (b) one hundred U.S. dollars.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="Indemnity">
        <p>
          You agree to indemnify and hold harmless {BRAND_NAME} from claims
          arising out of your misuse of the Service or violation of these Terms.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          access if you violate these Terms or if we discontinue the Service. Sections
          that by nature should survive (limitations, indemnity, governing law) will
          survive termination.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to
          conflict-of-law rules, except where mandatory local consumer protections
          apply. Courts in Surat, Gujarat, India shall have exclusive jurisdiction
          for disputes, unless applicable law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may modify these Terms. Continued use after the effective date of
          updated Terms constitutes acceptance. Material changes will be reflected
          on this page.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these Terms? Use in-app{" "}
          <a
            href="/feedback"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Feedback
          </a>{" "}
          after signing in, or visit{" "}
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
