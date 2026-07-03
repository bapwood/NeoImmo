import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { BlockchainService } from './blockchain.service';
import { BlockchainOperationsQueryDto } from './dto/blockchain-query.dto';
import {
  BlockchainHealthResponseDto,
  BlockchainOperationDto,
  BlockchainOperationListResponseDto,
  ExecutePrimaryBuyResponseDto,
  MintPropertyInventoryResponseDto,
  PreparePropertyDeployResponseDto,
  PreparePrimaryBuyResponseDto,
  PropertyMetadataResponseDto,
  PropertyTokenRecordDto,
  PropertyTokenStateResponseDto,
  SystemWalletBootstrapResponseDto,
  TransactionResultDto,
  UserComplianceStateResponseDto,
  WalletKycResultDto,
} from './dto/blockchain-response.dto';
import { ExecutePropertyDeployDto } from './dto/execute-property-deploy.dto';
import { ExecutePrimaryBuyDto } from './dto/execute-primary-buy.dto';
import { MintPropertyInventoryDto } from './dto/mint-property-inventory.dto';
import { PayPropertyRentDto } from './dto/pay-property-rent.dto';
import { PreparePropertyDeployDto } from './dto/prepare-property-deploy.dto';
import { PreparePrimaryBuyDto } from './dto/prepare-primary-buy.dto';
import { PrepareClientPrimaryBuyDto } from './dto/prepare-client-primary-buy.dto';
import { SetBlockedCountryDto } from './dto/set-blocked-country.dto';
import { SetBlocklistDto } from './dto/set-blocklist.dto';
import { SetPropertyPurchaseAvailabilityDto } from './dto/set-property-purchase-availability.dto';
import { SyncWalletKycDto } from './dto/sync-wallet-kyc.dto';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@ApiTags('crypto')
@Controller('crypto')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('system/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin system overview',
    description:
      'Returns wallet balances (deployer + treasury), per-property token inventory and monthly rent summary.',
  })
  @ApiOkResponse({ description: 'System overview' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getSystemOverview() {
    return this.blockchainService.getSystemOverview();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check of the blockchain bridge',
    description:
      'Returns the resolved RPC, wallets and deployed contract addresses used by the backend to orchestrate on-chain actions.',
  })
  @ApiOkResponse({
    description: 'Blockchain backend health',
    type: BlockchainHealthResponseDto,
  })
  getHealth() {
    return this.blockchainService.getHealth();
  }

  @Get('operations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List blockchain operations',
    description:
      'Returns the tracked backend-to-blockchain operations stored in the database, with optional filters by type, status, property or user.',
  })
  @ApiOkResponse({
    description: 'Tracked blockchain operations',
    type: BlockchainOperationListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getOperations(@Query() query: BlockchainOperationsQueryDto) {
    return this.blockchainService.listOperations(query);
  }

  @Get('operations/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get one blockchain operation',
    description:
      'Returns the persisted request payload, status and transaction hashes for a prepared or executed blockchain action.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Prepared request identifier',
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  @ApiOkResponse({
    description: 'Tracked blockchain operation',
    type: BlockchainOperationDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Blockchain operation not found' })
  getOperationByRequestId(@Param('requestId') requestId: string) {
    return this.blockchainService.getOperationByRequestId(requestId);
  }

  @Get('properties/:id/metadata')
  @ApiOperation({
    summary: 'Read signed property metadata',
    description:
      'Returns the backend-signed JSON metadata that is persisted or regenerated for a tokenized property.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description: 'Signed property metadata',
    type: PropertyMetadataResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getPropertyMetadata(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getPropertyMetadata(id);
  }

  @Get('properties/:id/state')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read one property blockchain state',
    description:
      'Returns the DB tokenization fields plus the live on-chain snapshot: total supply, treasury balance, allowance and factory metadata.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description: 'Property tokenization state',
    type: PropertyTokenStateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getPropertyTokenState(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getPropertyTokenState(id);
  }

  @Get('users/:id/compliance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read one user compliance state',
    description:
      'Returns the user wallet and KYC fields stored in the DB plus the current on-chain compliance snapshot for that wallet.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier',
    example: 7,
  })
  @ApiOkResponse({
    description: 'User compliance state',
    type: UserComplianceStateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUserComplianceState(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getUserComplianceState(id);
  }

  @Post('wallets/bootstrap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Bootstrap backend and treasury wallets',
    description:
      'Synchronizes the backend operator wallet and the treasury admin wallet into the KYC registry before other token operations.',
  })
  @ApiOkResponse({
    description: 'System wallets synchronized on-chain',
    type: SystemWalletBootstrapResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  bootstrapSystemWallets() {
    return this.blockchainService.bootstrapSystemWallets();
  }

  @Post('users/:id/kyc/sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Synchronize one user KYC on-chain',
    description:
      'Pushes the user wallet allow-list status and ISO country code to the on-chain KYC registry.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier',
    example: 7,
  })
  @ApiOkResponse({
    description: 'User KYC synchronized on-chain',
    type: WalletKycResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description: 'The user is missing a wallet or ISO country code',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  syncUserKyc(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.syncUserKyc(id);
  }

  @Post('kyc/wallet')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Synchronize a raw wallet KYC on-chain',
    description:
      'Pushes a wallet allow-list status and ISO country code directly to the on-chain KYC registry.',
  })
  @ApiOkResponse({
    description: 'Raw wallet KYC synchronized on-chain',
    type: WalletKycResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description: 'Invalid wallet address or country code',
  })
  syncWalletKyc(@Body() payload: SyncWalletKycDto) {
    return this.blockchainService.syncWalletKyc(payload);
  }

  @Post('gate/blocklist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update the wallet blocklist',
    description:
      'Blocks or unblocks a wallet in the transfer gate used by all property tokens.',
  })
  @ApiOkResponse({
    description: 'Wallet blocklist updated on-chain',
    type: TransactionResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({ description: 'Invalid wallet address' })
  setBlocklist(@Body() payload: SetBlocklistDto) {
    return this.blockchainService.setBlocklist(payload);
  }

  @Post('gate/blocked-country')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update the blocked country list',
    description:
      'Blocks or unblocks an ISO country code in the transfer gate used by all property tokens.',
  })
  @ApiOkResponse({
    description: 'Blocked country updated on-chain',
    type: TransactionResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({ description: 'Invalid ISO country code' })
  setBlockedCountry(@Body() payload: SetBlockedCountryDto) {
    return this.blockchainService.setBlockedCountry(payload);
  }

  @Post('properties/:id/deploy/prepare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Prepare a signed property deployment',
    description:
      'Builds the EIP-712 typed data that the connected admin wallet must sign before the backend is allowed to deploy the property token through the factory.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description:
      'Typed data prepared for a property deployment approval signature',
    type: PreparePropertyDeployResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description:
      'Property already deployed, blockchain is unavailable or admin wallet is missing',
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  preparePropertyTokenDeployment(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() payload: PreparePropertyDeployDto,
  ) {
    return this.blockchainService.preparePropertyTokenDeployment(
      id,
      request.user.userId,
      payload,
    );
  }

  @Post('properties/:id/deploy/execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Execute a signed property deployment',
    description:
      'Verifies the EIP-712 signature produced by the connected admin wallet, then deploys the ERC-20 property token through the backend operator wallet.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description: 'Property deployment executed on-chain',
    type: TransactionResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description: 'Signature invalid, expired or property cannot be deployed',
  })
  @ApiConflictResponse({
    description: 'Prepared request already executed or already in progress',
  })
  @ApiNotFoundResponse({
    description: 'Prepared deploy request or property not found',
  })
  executePropertyTokenDeployment(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() payload: ExecutePropertyDeployDto,
  ) {
    return this.blockchainService.executePreparedPropertyTokenDeployment(
      id,
      request.user.userId,
      payload,
    );
  }

  @Post('properties/:id/mint')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mint primary inventory to the treasury wallet',
    description:
      'Mints the property supply to the treasury admin wallet and ensures the backend operator wallet has allowance to execute primary sales.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description: 'Property inventory minted to treasury',
    type: MintPropertyInventoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description:
      'Property must be deployed before minting or amount is invalid',
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  mintPropertyInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: MintPropertyInventoryDto,
  ) {
    return this.blockchainService.mintPropertyInventory(id, payload);
  }

  @Get('properties/:id/rent-management')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read the rent management overview of a property',
    description:
      'Returns the property inventory (tokens sold on-chain) and the monthly rent distribution summary for the admin per-asset rent page.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getPropertyRentManagement(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getPropertyRentManagement(id);
  }

  @Get('properties/:id/rent-management/:month')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Read the rent distribution detail of a property for a given month',
    description:
      'Returns every holder revenue record (amount, status, tx hash) for the given month.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiParam({
    name: 'month',
    description: 'Any ISO date within the target month',
    example: '2026-07-01',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getPropertyRentMonthDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('month') month: string,
  ) {
    return this.blockchainService.getPropertyRentMonthDetail(id, month);
  }

  @Post('properties/:id/rent-management/pay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Distribute the projected rent of a property for a given month on-chain',
    description:
      'Sends a native crypto transfer from the treasury wallet to every share holder of the property, proportional to the revenue amount computed for each position, and records the resulting transaction hash.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({ description: 'Property not deployed' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  payPropertyRent(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: PayPropertyRentDto,
  ) {
    return this.blockchainService.payPropertyRent(id, payload.month);
  }

  @Post('properties/:id/purchase-availability')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Open or pause client purchases for one property',
    description:
      'Switches the commercial availability of a tokenized property for primary client purchases. ACTIVE means purchasable, PAUSED removes it from purchase without undeploying the token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property identifier',
    example: 12,
  })
  @ApiOkResponse({
    description: 'Property purchase availability updated',
    type: PropertyTokenRecordDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description:
      'Property must be deployed and minted before reopening purchases, or active before being paused',
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  setPropertyPurchaseAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: SetPropertyPurchaseAvailabilityDto,
  ) {
    return this.blockchainService.setPropertyPurchaseAvailability(
      id,
      payload.available,
    );
  }

  @Post('client/marketplace/prepare-buy')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Prepare a primary buy payload for the authenticated client',
    description:
      'Builds the EIP-712 typed data for the authenticated client session. The wallet stored in the user profile must sign the payload before execution.',
  })
  @ApiOkResponse({
    description: 'Primary buy payload prepared for the authenticated client',
    type: PreparePrimaryBuyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({
    description:
      'Property is not active, client wallet/country is missing or treasury balance is insufficient',
  })
  @ApiNotFoundResponse({ description: 'Property or user not found' })
  prepareClientPrimaryBuy(
    @Req() request: AuthenticatedRequest,
    @Body() payload: PrepareClientPrimaryBuyDto,
  ) {
    return this.blockchainService.prepareClientPrimaryBuy(
      request.user.userId,
      payload,
    );
  }

  @Post('client/marketplace/execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Execute a signed primary buy for the authenticated client',
    description:
      'Verifies that the prepared request belongs to the authenticated client, checks the EIP-712 signature and executes the treasury-to-client transfer.',
  })
  @ApiOkResponse({
    description:
      'Signed primary buy executed on-chain for the authenticated client',
    type: ExecutePrimaryBuyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({
    description:
      'Prepared payload is invalid, expired or signature verification failed',
  })
  @ApiConflictResponse({
    description: 'Prepared request already executed or already in progress',
  })
  @ApiNotFoundResponse({ description: 'Prepared request not found' })
  executeClientPrimaryBuy(
    @Req() request: AuthenticatedRequest,
    @Body() payload: ExecutePrimaryBuyDto,
  ) {
    return this.blockchainService.executeClientPrimaryBuy(
      request.user.userId,
      payload,
    );
  }

  @Post('marketplace/prepare-buy')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Prepare a primary buy payload',
    description:
      'Builds the EIP-712 typed data that the client wallet must sign before the backend executes a treasury-to-client primary sale.',
  })
  @ApiOkResponse({
    description: 'Primary buy payload prepared for wallet signature',
    type: PreparePrimaryBuyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description:
      'Property is not active, client wallet/country is missing or treasury balance is insufficient',
  })
  @ApiNotFoundResponse({ description: 'Property or user not found' })
  preparePrimaryBuy(@Body() payload: PreparePrimaryBuyDto) {
    return this.blockchainService.preparePrimaryBuy(payload);
  }

  @Post('marketplace/execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Execute a signed primary buy',
    description:
      'Verifies the client EIP-712 signature, ensures KYC and treasury allowance are in place, then executes the transfer from treasury to client.',
  })
  @ApiOkResponse({
    description: 'Signed primary buy executed on-chain',
    type: ExecutePrimaryBuyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({
    description:
      'Prepared payload is invalid, expired or signature verification failed',
  })
  @ApiConflictResponse({
    description: 'Prepared request already executed or already in progress',
  })
  @ApiNotFoundResponse({ description: 'Prepared request not found' })
  executePrimaryBuy(@Body() payload: ExecutePrimaryBuyDto) {
    return this.blockchainService.executePrimaryBuy(payload);
  }
}
