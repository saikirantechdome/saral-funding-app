import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  CheckCircle2,
  Clock,
  X,
  Upload,
  FileText,
  AlertCircle,
  Paperclip,
  ExternalLink,
  FolderOpen,
  Info,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  User as UserIcon,
  XCircle,
  ShieldCheck,
  Eye,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, formatMobile } from "@/src/theme";
import { apiGet, apiDelete, getToken, API_BASE } from "@/src/api";
import Picker from "@/src/components/Picker";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import Saathi from "@/src/components/Saathi";
import RemoteIcon from "@/src/components/RemoteIcon";
import { docTypeStyle } from "@/src/utils/docType";
import { DOCUMENT_TYPE_GROUPS } from "@/src/constants";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";
import DocumentVault from "@/src/screens/DocumentVault";

const BULK_UPLOAD_WHATSAPP_URL = `https://wa.me/919893869899?text=${encodeURIComponent(
  "Hello, I have multiple documents to upload for my Saral Funding application. Could your team please help me with a bulk upload?"
)}`;

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

// Reject reasons come from free-text/legacy values with inconsistent casing
// ("REJECT", "details missing", etc.) — normalize display casing so badges
// look consistent regardless of how the source string was stored.
function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function statusStyle(status: string) {
  if (status === "verified") return { bg: colors.primarySoft, text: colors.primaryDark };
  if (status === "rejected") return { bg: colors.dangerSoft, text: colors.danger };
  return { bg: tints.amber.bg, text: tints.amber.fg };
}


function StatusBadge({ status }: { status: string }) {
  const { bg, text } = statusStyle(status);
  const Icon = status === "verified" ? CheckCircle2 : status === "rejected" ? AlertCircle : Clock;
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={text} strokeWidth={2.5} />
      <Text style={[badge.text, { color: text }]}>{status}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  text: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
});

function UserDocumentsTab() {
  // Revamped to match the approved prototype's Documents state — see
  // src/screens/DocumentVault.tsx (shared with the standalone /documents
  // route) and USER_SIDE_REVAMP_PLAN.md. This replaces what used to be a
  // second, nearly-identical copy of the document vault UI.
  return <DocumentVault />;
}

// ── Admin: User-first Documents View ──
const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  verified: { bg: colors.primarySoft, color: colors.primaryDark },
  rejected: { bg: colors.dangerSoft, color: colors.danger },
  pending:  { bg: tints.amber.bg, color: tints.amber.fg },
};

