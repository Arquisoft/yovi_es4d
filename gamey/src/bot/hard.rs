//! A hard bot implementation for the Game of Y.
//!
//! This module provides [`HardBot`], a bot that uses a sophisticated multi-layer
//! heuristic to evaluate and choose moves on the triangular board.
//!
//! ## Algorithm
//!
//! The bot pre-computes six BFS win-distance maps (one per side per player) and
//! uses them together with structural positional bonuses to score every empty cell.
//! The cell with the highest score is selected as the move.
//!
//! ### Scoring layers (in order of descending weight)
//!
//! 1. **Immediate win detection** – If placing here wins the game right now,
//!    return an infinite score immediately. Never miss a winning move.
//!
//! 2. **Immediate block** – If the opponent would win on their next turn at this
//!    cell, assign a near-infinite blocking score. Never let the opponent win
//!    in one move.
//!
//! 3. **Own win-path score** – Using a 0-1 BFS from each side, we compute how
//!    many empty cells must be filled to reach every cell from side A, B, and C
//!    respectively. The combined distance `dA + dB + dC` for the bot player
//!    measures how "close to winning" placing here would be. Lower combined
//!    distance → higher score.
//!
//! 4. **Opponent win-path blocking score** – The same metric for the opponent.
//!    Placing on a cell that is on the opponent's shortest path disrupts their
//!    plan. Scaled by an urgency multiplier that increases as the opponent
//!    approaches a win.
//!
//! 5. **Junction bonus** – A cell that, after placement, connects friendly
//!    chains touching *different* sides scores much higher, because it directly
//!    advances toward touching all three sides simultaneously.
//!
//! 6. **Virtual connection (bridge) bonus** – Two friendly pieces P1 and P2
//!    that share exactly two common empty neighbours form a "virtual connection":
//!    a guaranteed bridge that the opponent cannot break in one move. If the
//!    candidate cell is one of those two carriers it scores a bridge bonus.
//!
//! 7. **Chain-size weighted adjacency** – Extending a large chain is more
//!    valuable than extending a small one. The bonus is the log of the size of
//!    the largest adjacent friendly chain.
//!
//! 8. **Centrality** – `min(x, y, z)` normalised to [0, 1]. Central cells
//!    have more neighbours and more strategic flexibility.

use std::collections::{HashSet, VecDeque};

use crate::{Coordinates, GameY, PlayerId, YBot};

// ── Side bitmask constants ────────────────────────────────────────────────────

const SIDE_A: u8 = 0b001; // x == 0
const SIDE_B: u8 = 0b010; // y == 0
const SIDE_C: u8 = 0b100; // z == 0

// ── Public struct ─────────────────────────────────────────────────────────────

/// A bot that uses advanced multi-layer heuristics to select moves.
///
/// # Example
///
/// ```
/// use gamey::{GameY, YBot};
/// use gamey::bot::HardBot;
///
/// let bot = HardBot;
/// let game = GameY::new(7);
/// let chosen_move = bot.choose_move(&game);
/// assert!(chosen_move.is_some());
/// ```
pub struct HardBot;

// ── Internal helpers ──────────────────────────────────────────────────────────

impl HardBot {
    // ── Neighbourhood ─────────────────────────────────────────────────────────

    /// Returns the up-to-6 neighbours of `coords` in barycentric space.
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

    // ── Side masks ────────────────────────────────────────────────────────────

    /// Returns a bitmask of which sides `coords` touches.
    #[inline]       //Esta anotación inserta el código de la funcion en vez de ser llamada
    fn side_mask(coords: &Coordinates) -> u8 {
        let mut m = 0u8;
        if coords.touches_side_a() { m |= SIDE_A; }
        if coords.touches_side_b() { m |= SIDE_B; }
        if coords.touches_side_c() { m |= SIDE_C; }
        m
    }

    // ── 0-1 BFS win-distance ──────────────────────────────────────────────────

