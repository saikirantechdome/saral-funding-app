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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, FileText, ChevronDown, ChevronUp, TrendingUp, Zap, MapPin, Tag, Phone } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, formatINR } from "@/src/theme";
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID={`scheme-detail-${id}`}>
      <BackBar title="" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.schemeName}>{scheme.name}</Text>
          {scheme.full_name && scheme.full_name !== scheme.name && (
            <Text style={styles.schemeFullName}>{scheme.full_name}</Text>
          )}
          <Text style={styles.schemeDesc}>{scheme.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TrendingUp size={13} color={colors.primaryDark} strokeWidth={2} />
                <Text style={styles.statLabel}>Max Funding</Text>
              </View>
              <Text style={styles.statVal}>{formatINR(scheme.max_funding)}</Text>
            </View>
            {scheme.max_subsidy_percent > 0 && (
              <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Zap size={13} color={colors.primaryDark} strokeWidth={2} />
                  <Text style={styles.statLabel}>Subsidy</Text>
                </View>
                <Text style={styles.statVal}>{scheme.max_subsidy_percent}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tags */}
        {(scheme.categories || []).length > 0 && (
          <View style={styles.tagsRow}>
            <Tag size={12} color={colors.textDim} strokeWidth={2} />
            {scheme.categories.map((c: string) => (
              <View key={c} style={styles.tag}>
                <Text style={styles.tagText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Accordion sections */}
        {(scheme.eligibility || []).length > 0 && (
          <AccordionSection
            title="Eligibility"
            icon={<CheckCircle2 size={15} color={tints.teal.fg} strokeWidth={2} />}
            tint={tints.teal}
            defaultOpen={true}
          >
            {scheme.eligibility.map((item: string, i: number) => (
              <CheckItem key={i} text={item} />
            ))}
          </AccordionSection>
        )}

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

        {(scheme.documents || []).length > 0 && (
          <AccordionSection
            title="Documents Required"
            icon={<FileText size={15} color={tints.blue.fg} strokeWidth={2} />}
            tint={tints.blue}
          >
            {scheme.documents.map((item: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 }} />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 19 }}>{item}</Text>
              </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  schemeName: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 27,
  },
  schemeFullName: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 3,
    fontStyle: "italic",
  },
  schemeDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.primarySoft,
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statVal: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginBottom: spacing.lg,
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
