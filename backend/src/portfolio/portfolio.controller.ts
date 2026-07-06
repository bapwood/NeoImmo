import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { AdminRevenueQueryDto } from './dto/admin-revenue-query.dto';
import { BootstrapDemoPortfolioDto } from './dto/bootstrap-demo-portfolio.dto';
import { PurchaseHistoryQueryDto } from './dto/purchase-history-query.dto';
import {
  ClientPortfolioResponseDto,
  PortfolioPositionDto,
  PurchaseHistoryItemDto,
} from './dto/portfolio-response.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read the authenticated client portfolio',
    description:
      'Returns investor metrics, owned tokenized positions and the monthly revenue series used by the client dashboard.',
  })
  @ApiOkResponse({
    description: 'Client portfolio snapshot',
    type: ClientPortfolioResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMyPortfolio(@Req() request: AuthenticatedRequest) {
    return this.portfolioService.getClientPortfolio(request.user.userId);
  }

  @Get('me/positions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read the authenticated client positions only',
    description:
      'Returns the list of tokenized positions without the summary block, useful for lightweight client dashboard refreshes.',
  })
  @ApiOkResponse({
    description: 'Client portfolio positions',
    type: [PortfolioPositionDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMyPortfolioPositions(@Req() request: AuthenticatedRequest) {
    return this.portfolioService.getClientPortfolioPositions(
      request.user.userId,
    );
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read the authenticated client purchase history',
    description:
      'Returns confirmed primary buy operations executed for the authenticated client, ordered from the most recent transaction to the oldest.',
  })
  @ApiOkResponse({
    description: 'Client purchase history',
    type: [PurchaseHistoryItemDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMyPurchaseHistory(
    @Req() request: AuthenticatedRequest,
    @Query() query: PurchaseHistoryQueryDto,
  ) {
    return this.portfolioService.getClientPurchaseHistory(
      request.user.userId,
      query.limit,
    );
  }

  @Post('demo/bootstrap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Bootstrap a demo portfolio dataset',
    description:
      'Creates or enriches a client portfolio with sample positions and monthly revenue records from currently active tokenized properties.',
  })
  @ApiOkResponse({
    description: 'Demo portfolio snapshot created',
    type: ClientPortfolioResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  bootstrapDemoPortfolio(@Body() payload: BootstrapDemoPortfolioDto) {
    return this.portfolioService.bootstrapDemoPortfolio(payload.userId);
  }

  @Get('admin/revenues')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List rental revenue records for administration',
    description:
      'Returns the projected and paid revenue records across every client and property, filterable by month, property and status, for the admin rent management page.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  listAdminRevenues(@Query() query: AdminRevenueQueryDto) {
    return this.portfolioService.listAdminRevenues(query);
  }

  @Get('admin/rent-calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Read upcoming rent due dates across every property',
    description:
      'Returns, month by month over the requested horizon, the total rent due and the per-property breakdown (amount, recipients, paid/partial/projected status) — used by the admin overview payout calendar.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getAdminRentCalendar(@Query('monthsAhead') monthsAhead?: string) {
    const parsed = Number(monthsAhead);
    return this.portfolioService.getAdminRentCalendar(
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    );
  }
}