    /// Computes the minimum number of *additional empty cells* that `player`
    /// must fill to create a connected path starting from cells on `side`.
    ///
    /// - Cells owned by `player`   → travel cost 0.
    /// - Empty cells               → travel cost 1.
    /// - Cells owned by opponent   → impassable (∞).
    ///
    /// Returns a flat array indexed by cell index.  Unreachable cells keep
    /// the value `u32::MAX`.
    fn win_distance(board: &GameY, player: PlayerId, side: u8) -> Vec<u32> {
        let size = board.board_size();
        let total = (size * (size + 1) / 2) as usize;
        let mut dist = vec![u32::MAX; total];
        let mut queue: VecDeque<usize> = VecDeque::new();

        // Seed the queue with all cells on the target side.
        for idx in 0..total {
            let c = Coordinates::from_index(idx as u32, size);
            if Self::side_mask(&c) & side == 0 {
                continue;
            }
            match board.player_at(&c) {
                Some(p) if p == player => { dist[idx] = 0; queue.push_front(idx); }
                None                   => { dist[idx] = 1; queue.push_back(idx); }
                _                      => {} // blocked by opponent
            }
        }

        // 0-1 BFS (deque-based Dijkstra for {0,1} weights).
        while let Some(idx) = queue.pop_front() {
            let d = dist[idx];
            let c = Coordinates::from_index(idx as u32, size);
            for nb in Self::neighbors(&c) {
                let nidx = nb.to_index(size) as usize;
                let cost = match board.player_at(&nb) {
                    Some(p) if p == player => 0,
                    None                   => 1,
                    _                      => continue, // opponent blocks
                };
                let nd = d.saturating_add(cost);
                if nd < dist[nidx] {
                    dist[nidx] = nd;
                    if cost == 0 { queue.push_front(nidx); } else { queue.push_back(nidx); }
                }
            }
        }
        dist
    }

    // ── Flood-fill ────────────────────────────────────────────────────────────

    /// BFS flood-fill of `player`'s connected component containing `start`.
    /// Calcula las cadenas
    /// Returns `(set_of_cell_indices, side_bitmask_touched)`.
    fn flood_fill(start: &Coordinates, board: &GameY, player: PlayerId) -> (HashSet<usize>, u8) {
        let size = board.board_size();
        if board.player_at(start) != Some(player) {
            return (HashSet::new(), 0);
        }
        let mut visited: HashSet<usize> = HashSet::new();
        let mut sides = 0u8;
        let mut queue = VecDeque::new();
        let start_idx = start.to_index(size) as usize;
        visited.insert(start_idx);
        queue.push_back(*start);

        while let Some(cur) = queue.pop_front() {
            sides |= Self::side_mask(&cur);
            for nb in Self::neighbors(&cur) {
                let nidx = nb.to_index(size) as usize;
                if !visited.contains(&nidx) && board.player_at(&nb) == Some(player) {
                    visited.insert(nidx);
                    queue.push_back(nb);
                }
            }
        }
        (visited, sides)
    }

    // ── Immediate-win check ───────────────────────────────────────────────────

    /// Returns `true` if placing `player`'s piece at `candidate` would
    /// immediately win the game (connect all three sides).
    fn is_winning_move(candidate: &Coordinates, board: &GameY, player: PlayerId) -> bool {
        // Start with the sides the candidate itself touches.
        let mut sides = Self::side_mask(candidate);

        // Merge sides from every adjacent friendly chain.
        for nb in Self::neighbors(candidate) {
            if board.player_at(&nb) == Some(player) {
                let (_, s) = Self::flood_fill(&nb, board, player);
                sides |= s;
            }
            if sides == 0b111 {
                return true;
            }
        }
        sides == 0b111
    }

    // ── Junction side-count ───────────────────────────────────────────────────

    /// Returns how many distinct sides would be touched by the friendly
    /// component that includes `candidate` after a hypothetical placement.
    fn sides_after_placement(candidate: &Coordinates, board: &GameY, player: PlayerId) -> u8 {
        let mut sides = Self::side_mask(candidate);
        let mut seen_roots: HashSet<usize> = HashSet::new();
        let size = board.board_size();

        for nb in Self::neighbors(candidate) {
            if board.player_at(&nb) == Some(player) {
                let root_idx = nb.to_index(size) as usize;
                if seen_roots.contains(&root_idx) {
                    continue;
                }
                let (cells, s) = Self::flood_fill(&nb, board, player);
                sides |= s;
                for c in cells {
                    seen_roots.insert(c);
                }
            }
        }
        sides.count_ones() as u8
    }

