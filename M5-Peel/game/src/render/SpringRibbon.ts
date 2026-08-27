import * as Phaser from 'phaser';
import { FruitDefinition } from '../config/peelConfig';

export interface RibbonNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

interface DetachedChain {
  nodes: RibbonNode[];
  outerColor: number;
  innerColor: number;
  vx: number;
  vy: number;
  rotSpeed: number;
  centerX: number;
  centerY: number;
  isTorn: boolean;
  alpha: number;
}

export class SpringRibbon {
  private scene: Phaser.Scene;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private graphics: Phaser.GameObjects.Graphics;

  // Cấu hình Chain
  private readonly MAX_CHAIN_NODES: number = 24; // Vượt quá ~1.2 vòng sẽ tự động detach rơi bớt
  private readonly SEGMENT_LEN: number = 7;
  private readonly RIBBON_WIDTH: number = 18;
  private readonly MAX_BEND_RAD: number = 25 * (Math.PI / 180); // Giới hạn góc giữa 2 đốt <= 25 độ

  private nodes: RibbonNode[] = [];
  private pathHistory: { x: number; y: number; angle: number }[] = [];
  private isPinned: boolean = false;
  private curlDirection: number = 1;
  private outerColor: number = 0xff7a00;
  private innerColor: number = 0xffe0b2;

  private detachedChains: DetachedChain[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.shadowGraphics = this.scene.add.graphics().setDepth(22);
    this.graphics = this.scene.add.graphics().setDepth(24);
  }

  public start(
    startX: number,
    startY: number,
    tangentAngle: number,
    fruit: FruitDefinition,
    curlDir: number = 1
  ): void {
    this.isPinned = true;
    this.curlDirection = curlDir;
    this.outerColor = fruit.ribbonOuterColor;
    this.innerColor = fruit.ribbonInnerColor;

    this.nodes = [];
    this.pathHistory = [{ x: startX, y: startY, angle: tangentAngle }];

    // Khởi tạo node đầu tiên tại đúng vị trí dao (0 delay)
    this.nodes.push({
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      angle: tangentAngle,
    });
  }

