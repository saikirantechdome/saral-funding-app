import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  UserPlus, Users, ChevronDown, X, Check, Trash2, Shield,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import EmptyState from "@/src/components/EmptyState";
import Button from "@/src/components/ui/Button";

const ROLES = [
  { value: "super_admin",       label: "Super Admin",       desc: "Full access including team & config",      color: tints.amber.bg, text: tints.amber.fg },
  { value: "manager",           label: "Manager",           desc: "Full access except super admin actions",  color: tints.blue.bg, text: tints.blue.fg },
  { value: "expert",            label: "Expert",            desc: "View leads, add notes, recommend schemes", color: tints.deepTeal.bg, text: tints.deepTeal.fg },
  { value: "sales_executive",   label: "Sales Executive",   desc: "Manage leads and consultations",           color: colors.primarySoft, text: colors.primaryDark },
  { value: "support_executive", label: "Support Executive", desc: "View users, handle support queries",       color: tints.red.bg, text: tints.red.fg },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return null;
  return (
    <View style={[badge.wrap, { backgroundColor: r.color }]}>
      <Text style={[badge.text, { color: r.text }]}>{r.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
});

export default function AdminTeam() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState("sales_executive");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, me] = await Promise.all([
        apiGet<any[]>("/admin/team"),
        apiGet<any>("/auth/me"),
      ]);
      setTeam(Array.isArray(res) ? res : []);
      setCurrentUserRole(me?.role || "");
    } catch {
      setTeam([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleInvite = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Name required", "Enter the team member's name.");
      return;
    }
    setInviting(true);
    try {
      await apiPost("/admin/team/invite", {
        mobile: cleanMobile,
        full_name: name.trim(),
        role: selectedRole,
      });
      setShowInvite(false);
      setMobile("");
      setName("");
      setSelectedRole("sales_executive");
      await load();
      Alert.alert("Done", "Team member added. They can now log in with their mobile number.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not add team member.");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await apiPost(`/admin/users/${userId}/role`, { role: newRole });
      setTeam((prev) => prev.map((m) => m.id === userId ? { ...m, role: newRole } : m));
    } catch {
      Alert.alert("Error", "Could not update role.");
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemove = (member: any) => {
    Alert.alert(
      "Remove Team Member",
      `Remove ${member.full_name || member.mobile} from the team? They will lose admin access.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiPost(`/admin/users/${member.id}/role`, { role: "user" });
              await load();
            } catch {
              Alert.alert("Error", "Could not remove team member.");
            }
          },
        },
      ]
    );
  };

  const isSuperAdmin = currentUserRole === "super_admin";
  const visibleRoles = isSuperAdmin ? ROLES : ROLES.filter((r) => r.value !== "super_admin");
  const selectedRoleObj = ROLES.find((r) => r.value === selectedRole) ?? ROLES[1];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title="Team Members" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <View style={s.headerIconChip}>
              <Users size={15} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <Text style={s.headerText}>{team.length} team member{team.length !== 1 ? "s" : ""}</Text>
          </View>
          <Button
            label="Add Member"
            Icon={UserPlus}
            iconPosition="left"
            onPress={() => setShowInvite(true)}
            size="sm"
            fullWidth={false}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : team.length === 0 ? (
          <EmptyState
            Icon={Shield}
            title="No team members yet"
            subtitle='Tap "Add Member" to invite your first team member.'
          />
        ) : (
          team.map((member) => (
            <View key={member.id} style={s.memberCard}>
              <InitialsAvatar name={member.full_name || "Unnamed"} size={44} />
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.memberName} numberOfLines={1}>{member.full_name || "Unnamed"}</Text>
                  {member.role === "super_admin" && (
                    <View style={[badge.wrap, { backgroundColor: tints.amber.bg }]}>
                      <Text style={[badge.text, { color: tints.amber.fg }]}>Super Admin</Text>
                    </View>
                  )}
                  {member.role !== "super_admin" && <RoleBadge role={member.role} />}
                </View>
                <Text style={s.memberMobile}>+91 {member.mobile}</Text>

                {/* Role change — only for non super_admin members, or if current user is super_admin */}
                {(member.role !== "super_admin" || isSuperAdmin) && member.role !== "super_admin" && (
                  <View style={s.roleRow}>
                    {visibleRoles.map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        style={[s.roleChip, member.role === r.value && { backgroundColor: r.color, borderColor: r.text + "40" }]}
                        onPress={() => handleChangeRole(member.id, r.value)}
                        disabled={changingRole === member.id || member.role === r.value}
                        activeOpacity={0.75}
                      >
                        {changingRole === member.id && member.role !== r.value ? (
                          <ActivityIndicator size={10} color={colors.textDim} />
                        ) : member.role === r.value ? (
                          <Check size={10} color={r.text} strokeWidth={2.5} />
                        ) : null}
                        <Text style={[s.roleChipText, member.role === r.value && { color: r.text, fontFamily: fonts.bold }]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Remove button */}
              {member.role !== "super_admin" && (
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(member)} activeOpacity={0.75}>
                  <Trash2 size={14} color={tints.red.fg} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <View style={modal.overlay}>
          <View style={[modal.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={modal.header}>
              <Text style={modal.title}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <X size={20} color={colors.textDim} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={modal.label}>Full Name</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textPlaceholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={modal.label}>Mobile Number</Text>
            <TextInput
              style={modal.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textPlaceholder}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={modal.label}>Role</Text>
            <TouchableOpacity style={modal.rolePicker} onPress={() => setShowRolePicker(!showRolePicker)} activeOpacity={0.8}>
              <View style={[badge.wrap, { backgroundColor: selectedRoleObj.color }]}>
                <Text style={[badge.text, { color: selectedRoleObj.text }]}>{selectedRoleObj.label}</Text>
              </View>
              <Text style={modal.roleDesc}>{selectedRoleObj.desc}</Text>
              <ChevronDown size={16} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>

            {showRolePicker && (
              <View style={modal.roleList}>
                {visibleRoles.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[modal.roleOption, selectedRole === r.value && { backgroundColor: r.color + "40" }]}
                    onPress={() => { setSelectedRole(r.value); setShowRolePicker(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[badge.wrap, { backgroundColor: r.color }]}>
                      <Text style={[badge.text, { color: r.text }]}>{r.label}</Text>
                    </View>
                    <Text style={modal.roleOptionDesc}>{r.desc}</Text>
                    {selectedRole === r.value && <Check size={14} color={colors.primaryDark} strokeWidth={2.5} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ marginTop: spacing.sm2 }}>
              <Button
                label="Add Team Member"
                Icon={UserPlus}
                iconPosition="left"
                onPress={handleInvite}
                loading={inviting}
                disabled={inviting}
                size="lg"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerIconChip: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
  memberCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm2,
    backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  memberName: { flex: 1, fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  memberMobile: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 8 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  roleChipText: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: tints.red.bg, alignItems: "center", justifyContent: "center",
    flexShrink: 0, alignSelf: "center",
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.md, paddingBottom: 40,
    ...elevation.l2,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  label: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: 16,
  },
  rolePicker: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, backgroundColor: colors.surface2, marginBottom: 8,
  },
  roleDesc: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  roleList: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    overflow: "hidden", marginBottom: 16,
  },
  roleOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  roleOptionDesc: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
});
