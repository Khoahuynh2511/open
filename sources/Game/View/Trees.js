import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'

export default class Trees
{
    constructor()
    {
        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()
        this.scene = this.view.scene

        this.treesPerChunk = 10
        this.treeModel = null
        this.chunkQueue = []
        this.processed = new Set()
        this.spawnProbability = 0.3
        this.maxSlope = 0.5

        this.loader = new GLTFLoader()
        this.loader.load('./models/giant_low_poly_tree/scene.gltf', (gltf) =>
        {
            // Create custom shader material with fog for trees
            gltf.scene.traverse(child => {
                if(child.isMesh && child.material) {
                    const old = child.material
                    
                    // Create custom shader material with fog support
                    child.material = new THREE.ShaderMaterial({
                        uniforms: {
                            uColor: { value: old.color || new THREE.Color(0xffffff) },
                            uFogTexture: { value: null }, // Will be set from View
                            uFogIntensity: { value: this.fogIntensity },
                            uMetalness: { value: old.metalness !== undefined ? old.metalness : 0.2 },
                            uRoughness: { value: old.roughness !== undefined ? old.roughness : 0.8 },
                            uLightDirection: { value: new THREE.Vector3(-0.5, -0.5, -0.5) }
                        },
                        vertexShader: `
                            varying vec3 vWorldPosition;
                            varying vec3 vNormal;
                            varying vec4 vViewPosition;
                            
                            void main() {
                                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                                vec4 viewPosition = viewMatrix * worldPosition;
                                
                                vWorldPosition = worldPosition.xyz;
                                vNormal = normalize(normalMatrix * normal);
                                vViewPosition = viewPosition;
                                
                                gl_Position = projectionMatrix * viewPosition;
                            }
                        `,
                        fragmentShader: `
                            uniform vec3 uColor;
                            uniform sampler2D uFogTexture;
                            uniform float uFogIntensity;
                            uniform float uMetalness;
                            uniform float uRoughness;
                            uniform vec3 uLightDirection;
                            
                            varying vec3 vWorldPosition;
                            varying vec3 vNormal;
                            varying vec4 vViewPosition;
                            
                            // Fog function
                            vec3 getFogColor(vec3 baseColor, float depth, vec2 screenUv) {
                                vec3 fogColor = texture2D(uFogTexture, screenUv).rgb;
                                float fogIntensity = 1.0 - exp(-uFogIntensity * uFogIntensity * depth * depth);
                                return mix(baseColor, fogColor, fogIntensity);
                            }
                            
                            void main() {
                                // Basic lighting calculation
                                vec3 normal = normalize(vNormal);
                                float lightDot = max(0.0, dot(normal, -uLightDirection));
                                float ambientStrength = 0.3;
                                vec3 color = uColor * (ambientStrength + lightDot * 0.7);
                                
                                // Apply fog
                                float depth = -vViewPosition.z;
                                vec2 screenUv = gl_FragCoord.xy / vec2(1920.0, 1080.0); // Will be updated dynamically
                                color = getFogColor(color, depth, screenUv);
                                
                                gl_FragColor = vec4(color, 1.0);
                            }
                        `,
                        side: old.side || THREE.FrontSide,
                        transparent: old.transparent || false
                    })
                    
                    child.material.needsUpdate = true
                }
            })
            this.treeModel = gltf.scene
            console.log('🌳 Tree model loaded successfully with fog support!', this.treeModel)
            
            this.chunkQueue.forEach(chunk => this._createTreesInChunk(chunk))
            this.chunkQueue = []
        })

        // Helper to subscribe to a chunk's ready event
        const subscribeToChunk = (chunk) => {
            chunk.events.on('ready', () => {
                if(!chunk.final) return
                if(this.treeModel) this._createTreesInChunk(chunk)
                else this.chunkQueue.push(chunk)
            })
        }

        // Subscribe to existing chunks (for ones created before Trees initialized)
        this.state.chunks.allChunks.forEach(subscribeToChunk)

        // Subscribe to future chunks
        this.state.chunks.events.on('create', subscribeToChunk)
        
        // Store fog texture reference for updating
        this.fogTexture = null
        this.screenResolution = new THREE.Vector2(1920, 1080) // Will be updated from View
        this.fogIntensity = 0.0025 // Default fog intensity
    }

