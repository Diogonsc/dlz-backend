import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignupService } from '../../application/services/signup.service';
import { StoreSignupDto } from '../dtos/store-signup.dto';

@ApiTags('signup')
@Controller('signup')
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  @Post('store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cadastro público de nova loja — retorna URL do Cakto checkout' })
  createStore(@Body() dto: StoreSignupDto) {
    return this.signupService.createStore(dto);
  }
}
