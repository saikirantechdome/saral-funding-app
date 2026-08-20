import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Users, CheckCircle2, Clock, UserPlus, X, ChevronRight } from "lucide-react-native";

import { colors, tints, spacing, radius, fonts, elevation, formatINR, formatMobile } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Button from "@/src/components/ui/Button";
import InitialsAvatar from "@/src/components/InitialsAvatar";

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

function StagePill({ stage }: { stage: string }) {
  const isApproved = stage === "approved" || stage === "disbursed";
  const isRejected = stage === "rejected";
  const bg = isApproved ? colors.primarySoft : isRejected ? tints.red.bg : tints.amber.bg;
  const text = isApproved ? colors.primaryDark : isRejected ? tints.red.fg : tints.amber.fg;
  return (
    <View style={[s.stagePill, { backgroundColor: bg }]}>
      <Text style={[s.stagePillText, { color: text }]}>{STAGE_LABELS[stage] ?? stage}</Text>
    </View>
  );
}

export default function SchemeDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [scheme, setScheme] = useState<any>(null);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [loadingScheme, setLoadingScheme] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState<"all" | "selected" | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState("");
  const [notes, setNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<any>(null);

  const loadScheme = useCallback(async () => {
    try {
      const schemes = await apiGet<any[]>("/admin/schemes");
      setScheme(schemes.find((s: any) => s.id === id) ?? null);
    } finally {
      setLoadingScheme(false);
    }
  }, [id]);

  const loadAssignedUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await apiGet<any>(`/admin/schemes/${id}/assigned-users`);
      setAssignedUsers(res.users ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }, [id]);

  useEffect(() => {
    loadScheme();
    loadAssignedUsers();
  }, [loadScheme, loadAssignedUsers]);

  const openAssignModal = async () => {
    setAssignMode(null);
    setSelectedIds(new Set());
    setNotes("");
    setAssignResult(null);
    setSearchQ("");
    setShowAssignModal(true);
    const res = await apiGet<any>("/admin/users?limit=200");
    setAllUsers(Array.isArray(res) ? res : (res.items ?? []));
  };

  const toggleUser = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!assignMode) return;
    if (assignMode === "selected" && selectedIds.size === 0) return;
    setAssigning(true);
    try {
      const res = await apiPost(`/admin/schemes/${id}/assign`, {
        mode: assignMode,
        user_ids: assignMode === "selected" ? Array.from(selectedIds) : undefined,
        notes: notes.trim() || undefined,
      });
      setAssignResult(res);
      await loadAssignedUsers();
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) || (u.mobile || "").includes(q);
  });

  const assignedUserIds = new Set(assignedUsers.map((a) => a.user_id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title={scheme?.name ?? "Scheme"} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Scheme Info Card */}
        {loadingScheme ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : scheme ? (
          <View style={s.infoCard}>
            <Text style={s.schemeFullName}>{scheme.full_name || scheme.name}</Text>
            <Text style={s.schemeDesc}>{scheme.description}</Text>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statVal}>{formatINR(scheme.max_funding)}</Text>
                <Text style={s.statLabel}>Max Funding</Text>
              </View>
              {scheme.max_subsidy_percent > 0 && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{scheme.max_subsidy_percent}%</Text>
                  <Text style={s.statLabel}>Subsidy</Text>
                </View>
              )}
              <View style={s.statBox}>
                <Text style={s.statVal}>{assignedUsers.length}</Text>
                <Text style={s.statLabel}>Assigned</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Assign Button */}
        <View style={{ marginBottom: spacing.lg }}>
          <Button
            label="Assign Scheme to Users"
            onPress={openAssignModal}
            Icon={UserPlus}
            iconPosition="left"
            size="lg"
          />
        </View>

        {/* Assigned Users */}
        <View style={s.sectionHeader}>
          <Users size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={s.sectionTitle}>Assigned Users ({assignedUsers.length})</Text>
        </View>

        {loadingUsers ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : assignedUsers.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No users assigned yet</Text>
            <Text style={s.emptyHint}>Tap "Assign Scheme to Users" above to get started.</Text>
          </View>
        ) : (
          assignedUsers.map((item) => (
            <TouchableOpacity
              key={item.application_id}
              style={s.userCard}
              onPress={() => router.push(`/admin/user/${item.user_id}`)}
              activeOpacity={0.8}
            >
              <InitialsAvatar name={item.user?.full_name || "User"} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{item.user?.full_name || "Unnamed"}</Text>
                <Text style={s.userMobile}>{formatMobile(item.user?.mobile)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <StagePill stage={item.stage} />
              </View>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Scheme</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {assignResult ? (
              <View style={{ gap: 12, padding: 8 }}>
                <View style={s.successIconWrap}>
                  <CheckCircle2 size={30} color={colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={[s.modalTitle, { textAlign: "center" }]}>Done!</Text>
                <Text style={s.resultRow}>Newly assigned: <Text style={s.resultVal}>{assignResult.assigned}</Text></Text>
                <Text style={s.resultRow}>Already had scheme: <Text style={s.resultVal}>{assignResult.skipped}</Text></Text>
                <Button label="Close" onPress={() => setShowAssignModal(false)} size="lg" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Mode selection */}
                {!assignMode ? (
                  <View style={{ gap: 12, paddingVertical: 8 }}>
                    <Text style={s.modeHint}>Choose assignment type:</Text>
                    <TouchableOpacity style={s.modeBtn} onPress={() => setAssignMode("all")}>
                      <View style={s.modeIconWrap}>
                        <Users size={18} color={colors.primaryDark} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.modeBtnTitle}>Assign to All Users</Text>
                        <Text style={s.modeBtnDesc}>Scheme becomes visible to all registered users</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.modeBtn} onPress={() => setAssignMode("selected")}>
                      <View style={s.modeIconWrap}>
                        <CheckCircle2 size={18} color={colors.primaryDark} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.modeBtnTitle}>Assign to Selected Users</Text>
                        <Text style={s.modeBtnDesc}>Pick specific users who can access this scheme</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity onPress={() => setAssignMode(null)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: colors.primary, fontFamily: fonts.medium, fontSize: 13 }}>← Change mode</Text>
                    </TouchableOpacity>

                    <Text style={s.modeHint}>
                      {assignMode === "all" ? "Assign to ALL users" : `Select users (${selectedIds.size} selected)`}
                    </Text>

                    {assignMode === "selected" && (
                      <>
                        <TextInput
                          style={s.searchInput}
                          placeholder="Search users..."
                          placeholderTextColor={colors.textPlaceholder}
                          value={searchQ}
                          onChangeText={setSearchQ}
                        />
                        <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                          {filteredUsers.map((u) => {
                            const isAssigned = assignedUserIds.has(u.id);
                            const isSelected = selectedIds.has(u.id);
                            return (
                              <TouchableOpacity
                                key={u.id}
                                style={[s.userRow, isSelected && s.userRowSelected, isAssigned && { opacity: 0.4 }]}
                                onPress={() => !isAssigned && toggleUser(u.id)}
                                disabled={isAssigned}
                              >
                                <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                                  {isSelected && <CheckCircle2 size={12} color="#FFF" strokeWidth={3} />}
                                </View>
                                <InitialsAvatar name={u.full_name || "User"} size={28} />
                                <View style={{ flex: 1 }}>
                                  <Text style={s.userRowName}>{u.full_name || "Unnamed"}</Text>
                                  <Text style={s.userRowMobile}>{formatMobile(u.mobile)}</Text>
                                </View>
                                {isAssigned && <Text style={{ fontSize: 10, color: colors.textDim }}>Already assigned</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}

                    <TextInput
                      style={[s.searchInput, { minHeight: 60, textAlignVertical: "top" }]}
                      placeholder="Notes (optional)..."
                      placeholderTextColor={colors.textPlaceholder}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                    />

                    <Button
                      label={assignMode === "all" ? "Assign to All Users" : `Assign to ${selectedIds.size} User${selectedIds.size !== 1 ? "s" : ""}`}
                      onPress={handleAssign}
                      loading={assigning}
                      disabled={assigning || (assignMode === "selected" && selectedIds.size === 0)}
                      size="lg"
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  infoCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm2, ...elevation.l1 },
  schemeFullName: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 4 },
  schemeDesc: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: spacing.sm2 },
  statBox: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.lg, padding: 10, alignItems: "center" },
  statVal: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.primaryDark },
  statLabel: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  emptyBox: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: "center", gap: 6, ...elevation.l1 },
  emptyText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  emptyHint: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center" },
  userCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: spacing.sm2, flexDirection: "row", alignItems: "center", gap: spacing.sm2, ...elevation.l1 },
  userName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  userMobile: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  stagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  stagePillText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "capitalize" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  modeHint: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
  modeBtn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface2, borderRadius: radius.xl, padding: 14, borderWidth: 1, borderColor: colors.border },
  modeIconWrap: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  modeBtnTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  modeBtnDesc: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  successIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  searchInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: fonts.regular, color: colors.text, backgroundColor: "#FFF" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.lg, marginBottom: 4 },
  userRowSelected: { backgroundColor: colors.primarySoft },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  userRowName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  userRowMobile: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  resultRow: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  resultVal: { fontFamily: fonts.bold, color: colors.primaryDark },
});
