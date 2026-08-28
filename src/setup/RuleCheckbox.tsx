import { actionIconData } from '../components/action-icon-data.generated'

interface RuleCheckboxProps {
  readonly checked: boolean
  readonly children: string
  readonly disabled?: boolean
  readonly onChange: (checked: boolean) => void
}

export function RuleCheckbox({ checked, children, disabled = false, onChange }: RuleCheckboxProps) {
  return (
    <label className={`rule-checkbox${disabled ? ' rule-checkbox--disabled' : ''}`}>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
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