    // ── Virtual connection (bridge) bonus ─────────────────────────────────────

    /// Returns a bonus if `candidate` is a carrier of a virtual connection
    /// between two friendly pieces.
    ///
    /// Two friendly pieces form a virtual connection when they share exactly
    /// **two** common empty neighbours (the "carriers").  Filling either
    /// carrier secures the connection permanently.  This method checks all
    /// pairs of friendly neighbours of `candidate` for this pattern.
    fn bridge_bonus(candidate: &Coordinates, board: &GameY, player: PlayerId) -> f64 {
        let friendly_nbs: Vec<Coordinates> = Self::neighbors(candidate)
            .into_iter()
            .filter(|nb| board.player_at(nb) == Some(player))
            .collect();

        let mut bonus = 0.0f64;

        for i in 0..friendly_nbs.len() {
            for j in (i + 1)..friendly_nbs.len() {
                let p1 = &friendly_nbs[i];
                let p2 = &friendly_nbs[j];

                // Common empty neighbours of p1 and p2, excluding `candidate`.
                let p1_empty: HashSet<Coordinates> = Self::neighbors(p1)
                    .into_iter()
                    .filter(|c| c != candidate && board.player_at(c).is_none())
                    .collect();
                let shared_empty: Vec<_> = Self::neighbors(p2)
                    .into_iter()
                    .filter(|c| c != candidate && p1_empty.contains(c))
                    .collect();

                // Classic virtual connection: exactly one other carrier besides us.
                if shared_empty.len() == 1 {
                    bonus += 6.0; // half-secured bridge
                } else if shared_empty.is_empty() {
                    // Placing here directly merges the two chains.
                    bonus += 2.0;
                }
            }
        }
        bonus
    }

    // ── Largest adjacent chain size ───────────────────────────────────────────

    /// Returns the size of the largest friendly chain adjacent to `candidate`.
    fn largest_adjacent_chain(candidate: &Coordinates, board: &GameY, player: PlayerId) -> usize {
        let size = board.board_size();
        let mut best = 0usize;
        let mut seen: HashSet<usize> = HashSet::new();

        for nb in Self::neighbors(candidate) {
            if board.player_at(&nb) == Some(player) {
                let root = nb.to_index(size) as usize;
                if seen.contains(&root) {
                    continue;
                }
                let (cells, _) = Self::flood_fill(&nb, board, player);
                for c in &cells {
                    seen.insert(*c);
                }
                if cells.len() > best {
                    best = cells.len();
                }
            }
        }
        best
    }

    // ── Main scoring function ─────────────────────────────────────────────────

