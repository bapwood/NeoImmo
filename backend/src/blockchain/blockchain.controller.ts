import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { BlockchainService } from './blockchain.service';
import { ExecutePrimaryBuyDto } from './dto/execute-primary-buy.dto';
import { MintPropertyInventoryDto } from './dto/mint-property-inventory.dto';
import { PreparePrimaryBuyDto } from './dto/prepare-primary-buy.dto';
import { SetBlockedCountryDto } from './dto/set-blocked-country.dto';
import { SetBlocklistDto } from './dto/set-blocklist.dto';
import { SyncWalletKycDto } from './dto/sync-wallet-kyc.dto';

@ApiTags('crypto')
@Controller('crypto')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('health')
  @ApiResponse({ status: 200, description: 'Blockchain backend health' })
  getHealth() {
    return this.blockchainService.getHealth();
  }

  @Get('properties/:id/metadata')
  @ApiResponse({ status: 200, description: 'Signed property metadata' })
  getPropertyMetadata(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getPropertyMetadata(id);
  }

  @Post('wallets/bootstrap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'System wallets synchronized on-chain' })
  bootstrapSystemWallets() {
    return this.blockchainService.bootstrapSystemWallets();
  }

  @Post('users/:id/kyc/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'User KYC synchronized on-chain' })
  syncUserKyc(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.syncUserKyc(id);
  }

  @Post('kyc/wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Raw wallet KYC synchronized on-chain' })
  syncWalletKyc(@Body() payload: SyncWalletKycDto) {
    return this.blockchainService.syncWalletKyc(payload);
  }

  @Post('gate/blocklist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Wallet blocklist updated on-chain' })
  setBlocklist(@Body() payload: SetBlocklistDto) {
    return this.blockchainService.setBlocklist(payload);
  }

  @Post('gate/blocked-country')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Blocked country updated on-chain' })
  setBlockedCountry(@Body() payload: SetBlockedCountryDto) {
    return this.blockchainService.setBlockedCountry(payload);
  }

  @Post('properties/:id/deploy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Property token deployed on-chain' })
  deployPropertyToken(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.deployPropertyToken(id);
  }

  @Post('properties/:id/mint')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Property inventory minted to treasury' })
  mintPropertyInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: MintPropertyInventoryDto,
  ) {
    return this.blockchainService.mintPropertyInventory(id, payload);
  }

  @Post('marketplace/prepare-buy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Primary buy payload prepared for wallet signature' })
  preparePrimaryBuy(@Body() payload: PreparePrimaryBuyDto) {
    return this.blockchainService.preparePrimaryBuy(payload);
  }

  @Post('marketplace/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'Signed primary buy executed on-chain' })
  executePrimaryBuy(@Body() payload: ExecutePrimaryBuyDto) {
    return this.blockchainService.executePrimaryBuy(payload);
  }
}
