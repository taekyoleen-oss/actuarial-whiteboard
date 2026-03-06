export type TimelineType =
  | 'insurance-period'
  | 'payment-period'
  | 'survival-death'
  | 'deferred-annuity'
  | 'whole-life'

export interface TimelineConfig {
  type: TimelineType
  startLabel: string
  endLabel: string
  midLabel?: string
  annotations?: string[]
  scale: number
}
