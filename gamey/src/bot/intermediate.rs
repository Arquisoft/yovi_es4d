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
//!    distance steps, empty cells near it receive a strong bonus. Blocking
//!    the opponent's chains is the top priority after stopping immediate wins.
//!
//! 3. **Strategic bridge bonus** – Instead of filling directly adjacent to
//!    own pieces, the bot prefers cells at distance-2 that form "skip"
//!    connections, extending reach while leaving a virtual connection gap
//!    that the opponent cannot easily break.
//!
//! 4. **Own-piece continuity bonus** – A mild bonus for cells adjacent to
//!    the bot's own pieces, used only as a tiebreaker after the above.
//!
//! The cell with the highest combined score is chosen as the next move.

use crate::{Coordinates, GameY, PlayerId, YBot};

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

    /// Returns all empty cells at exactly graph-distance 2 from `coords`
    /// that share exactly one common empty neighbour with `coords` (the
    /// "skip" pattern). This is the preferred way to extend a chain: place
    /// at distance 2, leaving a virtual connection the opponent cannot break
    /// in one move.
    fn skip_targets(coords: &Coordinates, board: &GameY) -> Vec<Coordinates> {
        let mut result = Vec::new();
        let direct_nbs: Vec<Coordinates> = Self::neighbors(coords)
            .into_iter()
            .filter(|nb| board.player_at(nb).is_none())
            .collect();

        for n1 in &direct_nbs {
            for n2 in Self::neighbors(n1) {
                // Must be empty, not the origin itself, and not a direct neighbour.
                if n2 == *coords { continue; }
                if board.player_at(&n2).is_some() { continue; }
                if direct_nbs.contains(&n2) { continue; }
                result.push(n2);
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

        //1. Centrality
        let centrality = x.min(y).min(z) as f64;
        let max_centrality = ((n - 1) as f64) / 3.0;
        let centrality_score = if max_centrality > 0.0 {
            centrality / max_centrality
        } else {
            0.0
        };

        //2. Opponent threat proximity
        let opp_adjacent = Self::neighbors(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(opp_id))
            .count() as f64;

        let opp_2hop = Self::neighbors_2(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(opp_id))
            .count() as f64;

        let urgency_multiplier = if opp_adjacent >= 2.0 { 1.5 } else { 1.0 };
        let threat_score = (3.0 * opp_adjacent + 1.5 * opp_2hop) * urgency_multiplier;

        //3. Strategic skip bonus
        // Prefer cells that are "skip" targets from the bot's own pieces: place at
        let own_pieces_as_skip_sources = board.available_cells().iter()
            .map(|&idx| Coordinates::from_index(idx, n))
            .count();

        let _ = own_pieces_as_skip_sources; // discard dummy count
        let skip_bonus: f64 = {
            let own_nbs: Vec<Coordinates> = Self::neighbors(candidate)
                .into_iter()
                .filter(|nb| board.player_at(nb) == Some(my_id))
                .collect();

            let own_skip_count = {
                let candidate_empty_nbs: std::collections::HashSet<_> = Self::neighbors(candidate)
                    .into_iter()
                    .filter(|nb| board.player_at(nb).is_none())
                    .collect();

                Self::neighbors_2(candidate)
                    .iter()
                    .filter(|far| {
                        board.player_at(far) == Some(my_id)
                            && Self::neighbors(far)
                            .iter()
                            .any(|nb| candidate_empty_nbs.contains(nb))
                    })
                    .count() as f64
            };

            let bridge_chains = if own_nbs.len() >= 2 { own_nbs.len() as f64 - 1.0 } else { 0.0 };

            own_skip_count * 2.5 + bridge_chains * 1.5
        };

        //4. Own-piece continuity (SECONDARY, mild tiebreaker)
        let own_adjacent = Self::neighbors(candidate)
            .iter()
            .filter(|nb| board.player_at(nb) == Some(my_id))
            .count() as f64;

        // 5. Side-touch bonus
        let side_touch = (candidate.touches_side_a() as u8
            + candidate.touches_side_b() as u8
            + candidate.touches_side_c() as u8) as f64;

        //Weighted combination
        3.0 * centrality_score   // strong centre preference
            + 4.0 * threat_score       // blocking opponent is TOP priority
            + 3.0 * skip_bonus         // extend via skip patterns
            + 1.0 * own_adjacent       // mild: prefer being near our pieces
            + 0.5 * side_touch         // mild edge-capture incentive
    }
}

impl YBot for IntermediateBot {
    fn name(&self) -> &str {
        "intermediate_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        // Determine which player we are and who the opponent is.
        let my_id = board.next_player()?;
        let opp_id = PlayerId::new(1 - my_id.id());

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
        let game = GameY::new(7);
        let coords = bot().choose_move(&game).unwrap();
        let min_coord = coords.x().min(coords.y()).min(coords.z());
        assert!(min_coord >= 1, "Bot should prefer interior cells, got {:?}", coords);
    }

    #[test]
    fn test_blocks_opponent_nearby() {
        let mut game = GameY::new(5);

        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        })
            .unwrap();

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

        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        })
            .unwrap();

        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 0, 4),
        })
            .unwrap();

        let chosen = bot().choose_move(&game).unwrap();
        let own_piece = Coordinates::new(2, 1, 1);
        let own_neighbors = IntermediateBot::neighbors(&own_piece);
        let own_2hop = IntermediateBot::neighbors_2(&own_piece);

        let is_near_own = own_neighbors.contains(&chosen) || own_2hop.contains(&chosen);
        assert!(
            is_near_own,
            "Bot should extend its chain (adjacent or skip); chose {:?}",
            chosen
        );
    }
}