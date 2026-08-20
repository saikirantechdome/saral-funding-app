/**
 * Document Vault — real file picker + multipart upload to Azure via backend.
 * Uses expo-document-picker for PDF/image selection.
 * Install: npx expo install expo-document-picker
 */
import { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints } from "@/src/theme";
import { apiGet, apiDelete, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Picker from "@/src/components/Picker";
import { DOCUMENT_TYPE_GROUPS } from "@/src/constants";

const BULK_UPLOAD_WHATSAPP_URL = `https://wa.me/919893869899?text=${encodeURIComponent(
  "Hello, I have multiple documents to upload for my Saral Funding application. Could your team please help me with a bulk upload?"
)}`;

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

function statusStyle(status: string) {
  if (status === "verified")
    return { bg: colors.primarySoft, text: colors.primaryDark };
  if (status === "rejected") return { bg: tints.red.bg, text: tints.red.fg };
  return { bg: tints.amber.bg, text: tints.amber.fg };
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text } = statusStyle(status);
  const Icon =
    status === "verified"
      ? CheckCircle2
      : status === "rejected"
      ? AlertCircle
      : Clock;
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={text} strokeWidth={2.5} />
      <Text style={[badge.text, { color: text }]}>{status}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
});

export default function DocumentsScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiGet<any[]>("/documents/me");
      setDocs(Array.isArray(res) ? res : []);
    } catch {
      setDocs([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPickedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
    } catch {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const handleUpload = async () => {
    if (!selected) {
      Alert.alert("Select a document type", "Tap a chip below to choose which document to upload.");
      return;
    }
    if (!pickedFile) {
      Alert.alert("Choose a file", "Tap 'Choose File' to select a PDF or image.");
      return;
    }

    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("doc_type", selected);

      if (Platform.OS === "web") {
        // On web, { uri, name, type } is a plain object — fetch the blob URI to get a real Blob
        const blobRes = await fetch(pickedFile.uri);
        const blob = await blobRes.blob();
        formData.append("file", blob, pickedFile.name);
      } else {
        formData.append("file", {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType || "application/octet-stream",
        } as any);
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

      setSelected(null);
      setPickedFile(null);
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message || "Could not upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    Alert.alert("Delete Document", "Remove this pending document?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(docId);
          try {
            await apiDelete(`/documents/${docId}`);
            await load();
          } catch {
            Alert.alert("Error", "Could not delete document.");
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const handleView = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/documents/${docId}/download`, {
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

  const uploadedTypes = new Set(docs.map((d) => d.doc_type));

  const canUpload = !!selected && !!pickedFile && !uploading;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.surface2 }}
      edges={["top", "bottom"]}
    >
      <BackBar title="Document Vault" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload section */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Upload a Document</Text>
          <Text style={s.hint}>
            Select the document type, choose a file, then tap Upload.
          </Text>

          <Picker
            label="Document Type"
            placeholder="Select a document type"
            value={selected ?? ""}
            groups={DOCUMENT_TYPE_GROUPS}
            disabledOptions={Array.from(uploadedTypes)}
            optionBadge={(opt) => (uploadedTypes.has(opt) ? "Uploaded" : undefined)}
            onChange={(v) => { setSelected(v); setPickedFile(null); }}
            testID="doc-type-picker"
          />

          <TouchableOpacity
            style={s.bulkUploadBtn}
            onPress={() => Linking.openURL(BULK_UPLOAD_WHATSAPP_URL)}
            activeOpacity={0.8}
            testID="bulk-upload-whatsapp-cta"
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color={colors.primaryDark} />
            <Text style={s.bulkUploadBtnText}>Bulk upload? Contact us on WhatsApp</Text>
          </TouchableOpacity>

          {/* File picker row */}
          <TouchableOpacity
            style={[s.filePickerBtn, !selected && { opacity: 0.45 }]}
            onPress={handlePickFile}
            disabled={!selected || uploading}
            activeOpacity={0.8}
          >
            <Paperclip size={14} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={s.filePickerText} numberOfLines={1}>
              {pickedFile ? pickedFile.name : "Choose File (PDF or Image)"}
            </Text>
            {pickedFile && (
              <CheckCircle2 size={14} color={colors.primaryDark} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {/* Upload button */}
          <TouchableOpacity
            style={[s.uploadBtn, !canUpload && { opacity: 0.5 }]}
            onPress={handleUpload}
            disabled={!canUpload}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Upload size={15} color="#FFF" strokeWidth={2.5} />
                <Text style={s.uploadBtnText}>
                  {selected && pickedFile
                    ? `Upload "${selected}"`
                    : selected
                    ? "Choose a file above"
                    : "Select a type above"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Uploaded documents list */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Uploaded Documents</Text>
          <Text style={s.sectionCount}>{docs.length} docs</Text>
        </View>

        {docs.length === 0 ? (
          <View style={s.emptyCard}>
            <FileText size={32} color={colors.textDim} strokeWidth={1.5} />
            <Text style={s.emptyText}>No documents uploaded yet</Text>
            <Text style={s.emptyHint}>
              Select a document type above, choose a file, and tap Upload to get started.
            </Text>
          </View>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={s.docCard}>
              <View style={s.docIcon}>
                <FileText size={18} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docName}>{doc.doc_type}</Text>
                {doc.file_name && (
                  <Text style={s.docFileName} numberOfLines={1}>
                    {doc.file_name}
                  </Text>
                )}
                <Text style={s.docDate}>
                  {doc.created_at
                    ? new Date(doc.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </Text>
                <View style={{ marginTop: 5 }}>
                  <StatusBadge status={doc.status} />
                </View>
              </View>
              <View style={s.docActions}>
                {/* View button — only if backend has a blob (file_name present) */}
                {doc.file_name && (
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => handleView(doc.id)}
                    disabled={viewingDoc === doc.id}
                  >
                    {viewingDoc === doc.id ? (
                      <ActivityIndicator color={colors.primaryDark} size="small" />
                    ) : (
                      <ExternalLink size={13} color={colors.primaryDark} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                )}
                {doc.status === "pending" && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                  >
                    {deleting === doc.id ? (
                      <ActivityIndicator color={colors.textDim} size="small" />
                    ) : (
                      <X size={14} color={tints.red.fg} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Continue to Book a Call — shown after onboarding */}
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: 24, paddingTop: 8, backgroundColor: colors.surface2 }}>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 14, alignItems: "center" }}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 15, fontFamily: fonts.displayBold, color: "#fff" }}>
            Continue to Dashboard →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm2,
    lineHeight: 18,
  },
  bulkUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    marginBottom: 10,
  },
  bulkUploadBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
  filePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.primarySoft,
  },
  filePickerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.primaryDark,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  docCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docName: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  docFileName: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  docDate: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 2,
  },
  docActions: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "center",
  },
  viewBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tints.red.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
