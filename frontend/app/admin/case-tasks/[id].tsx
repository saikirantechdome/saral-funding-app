import { useLocalSearchParams } from "expo-router";
import CaseTasksView from "@/src/screens/CaseTasksView";

export default function CaseTasksRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CaseTasksView caseId={id} />;
}
