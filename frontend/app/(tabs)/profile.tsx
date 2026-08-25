import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Pencil, X, Check } from "lucide-react-native";

import { spacing, radius, fonts, formatMobile, shortRef } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { apiGet, apiPost, apiLogout } from "@/src/api";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

export default function Profile() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing();
  const [me, setMe] = useState<any>(null);
  const [bp, setBp] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "info" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  }, [toastAnim]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editAge, setEditAge] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<any>("/business-profile").catch(() => ({})),
        apiGet<any[]>("/notifications/me").catch(() => []),
      ]).then(([u, b, notifs]) => {
        setMe(u);
        setBp(b);
        setEditName(u.full_name || "");
        setEditDistrict(u.district || "");
        setEditAge(u.age?.toString() || "");
        setUnreadNotifs((notifs || []).filter((n: any) => !n.read).length);
      });
    }, [])
  );

  const logout = async () => {
    const doLogout = async () => {
      await apiLogout();
      if (Platform.OS === "web") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    };

    if (Platform.OS === "web") {
      // Alert.alert on web maps to window.confirm which only has OK/Cancel
      if (window.confirm("Are you sure you want to logout?")) {
        await doLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const saveEdits = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/profile", {
        full_name: editName.trim(),
        state: me.state,
        district: editDistrict.trim() || me.district,
        gender: me.gender,
        age: Number(editAge) || me.age,
        category: me.category,
      });
      const updated = await apiGet<any>("/auth/me");
      setMe(updated);
      setEditing(false);
      showToast("Profile updated");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const bootstrapAdmin = async () => {
    setBootstrapping(true);
    try {
      const res = await apiPost<{ message: string }>("/auth/bootstrap-admin", {});
      const updated = await apiGet<any>("/auth/me");
      setMe(updated);
      Alert.alert("Success", res.message, [
        { text: "Go to Admin", onPress: () => router.push("/admin") },
      ]);
    } catch (e: any) {
      const msg: string = e.message || "";
      if (msg.toLowerCase().includes("super_admin already exists")) {
        showToast("A Super Admin is already set up", "info");
      } else {
        Alert.alert("Failed", msg || "Could not promote to admin. Make sure the server is running.");
      }
    } finally {
      setBootstrapping(false);
    }
  };

  const isAdmin = me?.role && me.role !== "user";
  const actions = [
    // Order matches the approved prototype's Profile list: Business profile,
    // Notifications, Help & support, (Log out separately below in red).
    // Exactly the prototype's 4 rows (Business profile / Notifications /
    // Help & support / Log out below) — Book Consultation, Privacy Policy,
    // and Terms of Service were extras not in the prototype; dropped per
    // explicit instruction. Those screens (/booking, /legal) still exist
    // and work, just aren't linked from Profile anymore.
    ...(!isAdmin && bp?.industry ? [{ id: "business", label: "Business profile", onPress: () => router.push("/business-profile" as any) }] : []),
    { id: "notif", label: "Notifications", onPress: () => router.push(isAdmin ? "/admin/notifications" : "/notifications") },
    { id: "support", label: isAdmin ? "Support Inbox" : "Help & support", onPress: () => router.push((isAdmin ? "/admin/support" : "/support") as any) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }} edges={["top"]} testID="profile-tab">
      <ScrollView
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar header */}
        <LinearGradient
          colors={protoColors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarSectionDark}
          testID="profile-hero-dark"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.avatarOuter}>
            {/* Flat teal circle — the prototype's Profile avatar has no
                image/initials at all (`.s-av`-style blank placeholder), same
                treatment as Status/Documents/Home row icons. The edit pencil
                badge is a real affordance the static prototype doesn't
                depict any state for, so it stays. */}
            <View style={styles.avatarRing}>
              <View style={[styles.avatarBlank, { width: 72, height: 72, borderRadius: 36 }]} />
            </View>
            {!editing && (
              <TouchableOpacity
                style={styles.editFab}
                onPress={() => setEditing(true)}
                testID="edit-profile-btn"
              >
                <Pencil size={12} color={protoColors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoFocus
              />
              <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditing(false)}>
                <X size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editIconBtn, styles.editIconBtnSave]}
                onPress={saveEdits}
                disabled={saving}
                testID="save-profile-btn"
              >
                {saving
                  ? <ActivityIndicator size="small" color={protoColors.primary} />
                  : <Check size={16} color={protoColors.primary} strokeWidth={2.5} />}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.nameDark}>{me?.full_name || "—"}</Text>
          )}
          <Text style={styles.mobileDark}>
            {me?.email ? me.email : formatMobile(me?.mobile)}
            {me?.id ? ` · SRL-${shortRef(me.id)}` : ""}
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* Personal info — State/City/Category only, matching the
              prototype's Profile card exactly. Gender/Age are real fields
              too but the prototype doesn't display them here; Age stays
              reachable via Edit. Business details moved to their own
              /business-profile screen (see the "Business profile" row
              below) rather than shown inline, also matching the prototype. */}
          {!isAdmin && (
            <View style={styles.sectionWrap}>
              <View style={styles.infoCard}>
                {editing ? (
                  <>
                    <EditRow
                      label="District"
                      value={editDistrict}
                      onChangeText={setEditDistrict}
                      placeholder={me?.district || "District"}
                    />
                    <EditRow
                      label="Age"
                      value={editAge}
                      onChangeText={(v: string) => setEditAge(v.replace(/\D/g, "").slice(0, 2))}
                      placeholder={me?.age?.toString() || "Age"}
                      keyboardType="number-pad"
                    />
                  </>
                ) : (
                  <>
                    <InfoRow label="State" value={me?.state} />
                    <InfoRow label="City" value={me?.district} />
                    <InfoRow label="Category" value={me?.category} last />
                  </>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsWrap}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.id}
                testID={`goto-${a.id}`}
                style={styles.actionRow}
                onPress={a.onPress}
                activeOpacity={0.8}
              >
                <View style={styles.actionIcon} />
                <Text style={styles.actionLabel}>
                  {a.label}
                </Text>
                {a.id === "notif" && unreadNotifs > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadNotifs}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={protoColors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              testID="logout-btn"
              style={[styles.actionRow, styles.logoutRow]}
              onPress={logout}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, styles.logoutIcon]} />
              <Text style={[styles.actionLabel, { color: protoColors.danger }]}>Logout</Text>
              <ChevronRight size={16} color={protoColors.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.aboutFooter}>
            Saral Funding helps Indian entrepreneurs discover and apply for government funding schemes.{"\n"}v1.0.0
          </Text>

        </View>
      </ScrollView>
      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === "error" ? styles.toastError : styles.toastInfo,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ Icon, label, value, last = false }: { Icon?: any; label: string; value?: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      <View style={infoStyles.labelWrap}>
        {Icon && (
          <View style={infoStyles.iconChip}>
            <Icon size={13} color={protoColors.primary} strokeWidth={2} />
          </View>
        )}
        <Text style={infoStyles.label}>{label}</Text>
      </View>
      <Text style={infoStyles.value}>{value || "—"}</Text>
    </View>
  );
}

