import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Cow {
    constructor(scene, time, initialPosition) {
        console.log('[Cow.js] Constructor started for cow at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition;

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        this.loadModel()
        console.log('[Cow.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Cow.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Cow.glb',
            (gltf) => {
                console.log('[Cow.js] Model loaded successfully:', gltf);
                this.model = gltf.scene
                this.model.scale.set(0.8, 0.8, 0.8)
                this.model.position.copy(this.initialPosition);
                this.model.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(this.model)
                console.log('[Cow.js] Model added to scene at', this.initialPosition);

                this.model.traverse((child) => {
                    if (child.isMesh) {
                        console.log('[Cow.js] Mesh found:', child.name, 'Material:', child.material);
                        if (child.material && child.material.map) {
                            console.log('[Cow.js] Texture map found on material:', child.material.map);
                        } else if (child.material) {
                            console.log('[Cow.js] No texture map on material:', child.material.name || child.material.uuid);
                        } else {
                            console.log('[Cow.js] Mesh has no material.');
                        }
                    }
                });

                if (gltf.animations && gltf.animations.length) {
                    console.log('[Cow.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0])
                    action.play()
                    console.log('[Cow.js] Animation started');
                } else {
                    console.log('[Cow.js] No animations found in model');
                }
            },
            undefined,
            (error) => {
                console.error('[Cow.js] An error happened while loading the cow model:', error)
            }
        )
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }

        // if (this.model) {
        //     this.model.position.x += 0.01 * Math.sin(this.time.elapsed * 0.5);
        // }
    }
} 