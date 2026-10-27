from __future__ import annotations

import io
import math
import struct
import zipfile
from dataclasses import dataclass
from typing import Iterable, Sequence
from xml.sax.saxutils import escape

import numpy as np
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.polygon import orient

from .vendor.earcut import earcut


@dataclass
class Mesh:
    vertices: np.ndarray
    faces: np.ndarray

    def __post_init__(self) -> None:
        self.vertices = np.asarray(self.vertices, dtype=np.float64)
        self.faces = np.asarray(self.faces, dtype=np.int64)

    @property
    def empty(self) -> bool:
        return len(self.vertices) == 0 or len(self.faces) == 0

    def copy(self) -> "Mesh":
        return Mesh(self.vertices.copy(), self.faces.copy())

    def append(self, other: "Mesh") -> "Mesh":
        if other.empty:
            return self.copy()
        if self.empty:
            return other.copy()
        offset = len(self.vertices)
        return Mesh(
            np.vstack([self.vertices, other.vertices]),
            np.vstack([self.faces, other.faces + offset]),
        )

    def merged(self, decimals: int = 6) -> "Mesh":
        if self.empty:
            return self
        rounded = np.round(self.vertices, decimals=decimals)
        unique, inverse = np.unique(rounded, axis=0, return_inverse=True)
        faces = inverse[self.faces]
        keep = (
            (faces[:, 0] != faces[:, 1])
            & (faces[:, 1] != faces[:, 2])
            & (faces[:, 0] != faces[:, 2])
        )
        return Mesh(unique, faces[keep])

    def signed_volume(self) -> float:
        if self.empty:
            return 0.0
        a = self.vertices[self.faces[:, 0]]
        b = self.vertices[self.faces[:, 1]]
        c = self.vertices[self.faces[:, 2]]
        return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)

    def volume(self) -> float:
        return abs(self.signed_volume())

    def oriented(self) -> "Mesh":
        if self.empty:
            return self
        if self.signed_volume() < 0:
            return Mesh(self.vertices, self.faces[:, ::-1].copy())
        return self

    @property
    def bounds(self) -> dict[str, list[float]]:
        if self.empty:
            return {"min": [0.0, 0.0, 0.0], "max": [0.0, 0.0, 0.0]}
        return {
            "min": [float(v) for v in self.vertices.min(axis=0)],
            "max": [float(v) for v in self.vertices.max(axis=0)],
        }

    @property
    def triangles(self) -> int:
        return int(len(self.faces))

    def translated(self, offset: Sequence[float]) -> "Mesh":
        vertices = self.vertices + np.asarray(offset, dtype=float)
        return Mesh(vertices, self.faces.copy())

    def transformed(self, matrix: np.ndarray) -> "Mesh":
        if self.empty:
            return self
        m = np.asarray(matrix, dtype=float)
        hom = np.column_stack([self.vertices, np.ones(len(self.vertices))])
        vertices = (hom @ m.T)[:, :3]
        return Mesh(vertices, self.faces.copy()).oriented()

    def stl_bytes(self) -> bytes:
        return mesh_to_stl(self)

    def obj_bytes(self, name: str) -> bytes:
        return mesh_to_obj([(name, self)])


def _triangle_area2(p: np.ndarray, q: np.ndarray, r: np.ndarray) -> float:
    return (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])


def _jitter_ring(coords: Iterable[tuple[float, float]], seed: float) -> list[tuple[float, float]]:
    return [
        (
            float(x) + 0.0015 * math.sin((i + 1) * 1.71 + seed),
            float(y) + 0.0015 * math.cos((i + 1) * 2.13 + seed),
        )
        for i, (x, y) in enumerate(coords)
    ]


def _clean_polygon(poly: Polygon) -> Polygon:
    exterior = _jitter_ring(list(poly.exterior.coords[:-1]), 0.0)
    holes: list[list[tuple[float, float]]] = []
    for i, ring in enumerate(poly.interiors):
        holes.append(_jitter_ring(list(ring.coords[:-1]), i + 1.0))
    return Polygon(exterior, holes)


def triangulate_polygon(poly: Polygon) -> tuple[np.ndarray, np.ndarray]:
    if poly.is_empty:
        return np.zeros((0, 2)), np.zeros((0, 3), dtype=np.int64)
    poly = orient(poly, sign=1.0)
    rings: list[np.ndarray] = [np.asarray(poly.exterior.coords[:-1], dtype=float)]
    for interior in poly.interiors:
        rings.append(np.asarray(interior.coords[:-1], dtype=float))
    flat: list[float] = []
    holes: list[int] = []
    cursor = 0
    for index, ring in enumerate(rings):
        if index > 0:
            holes.append(cursor)
        flat.extend(ring.reshape(-1).tolist())
        cursor += len(ring)
    vertices = np.asarray(flat, dtype=float).reshape(-1, 2)
    if len(vertices) < 3:
        return np.zeros((0, 2)), np.zeros((0, 3), dtype=np.int64)
    try:
        faces = np.asarray(earcut(flat, holes or None, 2), dtype=np.int64)
    except Exception:
        return np.zeros((0, 2)), np.zeros((0, 3), dtype=np.int64)
    if len(faces) % 3:
        return np.zeros((0, 2)), np.zeros((0, 3), dtype=np.int64)
    faces = faces.reshape(-1, 3)
    for i, tri in enumerate(faces):
        if _triangle_area2(vertices[tri[0]], vertices[tri[1]], vertices[tri[2]]) < 0:
            faces[i] = tri[[0, 2, 1]]
    return vertices, faces


