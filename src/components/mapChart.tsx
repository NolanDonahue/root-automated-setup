import React from 'react'

import type { Hireling, Landmark, WithCode } from '../types'

import { ICON_DICTIONARY } from '../constants'
import { useAppSelector } from '../hooks'
import priorityToken from '../images/charts/markers/priority.svg'
import ruinBuilding from '../images/charts/markers/ruin.png'
import { selectHirelingArray, selectLandmarkArray, selectSetupMap } from '../store'
import LocaleText from './localeText'

interface MapData {
  code: string
  backImage: string
  floodImage?: string
  useLandmark?: boolean
  botPriorities?: number[]
  suitLandmarks?: Record<string, string>
  landmark?: {
    clearing: number
    x: number
    y: number
    angle?: number
    image: string
    code: string
  }
  clearings: {
    x: number
    y: number
    suit: keyof typeof ICON_DICTIONARY | null
    flooded?: boolean
    ruin?: boolean
  }[]
  pathCoords: [number, number][]
  forestCoords: [number, number][]
}

/** How to draw the map’s built-in landmark (Lake ferry, Mountain tower/city). */
export type MapAnchoredLandmarkMode = 'overview' | 'placement'

interface MapChartProps {
  onClearingClick?: (index: number) => void
  activeLandmark?: string
  validClearings?: number[]
  selectedClearings?: number[]
  validForestIndexes?: number[]
  selectedForestIndexes?: number[]
  onForestClick?: (index: number) => void
  validPathIndexes?: number[]
  selectedPathIndexes?: number[]
  onPathClick?: (index: number) => void
  useHouserules?: boolean
  /**
   * `overview` (set up map step): landmark at authored SVG coordinates.
   * `placement` (hireling / landmark steps): same landmark only in the bottom-left stack at its
   * clearing to avoid duplicating the large positioned graphic.
   */
  mapAnchoredLandmarkMode?: MapAnchoredLandmarkMode
}

const ZONE_RADIUS = 50

const ZONE_STYLES = {
  forest: {
    titleKey: 'label.forest' as const,
    selectedStroke: '#22c55e',
    validFill: 'rgba(34,197,94,0.15)',
    validStroke: '#22c55e',
    keyPrefix: 'forest',
    pieceKeyPrefix: 'forest-hireling',
  },
  path: {
    titleKey: 'label.path' as const,
    selectedStroke: '#f97316',
    validFill: 'rgba(251,191,36,0.15)',
    validStroke: '#fbbf24',
    keyPrefix: 'path',
    pieceKeyPrefix: 'path-hireling',
  },
} as const

function PlacementZoneGroups({
  zoneKind,
  coords,
  selectedIndexes,
  validIndexes,
  onZoneClick,
  piecesByZone,
  useHouserules,
}: {
  zoneKind: keyof typeof ZONE_STYLES
  coords: [number, number][]
  selectedIndexes: number[]
  validIndexes: number[]
  onZoneClick: ((index: number) => void) | undefined
  piecesByZone: Record<number, WithCode<Hireling>[]>
  useHouserules: boolean
}) {
  const style = ZONE_STYLES[zoneKind]

  return coords.map(([x, y], index) => {
    const isSelected = selectedIndexes.includes(index)
    const isValid = validIndexes.includes(index)
    const isClickable = onZoneClick != null && !isSelected && (isValid || useHouserules)
    const zonePieces = piecesByZone[index] ?? []

    return (
      <g
        key={`${style.keyPrefix}-${index}`}
        onClick={() => {
          if (isClickable) onZoneClick(index)
        }}
        style={{ cursor: isSelected ? 'default' : isClickable ? 'pointer' : 'default' }}
      >
        <title>
          <LocaleText i18nKey={style.titleKey} />
        </title>

        <circle
          cx={x}
          cy={y}
          r={ZONE_RADIUS}
          fill="transparent"
        />

        {isSelected ? (
          <circle
            cx={x}
            cy={y}
            r={ZONE_RADIUS + 5}
            fill="none"
            stroke={style.selectedStroke}
            strokeWidth="6"
          />
        ) : null}

        {isValid && !isSelected ? (
          <circle
            cx={x}
            cy={y}
            r={ZONE_RADIUS + 5}
            fill={style.validFill}
            stroke={style.validStroke}
            strokeWidth="4"
            strokeDasharray="8 4"
          />
        ) : null}

        {zonePieces.map((hireling, i) => {
          const size = 60
          return (
            <image
              key={`${style.pieceKeyPrefix}-${hireling.code}-${i}`}
              x={x - size / 2 + i * 18}
              y={y - size / 2 + i * 18}
              width={size}
              height={size}
              href={hireling.image}
            >
              <title>
                <LocaleText i18nKey={`hireling.${hireling.code}.name`} />
              </title>
            </image>
          )
        })}
      </g>
    )
  })
}

