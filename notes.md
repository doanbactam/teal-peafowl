# Notes: Current Gameplay Findings

## Product Direction
- `AGENTS.md` nhấn mạnh: đơn giản trước, fluid state transitions, thay đổi nhỏ nhưng leverage cao.
- Nguồn cảm hứng: Nebula Civilization, WorldBox, RimWorld.

## Current Systems

### World and Simulation
- Terrain, biome, water, weather-like atmosphere, day/night cycle đã tồn tại.
- Minimap, hover tile, camera controls đã đủ cho loop sandbox cơ bản.

### Colony Simulation
- Humans có profession, traits, mood, rest, hunger, mental break, inspiration.
- Có reproduction, building, farming, hunting, combat, sleep/rest states.
- Đây là lõi chiều sâu tốt nhất hiện tại.

### Macro Progression
- Domain selection tạo ra fantasy flavor và passive bonus.
- Tech tree có age progression và resource costs.
- Event system đã có storyteller-like balancing theo prosperity/struggle.

## Gaps That Hurt Depth
- Chưa có loop quyết định rõ giữa "mở rộng", "ổn định", "mạo hiểm".
- Mood, faith, domain, tech chưa gắn chặt thành một vòng nhân quả.
- Events thiên về random hit hơn là phản ứng có thể đọc và chuẩn bị.
- Faction/civilization identity còn mờ, nên các run dễ giống nhau.

## Likely Best Direction
- Dùng một loop trung tâm: phát triển nền văn minh dưới áp lực thiên tai, niềm tin, nội bộ, và lựa chọn thần quyền.
- Đào sâu vào 4 trụ:
  - Settlement pressure
  - Belief and domain
  - Faction identity
  - Storytelling consequences
