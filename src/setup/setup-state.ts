export type SetupStep = 'welcome' | 'rules'

export interface SetupState {
  readonly removeAfterAbsence: boolean
  readonly removeAfterRefusal: boolean
}

export const initialSetupState: SetupState = {
  removeAfterAbsence: false,
  removeAfterRefusal: false,
}
