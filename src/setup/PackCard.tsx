import type { PackDefinition } from '../data/game-data'

interface PackCardProps {
  readonly active: boolean
  readonly onChange: (selected: boolean) => void
  readonly onInactiveAttempt: () => void
  readonly pack: PackDefinition
  readonly selected: boolean
}

const PACK_THEMES: Readonly<Record<string, string>> = {
  'Личное-публичное': 'personal',
  'Нижний мир': 'underworld',
  'Безграничная улица': 'limitless-street',
  'Другие люди': 'other-people',
  Спайси: 'spicy',
  Горячий: 'hot',
}

export function PackCard({ active, onChange, onInactiveAttempt, pack, selected }: PackCardProps) {
  return (
    <label
      className="pack-card"
      data-active={active}
      data-pack-id={pack.id}
      data-theme={PACK_THEMES[pack.name] ?? 'default'}
      onClick={(event) => {
        if (active) return
        event.preventDefault()
        onInactiveAttempt()
      }}
    >
      <input
        aria-label={pack.name}
        checked={selected}
        disabled={!active}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className="pack-card__header">
        <strong>{pack.name}</strong>
        <span className="pack-card__types" aria-label="Доступные типы">
          {pack.availableTypes.includes('truth') && <span className="pack-card__type pack-card__type--truth" title="Правда">П</span>}
          {pack.availableTypes.includes('dare') && <span className="pack-card__type pack-card__type--dare" title="Действие">Д</span>}
        </span>
      </span>
      <span className="pack-card__description">{pack.description}</span>
      <span className="pack-card__count">{pack.cardCount} карт</span>
      <span className="pack-card__selection" aria-hidden="true" />
    </label>
  )
}
