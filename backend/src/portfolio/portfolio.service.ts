import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BlockchainOperationStatus,
  BlockchainOperationType,
  PortfolioRevenueStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type PortfolioTx = Prisma.TransactionClient;
type PurchaseHistoryOperation = Prisma.BlockchainOperationGetPayload<{
  include: {
    property: {
      include: {
        keyPoints: true;
      };
    };
  };
}>;

type PurchaseRecordInput = {
  userId: number;
  propertyId: number;
  amount: string;
  unitPrice: number;
};

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientPortfolio(userId: number) {
    const positions = await this.prisma.portfolioPosition.findMany({
      where: {
        userId,
      },
      include: {
        property: {
          include: {
            keyPoints: true,
          },
        },
        revenueRecords: {
          orderBy: {
            month: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const serializedPositions = positions.map((position) =>
      this.serializePortfolioPosition(position),
    );
    const revenueSeries = this.buildRevenueSeries(positions);
    const totalInvested = serializedPositions.reduce(
      (sum, position) => sum + position.investedTotal,
      0,
    );
    const currentValuation = serializedPositions.reduce(
      (sum, position) => sum + position.currentValuation,
      0,
    );
    const projectedMonthlyIncome = serializedPositions.reduce(
      (sum, position) => sum + position.projectedMonthlyIncome,
      0,
    );
    const totalTokensHeld = serializedPositions.reduce(
      (sum, position) => sum + this.parseHumanAmount(position.tokenAmount),
      0,
    );
    const diversificationCount = new Set(
      serializedPositions.map((position) => position.property.localization),
    ).size;
    const recentPurchases = await this.getClientPurchaseHistory(userId, 3);

    return {
      summary: {
        positionsCount: serializedPositions.length,
        totalTokensHeld: this.normalizeHumanAmount(totalTokensHeld),
        totalInvested,
        currentValuation,
        projectedMonthlyIncome,
        projectedAnnualIncome: projectedMonthlyIncome * 12,
        projectedAnnualYieldPercent:
          totalInvested > 0
            ? Number((((projectedMonthlyIncome * 12) / totalInvested) * 100).toFixed(2))
            : 0,
        diversificationCount,
      },
      positions: serializedPositions,
      revenueSeries,
      recentPurchases,
    };
  }

  async getClientPortfolioPositions(userId: number) {
    const portfolio = await this.getClientPortfolio(userId);
    return portfolio.positions;
  }

  async getClientPurchaseHistory(userId: number, limit = 25) {
    const entries = await this.prisma.blockchainOperation.findMany({
      where: {
        userId,
        type: BlockchainOperationType.EXECUTE_PRIMARY_BUY,
        status: BlockchainOperationStatus.CONFIRMED,
        txHash: {
          not: null,
        },
        propertyId: {
          not: null,
        },
      },
      include: {
        property: {
          include: {
            keyPoints: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    return entries
      .filter((entry): entry is PurchaseHistoryOperation => entry.property != null)
      .map((entry) => this.serializePurchaseHistoryEntry(entry));
  }

  async recordPrimaryPurchase(input: PurchaseRecordInput) {
    if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) {
      throw new BadRequestException('Le prix unitaire de la transaction est invalide.');
    }

    const amountValue = this.parseHumanAmount(input.amount);

    if (amountValue <= 0) {
      throw new BadRequestException('Le montant acheté doit être supérieur à zéro.');
    }

    const property = await this.prisma.property.findUnique({
      where: {
        id: input.propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable pour la mise à jour du portefeuille.');
    }

    const investedDelta = Math.round(amountValue * input.unitPrice);
    const projectedMonthlyIncome = this.computeProjectedMonthlyIncome(investedDelta);

    await this.prisma.$transaction(async (tx) => {
      const existingPosition = await tx.portfolioPosition.findUnique({
        where: {
          userId_propertyId: {
            userId: input.userId,
            propertyId: input.propertyId,
          },
        },
      });

      const nextTokenAmount = amountValue + this.parseHumanAmount(existingPosition?.tokenAmount);
      const nextInvestedTotal = investedDelta + (existingPosition?.investedTotal ?? 0);
      const nextMonthlyIncome =
        projectedMonthlyIncome + (existingPosition?.projectedMonthlyIncome ?? 0);
      const nextAverageTokenPrice =
        nextTokenAmount > 0
          ? Math.round(nextInvestedTotal / nextTokenAmount)
          : input.unitPrice;

      const position = existingPosition
        ? await tx.portfolioPosition.update({
            where: {
              id: existingPosition.id,
            },
            data: {
              tokenAmount: this.normalizeHumanAmount(nextTokenAmount),
              averageTokenPrice: nextAverageTokenPrice,
              investedTotal: nextInvestedTotal,
              projectedMonthlyIncome: nextMonthlyIncome,
              lastPurchaseAt: new Date(),
            },
          })
        : await tx.portfolioPosition.create({
            data: {
              userId: input.userId,
              propertyId: input.propertyId,
              tokenAmount: this.normalizeHumanAmount(amountValue),
              averageTokenPrice: input.unitPrice,
              investedTotal: investedDelta,
              projectedMonthlyIncome,
              lastPurchaseAt: new Date(),
            },
          });

      await this.syncProjectedRevenueRecords(tx, {
        positionId: position.id,
        propertyId: input.propertyId,
        userId: input.userId,
        projectedMonthlyIncome:
          existingPosition?.projectedMonthlyIncome != null
            ? nextMonthlyIncome
            : projectedMonthlyIncome,
      });
    });
  }

  async bootstrapDemoPortfolio(userId?: number) {
    const targetUser =
      userId != null
        ? await this.prisma.user.findFirst({
            where: {
              id: userId,
              role: Role.CLIENT,
            },
          })
        : await this.prisma.user.findFirst({
            where: {
              role: Role.CLIENT,
              walletAddress: {
                not: null,
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

    if (!targetUser) {
      throw new NotFoundException(
        'Aucun client exploitable trouvé pour injecter des données de démonstration.',
      );
    }

    const activeProperties = await this.prisma.property.findMany({
      where: {
        ownerId: null,
        tokenizationStatus: 'ACTIVE',
        contractAddress: {
          not: null,
        },
      },
      take: 2,
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (activeProperties.length === 0) {
      throw new BadRequestException(
        'Aucun bien tokenisé actif n’est disponible pour créer un portefeuille de démonstration.',
      );
    }

    for (const [index, property] of activeProperties.entries()) {
      const amount = String(index + 2);
      await this.recordPrimaryPurchase({
        userId: targetUser.id,
        propertyId: property.id,
        amount,
        unitPrice: property.tokenPrice,
      });

      const position = await this.prisma.portfolioPosition.findUnique({
        where: {
          userId_propertyId: {
            userId: targetUser.id,
            propertyId: property.id,
          },
        },
      });

      if (!position) {
        continue;
      }

      await this.seedPastRevenueRecords(position.id, targetUser.id, property.id, position.projectedMonthlyIncome);
    }

    return this.getClientPortfolio(targetUser.id);
  }

  async seedHistoricalRevenueForUser(userId: number) {
    const positions = await this.prisma.portfolioPosition.findMany({
      where: {
        userId,
      },
    });

    for (const position of positions) {
      await this.seedPastRevenueRecords(
        position.id,
        userId,
        position.propertyId,
        position.projectedMonthlyIncome,
      );
    }
  }

  private async syncProjectedRevenueRecords(
    tx: PortfolioTx,
    input: {
      positionId: number;
      userId: number;
      propertyId: number;
      projectedMonthlyIncome: number;
    },
  ) {
    const months = this.buildUpcomingMonths(8);

    for (const month of months) {
      await tx.portfolioRevenue.upsert({
        where: {
          positionId_month: {
            positionId: input.positionId,
            month,
          },
        },
        update: {
          amount: input.projectedMonthlyIncome,
          status: PortfolioRevenueStatus.PROJECTED,
          label: 'Projection locative',
        },
        create: {
          positionId: input.positionId,
          userId: input.userId,
          propertyId: input.propertyId,
          month,
          amount: input.projectedMonthlyIncome,
          status: PortfolioRevenueStatus.PROJECTED,
          label: 'Projection locative',
        },
      });
    }
  }

  private async seedPastRevenueRecords(
    positionId: number,
    userId: number,
    propertyId: number,
    baseAmount: number,
  ) {
    const months = [3, 2, 1].map((offset) => this.startOfMonth(this.shiftMonth(new Date(), -offset)));

    for (const [index, month] of months.entries()) {
      await this.prisma.portfolioRevenue.upsert({
        where: {
          positionId_month: {
            positionId,
            month,
          },
        },
        update: {
          amount: baseAmount + index,
          status: PortfolioRevenueStatus.PAID,
          label: 'Distribution versée',
        },
        create: {
          positionId,
          userId,
          propertyId,
          month,
          amount: baseAmount + index,
          status: PortfolioRevenueStatus.PAID,
          label: 'Distribution versée',
        },
      });
    }
  }

  private serializePortfolioPosition(
    position: Prisma.PortfolioPositionGetPayload<{
      include: {
        property: {
          include: {
            keyPoints: true;
          };
        };
        revenueRecords: true;
      };
    }>,
  ) {
    const tokenAmount = this.parseHumanAmount(position.tokenAmount);
    const currentValuation = Math.round(tokenAmount * position.property.tokenPrice);
    const nextRevenue = position.revenueRecords.find(
      (record) => record.month >= this.startOfMonth(new Date()),
    );

    return {
      id: position.id,
      tokenAmount: position.tokenAmount,
      averageTokenPrice: position.averageTokenPrice,
      investedTotal: position.investedTotal,
      currentValuation,
      projectedMonthlyIncome: position.projectedMonthlyIncome,
      projectedAnnualYieldPercent:
        position.investedTotal > 0
          ? Number((((position.projectedMonthlyIncome * 12) / position.investedTotal) * 100).toFixed(2))
          : 0,
      lastPurchaseAt: position.lastPurchaseAt?.toISOString() ?? null,
      property: {
        id: position.property.id,
        name: position.property.name,
        localization: position.property.localization,
        livingArea: position.property.livingArea,
        roomNumber: position.property.roomNumber,
        bathroomNumber: position.property.bathroomNumber,
        score: position.property.score,
        description: position.property.description,
        tokenNumber: position.property.tokenNumber,
        tokenPrice: position.property.tokenPrice,
        contractAddress: position.property.contractAddress,
        treasuryWalletAddress: position.property.treasuryWalletAddress,
        backendOperatorWalletAddress: position.property.backendOperatorWalletAddress,
        tokenizationStatus: position.property.tokenizationStatus,
        images: position.property.images,
        keyPoints: position.property.keyPoints.map((keyPoint) => keyPoint.label),
      },
      nextRevenue: nextRevenue
        ? {
            month: nextRevenue.month.toISOString(),
            label: this.formatMonthLabel(nextRevenue.month),
            amount: nextRevenue.amount,
            status: nextRevenue.status,
          }
        : null,
    };
  }

  private buildRevenueSeries(
    positions: Array<
      Prisma.PortfolioPositionGetPayload<{
        include: {
          revenueRecords: true;
          property: {
            include: {
              keyPoints: true;
            };
          };
        };
      }>
    >,
  ) {
    const buckets = new Map<string, { month: Date; paid: number; projected: number }>();

    for (const position of positions) {
      for (const record of position.revenueRecords) {
        const month = this.startOfMonth(record.month);
        const key = month.toISOString();
        const current = buckets.get(key) ?? { month, paid: 0, projected: 0 };

        if (record.status === PortfolioRevenueStatus.PAID) {
          current.paid += record.amount;
        } else {
          current.projected += record.amount;
        }

        buckets.set(key, current);
      }
    }

    return [...buckets.values()]
      .sort((left, right) => left.month.getTime() - right.month.getTime())
      .map((bucket) => ({
        month: bucket.month.toISOString(),
        label: this.formatMonthLabel(bucket.month),
        paid: bucket.paid,
        projected: bucket.projected,
        total: bucket.paid + bucket.projected,
      }));
  }

  private computeProjectedMonthlyIncome(investedTotal: number) {
    const monthlyYieldBps = Number(process.env.PORTFOLIO_MONTHLY_YIELD_BPS ?? '45');
    return Math.max(1, Math.round((investedTotal * monthlyYieldBps) / 10000));
  }

  private buildUpcomingMonths(count: number) {
    return Array.from({ length: count }, (_, index) =>
      this.startOfMonth(this.shiftMonth(new Date(), index)),
    );
  }

  private shiftMonth(baseDate: Date, offset: number) {
    const nextDate = new Date(baseDate);
    nextDate.setUTCDate(1);
    nextDate.setUTCMonth(nextDate.getUTCMonth() + offset);
    return nextDate;
  }

  private startOfMonth(baseDate: Date) {
    return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1));
  }

  private formatMonthLabel(baseDate: Date) {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
      year: 'numeric',
    }).format(baseDate);
  }

  private parseHumanAmount(value: string | null | undefined) {
    if (!value) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeHumanAmount(value: number) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }

  private serializePurchaseHistoryEntry(entry: PurchaseHistoryOperation) {
    if (!entry.property) {
      throw new NotFoundException('Bien introuvable pour cette opération d’achat.');
    }

    const property = entry.property;
    const unitPrice = Number(entry.price ?? '0');
    const amountValue = this.parseHumanAmount(entry.amount);
    const totalPrice =
      Number.isFinite(unitPrice) && amountValue > 0
        ? Math.round(unitPrice * amountValue)
        : 0;

    return {
      id: entry.id,
      requestId: entry.requestId,
      txHash: entry.txHash ?? '',
      amount: entry.amount ?? '0',
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      totalPrice,
      currency: entry.currency ?? 'EUR',
      fromWallet: entry.fromWallet,
      toWallet: entry.toWallet,
      purchasedAt: entry.updatedAt.toISOString(),
      property: {
        id: property.id,
        name: property.name,
        localization: property.localization,
        livingArea: property.livingArea,
        roomNumber: property.roomNumber,
        bathroomNumber: property.bathroomNumber,
        score: property.score,
        description: property.description,
        tokenNumber: property.tokenNumber,
        tokenPrice: property.tokenPrice,
        contractAddress: property.contractAddress,
        treasuryWalletAddress: property.treasuryWalletAddress,
        backendOperatorWalletAddress: property.backendOperatorWalletAddress,
        tokenizationStatus: property.tokenizationStatus,
        images: property.images,
        keyPoints: property.keyPoints.map((keyPoint) => keyPoint.label),
      },
    };
  }
}
