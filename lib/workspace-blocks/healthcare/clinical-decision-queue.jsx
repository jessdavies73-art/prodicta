'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['clinical-decision-queue']

export default function ClinicalDecisionQueueBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
