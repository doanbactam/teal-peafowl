# Progress

## Original Prompt
Nâng cấp hệ thống địa hình

## Current Goal
Làm bản đồ có thủy văn rõ hơn bằng cách thêm sông chảy từ vùng cao ra biển, để địa hình vừa nhìn giàu nhịp hơn vừa tác động thật lên moisture và fertility.

## Last Verified Behavior
- Terrain đang được sinh từ `src/terrain.js` với height, moisture, temperature, biome.
- Render terrain/minimap đọc trực tiếp từ biome map.
- `tile.fertility` đã có nhưng farm chưa tận dụng tốt giá trị này.

## Known Debt
- Chưa có kiểm chứng browser sau khi thêm sông.
- Tooltip tile hiện chỉ hiện biome/height/tree/fire, chưa nói gì về thủy văn.

## Next Check
Build game, mở trong Playwright, xác nhận minimap và scene đều nhìn thấy dải sông rõ ràng và tile inspect hiển thị đúng trạng thái sông.
