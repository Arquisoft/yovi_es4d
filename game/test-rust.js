//PRUEBA PARA COMPROABR FUNCIONAR EL BOT DE RUST DESDE NODEJS
const axios = require('axios');

const gameState = { board_size: 11 };

axios.post('http://localhost:3001/v1/ybot/choose/random_bot', gameState)
    .then(() => console.log('Rust bot responded successfully'))
    .catch(() => console.error('Rust bot request failed'));
