'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['safeguarding-referral']

export default function SafeguardingReferralBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
