"""Module xử lý tối ưu hóa & làm sắc nét Sprite 2D cho Game (Lanczos + Unsharp Mask)."""
import os
from pathlib import Path
from typing import Union, Tuple, Optional
from PIL import Image, ImageFilter, ImageEnhance


def optimize_sprite(
    input_image: Union[str, Path, Image.Image],
    output_path: Optional[Union[str, Path]] = None,
    target_size: Tuple[int, int] = (96, 96),
    sharpen_percent: int = 190,
    contrast_factor: float = 1.08,
    radius: float = 1.2,
    threshold: int = 2,
) -> Image.Image:
    """Tối ưu hóa và làm sắc nét sprite 2D từ ảnh đầu vào.

    Cách dùng:
        # Cách 1: Truyền đường dẫn file và lưu ra file đích
        optimize_sprite("path/to/bee.png", "output/bee_96.png", target_size=(96, 96))

        # Cách 2: Truyền đối tượng PIL Image và nhận về PIL Image
        sharp_img = optimize_sprite(pil_img, target_size=(96, 96))

    Tham số:
        input_image: Đường dẫn file (str / Path) hoặc đối tượng PIL Image.
        output_path: Đường dẫn lưu file đích (tùy chọn).
        target_size: Kích thước pixel mục tiêu (mặc định 96x96).
        sharpen_percent: Cường độ làm nét viền Unsharp Mask (100 - 250%, mặc định 190%).
        contrast_factor: Độ tương phản mảng màu (1.08 = nét nhẹ tự nhiên).
        radius: Bán kính làm nét viền (mặc định 1.2px).
        threshold: Ngưỡng lọc viền (mặc định 2).

    Trả về:
        Đối tượng PIL Image (RGBA) đã được làm nét và tối ưu kích thước.
    """
    # 1. Đọc ảnh đầu vào
    if isinstance(input_image, (str, Path)):
        img = Image.open(input_image).convert("RGBA")
    elif isinstance(input_image, Image.Image):
        img = input_image.convert("RGBA")
    else:
        raise ValueError("input_image phải là đường dẫn file hoặc đối tượng PIL Image.")

    # 2. Thu nhỏ với thuật toán nội suy chất lượng cao Lanczos
    resized = img.resize(target_size, Image.Resampling.LANCZOS)

    # 3. Tách kênh màu RGB và Alpha để bảo toàn độ trong suốt mượt mà
    r, g, b, a = resized.split()
    rgb = Image.merge("RGB", (r, g, b))

    # 4. Áp dụng Unsharp Masking để tăng độ sắc nét của đường viền (Outlines)
    sharpened_rgb = rgb.filter(
        ImageFilter.UnsharpMask(radius=radius, percent=sharpen_percent, threshold=threshold)
    )

    # 5. Tăng nhẹ độ tương phản để các mảng màu và nét viền đanh hơn
    if contrast_factor != 1.0:
        enhancer = ImageEnhance.Contrast(sharpened_rgb)
        sharpened_rgb = enhancer.enhance(contrast_factor)

    # 6. Hợp nhất lại kênh màu với kênh Alpha
    sr, sg, sb = sharpened_rgb.split()
    result = Image.merge("RGBA", (sr, sg, sb, a))

    # 7. Lưu ra file nếu có chỉ định output_path
    if output_path is not None:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        result.save(out_p, format="PNG", optimize=True)

    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Sử dụng: python image_optimizer.py <input_image> [output_image] [size]")
        sys.exit(1)

    inp = sys.argv[1]
    outp = sys.argv[2] if len(sys.argv) > 2 else "output.png"
    sz = int(sys.argv[3]) if len(sys.argv) > 3 else 96

    optimize_sprite(inp, outp, target_size=(sz, sz))
    print(f"OK: Đã tối ưu '{inp}' -> '{outp}' ({sz}x{sz}px)")