function EditRow({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={infoStyles.editRow}>
      <Text style={infoStyles.label}>{label}</Text>
      <TextInput
        style={infoStyles.editInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={protoColors.textDim}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: protoColors.border,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: protoColors.pill.teal.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  // The prototype's info rows are the opposite of the usual "muted label,
  // prominent value" pattern: the label ("State") is the dark/prominent
  // text and the value ("Maharashtra") is the smaller muted one — and
  // neither is bold, just regular weight throughout (Armata has no bold
  // variant, and the prototype never overrides font-weight here).
  label: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: protoColors.text,
  },
  value: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: protoColors.textMuted,
    maxWidth: "55%",
    textAlign: "right",
  },
  activityBlock: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  activityLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: protoColors.textMuted,
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: protoColors.text,
    lineHeight: 18,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm2,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: protoColors.border,
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: protoColors.text,
    textAlign: "right",
    borderWidth: 1,
    borderColor: protoColors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: protoColors.fieldBg,
  },
});

const styles = StyleSheet.create({
  avatarSectionDark: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 29,
    borderBottomRightRadius: 29,
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginLeft: spacing.md,
    marginBottom: 18,
  },
  notifBadge: {
    backgroundColor: protoColors.pill.blue.bg,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  notifBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: protoColors.pill.blue.text,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarBlank: {
    backgroundColor: protoColors.accent,
  },
  nameDark: {
    fontSize: 20,
    // Regular, not displayBold — the prototype's name text has no
    // font-weight override (Armata's only weight is 400).
    fontFamily: fonts.regular,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  mobileDark: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.7)",
    textTransform: "capitalize",
  },
  avatarOuter: {
    position: "relative",
    marginBottom: 12,
  },
  editFab: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: protoColors.pill.teal.bg,
    borderWidth: 2,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs2,
    marginBottom: 4,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  editNameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconBtnSave: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  sectionWrap: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: protoColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    overflow: "hidden",
  },
  actionsWrap: {
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  logoutRow: {
    backgroundColor: protoColors.dangerSoft,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    // Flat placeholder, no glyph — matches the prototype's `.s-ico` exactly.
    backgroundColor: protoColors.iconPlaceholder,
  },
  logoutIcon: {
    backgroundColor: "#FBE7E2",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    // Regular, not semiBold — no row label is bold in the prototype.
    fontFamily: fonts.regular,
    color: protoColors.text,
  },
  aboutFooter: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: protoColors.textDim,
    textAlign: "center",
    lineHeight: 18,
    marginTop: spacing.lg,
  },
  toast: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: protoColors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastInfo: {
    backgroundColor: protoColors.primaryDark,
  },
  toastError: {
    backgroundColor: protoColors.danger,
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#FFF",
    textAlign: "center",
  },
});
