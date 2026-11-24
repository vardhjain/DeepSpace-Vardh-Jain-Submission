/** Repair case shape and the clearly marked example queue for a new room. */

export type RepairStatus = 'received' | 'diagnosing' | 'waiting-parts' | 'ready' | 'returned'

export type RepairCase = {
  caseNumber: string
  itemName: string
  category: string
  problem: string
  station: string
  status: RepairStatus
  nextStep: string
  partsNeeded: string
  assigneeId: string
  assigneeName: string
  demo: boolean
}

const example = {
  assigneeId: '',
  assigneeName: 'Available',
  demo: true,
} as const

export const exampleCases: RepairCase[] = [
  {
    ...example,
    caseNumber: 'RC-024',
    itemName: 'Trek city bike',
    category: 'Bicycle',
    problem: 'Rear brake rubs after the wheel was reinstalled.',
    station: 'Bike stand',
    status: 'waiting-parts',
    nextStep: 'Fit the new cable, then test the brake under load.',
    partsNeeded: 'Universal brake cable · ordered',
  },
  {
    ...example,
    caseNumber: 'RC-023',
    itemName: 'Wool winter coat',
    category: 'Clothing & textiles',
    problem: 'Pocket seam has split, but the fabric is still sound.',
    station: 'Textile table',
    status: 'ready',
    nextStep: 'Pickup at the textile table after 11:00.',
    partsNeeded: 'Charcoal thread',
  },
  {
    ...example,
    caseNumber: 'RC-022',
    itemName: 'Four-slice toaster',
    category: 'Small appliance',
    problem: 'The right side stays cold after a few minutes.',
    station: 'Electronics bench',
    status: 'diagnosing',
    nextStep: 'Test continuity across both heating elements.',
    partsNeeded: 'Check before ordering',
  },
  {
    ...example,
    caseNumber: 'RC-021',
    itemName: 'Brass desk lamp',
    category: 'Electronics',
    problem: 'Lamp flickers when the power cord is moved.',
    station: 'General bench',
    status: 'received',
    nextStep: 'Inspect the plug and cord strain relief.',
    partsNeeded: 'None yet',
  },
]
