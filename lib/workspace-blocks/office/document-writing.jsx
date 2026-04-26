'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['document-writing']

export default function DocumentWritingBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
