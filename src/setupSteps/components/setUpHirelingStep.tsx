import { useEffect, useMemo } from 'react'

import type { SetupStepComponent } from '..'
import type { SetupClearing, SetupMapState } from '../../types'

import Checkbox from '../../components/checkbox'
import LocaleText from '../../components/localeText'
import MapChart from '../../components/mapChart'
import Section from '../../components/section'
import { rollSuits } from '../../functions/random'
import { validateHirelingPlacement } from '../../functions/validation'
import { useAppDispatch, useAppSelector, usePlayerNumber } from '../../hooks'
import {
  placeHireling,
  selectHirelingByCode,
  selectSetupMap,
  toggleCurrentHirelingDemoted,
} from '../../store'

const SetUpHirelingStep: SetupStepComponent = ({ flowSlice }) => {
  const mapData = useAppSelector(selectSetupMap)
  const setupState = useAppSelector(state => state.setup)
  const placedHirelings = useAppSelector(state => state.flow.placedHirelings)
  const useHouserules = setupState.useHouserules
  const playerNumber = usePlayerNumber(flowSlice)
  const dispatch = useAppDispatch()

  const { index, hirelingPool } = flowSlice
  const selectedHireling = index != null ? hirelingPool[index] : null

  const hirelingDef = useAppSelector(selectHirelingByCode(selectedHireling?.code))

  const rules = hirelingDef?.placementRules ?? []
  const placementCount = hirelingDef?.placementCount ?? 1

  const isAutoPlacement = rules.includes('allClearings') || rules.includes('allRuins')
  const isForestPlacement = rules.includes('forest')
  const isPathPlacement = rules.includes('path')

  const currentSelections: number[] = selectedHireling
    ? (placedHirelings[selectedHireling.code] ?? [])
    : []

  const placementComplete = currentSelections.length >= placementCount

  const randomRolledSuits = useMemo(() => {
    if (!hirelingDef?.placementRules?.includes('randomSuit')) return undefined
    return rollSuits({ withoutReplace: false, numRolls: 2, includeBird: false })
  }, [hirelingDef?.placementRules, selectedHireling?.code, flowSlice.step])

  // Auto-dispatch for allClearings / allRuins — no user interaction required.
  useEffect(() => {
    if (!selectedHireling || !hirelingDef || !mapData || !isAutoPlacement) return
    if ((placedHirelings[selectedHireling.code]?.length ?? 0) > 0) return

    const autoIndexes: number[] = []
    mapData.clearings.forEach((clearing, i) => {
      if (
        validateHirelingPlacement(
          i,
          clearing as SetupClearing,
          hirelingDef,
          [],
          mapData as unknown as SetupMapState,
          randomRolledSuits,
        )
      ) {
        autoIndexes.push(i)
      }
    })

    if (autoIndexes.length > 0) {
      dispatch(placeHireling({ clearingIndexes: autoIndexes, code: selectedHireling.code }))
    }
  }, [
    dispatch,
    hirelingDef,
    isAutoPlacement,
    mapData,
    placedHirelings,
    randomRolledSuits,
    selectedHireling,
    selectedHireling?.code,
  ])

  if (!selectedHireling || !mapData) return null

  // ── Clearing-based placement ─────────────────────────────────────────────

  const validClearings: number[] = []
  if (
    hirelingDef &&
    !isAutoPlacement &&
    !isForestPlacement &&
    !isPathPlacement &&
    !placementComplete
  ) {
    mapData.clearings.forEach((clearing, i) => {
      const passesTagRules = validateHirelingPlacement(
        i,
        clearing as SetupClearing,
        hirelingDef,
        currentSelections,
        mapData as unknown as SetupMapState,
        randomRolledSuits,
      )
      const passesCustomRules = hirelingDef.isValidPlacement
        ? hirelingDef.isValidPlacement(
            i,
            clearing as SetupClearing,
            mapData as unknown as SetupMapState,
            setupState,
          )
        : true

      if (passesTagRules && passesCustomRules) validClearings.push(i)
    })
  }

  const handleClearingClick = (clearingIndex: number) => {
    if (placementComplete) return
    if (!useHouserules && !validClearings.includes(clearingIndex)) return
    dispatch(
      placeHireling({
        clearingIndexes: [...currentSelections, clearingIndex],
        code: selectedHireling.code,
      }),
    )
  }

  // ── Forest placement ─────────────────────────────────────────────────────

  const validForestIndexes: number[] =
    isForestPlacement && !placementComplete ? mapData.forestCoords.map((_, i) => i) : []

  const handleForestClick = (zoneIndex: number) => {
    if (placementComplete) return
    dispatch(
      placeHireling({
        clearingIndexes: [...currentSelections, zoneIndex],
        code: selectedHireling.code,
      }),
    )
  }

  // ── Path placement ───────────────────────────────────────────────────────

  const validPathIndexes: number[] =
    isPathPlacement && !placementComplete
      ? mapData.pathCoords.map((_, i) => i).filter(i => !currentSelections.includes(i))
      : []

  const handlePathClick = (zoneIndex: number) => {
    if (placementComplete) return
    if (currentSelections.includes(zoneIndex)) return
    dispatch(
      placeHireling({
        clearingIndexes: [...currentSelections, zoneIndex],
        code: selectedHireling.code,
      }),
    )
  }

  const noValidClearings =
    !placementComplete &&
    !isAutoPlacement &&
    !isForestPlacement &&
    !isPathPlacement &&
    validClearings.length === 0

  const sharedSetupProps = {
    i18nKey: `hireling.${selectedHireling.code}.setup` as const,
    tOptions: {
      context: selectedHireling.demoted ? 'demoted' : undefined,
      count: playerNumber,
    },
  }

  const demotePromoteCheckbox = (
    <Checkbox
      labelKey={selectedHireling.demoted ? 'label.askPromoteHireling' : 'label.askDemoteHireling'}
      defaultValue={selectedHireling.demoted}
      onChange={() => {
        dispatch(toggleCurrentHirelingDemoted(selectedHireling.code, selectedHireling.demoted))
      }}
    />
  )

  // ── Auto-placement: reference map, placements recorded automatically ─────
  if (isAutoPlacement && !selectedHireling.demoted) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        {demotePromoteCheckbox}
        <MapChart useHouserules={useHouserules} />
        <div>
          <p>
            <LocaleText {...sharedSetupProps} />
          </p>
        </div>
      </Section>
    )
  }

  // ── Forest placement ─────────────────────────────────────────────────────
  if (isForestPlacement && !selectedHireling.demoted) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        {demotePromoteCheckbox}
        <MapChart
          onForestClick={placementComplete ? undefined : handleForestClick}
          validForestIndexes={validForestIndexes}
          selectedForestIndexes={currentSelections}
          useHouserules={useHouserules}
        />
        <div>
          {placementComplete ? (
            <p>
              <LocaleText
                i18nKey="label.placementComplete"
                tOptions={{ count: placementCount }}
              />
            </p>
          ) : (
            <p>
              <LocaleText {...sharedSetupProps} />
            </p>
          )}
        </div>
      </Section>
    )
  }

  // ── Path placement ───────────────────────────────────────────────────────
  if (isPathPlacement && !selectedHireling.demoted) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        {demotePromoteCheckbox}
        <MapChart
          onPathClick={placementComplete ? undefined : handlePathClick}
          validPathIndexes={validPathIndexes}
          selectedPathIndexes={currentSelections}
          useHouserules={useHouserules}
        />
        <div>
          {placementComplete ? (
            <p>
              <LocaleText
                i18nKey="label.placementComplete"
                tOptions={{ count: placementCount }}
              />
            </p>
          ) : (
            <p>
              <LocaleText {...sharedSetupProps} />
            </p>
          )}
        </div>
      </Section>
    )
  }

  // ── Standard clearing-based placement ────────────────────────────────────
  if (!selectedHireling.demoted) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        {demotePromoteCheckbox}
        <MapChart
          onClearingClick={placementComplete ? undefined : handleClearingClick}
          useHouserules={useHouserules}
          validClearings={validClearings}
          selectedClearings={currentSelections}
        />
        <div>
          {noValidClearings ? (
            <p>
              <LocaleText i18nKey="error.noValidClearings" />
            </p>
          ) : (
            <p>
              <LocaleText {...sharedSetupProps} />
            </p>
          )}
        </div>
      </Section>
    )
  }

  // ── Demoted: no map interaction, setup text only ──────────────────────────
  return (
    <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
      {demotePromoteCheckbox}
      <p>
        <LocaleText {...sharedSetupProps} />
      </p>
    </Section>
  )
}

export default SetUpHirelingStep
