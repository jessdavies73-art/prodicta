'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['lesson-plan']

export default function LessonPlanBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
