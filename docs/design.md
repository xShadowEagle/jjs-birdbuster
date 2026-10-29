# Design

## Pitch
A sidescrolling autorunner: the bird runs at one constant speed, and the player only times moves. Each level is an endless track of hand-made blocks of its biome, cleared by collecting enough of its item; each biome teaches one new move and one new obstacle (docs/levels.md).

## Feel
- Always running, never slowing: timing is the whole skill.
- Big on-screen buttons, one thumb per side; a jump-only level makes the whole screen the jump button.
- Forgiving jumps: coyote time, jump buffering, variable jump height, hold to glide.
- One-way platforms: jump up through them, never get stuck against one.
- Level 1 can't be failed: no pits, no enemies. It's for learning the rhythm.
- Where there's danger, 3 hearts: a hit or a fall costs one, with a short blink; losing the last restarts the stage. No high scores: a clear shows its time.

## Moves
| Move                        | Input                        | Unlocked         | Solves                                              |
|-----------------------------|------------------------------|------------------|-----------------------------------------------------|
| Run                         | automatic, constant          | L1               | -                                                   |
| Jump                        | jump                         | L1               | reaching feathers, platforms                        |
| Double jump                 | jump again in the air        | L1               | high feathers, a mistimed jump                      |
| Glide                       | hold jump in the air         | L1               | feather lines, long drops                           |
| Slide                       | slide (hold to stay low)     | L2               | the Rogue's lunge and knife, low branches           |
| Peck                        | attack                       | L3               | the Kaktu                                           |
| Cleave (the peck, upgraded) | attack                       | L4               | the Archid's thread (out of the peck's reach), webs |
| Sword dash                  | dash (2 s cooldown)          | L5               | breakable walls, long gaps, the blinking Fae        |
| Rainbow cleave and dash     | attack or dash while charged | Lime's last part | Lime, whom nothing else hurts by then               |

Each move has one obstacle only it solves, so the levels teach by layout, not text.

## Tone
Light and cheeky. Flo (the boyfriend) is cheerfully useless; the villains are three rival birds who are sure his bald head is an egg.
