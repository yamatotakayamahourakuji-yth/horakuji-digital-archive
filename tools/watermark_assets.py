#!/usr/bin/env python3
"""Embed and verify a keyed, repeated DCT watermark in public portrait assets.

The unmodified source bytes are copied to an ignored local vault before any
published file is replaced.  A JSON manifest records source/published hashes.
This is provenance evidence and deterrence, not DRM or a legal determination.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import math
import os
import re
import shutil
import struct
import tempfile
import time
import zlib
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, PngImagePlugin


ROOT = Path(__file__).resolve().parents[1]
OWNER = "© 2026 大和高山 法楽寺"
RIGHTS = "掲載している文章・写真・肖像画像の無断転載、複製、改変および再配布を禁じます。"
SOURCE = "大和高山 法楽寺デジタルアーカイブ"
DELTA = 34.0
MAGIC = b"HRKJ"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dct_matrix(n: int = 8) -> np.ndarray:
    matrix = np.empty((n, n), dtype=np.float32)
    factor = math.pi / (2 * n)
    for k in range(n):
        scale = math.sqrt(1 / n) if k == 0 else math.sqrt(2 / n)
        for x in range(n):
            matrix[k, x] = scale * math.cos((2 * x + 1) * k * factor)
    return matrix


DCT = dct_matrix()


def asset_info(path: Path) -> tuple[int, str, str]:
    match = re.match(r"([1-8])_", path.name)
    if not match:
        raise ValueError(f"祖師番号を判定できません: {path}")
    number = int(match.group(1))
    folder = path.parent.name
    if folder == "original":
        kind, code = "ORIGINAL", "O"
    elif folder == "restored":
        kind, code = "RESTORED", "R"
    elif folder == "explanation":
        kind, code = "EXPLANATION", "E"
    else:
        raise ValueError(f"対象外フォルダです: {path}")
    derivative = "THUMB" if "_thumb" in path.stem else "WEB" if "_web" in path.stem else "MASTER-PUBLIC"
    return number, kind, f"{number:02d}{code}-{derivative}"


def compact_payload(number: int, kind: str) -> bytes:
    kind_code = {"ORIGINAL": 1, "RESTORED": 2, "EXPLANATION": 3}[kind]
    body = MAGIC + bytes((1, number, kind_code)) + struct.pack(">H", 2026)
    return body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def payload_bits(payload: bytes) -> np.ndarray:
    return np.unpackbits(np.frombuffer(payload, dtype=np.uint8))


def seeded_order(key: bytes, asset_id: str, count: int) -> np.ndarray:
    seed = hmac.new(key, asset_id.encode("utf-8"), hashlib.sha256).digest()
    rng = np.random.default_rng(int.from_bytes(seed[:8], "big"))
    return rng.permutation(count)


def embed_y_channel(y: np.ndarray, bits: np.ndarray, key: bytes, asset_id: str) -> tuple[np.ndarray, int]:
    height, width = y.shape
    rows, cols = height // 8, width // 8
    block_count = rows * cols
    repeats = min(64, block_count // len(bits))
    if repeats < 4:
        raise ValueError(f"画像が小さすぎます: {width}x{height}")
    order = seeded_order(key, asset_id, block_count)[: repeats * len(bits)]
    out = y.astype(np.float32).copy()
    for bit_index, bit in enumerate(bits):
        for flat_index in order[bit_index * repeats : (bit_index + 1) * repeats]:
            row, col = divmod(int(flat_index), cols)
            ys, xs = row * 8, col * 8
            block = out[ys : ys + 8, xs : xs + 8] - 128.0
            coeff = DCT @ block @ DCT.T
            value = coeff[3, 2]
            q = int(np.rint(value / DELTA))
            if q % 2 != int(bit):
                lower, upper = q - 1, q + 1
                q = lower if abs(value - lower * DELTA) <= abs(value - upper * DELTA) else upper
            coeff[3, 2] = q * DELTA
            out[ys : ys + 8, xs : xs + 8] = DCT.T @ coeff @ DCT + 128.0
    return np.clip(np.rint(out), 0, 255).astype(np.uint8), repeats


def extract_y_channel(y: np.ndarray, bit_count: int, key: bytes, asset_id: str) -> tuple[bytes, float, int]:
    height, width = y.shape
    rows, cols = height // 8, width // 8
    block_count = rows * cols
    repeats = min(64, block_count // bit_count)
    order = seeded_order(key, asset_id, block_count)[: repeats * bit_count]
    decoded: list[int] = []
    confidence: list[float] = []
    source = y.astype(np.float32)
    for bit_index in range(bit_count):
        votes: list[int] = []
        for flat_index in order[bit_index * repeats : (bit_index + 1) * repeats]:
            row, col = divmod(int(flat_index), cols)
            block = source[row * 8 : row * 8 + 8, col * 8 : col * 8 + 8] - 128.0
            coeff = DCT @ block @ DCT.T
            votes.append(int(np.rint(coeff[3, 2] / DELTA)) % 2)
        ones = sum(votes)
        bit = 1 if ones > repeats / 2 else 0
        decoded.append(bit)
        confidence.append(max(ones, repeats - ones) / repeats)
    packed = np.packbits(np.asarray(decoded, dtype=np.uint8)).tobytes()
    return packed, float(np.mean(confidence)), repeats


def xmp_packet(asset_id: str, kind: str) -> bytes:
    text = f"""<?xpacket begin='\ufeff' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'><rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>
