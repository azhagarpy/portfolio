import * as THREE from 'three'

const cache = new Map<string, THREE.Material>()

interface MatOpts {
  rough?: number
  metal?: number
  emissive?: string
  ei?: number
  flat?: boolean
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
}

/** Cached low-poly standard material */
export function mat(color: string, o: MatOpts = {}) {
  const key = 'std' + color + JSON.stringify(o)
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.78,
      metalness: o.metal ?? 0,
      flatShading: o.flat ?? true,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.ei ?? 1,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    })
    cache.set(key, m)
  }
  return m as THREE.MeshStandardMaterial
}

/** Unlit HDR colour (values > 1 feed the bloom pass) */
export function glow(color: string, strength = 2.5) {
  const key = 'glow' + color + strength
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false })
    cache.set(key, m)
  }
  return m as THREE.MeshBasicMaterial
}

export function additive(color: string, opacity = 0.5) {
  const key = 'add' + color + opacity
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      fog: false,
    })
    cache.set(key, m)
  }
  return m as THREE.MeshBasicMaterial
}

export const glass = new THREE.MeshStandardMaterial({
  color: '#9fd3ff',
  roughness: 0.05,
  metalness: 0.3,
  transparent: true,
  opacity: 0.45,
})

export const vertexColorMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.85,
})

/**
 * Building material with procedural windows computed in world space, so it
 * works on instanced boxes of any size.
 */
export function buildingMaterial(opts: {
  windowColor: string
  litColor: string
  litChance: number
  litStrength: number
  roughness?: number
  metalness?: number
}) {
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: opts.roughness ?? 0.7,
    metalness: opts.metalness ?? 0.1,
    flatShading: true,
  })
  const win = new THREE.Color(opts.windowColor)
  const lit = new THREE.Color(opts.litColor)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWin = { value: win }
    shader.uniforms.uLit = { value: lit }
    shader.uniforms.uChance = { value: opts.litChance }
    shader.uniforms.uStrength = { value: opts.litStrength }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 bw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          bw = instanceMatrix * bw;
        #endif
        vBWorld = (modelMatrix * bw).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBWorld;
        uniform vec3 uWin; uniform vec3 uLit; uniform float uChance; uniform float uStrength;
        float bHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 fn = normalize(cross(dFdx(vBWorld), dFdy(vBWorld)));
          if (abs(fn.y) < 0.5) {
            float h = abs(fn.x) > abs(fn.z) ? vBWorld.z : vBWorld.x;
            vec2 cell = vec2(floor(h / 2.4), floor(vBWorld.y / 3.3));
            vec2 f = vec2(fract(h / 2.4), fract(vBWorld.y / 3.3));
            float w = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.82) * step(3.0, vBWorld.y);
            float on = step(bHash(cell + floor(vBWorld.xz * 0.02) * 17.0), uChance);
            diffuseColor.rgb = mix(diffuseColor.rgb, uWin, w * 0.85);
            totalEmissiveRadiance += uLit * w * on * uStrength;
          }
        }`,
      )
  }
  m.customProgramCacheKey = () => 'bld' + opts.windowColor + opts.litColor + opts.litChance + opts.litStrength
  return m
}
