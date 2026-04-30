import { defineConfig } from '@prisma/config';

export default defineConfig({
  // @ts-ignore
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});