    #[allow(clippy::too_many_arguments)]
    fn score_cell(
        candidate: &Coordinates,
        board: &GameY,
        my_id: PlayerId,
        opp_id: PlayerId,
        // Pre-computed 0-1 BFS distances for each side / each player.
        da_me:  &[u32],
        db_me:  &[u32],
        dc_me:  &[u32],
        da_opp: &[u32],
        db_opp: &[u32],
        dc_opp: &[u32],
    ) -> f64 {
        let size = board.board_size();
        let idx = candidate.to_index(size) as usize;
        let (x, y, z) = (candidate.x(), candidate.y(), candidate.z());

        // ── Layer 1 & 2: immediate win / block ────────────────────────────────
        // These are handled before calling score_cell in choose_move, but we
        // include them here as a safety net with very high weights.
        if Self::is_winning_move(candidate, board, my_id)  { return  1_000_000.0; }
        if Self::is_winning_move(candidate, board, opp_id) { return    900_000.0; }

        // ── Layer 3: own win-path score ───────────────────────────────────────
        // Lower combined distance → we are closer to winning.
        let cap = (size * 3) as f64;
        let my_a  = da_me[idx].min(size * 2) as f64;
        let my_b  = db_me[idx].min(size * 2) as f64;
        let my_c  = dc_me[idx].min(size * 2) as f64;
        let my_combined = my_a + my_b + my_c;
        // Normalise so that a cell on the direct shortest path scores near 1.
        let my_path_score = (cap - my_combined).max(0.0);

        // Extra bonus when the cell lies on a short path to *all three* sides.
        let all_paths_bonus = if my_a <= 3.0 && my_b <= 3.0 && my_c <= 3.0 {
            20.0 * (6.0 - (my_a + my_b + my_c) / 3.0).max(0.0)
        } else {
            0.0
        };

        // ── Layer 4: opponent blocking score ──────────────────────────────────
        let opp_a  = da_opp[idx].min(size * 2) as f64;
        let opp_b  = db_opp[idx].min(size * 2) as f64;
        let opp_c  = dc_opp[idx].min(size * 2) as f64;
        let opp_combined = opp_a + opp_b + opp_c;

        // Urgency: the closer the opponent is to winning, the harder we block.
        let urgency = if opp_combined <= 1.0 {
            50.0  // they are one move away
        } else if opp_combined <= 3.0 {
            15.0
        } else if opp_combined <= 6.0 {
            4.0
        } else {
            1.0
        };
        let blocking_score = (cap - opp_combined).max(0.0) * urgency;

        // ── Layer 5: junction / side-count bonus ──────────────────────────────
        // Reward cells that bring us closer to touching all three sides.
        let sides = Self::sides_after_placement(candidate, board, my_id);
        let junction_score = match sides {
            3 => 80.0,
            2 => 15.0,
            1 => 2.0,
            _ => 0.0,
        };

        // ── Layer 6: virtual connection (bridge) bonus ────────────────────────
        let bridge = Self::bridge_bonus(candidate, board, my_id);

        // ── Layer 7: chain-size weighted adjacency ────────────────────────────
        let chain_len = Self::largest_adjacent_chain(candidate, board, my_id) as f64;
        // Use log so that extending a 10-piece chain is a bit better than a
        // 5-piece chain, but not twice as valuable.
        let chain_score = (chain_len + 1.0).ln() * 3.0;

        // ── Layer 8: centrality ───────────────────────────────────────────────
        let max_centrality = ((size - 1) as f64) / 3.0;
        let centrality = if max_centrality > 0.0 {
            x.min(y).min(z) as f64 / max_centrality
        } else {
            0.0
        };

        // ── Weighted combination ──────────────────────────────────────────────
        //
        // Weight rationale:
        //   • my_path_score / all_paths_bonus → advancing our own win is primary
        //   • blocking_score                  → urgency-scaled blocking is equally important
        //   • junction_score                  → connecting our chain to more sides is crucial
        //   • bridge                          → virtual connections guarantee future paths
        //   • chain_score                     → prefer extending established chains
        //   • centrality                      → good default when nothing else differentiates
        5.0  * my_path_score
            + 1.0  * all_paths_bonus
            + 4.5  * blocking_score
            + 1.0  * junction_score
            + 1.0  * bridge
            + 1.0  * chain_score
            + 2.0  * centrality
    }
}

// ── YBot implementation ───────────────────────────────────────────────────────

