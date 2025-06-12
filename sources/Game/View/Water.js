import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import View from '@/View/View.js'
import State from '@/State/State.js'
import Debug from '@/Debug/Debug.js'
import OceanMaterial from './Materials/OceanMaterial.js'

export default class Water
{
    constructor()
    {
        this.view = View.getInstance()
        this.state = State.getInstance()
        this.scene = this.view.scene
        this.debug = Debug.getInstance()
        this.time = this.view.time

        this.waterLevel = -0.5 // Mức nước cơ bản - điều chỉnh lại
        this.oceanInstances = new Map() // Track ocean instances per chunk
        this.gltfLoader = new GLTFLoader()
        this.oceanModel = null

        // Water constructor started
        this.setMaterial()
        this.loadOceanModel()
        // this.setDebug() // Disabled debug controls for performance
        this.setupChunkEvents()
        // Water constructor completed
    }

    setMaterial()
    {
        this.material = new OceanMaterial()
        this.material.uniforms.uWaterColor.value.set('#1a4f7a')
        this.material.uniforms.uFoamColor.value.set('#ffffff')
        this.material.uniforms.uWaveHeight.value = 0.3
        this.material.uniforms.uWaveFrequency.value = 0.08
        this.material.uniforms.uWaveSpeed.value = 0.8
        this.material.uniforms.uOpacity.value = 0.85
        this.material.uniforms.uFresnelPower.value = 1.5
    }

    setNormalTexture()
    {
        const textureLoader = new THREE.TextureLoader()
        // Tạo normal map đơn giản nếu không có texture
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 256
        const ctx = canvas.getContext('2d')
        
        // Tạo pattern wave đơn giản
        const imageData = ctx.createImageData(256, 256)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const x = (i / 4) % 256
            const y = Math.floor(i / 4 / 256)
            const wave = Math.sin(x * 0.1) * Math.sin(y * 0.1)
            
            imageData.data[i] = 128 + wave * 50     // R
            imageData.data[i + 1] = 128 + wave * 50 // G  
            imageData.data[i + 2] = 255             // B
            imageData.data[i + 3] = 255             // A
        }
        ctx.putImageData(imageData, 0, 0)
        
        const normalTexture = new THREE.CanvasTexture(canvas)
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping
        normalTexture.repeat.set(4, 4)
        
