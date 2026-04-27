'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['clinical-crisis-simulation']

export default function ClinicalCrisisSimulationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
