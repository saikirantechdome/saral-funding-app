import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, TextInput, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle2, XCircle, Landmark, Plus, X, Pencil } from "lucide-react-native";

import { colors, spacing, radius, fonts, elevation, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";
import MultiSelectPicker from "@/src/components/MultiSelectPicker";
import Button from "@/src/components/ui/Button";
import { DOCUMENT_TYPE_GROUPS } from "@/src/constants";

const STATE_OPTIONS = [
  "All India",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi (NCT)", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman & Nicobar Islands", "Dadra & Nagar Haveli", "Lakshadweep",
];

const EMPTY_FORM = {
  name: "", full_name: "", description: "",
  max_funding: "", max_subsidy_percent: "", process: "",
  eligibility: "", benefits: "", categories: "",
  documents: [] as string[],
  states: ["All India"] as string[],
};

export default function AdminSchemes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [schemes, me] = await Promise.all([
        apiGet<any[]>("/admin/schemes"),
        apiGet<any>("/auth/me"),
      ]);
      setItems(schemes);
      setRole(me?.role ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (s: any) => {
    setToggling(s.id);
    try {
      if (s.disabled) await apiPost(`/admin/schemes/${s.id}/enable`);
      else await apiPost(`/admin/schemes/${s.id}/disable`);
      await load();
    } finally {
      setToggling(null);
    }
  };

  const toggleDoc = (val: string) =>
    setForm((f) => ({
      ...f,
      documents: f.documents.includes(val)
        ? f.documents.filter((d) => d !== val)
        : [...f.documents, val],
    }));

  const toggleState = (val: string) => {
    setForm((f) => {
      if (val === "All India") {
        return { ...f, states: f.states.includes("All India") ? [] : ["All India"] };
      }
      const without = f.states.filter((s) => s !== "All India" && s !== val);
      const next = f.states.includes(val) ? without : [...without, val];
      return { ...f, states: next };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      full_name: s.full_name || "",
      description: s.description || "",
      max_funding: s.max_funding != null ? String(s.max_funding) : "",
      max_subsidy_percent: s.max_subsidy_percent != null ? String(s.max_subsidy_percent) : "",
      process: s.process || "",
      eligibility: (s.eligibility || []).join("\n"),
      benefits: (s.benefits || []).join("\n"),
      categories: (s.categories || []).join(", "),
      documents: s.documents || [],
      states: s.states && s.states.length ? s.states : ["All India"],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      Alert.alert("Required", "Name and description are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/admin/schemes", {
        id: editingId || undefined,
        name: form.name.trim(),
        full_name: form.full_name.trim(),
        description: form.description.trim(),
        max_funding: parseInt(form.max_funding) || 0,
        max_subsidy_percent: parseInt(form.max_subsidy_percent) || 0,
        process: form.process.trim(),
        eligibility: form.eligibility.split("\n").map((s) => s.trim()).filter(Boolean),
        benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
        documents: form.documents,
        categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
        states: form.states,
      });
      closeForm();
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save scheme.");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = role === "super_admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-schemes">
      <BackBar
        title="Schemes"
        onBack={() => router.back()}
        right={isSuperAdmin ? (
          <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.8}>
            <Plus size={16} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {items.filter((s) => !s.disabled).length} active  ·  {items.filter((s) => s.disabled).length} disabled
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Landmark} title="No schemes found" subtitle="Schemes will appear here after seeding." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.disabled && styles.cardDisabled]}
              testID={`admin-scheme-${item.id}`}
              onPress={() => router.push(`/admin/scheme/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.schemeIcon, item.disabled && styles.schemeIconDisabled]}>
                  <Landmark size={16} color={item.disabled ? colors.textDim : colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schemeName, item.disabled && styles.schemeNameDisabled]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.schemeMeta} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.schemeStats}>
                    <Text style={styles.schemeAmt}>Up to {formatINR(item.max_funding)}</Text>
                    {item.max_subsidy_percent > 0 && (
                      <Text style={styles.schemeSub}>{item.max_subsidy_percent}% subsidy</Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                {isSuperAdmin && (
                  <TouchableOpacity
                    testID={`edit-${item.id}`}
                    style={styles.editBtn}
                    onPress={(e) => { e.stopPropagation?.(); openEdit(item); }}
                    activeOpacity={0.8}
                  >
                    <Pencil size={13} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  testID={`toggle-${item.id}`}
                  style={[styles.toggleBtn, item.disabled ? styles.toggleBtnOff : styles.toggleBtnOn]}
                  onPress={(e) => { e.stopPropagation?.(); toggle(item); }}
                  disabled={toggling === item.id}
                  activeOpacity={0.8}
                >
                  {item.disabled
                    ? <XCircle size={13} color={colors.danger} strokeWidth={2} />
                    : <CheckCircle2 size={13} color={colors.primaryDark} strokeWidth={2} />}
                  <Text style={[styles.toggleText, item.disabled ? styles.toggleTextOff : styles.toggleTextOn]}>
                    {toggling === item.id ? "…" : item.disabled ? "Off" : "On"}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create / Edit Scheme Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Scheme" : "Create Scheme"}</Text>
              <TouchableOpacity onPress={closeForm}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <View style={{ gap: spacing.sm2 }}>
                <Field label="Scheme Name *" placeholder="e.g. PMEGP" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
                <Field label="Full Name" placeholder="e.g. Prime Minister's Employment Generation..." value={form.full_name} onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))} />
                <Field label="Description *" placeholder="Short description of the scheme..." value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
                <Field label="Max Funding (₹)" placeholder="e.g. 2500000" value={form.max_funding} onChangeText={(v) => setForm((f) => ({ ...f, max_funding: v }))} keyboardType="numeric" />
                <Field label="Max Subsidy %" placeholder="e.g. 35" value={form.max_subsidy_percent} onChangeText={(v) => setForm((f) => ({ ...f, max_subsidy_percent: v }))} keyboardType="numeric" />
                <Field label="Eligibility (one per line)" placeholder={"Must be an Indian citizen\nAge 18-45..."} value={form.eligibility} onChangeText={(v) => setForm((f) => ({ ...f, eligibility: v }))} multiline />
                <Field label="Benefits (one per line)" placeholder={"Up to 35% subsidy\nCollateral free..."} value={form.benefits} onChangeText={(v) => setForm((f) => ({ ...f, benefits: v }))} multiline />

                {/* Documents Required — searchable multi-select dropdown */}
                <MultiSelectPicker
                  label="Documents Required"
                  groups={DOCUMENT_TYPE_GROUPS}
                  selected={form.documents}
                  onToggle={toggleDoc}
                  testID="doc-picker"
                />

                <Field label="Process" placeholder="Application process description..." value={form.process} onChangeText={(v) => setForm((f) => ({ ...f, process: v }))} multiline />
                <Field label="Categories (comma separated)" placeholder="MSME, Manufacturing, Startup" value={form.categories} onChangeText={(v) => setForm((f) => ({ ...f, categories: v }))} />

                {/* States — searchable multi-select dropdown */}
                <MultiSelectPicker
                  label="States"
                  options={STATE_OPTIONS}
                  selected={form.states}
                  onToggle={toggleState}
                  testID="state-picker"
                />
              </View>
            </ScrollView>

            <View style={{ marginTop: spacing.sm }}>
              <Button
                testID="save-scheme"
                label={editingId ? "Save Changes" : "Create Scheme"}
                onPress={handleSave}
                loading={saving}
                size="lg"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, props.multiline && { minHeight: 72, textAlignVertical: "top" }]}
        placeholderTextColor={colors.textPlaceholder}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  statsText: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  createBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm2, backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm2, ...elevation.l1 },
  cardDisabled: { opacity: 0.6, backgroundColor: colors.surface2 },
  cardLeft: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  schemeIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  schemeIconDisabled: { backgroundColor: colors.surfaceAlt },
  schemeName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 3 },
  schemeNameDisabled: { color: colors.textMuted },
  schemeMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 17, marginBottom: 6 },
  schemeStats: { flexDirection: "row", gap: 8 },
  schemeAmt: { fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark },
  schemeSub: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  editBtn: { width: 30, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
  toggleBtnOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleBtnOff: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  toggleText: { fontSize: 12, fontFamily: fonts.bold },
  toggleTextOn: { color: colors.primaryDark },
  toggleTextOff: { color: colors.danger },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  fieldLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: fonts.regular, color: colors.text, backgroundColor: "#FFF" },
});
