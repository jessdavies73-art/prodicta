'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['approvals']

export default function ApprovalsBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
