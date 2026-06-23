import { Routes, Route, Navigate } from 'react-router-dom'
import ReportLayout from './components/ReportLayout.jsx'
import Home from './pages/Home.jsx'
import HeuristicEvaluation from './pages/HeuristicEvaluation.jsx'
import AttentionInsight from './pages/AttentionInsight.jsx'
import Accessibility from './pages/Accessibility.jsx'
import CompetitorAnalysis from './pages/CompetitorAnalysis.jsx'
import OverallSummary from './pages/OverallSummary.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<ReportLayout />}>
        <Route index element={<Navigate to="heuristic" replace />} />
        <Route path="heuristic" element={<HeuristicEvaluation />} />
        <Route path="overall-summary" element={<OverallSummary />} />
        <Route path="attention" element={<AttentionInsight />} />
        <Route path="accessibility" element={<Accessibility />} />
        <Route path="competitor" element={<CompetitorAnalysis />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
