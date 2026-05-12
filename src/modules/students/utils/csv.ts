/**
 * CSV Parsing and matching utilities for student import
 */

export type ImportField =
  | 'name'
  | 'phone'
  | 'parentName'
  | 'parentPhone'
  | 'gradeLevel'
  | 'groupId'

export const requiredFields: ImportField[] = [
  'name',
  'phone',
  'parentName',
  'parentPhone',
  'gradeLevel',
]

export const fieldLabels: Record<ImportField, string> = {
  name: 'اسم الطالب',
  phone: 'هاتف الطالب',
  parentName: 'اسم ولي الأمر',
  parentPhone: 'هاتف ولي الأمر',
  gradeLevel: 'الصف الدراسي',
  groupId: 'المجموعة',
}

/**
 * Parses a CSV string into a 2D array of strings
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }

      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentCell)
      currentCell = ''

      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow.map((cell) => cell.trim()))
      }

      currentRow = []
      continue
    }

    currentCell += character
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell)

    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow.map((cell) => cell.trim()))
    }
  }

  return rows
}

/**
 * Attempts to guess the data field based on CSV header text
 */
export function guessFieldForHeader(header: string): ImportField | '' {
  const normalizedHeader = header.trim().toLowerCase()

  if (['name', 'student', 'اسم', 'اسم الطالب'].includes(normalizedHeader)) {
    return 'name'
  }

  if (
    ['phone', 'student phone', 'هاتف الطالب', 'رقم الطالب'].includes(
      normalizedHeader,
    )
  ) {
    return 'phone'
  }

  if (
    ['parent', 'parent name', 'ولي الأمر', 'اسم ولي الأمر'].includes(
      normalizedHeader,
    )
  ) {
    return 'parentName'
  }

  if (
    ['parent phone', 'guardian phone', 'هاتف ولي الأمر', 'رقم ولي الأمر'].includes(
      normalizedHeader,
    )
  ) {
    return 'parentPhone'
  }

  if (
    ['grade', 'grade level', 'الصف', 'الصف الدراسي'].includes(normalizedHeader)
  ) {
    return 'gradeLevel'
  }

  if (
    ['group', 'group id', 'group name', 'المجموعة', 'اسم المجموعة'].includes(
      normalizedHeader,
    )
  ) {
    return 'groupId'
  }

  return ''
}
