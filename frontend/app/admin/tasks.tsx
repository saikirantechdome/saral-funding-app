/**
 * "Tasks" tab default — the prototype's Tasks tab has no case context of
 * its own (reached directly from the tab bar), so this shows the first
 * mock case's tasks. See src/mock/caCases.ts and CaseTasksView.
 */
import CaseTasksView from "@/src/screens/CaseTasksView";
import { CA_CASES } from "@/src/mock/caCases";

export default function TasksTab() {
  return <CaseTasksView caseId={CA_CASES[0].id} showBack={false} />;
}
