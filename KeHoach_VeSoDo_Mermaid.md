# Kế Hoạch Vẽ Sơ Đồ Mermaid Cho Phân Hệ Quản Lý Câu Lạc Bộ (Draw.io - Khổ A4)

Khác với 3 file mẫu sử dụng PlantUML mang phong cách cổ điển, kế hoạch này sử dụng **Mermaid.js** với cú pháp được tinh chỉnh tối ưu cho **Draw.io**. Để đảm bảo vừa vặn trên trang Word A4 (chiều ngang giới hạn) và có UI hiện đại, chúng ta sẽ áp dụng các nguyên tắc sau:
1. **Hướng bố cục (Direction):** Ưu tiên dùng `TD` (Top-Down) cho Use Case/Phân rã để tránh phình chiều ngang, và phân tách các luồng dài trong Sequence/Activity.
2. **Hình khối (Shapes):** Thay vì hình chữ nhật mặc định, sử dụng bo góc `([ ])`, hình thoi `{ }`, hoặc hình trụ `[( )]` để tạo sự khác biệt.
3. **Màu sắc (Theming):** Sử dụng `classDef` với các mã màu Pastel hiện đại (Modern UI) thay vì đen trắng/xám mặc định.

---

## 1. Sơ Đồ Phân Rã Chức Năng (Functional Decomposition Diagram)
*Mục đích: Chia nhỏ phân hệ "Quản lý Câu lạc bộ" thành các nhóm nghiệp vụ.*

**Code Mermaid (Copy dán vào tính năng Insert -> Advanced -> Mermaid của Draw.io):**

```mermaid
mindmap
  root((Quản lý<br/>Câu lạc bộ))
    Quản lý Thông tin
      Cập nhật hồ sơ CLB
      Thay đổi Logo/Banner
      Thiết lập Nội quy
    Quản lý Thành viên
      Duyệt đơn đăng ký
      Phân quyền Ban chủ nhiệm
      Xóa/Cảnh cáo thành viên
      Thống kê số lượng
    Quản lý Sự kiện & Điểm danh
      Tạo mới Sự kiện
      Thiết lập tọa độ GPS
      Điểm danh FaceID
      Báo cáo tham gia
    Quản lý Tài chính
      Thu quỹ thành viên
      Ghi nhận chi tiêu
      Báo cáo quỹ
```

*(Lưu ý: Draw.io hỗ trợ cú pháp `mindmap` của Mermaid rất tốt cho sơ đồ phân rã chức năng, giúp tự động co giãn và dàn trang tròn trịa, rất hợp với khổ dọc A4).*

---

## 2. Kế Hoạch Chi Tiết Cho Sơ Đồ Use Case (Usecase Diagram)
*Để không bị tràn viền A4, ta sẽ nhóm theo các `subgraph` dọc.*

**Cấu trúc thiết kế:**
- **Actor:** `Admin` (Quản trị hệ thống) và `ClubLeader` (Ban chủ nhiệm CLB).
- **Layout:** `flowchart TD` (Từ trên xuống).
- **Styling:** Dùng `classDef` tô màu nền nhạt (Light Blue cho Actor, Light Green cho Usecase).

**Code Mermaid mẫu (Dành cho Quản lý Thành viên):**
```mermaid
flowchart TD
    %% Định nghĩa Style
    classDef actorStyle fill:#f0f8ff,stroke:#00509e,stroke-width:2px,color:#000,shape:circle;
    classDef usecaseStyle fill:#e6ffed,stroke:#2ea043,stroke-width:1px,color:#000,shape:pill;

    %% Actors
    Admin((Admin)):::actorStyle
    Leader((Ban Chủ Nhiệm)):::actorStyle

    subgraph Quản Lý Thành Viên CLB
        direction TB
        UC1([Duyệt đơn tham gia]):::usecaseStyle
        UC2([Phân quyền thành viên]):::usecaseStyle
        UC3([Xóa thành viên]):::usecaseStyle
        UC4([Xem danh sách]):::usecaseStyle
        
        %% Mở rộng (Extend / Include)
        UC5([Gửi email thông báo]):::usecaseStyle
        UC1 -. "<<include>>" .-> UC5
        UC3 -. "<<include>>" .-> UC5
    end

    Leader --> UC1
    Leader --> UC2
    Leader --> UC3
    Leader --> UC4
    Admin --> UC4
```

