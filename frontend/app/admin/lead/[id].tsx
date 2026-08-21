import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  User, Phone, MapPin, Building2, DollarSign, StickyNote,
  Calendar, Clock, ArrowRight, CheckCircle2, AlertCircle,
  FileText, ChevronDown, X, Tag, Upload, Star, ExternalLink,
  Plus, Trash2, ChevronRight, Bell, Send,
  MoreVertical, Check, Hash, Users, Landmark,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, stageColor, tints, elevation, tagColor, formatMobile, shortRef } from "@/src/theme";
import { apiGet, apiPost, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import Button from "@/src/components/ui/Button";
import RemoteIcon from "@/src/components/RemoteIcon";
import BankBadge from "@/src/components/BankBadge";
import { docTypeStyle } from "@/src/utils/docType";
import { schemeStyle } from "@/src/utils/schemeType";

const RECOMMENDED_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Axis Bank",
];

const STAGES = ["new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

function StagePill({ stage }: { stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pill.wrap, { backgroundColor: bg }]}>
      <Text style={[pill.text, { color: text }]}>{stage}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
});

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={row.wrap}>
      <View style={row.icon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.value}>{value}</Text>
      </View>
    </View>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginTop: 2 },
  label: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, marginTop: 1 },
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={card.wrap}>
      <Text style={card.title}>{title}</Text>
      {children}
    </View>
  );
}
const card = StyleSheet.create({
  wrap: { backgroundColor: "#FFF", borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm2, ...elevation.l1 },
  title: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
});

// Horizontal progress tracker over this lead's own real stage model — a
// checkmark for every stage already passed, a highlighted current step, and
// a connecting line, scrollable since the CRM has more raw stages than fit
// on screen at once. Labels are the real stage values, just title-cased —
// nothing here is an invented milestone name.
function StageTracker({ stages, current }: { stages: string[]; current: string }) {
  const idx = stages.indexOf(current);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tracker.row}>
      {stages.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = i === idx;
        const isLast = i === stages.length - 1;
        return (
          <View key={s} style={tracker.step}>
            <View style={tracker.stepRow}>
              <View style={[tracker.dot, done && tracker.dotDone, active && tracker.dotActive]}>
                {done ? (
                  <Check size={12} color="#FFF" strokeWidth={3} />
                ) : (
                  <Text style={[tracker.dotText, active && tracker.dotTextActive]}>{i + 1}</Text>
                )}
              </View>
              {!isLast && <View style={[tracker.line, done && tracker.lineDone]} />}
            </View>
            <Text style={[tracker.label, active && tracker.labelActive]} numberOfLines={1}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
const tracker = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  step: { alignItems: "center", width: 76 },
  stepRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  dot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 },
  dotText: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted },
  dotTextActive: { color: colors.primaryDark },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  lineDone: { backgroundColor: colors.primary },
  label: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, marginTop: 5, textAlign: "center", textTransform: "capitalize" },
  labelActive: { fontFamily: fonts.bold, color: colors.primaryDark },
});

