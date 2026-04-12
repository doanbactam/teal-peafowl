# Gameplay Depth Plan

## Objective
Tạo một game loop có chiều sâu, nơi người chơi liên tục phải cân bằng giữa:
- mở rộng dân số,
- giữ ổn định xã hội,
- tích lũy faith,
- dùng divine powers đúng lúc,
- và sống sót qua các biến cố leo thang.

Mục tiêu không phải thêm thật nhiều content. Mục tiêu là làm cho mỗi phút chơi đều có quyết định rõ, áp lực rõ, và hậu quả rõ.

## Anchors
- `src/game.js`: tài nguyên, day/night, game speed, domain flow, HUD.
- `src/creatures.js`: hunger, rest, mood, traits, profession, mental break, reproduction.
- `src/events.js`: storyteller pacing và event consequences.
- `src/buildings.js`: economy, housing, production, defensive layer.
- `src/godpowers.js`: can thiệp trực tiếp của người chơi bằng faith.
- `src/technology.js`: nhịp progression và specialization.

## Proposed Change
Thay vì mở rộng ngang, gameplay nên đi theo 5 lớp chiều sâu sau.

## 1. Core Loop
Loop trung tâm nên là:

`Expand -> Strain -> Crisis -> Divine / Economic response -> Social recovery or collapse -> New phase`

Ý nghĩa:
- Tăng dân số luôn là lợi ích ngắn hạn.
- Nhưng dân số cao tạo áp lực food, housing, rest, mood.
- Áp lực kéo theo disease, panic, raid vulnerability, faith instability.
- Người chơi dùng building, tech, domain và god power để cứu hoặc ép colony đi theo một hướng.
- Sau mỗi lần xử lý khủng hoảng, colony phải thay đổi trạng thái, không quay lại y nguyên.

Nếu loop này rõ, game sẽ có chiều sâu mà không cần thêm nhiều loại unit hay biome.

## 2. 10-Minute Gameplay Structure
Game nên rõ nhịp trong 10 phút đầu.

### Phase A: Establishment
Mục tiêu:
Ổn định thức ăn, nhà ở, và faith nền.

Gameplay cần có:
- quyết định xây `house`, `farm`, `storage`, `temple` theo thứ tự ưu tiên,
- áp lực nhẹ từ thiếu food hoặc thiếu chỗ ở,
- domain choice bắt đầu ảnh hưởng cách chơi sớm.

Trạng thái người chơi nên cảm thấy:
- "Tôi đang dựng nền văn minh."

### Phase B: First Stress
Mục tiêu:
Buộc người chơi thấy growth có giá.

Gameplay cần có:
- hunger tăng nhanh hơn nếu population tăng nóng,
- rest/mood bắt đầu tụt nếu thiếu hạ tầng,
- event đầu tiên đọc trạng thái colony để đánh đúng điểm yếu.

Trạng thái người chơi nên cảm thấy:
- "Mình không thể chỉ spam tăng trưởng."

### Phase C: Identity Lock-In
Mục tiêu:
Run bắt đầu có tính cách.

Gameplay cần có:
- faith economy khác nhau theo domain,
- tech choice tạo specialization đầu tiên,
- một khủng hoảng đầu run khiến người chơi chọn cứu bằng phép, bằng kinh tế, hoặc bằng hy sinh.

Trạng thái người chơi nên cảm thấy:
- "Run này đang đi theo một kiểu riêng."

## 3. Main Pressure Axes
Gameplay chỉ sâu khi áp lực đến từ vài trục rõ ràng, không phải từ 20 chỉ số.

### Food Pressure
Vai trò:
Trục ép mở rộng phải trả giá.

Cần có:
- food tiêu hao tăng rõ theo population,
- farm không đủ nếu người chơi không quy hoạch,
- famine không chỉ trừ food mà kéo mood, faith và productivity xuống.

### Shelter Pressure
Vai trò:
Biến house thành chiến lược, không chỉ là cap.

Cần có:
- overcrowding giảm rest recovery,
- thiếu nhà tăng social tension,
- population growth bị chặn hoặc sinh ra bất ổn nếu housing kém.

### Mood Pressure
Vai trò:
Biến simulation từ economic sandbox thành xã hội sống.

Cần có:
- mood là chỉ số tổng hợp dễ đọc,
- mood thấp không chỉ gây mental break cá nhân mà làm giảm tốc độ phục hồi colony,
- mood cao tạo bonus rõ như faster work, higher faith, lower event severity.

### Faith Pressure
Vai trò:
Biến divine powers thành quyết định chiến lược thay vì nút kỹ năng.

Cần có:
- faith tạo ra từ sự ổn định, temple, priest, alignment với domain,
- dùng destructive power quá nhiều làm xã hội sợ hãi hoặc chia rẽ,
- dùng healing/protective power tạo trust nhưng phải có opportunity cost.

## 4. What Makes This Game Feel Different
Game này không nên là bản sao WorldBox hay RimWorld. Điểm riêng nên là:

### God-Hand + Colony Consequences
Người chơi không điều khiển trực tiếp từng dân, nhưng vẫn phải chịu hậu quả xã hội từ cách mình dùng quyền năng.

### Domain-Driven Runs
Mỗi domain là một phong cách chơi hoàn chỉnh, không chỉ là passive buff.

### Macro Story From Small Citizens
Traits, mood, profession, madness, plague, inspiration phải tạo ra chuyện lớn từ các state nhỏ.

## 5. Systems To Deepen First

### A. Mood -> Stability -> Faith
Đây nên là xương sống đầu tiên.