function AdminUserDocuments() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing();
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; mobile: string } | null>(null);
  const [docFilter, setDocFilter] = useState<"all" | "pending" | "rejected" | "verified">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; docId: string; reason: string }>({ visible: false, docId: "", reason: "" });

  const load = useCallback(async () => {
    try {
      const res = await apiGet<any>("/admin/documents");
      setAllDocs(res.items ?? []);
    } catch {
      setAllDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Group documents by user
  const userMap = new Map<string, { id: string; name: string; mobile: string; docs: any[] }>();
  allDocs.forEach((doc) => {
    const uid = doc.user?.id || doc.user_id || "unknown";
    const name = doc.user?.full_name || "Unknown User";
    const mobile = formatMobile(doc.user?.mobile);
    if (!userMap.has(uid)) userMap.set(uid, { id: uid, name, mobile, docs: [] });
    userMap.get(uid)!.docs.push(doc);
  });
  const userList = Array.from(userMap.values());

  // Docs for selected user
  const selectedDocs = selectedUser ? (userMap.get(selectedUser.id)?.docs ?? []) : [];
  const filteredDocs = docFilter === "all" ? selectedDocs : selectedDocs.filter((d: any) => d.status === docFilter);

  const handleView = async (docId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/admin/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const { url } = await response.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document.");
    }
  };

  const updateDocStatus = async (docId: string, status: "verified" | "rejected", reject_reason?: string) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/documents/${docId}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, reject_reason: reject_reason || "" }),
    });
    if (!res.ok) throw new Error();
  };

  const handleVerify = async (docId: string) => {
    setActionLoading(docId);
    try {
      await updateDocStatus(docId, "verified");
      await load();
    } catch {
      Alert.alert("Error", "Could not verify document.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    const { docId, reason } = rejectModal;
    setRejectModal((m) => ({ ...m, visible: false }));
    setActionLoading(docId);
    try {
      await updateDocStatus(docId, "rejected", reason);
      await load();
    } catch {
      Alert.alert("Error", "Could not reject document.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── User list view ──
  if (!selectedUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
        <View style={adS.header}>
          {router.canGoBack() && (
            <TouchableOpacity
              testID="user-documents-back"
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 2 }}
            >
              <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <FileSearch size={18} color={colors.primaryDark} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={adS.headerTitle}>User Documents</Text>
            <Text style={adS.headerSub}>{userList.length} users · {allDocs.length} docs total</Text>
          </View>
        </View>

        {!loading && allDocs.length > 0 && (
          <View style={adS.summaryRow}>
            <View style={adS.summaryStat}>
              <View style={[adS.summaryIcon, { backgroundColor: tints.amber.bg }]}>
                <Clock size={14} color={tints.amber.fg} strokeWidth={2} />
              </View>
              <Text style={adS.summaryVal}>{allDocs.filter((d) => d.status === "pending").length}</Text>
              <Text style={adS.summaryLabel}>Pending</Text>
            </View>
            <View style={adS.summaryDivider} />
            <View style={adS.summaryStat}>
              <View style={[adS.summaryIcon, { backgroundColor: colors.dangerSoft }]}>
                <XCircle size={14} color={colors.danger} strokeWidth={2} />
              </View>
              <Text style={adS.summaryVal}>{allDocs.filter((d) => d.status === "rejected").length}</Text>
              <Text style={adS.summaryLabel}>Rejected</Text>
            </View>
            <View style={adS.summaryDivider} />
            <View style={adS.summaryStat}>
              <View style={[adS.summaryIcon, { backgroundColor: colors.primarySoft }]}>
                <CheckCircle2 size={14} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <Text style={adS.summaryVal}>{allDocs.filter((d) => d.status === "verified").length}</Text>
              <Text style={adS.summaryLabel}>Verified</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : userList.length === 0 ? (
          <View style={adS.emptyBox}>
            <FileSearch size={40} color={colors.textDim} strokeWidth={1.5} />
            <Text style={adS.emptyTitle}>No Documents Found</Text>
            <Text style={adS.emptySub}>Documents uploaded by users will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={userList}
            keyExtractor={(u) => u.id}
            style={{ flex: 1, marginBottom: tabBarSpacing }}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item: u }) => {
              const verified = u.docs.filter((d: any) => d.status === "verified").length;
              const pending  = u.docs.filter((d: any) => d.status === "pending").length;
              const rejected = u.docs.filter((d: any) => d.status === "rejected").length;
              const accent = rejected > 0 ? colors.danger : pending > 0 ? tints.amber.fg : colors.primary;
              return (
                <TouchableOpacity
                  style={[adS.userCard, { borderLeftWidth: 4, borderLeftColor: accent }]}
                  onPress={() => { setSelectedUser({ id: u.id, name: u.name, mobile: u.mobile }); setDocFilter("all"); }}
                  activeOpacity={0.8}
                >
                  <InitialsAvatar name={u.name || "Unknown"} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={adS.userName}>{u.name}</Text>
                    <Text style={adS.userMobile}>{u.mobile}</Text>
                    <View style={adS.docCountRow}>
                      {verified > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: colors.primarySoft }]}>
                          <Text style={[adS.miniPillText, { color: colors.primaryDark }]}>{verified} verified</Text>
                        </View>
                      )}
                      {pending > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: tints.amber.bg }]}>
                          <Text style={[adS.miniPillText, { color: tints.amber.fg }]}>{pending} pending</Text>
                        </View>
                      )}
                      {rejected > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: colors.dangerSoft }]}>
                          <Text style={[adS.miniPillText, { color: colors.danger }]}>{rejected} rejected</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── User documents detail view ──
  const filterCounts = {
    all: selectedDocs.length,
    pending: selectedDocs.filter((d: any) => d.status === "pending").length,
    rejected: selectedDocs.filter((d: any) => d.status === "rejected").length,
    verified: selectedDocs.filter((d: any) => d.status === "verified").length,
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
      <View style={adS.detailHeader}>
        <TouchableOpacity onPress={() => setSelectedUser(null)} style={adS.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <InitialsAvatar name={selectedUser.name || "Unknown"} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={adS.headerTitle}>{selectedUser.name}</Text>
          <Text style={adS.headerSub}>{selectedUser.mobile} · {selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""}</Text>
        </View>
      </View>

      <View style={adS.filterRow}>
          {(["all", "pending", "rejected", "verified"] as const).map((f) => {
            const active = docFilter === f;
            const cfg = f === "all" ? { bg: colors.primarySoft, color: colors.primaryDark } : STATUS_CFG[f];
            return (
              <TouchableOpacity
                key={f}
                testID={`doc-filter-${f}`}
                style={[
                  adS.filterChip,
                  { backgroundColor: active ? (f === "all" ? colors.primary : cfg.bg) : "#FFF" },
                  active && f !== "all" && { borderWidth: 1.5, borderColor: cfg.color },
                ]}
                onPress={() => setDocFilter(f)}
              >
                <Text style={[
                  adS.filterChipText,
                  { color: active ? (f === "all" ? "#FFF" : cfg.color) : colors.textMuted },
                  active && { fontFamily: fonts.bold },
                ]}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>

      <FlatList
        data={filteredDocs}
        keyExtractor={(d) => d.id}
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={adS.emptyBox}>
            <FileSearch size={36} color={colors.textDim} strokeWidth={1.5} />
            <Text style={adS.emptyTitle}>No documents here</Text>
            <Text style={adS.emptySub}>Nothing in the "{docFilter}" filter yet.</Text>
          </View>
        }
        renderItem={({ item: doc }) => {
          const cfg = STATUS_CFG[doc.status] ?? STATUS_CFG.pending;
          const accent = docTypeStyle(doc.doc_type);
          return (
            <View style={[adS.docCard, { borderLeftWidth: 4, borderLeftColor: cfg.color }]}>
              <View style={adS.docCardHeader}>
                <View style={[adS.docIcon, { backgroundColor: accent.bg }]}>
                  <RemoteIcon slug={accent.slug} size={20} fallback={FileText} fallbackColor={accent.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={adS.docType}>{doc.doc_type}</Text>
                  {doc.file_name && <Text style={adS.docFile} numberOfLines={1}>{doc.file_name}</Text>}
                </View>
                <View style={adS.docHeaderRight}>
                  <View style={[adS.statusPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[adS.statusText, { color: cfg.color }]}>{doc.status}</Text>
                  </View>
                  <TouchableOpacity style={adS.viewIconBtn} onPress={() => handleView(doc.id)} activeOpacity={0.8}>
                    <Eye size={14} color={colors.primaryDark} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={adS.docDate}>
                Uploaded: {doc.created_at
                  ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </Text>
              {doc.status === "rejected" && doc.reject_reason && (
                <View style={adS.reasonBox}>
                  <AlertCircle size={11} color={colors.textMuted} strokeWidth={2} />
                  <Text style={adS.reasonText}>
                    <Text style={adS.reasonLabel}>Reason: </Text>
                    {toSentenceCase(doc.reject_reason)}
                  </Text>
                </View>
              )}
              {doc.status === "pending" && (
                <View style={adS.docFooterRow}>
                  <TouchableOpacity
                    style={adS.verifyBtn}
                    onPress={() =>
                      Alert.alert("Verify Document", `Mark "${doc.doc_type}" as verified?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Verify", onPress: () => handleVerify(doc.id) },
                      ])
                    }
                    disabled={actionLoading === doc.id}
                    activeOpacity={0.8}
                  >
                    {actionLoading === doc.id ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={13} color="#FFF" strokeWidth={2.5} />
                        <Text style={adS.verifyBtnText}>Verify</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={adS.rejectBtn}
                    onPress={() => setRejectModal({ visible: true, docId: doc.id, reason: "" })}
                    disabled={actionLoading === doc.id}
                    activeOpacity={0.8}
                  >
                    <X size={13} color="#FFF" strokeWidth={2.5} />
                    <Text style={adS.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Reject reason modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade" onRequestClose={() => setRejectModal((m) => ({ ...m, visible: false }))}>
        <View style={adS.modalOverlay}>
          <View style={adS.modalBox}>
            <Text style={adS.modalTitle}>Reject Document</Text>
            <Text style={adS.modalSub}>Provide a reason so the user knows what to fix.</Text>
            <TextInput
              style={adS.modalInput}
              placeholder="e.g. Image is blurry, please re-upload"
              placeholderTextColor={colors.textDim}
              value={rejectModal.reason}
              onChangeText={(t) => setRejectModal((m) => ({ ...m, reason: t }))}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={adS.modalActions}>
              <TouchableOpacity style={adS.modalCancel} onPress={() => setRejectModal((m) => ({ ...m, visible: false }))} activeOpacity={0.8}>
                <Text style={adS.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={adS.modalConfirm} onPress={handleRejectSubmit} activeOpacity={0.8}>
                <Text style={adS.modalConfirmText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const adS = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text },
  headerSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  filterRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm2, paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 10, height: 28, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  filterChipText: { fontSize: 11, fontFamily: fonts.medium },
  summaryRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF", marginHorizontal: spacing.md, marginTop: spacing.sm2,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  summaryStat: { flex: 1, alignItems: "center", gap: 3 },
  summaryDivider: { width: 1, height: 34, backgroundColor: colors.border },
  summaryIcon: {
    width: 26, height: 26, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  summaryVal: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  summaryLabel: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, marginTop: -60 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: 14, marginBottom: 8,
  },
  userName: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  userMobile: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  docCountRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  miniPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  miniPillText: { fontSize: 10, fontFamily: fonts.bold },
  docCard: {
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: 8,
  },
  docCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  docIcon: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  docType: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  docFile: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  docHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, flexShrink: 0 },
  statusText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  viewIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  docDate: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  reasonBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  reasonText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, flex: 1, lineHeight: 17 },
  reasonLabel: { fontFamily: fonts.semiBold, color: colors.text },
  docFooterRow: {
    flexDirection: "row", gap: 8, flexWrap: "wrap",
  },
  verifyBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 9, borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  verifyBtnText: { fontSize: 12, fontFamily: fonts.displayBold, color: "#FFF" },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 9, borderRadius: radius.lg,
    backgroundColor: colors.danger,
  },
  rejectBtnText: { fontSize: 12, fontFamily: fonts.displayBold, color: "#FFF" },
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    backgroundColor: "#FFF", borderRadius: radius.xxl, padding: 20, width: "100%", gap: 12,
  },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  modalSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 18 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    padding: 12, fontSize: 13, fontFamily: fonts.regular, color: colors.text,
    minHeight: 80, textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 11, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textMuted },
  modalConfirm: {
    flex: 1, paddingVertical: 11, borderRadius: radius.lg,
    backgroundColor: colors.danger, alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
});

export default function DocumentsTab() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me: any) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;
  if (isAdmin) return <AdminUserDocuments />;
  return <UserDocumentsTab />;
}
