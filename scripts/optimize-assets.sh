#!/usr/bin/env bash
#
# 将 src/assets 下的大 PNG 转成受控尺寸的 WebP，并删除旧 PNG。
# 依赖：brew install imagemagick webp
# 兼容 macOS 自带 bash 3.2（不使用关联数组）。
#
# 尺寸依据各 *Image.tsx 组件默认 size 的 2x（Retina）：
#   NavIcon 38→88  Bunny 172→344  Review 96→192  CatSearch 72→192
#   Paw 30→100  Click 30→100  Finish 120→280  Plant 92→192  Avatar 54→128
#   hero 已很小，不处理
#
set -eo pipefail

ASSETS="src/assets"

# 每行 "文件名(不含后缀) 最大边像素"
SPECS="
home 88
lib 88
data 88
me 88
bunny 344
review 192
status-mastered 100
status-unknown 100
status-fuzzy 100
status-new 100
cat-search 192
click 100
finish 280
plant 192
avatar 128
"

if ! command -v magick >/dev/null 2>&1; then
  echo "错误：未找到 magick，请先 brew install imagemagick" >&2
  exit 1
fi

echo "$SPECS" | while read -r key size; do
  [ -z "$key" ] && continue
  src="${ASSETS}/${key}.png"
  out="${ASSETS}/${key}.webp"
  if [ ! -f "$src" ]; then
    echo "跳过（无源文件）: $src"
    continue
  fi
  before=$(du -h "$src" | cut -f1)
  # -resize WxH> 只缩不放大；-strip 去元数据；q=82 method=6 高压缩
  magick "$src" -resize "${size}x${size}>" -strip \
    -quality 82 -define webp:method=6 "$out"
  after=$(du -h "$out" | cut -f1)
  echo "OK  ${key}: ${before} png -> ${after} webp (max ${size}px)"
  rm -f "$src"
done

# bunny.gif 只是单帧静图，转 webp 后一并删除，避免 glob 读到旧 gif
rm -f "${ASSETS}/bunny.gif"

echo "----"
echo "完成。webp 总大小："
du -ch "${ASSETS}"/*.webp | tail -1
