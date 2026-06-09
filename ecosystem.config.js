module.exports = {
  apps: [
    {
      name: 'tile-exporter-backend',
      script: './backend/src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    },
    {
      name: 'tile-exporter-frontend',
      script: 'npx',
      args: 'serve -s frontend/dist -l 5000',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