def extrude_polygon(poly: Polygon | MultiPolygon, z0: float, height: float) -> Mesh:
    if poly is None or poly.is_empty or height <= 0:
        return Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    if isinstance(poly, MultiPolygon):
        out = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
        for piece in poly.geoms:
            if piece.area > 1e-7:
                out = out.append(extrude_polygon(piece, z0, height))
        return out
    poly = _clean_polygon(poly)
    vertices2d, faces2d = triangulate_polygon(poly)
    if len(faces2d) == 0:
        return Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    count = len(vertices2d)
    bottom = np.column_stack([vertices2d, np.full(count, z0)])
    top = np.column_stack([vertices2d, np.full(count, z0 + height)])
    vertices = np.vstack([bottom, top])
    faces: list[list[int]] = []
    for tri in faces2d:
        faces.append([int(tri[0]), int(tri[2]), int(tri[1])])
        faces.append([int(tri[0]) + count, int(tri[1]) + count, int(tri[2]) + count])
    rings = [np.asarray(poly.exterior.coords[:-1], dtype=float)]
    rings.extend(np.asarray(ring.coords[:-1], dtype=float) for ring in poly.interiors)
    for ring_index, ring in enumerate(rings):
        n = len(ring)
        if n < 3:
            continue
        base = len(vertices)
        for x, y in ring:
            vertices = np.vstack([vertices, [x, y, z0], [x, y, z0 + height]])
        reverse = ring_index > 0
        for i in range(n):
            j = (i + 1) % n
            a = base + i * 2
            b = base + j * 2
            c = b + 1
            d = a + 1
            if reverse:
                faces.append([a, c, b])
                faces.append([a, d, c])
            else:
                faces.append([a, b, c])
                faces.append([a, c, d])
    return Mesh(vertices, np.asarray(faces, dtype=np.int64)).merged().oriented()


def extrude_x(poly: Polygon | MultiPolygon, x0: float, width: float) -> Mesh:
    mesh = extrude_polygon(poly, 0.0, width)
    if mesh.empty:
        return mesh
    m = np.array(
        [
            [0.0, 0.0, 1.0, x0],
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ]
    )
    return mesh.transformed(m)


def extrude_y(poly: Polygon | MultiPolygon, y0: float, depth: float) -> Mesh:
    mesh = extrude_polygon(poly, 0.0, depth)
    if mesh.empty:
        return mesh
    m = np.array(
        [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, -1.0, y0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ]
    )
    return mesh.transformed(m)


def rounded_rect(width: float, height: float, radius: float) -> Polygon:
    if width <= 0 or height <= 0:
        return Polygon()
    r = max(0.0, min(radius, width / 2.0 - 0.001, height / 2.0 - 0.001))
    if r <= 0.01:
        return Polygon([(0, 0), (width, 0), (width, height), (0, height)])
    return Polygon(
        [
            (r, 0),
            (width - r, 0),
            (width, r),
            (width, height - r),
            (width - r, height),
            (r, height),
            (0, height - r),
            (0, r),
        ]
    ).buffer(0)


def box(x: float, y: float, z: float, width: float, depth: float, height: float) -> Mesh:
    poly = Polygon(
        [(x, y), (x + width, y), (x + width, y + depth), (x, y + depth)]
    )
    return extrude_polygon(poly, z, height)


def cylinder(cx: float, cy: float, z: float, radius: float, height: float, segments: int = 40) -> Mesh:
    if radius <= 0 or height <= 0:
        return Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    theta = np.linspace(0, math.tau, segments, endpoint=False)
    ring = [(cx + radius * math.cos(a), cy + radius * math.sin(a)) for a in theta]
    return extrude_polygon(Polygon(ring), z, height)


def cone(cx: float, cy: float, z: float, radius: float, height: float, segments: int = 48) -> Mesh:
    if radius <= 0 or height <= 0:
        return Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    theta = np.linspace(0, math.tau, segments, endpoint=False)
    bottom = [(cx + radius * math.cos(a), cy + radius * math.sin(a), z) for a in theta]
    top = [(cx, cy, z + height)]
    vertices = np.asarray(bottom + top, dtype=float)
    faces: list[list[int]] = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.append([i, j, segments])
        faces.append([j, i, segments])
    center_bottom = len(vertices)
    vertices = np.vstack([vertices, [cx, cy, z]])
    for i in range(segments):
        j = (i + 1) % segments
        faces.append([center_bottom, j, i])
    return Mesh(vertices, np.asarray(faces, dtype=np.int64)).merged().oriented()


