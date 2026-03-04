import { HttpException, HttpStatus } from '@nestjs/common';

export class LlmApiErrorException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'LLM API Error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
