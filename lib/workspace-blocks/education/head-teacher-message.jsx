'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['head-teacher-message']

export default function HeadTeacherMessageBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
