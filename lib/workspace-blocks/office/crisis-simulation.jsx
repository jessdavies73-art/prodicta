'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['crisis-simulation']

export default function CrisisSimulationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
