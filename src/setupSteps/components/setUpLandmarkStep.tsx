import type { SetupStepComponent } from '..'
import type { SetupClearing, SetupMapState } from '../../types'

import LocaleText from '../../components/localeText'
import MapChart from '../../components/mapChart'
import Section from '../../components/section'
import { validateLandmarkPlacement } from '../../functions/validation'
import { useAppDispatch, useAppSelector, usePlayerNumber } from '../../hooks'
import {
  placeLandmark,
  selectLandmarkByCode,
  selectSetupMap,
  selectSetupMapCode,
} from '../../store'

const SetUpLandmarkStep: SetupStepComponent = ({ flowSlice }) => {
  const mapCode = useAppSelector(selectSetupMapCode)
  const mapData = useAppSelector(selectSetupMap)
  const setupState = useAppSelector(state => state.setup)
  const placedLandmarks = useAppSelector(state => state.flow.placedLandmarks)
  const useHouserules = setupState.useHouserules
  const playerNumber = usePlayerNumber(flowSlice)
  const dispatch = useAppDispatch()

  const { index, landmarkPool } = flowSlice

  const selectedLandmark = index != null ? landmarkPool[index] : null
  const landmarkDef = useAppSelector(selectLandmarkByCode(selectedLandmark))

  if (!selectedLandmark || !mapData) return null

  const validClearings: number[] = []
  if (landmarkDef) {
    mapData.clearings.forEach((clearing, i) => {
      const passesTagRules = validateLandmarkPlacement(
        i,
        clearing as SetupClearing,
        placedLandmarks,
        landmarkDef,
      )

      const passesCustomRules = landmarkDef.isValidPlacement
        ? landmarkDef.isValidPlacement(
            i,
            clearing as SetupClearing,
            mapData as unknown as SetupMapState,
            setupState,
          )
        : true

      if (passesTagRules && passesCustomRules) {
        validClearings.push(i)
      }
    })
  }

  const handleClearingClick = (clearingIndex: number) => {
    if (!useHouserules && !validClearings.includes(clearingIndex)) {
      return
    }
    dispatch(placeLandmark({ clearingIndexes: [clearingIndex], code: selectedLandmark }))
  }

  const noValidClearings = validClearings.length === 0

  return (
    <Section subtitleKey={`landmark.${selectedLandmark}.setupTitle`}>
      <MapChart
        activeLandmark={selectedLandmark}
        mapAnchoredLandmarkMode="placement"
        onClearingClick={handleClearingClick}
        useHouserules={useHouserules}
        validClearings={validClearings}
      />

      <div>
        {noValidClearings ? (
          <p>
            <LocaleText i18nKey="error.noValidClearings" />
            {useHouserules ? <LocaleText i18nKey="error.noValidClearingsHouserule" /> : ''}
          </p>
        ) : (
          <p>
            <LocaleText
              i18nKey={`landmark.${selectedLandmark}.setup`}
              tOptions={{ context: mapCode, count: playerNumber }}
            />
          </p>
        )}
      </div>
    </Section>
  )
}

export default SetUpLandmarkStep
