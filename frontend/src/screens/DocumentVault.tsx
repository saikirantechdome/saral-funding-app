/**
 * Document Vault — matches the approved prototype's "Documents" state
 * (header + progress + per-document status cards). Shared by both the
 * standalone `/documents` route (reached right after onboarding) and the
 * `/(tabs)/documents` tab — previously two separately-written but nearly
 * identical implementations; consolidated here per USER_SIDE_REVAMP_PLAN.md.
 *
 * Real upload/delete/view logic is unchanged from those two screens — only
 * the presentation and navigation model changed: tapping an uploaded row (or
 * "Add a document") now pushes the per-document screen (`/document/[type]`)
 * instead of uploading inline on this list, matching the prototype's
 * Documents → Upload → Submitted flow.
 */
import { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, RefreshControl, Modal, SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { FileText, ChevronRight, Plus, X, Check, CreditCard, Award, Landmark, Home, Receipt } from "lucide-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing, protoFonts } from "@/src/theme.proto";
import { DOCUMENT_TYPE_GROUPS } from "@/src/constants";
import { docTypeStyle } from "@/src/utils/docType";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

const BULK_UPLOAD_WHATSAPP_URL = `https://wa.me/919893869899?text=${encodeURIComponent(
  "Hello, I have multiple documents to upload for my Saral Funding application. Could your team please help me with a bulk upload?"
)}`;

function statusPill(status: string) {
  if (status === "verified") return { bg: protoColors.pill.green.bg, text: protoColors.pill.green.text, label: "Approved" };
  if (status === "rejected") return { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text, label: "Action" };
  return { bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text, label: "Review" };
}

// A meaningful icon per document category — the prototype's own row icons
// are blank placeholders, but a flat gray square for every single document
// read as unfinished. Reuses docTypeStyle's existing category detection
// (already shared with the admin document-review screens) rather than a
// second copy, just mapped to an icon instead of a color. Free icons via
// lucide-react-native (the icon set already used throughout this revamp).
const CATEGORY_ICONS: Record<string, any> = {
  "identification-documents": CreditCard,
  certificate: Award,
  "bank-cards": Landmark,
  home: Home,
  invoice: Receipt,
  file: FileText,
};
function docTypeIcon(docType: string | undefined | null) {
  return CATEGORY_ICONS[docTypeStyle(docType).slug] ?? FileText;
}

export default function DocumentVault() {
  const router = useRouter();
  const params = useLocalSearchParams<{ add?: string }>();
  const insets = useSafeAreaInsets();
  const tabBarSpacing = useTabBarSpacing(-36);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const consumedAddParam = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<any[]>("/documents/me");
      setDocs(Array.isArray(res) ? res : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // The Home FAB navigates here with ?add=1 to open the sheet immediately.
  // Guarded by a ref (not just clearing the param) since router.setParams
  // isn't guaranteed to actually drop the key from the URL on every
  // platform — a stray "add=undefined" string would otherwise still be
  // truthy and reopen the sheet on every future focus of this tab.
  useFocusEffect(useCallback(() => {
    if (params.add && !consumedAddParam.current) {
      consumedAddParam.current = true;
      setAddOpen(true);
    }
  }, [params.add]));

  const verifiedCount = docs.filter((d) => d.status === "verified").length;
  const uploadedTypes = new Set(docs.map((d) => d.doc_type));

  return (
    <View style={{ flex: 1, backgroundColor: protoColors.surface }} testID="documents-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{docs.length === 0 ? "No documents yet" : `${verifiedCount} of ${docs.length} approved`}</Text>
        </View>
        {docs.length > 0 && (
          <View style={styles.pillCount}>
            <Text style={styles.pillCountText}>{verifiedCount} / {docs.length}</Text>
          </View>
        )}
      </View>
      {docs.length > 0 && (
        <View style={styles.strip}>
          {docs.map((d, i) => (
            <View
              key={d.id ?? i}
              style={[
                styles.stripSeg,
                d.status === "verified" && styles.stripOn,
                d.status === "rejected" && styles.stripAct,
              ]}
            />
          ))}
        </View>
      )}

      <ScrollView
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={protoColors.primary} />}
      >
        {docs.length === 0 && !loading ? (
          <View style={styles.empty}>
            <FileText size={30} color={protoColors.textDim} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No documents uploaded yet</Text>
            <Text style={styles.emptyBody}>Tap "Add a document" below to get started.</Text>
          </View>
        ) : (
          docs.map((doc) => {
            const pill = statusPill(doc.status);
            const DocIcon = docTypeIcon(doc.doc_type);
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.card}
                onPress={() => router.push(`/document/${encodeURIComponent(doc.doc_type)}` as any)}
                activeOpacity={0.85}
                testID={`doc-row-${doc.id}`}
              >
                <View style={styles.row}>
                  {/* Flat placeholder square background — matches the
                      prototype's `.s-ico` — with a category icon inside so
                      an all-gray list of squares doesn't read as unfinished. */}
                  <View style={styles.icon}>
                    <DocIcon size={17} color={protoColors.textMuted} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.doc_type}</Text>
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {doc.status === "rejected" && doc.reject_reason ? doc.reject_reason : pill.label}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={styles.addCard} onPress={() => setAddOpen(true)} activeOpacity={0.85} testID="add-document-btn">
          <View style={[styles.icon, { backgroundColor: protoColors.pill.teal.bg }]}>
            <Plus size={17} color={protoColors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.addText}>Add a document</Text>
          <ChevronRight size={16} color={protoColors.textMuted} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bulkBtn}
          onPress={() => Linking.openURL(BULK_UPLOAD_WHATSAPP_URL)}
          activeOpacity={0.8}
          testID="bulk-upload-whatsapp-cta"
        >
          <MaterialCommunityIcons name="whatsapp" size={15} color={protoColors.primary} />
          <Text style={styles.bulkBtnText}>Bulk upload? Contact us on WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Add a document</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)} hitSlop={10} testID="close-add-document">
                <X size={18} color={protoColors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <SectionList
              style={{ flexShrink: 1 }}
              sections={DOCUMENT_TYPE_GROUPS.map((g) => ({ title: g.label, data: g.options }))}
              keyExtractor={(item, i) => `${item}-${i}`}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => <Text style={styles.sheetGroupLabel}>{section.title}</Text>}
              renderItem={({ item }) => {
                const already = uploadedTypes.has(item);
                return (
                  <TouchableOpacity
                    testID={`doc-type-opt-${item}`}
                    style={styles.sheetOpt}
                    disabled={already}
                    onPress={() => { setAddOpen(false); router.push(`/document/${encodeURIComponent(item)}` as any); }}
                    activeOpacity={already ? 1 : 0.7}
                  >
                    <Text style={[styles.sheetOptText, already && styles.sheetOptTextDisabled]}>{item}</Text>
                    {already && (
                      <View style={styles.sheetOptBadge}>
                        <Check size={11} color={protoColors.pill.green.text} strokeWidth={2.5} />
                        <Text style={styles.sheetOptBadgeText}>Uploaded</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingTop: protoSpacing.md,
    paddingBottom: protoSpacing.sm,
  },
  title: { fontSize: 18, fontFamily: protoFonts.regular, color: protoColors.text },
  subtitle: { fontSize: 12, fontFamily: protoFonts.regular, color: protoColors.textMuted, marginTop: 2 },
  pillCount: { backgroundColor: protoColors.pill.teal.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillCountText: { fontSize: 11, fontFamily: protoFonts.regular, color: protoColors.pill.teal.text },
  strip: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, marginBottom: protoSpacing.sm },
  stripSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E1E9E6" },
  stripOn: { backgroundColor: protoColors.accent },
  stripAct: { backgroundColor: protoColors.amber },
  body: { paddingHorizontal: spacing.md, gap: 11, paddingTop: 4, paddingBottom: spacing.lg },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: protoColors.iconPlaceholder, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 13.5, color: protoColors.text, fontFamily: protoFonts.regular },
  docMeta: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2, fontFamily: protoFonts.regular },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontFamily: protoFonts.regular },
  addCard: {
    flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13,
    borderWidth: 1, borderColor: protoColors.border, borderStyle: "dashed",
  },
  addText: { flex: 1, fontSize: 13.5, color: protoColors.text, fontFamily: protoFonts.regular },
  bulkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 10,
  },
  bulkBtnText: { fontSize: 12, color: protoColors.primary, fontFamily: protoFonts.regular },
  empty: { alignItems: "center", gap: 6, paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 14, fontFamily: protoFonts.regular, color: protoColors.text },
  emptyBody: { fontSize: 12, color: protoColors.textMuted, textAlign: "center", fontFamily: protoFonts.regular },
  backdrop: { flex: 1, backgroundColor: "rgba(14,33,30,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    maxHeight: "75%",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: protoColors.border, alignSelf: "center", marginBottom: 12 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: protoFonts.regular, color: protoColors.text },
  sheetGroupLabel: {
    fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: protoColors.textDim,
    fontFamily: protoFonts.regular, marginTop: 14, marginBottom: 6,
  },
  sheetOpt: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: protoColors.border,
  },
  sheetOptText: { fontSize: 13.5, color: protoColors.text, flex: 1, fontFamily: protoFonts.regular },
  sheetOptTextDisabled: { color: protoColors.textDim },
  sheetOptBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: protoColors.pill.green.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  sheetOptBadgeText: { fontSize: 10, fontFamily: protoFonts.regular, color: protoColors.pill.green.text },
});
