import { useState } from 'react'
import {
  competitors as seedCompetitors,
  competitorBrands,
  competitorFeatures,
} from '../data/mockData.js'
import { CheckIcon, CrossIcon } from '../components/Icons.jsx'

export default function CompetitorAnalysis() {
  const [competitors, setCompetitors] = useState(seedCompetitors)

  const remove = (id) => setCompetitors((c) => c.filter((x) => x.id !== id))
  const add = () =>
    setCompetitors((c) => [
      ...c,
      { id: 'c' + (c.length + 1) + '-' + Date.now(), name: 'Competitor ' + (c.length + 1) },
    ])

  return (
    <>
      {/* Left competitor list */}
      <aside className="cmp-side">
        <h3 className="cmp-title">List of competitor</h3>
        <ul className="cmp-list">
          {competitors.map((c) => (
            <li key={c.id} className="cmp-row">
              <span>{c.name}</span>
              <button className="cmp-remove" onClick={() => remove(c.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button className="cmp-add" onClick={add}>
          + Add
        </button>
      </aside>

      {/* Comparison matrix */}
      <section className="cmp-main">
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th className="cmp-feature-col">Feature</th>
                {competitorBrands.map((b) => (
                  <th key={b.id} className={b.self ? 'cmp-self' : ''}>
                    <span className="cmp-brand" style={{ color: b.accent }}>
                      {b.name}
                    </span>
                    {b.self && <span className="cmp-you">You</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitorFeatures.map((f) => (
                <tr key={f.id}>
                  <td className="cmp-feature-col">{f.label}</td>
                  {f.values.map((v, i) => (
                    <td key={i} className={competitorBrands[i]?.self ? 'cmp-self' : ''}>
                      {v ? <CheckIcon /> : <CrossIcon />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
