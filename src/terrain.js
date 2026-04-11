import * as THREE from 'three'
import { SimplexNoise } from './noise.js'
import { isLand, getContinent, getDistanceToCoast } from './continents.js'

// Biome types
export const BIOME = {
  DEEP_WATER: 0,
  SHALLOW_WATER: 1,
  BEACH: 2,
  GRASSLAND: 3,
  FOREST: 4,
  DENSE_FOREST: 5,
  MOUNTAIN: 6,
  SNOW: 7,
  DESERT: 8,
  SAVANNA: 9,
  TUNDRA: 10,
  TROPICAL_FOREST: 11,
  SNOW_PEAK: 12,
}

// Biome colors
const BIOME_COLORS = {
  [BIOME.DEEP_WATER]:    [0.04, 0.10, 0.35],
  [BIOME.SHALLOW_WATER]: [0.08, 0.25, 0.50],
  [BIOME.BEACH]:         [0.88, 0.82, 0.58],
  [BIOME.GRASSLAND]:     [0.28, 0.56, 0.18],
  [BIOME.FOREST]:        [0.15, 0.38, 0.12],
  [BIOME.DENSE_FOREST]:  [0.08, 0.26, 0.06],
  [BIOME.MOUNTAIN]:      [0.42, 0.40, 0.36],
  [BIOME.SNOW]:          [0.94, 0.96, 0.98],
  [BIOME.DESERT]:        [0.85, 0.74, 0.40],
  [BIOME.SAVANNA]:       [0.65, 0.60, 0.26],
  [BIOME.TUNDRA]:        [0.55, 0.58, 0.50],
  [BIOME.TROPICAL_FOREST]: [0.05, 0.35, 0.05],
  [BIOME.SNOW_PEAK]:     [0.94, 0.96, 0.98],
}

export const TILE_SIZE = 1
export const WORLD_SIZE = 256

export class Terrain {
  constructor(scene) {
    this.scene = scene
    this.size = WORLD_SIZE
    this.tiles = new Map()
    this.heightMap = new Float32Array(this.size * this.size)
    this.moistureMap = new Float32Array(this.size * this.size)
    this.temperatureMap = new Float32Array(this.size * this.size)
    this.biomeMap = new Uint8Array(this.size * this.size)
    this.onFire = new Map()
    this.trees = new Map()
    this.decorations = new Map()
    this.burningMeshes = new Map()

    this.generate()
    this.buildMesh()
  }