impl YBot for HardBot {
    fn name(&self) -> &str {
        "hard_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id  = board.next_player()?;
        let opp_id = PlayerId::new(1 - my_id.id());

        let available = board.available_cells();
        if available.is_empty() {
            return None;
        }

        let size = board.board_size();

        // Fast-path: if there is exactly one winning move, play it immediately
        // without computing all six BFS maps.
        for &idx in available.iter() {
            let c = Coordinates::from_index(idx, size);
            if Self::is_winning_move(&c, board, my_id) {
                return Some(c);
            }
        }

        // Fast-path: if the opponent has an immediate winning move, block it.
        // (There may be more than one such cell in theory, but in Y the winning
        // move is usually unique; we pick the first one found.)
        for &idx in available.iter() {
            let c = Coordinates::from_index(idx, size);
            if Self::is_winning_move(&c, board, opp_id) {
                return Some(c);
            }
        }

        // Pre-compute six 0-1 BFS distance maps.  Each is O(N²) and computed
        // once; reused for all cell evaluations.
        let da_me  = Self::win_distance(board, my_id,  SIDE_A);
        let db_me  = Self::win_distance(board, my_id,  SIDE_B);
        let dc_me  = Self::win_distance(board, my_id,  SIDE_C);
        let da_opp = Self::win_distance(board, opp_id, SIDE_A);
        let db_opp = Self::win_distance(board, opp_id, SIDE_B);
        let dc_opp = Self::win_distance(board, opp_id, SIDE_C);

        // Score every available cell and pick the highest-scoring one.
        // Ties are broken by the first occurrence (deterministic ordering).
        available
            .iter()
            .map(|&idx| {
                let c = Coordinates::from_index(idx, size);
                let s = Self::score_cell(
                    &c, board, my_id, opp_id,
                    &da_me, &db_me, &dc_me,
                    &da_opp, &db_opp, &dc_opp,
                );
                (c, s)
            })
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(c, _)| c)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    fn bot() -> HardBot { HardBot }

    // ── Basic sanity ──────────────────────────────────────────────────────────

