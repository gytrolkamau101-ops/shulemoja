import { useEffect } from 'react'
import SchoolFinance from './SchoolFinance'
import { Alert } from '../ui'

/** Capitation lives inside School finance (vote heads + balance). */
export default function Capitation(props) {
  useEffect(() => {
    // Deep-link friendly: same hub, tab state is local — user opens Capitation tab manually if needed
  }, [])
  return (
    <div className="space-y-2">
      <Alert kind="ok">Capitation is under School finance → Capitation tab (inflow, vote-head spend, balance).</Alert>
      <SchoolFinance {...props} />
    </div>
  )
}
