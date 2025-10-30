# Hexagonal Board Game: Player Seating Selection

This document outlines the design for the player seating selection phase in a hexagonal board game. This pre-game phase allows players to choose their positions around the hexagonal game board before gameplay begins.

---

## Overview

### Current State

The current game implementation assigns edges of the hexagonal board to players automatically, without player input. This bypasses an important game rule where players actively choose their positions.

### Desired State

Players should be able to select their seating positions around the hexagonal board through an interactive UI before the game begins. The selection process follows these rules:

1. Player order is randomized at the start
2. Players take turns (in randomized order) choosing an available edge
3. Each player selects one edge of the hexagon as their "home edge"
4. After all positions are chosen, gameplay begins with the first player
5. Subsequent gameplay follows clockwise order around the hexagon (not the randomized selection order)

---

## User Experience Flow

### Phase 1: Seating Selection

#### Step 1: Player Order Announcement
- **Display:** Show all players with their assigned selection order numbers (1, 2, 3, etc.)
- **Visual:** Each player has a distinct color assigned for the entire game
- **Message:** "Player order has been determined. [Player Name] will choose first."

#### Step 2: Edge Selection Loop
For each player in randomized order:

1. **Current Player Indication**
   - Highlight the current player's name and color
   - Display message: "[Player Name]'s turn to choose a position"
   - Show remaining available edges

2. **Interactive Edge Display**
   - All available (unchosen) edges display a circular button
   - Button contains the current player's number in their assigned color
   - Button is rotated to be upright when viewed from outside the hexagon looking toward the center
   - Example: If Player 2 (blue) is choosing, all available edges show a blue circle with "2" inside, properly oriented

3. **Selection Action**
   - Player clicks/taps their preferred edge
   - The edge immediately assigns to that player
   - The edge is colored/highlighted in the player's color
   - The selection button disappears from that edge

4. **Next Player**
   - Proceed to the next player in the randomized order
   - Repeat until all players have selected positions

#### Step 3: Seating Confirmation
- **Display:** Show the complete hexagonal board with all player positions assigned
- **Visual:** Each edge clearly marked with the player's color and name/icon
- **Clockwise Order Indicator:** Overlay showing the gameplay turn order (clockwise from first player)
- **Message:** "All positions selected. [First Player Name] will start the game."
- **Action:** Brief pause (2-3 seconds) or "Start Game" button

### Phase 2: Transition to Gameplay
- The board remains visible with all player positions maintained
- Game state transitions from "SEATING_SELECTION" to "IN_PROGRESS"
- The first player (from randomized order) takes their turn
- Subsequent turns follow clockwise order around the hexagon

---

## Visual Design Specifications

### Hexagonal Board Layout

```
         Edge 0 (Top)
        /          \
  Edge 5           Edge 1
      |              |
  Edge 4           Edge 2
        \          /
         Edge 3 (Bottom)
```

### Edge Selection Buttons

**Appearance:**
- Shape: Circle with diameter proportional to edge length (e.g., 20% of edge length)
- Position: Centered on each edge
- Content: Player selection number (1, 2, 3, etc.)
- Color: Current player's assigned color
- Rotation: Upright when viewed from that edge's perspective

**Rotation Calculations:**
- Edge 0 (Top): 0° rotation
- Edge 1 (Top-Right): 60° rotation
- Edge 2 (Bottom-Right): 120° rotation
- Edge 3 (Bottom): 180° rotation
- Edge 4 (Bottom-Left): 240° rotation
- Edge 5 (Top-Left): 300° rotation

**States:**
- **Available:** Full opacity, animated hover effect, clickable
- **Selected:** Button disappears, edge filled with player color
- **Not Current Player:** Dimmed/disabled appearance

### Player Color Palette

