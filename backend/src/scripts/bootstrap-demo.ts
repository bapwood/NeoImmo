import { NestFactory } from '@nestjs/core';
import { Role, TokenizationStatus, WalletStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { AppModule } from '../app.module';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

type DemoPropertyInput = {
  name: string;
  localization: string;
  livingArea: string;
  score: number;
  description: string;
  roomNumber: number;
  bathroomNumber: number;
  tokenNumber: number;
  tokenPrice: number;
  images: string[];
  keyPoints: string[];
};

const DEFAULT_MNEMONIC = 'test test test test test test test test test test test junk';

const demoProperties: DemoPropertyInput[] = [
  {
    name: 'Residence Horizon Marseille',
    localization: 'Marseille 8e',
    livingArea: '84 m²',
    score: 4,
    description:
      'Actif résidentiel premium proche littoral, pensé pour un rendement locatif régulier et une liquidité simple en marché primaire.',
    roomNumber: 4,
    bathroomNumber: 2,
    tokenNumber: 1800,
    tokenPrice: 250,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    ],
    keyPoints: ['Mer à 10 min', 'Résidence récente', 'Locataire en place'],
  },
  {
    name: 'Cour Saint Martin Lyon',
    localization: 'Lyon 6e',
    livingArea: '63 m²',
    score: 5,
    description:
      'Appartement coeur de ville avec forte tension locative, structuré pour une distribution mensuelle stable et une lecture simple côté investisseur.',
    roomNumber: 3,
    bathroomNumber: 1,
    tokenNumber: 1400,
    tokenPrice: 310,
    images: [
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    ],
    keyPoints: ['Centre-ville', 'Faibles travaux', 'Quartier patrimonial'],
  },
];

function deriveHardhatWallet(index: number) {
  const mnemonic = Mnemonic.fromPhrase(process.env.BLOCKCHAIN_MNEMONIC ?? DEFAULT_MNEMONIC);
  return HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).address;
}

async function upsertDemoUsers(prisma: PrismaService) {
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const clientPassword = await bcrypt.hash('Client123!', 10);
  const adminWallet = deriveHardhatWallet(3);
  const clientWallet = deriveHardhatWallet(2);

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin.demo@neoimmo.local',
    },
    update: {
      firstName: 'Neo',
      lastName: 'Admin',
      role: Role.ADMIN,
      walletAddress: adminWallet,
      walletStatus: WalletStatus.VERIFIED,
      walletVerifiedAt: new Date(),
      countryCode: 'FR',
      country: 'France',
      city: 'Paris',
    },
    create: {
      email: 'admin.demo@neoimmo.local',
      password: adminPassword,
      firstName: 'Neo',
      lastName: 'Admin',
      role: Role.ADMIN,
      walletAddress: adminWallet,
      walletStatus: WalletStatus.VERIFIED,
      walletVerifiedAt: new Date(),
      countryCode: 'FR',
      country: 'France',
      city: 'Paris',
    },
  });

  const client = await prisma.user.upsert({
    where: {
      email: 'client.demo@neoimmo.local',
    },
    update: {
      firstName: 'Lina',
      lastName: 'Martin',
      role: Role.CLIENT,
      walletAddress: clientWallet,
      walletStatus: WalletStatus.VERIFIED,
      walletVerifiedAt: new Date(),
      countryCode: 'FR',
      country: 'France',
      city: 'Lyon',
      address: '18 rue de la Republique',
      postalCode: '69002',
      occupation: 'Consultante',
      taxResidence: 'France',
      annualIncomeRange: '50K_100K',
      investmentObjective: 'INCOME',
    },
    create: {
      email: 'client.demo@neoimmo.local',
      password: clientPassword,
      firstName: 'Lina',
      lastName: 'Martin',
      role: Role.CLIENT,
      walletAddress: clientWallet,
      walletStatus: WalletStatus.VERIFIED,
      walletVerifiedAt: new Date(),
      countryCode: 'FR',
      country: 'France',
      city: 'Lyon',
      address: '18 rue de la Republique',
      postalCode: '69002',
      occupation: 'Consultante',
      taxResidence: 'France',
      annualIncomeRange: '50K_100K',
      investmentObjective: 'INCOME',
    },
  });

  return {
    admin,
    client,
  };
}

async function resetLocalDemoBlockchainState(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.portfolioRevenue.deleteMany(),
    prisma.portfolioPosition.deleteMany(),
    prisma.blockchainOperation.deleteMany(),
    prisma.property.updateMany({
      where: {
        OR: [
          {
            contractAddress: {
              not: null,
            },
          },
          {
            tokenizationStatus: {
              not: TokenizationStatus.DRAFT,
            },
          },
        ],
      },
      data: {
        symbol: null,
        contractAddress: null,
        chainId: null,
        metadataUri: null,
        metadataHash: null,
        metadataSignature: null,
        deployTxHash: null,
        tokenizationStatus: TokenizationStatus.DRAFT,
        treasuryWalletAddress: null,
        backendOperatorWalletAddress: null,
      },
    }),
  ]);
}

