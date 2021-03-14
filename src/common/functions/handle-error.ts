import { HttpException, HttpStatus } from "@nestjs/common"
import { ErrorCode } from "../errors"

export const handleError = (message: string, statusCode: ErrorCode) => {
  throw new HttpException(
    {
      message,
      statusCode
    },
    HttpStatus.BAD_REQUEST
  )
}