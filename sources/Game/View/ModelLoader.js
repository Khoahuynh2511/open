import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class ModelLoader
{
    constructor()
    {
        this.loader = new GLTFLoader()
        this.cache = new Map()
        this.loadingPromises = new Map()
    }

    async loadModel(url, name = null)
    {
        const cacheKey = name || url

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey).clone()
        }

        if (this.loadingPromises.has(cacheKey)) {
            const model = await this.loadingPromises.get(cacheKey)
            return model.clone()
        }

        // Create new promise to load with timeout
        const loadPromise = new Promise((resolve, reject) => {
            // Timeout after 10 seconds
            const timeoutId = setTimeout(() => {
                console.error(`⏰ Timeout loading ${cacheKey}`)
                this.loadingPromises.delete(cacheKey)
                reject(new Error(`Timeout loading ${cacheKey}`))
            }, 10000)

            this.loader.load(
                url,
                (gltf) => {
                    clearTimeout(timeoutId)
                    console.log(`✅ Loaded model: ${cacheKey}`)
                    
                    // Get first scene or object
                    const model = gltf.scene || gltf.scenes[0]
                    
                    if (!model) {
                        console.error(`❌ No scene found in ${cacheKey}`)
                        this.loadingPromises.delete(cacheKey)
                        reject(new Error(`No scene found in ${cacheKey}`))
                        return
                    }
                    
                    // Default scale and position
                    model.scale.set(1, 1, 1)
                    model.position.set(0, 0, 0)
                    
                    // Cache model
                    this.cache.set(cacheKey, model)
                    this.loadingPromises.delete(cacheKey)
                    
                    resolve(model.clone())
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(1)
                        console.log(`📥 Loading ${cacheKey}: ${percent}%`)
                    }
                },
                (error) => {
                    clearTimeout(timeoutId)
                    console.error(`❌ Error loading ${cacheKey}:`, error)
                    this.loadingPromises.delete(cacheKey)
                    reject(error)
                }
            )
        })

        this.loadingPromises.set(cacheKey, loadPromise)
        return loadPromise
    }

    // List of online models (tested)
    getPresetModels()
    {
        return {
            // Robot from THREE.js examples (safe URL)
            robot_simple: {
                url: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
                name: 'Robot Biểu Cảm 🤖',
                scale: { x: 0.8, y: 0.8, z: 0.8 },
                position: { x: 0, y: 0, z: 0 }
            },

            // Duck from THREE.js examples (safe backup)
            duck: {
                url: 'https://threejs.org/examples/models/gltf/Duck/glTF-Binary/Duck.glb',
                name: 'Vịt Vàng 🦆',
                scale: { x: 0.02, y: 0.02, z: 0.02 },
                position: { x: 0, y: 0, z: 0 }
            },

            // Flamingo (alternative)
            flamingo: {
                url: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
                name: 'Hồng Hạc 🦩',
                scale: { x: 0.02, y: 0.02, z: 0.02 },
                position: { x: 0, y: 0, z: 0 }
            }
        }
    }

    async createModelGeometry(modelKey)
    {
        try {
            const presets = this.getPresetModels()
            const modelConfig = presets[modelKey]
            
            if (!modelConfig) {
                throw new Error(`Model ${modelKey} không tồn tại`)
            }

            const model = await this.loadModel(modelConfig.url, modelKey)
            
            // Apply scale and position from config
            model.scale.set(
                modelConfig.scale.x, 
                modelConfig.scale.y, 
                modelConfig.scale.z
            )
            
            model.position.set(
                modelConfig.position.x,
                modelConfig.position.y, 
                modelConfig.position.z
            )

            return {
                isModel: true,
                object: model,
                config: modelConfig
            }
            
        } catch (error) {
            console.warn(`⚠️ Không thể load model ${modelKey}, sử dụng fallback geometry`)
            return null
        }
    }

    async loadLocalModel(modelPath, name = null)
    {
        try {
            console.log(`🔄 Loading local model: ${modelPath}`)
            const model = await this.loadModel(modelPath, name || modelPath)
            return {
                isModel: true,
                object: model
            }
        } catch (error) {
            console.error(`❌ Failed to load local model: ${modelPath}`, error)
            return null
        }
    }

    clearCache()
    {
        this.cache.clear()
        this.loadingPromises.clear()
    }
} 