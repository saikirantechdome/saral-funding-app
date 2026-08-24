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
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { FileText, ChevronRight, Plus } from "lucide-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { docTypeStyle } from "@/src/utils/docType";
import { DOCUMENT_TYPE_GROUPS } from "@/src/constants";
import Picker from "@/src/components/Picker";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

const BULK_UPLOAD_WHATSAPP_URL = `https://wa.me/919893869899?text=${encodeURIComponent(
  "Hello, I have multiple documents to upload for my Saral Funding application. Could your team please help me with a bulk upload?"
)}`;

function statusPill(status: string) {
  if (status === "verified") return { bg: protoColors.pill.green.bg, text: protoColors.pill.green.text, label: "Approved" };
  if (status === "rejected") return { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text, label: "Action" };
  return { bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text, label: "Review" };
}

export default function DocumentVault() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing(-36);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  const verifiedCount = docs.filter((d) => d.status === "verified").length;
  const uploadedTypes = new Set(docs.map((d) => d.doc_type));
  const allTypeOptions = DOCUMENT_TYPE_GROUPS.flatMap((g) => g.options);

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
            const style = docTypeStyle(doc.doc_type);
            const pill = statusPill(doc.status);
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.card}
                onPress={() => router.push(`/document/${encodeURIComponent(doc.doc_type)}` as any)}
                activeOpacity={0.85}
                testID={`doc-row-${doc.id}`}
              >
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: style.bg }]}>
                    <FileText size={17} color={style.fg} strokeWidth={2} />
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

      {/* Hidden until opened — reuses the existing grouped/searchable type
          picker rather than rebuilding one; the prototype has no equivalent
          UI to match since it assumes documents are pre-assigned. */}
      {addOpen && (
        <Picker
          label="Document Type"
          placeholder="Select a document type"
          value=""
          groups={DOCUMENT_TYPE_GROUPS}
          disabledOptions={Array.from(uploadedTypes)}
          optionBadge={(opt) => (uploadedTypes.has(opt) ? "Uploaded" : undefined)}
          onChange={(v) => {
            setAddOpen(false);
            if (v) router.push(`/document/${encodeURIComponent(v)}` as any);
          }}
          testID="doc-type-picker"
        />
      )}
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
  title: { fontSize: 18, fontWeight: "700", color: protoColors.text },
  subtitle: { fontSize: 12, color: protoColors.textMuted, marginTop: 2 },
  pillCount: { backgroundColor: protoColors.pill.teal.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillCountText: { fontSize: 11, fontWeight: "600", color: protoColors.pill.teal.text },
  strip: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, marginBottom: protoSpacing.sm },
  stripSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E1E9E6" },
  stripOn: { backgroundColor: protoColors.accent },
  stripAct: { backgroundColor: protoColors.amber },
  body: { paddingHorizontal: spacing.md, gap: 11, paddingTop: 4, paddingBottom: spacing.lg },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  docMeta: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontWeight: "600" },
  addCard: {
    flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13,
    borderWidth: 1, borderColor: protoColors.border, borderStyle: "dashed",
  },
  addText: { flex: 1, fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  bulkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 10,
  },
  bulkBtnText: { fontSize: 12, color: protoColors.primary, fontWeight: "600" },
  empty: { alignItems: "center", gap: 6, paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: protoColors.text },
  emptyBody: { fontSize: 12, color: protoColors.textMuted, textAlign: "center" },
});
