import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, FileText, ChevronDown, ChevronUp, Zap, MapPin, Tag, Phone } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, formatINR, gradients } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";
import Button from "@/src/components/ui/Button";

function SchemeSkeleton() {
  return (
    <View style={{ padding: spacing.md }}>
      <SkeletonBox width="70%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={12} style={{ marginBottom: 6 }} />
      <SkeletonBox width="90%" height={12} style={{ marginBottom: 20 }} />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <SkeletonBox width="45%" height={72} borderRadius={16} />
        <SkeletonBox width="45%" height={72} borderRadius={16} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBox key={i} width="100%" height={52} borderRadius={14} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
  tint = tints.teal,
}: {
  title: string;
  icon: any;
  children: any;
  defaultOpen?: boolean;
  tint?: { bg: string; fg: string };
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={accStyles.wrap}>
      <TouchableOpacity
        style={accStyles.header}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={accStyles.headerLeft}>
          <View style={[accStyles.iconBox, { backgroundColor: tint.bg }]}>{icon}</View>
          <Text style={accStyles.title}>{title}</Text>
        </View>
        {open
          ? <ChevronUp size={16} color={colors.textDim} strokeWidth={2} />
          : <ChevronDown size={16} color={colors.textDim} strokeWidth={2} />}
      </TouchableOpacity>
      {open && <View style={accStyles.body}>{children}</View>}
    </View>
  );
}

const accStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm2,
  },
});

function CheckItem({ text }: { text: string }) {
  return (
    <View style={detStyles.checkRow}>
      <CheckCircle2 size={14} color={colors.primary} strokeWidth={2.5} style={{ marginTop: 2 }} />
      <Text style={detStyles.checkText}>{text}</Text>
    </View>
  );
}

function StepItem({ index, text }: { index: number; text: string }) {
  return (
    <View style={detStyles.stepRow}>
      <View style={detStyles.stepNum}>
        <Text style={detStyles.stepNumText}>{index}</Text>
      </View>
      {index < 99 && <View style={detStyles.stepLine} />}
      <Text style={detStyles.stepText}>{text}</Text>
    </View>
  );
}

function schemeWhatsAppUrl(schemeName: string) {
  const text = `Hey team, I am looking for scheme details for ${schemeName} to apply. Can you help me?`;
  return `https://wa.me/919893869899?text=${encodeURIComponent(text)}`;
}

const detStyles = StyleSheet.create({
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  checkText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 19 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stepLine: { position: "absolute", left: 11, top: 26, width: 2, height: 20, backgroundColor: colors.primarySoft },
  stepNumText: { fontSize: 11, fontFamily: fonts.bold, color: "#FFF" },
  stepText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 19 },
});

