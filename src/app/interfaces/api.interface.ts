export interface ISendCmdBody {
  currentPath: string
  cmd: string
}

export interface ISendCmdCdResponse {
  newWorkingFolder: string
}

export interface ISendCmdError {
  message: string
  statusCode: number
}