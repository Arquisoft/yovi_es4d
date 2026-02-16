//PRUEBA PARA COMPROABR FUNCIONAR EL BOT DE RUST DESDE NODEJS
const axios = require('axios');

const gameState = { board_size: 11 };

axios.post('http://localhost:3001/v1/ybot/choose/random_bot', gameState)
    .then(res => console.log(res.data))
    .catch(err => console.error(err));