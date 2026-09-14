// Pattern: Clock holder (view) — ĐỒNG HỒ của một hoạt cảnh giấy
// TRÁCH NHIỆM: giữ (nhịp đang chạy, tuổi ms, callback kết thúc) và mỗi khung hình bôi nhịp đó
//   xuống MỘT bản giá trị MotionFrame. Đây là chỗ duy nhất của tầng vẽ Đếm thời gian cho tờ giấy;
//   vì sao không phải tween của Phaser -> xem đầu file anim/motionTrack.ts.
// VÌ SAU RIÊNG MỘT FILE: SheetView có một việc là VẺ theo frame; đếm thời gian là việc thứ hai.
//   Tách ra thì test được lịch cắt nhịp mà không phải dựng Phaser, và component giấy không phình.
// RÀNG BUỘC: KHÔNG đồng hồ wall-clock — `advance` nhận delta do vòng lặp scene đưa nên một lệnh
//   pause là dừng thật (PC-17); không biết gì về hình (chỉ trả frame); không ngẫu nhiên.

import { blankFrame, sampleTrack, type MotionFrame, type MotionTrack } from './anim/motionTrack';

/** Kịch bản đang tuổi: frame là TÀI SẢN DÀI HẠN, không phải object mới mỗi khung. */
export class MotionPlayer {
  private readonly frameValue: MotionFrame;

  private playing: MotionTrack | null = null;

  private ms = 0;

  private ending: (() => void) | null = null;

  constructor(layers: number, holes: number) {
    this.frameValue = blankFrame(layers, holes);
  }

  frame(): MotionFrame {
    return this.frameValue;
  }

  /** Có nhịp nào đang chạy không — tầng vẽ chỉ cần redraw khi có. */
  active(): boolean {
    return this.playing !== null;
  }

  /**
   * Nạp một nhịp: tuổi về `atMs`, frame được vừa đúng số lớp/số lỗ của nhịp (phần tử lớn thêm
   * khởi đầu ở 0) rồi bôi ngay một lần — khung hình ĐẦU đã đúng tư thế, không chờ `advance`.
   * Kênh mà nhịp KHÔNG nói tới vẫn giữ giá trị cũ: đó là cách nhịp pop lỗ nối tiếp nhịp mở bung
   * mà tờ giấy không bị kéo về tư thế gập.
   */
  play(t: MotionTrack, layers: number, holes: number, done: (() => void) | null = null, atMs = 0): void {
    this.fit(layers, holes);
    this.playing = t;
    this.ms = atMs;
    this.ending = done;
    this.paint(t);
  }

  /** Cắt nhịp đang chạy KÈM callback của nó — nhịp mới đè thì cái cũ không được nổ nữa. */
  stop(): void {
    this.playing = null;
    this.ending = null;
  }

  /** Về số KHÔNG của những kênh không thuộc về một đề nào (vệt quét ẩn, nháy tắt). */
  reset(): void {
    this.stop();
    this.frameValue.band = -1;
    this.frameValue.flash = 0;
  }

  /** Khung HÌNH TĨNH theo nhịp `t` ở tuổi `ms` (tư thế mở phẳng / gói giấy đã gập kín). */
  pose(t: MotionTrack, layers: number, holes: number, ms: number): MotionFrame {
    this.play(t, layers, holes, null, ms);
    this.playing = null;
    return this.frameValue;
  }

  /**
   * Bước một khung hình. Trả frame đã bôi giá trị mới, hoặc null khi không có nhịp nào chạy
   * (khỏi tô lại một hình không đổi). Callback kết thúc nổ SAU khi frame đã ở đúng tư thế cuối.
   */
  advance(dtMs: number): MotionFrame | null {
    const t = this.playing;
    if (t === null) return null;
    this.ms += dtMs;
    this.paint(t);
    if (this.ms < t.totalMs) return this.frameValue;
    this.playing = null;
    const end = this.ending;
    this.ending = null;
    if (end !== null) end();
    return this.frameValue;
  }

  private paint(t: MotionTrack): void {
    sampleTrack(t, this.ms, this.frameValue);
  }

  private fit(layers: number, holes: number): void {
    grow(this.frameValue.layers, layers);
    grow(this.frameValue.holes, holes);
  }
}

/** Vừa mảng tiến trình đúng `want` phần tử — phần lớn thêm khởi đầu 0, thừa là kênh của đề cũ. */
function grow(values: number[], want: number): void {
  while (values.length < want) values.push(0);
  if (values.length > want) values.length = want;
}

