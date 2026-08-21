import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  User, MapPin, Phone, Landmark, ChevronRight,
  CheckCircle2, Clock, XCircle, Plus, Trash2, Building2, MessageCircle,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, formatINR, formatMobile } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import EmptyState from "@/src/components/EmptyState";
import Button from "@/src/components/ui/Button";
import RemoteIcon from "@/src/components/RemoteIcon";
import { schemeStyle } from "@/src/utils/schemeType";
import BankBadge from "@/src/components/BankBadge";

const STAGE_LABELS: Record<string, string> = {
  scheme_identified: "Scheme Identified",
  call_done: "Call Done",
  documents_submitted: "Docs Submitted",
  application_filed: "App Filed",
  under_review: "Under Review",
  approved: "Approved",
  disbursed: "Disbursed",
  rejected: "Rejected",
};

// Role -> colour mapping, kept consistent with admin/users.tsx and admin/team.tsx
const ROLE_TINTS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: tints.amber.bg, text: tints.amber.fg },
  manager: { bg: tints.blue.bg, text: tints.blue.fg },
  expert: { bg: tints.deepTeal.bg, text: tints.deepTeal.fg },
  sales_executive: { bg: colors.primarySoft, text: colors.primaryDark },
  support_executive: { bg: tints.red.bg, text: tints.red.fg },
};

function StagePill({ stage }: { stage: string }) {
  const isGood = stage === "approved" || stage === "disbursed";
  const isBad = stage === "rejected";
  const bg = isGood ? colors.primarySoft : isBad ? tints.red.bg : tints.amber.bg;
  const text = isGood ? colors.primaryDark : isBad ? tints.red.fg : tints.amber.fg;
  const Icon = isGood ? CheckCircle2 : isBad ? XCircle : Clock;
  return (
    <View style={[s.stagePill, { backgroundColor: bg }]}>
      <Icon size={10} color={text} strokeWidth={2.5} />
      <Text style={[s.stagePillText, { color: text }]}>{STAGE_LABELS[stage] ?? stage}</Text>
    </View>
  );
}

