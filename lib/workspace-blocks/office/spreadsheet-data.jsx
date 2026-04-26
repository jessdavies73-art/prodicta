'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['spreadsheet-data']

export default function SpreadsheetDataBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
