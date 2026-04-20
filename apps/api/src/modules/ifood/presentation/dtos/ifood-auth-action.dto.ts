import { IsEnum } from 'class-validator';
import { IfoodAuthAction } from '../../domain/types/ifood-auth-action.type';

export class IfoodAuthActionDto {
  @IsEnum(['refresh', 'test'])
  action: IfoodAuthAction;
}