    #[test]
    fn test_name() {
        assert_eq!(bot().name(), "hard_bot");
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
        }).unwrap();
        assert!(bot().choose_move(&game).is_none());
    }

    #[test]
    fn test_chosen_cell_is_available() {
        let game = GameY::new(5);
        let coords = bot().choose_move(&game).unwrap();
        let idx = coords.to_index(game.board_size());
        assert!(game.available_cells().contains(&idx));
    }

    // ── Positional preferences ────────────────────────────────────────────────

    #[test]
    fn test_prefers_centre_on_empty_board() {
        // On a size-7 board the bot should not play on the edge immediately.
        let game = GameY::new(7);
        let coords = bot().choose_move(&game).unwrap();
        let min_coord = coords.x().min(coords.y()).min(coords.z());
        assert!(
            min_coord >= 1,
            "HardBot should prefer interior cells on an empty board, got {:?}",
            coords
        );
    }

    // ── Winning move detection ────────────────────────────────────────────────

    #[test]
    fn test_takes_immediate_win() {
        // Build a position where player 0 can win in one move.
        //
        // Board size 3.  Player 0 already has (0,2,0) and (0,0,2) on sides C
        // and B.  Placing at (0,1,1) connects them through side A (x=0) and
        // creates a chain touching all three sides.
        let mut game = GameY::new(3);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        }).unwrap();
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(2, 0, 0),
        }).unwrap();
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 2),
        }).unwrap();
        // It is now player 1's turn, but we test the win detector independently.
        // Simulate it being player 0's turn by checking is_winning_move directly.
        let winning_cell = Coordinates::new(0, 1, 1);
        let p0 = PlayerId::new(0);
        assert!(
            HardBot::is_winning_move(&winning_cell, &game, p0),
            "Cell (0,1,1) should be a winning move for player 0"
        );
    }

    #[test]
    fn test_plays_winning_move_when_available() {
        // Player 0 has a forced win.  After player 1 plays a dummy move the
        // bot (as player 0) must detect and play it.
        let mut game = GameY::new(3);
        // p0 builds toward win
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        }).unwrap();
        // p1 dummy
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(2, 0, 0),
        }).unwrap();
        // p0 continues
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 2),
        }).unwrap();
        // p1 dummy again
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(1, 1, 0),
        }).unwrap();

        // Now it is player 0's turn; the bot should pick (0,1,1) to win.
        let chosen = bot().choose_move(&game).unwrap();
        assert_eq!(
            chosen,
            Coordinates::new(0, 1, 1),
            "HardBot must play the winning move (0,1,1)"
        );
    }

    // ── Blocking ──────────────────────────────────────────────────────────────

    #[test]
    fn test_blocks_opponent_immediate_win() {
        // Mirror of the above: player 0 has set up a win; it is player 1's turn.
        // The bot (player 1) must block (0,1,1).
        let mut game = GameY::new(3);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        }).unwrap();
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(2, 0, 0),
        }).unwrap(); // p1 irrelevant move
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 2),
        }).unwrap();
        // It is now player 1's turn.
        let chosen = bot().choose_move(&game).unwrap();
        assert_eq!(
            chosen,
            Coordinates::new(0, 1, 1),
            "HardBot must block the opponent's winning move"
        );
    }

    // ── Win-distance BFS ──────────────────────────────────────────────────────

    #[test]
    fn test_win_distance_own_piece_on_side_is_zero() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
        // Place on side A (x == 0).
        game.add_move(Movement::Placement {
            player: p0,
            coords: Coordinates::new(0, 2, 2),
        }).unwrap();

        let da = HardBot::win_distance(&game, p0, SIDE_A);
        let size = game.board_size();
        let idx = Coordinates::new(0, 2, 2).to_index(size) as usize;
        assert_eq!(da[idx], 0, "Own piece on side A should have distance 0 from side A");
    }

    #[test]
    fn test_win_distance_empty_side_cell_is_one() {
        let game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let da = HardBot::win_distance(&game, p0, SIDE_A);
        let size = game.board_size();
        // (0,0,4) is on side A (x==0) and side B (y==0); empty.
        let idx = Coordinates::new(0, 0, 4).to_index(size) as usize;
        assert_eq!(da[idx], 1, "Empty cell on side A should have distance 1");
    }

    #[test]
    fn test_win_distance_interior_is_reachable() {
        let game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let da = HardBot::win_distance(&game, p0, SIDE_A);
        let size = game.board_size();
        // Centre-ish cell (2,1,1) should have a finite distance from side A.
        let idx = Coordinates::new(2, 1, 1).to_index(size) as usize;
        assert!(da[idx] < u32::MAX, "Interior cell should be reachable from side A");
    }

    // ── Bridge detection ──────────────────────────────────────────────────────

    #[test]
    fn test_bridge_bonus_between_adjacent_friendlies() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let p1 = PlayerId::new(1);
        // Place two p0 pieces adjacent to a common empty cell.
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 1, 1) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 0, 4) }).unwrap();
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 2, 0) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 4, 0) }).unwrap();

        // Find a cell adjacent to both p0 pieces.
        let candidate = Coordinates::new(2, 1, 1); // already placed; just test helper
        // Test a truly empty candidate that is adjacent to both:
        // neighbours of (2,1,1): includes (2,2,0) which is occupied.
        // Use a neighbour shared by both — if it exists and is empty.
        let bonus = HardBot::bridge_bonus(&Coordinates::new(3, 1, 0), &game, p0);
        // (3,1,0) is adjacent to (2,1,1) and (2,2,0) — both p0 → should get a bonus.
        assert!(bonus > 0.0, "Should detect a bridge-like pattern");
    }

    // ── Junction side-count ───────────────────────────────────────────────────

    #[test]
    fn test_sides_after_placement_single_piece_on_corner() {
        let game = GameY::new(5);
        // (4,0,0) touches sides B and C (y==0, z==0).
        let sides = HardBot::sides_after_placement(&Coordinates::new(4, 0, 0), &game, PlayerId::new(0));
        assert_eq!(sides, 2, "Corner touches 2 sides");
    }

    #[test]
    fn test_sides_after_placement_merges_chains() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let p1 = PlayerId::new(1);

        // Give p0 a piece on side A and a piece on side B.
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(0, 2, 2) }).unwrap(); // side A
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(4, 0, 0) }).unwrap(); // dummy
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 0, 2) }).unwrap(); // side B
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 4, 0) }).unwrap(); // dummy

        // A cell adjacent to both p0 pieces merges two chains → 2 sides minimum.
        // (1,1,2) is adjacent to (0,2,2) [side A] and (2,0,2) [side B].
        let sides = HardBot::sides_after_placement(&Coordinates::new(1, 1, 2), &game, p0);
        assert!(sides >= 2, "Merging side-A and side-B chains should give ≥ 2 sides");
    }
}