Hiện đã có nền trong `src/creatures.js`, nhưng cần nối lên cấp colony:
- tính `colony stability`,
- stability ảnh hưởng faith gain,
- stability thấp làm event nguy hiểm hơn,
- stability cao mở blessing hoặc migration tích cực.

### B. Population -> Housing -> Rest
Đây là vòng pressure dễ hiểu nhất cho người chơi.

Cần làm rõ:
- house không chỉ tăng cap mà còn phục hồi rest,
- overcrowding gây debuff cụ thể,
- reproduction phụ thuộc vào housing quality và food surplus, không chỉ random gần nhà.

### C. Events -> Recoverable Consequences
Event mạnh không nên chỉ là hit-and-run.

Cần đổi theo hướng:
- event tạo trạng thái kéo dài,
- trạng thái đó có cách xử lý,
- người chơi có thể chuẩn bị trước hoặc phục hồi sau.

Ví dụ:
- plague để lại fear of disease,
- raid để lại grief hoặc militarization,
- miracle tạo zeal nhưng tăng kỳ vọng của dân.

### D. Domain -> Temptation
Mỗi domain cần một "mồi câu" gameplay.

Ví dụ:
- `Fire`: snowball nhanh, faith gain cao khi thắng, nhưng dễ gây unrest và ecological damage.
- `Nature`: cực ổn định, hồi phục tốt, nhưng tốc độ military/industry chậm.
- `Death`: chịu mất mát tốt, có lợi khi colony khổ đau, nhưng risk xã hội cực đoan cao.
- `Light`: giữ trật tự, chống bệnh, faith đều, nhưng trừng phạt nặng nếu người chơi lạm dụng tàn phá.

## 6. Midgame Depth
Midgame không nên chỉ là "nhiều dân hơn, nhiều event hơn". Midgame cần đổi loại câu hỏi người chơi phải trả lời.

### Early Game Question
"Làm sao sống sót và đủ ăn?"

### Midgame Question
"Mình muốn xã hội này trở thành kiểu gì?"

### Midgame Needs
- branch tech theo identity,
- event đọc domain và colony state,
- building specialization,
- social incidents nội bộ,
- enemies/threats buộc người chơi đầu tư thiên về defense, faith, hoặc recovery.

## 7. Failure States
Game nên cho người chơi thua theo chuỗi nguyên nhân rõ ràng.

Fail state tốt:
- food shortage -> mood crash -> mental breaks -> production loss -> raid collapse
- destructive miracles spam -> fear rises -> faith income drops -> colony loses cohesion
- rapid growth -> housing collapse -> disease outbreak -> social panic

Fail state xấu:
- event random rơi xuống rồi chết không hiểu vì sao
- chỉ thiếu một con số tài nguyên rồi mất game

## 8. Run Variety
Để replayable, mỗi run phải khác nhau vì hệ thống, không chỉ random map.

Run variance nên đến từ:
- domain,
- citizen trait distribution,
- early event chain,
- tech specialization,
- cách người chơi tiêu faith.

Không nên phụ thuộc chủ yếu vào:
- thêm nhiều race mới,
- thêm nhiều map gimmick,
- thêm power mới nhưng không đổi decision-making.

## 9. Milestones

### Milestone 1: Make The Colony Readable
Mục tiêu:
Người chơi nhìn HUD và hiểu colony đang chết vì cái gì.

Làm:
- thêm 3 pressure indicators: `Food`, `Shelter`, `Stability`,
- tooltip citizen/building giải thích nguyên nhân chính,
- notification theo kiểu nguyên nhân -> hậu quả.

### Milestone 2: Make Faith Strategic
Mục tiêu:
Faith trở thành tài nguyên khó dùng đúng.

Làm:
- faith gain phụ thuộc mood/stability/domain alignment,
- god powers tạo social aftereffects,
- temple và priest có vai trò rõ.

### Milestone 3: Make Domains Create Real Archetypes
Mục tiêu:
Mỗi domain đổi cách build colony.

Làm:
- domain rules riêng,
- synergy riêng với tech/buildings/events,
- crisis riêng cho từng domain.

### Milestone 4: Make Midgame Tell Stories
Mục tiêu:
Colony có drama nội bộ và biến cố có dư chấn.

Làm:
- social incidents,
- leader/hero emergence,
- event scars/blessings,
- pressure chains thay vì spike rời rạc.

## 10. Verification
Kế hoạch này đi đúng hướng nếu:
- người chơi luôn có 1-2 quyết định khó trong mỗi chu kỳ phát triển,
- thất bại có thể giải thích bằng chuỗi nguyên nhân,
- dùng divine power luôn có tradeoff,
- đổi domain thực sự đổi nhịp chơi,
- người chơi nhớ run bằng câu chuyện, không chỉ bằng số liệu.

## Tradeoffs
Chủ động không ưu tiên:
- thêm nhiều content trang trí,
- diplomacy/faction politics đầy đủ,
- UI settings phức tạp,
- quá nhiều resource mới.

Chiều sâu của game này nên đến từ tương tác giữa `population`, `mood`, `faith`, `domain`, `events`, không phải từ số lượng hệ thống.

## Next Experiment
Nếu bắt đầu triển khai ngay, nên làm theo thứ tự:

1. Khóa loop `food -> shelter -> rest -> mood`.
2. Nối `mood -> colony stability -> faith income`.
3. Cho `events` đọc `stability`, `domain`, `recent god power usage`.
4. Thiết kế lại 4 domain đầu thành 4 archetype run thật khác nhau.
