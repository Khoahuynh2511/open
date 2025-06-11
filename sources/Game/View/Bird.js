import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Bird {
    constructor(scene, time, initialPosition) { 
        // console.log('[Bird.js] Constructor started for bird at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition.clone();

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        // Enhanced movement parameters - simplified
        this.baseY = this.initialPosition.y;
        this.verticalOscillationAmplitude = 2 + Math.random() * 3;
        this.verticalOscillationSpeed = 0.0005 + Math.random() * 0.001;
        
        // Random direction changes
        this.currentDirection = Math.random() * Math.PI * 2; // Hướng bay hiện tại (radians)
        this.turnChance = 0.01; // 1% chance mỗi frame để đổi hướng
        this.maxTurnAngle = Math.PI / 4; // Góc rẽ tối đa (45 độ)
        this.directionChangeTimer = 0;
        this.directionChangeInterval = 60 + Math.random() * 120; // 60-180 frames
        
        // Collision detection - optimized
        this.raycaster = new THREE.Raycaster();
        this.collisionDistance = 8;
        this.avoidanceForce = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.maxSpeed = 50; // Tăng tốc độ
        this.turnSpeed = 0.00000005; // Giảm turn speed để ổn định hơn
        this.collisionCheckInterval = 0;
        this.collisionCheckFrequency = 20; // Tăng lên 20 frames để giảm tải hơn nữa
        this.performanceMode = false; // Tự động bật khi FPS thấp

        this.loadModel()
        // console.log('[Bird.js] Constructor finished, loadModel called');
    }



    checkCollisions() {
        if (!this.model || this.performanceMode) return new THREE.Vector3();

        // Tự động phát hiện low FPS và bật performance mode
        if (this.time.delta > 0.033) { // < 30 FPS
            this.performanceMode = true;
            setTimeout(() => { this.performanceMode = false; }, 5000); // Tắt sau 5s
            return new THREE.Vector3();
        }

        // Chỉ check collision theo interval để tối ưu performance
        this.collisionCheckInterval++;
        if (this.collisionCheckInterval < this.collisionCheckFrequency) {
            return this.avoidanceForce; // Sử dụng lại kết quả cũ
        }
        this.collisionCheckInterval = 0;

        const avoidance = new THREE.Vector3();
        // Giảm số lượng directions để tối ưu
        const directions = [
            this.velocity.clone().normalize(), // Hướng đang bay
            new THREE.Vector3(1, 0, 0),    // Right
            new THREE.Vector3(-1, 0, 0),   // Left
            new THREE.Vector3(0, 0, 1),    // Forward
            new THREE.Vector3(0, 0, -1)    // Backward
        ];

        for (const direction of directions) {
            this.raycaster.set(this.model.position, direction);
            // Chỉ check với terrain và objects lớn, bỏ qua grass
            const terrain = this.scene.getObjectByName('terrain');
            const objectsToCheck = terrain ? [terrain] : [];
            
            if (objectsToCheck.length === 0) continue;
            
            const intersects = this.raycaster.intersectObjects(objectsToCheck, true);

            if (intersects.length > 0 && intersects[0].distance < this.collisionDistance) {
                const avoidDir = direction.clone().negate();
                const intensity = (this.collisionDistance - intersects[0].distance) / this.collisionDistance;
                avoidance.add(avoidDir.multiplyScalar(intensity * 0.5));
            }
        }

        this.avoidanceForce = avoidance; // Cache kết quả
        return avoidance;
    }



    loadModel() {
        // console.log('[Bird.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Bird.glb',
            (gltf) => {
                // console.log('[Bird.js] Model loaded successfully:', gltf); 
                this.model = gltf.scene
                this.model.scale.set(1, 1, 1)
                this.model.position.copy(this.initialPosition); 
                this.scene.add(this.model)
                // console.log('[Bird.js] Model added to scene at', this.initialPosition);

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
            const deltaTime = this.time.delta;
            
            // Random direction changes
            this.directionChangeTimer++;
            if (this.directionChangeTimer >= this.directionChangeInterval || Math.random() < this.turnChance) {
                // Đổi hướng ngẫu nhiên
                const turnAngle = (Math.random() - 0.5) * this.maxTurnAngle;
                this.currentDirection += turnAngle;
                
                // Reset timer với interval mới
                this.directionChangeTimer = 0;
                this.directionChangeInterval = 60 + Math.random() * 120;
                
                // console.log(`[Bird.js] Bird changing direction: ${(this.currentDirection * 180 / Math.PI).toFixed(1)}°`);
            }
            
            // Tính toán hướng bay dựa trên currentDirection
            const moveDirection = new THREE.Vector3(
                Math.cos(this.currentDirection),
                0,
                Math.sin(this.currentDirection)
            );
            
            // Thêm random noise để tạo bay tự nhiên hơn
            const noise = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0,
                (Math.random() - 0.5) * 0.1
            );
            moveDirection.add(noise);
            moveDirection.normalize();
            
            // Check collision và điều chỉnh hướng
            const avoidanceForce = this.checkCollisions();
            if (avoidanceForce.length() > 0) {
                moveDirection.add(avoidanceForce.multiplyScalar(0.5));
                moveDirection.normalize();
                
                // Cập nhật currentDirection dựa trên avoidance
                this.currentDirection = Math.atan2(moveDirection.z, moveDirection.x);
            }
            
            // Apply movement
            const moveSpeed = this.maxSpeed * deltaTime;
            this.model.position.add(moveDirection.multiplyScalar(moveSpeed));
            
            // Vertical oscillation
            const verticalOffset = Math.sin(this.time.elapsed * this.verticalOscillationSpeed) * this.verticalOscillationAmplitude;
            this.model.position.y = this.baseY + verticalOffset;

            // Occasional altitude changes
            if (Math.random() < 0.001) { // Giảm tần suất
                this.baseY += (Math.random() - 0.5) * 1;
                this.baseY = Math.max(this.initialPosition.y, this.baseY);
                this.baseY = Math.min(this.initialPosition.y + 15, this.baseY);
            }

            // Rotation to face movement direction
            const lookAtTarget = this.model.position.clone().add(moveDirection.multiplyScalar(10));
            lookAtTarget.y = this.model.position.y;
            this.model.lookAt(lookAtTarget);
            
            // Kiểm tra boundaries - nếu bay quá xa thì quay về
            const distanceFromStart = this.model.position.distanceTo(this.initialPosition);
            if (distanceFromStart > 500) { // Nếu bay xa hơn 500 units
                // Quay về hướng vị trí ban đầu
                const returnDirection = this.initialPosition.clone().sub(this.model.position).normalize();
                this.currentDirection = Math.atan2(returnDirection.z, returnDirection.x);
                console.log(`[Bird.js] Bird returning to base, distance: ${distanceFromStart.toFixed(1)}`);
            }
        }
    }
} 