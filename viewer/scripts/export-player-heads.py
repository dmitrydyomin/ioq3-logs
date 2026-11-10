"""Export Ranger and Sarge portraits from a local Quake III PK3."""

import argparse
import io
import json
import math
import struct
from pathlib import Path
from zipfile import ZipFile

from PIL import Image


def read_surfaces(data):
    # https://github.com/id-Software/Quake-III-Arena/blob/master/common/qfiles.h
    if struct.unpack_from("<4si", data) != (b"IDP3", 15):
        raise ValueError("Expected a version 15 MD3 file")

    count, _, _, _, offset = struct.unpack_from("<5i", data, 84)
    for _ in range(count):
        name = data[offset + 4:offset + 68].split(b"\0", 1)[0].decode().lower()
        _, _, _, vertices, triangles, indexes, _, uv, xyz, end = struct.unpack_from(
            "<10i", data, offset + 68
        )
        positions = []
        normals = []
        indices = []
        for i in range(vertices):
            x, y, z, normal = struct.unpack_from("<3hH", data, offset + xyz + i * 8)
            positions.extend((x / 64, y / 64, z / 64))
            azimuth = (normal >> 8) * math.tau / 255
            inclination = (normal & 255) * math.tau / 255
            normals.extend(round(value, 5) for value in (
                math.cos(azimuth) * math.sin(inclination),
                math.sin(azimuth) * math.sin(inclination),
                math.cos(inclination),
            ))
        for i in range(triangles):
            a, b, c = struct.unpack_from("<3i", data, offset + indexes + i * 12)
            indices.extend((a, c, b))

        yield {
            "name": name,
            "positions": positions,
            "normals": normals,
            "indices": indices,
            "uv": struct.unpack_from(f"<{vertices * 2}f", data, offset + uv),
        }
        offset += end


def export_head(archive, model, output):
    prefix = f"models/players/{model}/"
    output.mkdir(parents=True, exist_ok=True)
    surfaces = list(read_surfaces(archive.read(prefix + "head.md3")))
    skins = {}
    textures = {}

    for path in archive.namelist():
        if not (path.startswith(prefix + "head_") and path.endswith(".skin")):
            continue
        skin = Path(path).stem.removeprefix("head_")
        skins[skin] = {}
        for line in archive.read(path).decode().splitlines():
            surface, _, texture = line.partition(",")
            texture = texture.strip()
            if not texture:
                continue
            if texture not in textures:
                filename = f"texture-{len(textures)}.png"
                with Image.open(io.BytesIO(archive.read(texture))) as image:
                    image.save(output / filename)
                textures[texture] = filename
            skins[skin][surface.strip().lower()] = textures[texture]

    (output / "head.json").write_text(
        json.dumps({"surfaces": surfaces, "skins": skins}, separators=(",", ":")),
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pk3", type=Path)
    parser.add_argument(
        "--output", type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "player-heads",
    )
    args = parser.parse_args()
    with ZipFile(args.pk3) as pk3:
        for model in ("ranger", "sarge"):
            export_head(pk3, model, args.output / model)
