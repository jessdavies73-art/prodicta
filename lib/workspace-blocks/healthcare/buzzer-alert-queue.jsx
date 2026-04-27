'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['buzzer-alert-queue']

export default function BuzzerAlertQueueBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