export default function SchemeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [scheme, setScheme] = useState<any>(null);

  useEffect(() => {
    apiGet<any>(`/schemes/${id}`).then(setScheme).catch(() => {});
  }, [id]);

  if (!scheme) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
        <BackBar title="Loading…" onBack={() => router.back()} />
        <SchemeSkeleton />
      </SafeAreaView>
    );
  }

  const processList: string[] = typeof scheme.process === "string"
    ? scheme.process.split(/\n|\.(?=\s)/).filter(Boolean).map((s: string) => s.trim()).filter((s: string) => s.length > 5)
    : Array.isArray(scheme.process) ? scheme.process : [];

  const statesLabel = (scheme.states || []).includes("All India")
    ? "All India"
    : (scheme.states || [])[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID={`scheme-detail-${id}`}>
      <BackBar title="" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: dark gradient header — name, applicability pill, headline funding figure */}
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
          testID="scheme-hero"
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.schemeName}>{scheme.name}</Text>
            {statesLabel && (
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{statesLabel}</Text>
              </View>
            )}
          </View>
          {scheme.full_name && scheme.full_name !== scheme.name && (
            <Text style={styles.schemeFullName}>{scheme.full_name}</Text>
          )}

          <View style={styles.heroFundingRow}>
            <View>
              <Text style={styles.heroFundingLabel}>Maximum Funding</Text>
              <Text style={styles.heroFundingVal}>{formatINR(scheme.max_funding)}</Text>
            </View>
            {scheme.max_subsidy_percent > 0 && (
              <View style={styles.heroSubsidyBox}>
                <Zap size={12} color="#FFF" strokeWidth={2} />
                <Text style={styles.heroSubsidyText}>{scheme.max_subsidy_percent}% subsidy</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.md }}>
          {/* Clean info sections — label + value, not dense paragraphs */}
          {!!scheme.description && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>What it is</Text>
              <Text style={styles.infoValue}>{scheme.description}</Text>
            </View>
          )}

          {(scheme.eligibility || []).length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Eligibility</Text>
              <View style={{ marginTop: 4 }}>
                {scheme.eligibility.map((item: string, i: number) => (
                  <CheckItem key={i} text={item} />
                ))}
              </View>
            </View>
          )}

          {/* Category + document-requirement tags, as small pills */}
          {((scheme.categories || []).length > 0 || (scheme.documents || []).length > 0) && (
            <View style={styles.tagsCard}>
              {(scheme.categories || []).length > 0 && (
                <View style={styles.tagsGroup}>
                  <View style={styles.tagsGroupHeader}>
                    <Tag size={12} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.tagsGroupLabel}>Categories</Text>
                  </View>
                  <View style={styles.tagsRow}>
                    {scheme.categories.map((c: string) => (
                      <View key={c} style={styles.tag}>
                        <Text style={styles.tagText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {(scheme.documents || []).length > 0 && (
                <View style={styles.tagsGroup}>
                  <View style={styles.tagsGroupHeader}>
                    <FileText size={12} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.tagsGroupLabel}>Documents Required</Text>
                  </View>
                  <View style={styles.tagsRow}>
                    {scheme.documents.map((d: string) => (
                      <View key={d} style={[styles.tag, styles.docTag]}>
                        <Text style={[styles.tagText, styles.docTagText]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Remaining detail sections stay as expandable accordions */}
          {(scheme.benefits || []).length > 0 && (
            <AccordionSection
              title="Benefits"
              icon={<Zap size={15} color={tints.amber.fg} strokeWidth={2} />}
              tint={tints.amber}
              defaultOpen={true}
            >
              {scheme.benefits.map((item: string, i: number) => (
                <CheckItem key={i} text={item} />
              ))}
            </AccordionSection>
          )}

          {processList.length > 0 && (
            <AccordionSection
              title="Application Process"
              icon={<CheckCircle2 size={15} color={tints.deepTeal.fg} strokeWidth={2} />}
              tint={tints.deepTeal}
            >
              {processList.map((step: string, i: number) => (
                <StepItem key={i} index={i + 1} text={step} />
              ))}
            </AccordionSection>
          )}

          {(scheme.states || []).length > 0 && (
            <AccordionSection
              title="State Applicability"
              icon={<MapPin size={15} color={tints.green.fg} strokeWidth={2} />}
              tint={tints.green}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {scheme.states.map((s: string) => (
                  <View key={s} style={styles.statePill}>
                    <Text style={styles.statePillText}>{s}</Text>
                  </View>
                ))}
              </View>
            </AccordionSection>
          )}

          {/* Single clear CTA */}
          <View style={styles.ctaWrap}>
            <Button
              testID="book-from-scheme"
              label="Book Free Consultation"
              onPress={() => router.push("/booking")}
              size="lg"
              Icon={Phone}
            />
          </View>

          <TouchableOpacity
            testID="scheme-whatsapp-cta"
            style={styles.whatsappCta}
            onPress={() => Linking.openURL(schemeWhatsAppUrl(scheme.name))}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color={colors.primaryDark} />
            <Text style={styles.whatsappCtaText}>Contact us on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Dark gradient hero — name + applicability pill, then the headline funding figure
  heroCard: {
    margin: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.xxl,
    padding: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  schemeName: {
    flex: 1,
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: "#FFF",
    lineHeight: 27,
  },
  heroPill: {
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroPillText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  schemeFullName: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 3,
    fontStyle: "italic",
  },
  heroFundingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 20,
  },
  heroFundingLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroFundingVal: {
    fontSize: 30,
    fontFamily: fonts.displayBold,
    color: "#FFF",
    marginTop: 4,
  },
  heroSubsidyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  heroSubsidyText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#FFF",
  },

  // Clean label + value info sections
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 21,
  },

  // Category / document-requirement tags
  tagsCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  tagsGroup: {
    marginBottom: spacing.sm2,
  },
  tagsGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tagsGroupLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  docTag: {
    backgroundColor: tints.blue.bg,
    borderColor: tints.blue.bg,
  },
  docTagText: {
    color: tints.blue.fg,
    fontFamily: fonts.semiBold,
  },
  statePill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statePillText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  ctaWrap: {
    marginTop: spacing.md,
  },
  whatsappCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.sm2,
    backgroundColor: colors.primarySoft,
    paddingVertical: 15,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  whatsappCtaText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
});
