# Task Plan: Gameplay Depth Plan

## Goal
Nâng cấp gameplay theo hướng chiều sâu: từ kế hoạch sang các thay đổi user-visible trong HUD, áp lực colony, faith economy, và hậu quả xã hội của divine powers.

## Phases
- [x] Phase 1: Plan and setup
- [x] Phase 2: Research current gameplay systems
- [x] Phase 3: Write gameplay depth deliverable
- [x] Phase 4: Add colony pressure HUD
- [x] Phase 5: Connect mood, stability, and faith economy
- [x] Phase 6: Add social consequences for divine intervention
- [x] Phase 7: Review and deliver

## Key Questions
1. Loop chính nào nên trở thành trục của game?
2. Những hệ thống nào đã có đủ nền để đào sâu thay vì thêm tính năng mới?
3. Cần tránh mở rộng phạm vi ở đâu để game không thành một đống cơ chế rời rạc?

## Decisions Made
- Chọn hướng "chiều sâu trước bề rộng": tận dụng hệ thống đã có như mood, traits, events, faith, domain, tech.
- Dùng một file deliverable riêng `GAMEPLAY_PLAN.md` để repo có tài liệu định hướng rõ ràng.
- Giữ kế hoạch theo milestone nhỏ, có tiêu chí kiểm chứng user-visible thay vì danh sách tính năng chung chung.
- Ưu tiên nâng cấp leverage cao trước: giúp người chơi đọc colony dễ hơn rồi mới bẻ lại economy.
- Dùng một lớp `socialClimate` mỏng (`trust`, `fear`, `strain`) để tạo tradeoff cho god powers mà không phải refactor toàn bộ AI.

## Errors Encountered
- `rg` và `git` không có trong `PATH` của shell hiện tại, nên chuyển sang dùng PowerShell `Get-Content` và `Get-ChildItem`.
- `bun run build` không chạy được vì `bun.exe` trên máy hiện tại bị lỗi môi trường, nên chưa thể xác nhận bằng build end-to-end.

## Status
**Completed** - Đã viết plan gameplay và triển khai tiếp hai bước đầu: pressure HUD + faith economy/social consequences.
