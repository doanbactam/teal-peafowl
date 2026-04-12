# Architecture

## Mục tiêu

Project này nên tiến về một kiến trúc 3 tầng rõ ràng:

1. `Game` là presentation shell: render, input, camera, HUD, DOM, post-processing.
2. `WorldSimulation` là simulation shell: state, selector read-model, command routing, fixed tick order.
3. Mỗi domain layer được chia tiếp thành các subsystem nhỏ, mỗi subsystem sở hữu một pressure hoặc một cụm hành vi rõ ràng.

Mục tiêu không phải viết lại toàn bộ game thành ECS. Mục tiêu là giảm quyền sở hữu của `src/game.js`, làm logic dễ mở rộng, và tránh việc mỗi layer mới lại phình thành một god object khác.

Sơ đồ tham chiếu hiện tại vẫn là [godbox_game_architecture.svg](./godbox_game_architecture.svg).

## Trạng thái hiện tại

Entry point chính vẫn là [`src/game.js`](./src/game.js). File này hiện còn giữ nhiều trách nhiệm presentation và một phần bridge logic:

- scene, camera, lighting, atmosphere
- HUD và panel DOM
- input chuột, bàn phím, touch
- bootstrap settlement ban đầu
- vòng lặp frame

World logic hiện đã chạy qua [`src/simulation/worldSimulation.js`](./src/simulation/worldSimulation.js), nơi:

- tạo `WorldState`
- đồng bộ state giữa game shell và simulation shell
- cung cấp read access qua `select(...)`
- cung cấp write access qua `dispatch(...)`
- chạy tick theo thứ tự cố định
- route storyteller event về layer phù hợp

Các layer đang có:

- [`src/simulation/layers/godLayer.js`](./src/simulation/layers/godLayer.js)
- [`src/simulation/layers/worldLayer.js`](./src/simulation/layers/worldLayer.js)
- [`src/simulation/layers/raceLayer.js`](./src/simulation/layers/raceLayer.js)
- [`src/simulation/layers/civilizationLayer.js`](./src/simulation/layers/civilizationLayer.js)
- [`src/simulation/layers/conflictLayer.js`](./src/simulation/layers/conflictLayer.js)

Đây là nền tốt cho bước tiếp theo: phát triển tầng hệ thống con bên dưới mỗi layer.

## Luồng chạy hiện tại

Mỗi frame:

1. `Game.animate()` gọi `simulation.update(rawDt)`.
2. `WorldSimulation` sync dữ liệu hiện có từ `Game` vào `WorldState`.
3. Các layer chạy theo tick order cố định.
4. `EventSystem` dùng storyteller state để chọn event.
5. Event được route lại qua `simulation.dispatch(...)`.
6. Simulation sync kết quả về `Game` để render và cập nhật HUD.

Tick order hiện tại:

`God -> World -> Race -> Civilization -> Conflict -> Storyteller finalize`

Thứ tự này nên giữ deterministic. Khi tách subsystem, subsystem chỉ được chạy bên trong layer của nó, không tự tạo loop riêng.

## Vấn đề hiện tại

Kiến trúc hiện tại đã tách được layer, nhưng mỗi layer vẫn còn là một file đa trách nhiệm:

- `worldLayer` vừa time/season, vừa hazard, vừa disaster event.
- `civilizationLayer` vừa economy tick, vừa social climate, vừa faith gain, vừa event consequence.
- `conflictLayer` vừa diplomacy, vừa raid spawning.
- `events.js` vẫn còn mang knowledge nghiệp vụ storyteller khá dày.

Nếu tiếp tục thêm gameplay depth theo `GAMEPLAY_PLAN.md`, các file layer sẽ nhanh chóng phình ra và mất lợi ích của bước refactor hiện tại.

## Tầng hệ thống con

### Vai trò

Layer nên trở thành coordinator mỏng. Logic thật nên đi vào subsystem.

Một subsystem là một đơn vị nhỏ có 4 đặc điểm:

- sở hữu một pressure hoặc hành vi rõ ràng
- đọc qua `state` và `selectors`
- ghi vào state của domain mình hoặc phát command
- không chạm trực tiếp vào DOM, HUD, camera, hoặc input

Nói ngắn gọn:

