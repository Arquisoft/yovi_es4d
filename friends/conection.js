const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gamey';
// Conexión a MongoDB
//Versión local
//mongoose.connect('mongodb://localhost:27017/gamey', {
  //useNewUrlParser: true,
  //useUnifiedTopology: true
//})
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));