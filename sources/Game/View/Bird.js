import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Bird {
    constructor(scene, time, initialPosition) { 
        console.log('[Bird.js] Constructor started for bird at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition.clone();

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        // Movement parameters
        this.flyRadius = 100 + Math.random() * 5;
        this.angularSpeed = 0.0008 + Math.random() * 0.0012;
        this.currentAngle = Math.random() * Math.PI * 2;
        this.baseY = this.initialPosition.y;
        this.verticalOscillationAmplitude = 1 + Math.random() * 1;
        this.verticalOscillationSpeed = 0.0005 + Math.random() * 0.5;

        this.loadModel()
        console.log('[Bird.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Bird.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Bird.glb',
            (gltf) => {
                console.log('[Bird.js] Model loaded successfully:', gltf); 
                this.model = gltf.scene
                this.model.scale.set(1, 1, 1)
                this.model.position.copy(this.initialPosition); 
                this.scene.add(this.model)
                console.log('[Bird.js] Model added to scene at', this.initialPosition);

                this.model.traverse((child) => {
                    if (child.isMesh) {
                        console.log('[Bird.js] Mesh found:', child.name, 'Material:', child.material);
                        if (child.material && child.material.map) {
                            console.log('[Bird.js] Texture map found on material:', child.material.map);
                        } else if (child.material) {
                            console.log('[Bird.js] No texture map on material:', child.material.name || child.material.uuid);
                        } else {
                            console.log('[Bird.js] Mesh has no material.');
                        }
                    }
                });

                if (gltf.animations && gltf.animations.length) {
                    console.log('[Bird.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    let flyAction = gltf.animations.find(anim => anim.name.toLowerCase().includes('fly'));
                    let idleAction = gltf.animations.find(anim => anim.name.toLowerCase().includes('idle'));
                    
                    let actionToPlay = null;
                    if (flyAction) {
                        actionToPlay = flyAction;
                        console.log('[Bird.js] Playing "fly" animation for bird at', this.initialPosition.x.toFixed(2));
                    } else if (idleAction) {
                        actionToPlay = idleAction;
                        console.log('[Bird.js] Playing "idle" animation for bird at', this.initialPosition.x.toFixed(2));
                    } else {
                        actionToPlay = gltf.animations[0];
                        console.log('[Bird.js] Playing default (first) animation for bird at', this.initialPosition.x.toFixed(2));
                    }
                    const action = this.mixer.clipAction(actionToPlay)
                    action.play()
                } else {
                    console.log('[Bird.js] No animations found in model');
                }
            },
            undefined,
            (error) => {
                console.error('[Bird.js] An error happened while loading the bird model for bird at', this.initialPosition.x.toFixed(2), error)
            }
        )
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }

        if (this.model) {
            // Circular flying movement
            this.currentAngle += this.angularSpeed * this.time.delta * 1000;

            const offsetX = Math.cos(this.currentAngle) * this.flyRadius;
            const offsetZ = Math.sin(this.currentAngle) * this.flyRadius;

            this.model.position.x = this.initialPosition.x + offsetX;
            this.model.position.z = this.initialPosition.z + offsetZ;
            
            // Vertical oscillation
            const verticalOffset = Math.sin(this.time.elapsed * this.verticalOscillationSpeed) * this.verticalOscillationAmplitude;
            this.model.position.y = this.baseY + verticalOffset;

            // Make the bird look in the direction it's flying
            // Calculate next position slightly ahead for lookAt
            const nextAngle = this.currentAngle + this.angularSpeed * this.time.delta * 1000 * 5;
            const nextOffsetX = Math.cos(nextAngle) * this.flyRadius;
            const nextOffsetZ = Math.sin(nextAngle) * this.flyRadius;
            this.model.lookAt(this.initialPosition.x + nextOffsetX, this.baseY + verticalOffset, this.initialPosition.z + nextOffsetZ);
        }
    }
} 