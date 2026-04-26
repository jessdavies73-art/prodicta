'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['trade-offs']

export default function TradeOffsBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
