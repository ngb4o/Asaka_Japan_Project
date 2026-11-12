import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const execFileAsync = promisify(execFile)

const SOFFICE_PATHS = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/opt/homebrew/bin/soffice',
  '/usr/local/bin/soffice'
]

let queue = Promise.resolve()

const enqueue = (job) => {
  const run = queue.then(job, job)
  queue = run.then(() => undefined, () => undefined)
  return run
}

const findSoffice = async () => {
  for (const candidate of SOFFICE_PATHS) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      continue
    }
  }
  try {
    const { stdout } = await execFileAsync('which', ['soffice'])
    const found = stdout.trim()
    if (found) return found
  } catch {
    return ''
  }
  return ''
}

const convertOfficeToPdf = (buffer, extension) => enqueue(async () => {
  const soffice = await findSoffice()
  if (!soffice) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'Máy này chưa có LibreOffice nên chưa in được đúng file mẫu')
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kho-print-'))
  const profile = path.join(dir, 'profile')
  const input = path.join(dir, `phieu.${extension}`)
  const output = path.join(dir, 'phieu.pdf')
  try {
    await fs.writeFile(input, buffer)
    const profileUrl = `file://${profile}`
    await execFileAsync(soffice, [
      `-env:UserInstallation=${profileUrl}`,
      '--headless',
      '--norestore',
      '--nolockcheck',
      '--convert-to',
      'pdf',
      '--outdir',
      dir,
      input
    ], { timeout: 60000 })
    return await fs.readFile(output)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'Không chuyển được file mẫu sang bản in')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

const createPdf = async ({ filename, contentBase64 }) => {
  const extension = String(filename || '').toLowerCase().endsWith('.docx') ? 'docx' : 'xlsx'
  if (!String(filename || '').toLowerCase().endsWith(`.${extension}`)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'File mẫu không đúng định dạng')
  }
  let buffer
  try {
    buffer = Buffer.from(String(contentBase64 || ''), 'base64')
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'File mẫu không đọc được')
  }
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'File mẫu không hợp lệ')
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'File mẫu không đúng định dạng')
  }
  const pdf = await convertOfficeToPdf(buffer, extension)
  if (!pdf.length || pdf.subarray(0, 4).toString() !== '%PDF') {
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'Không chuyển được file mẫu sang bản in')
  }
  return pdf
}

export const officePdfService = {
  createPdf
}