<rdf:Description rdf:about='' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:xmpRights='http://ns.adobe.com/xap/1.0/rights/' xmlns:photoshop='http://ns.adobe.com/photoshop/1.0/'>
<dc:creator><rdf:Seq><rdf:li>大和高山 法楽寺</rdf:li></rdf:Seq></dc:creator>
<dc:rights><rdf:Alt><rdf:li xml:lang='x-default'>{OWNER}</rdf:li></rdf:Alt></dc:rights>
<dc:source>{SOURCE}</dc:source><photoshop:Credit>大和高山 法楽寺</photoshop:Credit>
<xmpRights:Marked>True</xmpRights:Marked><xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang='x-default'>{RIGHTS}</rdf:li></rdf:Alt></xmpRights:UsageTerms>
<dc:identifier>{asset_id}</dc:identifier><dc:description>{kind}</dc:description>
</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end='w'?>"""
    return text.encode("utf-8")


def save_with_metadata(image: Image.Image, destination: Path, asset_id: str, kind: str) -> None:
    suffix = destination.suffix.lower()
    xmp = xmp_packet(asset_id, kind)
    # Classic EXIF ASCII fields cannot reliably carry Japanese text. Keep a
    # readable ASCII fallback there and preserve the exact Japanese wording in
    # UTF-8 XMP (and PNG iTXt).
    common_description = f"Yamato Takayama Horakuji Digital Archive | {kind} | Asset ID: {asset_id}"
    if suffix == ".png":
        info = PngImagePlugin.PngInfo()
        info.add_itxt("Copyright", OWNER)
        info.add_itxt("Creator", "大和高山 法楽寺")
        info.add_itxt("Credit", "大和高山 法楽寺")
        info.add_itxt("Source", SOURCE)
        info.add_itxt("Rights Usage Terms", RIGHTS)
        info.add_itxt("Asset ID", asset_id)
        info.add_itxt("XML:com.adobe.xmp", xmp.decode("utf-8"))
        image.save(destination, format="PNG", pnginfo=info, optimize=True)
        return
    exif = Image.Exif()
    exif[270] = common_description
    exif[305] = "Horakuji provenance watermark tool"
    exif[315] = "Yamato Takayama Horakuji"
    exif[33432] = "Copyright 2026 Yamato Takayama Horakuji"
    exif[40093] = ("大和高山 法楽寺\0").encode("utf-16le")
    if suffix in {".jpg", ".jpeg"}:
        image.convert("RGB").save(destination, format="JPEG", quality=96, subsampling=0, optimize=True, exif=exif, xmp=xmp)
    elif suffix == ".webp":
        image.convert("RGB").save(destination, format="WEBP", quality=96, method=6, exif=exif, xmp=xmp)
    else:
        raise ValueError(f"未対応形式です: {destination}")


def target_files() -> list[Path]:
    files: list[Path] = []
    for folder in ("original", "restored", "explanation"):
        for path in sorted((ROOT / "images" / folder).iterdir()):
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                files.append(path)
    return files


def make_key(path: Path) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(os.urandom(32))
    key = path.read_bytes()
    if len(key) < 32:
        raise ValueError("秘密鍵は32バイト以上必要です")
    return key


def replace_with_retry(source: Path, destination: Path) -> None:
    """Handle short Windows indexer/preview locks without weakening safety."""
    for attempt in range(10):
        try:
            os.replace(source, destination)
            return
        except PermissionError:
            if attempt == 9:
                raise
            time.sleep(0.25 * (attempt + 1))


def embed_all(key_path: Path, vault: Path, manifest_path: Path) -> None:
    key = make_key(key_path)
    records: list[dict[str, object]] = []
    for source in target_files():
        relative = source.relative_to(ROOT)
        backup = vault / relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            shutil.copy2(source, backup)
        number, kind, asset_id = asset_info(source)
        original_hash = sha256(backup)
        with Image.open(backup) as original:
            rgb = original.convert("RGB")
            ycbcr = np.asarray(rgb.convert("YCbCr"), dtype=np.uint8).copy()
            payload = compact_payload(number, kind)
            ycbcr[:, :, 0], repeats = embed_y_channel(ycbcr[:, :, 0], payload_bits(payload), key, asset_id)
            marked = Image.fromarray(ycbcr, "YCbCr").convert("RGB")
            with tempfile.NamedTemporaryFile(dir=source.parent, suffix=source.suffix, delete=False) as temp:
                temp_path = Path(temp.name)
            try:
                save_with_metadata(marked, temp_path, asset_id, kind)
                with Image.open(temp_path) as check:
                    extracted, confidence, _ = extract_y_channel(
                        np.asarray(check.convert("YCbCr"), dtype=np.uint8)[:, :, 0], len(payload) * 8, key, asset_id
                    )
                    if extracted != payload:
                        raise RuntimeError(f"不可視ウォーターマークの検証に失敗: {relative} ({confidence:.3f})")
                    width, height = check.size
                replace_with_retry(temp_path, source)
            finally:
                temp_path.unlink(missing_ok=True)
        records.append({
            "path": relative.as_posix(), "assetId": asset_id, "portraitNo": number,
            "category": kind, "dimensions": [width, height], "dctRepeat": repeats,
            "detectionConfidence": round(confidence, 4), "sourceSha256": original_hash,
            "publishedSha256": sha256(source), "copyright": OWNER,
        })
        print(f"OK {relative} confidence={confidence:.3f}")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schemaVersion": 1,
        "generated": date.today().isoformat(),
        "owner": OWNER,
        "rightsUsageTerms": RIGHTS,
        "watermark": "keyed repeated 8x8 DCT-QIM; detector key retained offline",
        "sourceVault": "Local ignored .rights-masters directory; not published",
        "assets": records,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def verify_all(key_path: Path, manifest_path: Path) -> None:
    key = key_path.read_bytes()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1 or manifest.get("owner") != OWNER:
        raise ValueError("台帳の形式または権利者情報が一致しません")
    records = manifest.get("assets")
    if not isinstance(records, list):
        raise ValueError("台帳のassetsは配列である必要があります")

    expected_files = target_files()
    expected_paths = {path.relative_to(ROOT).as_posix() for path in expected_files}
    listed_paths: list[str] = []
    allowed_roots = tuple((ROOT / "images" / folder).resolve() for folder in ("original", "restored", "explanation"))
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get("path"), str):
            raise ValueError("台帳の各レコードには文字列のpathが必要です")
        raw_path = str(record["path"])
        relative = Path(raw_path)
        if relative.is_absolute() or relative.anchor or ".." in relative.parts:
            raise ValueError(f"台帳に許可されないパスがあります: {raw_path}")
        listed_paths.append(relative.as_posix())
    if len(listed_paths) != len(set(listed_paths)):
        raise ValueError("台帳に重複した画像パスがあります")
    listed_set = set(listed_paths)
    if listed_set != expected_paths:
        missing = sorted(expected_paths - listed_set)
        extra = sorted(listed_set - expected_paths)
        raise ValueError(f"台帳と公開画像の一覧が一致しません: missing={missing}, extra={extra}")

    failures = 0
    for record in records:
        relative = Path(str(record["path"]))
        path = (ROOT / relative).resolve(strict=True)
        if not path.is_file() or path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise ValueError(f"画像ファイルではありません: {relative.as_posix()}")
        if not any(path.is_relative_to(allowed_root) for allowed_root in allowed_roots):
            raise ValueError(f"公開画像フォルダ外のパスです: {relative.as_posix()}")

        number, kind, asset_id = asset_info(path)
        canonical = {
            "portraitNo": number,
            "category": kind,
            "assetId": asset_id,
        }
        for field, expected in canonical.items():
            if record.get(field) != expected:
                raise ValueError(f"{relative.as_posix()} の{field}がパス由来の値と一致しません")
        payload = compact_payload(number, kind)
        with Image.open(path) as image:
            dimensions_ok = list(image.size) == record.get("dimensions")
            extracted, confidence, repeats = extract_y_channel(
                np.asarray(image.convert("YCbCr"), dtype=np.uint8)[:, :, 0], len(payload) * 8, key, asset_id
            )
        hash_ok = sha256(path) == record["publishedSha256"]
        ok = extracted == payload and hash_ok and dimensions_ok
        failures += not ok
        print(
            f"{'OK' if ok else 'FAIL'} {relative.as_posix()} confidence={confidence:.3f} "
            f"repeat={repeats} hash={hash_ok} dimensions={dimensions_ok}"
        )
    if failures:
        raise SystemExit(f"{failures}件の検証に失敗しました")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("embed", "verify"))
    parser.add_argument("--key", type=Path, default=ROOT / ".rights-private" / "watermark.key")
    parser.add_argument("--vault", type=Path, default=ROOT / ".rights-masters")
    parser.add_argument("--manifest", type=Path, default=ROOT / "rights" / "asset-manifest.json")
    args = parser.parse_args()
    if args.action == "embed":
        embed_all(args.key, args.vault, args.manifest)
    else:
        verify_all(args.key, args.manifest)


if __name__ == "__main__":
    main()
