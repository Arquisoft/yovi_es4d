const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  role: { type: String, default: 'j1' },
  gameMode: { type: String, default: 'vsBot' },
  boardSize: Number,
  board: Array,
  players: Array,
  currentPlayer: String,
  moves: Array,
  status: { type: String, default: 'active' },
  winner: String,
  createdAt: { type: Date, default: Date.now },
  endedAt: Date
});

const GameModel = mongoose.model('Game', gameSchema);