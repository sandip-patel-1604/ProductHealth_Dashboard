export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ph_user:ph_dev_pass@db:5432/product_health',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