`Game` lo cảm giác trình bày, `WorldSimulation` lo orchestration, `Layer` lo ownership, `Subsystem` lo luật chơi cụ thể.

### Hợp đồng chung của subsystem

Mỗi subsystem mới nên đi theo shape này:

```js
export class ExampleSubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  update(dt) {}

  handleCommand(command) {
    return false;
  }
}
```

Layer chứa subsystem sẽ:

- gọi `update(dt)` theo thứ tự nội bộ cố định
- thử `handleCommand(command)` theo ownership
- là nơi duy nhất biết danh sách subsystem con của mình

Subsystem không nên gọi trực tiếp subsystem ở layer khác. Nếu cần cross-domain mutation, nó nên phát command và để layer sở hữu xử lý.

## Bản đồ subsystem đề xuất

### 1. God Layer

File hiện tại: [`src/simulation/layers/godLayer.js`](./src/simulation/layers/godLayer.js)

God layer nên giữ vai trò điều phối divine intent. Các subsystem nên tách như sau:

#### `interventionSubsystem`

Sở hữu:

- `god.castPower`
- `god.intervention`
- tracking power usage thành game consequences

Không sở hữu:

- diplomacy
- colony economy
- world hazard resolution

#### `divineClimateSubsystem`

Sở hữu:

- chuyển power usage thành `trust`, `fear`, `strain`
- domain alignment và phản ứng xã hội
- divine aftereffects cấp xã hội

Hiện logic này đang nằm lẫn trong `registerDivineIntervention(...)`.

#### `blessingSubsystem`

Sở hữu:

- blessing acquisition
- blessing notification
- divine unlock hoặc temporary status

### 2. World Layer

File hiện tại: [`src/simulation/layers/worldLayer.js`](./src/simulation/layers/worldLayer.js)

World layer nên sở hữu mọi thay đổi mang tính môi trường và thời gian.

#### `clockSeasonSubsystem`

Sở hữu:

- `gameTime`, `day`, `season`
- seasonal effects
- day/night progression

Hiện đang split giữa `Game.updateDayNight(...)` và `worldLayer.updateSeason(...)`. Về lâu dài, state authority nên tập trung hơn ở simulation.

#### `hazardSubsystem`

Sở hữu:

- fire spread
- burning tile pressure
- freeze damage
- environmental stress kéo dài

#### `disasterSubsystem`

Sở hữu:

- wildfire
- storm
- earthquake
- meteor shower
- volcanic eruption

Mục tiêu là gom tất cả world-scale event consequence vào một chỗ thay vì rải ở storyteller.

#### `recoverySubsystem`

Nên thêm khi gameplay sâu hơn:

- rain dập lửa
- aftermath của thiên tai
- world recovery timer

### 3. Race Layer

File hiện tại: [`src/simulation/layers/raceLayer.js`](./src/simulation/layers/raceLayer.js)

Race layer hiện còn mỏng, nhưng đây là chỗ giữ identity cấp loài.

#### `spawnSubsystem`

Sở hữu:

- `race.spawnHumans`
- `race.spawnAnimals`
- spawn rules theo tile walkability

#### `raceIdentitySubsystem`

Nên thêm khi race thật sự khác nhau:

- species defaults
- racial modifiers
- spawn template
- race-specific colony tendencies

#### `migrationSubsystem`

Nên thêm sau:

- wanderers
- refugee arrivals
- migration pressure

### 4. Civilization Layer

File hiện tại: [`src/simulation/layers/civilizationLayer.js`](./src/simulation/layers/civilizationLayer.js)

Đây là layer quan trọng nhất của project vì gameplay depth chủ yếu nằm ở đây. Nó nên được chia subsystem trước tiên.

#### `economySubsystem`

Sở hữu:

- resource production/consumption
- building tick integration
- economy-facing command như `civ.adjustResources`

#### `housingRestSubsystem`

Sở hữu:

- housing pressure
- rest recovery
- overcrowding effects
- liên kết `population -> beds -> fatigue`

Đây là một trong những pressure loops đầu tiên nên tách riêng.

#### `moodStabilitySubsystem`

Sở hữu:

- mood aggregation
- colony stability
- mental break pressure
- disease / fear / strain tác động lên social stability

