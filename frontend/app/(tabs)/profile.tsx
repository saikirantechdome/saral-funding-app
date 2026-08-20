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
import { Bell, Phone, LogOut, ChevronRight, Pencil, X, Check, Shield, MapPin, Calendar, Tag, User as UserIcon, Briefcase, FileCheck, FileText } from "lucide-react-native";

import { colors, spacing, radius, fonts, elevation, gradients, formatMobile } from "@/src/theme";
import { apiGet, apiPost, apiLogout } from "@/src/api";
import InitialsAvatar from "@/src/components/InitialsAvatar";
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
      ]).then(([u, b]) => {
        setMe(u);
        setBp(b);
        setEditName(u.full_name || "");
        setEditDistrict(u.district || "");
        setEditAge(u.age?.toString() || "");
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
    ...(!isAdmin ? [{ id: "book", label: "Book Consultation", Icon: Phone, onPress: () => router.push("/booking") }] : []),
    { id: "notif", label: "Notifications", Icon: Bell, onPress: () => router.push(isAdmin ? "/admin/notifications" : "/notifications") },
    { id: "privacy", label: "Privacy Policy", Icon: FileText, onPress: () => router.push({ pathname: "/legal", params: { doc: "privacy" } }) },
    { id: "terms", label: "Terms of Service", Icon: Shield, onPress: () => router.push({ pathname: "/legal", params: { doc: "terms" } }) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="profile-tab">
      <ScrollView
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar header */}
        <LinearGradient
          colors={gradients.heroCompact}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarSectionDark}
          testID="profile-hero-dark"
        >
          <View style={styles.avatarOuter}>
            <View style={styles.avatarRing}>
              <InitialsAvatar name={me?.full_name || "User"} size={72} />
            </View>
            {!editing && (
              <TouchableOpacity
                style={styles.editFab}
                onPress={() => setEditing(true)}
                testID="edit-profile-btn"
              >
                <Pencil size={12} color={colors.primaryDark} strokeWidth={2.5} />
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
                  ? <ActivityIndicator size="small" color={colors.primaryDark} />
                  : <Check size={16} color={colors.primaryDark} strokeWidth={2.5} />}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.nameDark}>{me?.full_name || "—"}</Text>
          )}
          <Text style={styles.mobileDark}>
            {me?.role === "user" ? "User" : me?.role?.replace(/_/g, " ") || "User"}
            {me?.email ? ` · ${me.email}` : ` · ${formatMobile(me?.mobile)}`}
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* Personal info — regular users only, admins don't fill this in */}
          {!isAdmin && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Personal</Text>
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
                    <InfoRow Icon={MapPin} label="State" value={me?.state} />
                    <InfoRow Icon={MapPin} label="District" value={me?.district} />
                    <InfoRow Icon={UserIcon} label="Gender" value={me?.gender} />
                    <InfoRow Icon={Calendar} label="Age" value={me?.age?.toString()} />
                    <InfoRow Icon={Tag} label="Category" value={me?.category} last />
                  </>
                )}
              </View>
            </View>
          )}

          {/* Business info */}
          {bp?.industry && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Business</Text>
              <View style={styles.infoCard}>
                <InfoRow Icon={Tag} label="Stage" value={bp?.business_stage} />
                <InfoRow Icon={Briefcase} label="Industry" value={bp?.industry} />
                <InfoRow Icon={FileCheck} label="GST" value={bp?.gst_available ? "Registered" : "Not registered"} />
                <InfoRow Icon={Shield} label="Udyam" value={bp?.udyam_available ? "Registered" : "Not registered"} last={!bp?.business_activity} />
                {bp?.business_activity && (
                  <View style={infoStyles.activityBlock}>
                    <Text style={infoStyles.activityLabel}>Business Activity</Text>
                    <Text style={infoStyles.activityValue}>{bp.business_activity}</Text>
                  </View>
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
                style={[styles.actionRow, a.primary && styles.actionRowPrimary]}
                onPress={a.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, a.primary && styles.actionIconPrimary]}>
                  <a.Icon size={16} color={a.primary ? colors.primaryDark : colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={[styles.actionLabel, a.primary && styles.actionLabelPrimary]}>
                  {a.label}
                </Text>
                <ChevronRight size={16} color={a.primary ? colors.primaryDark : colors.textDim} strokeWidth={2} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              testID="logout-btn"
              style={[styles.actionRow, styles.logoutRow]}
              onPress={logout}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, styles.logoutIcon]}>
                <LogOut size={16} color={colors.danger} strokeWidth={2} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Logout</Text>
              <ChevronRight size={16} color={colors.danger} strokeWidth={2} />
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
            <Icon size={13} color={colors.primaryDark} strokeWidth={2} />
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
        placeholderTextColor={colors.textPlaceholder}
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
    borderBottomColor: colors.border,
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
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
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
    color: colors.textMuted,
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
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
    borderBottomColor: colors.border,
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: "right",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface2,
  },
});

const styles = StyleSheet.create({
  avatarSectionDark: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    marginBottom: 16,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  nameDark: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
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
    backgroundColor: colors.primarySoft,
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
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...elevation.l1,
  },
  actionsWrap: {
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    ...elevation.l1,
  },
  actionRowPrimary: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  logoutRow: {
    borderColor: colors.dangerSoft,
    backgroundColor: "#FFF",
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconPrimary: {
    backgroundColor: colors.primaryMid,
  },
  logoutIcon: {
    backgroundColor: colors.dangerSoft,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  actionLabelPrimary: {
    color: colors.primaryDark,
  },
  aboutFooter: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
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
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastInfo: {
    backgroundColor: colors.primaryDark,
  },
  toastError: {
    backgroundColor: colors.danger,
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#FFF",
    textAlign: "center",
  },
});
