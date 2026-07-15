export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? '1',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    'http://localhost:5173,https://panel.clearnest.pl,https://clearnest.pl'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'api/docs',
  },
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME ?? 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin',
  },
});
