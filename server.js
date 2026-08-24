// ============================================================================
//  Punto de entrada para EJECUCIÓN LOCAL.
//  En Vercel se usa api/index.js en su lugar.
// ============================================================================
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Gimnasio corriendo en:  http://localhost:${PORT}\n`);
});
