'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['stakeholder-conflict']

export default function StakeholderConflictBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
