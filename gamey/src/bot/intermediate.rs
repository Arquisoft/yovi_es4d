//! An intermediate bot implementation for the Game of Y.
//!
//! This module provides [`IntermediateBot`], a bot that uses a heuristic
//! scoring function to evaluate and choose moves on the triangular board.
//!
//! ## Algorithm
//!
//! Each empty cell is scored based on:
//!
//! 1. **Centrality bonus** – Cells closer to the center of the triangle
//!    receive a higher base score. In barycentric coordinates (x, y, z) with
//!    x + y + z = N-1, the center maximizes `min(x, y, z)`, so the score is
//!    proportional to `min(x, y, z)`.
//!
//! 2. **Threat proximity bonus** – If an opponent piece is within 2 graph-
//!    distance steps, empty cells near it receive an extra bonus. This
//!    encourages the bot to block the opponent's chains before they extend.
//!
//! 3. **Own-piece continuity bonus** – Cells adjacent to the bot's own
//!    pieces receive a bonus to encourage extending existing chains.
//!
//! The cell with the highest combined score is chosen as the next move.

use crate::{Coordinates, GameY, PlayerId, YBot};

/// A bot that uses a heuristic scoring function to select moves.
///
/// # Example
///
/// ```
/// use gamey::{GameY, YBot};
/// use gamey::bot::IntermediateBot;
///
/// let bot = IntermediateBot;
/// let game = GameY::new(7);
/// let chosen_move = bot.choose_move(&game);
/// assert!(chosen_move.is_some());
/// ```
pub struct IntermediateBot;

impl IntermediateBot {
    /// Returns the 6 (or fewer, on edges/corners) neighbours of a cell.
    ///
    /// Mirrors the private `GameY::get_neighbors` logic using the public
    /// barycentric API.
    fn neighbors(coords: &Coordinates) -> Vec<Coordinates> {
        let mut nb = Vec::with_capacity(6);
        let (x, y, z) = (coords.x(), coords.y(), coords.z());

        if x > 0 {
            nb.push(Coordinates::new(x - 1, y + 1, z));
            nb.push(Coordinates::new(x - 1, y, z + 1));
        }
        if y > 0 {
            nb.push(Coordinates::new(x + 1, y - 1, z));
            nb.push(Coordinates::new(x, y - 1, z + 1));
        }
        if z > 0 {
            nb.push(Coordinates::new(x + 1, y, z - 1));
            nb.push(Coordinates::new(x, y + 1, z - 1));
        }
        nb
    }

    /// Returns all cells reachable in exactly 2 graph hops (neighbours of
    /// neighbours, excluding the origin itself and direct neighbours, to
    /// avoid double-counting in the caller – but here we just return all
    /// 2-hop cells for the threat calculation).
    fn neighbors_2(coords: &Coordinates) -> Vec<Coordinates> {
        let mut result = Vec::new();
        for n1 in Self::neighbors(coords) {
            for n2 in Self::neighbors(&n1) {
                if n2 != *coords {
                    result.push(n2);
                }
            }
        }
        result
    }

    /// Computes a heuristic score for placing a piece at `candidate`.
    ///
    /// Higher score → better move.
    fn score_cell(
        candidate: &Coordinates,
        board: &GameY,
        my_id: PlayerId,
        opp_id: PlayerId,
    ) -> f64 {
        let n = board.board_size();
        let (x, y, z) = (candidate.x(), candidate.y(), candidate.z());

        // ── 1. Centrality ────────────────────────────────────────────────────
        // min(x,y,z) is 0 on the edges and increases toward the centroid.
        // Normalise to [0, 1] by dividing by the theoretical maximum (N-1)/3.
        let centrality = x.min(y).min(z) as f64;
        let max_centrality = ((n - 1) as f64) / 3.0;
        let centrality_score = if max_centrality > 0.0 {
            centrality / max_centrality
        } else {
            0.0
        };

        // ── 2. Own-piece continuity ───────────────────────────────────────────
        // Count direct neighbours that belong to us.
        let own_adjacent = Self::neighbors(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(my_id))
            .count() as f64;

        // ── 3. Opponent threat proximity ─────────────────────────────────────
        // A cell within 2 hops of an opponent piece is strategically important
        // (blocking or contesting). We give a bonus scaled by proximity:
        //   - direct neighbour of opponent → weight 2.0
        //   - 2-hop neighbour of opponent  → weight 1.0
        let opp_adjacent = Self::neighbors(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(opp_id))
            .count() as f64;

        let opp_2hop = Self::neighbors_2(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(opp_id))
            .count() as f64;

        let threat_score = 2.0 * opp_adjacent + 1.0 * opp_2hop;

        // ── 4. Side-touch bonus ───────────────────────────────────────────────
        // Touching a side is valuable (helps towards the win condition), but
        // only if we are already building toward it.  Give a small bonus.
        let side_touch = (candidate.touches_side_a() as u8
            + candidate.touches_side_b() as u8
            + candidate.touches_side_c() as u8) as f64;

        // ── Weighted combination ──────────────────────────────────────────────
        // Weights are tunable; these defaults give a good balance between
        // central play, chain extension, blocking, and edge capture.
        let score = 3.0 * centrality_score   // strongly prefer centre
            + 2.5 * own_adjacent       // extend our chains
            + 2.0 * threat_score       // block / contest opponent
            + 0.5 * side_touch;        // mild edge-capture incentive

        score
    }
}

