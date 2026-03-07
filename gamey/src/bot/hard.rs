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
//!    respectively. The score penalises the *worst* individual distance
//!    (minimax), ensuring the bot reduces its weakest side rather than
//!    over-extending along one edge.
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
    #[inline]
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
        let mut sides = Self::side_mask(candidate);

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

                let p1_empty: HashSet<Coordinates> = Self::neighbors(p1)
                    .into_iter()
                    .filter(|c| c != candidate && board.player_at(c).is_none())
                    .collect();
                let shared_empty: Vec<_> = Self::neighbors(p2)
                    .into_iter()
                    .filter(|c| c != candidate && p1_empty.contains(c))
                    .collect();

                if shared_empty.len() == 1 {
                    bonus += 6.0;
                } else if shared_empty.is_empty() {
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

    // ── Skip-bridge bonus ────────────────────────────────────────────────────

    /// Returns a bonus for cells that extend our network via a "skip" pattern.
    fn skip_bridge_bonus(candidate: &Coordinates, board: &GameY, player: PlayerId) -> f64 {
        let direct_nbs: HashSet<Coordinates> = Self::neighbors(candidate).into_iter().collect();

        let mut skip_count = 0usize;
        for mid in &direct_nbs {
            if board.player_at(mid).is_some() { continue; }
            for far in Self::neighbors(mid) {
                if far == *candidate { continue; }
                if direct_nbs.contains(&far) { continue; }
                if board.player_at(&far) == Some(player) {
                    skip_count += 1;
                }
            }
        }

        let own_nbs_count = direct_nbs
            .iter()
            .filter(|nb| board.player_at(nb) == Some(player))
            .count();

        skip_count as f64 * 3.0 + (own_nbs_count.saturating_sub(1)) as f64 * 2.0
    }

    // ── Near-win detection ────────────────────────────────────────────────────

    /// Returns true if `player` can win in at most 2 moves from `candidate`.
    fn is_near_win(candidate: &Coordinates, board: &GameY, player: PlayerId) -> bool {
        let size = board.board_size();

        let mut mask_after_candidate = Self::side_mask(candidate);
        let mut seen: HashSet<usize> = HashSet::new();
        for nb in Self::neighbors(candidate) {
            if board.player_at(&nb) == Some(player) {
                let root = nb.to_index(size) as usize;
                if !seen.contains(&root) {
                    let (cells, s) = Self::flood_fill(&nb, board, player);
                    mask_after_candidate |= s;
                    for c in cells { seen.insert(c); }
                }
            }
        }

        if mask_after_candidate.count_ones() < 2 {
            return false;
        }

        for nb in Self::neighbors(candidate) {
            if board.player_at(&nb).is_some() { continue; }

            let mut combined = mask_after_candidate | Self::side_mask(&nb);
            for nb2 in Self::neighbors(&nb) {
                if nb2 == *candidate { continue; }
                if board.player_at(&nb2) == Some(player) {
                    let (_, s) = Self::flood_fill(&nb2, board, player);
                    combined |= s;
                }
            }

            if combined == 0b111 {
                return true;
            }
        }
        false
    }

    // ── Main scoring function ─────────────────────────────────────────────────

    #[allow(clippy::too_many_arguments)]
    fn score_cell(
        candidate: &Coordinates,
        board: &GameY,
        my_id: PlayerId,
        opp_id: PlayerId,
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
        if Self::is_winning_move(candidate, board, my_id)  { return  1_000_000.0; }
        if Self::is_winning_move(candidate, board, opp_id) { return    900_000.0; }

        // ── Layer 3: own win-path score ───────────────────────────────────────
        //
        // BUG FIX: the original code used the *sum* of the three distances,
        // which a bot minimises by sprinting toward one nearby side while
        // ignoring the other two — causing the "single-line" behaviour.
        //
        // Fix: penalise the *worst* individual side distance (minimax).
        // The bot now reduces its weakest connection instead of over-extending
        // along one edge.  The sum component is kept at lower weight to still
        // reward overall proximity.
        let cap = (size * 3) as f64;
        let my_a = da_me[idx].min(size * 2) as f64;
        let my_b = db_me[idx].min(size * 2) as f64;
        let my_c = dc_me[idx].min(size * 2) as f64;
        let my_combined = my_a + my_b + my_c;

        // Minimax term: reward shrinking the worst-case side distance.
        let my_worst = my_a.max(my_b).max(my_c);
        let my_path_score = (cap - my_combined).max(0.0)
            + 2.0 * (cap / 3.0 - my_worst).max(0.0);

        // Extra bonus when the cell lies on a short path to *all three* sides.
        // Threshold is now relative to board size so it activates on large boards.
        let side_thresh = (size as f64 * 0.6).max(3.0);
        let all_paths_bonus = if my_a <= side_thresh && my_b <= side_thresh && my_c <= side_thresh {
            30.0 * (side_thresh * 2.0 - (my_a + my_b + my_c) / 3.0).max(0.0)
                / side_thresh
        } else {
            0.0
        };

        // ── Layer 4: opponent blocking score ──────────────────────────────────
        let opp_a  = da_opp[idx].min(size * 2) as f64;
        let opp_b  = db_opp[idx].min(size * 2) as f64;
        let opp_c  = dc_opp[idx].min(size * 2) as f64;
        let opp_combined = opp_a + opp_b + opp_c;

        let urgency = if opp_combined <= 1.0 {
            80.0
        } else if opp_combined <= 3.0 {
            25.0
        } else if opp_combined <= 5.0 {
            8.0
        } else if opp_combined <= 8.0 {
            3.0
        } else {
            1.0
        };
        let blocking_score = (cap - opp_combined).max(0.0) * urgency;

        // ── Layer 5: junction / side-count bonus ──────────────────────────────
        let sides = Self::sides_after_placement(candidate, board, my_id);
        let junction_score = match sides {
            3 => 120.0,
            2 => 30.0,  // raised: connecting two sides is strategically decisive
            1 => 2.0,
            _ => 0.0,
        };

        // ── Layer 6: virtual connection (bridge) bonus ────────────────────────
        let bridge = Self::bridge_bonus(candidate, board, my_id);

        // ── Layer 6b: skip-bridge bonus ───────────────────────────────────────
        let skip = Self::skip_bridge_bonus(candidate, board, my_id);

        // ── Layer 6c: near-win bonus ──────────────────────────────────────────
        let near_win_bonus = if Self::is_near_win(candidate, board, my_id) { 40.0 } else { 0.0 };

        // ── Layer 7: chain-size weighted adjacency ────────────────────────────
        let chain_len = Self::largest_adjacent_chain(candidate, board, my_id) as f64;
        let chain_score = (chain_len + 1.0).ln() * 1.5;

        // ── Layer 8: centrality ───────────────────────────────────────────────
        let max_centrality = ((size - 1) as f64) / 3.0;
        let centrality = if max_centrality > 0.0 {
            x.min(y).min(z) as f64 / max_centrality
        } else {
            0.0
        };

        // ── Weighted combination ──────────────────────────────────────────────
        //
        // Weight rationale (updated vs original):
        //   • my_path_score   → now includes minimax term, so weight kept at 5.0
        //   • all_paths_bonus → raised weight: all-three-sides proximity is key
        //   • blocking_score  → urgency-scaled; still top defensive priority
        //   • junction_score  → raised weight: side-count progress is the goal
        //   • skip/bridge     → virtual connections expand reach safely
        //   • near_win_bonus  → close the game when possible
        //   • chain_score     → secondary; mere adjacency is less important
        //   • centrality      → tiebreaker
        4.0 * my_path_score
            + 2.0 * all_paths_bonus      // ↑ was 1.0 — all-sides proximity matters more
            + 4.0 * blocking_score
            + 1.0 * junction_score       // ↑ was 1.5 — side-count progress is the goal
            + 1.2 * skip
            + 1.0 * near_win_bonus
            + 1.0 * bridge
            + 0.8 * chain_score
            + 1.5 * centrality
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

        // Fast-path: immediate win.
        for &idx in available.iter() {
            let c = Coordinates::from_index(idx, size);
            if Self::is_winning_move(&c, board, my_id) {
                return Some(c);
            }
        }

        // Fast-path: block opponent's immediate win.
        for &idx in available.iter() {
            let c = Coordinates::from_index(idx, size);
            if Self::is_winning_move(&c, board, opp_id) {
                return Some(c);
            }
        }

        // Pre-compute six 0-1 BFS distance maps.
        let da_me  = Self::win_distance(board, my_id,  SIDE_A);
        let db_me  = Self::win_distance(board, my_id,  SIDE_B);
        let dc_me  = Self::win_distance(board, my_id,  SIDE_C);
        let da_opp = Self::win_distance(board, opp_id, SIDE_A);
        let db_opp = Self::win_distance(board, opp_id, SIDE_B);
        let dc_opp = Self::win_distance(board, opp_id, SIDE_C);

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

    #[test]
    fn test_prefers_centre_on_empty_board() {
        let game = GameY::new(7);
        let coords = bot().choose_move(&game).unwrap();
        let min_coord = coords.x().min(coords.y()).min(coords.z());
        assert!(
            min_coord >= 1,
            "HardBot should prefer interior cells on an empty board, got {:?}",
            coords
        );
    }

    #[test]
    fn test_takes_immediate_win() {
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
        let winning_cell = Coordinates::new(0, 1, 1);
        let p0 = PlayerId::new(0);
        assert!(
            HardBot::is_winning_move(&winning_cell, &game, p0),
            "Cell (0,1,1) should be a winning move for player 0"
        );
    }

    #[test]
    fn test_plays_winning_move_when_available() {
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
        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(1, 1, 0),
        }).unwrap();

        let chosen = bot().choose_move(&game).unwrap();
        assert_eq!(
            chosen,
            Coordinates::new(0, 1, 1),
            "HardBot must play the winning move (0,1,1)"
        );
    }

    #[test]
    fn test_blocks_opponent_immediate_win() {
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
        let chosen = bot().choose_move(&game).unwrap();
        assert_eq!(
            chosen,
            Coordinates::new(0, 1, 1),
            "HardBot must block the opponent's winning move"
        );
    }

    #[test]
    fn test_win_distance_own_piece_on_side_is_zero() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
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
        let idx = Coordinates::new(0, 0, 4).to_index(size) as usize;
        assert_eq!(da[idx], 1, "Empty cell on side A should have distance 1");
    }

    #[test]
    fn test_win_distance_interior_is_reachable() {
        let game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let da = HardBot::win_distance(&game, p0, SIDE_A);
        let size = game.board_size();
        let idx = Coordinates::new(2, 1, 1).to_index(size) as usize;
        assert!(da[idx] < u32::MAX, "Interior cell should be reachable from side A");
    }

    #[test]
    fn test_bridge_bonus_between_adjacent_friendlies() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let p1 = PlayerId::new(1);
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 1, 1) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 0, 4) }).unwrap();
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 2, 0) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 4, 0) }).unwrap();

        let bonus = HardBot::bridge_bonus(&Coordinates::new(3, 1, 0), &game, p0);
        assert!(bonus > 0.0, "Should detect a bridge-like pattern");
    }

    #[test]
    fn test_sides_after_placement_single_piece_on_corner() {
        let game = GameY::new(5);
        let sides = HardBot::sides_after_placement(&Coordinates::new(4, 0, 0), &game, PlayerId::new(0));
        assert_eq!(sides, 2, "Corner touches 2 sides");
    }

    #[test]
    fn test_sides_after_placement_merges_chains() {
        let mut game = GameY::new(5);
        let p0 = PlayerId::new(0);
        let p1 = PlayerId::new(1);

        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(0, 2, 2) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(4, 0, 0) }).unwrap();
        game.add_move(Movement::Placement { player: p0, coords: Coordinates::new(2, 0, 2) }).unwrap();
        game.add_move(Movement::Placement { player: p1, coords: Coordinates::new(0, 4, 0) }).unwrap();

        let sides = HardBot::sides_after_placement(&Coordinates::new(1, 1, 2), &game, p0);
        assert!(sides >= 2, "Merging side-A and side-B chains should give ≥ 2 sides");
    }
}