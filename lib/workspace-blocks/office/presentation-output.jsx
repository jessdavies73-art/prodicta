'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['presentation-output']

export default function PresentationOutputBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
