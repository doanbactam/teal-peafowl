import * as THREE from 'three';

// Enhanced water with reflections and wave animation
export function createWater(scene, size) {
  const waterGeo = new THREE.PlaneGeometry(size + size * 0.15, size + size * 0.15, 32, 32);

  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(0x0a2e52) },
      uColor2: { value: new THREE.Color(0x1a5276) },
      uHighlight: { value: new THREE.Color(0x3d8bbf) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
      uOpacity: { value: 0.82 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Wave animation
        float wave1 = sin(pos.x * 0.8 + uTime * 1.2) * 0.08;
        float wave2 = sin(pos.y * 1.2 + uTime * 0.8 + 1.5) * 0.06;
        float wave3 = sin((pos.x + pos.y) * 0.5 + uTime * 1.5) * 0.04;
        pos.z += wave1 + wave2 + wave3;
        
        // Calculate normal from wave
        float dx = cos(pos.x * 0.8 + uTime * 1.2) * 0.8 * 0.08 + cos((pos.x + pos.y) * 0.5 + uTime * 1.5) * 0.5 * 0.04;
        float dy = cos(pos.y * 1.2 + uTime * 0.8 + 1.5) * 1.2 * 0.06 + cos((pos.x + pos.y) * 0.5 + uTime * 1.5) * 0.5 * 0.04;
        vNormal = normalize(vec3(-dx, -dy, 1.0));
        
        vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uHighlight;
      uniform vec3 uSunDir;
      uniform float uOpacity;
      
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      
      void main() {
        // Base water color gradient
        float depth = smoothstep(0.1, 0.9, length(vUv - 0.5) * 1.5);
        vec3 baseColor = mix(uColor2, uColor1, depth);
        
        // Caustic-like patterns
        float caustic = sin(vWorldPos.x * 3.0 + uTime * 2.0) * sin(vWorldPos.z * 3.0 + uTime * 1.5) * 0.5 + 0.5;
        caustic *= caustic;
        baseColor += uHighlight * caustic * 0.12;
        
        // Specular highlight
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
        baseColor += vec3(1.0, 0.95, 0.8) * spec * 0.6;
        
        // Foam at edges (shallow water)
        float edgeFoam = smoothstep(0.35, 0.45, depth);
        float foamPattern = sin(vWorldPos.x * 8.0 + uTime * 3.0) * sin(vWorldPos.z * 8.0 + uTime * 2.5);
        foamPattern = smoothstep(0.3, 0.8, foamPattern);
        baseColor = mix(baseColor, vec3(0.85, 0.92, 0.98), foamPattern * edgeFoam * 0.3);
        
        gl_FragColor = vec4(baseColor, uOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.22 * 3 - 0.4;
  scene.add(waterMesh);

  return { mesh: waterMesh, material: waterMat };
}

// Stars for night sky
export function createStars(scene) {
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const radius = 180 + Math.random() * 20;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) + 10;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    sizes[i] = 0.3 + Math.random() * 0.7;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      varying float vBrightness;
      
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * 2.0 + position.x * 10.0) * 0.3 + 0.7;
        vBrightness = twinkle;
        gl_PointSize = size * (200.0 / -mvPosition.z) * twinkle;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vBrightness;
      
      void main() {
        float dist = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.0, dist);
        alpha *= vBrightness * uOpacity;
        gl_FragColor = vec4(0.9, 0.92, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  return { mesh: stars, material: starMat };
}

// Volumetric cloud system
export function createClouds(scene) {
  const cloudGroup = new THREE.Group();
  const cloudCount = 25;

  const cloudMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    flatShading: true,
  });

  for (let i = 0; i < cloudCount; i++) {
    const cloud = new THREE.Group();
    const puffCount = 3 + Math.floor(Math.random() * 4);

    for (let j = 0; j < puffCount; j++) {
      const size = 1.5 + Math.random() * 2.5;
      const puffGeo = new THREE.SphereGeometry(size, 5, 3);
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 3
      );
      puff.scale.y = 0.4 + Math.random() * 0.2;
      cloud.add(puff);
    }

    cloud.position.set(
      (Math.random() - 0.5) * 200,
      12 + Math.random() * 6,
      (Math.random() - 0.5) * 200
    );

    cloud.userData = {
      speed: 0.2 + Math.random() * 0.3,
      baseX: cloud.position.x,
    };

    cloudGroup.add(cloud);
  }

  scene.add(cloudGroup);
  return cloudGroup;
}

// Ambient particle system (fireflies at night, dust during day)
export function createAmbientParticles(scene) {
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = 1 + Math.random() * 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.5
    ));
  }

  const partGeo = new THREE.BufferGeometry();
  partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const partMat = new THREE.PointsMaterial({
    color: 0xffee88,
    size: 0.15,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  return { mesh: particles, material: partMat, velocities, positions };
}
