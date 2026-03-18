export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ph_user:ph_dev_pass@db:5432/product_health',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** In dev mode, skip SSO auth and use default AWS credential chain (~/.aws) */
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  // AWS / Athena
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  athenaDatabase: process.env.ATHENA_DATABASE ?? 'qa',
  athenaWorkgroup: process.env.ATHENA_WORKGROUP ?? 'primary',
  athenaOutputBucket: process.env.ATHENA_OUTPUT_BUCKET ?? '',

  // AWS SSO
  ssoStartUrl: process.env.AWS_SSO_START_URL ?? '',
  ssoRegion: process.env.AWS_SSO_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  ssoAccountId: process.env.AWS_SSO_ACCOUNT_ID ?? '',
  ssoRoleName: process.env.AWS_SSO_ROLE_NAME ?? '',
};
