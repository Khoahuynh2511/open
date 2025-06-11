import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Sheep {
    constructor(scene, time, initialPosition) {
        console.log('[Sheep.js] Constructor started for sheep at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition;

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        this.loadModel()
        console.log('[Sheep.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Sheep.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Sheep.glb', // Path to the model
            (gltf) => {
                console.log('[Sheep.js] Model loaded successfully:', gltf);
                this.model = gltf.scene
                this.model.scale.set(0.5, 0.5, 0.5) // Initial scale (0.8 for sheep)
                this.model.position.copy(this.initialPosition);
                this.model.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
                this.scene.add(this.model)
                console.log('[Sheep.js] Model added to scene at', this.initialPosition);

                if (gltf.animations && gltf.animations.length) {
                    console.log('[Sheep.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0]) // Play the first animation
                    action.play()
                    console.log('[Sheep.js] Animation started:', gltf.animations[0].name);
                } else {
                    console.log('[Sheep.js] No animations found in model');
                }
            },
            undefined,
            (error) => {
                console.error('[Sheep.js] An error happened while loading the sheep model:', error)
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