        this.material.uniforms.uNormalMap.value = normalTexture
        console.log('🌊 Water normal texture generated')
    }

    loadOceanModel()
    {
        // Khởi tạo fallback geometry trước để tránh lỗi
        this.oceanGeometry = new THREE.PlaneGeometry(50, 50, 32, 32)
        this.oceanGeometry.rotateX(-Math.PI * 0.5)
        console.log('🌊 Default ocean geometry created')
        
        // Try to load Ocean.glb model 
        this.gltfLoader.load(
            '/models/terrain/Ocean/Ocean.glb',
            (gltf) => {
                console.log('🌊 Ocean.glb loaded successfully:', gltf)
                this.oceanModel = gltf.scene
                
                // Debug what's inside the model
                console.log('🔍 Ocean model structure:')
                gltf.scene.traverse((child) => {
                    console.log(`  - ${child.type}: ${child.name}`, child)
                    if (child.isMesh) {
                        console.log(`    Geometry:`, child.geometry)
                        console.log(`    Material:`, child.material)
                    }
                })
                
                // Extract geometry from loaded model
                let oceanGeometry = null
                gltf.scene.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        oceanGeometry = child.geometry.clone()
                        console.log('🌊 Found ocean geometry in model:', child.name, oceanGeometry)
                        
                        // Ensure geometry has proper UV coordinates
                        if (!oceanGeometry.attributes.uv) {
                            console.log('🔧 Adding UV coordinates to ocean geometry')
                            oceanGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(oceanGeometry.attributes.position.count * 2), 2))
                        }
                    }
                })
                
                if (oceanGeometry) {
                    // Dispose old geometry
                    this.oceanGeometry.dispose()
                    this.oceanGeometry = oceanGeometry
                    console.log('✅ Ocean model geometry loaded successfully')
                    
                    // Update existing water instances với geometry mới
                    this.updateExistingWaterInstances()
                } else {
                    console.warn('⚠️ No mesh found in Ocean.glb, using fallback geometry')
                }
                
                // Setup animations if any
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('🌊 Ocean animations found:', gltf.animations.length)
                    // TODO: Setup animation mixer if needed
                }
            },
            (progress) => {
                console.log('🌊 Loading ocean model:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
                console.error('❌ Error loading ocean model:', error)
                console.log('🌊 Using fallback plane geometry')
            }
        )
    }

    checkAndCreateWaterInChunk(chunk)
    {
        if (!chunk.terrain || !chunk.terrain.ready) {
                    // Chunk terrain not ready
        return
    }
    if (this.oceanInstances.has(chunk.id)) {
        // Water already exists in chunk
        return
    }

    // Checking water for chunk

        // Check if chunk has low elevation areas (below water level)
        const terrain = chunk.terrain
        let hasLowElevation = false
        let minElevation = Infinity
        let maxElevation = -Infinity
        const samplePoints = 16 // Tăng sample points để detect

        for (let i = 0; i < samplePoints; i++) {
            for (let j = 0; j < samplePoints; j++) {
                const x = chunk.x - chunk.halfSize + (i / (samplePoints - 1)) * chunk.size
                const z = chunk.z - chunk.halfSize + (j / (samplePoints - 1)) * chunk.size
                
                const elevation = terrain.getElevationForPosition(x, z)
                if (elevation !== undefined) {
                    minElevation = Math.min(minElevation, elevation)
                    maxElevation = Math.max(maxElevation, elevation)
                    
                    if (elevation < this.waterLevel) {
                        hasLowElevation = true
                        break
                    }
                }
            }
            if (hasLowElevation) break
        }

        // Chunk elevation analysis complete

        if (hasLowElevation) {
            this.createWaterInChunk(chunk)
        }
    }

    createWaterInChunk(chunk)
    {
        if (!this.oceanGeometry) {
            console.error('❌ No ocean geometry available!')
            return
        }

        const oceanMesh = new THREE.Mesh(this.oceanGeometry, this.material)
        oceanMesh.position.set(chunk.x, this.waterLevel, chunk.z)
        oceanMesh.scale.set(chunk.size / 10, 1, chunk.size / 10) // Scale lớn hơn để dễ thấy
        
        // Debug info
        console.log(`🌊 Creating water mesh:`, {
            chunkId: chunk.id,
            position: { x: chunk.x, y: this.waterLevel, z: chunk.z },
            scale: chunk.size / 50,
            geometry: this.oceanGeometry,
            material: this.material
        })
        
        this.scene.add(oceanMesh)
        this.oceanInstances.set(chunk.id, oceanMesh)
        
        console.log(`✅ Water created successfully in chunk ${chunk.id} at position (${chunk.x}, ${this.waterLevel}, ${chunk.z})`)
    }

    removeWaterFromChunk(chunkId)
    {
        const oceanMesh = this.oceanInstances.get(chunkId)
        if (oceanMesh) {
            this.scene.remove(oceanMesh)
            oceanMesh.geometry.dispose()
            this.oceanInstances.delete(chunkId)
            console.log(`🗑️ Water removed from chunk ${chunkId}`)
        }
    }

    setDebug()
    {
        if (!this.debug || !this.debug.active) return

        const folder = this.debug.ui.getFolder('environment/water')

        folder
            .add(this, 'waterLevel')
            .min(-10)
            .max(5)
            .step(0.1)
            .name('waterLevel')
            .onChange(() => this.updateWaterLevel())

        folder
            .add(this.material.uniforms.uWaveHeight, 'value')
            .min(0)
            .max(2)
            .step(0.1)
            .name('waveHeight')

        folder
            .add(this.material.uniforms.uWaveFrequency, 'value')
            .min(0.01)
            .max(0.2)
            .step(0.01)
            .name('waveFrequency')

        folder
            .add(this.material.uniforms.uWaveSpeed, 'value')
            .min(0.1)
            .max(3)
            .step(0.1)
            .name('waveSpeed')

        folder
            .add(this.material.uniforms.uOpacity, 'value')
            .min(0.1)
            .max(1)
            .step(0.05)
            .name('opacity')

        folder
            .addColor(this.material.uniforms.uWaterColor, 'value')
            .name('waterColor')

        folder
            .addColor(this.material.uniforms.uFoamColor, 'value')
            .name('foamColor')

        // Lighting controls
        const lightingFolder = folder.addFolder('Lighting')
        
        lightingFolder
            .add(this.material.uniforms.uSunDirection.value, 'x')
            .min(-1).max(1).step(0.1)
            .name('sunDirectionX')
        
        lightingFolder
            .add(this.material.uniforms.uSunDirection.value, 'y')
            .min(-1).max(1).step(0.1)
            .name('sunDirectionY')
        
        lightingFolder
            .add(this.material.uniforms.uSunDirection.value, 'z')
            .min(-1).max(1).step(0.1)
            .name('sunDirectionZ')
        
        lightingFolder
            .addColor(this.material.uniforms.uSunColor, 'value')
            .name('sunColor')
        
        lightingFolder
            .add(this.material.uniforms.uSunIntensity, 'value')
            .min(0).max(3).step(0.1)
            .name('sunIntensity')
        
        lightingFolder
            .addColor(this.material.uniforms.uAmbientColor, 'value')
            .name('ambientColor')
        
        lightingFolder
            .add(this.material.uniforms.uAmbientIntensity, 'value')
            .min(0).max(1).step(0.05)
            .name('ambientIntensity')

        // Debug actions
        folder
            .add({ forceCreateWater: () => this.forceCreateWaterAtPlayer() }, 'forceCreateWater')
            .name('Force Create Water')
        
        folder
            .add({ debugElevation: () => this.debugTerrainElevation() }, 'debugElevation')
            .name('Debug Terrain Elevation')
        
        folder
            .add({ debugWaterInstances: () => this.debugWaterInstances() }, 'debugWaterInstances')
            .name('Debug Water Instances')
        
        folder
            .add({ testBasicMaterial: () => this.testBasicMaterial() }, 'testBasicMaterial')
            .name('Test Basic Material')
        
        folder
            .add({ fixWaterMaterial: () => this.fixWaterMaterial() }, 'fixWaterMaterial')
            .name('Fix Water Material')
        
        folder
            .add({ useBasicMaterial: () => this.useBasicMaterial() }, 'useBasicMaterial')
            .name('Use Basic Material')
        
        folder
            .add({ useAdvancedWater: () => this.useAdvancedWater() }, 'useAdvancedWater')
            .name('Use Advanced Water')
        
        folder
            .add({ syncWithEnvironmentLighting: () => this.syncWithEnvironmentLighting() }, 'syncWithEnvironmentLighting')
            .name('Sync with Environment Lighting')
        
        folder
            .add({ debugSunState: () => this.debugSunState() }, 'debugSunState')
            .name('Debug Sun State')
    }

    updateWaterLevel()
    {
        // Update all existing water instances
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            oceanMesh.position.y = this.waterLevel
        }
    }

    updateExistingWaterInstances()
    {
        // Update geometry cho tất cả water instances hiện có
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            const oldGeometry = oceanMesh.geometry
            oceanMesh.geometry = this.oceanGeometry
            
            if (oldGeometry) {
                oldGeometry.dispose()
            }
        }
        console.log(`🔄 Updated ${this.oceanInstances.size} water instances with new geometry`)
    }

    forceCreateWaterAtPlayer()
    {
        const playerPos = this.state.player.position.current
        console.log(`🎯 Force creating water at player position: (${playerPos[0]}, ${playerPos[2]})`)
        
        // Create a fake chunk at player position for testing
        const fakeChunk = {
            id: 'debug-water',
            x: playerPos[0],
            z: playerPos[2],
            size: 50
        }
        
        // Remove existing debug water if any
        this.removeWaterFromChunk('debug-water')
        
        // Create water directly
        if (!this.oceanGeometry) {
            console.error('❌ No ocean geometry available for debug water!')
            return
        }

        const oceanMesh = new THREE.Mesh(this.oceanGeometry, this.material)
        oceanMesh.position.set(fakeChunk.x, this.waterLevel, fakeChunk.z)
        oceanMesh.scale.set(10, 1, 10) // Scale lớn để dễ thấy
        
        this.scene.add(oceanMesh)
        this.oceanInstances.set('debug-water', oceanMesh)
        
        console.log('✅ Debug water created at player position')
    }

    debugTerrainElevation()
    {
        const playerPos = this.state.player.position.current
        console.log(`🏔️ Debug terrain elevation around player position: (${playerPos[0]}, ${playerPos[2]})`)
        
        // Sample in a grid around player
        const sampleSize = 10
        for (let i = -sampleSize; i <= sampleSize; i += 5) {
            for (let j = -sampleSize; j <= sampleSize; j += 5) {
                const x = playerPos[0] + i
                const z = playerPos[2] + j
                
                // Find the chunk for this position
                const chunks = this.state.chunks.mainChunks
                for (const [, chunk] of chunks) {
                    if (chunk.terrain && chunk.terrain.ready) {
                        if (x >= chunk.x - chunk.halfSize && x <= chunk.x + chunk.halfSize &&
                            z >= chunk.z - chunk.halfSize && z <= chunk.z + chunk.halfSize) {
                            
                            const elevation = chunk.terrain.getElevationForPosition(x, z)
                            const belowWater = elevation < this.waterLevel
                            console.log(`📍 (${x.toFixed(1)}, ${z.toFixed(1)}): elevation=${elevation?.toFixed(2) || 'undefined'}, water=${this.waterLevel}, below=${belowWater ? '✅' : '❌'}`)
                            break
                        }
                    }
                }
            }
        }
    }

    debugWaterInstances()
    {
        const playerPos = this.state.player.position.current
        console.log(`🌊 Debug Water Instances (${this.oceanInstances.size} total):`)
        console.log(`👤 Player position: (${playerPos[0].toFixed(2)}, ${playerPos[1].toFixed(2)}, ${playerPos[2].toFixed(2)})`)
        
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            const pos = oceanMesh.position
            const scale = oceanMesh.scale
            const distance = Math.sqrt(
                Math.pow(pos.x - playerPos[0], 2) + 
                Math.pow(pos.z - playerPos[2], 2)
            )
            
            console.log(`💧 Chunk ${chunkId}:`, {
                position: `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`,
                scale: `(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`,
                distanceFromPlayer: distance.toFixed(2),
                visible: oceanMesh.visible,
                material: oceanMesh.material ? 'OK' : 'MISSING',
                geometry: oceanMesh.geometry ? 'OK' : 'MISSING'
            })
        }
    }

    testBasicMaterial()
    {
        const playerPos = this.state.player.position.current
        console.log(`🧪 Testing basic material at player position`)
        
        // Tạo material đơn giản để test
        const basicMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,  // Xanh lá sáng
            side: THREE.DoubleSide,
            transparent: false
        })
        
        // Tạo geometry đơn giản
        const geometry = new THREE.PlaneGeometry(20, 20)
        geometry.rotateX(-Math.PI / 2) // Xoay để nằm ngang
        
        const testMesh = new THREE.Mesh(geometry, basicMaterial)
        testMesh.position.set(playerPos[0], this.waterLevel, playerPos[2])
        
        // Remove existing test mesh nếu có
        this.removeWaterFromChunk('test-basic')
        
        this.scene.add(testMesh)
        this.oceanInstances.set('test-basic', testMesh)
        
        console.log('✅ Basic green plane created at player position for testing')
    }

    fixWaterMaterial()
    {
        console.log('🔧 Fixing water material...')
        
        // Tạo material đơn giản mà không cần normal map
        const simpleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uWaveHeight: { value: 0.5 },
                uWaveFrequency: { value: 0.05 },
                uWaveSpeed: { value: 1.0 },
                uWaterColor: { value: new THREE.Color('#1d3456') },
                uFoamColor: { value: new THREE.Color('#ffffff') },
                uOpacity: { value: 0.8 },
                uPlayerPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uWaveHeight;
                uniform float uWaveFrequency;
                uniform float uWaveSpeed;
                
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = modelPosition.xyz;
                    
                    // Simple wave animation
                    float wave1 = sin(modelPosition.x * uWaveFrequency + uTime * uWaveSpeed) * uWaveHeight;
                    float wave2 = sin(modelPosition.z * uWaveFrequency * 0.7 + uTime * uWaveSpeed * 1.2) * uWaveHeight * 0.5;
                    
                    vElevation = wave1 + wave2;
                    modelPosition.y += vElevation;
                    
                    vec4 viewPosition = viewMatrix * modelPosition;
                    gl_Position = projectionMatrix * viewPosition;
                    
                    vUv = uv;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uWaterColor;
                uniform vec3 uFoamColor;
                uniform float uOpacity;
                
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    // Base water color
                    vec3 baseColor = uWaterColor;
                    
                    // Subtle wave pattern
                    vec2 movingUV = vUv * 2.0 + vec2(uTime * 0.05, uTime * 0.03);
                    float pattern = sin(movingUV.x * 3.14159) * sin(movingUV.y * 3.14159);
                    pattern = pattern * 0.1 + 0.9; // Giảm intensity
                    
                    vec3 waterColor = baseColor * pattern;
                    
                    // Add slight foam on higher waves
                    float foamFactor = smoothstep(0.2, 0.4, abs(vElevation));
                    vec3 finalColor = mix(waterColor, uFoamColor, foamFactor * 0.3);
                    
                    gl_FragColor = vec4(finalColor, uOpacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        })
        
        // Replace material cho tất cả water instances
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            oceanMesh.material = simpleMaterial
        }
        
        // Update material reference
        this.material = simpleMaterial
        
        console.log('✅ Water material fixed with simple shader')
    }

    useBasicMaterial()
    {
        console.log('🔧 Using basic material for water...')
        
        // Tạo material THREE.js cơ bản
        const basicMaterial = new THREE.MeshBasicMaterial({
            color: 0x1d3456,  // Màu xanh nước
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        })
        
        // Replace material cho tất cả water instances
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            oceanMesh.material = basicMaterial
        }
        
        // Update material reference
        this.material = basicMaterial
        
        console.log('✅ Basic material applied to water')
    }

    useAdvancedWater()
    {
        console.log('🌊 Using advanced water shader...')
        
        const advancedMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uWaveHeight: { value: 0.3 },
                uWaveFrequency: { value: 0.02 },
                uWaveSpeed: { value: 0.8 },
                uWaterColor: { value: new THREE.Color('#1d4e89') },
                uFoamColor: { value: new THREE.Color('#ffffff') },
                uDeepColor: { value: new THREE.Color('#0f2557') },
                uOpacity: { value: 0.8 },
                uPlayerPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uWaveHeight;
                uniform float uWaveFrequency;
                uniform float uWaveSpeed;
                
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying float vElevation;
                
                void main() {
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = modelPosition.xyz;
                    
                    // Multiple wave layers
                    float wave1 = sin(modelPosition.x * uWaveFrequency + uTime * uWaveSpeed) * uWaveHeight;
                    float wave2 = sin(modelPosition.z * uWaveFrequency * 1.3 + uTime * uWaveSpeed * 1.1) * uWaveHeight * 0.6;
                    float wave3 = sin((modelPosition.x + modelPosition.z) * uWaveFrequency * 0.7 + uTime * uWaveSpeed * 0.9) * uWaveHeight * 0.4;
                    
                    vElevation = wave1 + wave2 + wave3;
                    modelPosition.y += vElevation;
                    
                    vec4 viewPosition = viewMatrix * modelPosition;
                    gl_Position = projectionMatrix * viewPosition;
                    
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uWaterColor;
                uniform vec3 uFoamColor;
                uniform vec3 uDeepColor;
                uniform float uOpacity;
                uniform vec3 uPlayerPosition;
                
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying float vElevation;
                
                void main() {
                    // Water depth effect
                    float distanceToPlayer = distance(vWorldPosition.xz, uPlayerPosition.xz);
                    float depthFactor = smoothstep(5.0, 25.0, distanceToPlayer);
                    vec3 baseColor = mix(uWaterColor, uDeepColor, depthFactor);
                    
                    // Moving water patterns
                    vec2 uv1 = vUv * 3.0 + vec2(uTime * 0.03, uTime * 0.02);
                    vec2 uv2 = vUv * 1.5 + vec2(-uTime * 0.02, uTime * 0.04);
                    
                    float pattern1 = sin(uv1.x * 6.28) * sin(uv1.y * 6.28);
                    float pattern2 = sin(uv2.x * 6.28) * sin(uv2.y * 6.28);
                    float combinedPattern = (pattern1 + pattern2) * 0.05 + 0.95;
                    
                    vec3 waterColor = baseColor * combinedPattern;
                    
                    // Foam on wave peaks
                    float foamFactor = smoothstep(0.15, 0.35, abs(vElevation));
                    vec3 finalColor = mix(waterColor, uFoamColor, foamFactor * 0.4);
                    
                    // Edge lighting effect
                    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
                    float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 1.5);
                    finalColor = mix(finalColor, vec3(0.6, 0.8, 1.0), fresnel * 0.2);
                    
                    // Distance fade
                    float fadeAlpha = 1.0 - smoothstep(50.0, 80.0, distanceToPlayer);
                    
                    gl_FragColor = vec4(finalColor, uOpacity * fadeAlpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        })
        
        // Replace material cho tất cả water instances
        for (const [chunkId, oceanMesh] of this.oceanInstances) {
            oceanMesh.material = advancedMaterial
        }
        
        // Update material reference
        this.material = advancedMaterial
        
        console.log('✅ Advanced water shader applied')
    }

    syncWithEnvironmentLighting()
    {
        console.log('🌅 Syncing water lighting with environment...')
        
        // Get current time of day (0-1, where 0.5 is noon)
        const timeOfDay = (this.time.elapsed * 0.0001) % 1
        
        // Calculate sun position based on time
        const sunAngle = (timeOfDay - 0.5) * Math.PI // -π/2 to π/2
        const sunHeight = Math.sin(sunAngle)
        const sunDirection = new THREE.Vector3(
            Math.cos(sunAngle) * 0.5,
            -sunHeight,
            0.3
        ).normalize()
        
        // Adjust lighting based on time of day
        let sunIntensity = Math.max(0, sunHeight) // No negative intensity
        let ambientIntensity = 0.1 + Math.max(0, sunHeight) * 0.4
        
        // Night time adjustments
        if (sunHeight < 0) {
            sunIntensity = 0.05 // Very dim moonlight
            ambientIntensity = 0.05 // Very dark ambient
            this.material.uniforms.uSunColor.value.setHex(0x4169E1) // Moonlight blue
            this.material.uniforms.uAmbientColor.value.setHex(0x191970) // Dark blue
        } else {
            // Day time colors
            const dayProgress = sunHeight
            const sunColor = new THREE.Color().lerpColors(
                new THREE.Color(0xFF7F50), // Dawn orange
                new THREE.Color(0xFFFFFF), // Noon white
                dayProgress
            )
            const ambientColor = new THREE.Color().lerpColors(
                new THREE.Color(0x87CEEB), // Light blue
                new THREE.Color(0xADD8E6), // Lighter blue
                dayProgress
            )
            
            this.material.uniforms.uSunColor.value.copy(sunColor)
            this.material.uniforms.uAmbientColor.value.copy(ambientColor)
        }
        
        // Update uniforms
        this.material.uniforms.uSunDirection.value.copy(sunDirection)
        this.material.uniforms.uSunIntensity.value = sunIntensity
        this.material.uniforms.uAmbientIntensity.value = ambientIntensity
        
        console.log(`🌅 Lighting updated: timeOfDay=${timeOfDay.toFixed(2)}, sunHeight=${sunHeight.toFixed(2)}, intensity=${sunIntensity.toFixed(2)}`)
    }

    updateLightingFromSun()
    {
        // Check if sun system exists
        if (!this.state.sun || !this.material.uniforms.uSunDirection) {
            return
        }

        const sunState = this.state.sun

        // Update sun direction từ sun system
        if (sunState.position) {
            // Convert sun position object to THREE.Vector3
            const sunDirection = new THREE.Vector3(
                sunState.position.x,
                sunState.position.y,
                sunState.position.z
            ).normalize().multiplyScalar(-1) // Flip để có direction từ sun đến object

            this.material.uniforms.uSunDirection.value.copy(sunDirection)
        }

        // Calculate sun intensity based on sun height (y component)
        const sunHeight = sunState.position ? sunState.position.y : 0
        const sunIntensity = Math.max(0.1, Math.min(1.5, sunHeight * 2))
        this.material.uniforms.uSunIntensity.value = sunIntensity

        // Calculate ambient lighting based on sun height
        const ambientIntensity = Math.max(0.1, Math.min(0.6, 0.2 + sunHeight * 0.4))
        this.material.uniforms.uAmbientIntensity.value = ambientIntensity

        // Dynamic color based on sun position
        if (sunHeight < 0) {
            // Night time - moonlight
            this.material.uniforms.uSunColor.value.setHex(0x4169E1) // Royal blue
            this.material.uniforms.uAmbientColor.value.setHex(0x191970) // Midnight blue
        } else if (sunHeight < 0.2) {
            // Dawn/dusk - golden hour
            this.material.uniforms.uSunColor.value.setHex(0xFF7F50) // Coral
            this.material.uniforms.uAmbientColor.value.setHex(0xFF6347) // Tomato
        } else if (sunHeight < 0.7) {
            // Morning/afternoon - warm light
            this.material.uniforms.uSunColor.value.setHex(0xFFF8DC) // Cornsilk
            this.material.uniforms.uAmbientColor.value.setHex(0x87CEEB) // Sky blue
        } else {
            // Noon - bright white light
            this.material.uniforms.uSunColor.value.setHex(0xFFFFFF) // White
            this.material.uniforms.uAmbientColor.value.setHex(0xADD8E6) // Light blue
        }
    }

    debugSunState()
    {
        console.log('☀️ Debug Sun State:')
        console.log('  Sun exists:', !!this.state.sun)
        
        if (this.state.sun) {
            console.log('  Sun position:', this.state.sun.position)
            const sunHeight = this.state.sun.position ? this.state.sun.position.y : 0
            console.log('  Sun height (Y):', sunHeight)
            
            // Show computed values
            const sunIntensity = Math.max(0.1, Math.min(1.5, sunHeight * 2))
            const ambientIntensity = Math.max(0.1, Math.min(0.6, 0.2 + sunHeight * 0.4))
            console.log('  Computed sun intensity:', sunIntensity)
            console.log('  Computed ambient intensity:', ambientIntensity)
            
            // Show lighting phase
            if (sunHeight < 0) {
                console.log('  Phase: Night time 🌙')
            } else if (sunHeight < 0.2) {
                console.log('  Phase: Dawn/Dusk 🌅')
            } else if (sunHeight < 0.7) {
                console.log('  Phase: Morning/Afternoon ☀️')
            } else {
                console.log('  Phase: Noon 🌞')
            }
        }
        
        console.log('🌊 Current Water Lighting Uniforms:')
        if (this.material.uniforms.uSunDirection) {
            console.log('  Water sun direction:', this.material.uniforms.uSunDirection.value)
            console.log('  Water sun color:', this.material.uniforms.uSunColor.value)
            console.log('  Water sun intensity:', this.material.uniforms.uSunIntensity.value)
            console.log('  Water ambient color:', this.material.uniforms.uAmbientColor.value)
            console.log('  Water ambient intensity:', this.material.uniforms.uAmbientIntensity.value)
        }

        // Force một lần update để test
        this.updateLightingFromSun()
        console.log('🔄 Forced lighting update executed')
    }

    setupChunkEvents()
    {
        console.log('🔧 Setting up chunk events...')
        
        // Subscribe to chunk destroy events for cleanup
        const subscribeToChunk = (chunk) => {
            console.log(`📝 Subscribed to chunk ${chunk.id} destroy event`)
            chunk.events.on('destroy', () => {
                this.removeWaterFromChunk(chunk.id)
            })
        }

        // Subscribe to existing chunks
        const existingChunks = this.state.chunks.allChunks.size
        console.log(`📊 Found ${existingChunks} existing chunks`)
        this.state.chunks.allChunks.forEach(subscribeToChunk)

        // Subscribe to future chunks
        this.state.chunks.events.on('create', (chunk) => {
            console.log(`🆕 New chunk created: ${chunk.id}`)
            subscribeToChunk(chunk)
        })
        
        console.log('✅ Chunk events setup completed')
    }

    update()
    {
        const playerState = this.state.player
        const time = this.state.time

                // Update material time uniform for animation
        if (this.material.uniforms.uTime) {
            this.material.uniforms.uTime.value = time.elapsed * 0.001
        }
        if (this.material.uniforms.uPlayerPosition) {
            this.material.uniforms.uPlayerPosition.value.set(
            playerState.position.current[0],
                playerState.position.current[1],
            playerState.position.current[2]
        )
        }

        // Update lighting uniforms với sun system
        this.updateLightingFromSun()

        // Check chunks for water placement
        if (this.state.chunks.mainChunks) {
            const mainChunksCount = this.state.chunks.mainChunks.size
            if (mainChunksCount > 0 && time.elapsed % 2000 < 50) { // Log every 2 seconds
                // Water update: checking chunks
            }
            
            for (const [, chunk] of this.state.chunks.mainChunks) {
                this.checkAndCreateWaterInChunk(chunk)
            }
        } else {
            if (time.elapsed % 2000 < 50) { // Log every 2 seconds
                // No mainChunks found for water check
            }
        }
    }

    destroy()
    {
        // Clean up all water instances
        for (const [chunkId] of this.oceanInstances) {
            this.removeWaterFromChunk(chunkId)
        }
    }
}