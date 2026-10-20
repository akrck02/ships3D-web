import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Scene,
  Vector3,
} from 'three'

import { edgeFaces, edgeNearness, nearestFace, type Face } from './edge'

/** The most the field fills in, at the edge itself: space still shows through. */
const MOST_OPACITY = 0.55
/** How far inside the edge the field is drawn, so it never fights the grid's lines. */
const INSET = 0.998
/** The face's middle is brighter than its corners. */
const CORNER_SHADE = 0.4
const FIELD_COLOUR = 0x4fc3f7

/**
 * The world's edge as a force field: as the ship nears it, the face of the
 * edge's grid nearest the ship fills in, more opaque the nearer.
 */
export class ForceField {
  private readonly faces: Face[]
  private readonly material = new MeshBasicMaterial({
    color: FIELD_COLOUR,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  private readonly geometry = new BufferGeometry()
  private readonly mesh: Mesh
  private shown: Face | undefined

  constructor(
    private readonly scene: Scene,
    private readonly worldRadius: number,
  ) {
    this.faces = edgeFaces(worldRadius)
    this.mesh = new Mesh(this.geometry, this.material)
    this.mesh.visible = false
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }

  /** Fills in the face nearest the ship, as opaque as the ship is near the edge. */
  update(ship: Vector3): void {
    const nearness = edgeNearness(ship, this.worldRadius)
    this.mesh.visible = nearness > 0
    if (!this.mesh.visible) {
      return
    }
    const face = nearestFace(this.faces, ship)
    if (face && face !== this.shown) {
      this.shown = face
      layOut(this.geometry, face)
    }
    this.material.opacity = nearness * MOST_OPACITY
  }

  dispose(): void {
    this.scene.remove(this.mesh)
    this.geometry.dispose()
    this.material.dispose()
  }
}

/** Lays a face out just inside the edge, as three triangles round its middle. */
export function layOut(geometry: BufferGeometry, face: Face): void {
  const middle = face[0].clone().add(face[1]).add(face[2]).divideScalar(3)
  const positions: number[] = []
  const colours: number[] = []
  for (let corner = 0; corner < 3; corner++) {
    for (const [point, shade] of [
      [middle, 1],
      [face[corner]!, CORNER_SHADE],
      [face[(corner + 1) % 3]!, CORNER_SHADE],
    ] as const) {
      positions.push(point.x * INSET, point.y * INSET, point.z * INSET)
      colours.push(shade, shade, shade)
    }
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  geometry.computeBoundingSphere()
}
