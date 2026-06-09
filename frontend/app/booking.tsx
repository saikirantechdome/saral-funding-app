import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";
import { CONSULT_TYPES, TIME_SLOTS } from "@/src/constants";
import { BackBar } from "@/src/components/StepBar";

function nextDates(n: number) {
  const out: { iso: string; label: string; day: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.getDate().toString().padStart(2, "0"),
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  return out;
}

export default function Booking() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [done, setDone] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const dates = nextDates(10);

  const onConfirm = async () => {
    if (!type || !date || !slot) return;
    setLoading(true);
    try {
      const r = await apiPost("/consultations", { consultation_type: type, date, time_slot: slot, notes: "" });
      setDone(r);
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="booking-confirmed">
        <BackBar title="Confirmed" onBack={() => router.replace("/(tabs)")} />
        <View style={styles.doneWrap}>
          <View style={styles.checkBadge}><Text style={{ fontSize: 36, color: "#FFF" }}>✓</Text></View>
          <Text style={styles.doneTitle}>Consultation Booked</Text>
          <Text style={styles.doneSub}>Our advisor will call you on {done.date} at {done.time_slot}</Text>
          <View style={styles.summary}>
            <Text style={styles.sumRow}>Type: <Text style={styles.sumVal}>{done.consultation_type}</Text></Text>
            <Text style={styles.sumRow}>Date: <Text style={styles.sumVal}>{done.date}</Text></Text>
            <Text style={styles.sumRow}>Time: <Text style={styles.sumVal}>{done.time_slot}</Text></Text>
          </View>
          <TouchableOpacity testID="back-to-home" style={styles.cta} onPress={() => router.replace("/(tabs)")}><Text style={styles.ctaText}>Go to Dashboard</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="booking-screen">
      <BackBar title="Free Consultation" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        <Text style={styles.h1}>Book a 30-min advisor call</Text>
        <Text style={styles.sub}>Get personalised funding & subsidy guidance.</Text>

        <Text style={styles.label}>Choose consultation type</Text>
        {CONSULT_TYPES.map((c) => (
          <TouchableOpacity key={c} testID={`type-${c}`} style={[styles.opt, type === c && styles.optActive]} onPress={() => setType(c)}>
            <Text style={[styles.optText, type === c && styles.optTextActive]}>{c}</Text>
            {type === c && <Text style={{ color: colors.primaryDark, fontSize: 20 }}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { marginTop: 16 }]}>Pick a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
          {dates.map((d) => (
            <TouchableOpacity key={d.iso} testID={`date-${d.iso}`} style={[styles.dateBtn, date === d.iso && styles.dateActive]} onPress={() => setDate(d.iso)}>
              <Text style={[styles.dateDay, date === d.iso && styles.dateActiveText]}>{d.day}</Text>
              <Text style={[styles.dateLabel, date === d.iso && styles.dateActiveText]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { marginTop: 16 }]}>Pick a time slot</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map((s) => (
            <TouchableOpacity key={s} testID={`slot-${s}`} style={[styles.slot, slot === s && styles.slotActive]} onPress={() => setSlot(s)}>
              <Text style={[styles.slotText, slot === s && styles.slotTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity testID="confirm-booking" disabled={!type || !date || !slot || loading} style={[styles.cta, (!type || !date || !slot) && styles.ctaDisabled]} onPress={onConfirm}>
          <Text style={styles.ctaText}>{loading ? "Booking…" : "Confirm Booking"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  opt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  optActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optText: { fontSize: 15, color: colors.text, fontWeight: "600" },
  optTextActive: { color: colors.primaryDark },
  dateBtn: { width: 56, height: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  dateActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  dateLabel: { fontSize: 20, color: colors.text, fontWeight: "800", marginTop: 4 },
  dateActiveText: { color: "#FFF" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { paddingHorizontal: 16, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  slotActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  slotText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  slotTextActive: { color: colors.primaryDark, fontWeight: "700" },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  doneWrap: { flex: 1, alignItems: "center", padding: 24, paddingTop: 60 },
  checkBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 16 },
  doneSub: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" },
  summary: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 16, marginTop: 24, width: "100%" },
  sumRow: { fontSize: 14, color: colors.textMuted, marginBottom: 6 },
  sumVal: { color: colors.text, fontWeight: "700" },
});