    // Method to set fog texture for all trees
    setFogTexture(fogTexture) {
        this.fogTexture = fogTexture
        this.updateTreeMaterials()
    }

    // Method to update screen resolution for fog calculations
    setScreenResolution(width, height) {
        this.screenResolution.set(width, height)
        this.updateTreeMaterials()
    }

    // Method to set fog intensity for all trees
    setFogIntensity(intensity) {
        this.fogIntensity = intensity
        this.updateTreeMaterials()
    }

    // Method to update fog texture in all tree materials
    updateTreeMaterials() {
        if (!this.treeModel || !this.fogTexture) return
        
        this.scene.traverse(child => {
            if (child.name && child.name.startsWith('trees-chunk-')) {
                child.traverse(treeChild => {
                    if (treeChild.isMesh && treeChild.material && treeChild.material.uniforms) {
                        if (treeChild.material.uniforms.uFogTexture) {
                            treeChild.material.uniforms.uFogTexture.value = this.fogTexture
                        }
                        if (treeChild.material.uniforms.uFogIntensity) {
                            treeChild.material.uniforms.uFogIntensity.value = this.fogIntensity
                        }
                        // Update screen resolution in shader
                        if (treeChild.material.fragmentShader) {
                            treeChild.material.fragmentShader = treeChild.material.fragmentShader.replace(
                                /vec2\([\d.]+,\s*[\d.]+\)/,
                                `vec2(${this.screenResolution.x.toFixed(1)}, ${this.screenResolution.y.toFixed(1)})`
                            )
                            treeChild.material.needsUpdate = true
                        }
                    }
                })
            }
        })
    }

    _createTreesInChunk(chunk)
    {
        if(this.processed.has(chunk.id))
            return

        this.processed.add(chunk.id)
        
        console.log(`🌳 Creating trees in chunk ${chunk.id}`)

        const group = new THREE.Group()
        group.name = `trees-chunk-${chunk.id}`

        for(let i = 0; i < this.treesPerChunk; i++) {
            if(Math.random() > this.spawnProbability) continue

            const x = THREE.MathUtils.lerp(chunk.bounding.xMin, chunk.bounding.xMax, Math.random())
            const z = THREE.MathUtils.lerp(chunk.bounding.zMin, chunk.bounding.zMax, Math.random())
            let y = 0
            if(chunk.terrain && chunk.terrain.ready) {
                y = chunk.terrain.getElevationForPosition(x, z) || 0
            }
            const amp = this.state.terrains.baseAmplitude || 100
            if(y < 0 || y > amp * 0.3) continue
            const delta = 1
            const hL = chunk.terrain.getElevationForPosition(x - delta, z)
            const hR = chunk.terrain.getElevationForPosition(x + delta, z)
            const hD = chunk.terrain.getElevationForPosition(x, z - delta)
            const hU = chunk.terrain.getElevationForPosition(x, z + delta)
            if(hL !== false && hR !== false && hD !== false && hU !== false) {
                const slopeX = (hR - hL) / (2 * delta)
                const slopeZ = (hU - hD) / (2 * delta)
                const slopeMag = Math.hypot(slopeX, slopeZ)
                if(slopeMag > this.maxSlope) continue
            }
            const tree = this.treeModel.clone(true)
            tree.position.set(x, y, z)
            tree.rotation.y = Math.random() * Math.PI * 2
            
            // Set fog texture for new tree if available
            if (this.fogTexture) {
                tree.traverse(treeChild => {
                    if (treeChild.isMesh && treeChild.material && treeChild.material.uniforms) {
                        if (treeChild.material.uniforms.uFogTexture) {
                            treeChild.material.uniforms.uFogTexture.value = this.fogTexture
                        }
                    }
                })
            }
            
            group.add(tree)
        }

        this.scene.add(group)
        
        console.log(`🌳 Added ${group.children.length} trees to chunk ${chunk.id}`)
    }

    update()
    {
        // Trees are static; optionally animate them here
    }
} 