async function upsertDemoProperty(
  prisma: PrismaService,
  input: DemoPropertyInput,
) {
  const existingProperty = await prisma.property.findFirst({
    where: {
      name: input.name,
      ownerId: null,
    },
  });

  if (existingProperty) {
    return prisma.property.update({
      where: {
        id: existingProperty.id,
      },
      data: {
        localization: input.localization,
        livingArea: input.livingArea,
        score: input.score,
        description: input.description,
        roomNumber: input.roomNumber,
        bathroomNumber: input.bathroomNumber,
        tokenNumber: input.tokenNumber,
        tokenPrice: input.tokenPrice,
        images: input.images,
        keyPoints: {
          set: [],
          connectOrCreate: input.keyPoints.map((label) => ({
            where: { label },
            create: { label },
          })),
        },
      },
    });
  }

  return prisma.property.create({
    data: {
      name: input.name,
      localization: input.localization,
      livingArea: input.livingArea,
      score: input.score,
      description: input.description,
      roomNumber: input.roomNumber,
      bathroomNumber: input.bathroomNumber,
      tokenNumber: input.tokenNumber,
      tokenPrice: input.tokenPrice,
      images: input.images,
      keyPoints: {
        connectOrCreate: input.keyPoints.map((label) => ({
          where: { label },
          create: { label },
        })),
      },
    },
  });
}

async function ensureTokenizedCatalog(
  prisma: PrismaService,
  blockchainService: BlockchainService,
) {
  const propertyIds: number[] = [];

  for (const input of demoProperties) {
    const property = await upsertDemoProperty(prisma, input);
    propertyIds.push(property.id);

    const tokenState = await blockchainService.getPropertyTokenState(property.id);

    if (tokenState.property.contractAddress && !tokenState.onChain.available) {
      await prisma.property.update({
        where: {
          id: property.id,
        },
        data: {
          symbol: null,
          contractAddress: null,
          chainId: null,
          metadataUri: null,
          metadataHash: null,
          metadataSignature: null,
          deployTxHash: null,
          tokenizationStatus: TokenizationStatus.DRAFT,
          treasuryWalletAddress: null,
          backendOperatorWalletAddress: null,
        },
      });
    }

    const propertyForDeployment = await prisma.property.findUniqueOrThrow({
      where: {
        id: property.id,
      },
    });

    if (!propertyForDeployment.contractAddress) {
      await blockchainService.deployPropertyToken(property.id);
    }

    const refreshedProperty = await prisma.property.findUniqueOrThrow({
      where: {
        id: property.id,
      },
    });

    if (refreshedProperty.tokenizationStatus === TokenizationStatus.DEPLOYED) {
      await blockchainService.mintPropertyInventory(property.id, {});
    }

    if (refreshedProperty.tokenizationStatus === TokenizationStatus.ACTIVE) {
      const refreshedTokenState = await blockchainService.getPropertyTokenState(property.id);

      if (refreshedTokenState.onChain.totalSupply === '0') {
        await blockchainService.mintPropertyInventory(property.id, {});
      }
    }

    if (refreshedProperty.tokenizationStatus === TokenizationStatus.PAUSED) {
      await blockchainService.setPropertyPurchaseAvailability(property.id, true);
    }
  }

  return propertyIds;
}

async function seedDemoPrimaryBuys(
  prisma: PrismaService,
  blockchainService: BlockchainService,
  portfolioService: PortfolioService,
  userId: number,
) {
  const mnemonic = Mnemonic.fromPhrase(
    process.env.BLOCKCHAIN_MNEMONIC ?? DEFAULT_MNEMONIC,
  );
  const clientWallet = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/2");
  const activeProperties = await prisma.property.findMany({
    where: {
      ownerId: null,
      tokenizationStatus: TokenizationStatus.ACTIVE,
      contractAddress: {
        not: null,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 2,
  });

  for (const [index, property] of activeProperties.entries()) {
    const prepared = await blockchainService.prepareClientPrimaryBuy(userId, {
      propertyId: property.id,
      amount: String(index + 2),
      price: String(property.tokenPrice),
      currency: 'EUR',
      deadlineMinutes: 30,
    });
    const signature = await clientWallet.signTypedData(
      prepared.domain,
      prepared.types,
      prepared.message,
    );

    await blockchainService.executeClientPrimaryBuy(userId, {
      requestId: prepared.requestId,
      signature,
    });
  }

  await portfolioService.seedHistoricalRevenueForUser(userId);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const blockchainService = app.get(BlockchainService);
    const portfolioService = app.get(PortfolioService);

    const { client } = await upsertDemoUsers(prisma);

    await resetLocalDemoBlockchainState(prisma);
    await blockchainService.bootstrapSystemWallets();
    await ensureTokenizedCatalog(prisma, blockchainService);
    await seedDemoPrimaryBuys(prisma, blockchainService, portfolioService, client.id);
    const portfolio = await portfolioService.getClientPortfolio(client.id);

    console.log(
      JSON.stringify(
        {
          seededClientEmail: client.email,
          seededClientWallet: client.walletAddress,
          positions: portfolio.summary.positionsCount,
          investedTotal: portfolio.summary.totalInvested,
          projectedMonthlyIncome: portfolio.summary.projectedMonthlyIncome,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main();
