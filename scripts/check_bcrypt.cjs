const bcrypt = require('bcrypt');
(async () => {
  const ok = await bcrypt.compare('admin123', '$2b$10$YWT2GNg2w5NVGVzAk3VC8uYoz3DTyn/OHbwIUPEX95kgF9rHAGoWW');
  console.log('bcrypt compare:', ok);
})();
