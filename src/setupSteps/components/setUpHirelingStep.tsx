import { useEffect, useMemo } from 'react'

import type { SetupStepComponent } from '..'
import type { Expansion, Hireling, SetupClearing, SetupMapState } from '../../types'

import * as componentDefinitions from '../../componentDefinitions'
import LocaleText from '../../components/localeText'
import MapChart from '../../components/mapChart'
import Section from '../../components/section'
import { validateHirelingPlacement } from '../../functions/validation'
import { useAppDispatch, useAppSelector, usePlayerNumber } from '../../hooks'
import { placeHireling, selectSetupMap } from '../../store'

const ROLLABLE_SUITS = ['fox', 'mouse', 'rabbit'] as const
const rolledSuit = ROLLABLE_SUITS[Math.floor(Math.random() * ROLLABLE_SUITS.length)]

const SetUpHirelingStep: SetupStepComponent = ({ flowSlice }) => {
  const mapData = useAppSelector(selectSetupMap)
  const setupState = useAppSelector(state => state.setup)
  const placedHirelings = useAppSelector(state => state.flow.placedHirelings)
  const useHouserules = setupState.useHouserules
  const playerNumber = usePlayerNumber(flowSlice)
  const dispatch = useAppDispatch()

  const { index, hirelingPool } = flowSlice
  const selectedHireling = index != null ? hirelingPool[index] : null

  let hirelingDef: Hireling | null = null
  if (selectedHireling) {
    for (const exportValue of Object.values(componentDefinitions)) {
      if (typeof exportValue === 'object') {
        for (const expansion of Object.values(exportValue)) {
          const typedExpansion = expansion as Partial<Expansion>
          if (typedExpansion.hirelings && selectedHireling.code in typedExpansion.hirelings) {
            hirelingDef = typedExpansion.hirelings[selectedHireling.code] ?? null
            break
          }
        }
      }
      if (hirelingDef) break
    }
  }

  const placementCount = hirelingDef?.placementCount ?? 1

  // Clearings already recorded for this hireling in the current step
  const currentSelections: number[] = selectedHireling
    ? (placedHirelings[selectedHireling.code] ?? [])
    : []

  // Whether all required placements have been made
  const placementComplete = currentSelections.length >= placementCount

  const randomRolledSuit = useMemo(() => {
    if (!hirelingDef?.placementRules?.includes('randomSuit')) return undefined
    return rolledSuit
  }, [hirelingDef?.placementRules])

  const rules = hirelingDef?.placementRules ?? []
  const isAutoPlacement = !!hirelingDef?.autoPlacement
  const isForestPlacement = rules.includes('forest')
  const isPathPlacement = rules.includes('path')

  // Auto-dispatch allClearings / allRuins without user interaction
  useEffect(() => {
    if (!selectedHireling || !hirelingDef || !mapData || !isAutoPlacement) return

    const autoIndexes: number[] = []
    mapData.clearings.forEach((baseClearing, i) => {
      const dynamicClearingState = setupState.clearings[i] ?? {}
      const mergedClearing = {
        ...baseClearing,
        ...dynamicClearingState,
      } as unknown as SetupClearing

      if (
        validateHirelingPlacement(
          i,
          mergedClearing,
          hirelingDef,
          [],
          mapData as unknown as SetupMapState,
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
    selectedHireling,
    selectedHireling?.code,
    setupState.clearings,
  ])

  if (!selectedHireling || !mapData) return null

  // Build valid clearing list only for interactive placement modes
  const validClearings: number[] = []
  if (
    hirelingDef &&
    !isAutoPlacement &&
    !isForestPlacement &&
    !isPathPlacement &&
    !placementComplete
  ) {
    mapData.clearings.forEach((baseClearing, i) => {
      const dynamicClearingState = setupState.clearings[i] ?? {}
      const mergedClearing = {
        ...baseClearing,
        ...dynamicClearingState,
      } as unknown as SetupClearing

      const passesTagRules = validateHirelingPlacement(
        i,
        mergedClearing,
        hirelingDef,
        currentSelections,
        mapData as unknown as SetupMapState,
        randomRolledSuit,
      )

      const passesCustomRules = hirelingDef.isValidPlacement
        ? hirelingDef.isValidPlacement(
            i,
            mergedClearing,
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
    if (placementComplete) return
    if (!useHouserules && !validClearings.includes(clearingIndex)) return

    dispatch(
      placeHireling({
        clearingIndexes: [...currentSelections, clearingIndex],
        code: selectedHireling.code,
      }),
    )
  }

  const noValidClearings = !placementComplete && validClearings.length === 0
  const sharedSetupProps = {
    i18nKey: `hireling.${selectedHireling.code}.setup` as const,
    tOptions: {
      context: selectedHireling.demoted ? 'demoted' : undefined,
      count: playerNumber,
    },
  }

  // --- Auto-placement (allClearings / allRuins): reference map, no interaction ---
  if (isAutoPlacement) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        <MapChart useHouserules={useHouserules} />
        <div>
          <p>
            <LocaleText {...sharedSetupProps} />
          </p>
        </div>
      </Section>
    )
  }

  // --- Forest placement: reference map, no clearing interaction ---
  if (isForestPlacement) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        <MapChart useHouserules={useHouserules} />
        <div>
          <p>
            <LocaleText {...sharedSetupProps} />
          </p>
        </div>
      </Section>
    )
  }

  // --- Path placement: reference map, no clearing interaction ---
  if (isPathPlacement) {
    return (
      <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
        <MapChart useHouserules={useHouserules} />
        <div>
          <p>
            <LocaleText {...sharedSetupProps} />
          </p>
        </div>
      </Section>
    )
  }

  // --- Standard clearing-based placement ---
  return (
    <Section subtitleKey={`hireling.${selectedHireling.code}.setupTitle`}>
      <MapChart
        // Once all placements are done, remove the click handler entirely so the
        // map renders as reference-only and the cursor reflects non-interactivity.
        onClearingClick={placementComplete ? undefined : handleClearingClick}
        useHouserules={useHouserules}
        validClearings={validClearings}
        selectedClearings={currentSelections}
      />
      <div>
        {randomRolledSuit && (
          <p>
            <LocaleText
              i18nKey="label.rolledSuit"
              tOptions={{ context: randomRolledSuit }}
            />
          </p>
        )}
        {placementComplete ? (
          <p>
            <LocaleText
              i18nKey="label.placementComplete"
              tOptions={{ count: placementCount }}
            />
          </p>
        ) : noValidClearings ? (
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

export default SetUpHirelingStep
