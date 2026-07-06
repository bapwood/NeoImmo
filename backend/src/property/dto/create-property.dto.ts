import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'The name of the property',
    example: 'Paris Appartment 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The localization of the property',
    example: 'Paris 13e Arrondissement',
  })
  @IsString()
  localization: string;

  @ApiProperty({
    description: 'The surface of the property',
    example: '20m2',
  })
  @IsString()
  livingArea: string;

  @ApiPropertyOptional({
    description:
      'Score de rentabilité du bien (0-100), calculé automatiquement par le backend à partir des variables financières : toute valeur envoyée ici est ignorée.',
    minimum: 0,
    maximum: 100,
    example: '82',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiProperty({
    description: 'The surface of the property',
    example: '20m2',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'The number of rooms',
    example: '3',
  })
  @IsNumber()
  roomNumber: number;

  @ApiProperty({
    description: 'The number of bathrooms',
    example: '2',
  })
  @IsNumber()
  bathroomNumber: number;

  @ApiProperty({
    description: 'The number of token',
    example: '100,000',
  })
  @IsNumber()
  tokenNumber: number;

  @ApiProperty({
    description: 'The price of the token',
    example: '1',
  })
  @IsNumber()
  tokenPrice: number;

  @ApiPropertyOptional({
    description: "Prix d'achat du bien hors frais (centimes)",
    example: '25000000',
  })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Frais de notaire (% du prix d’achat)',
    example: '7.5',
  })
  @IsOptional()
  @IsNumber()
  notaryFeesPct?: number;

  @ApiPropertyOptional({
    description: "Frais d'agence immobilière (% du prix d’achat)",
    example: '4',
  })
  @IsOptional()
  @IsNumber()
  agencyFeesPct?: number;

  @ApiPropertyOptional({
    description: 'Frais de diagnostics (centimes)',
    example: '50000',
  })
  @IsOptional()
  @IsNumber()
  diagnosticFees?: number;

  @ApiPropertyOptional({
    description: 'Coût des travaux de rénovation (centimes)',
    example: '1500000',
  })
  @IsOptional()
  @IsNumber()
  renovationCost?: number;

  @ApiPropertyOptional({
    description: 'Coût du mobilier/équipement (centimes)',
    example: '300000',
  })
  @IsOptional()
  @IsNumber()
  furnitureCost?: number;

  @ApiPropertyOptional({
    description: 'Apport en fonds propres de la plateforme (centimes)',
    example: '0',
  })
  @IsOptional()
  @IsNumber()
  platformEquity?: number;

  @ApiPropertyOptional({
    description: "Montant de l'emprunt bancaire (centimes)",
    example: '0',
  })
  @IsOptional()
  @IsNumber()
  loanAmount?: number;

  @ApiPropertyOptional({
    description: "Taux d'intérêt annuel de l'emprunt (%)",
    example: '3.5',
  })
  @IsOptional()
  @IsNumber()
  loanRatePct?: number;

  @ApiPropertyOptional({
    description: "Durée de l'emprunt (années)",
    example: '15',
  })
  @IsOptional()
  @IsNumber()
  loanDurationYears?: number;

  @ApiPropertyOptional({
    description: 'Loyer mensuel prévisionnel (centimes)',
    example: '120000',
  })
  @IsOptional()
  @IsNumber()
  monthlyRent?: number;

  @ApiPropertyOptional({
    description: "Taux d'occupation prévisionnel (%)",
    example: '95',
  })
  @IsOptional()
  @IsNumber()
  occupancyRatePct?: number;

  @ApiPropertyOptional({ description: 'Type de location', example: 'Nue' })
  @IsOptional()
  @IsString()
  rentType?: string;

  @ApiPropertyOptional({
    description: 'Charges de copropriété non récupérables (centimes/an)',
    example: '80000',
  })
  @IsOptional()
  @IsNumber()
  nonRecoverableCharges?: number;

  @ApiPropertyOptional({
    description: 'Taxe foncière (centimes/an)',
    example: '120000',
  })
  @IsOptional()
  @IsNumber()
  propertyTax?: number;

  @ApiPropertyOptional({
    description: 'Assurance propriétaire non occupant (centimes/an)',
    example: '15000',
  })
  @IsOptional()
  @IsNumber()
  insurancePnoAnnual?: number;

  @ApiPropertyOptional({
    description: 'Assurance loyers impayés (% du loyer)',
    example: '3',
  })
  @IsOptional()
  @IsNumber()
  insuranceGliPct?: number;

  @ApiPropertyOptional({
    description: 'Frais de gestion locative (% du loyer)',
    example: '7',
  })
  @IsOptional()
  @IsNumber()
  managementFeePct?: number;

  @ApiPropertyOptional({
    description: 'Provision entretien/maintenance courante (% du loyer)',
    example: '3',
  })
  @IsOptional()
  @IsNumber()
  maintenanceProvisionPct?: number;

  @ApiPropertyOptional({
    description: 'Provision grosses réparations (% du loyer)',
    example: '5',
  })
  @IsOptional()
  @IsNumber()
  majorRepairsProvisionPct?: number;

  @ApiPropertyOptional({
    description: "Frais d'entrée/souscription investisseur (%)",
    example: '2',
  })
  @IsOptional()
  @IsNumber()
  subscriptionFeePct?: number;

  @ApiPropertyOptional({
    description:
      'Frais de gestion annuels de la plateforme (% du montant levé)',
    example: '1',
  })
  @IsOptional()
  @IsNumber()
  platformAnnualFeePct?: number;

  @ApiPropertyOptional({
    description: 'Frais de sortie/revente de parts (%)',
    example: '2',
  })
  @IsOptional()
  @IsNumber()
  exitFeePct?: number;

  @ApiPropertyOptional({
    description: 'Commission sur les loyers distribués (%)',
    example: '5',
  })
  @IsOptional()
  @IsNumber()
  rentDistributionCommissionPct?: number;

  @ApiPropertyOptional({
    description: 'Durée de détention prévisionnelle (années)',
    example: '10',
  })
  @IsOptional()
  @IsNumber()
  holdingPeriodYears?: number;

  @ApiPropertyOptional({
    description: 'Taux de valorisation annuel anticipé du marché (%)',
    example: '2',
  })
  @IsOptional()
  @IsNumber()
  exitAppreciationPct?: number;

  @ApiPropertyOptional({
    description: 'Frais de revente côté vendeur (%)',
    example: '6',
  })
  @IsOptional()
  @IsNumber()
  resaleFeesPct?: number;

  @ApiProperty({
    description: 'Images of the property',
    example: '[https://neoimmo.s3.amazonaws.com/neoimmo/property_1.jpg]',
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Key points associated with the property',
    example: ['Piscine', 'Lumineux', 'Terrasse'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];
}
