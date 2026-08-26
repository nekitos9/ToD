import { actionIconData } from '../components/action-icon-data.generated'

interface RuleCheckboxProps {
  readonly checked: boolean
  readonly children: string
  readonly onChange: (checked: boolean) => void
}

export function RuleCheckbox({ checked, children, onChange }: RuleCheckboxProps) {
  return (
    <label className="rule-checkbox">
      <input checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
      <span className="rule-checkbox__control" aria-hidden="true">
        {checked ? (
          <svg viewBox={`0 0 ${actionIconData.ruleCheck.width} ${actionIconData.ruleCheck.height}`}>
            <path d={actionIconData.ruleCheck.path} fill="#ff0004" />
          </svg>
        ) : null}
      </span>
      <span>{children}</span>
    </label>
  )
}