  generate() {
    const noise = new SimplexNoise(42)
    const moistureNoise = new SimplexNoise(137)
    const tempNoise = new SimplexNoise(256)
    const detailNoise = new SimplexNoise(777)

    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const idx = z * this.size + x

        // Equirectangular projection: grid → lon/lat
        const lon = (x / this.size) * 360 - 180
        const lat = 90 - (z / this.size) * 180
        const absLat = Math.abs(lat)

        const land = isLand(lon, lat)
        const distToCoast = getDistanceToCoast(lon, lat)

        let height

        if (!land) {
          // Ocean: deeper further from land
          const depthNoise = noise.fbm(x * 0.018, z * 0.018, 4, 2.0, 0.5)
          const depthVariation = (depthNoise + 1) * 0.5 * 0.06
          // Base depth 0.10-0.16, getting deeper away from coast
          const coastFade = Math.min(1, distToCoast / 20)
          height = 0.16 - coastFade * 0.06 + depthVariation
          // Shallow water near coast
          if (distToCoast < 5) {
            const shallowBlend = 1 - distToCoast / 5
            height = height + shallowBlend * 0.08
          }
        } else {
          // Land: base height with FBM terrain variation
          const terrainNoise = noise.fbm(x * 0.015, z * 0.015, 6, 2.0, 0.48)
          const detail = detailNoise.fbm(x * 0.04, z * 0.04, 3, 2.0, 0.5) * 0.1
          const normalized = (terrainNoise + 1) * 0.5 * 0.5 + detail

          // Height increases with distance from coast (mountains inland)
          const inlandFactor = Math.min(1, distToCoast / 30)
          const baseLand = 0.35 + inlandFactor * 0.25
          height = baseLand + normalized * 0.3

          // Polar ice caps: reduce variation at very high latitudes
          if (absLat > 70) {
            const polarFade = (absLat - 70) / 20
            height = height * (1 - polarFade * 0.3) + polarFade * 0.15
          }

          // Beach transition: lower height near coast
          if (distToCoast < 3) {
            const beachFade = 1 - distToCoast / 3
            height = height * (1 - beachFade * 0.4) + beachFade * 0.32
          }
        }

        this.heightMap[idx] = height

        // Temperature: latitude-based with noise and altitude
        let temp = 1.0 - absLat / 90
        temp += tempNoise.fbm(x * 0.018, z * 0.018, 3, 2.0, 0.5) * 0.1
        temp -= (height - 0.5) * 0.3
        temp = Math.max(0, Math.min(1, temp))
        this.temperatureMap[idx] = temp

        // Moisture: noise-based with coast modulation
        let moisture = moistureNoise.fbm(x * 0.02, z * 0.02, 5, 2.0, 0.5)
        moisture = (moisture + 1) * 0.5
        // Coastal moisture bonus
        if (land) {
          moisture += Math.max(0, 0.3 - distToCoast * 0.01)
          // Large interior dries out
          if (distToCoast > 20) {
            moisture -= (distToCoast - 20) * 0.005
          }
        }
        moisture = Math.max(0, Math.min(1, moisture))
        this.moistureMap[idx] = moisture

        // Determine biome
        const biome = this.getBiome(height, moisture, temp, lat, land, distToCoast)
        this.biomeMap[idx] = biome

        // Store tile data
        this.tiles.set(`${x},${z}`, {
          x, z,
          height,
          moisture,
          temperature: temp,
          biome,
          hasTree: false,
          hasBuilding: false,
          onFire: false,
          fireTicks: 0,
          fertility: moisture * temp * (height > 0.3 ? 1 : 0),
        })
      }
    }

    // Add trees based on biome type
    const treeNoise = new SimplexNoise(999)
    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const idx = z * this.size + x
        const biome = this.biomeMap[idx]
        const tile = this.tiles.get(`${x},${z}`)
        if (!tile) continue

        const val = (treeNoise.noise2D(x * 0.6, z * 0.6) + 1) * 0.5

        if (biome === BIOME.TROPICAL_FOREST) {
          // Dense tropical trees
          if (val < 0.50) tile.hasTree = true
        } else if (biome === BIOME.DENSE_FOREST) {
          if (val < 0.55) tile.hasTree = true
        } else if (biome === BIOME.FOREST) {
          if (val < 0.30) tile.hasTree = true
        } else if (biome === BIOME.SAVANNA) {
          // Sparse scattered trees
          if (val < 0.08) tile.hasTree = true
        } else if (biome === BIOME.GRASSLAND) {
          if (val < 0.06) tile.hasTree = true
        } else if (biome === BIOME.TUNDRA) {
          // Very sparse small trees
          if (val < 0.03) tile.hasTree = true
        }
        // No trees in DESERT, BEACH, MOUNTAIN, SNOW, SNOW_PEAK, water
      }
    }
  }

  getBiome(height, moisture, temp, lat, land, distToCoast) {
    // Water biomes
    if (!land) {
      if (height < 0.22) return BIOME.DEEP_WATER
      return BIOME.SHALLOW_WATER
    }

    const absLat = Math.abs(lat)

    // Beach: land very close to coast
    if (distToCoast < 3 && height < 0.38) return BIOME.BEACH

    // Polar regions: ice/snow
    if (absLat > 70) return BIOME.SNOW

    // Tundra: high latitude but not polar
    if (absLat > 60 && absLat <= 70) return BIOME.TUNDRA

    // Mountain biomes (high elevation inland)
    if (height > 0.82) return BIOME.SNOW_PEAK
    if (height > 0.70) return BIOME.MOUNTAIN

    // Latitude-based biome assignment

    // Tropical forest: near equator, wet
    if (absLat < 15 && moisture > 0.5) return BIOME.TROPICAL_FOREST

    // Desert: subtropical dry belt (Sahara pattern)
    if (absLat > 15 && absLat < 35 && moisture < 0.35) return BIOME.DESERT

    // Savanna: tropical-subtropical transition
    if (absLat > 10 && absLat < 25 && moisture >= 0.35 && moisture < 0.55) return BIOME.SAVANNA

    // Temperate forest: mid-latitudes, wet
    if (absLat > 35 && absLat < 55 && moisture > 0.4) return BIOME.FOREST

    // Dense forest: very wet temperate
    if (absLat > 30 && absLat < 55 && moisture > 0.6) return BIOME.DENSE_FOREST

    // Generic wet areas in tropics
    if (absLat < 15 && moisture > 0.35) return BIOME.TROPICAL_FOREST

    // Grassland: mid-latitudes, moderate moisture
    if (absLat > 30 && absLat < 50) return BIOME.GRASSLAND

    // Fallback: remaining tropical dry areas
    if (absLat < 30 && moisture < 0.5) return BIOME.SAVANNA

    // Default to grassland
    return BIOME.GRASSLAND
  }

  buildMesh() {
    const halfSize = this.size / 2

    // Terrain tiles using InstancedMesh for performance
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.35, TILE_SIZE)
    const tileMat = new THREE.MeshStandardMaterial({
      vertexColors: false,
      roughness: 0.85,
      metalness: 0.05,
    })

    // Count tiles per biome for instancing
    const biomeCounts = {}
    for (let i = 0; i < this.size * this.size; i++) {
      const b = this.biomeMap[i]
      biomeCounts[b] = (biomeCounts[b] || 0) + 1
    }

    this.tileMeshes = {}
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (const [biomeStr, count] of Object.entries(biomeCounts)) {
      const biome = parseInt(biomeStr)
      const mesh = new THREE.InstancedMesh(tileGeo, tileMat.clone(), count)
      mesh.castShadow = false
      mesh.receiveShadow = true

      const [r, g, b] = BIOME_COLORS[biome]
      let instanceIdx = 0

      for (let z = 0; z < this.size; z++) {
        for (let x = 0; x < this.size; x++) {
          const idx = z * this.size + x
          if (this.biomeMap[idx] !== biome) continue

          const height = this.heightMap[idx]
          const yPos = height * 3 - 0.175

          dummy.position.set(x - halfSize, yPos, z - halfSize)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(instanceIdx, dummy.matrix)

          // Color variation per tile
          const variation = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
          const v = variation * 0.05 - 0.025
          const heightShift = (height - 0.5) * 0.03
          color.setRGB(
            Math.max(0, Math.min(1, r + v + heightShift)),
            Math.max(0, Math.min(1, g + v * 0.8)),
            Math.max(0, Math.min(1, b + v * 0.6 - heightShift))
          )
          mesh.setColorAt(instanceIdx, color)

          instanceIdx++
        }
      }

      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      this.scene.add(mesh)
      this.tileMeshes[biome] = mesh
    }

    // Add trees
    this.buildTrees()

    // Add decorations
    this.buildDecorations()
  }

  buildTrees() {
    // Remove old tree meshes
    if (this._treeTrunkMesh) this.scene.remove(this._treeTrunkMesh)
    if (this._treeLeafMesh) this.scene.remove(this._treeLeafMesh)
    if (this._treeLeaf2Mesh) this.scene.remove(this._treeLeaf2Mesh)
    this.trees.clear()

    const halfSize = this.size / 2

    // Count trees and extra-leaf trees
    let treeCount = 0
    let extraLeafCount = 0
    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const tile = this.tiles.get(`${x},${z}`)
        if (!tile || !tile.hasTree) continue
        treeCount++
        if (tile.biome === BIOME.DENSE_FOREST || tile.biome === BIOME.TROPICAL_FOREST) {
          extraLeafCount++
        }
      }
    }

    if (treeCount === 0) return

    // Shared geometries — one trunk + one leaf shape, varied via instance matrix + color
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5)
    const leafGeo = new THREE.ConeGeometry(0.28, 0.55, 5)

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.9 })
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.75 })

    const trunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount)
    const leafIM = new THREE.InstancedMesh(leafGeo, leafMat, treeCount)
    trunkIM.castShadow = false
    trunkIM.receiveShadow = true
    leafIM.castShadow = false
    leafIM.receiveShadow = true

    let extraLeafIM = null
    if (extraLeafCount > 0) {
      const leaf2Geo = new THREE.ConeGeometry(0.20, 0.33, 5)
      extraLeafIM = new THREE.InstancedMesh(leaf2Geo, leafMat.clone(), extraLeafCount)
      extraLeafIM.castShadow = false
      extraLeafIM.receiveShadow = true
    }

    const dummy = new THREE.Object3D()
    const trunkColor = new THREE.Color(0x5D4037)
    const leafColor = new THREE.Color()
    let idx = 0
    let extraIdx = 0

    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const tile = this.tiles.get(`${x},${z}`)
        if (!tile || !tile.hasTree) continue

        const height = this.heightMap[z * this.size + x]
        const yPos = height * 3
        const px = x - halfSize
        const pz = z - halfSize

        // Per-tree scale
        const baseScale = tile.biome === BIOME.TUNDRA ? 0.4 : 0.65
        const scale = baseScale + ((Math.sin(x * 13.37 + z * 7.71) * 0.5 + 0.5) * 0.35)
        const rotY = (Math.sin(x * 3.14 + z * 2.72) * 0.5 + 0.5) * Math.PI * 2

        // Per-tree type variation via matrix scale
        // Trunk scale: varies by type
        let trunkSY = 1, trunkSXZ = 1
        let leafSY = 1, leafSXZ = 1, leafYOff = 0.45 * 0.35
        let leaf2SY = 1, leaf2SXZ = 0.7, leaf2YOff = 0.45 * 0.7

        if (tile.biome === BIOME.TUNDRA || tile.temperature < 0.35) {
          // Pine: taller trunk, narrower tall leaves
          trunkSY = 1.2; trunkSXZ = 0.8
          leafSY = 1.27; leafSXZ = 0.7
          leafYOff = 0.6 * 0.35; leaf2YOff = 0.6 * 0.7
        } else if (tile.biome === BIOME.SAVANNA || tile.biome === BIOME.BEACH) {
          // Palm: tall thin trunk, small flat leaves
          trunkSY = 1.4; trunkSXZ = 0.7
          leafSY = 0.45; leafSXZ = 1.07
          leafYOff = 0.7 * 0.35; leaf2YOff = 0.7 * 0.7
        } else if (tile.biome === BIOME.TROPICAL_FOREST) {
          const hash = (x * 73 + z * 137) % 2
          if (hash === 0) {
            // Tropical broad: medium trunk, wide leaves
            trunkSY = 1.0; trunkSXZ = 0.9
            leafSY = 0.91; leafSXZ = 1.14
            leafYOff = 0.5 * 0.35; leaf2YOff = 0.5 * 0.7
          } else {
            // Palm variant
            trunkSY = 1.4; trunkSXZ = 0.7
            leafSY = 0.45; leafSXZ = 1.07
            leafYOff = 0.7 * 0.35; leaf2YOff = 0.7 * 0.7
          }
        } else {
          // Normal trees: 3 variants via hash
          const hash = (x * 73 + z * 137) % 3
          if (hash === 0) { trunkSY = 0.9; trunkSXZ = 1.0; leafSY = 1.0; leafSXZ = 1.0 }
          else if (hash === 1) { trunkSY = 1.1; trunkSXZ = 0.8; leafSY = 1.27; leafSXZ = 0.79 }
          else { trunkSY = 0.7; trunkSXZ = 1.1; leafSY = 0.82; leafSXZ = 1.25 }
        }

        // Trunk instance
        dummy.position.set(px, yPos + (0.5 * trunkSY * scale) / 2, pz)
        dummy.scale.set(trunkSXZ * scale, trunkSY * scale, trunkSXZ * scale)
        dummy.rotation.set(0, rotY, 0)
        dummy.updateMatrix()
        trunkIM.setMatrixAt(idx, dummy.matrix)
        trunkIM.setColorAt(idx, trunkColor)

        // Leaf instance
        dummy.position.set(px, yPos + (0.5 * trunkSY * scale) + leafSY * 0.55 * scale * 0.35, pz)
        dummy.scale.set(leafSXZ * scale, leafSY * scale, leafSXZ * scale)
        dummy.rotation.set(0, rotY, 0)
        dummy.updateMatrix()
        leafIM.setMatrixAt(idx, dummy.matrix)

        // Leaf color variation
        const hueShift = (Math.sin(x * 7.77 + z * 3.33) * 0.5 + 0.5) * 0.12
        leafColor.setHSL(0.28 + hueShift, 0.65, 0.22 + hueShift * 0.3)
        leafIM.setColorAt(idx, leafColor)

        // Extra leaf layer for dense/tropical
        if ((tile.biome === BIOME.DENSE_FOREST || tile.biome === BIOME.TROPICAL_FOREST) && extraLeafIM) {
          dummy.position.set(px, yPos + (0.5 * trunkSY * scale) + leaf2SY * 0.33 * scale * 0.7, pz)
          dummy.scale.set(leaf2SXZ * scale, leaf2SY * scale, leaf2SXZ * scale)
          dummy.rotation.set(0, rotY + 0.5, 0)
          dummy.updateMatrix()
          extraLeafIM.setMatrixAt(extraIdx, dummy.matrix)
          leafColor.setHSL(0.30 + hueShift, 0.6, 0.25 + hueShift * 0.3)
          extraLeafIM.setColorAt(extraIdx, leafColor)
          extraIdx++
        }

        this.trees.set(`${x},${z}`, { x, z, biome: tile.biome, scale })
        idx++
      }
    }

    trunkIM.instanceMatrix.needsUpdate = true
    if (trunkIM.instanceColor) trunkIM.instanceColor.needsUpdate = true
    leafIM.instanceMatrix.needsUpdate = true
    if (leafIM.instanceColor) leafIM.instanceColor.needsUpdate = true

    this.scene.add(trunkIM)
    this.scene.add(leafIM)
    this._treeTrunkMesh = trunkIM
    this._treeLeafMesh = leafIM

    if (extraLeafIM) {
      extraLeafIM.instanceMatrix.needsUpdate = true
      if (extraLeafIM.instanceColor) extraLeafIM.instanceColor.needsUpdate = true
      this.scene.add(extraLeafIM)
      this._treeLeaf2Mesh = extraLeafIM
    }
  }

  buildDecorations() {
    // Remove old decoration meshes
    if (this._rockIM) this.scene.remove(this._rockIM)
    if (this._flowerIM) this.scene.remove(this._flowerIM)
    this.decorations.clear()

    const halfSize = this.size / 2
    const decoNoise = new SimplexNoise(555)

    // Count decorations first
    let rockCount = 0
    let flowerCount = 0
    const rockTiles = []
    const flowerTiles = []
    const flowerColors = [0xe91e63, 0xffeb3b, 0x9c27b0, 0xff5722, 0x2196f3]

    for (let z = 0; z < this.size; z += 4) {
      for (let x = 0; x < this.size; x += 4) {
        const tile = this.tiles.get(`${x},${z}`)
        if (!tile || tile.hasTree || tile.hasBuilding) continue

        const val = (decoNoise.noise2D(x * 0.3, z * 0.3) + 1) * 0.5

        if ((tile.biome === BIOME.MOUNTAIN || tile.biome === BIOME.SNOW_PEAK) && val < 0.3) {
          rockTiles.push({ x, z, tile })
          rockCount++
        } else if (tile.biome === BIOME.GRASSLAND && val < 0.15) {
          flowerTiles.push({ x, z, tile })
          flowerCount++
        }
      }
    }

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    // Rocks as InstancedMesh
    if (rockCount > 0) {
      const rockGeo = new THREE.DodecahedronGeometry(0.15, 0)
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.95 })
      const rockIM = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
      rockIM.castShadow = false
      rockIM.receiveShadow = true

      for (let i = 0; i < rockTiles.length; i++) {
        const { x, z } = rockTiles[i]
        const height = this.heightMap[z * this.size + x] * 3
        dummy.position.set(x - halfSize + (Math.sin(x * 1.1) * 0.15), height + 0.1, z - halfSize + (Math.cos(z * 1.3) * 0.15))
        dummy.rotation.set(Math.sin(x * 2.1), Math.cos(z * 1.7), Math.sin(x * z * 0.01))
        const s = 0.5 + (Math.sin(x * 3.7 + z * 2.3) * 0.5 + 0.5) * 1.0
        dummy.scale.set(s, s * 0.7, s)
        dummy.updateMatrix()
        rockIM.setMatrixAt(i, dummy.matrix)
        this.decorations.set(`${x},${z}`, { type: 'rock' })
      }
      rockIM.instanceMatrix.needsUpdate = true
      this.scene.add(rockIM)
      this._rockIM = rockIM
    }

    // Flowers as InstancedMesh
    if (flowerCount > 0) {
      const flowerGeo = new THREE.SphereGeometry(0.06, 4, 3)
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      const flowerIM = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount)
      flowerIM.castShadow = false

      for (let i = 0; i < flowerTiles.length; i++) {
        const { x, z } = flowerTiles[i]
        const height = this.heightMap[z * this.size + x] * 3
        dummy.position.set(x - halfSize, height + 0.18, z - halfSize)
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        flowerIM.setMatrixAt(i, dummy.matrix)

        const fc = flowerColors[(x * 7 + z * 13) % flowerColors.length]
        color.setHex(fc)
        flowerIM.setColorAt(i, color)
        this.decorations.set(`${x},${z}`, { type: 'flower' })
      }
      flowerIM.instanceMatrix.needsUpdate = true
      if (flowerIM.instanceColor) flowerIM.instanceColor.needsUpdate = true
      this.scene.add(flowerIM)
      this._flowerIM = flowerIM
    }
  }

  getTileAt(worldX, worldZ) {
    const halfSize = this.size / 2
    const tx = Math.round(worldX + halfSize)
    const tz = Math.round(worldZ + halfSize)
    if (tx < 0 || tx >= this.size || tz < 0 || tz >= this.size) return null
    return this.tiles.get(`${tx},${tz}`)
  }

  getWorldPos(tileX, tileZ) {
    const halfSize = this.size / 2
    const height = this.heightMap[tileZ * this.size + tileX]
    return new THREE.Vector3(
      tileX - halfSize,
      height * 3 + 0.175,
      tileZ - halfSize
    )
  }

  getHeightAt(worldX, worldZ) {
    const halfSize = this.size / 2
    const tx = Math.round(worldX + halfSize)
    const tz = Math.round(worldZ + halfSize)
    if (tx < 0 || tx >= this.size || tz < 0 || tz >= this.size) return 0
    return this.heightMap[tz * this.size + tx] * 3
  }

  isWalkable(tileX, tileZ) {
    const tile = this.tiles.get(`${tileX},${tileZ}`)
    if (!tile) return false
    return tile.biome !== BIOME.DEEP_WATER && tile.biome !== BIOME.SHALLOW_WATER
  }

  setFire(tileX, tileZ) {
    const key = `${tileX},${tileZ}`
    const tile = this.tiles.get(key)
    if (!tile || tile.onFire) return
    if (tile.biome === BIOME.DEEP_WATER || tile.biome === BIOME.SHALLOW_WATER) return

    tile.onFire = true
    tile.fireTicks = 0
    this.onFire.set(key, { x: tileX, z: tileZ, ticks: 0 })

    // Enhanced fire visual with multiple particles
    const pos = this.getWorldPos(tileX, tileZ)
    const fireGroup = new THREE.Group()

    // Fire cone (main flame)
    const fireGeo = new THREE.ConeGeometry(0.18, 0.6, 4)
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.85
    })
    const fireMesh = new THREE.Mesh(fireGeo, fireMat)
    fireMesh.position.y = 0.3
    fireGroup.add(fireMesh)

    // Inner glow (brighter core)
    const glowGeo = new THREE.ConeGeometry(0.08, 0.35, 4)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.9
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    glowMesh.position.y = 0.25
    fireGroup.add(glowMesh)

    // Point light for illumination
    const fireLight = new THREE.PointLight(0xff6600, 2, 4)
    fireLight.position.y = 0.5
    fireGroup.add(fireLight)

    fireGroup.position.set(pos.x, pos.y, pos.z)
    this.scene.add(fireGroup)
    this.burningMeshes.set(key, fireGroup)
  }

  extinguish(tileX, tileZ) {
    const key = `${tileX},${tileZ}`
    const tile = this.tiles.get(key)
    if (!tile || !tile.onFire) return

    tile.onFire = false
    tile.fireTicks = 0
    this.onFire.delete(key)

    const group = this.burningMeshes.get(key)
    if (group) {
      this.scene.remove(group)
      this.burningMeshes.delete(key)
    }
  }

  updateFire(dt) {
    const toSpread = []
    const toExtinguish = []

    for (const [key, fire] of this.onFire) {
      fire.ticks += dt
      const tile = this.tiles.get(key)
      if (!tile) continue

      // Animate fire
      const group = this.burningMeshes.get(key)
      if (group && group.children.length >= 2) {
        const mainFlame = group.children[0]
        const innerGlow = group.children[1]
        mainFlame.scale.y = 0.8 + Math.sin(fire.ticks * 8) * 0.3
        mainFlame.scale.x = 0.8 + Math.sin(fire.ticks * 6 + 1) * 0.2
        mainFlame.material.opacity = 0.6 + Math.sin(fire.ticks * 10) * 0.25
        innerGlow.scale.y = 0.7 + Math.sin(fire.ticks * 12 + 2) * 0.3
        innerGlow.rotation.y += dt * 3
        if (group.children[2]) {
          group.children[2].intensity = 1.5 + Math.sin(fire.ticks * 7) * 0.8
        }
      }

      // Spread to neighbors after some time
      if (fire.ticks > 1.5 && Math.random() < 0.025 * dt) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]
        const dir = dirs[Math.floor(Math.random() * dirs.length)]
        const nx = fire.x + dir[0]
        const nz = fire.z + dir[1]
        const nTile = this.tiles.get(`${nx},${nz}`)
        if (nTile && !nTile.onFire && nTile.biome !== BIOME.DEEP_WATER && nTile.biome !== BIOME.SHALLOW_WATER) {
          const spreadChance = nTile.hasTree ? 0.7 : 0.15
          if (Math.random() < spreadChance) {
            toSpread.push([nx, nz])
          }
        }
      }

      // Burn out after a while
      const maxBurn = tile.hasTree ? 12 : 5
      if (fire.ticks > maxBurn) {
        toExtinguish.push([fire.x, fire.z])
        if (tile.hasTree) {
          tile.hasTree = false
          this.trees.delete(key)
        }
      }
    }

    for (const [x, z] of toSpread) this.setFire(x, z)
    for (const [x, z] of toExtinguish) this.extinguish(x, z)
  }

  drawMinimap(canvas) {
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const scaleX = w / this.size
    const scaleZ = h / this.size

    ctx.clearRect(0, 0, w, h)

    // Optimize: draw in larger blocks
    const step = Math.max(1, Math.floor(1 / scaleX))
    for (let z = 0; z < this.size; z += step) {
      for (let x = 0; x < this.size; x += step) {
        const biome = this.biomeMap[z * this.size + x]
        const tile = this.tiles.get(`${x},${z}`)
        const [r, g, b] = BIOME_COLORS[biome]

        if (tile && tile.onFire) {
          ctx.fillStyle = `rgb(255, ${Math.floor(100 + Math.random() * 100)}, 0)`
        } else if (tile && tile.hasBuilding) {
          ctx.fillStyle = '#999'
        } else {
          ctx.fillStyle = `rgb(${Math.floor(r*255)},${Math.floor(g*255)},${Math.floor(b*255)})`
        }
        ctx.fillRect(
          Math.floor(x * scaleX),
          Math.floor(z * scaleZ),
          Math.ceil(scaleX * step),
          Math.ceil(scaleZ * step)
        )
      }
    }
  }
}