  public updateHead(
    headX: number,
    headY: number,
    tangentAngle: number,
    _speedFactor: number = 1.0
  ): void {
    if (!this.isPinned) return;

    // Head luôn bằng đúng điểm cắt frame hiện tại (0 delay)
    if (this.nodes.length === 0) {
      this.nodes.push({
        x: headX,
        y: headY,
        vx: 0,
        vy: 0,
        angle: tangentAngle,
      });
      this.pathHistory.push({ x: headX, y: headY, angle: tangentAngle });
      return;
    }

    this.nodes[0].x = headX;
    this.nodes[0].y = headY;
    this.nodes[0].angle = tangentAngle;

    // Ghi nhận lịch sử vết cắt
    const lastP = this.pathHistory[this.pathHistory.length - 1];
    const dx = headX - lastP.x;
    const dy = headY - lastP.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= this.SEGMENT_LEN) {
      this.pathHistory.push({ x: headX, y: headY, angle: tangentAngle });

      // Tăng số đốt bám theo vết cắt
      if (this.nodes.length < this.MAX_CHAIN_NODES) {
        const prev = this.nodes[this.nodes.length - 1];
        this.nodes.push({
          x: prev.x - Math.cos(prev.angle) * this.SEGMENT_LEN,
          y: prev.y - Math.sin(prev.angle) * this.SEGMENT_LEN,
          vx: 0,
          vy: 0,
          angle: prev.angle,
        });
      } else {
        // Vượt quá ~1.2 vòng -> Tự động detach phần đuôi cũ rơi dần
        this.detachTailPortion(4);
      }
    }
  }

  /**
   * Tách một phần đuôi dải vỏ khi quá dài để rơi + lăn ra ngoài
   */
  private detachTailPortion(nodeCount: number): void {
    if (this.nodes.length <= nodeCount + 3) return;

    const tailNodes = this.nodes.splice(this.nodes.length - nodeCount, nodeCount);
    let sumX = 0, sumY = 0;
    for (const n of tailNodes) {
      sumX += n.x;
      sumY += n.y;
    }

    this.detachedChains.push({
      nodes: tailNodes,
      outerColor: this.outerColor,
      innerColor: this.innerColor,
      vx: this.curlDirection * 2.5,
      vy: 1.5,
      rotSpeed: this.curlDirection * 0.04,
      centerX: sumX / tailNodes.length,
      centerY: sumY / tailNodes.length,
      isTorn: false,
      alpha: 1.0,
    });
  }

  public release(isCompleted: boolean = false): void {
    if (this.isPinned && this.nodes.length > 2) {
      const clonedNodes: RibbonNode[] = this.nodes.map((n) => ({ ...n }));

      let sumX = 0, sumY = 0;
      for (const n of clonedNodes) {
        sumX += n.x;
        sumY += n.y;
      }
      const cX = sumX / clonedNodes.length;
      const cY = sumY / clonedNodes.length;

      const headAngle = this.nodes[0].angle;
      const isTorn = !isCompleted;

      this.detachedChains.push({
        nodes: clonedNodes,
        outerColor: this.outerColor,
        innerColor: this.innerColor,
        vx: isCompleted
          ? Math.cos(headAngle - Math.PI * 0.5) * 4.5 + this.curlDirection * 3.5
          : (Math.random() - 0.5) * 1.0,
        vy: isCompleted ? -3.5 : 0.5,
        rotSpeed: isCompleted ? this.curlDirection * 0.05 : 0.01,
        centerX: cX,
        centerY: cY,
        isTorn,
        alpha: 1.0,
      });
    }

    this.isPinned = false;
    this.nodes = [];
    this.pathHistory = [];
  }

  public update(_deltaMs: number): boolean {
    // 1. Cập nhật chain sinh dọc theo path đã vuốt (giới hạn góc uốn <= 25 độ)
    if (this.isPinned && this.nodes.length > 1) {
      for (let i = 1; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        const prev = this.nodes[i - 1];
        const prog = i / (this.nodes.length - 1);

        // Góc mục tiêu từ node trước
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        let targetAngle = Math.atan2(dy, dx);

        // Ở 1/3 đuôi: thêm curl nhẹ dạng máng C
        if (prog > 0.65) {
          const tailProg = (prog - 0.65) / 0.35;
          targetAngle -= tailProg * 0.18 * this.curlDirection;
        }

        // GIỚI HẠN GÓC GIỮA 2 ĐỐT <= 25 ĐỘ (Triệt tiêu hiện tượng tự giao và khung lục giác lạ)
        const angleDiff = Math.atan2(
          Math.sin(targetAngle - prev.angle),
          Math.cos(targetAngle - prev.angle)
        );
        const clampedDiff = Math.max(
          -this.MAX_BEND_RAD,
          Math.min(this.MAX_BEND_RAD, angleDiff)
        );

        node.angle = prev.angle + clampedDiff;

        // Vị trí node bám chuẩn xác theo độ dài đốt
        node.x = prev.x - Math.cos(node.angle) * this.SEGMENT_LEN;
        node.y = prev.y - Math.sin(node.angle) * this.SEGMENT_LEN + prog * 0.4;
      }
    }

    // 2. Cập nhật các dải vỏ đã detach đang rơi + lăn
    for (let c = this.detachedChains.length - 1; c >= 0; c--) {
      const chain = this.detachedChains[c];

      if (chain.isTorn) {
        chain.alpha -= 0.025;
        for (let i = 1; i < chain.nodes.length; i++) {
          const n = chain.nodes[i];
          const prev = chain.nodes[i - 1];
          n.x += (prev.x - n.x) * 0.12;
          n.y += (prev.y - n.y) * 0.12 + 0.3;
        }
      } else {
        chain.vy += 0.36; // Gravity
        chain.centerX += chain.vx;
        chain.centerY += chain.vy;
        chain.alpha -= 0.015;

        const cosR = Math.cos(chain.rotSpeed);
        const sinR = Math.sin(chain.rotSpeed);

        for (const node of chain.nodes) {
          node.x += chain.vx;
          node.y += chain.vy;

          const relX = node.x - chain.centerX;
          const relY = node.y - chain.centerY;
          node.x = chain.centerX + relX * cosR - relY * sinR;
          node.y = chain.centerY + relX * sinR + relY * cosR;

          node.angle += chain.rotSpeed;
        }
      }

      if (
        chain.alpha <= 0 ||
        chain.centerY > 1350 ||
        chain.centerX < -120 ||
        chain.centerX > 840
      ) {
        this.detachedChains.splice(c, 1);
      }
    }

    this.render();
    return true;
  }

  public render(): void {
    this.graphics.clear();
    this.shadowGraphics.clear();

    // 1. Vẽ dải vỏ đang gọt
    if (this.isPinned && this.nodes.length > 1) {
      this.drawRibbonMesh(this.nodes, this.outerColor, this.innerColor, 1.0);
    }

    // 2. Vẽ các dải vỏ đã detach / rách
    for (const chain of this.detachedChains) {
      this.drawRibbonMesh(
        chain.nodes,
        chain.outerColor,
        chain.innerColor,
        chain.alpha
      );
    }
  }

  /**
   * Vẽ Ribbon với thiết diện máng C mềm mại
   */
  private drawRibbonMesh(
    nodeList: RibbonNode[],
    outerCol: number,
    innerCol: number,
    alpha: number
  ): void {
    if (nodeList.length < 2) return;

    // 1. Bóng đổ 3D dưới dải vỏ
    this.shadowGraphics.fillStyle(0x000000, alpha * 0.35);
    for (let i = 0; i < nodeList.length - 1; i++) {
      const n1 = nodeList[i];
      const n2 = nodeList[i + 1];
      const prog = i / (nodeList.length - 1);

      const currentWidth = this.RIBBON_WIDTH - prog * 4;
      const halfW = currentWidth * 0.5;

      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);

      const offX = 4;
      const offY = 6 + prog * 3;

      this.shadowGraphics.beginPath();
      this.shadowGraphics.moveTo(n1.x + nx * halfW + offX, n1.y + ny * halfW + offY);
      this.shadowGraphics.lineTo(n1.x - nx * halfW + offX, n1.y - ny * halfW + offY);
      this.shadowGraphics.lineTo(n2.x - nx * halfW + offX, n2.y - ny * halfW + offY);
      this.shadowGraphics.lineTo(n2.x + nx * halfW + offX, n2.y + ny * halfW + offY);
      this.shadowGraphics.closePath();
      this.shadowGraphics.fillPath();
    }

    // 2. Vẽ các quad dải vỏ
    for (let i = 0; i < nodeList.length - 1; i++) {
      const n1 = nodeList[i];
      const n2 = nodeList[i + 1];
      const prog = i / (nodeList.length - 1);

      const currentWidth = this.RIBBON_WIDTH - prog * 4;
      const halfW = currentWidth * 0.5;

      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);

      const p1x = n1.x + nx * halfW;
      const p1y = n1.y + ny * halfW;
      const p2x = n1.x - nx * halfW;
      const p2y = n1.y - ny * halfW;

      const p3x = n2.x - nx * halfW;
      const p3y = n2.y - ny * halfW;
      const p4x = n2.x + nx * halfW;
      const p4y = n2.y + ny * halfW;

      const isOuter = prog < 0.7 || Math.floor(i / 2) % 2 === 0;
      const color = isOuter ? outerCol : innerCol;

      this.graphics.fillStyle(color, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(p1x, p1y);
      this.graphics.lineTo(p2x, p2y);
      this.graphics.lineTo(p3x, p3y);
      this.graphics.lineTo(p4x, p4y);
      this.graphics.closePath();
      this.graphics.fillPath();

      // Mép viền nổi khối
      this.graphics.lineStyle(1.0, isOuter ? 0x222222 : 0xffffff, alpha * 0.55);
      this.graphics.beginPath();
      this.graphics.moveTo(p1x, p1y);
      this.graphics.lineTo(p4x, p4y);
      this.graphics.strokePath();

      this.graphics.beginPath();
      this.graphics.moveTo(p2x, p2y);
      this.graphics.lineTo(p3x, p3y);
      this.graphics.strokePath();
    }
  }

  public clear(): void {
    this.isPinned = false;
    this.nodes = [];
    this.pathHistory = [];
    this.detachedChains = [];
    this.graphics.clear();
    this.shadowGraphics.clear();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.shadowGraphics.destroy();
  }
}