export default function UserDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign scheme modal
  const [showModal, setShowModal] = useState(false);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Bank assignments
  const [bankAssignments, setBankAssignments] = useState<any[]>([]);
  const [deletingBank, setDeletingBank] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, appsRes, banksRes] = await Promise.all([
        apiGet<any>(`/admin/users/${id}`),
        apiGet<any[]>(`/admin/users/${id}/scheme-applications`),
        apiGet<any[]>(`/admin/users/${id}/bank-assignments`).catch(() => []),
      ]);
      setUser(userRes.user ?? userRes);
      setBusiness(userRes.business_profile ?? null);
      setApplications(Array.isArray(appsRes) ? appsRes : []);
      setBankAssignments(Array.isArray(banksRes) ? banksRes : []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openAssignModal = async () => {
    setSelectedScheme(null);
    setShowModal(true);
    const res = await apiGet<any[]>("/admin/schemes");
    setSchemes(Array.isArray(res) ? res.filter((sc: any) => !sc.disabled) : []);
  };

  const handleAssign = async () => {
    if (!selectedScheme) return;
    const alreadyAssigned = applications.find((a) => a.scheme_id === selectedScheme.id);
    if (alreadyAssigned) {
      Alert.alert("Already Assigned", "This scheme is already assigned to this user.");
      return;
    }
    setAssigning(true);
    try {
      await apiPost(`/admin/users/${id}/scheme-applications`, {
        scheme_id: selectedScheme.id,
        scheme_name: selectedScheme.name,
      });
      setShowModal(false);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not assign scheme.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (appId: string) => {
    const confirmed =
      typeof window !== "undefined" && typeof (window as any).confirm === "function"
        ? (window as any).confirm("Remove this scheme assignment?")
        : true;
    if (!confirmed) return;
    setDeleting(appId);
    try {
      await apiDelete(`/admin/scheme-applications/${appId}`);
      await load();
    } catch {
      Alert.alert("Error", "Could not remove assignment.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteBank = async (assignmentId: string) => {
    const confirmed =
      typeof window !== "undefined" && typeof (window as any).confirm === "function"
        ? (window as any).confirm("Remove this bank assignment?")
        : true;
    if (!confirmed) return;
    setDeletingBank(assignmentId);
    try {
      await apiDelete(`/admin/bank-assignments/${assignmentId}`);
      await load();
    } catch {
      Alert.alert("Error", "Could not remove bank assignment.");
    } finally {
      setDeletingBank(null);
    }
  };

  const assignedSchemeIds = new Set(applications.map((a) => a.scheme_id));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="User Detail" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title={user?.full_name || "User Detail"} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* User Info Card */}
        <View style={s.userCard}>
          <InitialsAvatar name={user?.full_name || "U"} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user?.full_name || "Unnamed"}</Text>
            <View style={s.metaRow}>
              <Phone size={11} color={colors.textDim} strokeWidth={2} />
              <Text style={s.metaText}>{formatMobile(user?.mobile)}</Text>
            </View>
            {user?.state && (
              <View style={s.metaRow}>
                <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                <Text style={s.metaText}>{user?.state}{user?.district ? `, ${user?.district}` : ""}</Text>
              </View>
            )}
            {user?.role && user.role !== "user" && (
              <View style={[s.rolePill, { marginTop: 6, backgroundColor: ROLE_TINTS[user.role]?.bg ?? tints.amber.bg }]}>
                <Text style={[s.rolePillText, { color: ROLE_TINTS[user.role]?.text ?? tints.amber.fg }]}>{user.role.replace(/_/g, " ")}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            testID="message-user-btn"
            style={s.messageBtn}
            onPress={() => router.push(`/admin/support/${id}` as any)}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color={colors.primaryDark} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Business Info */}
        {business && (
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>Business</Text>
            <Text style={s.sectionValue}>{business.business_name || "—"}</Text>
            {(business.business_stage || business.industry) && (
              <Text style={s.sectionMeta}>{business.business_stage || "—"} · {business.industry || "—"}</Text>
            )}
            {business.business_activity && (
              <Text style={s.sectionActivity}>{business.business_activity}</Text>
            )}
          </View>
        )}

        {/* Assigned Schemes */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionIconChip, { backgroundColor: colors.primarySoft }]}>
            <Landmark size={16} color={colors.primaryDark} strokeWidth={2} />
          </View>
          <Text style={s.sectionTitle}>Assigned Schemes ({applications.length})</Text>
          <TouchableOpacity style={s.addBtn} onPress={openAssignModal} activeOpacity={0.8}>
            <Plus size={13} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={s.addBtnText}>Assign</Text>
          </TouchableOpacity>
        </View>

        {applications.length === 0 ? (
          <EmptyState
            Icon={Landmark}
            iconSlug="briefcase"
            title="No schemes assigned yet"
            ctaLabel="+ Assign a Scheme"
            onCta={openAssignModal}
          />
        ) : (
          applications.map((app) => {
            const accent = schemeStyle(app.scheme_name);
            return (
            <TouchableOpacity
              key={app.id}
              style={s.appCard}
              onPress={() => router.push(`/admin/scheme/${app.scheme_id}`)}
              activeOpacity={0.8}
            >
              <View style={[s.schemeIcon, { backgroundColor: accent.bg }]}>
                <RemoteIcon slug={accent.slug} size={16} fallback={Landmark} fallbackColor={accent.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.schemeName}>{app.scheme_name}</Text>
                {app.bank_name && <Text style={s.bankName}>{app.bank_name}</Text>}
                <StagePill stage={app.stage} />
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDelete(app.id)}
                disabled={deleting === app.id}
              >
                {deleting === app.id
                  ? <ActivityIndicator size="small" color={tints.red.fg} />
                  : <Trash2 size={14} color={tints.red.fg} strokeWidth={2} />}
              </TouchableOpacity>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
            );
          })
        )}
        {/* Assigned Banks */}
        <View style={[s.sectionHeader, { marginTop: spacing.lg }]}>
          <View style={[s.sectionIconChip, { backgroundColor: tints.blue.bg }]}>
            <Building2 size={16} color={tints.blue.fg} strokeWidth={2} />
          </View>
          <Text style={s.sectionTitle}>Assigned Banks ({bankAssignments.length})</Text>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: tints.blue.bg }]} onPress={() => router.push("/admin/banks" as any)} activeOpacity={0.8}>
            <Plus size={13} color={tints.blue.fg} strokeWidth={2.5} />
            <Text style={[s.addBtnText, { color: tints.blue.fg }]}>Assign</Text>
          </TouchableOpacity>
        </View>

        {bankAssignments.length === 0 ? (
          <EmptyState Icon={Building2} iconSlug="bank" title="No banks assigned yet" />
        ) : (
          bankAssignments.map((ba) => (
            <TouchableOpacity
              key={ba.id}
              style={s.appCard}
              onPress={() => router.push(`/admin/bank/${ba.bank_id}` as any)}
              activeOpacity={0.8}
            >
              <BankBadge name={ba.bank_name} shortName={ba.bank_short_name} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={s.schemeName}>{ba.bank_name}</Text>
                {ba.bank_short_name && <Text style={s.bankName}>{ba.bank_short_name}</Text>}
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDeleteBank(ba.id)}
                disabled={deletingBank === ba.id}
              >
                {deletingBank === ba.id
                  ? <ActivityIndicator size="small" color={tints.red.fg} />
                  : <Trash2 size={14} color={tints.red.fg} strokeWidth={2} />}
              </TouchableOpacity>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Assign Scheme Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Scheme</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <XCircle size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalHint}>Select a scheme to assign to {user?.full_name || "this user"}:</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {schemes.map((sc) => {
                const already = assignedSchemeIds.has(sc.id);
                const isSelected = selectedScheme?.id === sc.id;
                return (
                  <TouchableOpacity
                    key={sc.id}
                    style={[s.schemeRow, isSelected && s.schemeRowSelected, already && { opacity: 0.4 }]}
                    onPress={() => !already && setSelectedScheme(sc)}
                    disabled={already}
                    activeOpacity={0.8}
                  >
                    <View style={[s.schemeRowCheck, isSelected && s.schemeRowCheckSelected]}>
                      {isSelected && <CheckCircle2 size={12} color="#FFF" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.schemeRowName}>{sc.name}</Text>
                      <Text style={s.schemeRowAmt}>Up to {formatINR(sc.max_funding)}</Text>
                    </View>
                    {already && <Text style={{ fontSize: 10, color: colors.textDim }}>Assigned</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              label={`Assign ${selectedScheme?.name ?? "Scheme"}`}
              onPress={handleAssign}
              loading={assigning}
              disabled={!selectedScheme || assigning}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  userCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm2, flexDirection: "row", gap: spacing.sm2, alignItems: "flex-start", ...elevation.l1 },
  userName: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  metaText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  rolePill: { alignSelf: "flex-start", backgroundColor: tints.amber.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  messageBtn: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  rolePillText: { fontSize: 10, fontFamily: fonts.bold, color: tints.amber.fg, textTransform: "uppercase" },
  sectionCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm2, ...elevation.l1 },
  sectionLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  sectionValue: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  sectionMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  sectionActivity: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm2, marginTop: 4 },
  sectionIconChip: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  addBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
  appCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: spacing.sm2, flexDirection: "row", alignItems: "center", gap: 10, ...elevation.l1 },
  schemeIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  schemeName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 2 },
  bankName: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 4 },
  stagePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  stagePillText: { fontSize: 10, fontFamily: fonts.bold },
  deleteBtn: { width: 32, height: 32, borderRadius: radius.lg, backgroundColor: tints.red.bg, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 12, ...elevation.l2 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  modalHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  schemeRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.lg, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  schemeRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  schemeRowCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  schemeRowCheckSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  schemeRowName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  schemeRowAmt: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
});