---

## 3. Kế Hoạch Chi Tiết Cho Sơ Đồ Hoạt Động (Activity Diagram)
*Tối ưu A4: Các nhánh điều kiện (if/else) được dàn thẳng đứng thay vì rẽ ngang quá nhiều.*

**Cấu trúc thiết kế:**
- Luồng: **Quy trình duyệt đơn tham gia CLB của sinh viên**.
- Bắt đầu/Kết thúc: Sử dụng node chấm đen `(( ))`.
- Điều kiện: Hình thoi `{ }`.

**Code Mermaid mẫu:**
```mermaid
flowchart TD
    classDef startEnd fill:#333,stroke:#333,stroke-width:2px,color:#fff,shape:circle;
    classDef process fill:#fff3cd,stroke:#ffc107,stroke-width:1px,color:#000;
    classDef decision fill:#e2e3e5,stroke:#6c757d,stroke-width:2px,color:#000,shape:diamond;

    Start((Bắt đầu)):::startEnd --> A([Sinh viên nộp đơn tham gia]):::process
    A --> B{Kiểm tra<br/>thông tin?}:::decision
    
    B -- Hợp lệ --> C([Ban chủ nhiệm xem xét]):::process
    B -- Thiếu/Sai --> D([Yêu cầu cập nhật lại]):::process
    D --> A
    
    C --> E{Quyết định?}:::decision
    E -- Chấp nhận --> F([Thêm vào danh sách CLB]):::process
    E -- Từ chối --> G([Ghi chú lý do từ chối]):::process
    
    F --> H([Hệ thống gửi Email thông báo]):::process
    G --> H
    
    H --> End((Kết thúc)):::startEnd
```

---

## 4. Kế Hoạch Chi Tiết Cho Sơ Đồ Tuần Tự (Sequence Diagram)
*Sequence Diagram rất dễ bị tràn chiều ngang trên A4. Cần giới hạn số lượng `participant` (tối đa 4-5) và dùng `<br>` để ngắt dòng text.*

**Cấu trúc thiết kế:**
- Luồng: **Ban chủ nhiệm tạo sự kiện và thiết lập điểm danh GPS**.
- Sử dụng cú pháp tự động đánh số `autonumber`.
- Lược bỏ bớt các database nội bộ không cần thiết, tập trung vào Client - Controller - Service.

**Code Mermaid mẫu:**
```mermaid
sequenceDiagram
    autonumber
    actor L as Ban Chủ Nhiệm
    participant FE as Web App
    participant BE as API Server
    participant DB as Supabase DB

    L->>FE: Nhập thông tin Sự kiện &<br/>Tọa độ GPS
    activate FE
    FE->>BE: POST /api/events (dữ liệu)
    activate BE
    
    BE->>BE: Validate dữ liệu & tọa độ
    
    alt Dữ liệu không hợp lệ
        BE-->>FE: 400 Bad Request
        FE-->>L: Hiển thị lỗi form
    else Dữ liệu hợp lệ
        BE->>DB: INSERT INTO events
        activate DB
        DB-->>BE: Trả về Event ID
        deactivate DB
        BE-->>FE: 201 Created (Thành công)
        FE-->>L: Chuyển hướng đến<br/>trang Chi tiết Sự kiện
    end
    
    deactivate BE
    deactivate FE
```

## Hướng dẫn đưa vào Draw.io:
1. Mở trang Draw.io (app.diagrams.net).
2. Trên thanh menu, chọn **Arrange** -> **Insert** -> **Advanced** -> **Mermaid...**
3. Dán đoạn code Mermaid ở trên vào hộp thoại và bấm **Insert**.
4. Chọn khối vừa tạo, bạn có thể thay đổi kích thước dễ dàng để căn giữa vừa vặn với trang giấy A4 (Kích thước A4 chuẩn trong Draw.io là 827x1169 pixels).