def matrix_rotate_x(angle_deg: float, pivot: Sequence[float] = (0, 0, 0)) -> np.ndarray:
    a = math.radians(angle_deg)
    c, s = math.cos(a), math.sin(a)
    px, py, pz = pivot
    return np.array(
        [
            [1, 0, 0, px - px],
            [0, c, -s, py - c * py + s * pz],
            [0, s, c, pz - s * py - c * pz],
            [0, 0, 0, 1],
        ],
        dtype=float,
    )


def matrix_rotate_y(angle_deg: float, pivot: Sequence[float] = (0, 0, 0)) -> np.ndarray:
    a = math.radians(angle_deg)
    c, s = math.cos(a), math.sin(a)
    px, py, pz = pivot
    return np.array(
        [
            [c, 0, s, px - c * px - s * pz],
            [0, 1, 0, 0],
            [-s, 0, c, pz + s * px - c * pz],
            [0, 0, 0, 1],
        ],
        dtype=float,
    )


def matrix_translate(offset: Sequence[float]) -> np.ndarray:
    x, y, z = offset
    return np.array(
        [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]],
        dtype=float,
    )


def matrix_scale(scale: Sequence[float], pivot: Sequence[float] = (0, 0, 0)) -> np.ndarray:
    sx, sy, sz = scale
    px, py, pz = pivot
    return np.array(
        [
            [sx, 0, 0, px - sx * px],
            [0, sy, 0, py - sy * py],
            [0, 0, sz, pz - sz * pz],
            [0, 0, 0, 1],
        ],
        dtype=float,
    )


def matrix_array(matrix: np.ndarray) -> list[float]:
    return [float(value) for value in np.asarray(matrix, dtype=float).reshape(-1)]


def mesh_to_stl(mesh: Mesh) -> bytes:
    if mesh.empty:
        return b""
    vertices = mesh.vertices
    faces = mesh.faces
    a = vertices[faces[:, 0]]
    b = vertices[faces[:, 1]]
    c = vertices[faces[:, 2]]
    normals = np.cross(b - a, c - a)
    lengths = np.linalg.norm(normals, axis=1)
    safe = np.where(lengths > 1e-12, lengths, 1.0)
    normals = normals / safe[:, None]
    buffer = io.BytesIO()
    buffer.write(b"Displaynian binary STL".ljust(80, b" "))
    buffer.write(struct.pack("<I", len(faces)))
    record = np.empty(
        len(faces),
        dtype=[
            ("normal", "<f4", (3,)),
            ("a", "<f4", (3,)),
            ("b", "<f4", (3,)),
            ("c", "<f4", (3,)),
            ("attr", "<u2"),
        ],
    )
    record["normal"] = normals.astype(np.float32)
    record["a"] = a.astype(np.float32)
    record["b"] = b.astype(np.float32)
    record["c"] = c.astype(np.float32)
    record["attr"] = 0
    buffer.write(record.tobytes())
    return buffer.getvalue()


def mesh_to_obj(parts: list[tuple[str, Mesh]]) -> bytes:
    lines: list[str] = []
    offset = 1
    for name, mesh in parts:
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in name) or "part"
        lines.append(f"o {safe}")
        for vertex in mesh.vertices:
            lines.append(f"v {vertex[0]:.6f} {vertex[1]:.6f} {vertex[2]:.6f}")
        for face in mesh.faces:
            lines.append(f"f {face[0] + offset} {face[1] + offset} {face[2] + offset}")
        offset += len(mesh.vertices)
    return ("\n".join(lines) + "\n").encode("utf-8")


def three_mf_bytes(parts: list[tuple[str, Mesh, str]], title: str, units: str = "millimeter") -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="R0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>""")
        archive.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>""")
        resources: list[str] = []
        objects: list[str] = []
        for index, (name, mesh, color) in enumerate(parts):
            if mesh.empty:
                continue
            resource_id = index + 1
            hex_color = color.lstrip("#")
            if len(hex_color) != 6:
                hex_color = "666666"
            resources.append(
                f'<basematerials id="1"><base name="Displaynian" displaycolor="#{hex_color}"/></basematerials>'
                if index == 0
                else ""
            )
            vertex_xml = "".join(
                f'<vertex x="{v[0]:.6f}" y="{v[1]:.6f}" z="{v[2]:.6f}"/>'
                for v in mesh.vertices
            )
            triangle_xml = "".join(
                f'<triangle v1="{int(f[0])}" v2="{int(f[1])}" v3="{int(f[2])}"/>'
                for f in mesh.faces
            )
            resources.append(
                f'<object id="{resource_id + 100}" type="model"><mesh><vertices>{vertex_xml}</vertices>'
                f'<triangles>{triangle_xml}</triangles></mesh></object>'
            )
            objects.append(
                f'<item objectid="{resource_id + 100}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>'
            )
        model = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<model unit="{units}" xml:lang="es" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
            f"<metadata name=\"Title\">{escape(title)}</metadata>"
            f"<resources>{''.join(resources)}</resources>"
            f"<build>{''.join(objects)}</build></model>"
        )
        archive.writestr("3D/3dmodel.model", model)
    return buffer.getvalue()