Hiện `socialClimate` đã có nền, nhưng vẫn chưa là subsystem độc lập.

#### `faithEconomySubsystem`

Sở hữu:

- faith gain rate
- temple contribution
- mood/stability/climate multipliers
- divine trust feedback vào economy

Logic selector hiện đã có trong [`src/simulation/selectors.js`](./src/simulation/selectors.js), nhưng mutation và state ownership nên dần rõ hơn ở subsystem này.

#### `techProgressionSubsystem`

Sở hữu:

- tech tick
- unlock pacing
- domain/race synergy với tech

#### `eventAftermathSubsystem`

Sở hữu:

- plague scar
- famine scar
- eclipse fear
- refugee instability

Đây là lớp cần có để biến event từ hit-and-run thành recoverable consequence.

### 5. Conflict Layer

File hiện tại: [`src/simulation/layers/conflictLayer.js`](./src/simulation/layers/conflictLayer.js)

Conflict layer nên sở hữu inter-faction hostility và pressure chiến tranh.

#### `diplomacySubsystem`

Sở hữu:

- quan hệ war / peace
- diplomacy maps
- transition state giữa neutral, hostile, war, peace

#### `raidSubsystem`

Sở hữu:

- bandit raid
- raid party spawn
- raid scaling theo day / wealth / instability

#### `warPressureSubsystem`

Nên thêm sau:

- long-term threat buildup
- border hostility
- retaliation logic

#### `peaceResolutionSubsystem`

Nên thêm sau:

- ceasefire
- post-war cooldown
- peace treaty consequences

## Storyteller không phải subsystem mutation

[`src/events.js`](./src/events.js) nên tiếp tục là storyteller/orchestrator, không phải nơi sở hữu world mutation.

Storyteller nên chỉ làm 3 việc:

1. đọc state qua `simulation.select('storytellerState', ...)`
2. chọn event theo pressure và context
3. dispatch command hoặc `story.runEvent`

Storyteller không nên:

- tự trừ tài nguyên
- tự spawn unit
- tự set plague / madness / fire trực tiếp

Refactor hiện tại đã đi đúng hướng vì `EventSystem.update(...)` đã route event qua `simulation.dispatch(...)`. Phần còn lại là giảm bớt logic `execute(game)` legacy trong danh sách event.

## Read / write boundary

Read side hiện nên tiếp tục đi qua:

- [`src/simulation/selectors.js`](./src/simulation/selectors.js)

Các selector quan trọng đang có:

- `getSettlementMetrics`
- `getSocialMetrics`
- `getFaithEconomy`
- `getColonyDiagnostics`
- `buildStorytellerState`

Write side nên tiếp tục đi qua:

- `simulation.dispatch(command)`

Command examples hiện có:

- `god.castPower`
- `god.intervention`
- `world.wildfire`
- `race.spawnHumans`
- `civ.build`
- `civ.famine`
- `conflict.declareWar`
- `story.runEvent`

Rule cần giữ chặt:

`UI/HUD/EventSystem -> selector read -> command dispatch -> owning layer -> owning subsystem`

## Mở rộng `WorldState`

[`src/simulation/state.js`](./src/simulation/state.js) hiện vẫn còn mỏng. Điều đó ổn ở giai đoạn bridge, nhưng để subsystem thật sự có chỗ đứng, state nên được nới dần theo ownership chứ không nhét thêm random fields vào `Game`.

### State hiện có

- `clock`
- `world`
- `factions.player`
- `story`
- `pendingCommands`

### State nên thêm dần

#### `state.world.hazards`

Ví dụ:

- burning tile count
- active disaster markers
- recovery timers

#### `state.factions.player.pressures`

Ví dụ:

- food pressure
- shelter pressure
- stability pressure

#### `state.factions.player.faith`

Ví dụ:

- current rate
- recent modifiers
- alignment bonus

#### `state.factions.player.aftermath`

Ví dụ:

- plague fear
- famine scar
- divine awe
- refugee strain

#### `state.conflict`

Ví dụ:

- diplomacy map
- raid cooldowns
- war pressure

#### `state.story`

Ngoài `eventHistory`, nên có:

- active arcs
- pending aftermath
- storyteller cooldown tags

Nguyên tắc là: state mới được thêm vì subsystem ownership rõ hơn, không phải để mirror toàn bộ `Game`.