Recommended distinct colors for 2-6 players:
1. Red (#E74C3C)
2. Blue (#3498DB)
3. Green (#2ECC71)
4. Yellow (#F1C40F)
5. Purple (#9B59B6)
6. Orange (#E67E22)

### Responsive Considerations

**Desktop:**
- Hexagon sized to fit viewport with margins
- Hover states for edge selection buttons
- Cursor changes to pointer over selectable edges

**Mobile/Tablet:**
- Touch-optimized button sizes (minimum 44x44pt)
- Larger selection buttons relative to edge size
- Haptic feedback on selection (if available)

---

## Game State Management

### State Transitions

```
INITIALIZING
    ↓
RANDOMIZING_ORDER
    ↓
SEATING_SELECTION
    ↓
SEATING_COMPLETE
    ↓
IN_PROGRESS
```

### State: RANDOMIZING_ORDER

**Purpose:** Determine the order in which players will select their positions

**Data:**
```typescript
{
  state: 'RANDOMIZING_ORDER',
  players: Player[],
  selectionOrder: string[] // player IDs in randomized order
}
```

**Duration:** Brief (animation/display for user acknowledgment)

### State: SEATING_SELECTION

**Purpose:** Allow each player to choose their edge position

**Data:**
```typescript
{
  state: 'SEATING_SELECTION',
  players: Player[],
  selectionOrder: string[], // player IDs
  currentPlayerIndex: number, // index into selectionOrder
  edgeAssignments: {
    [edgeIndex: number]: string | null // player ID or null
  },
  availableEdges: number[] // array of edge indices
}
```

**Actions:**
- `selectEdge(playerId: string, edgeIndex: number)`
- `advanceToNextPlayer()`

**Validations:**
- Only current player can select
- Only available edges can be selected
- Each player selects exactly once

### State: SEATING_COMPLETE

**Purpose:** Brief confirmation state before gameplay begins

**Data:**
```typescript
{
  state: 'SEATING_COMPLETE',
  players: Player[],
  edgeAssignments: { [edgeIndex: number]: string },
  gameplayOrder: string[], // player IDs in clockwise order from first player
  firstPlayerId: string // the player who selected first
}
```

**Duration:** 2-3 seconds or user-initiated

### State: IN_PROGRESS

**Purpose:** Active gameplay state

**Data:**
```typescript
{
  state: 'IN_PROGRESS',
  players: Player[],
  edgeAssignments: { [edgeIndex: number]: string },
  gameplayOrder: string[],
  currentPlayerIndex: number, // index into gameplayOrder
  // ... additional game state
}
```

---

## Implementation Details

### Component Architecture

#### Components Hierarchy

```
GameContainer
├── SeatingSelectionPhase
│   ├── PlayerOrderDisplay
│   ├── HexagonalBoard
│   │   ├── HexagonEdge (x6)
│   │   │   ├── EdgeSelectionButton
│   │   │   └── PlayerAssignment
│   │   └── CenterInfo
│   └── StatusMessage
└── GameplayPhase
    └── ...
```

#### Key Components

**SeatingSelectionPhase**
- Manages the seating selection flow
- Tracks current player and available edges
- Handles edge selection logic
- Transitions to gameplay when complete

**HexagonalBoard**
- Renders the hexagonal board structure
- Positions edge components correctly
- Handles coordinate transformations

**HexagonEdge**
- Represents one edge of the hexagon
- Conditionally renders EdgeSelectionButton or PlayerAssignment
- Applies proper rotation for orientation

**EdgeSelectionButton**
- Interactive button for edge selection
- Displays current player number and color
- Handles click/tap events
- Animated hover/active states

**PlayerOrderDisplay**
- Shows all players with their selection order
- Highlights current player
- Displays player colors

### Data Models

#### Player
```typescript
interface Player {
  id: string;
  name: string;
  color: string; // hex color code
  selectionOrder?: number; // 1-based order for seating selection
  edgeIndex?: number; // 0-5, assigned during seating
  gameplayOrder?: number; // 1-based order for gameplay (clockwise)
}
```

#### GameState
```typescript
type GamePhase = 
  | 'INITIALIZING'
  | 'RANDOMIZING_ORDER'
  | 'SEATING_SELECTION'
  | 'SEATING_COMPLETE'
  | 'IN_PROGRESS'
  | 'COMPLETED';

interface GameState {
  phase: GamePhase;
  players: Player[];
  selectionOrder?: string[]; // player IDs
  currentPlayerIndex?: number;
  edgeAssignments: Map<number, string>; // edge index -> player ID
  gameplayOrder?: string[]; // player IDs in clockwise order
  firstPlayerId?: string;
  // ... additional game-specific state
}
```

#### Edge
```typescript
interface Edge {
  index: number; // 0-5
  assignedPlayerId: string | null;
  rotation: number; // degrees for button orientation
  position: { x: number; y: number }; // center position
}
```

### Key Algorithms

#### Player Order Randomization

```typescript
function randomizePlayerOrder(players: Player[]): string[] {
  const shuffled = [...players];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map(p => p.id);
}
```

#### Clockwise Gameplay Order Calculation

Given the first player's edge index and all edge assignments:

```typescript
function calculateGameplayOrder(
  firstPlayerId: string,
  edgeAssignments: Map<number, string>
): string[] {
  // Find first player's edge
  let startEdge = -1;
  for (const [edge, playerId] of edgeAssignments) {
    if (playerId === firstPlayerId) {
      startEdge = edge;
      break;
    }
  }
  
  // Build clockwise order starting from first player
  const order: string[] = [];
  for (let i = 0; i < edgeAssignments.size; i++) {
    const edgeIndex = (startEdge + i) % 6;
    const playerId = edgeAssignments.get(edgeIndex);
    if (playerId) {
      order.push(playerId);
    }
  }
  
  return order;
}
```

#### Edge Selection Validation

```typescript
function validateEdgeSelection(
  gameState: GameState,
  playerId: string,
  edgeIndex: number
): { valid: boolean; error?: string } {
  // Check phase
  if (gameState.phase !== 'SEATING_SELECTION') {
    return { valid: false, error: 'Not in seating selection phase' };
  }
  
  // Check current player
  const currentPlayerId = gameState.selectionOrder[gameState.currentPlayerIndex];
  if (playerId !== currentPlayerId) {
    return { valid: false, error: 'Not your turn to select' };
  }
  
  // Check edge availability
  if (gameState.edgeAssignments.has(edgeIndex)) {
    return { valid: false, error: 'Edge already selected' };
  }
  
  // Check valid edge index
  if (edgeIndex < 0 || edgeIndex > 5) {
    return { valid: false, error: 'Invalid edge index' };
  }
  
  return { valid: true };
}
```

### Event Flow

#### Edge Selection Event

```typescript
async function handleEdgeSelection(
  playerId: string,
  edgeIndex: number
): Promise<void> {
  // 1. Validate selection
  const validation = validateEdgeSelection(gameState, playerId, edgeIndex);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }
  
  // 2. Update state
  gameState.edgeAssignments.set(edgeIndex, playerId);
  
  // 3. Update UI (animation)
  await animateEdgeAssignment(edgeIndex, playerId);
  
  // 4. Check if selection complete
  if (gameState.edgeAssignments.size === gameState.players.length) {
    // All players selected
    await transitionToSeatingComplete();
  } else {
    // Next player
    gameState.currentPlayerIndex++;
    updateCurrentPlayerDisplay();
  }
}
```

#### Transition to Gameplay

```typescript
async function transitionToSeatingComplete(): Promise<void> {
  // 1. Update phase
  gameState.phase = 'SEATING_COMPLETE';
  
  // 2. Calculate gameplay order
  gameState.gameplayOrder = calculateGameplayOrder(
    gameState.firstPlayerId,
    gameState.edgeAssignments
  );
  
  // 3. Update player objects
  gameState.players.forEach(player => {
    for (const [edge, playerId] of gameState.edgeAssignments) {
      if (playerId === player.id) {
        player.edgeIndex = edge;
        break;
      }
    }
    player.gameplayOrder = gameState.gameplayOrder.indexOf(player.id) + 1;
  });
  
  // 4. Show confirmation
  showSeatingConfirmation();
  
  // 5. Wait for user acknowledgment or timeout
  await delay(3000); // or wait for button click
  
  // 6. Start game
  startGameplay();
}

function startGameplay(): void {
  gameState.phase = 'IN_PROGRESS';
  gameState.currentPlayerIndex = 0; // First player in gameplay order
  // Initialize game-specific state
  // ...
}
```

---

## Technical Considerations

### Rendering Performance

**Optimization Strategies:**
- Use CSS transforms for rotation (GPU-accelerated)
- Minimize re-renders during selection (memoization)
- Batch state updates
- Pre-calculate edge positions and rotations

### Accessibility

**Requirements:**
- Keyboard navigation support (Tab, Enter, Space)
- ARIA labels for all interactive elements
- Screen reader announcements for state changes
- High contrast mode support
- Focus indicators on selectable edges
- Alternative text for color-coded information

**Example ARIA:**
```html
<button
  aria-label="Select position at top edge"
  aria-describedby="current-player-info"
  role="button"
  tabindex="0"
>
  <span aria-hidden="true">2</span>
</button>
```

### Network Synchronization

**For Multiplayer Implementation:**

**State Synchronization:**
- All clients must receive player order randomization result
- Edge selections broadcast to all clients
- State transitions synchronized
- Conflict resolution for simultaneous selections (server authoritative)

**Protocol:**
```typescript
// Server -> All Clients
{
  type: 'SELECTION_ORDER_DETERMINED',
  selectionOrder: string[],
  firstPlayerId: string
}

// Current Client -> Server
{
  type: 'SELECT_EDGE',
  playerId: string,
  edgeIndex: number
}

// Server -> All Clients
{
  type: 'EDGE_SELECTED',
  playerId: string,
  edgeIndex: number,
  nextPlayerId: string | null
}

// Server -> All Clients
{
  type: 'SEATING_COMPLETE',
  edgeAssignments: { [edge: number]: string },
  gameplayOrder: string[]
}
```

### Animation and Transitions

**Key Animations:**
1. **Player Order Reveal:** Fade in with stagger effect
2. **Edge Selection:** Scale and color transition (200ms)
3. **Current Player Change:** Fade out old, fade in new indicator (300ms)
4. **Seating Complete:** Zoom out to show full board (500ms)

**Timing:**
- Selection feedback: Instant (<50ms)
- Animation duration: 200-500ms per animation
- State transitions: 300-500ms
- Confirmation display: 2-3 seconds

### Error Handling

**Potential Errors:**
- Invalid edge selection (already taken)
- Selection out of turn
- Network timeout
- State desynchronization

**Recovery Strategies:**
- Display clear error messages
- Allow retry without state corruption
- Rollback failed selections
- Request state refresh from server
- Timeout and auto-advance for inactive players (optional)

### Testing Considerations

**Unit Tests:**
- Player order randomization
- Gameplay order calculation
- Edge selection validation
- State transitions

**Integration Tests:**
- Complete seating selection flow
- Edge case: all edges selected
- Edge case: single player (if applicable)
- Transition to gameplay

**UI Tests:**
- Button rendering at correct positions
- Correct rotation for each edge
- Color application
- Accessibility compliance

**Example Test:**
```typescript
describe('Seating Selection', () => {
  it('should calculate correct clockwise gameplay order', () => {
    const edgeAssignments = new Map([
      [0, 'player1'], // top
      [2, 'player2'], // bottom-right
      [4, 'player3'], // bottom-left
    ]);
    
    const order = calculateGameplayOrder('player1', edgeAssignments);
    
    expect(order).toEqual(['player1', 'player2', 'player3']);
  });
  
  it('should prevent selecting already-taken edge', () => {
    const gameState = {
      phase: 'SEATING_SELECTION',
      edgeAssignments: new Map([[0, 'player1']]),
      currentPlayerIndex: 1,
      selectionOrder: ['player1', 'player2'],
    };
    
    const result = validateEdgeSelection(gameState, 'player2', 0);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already selected');
  });
});
```

---

## Future Enhancements

### Optional Features

1. **Edge Preview:**
   - Hover over edge to see view from that perspective
   - Show strategic information about edge position

2. **Time Limits:**
   - Optional timer for each selection (30-60 seconds)
   - Auto-random selection if time expires

3. **Rematch Quick Start:**
   - Option to keep same positions for next game
   - Option to reverse seating order
   - Option to rotate positions clockwise

4. **Spectator Mode:**
   - Non-playing observers can watch selection
   - Hide selection during tournament play (prevent signaling)

5. **Undo/Confirm:**
   - Two-step selection: click to highlight, confirm button
   - Reduces accidental selections

6. **Historical Data:**
   - Track position win rates
   - Show statistics for each edge
   - "Recommended" positions based on player skill

7. **Animations:**
   - Spinning wheel for player order determination
   - Animated player avatars moving to positions
   - Celebration effects on selection

---

## Summary

The seating selection phase adds an important strategic element to the game by allowing players to choose their positions around the hexagonal board. This design provides:

- **Clear UX:** Intuitive visual representation of available choices
- **Fair Process:** Randomized selection order prevents bias
- **Strategic Depth:** Position choice affects gameplay dynamics
- **Proper Turn Order:** Gameplay proceeds clockwise, independent of selection order
- **Smooth Transition:** Seamless flow from seating to gameplay

The implementation leverages standard game state management patterns, provides clear visual feedback, and maintains accessibility standards. The design is extensible for future enhancements while maintaining core simplicity for immediate implementation.
