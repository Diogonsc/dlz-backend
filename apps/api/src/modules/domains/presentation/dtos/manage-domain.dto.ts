import { IsEnum, IsString } from 'class-validator';
import { ManageDomainAction } from '../../domain/types/manage-domain-action.type';

export class ManageDomainDto {
  @IsEnum(['add', 'remove', 'verify'])
  action: ManageDomainAction;

  @IsString()
  domain: string;
}