impl YBot for IntermediateBot {
    fn name(&self) -> &str {
        "intermediate_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        // Determine which player we are and who the opponent is.
        let my_id = board.next_player()?;
        let opp_id = PlayerId::new(1 - my_id.id()); // works for 2-player games

        let available = board.available_cells();
        if available.is_empty() {
            return None;
        }

        let size = board.board_size();

        // Score every available cell and pick the best one.
        available
            .iter()
            .map(|&idx| {
                let coords = Coordinates::from_index(idx, size);
                let score = Self::score_cell(&coords, board, my_id, opp_id);
                (coords, score)
            })
            // Use a stable max: ties broken by first occurrence (deterministic).
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(coords, _)| coords)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    fn bot() -> IntermediateBot {
        IntermediateBot
    }

    #[test]
    fn test_name() {
        assert_eq!(bot().name(), "intermediate_bot");
    }

    #[test]
    fn test_returns_move_on_empty_board() {
        let game = GameY::new(5);
        assert!(bot().choose_move(&game).is_some());
    }

    #[test]
    fn test_returns_none_on_full_board() {
        let mut game = GameY::new(1);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 0),
        })
            .unwrap();
        // Board is full and game is over → next_player() returns None
        assert!(bot().choose_move(&game).is_none());
    }

    #[test]
    fn test_chosen_cell_is_available() {
        let game = GameY::new(5);
        let coords = bot().choose_move(&game).unwrap();
        let idx = coords.to_index(game.board_size());
        assert!(game.available_cells().contains(&idx));
    }

    #[test]
    fn test_prefers_centre_on_empty_board() {
        // On a size-7 board the centroid is at (2,2,2).  The bot should pick
        // something close to the centre rather than an edge cell.
        let game = GameY::new(7);
        let coords = bot().choose_move(&game).unwrap();
        let min_coord = coords.x().min(coords.y()).min(coords.z());
        // A truly central cell has min_coord >= 1 for size 7.
        assert!(min_coord >= 1, "Bot should prefer interior cells, got {:?}", coords);
    }

    #[test]
    fn test_blocks_opponent_nearby() {
        // Place opponent pieces so that the bot should react to them.
        let mut game = GameY::new(5);

        // Player 0 moves first
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1), // centre-ish
        })
            .unwrap();

        // Now it is player 1's turn.  The bot should pick a cell in the
        // neighbourhood of player 0's piece (within 2 hops).
        let chosen = bot().choose_move(&game).unwrap();

        let opp_piece = Coordinates::new(2, 1, 1);
        let opp_neighbors: Vec<_> = IntermediateBot::neighbors(&opp_piece);
        let opp_2hop: Vec<_> = IntermediateBot::neighbors_2(&opp_piece);

        let is_nearby = opp_neighbors.contains(&chosen) || opp_2hop.contains(&chosen);
        assert!(
            is_nearby,
            "Bot should play near opponent's piece; chose {:?}",
            chosen
        );
    }

    #[test]
    fn test_extends_own_chain() {
        let mut game = GameY::new(5);

        // Player 0 places
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        })
            .unwrap();

        // Player 1 places somewhere out of the way
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 0, 4),
        })
            .unwrap();

        // Player 0 should extend its chain.
        let chosen = bot().choose_move(&game).unwrap();
        let own_piece = Coordinates::new(2, 1, 1);
        let own_neighbors = IntermediateBot::neighbors(&own_piece);

        // The chosen cell should be adjacent to our existing piece.
        assert!(
            own_neighbors.contains(&chosen),
            "Bot should extend its chain; chose {:?}",
            chosen
        );
    }
}