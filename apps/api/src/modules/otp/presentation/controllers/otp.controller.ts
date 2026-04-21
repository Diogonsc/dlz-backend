import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OtpService } from '../../application/services/otp.service';
import { SendOtpDto } from '../dtos/send-otp.dto';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { OtpSendResponseDto, OtpVerifyResponseDto } from '../dtos/otp-response.dto';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'otpSend', summary: 'Envia OTP por telefone (vitrine — autenticação do cliente)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: OtpSendResponseDto, description: 'Confirmação de envio do código' })
  send(@Body() dto: SendOtpDto) {
    return this.otpService.send(dto.phone);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'otpVerify', summary: 'Verifica código OTP' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: OtpVerifyResponseDto, description: 'Resultado da verificação' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.otpService.verify(dto.phone, dto.code);
  }
}
