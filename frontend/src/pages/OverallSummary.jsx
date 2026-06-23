import HeuristicEvaluation from './HeuristicEvaluation.jsx'

// Thin wrapper so a direct link/refresh on /report/overall-summary still gets
// the same he-sidebar (categories + user flows) as the Heuristic Evaluation
// page instead of a bare, sidebar-less column. The sidebar's "Overall
// Summary" button now just flips HeuristicEvaluation's internal mainView
// state in place — this route only matters for direct navigation/bookmarks.
export default function OverallSummary() {
  return <HeuristicEvaluation initialView="overall" />
}
