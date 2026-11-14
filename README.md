# Bê bối CEO Nvidia

Đồ thị tri thức 3D về vụ Jensen Huang rời NVIDIA (11/2026) và cuộc đua chip AI Mỹ Trung. 91 nút, 147 quan hệ, 25 nguồn. Mỗi quan hệ mang một bậc chứng cứ và đường dẫn nguồn. Giả thuyết được vẽ khác sự kiện.

## Chạy

Trang tĩnh, không cần bước dựng. Mở bằng bất kỳ máy chủ tĩnh nào:

```
npx serve .
```

Triển khai lên Vercel: nhập repo, giữ nguyên mặc định (không framework, không lệnh build).

## Cấu trúc

| Tệp | Vai trò |
| --- | --- |
| `index.html` | Khung trang |
| `styles.css` | Toàn bộ giao diện. Một giao diện tối, ba màu phe |
| `app.js` | Mã trang, chia bảy phần có chú thích: mô hình dữ liệu, bố cục 3D, vẽ thẻ, cảnh 3D, trạng thái và hành động, giao diện, nguồn tin |
| `data.js` | Dữ liệu đồ thị: nút `N`, quan hệ `E`, nguồn `S`, nhánh `PATHS`, bảng đối chiếu `VERIFY` |
| `content.js` | Lớp biên tập: phe, vai, luận điểm từng nhánh, lời dẫn trình chiếu `SCRIPT`, mốc thời gian, tin và cổ phiếu dự phòng |
| `feed.json` | Tin nóng và cổ phiếu mà trang đọc khi chạy. Sửa tệp này để cập nhật hai dải chạy |

Dựng hình: cảnh vẽ vào bộ đệm 16 bit rồi qua hậu kỳ HDR (quầng sáng nhiều tầng, đường cong tương phản, nén vùng sáng) viết ngay trong `app.js`, không thêm thư viện. Mức chất lượng Nhẹ tắt hậu kỳ. Sàn lưới và cọc dọi dưới mỗi nút giúp đọc chiều sâu.

Thư viện ngoài: three.js r128 và OrbitControls, đặt sẵn trong `vendor/` (giấy phép MIT, xem `vendor/THREE-LICENSE`). Dải cổ phiếu lấy thêm giá trực tiếp từ `https://nvidia-monitor.vercel.app/api/fork-quotes`, không có thì giữ số trong `feed.json`.

## Sửa dữ liệu

- Thêm nút: một dòng `[mã, nhãn, loại, mô tả]` trong `N` ở `data.js`, rồi gán phe trong `content.js`.
- Thêm quan hệ: một dòng `[nguồn, đích, nhãn, bậc, [mã nguồn tin]]` trong `E`. Bậc là `A` chính thức, `B` hãng tin xác nhận, `C` nguồn giấu tên hoặc một báo, `D` phân tích và giả thuyết.
- Ảnh cho thẻ: khai báo `IMG.<mã nút> = "đường/dẫn/ảnh"` ở cuối `data.js`. Chỉ dùng ảnh bạn có quyền dùng.
- Tin và cổ phiếu: sửa `feed.json`, giữ nguyên cấu trúc `{updated, stockLabel, news, stocks}`.

## Về độ tin cậy

- Dữ liệu chốt ngày 12/11/2026. Vụ việc còn đang diễn biến.
- Tiêu đề và tóm tắt tin là bản viết lại bằng tiếng Việt, không phải nguyên văn bài báo. Mỗi tin có đường dẫn bài gốc.
- Một số nguồn chỉ được xác nhận qua tiêu đề hoặc qua báo khác thuật lại. Chúng được đánh dấu trong tab Nguồn.
- Nhiều chi tiết dựa trên nguồn giấu tên và chưa được xác minh độc lập. Các cáo buộc về tình báo đã bị phía Trung Quốc bác bỏ. Tab Kiểm chứng liệt kê điểm nào khớp, lệch hoặc chưa đối chiếu được.
- Số liệu cổ phiếu là biến động theo các hãng tin đưa, không phải giá trực tiếp.
- Trục thời gian gán mốc xuất hiện cho từng nút theo dòng sự kiện, là xấp xỉ.

Nguyễn Cảnh Lâm

## Giấy phép

MIT. Xem tệp `LICENSE`. Giấy phép áp cho mã nguồn và dữ liệu do tác giả biên soạn. Các bài báo được dẫn nguồn thuộc về hãng tin của chúng.