## Cấu trúc thư mục nên tiến tới

Không cần move file lớn ngay. Bước nhỏ hợp lý là giữ layer file làm coordinator, rồi extract subsystem vào thư mục mới:

```text
src/simulation/
  state.js
  selectors.js
  worldSimulation.js
  layers/
    godLayer.js
    worldLayer.js
    raceLayer.js
    civilizationLayer.js
    conflictLayer.js
  subsystems/
    god/
      interventionSubsystem.js
      divineClimateSubsystem.js
      blessingSubsystem.js
    world/
      clockSeasonSubsystem.js
      hazardSubsystem.js
      disasterSubsystem.js
    race/
      spawnSubsystem.js
      raceIdentitySubsystem.js
    civilization/
      economySubsystem.js
      housingRestSubsystem.js
      moodStabilitySubsystem.js
      faithEconomySubsystem.js
      techProgressionSubsystem.js
      eventAftermathSubsystem.js
    conflict/
      diplomacySubsystem.js
      raidSubsystem.js
      warPressureSubsystem.js
```

Mục tiêu của cấu trúc này là incremental extraction, không phải refactor hàng loạt.

## Lộ trình triển khai đề xuất

### Bước 1

Tách `civilizationLayer` trước, vì đây là nơi sẽ phình nhanh nhất.

Ưu tiên:

- `economySubsystem`
- `moodStabilitySubsystem`
- `faithEconomySubsystem`

### Bước 2

Tách `worldLayer` thành:

- `clockSeasonSubsystem`
- `disasterSubsystem`

Mục tiêu là gom ownership thời gian, mùa, thiên tai về đúng chỗ.

### Bước 3

Đưa `event aftermath` vào simulation state thay vì chỉ effect trực tiếp tức thời.

Mục tiêu:

- event để lại scar
- scar đọc được ở HUD
- storyteller thấy được scar để chọn event tiếp theo

### Bước 4

Giảm vai trò facade legacy trong `Game` khi selector và command đủ rõ.

Ví dụ, các method như `getPressureLevel`, `getPressureLabel`, `getOverviewLabel` nên dần nằm về selector/read model nếu chúng chỉ phục vụ simulation-facing UI data.

## Quy tắc khi thêm feature mới

1. Nếu là render, HUD, camera, input: để ở `Game`.
2. Nếu là luật chơi: đưa vào layer sở hữu.
3. Nếu luật chơi đó đủ lớn hoặc có loop riêng: tách thành subsystem.
4. Nếu UI cần đọc: thêm selector.
5. Nếu feature gây mutation: thêm command hoặc route qua command đang có.
6. Không cho `events.js`, UI code, hoặc HUD mutate world trực tiếp.

## Non-goals

Kiến trúc này không nhắm tới:

- full ECS rewrite
- worker-thread simulation
- strict purity tuyệt đối khỏi legacy manager
- đổi toàn bộ thư mục chỉ để "đẹp kiến trúc"

Mục tiêu gần là:

- dễ thêm gameplay depth theo pressure loops
- giữ tick deterministic
- giảm coupling giữa storyteller, UI, và mutation
- làm mỗi domain layer nhỏ lại nhờ subsystem ownership rõ ràng

## Quyết định kiến trúc hiện tại

### Quyết định

Chọn layered simulation shell với subsystem tier bên dưới, thay vì nhảy thẳng sang ECS hoặc modular rewrite lớn.

### Lý do

- repo hiện còn nhỏ, một người làm chính, logic đang gắn chặt với manager hiện có
- gameplay đang cần tiến nhanh về chiều sâu hơn là đổi framework kiến trúc
- subsystem extraction cho phép refactor theo từng pressure loop mà không phá toàn bộ game loop

### Hệ quả

Điều này cho phép:

- refactor từng layer nhỏ và đảo ngược được
- thêm depth cho colony simulation mà không phình `Game`
- giữ hành vi hiện có trong khi cải thiện ownership

Điều này cũng chấp nhận rằng:

- một phần state vẫn còn bridge qua legacy manager
- `Game` vẫn còn nhiều facade methods trong ngắn hạn
- storyteller còn một ít logic legacy cho tới khi command routing hoàn tất
