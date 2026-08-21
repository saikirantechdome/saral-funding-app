import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { BackBar } from "@/src/components/StepBar";

const LAST_UPDATED = "6 August 2026";

const PRIVACY_SECTIONS = [
  {
    heading: "Introduction",
    body:
      "Saral Funding (\"we\", \"us\") is a government funding discovery and application platform for Indian MSMEs, operated by Techdome Solutions. This policy explains what information we collect through the app and how we use it.",
  },
  {
    heading: "Information We Collect",
    body:
      "• Mobile number, used to log you in via OTP\n" +
      "• Personal details you provide: name, age, gender, district, category\n" +
      "• Business details: business stage, industry, activity, turnover, employee count, funding required, GST and Udyam registration status\n" +
      "• Documents you upload for verification (e.g. Aadhaar, PAN, GST certificate, project reports)\n" +
      "• Consultation bookings and messages you send our AI advisor\n" +
      "• A push-notification token, if you allow notifications",
  },
  {
    heading: "How We Use Your Information",
    body:
      "We use your information to match you with relevant government schemes and bank offers, to let our advisory team assist you over consultation calls and WhatsApp, to verify documents you submit, and to send you notifications about scheme matches, document status, and upcoming consultations. Scheme matching uses an AI model (OpenAI) to generate personalised suggestions and explanations.",
  },
  {
    heading: "Document Storage",
    body:
      "Documents you upload are stored on Azure Blob Storage and are accessible only to you and to authorized Saral Funding team members reviewing your application — never made public.",
  },
  {
    heading: "Third-Party Services We Use",
    body:
      "• MSG91 — delivers your OTP by SMS\n" +
      "• OpenAI — powers scheme matching and the AI advisor chat\n" +
      "• Jitsi Meet — hosts consultation video calls (no account required)\n" +
      "• GoHighLevel — our internal CRM, used by our team to track your consultation and application\n" +
      "• Setu Account Aggregator — only if you separately opt in to share bank data for faster loan matching\n" +
      "• Expo — delivers push notifications to your device",
  },
  {
    heading: "Data Sharing",
    body:
      "We do not sell your personal information. It is shared only with the service providers above, as needed to run the app, and with the specific banks or scheme authorities you choose to apply to through our advisory team.",
  },
  {
    heading: "Your Choices",
    body:
      "You can update your profile and business details at any time from the app. To request deletion of your account, documents, or other data, contact us on WhatsApp or through your assigned advisor.",
  },
  {
    heading: "Data Security",
    body:
      "We use reasonable technical and organisational safeguards to protect your information, including encrypted transport (HTTPS) and access-controlled document storage. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    heading: "Children's Privacy",
    body:
      "Saral Funding is intended for business owners aged 18 and above. We do not knowingly collect information from anyone under 18.",
  },
  {
    heading: "Changes to This Policy",
    body:
      "We may update this policy as the app evolves. Continued use of the app after a change means you accept the updated policy.",
  },
  {
    heading: "Contact Us",
    body:
      "Questions about this policy? Reach us on WhatsApp Support from the Home screen.",
  },
];

const TERMS_SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body:
      "By creating an account and using Saral Funding, you agree to these terms. If you don't agree, please don't use the app.",
  },
  {
    heading: "What Saral Funding Is",
    body:
      "Saral Funding is a discovery and advisory platform that helps you find government schemes, subsidies, and bank loans you may be eligible for, and connects you with our advisory team for guidance. We are not a bank, lender, or government body, and we do not guarantee approval, disbursal, or eligibility for any scheme or loan — final decisions rest entirely with the relevant bank or government authority.",
  },
  {
    heading: "Eligibility",
    body:
      "You must be at least 18 years old, based in India, and provide a valid Indian mobile number to use this app.",
  },
  {
    heading: "Your Account",
    body:
      "Your account is tied to your mobile number and secured by OTP — keep your phone and OTPs private. You're responsible for all activity under your account.",
  },
  {
    heading: "Accuracy of Information",
    body:
      "Scheme and bank matches are only as good as the information you provide. You're responsible for the accuracy of your profile, business, and document details — incorrect information may lead to incorrect matches or rejected applications.",
  },
  {
    heading: "Not Financial or Legal Advice",
    body:
      "Scheme matches, readiness scores, and AI advisor responses are provided for general guidance only and are not financial, legal, or professional advice. Always verify scheme details with the official scheme authority or bank before relying on them.",
  },
  {
    heading: "Consultation Calls",
    body:
      "Free advisory consultation calls are subject to advisor availability and may be rescheduled. They are guidance sessions, not a guarantee of funding.",
  },
  {
    heading: "Document Uploads",
    body:
      "You confirm that you own or have the right to share any document you upload, and that it is accurate. Documents are used solely to support your funding applications and are reviewed by our team.",
  },
  {
    heading: "Prohibited Use",
    body:
      "Don't submit false information or documents, impersonate someone else, or misuse the platform (including the AI advisor or consultation booking) in ways that disrupt the service for others.",
  },
  {
    heading: "Suspension & Termination",
    body:
      "We may suspend or terminate accounts that violate these terms or misuse the platform.",
  },
  {
    heading: "Limitation of Liability",
    body:
      "Saral Funding and Techdome Solutions are not liable for decisions made by banks or government authorities on your applications, or for losses arising from information you provided inaccurately.",
  },
  {
    heading: "Governing Law",
    body:
      "These terms are governed by the laws of India.",
  },
  {
    heading: "Changes to These Terms",
    body:
      "We may update these terms as the app evolves. Continued use after a change means you accept the updated terms.",
  },
  {
    heading: "Contact Us",
    body:
      "Questions about these terms? Reach us on WhatsApp Support from the Home screen.",
  },
];

export default function Legal() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const isPrivacy = doc !== "terms";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="legal-screen">
      <BackBar title={isPrivacy ? "Privacy Policy" : "Terms of Service"} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.updatedPill}>
          <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
        </View>
        {sections.map((s, i) => (
          <View
            key={i}
            style={[styles.section, i !== sections.length - 1 && styles.sectionDivider]}
          >
            <View style={styles.headingRow}>
              <View style={styles.numBadge}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={styles.heading}>{s.heading}</Text>
            </View>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.attribution}
          onPress={() => Linking.openURL("https://icons8.com")}
          testID="icons8-attribution"
        >
          <Text style={styles.attributionText}>Some icons by Icons8</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attribution}
          onPress={() => Linking.openURL("https://commons.wikimedia.org")}
          testID="wikimedia-attribution"
        >
          <Text style={styles.attributionText}>Bank logos via Wikimedia Commons</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: spacing.md, paddingBottom: 60 },
  updatedPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.xs2,
    marginBottom: spacing.lg,
  },
  updated: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  section: { marginBottom: spacing.lg },
  sectionDivider: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm2,
    marginBottom: spacing.sm,
  },
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  heading: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 22,
    paddingLeft: 26 + spacing.sm2,
  },
  attribution: {
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  attributionText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    textDecorationLine: "underline",
  },
});
