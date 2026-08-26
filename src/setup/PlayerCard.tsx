import type { Boundary, SetupPlayer } from './setup-state'

interface PlayerCardProps {
  readonly boundaryInvalid: boolean
  readonly onChange: (player: SetupPlayer) => void
  readonly player: SetupPlayer
}

export function PlayerCard({ boundaryInvalid, onChange, player }: PlayerCardProps) {
  const nameInvalid = player.name.trim().length === 0

  return (
    <fieldset className="player-card" data-player-id={player.id}>
      <legend className="sr-only">Настройки игрока</legend>
      <input
        aria-label="Имя игрока"
        aria-invalid={nameInvalid}
        className="player-card__name"
        onChange={(event) => onChange({ ...player, name: event.currentTarget.value })}
        placeholder="Введите имя..."
        type="text"
        value={player.name}
      />
      <div className="player-card__options">
        <select
          aria-label="Грань игрока"
          aria-invalid={boundaryInvalid}
          className="player-card__boundary"
          onChange={(event) => onChange({ ...player, boundary: event.currentTarget.value as Boundary })}
          value={player.boundary ?? ''}
        >
          <option disabled value="">Выбери грань</option>
          <option value="virgin">Целочка</option>
          <option value="regular">Обычный</option>
          <option value="full">Полный раж</option>
        </select>
        <label className="relationship-toggle">
          <span>Отношения</span>
          <input
            checked={player.inRelationship}
            onChange={(event) => onChange({ ...player, inRelationship: event.currentTarget.checked })}
            type="checkbox"
          />
          <span className="relationship-toggle__control" aria-hidden="true" />
        </label>
      </div>
    </fieldset>
  )
}
