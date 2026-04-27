'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['medication-round']

export default function MedicationRoundBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
