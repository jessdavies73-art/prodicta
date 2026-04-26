'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['calendar-planning']

export default function CalendarPlanningBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
