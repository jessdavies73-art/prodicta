'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['crisis-simulation']

export default function EducationCrisisSimulationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
