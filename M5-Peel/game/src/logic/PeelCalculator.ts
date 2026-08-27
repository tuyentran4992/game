/**
 * Pure TypeScript mathematical utilities for peel calculations.
 * 0 Phaser dependency.
 */

export interface EllipseTrackDef {
  offsetY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export class PeelCalculator {
  /**
   * 3 đường ellipse xích đạo quanh quả theo phối cảnh 3D
   */
  static readonly CONTOURS: EllipseTrackDef[] = [
    { offsetY: -45, radiusX: 162, radiusY: 46, rotation: -0.20 },
    { offsetY: 0,   radiusX: 172, radiusY: 58, rotation: -0.20 },
    { offsetY: 45,  radiusX: 162, radiusY: 46, rotation: -0.20 },
  ];

  /**
   * Tính tọa độ điểm trên đường ellipse tại tham số t (t từ 0 đến PI: từ phải sang trái mặt trước)
   */
  static getContourPoint(
    trackIndex: number,
    t: number,
    cx: number,
    cy: number
  ): { x: number; y: number } {
    const c = PeelCalculator.CONTOURS[trackIndex] || PeelCalculator.CONTOURS[0];
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const u = c.radiusX * cosT;
    const v = c.radiusY * sinT;

    const cosR = Math.cos(c.rotation);
    const sinR = Math.sin(c.rotation);

    const x = cx + u * cosR - v * sinR;
    const y = cy + c.offsetY + u * sinR + v * cosR;

    return { x, y };
  }

  /**
   * Chiếu điểm (x, y) lên hệ tọa độ ellipse và tính góc tham số t + khoảng cách sai số
   */
  static projectToContour(
    trackIndex: number,
    px: number,
    py: number,
    cx: number,
    cy: number
  ): { t: number; distance: number } {
    const c = PeelCalculator.CONTOURS[trackIndex] || PeelCalculator.CONTOURS[0];

    const dx = px - cx;
    const dy = py - (cy + c.offsetY);

    const cosR = Math.cos(c.rotation);
    const sinR = Math.sin(c.rotation);

    // Xoay ngược về hệ trục thẳng đứng
    const u = dx * cosR + dy * sinR;
    const v = -dx * sinR + dy * cosR;

    // Tính góc t trong hệ ellipse
    let t = Math.atan2(v / c.radiusY, u / c.radiusX);
    if (t < 0) {
      t += Math.PI * 2;
    }

    // Tính khoảng cách từ điểm chạm tới đường cong ellipse
    const normalizedRadius = Math.sqrt((u / c.radiusX) ** 2 + (v / c.radiusY) ** 2);
    const avgRadius = (c.radiusX + c.radiusY) * 0.5;
    const distance = Math.abs(normalizedRadius - 1.0) * avgRadius;

    return { t, distance };
  }

  /**
   * Tính hiệu góc có hướng ngắn nhất từ fromRad đến toRad trong khoảng [-PI, PI]
   */
  static shortestAngleDiff(fromRad: number, toRad: number): number {
    const diff = (toRad - fromRad + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return diff;
  }
}
