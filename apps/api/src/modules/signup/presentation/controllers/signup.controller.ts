import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignupService } from '../../application/services/signup.service';
import { StoreSignupDto } from '../dtos/store-signup.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { StoreSignupFlowResponseDto } from '../dtos/signup-response.dto';

@ApiTags('signup')
@Controller('signup')
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  @Post('store')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'signupStore',
    summary: 'Cadastro público de nova loja — retorna URL do Cakto checkout',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, conflict: true })
  @ApiJsonOkResponse({ type: StoreSignupFlowResponseDto, description: 'URL de checkout e metadados do fluxo' })
  createStore(@Body() dto: StoreSignupDto) {
    return this.signupService.createStore(dto);
  }
}
