/**
 * PM2 process manager config for AWS EC2 / bare-metal production.
 * Usage: pm2 start ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'vidhyalayhub-api',
      script: 'server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
