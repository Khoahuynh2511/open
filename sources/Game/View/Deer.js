import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Deer {
    constructor(scene, time, initialPosition) {
        console.log('[Deer.js] Constructor started for deer at', initialPosition)
        this.scene = scene
        this.time = time
        this.initialPosition = initialPosition

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        this.loadModel()
        console.log('[Deer.js] Constructor finished, loadModel called')
    }

    loadModel() {
        console.log('[Deer.js] loadModel started')
        this.gltfLoader.load(
            '/models/animals/Deer.glb', // Path to the model
            (gltf) => {
                console.log('[Deer.js] Model loaded successfully:', gltf)
                this.model = gltf.scene
                this.model.scale.set(0.9, 0.9, 0.9) // Initial scale
                this.model.position.copy(this.initialPosition)
                this.model.rotation.y = Math.random() * Math.PI * 2 // Random initial rotation
                this.scene.add(this.model)
                console.log('[Deer.js] Model added to scene at', this.initialPosition)

                if (gltf.animations && gltf.animations.length) {
                    console.log('[Deer.js] Animations found:', gltf.animations)
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0]) // Play the first animation
                    action.play()
                    console.log('[Deer.js] Animation started:', gltf.animations[0].name)
                } else {
                    console.log('[Deer.js] No animations found in model')
                }
            },
            undefined,
            (error) => {
                console.error('[Deer.js] An error happened while loading the deer model:', error)
            }
        )
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }
    }
} 