function LandmarkQuadrantStack({
  clearingX,
  clearingY,
  landmarks,
}: {
  clearingX: number
  clearingY: number
  landmarks: WithCode<Landmark>[]
}) {
  const size = 75
  return landmarks.map((landmark, i) => (
    <image
      key={`landmark-${landmark.code}-${i}`}
      x={clearingX - size + 5 - i * 12}
      y={clearingY + 5 + i * 12}
      width={size}
      height={size}
      href={landmark.image}
    >
      <title>
        <LocaleText i18nKey={`landmark.${landmark.code}.name`} />
      </title>
    </image>
  ))
}

function HirelingQuadrantStack({
  clearingX,
  clearingY,
  hirelings: hirelingList,
}: {
  clearingX: number
  clearingY: number
  hirelings: WithCode<Hireling>[]
}) {
  const size = 75
  return hirelingList.map((hireling, i) => (
    <image
      key={`hireling-${hireling.code}-${i}`}
      x={clearingX - 5 + i * 22}
      y={clearingY + 5 + i * 22}
      width={size}
      height={size}
      href={hireling.image}
    >
      <title>
        <LocaleText i18nKey={`hireling.${hireling.code}.name`} />
      </title>
    </image>
  ))
}

const MapChart: React.FC<MapChartProps> = ({
  onClearingClick,
  validClearings = [],
  selectedClearings = [],
  validForestIndexes = [],
  selectedForestIndexes = [],
  onForestClick,
  validPathIndexes = [],
  selectedPathIndexes = [],
  onPathClick,
  useHouserules = false,
  mapAnchoredLandmarkMode = 'placement',
}) => {
  const map = useAppSelector(selectSetupMap) as MapData | null

  const includeBots = useAppSelector(state => state.setup.botCount > 0)
  const placedLandmarks = useAppSelector(state => state.flow.placedLandmarks)
  const placedHirelings = useAppSelector(state => state.flow.placedHirelings)
  const landmarks = useAppSelector(selectLandmarkArray)
  const hirelings = useAppSelector(selectHirelingArray)
  const mountainLandmarkCode = useAppSelector(state => state.setup.mountainLandmarkCode)

  const displayLandmark = React.useMemo(() => {
    if (!map?.useLandmark || !map.landmark) return null
    if (map.code === 'mountain') {
      const overrideLandmark = landmarks.find(l => l.code === mountainLandmarkCode)
      if (overrideLandmark) {
        return {
          ...map.landmark,
          code: overrideLandmark.code,
          image: overrideLandmark.image,
        }
      }
    }
    return map.landmark
  }, [map, landmarks, mountainLandmarkCode])

  const mapAnchoredLandmarkDef = React.useMemo(
    () =>
      displayLandmark ? (landmarks.find(l => l.code === displayLandmark.code) ?? null) : null,
    [displayLandmark, landmarks],
  )

  /**
   * Clearings → which landmark/hireling images to stack there. Forest and path hirelings are
   * intentionally excluded here — their stored indexes are zone indexes, not clearing indexes. They
   * render in the forest/path zone loops below using piecesByForestZone / piecesByPathZone.
   */
  const { piecesByClearing, piecesByForestZone, piecesByPathZone } = React.useMemo(() => {
    const clearingGrouping: Record<
      number,
      { landmarks: typeof landmarks; hirelings: typeof hirelings }
    > = {}
    const forestGrouping: Record<number, typeof hirelings> = {}
    const pathGrouping: Record<number, typeof hirelings> = {}

    Object.entries(placedLandmarks).forEach(([code, clearingIndexes]) => {
      const def = landmarks.find(l => l.code === code)
      if (def) {
        clearingIndexes.forEach(idx => {
          clearingGrouping[idx] ??= { landmarks: [], hirelings: [] }
          clearingGrouping[idx].landmarks.push(def)
        })
      }
    })

    Object.entries(placedHirelings).forEach(([code, storedIndexes]) => {
      const def = hirelings.find(h => h.code === code)
      if (!def) return
      const rules = def.placementRules ?? []
      const warriorCount = def.warriorCount ?? 1

      if (rules.includes('forest')) {
        storedIndexes.forEach(idx => {
          forestGrouping[idx] ??= []
          for (let w = 0; w < warriorCount; w++) {
            forestGrouping[idx].push(def)
          }
        })
      } else if (rules.includes('path')) {
        storedIndexes.forEach(idx => {
          pathGrouping[idx] ??= []
          for (let w = 0; w < warriorCount; w++) {
            pathGrouping[idx].push(def)
          }
        })
      } else {
        storedIndexes.forEach(idx => {
          clearingGrouping[idx] ??= { landmarks: [], hirelings: [] }
          for (let w = 0; w < warriorCount; w++) {
            clearingGrouping[idx].hirelings.push(def)
          }
        })
      }
    })

    return {
      piecesByClearing: clearingGrouping,
      piecesByForestZone: forestGrouping,
      piecesByPathZone: pathGrouping,
    }
  }, [placedLandmarks, placedHirelings, landmarks, hirelings])

  if (!map) return null

  const floodedClearings = map.clearings.filter(clearing => clearing.flooded)

  return (
    <svg
      className="map"
      viewBox="0 0 1000 1000"
    >
      <desc>
        <LocaleText i18nKey="label.mapChart" />
      </desc>

      <image
        className="background"
        href={map.backImage}
      />

      {floodedClearings.length > 0 && map.floodImage ? (
        <>
          <mask id="flooded-mask">
            {floodedClearings.map((clearing, index) => (
              <circle
                key={`flood-${index}`}
                cx={clearing.x}
                cy={clearing.y}
                r="90"
                fill="white"
              />
            ))}
          </mask>
          <image
            className="background"
            href={map.floodImage}
            mask="url(#flooded-mask)"
          />
        </>
      ) : null}

      <PlacementZoneGroups
        coords={map.forestCoords}
        onZoneClick={onForestClick}
        piecesByZone={piecesByForestZone}
        selectedIndexes={selectedForestIndexes}
        useHouserules={useHouserules}
        validIndexes={validForestIndexes}
        zoneKind="forest"
      />

      <PlacementZoneGroups
        coords={map.pathCoords}
        onZoneClick={onPathClick}
        piecesByZone={piecesByPathZone}
        selectedIndexes={selectedPathIndexes}
        useHouserules={useHouserules}
        validIndexes={validPathIndexes}
        zoneKind="path"
      />

      {map.clearings.map(({ x, y, suit, flooded, ruin }, index) => {
        const clearingPieces = piecesByClearing[index] ?? { landmarks: [], hirelings: [] }
        const suitLandmarkCode = suit ? map.suitLandmarks?.[suit] : null
        const suitLandmark = suitLandmarkCode
          ? landmarks.find(l => l.code === suitLandmarkCode)
          : null

        const isAlreadySelected = selectedClearings.includes(index)
        const isTargetValid = validClearings.includes(index)
        const isClickable =
          onClearingClick != null && !isAlreadySelected && (isTargetValid || useHouserules)

        let cursorStyle = 'default'
        if (onClearingClick != null) {
          cursorStyle = isAlreadySelected ? 'default' : isClickable ? 'pointer' : 'not-allowed'
        }

        const overviewLandmark =
          mapAnchoredLandmarkMode === 'overview' &&
          map.useLandmark &&
          displayLandmark?.clearing === index
            ? displayLandmark
            : null

        const quadrantLandmarks = [...clearingPieces.landmarks]
        if (
          mapAnchoredLandmarkMode === 'placement' &&
          map.useLandmark &&
          mapAnchoredLandmarkDef &&
          displayLandmark?.clearing === index
        ) {
          const placedForCode = placedLandmarks[displayLandmark.code] ?? []
          const inPieces = clearingPieces.landmarks.some(l => l.code === displayLandmark.code)
          if (!inPieces && (placedForCode.length === 0 || placedForCode.includes(index))) {
            quadrantLandmarks.push(mapAnchoredLandmarkDef)
          }
        }

        return (
          <g
            key={index}
            onClick={() => {
              if (isClickable) onClearingClick(index)
            }}
            className={`clearing-group ${isClickable ? 'cursor-pointer' : ''}`}
            style={{ cursor: cursorStyle }}
          >
            <title>
              <LocaleText i18nKey={flooded ? `label.clearing.flooded` : `label.clearing.${suit}`} />
            </title>

            <circle
              cx={x}
              cy={y}
              r="90"
              fill="transparent"
            />

            {isAlreadySelected ? (
              <circle
                cx={x}
                cy={y}
                r="95"
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
              />
            ) : null}

            {isTargetValid && !isAlreadySelected ? (
              <circle
                cx={x}
                cy={y}
                r="95"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="6"
                strokeDasharray="10 5"
              />
            ) : null}

            {ruin ? (
              <image
                x={x - 65}
                y={y - 40}
                width="40"
                height="40"
                href={ruinBuilding}
              >
                <title>
                  <LocaleText i18nKey="label.ruin" />
                </title>
              </image>
            ) : null}

            {includeBots && map.botPriorities ? (
              <g>
                <title>
                  <LocaleText
                    i18nKey="label.priority"
                    count={map.botPriorities[index]}
                  />
                </title>
                <image
                  x={x - 55}
                  y={y + 10}
                  width="60"
                  height="60"
                  href={priorityToken}
                />
                <text
                  x={x - 25}
                  y={y + 50}
                  fontSize="30"
                  textAnchor="middle"
                  fill="#fff"
                >
                  {map.botPriorities[index]}
                </text>
              </g>
            ) : null}

            {suitLandmark ? (
              <image
                x={x - 60}
                y={y - 150}
                width="120"
                height="120"
                href={suitLandmark.image}
              >
                <title>
                  <LocaleText i18nKey={`landmark.${suitLandmark.code}.name`} />
                </title>
              </image>
            ) : !flooded && suit && suit !== 'none' ? (
              <image
                x={x - 40}
                y={y - 120}
                width="80"
                height="80"
                href={ICON_DICTIONARY[suit].image}
              >
                <title>
                  <LocaleText i18nKey={`label.suitMarker.${suit}`} />
                </title>
              </image>
            ) : null}

            {overviewLandmark ? (
              <image
                x={overviewLandmark.x}
                y={overviewLandmark.y}
                width="100"
                height="100"
                transform={
                  overviewLandmark.angle != null
                    ? `rotate(${overviewLandmark.angle} ${overviewLandmark.x + 50} ${overviewLandmark.y + 50})`
                    : undefined
                }
                href={overviewLandmark.image}
              >
                <title>
                  <LocaleText i18nKey={`landmark.${overviewLandmark.code}.name`} />
                </title>
              </image>
            ) : null}

            <LandmarkQuadrantStack
              clearingX={x}
              clearingY={y}
              landmarks={quadrantLandmarks}
            />

            <HirelingQuadrantStack
              clearingX={x}
              clearingY={y}
              hirelings={clearingPieces.hirelings}
            />

            {/*
      ============================================================
      DEV TOOLS — uncomment the blocks you need, re-comment when done
      ============================================================*/}

            {/*
            {Array.from({ length: 11 }).map((_, i) => (
              <g
                key={`grid-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={0}
                  y1={i * 100}
                  x2={1000}
                  y2={i * 100}
                  stroke="rgba(0, 0, 0, 0.4)"
                  strokeWidth="2"
                />
                <line
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={1000}
                  stroke="rgba(0, 0, 0, 0.4)"
                  strokeWidth="2"
                />
                <text
                  x={i * 100 + 5}
                  y={20}
                  fill="red"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {i * 100}
                </text>
                <text
                  x={5}
                  y={i * 100 - 5}
                  fill="red"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {i * 100}
                </text>
              </g>
            ))}
            {map.clearings.map(({ x, y }, i) => (
              <text
                key={`clabel-${i}`}
                x={x}
                y={y + 5}
                fontSize="24"
                fontWeight="900"
                fill="red"
                stroke="black"
                strokeWidth="1.5"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                [{i}] {x},{y}
              </text>
            ))}
            {map.pathCoords.map(([x, y], i) => (
              <g
                key={`pmark-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={x - 12}
                  y1={y - 12}
                  x2={x + 12}
                  y2={y + 12}
                  stroke="#f91616"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={x + 12}
                  y1={y - 12}
                  x2={x - 12}
                  y2={y + 12}
                  stroke="#f91616"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <text
                  x={x}
                  y={y - 16}
                  fontSize="16"
                  fontWeight="bold"
                  fill="#f91616"
                  stroke="black"
                  strokeWidth="1"
                  textAnchor="middle"
                >
                  P{i}
                </text>
              </g>
            ))}
            {map.forestCoords.map(([x, y], i) => (
              <g
                key={`fmark-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={x - 12}
                  y1={y - 12}
                  x2={x + 12}
                  y2={y + 12}
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={x + 12}
                  y1={y - 12}
                  x2={x - 12}
                  y2={y + 12}
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <text
                  x={x}
                  y={y - 16}
                  fontSize="16"
                  fontWeight="bold"
                  fill="#22c55e"
                  stroke="black"
                  strokeWidth="1"
                  textAnchor="middle"
                >
                  F{i}
                </text>
              </g>
            ))}

            {/*================================END DEV TOOLS============================ */}
          </g>
        )
      })}
    </svg>
  )
}

export default MapChart
