/**
 * Per-document upload/review screen — matches the approved prototype's
 * "Upload" state. Reached from the Documents list (existing row, or "Add a
 * document"). Real upload logic carried over from the old inline picker on
 * the list screen (see src/screens/DocumentVault.tsx) — just moved to its
 * own screen per the prototype's Documents → Upload flow.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import FlatIcon from "@/src/components/FlatIcon";

import { apiGet, getToken, API_BASE } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoRadius, protoSpacing, protoFonts } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";
import { docTypeStyle } from "@/src/utils/docType";

type PickedFile = { uri: string; name: string; mimeType?: string };

function statusMeta(status?: string) {
  if (status === "verified") return { label: "Approved", bg: protoColors.pill.green.bg, text: protoColors.pill.green.text };
  if (status === "rejected") return { label: "Action", bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text };
  if (status === "pending") return { label: "Review", bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text };
  return { label: "To do", bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text };
}

export default function DocumentDetail() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const docType = decodeURIComponent(type || "");

  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);

  const load = useCallback(async () => {
    try {
      const docs = await apiGet<any[]>("/documents/me");
      const matches = (docs || []).filter((d) => d.doc_type === docType);
      matches.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setDoc(matches[0] || null);
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [docType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const status = doc?.status;
  const needsAction = !doc || status === "rejected";
  const readOnly = !needsAction && (status === "pending" || status === "verified");
  const pill = statusMeta(status);
  const style = docTypeStyle(docType);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    } catch {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const handleView = async () => {
    if (!doc?.id) return;
    setViewing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not get download link");
      const { url } = await response.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document. Please try again.");
    } finally {
      setViewing(false);
    }
  };

  const handleSubmit = async () => {
    if (!pickedFile) {
      Alert.alert("Choose a file", "Select a PDF or image first.");
      return;
    }
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("doc_type", docType);
      if (Platform.OS === "web") {
        const blobRes = await fetch(pickedFile.uri);
        const blob = await blobRes.blob();
        formData.append("file", blob, pickedFile.name);
      } else {
        formData.append("file", { uri: pickedFile.uri, name: pickedFile.name, type: pickedFile.mimeType || "application/octet-stream" } as any);
      }
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${response.status})`);
      }
      router.replace(`/document/submitted?type=${encodeURIComponent(docType)}` as any);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message || "Could not upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]} testID="document-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <FlatIcon name="left-arrow" size={20} color={protoColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{docType}</Text>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
        {status === "rejected" && (
          <View style={styles.amberCard}>
            <Text style={styles.amberLabel}>Why it came back</Text>
            <Text style={styles.amberTitle}>Document was rejected</Text>
            <Text style={styles.amberBody}>{doc?.reject_reason || "Please upload a clearer, complete copy."}</Text>
          </View>
        )}

        {readOnly && (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Status</Text>
            <Text style={styles.cardTitle}>{status === "verified" ? "Approved" : "Under review with our team"}</Text>
            {!!doc?.file_name && (
              <TouchableOpacity onPress={handleView} disabled={viewing} style={styles.viewRow}>
                {viewing ? <ActivityIndicator size="small" color={protoColors.primary} /> : <FlatIcon name="external-link" size={14} color={protoColors.primary} />}
                <Text style={styles.viewText}>{doc.file_name}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!readOnly && (
          <View style={styles.previewBox}>
            {pickedFile ? (
              <>
                <FlatIcon name="document" size={26} color={protoColors.primary} />
                <Text style={styles.previewText} numberOfLines={1}>{pickedFile.name}</Text>
              </>
            ) : (
              <Text style={styles.previewPlaceholder}>New copy</Text>
            )}
          </View>
        )}

        {!readOnly && (
          <View style={styles.row}>
            <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={handlePickFile} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={handlePickFile} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Choose file</Text>
            </TouchableOpacity>
          </View>
        )}

        <ProtoButton
          variant={needsAction ? "amber" : "outline"}
          label={uploading ? "Uploading…" : needsAction ? "Re-upload" : "Back to documents"}
          onPress={needsAction ? handleSubmit : () => router.back()}
          disabled={needsAction && !pickedFile}
          loading={uploading}
        />
        <Text style={styles.note}>
          {needsAction ? "Review restarts once uploaded · 2 working days" : "Our team reviews your documents in order"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: protoSpacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: protoSpacing.sm,
    borderBottomWidth: 1, borderBottomColor: protoColors.border,
  },
  headerTitle: { flex: 1, fontSize: 15, fontFamily: protoFonts.regular, color: protoColors.text, textAlign: "center" },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontFamily: protoFonts.regular },
  body: { padding: spacing.md, gap: protoSpacing.md },
  amberCard: { backgroundColor: protoColors.amberSoft, borderRadius: 16, padding: 14, gap: 4 },
  amberLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: protoColors.amberDeep, fontFamily: protoFonts.regular },
  amberTitle: { fontSize: 13, color: protoColors.text, fontFamily: protoFonts.regular },
  amberBody: { fontSize: 12, color: protoColors.textMuted, fontFamily: protoFonts.regular },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, gap: 4 },
  eyebrow: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: protoColors.textDim, fontFamily: protoFonts.regular },
  cardTitle: { fontSize: 13, color: protoColors.text, fontFamily: protoFonts.regular },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  viewText: { fontSize: 12, color: protoColors.primary, fontFamily: protoFonts.regular },
  previewBox: {
    // flex:1, not a fixed minHeight — the prototype's placeholder box
    // expands to fill all remaining space down to the buttons, not a small
    // fixed-height box with empty page below it.
    flex: 1, minHeight: 160, borderRadius: 16, backgroundColor: protoColors.surfaceAlt,
    alignItems: "center", justifyContent: "center", gap: 8, padding: spacing.md,
  },
  previewPlaceholder: { fontSize: 12, color: protoColors.textDim, fontFamily: protoFonts.regular },
  previewText: { fontSize: 12, color: protoColors.text, fontFamily: protoFonts.regular },
  row: { flexDirection: "row", gap: protoSpacing.sm },
  outlineBtn: {
    height: protoRadius.btn + 32, borderRadius: protoRadius.btn,
    borderWidth: 1, borderColor: protoColors.border,
    alignItems: "center", justifyContent: "center",
  },
  outlineBtnText: { fontSize: 13, fontFamily: protoFonts.regular, color: protoColors.text },
  note: { fontSize: 11.5, color: protoColors.textMuted, textAlign: "center", fontFamily: protoFonts.regular },
});
