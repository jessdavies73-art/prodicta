'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['inbox']

export default function InboxBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