function TimelineEvent({ item }: { item: any }) {
  const actionLabel: Record<string, { label: string; color: string }> = {
    stage_changed: { label: "Stage Changed", color: tints.blue.fg },
    note_added: { label: "Note Added", color: tints.amber.fg },
    assigned: { label: "Assigned", color: tints.green.fg },
    follow_up_set: { label: "Follow-up Set", color: tints.deepTeal.fg },
    created: { label: "Lead Created", color: colors.primaryDark },
    updated: { label: "Updated", color: colors.textMuted },
  };
  const meta = actionLabel[item.action] ?? { label: item.action, color: colors.textMuted };
  const dateStr = item.ts ? new Date(item.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <View style={tl.wrap}>
      <View style={[tl.dot, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[tl.action, { color: meta.color }]}>{meta.label}</Text>
          <Text style={tl.date}>{dateStr}</Text>
        </View>
        <Text style={tl.note}>{item.note}</Text>
        {item.actor && <Text style={tl.actor}>by {item.actor}</Text>}
      </View>
    </View>
  );
}
const tl = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  action: { fontSize: 12, fontFamily: fonts.bold },
  date: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },
  note: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, marginTop: 2 },
  actor: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, fontStyle: "italic", marginTop: 1 },
});

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  // Documents
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  // Scheme Applications
  const [schemeApps, setSchemeApps] = useState<any[]>([]);
  const [bankAssignments, setBankAssignments] = useState<any[]>([]);
  const [allSchemes, setAllSchemes] = useState<any[]>([]);
  const [allBanks, setAllBanks] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [assignScheme, setAssignScheme] = useState<any>(null);
  const [assignBank, setAssignBank] = useState<any>(null);
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [stageModal, setStageModal] = useState<any>(null); // {app}
  const [stageNote, setStageNote] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [updatingStage, setUpdatingStage] = useState(false);

  // Notification
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  const NOTIF_TEMPLATES = [
    { label: "KYC Pending", title: "KYC Pending", body: "Your KYC is pending. Please complete it for faster processing." },
    { label: "PAN Missing", title: "Document Missing", body: "Your PAN Card is missing. Please upload it to continue your application." },
    { label: "Aadhaar Missing", title: "Document Missing", body: "Your Aadhaar Card is missing. Kindly upload it to proceed." },
    { label: "Application Update", title: "Application Update", body: "Your funding application has been updated. Please check your status." },
    { label: "Call Scheduled", title: "Call Scheduled", body: "Our advisor has scheduled a call with you. Please keep your phone handy." },
  ];

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert("Missing Fields", "Please enter both a title and message.");
      return;
    }
    const userId = data?.user?.id || data?.user_id;
    if (!userId) return;
    setSendingNotif(true);
    try {
      await apiPost("/admin/notifications", {
        title: notifTitle.trim(),
        body: notifBody.trim(),
        type: "platform",
        target_user_ids: [userId],
      });
      setNotifTitle("");
      setNotifBody("");
      Alert.alert("Sent", "Notification delivered to the user.");
    } catch {
      Alert.alert("Error", "Failed to send notification.");
    } finally {
      setSendingNotif(false);
    }
  };

  const load = async () => {
    try {
      const d = await apiGet<any>(`/admin/leads/${id}`);
      setData(d);
      setNotes(d.notes || "");
      setFollowUp(d.follow_up_date || "");
      // Load docs and existing recommendation in parallel
      const userId = d.user?.id || d.user_id;
      if (userId) {
        const [docs, apps, bankApps, schemes, banks] = await Promise.all([
          apiGet<any[]>(`/admin/users/${userId}/documents`).catch(() => []),
          apiGet<any[]>(`/admin/users/${userId}/scheme-applications`).catch(() => []),
          apiGet<any[]>(`/admin/users/${userId}/bank-assignments`).catch(() => []),
          apiGet<any[]>("/schemes").catch(() => []),
          apiGet<any[]>("/banks").catch(() => []),
        ]);
        setUserDocs(Array.isArray(docs) ? docs : []);
        setSchemeApps(Array.isArray(apps) ? apps : []);
        setBankAssignments(Array.isArray(bankApps) ? bankApps : []);
        setAllSchemes(Array.isArray(schemes) ? schemes : []);
        setAllBanks(Array.isArray(banks) ? banks : []);
      }
    } catch {
      Alert.alert("Error", "Could not load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDocStatus = async (docId: string, status: "verified" | "rejected") => {
    setDocActionLoading(docId + status);
    try {
      await apiPost(`/admin/documents/${docId}/status`, { status });
      const userId = data?.user?.id || data?.user_id;
      if (userId) {
        const docs = await apiGet<any[]>(`/admin/users/${userId}/documents`).catch(() => []);
        setUserDocs(Array.isArray(docs) ? docs : []);
      }
    } catch {
      Alert.alert("Error", "Could not update document status.");
    } finally {
      setDocActionLoading(null);
    }
  };

  const handleAdminViewDoc = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/admin/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not get download link");
      const { url } = await response.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document. Please try again.");
    } finally {
      setViewingDoc(null);
    }
  };

  const assignSchemeToUser = async () => {
    if (!assignScheme) return;
    setAssigning(true);
    const userId = data?.user?.id || data?.user_id;
    try {
      await apiPost(`/admin/users/${userId}/scheme-applications`, {
        scheme_id:   assignScheme.id,
        scheme_name: assignScheme.name,
        bank_id:     assignBank?.id || null,
        bank_name:   assignBank?.name || null,
        notes:       assignNote,
      });
      const apps = await apiGet<any[]>(`/admin/users/${userId}/scheme-applications`).catch(() => []);
      setSchemeApps(Array.isArray(apps) ? apps : []);
      setAssignModal(false);
      setAssignScheme(null);
      setAssignBank(null);
      setAssignNote("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not assign scheme.");
    } finally {
      setAssigning(false);
    }
  };

  const updateAppStage = async (appId: string, stage: string) => {
    setUpdatingStage(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/admin/scheme-applications/${appId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage, note: stageNote }),
      });
      if (!res.ok) throw new Error("Failed");
      const userId = data?.user?.id || data?.user_id;
      const apps = await apiGet<any[]>(`/admin/users/${userId}/scheme-applications`).catch(() => []);
      setSchemeApps(Array.isArray(apps) ? apps : []);
      setStageModal(null);
      setStageNote("");
    } catch {
      Alert.alert("Error", "Could not update stage.");
    } finally {
      setUpdatingStage(false);
    }
  };

  const deleteSchemeApp = (appId: string, schemeName: string) => {
    Alert.alert("Remove Scheme", `Remove "${schemeName}" from this user's applications?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          const token = await getToken();
          await fetch(`${API_BASE}/admin/scheme-applications/${appId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          setSchemeApps(prev => prev.filter(a => a.id !== appId));
        } catch { Alert.alert("Error", "Could not remove."); }
      }},
    ]);
  };

  const moveStage = async (stage: string) => {
    setSaving(true);
    try {
      await apiPost(`/admin/leads/${id}`, { stage, notes });
      await load();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPost(`/admin/leads/${id}`, {
        stage: data?.stage,
        notes,
        ...(followUp ? { follow_up_date: followUp } : {}),
      });
      await load();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="Application Details" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
          {[120, 160, 200, 140].map((h, i) => (
            <SkeletonBox key={i} width="100%" height={h} borderRadius={radius.xxl} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const user = data.user || {};
  const bp = data.business_profile || {};
  const fa = data.assessment || {};
  const activity: any[] = data.activity_log || [];
  const consultations: any[] = data.consultations || [];
  const schemeMatches: any[] = data.scheme_matches || [];

  const appliedOn = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="lead-detail">
      <BackBar
        title="Application Details"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            testID="application-more-btn"
            style={styles.moreBtn}
            onPress={() => setMoreMenu(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={18} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Person row */}
        <View style={card.wrap}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm2 }}>
            <InitialsAvatar name={user.full_name || data.full_name || "Unknown"} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.leadName}>{user.full_name || data.full_name || "Unknown"}</Text>
              <Text style={styles.leadMobile}>{formatMobile(user.mobile || data.mobile)}</Text>
            </View>
            <StagePill stage={data.stage} />
          </View>
        </View>

        {/* Headline: loan/scheme type + requested amount */}
        {(data.consultation_type || data.funding_required > 0) && (
          <View style={card.wrap}>
            {data.consultation_type && (
              <Text style={styles.headlineType}>{data.consultation_type}</Text>
            )}
            {data.funding_required > 0 && (
              <>
                <Text style={styles.headlineAmount}>{formatINR(data.funding_required)}</Text>
                <Text style={styles.headlineCaption}>Requested Amount</Text>
              </>
            )}
          </View>
        )}

        {/* Meta row: applied-on date, state, reference code */}
        <View style={styles.metaRow}>
          {appliedOn && (
            <View style={styles.metaChip}>
              <Calendar size={12} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.metaChipText}>{appliedOn}</Text>
            </View>
          )}
          {user.state && (
            <View style={styles.metaChip}>
              <MapPin size={12} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.metaChipText}>{user.state}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Hash size={12} color={colors.textDim} strokeWidth={2} />
            <Text style={styles.metaChipText}>{shortRef(data.id || id)}</Text>
          </View>
        </View>

        {/* Progress tracker over this lead's own real stages */}
        <SectionCard title="Application Progress">
          <StageTracker stages={STAGES} current={data.stage} />
        </SectionCard>

        {/* Application Information */}
        {(bp.industry || bp.business_stage || user.category) && (
          <SectionCard title="Application Information">
            <InfoRow icon={<Building2 size={13} color={colors.primaryDark} />} label="Industry" value={bp.industry || "—"} />
            <InfoRow icon={<User size={13} color={colors.primaryDark} />} label="Category" value={user.category || "—"} />
            <InfoRow icon={<FileText size={13} color={colors.primaryDark} />} label="Business Activity" value={bp.business_activity || ""} />
            <InfoRow icon={<Tag size={13} color={colors.primaryDark} />} label="Stage" value={bp.business_stage || "—"} />
            <InfoRow icon={<Users size={13} color={colors.primaryDark} />} label="Employees" value={bp.employees ? String(bp.employees) : ""} />
            <InfoRow icon={<DollarSign size={13} color={colors.primaryDark} />} label="Annual Turnover" value={bp.annual_turnover ? formatINR(bp.annual_turnover) : "—"} />
            <InfoRow icon={<CheckCircle2 size={13} color={colors.primaryDark} />} label="GST" value={bp.gst_available ? "Registered" : "Not Registered"} />
            <InfoRow icon={<CheckCircle2 size={13} color={colors.primaryDark} />} label="Udyam" value={bp.udyam_available ? "Registered" : "Not Registered"} />
          </SectionCard>
        )}

        {/* Assigned To — read-only; this screen has no reassignment action to wire an edit affordance to */}
        {data.assigned_to && (
          <SectionCard title="Assigned To">
            <View style={styles.assignedToRow}>
              <InitialsAvatar name={data.assigned_to} size={36} variant="staff" />
              <Text style={styles.assignedToName}>{data.assigned_to}</Text>
            </View>
          </SectionCard>
        )}

        {/* Uploaded Documents */}
        <SectionCard title={`Uploaded Documents (${userDocs.length})`}>
          {userDocs.length === 0 ? (
            <Text style={styles.emptyNote}>No documents uploaded by this user yet.</Text>
          ) : (
            userDocs.map((doc: any) => {
              const statusBg = doc.status === "verified" ? colors.primarySoft : doc.status === "rejected" ? colors.dangerSoft : tints.amber.bg;
              const statusColor = doc.status === "verified" ? colors.primaryDark : doc.status === "rejected" ? colors.danger : tints.amber.fg;
              const accent = docTypeStyle(doc.doc_type);
              return (
                <View key={doc.id} style={styles.docRow}>
                  <View style={[styles.docIconChip, { backgroundColor: accent.bg }]}>
                    <RemoteIcon slug={accent.slug} size={18} fallback={FileText} fallbackColor={accent.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.doc_type}</Text>
                    <Text style={styles.docDate}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </Text>
                  </View>
                  <View style={[styles.docStatusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.docStatusText, { color: statusColor }]}>{doc.status}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {/* View button — available for all docs that have a file */}
                    {doc.file_name && (
                      <TouchableOpacity
                        style={[styles.docActionBtn, { backgroundColor: colors.surfaceAlt }]}
                        onPress={() => handleAdminViewDoc(doc.id)}
                        disabled={viewingDoc === doc.id}
                      >
                        {viewingDoc === doc.id
                          ? <ActivityIndicator size="small" color={colors.textDim} />
                          : <ExternalLink size={12} color={colors.textDim} strokeWidth={2} />
                        }
                      </TouchableOpacity>
                    )}
                    {doc.status === "pending" && (
                      <>
                        <TouchableOpacity
                          style={[styles.docActionBtn, { backgroundColor: colors.primarySoft }]}
                          onPress={() => handleDocStatus(doc.id, "verified")}
                          disabled={!!docActionLoading}
                        >
                          {docActionLoading === doc.id + "verified"
                            ? <ActivityIndicator size="small" color={colors.primaryDark} />
                            : <Text style={[styles.docActionText, { color: colors.primaryDark }]}>Verify</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.docActionBtn, { backgroundColor: colors.dangerSoft }]}
                          onPress={() => handleDocStatus(doc.id, "rejected")}
                          disabled={!!docActionLoading}
                        >
                          {docActionLoading === doc.id + "rejected"
                            ? <ActivityIndicator size="small" color={colors.danger} />
                            : <Text style={[styles.docActionText, { color: colors.danger }]}>Reject</Text>
                          }
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* Scheme Applications */}
        <SectionCard title={`Scheme Applications (${schemeApps.length})`}>
          {schemeApps.length === 0 ? (
            <Text style={styles.emptyNote}>No schemes assigned yet. Tap below to assign.</Text>
          ) : (
            schemeApps.map((app: any) => {
              const accent = schemeStyle(app.scheme_name);
              return (
              <View key={app.id} style={styles.appRow}>
                <View style={[{ width: 28, height: 28, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 }, { backgroundColor: accent.bg }]}>
                  <RemoteIcon slug={accent.slug} size={16} fallback={Landmark} fallbackColor={accent.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appSchemeName}>{app.scheme_name}</Text>
                  {app.bank_name ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Building2 size={11} color={colors.textDim} strokeWidth={2} />
                      <Text style={styles.appBankName}>{app.bank_name}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.appStagePill, app.stage === "approved" || app.stage === "disbursed" ? { backgroundColor: colors.stageWon } : app.stage === "rejected" ? { backgroundColor: colors.dangerSoft } : { backgroundColor: tints.blue.bg }]}>
                    <Text style={[styles.appStageText, { color: app.stage === "approved" || app.stage === "disbursed" ? colors.success : app.stage === "rejected" ? colors.danger : colors.primary }]}>
                      {app.stage_label || app.stage}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.docActionBtn, { backgroundColor: colors.primarySoft }]}
                    onPress={() => { setStageModal(app); setStageNote(""); setSelectedStage(app.stage || ""); }}
                  >
                    <Text style={[styles.docActionText, { color: colors.primaryDark }]}>Stage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.docActionBtn, { backgroundColor: colors.dangerSoft }]}
                    onPress={() => deleteSchemeApp(app.id, app.scheme_name)}
                  >
                    <Trash2 size={12} color={colors.danger} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
              );
            })
          )}
          <View style={{ marginTop: spacing.sm2 }}>
            <Button label="Assign Scheme" Icon={Plus} iconPosition="left" onPress={() => setAssignModal(true)} size="sm" />
          </View>
        </SectionCard>

        {/* Bank Assignments */}
        <SectionCard title={`Assigned Banks (${bankAssignments.length})`}>
          {bankAssignments.length === 0 ? (
            <Text style={styles.emptyNote}>No banks assigned yet. Go to Banks module to assign.</Text>
          ) : (
            bankAssignments.map((ba: any) => (
              <View key={ba.id} style={styles.appRow}>
                <BankBadge name={ba.bank_name} shortName={ba.bank_short_name} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.appSchemeName}>{ba.bank_name}</Text>
                  {ba.bank_short_name ? (
                    <Text style={styles.appBankName}>{ba.bank_short_name}</Text>
                  ) : null}
                </View>
                <View style={[styles.appStagePill, { backgroundColor: tints.blue.bg }]}>
                  <Text style={[styles.appStageText, { color: tints.blue.fg }]}>Assigned</Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        {/* Notes + Follow-up */}
        <SectionCard title="Notes & Follow-up">
          {data.notes ? (
            <Text style={styles.notesBody}>{data.notes}</Text>
          ) : (
            <Text style={styles.emptyNote}>No notes yet</Text>
          )}
          {data.follow_up_date && (
            <View style={styles.followUpRow}>
              <Calendar size={12} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.followUpText}>Follow-up: {data.follow_up_date}</Text>
            </View>
          )}
        </SectionCard>

        {/* Send Notification */}
        <SectionCard title="Send Notification">
          <Text style={styles.notifHint}>Quick templates</Text>
          <View style={styles.templateRow}>
            {NOTIF_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={styles.templateChip}
                onPress={() => { setNotifTitle(t.title); setNotifBody(t.body); }}
                activeOpacity={0.75}
              >
                <Text style={styles.templateChipText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.notifInput}
            value={notifTitle}
            onChangeText={setNotifTitle}
            placeholder="Notification title…"
            placeholderTextColor={colors.textPlaceholder}
          />
          <TextInput
            style={[styles.notifInput, { minHeight: 70, textAlignVertical: "top" }]}
            value={notifBody}
            onChangeText={setNotifBody}
            placeholder="Write your message to the user…"
            placeholderTextColor={colors.textPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Button
            label="Send Notification"
            Icon={Send}
            iconPosition="left"
            onPress={sendNotification}
            loading={sendingNotif}
            disabled={sendingNotif}
          />
        </SectionCard>

        {/* Consultation History */}
        {consultations.length > 0 && (
          <SectionCard title={`Consultation History (${consultations.length})`}>
            {consultations.map((c: any) => (
              <View key={c.id} style={styles.consultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consultType}>{c.consultation_type}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                      <Calendar size={10} color={colors.textDim} />
                      <Text style={styles.consultMeta}>{c.date}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                      <Clock size={10} color={colors.textDim} />
                      <Text style={styles.consultMeta}>{c.time_slot}</Text>
                    </View>
                  </View>
                </View>
                <StagePill stage={c.status || "new"} />
              </View>
            ))}
          </SectionCard>
        )}

        {/* Activity Timeline */}
        <SectionCard title={`Activity Timeline (${activity.length})`}>
          {activity.length === 0 ? (
            <Text style={styles.emptyNote}>No activity logged yet</Text>
          ) : (
            [...activity].reverse().map((a: any, i: number) => (
              <TimelineEvent key={i} item={a} />
            ))
          )}
        </SectionCard>

      </ScrollView>

      {/* Bottom actions — "Request Info" reuses the existing message-user
          navigation, "Review Application" reuses the existing stage/notes
          editor; neither wires to a new backend call. */}
      <View style={[styles.footerBar, { paddingBottom: spacing.md + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Button
            label="Request Info"
            variant="tertiary"
            onPress={() => router.push(`/admin/support/${user.id || data.user_id}` as any)}
            testID="message-user-btn"
            size="md"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Review Application"
            variant="primary"
            onPress={() => setEditing(true)}
            size="md"
          />
        </View>
      </View>

      {/* Stage + Notes edit modal */}
      <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Update Lead</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditing(false)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this lead…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Follow-up Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.notesInput, { minHeight: 44 }]}
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="e.g. 2026-07-15"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={styles.fieldLabel}>Move to Stage</Text>
            <View style={styles.stagesGrid}>
              {STAGES.map((s) => {
                const { bg, text: tc } = stageColor(s);
                const isActive = data?.stage === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.stageChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? tc : colors.border }]}
                    onPress={() => moveStage(s)}
                    disabled={saving}
                  >
                    <Text style={[styles.stageChipText, { color: isActive ? tc : colors.textMuted }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button label="Save Changes" onPress={saveNotes} loading={saving} disabled={saving} size="lg" />
          </View>
        </View>
      </Modal>

      {/* Assign Scheme Modal */}
      <Modal visible={assignModal} animationType="slide" transparent onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Assign Scheme</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAssignModal(false)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Select Scheme</Text>
            <ScrollView style={{ maxHeight: 160, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
              {allSchemes.map((s: any) => {
                const active = assignScheme?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.listItem, active && styles.listItemActive]}
                    onPress={() => setAssignScheme(s)}
                  >
                    <Text style={[styles.listItemText, active && styles.listItemTextActive]}>{s.name}</Text>
                    {active && <CheckCircle2 size={14} color={colors.primary} strokeWidth={2} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Select Bank (optional)</Text>
            <ScrollView style={{ maxHeight: 130, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.listItem, !assignBank && styles.listItemActive]}
                onPress={() => setAssignBank(null)}
              >
                <Text style={[styles.listItemText, !assignBank && styles.listItemTextActive]}>No bank (scheme only)</Text>
              </TouchableOpacity>
              {allBanks.map((b: any) => {
                const active = assignBank?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.listItem, active && styles.listItemActive]}
                    onPress={() => setAssignBank(b)}
                  >
                    <Text style={[styles.listItemText, active && styles.listItemTextActive]}>{b.name}</Text>
                    {active && <CheckCircle2 size={14} color={colors.primary} strokeWidth={2} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.notesInput, { minHeight: 50 }]}
              value={assignNote}
              onChangeText={setAssignNote}
              placeholder="e.g. Eligible based on GST turnover"
              placeholderTextColor={colors.textPlaceholder}
              multiline
            />

            <Button
              label="Assign Scheme"
              onPress={assignSchemeToUser}
              loading={assigning}
              disabled={!assignScheme || assigning}
              size="lg"
            />
          </View>
        </View>
      </Modal>

      {/* Update Stage Modal */}
      <Modal visible={!!stageModal} animationType="slide" transparent onRequestClose={() => setStageModal(null)}>
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Update Stage</Text>
                {stageModal && <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>{stageModal.scheme_name}</Text>}
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setStageModal(null)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.stagesGrid}>
              {["call_done","documents_submitted","scheme_identified","application_filed","under_review","approved","disbursed","rejected"].map((st) => {
                const labels: Record<string,string> = {
                  documents_submitted:"Docs Submitted", call_done:"Call Done",
                  scheme_identified:"Scheme ID'd", application_filed:"App Filed",
                  under_review:"Under Review", approved:"Approved",
                  disbursed:"Disbursed", rejected:"Rejected",
                };
                const isSelected = selectedStage === st;
                const isRej = st === "rejected";
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stageChip, {
                      borderColor: isSelected ? colors.primary : isRej ? colors.danger : colors.border,
                      backgroundColor: isSelected ? colors.primarySoft : isRej ? colors.dangerSoft : colors.surface2,
                    }]}
                    onPress={() => setSelectedStage(st)}
                    disabled={updatingStage}
                  >
                    <Text style={[styles.stageChipText, {
                      color: isSelected ? colors.primaryDark : isRej ? colors.danger : colors.text,
                    }]}>{labels[st]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.notesInput, { minHeight: 50 }]}
              value={stageNote}
              onChangeText={setStageNote}
              placeholder="Add a note about this stage update"
              placeholderTextColor={colors.textPlaceholder}
              multiline
            />

            <View style={{ marginTop: spacing.sm2 }}>
              <Button
                label="Save Stage"
                onPress={() => updateAppStage(stageModal.id, selectedStage)}
                loading={updatingStage}
                disabled={!selectedStage || updatingStage}
                size="lg"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* More Options — quick access to actions that already exist further
          down this screen, without duplicating their backend calls. */}
      <Modal visible={moreMenu} animationType="fade" transparent onRequestClose={() => setMoreMenu(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setMoreMenu(false)}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>More Options</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setMoreMenu(false)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              testID="more-menu-assign-scheme"
              style={styles.listItem}
              onPress={() => { setMoreMenu(false); setAssignModal(true); }}
            >
              <Plus size={15} color={colors.primaryDark} strokeWidth={2} />
              <Text style={[styles.listItemText, { marginLeft: 8 }]}>Assign Scheme</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  leadName: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  leadMobile: { fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, marginTop: 2 },
  moreBtn: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },

  headlineType: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 10 },
  headlineAmount: { fontSize: 32, fontFamily: fonts.displayBold, color: colors.primaryDark, letterSpacing: -0.5 },
  headlineCaption: {
    fontSize: 11, fontFamily: fonts.medium, color: colors.textDim,
    textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2,
  },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm2 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6,
  },
  metaChipText: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },

  assignedToRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  assignedToName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },

  footerBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 10,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm2,
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: colors.border,
  },

  schemeRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  schemeName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  schemeReason: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 2 },
  scoreChip: {
    backgroundColor: colors.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
  },
  scoreText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },

  notesBody: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, lineHeight: 20 },
  emptyNote: { fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, fontStyle: "italic" },
  followUpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  followUpText: { fontSize: 12, fontFamily: fonts.medium, color: colors.primaryDark },

  consultRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  consultType: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  consultMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },

  // Document rows
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: "wrap",
  },
  docIconChip: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  docName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  docDate: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  docStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  docStatusText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  docActionBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  docActionText: { fontSize: 11, fontFamily: fonts.bold },

  // Recommendations
  existingRecBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: tints.deepTeal.bg, borderRadius: radius.lg,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start",
  },
  existingRecText: { fontSize: 11, fontFamily: fonts.medium, color: tints.deepTeal.fg },
  recSubLabel: {
    fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
  },
  recChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  recChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  recChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  recChipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  recChipTextActive: { color: colors.primaryDark, fontFamily: fonts.bold },
  recNoteInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 13, fontFamily: fonts.regular, color: colors.text,
    minHeight: 60, backgroundColor: colors.surface2, marginBottom: 12,
  },
  recSaveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 12, alignItems: "center",
  },
  recSaveBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },

  // Modal
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: spacing.lg, paddingBottom: 40, maxHeight: "90%",
    ...elevation.l2,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, minHeight: 80, backgroundColor: colors.surface2, marginBottom: 16,
  },
  stagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  stageChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  stageChipText: { fontSize: 12, fontFamily: fonts.semiBold, textTransform: "capitalize" },

  // Scheme applications
  appRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  appSchemeName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  appBankName:   { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },
  appStagePill:  { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  appStageText:  { fontSize: 11, fontFamily: fonts.semiBold },

  // Send Notification
  notifHint: { fontSize: 11, fontFamily: fonts.medium, color: colors.textDim, marginBottom: 8 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  templateChip: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft,
  },
  templateChipText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primaryDark },
  notifInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: 10,
  },

  // Modal list items
  listItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: radius.lg,
    marginBottom: 2,
  },
  listItemActive:    { backgroundColor: colors.primarySoft },
  listItemText:      { fontSize: 13, fontFamily: fonts.regular, color: colors.text, flex: 1 },
  listItemTextActive:{ fontFamily: fonts.semiBold, color: colors.primaryDark },
});
