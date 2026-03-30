import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BootstrapDemoPortfolioDto {
  @ApiPropertyOptional({
    description: 'Optional client user identifier. When omitted, the first client with a wallet is used.',
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  userId?: number;
}
