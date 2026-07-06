import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RentStatementDto {
  @ApiProperty({
    description: 'Loyer réellement encaissé ce mois (centimes)',
    example: '120000',
  })
  @IsNumber()
  @Min(0)
  rentCollected: number;

  @ApiProperty({
    description: "Taux d'occupation réel du locataire ce mois (%)",
    example: '100',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  occupancyRatePct: number;

  @ApiPropertyOptional({
    description: 'Charges de copropriété non récupérables (centimes)',
    example: '8000',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nonRecoverableCharges?: number;

  @ApiPropertyOptional({
    description: 'Quote-part mensuelle de taxe foncière (centimes)',
    example: '10000',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  propertyTaxMonthly?: number;

  @ApiPropertyOptional({
    description: 'Assurances (PNO + GLI) du mois (centimes)',
    example: '1500',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCosts?: number;

  @ApiPropertyOptional({
    description: 'Frais de gestion locative du mois (centimes)',
    example: '7000',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  managementFee?: number;

  @ApiPropertyOptional({
    description: 'Entretien/maintenance réels du mois (centimes)',
    example: '3000',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenanceCost?: number;

  @ApiPropertyOptional({
    description:
      'Frais de transaction blockchain estimés pour le versement (centimes)',
    example: '500',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  blockchainFees?: number;

  @ApiPropertyOptional({
    description:
      'Commission plateforme sur les loyers distribués ce mois (centimes)',
    example: '5000',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  platformFee?: number;

  @ApiPropertyOptional({
    description:
      'Notes libres sur ce mois (incident locatif, travaux imprévus...)',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
